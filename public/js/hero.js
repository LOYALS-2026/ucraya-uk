// Home hero: the video call window becomes a short mock lesson.
// A caption strip types four lesson lines, the speaker ring and the audio bars move between the tutor and one student,
// a tick appears after the corrected sentence, and after about 40 seconds everything settles into a calm still state.
// The window also tilts a few degrees towards the pointer on a mouse. Transform and opacity only.
// Without this file (or with reduced motion) the hero is a still picture that shows the first line.
(function () {
  'use strict';
  var root = document.querySelector('[data-lesson]');
  if (!root) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var lines, labels;
  try { lines = JSON.parse(root.getAttribute('data-lines')); labels = JSON.parse(root.getAttribute('data-labels')); } catch (e) { return; }
  if (!lines || !lines.length || !labels) return;
  var capWho = root.querySelector('[data-cap-who]');
  var capText = root.querySelector('[data-cap-text]');
  var react = root.querySelector('[data-react]');
  if (!capWho || !capText) return;

  var TYPE_MS = 2000;     // each line is typed over about two seconds
  var HOLD_MS = 1600;     // then held, so a line changes speaker every 3 to 4 seconds
  var LAST_HOLD_MS = 2400; // the corrected sentence is held a little longer, with the tick
  var LOOP_MS = 40000;    // about 40 seconds of liveliness, then calm

  var idx = 0, step = 0, shown = -1, typingDone = false, calm = false;
  var seen = 0, last = 0, raf = 0, onScreen = false;

  function begin(i) {
    idx = i; step = 0; shown = -1; typingDone = false;
    var l = lines[i];
    root.setAttribute('data-speaker', l.who);
    capWho.textContent = labels[l.who] || '';
    capText.textContent = '';
    root.classList.add('is-typing');
    if (react) react.classList.remove('is-pop');
  }

  function settle() {
    calm = true;
    root.classList.remove('is-typing');
    root.classList.add('is-calm');
    var l = lines[lines.length - 1];
    root.setAttribute('data-speaker', l.who);
    capWho.textContent = labels[l.who] || '';
    capText.textContent = l.text;
    if (react) { react.classList.remove('is-pop'); react.classList.add('is-done'); }
  }

  function frame(ts) {
    raf = 0;
    if (!onScreen || document.hidden || calm) return;
    var dt = last ? Math.min(ts - last, 100) : 0;
    last = ts;
    seen += dt;
    step += dt;
    var l = lines[idx];
    if (!typingDone) {
      var n = step >= TYPE_MS ? l.text.length : Math.ceil(l.text.length * (step / TYPE_MS));
      if (n !== shown) { shown = n; capText.textContent = l.text.slice(0, n); }
      if (step >= TYPE_MS) {
        typingDone = true;
        root.classList.remove('is-typing');
        if (react && idx === lines.length - 1) { void react.offsetWidth; react.classList.add('is-pop'); }
      }
    } else {
      var hold = idx === lines.length - 1 ? LAST_HOLD_MS : HOLD_MS;
      if (step >= TYPE_MS + hold) {
        if (idx === lines.length - 1) {
          if (seen >= LOOP_MS) { settle(); return; }
          begin(0);
        } else begin(idx + 1);
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function run() {
    root.classList.remove('is-off');
    if (calm || raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    root.classList.add('is-off'); // pauses the CSS animations too
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    last = 0;
  }

  root.classList.add('is-live');
  begin(0);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (onScreen) run(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[entries.length - 1].isIntersecting;
      if (onScreen && !document.hidden) run(); else stop();
    }, { threshold: 0.15 }).observe(root);
  } else { onScreen = true; run(); }

  // ---- tilt towards the pointer (mouse only, 4 degrees at most). The boxes are measured once per visit to the panel.
  var tilt = root.querySelector('[data-tilt]');
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var panel = root.closest('.hero-panel');
  if (tilt && fine && panel) {
    var MAX = 4, boxR = null, boxP = null, px = 0, py = 0, tr = 0;
    var measure = function () { boxR = root.getBoundingClientRect(); boxP = panel.getBoundingClientRect(); };
    var clamp = function (v) { return v < -1 ? -1 : v > 1 ? 1 : v; };
    var apply = function () {
      tr = 0;
      if (!boxR) return;
      var nx = clamp((px - (boxR.left + boxR.width / 2)) / (boxP.width / 2));
      var ny = clamp((py - (boxR.top + boxR.height / 2)) / (boxP.height / 2));
      tilt.style.transform = 'perspective(900px) rotateX(' + (-ny * MAX).toFixed(2) + 'deg) rotateY(' + (nx * MAX).toFixed(2) + 'deg)';
    };
    panel.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') measure(); });
    panel.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (!boxR) measure();
      px = e.clientX; py = e.clientY;
      if (!tr) tr = requestAnimationFrame(apply);
    });
    panel.addEventListener('pointerleave', function () {
      if (tr) { cancelAnimationFrame(tr); tr = 0; }
      boxR = null;
      tilt.style.transform = '';
    });
    window.addEventListener('scroll', function () { boxR = null; }, { passive: true });
    window.addEventListener('resize', function () { boxR = null; });
  }
})();
