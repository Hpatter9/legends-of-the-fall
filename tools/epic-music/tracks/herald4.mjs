// The wall (herald four): F minor, a slow march with a kick on every step, a deep choir and bells.
import { Song } from '../song.mjs';

const W = '5:2 ^1:2 | ^3:2 ^1:2 | ^1:2 6:2 | ^3:2 ^1:2 | ^4:2 ^6:2 | ^1:2 6:2 | ^2:2 ^4:2 | ^2:2 7#:2 | ^1:2 5:2 | ^2:2 ^4:2 | ^1:2 ^3:2 | ^4:2 ^6:2 | ^2b:2 ^4:2 | ^6:2 ^4:2 | ^2:2 ^4:2 | ^2:2 7#:2';

export default function () {
  const s = new Song({ id: 'herald4', bpm: 66, key: 'F', mode: 'min', bars: 16, target: 0.12, seed: 171, kbps: 30, mix: { levels: { timp: 1.3, bells: 1.2, choir: 1.1 }, hallLevel: 0.85 } });
  s.prog(0, 'i i VI VI  iv iv V7 V7  i VII VI iv  N N V7 V7');
  s.bassline('organ', 0, 16, { pat: 'R...............', base: 17, vel: 0.55, len: 3.95, o: { reg: 'pedal', r: 0.5 } });
  s.bassline('bass', 0, 16, { pat: 'R...r...R...r...', base: 29, vel: 0.7, len: 0.9, o: { cut: 480, drive: 2 } });
  for (let bar = 0; bar < 16; bar++) {
    for (let b = 0; b < 4; b++) s.hit('kick', bar * 4 + b, b === 0 ? 1 : 0.8);
    s.hit('taiko', bar * 4, 0.9);
  }
  s.timp(0, 16, { pat: 'R.......R.......', vel: 0.8, base: 29 });
  s.pad('strings', 0, 16, { lo: 41, hi: 65, vel: 0.48 });
  s.pad('choir', 0, 16, { lo: 48, hi: 70, vel: 0.62, o: { vowel: 'oh' } });
  s.pad('organ', 0, 16, { lo: 36, hi: 60, vel: 0.4, o: { reg: 'diapason' } });
  for (const bar of [0, 4, 8, 12]) s.add('bell', bar * 4, 4, 41, 0.7, { ring: 8 });
  s.mel('horn', 0, W, { vel: 0.7, oct: 3 });
  s.mel('brass', 8, W.split(' | ').slice(8).join(' | '), { vel: 0.7, oct: 3 });
  s.swellTo(8 * 4, 8, 0.5);
  return s;
}
