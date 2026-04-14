require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// --- STRIPE ---
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// --- AIRTABLE ---
const AIRTABLE_KEY = process.env.AIRTABLE_KEY;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE;
const AIRTABLE_TABLE_DEVIS = process.env.AIRTABLE_TABLE_DEVIS;
const AIRTABLE_TABLE_AVANCE = process.env.AIRTABLE_TABLE_AVANCE;
const AIRTABLE_TABLE_RESERVATIONS = process.env.AIRTABLE_TABLE_RESERVATIONS;

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

// --- FICHIERS STATIQUES (app.js, sitemap.xml, etc.) ---
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/app.js', (req, res) => {
  res.type('js').sendFile(path.join(__dirname, 'app.js'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, 'sitemap.xml'));
});

// --- PAGES SERVICE ---
const servicePages = [
  'nettoyage-fin-de-location-toulouse',
  'lavage-vitres-toulouse',
  'nettoyage-bureaux-toulouse',
  'nettoyage-fin-de-chantier-toulouse',
  'nettoyage-locations-courte-duree-toulouse',
];

servicePages.forEach((slug) => {
  app.get(`/${slug}`, (req, res) => {
    res.type('html').sendFile(path.join(__dirname, 'pages', `${slug}.html`));
  });
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

    if (resend) {
      const clientName = String(name).trim();
      const clientService = String(service).trim();

      // Notification interne
      if (process.env.NOTIFY_EMAIL) {
        resend.emails.send({
          from: 'CleanOcc <noreply@cleanocc.fr>',
          to: process.env.NOTIFY_EMAIL,
          subject: `Nouvelle demande de devis – ${clientName}`,
          html: `
            <h2>Nouvelle demande de devis CleanOcc</h2>
            <table>
              <tr><td><strong>Nom</strong></td><td>${clientName}</td></tr>
              <tr><td><strong>Email</strong></td><td>${email ? String(email).trim() : '—'}</td></tr>
              <tr><td><strong>Téléphone</strong></td><td>${String(phone).trim()}</td></tr>
              <tr><td><strong>Ville</strong></td><td>${String(city).trim()}</td></tr>
              <tr><td><strong>Prestation</strong></td><td>${clientService}</td></tr>
              <tr><td><strong>Message</strong></td><td>${String(message).trim()}</td></tr>
            </table>
          `
        }).catch(err => console.error('Resend notify error:', err));
      }

      // Confirmation au client
      if (email && String(email).trim()) {
        resend.emails.send({
          from: 'CleanOcc <noreply@cleanocc.fr>',
          to: String(email).trim(),
          subject: 'Votre demande de devis CleanOcc a bien été reçue',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
              <h2 style="color:#2563eb">Bonjour ${clientName},</h2>
              <p>Nous avons bien reçu votre demande de devis pour <strong>${clientService}</strong>.</p>
              <p>Notre équipe vous répondra <strong>sous 2h en semaine</strong> par téléphone ou email.</p>
              <p>En attendant, vous pouvez nous joindre directement :</p>
              <ul style="margin:12px 0 20px">
                <li>📞 <a href="tel:+33768140560">07 68 14 05 60</a></li>
                <li>💬 <a href="https://wa.me/33768140560">WhatsApp</a></li>
              </ul>
              <p style="color:#64748b;font-size:.9rem">À bientôt,<br><strong>L'équipe CleanOcc</strong></p>
            </div>
          `
        }).catch(err => console.error('Resend confirm error:', err));
      }
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

// --- STRIPE : Tarification ---
function calculerPrixReservation(service, surface) {
  const grille = {
    'lcd':          [30,  45,  100, 130, 160],
    'fin-location': [30,  45,   65,  80, 120],
    'bureaux':      [40,  55,   65, 150, 220],
    'fin-chantier': [160, 210, 260, 330, 420],
  };
  const tarifs = grille[service];
  if (!tarifs) return null;
  const s = Number(surface);
  if (isNaN(s) || s <= 0) return null;
  if (s <= 35)  return tarifs[0];
  if (s <= 55)  return tarifs[1];
  if (s <= 75)  return tarifs[2];
  if (s <= 100) return tarifs[3];
  return tarifs[4];
}

const SERVICE_LABELS = {
  'lcd':          'Nettoyage locations courte durée',
  'fin-location': 'Nettoyage fin de location',
  'bureaux':      'Nettoyage bureaux',
  'fin-chantier': 'Nettoyage fin de chantier',
};

// --- STRIPE : Routes pages ---
app.get('/reservation', (req, res) => {
  const filePath = path.join(__dirname, 'pages', 'reservation.html');
  let html = fs.readFileSync(filePath, 'utf8');
  const pubKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  html = html.replace('__STRIPE_PUBLISHABLE_KEY__', pubKey);
  res.type('html').send(html);
});

app.get('/mentions-legales', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'mentions-legales.html'));
});

app.get('/devis', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'devis.html'));
});
app.get('/nettoyage-blagnac', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'nettoyage-blagnac.html'));
});
app.get('/nettoyage-colomiers', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'nettoyage-colomiers.html'));
});
app.get('/nettoyage-balma', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'nettoyage-balma.html'));
});

app.get('/gestion-cc9x4k', (req, res) => {
  res.type('html').sendFile(path.join(__dirname, 'pages', 'admin.html'));
});

// --- STRIPE : POST /api/reservation/create-intent ---
app.post('/api/reservation/create-intent', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe non configuré.' });

  const { service, surface, date, heure, prenom, nom, email, telephone, adresse } = req.body || {};

  if (!service || !surface || !date || !heure || !prenom || !nom || !email || !telephone || !adresse) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  const montant = calculerPrixReservation(service, surface);
  if (!montant) return res.status(400).json({ error: 'Service ou surface invalide.' });

  let airtableId = null;
  if (AIRTABLE_TABLE_RESERVATIONS && AIRTABLE_KEY && AIRTABLE_BASE) {
    try {
      const record = await airtableInsert(AIRTABLE_TABLE_RESERVATIONS, {
        'Prénom': String(prenom).trim(),
        'Nom': String(nom).trim(),
        'Email': String(email).trim(),
        'Téléphone': String(telephone).trim(),
        'Service': SERVICE_LABELS[service] || service,
        'Surface (m²)': Number(surface),
        'Date': String(date).trim(),
        'Heure': String(heure).trim(),
        'Adresse': String(adresse).trim(),
        'Montant (€)': montant,
        'Statut': 'en_attente',
        'Créé le': new Date().toISOString(),
      });
      airtableId = record.id;
    } catch (err) {
      console.warn('Airtable reservation insert warning:', err.message);
    }
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: montant * 100,
      currency: 'eur',
      capture_method: 'manual',
      description: `CleanOcc – ${SERVICE_LABELS[service] || service} – ${String(prenom).trim()} ${String(nom).trim()}`,
      metadata: {
        service,
        surface: String(surface),
        date: String(date).trim(),
        heure: String(heure).trim(),
        prenom: String(prenom).trim(),
        nom: String(nom).trim(),
        email: String(email).trim(),
        telephone: String(telephone).trim(),
        adresse: String(adresse).trim(),
        airtableId: airtableId || '',
      },
    });

    if (airtableId) {
      await airtableUpdate(AIRTABLE_TABLE_RESERVATIONS, airtableId, {
        'PaymentIntentId': intent.id,
        'Statut': 'autorisé',
      }).catch(err => console.warn('Airtable update warning:', err.message));
    }

    res.json({ clientSecret: intent.client_secret, intentId: intent.id, montant });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: 'Erreur Stripe.', detail: err.message });
  }
});

// --- STRIPE : GET /api/admin/reservations ---
app.get('/api/admin/reservations', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Non autorisé.' });
  }

  if (!stripe) return res.status(503).json({ error: 'Stripe non configuré.' });

  try {
    const intents = await stripe.paymentIntents.list({ limit: 100 });
    const reservations = intents.data
      .filter(pi => pi.description && pi.description.startsWith('CleanOcc'))
      .map(pi => ({
        id: pi.id,
        statut: pi.status,
        montant: pi.amount / 100,
        description: pi.description,
        metadata: pi.metadata,
        created: pi.created,
      }));
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: 'Erreur Stripe.', detail: err.message });
  }
});

// --- STRIPE : POST /api/admin/reservations/:intentId/capture ---
app.post('/api/admin/reservations/:intentId/capture', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Non autorisé.' });
  }

  if (!stripe) return res.status(503).json({ error: 'Stripe non configuré.' });

  try {
    const intent = await stripe.paymentIntents.capture(req.params.intentId);
    const airtableId = intent.metadata?.airtableId;
    if (airtableId && AIRTABLE_TABLE_RESERVATIONS && AIRTABLE_KEY && AIRTABLE_BASE) {
      await airtableUpdate(AIRTABLE_TABLE_RESERVATIONS, airtableId, { 'Statut': 'encaissé' })
        .catch(err => console.warn('Airtable update warning:', err.message));
    }
    if (resend && intent.metadata?.email) {
      resend.emails.send({
        from: 'CleanOcc <noreply@cleanocc.fr>',
        to: intent.metadata.email,
        subject: 'CleanOcc – Paiement encaissé, merci !',
        html: `<p>Bonjour ${intent.metadata.prenom || ''},</p><p>Le prestataire est arrivé et votre paiement de <strong>${intent.amount / 100} €</strong> a été encaissé. Merci pour votre confiance !</p><p>L'équipe CleanOcc</p>`,
      }).catch(err => console.error('Resend error:', err));
    }
    res.json({ ok: true, status: intent.status });
  } catch (err) {
    console.error('Stripe capture error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la capture.', detail: err.message });
  }
});

// --- STRIPE : POST /api/admin/reservations/:intentId/cancel ---
app.post('/api/admin/reservations/:intentId/cancel', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Non autorisé.' });
  }

  if (!stripe) return res.status(503).json({ error: 'Stripe non configuré.' });

  try {
    const intent = await stripe.paymentIntents.cancel(req.params.intentId);
    const airtableId = intent.metadata?.airtableId;
    if (airtableId && AIRTABLE_TABLE_RESERVATIONS && AIRTABLE_KEY && AIRTABLE_BASE) {
      await airtableUpdate(AIRTABLE_TABLE_RESERVATIONS, airtableId, { 'Statut': 'annulé' })
        .catch(err => console.warn('Airtable update warning:', err.message));
    }
    res.json({ ok: true, status: intent.status });
  } catch (err) {
    console.error('Stripe cancel error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'annulation.', detail: err.message });
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
