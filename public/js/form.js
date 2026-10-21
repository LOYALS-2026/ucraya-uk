// Enquiry forms: prefill, friendly validation, loading state, and the pop-in (native <dialog>).
// Both copies of the form (inline and pop-in) are the same Netlify form "enquiry" and submit as a normal POST
// to the locale's thank-you page. Nothing here is needed to send an enquiry.
(function () {
  var forms = document.querySelectorAll('form[name="enquiry"]');
  if (!forms.length) return;
  var dialog = document.getElementById('enquiry-modal');
  var modalForm = dialog ? dialog.querySelector('form[name="enquiry"]') : null;
  var opener = null;

  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function val(form, name) { var el = q('[name="' + name + '"]', form); return el ? el.value : ''; }

  // ---- validation ---------------------------------------------------------
  var rules = {
    email: function (f) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val(f, 'email').trim()); },
    name: function (f) { return val(f, 'name').trim().length >= 2; },
    phone: function (f) {
      var v = val(f, 'phone').trim();
      if (!v) return true;
      return /^[+\d][\d\s().\-]*$/.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15;
    },
    goal: function (f) { return !!q('input[name="goal"]:checked', f); },
    consent: function (f) { var c = q('input[name="consent"]', f); return !!(c && c.checked); }
  };
  var order = ['email', 'name', 'phone', 'goal', 'consent'];

  function prefix(f) { return f.getAttribute('data-enquiry') === 'modal' ? 'm' : 'f'; }
  function fieldEl(f, key) {
    if (key === 'goal') return q('fieldset[data-group="goal"]', f);
    if (key === 'consent') return q('input[name="consent"]', f);
    return q('input[name="' + key + '"]', f);
  }
  function showError(f, key, on) {
    var box = document.getElementById(prefix(f) + '-err-' + key);
    var el = fieldEl(f, key);
    if (!box || !el) return;
    var target = key === 'goal' ? qa('input[name="goal"]', f) : [el];
    if (on) {
      box.textContent = f.getAttribute('data-err-' + key) || '';
      box.hidden = false;
    } else {
      box.hidden = true;
      box.textContent = '';
    }
    target.forEach(function (t) {
      if (on) { t.setAttribute('aria-invalid', 'true'); t.setAttribute('aria-describedby', box.id); }
      else { t.removeAttribute('aria-invalid'); t.removeAttribute('aria-describedby'); }
    });
  }
  function refresh(f) {
    var ok = true;
    order.forEach(function (k) {
      var good = rules[k](f);
      if (!good) ok = false;
      if (f._touched && f._touched[k]) showError(f, k, !good);
    });
    return ok;
  }
  function touch(f, key) { f._touched = f._touched || {}; f._touched[key] = true; }

  qa('form[name="enquiry"]').forEach(function (f) {
    f._touched = {};
    // A hidden input's value IS its default in the DOM, so remember what the page started with.
    var lvl = q('input[name="level"]', f);
    f._levelDefault = lvl ? lvl.value : '';
    ['email', 'name', 'phone'].forEach(function (k) {
      var el = q('input[name="' + k + '"]', f);
      if (el) el.addEventListener('blur', function () { touch(f, k); refresh(f); });
    });
    var consent = q('input[name="consent"]', f);
    if (consent) consent.addEventListener('blur', function () { touch(f, 'consent'); refresh(f); });
    var goalSet = q('fieldset[data-group="goal"]', f);
    if (goalSet) goalSet.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !goalSet.contains(e.relatedTarget)) { touch(f, 'goal'); refresh(f); }
    });
    f.addEventListener('input', function () { refresh(f); });
    f.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.name === 'deadline_pick') { var hid = q('input[name="deadline"]', f); if (hid) hid.value = t.value; }
      // A choice the visitor made themselves is kept when the pop-in is opened again from a button that names no goal.
      if (t && e.isTrusted) { if (t.name === 'goal') f._userGoal = true; if (t.name === 'format') f._userFormat = true; }
      refresh(f);
    });
    f.addEventListener('focusin', function () { refresh(f); });
    f.addEventListener('submit', function (e) {
      if (f._sending) { e.preventDefault(); return; }
      if (!refresh(f)) {
        e.preventDefault();
        order.forEach(function (k) { touch(f, k); });
        refresh(f);
        for (var i = 0; i < order.length; i++) {
          if (!rules[order[i]](f)) {
            var t = order[i] === 'goal' ? q('input[name="goal"]', f) : fieldEl(f, order[i]);
            if (t) t.focus();
            break;
          }
        }
        return;
      }
      // Valid: let the browser post the form normally. Show that something is happening.
      f._sending = true;
      f.setAttribute('aria-busy', 'true');
      var btn = q('[data-submit]', f);
      if (btn) {
        btn.setAttribute('data-label', btn.textContent);
        btn.textContent = btn.getAttribute('data-sending') || btn.textContent;
        btn.classList.add('is-loading');
        btn.setAttribute('aria-disabled', 'true');
      }
    });
    refresh(f);
  });
  // Back button after a send: put the button back.
  window.addEventListener('pageshow', function () {
    qa('form[name="enquiry"]').forEach(function (f) {
      f._sending = false;
      f.removeAttribute('aria-busy');
      var btn = q('[data-submit]', f);
      if (btn) {
        if (btn.getAttribute('data-label')) btn.textContent = btn.getAttribute('data-label');
        btn.classList.remove('is-loading');
        btn.removeAttribute('aria-disabled');
      }
      refresh(f);
    });
  });
  // Browsers (iOS Safari especially) can autofill without firing events: re-check now and then, but only while a form is in use.
  var poll = 0;
  function activeForm() {
    return dialog && dialog.open ? modalForm : (document.activeElement && document.activeElement.form);
  }
  function startPoll() {
    if (poll) return;
    poll = setInterval(function () {
      var f = activeForm();
      if (document.hidden || !f || !f.getAttribute || f.getAttribute('name') !== 'enquiry') { clearInterval(poll); poll = 0; return; }
      refresh(f);
    }, 700);
  }
  document.addEventListener('focusin', function (e) { if (e.target && e.target.form && e.target.form.getAttribute('name') === 'enquiry') startPoll(); });

  // ---- prefill ------------------------------------------------------------
  function setChip(f, name, slug) {
    if (!slug) return false;
    var inputs = qa('input[name="' + name + '"]', f);
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].getAttribute('data-slug') === slug) { inputs[i].checked = true; return true; }
    }
    return false;
  }
  function setHidden(f, name, value) { var el = q('input[name="' + name + '"]', f); if (el) el.value = value; }
  function levels(f) { try { return JSON.parse(f.getAttribute('data-levels') || '{}'); } catch (e) { return {}; } }

  function setPlain(f, name, value) {
    var inputs = qa('input[name="' + name + '"]', f);
    inputs.forEach(function (i) { i.checked = i.getAttribute('data-slug') === value; });
  }
  function apply(f, o, fresh) {
    // The pop-in is one form opened from many buttons. Start from a clean slate each time, except for what the visitor chose themselves.
    if (fresh) {
      if (!f._userGoal && !o.goal) { qa('input[name="goal"]', f).forEach(function (i) { i.checked = false; }); setHidden(f, 'detail', ''); }
      if (!f._userFormat && !o.format) setPlain(f, 'format', 'not-sure');
      var lv = q('input[name="level"]', f);
      if (lv) lv.value = f._levelDefault;
    }
    var purpose = (o.purpose || '').toLowerCase();
    if (purpose !== 'trial' && purpose !== 'placement') purpose = 'enquiry';
    setHidden(f, 'purpose', purpose);
    ['trial', 'placement'].forEach(function (n) { var note = q('[data-note="' + n + '"]', f); if (note) note.hidden = purpose !== n; });
    var goal = (o.goal || '').toLowerCase();
    var detail = '';
    if (goal === 'staff') { detail = 'Employer: English for my staff'; goal = 'interview'; }
    if (goal) { setChip(f, 'goal', goal); setHidden(f, 'detail', detail); }
    setChip(f, 'format', (o.format || '').toLowerCase());
    var level = (o.level || '').toLowerCase();
    if (/^(a1|a2|b1|b2|c1)$/.test(level)) {
      var map = levels(f);
      var label = map[(purpose === 'placement' ? 'test-' : '') + level] || map[level];
      if (label) setHidden(f, 'level', label);
    }
    if (o.deadline) setHidden(f, 'deadline', o.deadline.slice(0, 80));
    refresh(f);
  }

  // Inline forms: the query string still works (/contact/?goal=oet&level=B1&purpose=placement&format=one-to-one).
  var params = null;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
  if (params) {
    var inline = q('form[name="enquiry"][data-enquiry="inline"]');
    var o = { goal: params.get('goal'), format: params.get('format'), level: params.get('level'), purpose: params.get('purpose'), deadline: params.get('deadline') };
    if (inline) apply(inline, o);
    if (modalForm && (o.goal || o.format || o.level || o.purpose)) apply(modalForm, o);
  }

  // ---- pop-in -------------------------------------------------------------
  if (!dialog || !modalForm || typeof dialog.showModal !== 'function') return;
  var card = q('[data-modal-card]', dialog);
  var wrap = q('[data-modal-wrap]', dialog);

  function open(from, o) {
    opener = from || null;
    apply(modalForm, o || {}, true);
    document.documentElement.classList.add('modal-open');
    if (!dialog.open) dialog.showModal();
    window.requestAnimationFrame(function () { dialog.classList.add('is-open'); });
    document.dispatchEvent(new CustomEvent('ucraya:enquiry-open'));
    var fine = !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var first = q('input[name="email"]', modalForm);
    // On a touch screen the keyboard would cover the form, so the sheet itself takes focus there.
    if (fine && first) first.focus({ preventScroll: true }); else if (card) card.focus({ preventScroll: true });
  }
  function close() { if (dialog.open) dialog.close(); }

  dialog.addEventListener('close', function () {
    dialog.classList.remove('is-open');
    document.documentElement.classList.remove('modal-open');
    var back = opener && document.contains(opener) && opener.offsetParent !== null ? opener : q('[data-menu-btn]');
    if (back && back.focus) back.focus({ preventScroll: true });
    opener = null;
  });
  var x = q('[data-modal-close]', dialog);
  if (x) x.addEventListener('click', close);
  // Clicking the dimmed area closes it, but not when a drag that started inside the sheet ends outside it.
  var downOnBackdrop = false;
  dialog.addEventListener('pointerdown', function (e) { downOnBackdrop = e.target === dialog || e.target === wrap; });
  dialog.addEventListener('click', function (e) { if (downOnBackdrop && (e.target === dialog || e.target === wrap)) close(); downOnBackdrop = false; });

  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-enquire]') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(a, { goal: a.getAttribute('data-goal'), format: a.getAttribute('data-format'), level: a.getAttribute('data-level'), purpose: a.getAttribute('data-purpose') });
  });
  // Direct link to the pop-in from anywhere: #enquire opens it.
  if (window.location.hash === '#enquire') open(null, {});
})();
