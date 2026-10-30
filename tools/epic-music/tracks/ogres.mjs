// The Ogre Clans' battle: the main theme in A minor at 138 bpm, stomping. Feet on the floor on every beat, claps on the
// backbeat, a tuba playing the tune (doubled up an octave by a horn) and oom-pah under it, low brass stabs, and a breakdown
// of stomps and the tuba alone.
import { arrange } from '../theme.mjs';

const STOMP = { stomp: 'X.......X.......', kick: '....x.......x...', clap: '....X.......X...', hat: '..x...x...x...x.' };
const STOMP2 = { stomp: 'X...X...X...X...', clap: '....X.......X..x', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' };

export default () => arrange({
  id: 'ogres', key: 'A', bpm: 138, seed: 351, target: 0.175,
  mix: { levels: { brass: 1.2, drums: 1.05 } },
  layers: [
    { kind: 'mel', inst: 'tuba', oct: 2, vel: 0.85, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'horn', oct: 3, vel: 0.6, in: ['intro', 'A', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'trumpet', oct: 4, vel: 0.55, in: ['A2'] },
    { kind: 'line', inst: 'horn', lo: 52, hi: 67, vel: 0.55, rhythm: [1.5, 1.5, 1], in: ['B', 'B2'] },
    { kind: 'pad', inst: 'strings', lo: 45, hi: 64, vel: 0.45, in: ['A', 'B', 'A2', 'B2'] },
    { kind: 'pad', inst: 'choir', lo: 50, hi: 69, vel: 0.45, o: { vowel: 'oh' }, in: ['A2'] },
    { kind: 'bass', inst: 'tuba', base: 33, vel: 0.75, len: 0.6, pat: { all: 'R...5...R...5...', C: 'R.......R.......' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'bass', inst: 'bass', base: 21, vel: 0.75, pat: 'r...r...r...r.r.', in: ['A', 'B', 'A2', 'B2'] },
    { kind: 'stab', inst: 'brass', pat: '....X.......X...', vel: 0.7, lo: 48, hi: 64, in: ['A', 'B', 'B2'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...X...', vel: 0.78, lo: 48, hi: 64, in: ['intro', 'A2', 'turn'] },
    { kind: 'chug', base: 33, vel: 0.6, pat: 'R.....r.R.......', o: { mute: false, r: 0.1 }, in: ['A2'] },
    { kind: 'timp', pat: 'R.......R.......', vel: 0.75, base: 33, in: ['C', 'A2'] },
  ],
  drums: { tomFill: 'war', groove: { A: STOMP, B: STOMP2, C: { stomp: 'X.......X.......', clap: '....X.......X...' }, A2: STOMP2, B2: STOMP } },
});
