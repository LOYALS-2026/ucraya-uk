// Language dropdown (details/summary). Works without JavaScript; this adds Escape, arrow keys and outside click.
(function () {
  var d = document.querySelector('details[data-lang]');
  if (!d) return;
  var s = d.querySelector('summary');
  var links = Array.prototype.slice.call(d.querySelectorAll('.lang-menu a'));
  function sync() { s.setAttribute('aria-expanded', d.open ? 'true' : 'false'); }
  sync();
  d.addEventListener('toggle', sync);
  function close(refocus) { if (d.open) { d.open = false; if (refocus) s.focus(); } }
  document.addEventListener('click', function (e) { if (d.open && !d.contains(e.target)) close(false); });
  d.addEventListener('focusout', function (e) {
    if (d.open && e.relatedTarget && !d.contains(e.relatedTarget)) close(false);
  });
  d.addEventListener('keydown', function (e) {
    var i = links.indexOf(document.activeElement);
    if (e.key === 'Escape') { if (d.open) { e.preventDefault(); e.stopPropagation(); close(true); } return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (!d.open) d.open = true;
      var n;
      if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = links.length - 1;
      else if (e.key === 'ArrowDown') n = i < 0 ? 0 : (i + 1) % links.length;
      else n = i < 0 ? links.length - 1 : (i - 1 + links.length) % links.length;
      links[n].focus();
    }
  });
})();
