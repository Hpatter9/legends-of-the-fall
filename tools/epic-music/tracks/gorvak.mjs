// Gorvak: C minor, a slow heavy march. Toms and a kick tread under low brass and a sour two-note figure.
import { Song } from '../song.mjs';

const G1 = '1:1.5 2b:.5 1:2 | 5:1 3:1 1:2 | 3:1 1:1 6:2 | 7:1.5 2:.5 4:2 | 1:2 5:2 | ^1:2 5:2 | 4:2 6:1 ^1:1 | 5:1 7#:1 ^2:1 ^4:1';
const G2 = '4:2 6:2 | 2b:2 4:2 | 5:2 7#:2 | ^2:2 7#:2';

export default function () {
  const s = new Song({ id: 'gorvak', bpm: 88, key: 'C', mode: 'min', bars: 20, target: 0.14, seed: 141, kbps: 30, mix: { levels: { timp: 1.3, brass: 1.2, bass: 1.3 }, hallLevel: 0.7 } });
  s.prog(0, 'i i VI VII  i i iv V7');
  s.prog(8, 'i i VI VII  i i iv V7');
  s.prog(16, 'iv N V7 V7');
  s.bassline('bass', 0, 20, { pat: 'R...r...R...r...', base: 24, vel: 0.8, len: 0.9, o: { cut: 500, drive: 2.2 } });
  s.bassline('organ', 0, 20, { pat: 'R...............', base: 24, vel: 0.5, len: 3.95, o: { reg: 'pedal', r: 0.4 } });
  s.timp(0, 20, { pat: 'R...R...R...R.R.', vel: 0.85, base: 36 });
  for (let bar = 0; bar < 20; bar++) {
    s.hit('taiko', bar * 4, 0.95);
    s.hit('tom3', bar * 4 + 1, 0.7);
    s.hit('taiko', bar * 4 + 2, 0.8);
    s.hit('tom2', bar * 4 + 3, 0.6);
    if (bar % 4 === 3) s.hit('tom1', bar * 4 + 3.5, 0.7);
  }
  s.pad('strings', 0, 20, { lo: 43, hi: 65, vel: 0.5 });
  s.pad('choir', 8, 20, { lo: 50, hi: 70, vel: 0.5, o: { vowel: 'oh' } });
  s.mel('brass', 0, G1, { vel: 0.8, oct: 3 });
  s.mel('horn', 8, G1, { vel: 0.66, oct: 3 });
  s.mel('brass', 8, G1, { vel: 0.8, oct: 2 });
  s.mel('brass', 16, G2, { vel: 0.8, oct: 3 });
  s.mel('horn', 16, G2, { vel: 0.7, oct: 3 });
  s.stab('brass', 8, 16, { pat: 'X.......', step: 0.5, vel: 0.5, lo: 43, hi: 62, n: 3 });
  s.swellTo(8 * 4, 8, 0.6);
  s.swellTo(16 * 4, 8, 0.7);
  return s;
}
