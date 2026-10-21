# Visual and functional inspection of ucraya.uk, 21 October 2026

Inspector: Opus 5.5, read only (this file and screenshots under `verify/inspect/`, git ignored). Build inspected: commit f6b7a3e ("Liquid glass design, language dropdown with flags, pop-in enquiry form with source tracking, blog hub with search and pillar pages"), `npm run build` (92 pages, Pagefind 13 pages), served from `dist/` by a small static server that sends the exact `Content-Security-Policy` from `netlify.toml`. Playwright with `/opt/pw-browsers/chromium-1194`, at 375x667 (iPhone SE, scale 2, mobile, touch), 390x844, 768x1024 (touch), 1440x900 and 1280x720, light mode and `prefers-reduced-motion: reduce`. No axe build in `node_modules`, so accessibility was checked by script and by eye.

## Verdict: FIX FIRST

| Severity | Count |
|---|---|
| Must fix | 6 |
| Should fix | 21 |
| Nice to have | 10 |

The foundations are good: no CSP violation or console error on any page (Pagefind's WebAssembly loads under `'wasm-unsafe-eval'`), no horizontal scroll at 375 on any page in any locale, one h1 everywhere, CLS at or below 0.024, about 18 KB of JavaScript on money pages, the language dropdown passes every check, and the pop-in form is genuinely well built (every control on screen at 375x667, 16 px inputs, correct `autocomplete`, native POST to the right locale's thank-you page, focus returns to the opener, scroll lock, inert background, attribution fields filled and kept across reloads). The look is warm and calm, much better than a template, but it does not yet read as "expensive": too many equal weight glass cards, three stacked buttons in heroes, half empty sections, a muddy footer and long phone pages. The six blockers are two broken search behaviours, a broken phone menu header, two fixed bars eating the phone reading area, no Enquire button at all on tablets, and article lists and links that lost their markers and underlines.

---

## 1. Must fix

### M1. Clicking or tapping a search suggestion does nothing on article pages
- Page: every article (`/blog/<slug>/`), 375 and 1440. Pillar, questions and hub pages are fine.
- Seen: type "english tutor" in the article's search box, click the second suggestion (a different guide): the list closes and the page does not move. Keyboard Enter on a highlighted line still works. Screenshot `verify/inspect/search-article-suggest-d1440.png`.
- Cause: `public/js/search.js` closes every list on `pointerdown` when ANY form does not contain the target. Articles have two boxes (`#bl-q-side`, `#bl-q-end`, one hidden by CSS), so the hidden one always "does not contain" the tap and `closeAll()` empties the visible list before the click lands.
- Fix (search.js, inside `forms.forEach`, after `boxes.push`): store the close on the form, then close only the others.
  ```js
  form._blClose = close;            // in forms.forEach
  document.addEventListener('pointerdown', function (e) {
    forms.forEach(function (f) { if (f._blClose && !f.contains(e.target)) f._blClose(); });
  });
  ```

### M2. Suggestions miss the core queries and contradict the full search
- Page: `/blog/`, all widths. Screenshot `verify/inspect/search-suggest-none-p375.png`.
- Seen: "oet" and "nurse" suggest well (about 0.1 s after the last key). "b1 test" and "child" show "No matching guides yet. Press Enter to search anyway." Pressing Enter on "b1 test" then shows 6 results, including the B1 guide and the B1 course page. B1 settlement applicants and parents are two of the six target audiences.
- Cause: suggestions require every typed word to start a word in the guide's title, keywords or question, and only guides are in `suggest.json` (no course pages).
- Fix: (a) in `searchPosts`/`suggest`, score by the number of tokens matched and keep any post that matches at least one non stop word (rank full matches first); (b) add the nine course pages and the four money pages that matter (pricing, placement test, free trial, how it works) to `suggest.json` as a "Lessons" group (`t`, `s` as the full URL, `k` from the course keywords), so "child" offers "English for children" and "b1 test" offers "B1 test preparation"; (c) change the empty text to "Press Enter to search all guides and lessons" so it never says nothing matches when something does.

