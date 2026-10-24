// Battle, the grand one: C# minor, 176 bpm. A full orchestra at a gallop: taiko and toms, brass fanfares, choir, strings
// at speed, and the guitar taking the tune at the top.
import { Song } from '../song.mjs';
import { band, bed } from './_layers.mjs';

const A = '^1:.5 ^3:.5 ^5:1 ^3:1 ^1:1 | ^3:1 ^1:1 6:2 | ^3:1 ^5:1 ^7:1 ^5:1 | ^2:1 ^4:1 ^2:1 7:1 | ^1:2 ^3:1 ^1:1 | ^3:1.5 ^1:.5 6:1 ^1:1 | ^4:1 ^6:1 ^4:1 ^1:1 | ^2:1 ^4:1 ^2:1 7#:1';
const B = '^1:1.5 ^3:.5 ^3:2 | ^2:1.5 ^4:.5 ^4:2 | ^5:2 ^3:1 ^1:1 | ^3:1 ^1:1 5:2 | ^1:1 ^3:1 ^6:2 | ^4:1 ^2:1 ^4:2 | ^6:2 ^4:1 ^1:1 | ^2:1 ^4:1 ^2:1 7#:1';

export default function () {
  const s = new Song({ id: 'battle3', bpm: 176, key: 'C#', mode: 'min', bars: 48, target: 0.19, seed: 51, mix: { levels: { timp: 1.2, brass: 1.1 } } });
  s.prog(0, 'i*4');
  s.prog(4, 'i VI III VII  i VI iv V7');
  s.prog(12, 'VI VII i i  VI VII iv V7');
  s.prog(20, 'iv V7 i VI  iv N V7 V7');
  s.prog(28, 'i VI III VII  i VI iv V7');
  s.prog(36, 'VI VII i i  VI VII iv V7');
  s.prog(44, 'i VI VII V7');

  // the fanfare over a roll
  s.stab('brass', 0, 4, { pat: 'X.......', step: 0.5, vel: 0.9, lo: 52, hi: 73, n: 4 });
  s.roll('timp', 0, 14, 37, 0.3, 0.95, 40);
  s.add('drum', 0, 0, 'gong', 0.7, {});
  s.hit('taiko', 12, 0.95);
  s.hit('taiko', 14, 0.95);
  s.hit('taiko', 15, 1);
  bed(s, 0, 4, { strings: 0.55, organ: 0.45, choir: 0.5 });
  band(s, 4, 12, { bass: 'rrorrrorrrorrror', chug: 'r.rr.r.rr.rr.r.r', groove: 'gallop', fills: [11], crash: [4], timp: 'R.......R.......' });
  band(s, 12, 20, { bass: 'r.rrr.rrr.rrr.rr', chug: 'r.rrr.rrr.rrr.rr', groove: 'gallop', fills: [19], crash: [12], timp: 'R...R...R...R...' });
  band(s, 20, 28, { bass: 'R...R.rrR...R.rr', chug: 'R...R.rrR...R.rr', groove: 'halftime', fills: [27], crash: [20], timp: 'R.......R.R.....', vel: 0.9 });
  band(s, 28, 36, { bass: 'rrorrrorrrorrror', chug: 'r.rr.r.rr.rr.r.r', groove: 'gallop', fills: [35], crash: [28], timp: 'R.R.R.R.R.R.R.R.', vel: 1.05 });
  band(s, 36, 44, { bass: 'rrrrrrrrrrrrrrrr', chug: 'rrrrrrrrrrrrrrrr', groove: 'gallop', fills: [43], crash: [36], timp: 'R.R.R.R.R.R.R.R.', vel: 1.08 });
  band(s, 44, 48, { bass: 'r.rrr.rrr.rrr.rr', chug: 'r.rrr.rrr.rrr.rr', groove: 'gallop', fills: [47], crash: [44], timp: 'R.......R.R.....' });
  // taiko on the gallop's accents
  for (const [a, z] of [[4, 12], [12, 20], [28, 44]]) for (let bar = a; bar < z; bar++) s.hit('taiko', bar * 4, 0.8), s.hit('taiko', bar * 4 + 2, 0.55);
  bed(s, 4, 12, { strings: 0.5, organ: 0.38, choir: 0.4 });
  bed(s, 12, 20, { strings: 0.65, organ: 0.42, choir: 0.65 });
  bed(s, 20, 28, { strings: 0.55, organ: 0.4, reg: 'diapason', choir: 0.35, vowel: 'oo' });
  bed(s, 28, 36, { strings: 0.62, organ: 0.42, choir: 0.5 });
  bed(s, 36, 44, { strings: 0.7, organ: 0.45, choir: 0.78 });
  bed(s, 44, 48, { strings: 0.62, organ: 0.42, choir: 0.5 });
  s.arp('stac', 4, 12, { pat: '0123432101234321', base: 61, vel: 0.5 });
  s.arp('stac', 12, 20, { pat: '0123432101234321', base: 61, vel: 0.55 });
  s.arp('harpsi', 20, 28, { pat: '0120121201201212', base: 61, vel: 0.62 });
  s.arp('stac', 28, 44, { pat: '0123432101234321', base: 61, vel: 0.62 });
  s.arp('stac', 44, 48, { pat: '0123432101234321', base: 61, vel: 0.6 });
  s.stab('brass', 12, 20, { pat: 'X..x..x.X.......', step: 0.25, vel: 0.78, lo: 52, hi: 73, n: 3 });
  s.stab('brass', 36, 44, { pat: 'X..x..x.X..x..x.', step: 0.25, vel: 0.85, lo: 52, hi: 73, n: 3 });
  s.mel('horn', 4, A, { vel: 0.74 });
  s.mel('guitar', 4, A, { vel: 0.56, o: { slide: 2 } });
  s.mel('guitar', 12, B, { vel: 0.8, o: { slide: 1.5 } });
  s.mel('horn', 12, B, { vel: 0.7 });
  s.mel('organ', 20, '^4:2 ^6:2 | ^2:2 7#:2 | ^1:2 ^3:2 | ^3:2 ^1:2 | ^4:2 ^6:2 | ^2b:2 ^4:2 | ^2:2 ^4:2 | ^2:2 7#:2', { vel: 0.5, o: { reg: 'flute' } });
  s.mel('guitar', 28, A, { vel: 0.85, o: { slide: 2 } });
  s.mel('brass', 28, A, { vel: 0.66, oct: 3 });
  s.mel('horn', 28, A, { vel: 0.6 });
  s.mel('guitar', 36, B, { vel: 0.88, o: { slide: 1.5 } });
  s.mel('brass', 36, B, { vel: 0.7, oct: 3 });
  s.mel('horn', 36, B, { vel: 0.66 });
  s.swellTo(20 * 4, 8, 0.8);
  s.swellTo(28 * 4, 8, 0.85);
  s.swellTo(36 * 4, 4, 0.85);
  s.swellTo(48 * 4 - 0.01, 4, 0.7);
  return s;
}
