// Triumph: C major, 104 bpm. A bright fanfare over a light kit, brass and horn trading the tune, a choir, bells and a bouncing organ.
import { Song } from '../song.mjs';

const P1 = '5:1 ^1:1 ^3:2 | ^2:1 ^5:1 ^7:2 | ^3:1.5 ^1:.5 6:2 | ^5:1 ^3:1 ^5:1 ^7:1 | ^4:1 ^6:1 ^4:1 ^1:1 | ^3:2 ^5:2 | ^4:1.5 ^6:.5 ^4:2 | ^2:1 ^5:1 ^7:1 ^2:1';
const P2 = '5:1 ^1:1 ^3:2 | ^2:1 ^5:1 ^7:2 | ^3:1.5 ^1:.5 6:2 | ^5:1 ^3:1 ^5:1 ^7:1 | ^4:1 ^6:1 ^4:1 ^1:1 | ^2:1 ^4:1 ^6:2 | ^2:1 ^4:1 ^2:1 7:1 | ^3:2 ^1:2';
const P3 = '^4:2 ^6:2 | ^2:2 ^5:2 | ^1:4 | ^1:4';

export default function () {
  const s = new Song({ id: 'triumph', bpm: 104, key: 'C', mode: 'maj', bars: 20, target: 0.15, seed: 201, kbps: 30, mix: { levels: { timp: 1.2, brass: 1.1 } } });
  s.prog(0, 'I V vi iii  IV I IV V');
  s.prog(8, 'I V vi iii  IV ii V7 I');
  s.prog(16, 'IV V I I');
  s.bassline('bass', 0, 20, { pat: 'R.r.R.r.R.r.R.r.', base: 36, vel: 0.7, len: 0.7 });
  s.bassline('organ', 0, 20, { pat: 'R...............', base: 24, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.5 } });
  s.pad('strings', 0, 20, { lo: 52, hi: 76, vel: 0.6 });
  s.pad('organ', 0, 20, { lo: 48, hi: 70, vel: 0.4, o: { reg: 'full' } });
  s.pad('choir', 8, 20, { lo: 57, hi: 79, vel: 0.62 });
  s.arp('stac', 8, 20, { pat: '0123432101234321', base: 60, vel: 0.5 });
  s.stab('brass', 0, 20, { pat: 'X...x...', step: 0.5, vel: 0.62, lo: 52, hi: 72, n: 3, len: 0.5 });
  s.timp(0, 20, { pat: 'R.......R.R.....', vel: 0.8, base: 36 });
  s.kit(0, 20, { groove: 'dance', vel: 0.7, fills: [7, 15], crash: [0, 8, 16], skip: ['openhat'] });
  s.mel('horn', 0, P1, { vel: 0.8 });
  s.mel('brass', 0, P1, { vel: 0.55, oct: 3 });
  s.mel('horn', 8, P2, { vel: 0.8 });
  s.mel('strings', 8, P2, { vel: 0.5, oct: 4 });
  s.mel('brass', 8, P2, { vel: 0.66, oct: 3 });
  s.mel('horn', 16, P3, { vel: 0.8 });
  s.mel('brass', 16, P3, { vel: 0.7, oct: 3 });
  for (const bar of [0, 8, 16]) s.add('bell', bar * 4, 4, 60, 0.5, { ring: 5 });
  s.swellTo(8 * 4, 4, 0.6);
  s.swellTo(16 * 4, 4, 0.65);
  s.swellTo(20 * 4 - 0.01, 4, 0.6);
  return s;
}
