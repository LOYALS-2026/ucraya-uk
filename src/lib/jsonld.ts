import { SITE } from './site';
import { absolute } from './routes';

export const ORG_ID = `${SITE.url}/#organization`;
/** The school behind the site. Ucraya is its online lessons service, so it is an alternate name. */
export const ORG_NAME = 'Training Centre Raya London';
/** The logo files of the Raya London pack (public/raya/). */
export const LOGO_SVG = absolute('/raya/raya-flat-light.svg');
export const LOGO_PNG = absolute('/raya/raya-flat-light.png');

export function organization() {
  return {
    '@context': 'https://schema.org',
    '@type': ['EducationalOrganization', 'Organization'],
    '@id': ORG_ID,
    name: ORG_NAME,
    alternateName: ['Ucraya', 'Raya London'],
    legalName: SITE.legalName,
    url: SITE.url + '/',
    logo: [LOGO_SVG, LOGO_PNG],
    image: [absolute('/og/default.png'), LOGO_PNG],
    description:
      'Online English lessons with real tutors: one-to-one lessons, small group level courses and exam preparation, from a London English school founded in 2015.',
    foundingDate: SITE.founded,
    email: SITE.email,
    telephone: SITE.phoneTel,
    address: { '@type': 'PostalAddress', addressLocality: SITE.address.addressLocality, postalCode: SITE.address.postalCode, addressCountry: SITE.address.addressCountry },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: SITE.email,
        telephone: SITE.phoneTel,
        availableLanguage: ['English', 'Bulgarian'],
      },
    ],
    sameAs: [SITE.facebook, SITE.instagram, SITE.googleReviews],
  };
}

export function website() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url + '/',
    name: SITE.name,
    inLanguage: ['en-GB', 'bg', 'ro', 'pl'],
    publisher: { '@id': ORG_ID },
  };
}

export function breadcrumbList(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqPage(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

export function course(opts: {
  name: string;
  description: string;
  url: string;
  language: string;
  prices: { label: string; amount: string }[];
  /** ISO 8601 duration, only where FACTS gives the hours (exam preparation: 24 hours). */
  workload?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: 'en',
    provider: { '@type': ['EducationalOrganization', 'Organization'], '@id': ORG_ID, name: ORG_NAME, url: SITE.url + '/' },
    offers: opts.prices.map((p) => ({
      '@type': 'Offer',
      name: p.label,
      price: p.amount.replace(/[^0-9.]/g, ''),
      priceCurrency: 'GBP',
      url: opts.url,
      availability: 'https://schema.org/InStock',
      category: 'Paid',
    })),
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', ...(opts.workload ? { courseWorkload: opts.workload } : {}) },
  };
}

/** Parts of a page a voice assistant may read aloud: the h1 and the direct answer. */
export function speakable(selectors: string[]) {
  return { '@type': 'SpeakableSpecification', cssSelector: selectors };
}

export function blogPosting(opts: {
  title: string;
  description: string;
  url: string;
  published: Date;
  updated?: Date;
  /** Pillar name: the BlogPosting is about this goal. */
  pillar?: string;
  pillarUrl?: string;
  wordCount?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${opts.url}#article`,
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': opts.url },
    datePublished: opts.published.toISOString(),
    dateModified: (opts.updated ?? opts.published).toISOString(),
    inLanguage: 'en-GB',
    image: absolute('/og/default.png'),
    ...(opts.wordCount ? { wordCount: opts.wordCount } : {}),
    ...(opts.pillar ? { about: { '@type': 'Thing', name: opts.pillar, ...(opts.pillarUrl ? { url: opts.pillarUrl } : {}) } } : {}),
    author: { '@type': 'Organization', '@id': ORG_ID, name: ORG_NAME, url: SITE.url + '/' },
    publisher: { '@type': 'Organization', '@id': ORG_ID, name: ORG_NAME, logo: { '@type': 'ImageObject', url: LOGO_PNG } },
    isPartOf: { '@type': 'Blog', name: 'Ucraya guides', url: absolute('/blog/') },
    speakable: speakable(['h1', '.bl-quick-text']),
  };
}

/** A money page: names the page, points at the organisation and the website, and marks what may be read aloud. */
export function webPage(opts: { url: string; name: string; description: string; locale: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${opts.url}#webpage`,
    url: opts.url,
    name: opts.name,
    description: opts.description,
    inLanguage: opts.locale,
    isPartOf: { '@id': `${SITE.url}/#website` },
    publisher: { '@id': ORG_ID },
    speakable: speakable(['h1', '.page-hero .lead', '.hero .lead']),
  };
}

/** A page that is about the organisation: points at the Organization by @id instead of repeating it. */
export function orgPage(type: 'AboutPage' | 'ContactPage', url: string, name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    url,
    name,
    mainEntity: { '@id': ORG_ID },
    about: { '@id': ORG_ID },
    speakable: speakable(['h1', '.page-hero .lead']),
  };
}
