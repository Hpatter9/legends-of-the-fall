// Writes src/render/epicManifest.ts from the songs (their loop lengths) and the encoded files in src/audio/:
// `node tools/epic-music/manifest.mjs`. Run it after `render.mjs`.

import { readdirSync, statSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url).pathname;
const ids = readdirSync(new URL('./tracks/', import.meta.url)).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).map((f) => f.replace('.mjs', '')).sort();
const rows = [];
let total = 0;
for (const id of ids) {
  const song = (await import(`./tracks/${id}.mjs`)).default();
  const bytes = statSync(`${root}src/audio/${id}.opus`).size;
  total += bytes;
  const seconds = +(song.loop ? song.loopSeconds : song.loopSeconds + song.tail).toFixed(4);
  rows.push(`  ${id}: { file: '${id}.opus', loop: ${song.loop}, seconds: ${seconds}, bytes: ${bytes} },`);
}
writeFileSync(
  `${root}src/render/epicManifest.ts`,
  `// The epic music's files and loop lengths. Written by tools/epic-music/manifest.mjs: do not edit by hand.
// \`seconds\` is the loop's length (or, for a sting, its whole length); each file also holds a second more of the loop's start, so
// the page can loop a window of it however a decoder trims the ends. About ${(total / 1048576).toFixed(2)} MB in all.

export interface EpicEntry {
  file: string;
  loop: boolean;
  seconds: number;
  bytes: number;
}

export const EPIC_MANIFEST = {
${rows.join('\n')}
} satisfies Record<string, EpicEntry>;
`,
);
console.log(`${ids.length} files, ${(total / 1048576).toFixed(2)} MB`);
