// The boss: D minor with a flat second. An organ states the theme alone over a gong; then the whole band, the choir
// and the brass; a harpsichord-and-organ canon breaks it down before the last, loudest statement.
import { Song } from '../song.mjs';
import { band, bed } from './_layers.mjs';

const T1 = '5:1 ^1:1 ^3:1 ^1:1 | ^2b:1.5 ^4:.5 ^6:1 ^4:1 | ^3:1 ^1:1 5:2 | 5:1 7#:1 ^2:1 ^4:1 | ^5:2 ^3:1 ^1:1 | ^6:1 ^4:1 ^2b:2 | ^2:1 ^4:1 ^2:1 7#:1 | 5:3 7#:1';
const T2 = '^1:2 ^3:2 | ^2:2 ^4:2 | ^5:2 ^3:1 ^1:1 | ^3:1 ^1:1 5:2 | ^1:1 ^3:1 ^6:2 | ^4:1 ^2:1 ^4:2 | ^6:2 ^4:1 ^2b:1 | ^2:1 ^4:1 ^2:1 7#:1';
const BR = '^4:2 ^6:2 | ^3:2 ^2:2 | ^6:2 ^4:2 | ^4:2 ^2b:2 | ^6:2 ^4:2 | ^1:2 ^3:2 | ^2:2 ^4:2 | ^2:2 7#:2';

