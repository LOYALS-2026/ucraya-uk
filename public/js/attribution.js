// Where did this enquiry come from? Fills the hidden fields of every enquiry form (inline and pop-in) and of the translation quote form.
// First touch (the first page of a visit, its referrer and its utm values) is kept in localStorage for 30 days
// under one key, so a visitor who comes back later still shows the original source. First party only, no cookies.
(function () {
  var KEY = 'ucraya-attribution';
  var DAYS = 30;
  var NOW = new Date();

  function clean(v, max) {
    return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max || 100);
  }
  function param(search, name) {
    try { return clean(new URLSearchParams(search).get(name), 100); } catch (e) { return ''; }
  }
  function host(url) {
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; }
  }
  function is(h, base) { return h === base || h.slice(-(base.length + 1)) === '.' + base; }

  // One name per channel, whether the visitor arrived with a referrer or with ?utm_source= (ChatGPT sends utm_source=chatgpt.com).
  var WORDS = {
    'chatgpt': 'ChatGPT', 'chatgpt.com': 'ChatGPT', 'chat.openai.com': 'ChatGPT', 'openai': 'ChatGPT', 'openai.com': 'ChatGPT',
    'perplexity': 'Perplexity', 'perplexity.ai': 'Perplexity',
    'gemini': 'Gemini', 'gemini.google.com': 'Gemini', 'bard.google.com': 'Gemini',
    'copilot': 'Copilot', 'copilot.microsoft.com': 'Copilot',
    'claude': 'Claude', 'claude.ai': 'Claude'
  };
  function classifyHost(h) {
    if (!h) return '';
    if (WORDS[h]) return WORDS[h];
    if (is(h, 'chatgpt.com') || is(h, 'openai.com')) return 'ChatGPT';
    if (is(h, 'perplexity.ai')) return 'Perplexity';
    if (is(h, 'claude.ai')) return 'Claude';
    if (/(^|\.)google\.[a-z.]{2,6}$/.test(h)) return 'Google search';
    if (is(h, 'bing.com')) return 'Bing search';
    if (is(h, 'facebook.com') || is(h, 'fb.com') || is(h, 'fb.me')) return 'Facebook';
    if (is(h, 'instagram.com')) return 'Instagram';
    if (is(h, 'linkedin.com') || is(h, 'lnkd.in')) return 'LinkedIn';
    if (is(h, 'tiktok.com')) return 'TikTok';
    if (is(h, 'youtube.com') || is(h, 'youtu.be')) return 'YouTube';
    return '';
  }

  function classify(referrer, search) {
    var utm = param(search, 'utm_source');
    if (utm) {
      var u = utm.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      // Only the AI assistants are renamed from a utm value; any other utm_source is kept as the campaign wrote it.
      var named = WORDS[u];
      return named || utm;
    }
    var h = host(referrer);
    if (h === location.hostname.toLowerCase().replace(/^www\./, '')) h = '';
    if (h) return classifyHost(h) || 'Direct or unknown';
    if (param(search, 'utm_medium') || param(search, 'utm_campaign') || param(search, 'src')) return 'Email or WhatsApp';
    return 'Direct or unknown';
  }

  // Last touch: how THIS visit began (kept for the browser session), so a visitor who first came direct and returns from ChatGPT shows both.
  var LAST = 'ucraya-last-touch';
  function lastTouch() {
    try { var raw = window.sessionStorage.getItem(LAST); if (raw) return JSON.parse(raw); } catch (e) { /* ignore */ }
    var ref = clean(document.referrer, 200);
    var rec = { channel: classify(ref, location.search), referrer: ref };
    try { window.sessionStorage.setItem(LAST, JSON.stringify(rec)); } catch (e) { /* storage blocked */ }
    return rec;
  }

  function firstTouch() {
    var stored = null;
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) stored = JSON.parse(raw);
    } catch (e) { stored = null; }
    if (stored && stored.t && NOW.getTime() - stored.t < DAYS * 86400000 && stored.channel) return stored;
    var ref = clean(document.referrer, 200);
    var s = location.search;
    var rec = {
      t: NOW.getTime(),
      started: NOW.toISOString(),
      channel: classify(ref, s),
      referrer: ref,
      landing: clean(location.pathname, 200),
      utm_source: param(s, 'utm_source'),
      utm_medium: param(s, 'utm_medium'),
      utm_campaign: param(s, 'utm_campaign'),
      utm_content: param(s, 'utm_content'),
    };
    try { window.localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* storage blocked: this page only */ }
    return rec;
  }

  var first = firstTouch();
  var last = lastTouch();

  function device() {
    var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var w = window.innerWidth || document.documentElement.clientWidth || 1024;
    if (coarse && w < 600) return 'phone';
    if (coarse && w < 1100) return 'tablet';
    return 'desktop';
  }
  function placementLevel() {
    try { return clean(window.localStorage.getItem('ucraya-placement-level'), 4); } catch (e) { return ''; }
  }
  function set(form, name, value) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (el) el.value = value;
  }

  function fill(form) {
    set(form, 'source_channel', first.channel);
    set(form, 'source_referrer', first.referrer);
    set(form, 'last_channel', last.channel);
    set(form, 'last_referrer', last.referrer);
    set(form, 'landing_page', first.landing);
    set(form, 'enquiry_page', clean(location.pathname, 200));
    set(form, 'utm_source', first.utm_source);
    set(form, 'utm_medium', first.utm_medium);
    set(form, 'utm_campaign', first.utm_campaign);
    set(form, 'utm_content', first.utm_content);
    set(form, 'device', device());
    set(form, 'browser_language', clean(navigator.language || '', 20));
    set(form, 'placement_level', placementLevel());
    set(form, 'visit_started', first.started);
    // The translation quote form has its own fixed subject (Netlify fills in the submission id); only the lesson enquiry builds one here.
    if (form.getAttribute('name') === 'enquiry') {
      var goal = form.querySelector('input[name="goal"]:checked');
      set(form, 'subject', 'New enquiry (' + (goal ? goal.value : 'no goal chosen') + ') via ' + first.channel + ': ucraya.uk');
    }
  }
  var FORMS = 'form[name="enquiry"], form[name="translation-quote"]';
  function fillAll() {
    var forms = document.querySelectorAll(FORMS);
    for (var i = 0; i < forms.length; i++) fill(forms[i]);
  }
  function formOf(e) { return e.target && e.target.closest ? e.target.closest(FORMS) : null; }

  fillAll();
  document.addEventListener('focusin', function (e) { var f = formOf(e); if (f) fill(f); });
  document.addEventListener('change', function (e) { var f = formOf(e); if (f) fill(f); });
  document.addEventListener('submit', function (e) { var f = formOf(e); if (f) fill(f); }, true);
  document.addEventListener('ucraya:enquiry-open', fillAll);
  window.addEventListener('pageshow', fillAll);
})();
