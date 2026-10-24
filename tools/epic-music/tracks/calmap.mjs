// The Calamity map: G minor, a slow war march. Taiko and low strings tread under a brass call; the choir and a second
// tune answer, the guitar joins for the last turn, and a bell tolls it down.
import { Song } from '../song.mjs';
import { band, bed } from './_layers.mjs';

const C1 = '5:1.5 ^1:.5 ^3:2 | ^1:1.5 5:.5 3:1 5:1 | ^3:1 ^1:1 6:1 ^1:1 | 7:1 ^2:1 ^4:1 ^2:1 | ^4:1.5 ^6:.5 ^4:1 ^1:1 | ^3:2 ^1:1 6:1 | ^2:1 ^4:1 ^2:1 7#:1 | 5:3 7#:1';
const C2 = '5:2 ^1:2 | ^3:2 ^1:1 6:1 | ^5:2 ^3:1 ^5:1 | ^4:2 ^2:1 7:1 | ^6:2 ^4:1 ^1:1 | ^4:1 ^2b:1 ^6:2 | ^2:1.5 ^4:.5 ^2:1 7#:1 | 5:3 7#:1';

export default function () {
  const s = new Song({ id: 'calmap', bpm: 100, key: 'G', mode: 'min', bars: 36, target: 0.125, seed: 81, mix: { levels: { timp: 1.25, brass: 1.1, bells: 1.1 }, hallLevel: 0.8 } });
  s.prog(0, 'i i VI VII  iv VI V7 V7');
  s.prog(8, 'i i VI VII  iv VI V7 V7');
  s.prog(16, 'i VI III VII  iv N V7 V7');
  s.prog(24, 'i i VI VII  iv VI V7 V7');
  s.prog(32, 'i VI iv V7');

  // the tread
  s.bassline('stac', 0, 32, { pat: 'r.rr..r.r.rr..r.', base: 31, vel: 0.62, len: 0.55 });
  s.bassline('bass', 8, 32, { pat: 'R.......r.......', base: 31, vel: 0.72, len: 1.7, o: { dTau: 2, cut: 560 } });
  s.bassline('organ', 0, 36, { pat: 'R...............', base: 31, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.4 } });
  s.timp(0, 32, { pat: 'R.......r.r.....', vel: 0.8, base: 38 });
  s.kit(0, 8, { groove: 'march', vel: 0.55, skip: ['hat'], crash: [0] });
  s.kit(8, 32, { groove: 'march', vel: 0.72, skip: ['hat'], fills: [15, 23, 31], crash: [8, 16, 24] });
  for (let bar = 0; bar < 32; bar++) s.hit('taiko', bar * 4, bar < 8 ? 0.75 : 0.9), s.hit('taiko', bar * 4 + 2, 0.6);
  for (const bar of [0, 8, 16, 24]) s.add('bell', bar * 4, 4, 43, 0.65, { ring: 7 });
  s.add('bell', 32 * 4, 4, 43, 0.55, { ring: 8 });
  // brass call and the answer
  s.pad('strings', 0, 8, { lo: 50, hi: 70, vel: 0.42 });
  bed(s, 8, 16, { strings: 0.55, organ: 0.38, choir: 0.45, lo: 50, hi: 73, reg: 'diapason' });
  bed(s, 16, 24, { strings: 0.66, organ: 0.42, choir: 0.7, lo: 50, hi: 75 });
  bed(s, 24, 32, { strings: 0.68, organ: 0.45, choir: 0.7, lo: 50, hi: 75 });
  bed(s, 32, 36, { strings: 0.45, organ: 0.3, choir: 0.4, vowel: 'oo', lo: 50, hi: 72 });
  s.mel('horn', 0, C1, { vel: 0.7, oct: 3 });
  s.mel('brass', 8, C1, { vel: 0.74, oct: 3 });
  s.mel('horn', 8, C1, { vel: 0.5, oct: 4 });
  s.mel('horn', 16, C2, { vel: 0.8 });
  s.mel('strings', 16, C2, { vel: 0.55, oct: 4 });
  s.mel('brass', 16, C2, { vel: 0.6, oct: 3 });
  s.mel('guitar', 24, C1, { vel: 0.8, o: { slide: 2 } });
  s.mel('brass', 24, C1, { vel: 0.7, oct: 3 });
  s.mel('horn', 24, C1, { vel: 0.62 });
  s.arp('harpsi', 16, 24, { pat: '0.12.3.4.3.2.1.0', base: 55, vel: 0.5 });
  s.bassline('chug', 24, 32, { pat: 'r.rr..r.r.rr..r.', base: 43, vel: 0.7, len: 0.5, o: { mute: true } });
  s.stab('brass', 16, 24, { pat: 'X.......x.......', step: 0.25, vel: 0.72, lo: 50, hi: 70, n: 3 });
  s.swellTo(8 * 4, 8, 0.6);
  s.swellTo(16 * 4, 8, 0.7);
  s.swellTo(24 * 4, 8, 0.75);
  s.mel('piano', 32, '5:1 ^1:1 ^3:1 ^1:1 | ^1:1.5 6:.5 ^3:2 | ^4:1 6:1 ^1:1 6:1 | 5:1 7#:1 ^2:2', { vel: 0.5, oct: 4 });
  s.mel('piano', 32, '1:4 | 6:4 | 4:4 | 5:4', { vel: 0.4, oct: 2 });
  return s;
}
