// Article page helpers: contents list, sticky call to action, copy link.
// No inline script anywhere: the Content Security Policy only allows files from this site.
(function () {
  'use strict';

  // ---- contents list: open on wide screens, closed on phones; mark the section being read
  var toc = document.querySelector('[data-bl-toc]');
  if (toc) {
    var wide = window.matchMedia('(min-width: 1024px)');
    var sync = function () { toc.open = wide.matches; };
    sync();
    if (wide.addEventListener) wide.addEventListener('change', sync);
    toc.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (a && !wide.matches) toc.open = false;
    });
    var links = {};
    toc.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var heads = Object.keys(links).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (heads.length && 'IntersectionObserver' in window) {
      var current = null;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            if (current) current.classList.remove('is-current');
            current = links[en.target.id];
            if (current) current.classList.add('is-current');
          }
        });
      }, { rootMargin: '-15% 0px -70% 0px' });
      heads.forEach(function (h) { io.observe(h); });
    }
  }

  // ---- sticky call to action: appears after 40% of the page, hidden while the main call to action box is on screen
  var bar = document.querySelector('[data-bl-cta]');
  if (bar) {
    var inlineCta = document.querySelector('.bl-cta');
    var inlineVisible = false;
    var shown = false;
    var timer = 0;
    var setShown = function (on) {
      if (on === shown) return;
      shown = on;
      clearTimeout(timer);
      if (on) {
        bar.hidden = false;
        bar.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(function () { requestAnimationFrame(function () { bar.classList.add('is-on'); }); });
      } else {
        bar.classList.remove('is-on');
        bar.setAttribute('aria-hidden', 'true');
        timer = setTimeout(function () { if (!shown) bar.hidden = true; }, 260);
      }
    };
    var lift = function () {
      // On phones the site has its own fixed bottom bar: sit above it.
      var sb = document.querySelector('.sticky-bar');
      var h = 0;
      if (sb) {
        var cs = getComputedStyle(sb);
        if (cs.display !== 'none' && cs.position === 'fixed') h = sb.offsetHeight;
      }
      bar.style.setProperty('--bl-cta-bottom', h + 'px');
    };
    var update = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? (window.pageYOffset || doc.scrollTop) / max : 0;
      setShown(ratio >= 0.4 && !inlineVisible);
    };
    if (inlineCta && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inlineVisible = entries[0].isIntersecting;
        update();
      }).observe(inlineCta);
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', function () { lift(); update(); });
    lift();
    update();
  }

  // ---- copy link
  var copy = document.querySelector('[data-bl-copy]');
  if (copy) {
    var note = document.querySelector('[data-bl-copied]');
    var say = function (t) {
      if (!note) return;
      note.textContent = t;
      setTimeout(function () { note.textContent = ''; }, 3000);
    };
    var legacy = function (text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    };
    copy.hidden = false;
    copy.addEventListener('click', function () {
      var url = copy.getAttribute('data-url') || location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { say('Link copied.'); }, function () { say(legacy(url) ? 'Link copied.' : 'Copy did not work. Copy the address bar instead.'); });
      } else {
        say(legacy(url) ? 'Link copied.' : 'Copy did not work. Copy the address bar instead.');
      }
    });
  }
})();
