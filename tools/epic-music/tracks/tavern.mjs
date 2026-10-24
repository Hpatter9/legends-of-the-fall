// The tavern: B minor in three-four, a lighter gothic dance. A harpsichord and a music box carry the tune over plucked
// strings and an oom-pah-pah; the second strain lifts into D major's neighbourhood; the strings take it on the third.
import { Song } from '../song.mjs';

const A = '5:2 ^1:1 | ^3:1.5 ^2:.5 ^1:1 | 6:1 ^1:1 ^3:1 | ^2:1.5 ^1:.5 7:1 | ^1:1 ^3:1 ^5:1 | ^3:1.5 ^1:.5 5:1 | 4:1 6:1 ^1:1 | 5:1 7#:1 ^2:1';
const A3 = '^1:1 ^3:1 ^5:1 | ^3:1.5 ^1:.5 6:1 | ^3:1 5:1 ^3:1 | ^2:1.5 7:.5 ^2:1 | ^4:1 ^1:1 6:1 | 5:1 7#:1 ^2:1 | ^1:2 ^3:1 | ^1:1.5 ^3:.5 5:1';
const A3B = '^1:1 ^3:1 ^5:1 | ^3:1.5 ^1:.5 6:1 | ^3:1 5:1 ^3:1 | ^2:1.5 7:.5 ^2:1 | ^4:1 ^1:1 6:1 | 5:1 7#:1 ^2:1 | ^1:2 ^3:1 | 5:1 7#:1 ^2:1';
const B2 = '^3:1 ^5:1 ^7:1 | ^5:2 ^3:1 | ^7:1 ^2:1 ^4:1 | ^4:2 ^2:1 | ^4:1 ^6:1 ^4:1 | ^2b:1 ^4:1 ^6:1 | ^2:1 ^4:1 ^2:1 | 5:1 7#:1 ^2:1';
const B = '^3:1 ^5:1 ^7:1 | ^5:2 ^3:1 | ^7:1 ^2:1 ^4:1 | ^4:2 ^2:1 | ^4:1 ^6:1 ^4:1 | ^1:2 6:1 | ^3:1 ^1:1 5:1 | 5:1 7#:1 ^2:1';

export default function () {
  const s = new Song({ id: 'tavern', bpm: 132, key: 'B', mode: 'min', bars: 48, beatsPerBar: 3, target: 0.12, seed: 101, mix: { levels: { keys: 0.55, harpsi: 0.5, stac: 0.8, strings: 1.3, bass: 1.6 } } });
  const PA = 'i i VI VII  i i iv V7  i VI III VII  iv V7 i i';
  const PB = 'III III VII VII  iv iv i V7  III III VII VII  iv N V7 V7';
  s.prog(0, PA);
  s.prog(16, PB);
  s.prog(32, 'i i VI VII  i i iv V7  i VI III VII  iv V7 i V7');

  // oom-pah-pah
  s.bassline('cello', 0, 48, { pat: 'R..', step: 1, base: 35, vel: 0.62, len: 0.85, o: { a: 0.04, r: 0.2 } });
  s.bassline('bass', 16, 48, { pat: 'R..', step: 1, base: 35, vel: 0.5, len: 0.5, o: { pluck: 0.06, cut: 600 } });
  s.stab('pizz', 0, 48, { pat: '.xx', step: 1, vel: 0.6, lo: 54, hi: 74, n: 3, len: 0.5 });
  s.stab('harpsi', 16, 48, { pat: '.xx', step: 1, vel: 0.5, lo: 58, hi: 78, n: 3, len: 0.5, o: { octave: false } });
  s.pad('organ', 16, 32, { lo: 50, hi: 68, vel: 0.3, o: { reg: 'flute', r: 0.3 }, n: 3 });
  s.pad('strings', 32, 48, { lo: 50, hi: 72, vel: 0.46, n: 3 });
  s.pad('organ', 32, 48, { lo: 50, hi: 68, vel: 0.3, o: { reg: 'flute', r: 0.3 }, n: 3 });
  s.kit(16, 48, { groove: { kick: 'X..', snare: '', hat: '' }, vel: 0.5 });
  for (let bar = 16; bar < 48; bar++) {
    s.hit('rim', bar * 3 + 1, 0.4);
    s.hit('rim', bar * 3 + 2, 0.4);
  }
  s.timp(44, 48, { pat: 'R..', step: 1, vel: 0.55, base: 38 });
  s.add('bell', 0, 3, 47, 0.45, { ring: 4 });
  s.add('bell', 32 * 3, 3, 47, 0.45, { ring: 4 });
  // the tunes
  s.mel('harpsi', 0, A, { vel: 0.7, oct: 4 });
  s.mel('mbox', 0, A, { vel: 0.5, oct: 5 });
  s.mel('horn', 8, A3, { vel: 0.52, oct: 3 });
  s.mel('harpsi', 8, A3, { vel: 0.66, oct: 4 });
  s.mel('mbox', 8, A3, { vel: 0.5, oct: 5 });
  s.mel('horn', 16, B, { vel: 0.7, oct: 3 });
  s.mel('mbox', 16, B, { vel: 0.5, oct: 4 });
  s.mel('harpsi', 16, B, { vel: 0.55, oct: 4 });
  s.mel('horn', 24, B2, { vel: 0.7, oct: 3 });
  s.mel('strings', 24, B2, { vel: 0.45, oct: 4 });
  s.mel('strings', 32, A, { vel: 0.66, oct: 3 });
  s.mel('horn', 32, A, { vel: 0.5, oct: 3 });
  s.mel('harpsi', 32, A, { vel: 0.5, oct: 4 });
  s.mel('mbox', 32, A, { vel: 0.5, oct: 5 });
  s.mel('strings', 40, A3B, { vel: 0.7, oct: 3 });
  s.mel('brass', 40, A3B, { vel: 0.5, oct: 3 });
  s.mel('mbox', 40, A3B, { vel: 0.5, oct: 5 });
  return s;
}
