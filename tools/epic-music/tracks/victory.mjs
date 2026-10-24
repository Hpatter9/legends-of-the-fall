// The victory sting: D major, a brass fanfare over a timpani roll, the organ and choir on the last chord, a bell and a crash.
import { Song } from '../song.mjs';

export default function () {
  const s = new Song({ id: 'victory', bpm: 108, key: 'D', mode: 'maj', bars: 4, loop: false, tail: 5, target: 0.15, seed: 111, kbps: 37, mix: { levels: { timp: 1.2, brass: 1.1 } } });
  s.prog(0, 'I IV V I');
  s.roll('timp', 0, 7, 38, 0.3, 0.95, 28);
  s.timp(2, 4, { pat: 'R...R.R.', step: 0.5, vel: 0.9, base: 38 });
  s.pad('strings', 0, 4, { lo: 50, hi: 74, vel: 0.62 });
  s.pad('organ', 1, 4, { lo: 38, hi: 62, vel: 0.5, o: { reg: 'full' } });
  s.pad('choir', 2, 4, { lo: 57, hi: 79, vel: 0.7 });
  s.stab('brass', 0, 3, { pat: 'X.x.', step: 1, vel: 0.8, lo: 55, hi: 74, n: 3, len: 0.5 });
  s.pad('brass', 3, 4, { lo: 55, hi: 76, vel: 0.85, o: { sus: 0.9, r: 0.6, a: 0.06 } });
  s.mel('horn', 0, '5:.5 ^1:.5 ^3:1 ^5:2 | ^4:1 ^6:1 ^4:1 ^1:1 | ^2:1 ^5:1 ^7:2 | ^1:4', { vel: 0.82 });
  s.mel('brass', 0, '5:.5 ^1:.5 ^3:1 ^5:2 | ^4:1 ^6:1 ^4:1 ^1:1 | ^2:1 ^5:1 ^7:2 | ^1:4', { vel: 0.66, oct: 3 });
  s.add('bell', 12, 4, 50, 0.8, { ring: 6 });
  s.add('bell', 12, 4, 62, 0.5, { ring: 5 });
  s.add('drum', 12, 0, 'crash', 1, {});
  s.add('drum', 12, 0, 'gong', 0.7, {});
  s.add('drum', 12, 0, 'taiko', 1, {});
  s.bassline('organ', 0, 4, { pat: 'R...............', base: 26, vel: 0.6, len: 3.95, o: { reg: 'pedal', r: 0.8 } });
  s.swellTo(12, 3, 0.7);
  return s;
}
