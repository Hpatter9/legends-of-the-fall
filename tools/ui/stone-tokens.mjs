// Stone and iron: writes src/tokens.css (the colour tokens) and moves the hard-coded colours of the UI's CSS onto them.
//   node tools/ui/stone-tokens.mjs --write   (tokens.css only)   |   node tools/ui/stone-tokens.mjs --convert  (also rewrites the files)
// A colour is put in a family by its hue (slate for neutrals and the old browns, ember for golds and oranges, danger, good, ice, arcane) and
// takes the ramp step nearest its lightness: dark wood becomes dark slate, gold becomes ember, a green stays a green. Colours that are game art
// or effects (the canvas scenes, damage numbers, board, fx) are not in the file list and keep their values.
import { readFileSync, writeFileSync } from 'node:fs';
const RAMPS = {
  s: ['#080b0f', '#0b0e12', '#11151b', '#171c23', '#1a2028', '#232a33', '#2a323c', '#343e4a', '#3c4755', '#4d5a6a', '#5d6b7c', '#7b8997', '#9aa8b6', '#b4c2d0', '#cfd9e3', '#e6edf4'],
  e: ['#3a1a08', '#7a3410', '#a8481a', '#b8521a', '#d4631f', '#ec7a2c', '#ff8a3c', '#ffa660', '#ffb878', '#ffd0a0', '#ffe6cc'],
  r: ['#3a0e0a', '#6a1c14', '#8a2a1e', '#b3382a', '#d04a38', '#f0503a', '#ff8a7a', '#ffb3a8', '#ffd9d2'],
  g: ['#12401c', '#1e5a2c', '#2f8a44', '#3fa83f', '#6fdc6f', '#9af09a', '#c4f6bc'],
  b: ['#0c1828', '#26396e', '#3a78d6', '#4a9cff', '#7cc0ff', '#9fd4ff', '#cde8ff'],
  p: ['#1a0d2a', '#3a2a6a', '#6a4a9a', '#8a6ac8', '#b06aff', '#d8c4ff', '#efe4ff'],
};
const hex2rgb = (h) => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
function hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
const L = {}; for (const [k, a] of Object.entries(RAMPS)) L[k] = a.map((h) => hsl(hex2rgb(h))[2]);
function family(rgb) {
  const [h, s, l] = hsl(rgb);
  if (l < 0.1 || s < 0.14 || (h >= 190 && h < 265 && s < 0.28)) return 's';
  if (h < 12 || h >= 345) return s >= 0.4 ? 'r' : 's';
  if (h < 50) { if (l < 0.3 || (s < 0.5 && l < 0.5)) return 's'; if (s < 0.5 && l >= 0.72) return 's'; return 'e'; }
  if (h < 68) return l < 0.3 && s < 0.6 ? 's' : 'e';
  if (h < 170) return 'g';
  if (h < 255) return 'b';
  if (h < 345) return 'p';
  return 's';
}
function token(rgb) {
  const f = family(rgb), l = hsl(rgb)[2];
  let best = 0; L[f].forEach((v, i) => { if (Math.abs(v - l) < Math.abs(L[f][best] - l)) best = i; });
  return `${f}${best}`;
}
export function tokensCss() {
  const lines = ['  --white: #fff; --white-rgb: 255 255 255; --black: #000; --black-rgb: 0 0 0;'];
  for (const [k, a] of Object.entries(RAMPS)) a.forEach((h, i) => lines.push(`  --${k}${i}: ${h}; --${k}${i}-rgb: ${hex2rgb(h).join(' ')};`));
  return lines.join('\n');
}
const FILES = ['src/index.html', 'src/pixel.css', 'src/rogue.css', 'src/equip.css', 'src/awaken.css', 'src/talents.css', 'src/codex.css', 'src/eliteSets.css', 'src/twists.css', 'src/calmap.css', 'src/campPlaces.css',
  'src/armiesView.ts', 'src/synergyView.ts', 'src/starter.ts', 'src/spellbook.ts'];
