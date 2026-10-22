// Generates the web logo files, the favicon set and the Open Graph image from the ORIGINAL Raya London vector artwork
// in public/raya/original/ (raya-original-vector-black.svg, -white.svg). The artwork is used as supplied: shapes are
// placed and scaled, never redrawn, recoloured, cropped or given a glass effect. Nothing reads the earlier logo pack.
// Text on the Open Graph image is converted to outlines with opentype.js so no font is needed to display it.
// Run: npm run brand
import opentype from 'opentype.js';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const orig = (f) => path.join(root, 'public/raya/original', f);
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

// ---- Optimised logo files for the header and the footer (the SVGs are 234 KB each, too heavy for a bar).
// Full colour PNGs with a transparent background, rendered from the vector at four times the size and then reduced,
// so the edges stay clean. No palette quantising: the colours are the artwork's own. The full SVGs stay at their own path.
const RAYA_BLACK = orig('raya-original-vector-black.svg');
const RAYA_WHITE = orig('raya-original-vector-white.svg');
const logoPng = async (svg, width, file) => {
  const big = await sharp(svg, { density: 288 }).resize({ width: width * 4 }).png().toBuffer();
  const buf = await sharp(big).resize({ width, kernel: 'lanczos3' }).png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 }).toBuffer();
  writeFileSync(path.join(root, 'public/brand', file), buf);
  console.log(`${file} ${buf.length} bytes`);
};
// Header: 200 px wide on desktop and 150 px on phones, so 2x is 400 and 300, and 600 serves 3x phones.
for (const w of [300, 400, 600]) await logoPng(RAYA_BLACK, w, `raya-black-${w}.png`);
// Footer (white lettering on the dark footer), shown at 240 px: 480 for 2x, 720 for 3x.
for (const w of [480, 720]) await logoPng(RAYA_WHITE, w, `raya-white-${w}.png`);

// ---- The four badges (eye, ear, pencil, lips) cut from the original SVG, group by group, for the favicons.
// Each <g id="badge-N"> holds the coloured disc, the silver rim and the white symbol; they are placed two by two, nothing else changes.
const svgSrc = readFileSync(RAYA_BLACK, 'utf8');
const defs = svgSrc.slice(svgSrc.indexOf('<defs>'), svgSrc.indexOf('</defs>') + 7);
const at = [1, 2, 3, 4].map((n) => svgSrc.indexOf(`<g id="badge-${n}">`)).concat(svgSrc.indexOf('<g id="original-lettering"'));
if (at.some((i) => i < 0)) throw new Error('badge groups not found in the original SVG');
const badges = [0, 1, 2, 3].map((i) => svgSrc.slice(at[i], at[i + 1]));
const centres = [176.16, 471.46, 766.66, 1061.92]; // cx of each badge disc in the 1259 x 471 artwork
const cy = 175.45;
const spots = [[160, 160], [480, 160], [160, 480], [480, 480]];
const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">${defs}${badges.map((b, i) => `<g transform="translate(${(spots[i][0] - centres[i]).toFixed(2)} ${(spots[i][1] - cy).toFixed(2)})">${b}</g>`).join('')}</svg>`;
const icon = async (size, file, { cream = true, pad = 0.06 } = {}) => {
  const inner = Math.round(size * (1 - pad * 2));
  const art = await sharp(Buffer.from(badgeSvg), { density: 300 }).resize(inner, inner).png().toBuffer();
  const base = cream ? { create: { width: size, height: size, channels: 4, background: '#fbf8f2' } } : { create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } };
  const off = Math.round((size - inner) / 2);
  const buf = await sharp(base).composite([{ input: art, left: off, top: off }]).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(path.join(root, file), buf);
  return buf;
};
// PNG icons for phones sit on the cream page colour (a transparent icon turns black on some phones); the tab icon is transparent.
await icon(180, 'public/brand/apple-touch-icon.png');
await icon(192, 'public/brand/icon-192.png');
await icon(512, 'public/brand/icon-512.png');
const fav32 = await icon(32, 'public/brand/favicon-32.png', { cream: false, pad: 0.02 });
const fav48 = await icon(48, 'public/brand/favicon-48.png', { cream: false, pad: 0.02 });
// favicon.ico: an ICO file may hold PNG images, so the two PNGs are wrapped in the 6 byte header and 16 byte entries.
const ico = (images) => {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, buf }, i) => {
    const o = 6 + 16 * i;
    head[o] = size; head[o + 1] = size; head[o + 2] = 0; head[o + 3] = 0;
    head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(buf.length, o + 8); head.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.buf)]);
};
writeFileSync(path.join(root, 'public/favicon.ico'), ico([{ size: 32, buf: fav32 }, { size: 48, buf: fav48 }]));

// ---- Open Graph image 1200 x 630: the original logo (white lettering) on a dark gradient, strap line and domain.
const W = 1200, H = 630;
const strap = 'Online English lessons with real tutors';
const sw = textPath(sans, strap, 0, 0, 40).width;
const st = textPath(sans, strap, (W - sw) / 2, 520, 40);
const dom = 'ucraya.uk';
const dw = textPath(slab, dom, 0, 0, 34).width;
const dt = textPath(slab, dom, (W - dw) / 2, 574, 34);
const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1322"/><stop offset="1" stop-color="#1f2a44"/></linearGradient>
<radialGradient id="c" cx="0" cy="0" r="1" gradientTransform="translate(150 80) scale(520 360)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#00ADDC" stop-opacity="0.30"/><stop offset="1" stop-color="#00ADDC" stop-opacity="0"/></radialGradient>
<radialGradient id="l" cx="0" cy="0" r="1" gradientTransform="translate(1080 120) scale(460 320)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9DCC36" stop-opacity="0.22"/><stop offset="1" stop-color="#9DCC36" stop-opacity="0"/></radialGradient>
<radialGradient id="y" cx="0" cy="0" r="1" gradientTransform="translate(980 600) scale(520 300)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#EBC300" stop-opacity="0.2"/><stop offset="1" stop-color="#EBC300" stop-opacity="0"/></radialGradient>
<radialGradient id="r" cx="0" cy="0" r="1" gradientTransform="translate(160 620) scale(420 260)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#E40035" stop-opacity="0.16"/><stop offset="1" stop-color="#E40035" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#b)"/><rect width="${W}" height="${H}" fill="url(#c)"/><rect width="${W}" height="${H}" fill="url(#l)"/><rect width="${W}" height="${H}" fill="url(#y)"/><rect width="${W}" height="${H}" fill="url(#r)"/>
<path d="${st.d}" fill="#f3efe6"/><path d="${dt.d}" fill="#ffb606"/>
</svg>`;
const LOGO_W = 840;
const logo = await sharp(RAYA_WHITE, { density: 288 }).resize({ width: LOGO_W * 2 }).png().toBuffer();
const logoSized = await sharp(logo).resize({ width: LOGO_W, kernel: 'lanczos3' }).png().toBuffer();
const lm = await sharp(logoSized).metadata();
await sharp(Buffer.from(bg)).composite([{ input: logoSized, left: Math.round((W - lm.width) / 2), top: 128 }]).png({ compressionLevel: 9 }).toFile(path.join(root, 'public/og/default.png'));
console.log('Brand files written.');
