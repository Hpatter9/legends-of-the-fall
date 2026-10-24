// The camp (home) theme: D minor, gothic and unhurried. A music box opens it; the organ, strings and a harpsichord gather
// round a horn tune, and a second, higher tune climbs through a Neapolitan chord before the first comes back.
import { Song } from '../song.mjs';

const M1 = '5:1.5 ^1:.5 ^3:1 ^1:1 | ^1:1.5 6:.5 ^3:2 | ^3:2 5:1 ^3:1 | 7:1 ^2:1 ^4:1 ^2:1 | ^1:2 5:1 ^1:1 | ^3:1.5 ^1:.5 6:1 ^1:1 | ^4:2 ^1:1 6:1 | 5:1 7#:1 ^2:1 ^4:1';
const M1B = '5:1.5 ^1:.5 ^3:1 ^1:1 | ^1:1.5 6:.5 ^3:2 | ^3:2 5:1 ^3:1 | 7:1 ^2:1 ^4:1 ^2:1 | ^1:2 5:1 ^1:1 | ^3:1.5 ^1:.5 6:1 ^1:1 | ^4:2 6:1 ^2b:1 | 5:1 7#:1 ^2:1 ^4:1';
const M2 = '^1:1 ^4:1 ^6:2 | ^6:1 ^3:1 ^1:2 | ^5:2 ^3:1 ^5:1 | ^4:1 ^2:1 7:1 ^2:1 | ^6:2 ^4:1 ^1:1 | ^4:1 6:1 ^2b:2 | 5:1 7#:1 ^2:1 ^4:1 | ^4:1 ^2:1 7#:2';

export default function () {
  const s = new Song({ id: 'camp', bpm: 84, key: 'D', mode: 'min', bars: 32, target: 0.105, seed: 11, mix: { levels: { harpsi: 0.6, keys: 0.7, bass: 1.5, organ: 1.2 } } });
  s.prog(0, 'i VI III VII  i VI iv V7');
  s.prog(8, 'i VI III VII  i VI iv V7');
  s.prog(16, 'iv VI III VII  iv N V7 V7');
  s.prog(24, 'i VI III VII  i VI N V7');

  // the floor: an organ pedal and a slow bass, a bell on the sections
  s.pad('organ', 0, 32, { lo: 50, hi: 70, vel: 0.36, n: 3, o: { reg: 'flute', r: 0.6 } });
  s.bassline('organ', 0, 32, { pat: 'R...............', base: 26, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.4 } });
  s.bassline('bass', 8, 32, { pat: 'R...............', base: 33, vel: 0.7, len: 3.9, o: { dTau: 3, drive: 1.1, cut: 520 } });
  s.bassline('bass', 16, 24, { pat: 'R.......r.......', base: 33, vel: 0.75, len: 1.9, o: { dTau: 2, drive: 1.1, cut: 520 } });
  for (const bar of [0, 8, 16, 24]) s.add('bell', bar * 4, 4, 38, 0.6, { ring: 6 });
  s.add('bell', 28 * 4, 4, 33, 0.5, { ring: 6 });
  // strings and the organ's body
  s.pad('strings', 8, 32, { lo: 52, hi: 74, vel: 0.5 });
  s.pad('organ', 16, 32, { lo: 50, hi: 70, vel: 0.4, o: { reg: 'diapason' } });
  s.pad('choir', 16, 24, { lo: 57, hi: 76, vel: 0.5, o: { vowel: 'oh' } });
  s.pad('choir', 28, 32, { lo: 57, hi: 76, vel: 0.4, o: { vowel: 'oo' } });
  // the continuo
  s.arp('harpsi', 8, 16, { pat: '0..1..2..3..2..1', base: 57, step: 0.5, len: 1.2, vel: 0.46 });
  s.arp('harpsi', 16, 24, { pat: '0.1.2.3.4.3.2.1.', base: 57, step: 0.5, len: 1.2, vel: 0.5 });
  s.arp('harpsi', 24, 32, { pat: '0..1..2..3..2..1', base: 57, step: 0.5, len: 1.2, vel: 0.46 });
  s.timp(16, 24, { pat: 'R...............', vel: 0.55 });
  s.timp(30, 32, { pat: 'R.......R.R.R.R.', vel: 0.55 });
  // the tunes
  s.mel('mbox', 0, M1, { oct: 5, vel: 0.62 });
  s.mel('horn', 8, M1, { vel: 0.7 });
  s.mel('mbox', 8, M1, { oct: 6, vel: 0.35 });
  s.mel('horn', 16, M2, { vel: 0.74 });
  s.mel('strings', 16, M2, { vel: 0.5, oct: 4, o: { cut: 3200 } });
  s.mel('strings', 24, M1B, { vel: 0.62, oct: 4 });
  s.mel('organ', 24, M1B, { vel: 0.38, oct: 5, o: { reg: 'flute' } });
  s.mel('mbox', 24, M1B, { oct: 6, vel: 0.35 });
  return s;
}
