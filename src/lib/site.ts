// Constants that are not copy: contact details, URLs and brand colours.
// Every value here comes from content/FACTS.md.
export const SITE = {
  name: 'Ucraya',
  url: 'https://ucraya.uk',
  legalName: 'Training Centre Raya London Ltd',
  companyNumber: '11618355',
  founded: '2015',
  email: 'office@ucraya.co.uk',
  phoneDisplay: '+44 7459 702621',
  phoneTel: '+447459702621',
  whatsapp: 'https://wa.me/447459702621',
  viber: 'viber://chat/?number=447459702621',
  facebook: 'https://www.facebook.com/ucraya',
  messenger: 'https://m.me/ucraya',
  instagram: 'https://www.instagram.com/trainingcentrerayalondon/',
  googleReviews: 'https://g.page/r/CSwIOC-sQptsEAE/review',
  schoolSite: 'https://ucraya.co.uk',
  address: {
    streetAddress: 'Haverstock School, 24 Haverstock Hill',
    addressLocality: 'London',
    postalCode: 'NW3 2BQ',
    addressCountry: 'GB',
  },
  gaId: (import.meta.env.PUBLIC_GA_ID as string | undefined) || '',
} as const;

export const OG_LOCALES: Record<string, string> = {
  en: 'en_GB',
  bg: 'bg_BG',
  ro: 'ro_RO',
  pl: 'pl_PL',
};
