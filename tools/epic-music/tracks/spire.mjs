// The spire: D major, 98 bpm. Rising arpeggios on harpsichord and strings, a light kit, and a brass-and-horn tune that climbs.
import { Song } from '../song.mjs';

const R1 = '1:.5 2:.5 3:.5 4:.5 5:1 ^1:1 | 5:1 7:1 ^2:1 ^5:1 | ^3:1 ^1:1 6:1 ^1:1 | 3:1 5:1 7:1 5:1 | ^4:1 ^6:1 ^4:1 ^1:1 | ^1:1 ^3:1 ^5:2 | ^4:1.5 ^6:.5 ^4:1 ^1:1 | ^2:1 5:1 7:1 ^2:1';
const R2 = '^4:1 ^6:1 ^4:1 ^1:1 | ^2:1 ^4:1 ^6:2 | ^2:1 ^4:1 ^2:1 7:1 | ^1:2 ^3:2';
const R3 = '^4:2 ^6:2 | ^2:2 ^5:2 | ^3:2 ^1:2 | ^3:2 ^5:2 | ^2:2 ^4:2 | ^2:2 ^5:2 | ^1:2 ^3:2 | ^2:2 7:2';

export default function () {
  const s = new Song({ id: 'spire', bpm: 98, key: 'D', mode: 'maj', bars: 24, target: 0.14, seed: 231, kbps: 30, mix: { levels: { harpsi: 0.8, brass: 1.1 } } });
  s.prog(0, 'I V vi iii  IV I IV V');
  s.prog(8, 'I V vi iii  IV ii V7 I');
  s.prog(16, 'IV V vi iii  ii V I V7');
  s.bassline('bass', 0, 24, { pat: 'R.r.R.r.R.r.R.r.', base: 38, vel: 0.65, len: 0.7 });
  s.bassline('organ', 0, 24, { pat: 'R...............', base: 26, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.5 } });
  s.pad('strings', 0, 24, { lo: 52, hi: 76, vel: 0.52 });
  s.pad('organ', 8, 24, { lo: 48, hi: 70, vel: 0.36, o: { reg: 'diapason' } });
  s.arp('harpsi', 0, 8, { pat: '0123456543210123', base: 50, vel: 0.55 });
  s.arp('stac', 8, 24, { pat: '0123432101234321', base: 57, vel: 0.52 });
  s.stab('brass', 16, 24, { pat: 'X...x...', step: 0.5, vel: 0.66, lo: 52, hi: 72, n: 3, len: 0.5 });
  s.kit(8, 24, { groove: 'ride8', vel: 0.6, fills: [15, 23], crash: [8, 16] });
  s.timp(8, 24, { pat: 'R.......R.......', vel: 0.65, base: 38 });
  s.mel('horn', 0, R1, { vel: 0.72 });
  s.mel('horn', 8, `${R1.split(' | ').slice(0, 4).join(' | ')} | ${R2}`, { vel: 0.76 });
  s.mel('brass', 8, `${R1.split(' | ').slice(0, 4).join(' | ')} | ${R2}`, { vel: 0.6, oct: 3 });
  s.mel('horn', 16, R3, { vel: 0.8 });
  s.mel('brass', 16, R3, { vel: 0.66, oct: 3 });
  s.mel('strings', 16, R3, { vel: 0.5, oct: 4 });
  s.swellTo(8 * 4, 4, 0.55);
  s.swellTo(16 * 4, 4, 0.6);
  s.swellTo(24 * 4 - 0.01, 4, 0.55);
  return s;
}
