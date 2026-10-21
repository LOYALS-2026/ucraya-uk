// Enquiry form prefill. Only sets values of fields that already exist in the page.
// Example: /contact/?goal=oet&level=B1&purpose=placement&format=one-to-one
(function () {
  var form = document.getElementById('enquiry-form');
  if (!form) return;
  var params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { return; }

  function pick(select, slug) {
    if (!select || !slug) return;
    var opts = select.options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].getAttribute('data-slug') === slug) { select.selectedIndex = i; return; }
    }
  }

  var purpose = (params.get('purpose') || '').toLowerCase();
  if (purpose === 'trial' || purpose === 'placement') {
    var hidden = form.querySelector('input[name="purpose"]');
    if (hidden) hidden.value = purpose;
    var note = form.querySelector('[data-note="' + purpose + '"]');
    if (note) note.hidden = false;
  }

  pick(form.querySelector('select[name="goal"]'), (params.get('goal') || '').toLowerCase());
  pick(form.querySelector('select[name="format"]'), (params.get('format') || '').toLowerCase());

  var level = (params.get('level') || '').toLowerCase();
  if (/^(a1|a2|b1|b2)$/.test(level)) {
    pick(form.querySelector('select[name="level"]'), (purpose === 'placement' ? 'test-' : '') + level);
  }
})();
