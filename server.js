require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

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
});

// --- API : GET devis (admin) ---
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

app.get('/api/devis', (req, res