// Renders the king's spells' sounds: `node tools/spell-sfx/render.mjs [id ...]` writes each to src/sfx/<id>.opus (and a WAV to a
// scratch folder, `--out DIR`, default /tmp/spell-sfx) and the manifest src/render/spellSfxManifest.ts (each file's length,
// size, and when a falling thing lands or a cast's whoomp falls). With ids, only those are rendered; the manifest is always written whole.

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { rng } from '../epic-music/instruments.mjs';
import { Sfx, SR, finish, wav } from './kit.mjs';
import { SOUNDS } from './sounds.mjs';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const scratch = outIdx >= 0 ? args[outIdx + 1] : '/tmp/spell-sfx';
const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
const root = new URL('../../', import.meta.url).pathname;
mkdirSync(scratch, { recursive: true });
mkdirSync(`${root}src/sfx`, { recursive: true });
/** Opus at this rate (kbps, stereo): small, and clean enough for effects. */
const KBPS = 40;

for (const id of ids.length ? ids : Object.keys(SOUNDS)) {
  const spec = SOUNDS[id];
  if (!spec) throw new Error(`no sound ${id}`);
  // (the borrowed instruments draw from one shared stream: reset it, so a sound renders the same alone or with the rest)
  rng.s = spec.seed * 7919 + 1;
  const s = new Sfx(spec.seconds, spec.seed);
  spec.make(s);
  const n = finish(s, spec.loud ?? -10);
  writeFileSync(`${scratch}/${id}.wav`, wav(s, n));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${scratch}/${id}.wav`, '-c:a', 'libopus', '-b:a', `${KBPS}k`, '-vbr', 'on', '-application', 'audio', '-compression_level', '10', `${root}src/sfx/${id}.opus`]);
  console.log(`${id.padEnd(16)} ${(n / SR).toFixed(2)} s  ${(statSync(`${root}src/sfx/${id}.opus`).size / 1024).toFixed(1)} KB`);
}

// The manifest: every sound, its length, its size and its landing.
let total = 0;
const rows = Object.keys(SOUNDS).map((id) => {
  const bytes = statSync(`${root}src/sfx/${id}.opus`).size;
  total += bytes;
  const impact = SOUNDS[id].impact;
  // (the length as the file holds it, so a sound rendered alone does not need the others' scratch WAVs)
  const seconds = +(+execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${root}src/sfx/${id}.opus`]).toString().trim()).toFixed(3);
  return `  '${id}': { seconds: ${seconds}, bytes: ${bytes}${impact !== undefined ? `, impact: ${impact}` : ''}${SOUNDS[id].whoomp !== undefined ? `, whoomp: ${SOUNDS[id].whoomp}` : ''} },`;
});
writeFileSync(
  `${root}src/render/spellSfxManifest.ts`,
  `// The king's spells' sound files (src/sfx/*.opus, served as sfx/<id>.opus). Written by tools/spell-sfx/render.mjs: do not edit
// by hand. \`seconds\` is the file's length; \`impact\`, for a falling thing, is when in the file it lands; \`whoomp\`, for a cast,
// when its low blow falls. About ${Math.round(total / 1024)} KB in all.

export interface SpellSfxEntry {
  seconds: number;
  bytes: number;
  impact?: number;
  whoomp?: number;
}

export const SPELL_SFX_FILES = {
${rows.join('\n')}
} satisfies Record<string, SpellSfxEntry>;

export type SpellSfxId = keyof typeof SPELL_SFX_FILES;
`,
);
console.log(`${rows.length} files, ${Math.round(total / 1024)} KB`);
