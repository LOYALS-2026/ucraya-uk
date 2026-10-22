// Translation quote form (Netlify form "translation-quote"): friendly validation, the 8 MB and file type check, the "other language"
// box and a loading state. Nothing here is needed to send the form: without JavaScript the browser still posts it, and the
// server side (Netlify) accepts what it receives. The POST is a normal multipart form post to the locale's thank-you page.
(function () {
  var form = document.querySelector('form[name="translation-quote"]');
  if (!form) return;

  function q(sel) { return form.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(form.querySelectorAll(sel)); }
  function val(name) { var el = q('[name="' + name + '"]'); return el ? el.value : ''; }
  function msg(key) { return form.getAttribute('data-err-' + key) || ''; }

  var MAX = parseInt(form.getAttribute('data-max-bytes') || '8000000', 10);
  var OK_EXT = /\.(pdf|jpe?g|png|heic|docx)$/i;

  // ---- files --------------------------------------------------------------
  function fileProblem() {
    var files = [];
    qa('input[type="file"]').forEach(function (i) { if (i.files && i.files.length) files.push(i.files[0]); });
    var bad = files.filter(function (f) { return !OK_EXT.test(f.name); }).map(function (f) { return f.name; });
    if (bad.length) return msg('badtype').replace('{names}', bad.join(', '));
    var total = files.reduce(function (n, f) { return n + f.size; }, 0);
    if (total > MAX) return msg('toobig').replace('{size}', (Math.round(total / 100000) / 10).toString());
    return '';
  }

  // ---- rules --------------------------------------------------------------
  var rules = {
    email: function () { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email').trim()); },
    name: function () { return val('name').trim().length >= 2; },
    phone: function () {
      var v = val('phone').trim();
      if (!v) return true;
      var d = v.replace(/\D/g, '');
      return /^[+\d][\d\s().\-]*$/.test(v) && d.length >= 7 && d.length <= 15;
    },
    from: function () { return !!val('from_language'); },
    to: function () { return !!val('to_language'); },
    doctype: function () { return !!val('document_type'); },
    consent: function () { var c = q('input[name="consent"]'); return !!(c && c.checked); },
    files: function () { return !fileProblem(); }
  };
  var order = ['email', 'name', 'phone', 'from', 'to', 'doctype', 'files', 'consent'];
  var touched = {};

  function fieldEl(key) {
    if (key === 'from') return q('[name="from_language"]');
    if (key === 'to') return q('[name="to_language"]');
    if (key === 'doctype') return q('[name="document_type"]');
    if (key === 'files') return q('input[type="file"]');
    if (key === 'consent') return q('input[name="consent"]');
    return q('[name="' + key + '"]');
  }
  function show(key, on) {
    var box = document.getElementById('tq-err-' + key);
    var el = fieldEl(key);
    if (!box || !el) return;
    var targets = key === 'files' ? qa('input[type="file"]') : [el];
    if (on) {
      box.textContent = key === 'files' ? fileProblem() : msg(key);
      box.hidden = false;
    } else {
      box.hidden = true;
      box.textContent = '';
    }
    targets.forEach(function (t) {
      if (on) { t.setAttribute('aria-invalid', 'true'); } else { t.removeAttribute('aria-invalid'); }
    });
  }
  function refresh() {
    var ok = true;
    order.forEach(function (k) {
      var good = rules[k]();
      if (!good) ok = false;
      if (touched[k]) show(k, !good);
    });
    return ok;
  }
  function touch(k) { touched[k] = true; }

  ['email', 'name', 'phone'].forEach(function (k) {
    var el = q('[name="' + k + '"]');
    if (el) el.addEventListener('blur', function () { touch(k); refresh(); });
  });
  [['from', 'from_language'], ['to', 'to_language'], ['doctype', 'document_type']].forEach(function (p) {
    var el = q('[name="' + p[1] + '"]');
    if (el) el.addEventListener('blur', function () { touch(p[0]); refresh(); });
  });
  var consent = q('input[name="consent"]');
  if (consent) consent.addEventListener('blur', function () { touch('consent'); refresh(); });
  qa('input[type="file"]').forEach(function (i) { i.addEventListener('change', function () { touch('files'); refresh(); }); });

  // ---- "Other" language ---------------------------------------------------
  var other = q('[data-other]');
  function syncOther() {
    if (!other) return;
    var need = val('from_language') === 'Other' || val('to_language') === 'Other';
    other.hidden = !need;
  }
  form.addEventListener('change', function () { syncOther(); refresh(); });
  form.addEventListener('input', function () { refresh(); });
  syncOther();

  // ---- submit -------------------------------------------------------------
  var sending = false;
  form.addEventListener('submit', function (e) {
    if (sending) { e.preventDefault(); return; }
    if (!refresh()) {
      e.preventDefault();
      order.forEach(touch);
      refresh();
      for (var i = 0; i < order.length; i++) {
        if (!rules[order[i]]()) { var t = fieldEl(order[i]); if (t) t.focus(); break; }
      }
      return;
    }
    sending = true;
    form.setAttribute('aria-busy', 'true');
    var btn = q('[data-submit]');
    if (btn) {
      btn.setAttribute('data-label', btn.textContent);
      btn.textContent = btn.getAttribute('data-sending') || btn.textContent;
      btn.classList.add('is-loading');
      btn.setAttribute('aria-disabled', 'true');
    }
  });
  // Back button after a send: put the button back.
  window.addEventListener('pageshow', function () {
    sending = false;
    form.removeAttribute('aria-busy');
    var btn = q('[data-submit]');
    if (btn) {
      if (btn.getAttribute('data-label')) btn.textContent = btn.getAttribute('data-label');
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-disabled');
    }
    syncOther();
    refresh();
  });
})();
