// Placement test scoring. Runs in the browser only; nothing is sent anywhere.
(function () {
  var motion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  var form = document.getElementById('quiz');
  if (!form) return;
  var result = document.getElementById('quiz-result');
  var errorBox = document.getElementById('quiz-error');
  var fieldsets = form.querySelectorAll('fieldset[data-correct]');
  var total = fieldsets.length;

  var bar = document.getElementById('quiz-progress');
  var barLabel = document.getElementById('quiz-progress-label');
  function progress() {
    var done = form.querySelectorAll('fieldset[data-correct] input:checked').length;
    if (bar) bar.value = done;
    if (barLabel) barLabel.textContent = fill(barLabel.getAttribute('data-template') || '', { n: String(done), total: String(total) });
  }
  form.addEventListener('change', function (e) {
    // A small pop on the chosen answer (skipped for people who ask for less motion).
    var label = e.target && e.target.closest ? e.target.closest('.opt') : null;
    if (label && motion === 'smooth') { label.classList.remove('is-picked'); void label.offsetWidth; label.classList.add('is-picked'); }
    progress();
  });

  function levelFor(score) {
    if (score <= 3) return 'A1';
    if (score <= 6) return 'A2';
    if (score <= 9) return 'B1';
    return 'B2';
  }
  function fill(template, vars) {
    return template.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var score = 0;
    var missing = [];
    for (var i = 0; i < fieldsets.length; i++) {
      var fs = fieldsets[i];
      var checked = fs.querySelector('input:checked');
      fs.classList.remove('unanswered');
      if (!checked) { missing.push(String(i + 1)); fs.classList.add('unanswered'); continue; }
      if (checked.value === fs.getAttribute('data-correct')) score++;
    }
    if (missing.length) {
      errorBox.textContent = fill(errorBox.getAttribute('data-template'), { list: missing.join(', ') });
      errorBox.hidden = false;
      var first = form.querySelector('fieldset.unanswered input');
      if (first) first.focus();
      return;
    }
    errorBox.hidden = true;
    var level = levelFor(score);
    document.getElementById('quiz-level').textContent = fill(result.getAttribute('data-level-template'), { level: level });
    document.getElementById('quiz-score').textContent = fill(result.getAttribute('data-score-template'), { score: String(score), total: String(total) });
    var advice = result.querySelectorAll('[data-advice]');
    for (var j = 0; j < advice.length; j++) advice[j].hidden = advice[j].getAttribute('data-advice') !== level;
    var link = document.getElementById('quiz-enquire');
    link.setAttribute('href', link.getAttribute('data-base') + '?level=' + level + '&purpose=placement#enquiry');
    link.setAttribute('data-level', level.toLowerCase());
    try { window.localStorage.setItem('ucraya-placement-level', level); } catch (e) { /* storage blocked */ }
    form.hidden = true;
    result.hidden = false;
    result.setAttribute('tabindex', '-1');
    result.focus();
    result.scrollIntoView({ behavior: motion, block: 'start' });
  });

  var again = document.getElementById('quiz-again');
  if (again) again.addEventListener('click', function () {
    form.reset();
    progress();
    result.hidden = true;
    form.hidden = false;
    form.scrollIntoView({ behavior: motion, block: 'start' });
  });
})();
