#!/usr/bin/env node
// Inscription manuelle d'un client à l'Avance Immédiate URSSAF — méthode de secours.
//
// Envoie l'inscription DIRECTEMENT à l'URSSAF depuis ce PC (identifiants du .env),
// sans passer par le site ni par Render. À utiliser si le formulaire ne fonctionne pas.
//
//   node scripts/inscription-avance-manuelle.js          → inscription réelle
//   node scripts/inscription-avance-manuelle.js --test   → vérifie tout, n'envoie rien
//
// Même logique que POST /api/avance-immediate/inscription dans server.js.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const readline = require('readline');

const TEST = process.argv.includes('--test');

const URSSAF = {
  clientId: process.env.URSSAF_CLIENT_ID,
  clientSecret: process.env.URSSAF_CLIENT_SECRET,
  scope: process.env.URSSAF_SCOPE || 'homeplus.tiersprestations',
  tokenUrl: process.env.URSSAF_TOKEN_URL || 'https://api.urssaf.fr/api/oauth/v1/token',
  apiBase: process.env.URSSAF_API_BASE || 'https://api.urssaf.fr',
  siret: process.env.URSSAF_SIRET,
};
const AIRTABLE = {
  key: process.env.AIRTABLE_KEY,
  base: process.env.AIRTABLE_BASE,
  table: process.env.AIRTABLE_TABLE_AVANCE,
};

// Lecture ligne à ligne via une file (fonctionne au clavier comme avec une entrée redirigée)
const rl = readline.createInterface({ input: process.stdin });
const lignes = [];
let attente = null;
let fini = false;
rl.on('line', (l) => { if (attente) { const r = attente; attente = null; r(l); } else lignes.push(l); });
rl.on('close', () => { fini = true; if (attente) attente(null); });
function lireLigne(invite) {
  process.stdout.write(invite);
  if (lignes.length) { const l = lignes.shift(); console.log(l); return Promise.resolve(l); }
  if (fini) return Promise.resolve(null);
  return new Promise((r) => { attente = r; });
}

// --- Saisie avec validation ---
async function ask(label, { validate, transform, defaut } = {}) {
  for (;;) {
    const suffixe = defaut ? ` [${defaut}]` : '';
    const brut = await lireLigne(`  ${label}${suffixe} : `);
    if (brut === null) throw new Error('saisie interrompue');
    let v = brut.trim();
    if (!v && defaut) v = defaut;
    if (transform) v = transform(v);
    const err = validate ? validate(v) : (v ? null : 'obligatoire');
    if (!err) return v;
    console.log(`    ✗ ${err}`);
  }
}

function ibanValide(iban) {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const r = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let reste = 0;
  for (const ch of r) reste = (reste * 10 + Number(ch)) % 97;
  return reste === 1;
}

function masquerIban(iban) {
  return iban.slice(0, 4) + ' •••• •••• ' + iban.slice(-4);
}

// --- Référentiels INSEE (mêmes APIs que server.js) ---
async function resolveAdresseInsee(ligne, codePostal, ville) {
  const q = encodeURIComponent(`${ligne} ${ville}`);
  const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&postcode=${codePostal}&limit=1`);
  if (!r.ok) throw new Error(`api-adresse HTTP ${r.status}`);
  const f = (await r.json()).features?.[0];
  if (!f) throw new Error('adresse introuvable');
  return { codeCommune: f.properties.citycode, libelleCommune: (f.properties.city || ville).toUpperCase(), label: f.properties.label };
}

async function resolveCommuneByName(nom) {
  const q = encodeURIComponent(nom);
  const r = await fetch(`https://geo.api.gouv.fr/communes?nom=${q}&fields=code,codeDepartement,nom,population&boost=population&limit=1`);
  if (!r.ok) throw new Error(`geo.api.gouv.fr HTTP ${r.status}`);
  const c = (await r.json())?.[0];
  if (!c) throw new Error('commune introuvable');
  return { codeCommuneFull: c.code, codeDepartement: c.codeDepartement, libelleCommune: c.nom.toUpperCase() };
}

function formatDepartementUrssaf(codeDept) {
  const s = String(codeDept).toUpperCase();
  return s.length === 3 ? s : s.padStart(3, '0');
}

