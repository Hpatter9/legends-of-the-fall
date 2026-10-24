// The demon lord (herald three): B minor, 126 bpm. A gallop under reed organ and rapid strings; the guitar takes the tune at the close.
import { Song } from '../song.mjs';
import { band, bed } from './_layers.mjs';

const D1 = '^1:.5 ^3:.5 ^5:1 ^3:1 ^1:1 | ^3:1 ^1:1 6:2 | ^3:1 ^5:1 ^7:1 ^5:1 | ^2:1 ^4:1 ^2:1 7:1 | ^1:2 ^3:1 ^1:1 | ^3:1.5 ^1:.5 6:1 ^1:1 | ^4:1 ^6:1 ^4:1 ^1:1 | ^2:1 ^4:1 ^2:1 7#:1';
const D2 = '^1:1.5 ^3:.5 ^3:2 | ^2:1.5 ^4:.5 ^4:2 | ^5:2 ^3:1 ^1:1 | ^3:1 ^1:1 5:2 | ^1:1 ^3:1 ^6:2 | ^4:1 ^2:1 ^4:2 | ^6:2 ^4:1 ^1:1 | ^2:1 ^4:1 ^2:1 7#:1';

export default function () {
  const s = new Song({ id: 'herald3', bpm: 126, key: 'B', mode: 'min', bars: 24, target: 0.16, seed: 161, kbps: 30 });
  s.prog(0, 'i VI III VII  i VI iv V7');
  s.prog(8, 'i VI III VII  i VI iv V7');
  s.prog(16, 'VI VII i i  VI VII iv V7');
  band(s, 0, 8, { bass: 'rrorrrorrrorrror', chug: 'r.rr.r.rr.rr.r.r', groove: 'gallop', fills: [7], crash: [0], base: 35, gbase: 47, timp: 'R.......R.......', vel: 0.95 });
  band(s, 8, 16, { bass: 'rrrrrrrrrrrrrrrr', chug: 'rrrrrrrrrrrrrrrr', groove: 'gallop', fills: [15], crash: [8], base: 35, gbase: 47, timp: 'R.R.R.R.R.R.R.R.', vel: 1.05 });
  band(s, 16, 24, { bass: 'r.rrr.rrr.rrr.rr', chug: 'r.rrr.rrr.rrr.rr', groove: 'gallop', fills: [23], crash: [16], base: 35, gbase: 47, timp: 'R...R...R...R...', vel: 1.05 });
  bed(s, 0, 8, { strings: 0.5, organ: 0.42, reg: 'reed', lo: 52, hi: 75 });
  bed(s, 8, 24, { strings: 0.62, organ: 0.45, reg: 'reed', choir: 0.55, lo: 52, hi: 75 });
  s.arp('stac', 0, 24, { pat: '0123432101234321', base: 59, vel: 0.58 });
  s.stab('brass', 8, 24, { pat: 'X..x..x.X..x..x.', step: 0.25, vel: 0.78, lo: 50, hi: 70, n: 3 });
  s.mel('horn', 0, D1, { vel: 0.74 });
  s.mel('guitar', 8, D1, { vel: 0.8, o: { slide: 2 } });
  s.mel('horn', 8, D1, { vel: 0.6 });
  s.mel('guitar', 16, D2, { vel: 0.86, o: { slide: 1.5 } });
  s.mel('brass', 16, D2, { vel: 0.68, oct: 3 });
  s.swellTo(8 * 4, 4, 0.7);
  s.swellTo(16 * 4, 4, 0.75);
  s.swellTo(24 * 4 - 0.01, 4, 0.7);
  return s;
}
