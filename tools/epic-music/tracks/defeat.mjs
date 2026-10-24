// The defeat sting: D minor, a low bell tolling under a falling horn, the choir sinking, a timpani and an organ chord left to fade.
import { Song } from '../song.mjs';

export default function () {
  const s = new Song({ id: 'defeat', bpm: 92, key: 'D', mode: 'min', bars: 4, loop: false, tail: 5, target: 0.12, seed: 121, kbps: 37, mix: { levels: { timp: 1.2, bells: 1.2 } } });
  s.prog(0, 'i VI N i');
  s.add('bell', 0, 4, 38, 0.9, { ring: 8 });
  s.add('bell', 8, 4, 38, 0.7, { ring: 8 });
  s.add('bell', 12 * 1.0, 4, 26 + 12, 0.0001, {});
  s.timp(0, 1, { pat: 'R...', step: 1, vel: 0.9, base: 38 });
  s.timp(2, 3, { pat: 'R...', step: 1, vel: 0.7, base: 38 });
  s.timp(3, 4, { pat: 'R...', step: 1, vel: 0.9, base: 38 });
  s.pad('strings', 0, 4, { lo: 45, hi: 69, vel: 0.5 });
  s.pad('choir', 0, 4, { lo: 52, hi: 72, vel: 0.55, o: { vowel: 'oo', r: 1.5 } });
  s.pad('organ', 1, 4, { lo: 38, hi: 62, vel: 0.42, o: { reg: 'diapason', r: 1.2 } });
  s.bassline('organ', 0, 4, { pat: 'R...............', base: 26, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 1 } });
  s.mel('horn', 0, '^5:1.5 ^3:.5 ^1:2 | ^3:1.5 ^1:.5 6:2 | ^4:1.5 ^2b:.5 6:2 | 5:1 3:1 1:2', { vel: 0.72, o: { vib: 12 } });
  s.mel('piano', 0, '1:4 | 6:4 | 2b:4 | 1:4', { vel: 0.45, oct: 2, o: { pedal: true } });
  return s;
}
