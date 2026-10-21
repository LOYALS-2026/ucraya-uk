# The blog: hub, search and conversion layer

English only. Content lives in `src/content/blog/<slug>.md` (rules in `content/ARTICLE-RULES.md`); the plan in `content/topical-map.csv` and `content/pillars.csv`. Everything below is built at build time; there is no server code.

## Pages
| URL | File | What it is |
|---|---|---|
| `/blog/`, `/blog/page/2/` ... | `src/pages/blog/[...page].astro` | Hub: search box, Start here (the pillar guides), latest guides (12 a page, `paginate()`), By goal. Pages 2 and up show the list only. |
| `/blog/<slug>/` | `src/pages/blog/[slug].astro` | Article: contents, sticky call to action, placement test card, related, previous and next. |
| `/blog/pillar/<slug>/`, `.../page/2/` | `src/pages/blog/pillar/[pillar]/[...page].astro` | Pillar hub (only for pillars with at least one guide): intro, pinned pillar guide, guides in day order, CollectionPage and Course JSON-LD. |
| `/blog/questions/` | `src/pages/blog/questions.astro` | Question bank: every `aiQuestion`. Published ones link and show their short answer; planned ones are plain text with the month. FAQPage JSON-LD only for published ones (newest 200). |
| `/rss.xml`, `/blog/pillar/<slug>/rss.xml` | `src/pages/rss.xml.ts`, `.../[pillar]/rss.xml.ts`, `src/lib/blog-rss.ts` | Feeds, newest 100 items, pillar as category. |
| `/search/suggest.json` | `src/pages/search/suggest.json.ts` | Small index for the suggestions (see below). |

Helpers: `src/lib/blog.ts` (posts, reading time, answer text, related, prev and next) and `src/lib/blog-map.ts` (reads the two CSVs, the public wording of each pillar in `PILLAR_COPY`). The planning notes in `pillars.csv` are never shown on the site.

## How search works
1. **Suggestions** (`public/js/search.js`). On first focus the box loads `/search/suggest.json`. From two characters it shows matching guide titles (with the pillar as a pill), matching keyword phrases (primary and secondary keywords, and the question each guide answers) and matching pillar names. Every word typed must start a word in the guide. Arrow keys move, Enter opens the highlighted line (or runs the full search when none is highlighted), Escape closes, a click outside closes.
2. **Full search** (hub only). Enter or the Search button loads Pagefind from `/pagefind/` and shows result cards (title, short answer, pillar, date, read time) with filter chips for goal (pillar) and stage. The URL carries `?q=`, `&pillar=` and `&stage=`, so a search can be shared and Back works. Compact boxes (article sidebar, pillar pages, questions page) send you to `/blog/?q=` instead.
3. **Fallback.** If Pagefind cannot load (for example the browser blocks WebAssembly) or finds nothing for a multi word phrase, the same suggest data answers, with the question as the snippet and no course pages.
4. **No JavaScript.** The form is a plain GET to `/blog/?q=`; the hub then shows "Search needs JavaScript" and the browse sections (goals, latest guides).

## How the index is built
- `package.json`: `build` is `astro build && pagefind --site dist`; `build:blog` builds to `.tmp/dist-blog` (git ignored) for working on the blog without touching the sibling build. Check it with `DIST=.tmp/dist-blog node scripts/check-site.mjs`.
- `pagefind.yml` limits the index to English guides, course pages and the pricing page (`glob`), reads only `<main>` (`root_selector`) and skips forms, nav and anything with `data-pagefind-ignore`. Do NOT put `data-pagefind-body` on any page: once one page has it, Pagefind drops every page without it.
- Each article carries a hidden carrier (`src/components/blog/PagefindMeta.astro`) with meta `answer` (first paragraph), `date`, `readtime`, `pillar`, `kind`, and filters `pillar`, `segment`, `stage`, `money` (money page), `month`, `type`.
- `suggest.json` keys: `t` title, `s` slug, `p` pillar index, `k` keywords, `q` question, `d` date, `r` minutes, `f` stage (a, c, d). About 280 bytes a guide: 139 KB raw and 7 KB gzipped at 500 guides; it is only fetched when the box is used.
- Pagefind needs the filter index loaded before a search for the chip counts to appear; `search.js` does this.

## Content Security Policy (action for netlify.toml)
Pagefind compiles a WebAssembly file. The current policy blocks that, so add `'wasm-unsafe-eval'` to `script-src` (no other change):

`script-src 'self' 'wasm-unsafe-eval' https://www.googletagmanager.com`

Until then search still works through the fallback, with less detail. All scripts are files from this site; there is no inline script.

## Add a pillar
1. Add a row to `content/pillars.csv` and rows to `content/topical-map.csv` (one with cluster `pillar guide`).
2. Add an entry to `PILLAR_COPY` in `src/lib/blog-map.ts` (key is the pillar name as a slug): `short`, `intro`, `goal` (a `data-slug` of the enquiry form goals: oet, selt-b1, ielts, interview, staff, kids, everyday, other) and optionally `level`. Without it the page still builds, with a generic sentence.
3. The pillar page, its feed, its place in By goal and the suggestions appear as soon as one guide for it is published. A pillar named only in an article is picked up too.

## Pagination
12 guides a page (`PAGE_SIZE` in `src/lib/blog.ts`). The hub uses `paginate()` but the URLs are `/blog/page/N/`; pillar pages the same under their own path. Build time with 500 guides: about 32 seconds, 669 pages.

## Enquire buttons and the pop-in form
Every Enquire link in the blog is an `<a>` that works without JavaScript and also carries the data attributes the site's modal reads:
- `data-enquire` (marks it),
- `data-goal` (form goal slug, from the pillar, else from the money page),
- `data-purpose="enquiry"`,
- `data-level` (only where the pillar implies one: `b1` for the B1 pillar).

The `href` goes to the course page form (`/courses/<slug>/#enquiry`) or to `/contact/?goal=<goal>#enquiry`. The sticky bar appears after 40% of the page, sits above the site's phone bar, and hides while the Next step box is on screen.

## Article facts
- Reading time is words divided by 200. The table of contents is the H2 list; it opens on wide screens and is closed on phones (`public/js/blog.js`).
- "Checked against the official pages linked in the article" is printed only when a source has a `checked` date; with sources but no date the line is "Links to the official pages are in the article"; with no sources there is no line.
- The placement test card is inserted before the third H2 of the rendered body (`injectBeforeThirdH2`).
