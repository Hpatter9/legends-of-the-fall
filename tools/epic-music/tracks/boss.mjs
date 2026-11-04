// The boss: the one boss track (docs/notes/battle-music-2.md), which takes over from the battle track when a boss wave or a boss
// fight begins. The same main theme in the same key as the battle (D minor), so the crossfade between them blends, but heavier
// and faster (176 bpm): the choir sings the tune with the trumpets, horns and tuba double it below, an organ and the choir hold
// the chords, a double kick and war drums under the kit, taiko and timpani in the breakdown, gongs on the sections, and the
// whole band with the electric guitar when the tune comes back.
import { arrange } from '../theme.mjs';

const DOUBLE = { kick: 'XxxxXxxxXxxxXxxx', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.', wardrum: 'X.......X.......' };
const POUND = { kick: 'X.xxX.xxX.xxX.xx', snare: '....X..x....X...', hat: 'x.x.x.x.x.x.x.x.', wardrum: 'X...X...X...X...' };
const BREAK = { taiko: 'X..X..X.X..X..X.', taikoRim: '....x.......x.x.', kick: 'X.......X.......', wardrum: '........X.X.X.X.' };

export default () => arrange({
  id: 'boss', key: 'D', bpm: 176, seed: 67, target: 0.18,
  mix: { levels: { brass: 1.15, choir: 1.15, organ: 1, guitar: 1, timp: 1.2, drums: 1.05 } },
  prog: { C: 'd6 d4 d1 d7  d6 d4 d5M d5M7' },
  layers: [
    // the tune: trumpets and the choir, the horns and tuba an octave and two below
    { kind: 'mel', inst: 'trumpet', oct: 4, vel: 0.82, in: ['intro', 'A', 'B', 'B2', 'turn'] },
    { kind: 'mel', inst: 'choir', oct: 4, vel: 0.72, o: { vowel: 'ah', a: 0.05 }, in: ['A', 'B', 'A2', 'B2'] },
    { kind: 'mel', inst: 'horn', oct: 3, vel: 0.72, in: ['intro', 'A', 'A2', 'turn'] },
    { kind: 'mel', inst: 'tuba', oct: 2, vel: 0.62, in: ['A', 'A2'] },
    { kind: 'mel', inst: 'guitar', oct: 4, vel: 0.8, glide: 2, in: ['A2'] },
    { kind: 'mel', inst: 'organ', oct: 4, vel: 0.6, o: { reg: 'reed' }, in: ['C'] },
    // the chords: organ and choir, strings all through
    { kind: 'pad', inst: 'organ', lo: 38, hi: 57, vel: 0.42, o: { reg: 'full' }, in: ['intro', 'A', 'C', 'A2', 'turn'] },
    { kind: 'pad', inst: 'choir', lo: 52, hi: 72, vel: 0.5, o: { vowel: 'oo' }, in: ['intro', 'C', 'turn'] },
    { kind: 'pad', inst: 'strings', lo: 48, hi: 67, vel: 0.55, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'line', inst: 'horn', lo: 53, hi: 67, vel: 0.62, rhythm: [1.5, 1.5, 1], in: ['B', 'B2'] },
    // the engine: a pounding bass and open power chords, brass stabs, string runs, timpani
    { kind: 'bass', inst: 'bass', base: 26, vel: 0.88, pat: { all: 'rrrrrrrrrrrrrrrr', C: 'R.......R.r.....' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'chug', base: 38, vel: 0.72, pat: { all: 'r.rrr.rrr.rrr.rr', B: 'R.r.r.R.r.r.R.r.' }, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...X...', vel: 0.78, lo: 50, hi: 69, in: ['intro', 'A', 'A2', 'turn'] },
    { kind: 'stab', inst: 'choir', pat: 'X.......X.......', vel: 0.62, lo: 52, hi: 70, len: 0.3, o: { vowel: 'ah', a: 0.03 }, in: ['C'] },
    { kind: 'arp', inst: 'stac', pat: '0123432101234321', base: 57, vel: 0.52, in: ['B', 'B2'] },
    { kind: 'timp', pat: 'R..R..R.R.R.....', vel: 0.8, base: 38, in: ['intro', 'A', 'C', 'A2', 'turn'] },
  ],
  drums: { map: { kick: 'kick2', snare: 'snare2' }, tomFill: 'war', groove: { A: DOUBLE, B: POUND, C: BREAK, A2: DOUBLE, B2: POUND } },
  extra: (s) => {
    for (const bar of [4, 20, 28]) s.add('drum', bar * 4, 0, 'gong', 0.62, {});
    s.add('drum', 12 * 4, 0, 'china', 0.85, {});
  },
});
