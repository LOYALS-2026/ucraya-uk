import en from './en.json';
import bg from './bg.json';
import ro from './ro.json';
import pl from './pl.json';

export const locales = ['en', 'bg', 'ro', 'pl'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export type Messages = typeof en;

export const localeNames: Record<Locale, string> = {
  en: 'English',
  bg: 'Български',
  ro: 'Română',
  pl: 'Polski',
};
export const htmlLang: Record<Locale, string> = { en: 'en-GB', bg: 'bg', ro: 'ro', pl: 'pl' };

const dictionaries: Record<Locale, unknown> = { en, bg, ro, pl };

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

// Deep merge: anything missing (or empty) in the translation falls back to English.
function merge(base: unknown, over: unknown): unknown {
  if (over === undefined || over === null || over === '') return base;
  if (isObject(base) && isObject(over)) {
    const out: Json = {};
    for (const key of Object.keys(base)) out[key] = merge(base[key], over[key]);
    return out;
  }
  if (Array.isArray(base) && Array.isArray(over)) {
    return base.map((item, i) => merge(item, over[i]));
  }
  return over;
}

const cache = new Map<Locale, Messages>();

/** All messages for a locale, with English filling any gap. Never throws. */
export function useMessages(locale: Locale): Messages {
  const hit = cache.get(locale);
  if (hit) return hit;
  const merged = (locale === 'en' ? en : merge(en, dictionaries[locale])) as Messages;
  cache.set(locale, merged);
  return merged;
}

export const messagesEn: Messages = en;

/** Replace {name} placeholders. */
export function format(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** t('home.h1') style lookup. A missing key returns the key itself, never an error. */
export function useTranslations(locale: Locale) {
  const messages = useMessages(locale) as unknown as Json;
  return function t(key: string, vars?: Record<string, string | number>): string {
    let cur: unknown = messages;
    for (const part of key.split('.')) {
      if (isObject(cur) || Array.isArray(cur)) cur = (cur as Json)[part];
      else {
        cur = undefined;
        break;
      }
    }
    if (typeof cur !== 'string') return key;
    return vars ? format(cur, vars) : cur;
  };
}
