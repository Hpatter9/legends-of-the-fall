// Battle, the light one: A minor, 160 bpm. A driving bass, staccato strings, palm-muted guitar and a horn tune that the
// finale hands to the guitar and the brass.
import { Song } from '../song.mjs';

const THEME_A = '5:1 ^1:1 ^3:1.5 ^2:.5 | ^1:1.5 5:.5 6:1 ^1:1 | ^3:1 7:.5 5:.5 3:1 5:1 | 7:1.5 ^2:.5 ^4:1 ^2:1';
const THEME_B1 = '^3:1 ^2:.5 ^1:.5 5:1 ^1:1 | 6:1 ^1:1 ^3:1 ^1:1 | ^4:1 ^3:.5 ^2:.5 ^1:1 6:1 | 5:1 ^2:1 ^4:1 7#:1';
const THEME_B2 = '^3:1 ^2:.5 ^1:.5 5:1 ^1:1 | 6:1 ^1:1 ^4:2 | ^4:2 6:1 4:1 | 5:.5 7#:.5 ^2:1 ^4:1 ^3:.5 ^2:.5';

export default function () {
  const s = new Song({ id: 'battle', bpm: 160, key: 'A', mode: 'min', bars: 48, target: 0.17, seed: 21 });
  s.prog(0, 'i*2 VI V7');
  s.prog(4, 'i VI III VII  i VI iv V7');
  s.prog(12, 'i VI III VII  i iv N V7');
  s.prog(20, 'VI VII i i  iv V7 i V7');
  s.prog(28, 'viio7 i viio7 i  iv N V7 V7');
  s.prog(36, 'i VI III VII  i VI iv V7');
  s.prog(44, 'i VI VII V7');

  // the floor: timpani, the organ and low strings
  s.timp(0, 4, { pat: 'R...R.R.R...R.R.', vel: 0.8 });
  s.timp(4, 48, { pat: 'R.......R.R.....', vel: 0.75 });
  s.pad('strings', 0, 4, { lo: 45, hi: 64, vel: 0.5 });
  s.pad('organ', 0, 48, { lo: 45, hi: 69, vel: 0.42, o: { reg: 'full' } });
  s.pad('strings', 20, 36, { lo: 55, hi: 77, vel: 0.62 });
  s.pad('strings', 36, 48, { lo: 55, hi: 77, vel: 0.66 });
  s.pad('choir', 20, 28, { lo: 57, hi: 81, vel: 0.6 });
  s.pad('choir', 36, 44, { lo: 57, hi: 81, vel: 0.7 });
  // the engine: bass 8ths, then sixteenths in the finale
  s.bassline('bass', 0, 4, { pat: 'r.r.r.r.r.r.r.r.', base: 33, vel: 0.7 });
  s.bassline('bass', 4, 12, { pat: 'r.r.r.r.r.r.r.r.', base: 33, vel: 0.8 });
  s.bassline('bass', 12, 20, { pat: 'r.ro.ror.r.ro.ror'.slice(0, 16), base: 33, vel: 0.82 });
  s.bassline('bass', 20, 28, { pat: 'R...r...R...r.r.', base: 33, vel: 0.78 });
  s.bassline('bass', 28, 36, { pat: 'r.r.r.r.r.r.r.rr', base: 33, vel: 0.8 });
  s.bassline('bass', 36, 48, { pat: 'rrorrrorrrorrror', base: 33, vel: 0.86 });
  s.bassline('chug', 4, 20, { pat: 'r.r.r.r.r.r.r.r.', base: 45, vel: 0.7, len: 0.5, o: { mute: true } });
  s.bassline('chug', 36, 44, { pat: 'r.rrr.r.r.rrr.r.', base: 45, vel: 0.8, len: 0.5, o: { mute: true } });
  // staccato strings and the harpsichord
  s.arp('stac', 12, 20, { pat: '0123432101234321', base: 57, vel: 0.55 });
  s.arp('stac', 20, 28, { pat: '0.1.2.3.4.3.2.1.', base: 57, vel: 0.5, step: 0.25 });
  s.arp('harpsi', 28, 36, { pat: '0120121201201212', base: 57, vel: 0.6 });
  s.arp('stac', 36, 44, { pat: '0123432101234321', base: 60, vel: 0.62 });
  s.arp('stac', 44, 48, { pat: '0123432101234321', base: 57, vel: 0.6 });
  // brass stabs
  s.stab('brass', 12, 20, { pat: 'X.....x.X.......', step: 0.25, vel: 0.7, lo: 53, hi: 72, n: 3 });
  s.stab('brass', 36, 44, { pat: 'X..x..x.X..x..x.', step: 0.25, vel: 0.78, lo: 53, hi: 72, n: 3 });
  // the tune
  s.mel('horn', 4, `${THEME_A} | ${THEME_B1}`, { vel: 0.74 });
  s.mel('horn', 12, `${THEME_A} | ${THEME_B2}`, { vel: 0.74 });
  s.mel('guitar', 12, `${THEME_A} | ${THEME_B2}`, { vel: 0.62, o: { slide: 1.5 } });
  s.mel('strings', 20, '^3:2 ^1:1 6:1 | 7:2 ^2:1 ^4:1 | ^3:3 ^2:.5 ^1:.5 | ^1:1 5:1 3:2 | 4:1 6:1 ^1:1 ^4:1 | ^2:1.5 ^1:.5 7#:1 ^2:1 | ^1:2 ^3:2 | ^2:1 7#:1 5:1 7#:1', { vel: 0.72 });
  s.mel('horn', 20, '^3:2 ^1:1 6:1 | 7:2 ^2:1 ^4:1 | ^3:3 ^2:.5 ^1:.5 | ^1:1 5:1 3:2 | 4:1 6:1 ^1:1 ^4:1 | ^2:1.5 ^1:.5 7#:1 ^2:1 | ^1:2 ^3:2 | ^2:1 7#:1 5:1 7#:1', { vel: 0.6 });
  s.mel('organ', 28, '^4:2 ^2:2 | ^1:4 | ^6:2 ^4:2 | ^3:2 ^1:2 | ^4:4 | ^6:2 ^4:2 | ^2:2 ^4:2 | ^2:2 7#:2', { vel: 0.5, o: { reg: 'flute' }, oct: 4 });
  s.mel('guitar', 36, `${THEME_A} | ${THEME_B1}`, { vel: 0.8, o: { slide: 2 } });
  s.mel('brass', 36, `${THEME_A} | ${THEME_B1}`, { vel: 0.66, oct: 3 });
  s.mel('horn', 36, `${THEME_A} | ${THEME_B1}`, { vel: 0.7, tr: 0 });

  // the kit
  s.kit(0, 4, { groove: 'pulse', vel: 0.6 });
  s.kit(4, 12, { groove: 'drive', fills: [11], crash: [4], vel: 0.9 });
  s.kit(12, 20, { groove: 'drive', fills: [19], crash: [12], vel: 1 });
  s.kit(20, 28, { groove: 'rock', fills: [27], crash: [20], vel: 0.9 });
  s.kit(28, 36, { groove: 'halftime', fills: [35], vel: 0.85, skip: ['hat'] });
  s.kit(36, 44, { groove: 'gallop', fills: [43], crash: [36], vel: 1 });
  s.kit(44, 48, { groove: 'drive', fills: [47], crash: [44], vel: 0.95 });
  s.swellTo(28 * 4, 8, 0.85);
  s.swellTo(36 * 4, 8, 0.9);
  s.swellTo(48 * 4 - 0.01, 4, 0.7);
  return s;
}
