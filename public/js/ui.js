// Small interface touches: back to top, smooth FAQ answers, dots under the swipeable quotes.
// Everything works without this file; it only adds polish. Nothing here animates for people who ask for less motion.
(function () {
  'use strict';
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---- back to top: appears after 800 px
  var top = document.querySelector('[data-to-top]');
  if (top) {
    var tick = false;
    var sync = function () {
      tick = false;
      top.classList.toggle('is-on', (window.pageYOffset || 0) > 800);
    };
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      window.requestAnimationFrame(sync);
    }, { passive: true });
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
      var logo = document.querySelector('.logo-link');
      if (logo) logo.focus({ preventScroll: true });
    });
    sync();
  }

  // ---- FAQ: details/summary with a smooth height change (the native element still does the work; this only eases it)
  qa('.faq details').forEach(function (d) {
    var s = d.querySelector('summary');
    if (!s || calm || !d.animate) return;
    s.addEventListener('click', function (e) {
      e.preventDefault();
      if (d._anim) { d._anim.cancel(); d._anim = null; if (d._closing) { d.open = false; d._closing = false; } }
      var frame = d.offsetHeight - d.clientHeight;
      var collapsed = s.offsetHeight + frame;
      var opening = !d.open;
      var from = d.offsetHeight;
      if (opening) d.open = true;
      var to = opening ? d.offsetHeight : collapsed;
      d._closing = !opening;
      d._anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 240, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
      d._anim.onfinish = function () { if (d._closing) d.open = false; d._closing = false; d._anim = null; };
    });
  });

  // ---- swipeable quote strip: dots that follow the scroll and move it
  qa('[data-strip]').forEach(function (strip) {
    var dots = document.querySelector('[data-dots="' + strip.getAttribute('data-strip') + '"]');
    var items = Array.prototype.slice.call(strip.children);
    if (!dots || items.length < 2) return;
    var label = dots.getAttribute('data-label') || '{n} / {total}';
    var buttons = items.map(function (item, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', label.replace('{n}', String(i + 1)).replace('{total}', String(items.length)));
      b.addEventListener('click', function () {
        strip.scrollTo({ left: item.offsetLeft - strip.offsetLeft - (strip.clientWidth - item.clientWidth) / 2, behavior: calm ? 'auto' : 'smooth' });
      });
      li.appendChild(b);
      dots.appendChild(li);
      return b;
    });
    var tick = false;
    function update() {
      tick = false;
      var mid = strip.scrollLeft + strip.clientWidth / 2;
      var best = 0, bestD = Infinity;
      items.forEach(function (item, i) {
        var c = item.offsetLeft - strip.offsetLeft + item.clientWidth / 2;
        var d = Math.abs(c - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      buttons.forEach(function (b, i) { if (i === best) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    }
    strip.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
