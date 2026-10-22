# Article rules

These rules apply to every article on ucraya.uk. The checker (`npm run check:articles`) enforces most of them. The rest are for you to judge. If a rule here clashes with `content/FACTS.md`, FACTS.md wins.

## 1. Where claims come from

- `content/FACTS.md` is the only source of any claim about Ucraya: prices, names, qualifications, policies, contact details, what the lessons are.
- Rules about tests, registration or immigration come only from the official source for that rule, read on the day you write (gov.uk, nmc.org.uk, ielts.org, oet.com, trinitycollege.com). Record each one in `sources`.
- A `checked:` date may be written only when you fetched that exact page in this session (WebFetch or curl returned its text) and read the figure there. Never copy a date, a fee, a score or a deadline from the research folder, from memory or from another article. If the page did not load, leave `checked` out of that source, name the page in the text, and tell the reader to check it on the day they book. Never write "checked on" in the text for a page you did not fetch.
- If the official source contradicts the topical map row, the article follows the source and says the rule was checked on that date.
- The research folder is background, not a source of claims.
- If the row has notes, follow them; a cross link sentence goes into the body as a natural sentence with a relative link (for example /translation/certified/), not as a bare URL. The map's `notes` column is the last one; it is empty for most rows.

## 2. The file

- Path: `src/content/blog/<slug>.md`. The slug is the title in lower case with letters and digits only, words joined by hyphens, apostrophes dropped, "&" written as "and". If that is longer than 60 characters, cut it after the last whole word that fits in 60. The checker computes the same slug and fails on a difference.
- Front matter has exactly these fields and no others: `title` (59 characters at most, because the site cuts page titles at 60), `description` (160 at most), `pubDate` (YYYY-MM-DD, quoted), `updatedDate` (optional), `lang` ("en"), `day` (a number), `pillar`, `cluster`, `segment`, `funnelStage` (awareness, consideration or decision), `moneyPage` (a site path with a trailing slash, for example `/courses/oet/`), `cta`, `aiQuestion`, `primaryKeyword`, `secondaryKeywords` (a list), `faq` (a list of exactly three `q` and `a` pairs), `sources` (optional list of `title`, `url` and, only when the page was fetched in this session, `checked`), `draft` (false), `author` ("The Ucraya team").
- Copy `pillar`, `cluster`, `segment`, `funnelStage`, `cta`, `aiQuestion` and `primaryKeyword` from the map row exactly. `moneyPage` is the row's money page with a trailing slash.
- The three FAQ pairs start from the row's `faq` field. Rewrite each answer in full sentences, correct it against the sources, and remove any planning language such as "unconfirmed" or "confirm the offer".
- `pubDate` is the Monday the weekly batch goes live: `batch_date` from `npm run article:next`, the same for every article in the batch. It is never a date in the future (the checker fails on one) and not a different day of the week.

## 3. The body

- The site draws the FAQ, the call to action box and the related guides list itself. The body has no FAQ section and no call to action block.
- The first paragraph answers `aiQuestion` directly in 60 words or fewer, in plain English. No heading comes before it.
- Then the H2 sections follow the row's outline headings, adapted so they read naturally. Never write a heading such as "Related guides (day 1)" or mention a day number.
- The last H2 is exactly "Related guides". It holds two to four links, as a bullet list. Link other published articles with relative links in the form `/blog/<slug>/`. Link only articles with a lower day number than this one. When fewer than two earlier articles exist, link what exists and add the pillar's course page, or `/pricing/`.
- Somewhere in the body above Related guides, link the money page once, naturally, inside a sentence that helps the reader.
- Five to seven H2 sections in all, counting Related guides. No H1.
- The body is 900 to 1,400 words. Aim for about 1,050 to 1,200 so a different way of counting does not push it out of range.
- Tables are fine for comparisons and checklists. Keep each cell short.

## 4. Words and style

