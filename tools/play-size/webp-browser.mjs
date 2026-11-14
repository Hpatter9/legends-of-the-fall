// PLAY-SIZE C (docs/notes/play-size.md): every picture the build wrote as lossless WebP, decoded by Chromium beside the PNG in src/art
// it came from, both through an <img> drawn to a canvas and through fetch, createImageBitmap and an OffscreenCanvas (the off-thread
// decode's path), and compared. libvips decodes each pair to the same pixels (the build checks that); Chromium's PNG and WebP
// decoders round differently when they premultiply alpha, so a soft edge can read back differently. The owner accepted up to 1/255
// on screen (2026-11-14). This fails if any picture differs in size, in alpha, on an opaque pixel, or by more than 1/255 once drawn
// over a ground.
//
//   npm run web && node tools/play-size/webp-browser.mjs [out/web]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const root = process.argv[2] ?? 'out/web';
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
// (each WebP the build made from a PNG: art/<folder>/<name>-<hash>.webp from src/art/<folder>/<name>.png, awakened/<name>.webp from
//  src/art/awakened/<name>.png; a WebP whose source is a WebP is not one of them)
const pairs = [];
for (const f of walk(root).filter((f) => f.endsWith('.webp'))) {
  const rel = relative(root, f);
  const src = rel.startsWith('art/') ? `src/${rel.replace(/-[A-Z0-9]{8}\.webp$/, '.png')}` : rel.startsWith('awakened/') ? `src/art/${rel.replace(/\.webp$/, '.png')}` : null;
  if (src && existsSync(src)) pairs.push({ webp: rel, png: src });
}

const srv = createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const p = u.startsWith('/src/') ? u.slice(1) : join(root, u);
  if (u === '/') return r.end('<!doctype html>');
  if (!existsSync(p)) {
    r.writeHead(404);
    return r.end();
  }
  r.writeHead(200, { 'content-type': p.endsWith('.webp') ? 'image/webp' : 'image/png' });
  r.end(readFileSync(p));
}).listen(0);
await new Promise((ok) => srv.on('listening', ok));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto(`http://localhost:${srv.address().port}/`);
const res = await page.evaluate(async (pairs) => {
  const load = (u) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error(u)); i.src = u; });
  const viaImg = (i, ground) => {
    const c = document.createElement('canvas');
    c.width = i.naturalWidth;
    c.height = i.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (ground) { g.fillStyle = ground; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(i, 0, 0);
    return g.getImageData(0, 0, c.width, c.height).data;
  };
  const viaBitmap = async (u) => {
    const bm = await createImageBitmap(await (await fetch(u)).blob());
    const c = new OffscreenCanvas(bm.width, bm.height);
    const g = c.getContext('2d');
    g.drawImage(bm, 0, 0);
    return g.getImageData(0, 0, bm.width, bm.height).data;
  };
  const out = { pictures: 0, same: 0, sizeDiffers: [], alphaDiffers: [], opaqueDiffers: [], worstShown: 0, worstPremultiplied: 0, worstRead: 0 };
  for (const { webp, png } of pairs) {
    out.pictures++;
    const [a, b] = await Promise.all([load('/' + png), load('/' + webp)]);
    if (a.naturalWidth !== b.naturalWidth || a.naturalHeight !== b.naturalHeight) { out.sizeDiffers.push(webp); continue; }
    let same = true;
    for (const [da, db] of [[viaImg(a), viaImg(b)], [await viaBitmap('/' + png), await viaBitmap('/' + webp)]]) {
      for (let k = 0; k < da.length; k += 4) {
        if (da[k + 3] !== db[k + 3]) { out.alphaDiffers.push(webp); same = false; break; }
        for (let j = 0; j < 3; j++) {
          if (da[k + j] === db[k + j]) continue;
          same = false;
          if (da[k + 3] === 255) out.opaqueDiffers.push(webp);
          out.worstRead = Math.max(out.worstRead, Math.abs(da[k + j] - db[k + j]));
          out.worstPremultiplied = Math.max(out.worstPremultiplied, Math.abs(Math.round((da[k + j] * da[k + 3]) / 255) - Math.round((db[k + j] * db[k + 3]) / 255)));
        }
      }
    }
    // (what the screen shows: each drawn over a dark ground and a light one)
    for (const ground of ['#101418', '#d8d0c0']) {
      const [sa, sb] = [viaImg(a, ground), viaImg(b, ground)];
      for (let k = 0; k < sa.length; k++) out.worstShown = Math.max(out.worstShown, Math.abs(sa[k] - sb[k]));
    }
    if (same) out.same++;
  }
  out.opaqueDiffers = [...new Set(out.opaqueDiffers)];
  out.alphaDiffers = [...new Set(out.alphaDiffers)];
  return out;
}, pairs);
await browser.close();
srv.close();
console.log(`${res.pictures} WebP pictures against their PNGs in Chromium: ${res.same} read back identically; ${res.pictures - res.same} differ on soft edges only`);
console.log(`  colour read back on a soft edge differs by up to ${res.worstRead}; colour times alpha by up to ${res.worstPremultiplied}/255; on screen (over a dark and a light ground) by up to ${res.worstShown}/255`);
console.log(`  size differs: ${res.sizeDiffers.length}; alpha differs: ${res.alphaDiffers.length}; an opaque pixel differs: ${res.opaqueDiffers.length}`, [...res.sizeDiffers, ...res.alphaDiffers, ...res.opaqueDiffers].slice(0, 5));
const ok = res.pictures > 0 && !res.sizeDiffers.length && !res.alphaDiffers.length && !res.opaqueDiffers.length && res.worstShown <= 1;
console.log(ok ? 'Within the owner\'s 1/255.' : 'FAILED: beyond what the owner accepted.');
process.exit(ok ? 0 : 1);
