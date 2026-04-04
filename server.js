require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// --- URSSAF Avance Immédiate ---
const URSSAF = {
  clientId: process.env.URSSAF_CLIENT_ID,
  clientSecret: process.env.URSSAF_CLIENT_SECRET,
  scope: process.env.URSSAF_SCOPE || 'homeplus.tiersprestations',
  tokenUrl: process.env.URSSAF_TOKEN_URL || 'https://api.urssaf.fr/api/oauth/v1/token',
  apiBase: process.env.URSSAF_API_BASE || 'https://api.urssaf.fr',
  siret: process.env.URSSAF_SIRET,
};

let urssafToken = null;
let urssafTokenExpiry = 0;

async function getUrssafToken() {
  if (urssafToken && Date.now() < urssafTokenExpiry - 60000) return urssafToken;

  const res = await fetch(URSSAF.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: URSSAF.clientId,
      client_secret: URSSAF.clientSecret,
      scope: URSSAF.scope,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`URSSAF token error ${res.status}: ${text}`);
  }

  const data = await res.json();
  urssafToken = data.access_token;
  urssafTokenExpiry = Date.now() + data.expires_in * 1000;
  return urssafToken;
}

async function urssafRequest(method, path, body) {
  const token = await getUrssafToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (URSSAF.siret) headers['X-Siret-Prestataire'] = URSSAF.siret;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${URSSAF.apiBase}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text.slice(0, 300) }; }

  return { status: res.status, data };
}

// --- CONFIG ---
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'devis.db');

// --- CRÉATION DU DOSSIER DATA ---
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- BASE DE DONNÉES ---
const db = new Database(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS devis_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    service TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// --- TABLE AVANCE IMMÉDIATE ---
db.exec(`
  CREATE TABLE IF NOT EXISTS avance_immediate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL,
    telephone TEXT NOT NULL,
    adresse TEXT NOT NULL,
    ville TEXT NOT NULL,
    code_postal TEXT NOT NULL,
    prestation TEXT NOT NULL,
    montant_ttc REAL NOT NULL,
    date_prestation TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'en_attente',
    urssaf_response TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// --- APP ---
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

// --- ROUTE HTML ---
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  const host = req.get('host') || `localhost:${PORT}`;
  const proto = req.protocol === 'https' ? 'https' : 'http';
  const origin = `${proto}://${host}`;

  html = html.replace(
    /<meta name="cleanocc-api-origin" content="" \/>/,
    `<meta name="cleanocc-api-origin" content="${origin}" />`
  );

  res.type('html').send(html);
});