// --- URSSAF ---
async function getUrssafToken() {
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
  if (!res.ok) throw new Error(`jeton URSSAF refusé (HTTP ${res.status}) : ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).access_token;
}

async function airtableInsert(fields) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE.base}/${AIRTABLE.table}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AIRTABLE.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, typecast: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function main() {
  console.log('\n=== Inscription Avance Immédiate URSSAF — saisie manuelle ===');
  if (TEST) console.log('*** MODE TEST : rien ne sera envoyé à l\'URSSAF ni enregistré dans Airtable ***');

  const manquants = ['URSSAF_CLIENT_ID', 'URSSAF_CLIENT_SECRET', 'URSSAF_SIRET'].filter((k) => !process.env[k]);
  if (manquants.length) {
    console.log(`\n✗ Variables manquantes dans .env : ${manquants.join(', ')}`);
    process.exit(1);
  }

  console.log('\n— Identité du client —');
  const civ = await ask('Civilité (M ou Mme)', {
    transform: (v) => v.toLowerCase(),
    validate: (v) => (['m', 'mme', 'mr', 'monsieur', 'madame'].includes(v) ? null : 'tapez M ou Mme'),
  });
  const civilite = civ.startsWith('ma') || civ === 'mme' ? '2' : '1';
  const nom = await ask('Nom d\'usage', { transform: (v) => v.toUpperCase() });
  const nomNaissance = await ask('Nom de naissance', { transform: (v) => v.toUpperCase(), defaut: nom });
  const prenoms = await ask('Prénom(s)');
  const dateNaissance = await ask('Date de naissance (JJ/MM/AAAA)', {
    validate: (v) => {
      const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return 'format JJ/MM/AAAA';
      const d = new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);
      return isNaN(d) || d.getDate() !== Number(m[1]) ? 'date invalide' : null;
    },
  });
  const [jj, mm, aaaa] = dateNaissance.split('/');

  console.log('\n— Lieu de naissance (France) —');
  let naissance;
  for (;;) {
    const commune = await ask('Commune de naissance');
    try {
      naissance = await resolveCommuneByName(commune);
    } catch (e) {
      console.log(`    ✗ ${e.message} — vérifiez l'orthographe`);
      continue;
    }
    const ok = await ask(`Trouvé : ${naissance.libelleCommune} (${naissance.codeDepartement}). Correct ? (o/n)`, {
      transform: (v) => v.toLowerCase(),
      validate: (v) => (['o', 'n'].includes(v) ? null : 'o ou n'),
    });
    if (ok === 'o') break;
  }

  console.log('\n— Contact —');
  const email = await ask('Email', { validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'email invalide') });
  const telephone = await ask('Téléphone portable', {
    transform: (v) => v.replace(/[\s.-]/g, ''),
    validate: (v) => (/^(0[67]\d{8}|\+33[67]\d{8})$/.test(v) ? null : 'portable attendu (06/07…)'),
  });

  console.log('\n— Adresse du domicile (lieu des prestations) —');
  let adresse, codePostal, ville, adr;
  for (;;) {
    adresse = await ask('Numéro et rue');
    codePostal = await ask('Code postal', { validate: (v) => (/^\d{5}$/.test(v) ? null : '5 chiffres') });
    ville = await ask('Ville');
    try {
      adr = await resolveAdresseInsee(adresse, codePostal, ville);
    } catch (e) {
      console.log(`    ✗ ${e.message} — ressaisissez l'adresse`);
      continue;
    }
    const ok = await ask(`Trouvé : ${adr.label}. Correct ? (o/n)`, {
      transform: (v) => v.toLowerCase(),
      validate: (v) => (['o', 'n'].includes(v) ? null : 'o ou n'),
    });
    if (ok === 'o') break;
  }

  console.log('\n— Coordonnées bancaires —');
  const iban = await ask('IBAN', {
    transform: (v) => v.replace(/\s/g, '').toUpperCase(),
    validate: (v) => (ibanValide(v) ? null : 'IBAN invalide (faute de frappe ?) — relisez-le au client'),
  });
  const bic = await ask('BIC', {
    transform: (v) => v.replace(/\s/g, '').toUpperCase(),
    validate: (v) => (/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v) ? null : '8 ou 11 caractères'),
  });
  const titulaire = await ask('Titulaire du compte', { defaut: `${prenoms} ${nom}` });

  const payload = {
    civilite,
    nom,
    nomNaissance,
    prenoms,
    dateNaissance: `${aaaa}-${mm}-${jj}T00:00:00`,
    lieuNaissance: {
      communeNaissance: {
        codeCommune: String(naissance.codeCommuneFull).slice(-3),
        libelleCommune: naissance.libelleCommune,
      },
      departementNaissance: formatDepartementUrssaf(naissance.codeDepartement),
      codePaysNaissance: '99100',
    },
    adresseMail: email,
    numeroTelephonePortable: telephone,
    adressePostale: {
      ligne1: adresse,
      codePostal,
      libelleCommune: adr.libelleCommune,
      codeCommune: adr.codeCommune,
      codePays: '99100',
    },
    coordonneeBancaire: { iban, bic, titulaire },
    siretPrestataire: URSSAF.siret,
  };

  console.log('\n=== Récapitulatif ===');
  console.log(`  ${civilite === '2' ? 'Mme' : 'M.'} ${prenoms} ${nom} (né(e) ${nomNaissance}) le ${dateNaissance} à ${naissance.libelleCommune}`);
  console.log(`  ${email} · ${telephone}`);
  console.log(`  ${adr.label}`);
  console.log(`  IBAN ${masquerIban(iban)} · BIC ${bic} · titulaire ${titulaire}`);

  if (TEST) {
    console.log('\n→ Vérification du jeton URSSAF…');
    await getUrssafToken();
    console.log('✓ Jeton URSSAF obtenu : identifiants OK. Mode test : rien n\'a été envoyé.');
    return;
  }

  const go = await ask('\nEnvoyer l\'inscription à l\'URSSAF ? (o/n)', {
    transform: (v) => v.toLowerCase(),
    validate: (v) => (['o', 'n'].includes(v) ? null : 'o ou n'),
  });
  if (go !== 'o') {
    console.log('Annulé, rien n\'a été envoyé.');
    return;
  }

  console.log('\n→ Envoi à l\'URSSAF…');
  const token = await getUrssafToken();
  const res = await fetch(`${URSSAF.apiBase}/atp/v1/tiersPrestations/particulier`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const texte = await res.text();
  let data;
  try { data = JSON.parse(texte); } catch { data = { _raw: texte.slice(0, 500) }; }
  const ok = res.status === 200 || res.status === 201;

  if (ok) {
    console.log('\n✓ INSCRIPTION ACCEPTÉE PAR L\'URSSAF');
    if (data.idClient) console.log(`  idClient URSSAF : ${data.idClient}`);
    console.log('  → Dites au client : email de l\'URSSAF sous 24-48h (vérifier les spams), cliquer pour activer son compte.');
  } else {
    console.log(`\n✗ REFUS DE L'URSSAF (HTTP ${res.status}) :`);
    console.log(JSON.stringify(data, null, 2).slice(0, 2000));
  }

  // Trace Airtable (ne bloque pas si Airtable est indisponible)
  if (AIRTABLE.key && AIRTABLE.base && AIRTABLE.table) {
    try {
      await airtableInsert({
        'Nom': nom,
        'Prénom': prenoms,
        'Email': email,
        'Téléphone': telephone,
        'Adresse': adresse,
        'Ville': adr.libelleCommune,
        'Code Postal': codePostal,
        'IBAN': iban,
        'BIC': bic,
        'Statut': ok ? 'urssaf_ok' : 'urssaf_erreur',
        'Réponse URSSAF': `[saisie manuelle] ${JSON.stringify(data)}`.slice(0, 10000),
        'Date': new Date().toISOString(),
      });
      console.log('  ✓ Enregistré dans Airtable (table Avance Immédiate).');
    } catch (e) {
      console.log(`  ⚠ Airtable non mis à jour (${e.message.slice(0, 200)}) — notez l'inscription à la main.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(`\n✗ Erreur : ${e.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
