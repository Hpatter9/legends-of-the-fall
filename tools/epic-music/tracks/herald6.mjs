// The end of all roads (herald six): E minor, 116 bpm, the grandest: the whole orchestra, taiko and a choir, round the deploy theme at full strength.
import { Song } from '../song.mjs';
import { band, bed } from './_layers.mjs';

const T = '5:1 ^1:1 ^3:2 | ^3:1 ^1:1 6:2 | 4:1 6:1 ^1:1 ^4:1 | ^2:1.5 ^4:.5 ^2:1 7#:1 | ^1:2 ^3:1 ^5:1 | ^3:1.5 ^1:.5 6:1 ^1:1 | ^2b:2 ^4:1 ^6:1 | ^4:1 ^2:1 7#:2';

export default function () {
  const s = new Song({ id: 'herald6', bpm: 116, key: 'E', mode: 'min', bars: 24, target: 0.17, seed: 191, kbps: 30, mix: { levels: { timp: 1.25, brass: 1.1 } } });
  for (const b of [0, 8, 16]) s.prog(b, 'i VI iv V7  i VI N V7');
  band(s, 0, 8, { bass: 'r.r.r.r.r.r.r.r.', chug: 'r.r.r.r.r.r.r.r.', groove: 'drive', fills: [7], crash: [0], base: 28, gbase: 40, timp: 'R.......R.R.....', vel: 0.9 });
  band(s, 8, 16, { bass: 'rrorrrorrrorrror', chug: 'r.rr.r.rr.rr.r.r', groove: 'gallop', fills: [15], crash: [8], base: 28, gbase: 40, timp: 'R.R.R.R.R.R.R.R.', vel: 1.0 });
  band(s, 16, 24, { bass: 'rrrrrrrrrrrrrrrr', chug: 'rrrrrrrrrrrrrrrr', groove: 'gallop', fills: [23], crash: [16], base: 28, gbase: 40, timp: 'R.R.R.R.R.R.R.R.', vel: 1.1 });
  for (let bar = 8; bar < 24; bar++) s.hit('taiko', bar * 4, 0.85), s.hit('taiko', bar * 4 + 2, 0.6);
  bed(s, 0, 8, { strings: 0.55, organ: 0.4, choir: 0.4, lo: 52, hi: 76 });
  bed(s, 8, 16, { strings: 0.66, organ: 0.44, choir: 0.65, lo: 52, hi: 77 });
  bed(s, 16, 24, { strings: 0.74, organ: 0.48, choir: 0.85, lo: 52, hi: 78 });
  s.arp('stac', 0, 24, { pat: '0123432101234321', base: 59, vel: 0.6 });
  s.stab('brass', 8, 24, { pat: 'X..x..x.X..x..x.', step: 0.25, vel: 0.82, lo: 50, hi: 70, n: 3 });
  s.mel('horn', 0, T, { vel: 0.76 });
  s.mel('strings', 0, T, { vel: 0.46, oct: 4 });
  s.mel('guitar', 8, T, { vel: 0.84, o: { slide: 2 } });
  s.mel('horn', 8, T, { vel: 0.66 });
  s.mel('guitar', 16, T, { vel: 0.92, o: { slide: 2 } });
  s.mel('brass', 16, T, { vel: 0.74, oct: 3 });
  s.mel('horn', 16, T, { vel: 0.68 });
  s.mel('organ', 16, T, { vel: 0.5, oct: 4, o: { reg: 'reed' } });
  s.swellTo(8 * 4, 4, 0.75);
  s.swellTo(16 * 4, 4, 0.8);
  s.swellTo(24 * 4 - 0.01, 4, 0.7);
  return s;
}