export default function () {
  const s = new Song({ id: 'boss', bpm: 150, key: 'D', mode: 'min', bars: 56, target: 0.185, seed: 61, mix: { levels: { timp: 1.2, organ: 1.15 } } });
  const P1 = 'i N i V7  i N V7 V7';
  s.prog(0, P1);
  s.prog(8, P1);
  s.prog(16, P1);
  s.prog(24, 'VI VII i i  VI VII N V7');
  s.prog(32, 'VI VII i i  VI VII N V7');
  s.prog(40, 'iv i+V7 iv N  viio7 i V7 V7');
  s.prog(48, P1);

  // the organ alone
  s.mel('organ', 0, T1, { vel: 0.72, o: { reg: 'full', trem: 5.6 } });
  s.mel('organ', 0, T1, { vel: 0.5, oct: 3, o: { reg: 'diapason' } });
  s.bassline('organ', 0, 8, { pat: 'R...............', base: 26, vel: 0.62, len: 3.95, o: { reg: 'pedal', r: 0.4 } });
  s.add('drum', 0, 0, 'gong', 0.8, {});
  s.timp(0, 8, { pat: 'R.......R.......', vel: 0.62 });
  s.pad('choir', 4, 8, { lo: 57, hi: 79, vel: 0.5, o: { vowel: 'oo' } });
  s.pad('strings', 4, 8, { lo: 50, hi: 69, vel: 0.45 });
  s.swellTo(8 * 4, 8, 0.7);
  // the band takes the theme
  band(s, 8, 16, { bass: 'r.r.r.r.r.r.r.r.', chug: 'r.rrr.r.r.rrr.r.', groove: 'drive', fills: [15], crash: [8], timp: 'R.......R.......', base: 26, gbase: 38 });
  band(s, 16, 24, { bass: 'rrorrrorrrorrror', chug: 'r.rr.r.rr.rr.r.r', groove: 'gallop', fills: [23], crash: [16], timp: 'R.R.....R.R.....', base: 26, gbase: 38, vel: 1.02 });
  bed(s, 8, 16, { strings: 0.5, organ: 0.38, choir: 0.35, lo: 53, hi: 76 });
  bed(s, 16, 24, { strings: 0.62, organ: 0.42, choir: 0.5, lo: 53, hi: 76 });
  s.arp('stac', 8, 16, { pat: '0123210012321001', base: 57, vel: 0.5 });
  s.arp('stac', 16, 24, { pat: '0123432101234321', base: 57, vel: 0.58 });
  s.stab('brass', 16, 24, { pat: 'X.....x.X.......', step: 0.25, vel: 0.74, lo: 50, hi: 70, n: 3 });
  s.mel('guitar', 8, T1, { vel: 0.78, o: { slide: 2 } });
  s.mel('horn', 8, T1, { vel: 0.55 });
  s.mel('guitar', 16, T1, { vel: 0.86, o: { slide: 2 } });
  s.mel('brass', 16, T1, { vel: 0.6, oct: 3 });
  s.mel('organ', 16, T1, { vel: 0.4, oct: 4, o: { reg: 'reed' } });
  // the second theme, grand
  band(s, 24, 32, { bass: 'r.rrr.rrr.rrr.rr', chug: 'r.rrr.rrr.rrr.rr', groove: 'drive', fills: [31], crash: [24], timp: 'R...R...R...R...', base: 26, gbase: 38 });
  band(s, 32, 40, { bass: 'rrrrrrrrrrrrrrrr', chug: 'rrrrrrrrrrrrrrrr', groove: 'gallop', fills: [39], crash: [32], timp: 'R.R.R.R.R.R.R.R.', base: 26, gbase: 38, vel: 1.08 });
  bed(s, 24, 32, { strings: 0.66, organ: 0.44, choir: 0.7, lo: 53, hi: 78 });
  bed(s, 32, 40, { strings: 0.72, organ: 0.46, choir: 0.82, lo: 53, hi: 78 });
  s.arp('stac', 24, 40, { pat: '0123432101234321', base: 57, vel: 0.6 });
  s.stab('brass', 24, 40, { pat: 'X..x..x.X..x..x.', step: 0.25, vel: 0.84, lo: 50, hi: 70, n: 3 });
  s.mel('guitar', 24, T2, { vel: 0.82, o: { slide: 1.5 } });
  s.mel('horn', 24, T2, { vel: 0.7 });
  s.mel('guitar', 32, T2, { vel: 0.9, o: { slide: 1.5 } });
  s.mel('brass', 32, T2, { vel: 0.74, oct: 3 });
  s.mel('horn', 32, T2, { vel: 0.68 });
  for (let bar = 24; bar < 40; bar++) s.hit('taiko', bar * 4, 0.8), s.hit('taiko', bar * 4 + 2, 0.55);
  // the breakdown
  band(s, 40, 48, { bass: 'R...R...R...R.rr', groove: 'halftime', fills: [47], crash: [40], noChug: true, timp: 'R...............', base: 26, vel: 0.9 });
  bed(s, 40, 48, { strings: 0.55, organ: 0.4, reg: 'diapason', choir: 0.4, vowel: 'oo', lo: 53, hi: 76 });
  s.arp('harpsi', 40, 48, { pat: '0120121201201212', base: 57, vel: 0.62 });
  s.mel('organ', 40, BR, { vel: 0.55, o: { reg: 'flute' } });
  s.swellTo(48 * 4, 8, 0.85);
  // the last statement, everything
  band(s, 48, 56, { bass: 'rrorrrorrrorrror', chug: 'rrrrrrrrrrrrrrrr', groove: 'gallop', fills: [55], crash: [48], timp: 'R.R.R.R.R.R.R.R.', base: 26, gbase: 38, vel: 1.1 });
  bed(s, 48, 56, { strings: 0.74, organ: 0.5, choir: 0.85, lo: 53, hi: 78 });
  s.arp('stac', 48, 56, { pat: '0123432101234321', base: 57, vel: 0.64 });
  s.stab('brass', 48, 56, { pat: 'X..x..x.X..x..x.', step: 0.25, vel: 0.86, lo: 50, hi: 70, n: 3 });
  s.mel('guitar', 48, T1, { vel: 0.92, o: { slide: 2 } });
  s.mel('brass', 48, T1, { vel: 0.7, oct: 3 });
  s.mel('horn', 48, T1, { vel: 0.68 });
  s.mel('organ', 48, T1, { vel: 0.5, oct: 4, o: { reg: 'reed' } });
  for (let bar = 48; bar < 56; bar++) s.hit('taiko', bar * 4, 0.85), s.hit('taiko', bar * 4 + 2, 0.6);
  s.swellTo(56 * 4 - 0.01, 4, 0.75);
  return s;
}
