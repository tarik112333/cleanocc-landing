require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
