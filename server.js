require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// --- AIRTABLE ---
const AIRTABLE_KEY = process.env.AIRTABLE_KEY;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE;
const AIRTABLE_TABLE_DEVIS = process.env.AIRTABLE_TABLE_DEVIS;
const AIRTABLE_TABLE_AVANCE = process.env.AIRTABLE_TABLE_AVANCE;

function airtableDevisConfigured() {
  return Boolean(AIRTABLE_KEY && AIRTABLE_BASE && AIRTABLE_TABLE_DEVIS);
}

if (!airtableDevisConfigured()) {
  console.warn(
    '[CleanOcc] Airtable devis non configuré : définissez AIRTABLE_KEY, AIRTABLE_BASE et AIRTABLE_TABLE_DEVIS dans .env (ou les variables d’environnement sur Render / votre hébergeur).'
  );
}

async function airtableInsert(tableId, fields) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function airtableUpdate(tableId, recordId, fields) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableId}/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AIRTABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function airtableList(tableId) {
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableId}?sort[0][field]=Date&sort[0][direction]=desc&maxRecords=500`,
    { headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}` } }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.records;
}

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

async function urssafRequest(method, urlPath, body) {
  const token = await getUrssafToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${URSSAF.apiBase}${urlPath}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text.slice(0, 300) }; }

  return { status: res.status, data };
}

// --- CONFIG ---
const PORT = Number(process.env.PORT) || 3000;

// --- APP ---
const app = express();
app.set('trust proxy', true);
app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

// Santé de l’API (test CORS / disponibilité depuis le navigateur)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'cleanocc-api' });
});

// --- FICHIERS STATIQUES (app.js, etc.) ---
app.get('/app.js', (req, res) => {
  res.type('js').sendFile(path.join(__dirname, 'app.js'));
});

// --- ROUTE HTML ---
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  const host = req.get('host') || `localhost:${PORT}`;
  const isProduction = host.includes('cleanocc.fr');
  const proto = isProduction ? 'https' : req.protocol;
  const origin = `${proto}://${host}`;

  // Toujours forcer l’origine API sur l’hôte actuel (siné meta figée = formulaire vers Render, .env local ignoré).
  html = html.replace(
    /<meta name="cleanocc-api-origin" content="[^"]*" \/>/,
    `<meta name="cleanocc-api-origin" content="${origin}" />`
  );

  res.type('html').send(html);
});

