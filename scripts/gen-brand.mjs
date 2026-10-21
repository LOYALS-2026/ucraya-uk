// Generates the logo, favicon set and default Open Graph image.
// Text is converted to outlines with opentype.js so no font is needed to display the files.
// Run: npm run brand
import opentype from 'opentype.js';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fonts = path.join(root, 'node_modules/@fontsource');
function loadFont(file) {
  const b = readFileSync(file);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const slab = loadFont(path.join(fonts, 'roboto-slab/files/roboto-slab-latin-700-normal.woff'));
const sans = loadFont(path.join(fonts, 'pt-sans/files/pt-sans-latin-400-normal.woff'));

const C = { amber: '#ffb606', green: '#4caf50', orange: '#f24c0a', navy: '#1f2a44', ink: '#1a1a1a' };
const circles = [C.amber, C.green, C.orange, C.navy];

// Lays out glyph by glyph (avoids the shaping engine, which fails on some font tables).
function textPath(font, text, x, y, size, fill) {
  const scale = size / font.unitsPerEm;
  let cx = x;
  let d = '';
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    d += g.getPath(cx, y, size).toPathData(2);
    cx += g.advanceWidth * scale;
  }
  return { d, fill, width: cx - x };
}

// Logo: four circles in a 2 x 2 block, then the wordmark.
function logoSvg() {
  const r = 7.5;
  const dots = [
    [r + 1, r + 1], [r * 3 + 3, r + 1],
    [r + 1, r * 3 + 3], [r * 3 + 3, r * 3 + 3],
  ].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${circles[i]}"/>`).join('');
  const t = textPath(slab, 'Ucraya', 46, 38, 36, C.ink);
  const w = Math.ceil(46 + t.width + 4);
  return { w, h: 48, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 48" width="${w}" height="48" role="img" aria-label="Ucraya">${dots}<path d="${t.d}" fill="${t.fill}"/></svg>` };
}

const logo = logoSvg();
mkdirSync(path.join(root, 'public/brand'), { recursive: true });
mkdirSync(path.join(root, 'public/og'), { recursive: true });
writeFileSync(path.join(root, 'public/brand/logo.svg'), logo.svg);

// Favicon: four circles on a white rounded square.
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#ffffff"/><circle cx="21" cy="21" r="12" fill="${C.amber}"/><circle cx="43" cy="21" r="12" fill="${C.green}"/><circle cx="21" cy="43" r="12" fill="${C.orange}"/><circle cx="43" cy="43" r="12" fill="${C.navy}"/></svg>`;
writeFileSync(path.join(root, 'public/favicon.svg'), fav);
await sharp(Buffer.from(fav)).resize(180, 180).png().toFile(path.join(root, 'public/brand/apple-touch-icon.png'));
await sharp(Buffer.from(fav)).resize(512, 512).png().toFile(path.join(root, 'public/brand/icon-512.png'));

// Open Graph image 1200 x 630.
const W = 1200, H = 630;
const big = textPath(slab, 'Ucraya', 0, 0, 120, C.ink);
const bigX = (W - (big.width + 150)) / 2;
const bigT = textPath(slab, 'Ucraya', bigX + 150, 300, 120, C.ink);
const rr = 28;
const bx = bigX, by = 205;
const ogDots = [[bx + rr, by + rr], [bx + rr * 3 + 8, by + rr], [bx + rr, by + rr * 3 + 8], [bx + rr * 3 + 8, by + rr * 3 + 8]]
  .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="${circles[i]}"/>`).join('');
const strap = 'Online English lessons with real tutors';
const sz = 44;
const sw = textPath(sans, strap, 0, 0, sz, '').width;
const st = textPath(sans, strap, (W - sw) / 2, 420, sz, '#444444');
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fbf8f2"/><rect x="0" y="${H - 28}" width="${W}" height="28" fill="${C.amber}"/>${ogDots}<path d="${bigT.d}" fill="${C.ink}"/><path d="${st.d}" fill="${st.fill}"/></svg>`;
await sharp(Buffer.from(og)).png().toFile(path.join(root, 'public/og/default.png'));
console.log('Brand files written.');
