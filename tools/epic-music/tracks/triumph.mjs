// Triumph: the main theme in D major at 104 bpm, the bed under a won battle's results (it follows the victory fanfare, in the
// same key) and the triumph scenes. The hook and the A section as a stately march on horn and trumpet, the B section on the
// strings with the brass answering, then a four-bar tag, over a light kit, a choir, bells and a bouncing organ.
import { Song } from '../song.mjs';
import { MELODY } from '../theme.mjs';

// (the theme's minor-key leading note is the major scale's own seventh)
const maj = (t) => t.replace(/7#/g, '7');
const TAG = '^4:.75 ^1:.75 ^4:.5 ^6:2 | ^5:.75 ^2:.75 ^5:.5 ^7:2 | ^1:.75 5:.75 ^1:.5 ^3:1 ^5:1 | ^1:4';

export default function () {
  const s = new Song({ id: 'triumph', bpm: 104, key: 'D', mode: 'maj', bars: 20, target: 0.15, seed: 201, kbps: 30, mix: { levels: { timp: 1.2, brass: 1.1 } } });
  s.prog(0, 'd1 d6 d3 d5_7  d1 d6 d4+d5 d1');
  s.prog(8, 'd6 d5_7 d3 d1  d4 d1 d6+d5_7 d5');
  s.prog(16, 'd4 d5 d1 d1');
  s.bassline('bass', 0, 20, { pat: 'R.r.R.r.R.r.R.r.', base: 38, vel: 0.7, len: 0.7 });
  s.bassline('organ', 0, 20, { pat: 'R...............', base: 26, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.5 } });
  s.pad('strings', 0, 20, { lo: 52, hi: 74, vel: 0.55 });
  s.pad('organ', 0, 20, { lo: 50, hi: 70, vel: 0.36, o: { reg: 'full' } });
  s.pad('choir', 8, 20, { lo: 57, hi: 79, vel: 0.58 });
  s.arp('stac', 8, 16, { pat: '0123432101234321', base: 62, vel: 0.48 });
  s.stab('brass', 0, 8, { pat: 'X..X..X.X...x...', step: 0.25, vel: 0.6, lo: 52, hi: 72, n: 3, len: 0.5 });
  s.stab('brass', 16, 20, { pat: 'X..X..X.X...x...', step: 0.25, vel: 0.62, lo: 52, hi: 72, n: 3, len: 0.5 });
  s.timp(0, 20, { pat: 'R.......R.R.....', vel: 0.8, base: 38 });
  s.kit(0, 20, { groove: 'march', vel: 0.7, fills: [7, 15], crash: [0, 8, 16] });
  s.mel('horn', 0, maj(MELODY.A), { vel: 0.8, oct: 3 });
  s.mel('trumpet', 0, maj(MELODY.A), { vel: 0.6 });
  s.mel('violins', 8, maj(MELODY.B), { vel: 0.62 });
  s.mel('horn', 8, maj(MELODY.B), { vel: 0.55, oct: 3 });
  s.mel('trumpet', 16, TAG, { vel: 0.75 });
  s.mel('horn', 16, TAG, { vel: 0.7, oct: 3 });
  for (const bar of [0, 8, 16]) s.add('bell', bar * 4, 4, 62, 0.5, { ring: 5 });
  s.swellTo(8 * 4, 4, 0.6);
  s.swellTo(16 * 4, 4, 0.65);
  s.swellTo(20 * 4 - 0.01, 4, 0.6);
  return s;
}
