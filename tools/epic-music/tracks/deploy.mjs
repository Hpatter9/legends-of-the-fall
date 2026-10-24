// Deploy: E minor, a heartbeat of timpani under low staccato strings; the organ and a harpsichord gather, a horn tune
// climbs through a Neapolitan chord, and a snare march leads round to the start again.
import { Song } from '../song.mjs';
import { bed } from './_layers.mjs';

const T = '5:1 ^1:1 ^3:2 | ^3:1 ^1:1 6:2 | 4:1 6:1 ^1:1 ^4:1 | ^2:1.5 ^4:.5 ^2:1 7#:1 | ^1:2 ^3:1 ^5:1 | ^3:1.5 ^1:.5 6:1 ^1:1 | ^2b:2 ^4:1 ^6:1 | ^4:1 ^2:1 7#:2';

export default function () {
  const s = new Song({ id: 'deploy', bpm: 108, key: 'E', mode: 'min', bars: 32, target: 0.125, seed: 31, mix: { levels: { harpsi: 0.7, stac: 1.1 } } });
  s.prog(0, 'i i VI VII  i i iv V7');
  s.prog(8, 'i VI III VII  iv N V7 V7');
  s.prog(16, 'i VI iv V7  i VI N V7');
  s.prog(24, 'i VI iv V7  i VI N V7');

  s.bassline('stac', 0, 32, { pat: 'r.r.r.r.r.r.r.r.', base: 40, vel: 0.62, len: 0.6 });
  s.bassline('bass', 8, 32, { pat: 'R.......r.......', base: 28, vel: 0.7, len: 1.7, o: { dTau: 2, cut: 600 } });
  s.bassline('organ', 0, 32, { pat: 'R...............', base: 28, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.4 } });
  s.timp(0, 8, { pat: 'R..R............', vel: 0.7, base: 40 });
  s.timp(8, 32, { pat: 'R.....R.R.......', vel: 0.75, base: 40 });
  s.add('bell', 0, 4, 40, 0.6, { ring: 6 });
  s.add('bell', 16 * 4, 4, 40, 0.6, { ring: 6 });
  bed(s, 8, 16, { strings: 0.55, organ: 0.4, reg: 'diapason' });
  bed(s, 16, 32, { strings: 0.62, organ: 0.42, choir: 0.45, vowel: 'oo', reg: 'full' });
  s.arp('harpsi', 8, 16, { pat: '0.12.3.4.3.2.1.0', base: 59, vel: 0.5 });
  s.arp('harpsi', 16, 24, { pat: '0123432101234321', base: 59, vel: 0.46 });
  s.arp('stac', 24, 32, { pat: '0123432101234321', base: 59, vel: 0.52 });
  s.stab('brass', 24, 32, { pat: 'X.......x.......', step: 0.25, vel: 0.62, lo: 52, hi: 70, n: 3 });
  s.mel('horn', 16, T, { vel: 0.72 });
  s.mel('strings', 16, T, { vel: 0.46, oct: 4 });
  s.mel('horn', 24, T, { vel: 0.8 });
  s.mel('brass', 24, T, { vel: 0.5, oct: 3 });
  s.kit(8, 16, { groove: 'march', vel: 0.55, skip: ['hat'] });
  s.kit(16, 24, { groove: 'march', vel: 0.7, fills: [23] });
  s.kit(24, 32, { groove: 'march', vel: 0.85, fills: [27, 31], crash: [24] });
  s.roll('drum', 31 * 4 + 1, 3, 'snare', 0.3, 0.95, 20);
  s.swellTo(24 * 4, 8, 0.7);
  s.swellTo(32 * 4 - 0.01, 4, 0.55);
  return s;
}
