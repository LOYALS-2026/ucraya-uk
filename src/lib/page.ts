import { useMessages, type Locale } from '../i18n';
import { route, dig, pathFor } from './routes';

/** Title and description for a route, from the messages (meta.<key>, or courses.items.<slug>.meta*). */
export function pageMeta(routeId: string, locale: Locale) {
  const m = useMessages(locale);
  const r = route(routeId);
  if (r.course) {
    const item = (m.courses.items as Record<string, any>)[r.course];
    return { title: item.metaTitle as string, description: item.metaDescription as string };
  }
  const meta = dig(m.meta, r.meta);
  return { title: meta.title as string, description: meta.description as string };
}

export { pathFor };
