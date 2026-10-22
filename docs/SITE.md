# ucraya.uk: how the site is built

Astro 5 (static), Tailwind v4, TypeScript, self hosted fonts (Roboto Slab, PT Sans). Node 22. No database and no server code: the enquiry form is a Netlify Form.

## Commands
- `npm run dev` local site; `npm run build` builds to `dist/`; `npm run check` runs the site checker over `dist/`; `npm run shots` screenshots key pages (375 and 1280 px) into `verify/shots/` (git ignored); `npm run brand` regenerates the optimised logo PNGs, the favicon set and the default Open Graph image from the ORIGINAL Raya London vectors in `public/raya/original/` (`scripts/gen-brand.mjs`); `npm run check:ui` runs the browser checks (`scripts/ui-checks.mjs`).
- Article scripts (`check:articles`, `article:next`, `article:publish`) belong to the content engine, not to the site.

## Structure
- `src/i18n/en.json` holds ALL copy. `bg.json`, `ro.json`, `pl.json` are currently exact copies of it.
- `src/lib/site.ts` holds contact details and URLs (from `content/FACTS.md`); `src/lib/routes.ts` is the page table.
- `src/views/*.astro` are the pages; `src/pages/[...path].astro` builds every locale of every route from the table; `src/pages/blog/*` and `rss.xml.ts` are the blog.
- `src/components/` shared parts; `src/layouts/Base.astro` does head, SEO tags, hreflang, JSON-LD, header, footer, sticky mobile bar and cookie banner.
- `public/js/` has the only client scripts: `translation.js` (the translation quote form), `nav.js` (menu and the phone header that hides on scroll), `ui.js` (back to top, the floating dock, smooth FAQ, quote dots), `form.js` (form prefill and validation), `attribution.js` (where an enquiry came from), `placement.js` (quiz), `estimator.js` (pricing page), `hero.js` (home page hero lesson), `consent.js` (cookie banner and Google Analytics), plus the blog scripts. `ui.js` also drives the floating dock. No inline scripts, so the Content Security Policy in `netlify.toml` stays strict.
- Styles: `src/styles/global.css` (Tailwind theme tokens plus a few component classes). Amber is only used as a background or button with dark text.

## Languages (how a translator edits the JSON)
- Locales: `en` (no prefix), `bg` (/bg/), `ro` (/ro/), `pl` (/pl/). Every money page exists in all four with the same path. The blog is English only.
- A translator edits `bg.json`, `ro.json` or `pl.json` and keeps the same keys and the same array lengths. Anything missing or empty falls back to English (`src/i18n/index.ts`, a deep merge), so a half translated file never breaks the build. Use `useMessages(locale)` for objects or `useTranslations(locale)('home.h1')` for single strings; `{name}` placeholders (for example `{year}`, `{privacyLink}`, `{n}`) must be kept.
- Do NOT translate: the placement test questions (`placement.questions`, they test English and are always shown in English), the option labels that the form sends to the office (the English text is always sent; the labels shown to the visitor are translated), or the `slug` fields.
- Privacy, Terms and London are English only; every locale links to the English versions.
- hreflang (every locale plus x-default) is generated from the route table. Blog pages have `en` and `x-default` only; on a blog page the BG, RO and PL links in the header go to that locale's home page.

## Add a page
1. Add the copy under a new key in `en.json` (and `meta.<key>` with title and description) and copy it to the other three files.
2. Make `src/views/<Name>.astro` (copy a similar one).
3. Add a row to `ROUTES` in `src/lib/routes.ts` and map its `view` in `src/pages/[...path].astro`.
4. Add a link in `SiteHeader.astro` or `SiteFooter.astro` if needed. Run `npm run build && npm run check`.

## Translation quote form (second Netlify form)
Three pages (`/translation/`, `/translation/certified/`, `/translation/specialist/`, each in four locales) carry the static Netlify form `translation-quote` (`TranslationQuoteForm.astro`, script `public/js/translation.js`, thank you page `/translation/thank-you/`, noindex). Visitors upload up to three documents (8 MB in total) and their details; the request is a quote request for the school's translation partner. Routes and copy are in `routes.ts`, the four JSON files (`translation`, `nav.translation`, `meta.translation*`, `home.translation`, `about.translation`, `pricing.translation`) and `content/FACTS.md` section 11. JSON-LD: `Service` (provider Training Centre Raya London and the partner) plus `FAQPage`. `check-site.mjs` checks both forms by name and fields (`FORM_RULES`); the article checker allows the three paths as money pages.

