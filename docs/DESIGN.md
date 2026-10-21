# ucraya.uk design system: liquid glass (light theme)

Source of truth: `src/styles/global.css`. One token block in `:root`, then utility classes, then components. Everything below the tokens sits in cascade layers (`base`, `components`), so Tailwind utilities in templates (`mt-3`, `w-full`, `lg:sticky`) still win over component rules.

## Tokens (`:root`)
- Brand: amber `#ffb606`, green `#4caf50`, orange `#f24c0a`, navy `#1f2a44`, ink `#1a1a1a`, body `#444444`, muted `#5f5f5f` (darker than the brand sheet's `#6b6b6b` so it keeps AA over the amber blob).
- Surfaces: `--surface` white .62, `--surface-strong` .82, `--surface-reading` .92, `--bar-fill` cream .72.
- Shape: `--r-md` 16px, `--r-lg` 24px. Blur `--blur` 18px, `--blur-lg` 24px, saturation 140%. Rim `--rim` white .6, `--edge` hairline, `--sheen` and `--hairline` highlight gradients, `--shadow-1`, `--shadow-2`, `--glow-amber`, `--glow-green`. Motion 160 and 240 ms.
- Type: Roboto Slab headings, PT Sans body, no new fonts. h1 40 to 56 px, h2 28 to 36, body 17/18 px at 1.6. Section padding 72 to 120 px.

## Classes (keep these names)
`.glass` (.62 fill, blur, rim, top highlight, 24px, soft shadow), `.glass-strong` (.82, text heavy cards), `.glass-bar` (sticky header and phone bar), `.btn` with `.btn-primary` (amber), `.btn-secondary` (glass), `.btn-whatsapp` (green; old names `.btn-outline`, `.btn-green`, `.btn-light` still work), `.card` (glass-strong plus padding), `.pill`, `.input` (16px font, 44px tall). Also: `.card-accent` with `.accent-amber|green|orange|navy`, `.glow-amber`, `.glow-green`, `.prose-lite` (reading surface .92), `.hero-panel`, `.cta-panel`.

## Where glass is, and is not
- Glass: header bar, phone bottom bar, cards, hero panel, pricing cards, testimonials, FAQ items, modal, dropdowns, footer top strip, quiz question cards and result.
- Not glass: long reading text (`.prose-lite`, legal, article bodies, FAQ answers) sits on a near opaque .92 surface. Amber is never used as text colour.
- One blur rule: the only broad (full width) blur on a page is the bar. The blur sits on `.glass-bar::before`, so menus inside the bar can have their own. Cards, buttons and menus are small elements. Transforms only in animations; `will-change` only on the three background blobs.
- Fallbacks: `@supports not (backdrop-filter)`, `prefers-reduced-transparency: reduce` and `prefers-contrast: more` switch the surface tokens to near opaque and drop the blur (contrast mode also uses ink borders). `prefers-reduced-motion` stops the drift and all transitions.
- Background: `.mesh` (three CSS radial blobs, fixed, slow drift) in `Base.astro`. No images.
- Contrast checked on screenshots: ink on the darkest mesh area 12:1, body 7:1, muted about 4.6:1 or better.

## Language dropdown
`details.lang` in the header (flag SVG plus code), menu of four flags and native names with the current one ticked; each links to the same page in that locale. Flags are drawn SVGs in `public/brand/flags/`. `public/js/lang.js` adds Escape, arrow keys and outside click; without JavaScript details/summary still works. On phones the menu panel also lists the four languages.

## Pop-in enquiry contract
- Every Enquire button is `<EnquireLink locale goal format level purpose>`. It renders `<a data-enquire data-goal data-format data-level data-purpose href="/contact/?...#enquiry">`: JavaScript opens the pop-in prefilled, without JavaScript the link goes to the contact page (one query choice only, because an `&` in a static href fails the site checker). Raw `<a data-enquire data-goal="oet" href="...">` works too (blog CTA boxes).
- On `/contact/` and `/free-trial/` the inline form is the page, so Enquire scrolls to `#enquiry` instead (`inline` prop, set by `Base.astro`).
- `EnquiryModal.astro` is in `Base.astro`, so every page has the form in static HTML (Netlify detection) inside a native `<dialog id="enquiry-modal">`. The inline copy and the pop-in are the same Netlify form `enquiry`, same field names (`form-fit.mjs` checks this).
- Fields: email (first, for Reply-To), name, phone (optional), goal chips (single choice), format chips, message (2 lines), consent tick, hidden fields (level, purpose, first-language, deadline, preferred-times, detail, enquiry_page, site_language, source fields). Honeypot `bot-field`.
- Fit: every control is on screen at 375 x 667 with no scrolling in all four locales, and at 1280 x 720. Compact rows on phones, submit pinned to the foot of the sheet. Bottom sheet under 640 px, centred card above.
- Behaviour: scroll lock (`html.modal-open`), native focus trap and inert background, Escape and the X close, click on the dimmed area closes, focus returns to the opener. On a fine pointer the email field is focused; on a touch screen the sheet takes focus so the keyboard does not cover the form.
- Mobile: inputs are 16px or more (global rule), so iPhone never zooms; the viewport meta still allows zoom. `autocomplete` name, email, tel; `inputmode`, `spellcheck=false`, `enterkeyhint`.
- Validation: on blur, friendly messages from `form.errors.*`, submit disabled until email, name, goal and consent are valid (phone checked only if filled). Loading state on submit. The POST is a normal form post to the locale's thank-you page; success is never shown without it.

## Where an enquiry came from (`public/js/attribution.js`)
Hidden fields filled from the first touch of a visit, kept in localStorage key `ucraya-attribution` for 30 days: `source_channel` (ChatGPT, Perplexity, Gemini, Copilot, Claude, Google search, Bing search, Facebook, Instagram, LinkedIn, TikTok, YouTube, Email or WhatsApp, Direct or unknown; a `utm_source` value is used verbatim), `source_referrer` (200 chars), `landing_page`, `utm_source|medium|campaign|content`, `visit_started`. Set on every open or submit: `enquiry_page`, `device` (phone, tablet, desktop), `browser_language`, `placement_level` (stored by the placement test). The `subject` becomes "New enquiry (<goal>) via <channel>: ucraya.uk". Disclosed in the privacy page. First party, no advertising cookies. If the owner's adviser treats the localStorage record as needing consent under PECR, switch the key off in one place (`firstTouch`).

## Using the classes on a new page
Wrap page content in `.section` and `.wrap`; start with `<PageHero h1 lead />` (a `.glass.hero-panel`); use `.card`/`.glass-strong` for text blocks, `.prose-lite` for long reading, `.grid-cards` for card grids, `.btn-primary` for the one main action per block, `.btn-secondary` for the rest, `.btn-whatsapp` for WhatsApp. Put Enquire buttons through `EnquireLink`. Never use inline `style` attributes or inline scripts (the Content Security Policy blocks them).

## Checks
`npm run build && npm run check`, `node scripts/shots.mjs` (adds the open language menu and the open pop-in at 375 and 1280), `node scripts/form-fit.mjs` (iPhone SE and desktop, four locales: fit, 16px fonts, Escape, matching field names). CSS is about 45 KB. Lighthouse was not run in the build container.
