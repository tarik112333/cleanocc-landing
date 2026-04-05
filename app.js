document.querySelectorAll('.faq-q').forEach(function (q) {
  q.addEventListener('click', function () {
    var item = q.closest('.faq-item');
    var isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(function (i) { i.classList.remove('open'); });
    if (!isOpen) item.classList.add('open');
  });
});

(function () {
  var RENDER_API_ORIGIN = 'https://cleanocc-landing.onrender.com';
  var RENDER_DEVIS_URL = RENDER_API_ORIGIN + '/api/devis';

  function pageHostname() {
    return window.location.hostname;
  }

  function bareHost(h) {
    return String(h || '').replace(/^www\./i, '').toLowerCase();
  }

  function isLocalDev() {
    var h = pageHostname();
    return h === 'localhost' || h === '127.0.0.1';
  }

  function devisPostUrls() {
    var out = [];
    var seen = {};
    var push = function (u) {
      if (!u || seen[u]) return;
      seen[u] = true;
      out.push(u);
    };

    if (window.location.protocol === 'file:') {
      push(RENDER_DEVIS_URL);
      return out;
    }

    if (isLocalDev()) {
      var port = window.location.port;
      if (!port || port === '3000') push('/api/devis');
    }

    var meta = document.querySelector('meta[name="cleanocc-api-origin"]');
    var raw = meta && meta.getAttribute('content');
    if (raw && String(raw).trim()) {
      try {
        var base = String(raw).trim().replace(/\/+$/, '');
        var apiUrl = base + '/api/devis';
        var metaHost = new URL(base.indexOf('//') === -1 ? 'https://' + base : base).hostname;
        if (bareHost(metaHost) !== bareHost(pageHostname())) push(apiUrl);
      } catch (e) { /* meta invalide */ }
    }

    push(RENDER_DEVIS_URL);
    return out;
  }

  function apiBaseForAvance() {
    var meta = document.querySelector('meta[name="cleanocc-api-origin"]');
    var raw = meta && meta.getAttribute('content');
    if (raw && String(raw).trim()) {
      try {
        var base = String(raw).trim().replace(/\/+$/, '');
        var metaHost = new URL(base.indexOf('//') === -1 ? 'https://' + base : base).hostname;
        if (bareHost(metaHost) !== bareHost(pageHostname())) return base;
      } catch (e) { /* ignore */ }
    }
    if (window.location.protocol === 'file:') return RENDER_API_ORIGIN;
    if (isLocalDev()) {
      var port = window.location.port;
      if (!port || port === '3000') return window.location.origin.replace(/\/+$/, '');
    }
    return RENDER_API_ORIGIN;
  }

  // Toggle avance immediate extra fields
  var toggle = document.getElementById('avance-toggle');
  var avanceExtra = document.getElementById('avance-extra');
  if (toggle && avanceExtra) {
    toggle.addEventListener('change', function () {
      avanceExtra.style.display = this.checked ? 'block' : 'none';
      avanceExtra.querySelectorAll('input').forEach(function (inp) {
        inp.required = toggle.checked;
      });
    });
  }

  var form = document.getElementById('devis-form');
  var statusEl = document.getElementById('devis-form-status');
  if (!form || !statusEl) return;

  function showStatus(kind, text) {
    statusEl.textContent = text;
    statusEl.className = 'form-status form-full is-visible ' + (kind === 'success' ? 'form-status--success' : kind === 'info' ? 'form-status--info' : 'form-status--error');
    statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideStatus() {
    statusEl.className = 'form-status form-full';
    statusEl.textContent = '';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    hideStatus();
    var btn = form.querySelector('button[type="submit"]');
    var fd = new FormData(form);
    var prenom = (fd.get('prenom') || '').trim();
    var nom = (fd.get('nom') || '').trim();
    var avance = toggle && toggle.checked;

    var devisPayload = {
      name: (prenom + ' ' + nom).trim(),
      email: (fd.get('email') || '').trim(),
      phone: (fd.get('phone') || '').trim(),
      city: (fd.get('city') || '').trim(),
      service: (fd.get('service') || '').trim(),
      message: (fd.get('message') || '').trim()
    };

    if (!devisPayload.name || !devisPayload.phone || !devisPayload.city || !devisPayload.service || !devisPayload.message) {
      showStatus('error', 'Merci de remplir tous les champs obligatoires.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Envoi en cours...';
    showStatus('info', 'Envoi en cours (le serveur peut mettre ~1 min au premier essai)…');

    var apiBase = apiBaseForAvance();
    var urls = devisPostUrls();

    try {
      var res = null, data = {};
      var lastNetErr = null;
      for (var i = 0; i < urls.length; i++) {
        try {
          var attempt = await fetch(urls[i], {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(devisPayload),
            mode: 'cors',
            cache: 'no-store'
          });
          var parsed = await attempt.json().catch(function () { return {}; });
          if (attempt.status === 400 && parsed && parsed.error) {
            res = attempt;
            data = parsed;
            break;
          }
          if (attempt.ok && parsed && parsed.ok === true) {
            res = attempt;
            data = parsed;
            break;
          }
        } catch (err) {
          lastNetErr = err;
          res = null;
        }
      }

      if (res && res.status === 400 && data && data.error) {
        showStatus('error', data.error);
        return;
      }
      if (!res || !res.ok || !data || data.ok !== true) {
        var hint = 'Impossible de joindre l’API. Réessayez dans 1 minute (Render se met parfois en veille). Désactivez les bloqueurs de pubs / Brave shields pour onrender.com, ou testez depuis un autre navigateur.';
        if (lastNetErr && lastNetErr.message) console.warn('CleanOcc formulaire:', lastNetErr.message, urls);
        showStatus('error', hint);
        return;
      }

      if (avance) {
        var avancePayload = {
          civilite: (fd.get('civilite') || 'M').trim(),
          prenom: prenom,
          nom: nom,
          email: devisPayload.email,
          telephone: devisPayload.phone,
          dateNaissance: (fd.get('dateNaissance') || '').trim(),
          communeNaissance: (fd.get('communeNaissance') || '').trim(),
          paysNaissance: (fd.get('paysNaissance') || 'France').trim(),
          adresse: (fd.get('adresse') || '').trim(),
          codePostal: (fd.get('codePostal') || '').trim(),
          ville: devisPayload.city,
          iban: (fd.get('iban') || '').trim()
        };
        try {
          await fetch(apiBase + '/api/avance-immediate/inscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(avancePayload)
          });
        } catch (_) {}
      }

      showStatus('success', avance
        ? 'Demande envoyee ! Votre devis et votre inscription ont bien ete enregistres. Nous vous recontactons rapidement.'
        : 'Votre demande a bien ete enregistree. Nous vous recontactons rapidement.'
      );
      form.reset();
      if (avanceExtra) avanceExtra.style.display = 'none';
    } catch (err) {
      showStatus('error', 'Connexion au serveur impossible. Reessayez dans quelques instants.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Envoyer ma demande';
    }
  });
})();