const stats = {};
// the dark ink printed on the (now ember) gold faces
const INK = ['4a1a06', '2a1606', '3a1c06', '2a1404', '3a1a06', '3a1c0e'];
function convert(src) {
  // (data URLs and script blocks keep their colours; a ${...} colour is built at run time)
  const keep = []; src = src.replace(/url\((["']?)data:[^)]*\)/g, (m) => (keep.push(m), `\u0000${keep.length - 1}\u0000`));
  let out = src.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)|#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m, r, g, b, a, hex) => {
    let rgb, alpha;
    if (hex) { rgb = hex2rgb(hex); alpha = null; } else { rgb = [+r, +g, +b]; alpha = a; }
    if (hex && INK.includes(hex.toLowerCase())) return 'var(--btn-ink)';
    const [R, G, B] = rgb;
    if (R === 0 && G === 0 && B === 0) return alpha === null ? 'var(--black)' : `rgb(var(--black-rgb) / ${alpha})`;
    if (R === 255 && G === 255 && B === 255) return alpha === null ? 'var(--white)' : `rgb(var(--white-rgb) / ${alpha})`;
    const t = token(rgb); stats[t] = (stats[t] || 0) + 1;
    return alpha === null ? `var(--${t})` : `rgb(var(--${t}-rgb) / ${alpha})`;
  });
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
}
if (process.argv.includes('--convert')) {
  for (const f of FILES) {
    const s = readFileSync(f, 'utf8');
    let o;
    if (f.endsWith('.html')) o = s.replace(/<style>[\s\S]*?<\/style>/g, (m) => convert(m));
    else o = convert(s);
    writeFileSync(f, o);
  }
  console.log(JSON.stringify(stats));
}
if (process.argv.includes('--tokens')) console.log(tokensCss());

if (process.argv.includes('--write')) {
  const sem = `
  /* ---- what the ramps mean (use these names in new rules; the ramp steps are for tints in between) ---- */
  --page: var(--s2); --panel: var(--s4); --panel-hi: var(--s5); --edge-lo: var(--s7); --edge-hi: var(--s11);
  --text: var(--s15); --text-dim: var(--s13); --text-faint: var(--s11);
  --accent: var(--e5); --accent-hi: var(--e8); --accent-lo: var(--e3); --ember-hot: var(--e6);
  --danger: var(--r5); --danger-hi: var(--r6); --danger-lo: var(--r2); --good: var(--g4); --good-lo: var(--g2); --mana: var(--b4); --mana-lo: var(--b2); --rare: var(--p4);
  --btn-fill: var(--s8); --btn-rim: var(--s11); --btn-lip: var(--s6); --btn-primary: var(--e5); --btn-ink: var(--s0); --btn-off: var(--s6); --off-ink: var(--s12);
  --tab-bar: var(--s3); --tab-on: var(--e5); --badge: var(--r5); --overlay: rgb(var(--s1-rgb) / 0.88); --scrim: rgb(var(--black-rgb) / 0.6); --shade: rgb(var(--black-rgb) / 0.35);
  --panel-bg: url(ui/page.png) 0 0 / 32px 32px, var(--s4);`;
  writeFileSync('src/tokens.css', `/* Stone and iron: the colour tokens. Written by tools/ui/stone-tokens.mjs (the ramps), then kept by hand; docs/notes/ui-stone.md lists them.\n   s = slate (dark to light), e = ember, r = danger, g = good, b = ice (mana), p = arcane; -rgb is the same colour as "r g b" for rgb(var(--x-rgb) / alpha). */\n:root {\n${tokensCss()}${sem}\n}\n`);
}

// --lines file:from-to ... converts only those lines (the UI chrome inside a scene file)
for (const a of process.argv.filter((x) => x.startsWith('--lines='))) {
  const [f, r] = a.slice(8).split(':'); const [from, to] = r.split('-').map(Number);
  const L = readFileSync(f, 'utf8').split('\n');
  for (let i = from - 1; i < to; i++) L[i] = convert(L[i]);
  writeFileSync(f, L.join('\n'));
}
