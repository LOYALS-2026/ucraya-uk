import { locales, defaultLocale, type Locale } from '../i18n';

export const COURSE_SLUGS = [
  'general-english',
  'one-to-one',
  'group-courses',
  'business-english',
  'ielts',
  'selt-b1',
  'oet',
  'kids',
] as const;
export type CourseSlug = (typeof COURSE_SLUGS)[number];

export interface Route {
  id: string;
  /** Path in the default locale, with leading and trailing slash. */
  path: string;
  view: string;
  /** Key under meta.* in the messages. */
  meta: string;
  locales: readonly Locale[];
  noindex?: boolean;
  course?: CourseSlug;
}

const ALL = locales;
const EN: readonly Locale[] = ['en'];

export const ROUTES: Route[] = [
  { id: 'home', path: '/', view: 'home', meta: 'home', locales: ALL },
  { id: 'courses', path: '/courses/', view: 'courses', meta: 'courses', locales: ALL },
  ...COURSE_SLUGS.map(
    (slug): Route => ({
      id: `course-${slug}`,
      path: `/courses/${slug}/`,
      view: 'course',
      meta: `courses.items.${slug}`,
      locales: ALL,
      course: slug,
    }),
  ),
  { id: 'pricing', path: '/pricing/', view: 'pricing', meta: 'pricing', locales: ALL },
  { id: 'how', path: '/how-it-works/', view: 'how', meta: 'how', locales: ALL },
  { id: 'trial', path: '/free-trial/', view: 'trial', meta: 'trial', locales: ALL },
  { id: 'placement', path: '/placement-test/', view: 'placement', meta: 'placement', locales: ALL },
  { id: 'tutors', path: '/tutors/', view: 'tutors', meta: 'tutors', locales: ALL },
  { id: 'reviews', path: '/reviews/', view: 'reviews', meta: 'reviews', locales: ALL },
  { id: 'faq', path: '/faq/', view: 'faq', meta: 'faq', locales: ALL },
  { id: 'about', path: '/about/', view: 'about', meta: 'about', locales: ALL },
  { id: 'contact', path: '/contact/', view: 'contact', meta: 'contact', locales: ALL },
  { id: 'thanks', path: '/thank-you/', view: 'thanks', meta: 'thanks', locales: ALL, noindex: true },
  { id: 'privacy', path: '/privacy/', view: 'legal', meta: 'privacy', locales: EN },
  { id: 'terms', path: '/terms/', view: 'legal', meta: 'terms', locales: EN },
  { id: 'london', path: '/london/', view: 'london', meta: 'london', locales: EN },
];

export function route(id: string): Route {
  const r = ROUTES.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown route ${id}`);
  return r;
}

/** URL path of a page in a locale. English has no prefix. */
export function localePath(locale: Locale, path: string): string {
  if (locale === defaultLocale) return path;
  return path === '/' ? `/${locale}/` : `/${locale}${path}`;
}

/** Path of a route in a locale; falls back to English when the route has no such locale. */
export function pathFor(id: string, locale: Locale): string {
  const r = route(id);
  return localePath(r.locales.includes(locale) ? locale : defaultLocale, r.path);
}

export function absolute(path: string): string {
  return `https://ucraya.uk${path}`;
}

/** Look a dotted key up in a messages object. */
export function dig(obj: unknown, key: string): any {
  return key.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), obj);
}
