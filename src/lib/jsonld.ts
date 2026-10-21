import { SITE } from './site';
import { absolute } from './routes';

export const ORG_ID = `${SITE.url}/#organization`;

export function organization() {
  return {
    '@context': 'https://schema.org',
    '@type': ['EducationalOrganization', 'Organization'],
    '@id': ORG_ID,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url + '/',
    logo: absolute('/brand/logo.svg'),
    image: absolute('/og/default.png'),
    description:
      'Online English lessons with real tutors: one-to-one lessons, small group level courses and exam preparation, from a London English school founded in 2015.',
    foundingDate: SITE.founded,
    email: SITE.email,
    telephone: SITE.phoneTel,
    address: { '@type': 'PostalAddress', ...SITE.address },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: SITE.email,
        telephone: SITE.phoneTel,
        availableLanguage: ['English', 'Bulgarian', 'Romanian', 'Polish'],
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
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: opts.language,
    provider: { '@type': ['EducationalOrganization', 'Organization'], '@id': ORG_ID, name: SITE.name, url: SITE.url + '/' },
    offers: opts.prices.map((p) => ({
      '@type': 'Offer',
      name: p.label,
      price: p.amount.replace(/[^0-9.]/g, ''),
      priceCurrency: 'GBP',
      url: opts.url,
      availability: 'https://schema.org/InStock',
    })),
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online' },
  };
}

export function blogPosting(opts: {
  title: string;
  description: string;
  url: string;
  published: Date;
  updated?: Date;
  author: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: opts.url,
    datePublished: opts.published.toISOString(),
    dateModified: (opts.updated ?? opts.published).toISOString(),
    inLanguage: 'en-GB',
    image: absolute('/og/default.png'),
    author: { '@type': 'Organization', name: opts.author },
    publisher: { '@type': 'Organization', '@id': ORG_ID, name: SITE.name, logo: { '@type': 'ImageObject', url: absolute('/brand/logo.svg') } },
  };
}
