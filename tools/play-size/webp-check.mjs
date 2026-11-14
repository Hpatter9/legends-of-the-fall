// PLAY-SIZE C (docs/notes/play-size.md): decode and compare. Every PNG in src/art the build may write as lossless WebP (each of 16 KB
// or more, which an import makes a file, and every awakened sheet) is encoded as the build encodes it (through its cache), both are
// decoded to 8-bit RGBA, and every byte compared. Exits 1, naming them, if any differ. `test/play-size.test.ts` runs it.
//
//   node tools/play-size/webp-check.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { losslessWebp, samePixels } from './webpLossless.mjs';

const SMALL_ART = 16 * 1024; // (build.mjs's own threshold)
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const pngs = walk('src/art').filter((f) => f.endsWith('.png') && (f.startsWith('src/art/awakened/') || statSync(f).size >= SMALL_ART));
const bad = [];
let checked = 0;
let i = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (i < pngs.length) {
      const f = pngs[i++];
      const png = readFileSync(f);
      const webp = await losslessWebp(png, { always: true });
      if (!(await samePixels(png, webp))) bad.push(f);
      checked++;
    }
  }),
);
console.log(`${checked} PNGs encoded as lossless WebP and decoded again: ${bad.length ? `${bad.length} DIFFER` : 'every pixel the same'}`, bad.slice(0, 10));
process.exit(bad.length || !checked ? 1 : 0);
