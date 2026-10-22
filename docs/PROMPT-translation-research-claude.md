# Translation services: two prompts for a Claude chat

Model: Claude Opus 5.5, extended thinking on, web search on (Research mode if shown). Effort: high.

## Prompt 1: read Lili Translations (five minutes)

Paste this first, in its own chat or at the top of the research chat:

---
Visit https://lili-translations.bg/en and every page linked from its navigation and footer (services, prices, about, contact, languages, the Bulgarian version too). Produce a fact file for a web developer. Report only what the pages say; write NOT FOUND where something is missing; quote prices, certification wording and qualification claims verbatim.
1. The translator or business: name, legal form, years operating, location, registrations and memberships (for example sworn translator with the Bulgarian Ministry of Foreign Affairs, a translators' association, ITI or CIOL in the UK), qualifications, languages.
2. Services: certified translation, sworn translation, legalisation and apostille, notarised translation, interpreting, specialist fields (medical, legal, technical, commercial), document types named.
3. Language pairs offered, with and without English.
4. Prices and units (per page, per word, per document, per hour), minimum charges, urgency fees, VAT wording.
5. Turnaround and delivery (email, courier, originals), payment methods.
6. Any wording about acceptance by authorities (UK Home Office, universities, Bulgarian authorities, embassies) quoted exactly.
7. Contact details published on the site and the social links.
8. The page list you visited with titles.
Output as plain text with those eight headings and as a downloadable Markdown file called lili-facts.md.
---

## Prompt 2: who buys translation, and the content to reach them

Attach lili-facts.md, content/FACTS.md (sections 1 to 3 and 11) and content/topical-map.csv from the site repository. Then paste:

---
You are a senior growth strategist for a UK online English school (Ucraya, https://ucraya.uk, run by Training Centre Raya London, a London school since 2015) that is adding a document translation service delivered by its partner, a registered and qualified translator (facts attached in lili-facts.md; do not invent anything about her). The site already runs a 90 guide content plan about English lessons for people with a deadline (attached topical-map.csv; eight pillars). Do real web research with sources and the date read. British English. No em dashes. Say "estimate" where you estimate.

GOAL: paying translation jobs from people in the UK (and Bulgarians abroad) who need documents translated for an application, and cross sales between the two services: a person who needs a certified translation of a birth certificate for a visa is often the same person who needs a B1 test next year, and a nurse needing an OET lesson often needs her diploma translated first.

PRODUCE:
1. Audience truth for translation. Rank the buyers with evidence: UK visa and settlement applicants (which documents the Home Office asks to be translated and its exact translation requirements, with the gov.uk page and date), university applicants (UK ENIC and admissions requirements), overseas nurses and doctors (NMC, GMC and HCPC document rules), employers and right to work checks, DVLA licence exchange, courts and family matters, Bulgarians in the UK needing documents for Bulgaria (sworn translation and legalisation, apostille), and businesses. For each: the trigger, the document types, the exact phrases people search in English and in Bulgarian (and Romanian and Polish if relevant to the attached language list), where they ask (specific forums and groups with links), what competitors charge (five UK certified translation providers with price per page or document and turnaround, with links), and the objections (will it be accepted, how fast, how do I send originals, is a scan enough).
2. Which nationalities and languages are worth targeting for translation GIVEN the language pairs in lili-facts.md (only pairs she offers). Include a specific section on Asian communities in the UK (Hong Kong Cantonese, Mandarin, Hindi, Urdu, Punjabi, Bengali, Tamil, Malayalam, Tagalog): do they buy certified translations and English lessons, for which documents and tests, where they gather, and whether she can serve them (if a pair is not offered, say so and do not recommend it). Give a plain yes or no per group with the reason.
3. Competitor and AI answer map for the twenty most valuable translation questions: who ranks in UK Google, what ChatGPT, Gemini and Perplexity answer today and which sources they cite, and what a page must contain to be cited.
4. A new pillar for the content plan, "Getting documents translated for a UK application" (or a better name), as rows for topical-map.csv with EXACTLY these columns: day,publish_date,pillar,cluster,segment,funnel_stage,title,primary_keyword,secondary_keywords,ai_question,search_intent,money_page,cta,outline,original_element,faq,language,word_count,status,url. Produce 15 rows numbered 91 to 105 (publish_date empty, language en, status planned, url empty, word_count 900 to 1400, money_page one of /translation/, /translation/certified/ or /translation/specialist/, a pillar guide first, titles 59 characters or fewer, three FAQ pairs as "Q? :: A." separated by " || ", 5 to 7 H2s separated by " | ", an original_element a generic answer cannot have, and secondary keywords separated by "; "). Also list which EXISTING rows of the attached map should gain a short cross link to the translation pages (give the day numbers and the one sentence to add).
5. Bulgarian language content: the ten most valuable Bulgarian search questions about translation and legalisation for Bulgarians in the UK, with the exact Bulgarian wording, and whether a Bulgarian language guide page would be worth more than an English one for each.
6. Distribution: the five places to announce the service (Bulgarian, Romanian and Polish community groups in the UK, Hong Kong UK groups if relevant, nursing recruitment forums), the one line offer, and three partnership types worth an email (immigration solicitors, nursing recruiters, university admissions agents) with the offer.
Provide the 15 rows as a downloadable CSV called translation-rows.csv and print them in a code block.
---
