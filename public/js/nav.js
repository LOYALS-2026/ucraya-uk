// Mobile menu toggle. Without JavaScript the footer still lists every page.
(function () {
  var header = document.querySelector('.site-header');
  var btn = document.querySelector('[data-menu-btn]');
  if (!header || !btn) return;
  var label = btn.querySelector('[data-menu-label]');
  function set(open) {
    header.setAttribute('data-open', open ? 'true' : 'false');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (label) label.textContent = open ? btn.getAttribute('data-close-label') : btn.getAttribute('data-open-label');
  }
  btn.addEventListener('click', function () {
    set(header.getAttribute('data-open') !== 'true');
  });
  // A link inside the panel (including Enquire, which opens the pop-in) closes it.
  var panel = document.getElementById('nav-panel');
  if (panel) panel.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) set(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.getAttribute('data-open') === 'true') {
      set(false);
      btn.focus();
    }
  });
})();
