// The War's End: the main theme in D major at 100 bpm, for the scene after the Last Hold falls and the Dark Council's end card (HOLD-SOUND
// round 2, docs/notes/hold-sound.md). It is the triumph's key and tune, told as an ending: the tune first alone on a horn over still
// strings and a bell (the field after the battle), the B section on the strings with the choir rising under it, then the tune again with
// everything: trumpets, horns an octave under, the choir, bells on every phrase, a march on the kit and the timpani. About 58 s; it loops
// from the full statement back to the lone horn.
import { Song } from '../song.mjs';
import { MELODY } from '../theme.mjs';

// (the theme's minor-key leading note is the major scale's own seventh)
const maj = (t) => t.replace(/7#/g, '7');

export default function () {
  const s = new Song({ id: 'warend', bpm: 100, key: 'D', mode: 'maj', bars: 24, target: 0.15, seed: 311, kbps: 32, mix: { levels: { timp: 1.2, brass: 1.1, choir: 1.1 } } });
  s.prog(0, 'd1 d6 d3 d5_7  d1 d6 d4+d5 d1');
  s.prog(8, 'd6 d5_7 d3 d1  d4 d1 d6+d5_7 d5');
  s.prog(16, 'd1 d6 d3 d5_7  d1 d6 d4+d5 d1');
  // the field after the battle: a horn alone, still strings, an organ's pedal, a bell
  s.pad('strings', 0, 8, { lo: 50, hi: 69, vel: 0.4 });
  s.bassline('organ', 0, 24, { pat: 'R...............', base: 26, vel: 0.45, len: 3.95, o: { reg: 'pedal', r: 0.5 } });
  s.mel('horn', 0, maj(MELODY.A), { vel: 0.7, oct: 3 });
  s.timp(4, 8, { pat: 'R...............', vel: 0.5, base: 38 });
  // the strings take the B section, the choir rising under them
  s.pad('strings', 8, 16, { lo: 52, hi: 74, vel: 0.55 });
  s.pad('choir', 8, 16, { lo: 55, hi: 76, vel: 0.5 });
  s.bassline('bass', 8, 16, { pat: 'R.......R.......', base: 38, vel: 0.6, len: 1.9 });
  s.arp('stac', 8, 16, { pat: '0123432101234321', base: 62, vel: 0.4 });
  s.mel('violins', 8, maj(MELODY.B), { vel: 0.65 });
  s.mel('horn', 8, maj(MELODY.B), { vel: 0.5, oct: 3 });
  s.timp(12, 16, { pat: 'R.......R.R.....', vel: 0.7, base: 38 });
  // the tune again, with everything
  s.pad('strings', 16, 24, { lo: 52, hi: 76, vel: 0.6 });
  s.pad('organ', 16, 24, { lo: 50, hi: 70, vel: 0.38, o: { reg: 'full' } });
  s.pad('choir', 16, 24, { lo: 57, hi: 79, vel: 0.62 });
  s.bassline('bass', 16, 24, { pat: 'R.r.R.r.R.r.R.r.', base: 38, vel: 0.7, len: 0.7 });
  s.stab('brass', 16, 24, { pat: 'X..X..X.X...x...', step: 0.25, vel: 0.6, lo: 52, hi: 72, n: 3, len: 0.5 });
  s.timp(16, 24, { pat: 'R.......R.R.....', vel: 0.85, base: 38 });
  s.kit(16, 24, { groove: 'march', vel: 0.7, fills: [23], crash: [16, 20] });
  s.mel('trumpet', 16, maj(MELODY.A), { vel: 0.72 });
  s.mel('horn', 16, maj(MELODY.A), { vel: 0.75, oct: 3 });
  s.mel('violins', 16, maj(MELODY.A), { vel: 0.5 });
  for (const bar of [0, 8, 16, 18, 20, 22]) s.add('bell', bar * 4, 4, bar >= 16 ? 74 : 62, bar >= 16 ? 0.45 : 0.5, { ring: 5 });
  s.swellTo(8 * 4, 4, 0.55);
  s.swellTo(16 * 4, 4, 0.7);
  s.swellTo(24 * 4 - 0.01, 2, 0.55);
  return s;
}
