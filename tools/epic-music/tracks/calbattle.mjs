// The Calamity battle: F# minor, 184 bpm and the darkest of the four. Rapid harpsichord and strings over a double-kick
// gallop, reed organ and choir on the second theme, the guitar high over everything.
import { Song } from '../song.mjs';
import { band, bed } from './_layers.mjs';

const A = '^5:1.5 ^3:.5 ^1:1 5:1 | ^4:1.5 ^2b:.5 ^4:1 ^6:1 | ^1:1 ^3:1 ^5:1 ^3:1 | ^4:1.5 ^2:.5 7:2 | ^6:1 ^3:1 ^1:2 | ^4:1 ^2:1 7:2 | ^2b:1.5 ^4:.5 ^6:2 | ^2:1 ^4:1 ^2:1 7#:1';
const B = '^1:2 ^3:2 | ^2:2 ^4:2 | ^5:2 ^3:1 ^1:1 | ^3:1 ^1:1 5:2 | ^1:1 ^3:1 ^6:2 | ^4:1 ^2:1 ^4:2 | ^6:2 ^4:1 ^2b:1 | ^2:1 ^4:1 ^2:1 7#:1';

export default function () {
  const s = new Song({ id: 'calbattle', bpm: 184, key: 'F#', mode: 'min', bars: 48, target: 0.19, seed: 91, mix: { levels: { chug: 1.15, timp: 1.2, organ: 1.1 } } });
  s.prog(0, 'i*4');
  s.prog(4, 'i N i VII  VI VII N V7');
  s.prog(12, 'VI VII i i  VI VII N V7');
  s.prog(20, 'iv i+V7 iv N  viio7 i V7 V7');
  s.prog(28, 'i N i VII  VI VII N V7');
  s.prog(36, 'VI VII i i  VI VII N V7');
  s.prog(44, 'i N VII V7');

  // a tolling start
  s.add('bell', 0, 4, 42, 0.8, { ring: 8 });
  s.add('drum', 0, 0, 'gong', 0.8, {});
  s.timp(0, 4, { pat: 'R...R.R.R...R.R.', vel: 0.85, base: 42 });
  s.bassline('chug', 0, 4, { pat: 'r.rr.r.r..rr.r.r', base: 42, vel: 0.7, len: 0.5, o: { mute: true } });
  s.pad('choir', 0, 4, { lo: 54, hi: 74, vel: 0.55, o: { vowel: 'oo' } });
  s.pad('organ', 0, 48, { lo: 42, hi: 66, vel: 0.4, o: { reg: 'reed' } });
  band(s, 4, 12, { bass: 'rrorrrorrrorrror', chug: 'r.rr.r.rr.rr.r.r', groove: 'gallop', fills: [11], crash: [4], timp: 'R.......R.......', base: 30, gbase: 42 });
  band(s, 12, 20, { bass: 'r.rrr.rrr.rrr.rr', chug: 'r.rrr.rrr.rrr.rr', groove: 'gallop', fills: [19], crash: [12], timp: 'R...R...R...R...', base: 30, gbase: 42 });
  band(s, 20, 28, { bass: 'R...R...R...R.rr', groove: 'halftime', fills: [27], crash: [20], noChug: true, timp: 'R...............', base: 30, vel: 0.9 });
  band(s, 28, 36, { bass: 'rrrrrrrrrrrrrrrr', chug: 'rrrrrrrrrrrrrrrr', groove: 'gallop', fills: [35], crash: [28], timp: 'R.R.R.R.R.R.R.R.', base: 30, gbase: 42, vel: 1.06 });
  band(s, 36, 44, { bass: 'rrorrrorrrorrror', chug: 'rrrrrrrrrrrrrrrr', groove: 'gallop', fills: [43], crash: [36], timp: 'R.R.R.R.R.R.R.R.', base: 30, gbase: 42, vel: 1.1 });
  band(s, 44, 48, { bass: 'r.rrr.rrr.rrr.rr', chug: 'r.rrr.rrr.rrr.rr', groove: 'gallop', fills: [47], crash: [44], timp: 'R.......R.R.....', base: 30, gbase: 42 });
  for (const [a, z] of [[4, 20], [28, 44]]) for (let bar = a; bar < z; bar++) s.hit('taiko', bar * 4, 0.85), s.hit('taiko', bar * 4 + 2, 0.6);
  bed(s, 4, 12, { strings: 0.5, organ: 0, choir: 0.4, lo: 54, hi: 76 });
  bed(s, 12, 20, { strings: 0.66, organ: 0, choir: 0.7, lo: 54, hi: 76 });
  bed(s, 20, 28, { strings: 0.55, organ: 0.4, reg: 'diapason', choir: 0.35, vowel: 'oo', lo: 54, hi: 76 });
  bed(s, 28, 36, { strings: 0.64, organ: 0, choir: 0.55, lo: 54, hi: 76 });
  bed(s, 36, 44, { strings: 0.72, organ: 0, choir: 0.82, lo: 54, hi: 77 });
  bed(s, 44, 48, { strings: 0.62, organ: 0, choir: 0.5, lo: 54, hi: 76 });
  s.arp('harpsi', 4, 12, { pat: '0123432101234321', base: 54, vel: 0.62 });
  s.arp('stac', 12, 20, { pat: '0123432101234321', base: 54, vel: 0.58 });
  s.arp('harpsi', 20, 28, { pat: '0120121201201212', base: 54, vel: 0.66 });
  s.arp('stac', 28, 48, { pat: '0123432101234321', base: 54, vel: 0.64 });
  s.stab('brass', 12, 20, { pat: 'X..x..x.X.......', step: 0.25, vel: 0.78, lo: 50, hi: 70, n: 3 });
  s.stab('brass', 36, 44, { pat: 'X..x..x.X..x..x.', step: 0.25, vel: 0.86, lo: 50, hi: 70, n: 3 });
  s.mel('guitar', 4, A, { vel: 0.82, o: { slide: 2 } });
  s.mel('horn', 4, A, { vel: 0.55 });
  s.mel('horn', 12, B, { vel: 0.74 });
  s.mel('guitar', 12, B, { vel: 0.72, o: { slide: 1.5 } });
  s.mel('organ', 20, '^4:2 ^6:2 | ^3:2 ^2:2 | ^6:2 ^4:2 | ^4:2 ^2b:2 | ^6:2 ^4:2 | ^1:2 ^3:2 | ^2:2 ^4:2 | ^2:2 7#:2', { vel: 0.5, o: { reg: 'flute' } });
  s.mel('guitar', 28, A, { vel: 0.88, o: { slide: 2 } });
  s.mel('brass', 28, A, { vel: 0.62, oct: 3 });
  s.mel('guitar', 36, B, { vel: 0.9, o: { slide: 1.5 } });
  s.mel('brass', 36, B, { vel: 0.7, oct: 3 });
  s.mel('horn', 36, B, { vel: 0.66 });
  s.swellTo(20 * 4, 8, 0.8);
  s.swellTo(28 * 4, 8, 0.85);
  s.swellTo(36 * 4, 4, 0.85);
  s.swellTo(48 * 4 - 0.01, 4, 0.7);
  return s;
}
