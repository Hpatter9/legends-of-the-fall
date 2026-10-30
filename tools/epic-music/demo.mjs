// The theme demo, for listening to the main theme on its own (not shipped): the tune on a plain synth lead and a piano over
// held chords, a bass and a light kit, in D minor at 150 bpm. `node tools/epic-music/demo.mjs <out-folder>` writes
// theme-demo.wav and theme-demo.mp3 there.

import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SR } from './dsp.mjs';
import { arrange } from './theme.mjs';

const out = process.argv[2] ?? '/tmp/epic-music';
const s = arrange({
  id: 'demo', key: 'D', bpm: 150, seed: 5, target: 0.15,
  layers: [
    { kind: 'mel', inst: 'lead', oct: 4, vel: 0.8, glide: 0.6, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'piano', oct: 4, vel: 0.55, in: ['A', 'B', 'C', 'A2', 'B2'] },
    { kind: 'pad', inst: 'strings', lo: 50, hi: 69, vel: 0.45, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'bass', inst: 'bass', base: 26, vel: 0.75, pat: 'r.r.r.r.r.r.r.r.', in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
  ],
  drums: { vel: 0.7, groove: { A: 'rock', B: 'rock', C: 'halftime', A2: 'rock', B2: 'rock' } },
});
const { L, R, N } = s.render();
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4);
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4);
}
writeFileSync(`${out}/theme-demo.wav`, buf);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${out}/theme-demo.wav`, '-c:a', 'libmp3lame', '-b:a', '160k', `${out}/theme-demo.mp3`]);
console.log(`theme-demo: ${(N / SR).toFixed(1)} s · melody on chord tones ${(s.review().share * 100).toFixed(0)}%`);
for (const o of s.review().odd) console.log(`   ${o}`);