### M3. Phone menu: "Close menu" wraps and breaks the header; the panel's Enquire sits under the bottom bar
- Page: all, 320 to 767 px, all four locales ("Close menu", "Затвори менюто", "Închide meniul", "Zamknij menu"). Screenshot `verify/inspect/menu-open-p375.png`, `verify/inspect/menu-open-bg-320.png`.
- Seen: when open, the menu button grows from 44 to 66 px tall with its label on two lines, filling the whole bar height; the icon stays a hamburger. The panel is 556 px tall and ends at 634 px, so its own Enquire button is half covered by the fixed bottom bar (z-index 50 over the header's 40).
- Fix (global.css):
  ```css
  .menu-btn { white-space: nowrap; }
  @media (max-width: 479px) { .menu-btn [data-menu-label] { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); } .menu-btn { padding-inline: .75rem; } }
  .site-header[data-open="true"] ~ .sticky-bar { display: none; }
  ```
  and swap the icon to a cross when open (`.site-header[data-open="true"] .menu-btn path { d: path("M4 4l12 12M16 4L4 16"); }` or two SVGs toggled by the attribute). The label stays for screen readers through `aria-expanded`.

### M4. Articles on phones: two fixed bars cover 120 px (18 per cent) of the reading area
- Page: every article, 375 and 390, after 40 per cent of the page. Screenshot `verify/inspect/article-cta-p375.png`.
- Seen: the article CTA bar (57 px, "Enquire about nursing-test p..." truncated, plus an Enquire button) sits on top of the site bar (63 px, Enquire and WhatsApp). Two Enquire buttons stacked, text truncated, a fifth of a small screen gone on the pages that bring the search traffic.
- Fix: on phones show one bar. Either hide the site bar while the article bar is on (`blog.js setShown`: `document.documentElement.classList.toggle('bl-cta-on', on)` and CSS `html.bl-cta-on .sticky-bar{display:none}` with `--bl-cta-bottom:0`), or better, do not build the article bar under 768 px and pass the article's goal to the site bar instead (`Base.astro` already accepts `enquire={{ goal, level }}`, so the existing bar opens the pop-in prefilled). Keep the article bar from 768 px up.

### M5. Tablets (768 to 1179 px) have no persistent Enquire button
- Page: all, 768x1024 and 1024 landscape. Screenshot `verify/inspect/home-t768-fold.png`.
- Seen: `.nav-cta-bar` only shows from 1180 px and `.sticky-bar` hides from 768 px, so on an iPad the only Enquire is inside the hamburger panel or in page sections. Every other width has one in view at all times.
- Fix: `@media (min-width: 768px) { .nav-cta-bar { display: inline-flex; } }` (it fits beside EN and Menu at 768: about 110 px).

### M6. Article lists have no bullets or numbers, and links in body text are not underlined
- Page: every article and every money page body text; 375 and 1440. Screenshot `verify/inspect/article-cta-d1440.png` (the "Will my writing be marked..." list).
- Seen: `.bl-prose ul/ol` computed `list-style-type: none` (Tailwind preflight) with no `::before` marker, so lists read as loose indented paragraphs and numbered steps lose their numbers. Links in paragraphs ("NMC page on accepted English language tests", "Meet the tutors", "See prices") have `text-decoration: none` and differ from body text by colour only: navy `#1f2a44` against body `#444444` is about 1.9:1, below the 3:1 that WCAG 1.4.1 needs for a colour-only cue.
- Fix (blog.css and global.css):
  ```css
  .bl-prose ul { list-style: disc; } .bl-prose ol { list-style: decimal; }
  .bl-prose li::marker { color: var(--green-700); }
  .bl-prose a, .prose-lite a, main p a, main li a:not(.btn):not(.card-link) { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  ```

---

## 2. Should fix

### Pop-in form and attribution
1. **ChatGPT arrives as "chatgpt.com", not "ChatGPT".** ChatGPT appends `?utm_source=chatgpt.com` to the links it cites, and `attribution.js` uses any `utm_source` verbatim, so the subject reads "via chatgpt.com" while a referrer only visit reads "via ChatGPT" (tested both). Perplexity, Copilot and Gemini do similar. Fix in `classify`: run the utm value through the same host table first (`var mapped = classifyHost(utm.replace(/^https?:\/\//,''))`, return the mapped name if found, else the raw value), so the office sees one name per channel.
2. **No visible deadline question.** The goal is people with a deadline, but the form never asks for one (hidden `deadline` is only filled from `?deadline=`). Add an optional chip row "When is your test or deadline?": Within a month, 1 to 3 months, Later, No date, writing to the hidden `deadline`. To keep the 375x667 fit, make the message one row on phones (`rows=1`, `min-height:2.75rem`) and drop the format row margin.
3. **Disabled submit looks broken and says nothing.** At 0.55 opacity "Send my enquiry" is grey on pale amber (screenshots `verify/inspect/modal-course-oet-hero-p375.png`, `verify/inspect/crop-oet-d-form.png`). A disabled button also blocks Enter, so a visitor who misses the tick gets no message. Fix: keep the button enabled and full colour; on press the existing submit handler already shows every error and focuses the first. If the disabled state stays, add a live line under it, for example "Still needed: your email, your name, the tick" (`aria-live="polite"`), and use `opacity:.75` with ink text.
4. **Phone field drops 21 px below the name field at 375.** The label "Phone or WhatsApp Optional" wraps to two lines. Fix: `.enq-grid { align-items: end; }` or label "Phone (optional)" in the pop-in.
5. **Consent tick clipped at 1280x720** (body scrolls by 12 px, the checkbox is cut at the foot; `verify/inspect/modal-article-cta-d1280x720.png`). At 375x667 it overflows by 3 px. Fix: `@media (max-height: 760px) and (min-width: 640px) { .enq-modal .field { margin-bottom: .45rem } .enq-modal .field textarea { min-height: 3rem } }`.
6. **Chips in the pop-in are 36 px tall on phones** (34 px under 640 px height). They pass WCAG 2.5.8 (24 px) but are below the 44 px brief. With the spacing they are usable; raise to 40 px if the deadline row is not added.
7. **Stale prefill between openings.** Open from a B1 article (goal B1, level B1), close, open from the header: the B1 chip and level "B1" are still set. Fix in `form.js open()`: when the opener carries no goal or level, reset `level` to the first label and leave the chip only if the visitor chose it themselves (track `f._userGoal` on `change`).

### Search and blog
8. **Zero count filter chips are offered** ("Passing a nursing English resit (0)" after a search for "b1 test"). Fix in `render`: skip chips with `totals.pillar[n] === 0` unless pressed.
9. **Suggestion list ARIA.** The listbox holds `li role="presentation"` headings and an `<a>` inside each `role="option"`. Use `<li role="group" aria-labelledby>` per section with a hidden heading id, and put the href on the option (navigate in JavaScript) or drop the combobox roles and use a plain list of links.
10. **Placeholder contrast 3.3:1** ("Try OET, B1, interview or a question" is ink at 50 per cent alpha). Fix: `.input::placeholder { color: var(--muted); opacity: 1; }` (about 6:1).
11. **Planned guide shown as a card in "Start here"** ("Choosing IELTS preparation without a classroom, Coming on 23 October 2026"), a dead tile in the most valuable row. Show only published guides there; planned ones belong on the questions page.

### Visual quality
12. **Backdrop blur on every card.** On phones 3 to 6 full width blurred elements are in view at once (`.card`, `.glass-strong`, `.form-card`, `.faq details`, `.steps li`, `.quiz fieldset`, plus header and bar); 9 to 10 on desktop. DESIGN.md says one broad blur. At .82 to .92 fill the blur is invisible but costs GPU on mid range Android while scrolling. Fix: remove `-webkit-backdrop-filter/backdrop-filter` from the shared glass rule and add it back only to `.glass`, `.hero-panel`, `.modal-card`, `.lang-menu`, `.nav-panel`, `.cookie`, `.btn-secondary` outside cards.
13. **Header glass does not visibly blur and turns grey over the footer.** On every screenshot the text behind the bar is sharp, only faded by the .72 fill (`verify/inspect/crop-header-scrolled-d.png`); over the black footer the bar becomes a dirty grey (`verify/inspect/home-bottom-p375.png`). Headless Chromium also blurred a control page only partly, so check on a real iPhone and Chrome before changing the recipe. If text is still readable behind the bar on a device: raise `--bar-fill` to `rgb(251 248 242 / .86)` and move the blur from `::before` to the header itself.
14. **Footer on phones.** An 80 px cream band sits below the black footer (the body's `padding-bottom: 5rem` for the bar) and shows under the glass bar at the end of every page (`verify/inspect/home-bottom-p375.png`, `p404-p375-fold.png`); the footer is one 1,700 px column of links; the Contact strip repeats the Contact column; the grey gradient pills on black look dated. Fix: move the bar room into the footer (`@media (max-width:767px){ body{padding-bottom:0} .site-footer{padding-bottom:calc(2rem + 5rem + env(safe-area-inset-bottom))} }`), two columns for the link lists under 640 px (`.footer-grid{grid-template-columns:1fr 1fr}` with the brand block spanning), drop the duplicated email and phone from the strip (keep one WhatsApp and one Enquire), and make strip buttons flat `rgb(255 255 255 / .1)` with a 1 px white .2 border, no sheen.
15. **Hero: three stacked buttons and a triple "since 2015".** Home at 1440: "WhatsApp us" wraps alone onto a second row; at 375 it is half under the bottom bar and duplicates it. "A London English school since 2015" appears as the eyebrow, in the lead and in the proof strip within one screen. Fix: two buttons in heroes (Enquire primary, "Try a group class free" secondary), WhatsApp as a text link under them on desktop and not at all on phones (the bar has it); drop "Taught by a London English school since 2015." from the lead.
16. **Home goal grid leaves an orphan** (7 cards in 3 columns, `verify/inspect/crop-home-d-goals.png`) and each says "Read more". Add an eighth card ("Not sure where to start? Take the placement test") or use 4 columns at 1024+, and make the link text specific ("See OET lessons").
17. **Testimonials and tutors read as unfinished** (`verify/inspect/crop-home-d-reviews.png`): fragment quotes ("for her understanding, patience, assistance") in big half empty cards, four initials floating far right in an empty band. Fix: one row of compact quote cards with the Google "Rated 5 stars" badge as the first card; tutors as a row of small person cards (initials, name, one qualification line) from `tutors`.
18. **Alignment changes three times down a page.** Heroes are full width, the How it works steps, FAQ and inline forms are narrow centred columns, course bodies are left aligned with a sidebar. On course pages the line "Send a short enquiry..." floats outside the form card and the card heading touches the first label (`verify/inspect/crop-oet-d-form.png`). Fix: one left edge (`.wrap`) for every section; `.narrow` blocks left aligned, not centred; move the intro inside `.form-card`; `.form-card > h2 { margin-bottom: .75rem }`.
19. **Placement test.** The sticky progress bar floats over answer options with no backing and its label scrolls away (`verify/inspect/placement-mid-p375.png`); the result repeats itself ("Your estimated level" over a badge "Your estimated level is A2" that wraps to two lines at 375, `placement-result-p375.png`). Fix: wrap bar and label in a small glass strip (`position:sticky; padding:.4rem .75rem; background:var(--surface-strong); border-radius:var(--r-pill)`); heading "Your result", badge "A2" only.
20. **Pricing page has no Enquire next to the prices.** The table has no action per row and the hero none; the first Enquire on the page is the closing band (desktop). Add "Ask about this" in each row (the `EnquireLink` with the product's format) and one Enquire in the hero. The "Bring a friend" card is stretched to the height of its neighbour with empty space: `align-items: start` on that grid.
21. **Bulgarian home scrolls sideways at 320 px** (`scrollWidth` 349; the eyebrow and the word "преподаватели" at 40 px; `verify/inspect/bg-home-320.png`). Fix: `.hero-grid > * { min-width: 0 }`, `h1 { overflow-wrap: anywhere; hyphens: auto }` (pages already set `lang`), `.eyebrow { white-space: normal }`, and `h1` minimum `2.1rem` under 360 px.

---

## 3. Nice to have

1. Pop-in title follows the goal ("Ask about B1 test lessons") instead of "Tell us what you need".
2. Record a last touch too (`last_channel`, `last_referrer`): a visitor who first came direct and returns from ChatGPT is currently reported as Direct for 30 days.
3. `form.js` polls `refresh()` every 700 ms forever; poll only while the dialog is open or a form field has focus.
4. The CTA band's amber radial in the top right reads as a brown stain on navy; use `rgb(255 182 6 / .18)` or drop it.
5. Hero illustration at 768 is half the screen under the buttons (`home-t768-fold.png`); cap it at `max-width: 22rem` below 900 px.
6. Pricing headings jump h1 to h3; make the product headings h2 or add a section h2.
7. Fonts: 11 files and 240 to 255 KB on every English page, because the language names in the dropdown and phone panel pull in the Cyrillic and Latin Extended subsets, plus Roboto Slab 600. Render the native names in the system font (`.lang-menu span, .panel-lang a { font-family: system-ui, sans-serif }`) and drop `latin-600` if no heading uses it: about 130 KB less per first visit.
8. The phone bottom bar's glass shows half covered buttons behind it ("WhatsApp us" in the home hero): fine once item 15 is done.
9. Reading time wraps "5 / min read" at 375; `white-space: nowrap` on the meta parts.
10. The article body sits on the mesh, not on the .92 reading surface DESIGN.md describes; legibility is fine (#444 on the warmest area about 8:1), so either update DESIGN.md or add `.bl-article { background: var(--surface-reading) }` on wide screens.

---

## 4. What was checked and passed

**Language dropdown** (375 and 1440, `verify/inspect/lang-open-p375.png`, `lang-kbd-d1440.png`, `menu-open-p375.png`): opens by click and by Enter; ArrowDown, Home and End move focus; Escape closes and returns focus to the button; outside click and tabbing out close it; `aria-expanded` follows; flags are SVG files (all four load, 30 px), the current language is ticked and `aria-current`; every link goes to the same page in that locale (`/courses/oet/` to `/bg/courses/oet/` and so on, `<html lang>` changes); on blog pages the other locales go to their home pages by design; the menu is not clipped by the bar at either width; the phone panel lists the four languages as 44 px pills with the current one in amber.

**Pop-in form** (`verify/inspect/modal-*.png`): opened from header (desktop bar, phone panel), home hero, OET and B1 course heroes, pricing "Ask about this", phone bottom bar and an article CTA. Prefill: OET hero and bar give goal `oet` and format one-to-one; B1 gives `selt-b1`; the B1 article gives goal `selt-b1`, level "B1", purpose enquiry; the placement result gives purpose placement, level "I took your placement test: A2" and shows the placement note. Fit: at 375x667 the sheet is the full screen and every control is visible (body overflows by 3 px); at 390x844, 768x1024 and 1440x900 nothing scrolls; at 1280x720 see S5. Inputs all compute to 16 px; `autocomplete` email, name, tel; `inputmode` email and tel; textarea `autocomplete=off`. Inline errors on blur with `aria-invalid` and `aria-describedby`; phone checked only when filled; submit disabled until email, name, goal and tick are valid, enabled after. Escape, the X and the dimmed area close it; focus goes back to the opener; Tab never reaches the page behind (native modal; after the last control focus leaves to the browser, which is normal); page scroll locked (wheel moved nothing); inline copy on `/contact/` and `/free-trial/` has the same field names. Submission is a native `POST` to `/thank-you/` (and `/bg/thank-you/` etc.) with no `preventDefault` on a valid form and no fetch; the captured body holds every field, including `subject=New enquiry (Nursing English test OET or IELTS) via ...`.

**Static HTML**: every page in every locale has `<form name="enquiry" method="POST" action="/<locale>/thank-you/" data-netlify="true" netlify-honeypot="bot-field">`, hidden `form-name=enquiry`, the `bot-field` honeypot, and no inline script or style attribute (CSP `style-src 'self'` holds; JSON-LD is the only inline script type).

**Attribution**: visit `/courses/oet/?utm_campaign=autumn` with referrer `https://chatgpt.com/`, go to pricing, open the pop-in: `source_channel` ChatGPT, `source_referrer` https://chatgpt.com/, `landing_page` /courses/oet/, `enquiry_page` /pricing/, `utm_campaign` autumn, `device` phone, `browser_language` bg-BG, `visit_started` set, subject "New enquiry (no goal chosen) via ChatGPT: ucraya.uk" (becomes the goal once chosen). Reload keeps ChatGPT; a later visit from Google keeps the first touch (ChatGPT). Google referrer alone gives "Google search"; placement level A1 stored and sent.

**Search**: suggestions load `suggest.json` on first focus and appear about 0.1 s after typing; arrow keys set `aria-activedescendant`; Escape and outside click close; Enter with nothing highlighted runs the full search and writes `?q=`; filter chips write `&pillar=`; Back restores the previous query and filter; `?q=b1%20test` on load runs the search (6 results incl. the B1 course page); no results state offers the goal guides; Pagefind loads `wasm.en.pagefind` with no CSP error. Article: contents list, reading time, WhatsApp share and Copy link ("Link copied.") work; pillar pages carry RSS links; head carries `/rss.xml`.

**Accessibility (manual)**: one banner, main, footer and labelled nav per page; no heading skips except pricing (N6); every input labelled; no duplicate ids; reduced motion stops the three mesh blobs (`animation-name: none`) and transitions; the bar buttons are 44 px and more; skip link present. Contrast measured on screenshots: crumbs on the amber blob 5.1:1, price small text 5.7:1, quiz label 4.9:1, footer small 6.9:1, CTA band text 6.6:1; failures are the placeholder (S10) and colour-only links (M6).

**Performance**: requests on home 19 (1 HTML 27 KB, 1 CSS 44.5 KB, 4 JS 17.8 KB, 11 fonts 255 KB, logo and flag SVG); placement adds 3 KB JS; blog pages add 12.7 KB CSS and 22 to 26 KB JS (search.js, blog.js); fonts preload two files, the rest arrive in the same wave. CLS 0 to 0.024 at 375 (Bulgarian home highest); screenshots at load and after 2 s differ only by the mesh drift.

**Copy on the new elements**: no em or en dash in source or output (only inside Pagefind's own library), no banned word, no exclamation mark except the published quote "I recommend it!", British spelling, prices and the group only free class match FACTS.md, "We do not run the test" and "we teach and prepare, we do not run tests" are present on the B1 and OET pages.

## 5. Screenshots

All under `verify/inspect/` (git ignored): `<page>-<p375|p390|t768|d1440>-fold0.png` (at load), `-fold.png` (after 2 s), `-full.png` (375 and 1440); `lang-*`, `menu-*`, `modal-*`, `placement-*`, `search-*`, `article-*`, `crop-*` and `sheet-*` (contact sheets of all pages). The `blur*` files are the backdrop filter probes behind S13.

---

## 6. Fix pass (same day, 21 October 2026)

Done by Sonnet 5.5 on the working tree (nothing committed or pushed). Checked with `npm run build`, `npm run check`, `npm run check:articles`, `npm run test:articles`, `node scripts/form-fit.mjs`, `node scripts/shots.mjs` and the new `npm run check:ui` (`scripts/ui-checks.mjs`, 72 checks at 375 touch, 768, 900, 1440 and 320 px, all green). Every must fix and should fix is listed below with Fixed, Partly or Skipped.

### Must fix
- **M1 Fixed.** `search.js` stores each form's close on the form (`form._blClose`) and a press outside a box closes only that box. Tested by tapping and clicking a suggestion on an article at 375 (touch) and 1440.
- **M2 Fixed.** Suggestions score by the number of typed words matched (stop words ignored) and rank full matches first; `suggest.json` gained a `pages` group (the eight course pages, prices, placement test, free class, how it works) shown as "Lessons and prices"; the empty text is "No close match. Press Enter to search all guides and lessons." "b1 test" and "child" both offer a lesson page.
- **M3 Fixed.** The menu button is `nowrap`, icon only under 480 px (label kept for screen readers), becomes a cross when open and stays 44 px; the bottom bar is hidden while the menu is open, so the panel's Enquire is fully visible.
- **M4 Fixed.** On phones the article CTA bar is not shown (`display: none` under 768 px) and the site bar's Enquire carries the article's goal, level and purpose from the first paint (`Base.astro` `enquire` prop; the pop-in opens with the goal chosen). The slim article bar stays from 768 px.
- **M5 Fixed.** `.nav-cta-bar` shows from 768 px (checked at 768 and 900).
- **M6 Fixed.** `.bl-prose` lists have disc and decimal markers with green marker colour; body links in articles, money pages, FAQ answers and notices are underlined (buttons, pills, cards and suggestion options are not).

### Should fix
1. **Fixed.** utm_source values chatgpt.com, chat.openai.com, openai and chatgpt map to ChatGPT; perplexity, gemini, copilot and claude (and their hosts) map to their names; other utm values are kept as written. Tested for seven values.
2. **Partly.** There is now an optional "When is your test or deadline?" question (Within a month, 1 to 3 months, Later, No date) that fills the hidden `deadline`, but as a drop-down, not chips: chips pushed Bulgarian and Polish past the 375 x 667 fit.
3. **Fixed.** The send button is never disabled; pressing it shows every problem and focuses the first field. No "still needed" line was required.
4. **Fixed.** The label is "Phone" with "Optional" (four languages) and `align-items: end`.
5. **Fixed.** Short-height rule for 640 px and wider; the 375 x 667 pop-in fits in all four languages (`form-fit.mjs` green).
6. **Skipped.** Chips stay 36 px (34 px on small phones) because the deadline row had to fit; they pass WCAG 2.5.8.
7. **Fixed.** Each opening starts clean; a goal, format or level from an earlier opening is cleared unless the visitor chose it themselves. Tested B1 article, then header.
8. **Fixed.** Zero count filter chips are not offered unless pressed.
9. **Fixed.** The suggestion list is a `role=listbox` with `role=group` sections (labelled by their heading); the options are the links themselves.
10. **Fixed.** Placeholder colour is `--muted` at full opacity.
11. **Fixed.** "Start here" shows published guides only.
12. **Fixed.** Backdrop blur removed from the shared card rule and kept on `.glass` (not cards), hero panel, modal, menus, cookie banner, secondary buttons, the bars and the back to top button.
13. **Partly.** `--bar-fill` raised to .86 (it no longer turns dirty grey over the black footer). The blur stays on `::before`; not checked on a real iPhone or Android, as the inspection advised.
14. **Fixed.** The room for the bottom bar lives inside the footer (no cream band); two columns of links under 640 px; the strip is "Contact" plus Enquire and WhatsApp (the repeated email and phone are gone, and with them the grey pills); the footer gained a Guides column (hubs, All guides, Questions we answer); the logo sits on a small cream tile.
15. **Fixed.** Heroes have two buttons; WhatsApp is a text link on desktop and absent on phones; the "since 2015" sentence is gone from the lead in all four languages. Course heroes: Enquire plus the free class (group courses) or the placement test, WhatsApp as the text link.
16. **Fixed.** Eight cards in four columns (the eighth is "Not sure where to start?" with the placement test) and specific link text ("See OET and IELTS for nurses").
17. **Fixed.** One row of compact quote cards with the Google rating card first (a swipeable strip with dots on phones, a grid from 900 px); tutors are small person cards with initials, name and one qualification line. Home page only: the Reviews page keeps its full grid.
18. **Fixed.** `.wrap.narrow` keeps the page's left edge; the course page intro is inside the form card; heading margin added.
19. **Fixed.** Progress bar and label sit in one reading-surface strip; the result is "Your result" and "Level A2" (four languages).
20. **Fixed.** "Ask about this" in every desktop price row (with the product's format), an Enquire and a "What will it cost me?" button in the hero, `items-start` on the two grids; product headings are h2 on the mobile cards.
21. **Fixed.** Bulgarian home verified at 320 px (no sideways scroll); h1 `overflow-wrap`, 30 px under 360 px, smaller hero padding, `min-width: 0` on grid children, eyebrow wraps.

### Nice to have
1. **Skipped.** A goal-specific pop-in title needs a string per goal in four languages; more than five minutes.
2. **Fixed.** `last_channel` and `last_referrer` (this browser session) added next to the first touch.
3. **Fixed.** The 700 ms refresh now starts when a form is used and stops when it is not.
4. **Fixed.** CTA band amber radial lowered to .18.
5. **Fixed.** Hero illustration capped at 22 rem under 900 px.
6. **Fixed.** Pricing cards use h2 (styled like h3).
7. **Fixed, and more.** Language names use the system font, Roboto Slab 600 is gone, and the real cause of the 255 KB of fonts was found: the fontsource subset CSS had no `unicode-range`, so all nine files loaded on every page. The fonts are now declared in `global.css` with `unicode-range`: an English page loads three woff2 files (107 KB, was 240 KB).
8. **Fixed** by item 15.
9. **Fixed.** Byline parts do not break inside themselves.
10. **Fixed in the docs.** `docs/DESIGN.md` says the article body sits on the mesh.

### Also changed in this pass
- The real Raya London logo (header, footer, favicons, Open Graph image, structured data), mesh colours, glass and interaction polish, the pricing estimator, speakable and the Quick answer, `llms.txt`, `llms-full.txt`, robots, sitemap and internal links: see `docs/DESIGN.md` and `docs/BLOG.md`.
- A bug found on the way: `blog.css` `:where(.btn-secondary)` and `:where(.input)` fallbacks are unlayered and so beat the layered site styles; they turned the secondary buttons on pillar pages black. Removed.
- A bug found on the way: the top hairline gradient forced a 1 px size onto the sheen layer of cards with two tint gradients (hero panels). The hairline is now the inset shadow.
