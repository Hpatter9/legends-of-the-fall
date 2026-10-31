// Levels the music: `node tools/epic-music/level.mjs [id ...]` brings each file in src/audio/ (all of them with no ids) to the one
// loudness target (`loudness.mjs`: -18 LUFS integrated, true peaks under -1 dBTP) and records the measures in `loudness.json`.
// A track just rendered is levelled from its WAV in the scratch folder (`--out DIR`, as `render.mjs`), so it is encoded once;
// any other file is decoded and encoded again at its own bitrate. `--check` only meters the files and prints the table.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, renameSync, statSync } from 'node:fs';
import { level, meter, readTable, writeTable, TARGET, TOLERANCE } from './loudness.mjs';

const args = process.argv.slice(2);
const optIdx = args.indexOf('--out');
const scratch = optIdx >= 0 ? args[optIdx + 1] : '/tmp/epic-music';
const ids0 = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
const root = new URL('../../', import.meta.url).pathname;
const all = readdirSync(`${root}src/audio`).filter((f) => f.endsWith('.opus')).map((f) => f.replace('.opus', '')).sort();
const ids = ids0.length ? ids0 : all;

/** The bitrate a shipped file was encoded at (several were not rendered from the songs as they now stand, so the song's own
 *  `kbps` is not always theirs): its average less the container's kilobit, to the nearest of the rates the music uses. */
function kbpsOf(file) {
  const avg = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=bit_rate', '-of', 'csv=p=0', file], { encoding: 'utf8' })) / 1000 - 1;
  return [30, 32, 37].reduce((a, b) => (Math.abs(b - avg) < Math.abs(a - avg) ? b : a));
}

const table = readTable();
for (const id of ids) {
  const dest = `${root}src/audio/${id}.opus`;
  if (args.includes('--check')) {
    const m = meter(dest);
    const off = m.lufs - TARGET;
    console.log(`${id.padEnd(10)} ${m.lufs.toFixed(1)} LUFS  ${m.tp.toFixed(1)} dBTP  ${Math.abs(off) <= TOLERANCE ? 'ok' : `OFF by ${off.toFixed(1)} LU`}`);
    continue;
  }
  const wav = `${scratch}/${id}.wav`;
  const fresh = existsSync(wav) && existsSync(dest) && statSync(wav).mtimeMs >= statSync(dest).mtimeMs - 60_000;
  // (a fresh render at its song's own bitrate, as `render.mjs` encodes it; a shipped file at its own)
  const kbps = fresh ? (await import(`./tracks/${id}.mjs`)).default().kbps ?? 37 : kbpsOf(dest);
  let src = wav;
  if (!fresh) {
    // (the shipped file is the source: it is moved aside, decoded and encoded again)
    src = `${scratch}/${id}.src.opus`;
    renameSync(dest, src);
  }
  const before = table.files[id]?.before ?? meter(fresh ? dest : src);
  const r = level(src, dest, kbps);
  table.files[id] = { lufs: r.after.lufs, tp: r.after.tp, before: { lufs: before.lufs, tp: before.tp } };
  console.log(`${id.padEnd(10)} ${before.lufs.toFixed(1)} -> ${r.after.lufs.toFixed(1)} LUFS  (gain ${r.gain} dB${r.limited ? ', limited' : ''})  peak ${before.tp.toFixed(1)} -> ${r.after.tp.toFixed(1)} dBTP  ${(statSync(dest).size / 1024).toFixed(0)} KB${fresh ? '  (from the render)' : ''}`);
}
if (!args.includes('--check')) writeTable(table);