// --- API : POST devis ---
app.post('/api/devis', async (req, res) => {
  const { name, email, phone, city, service, message } = req.body || {};

  if (!name || !phone || !city || !service || !message) {
    return res.status(400).json({ error: 'Champs obligatoires manquants.' });
  }

  if (!airtableDevisConfigured()) {
    console.error('POST /api/devis refusé : variables Airtable manquantes.');
    return res.status(503).json({
      error: 'Service temporairement indisponible : la base de données des demandes n’est pas configurée sur le serveur.',
    });
  }

  try {
    const record = await airtableInsert(AIRTABLE_TABLE_DEVIS, {
      'Nom': String(name).trim(),
      'Email': email ? String(email).trim() : '',
      'Téléphone': String(phone).trim(),
      'Ville': String(city).trim(),
      'Prestation': String(service).trim(),
      'Message': String(message).trim(),
      'Date': new Date().toISOString(),
    });

    res.status(201).json({ ok: true, id: record.id });

    if (resend && process.env.NOTIFY_EMAIL) {
      resend.emails.send({
        from: 'CleanOcc <noreply@cleanocc.fr>',
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
  } catch (err) {
    console.error('Airtable devis error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de la demande.' });
  }
});

// --- API : Avance Immédiate – Inscription particulier ---
app.post('/api/avance-immediate/inscription', async (req, res) => {
  const { nom, prenom, email, telephone, adresse, ville, codePostal,
          civilite, dateNaissance, communeNaissance, paysNaissance, iban } = req.body || {};

  if (!nom || !prenom || !email || !telephone || !adresse || !ville || !codePostal
      || !dateNaissance || !communeNaissance || !iban) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  if (!URSSAF.clientId) {
    return res.status(503).json({ error: 'API URSSAF non configurée.' });
  }

  let recordId;
  try {
    const record = await airtableInsert(AIRTABLE_TABLE_AVANCE, {
      'Nom': String(nom).trim(),
      'Prénom': String(prenom).trim(),
      'Email': String(email).trim(),
      'Téléphone': String(telephone).trim(),
      'Adresse': String(adresse).trim(),
      'Ville': String(ville).trim(),
      'Code Postal': String(codePostal).trim(),
      'Statut': 'en_attente',
      'Date': new Date().toISOString(),
    });
    recordId = record.id;
  } catch (err) {
    console.error('Airtable insert error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
  }

  try {
    const result = await urssafRequest('POST', '/atp/v1/tiersPrestations/particuliers', {
      civilite: String(civilite || 'M').trim(),
      nom: String(nom).trim(),
      prenom: String(prenom).trim(),
      email: String(email).trim(),
      telephone: String(telephone).trim(),
      dateNaissance: String(dateNaissance).trim(),
      communeNaissance: String(communeNaissance).trim().toUpperCase(),
      paysNaissance: String(paysNaissance || 'France').trim().toUpperCase(),
      iban: String(iban).replace(/\s/g, '').toUpperCase(),
      adresse: {
        ligne1: String(adresse).trim(),
        codePostal: String(codePostal).trim(),
        ville: String(ville).trim().toUpperCase(),
      },
      siretPrestataire: URSSAF.siret,
    });

    const ok = result.status === 200 || result.status === 201;
    await airtableUpdate(AIRTABLE_TABLE_AVANCE, recordId, {
      'Statut': ok ? 'urssaf_ok' : 'urssaf_erreur',
      'Réponse URSSAF': JSON.stringify(result.data),
    });

    res.status(200).json({ ok, id: recordId, urssaf: result.data });
  } catch (err) {
    console.error('URSSAF inscription error:', err.message);
    await airtableUpdate(AIRTABLE_TABLE_AVANCE, recordId, { 'Statut': 'erreur_reseau' }).catch(() => {});
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

  let recordId;
  try {
    const record = await airtableInsert(AIRTABLE_TABLE_AVANCE, {
      'Nom': String(nom).trim(),
      'Prénom': String(prenom).trim(),
      'Email': String(email).trim(),
      'Téléphone': String(telephone).trim(),
      'Adresse': String(adresse).trim(),
      'Ville': String(ville).trim(),
      'Code Postal': String(codePostal).trim(),
      'Prestation': String(prestation).trim(),
      'Montant TTC': Number(montantTTC),
      'Date Prestation': String(datePrestation).trim(),
      'Statut': 'en_attente',
      'Date': new Date().toISOString(),
    });
    recordId = record.id;
  } catch (err) {
    console.error('Airtable insert error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
  }

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

    const ok = result.status === 200 || result.status === 201;
    await airtableUpdate(AIRTABLE_TABLE_AVANCE, recordId, {
      'Statut': ok ? 'urssaf_ok' : 'urssaf_erreur',
      'Réponse URSSAF': JSON.stringify(result.data),
    });

    res.status(ok ? 201 : result.status).json({ ok, id: recordId, urssaf: result.data });
  } catch (err) {
    console.error('URSSAF paiement error:', err.message);
    await airtableUpdate(AIRTABLE_TABLE_AVANCE, recordId, {
      'Statut': 'erreur_reseau',
      'Réponse URSSAF': err.message,
    }).catch(() => {});
    res.status(500).json({ error: 'Erreur de communication avec l\'URSSAF.', detail: err.message, id: recordId });
  }

  if (resend && process.env.NOTIFY_EMAIL) {
    resend.emails.send({
      from: 'CleanOcc <noreply@cleanocc.fr>',
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

app.get('/api/devis', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Non autorisé.' });
  }

  if (!airtableDevisConfigured()) {
    return res.status(503).json({ error: 'Airtable non configuré pour les devis.' });
  }

  try {
    const records = await airtableList(AIRTABLE_TABLE_DEVIS);
    res.json(records.map(r => ({ id: r.id, ...r.fields })));
  } catch (err) {
    res.status(500).json({ error: 'Erreur Airtable.', detail: err.message });
  }
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
