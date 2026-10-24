// The last flame (herald five): G minor, 108 bpm. A burning drive; the guitar carries the rising theme over strings and choir.
import { Song } from '../song.mjs';
import { band, bed } from './_layers.mjs';

const F1 = '5:1 ^1:1 ^3:1 ^5:1 | ^3:1 ^1:1 6:2 | ^3:1 ^5:1 ^7:2 | ^2:1 ^4:1 ^2:1 7:1 | ^1:1 ^3:1 ^5:2 | ^3:1.5 ^1:.5 6:2 | ^4:1 ^6:1 ^4:1 ^1:1 | ^2:1 ^4:1 ^2:1 7#:1';

export default function () {
  const s = new Song({ id: 'herald5', bpm: 108, key: 'G', mode: 'min', bars: 24, target: 0.16, seed: 181, kbps: 30 });
  s.prog(0, 'i VI III VII  i VI iv V7');
  s.prog(8, 'i VI III VII  i VI iv V7');
  s.prog(16, 'i VI III VII  i VI iv V7');
  band(s, 0, 8, { bass: 'r.r.r.r.r.r.r.r.', chug: 'r.r.r.r.r.r.r.r.', groove: 'drive', fills: [7], crash: [0], base: 31, gbase: 43, timp: 'R.......R.R.....', vel: 0.9 });
  band(s, 8, 24, { bass: 'rrorrrorrrorrror', chug: 'r.rr.r.rr.rr.r.r', groove: 'gallop', fills: [15, 23], crash: [8, 16], base: 31, gbase: 43, timp: 'R.R.R.R.R.R.R.R.', vel: 1.05 });
  bed(s, 0, 8, { strings: 0.5, organ: 0.38, lo: 52, hi: 75 });
  bed(s, 8, 24, { strings: 0.64, organ: 0.42, choir: 0.62, lo: 52, hi: 76 });
  s.arp('stac', 8, 24, { pat: '0123432101234321', base: 55, vel: 0.58 });
  s.stab('brass', 16, 24, { pat: 'X..x..x.X..x..x.', step: 0.25, vel: 0.8, lo: 50, hi: 70, n: 3 });
  s.mel('horn', 0, F1, { vel: 0.74 });
  s.mel('guitar', 8, F1, { vel: 0.82, o: { slide: 2 } });
  s.mel('guitar', 16, F1, { vel: 0.9, o: { slide: 2 } });
  s.mel('brass', 16, F1, { vel: 0.66, oct: 3 });
  s.swellTo(8 * 4, 4, 0.7);
  s.swellTo(16 * 4, 4, 0.75);
  s.swellTo(24 * 4 - 0.01, 4, 0.7);
  return s;
}