**Owner action in Netlify (not in the code):** after the next deploy open Site configuration, Forms, Form notifications, find the form `translation-quote` (it appears after the first deploy that contains it; Forms must be enabled), Add notification, Email, and use the address `lilito.dimitrova@gmail.com`. That is where Lili receives the requests and the uploaded files, quotes and sends the bank details. The address is never printed on the site (spam). Send one test request (use your own email and a small PDF) and check that the files arrive. Netlify keeps uploads in the Forms list, so also decide how long they stay there and delete them after each job: the privacy page says "deleted after the job".

## Enquiry form
`EnquiryForm.astro` renders a static Netlify form named `enquiry` (`data-netlify="true"`, honeypot `bot-field`, hidden `form-name`, hidden `subject`, extensionless action to the locale's `/thank-you/`). The email field is the first text input so Netlify uses it as Reply-To. The same form is also in a pop-in (`EnquiryModal.astro`, on every page) opened by every Enquire button. Visible fields: email, name, phone, goal chips, format chips, message, consent tick. Hidden: `purpose`, `level`, `first-language`, `deadline`, `preferred-times`, `detail`, `enquiry_page`, `site_language` and the source fields filled by `public/js/attribution.js` (`source_channel`, `source_referrer`, `landing_page`, `utm_*`, `device`, `browser_language`, `placement_level`, `visit_started`). `public/js/form.js` handles the pop-in, validation and prefill (query string or the button's data attributes). See `docs/DESIGN.md`. The thank you page is only reached after the POST.

**Owner action in Netlify (not in the code):** after the first deploy open Site configuration, Forms, Form notifications and add an email notification to `office@ucraya.co.uk` for the form `enquiry`. Also check Forms is enabled for the site and look at the first test submission (it will also show in the Netlify Forms list).

## Analytics
No analytics and no cookie banner unless the environment variable `PUBLIC_GA_ID` (for example `G-XXXXXXX`) is set in Netlify (Site configuration, Environment variables) before a build. When set, a banner appears and Google Analytics loads only after the visitor accepts. The Content Security Policy already allows Google Tag Manager and Google Analytics.

## Checker (`npm run check`)
Fails on: the enquiry or translation quote form missing a Netlify rule or field; not exactly one h1; title 60 characters or more; description 160 or more; no canonical; missing hreflang (money pages need four locales plus x-default); no JSON-LD or JSON-LD that does not parse; any em or en dash; banned wording from CLAUDE.md; a broken internal link, image or anchor; locale page sets that differ; the enquiry form missing from a locale's contact page or breaking the Netlify rules; inline scripts; missing llms.txt, robots.txt, sitemap-index.xml or rss.xml.

## Blog
Content collection `blog` (`src/content.config.ts`, schema fixed): files in `src/content/blog/<slug>.md`. `/blog/`, `/blog/<slug>/`, `/blog/pillar/<pillar-slug>/` (made only for pillars that have posts) and `/rss.xml`. Drafts are left out of production builds. Titles and descriptions longer than will fit the 59 and 158 character SEO limits are cut at a word boundary in the page title and meta description only (the article keeps its full title); keep article titles to 59 characters or fewer to avoid the cut.

## Left out or to decide
- Bulgarian, Romanian and Polish copy is still English (translate the three JSON files).
- No photos. The logo is the ORIGINAL Raya London artwork in `public/raya/original/` (header, footer, favicons, Open Graph image, structured data); see `docs/DESIGN.md`, Logo. The earlier pack in `public/raya/` and the old self drawn wordmark `public/brand/logo.svg` are unused.
- Privacy and Terms are plain English drafts built from FACTS.md. The owner should read them (retention wording, cookie wording).
- No aggregate rating markup (the live Google figure is still to confirm in FACTS.md).
- No pagination on the blog index (fine for a few dozen posts; add it before about 60).
- No Netlify redirect for the old `ucraya.co.uk` pages; none are needed.
- Domain: `netlify.toml` redirects www to the apex. Make sure both names are added to the Netlify site and the apex is the primary domain.
