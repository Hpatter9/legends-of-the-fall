// The boss: the main theme broken into fragments, in Bb minor at 166 bpm. The hook's first half answered by the Neapolitan
// (the flat second), an organ and choir over a double-kick band, the B section sung slowly by the choir over the fast pulse,
// a breakdown of the hook's pieces with silences between, and the whole band at the end. Plays for a boss fought alone.
import { arrange } from '../theme.mjs';

const H = '^1:.75 5:.75 ^1:.5 ^3:1 ^2:.5 ^1:.5';
const N = '^2b:.75 6:.75 ^2b:.5 ^4:2';
const RUN = '5:.5 6:.5 7#:.5 ^1:.5 ^2:.5 ^3:.5 ^4:.5 7#:.5';
const A = `${H} | ${N} | ${H} | 7#:.75 5:.75 7#:.5 ^2:2 | ^1:.75 6:.75 ^1:.5 ^3:2 | ^2b:.75 ^4:.75 ^6:.5 ^4:2 | ^2:.75 7#:.75 ^2:.5 ^4:1 ^2:1 | ^1:3 r:1`;
const DOUBLE = { kick: 'XxxxXxxxXxxxXxxx', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' };

export default () => arrange({
  id: 'boss', key: 'Bb', bpm: 166, seed: 61, target: 0.18,
  mix: { levels: { organ: 1.1, choir: 1.15, guitar: 1.05, timp: 1.2 } },
  prog: { intro: 'i N i V7', A: 'i N i V7  VI N V7 i', B: 'VI VI VII VII  III III i i', C: 'i N i N  iv N V7 V7', B2: 'iv N V7 V7' },
  melody: {
    intro: `${H} | ${N} | ${H} | ${RUN}`,
    A,
    B: '^1:2 ^3:2 | ^6:4 | ^5:1.5 ^4:1.5 ^2:1 | ^4:4 | ^3:2 ^5:2 | ^7:4 | ^5:1.5 ^4:1.5 ^3:1 | ^5:4',
    C: `${H} | r:4 | ^1:.75 5:.75 ^1:.5 r:2 | r:4 | ^4:.75 ^1:.75 ^4:.5 r:2 | ^2b:.75 6:.75 ^2b:.5 r:2 | 7#:.75 5:.75 7#:.5 ^2:2 | ${RUN}`,
    A2: A,
    B2: '^4:.75 ^1:.75 ^4:.5 ^6:2 | ^2b:.75 6:.75 ^2b:.5 ^4:2 | ^2:.75 7#:.75 ^2:.5 ^5:2 | ^4:.75 ^2:.75 7#:.5 5:2',
    turn: `${H} | ${N} | ${H} | ${RUN}`,
  },
  layers: [
    { kind: 'mel', inst: 'guitar', oct: 4, vel: 0.82, glide: 2, in: ['intro', 'A', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'organ', oct: 3, vel: 0.62, o: { reg: 'reed' }, in: ['intro', 'A', 'C', 'A2', 'turn'] },
    { kind: 'mel', inst: 'choir', oct: 4, vel: 0.8, o: { vowel: 'ah', a: 0.08 }, in: ['B'] },
    { kind: 'mel', inst: 'horn', oct: 3, vel: 0.65, in: ['B', 'B2'] },
    { kind: 'mel', inst: 'trumpet', oct: 4, vel: 0.6, in: ['A2'] },
    { kind: 'pad', inst: 'choir', lo: 53, hi: 74, vel: 0.55, o: { vowel: 'oo' }, in: ['intro', 'A', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'pad', inst: 'strings', lo: 46, hi: 66, vel: 0.55, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'pad', inst: 'organ', lo: 34, hi: 55, vel: 0.4, o: { reg: 'full' }, in: ['C', 'A2'] },
    { kind: 'bass', inst: 'bass', base: 22, vel: 0.86, pat: { all: 'rrrrrrrrrrrrrrrr', C: 'R.......R.......' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'chug', base: 34, vel: 0.72, pat: { all: 'r.rrr.rrr.rrr.rr', B: 'R.r.r.R.r.r.R.r.' }, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...X...', vel: 0.75, lo: 50, hi: 69, in: ['intro', 'A', 'A2', 'turn'] },
    { kind: 'arp', inst: 'stac', pat: '0123432101234321', base: 58, vel: 0.55, in: ['B'] },
    { kind: 'arp', inst: 'harpsi', pat: '0.1.2.1.0.1.2.1.', base: 58, vel: 0.5, in: ['C'] },
    { kind: 'timp', pat: 'R..R..R.R.R.....', vel: 0.78, base: 34, in: ['intro', 'A', 'C', 'A2', 'turn'] },
  ],
  drums: { map: { kick: 'kick2', snare: 'snare2' }, groove: { A: DOUBLE, B: 'drive', C: { kick: 'X...............', snare: '' }, A2: DOUBLE, B2: DOUBLE } },
  extra: (s) => {
    for (const bar of [4, 28]) s.add('drum', bar * 4, 0, 'gong', 0.6, {});
    s.add('drum', 20 * 4, 0, 'china', 0.9, {});
  },
});
