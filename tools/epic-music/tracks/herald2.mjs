// The bramble (herald two): A phrygian, 76 bpm. Plucked strings creep on the off-beats while a harpsichord winds a thorny line; the organ and choir stay low.
import { Song } from '../song.mjs';

const H = '^1:1 5:.5 ^1:.5 ^3:1 5:1 | ^2b:1.5 ^4:.5 ^6:1 ^4:1 | ^3:1 ^1:1 5:2 | ^6:1 ^4:1 ^2b:2 | ^2:1 ^4:1 ^2:1 7:1 | ^4:2 ^2b:1 ^4:1 | ^1:2 ^3:1 ^1:1 | ^2:1 ^4:1 ^2:1 7#:1';
const H2 = '^4:1 ^6:1 ^4:2 | ^4:2 ^2b:2 | ^2:2 ^4:2 | ^2:2 7#:2';

export default function () {
  const s = new Song({ id: 'herald2', bpm: 76, key: 'A', mode: 'min', bars: 20, target: 0.1, seed: 151, kbps: 30, mix: { levels: { harpsi: 0.8, stac: 1.1 } } });
  s.prog(0, 'i N i N  VII N i V7');
  s.prog(8, 'i N i N  VII N i V7');
  s.prog(16, 'iv N V7 V7');
  s.bassline('organ', 0, 20, { pat: 'R...............', base: 21, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.5 } });
  s.pad('strings', 0, 20, { lo: 45, hi: 67, vel: 0.4 });
  s.pad('choir', 8, 20, { lo: 52, hi: 72, vel: 0.4, o: { vowel: 'oo' } });
  s.stab('pizz', 0, 20, { pat: '..x...x.', step: 0.5, vel: 0.62, lo: 48, hi: 70, n: 3, len: 0.5 });
  s.bassline('stac', 0, 20, { pat: 'r..r..r.', step: 0.5, base: 33, vel: 0.5, len: 0.6 });
  s.timp(8, 20, { pat: 'R.......R.......', vel: 0.6, base: 33 });
  s.mel('harpsi', 0, H, { vel: 0.7, oct: 3 });
  s.mel('harpsi', 8, H, { vel: 0.72, oct: 3 });
  s.mel('strings', 8, H, { vel: 0.4, oct: 3, o: { stac: false } });
  s.mel('harpsi', 16, H2, { vel: 0.74, oct: 3 });
  s.mel('horn', 16, H2, { vel: 0.5, oct: 3 });
  s.kit(8, 20, { groove: { kick: 'X.......x.......', snare: '', hat: '' }, vel: 0.6 });
  s.swellTo(8 * 4, 8, 0.5);
  return s;
}
