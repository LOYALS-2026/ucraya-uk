// Guide search: suggestions as you type (from /search/suggest.json) and, on the /blog/ hub,
// full results from Pagefind (/pagefind/). If Pagefind cannot load (for example the browser
// blocks WebAssembly), the same suggestion data answers the search, with a little less detail.
// Without JavaScript the form is a plain GET to /blog/?q=.
(function () {
  'use strict';
  var forms = document.querySelectorAll('form[data-bl-search]');
  if (!forms.length) return;

  var STOP = { a: 1, an: 1, the: 1, to: 1, of: 1, for: 1, in: 1, on: 1, my: 1, i: 1, do: 1, how: 1, should: 1, is: 1, or: 1, and: 1, what: 1, can: 1, we: 1, you: 1, your: 1, it: 1, are: 1 };
  var STAGES = { a: 'Just starting', c: 'Comparing options', d: 'Ready to choose' };
  var PAGE = 12;

  function norm(s) { return String(s || '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function words(s) { var n = norm(s); return n ? n.split(' ') : []; }
  function tokensOf(q) {
    var all = words(q);
    var keep = all.filter(function (w) { return !STOP[w]; });
    return keep.length ? keep : all;
  }
  function slugify(s) { return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function hasPrefix(list, t) { for (var i = 0; i < list.length; i++) if (list[i].indexOf(t) === 0) return true; return false; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // ---- data ------------------------------------------------------------------------------------
  var dataPromise = null;
  function loadData() {
    if (!dataPromise) {
      dataPromise = fetch('/search/suggest.json', { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('suggest'); return r.json(); })
        .then(prepare)
        .catch(function () { return null; });
    }
    return dataPromise;
  }
  function prepare(j) {
    var posts = j.posts.map(function (p) {
      var kw = p.k || [];
      return {
        t: p.t, s: p.s, p: p.p, q: p.q, d: p.d, r: p.r, f: p.f, k: kw,
        tw: words(p.t), kw: words(kw.join(' ')), qw: words(p.q), pw: words(j.pillars[p.p] ? j.pillars[p.p].n : ''),
        tn: norm(p.t),
      };
    });
    var pages = (j.pages || []).map(function (g) {
      return { t: g.t, u: g.u, tw: words(g.t), kw: words((g.k || []).join(' ')), tn: norm(g.t) };
    });
    var phrases = [], seen = {};
    posts.forEach(function (p) {
      p.k.concat([p.q]).forEach(function (txt) {
        var n = norm(txt);
        if (!n || seen[n] || n === p.tn) return;
        seen[n] = 1;
        phrases.push({ text: txt, w: n.split(' '), n: n, isQ: txt === p.q });
      });
    });
    return { pillars: j.pillars, posts: posts, pages: pages, phrases: phrases };
  }

  // ---- matching --------------------------------------------------------------------------------
  // Score one guide (or lesson page) against the typed words. Strict: every word must start a word in the title, keywords,
  // question or goal. Loose: at least one must, and guides that match every word still rank first.
  function scorePost(p, tok, nq, loose) {
    var sum = 0, hit = 0;
    for (var i = 0; i < tok.length; i++) {
      var t = tok[i], s = 0;
      if (hasPrefix(p.tw, t)) s = 6;
      else if (hasPrefix(p.kw, t)) s = 4;
      else if (p.qw && hasPrefix(p.qw, t)) s = 2;
      else if (p.pw && hasPrefix(p.pw, t)) s = 1;
      if (s) { sum += s; hit++; } else if (!loose) return -1;
    }
    if (!hit) return -1;
    if (p.tn.indexOf(nq) > -1) sum += 5;
    return sum + (hit === tok.length ? 100 : 0);
  }
  function searchPosts(d, q, filters, loose) {
    var tok = tokensOf(q), nq = tok.join(' ');
    if (!tok.length) return [];
    var out = [];
    d.posts.forEach(function (p) {
      if (filters && filters.pillar && d.pillars[p.p] && slugify(d.pillars[p.p].n) !== filters.pillar) return;
      if (filters && filters.stage && p.f !== filters.stage) return;
      var s = scorePost(p, tok, nq, loose);
      if (s >= 0) out.push({ p: p, s: s });
    });
    out.sort(function (a, b) { return b.s - a.s || (a.p.d < b.p.d ? 1 : -1); });
    return out;
  }
  function searchPages(d, q) {
    var tok = tokensOf(q), nq = tok.join(' ');
    var out = [];
    (d.pages || []).forEach(function (g) {
      var s = scorePost(g, tok, nq, true);
      if (s >= 0) out.push({ g: g, s: s });
    });
    out.sort(function (a, b) { return b.s - a.s; });
    return out;
  }
  function suggest(d, q) {
    var tok = tokensOf(q), nq = tok.join(' ');
    var posts = searchPosts(d, q, null, true).slice(0, 5).map(function (x) { return x.p; });
    var lessons = searchPages(d, q).slice(0, 3).map(function (x) { return x.g; });
    var ph = [];
    d.phrases.forEach(function (x) {
      var ok = true;
      for (var i = 0; i < tok.length; i++) if (!hasPrefix(x.w, tok[i])) { ok = false; break; }
      if (ok) ph.push({ x: x, s: (x.n.indexOf(nq) === 0 ? 3 : 0) + (x.isQ ? 0 : 1) - x.w.length / 40 });
    });
    ph.sort(function (a, b) { return b.s - a.s; });
    var pillars = d.pillars.filter(function (pl) {
      var w = words(pl.n);
      return tok.every(function (t) { return hasPrefix(w, t); });
    }).slice(0, 2);
    return { posts: posts, lessons: lessons, phrases: ph.slice(0, 4).map(function (o) { return o.x; }), pillars: pillars };
  }
  function markInto(node, text, tok) {
    if (!tok.length) { node.appendChild(document.createTextNode(text)); return; }
    var re = new RegExp('(^|[^a-z0-9])(' + tok.map(esc).join('|') + ')', 'ig');
    var last = 0, m;
    while ((m = re.exec(text))) {
      var start = m.index + m[1].length;
      if (start > last) node.appendChild(document.createTextNode(text.slice(last, start)));
      node.appendChild(el('mark', '', m[2]));
      last = start + m[2].length;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  // ---- hub (full results) ----------------------------------------------------------------------
  var resultsBox = document.getElementById('bl-results');
  var onHub = !!resultsBox;
  var state = { q: '', pillar: '', stage: '' };
  var pf = null, pfPromise = null;
  var shownCount = 0, current = null; // current: { items: [...] | pagefind results, kind }

  function getPagefind() {
    if (!pfPromise) {
      pfPromise = import('/pagefind/pagefind.js')
        .then(function (m) {
          if (m.options) m.options({ baseUrl: '/' });
          // Load the filter index first: only then do results carry the filter counts used for the chips.
          return (m.init ? m.init() : Promise.resolve()).then(function () { return m.filters ? m.filters() : null; }).then(function () { return m; });
        })
        .catch(function () { return null; });
    }
    return pfPromise;
  }

  function readUrl() {
    var p = new URLSearchParams(location.search);
    return { q: (p.get('q') || '').trim(), pillar: p.get('pillar') || '', stage: p.get('stage') || '' };
  }
  function writeUrl(push) {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.pillar) p.set('pillar', state.pillar);
    if (state.stage) p.set('stage', state.stage);
    var qs = p.toString();
    var url = '/blog/' + (qs ? '?' + qs : '');
    if (location.pathname + location.search === url) return;
    try { history[push ? 'pushState' : 'replaceState']({ bl: 1 }, '', url); } catch (e) { /* ignore */ }
  }

  function showBrowse() {
    var b = document.getElementById('bl-browse');
    if (b) b.hidden = false;
    if (resultsBox) resultsBox.hidden = true;
  }
  function setInputs(q) {
    forms.forEach(function (f) { var i = f.querySelector('input[name="q"]'); if (i && i.value !== q) i.value = q; });
  }
  function status(msg) { var s = document.getElementById('bl-status'); if (s) s.textContent = msg; }

  function runSearch(next, push) {
    state = { q: (next.q || '').trim(), pillar: next.pillar || '', stage: next.stage || '' };
    setInputs(state.q);
    closeAll();
    if (!state.q) { writeUrl(push); showBrowse(); status(''); return; }
    writeUrl(push);
    var b = document.getElementById('bl-browse');
    if (b) b.hidden = true;
    resultsBox.hidden = false;
    document.getElementById('bl-results-title').textContent = 'Searching…';
    document.getElementById('bl-results-grid').textContent = '';
    document.getElementById('bl-filters').textContent = '';
    document.getElementById('bl-empty').hidden = true;
    document.getElementById('bl-more').hidden = true;
    var ticket = ++runTicket;

    Promise.all([getPagefind(), loadData()]).then(function (res) {
      var mod = res[0], d = res[1];
      if (ticket !== runTicket) return;
      var filterObj = {};
      if (mod && (state.pillar || state.stage)) {
        // Pagefind filters use the visible names; map the URL values back to them.
        if (state.pillar && d) { d.pillars.forEach(function (p) { if (slugify(p.n) === state.pillar) filterObj.pillar = p.n; }); }
        if (state.stage && STAGES[state.stage]) filterObj.stage = STAGES[state.stage];
      }
      var tryLite = function () {
        if (!d) { renderError(); return; }
        var loose = !searchPosts(d, state.q).length;
        var found = searchPosts(d, state.q, { pillar: state.pillar, stage: state.stage }, loose);
        var totals = { pillar: {}, stage: {} };
        searchPosts(d, state.q, null, loose).forEach(function (x) {
          var pn = d.pillars[x.p.p] ? d.pillars[x.p.p].n : '';
          if (pn) totals.pillar[pn] = (totals.pillar[pn] || 0) + 1;
          totals.stage[STAGES[x.p.f]] = (totals.stage[STAGES[x.p.f]] || 0) + 1;
        });
        current = { kind: 'lite', items: found.map(function (x) { return x.p; }), d: d };
        render(totals, found.length);
      };
      if (!mod) { tryLite(); return; }
      mod.search(state.q, { filters: filterObj }).then(function (r) {
        if (ticket !== runTicket) return;
        if (!r.results.length && !state.pillar && !state.stage && d) {
          // Pagefind wants every word; the suggestion data is more forgiving.
          var lite = searchPosts(d, state.q, null, true);
          if (lite.length) { tryLite(); return; }
        }
        current = { kind: 'pf', items: r.results };
        render(r.totalFilters || r.filters || {}, r.results.length);
      }).catch(tryLite);
    });
  }
  var runTicket = 0;

  function renderError() {
    document.getElementById('bl-results-title').textContent = 'Search is not available right now';
    document.getElementById('bl-empty-title').textContent = 'We could not load the search. Browse by goal instead.';
    document.getElementById('bl-empty').hidden = false;
    status('Search is not available right now.');
  }

  function chip(label, count, pressed, onClick) {
    var b = el('button', 'bl-chip');
    b.type = 'button';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.appendChild(document.createTextNode(label));
    if (count != null) b.appendChild(el('small', '', '(' + count + ')'));
    b.addEventListener('click', onClick);
    return b;
  }

  function render(totals, count) {
    var title = document.getElementById('bl-results-title');
    var grid = document.getElementById('bl-results-grid');
    var empty = document.getElementById('bl-empty');
    var filters = document.getElementById('bl-filters');
    grid.textContent = ''; filters.textContent = '';
    shownCount = 0;
    var label = '“' + state.q + '”';
    if (!count) {
      title.textContent = 'No guides match ' + label + ' yet';
      document.getElementById('bl-empty-title').textContent = 'No guides match ' + label + ' yet.';
      empty.hidden = false;
      document.getElementById('bl-more').hidden = true;
      status('No results for ' + state.q);
    } else {
      empty.hidden = true;
      title.textContent = count + (count === 1 ? ' result for ' : ' results for ') + label;
      status(count + (count === 1 ? ' result' : ' results') + ' for ' + state.q);
      more();
    }
    // Filter chips (from the counts without filters, so they stay put when one is chosen)
    var pn = totals && totals.pillar ? Object.keys(totals.pillar) : [];
    if (pn.length > 1 || state.pillar) {
      var g1 = el('div', 'bl-filter-group'); g1.appendChild(el('span', '', 'Goal'));
      pn.sort().forEach(function (n) {
        var slug = slugify(n);
        if (!totals.pillar[n] && state.pillar !== slug) return;
        g1.appendChild(chip(n, totals.pillar[n], state.pillar === slug, function () {
          runSearch({ q: state.q, pillar: state.pillar === slug ? '' : slug, stage: state.stage }, true);
        }));
      });
      filters.appendChild(g1);
    }
    var sn = totals && totals.stage ? Object.keys(totals.stage) : [];
    if (sn.length > 1 || state.stage) {
      var g2 = el('div', 'bl-filter-group'); g2.appendChild(el('span', '', 'Stage'));
      ['a', 'c', 'd'].forEach(function (code) {
        var name = STAGES[code];
        if (!totals.stage || !totals.stage[name]) return;
        g2.appendChild(chip(name, totals.stage[name], state.stage === code, function () {
          runSearch({ q: state.q, pillar: state.pillar, stage: state.stage === code ? '' : code }, true);
        }));
      });
      filters.appendChild(g2);
    }
  }

  function dateText(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return Number(m[3]) + ' ' + months[Number(m[2]) - 1] + ' ' + m[1];
  }
  function excerptInto(node, html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    doc.body.childNodes.forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'MARK') node.appendChild(el('mark', '', n.textContent));
      else node.appendChild(document.createTextNode(n.textContent));
    });
  }
  function card(c) {
    var a = el('article', 'bl-card card glass');
    var top = el('p'); top.appendChild(el('span', 'pill bl-pill', c.pill)); a.appendChild(top);
    var h = el('h3', 'bl-card-title'); var link = el('a', 'bl-card-link'); link.href = c.url;
    markInto(link, c.title, c.tok); h.appendChild(link); a.appendChild(h);
    var t = el('p', 'bl-card-text');
    if (c.excerptHtml) excerptInto(t, c.excerptHtml); else markInto(t, c.text || '', c.tok);
    a.appendChild(t);
    if (c.meta) a.appendChild(el('p', 'bl-card-meta', c.meta));
    return a;
  }
  function more() {
    var grid = document.getElementById('bl-results-grid');
    var btn = document.getElementById('bl-more');
    var tok = tokensOf(state.q);
    var from = shownCount, to = Math.min(current.items.length, from + PAGE);
    shownCount = to;
    var slice = current.items.slice(from, to);
    var ticket = runTicket;
    var done = function (cards) {
      if (ticket !== runTicket) return;
      cards.forEach(function (c) { grid.appendChild(card(c)); });
      btn.hidden = shownCount >= current.items.length;
    };
    if (current.kind === 'lite') {
      var d = current.d;
      done(slice.map(function (p) {
        return { pill: d.pillars[p.p] ? d.pillars[p.p].n : 'Guide', url: '/blog/' + p.s + '/', title: p.t, text: p.q, tok: tok, meta: dateText(p.d) + ' · ' + p.r + ' min read' };
      }));
    } else {
      Promise.all(slice.map(function (r) { return r.data(); })).then(function (rows) {
        done(rows.map(function (r) {
          var m = r.meta || {};
          var guide = m.kind === 'Guide';
          var pill = guide ? (m.pillar || 'Guide') : (/^\/courses\//.test(r.url) ? 'Lessons' : /^\/pricing\//.test(r.url) ? 'Prices' : 'Page');
          var meta = guide ? dateText(m.date) + (m.readtime ? ' · ' + m.readtime + ' min read' : '') : '';
          var c = { pill: pill, url: r.url, title: m.title || r.url, tok: tok, meta: meta };
          if (guide && m.answer) c.text = m.answer; else c.excerptHtml = r.excerpt;
          return c;
        }));
      });
    }
  }

  // ---- suggestion lists -------------------------------------------------------------------------
  var boxes = [];
  function closeAll() { boxes.forEach(function (b) { b.close(); }); }
  // <html class="search-open"> while any suggestion list is showing, so the floating dock (ui.js) steps aside.
  function syncOpen() {
    var any = false;
    forms.forEach(function (f) { var l = f.querySelector('.bl-suggest'); if (l && !l.hidden) any = true; });
    document.documentElement.classList.toggle('search-open', any);
  }

  forms.forEach(function (form, fi) {
    var input = form.querySelector('input[name="q"]');
    var list = form.querySelector('.bl-suggest');
    if (!input || !list) return;
    var compact = form.getAttribute('data-compact') === 'true';
    var options = [], active = -1, idn = 0;

    function setActive(i) {
      if (options[active]) { options[active].li.classList.remove('is-active'); options[active].li.setAttribute('aria-selected', 'false'); }
      active = i;
      if (options[i]) {
        options[i].li.classList.add('is-active');
        options[i].li.setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', options[i].li.id);
        if (options[i].li.scrollIntoView) options[i].li.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }
    function close() {
      list.hidden = true;
      list.textContent = '';
      list.classList.remove('is-up');
      list.style.maxHeight = '';
      options = []; active = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      syncOpen();
    }
    function open() {
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      // Open downwards under the field, as tall as the room allows (never more than 60% of the screen). Only a field close to the bottom
      // of the screen, with clearly more room above, opens upwards.
      var vv = window.visualViewport;
      var vh = vv ? vv.height : window.innerHeight;
      var r = input.getBoundingClientRect();
      var below = vh - r.bottom - 16, above = r.top - 16;
      var cap = vh * 0.6;
      var up = below < 220 && above > below;
      list.classList.toggle('is-up', up);
      list.style.maxHeight = Math.max(160, Math.min(cap, up ? above : below)) + 'px';
      syncOpen();
    }
    var group = null;
    function heading(t) {
      group = el('div');
      group.setAttribute('role', 'group');
      var hid = 'bl-h' + fi + '-' + (idn++);
      group.setAttribute('aria-labelledby', hid);
      var h = el('div', 'bl-suggest-h', t);
      h.id = hid;
      group.appendChild(h);
      list.appendChild(group);
    }
    function option(build) {
      var a = el('a', 'bl-opt');
      a.id = 'bl-o' + fi + '-' + (idn++);
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', 'false');
      a.tabIndex = -1;
      build(a);
      a.addEventListener('mousemove', function () { var i = options.findIndex(function (o) { return o.li === a; }); if (i !== active) setActive(i); });
      (group || list).appendChild(a);
      options.push({ li: a, a: a });
    }
    function show(q) {
      loadData().then(function (d) {
        if (input.value !== q) return;
        list.textContent = ''; options = []; active = -1; group = null; input.removeAttribute('aria-activedescendant');
        if (!d) { close(); return; }
        var tok = tokensOf(q);
        var res = suggest(d, q);
        if (res.posts.length) {
          heading('Guides');
          res.posts.forEach(function (p) {
            option(function (a) {
              a.href = '/blog/' + p.s + '/';
              var main = el('span', 'bl-opt-main');
              var t = el('span', 'bl-opt-title'); markInto(t, p.t, tok); main.appendChild(t);
              // The goal shows as a small muted line under the title in a narrow list, as a pill at the right in a wide one (CSS decides).
              if (d.pillars[p.p]) main.appendChild(el('span', 'bl-opt-sub is-goal', d.pillars[p.p].n));
              a.appendChild(main);
              if (d.pillars[p.p]) a.appendChild(el('span', 'pill bl-pill', d.pillars[p.p].n));
            });
          });
        }
        if (res.lessons.length) {
          heading('Lessons and prices');
          res.lessons.forEach(function (g) {
            option(function (a) {
              a.href = g.u;
              var main = el('span', 'bl-opt-main');
              var t = el('span', 'bl-opt-title'); markInto(t, g.t, tok); main.appendChild(t);
              main.appendChild(el('span', 'bl-opt-sub', 'Lessons and prices'));
              a.appendChild(main);
            });
          });
        }
        if (res.phrases.length) {
          heading('Search for');
          res.phrases.forEach(function (x) {
            option(function (a) {
              a.href = '/blog/?q=' + encodeURIComponent(x.text);
              a.setAttribute('data-bl-q', x.text);
              var t = el('span', 'bl-opt-kw'); markInto(t, x.text, tok); a.appendChild(t);
              a.appendChild(el('span', 'bl-opt-kind', x.isQ ? 'question' : 'topic'));
            });
          });
        }
        if (res.pillars.length) {
          heading('Goals');
          res.pillars.forEach(function (pl) {
            option(function (a) {
              a.href = '/blog/pillar/' + pl.s + '/';
              var t = el('span', 'bl-opt-title'); markInto(t, pl.n, tok); a.appendChild(t);
              a.appendChild(el('span', 'bl-opt-kind', 'all guides on this goal'));
            });
          });
        }
        if (!options.length) {
          var none = el('div', 'bl-suggest-none', 'No close match. Press Enter to search all guides and lessons.');
          none.setAttribute('role', 'presentation');
          list.appendChild(none);
        }
        open();
      });
    }

    boxes.push({ close: close });
    form._blClose = close;
    // Choosing a row closes the list (after the click has been handled, so a link still opens).
    list.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setTimeout(close, 0); });

    input.addEventListener('focus', function () { loadData(); if (onHub) getPagefind(); });
    input.addEventListener('input', function () {
      var q = input.value.trim();
      if (q.length < 2) { close(); return; }
      show(input.value);
    });
    input.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        if (list.hidden) { if (input.value.trim().length >= 2) show(input.value); e.preventDefault(); return; }
        if (!options.length) return;
        e.preventDefault();
        var n = options.length;
        setActive(k === 'ArrowDown' ? (active + 1) % n : (active - 1 + n) % n);
      } else if (k === 'Enter') {
        if (!list.hidden && options[active]) {
          e.preventDefault();
          options[active].a.click();
        } else if (onHub) {
          e.preventDefault();
          runSearch({ q: input.value }, true);
        } // elsewhere the form submits to /blog/?q=
      } else if (k === 'Escape') {
        if (!list.hidden) { e.preventDefault(); close(); }
      } else if (k === 'Tab') close();
    });
    form.addEventListener('submit', function (e) {
      var q = input.value.trim();
      if (!q) { e.preventDefault(); input.focus(); return; }
      if (onHub) { e.preventDefault(); runSearch({ q: q }, true); }
    });
    form.addEventListener('focusout', function (e) {
      if (e.relatedTarget && form.contains(e.relatedTarget)) return;
      setTimeout(function () { if (!form.contains(document.activeElement)) close(); }, 120);
    });
  });

  // Escape closes an open list wherever the focus is (inside the box it also keeps the focus in the field).
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    forms.forEach(function (f) { var l = f.querySelector('.bl-suggest'); if (l && !l.hidden && f._blClose) f._blClose(); });
  });

  // A press outside a box closes THAT box's list only. (Articles carry two boxes, one hidden by CSS: closing every list on any
  // press outside "its" form emptied the visible list before the click on a suggestion could land.)
  document.addEventListener('pointerdown', function (e) {
    forms.forEach(function (f) { if (f._blClose && !f.contains(e.target)) f._blClose(); });
  });

  // phrase links, example pills and "clear search" work in place on the hub
  document.addEventListener('click', function (e) {
    if (!onHub || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[data-bl-q], a[data-bl-clear]') : null;
    if (!a) return;
    e.preventDefault();
    if (a.hasAttribute('data-bl-clear')) runSearch({ q: '' }, true);
    else runSearch({ q: a.getAttribute('data-bl-q') }, true);
    window.scrollTo({ top: 0 });
  });

  if (onHub) {
    var more_ = document.getElementById('bl-more');
    if (more_) more_.addEventListener('click', function () { more(); });
    window.addEventListener('popstate', function () {
      var u = readUrl();
      if (u.q) runSearch(u, false); else { setInputs(''); runTicket++; showBrowse(); status(''); }
    });
    var first = readUrl();
    if (first.q) { setInputs(first.q); runSearch(first, false); }
  }
})();
