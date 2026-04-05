#!/bin/bash
# Déploiement CleanOcc – Hostinger (site statique) + Render ou autre hébergeur (API Node)
#
# Sur l’hébergement mutualisé Hostinger, Node.js n’est en général pas disponible : on ne met
# que les fichiers du site. L’API (server.js) tourne ailleurs (ex. Render) avec le .env.
#
# À uploader dans hPanel > Fichiers > public_html (ou le dossier du domaine) :
#   - index.html   (obligatoire — tout le JS du formulaire est dedans)
#
# Optionnel si vous utilisez un fichier externe un jour :
#   - app.js
#
# Avant upload : dans index.html, vérifiez la balise meta (URL de votre API sans slash final) :
#   <meta name="cleanocc-api-origin" content="https://VOTRE-SERVICE.onrender.com" />
#
# Sur Render : mêmes variables que dans .env (AIRTABLE_*, URSSAF_*, RESEND_*, etc.).

echo "Fichiers à envoyer sur Hostinger (public_html) :"
echo "   → index.html"
echo ""
echo "hPanel > Fichiers > public_html — Upload / remplacer index.html"
echo "API Node : déployée séparément (ex. Render), pas sur Hostinger mutualisé."
