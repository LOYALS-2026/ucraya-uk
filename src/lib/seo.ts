export const SUFFIX = ' | Ucraya';

/** Cut at a word boundary so the result is at most `max` characters. */
export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, '') + '\u2026';
}

/** Page title: "Name | Ucraya" when it fits in 59 characters, else the name alone, clipped. */
export function seoTitle(title: string): string {
  const full = title + SUFFIX;
  if (full.length <= 59) return full;
  return clip(title, 59);
}

export function seoDescription(text: string): string {
  return clip(text, 158);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Safe JSON for a script tag. */
export function jsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
