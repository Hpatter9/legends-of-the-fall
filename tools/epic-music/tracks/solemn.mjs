// Solemn: D minor, 56 bpm. A piano over a held string pad and a quiet choir; a low bell tolls on the turns.
import { Song } from '../song.mjs';

const S = '5:2 ^1:2 | ^3:2 ^1:1 6:1 | ^4:2 ^1:1 6:1 | 5:1 7#:1 ^2:2 | ^1:2 ^3:2 | ^3:2 ^1:2 | ^5:2 ^3:1 ^5:1 | ^4:2 ^2:1 7:1 | ^4:2 6:2 | ^2b:2 ^4:1 ^6:1 | ^2:2 7#:2 | ^1:4';

export default function () {
  const s = new Song({ id: 'solemn', bpm: 56, key: 'D', mode: 'min', bars: 12, target: 0.085, seed: 221, kbps: 30, mix: { levels: { keys: 1.0, bells: 1.0 }, hallLevel: 0.9 } });
  s.prog(0, 'i VI iv V7  i VI III VII  iv N V7 i');
  s.bassline('organ', 0, 12, { pat: 'R...............', base: 26, vel: 0.45, len: 3.95, o: { reg: 'pedal', r: 0.8 } });
  s.pad('strings', 0, 12, { lo: 50, hi: 72, vel: 0.4, n: 3 });
  s.pad('choir', 4, 12, { lo: 55, hi: 74, vel: 0.38, o: { vowel: 'oo' } });
  s.add('bell', 0, 4, 38, 0.5, { ring: 9 });
  s.add('bell', 8 * 4, 4, 38, 0.5, { ring: 9 });
  s.mel('piano', 0, S, { vel: 0.55, oct: 4, o: { pedal: true } });
  s.mel('piano', 0, '1:4 | 6:4 | 4:4 | 5:4 | 1:4 | 6:4 | 3:4 | 7:4 | 4:4 | 2b:4 | 5:4 | 1:4', { vel: 0.4, oct: 2, o: { pedal: true } });
  return s;
}
