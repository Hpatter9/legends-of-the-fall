// The opening: A minor, a drone and a lone music box; a piano and a distant choir arrive, and no drums at all.
import { Song } from '../song.mjs';

const O1 = '5:2 ^1:2 | ^3:3 ^1:1 | ^1:2 ^3:2 | ^1:3 6:1 | ^4:2 ^6:2 | ^4:3 ^1:1 | 5:2 7#:2 | ^2:3 7#:1';
const O2 = '^1:2 5:1 ^1:1 | ^3:1.5 ^1:.5 6:2 | ^3:2 ^5:1 ^3:1 | ^4:2 ^2:1 7:1 | ^6:1.5 ^4:.5 ^1:2 | ^2b:2 ^4:1 6:1 | ^2:1 ^4:1 ^2:1 7#:1 | ^1:4';

export default function () {
  const s = new Song({ id: 'opening', bpm: 62, key: 'A', mode: 'min', bars: 16, target: 0.085, seed: 131, kbps: 30, mix: { levels: { keys: 0.9, bells: 1 }, hallLevel: 0.9 } });
  s.prog(0, 'i i VI VI  iv iv V7 V7');
  s.prog(8, 'i VI III VII  iv N V7 i');
  s.bassline('organ', 0, 16, { pat: 'R...............', base: 21, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.8 } });
  s.pad('strings', 0, 16, { lo: 45, hi: 67, vel: 0.36, n: 3 });
  s.pad('choir', 8, 16, { lo: 57, hi: 76, vel: 0.4, o: { vowel: 'oo' } });
  s.add('bell', 0, 4, 45, 0.55, { ring: 8 });
  s.add('bell', 8 * 4, 4, 45, 0.45, { ring: 8 });
  s.mel('mbox', 0, O1, { vel: 0.6, oct: 4 });
  s.mel('piano', 8, O2, { vel: 0.5, oct: 3 });
  s.mel('mbox', 8, O2, { vel: 0.3, oct: 5 });
  return s;
}
