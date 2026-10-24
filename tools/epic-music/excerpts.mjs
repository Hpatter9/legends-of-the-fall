// Cuts a 30-second excerpt of each shipped track (the loudest 30 s of its loop, found in the WAVs `render.mjs` leaves in the
// scratch folder) into docs/samples/epic-music/, straight from the .opus files with no re-encode, so they sound as shipped.
// `node tools/epic-music/excerpts.mjs [scratch-folder]`

import { readFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const scratch = process.argv[2] ?? '/tmp/epic-music';
const root = new URL('../../', import.meta.url).pathname;
const out = `${root}docs/samples/epic-music`;
mkdirSync(out, { recursive: true });
const SR = 32000;
for (const f of readdirSync(`${root}src/audio`).filter((f) => f.endsWith('.opus')).sort()) {
  const id = f.replace('.opus', '');
  const wav = readFileSync(`${scratch}/${id}.wav`);
  const n = (wav.length - 44) / 4;
  const secs = Math.floor(n / SR);
  if (secs <= 31) {
    copyFileSync(`${root}src/audio/${f}`, `${out}/${f}`);
    console.log(`${id}: whole file (${secs} s)`);
    continue;
  }
  const power = new Float64Array(secs);
  for (let s = 0; s < secs; s++) {
    let e = 0;
    for (let i = s * SR; i < (s + 1) * SR; i += 4) {
      const l = wav.readInt16LE(44 + i * 4) / 32768;
      e += l * l;
    }
    power[s] = e;
  }
  let best = 0;
  let bestSum = -1;
  for (let s = 0; s + 30 <= secs - 1; s++) {
    let sum = 0;
    for (let k = 0; k < 30; k++) sum += power[s + k];
    if (sum > bestSum) {
      bestSum = sum;
      best = s;
    }
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(best), '-i', `${root}src/audio/${f}`, '-t', '30', '-c', 'copy', `${out}/${f}`]);
  console.log(`${id}: 30 s from ${best} s`);
}
