// The Orc Warband's battle: the main theme in C minor at 146 bpm, heavy. War drums under the kit, the tune on trumpets with
// the horns an octave down, a tuba doubling the bass, open power chords, and a breakdown of war drums and shouted brass.
import { arrange } from '../theme.mjs';

const WAR = { kick: 'X.....x.X.x.....', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.', wardrum: 'X.......X...X...' };
const WARBREAK = { wardrum: 'X..X..X.X.X.X...', taiko: 'X.......X.......', taikoRim: '....x.......x.x.' };

export default () => arrange({
  id: 'orcs', key: 'C', bpm: 146, seed: 301, target: 0.175,
  mix: { levels: { brass: 1.15, drums: 1.05, chug: 1.1 } },
  layers: [
    { kind: 'mel', inst: 'trumpet', oct: 4, vel: 0.8, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'horn', oct: 3, vel: 0.7, in: ['intro', 'A', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'guitar', oct: 4, vel: 0.62, glide: 1.5, in: ['A2'] },
    { kind: 'mel', inst: 'horn', oct: 3, vel: 0.8, in: ['C'] },
    { kind: 'mel', inst: 'tuba', oct: 2, vel: 0.7, in: ['C'] },
    { kind: 'line', inst: 'horn', lo: 53, hi: 67, vel: 0.6, rhythm: [1.5, 1.5, 1], in: ['B'] },
    { kind: 'pad', inst: 'strings', lo: 48, hi: 67, vel: 0.5, in: ['A', 'B', 'C', 'A2', 'B2'] },
    { kind: 'pad', inst: 'choir', lo: 52, hi: 72, vel: 0.5, o: { vowel: 'oh' }, in: ['C', 'A2'] },
    { kind: 'bass', inst: 'bass', base: 24, vel: 0.85, pat: { all: 'r.r.r.r.r.r.r.ro', C: 'R.......R.r.....' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'bass', inst: 'tuba', base: 36, vel: 0.7, len: 0.7, pat: 'R...5...R...5...', in: ['A', 'B', 'A2', 'B2'] },
    { kind: 'chug', base: 36, vel: 0.7, pat: { all: 'R.....r.R.r.....', A2: 'R..r..r.R.r.r.r.' }, o: { mute: false, r: 0.1 }, in: ['intro', 'A', 'A2', 'B2', 'turn'] },
    { kind: 'chug', base: 36, vel: 0.6, pat: 'r.rrr.rrr.rrr.r.', in: ['B'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...X...', vel: 0.78, lo: 48, hi: 67, in: ['intro', 'A', 'A2', 'turn'] },
    { kind: 'stab', inst: 'choir', pat: 'X.......X.......', vel: 0.6, lo: 52, hi: 70, len: 0.3, o: { vowel: 'ah', a: 0.03 }, in: ['C'] },
    { kind: 'timp', pat: 'R.......R.R.....', vel: 0.8, base: 36, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
  ],
  drums: { map: { kick: 'kick2', snare: 'snare2' }, tomFill: 'war', groove: { A: WAR, B: 'rock16', C: 'halftime', A2: WAR, B2: WAR } },
  perc: [{ groove: WARBREAK, in: ['C'], vel: 0.9 }],
});
