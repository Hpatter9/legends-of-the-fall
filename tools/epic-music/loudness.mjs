// The music's loudness: one target for every file (the owner: "level their volumes"; docs/notes/battle-music-2.md). Each file is
// metered to EBU R128 (ITU-R BS.1770: K-weighted, gated integrated loudness in LUFS, and the true peak in dBTP) with ffmpeg's
// `ebur128` filter, and brought to TARGET by a plain gain (and, only where that gain would push the true peak over PEAK_MAX, a
// look-ahead limiter on the few peaks over it), then encoded to Opus. A gain is the same at every sample, so a loop's seam stays
// as smooth as it was. The measured table is kept in `loudness.json` next to this file; `test/music-loudness.test.ts` checks it.

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

/** Every music file's integrated loudness (LUFS) and how far from it a file may sit (LU). */
export const TARGET = -18;
export const TOLERANCE = 1;
/** The highest true peak a file may have (dBTP). */
export const PEAK_MAX = -1;

export const TABLE = new URL('./loudness.json', import.meta.url).pathname;


/** A file's integrated loudness (LUFS) and true peak (dBTP), from the meter's summary (ffmpeg writes it to stderr). */
export function meter(file) {
  const r = spawnSync('ffmpeg', ['-nostats', '-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 << 20 }).stderr ?? '';
  const sum = r.slice(r.lastIndexOf('Summary:'));
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1]);
  const tp = Number(/Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(sum)?.[1]);
  if (!Number.isFinite(lufs)) throw new Error(`${file}: no loudness`);
  return { lufs, tp };
}

/** Encodes `src` (any file ffmpeg reads) to the Opus file `dest` at `kbps`, with the gain (dB) and, when `limit` is set, a
 *  limiter holding the samples under that level (dBFS). */
export function encode(src, dest, kbps, gainDb, limit = null) {
  const af = [`volume=${gainDb.toFixed(2)}dB`];
  if (limit !== null) af.push(`alimiter=limit=${(10 ** (limit / 20)).toFixed(4)}:level=disabled:latency=1:attack=4:release=60`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', af.join(','), '-c:a', 'libopus', '-b:a', `${kbps}k`, '-vbr', 'constrained', '-application', 'audio', '-compression_level', '10', dest]);
}

/** Brings `src` to the target and writes it to `dest` (Opus): the gain from its own meter, encoded, metered again and the gain
 *  corrected once if the encoder moved it (Opus shifts loudness a tenth or two), with the limiter only where the peak needs it. */
export function level(src, dest, kbps) {
  const before = meter(src);
  let gain = TARGET - before.lufs;
  let limit = before.tp + gain > PEAK_MAX - 0.3 ? PEAK_MAX - 1.2 : null;
  let after = null;
  for (let pass = 0; pass < 3; pass++) {
    encode(src, dest, kbps, gain, limit);
    after = meter(dest);
    const off = TARGET - after.lufs;
    if (after.tp > PEAK_MAX && limit === null) limit = PEAK_MAX - 1.2;
    else if (after.tp > PEAK_MAX) limit -= 0.5;
    else if (Math.abs(off) <= 0.15) break;
    gain += off;
  }
  return { before, after, gain: +gain.toFixed(2), limited: limit !== null };
}

/** The stored table: `{ target, tolerance, peakMax, files: { id: { lufs, tp, before? } } }`. */
export function readTable() {
  try {
    return JSON.parse(readFileSync(TABLE, 'utf8'));
  } catch {
    return { target: TARGET, tolerance: TOLERANCE, peakMax: PEAK_MAX, files: {} };
  }
}

export function writeTable(t) {
  const files = Object.fromEntries(Object.entries(t.files).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(TABLE, JSON.stringify({ target: TARGET, tolerance: TOLERANCE, peakMax: PEAK_MAX, files }, null, 1) + '\n');
}
