# CleanOcc — Axes d'amélioration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer le SEO local, la conversion et la génération de leads du site cleanocc.fr

**Architecture:** Site HTML/CSS statique servi par Express (server.js) sur Render. Backend Resend pour les emails, Airtable pour le CRM, Stripe pour les réservations. Modifications principalement front (HTML/CSS) + quelques ajouts dans server.js.

**Tech Stack:** HTML5, CSS inline, Express.js, Resend, Airtable, Stripe, Meta Pixel

---

## Fichiers modifiés / créés

| Fichier | Action |
|---------|--------|
| `sitemap.xml` | Modifier — ajouter toutes les pages |
| `index.html` | Modifier — pixel Meta, avis hero, appel mobile, WhatsApp flottant, Review JSON-LD, og:image |
| `pages/*.html` (5 fichiers) | Modifier — pixel Meta, og:image |
| `pages/reservation.html` | Modifier — alignement design |
| `pages/mentions-legales.html` | Créer |
| `pages/devis.html` | Créer |
| `pages/nettoyage-blagnac.html` | Créer |
| `pages/nettoyage-colomiers.html` | Créer |
| `pages/nettoyage-balma.html` | Créer |
| `assets/og-cleanocc.svg` | Créer |
| `server.js` | Modifier — email confirmation client |

---

## Task 1 : Sitemap.xml complet

**Files:**
- Modify: `sitemap.xml`
- Modify: `server.js:144-148` (route statique)

- [ ] **Step 1 : Remplacer sitemap.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cleanocc.fr/</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/nettoyage-fin-de-chantier-toulouse</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/nettoyage-fin-de-location-toulouse</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/lavage-vitres-toulouse</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/nettoyage-bureaux-toulouse</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/nettoyage-locations-courte-duree-toulouse</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/nettoyage-blagnac</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/nettoyage-colomiers</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/nettoyage-balma</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/mentions-legales</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://cleanocc.fr/devis</loc>
    <lastmod>2026-04-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

- [ ] **Step 2 : Vérifier que la route Express sert bien le fichier**

Dans `server.js`, la route `GET /sitemap.xml` lit le fichier depuis le disque — elle se met à jour automatiquement. Ouvrir `http://localhost:3000/sitemap.xml` pour confirmer.

- [ ] **Step 3 : Commit**

```bash
git add sitemap.xml
git commit -m "seo: sitemap complet avec toutes les pages de service"
```

---

## Task 2 : Pixel Meta sur toutes les pages

