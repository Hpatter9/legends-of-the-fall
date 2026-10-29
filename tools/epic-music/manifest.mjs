// Writes src/render/epicManifest.ts from the songs (their loop lengths) and the encoded files in src/audio/:
// `node tools/epic-music/manifest.mjs [id ...]`. Run it after `render.mjs`, naming the tracks just rendered: the others keep
// their entries as they are (several of the shipped files were not rendered from the songs here as they now stand, so their
// lengths must not be recomputed from them). With no ids, every entry is recomputed.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url).pathname;
const ids = readdirSync(new URL('./tracks/', import.meta.url)).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).map((f) => f.replace('.mjs', '')).sort();
const only = process.argv.slice(2);
// (the entries already there: \`id: { file, loop, seconds[, start], bytes }\`)
const kept = {};
try {
  const old = readFileSync(`${root}src/render/epicManifest.ts`, 'utf8');
  for (const m of old.matchAll(/^  (\w+): \{ file: '([^']+)', loop: (true|false), seconds: ([\d.]+)(?:, start: ([\d.]+))?, bytes: \d+ \},$/gm)) kept[m[1]] = { loop: m[3], seconds: Number(m[4]), start: Number(m[5] ?? 0) };
} catch {
  // (no manifest yet: every entry is computed)
}
const rows = [];
let total = 0;
for (const id of ids) {
  const bytes = statSync(`${root}src/audio/${id}.opus`).size;
  total += bytes;
  if (only.length && !only.includes(id) && kept[id]) {
    const k = kept[id];
    rows.push(`  ${id}: { file: '${id}.opus', loop: ${k.loop}, seconds: ${k.seconds}, start: ${k.start}, bytes: ${bytes} },`);
    continue;
  }
  const song = (await import(`./tracks/${id}.mjs`)).default();
  const seconds = +(song.loop ? song.loopSeconds : song.loopSeconds + song.tail).toFixed(4);
  rows.push(`  ${id}: { file: '${id}.opus', loop: ${song.loop}, seconds: ${seconds}, start: ${+song.introSeconds.toFixed(4)}, bytes: ${bytes} },`);
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
  /** Seconds into the loop where it repeats from: a track with an intro plays it once (from \`LOOP_START\`), then loops
   *  [LOOP_START + start, LOOP_START + seconds]. 0 for a track with no intro. */
  start: number;
  bytes: number;
}

export const EPIC_MANIFEST = {
${rows.join('\n')}
} satisfies Record<string, EpicEntry>;
`,
);
console.log(`${ids.length} files, ${(total / 1048576).toFixed(2)} MB`);
