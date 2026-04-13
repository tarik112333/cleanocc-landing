# CleanOcc — Axes d'amélioration du site

**Date :** 2026-04-13  
**Objectifs :** Plus de leads, meilleur référencement Google, meilleur taux de conversion  
**Contexte :** Site HTML/CSS statique + Node.js (Stripe). Trafic actuel : Facebook uniquement, 0 client via le site.

---

## Section 1 — SEO local

### Problèmes identifiés
- `og:image` absent sur toutes les pages → vignette vide lors des partages
- Pas de page `mentions-legales.html` → obligatoire en France, signal de légitimité pour Google
- Avis Google (Ako Bedai, Kim) présents dans le HTML mais absents du JSON-LD `Review`
- `sitemap.xml` potentiellement incomplet (pages manquantes ou `lastmod` absentes)
- Aucune page géo-ciblée par ville (Blagnac, Colomiers, Balma)

### Changements à apporter
1. Ajouter une balise `og:image` (1200×630px) sur chaque page HTML
2. Créer `pages/mentions-legales.html` (identité légale, hébergeur, RGPD)
3. Enrichir le JSON-LD de `index.html` avec les vrais avis en schéma `Review`
4. Mettre à jour `sitemap.xml` : inclure toutes les pages, ajouter `lastmod` et `priority`
5. Créer 3 pages géo-ciblées : `nettoyage-blagnac.html`, `nettoyage-colomiers.html`, `nettoyage-balma.html` — même structure que les pages existantes, ville adaptée dans titre/contenu/schema

---

## Section 2 — Conversion

### Problèmes identifiés
- `reservation.html` a un design différent (autre police, autres couleurs) → rupture de confiance
- Sur mobile, `nav-phone` est masqué (`display:none`) → numéro introuvable sans scroller
- Pas de message de confirmation après soumission du formulaire de devis
- Les avis Google (⭐ 4,6/5) sont trop bas dans la page — pas vus par les visiteurs qui rebondissent vite
- Pas de bouton WhatsApp flottant sur mobile

### Changements à apporter
1. Aligner `reservation.html` sur le design principal (Inter, `#2563eb`, mêmes composants)
2. Ajouter un bouton d'appel dans le hero, visible sur mobile
3. Ajouter un message de confirmation après soumission du formulaire (côté front)
4. Remonter la ligne "⭐ 4,6/5 · +20 avis Google" dans le hero, avant le formulaire
5. Ajouter une barre flottante WhatsApp en bas de page sur mobile uniquement

---

## Section 3 — Génération de leads

### Problèmes identifiés
- Le formulaire de devis est dans `index.html#contact` — impossible à tracker précisément dans GA4
- Aucun pixel Meta installé → retargeting Facebook impossible
- Pas d'offre incitative pour déclencher l'action immédiate
- Pas d'email de confirmation automatique après soumission du formulaire

### Changements à apporter
1. Créer `pages/devis.html` — page dédiée avec le formulaire de devis, trackable comme conversion dans GA4
2. Installer le pixel Meta dans le `<head>` de toutes les pages, avec événement `Lead` sur soumission du formulaire
3. Ajouter une mention d'urgence courte dans le hero ("Devis répondu sous 2h en semaine")
4. Ajouter un email de confirmation automatique dans `server.js` (envoyé au demandeur après soumission)

---

## Priorisation suggérée

| Priorité | Action | Impact | Effort |
|----------|--------|--------|--------|
| 1 | Pixel Meta | Leads Facebook | Faible |
| 2 | WhatsApp flottant mobile | Conversion mobile | Faible |
| 3 | Avis Google dans hero | Confiance / conversion | Faible |
| 4 | Mentions légales | SEO légitimité | Faible |
| 5 | Alignement design reservation.html | Conversion | Moyen |
| 6 | og:image sur toutes les pages | SEO / partages | Moyen |
| 7 | Page devis.html dédiée | Tracking leads | Moyen |
| 8 | Review JSON-LD | SEO rich snippets | Moyen |
| 9 | Sitemap.xml complet | SEO crawl | Faible |
| 10 | Pages géo-ciblées (Blagnac, Colomiers, Balma) | SEO longue traîne | Élevé |
| 11 | Email confirmation automatique | Fidélisation | Moyen |
| 12 | Bouton appel mobile dans hero | Conversion mobile | Faible |