- British English. Plain, calm and friendly. Short sentences. Speak to "you".
- No em dashes or en dashes anywhere, including front matter. Use a comma, a colon or a new sentence. Write number ranges with "to".
- No exclamation marks.
- Never use these words or phrases: accredited, accreditation, approved centre, approved test centre, official partner, chartered, guaranteed, guarantee, native speaker, "15+ years", "12 years", pass rate, Google Meet, Discord, specialist tutor, unconfirmed, placeholder, lorem, TODO.
- No square brackets except in links.
- Explain every acronym at first use in the body: OET (Occupational English Test), IELTS (International English Language Testing System), SELT (Secure English Language Test), NMC (Nursing and Midwifery Council), GESE (Graded Examinations in Spoken English), CEFR (Common European Framework of Reference), UKVI (UK Visas and Immigration), TEFL, CELTA, CQC, GCSE. Put the full name beside the first use, in the first paragraph if it appears there.

## 5. Money

- A pound amount is allowed only if it is one of the prices in FACTS section 3 (15, 20, 298, 320, plus the group course instalments 50, 124 and 248), or the published fee of a third party, but only if you fetched the page that shows it in this session. A third party fee or number goes on a line that also holds the link to that page, the host of the link must be one of gov.uk, nmc.org.uk, oet.com, ielts.org, trinitycollege.com, britishcouncil.org, idp.com, cambridgeenglish.org, languagecert.org or pearsonpte.com, the same URL must be in `sources` with a `checked` date, and the text says when it was checked. If you did not fetch the page, write no figure and tell the reader to check the page on the day they book.
- Never add up or multiply prices into new amounts. Say "per lesson" and let the reader do the sum.
- Describe the lessons exactly as FACTS does: one-to-one 55 minute lessons on a live video call at £15, or £20 when taught entirely in English; exam preparation of 24 hours for £320; the online group course at £298 per level. We do not run tests. We do not promise a score, a visa or a job.
- Never write that Ucraya runs, offers, administers or hosts a test, that it is an approved provider, or that it is authorised or an official partner. Never put a percentage next to pass, success, rate, score or results. Never write assured, guaranteed, guarantee or promise about an outcome.
- Anything marked TO CONFIRM in FACTS is said only with the wording FACTS gives.

## 6. People and proof

- Never invent a quote, a testimonial, a statistic, a pass rate, a review or a student story presented as real.
- A worked example is allowed when it is labelled "a made up example" (or "made up") where it first appears.
- Name a tutor only from FACTS section 7, using the qualification wording there. A statement by a tutor is allowed only if FACTS records it as their own words from the school site, and the sentence says so.
- Testimonials come only from FACTS section 6, word for word.
- A quotation of more than six words attributed to a person or student in the same or the previous sentence fails the checker, unless the person is a tutor from FACTS section 7 and the sentence says it is from the school site.
- A past tense result about a student, learner or client (passed, achieved, got, scored) is a story. It is allowed only in a paragraph that says "made up example" or "imagined".

## 7. Legal, immigration and medical lines

- Never give immigration, legal or medical advice. Say what the official page says, name the page, and say the reader must check the rule on the day.
- Keep lessons and tests apart. Lessons prepare you; the test is booked separately with the test provider. Nursing registration is not the same as care work.
- Do not state a rule as current unless you checked it today and recorded it in `sources`.

## 8. The original element

Each row has an `original_element`. Deliver it in the article and say what it is: a checklist, a comparison table, a worked example or a decision sheet. A fictional person or number gets the label "a made up example". Replace any request in the row to "collect approved prices" with the prices in FACTS.

## 9. Example opening paragraphs

Question: "How do I choose online lessons for my B1 SELT?"

Good (51 words, answers first, acronym explained):

> First check the rule for your own application, then book the approved test, then choose lessons that give you live speaking and listening practice with a person who corrects you. A Secure English Language Test (SELT) is an approved immigration test, so lessons prepare you for it but never replace it.

Bad:

> Learning English is a journey, and in today's busy world many people are looking for the best way to prepare. At Ucraya we are the number one choice, with a pass guaranteed and thousands of happy students, so read on to find out why.

What is wrong with the bad one: it does not answer the question, it opens with filler, it promises a result, it makes a ranking claim and a student count, and none of those can be supported. (Exclamation marks and dashes would also fail the checker.)