// --- API : POST devis ---
app.post('/api/devis', (req, res) => {
  const { name, email, phone, city, service, message } = req.body || {};

  if (!name || !phone || !city || !service || !message) {
    return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  }

  const stmt = db.prepare(`
    INSERT INTO devis_requests (name, email, phone, city, service, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    String(name).trim(),
    email ? String(email).trim() : '',
    String(phone).trim(),
    String(city).trim(),
    String(service).trim(),
    String(message).trim()
  );

  res.status(201).json({ ok: true, id: Number(result.lastInsertRowid) });

  // Envoi email de notification
  if (resend && process.env.NOTIFY_EMAIL) {
    resend.emails.send({
      from: 'CleanOcc <onboarding@resend.dev>',
      to: process.env.NOTIFY_EMAIL,
      subject: `Nouvelle demande de devis – ${String(name).trim()}`,
      html: `
        <h2>Nouvelle demande de devis CleanOcc</h2>
        <table>
          <tr><td><strong>Nom</strong></td><td>${String(name).trim()}</td></tr>
          <tr><td><strong>Email</strong></td><td>${email ? String(email).trim() : '—'}</td></tr>
          <tr><td><strong>Téléphone</strong></td><td>${String(phone).trim()}</td></tr>
          <tr><td><strong>Ville</strong></td><td>${String(city).trim()}</td></tr>
          <tr><td><strong>Prestation</strong></td><td>${String(service).trim()}</td></tr>
          <tr><td><strong>Message</strong></td><td>${String(message).trim()}</td></tr>
        </table>
      `
    }).catch(err => console.error('Resend error:', err));
  }
});

// --- API : Avance Immédiate – Inscription particulier ---
app.post('/api/avance-immediate/inscription', async (req, res) => {
  const { nom, prenom, email, telephone, adresse, ville, codePostal } = req.body || {};

  if (!nom || !prenom || !email || !telephone || !adresse || !ville || !codePostal) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  if (!URSSAF.clientId) {
    return res.status(503).json({ error: 'API URSSAF non configurée.' });
  }

  try {
    const result = await urssafRequest('POST', '/homeplus/v1/tiersPrestations/particuliers', {
      civilite: 'M',
      nom: String(nom).trim(),
      prenom: String(prenom).trim(),
      email: String(email).trim(),
      telephone: String(telephone).trim(),
      adresse: {
        ligne1: String(adresse).trim(),
        codePostal: String(codePostal).trim(),
        ville: String(ville).trim().toUpperCase(),
      },
      siretPrestataire: URSSAF.siret,
    });

    res.status(200).json({
      ok: result.status === 200 || result.status === 201,
      urssaf_status: result.status,
      urssaf: result.data,
    });
  } catch (err) {
    console.error('URSSAF inscription error:', err.message);
    res.status(500).json({ error: 'Erreur de communication avec l\'URSSAF.', detail: err.message });
  }
});

// --- API : Avance Immédiate – Demande de paiement ---
app.post('/api/avance-immediate/paiement', async (req, res) => {
  const {
    nom, prenom, email, telephone,
    adresse, ville, codePostal,
    prestation, montantTTC, datePrestation,
  } = req.body || {};

  if (!nom || !prenom || !email || !telephone || !adresse || !ville || !codePostal || !prestation || !montantTTC || !datePrestation) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  if (!URSSAF.clientId) {
    return res.status(503).json({ error: 'API URSSAF non configurée.' });
  }

  // Sauvegarde locale
  const stmt = db.prepare(`
    INSERT INTO avance_immediate (nom, prenom, email, telephone, adresse, ville, code_postal, prestation, montant_ttc, date_prestation, statut)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'envoyee')
  `);
  const row = stmt.run(
    String(nom).trim(), String(prenom).trim(), String(email).trim(),
    String(telephone).trim(), String(adresse).trim(), String(ville).trim(),
    String(codePostal).trim(), String(prestation).trim(),
    Number(montantTTC), String(datePrestation).trim()
  );
  const localId = Number(row.lastInsertRowid);

  try {
    const result = await urssafRequest('POST', '/atp/v1/tiersPrestations/demandesPaiement', {
      siretPrestataire: URSSAF.siret,
      particulier: {
        nom: String(nom).trim(),
        prenom: String(prenom).trim(),
        email: String(email).trim(),
      },
      prestation: {
        nature: String(prestation).trim(),
        dateDebut: String(datePrestation).trim(),
        dateFin: String(datePrestation).trim(),
        montantTTC: Number(montantTTC),
      },
    });

    // Mise à jour statut
    const statut = (result.status === 200 || result.status === 201) ? 'acceptee' : 'erreur_urssaf';
    db.prepare('UPDATE avance_immediate SET statut = ?, urssaf_response = ? WHERE id = ?')
      .run(statut, JSON.stringify(result.data), localId);

    res.status(result.status === 200 || result.status === 201 ? 201 : result.status).json({
      ok: result.status === 200 || result.status === 201,
      id: localId,
      urssaf: result.data,
    });
  } catch (err) {
    console.error('URSSAF paiement error:', err.message);
    db.prepare('UPDATE avance_immediate SET statut = ?, urssaf_response = ? WHERE id = ?')
      .run('erreur_reseau', err.message, localId);
    res.status(500).json({ error: 'Erreur de communication avec l\'URSSAF.', detail: err.message, id: localId });
  }

  // Notification email
  if (resend && process.env.NOTIFY_EMAIL) {
    resend.emails.send({
      from: 'CleanOcc <onboarding@resend.dev>',
      to: process.env.NOTIFY_EMAIL,
      subject: `Avance Immédiate – ${String(prenom).trim()} ${String(nom).trim()}`,
      html: `
        <h2>Nouvelle demande Avance Immédiate</h2>
        <table>
          <tr><td><strong>Nom</strong></td><td>${String(prenom).trim()} ${String(nom).trim()}</td></tr>
          <tr><td><strong>Email</strong></td><td>${String(email).trim()}</td></tr>
          <tr><td><strong>Téléphone</strong></td><td>${String(telephone).trim()}</td></tr>
          <tr><td><strong>Adresse</strong></td><td>${String(adresse).trim()}, ${String(codePostal).trim()} ${String(ville).trim()}</td></tr>
          <tr><td><strong>Prestation</strong></td><td>${String(prestation).trim()}</td></tr>
          <tr><td><strong>Montant TTC</strong></td><td>${Number(montantTTC).toFixed(2)} €</td></tr>
          <tr><td><strong>Date</strong></td><td>${String(datePrestation).trim()}</td></tr>
        </table>
      `,
    }).catch(err => console.error('Resend error:', err));
  }
});

// --- API : GET devis (admin) ---
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

app.get('/api/devis', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Non autorisé.' });
  }

  const rows = db.prepare(
    'SELECT id, name, email, phone, city, service, message, created_at FROM devis_requests ORDER BY id DESC LIMIT 500'
  ).all();

  res.json(rows);
});

// --- SERVER ---
const server = app.listen(PORT, () => {
  console.log(`CleanOcc — http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Erreur : le port ${PORT} est déjà utilisé.`);
    process.exit(1);
  }
  throw err;
});
