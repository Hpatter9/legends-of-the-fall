// The Infernal Host's battle: the main theme in E Phrygian (the flat second) at 172 bpm. A distorted lead guitar on the tune,
// tight power chords and double kick, a choir of "ah"s behind, the organ in the breakdown with the choir singing the hook.
import { arrange, MELODY, PROG } from '../theme.mjs';

// (in the Phrygian the dominant is left diminished, with the mode's own seventh: its flat second then sits in the chord, and the
//  cadence falls by the Phrygian's half step)
const dark = (t) => t.replace(/d5M7/g, 'd5_7').replace(/d5M/g, 'd5').replace(/7#/g, '7');
const prog = Object.fromEntries(Object.entries(PROG).map(([k, v]) => [k, dark(v)]));
const melody = Object.fromEntries(Object.entries(MELODY).map(([k, v]) => [k, dark(v)]));

const DOUBLE = { kick: 'XxxxXxxxXxxxXxxx', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' };

export default () => arrange({
  id: 'infernal', key: 'E', mode: 'phr', bpm: 172, seed: 361, target: 0.175, prog, melody,
  mix: { levels: { guitar: 1.15, chug: 1.1, choir: 1.1 } },
  layers: [
    { kind: 'mel', inst: 'guitar', oct: 4, vel: 0.82, glide: 2, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'guitar', oct: 3, vel: 0.55, o: { pan: -0.4 }, in: ['A2'] },
    { kind: 'mel', inst: 'choir', oct: 4, vel: 0.75, o: { vowel: 'ah', a: 0.05 }, in: ['C'] },
    { kind: 'mel', inst: 'organ', oct: 3, vel: 0.55, o: { reg: 'full' }, in: ['C'] },
    { kind: 'line', inst: 'brass', lo: 52, hi: 67, vel: 0.6, in: ['B', 'A2'] },
    { kind: 'pad', inst: 'choir', lo: 52, hi: 74, vel: 0.6, o: { vowel: 'ah' }, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'pad', inst: 'organ', lo: 40, hi: 60, vel: 0.4, o: { reg: 'full' }, in: ['C', 'A2'] },
    { kind: 'bass', inst: 'bass', base: 28, vel: 0.85, pat: { all: 'rrrrrrrrrrrrrrrr', C: 'R.......R.r.....' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'chug', base: 40, vel: 0.75, pat: { all: 'r.rrr.rrr.rrr.rr', B: 'R.r.r.R.r.r.R.r.' }, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...X...', vel: 0.72, lo: 52, hi: 69, in: ['intro', 'A2', 'turn'] },
    { kind: 'timp', pat: 'R.......R.R.....', vel: 0.7, base: 40, in: ['C'] },
  ],
  drums: { map: { kick: 'kick2', snare: 'snare2' }, groove: { A: DOUBLE, B: 'drive', C: 'halftime', A2: DOUBLE, B2: DOUBLE } },
  extra: (s) => s.add('drum', 20 * 4, 0, 'china', 0.9, {}),
});
