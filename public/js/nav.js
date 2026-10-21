// Mobile menu toggle and the phone header that tucks away while you read down the page.
// Without JavaScript the footer still lists every page.
(function () {
  var header = document.querySelector('.site-header');
  var btn = document.querySelector('[data-menu-btn]');
  if (!header || !btn) return;
  var label = btn.querySelector('[data-menu-label]');
  function set(open) {
    header.setAttribute('data-open', open ? 'true' : 'false');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (label) label.textContent = open ? btn.getAttribute('data-close-label') : btn.getAttribute('data-open-label');
    if (open) header.classList.remove('is-away');
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

  // Phones only: hide the header on the way down, show it again on the way up. Never while the menu is open, while
  // focus is inside it, near the top of the page, or for people who ask for less motion.
  var phone = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
  var calm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var lastY = window.pageYOffset || 0;
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.pageYOffset || 0;
    var dy = y - lastY;
    if (!phone || !phone.matches || (calm && calm.matches) || y < 120 || header.getAttribute('data-open') === 'true' || header.contains(document.activeElement)) {
      header.classList.remove('is-away');
      lastY = y;
      return;
    }
    if (Math.abs(dy) < 8) return;
    header.classList.toggle('is-away', dy > 0);
    lastY = y;
  }
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(onScroll);
  }, { passive: true });
  header.addEventListener('focusin', function () { header.classList.remove('is-away'); });
})();
