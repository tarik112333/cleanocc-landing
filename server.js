








require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const Database = require('better-sqlite3');
const dbPath = path.join(__dirname, 'data', 'devis.db'); // adapte le nom du fichier

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'devis.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  const host = req.get('host') || `localhost:${PORT}`;
  const proto = req.protocol === 'https' ? 'https' : 'http';
  const origin = `${proto}://${host}`;
  if (html.includes('name="cleanocc-api-origin" content=""')) {
    html = html.replace(
      /<meta name="cleanocc-api-origin" content="" \/>/,
      `<meta name="cleanocc-api-origin" content="${origin}" />`
    );
  }
  res.type('html').send(html);
});

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
  const id = Number(result.lastInsertRowid);
  console.log('[devis] enregistré id=' + id);
  res.status(201).json({ ok: true, id });
});

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

const server = app.listen(PORT, () => {
  console.log(`CleanOcc — http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Erreur : le port ${PORT} est déjà utilisé.\n` +
        `→ Fermez l’autre fenêtre où « npm start » tourne (Ctrl+C), ou\n` +
        `→ Définissez un autre port dans le fichier .env : PORT=3001`
    );
    process.exit(1);
  }
  throw err;
});


try {
  const rows = db.prepare("SELECT * FROM devis_requests").all();
  console.log("Données récupérées :", rows);
} catch (err) {
  console.error("Erreur SQL :", err);
}
