// Generates the favicon set, the Open Graph image and the PNG logo copy from the supplied Raya London artwork
// in public/raya/ (the logo pack). The artwork is used as supplied: shapes are placed and scaled, never redrawn or recoloured.
// Text on the Open Graph image is converted to outlines with opentype.js so no font is needed to display it.
// Run: npm run brand
import opentype from 'opentype.js';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raya = (f) => path.join(root, 'public/raya', f);
const fonts = path.join(root, 'node_modules/@fontsource');
function loadFont(file) {
  const b = readFileSync(file);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const slab = loadFont(path.join(fonts, 'roboto-slab/files/roboto-slab-latin-700-normal.woff'));
const sans = loadFont(path.join(fonts, 'pt-sans/files/pt-sans-latin-400-normal.woff'));

// Own serialiser: opentype.js 2 prints NaN for some quadratic curves when toPathData() is given a number of decimals.
function pathData(p) {
  const n = (v) => Number(v.toFixed(2));
  return p.commands.map((c) => {
    if (c.type === 'M' || c.type === 'L') return `${c.type}${n(c.x)} ${n(c.y)}`;
    if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    return 'Z';
  }).join('');
}

// Lays out glyph by glyph (avoids the shaping engine, which fails on some font tables).
function textPath(font, text, x, y, size) {
  const scale = size / font.unitsPerEm;
  let cx = x;
  let d = '';
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    d += pathData(g.getPath(cx, y, size));
    cx += g.advanceWidth * scale;
  }
  return { d, width: cx - x };
}

mkdirSync(path.join(root, 'public/brand'), { recursive: true });
mkdirSync(path.join(root, 'public/og'), { recursive: true });

// ---- Favicon: the four symbol circles from raya-flat-symbols.svg, stacked two by two (shapes copied, only their position changes).
const symbols = readFileSync(raya('raya-flat-symbols.svg'), 'utf8');
const groups = [...symbols.matchAll(/<g transform="translate\(\d+ 72\)">[\s\S]*?(?=<g transform="translate\(\d+ 72\)">|<\/svg>)/g)].map((m) => m[0]);
if (groups.length !== 4) throw new Error(`expected four symbol groups, found ${groups.length}`);
const spots = [[59, 59], [177, 59], [59, 177], [177, 177]];
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 236 236" fill="none"><title>Raya London Training Centre</title>${groups.map((g, i) => g.replace(/translate\(\d+ 72\)/, `translate(${spots[i][0]} ${spots[i][1]})`)).join('')}</svg>`;
writeFileSync(path.join(root, 'public/favicon.svg'), fav);
// PNG icons sit on the cream page colour (a transparent icon turns black on some phones).
const icon = async (size, file) => {
  const pad = Math.round(size * 0.08);
  const art = await sharp(Buffer.from(fav), { density: 300 }).resize(size - pad * 2, size - pad * 2).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#fbf8f2' } }).composite([{ input: art, left: pad, top: pad }]).png().toFile(path.join(root, file));
};
await icon(180, 'public/brand/apple-touch-icon.png');
await icon(512, 'public/brand/icon-512.png');

// ---- PNG copy of the flat light logo, for structured data and places that want a raster.
await sharp(raya('raya-flat-light.svg'), { density: 300 }).resize({ width: 1072 }).png().toFile(raya('raya-flat-light.png'));

// ---- Open Graph image 1200 x 630: the dark glass logo on a dark glass gradient, strap line and domain.
const W = 1200, H = 630;
const strap = 'Online English lessons with real tutors';
const sw = textPath(sans, strap, 0, 0, 40).width;
const st = textPath(sans, strap, (W - sw) / 2, 500, 40);
const dom = 'ucraya.uk';
const dw = textPath(slab, dom, 0, 0, 34).width;
const dt = textPath(slab, dom, (W - dw) / 2, 560, 34);
const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1322"/><stop offset="1" stop-color="#1f2a44"/></linearGradient>
<radialGradient id="c" cx="0" cy="0" r="1" gradientTransform="translate(150 80) scale(520 360)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00ADDC" stop-opacity="0.30"/><stop offset="1" stop-color="#00ADDC" stop-opacity="0"/></radialGradient>
<radialGradient id="l" cx="0" cy="0" r="1" gradientTransform="translate(1080 120) scale(460 320)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9DCC36" stop-opacity="0.22"/><stop offset="1" stop-color="#9DCC36" stop-opacity="0"/></radialGradient>
<radialGradient id="y" cx="0" cy="0" r="1" gradientTransform="translate(980 600) scale(520 300)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#EBC300" stop-opacity="0.2"/><stop offset="1" stop-color="#EBC300" stop-opacity="0"/></radialGradient>
<radialGradient id="r" cx="0" cy="0" r="1" gradientTransform="translate(160 620) scale(420 260)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#E40035" stop-opacity="0.16"/><stop offset="1" stop-color="#E40035" stop-opacity="0"/></radialGradient>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.03"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#b)"/><rect width="${W}" height="${H}" fill="url(#c)"/><rect width="${W}" height="${H}" fill="url(#l)"/><rect width="${W}" height="${H}" fill="url(#y)"/><rect width="${W}" height="${H}" fill="url(#r)"/>
<rect x="150" y="48" width="900" height="534" rx="40" fill="url(#g)" stroke="#ffffff" stroke-opacity="0.22" stroke-width="2"/>
<path d="${st.d}" fill="#f3efe6"/><path d="${dt.d}" fill="#ffb606"/>
</svg>`;
const logo = await sharp(raya('raya-glass-dark.svg'), { density: 300 }).resize({ width: 600 }).png().toBuffer();
const lm = await sharp(logo).metadata();
await sharp(Buffer.from(bg)).composite([{ input: logo, left: Math.round((W - lm.width) / 2), top: 140 }]).png().toFile(path.join(root, 'public/og/default.png'));
console.log('Brand files written.');
