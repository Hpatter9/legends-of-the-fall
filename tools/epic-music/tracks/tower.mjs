// The tower: C minor, slow and vast. A bell and an organ pedal open a hall; staccato strings and a harpsichord start to
// climb; a horn theme, the choir and a march of taiko take the middle; and the end thins to bells and a piano.
import { Song } from '../song.mjs';
import { bed } from './_layers.mjs';

const N1 = '5:2 ^1:2 | ^3:2 ^1:1 6:1 | ^5:2 ^3:1 ^5:1 | ^2:2 ^4:1 ^2:1 | ^1:1.5 ^4:.5 ^6:1 ^4:1 | ^2b:2 ^4:1 ^6:1 | ^2:1 ^4:1 ^2:1 7#:1 | 5:3 7#:1';
const N2 = '^3:2 ^1:2 | ^2:2 ^4:2 | ^5:2 ^3:1 ^1:1 | ^3:1 ^1:1 5:2 | ^6:2 ^4:1 ^1:1 | ^4:1 ^2b:1 ^6:2 | ^4:1.5 ^2:.5 ^4:1 ^2:1 | ^2:2 7#:2';

export default function () {
  const s = new Song({ id: 'tower', bpm: 92, key: 'C', mode: 'min', bars: 36, target: 0.12, seed: 71, mix: { levels: { timp: 1.2, organ: 1.15, bells: 1.1 }, hallLevel: 0.85 } });
  s.prog(0, 'i i VI VI  iv iv V7 V7');
  s.prog(8, 'i VI III VII  iv N V7 V7');
  s.prog(16, 'i VI III VII  iv N V7 V7');
  s.prog(24, 'VI VII i i  iv N V7 V7');
  s.prog(32, 'i VI iv V7');

  // an opening hall: organ pedal, a bell, a drifting choir
  s.bassline('organ', 0, 36, { pat: 'R...............', base: 24, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.5 } });
  s.pad('organ', 0, 8, { lo: 48, hi: 67, vel: 0.4, o: { reg: 'flute', r: 0.6 } });
  s.pad('choir', 0, 8, { lo: 55, hi: 75, vel: 0.5, o: { vowel: 'oo' } });
  s.add('bell', 0, 4, 36, 0.7, { ring: 7 });
  s.add('bell', 16, 4, 43, 0.5, { ring: 6 });
  s.add('bell', 32, 4, 39, 0.5, { ring: 6 });
  s.arp('mbox', 0, 8, { pat: '0...2...1...3...', base: 72, step: 0.5, len: 2, vel: 0.4 });
  // the climb: low staccato strings, harpsichord, timpani
  s.bassline('stac', 8, 32, { pat: 'r.r.r.r.r.r.r.r.', base: 36, vel: 0.58, len: 0.6 });
  s.bassline('bass', 8, 32, { pat: 'R.......r.......', base: 24, vel: 0.7, len: 1.8, o: { dTau: 2, cut: 560 } });
  s.arp('harpsi', 8, 16, { pat: '0.12.3.4.3.2.1.0', base: 55, vel: 0.5 });
  s.arp('harpsi', 16, 24, { pat: '0123432101234321', base: 55, vel: 0.5 });
  s.timp(8, 32, { pat: 'R.....R.R.......', vel: 0.7, base: 36 });
  bed(s, 8, 16, { strings: 0.5, organ: 0.38, reg: 'diapason', lo: 51, hi: 74 });
  bed(s, 16, 32, { strings: 0.62, organ: 0.42, choir: 0.6, lo: 51, hi: 76 });
  // the theme
  s.mel('horn', 8, N1, { vel: 0.72 });
  s.mel('strings', 8, N1, { vel: 0.42, oct: 4 });
  s.mel('horn', 16, N1, { vel: 0.8 });
  s.mel('brass', 16, N1, { vel: 0.5, oct: 3 });
  s.mel('horn', 24, N2, { vel: 0.8 });
  s.mel('strings', 24, N2, { vel: 0.55, oct: 4 });
  s.mel('organ', 24, N2, { vel: 0.4, oct: 4, o: { reg: 'reed' } });
  // taiko marches
  s.kit(16, 32, { groove: 'march', vel: 0.65, skip: ['hat'], fills: [23, 31], crash: [16, 24] });
  for (let bar = 16; bar < 32; bar++) s.hit('taiko', bar * 4, 0.8), s.hit('taiko', bar * 4 + 2, 0.6);
  s.stab('brass', 24, 32, { pat: 'X.......x.......', step: 0.25, vel: 0.7, lo: 48, hi: 68, n: 3 });
  s.swellTo(16 * 4, 8, 0.6);
  s.swellTo(24 * 4, 8, 0.7);
  // the thinning: piano, bells and a held choir back to the start
  s.pad('strings', 32, 36, { lo: 51, hi: 72, vel: 0.46 });
  s.pad('choir', 32, 36, { lo: 55, hi: 75, vel: 0.4, o: { vowel: 'oo' } });
  s.mel('piano', 32, '5:1 ^1:1 ^3:1 ^1:1 | ^1:1.5 6:.5 ^3:2 | ^4:1 6:1 ^1:1 6:1 | 5:1 7#:1 ^2:2', { vel: 0.5, oct: 4 });
  s.mel('piano', 32, '1:4 | 6:4 | 4:4 | 5:4', { vel: 0.4, oct: 2 });
  return s;
}