**Prérequis :** Récupérer ton Pixel ID dans [Meta Business Manager](https://business.facebook.com) → Gestionnaire d'événements → Ton pixel → ID (format : 15 chiffres).

**Files:**
- Modify: `index.html` (après le bloc GA)
- Modify: `pages/nettoyage-fin-de-chantier-toulouse.html`
- Modify: `pages/nettoyage-fin-de-location-toulouse.html`
- Modify: `pages/lavage-vitres-toulouse.html`
- Modify: `pages/nettoyage-bureaux-toulouse.html`
- Modify: `pages/nettoyage-locations-courte-duree-toulouse.html`

- [ ] **Step 1 : Ajouter le snippet pixel dans `index.html`**

Dans `index.html`, juste après le bloc Google Analytics (ligne ~12), insérer en remplaçant `PIXEL_ID` par ton identifiant réel :

```html
<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'PIXEL_ID');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=PIXEL_ID&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel -->
```

- [ ] **Step 2 : Répéter sur les 5 pages de service**

Même snippet (avec le même PIXEL_ID) à insérer après le bloc GA dans chacun de ces fichiers :
- `pages/nettoyage-fin-de-chantier-toulouse.html` (après ligne 10)
- `pages/nettoyage-fin-de-location-toulouse.html`
- `pages/lavage-vitres-toulouse.html`
- `pages/nettoyage-bureaux-toulouse.html`
- `pages/nettoyage-locations-courte-duree-toulouse.html`

- [ ] **Step 3 : Ajouter l'événement `Lead` sur soumission du formulaire dans `index.html`**

Dans `app.js` (ou dans le script inline de `index.html` qui gère la soumission du formulaire de devis), après le `fetch('/api/devis', ...)` réussi, ajouter :

```javascript
if (typeof fbq !== 'undefined') {
  fbq('track', 'Lead');
}
```

- [ ] **Step 4 : Vérifier avec Meta Pixel Helper**

Installer l'extension [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper) dans Chrome. Ouvrir `http://localhost:3000` → l'extension doit afficher "PageView detected".

- [ ] **Step 5 : Commit**

```bash
git add index.html pages/nettoyage-fin-de-chantier-toulouse.html pages/nettoyage-fin-de-location-toulouse.html pages/lavage-vitres-toulouse.html pages/nettoyage-bureaux-toulouse.html pages/nettoyage-locations-courte-duree-toulouse.html app.js
git commit -m "feat: pixel Meta sur toutes les pages + événement Lead"
```

---

## Task 3 : Avis Google dans le hero + bouton appel mobile

**Files:**
- Modify: `index.html` (section hero)

- [ ] **Step 1 : Remonter la preuve sociale dans le hero**

Dans `index.html`, repérer la div `.hero-meta` (qui contient les petits indicateurs sous le titre). Ajouter avant cette div :

```html
<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
  <div style="display:flex;align-items:center;gap:4px;background:#fff;border:1px solid #e2e8f0;border-radius:999px;padding:6px 14px;font-size:.85rem;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <span style="color:#f59e0b">★★★★★</span>
    <span style="color:#0f172a">4,6/5</span>
    <span style="color:#64748b;font-weight:400">· +20 avis Google</span>
  </div>
  <a href="https://g.page/r/Ccu-SNMo8O5XEBM/review" target="_blank" rel="noopener"
     style="font-size:.8rem;color:#2563eb;font-weight:500">Laisser un avis →</a>
</div>
```

- [ ] **Step 2 : Ajouter un bouton d'appel visible sur mobile dans le hero**

Juste après le bloc `.cta-group` du hero (les boutons "Devis gratuit" etc.), ajouter :

```html
<a href="tel:+33768140560"
   style="display:none;align-items:center;justify-content:center;gap:8px;background:#0f172a;color:#fff;padding:14px 22px;border-radius:999px;font-weight:700;font-size:1rem;margin-top:10px;width:100%;text-align:center"
   id="hero-call-mobile">📞 Appeler maintenant – 07 68 14 05 60</a>
<style>
@media(max-width:640px){#hero-call-mobile{display:flex}}
</style>
```

- [ ] **Step 3 : Ajouter la barre WhatsApp flottante mobile**

Juste avant la balise `</body>` de `index.html`, ajouter :

```html
<!-- WhatsApp flottant mobile -->
<a href="https://wa.me/33768140560?text=Bonjour%2C%20je%20voudrais%20un%20devis%20pour%20un%20nettoyage%20%C3%A0%20Toulouse."
   target="_blank" rel="noopener"
   style="display:none;position:fixed;bottom:20px;right:20px;z-index:999;background:#22c55e;color:#fff;border-radius:999px;padding:14px 20px;font-weight:700;font-size:.95rem;box-shadow:0 8px 24px rgba(34,197,94,.45);align-items:center;gap:8px"
   id="whatsapp-float">
  💬 WhatsApp
</a>
<style>
@media(max-width:640px){#whatsapp-float{display:flex}}
</style>
```

- [ ] **Step 4 : Vérifier sur mobile**

Ouvrir Chrome DevTools → responsive mode (iPhone 390px) → vérifier que :
- Le bloc étoiles ★ est visible dans le hero
- Le bouton "Appeler maintenant" est visible
- La bulle WhatsApp verte flotte en bas à droite

- [ ] **Step 5 : Commit**

```bash
git add index.html
git commit -m "feat: avis Google dans hero + bouton appel mobile + WhatsApp flottant"
```

---

## Task 4 : Page mentions légales

**Files:**
- Create: `pages/mentions-legales.html`
- Modify: `server.js` (ajouter route GET)
- Modify: `index.html` (lien footer)

- [ ] **Step 1 : Créer `pages/mentions-legales.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mentions légales – CleanOcc</title>
  <meta name="description" content="Mentions légales de CleanOcc, entreprise de nettoyage à Toulouse." />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="https://cleanocc.fr/mentions-legales" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#f5f7fb;color:#0f172a;line-height:1.7}
    nav{position:sticky;top:0;z-index:50;background:rgba(248,250,252,.92);backdrop-filter:blur(16px);border-bottom:1px solid rgba(148,163,184,.18);display:flex;align-items:center;justify-content:space-between;padding:14px 7vw}
    .logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.05rem;color:#0f172a}
    .logo-mark{width:32px;height:32px;border-radius:999px;background:radial-gradient(circle at 20% 0%,#38bdf8,#2563eb);display:flex;align-items:center;justify-content:center;color:#eff6ff;font-weight:800;font-size:.85rem}
    main{max-width:780px;margin:0 auto;padding:48px 7vw 80px}
    h1{font-size:2rem;font-weight:800;margin-bottom:32px;color:#020617}
    h2{font-size:1.2rem;font-weight:700;margin:32px 0 12px;color:#0f172a}
    p,address{color:#64748b;font-size:.95rem;margin-bottom:8px;font-style:normal}
    footer{background:#0f172a;color:#94a3b8;padding:24px 7vw;font-size:.85rem;text-align:center}
    footer a{color:#60a5fa}
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">
      <div class="logo-mark">C</div>
      <div>CleanOcc</div>
    </a>
    <a href="tel:+33768140560" style="font-size:.9rem;font-weight:600;color:#2563eb">📞 07 68 14 05 60</a>
  </nav>

  <main>
    <h1>Mentions légales</h1>

    <h2>Éditeur du site</h2>
    <address>
      <strong>CleanOcc</strong><br>
      Entreprise de nettoyage – Auto-entrepreneur<br>
      Toulouse (31), France<br>
      Téléphone : <a href="tel:+33768140560">07 68 14 05 60</a><br>
      Email : <a href="mailto:contact@cleanocc.fr">contact@cleanocc.fr</a>
    </address>

    <h2>Hébergement</h2>
    <p>
      Site statique hébergé sur <strong>Hostinger</strong> (Hostinger International Ltd, 61 Lordou Vironos Street, 6023 Larnaca, Chypre).<br>
      API hébergée sur <strong>Render</strong> (Render Services Inc., 525 Brannan Street, Suite 300, San Francisco, CA 94107, USA).
    </p>

    <h2>Propriété intellectuelle</h2>
    <p>L'ensemble des contenus de ce site (textes, visuels, structure) est la propriété exclusive de CleanOcc. Toute reproduction sans autorisation est interdite.</p>

    <h2>Données personnelles (RGPD)</h2>
    <p>Les données collectées via le formulaire de contact (nom, téléphone, email, message) sont utilisées uniquement pour répondre à votre demande de devis. Elles sont stockées dans un espace sécurisé (Airtable) et ne sont pas transmises à des tiers. Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données en contactant <a href="mailto:contact@cleanocc.fr">contact@cleanocc.fr</a>.</p>

    <h2>Cookies</h2>
    <p>Ce site utilise Google Analytics (mesure d'audience anonymisée) et un pixel Meta (publicité). Ces cookies peuvent être refusés en paramétrant votre navigateur.</p>
  </main>

  <footer>
    <div>© 2026 CleanOcc – <a href="/">Accueil</a> · <a href="mailto:contact@cleanocc.fr">contact@cleanocc.fr</a></div>
  </footer>
</body>
</html>
```

- [ ] **Step 2 : Ajouter la route Express dans `server.js`**

Dans `server.js`, après la route `GET /reservation` (ligne ~487), ajouter :

```javascript
app.get('/mentions-legales', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'mentions-legales.html'));
});
```

- [ ] **Step 3 : Ajouter le lien dans le footer de `index.html`**

Dans `index.html`, dans le `<footer>`, ajouter le lien mentions légales :

```html
<div><a href="/mentions-legales">Mentions légales</a> · <a href="mailto:contact@cleanocc.fr">contact@cleanocc.fr</a></div>
```

(Remplacer la ligne email existante par celle-ci)

- [ ] **Step 4 : Vérifier**

Ouvrir `http://localhost:3000/mentions-legales` → la page s'affiche correctement.

- [ ] **Step 5 : Commit**

```bash
git add pages/mentions-legales.html server.js index.html
git commit -m "feat: page mentions légales + route Express + lien footer"
```

---

## Task 5 : og:image sur toutes les pages

**Files:**
- Create: `assets/og-cleanocc.svg`
- Modify: `index.html` + 5 pages de service (balise meta og:image)

- [ ] **Step 1 : Créer `assets/og-cleanocc.svg`**

Créer le dossier `assets/` et y placer ce fichier SVG (1200×630, utilisable comme OG image) :

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(1200 630)">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="60%" stop-color="#f5f7fb"/>
      <stop offset="100%" stop-color="#eef2ff"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="60" cy="60" r="36" fill="#2563eb"/>
  <text x="60" y="68" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="22" fill="white">C</text>
  <text x="110" y="72" font-family="Arial,sans-serif" font-weight="800" font-size="28" fill="#0f172a">CleanOcc</text>
  <text x="600" y="260" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="68" fill="#020617">Entreprise de nettoyage</text>
  <text x="600" y="340" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="56" fill="#2563eb">à Toulouse</text>
  <text x="600" y="430" text-anchor="middle" font-family="Arial,sans-serif" font-size="34" fill="#64748b">Lavage de vitres · Fin de location · Fin de chantier</text>
  <text x="600" y="510" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="#64748b">⭐ 4,6/5 · Devis gratuit · 07 68 14 05 60</text>
</svg>
```

- [ ] **Step 2 : Servir le dossier assets dans `server.js`**

Dans `server.js`, après les autres `express.static`, ajouter :

```javascript
app.use('/assets', express.static(path.join(__dirname, 'assets')));
```

- [ ] **Step 3 : Ajouter og:image dans `index.html`**

Après la balise `<meta property="og:site_name" ...>` existante, ajouter :

```html
<meta property="og:image" content="https://cleanocc.fr/assets/og-cleanocc.svg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:image" content="https://cleanocc.fr/assets/og-cleanocc.svg" />
```

- [ ] **Step 4 : Ajouter og:image dans les 5 pages de service**

Pour chaque page dans `pages/`, ajouter après la balise `og:site_name` existante :

```html
<meta property="og:image" content="https://cleanocc.fr/assets/og-cleanocc.svg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

Pages à modifier :
- `pages/nettoyage-fin-de-chantier-toulouse.html`
- `pages/nettoyage-fin-de-location-toulouse.html`
- `pages/lavage-vitres-toulouse.html`
- `pages/nettoyage-bureaux-toulouse.html`
- `pages/nettoyage-locations-courte-duree-toulouse.html`

- [ ] **Step 5 : Vérifier**

Ouvrir `http://localhost:3000/assets/og-cleanocc.svg` → le SVG s'affiche.
Tester le rendu OG sur [opengraph.xyz](https://www.opengraph.xyz) avec l'URL de prod après déploiement.

- [ ] **Step 6 : Commit**

```bash
git add assets/og-cleanocc.svg server.js index.html pages/nettoyage-fin-de-chantier-toulouse.html pages/nettoyage-fin-de-location-toulouse.html pages/lavage-vitres-toulouse.html pages/nettoyage-bureaux-toulouse.html pages/nettoyage-locations-courte-duree-toulouse.html
git commit -m "feat: og:image SVG sur toutes les pages"
```

---

## Task 6 : Alignement design reservation.html

**Files:**
- Modify: `pages/reservation.html` (CSS uniquement)

La page utilise une police système et des couleurs différentes du reste du site. On aligne sur Inter + palette CleanOcc.

- [ ] **Step 1 : Remplacer le `<head>` CSS dans `reservation.html`**

Dans `reservation.html`, remplacer les balises `<style>` existantes par :

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--primary:#2563eb;--primary-dark:#1d4ed8;--text:#0f172a;--muted:#64748b;--border:#e2e8f0}
  body{font-family:'Inter',system-ui,sans-serif;background:radial-gradient(circle at top left,#e0f2fe,#f5f7fb 40%,#eef2ff 100%);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
  header{background:rgba(248,250,252,.92);backdrop-filter:blur(16px);border-bottom:1px solid rgba(148,163,184,.18);padding:14px 7vw;display:flex;align-items:center;justify-content:space-between}
  .logo{font-size:1.05rem;font-weight:800;color:var(--text);text-decoration:none;display:flex;align-items:center;gap:10px}
  .logo-mark{width:32px;height:32px;border-radius:999px;background:radial-gradient(circle at 20% 0%,#38bdf8,#2563eb);display:flex;align-items:center;justify-content:center;color:#eff6ff;font-weight:800;font-size:.85rem}
  .container{max-width:680px;margin:0 auto;padding:2rem 1rem 4rem}
  h1{font-size:1.8rem;font-weight:800;color:#020617;margin-bottom:.4rem;letter-spacing:-.04em}
  .subtitle{color:var(--muted);margin-bottom:2rem;font-size:.95rem}
  .card{background:#fff;border-radius:18px;box-shadow:0 4px 12px rgba(15,23,42,.06);padding:2rem;margin-bottom:1.5rem;border:1px solid var(--border)}
  .card h2{font-size:.85rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:1.2rem;padding-bottom:.6rem;border-bottom:1px solid var(--border)}
  .field-group{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .field-group.full{grid-template-columns:1fr}
  label{display:block;font-size:.82rem;font-weight:600;color:#334155;margin-bottom:.4rem}
  select,input[type="text"],input[type="email"],input[type="tel"],input[type="number"],input[type="date"]{width:100%;padding:.65rem .85rem;border:1.5px solid var(--border);border-radius:10px;font-size:.95rem;font-family:inherit;background:#f8fafc;color:var(--text)}
  select:focus,input:focus{outline:none;border-color:var(--primary);background:#fff}
  .field-error{font-size:.8rem;color:#dc2626;margin-top:.25rem;display:none}
  .total-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:1rem 1.2rem;margin:1rem 0;display:flex;justify-content:space-between;align-items:center}
  .total-label{font-size:.9rem;color:var(--muted)}
  .total-amount{font-size:1.4rem;font-weight:800;color:var(--primary)}
  .btn-submit{width:100%;padding:14px;background:var(--primary);color:#fff;border:none;border-radius:999px;font-size:1rem;font-weight:700;cursor:pointer;box-shadow:0 12px 30px rgba(37,99,235,.35);font-family:inherit;margin-top:.5rem}
  .btn-submit:hover{background:var(--primary-dark)}
  .btn-submit:disabled{opacity:.6;cursor:not-allowed}
  #payment-element{margin-bottom:1rem}
  .secure-note{font-size:.8rem;color:var(--muted);text-align:center;margin-top:.75rem}
  .alert{padding:1rem 1.2rem;border-radius:12px;margin-bottom:1rem;font-size:.9rem}
  .alert-success{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
  .alert-error{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}
  @media(max-width:560px){.field-group{grid-template-columns:1fr}}
</style>
```

- [ ] **Step 2 : Mettre à jour le header HTML dans `reservation.html`**

Remplacer le bloc `<header>` existant par :

```html
<header>
  <a href="/" class="logo">
    <div class="logo-mark">C</div>
    <div>CleanOcc</div>
  </a>
  <a href="tel:+33768140560" style="font-size:.85rem;font-weight:600;color:#2563eb">📞 07 68 14 05 60</a>
</header>
```

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `http://localhost:3000/reservation` et comparer avec `http://localhost:3000` → même police, même bleu, même style de cartes.

- [ ] **Step 4 : Commit**

```bash
git add pages/reservation.html
git commit -m "style: aligner reservation.html sur le design principal CleanOcc"
```

---

## Task 7 : Page devis.html dédiée

**Files:**
- Create: `pages/devis.html`
- Modify: `server.js` (route GET /devis)
- Modify: `index.html` (bouton "Devis gratuit" pointe vers /devis)

- [ ] **Step 1 : Créer `pages/devis.html`**

Copier le bloc formulaire de devis depuis `index.html` (section `#contact`) dans une page autonome :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <!-- Google tag -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-DWLLGWM88G"></script>
  <script>
    window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
    gtag('js',new Date());gtag('config','G-DWLLGWM88G');
  </script>
  <!-- Meta Pixel — remplacer PIXEL_ID -->
  <script>
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init','PIXEL_ID');fbq('track','PageView');
  </script>

  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Devis gratuit – Nettoyage à Toulouse – CleanOcc</title>
  <meta name="description" content="Demandez votre devis gratuit pour un nettoyage à Toulouse. Réponse sous 2h en semaine. CleanOcc – lavage de vitres, fin de location, fin de chantier." />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="https://cleanocc.fr/devis" />
  <meta property="og:title" content="Devis gratuit – CleanOcc Toulouse" />
  <meta property="og:description" content="Demandez un devis gratuit pour votre nettoyage à Toulouse. Réponse sous 2h." />
  <meta property="og:image" content="https://cleanocc.fr/assets/og-cleanocc.svg" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--primary:#2563eb;--primary-dark:#1d4ed8;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#22c55e}
    body{font-family:'Inter',sans-serif;background:radial-gradient(circle at top left,#e0f2fe,#f5f7fb 40%,#eef2ff 100%);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
    nav{position:sticky;top:0;z-index:50;background:rgba(248,250,252,.92);backdrop-filter:blur(16px);border-bottom:1px solid rgba(148,163,184,.18);display:flex;align-items:center;justify-content:space-between;padding:14px 7vw}
    .logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.05rem;color:var(--text);text-decoration:none}
    .logo-mark{width:32px;height:32px;border-radius:999px;background:radial-gradient(circle at 20% 0%,#38bdf8,#2563eb);display:flex;align-items:center;justify-content:center;color:#eff6ff;font-weight:800;font-size:.85rem}
    main{max-width:680px;margin:0 auto;padding:48px 7vw 80px}
    .badge{display:inline-flex;align-items:center;gap:6px;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:999px;padding:5px 14px;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px}
    h1{font-size:clamp(1.7rem,3vw,2.2rem);font-weight:800;color:#020617;letter-spacing:-.04em;margin-bottom:10px}
    .sub{color:var(--muted);font-size:.97rem;margin-bottom:32px}
    .form-card{background:#fff;border:1px solid var(--border);border-radius:18px;padding:32px;box-shadow:0 4px 12px rgba(15,23,42,.06)}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
    .form-full{margin-bottom:16px}
    label{display:block;font-size:.82rem;font-weight:600;color:#334155;margin-bottom:5px}
    input,select,textarea{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:.95rem;font-family:inherit;background:#f8fafc;color:var(--text)}
    input:focus,select:focus,textarea:focus{outline:none;border-color:var(--primary);background:#fff}
    textarea{resize:vertical;min-height:100px}
    .btn{width:100%;padding:14px;background:var(--primary);color:#fff;border:none;border-radius:999px;font-size:1rem;font-weight:700;cursor:pointer;box-shadow:0 12px 30px rgba(37,99,235,.35);font-family:inherit;margin-top:8px}
    .btn:disabled{opacity:.6;cursor:not-allowed}
    .urgency{font-size:.82rem;color:var(--muted);text-align:center;margin-top:10px}
    .success{display:none;background:#dcfce7;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-top:20px;color:#166534;font-weight:600}
    @media(max-width:560px){.form-row{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo"><div class="logo-mark">C</div><div>CleanOcc</div></a>
    <a href="tel:+33768140560" style="font-size:.85rem;font-weight:600;color:var(--primary)">📞 07 68 14 05 60</a>
  </nav>

  <main>
    <div class="badge">✅ Devis gratuit · Réponse sous 2h en semaine</div>
    <h1>Demander un devis gratuit</h1>
    <p class="sub">Décrivez votre besoin, on vous répond rapidement avec un tarif clair, sans engagement.</p>

    <div class="form-card">
      <form id="devis-form">
        <div class="form-row">
          <div>
            <label for="name">Nom *</label>
            <input type="text" id="name" name="name" required placeholder="Dupont" />
          </div>
          <div>
            <label for="phone">Téléphone *</label>
            <input type="tel" id="phone" name="phone" required placeholder="06 00 00 00 00" />
          </div>
        </div>
        <div class="form-row">
          <div>
            <label for="email">Email</label>
            <input type="email" id="email" name="email" placeholder="vous@email.com" />
          </div>
          <div>
            <label for="city">Ville *</label>
            <input type="text" id="city" name="city" required placeholder="Toulouse, Blagnac…" />
          </div>
        </div>
        <div class="form-full">
          <label for="service">Type de prestation *</label>
          <select id="service" name="service" required>
            <option value="">Choisir…</option>
            <option>Lavage de vitres</option>
            <option>Nettoyage fin de location</option>
            <option>Nettoyage fin de chantier</option>
            <option>Nettoyage de bureaux</option>
            <option>Location courte durée (Airbnb…)</option>
            <option>Autre / non listé</option>
          </select>
        </div>
        <div class="form-full">
          <label for="message">Décrivez votre besoin *</label>
          <textarea id="message" name="message" required placeholder="Surface approximative, fréquence souhaitée, état des lieux…"></textarea>
        </div>
        <button type="submit" class="btn" id="submit-btn">Envoyer ma demande →</button>
        <p class="urgency">⏱ Réponse sous 2h en semaine · Sans engagement</p>
      </form>
      <div class="success" id="success-msg">
        ✅ Demande envoyée ! Nous vous répondrons sous 2h en semaine. Vérifiez vos SMS et email.
      </div>
    </div>
  </main>

  <script>
    const API = document.querySelector('meta[name="cleanocc-api-origin"]')?.content || '';
    document.getElementById('devis-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.textContent = 'Envoi en cours…';
      const data = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        city: document.getElementById('city').value,
        service: document.getElementById('service').value,
        message: document.getElementById('message').value,
      };
      try {
        const res = await fetch(`${API}/api/devis`, {
          method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data)
        });
        if (res.ok) {
          document.getElementById('devis-form').style.display = 'none';
          document.getElementById('success-msg').style.display = 'block';
          if (typeof fbq !== 'undefined') fbq('track', 'Lead');
          if (typeof gtag !== 'undefined') gtag('event', 'generate_lead', {event_category:'devis'});
        } else {
          alert('Une erreur est survenue. Appelez-nous directement : 07 68 14 05 60');
          btn.disabled = false; btn.textContent = 'Envoyer ma demande →';
        }
      } catch {
        alert('Erreur réseau. Appelez-nous : 07 68 14 05 60');
        btn.disabled = false; btn.textContent = 'Envoyer ma demande →';
      }
    });
  </script>
</body>
</html>
```

- [ ] **Step 2 : Ajouter la route dans `server.js`**

Après la route `/mentions-legales`, ajouter :

```javascript
app.get('/devis', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'devis.html'));
});
```

- [ ] **Step 3 : Faire pointer les boutons "Devis gratuit" vers `/devis`**

Dans `index.html`, remplacer les href `/#contact` des boutons principaux par `/devis` :
- Bouton `.btn-nav` dans la nav
- Bouton `.btn-primary` dans le hero

Garder `/#contact` pour les liens secondaires en bas de page.

- [ ] **Step 4 : Vérifier**

Ouvrir `http://localhost:3000/devis` → formulaire s'affiche. Soumettre un test → message de succès apparaît.

- [ ] **Step 5 : Commit**

```bash
git add pages/devis.html server.js index.html
git commit -m "feat: page /devis dédiée avec tracking GA4 + pixel Lead"
```

---

## Task 8 : Review JSON-LD dans index.html

**Files:**
- Modify: `index.html` (bloc JSON-LD LocalBusiness)

- [ ] **Step 1 : Ajouter les reviews dans le schéma JSON-LD de `index.html`**

Dans `index.html`, trouver le bloc `"aggregateRating"` dans le premier `<script type="application/ld+json">` et ajouter après (avant la fermeture `}`) :

```json
,
"review": [
  {
    "@type": "Review",
    "author": { "@type": "Person", "name": "Ako Bedai" },
    "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
    "reviewBody": "Très professionnel, travail soigné et ponctuel. Je recommande CleanOcc sans hésitation."
  },
  {
    "@type": "Review",
    "author": { "@type": "Person", "name": "Kim" },
    "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
    "reviewBody": "Excellent service, appartement rendu impeccable pour l'état des lieux. Merci !"
  }
]
```

- [ ] **Step 2 : Valider**

Copier le JSON-LD complet et le coller dans [search.google.com/test/rich-results](https://search.google.com/test/rich-results) → aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add index.html
git commit -m "seo: ajouter reviews JSON-LD pour rich snippets Google"
```

---

## Task 9 : Pages géo-ciblées

**Files:**
- Create: `pages/nettoyage-blagnac.html`
- Create: `pages/nettoyage-colomiers.html`
- Create: `pages/nettoyage-balma.html`
- Modify: `server.js` (3 routes GET)

- [ ] **Step 1 : Créer `pages/nettoyage-blagnac.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-DWLLGWM88G"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-DWLLGWM88G');</script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nettoyage à Blagnac – CleanOcc</title>
  <meta name="description" content="Entreprise de nettoyage à Blagnac : lavage de vitres, fin de location, fin de chantier. CleanOcc intervient à Blagnac et autour de Toulouse. Devis gratuit." />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="https://cleanocc.fr/nettoyage-blagnac" />
  <meta property="og:title" content="Nettoyage à Blagnac – CleanOcc" />
  <meta property="og:description" content="Service de nettoyage professionnel à Blagnac. Lavage de vitres, fin de location, fin de chantier. Devis gratuit." />
  <meta property="og:image" content="https://cleanocc.fr/assets/og-cleanocc.svg" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "CleanOcc – Nettoyage à Blagnac",
    "url": "https://cleanocc.fr/nettoyage-blagnac",
    "telephone": "+33768140560",
    "email": "contact@cleanocc.fr",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Blagnac",
      "addressRegion": "Occitanie",
      "postalCode": "31700",
      "addressCountry": "FR"
    },
    "areaServed": { "@type": "City", "name": "Blagnac" }
  }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--primary:#2563eb;--primary-dark:#1d4ed8;--accent:#22c55e;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--radius-lg:18px}
    body{font-family:'Inter',sans-serif;background:radial-gradient(circle at top left,#e0f2fe,#f5f7fb 40%,#eef2ff 100%);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased}
    a{color:inherit;text-decoration:none}
    nav{position:sticky;top:0;z-index:50;background:rgba(248,250,252,.92);backdrop-filter:blur(16px);border-bottom:1px solid rgba(148,163,184,.18);display:flex;align-items:center;justify-content:space-between;padding:14px 7vw}
    .logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.05rem;color:#0f172a}
    .logo-mark{width:32px;height:32px;border-radius:999px;background:radial-gradient(circle at 20% 0%,#38bdf8,#2563eb);display:flex;align-items:center;justify-content:center;color:#eff6ff;font-weight:800;font-size:.85rem}
    .btn-nav{background:var(--primary);color:#fff;padding:9px 16px;border-radius:999px;font-weight:600;font-size:.85rem}
    main{max-width:1120px;margin:0 auto;padding:40px 7vw 64px}
    .breadcrumb{font-size:.8rem;color:var(--muted);margin-bottom:24px}
    .breadcrumb a{color:var(--primary)}
    .page-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:rgba(59,130,246,.08);border:1px solid rgba(129,140,248,.4);color:#1d4ed8;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;margin-bottom:18px}
    h1{font-size:clamp(1.8rem,3.2vw,2.6rem);line-height:1.1;letter-spacing:-.04em;margin-bottom:16px;color:#020617}
    h1 em{font-style:normal;color:var(--primary)}
    h2{font-size:clamp(1.2rem,2vw,1.6rem);margin-bottom:12px;color:#020617}
    p{color:var(--muted);margin-bottom:12px;font-size:.97rem}
    section{margin-bottom:52px}
    .intro{font-size:1.05rem;color:var(--muted);max-width:680px;margin-bottom:28px}
    .cta-group{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
    .btn-primary{display:inline-flex;align-items:center;gap:8px;background:var(--primary);color:#fff;padding:13px 22px;border-radius:999px;font-weight:700;font-size:.95rem;box-shadow:0 12px 30px rgba(37,99,235,.35)}
    .btn-secondary{display:inline-flex;align-items:center;gap:8px;background:rgba(226,232,240,.8);color:var(--text);padding:13px 20px;border-radius:999px;font-weight:600;font-size:.92rem;border:1px solid var(--border)}
    .btn-whatsapp{display:inline-flex;align-items:center;gap:8px;background:#22c55e;color:#fff;padding:13px 20px;border-radius:999px;font-weight:600;font-size:.92rem}
    .checklist{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;margin:16px 0 20px}
    .checklist li{display:flex;align-items:flex-start;gap:10px;background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 16px;font-size:.9rem}
    .checklist li::before{content:"✓";color:var(--accent);font-weight:700;flex-shrink:0;margin-top:1px}
    .services-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
    .services-links a{background:#fff;border:1px solid var(--border);border-radius:999px;padding:7px 16px;font-size:.85rem;font-weight:500;color:var(--primary)}
    footer{background:#0f172a;color:#94a3b8;padding:24px 7vw;font-size:.85rem}
    footer>div{max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;align-items:center}
    footer a{color:#60a5fa}
    @media(max-width:640px){.checklist{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo"><div class="logo-mark">C</div><div>CleanOcc</div></a>
    <div style="display:flex;align-items:center;gap:10px">
      <a href="tel:+33768140560" style="font-size:.85rem;font-weight:600;color:var(--primary)">📞 07 68 14 05 60</a>
      <a href="/devis" class="btn-nav">Devis gratuit</a>
    </div>
  </nav>

  <main>
    <div class="breadcrumb">
      <a href="/">CleanOcc</a> › Nettoyage à Blagnac
    </div>

    <section>
      <div class="page-badge">Service – Blagnac & environs</div>
      <h1>Nettoyage professionnel à <em>Blagnac</em></h1>
      <p class="intro">
        CleanOcc intervient à Blagnac pour tous vos besoins de nettoyage : lavage de vitres, remise en état fin de location,
        nettoyage après travaux, entretien de bureaux. Devis gratuit, réponse sous 2h en semaine.
      </p>
      <div class="cta-group">
        <a href="/devis" class="btn-primary">Demander un devis gratuit</a>
        <a href="tel:+33768140560" class="btn-secondary">📞 07 68 14 05 60</a>
        <a href="https://wa.me/33768140560?text=Bonjour%2C+je+cherche+un+nettoyage+%C3%A0+Blagnac." target="_blank" rel="noopener" class="btn-whatsapp">💬 WhatsApp</a>
      </div>
    </section>

    <section>
      <h2>Nos services à Blagnac</h2>
      <ul class="checklist">
        <li>Lavage de vitres – particuliers et professionnels</li>
        <li>Nettoyage de fin de location (état des lieux sortant)</li>
        <li>Remise en état après travaux (fin de chantier)</li>
        <li>Nettoyage de bureaux et locaux professionnels</li>
        <li>Entretien de locations courte durée (Airbnb, etc.)</li>
        <li>Avance immédiate de crédit d'impôt 50% pour les particuliers</li>
      </ul>
    </section>

    <section>
      <h2>Pourquoi choisir CleanOcc à Blagnac ?</h2>
      <p>Basés à Toulouse, nous intervenons régulièrement à Blagnac (31700) et dans toute la première couronne toulousaine. Réactivité, tarifs clairs, matériel fourni.</p>
      <p>⭐ Note 4,6/5 · +20 avis Google · Devis répondu sous 2h en semaine.</p>
    </section>

    <div style="border-top:1px solid var(--border);padding-top:32px">
      <p style="font-size:.85rem;color:var(--muted);margin-bottom:12px">Nos autres pages de service :</p>
      <div class="services-links">
        <a href="/nettoyage-fin-de-chantier-toulouse">Fin de chantier Toulouse</a>
        <a href="/nettoyage-fin-de-location-toulouse">Fin de location Toulouse</a>
        <a href="/lavage-vitres-toulouse">Lavage de vitres Toulouse</a>
        <a href="/nettoyage-colomiers">Nettoyage Colomiers</a>
        <a href="/nettoyage-balma">Nettoyage Balma</a>
        <a href="/">Accueil CleanOcc</a>
      </div>
    </div>
  </main>

  <footer>
    <div>
      <div>© 2026 CleanOcc – Nettoyage à Blagnac et Toulouse.</div>
      <div><a href="/mentions-legales">Mentions légales</a> · <a href="mailto:contact@cleanocc.fr">contact@cleanocc.fr</a></div>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 2 : Créer `pages/nettoyage-colomiers.html`**

Copier `nettoyage-blagnac.html` et remplacer :
- `Blagnac` → `Colomiers` (toutes occurrences)
- `blagnac` → `colomiers` (slugs et URLs)
- `31700` → `31770` (code postal)
- `nettoyage-blagnac` → `nettoyage-colomiers` (canonical et liens)

- [ ] **Step 3 : Créer `pages/nettoyage-balma.html`**

Copier `nettoyage-blagnac.html` et remplacer :
- `Blagnac` → `Balma`
- `blagnac` → `balma`
- `31700` → `31130`
- `nettoyage-blagnac` → `nettoyage-balma`

- [ ] **Step 4 : Ajouter les 3 routes dans `server.js`**

Après la route `/devis`, ajouter :

```javascript
app.get('/nettoyage-blagnac', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'nettoyage-blagnac.html'));
});
app.get('/nettoyage-colomiers', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'nettoyage-colomiers.html'));
});
app.get('/nettoyage-balma', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'nettoyage-balma.html'));
});
```

- [ ] **Step 5 : Vérifier**

Ouvrir `http://localhost:3000/nettoyage-blagnac`, `/nettoyage-colomiers`, `/nettoyage-balma` → chaque page s'affiche avec le bon nom de ville.

- [ ] **Step 6 : Commit**

```bash
git add pages/nettoyage-blagnac.html pages/nettoyage-colomiers.html pages/nettoyage-balma.html server.js
git commit -m "feat: pages géo-ciblées Blagnac, Colomiers, Balma"
```

---

## Task 10 : Email de confirmation automatique au client

**Files:**
- Modify: `server.js` (route POST /api/devis, lignes ~248-265)

La route `/api/devis` envoie déjà un email à `NOTIFY_EMAIL` via Resend. On ajoute un second envoi vers le client.

- [ ] **Step 1 : Modifier le bloc Resend dans `server.js`**

Dans `server.js`, remplacer le bloc (lignes ~248-264) :

```javascript
if (resend && process.env.NOTIFY_EMAIL) {
  resend.emails.send({
    from: 'CleanOcc <noreply@cleanocc.fr>',
    to: process.env.NOTIFY_EMAIL,
    subject: `Nouvelle demande de devis – ${String(name).trim()}`,
    html: `...`
  }).catch(err => console.error('Resend error:', err));
}
```

Par :

```javascript
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
```

- [ ] **Step 2 : Tester en local**

Soumettre le formulaire sur `http://localhost:3000/devis` avec un email valide. Vérifier dans la console qu'aucune erreur Resend n'apparaît, et que l'email de confirmation est reçu.

- [ ] **Step 3 : Commit**

```bash
git add server.js
git commit -m "feat: email de confirmation automatique au client après soumission devis"
```

---

## Récapitulatif des commits

| # | Commit | Impact |
|---|--------|--------|
| 1 | sitemap complet | Crawl Google |
| 2 | pixel Meta + Lead | Retargeting Facebook |
| 3 | avis hero + appel mobile + WhatsApp | Conversion mobile |
| 4 | mentions légales | Légalité + SEO |
| 5 | og:image | Partages réseaux |
| 6 | design reservation.html | Confiance |
| 7 | page /devis dédiée | Tracking leads |
| 8 | Review JSON-LD | Rich snippets |
| 9 | pages Blagnac/Colomiers/Balma | SEO local |
| 10 | email confirmation client | Fidélisation |
