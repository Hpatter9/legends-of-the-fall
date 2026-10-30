// The Undead Legion's battle: the main theme in B minor at 150 bpm on a pipe organ's reeds, a choir ("ooh", then "ah") behind
// it, harpsichord running under the B section, church bells on the sections' downbeats and a breakdown where the choir sings
// the hook over the organ's pedal.
import { arrange } from '../theme.mjs';

export default () => arrange({
  id: 'undead', key: 'B', bpm: 150, seed: 311, target: 0.17,
  mix: { levels: { organ: 1.1, choir: 1.15, bells: 0.8 } },
  prog: { C: 'd6 d4 d1 d2  d6 d4 d5M d5M7' },
  layers: [
    { kind: 'mel', inst: 'organ', oct: 3, vel: 0.75, o: { reg: 'reed', trem: 6 }, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'violins', oct: 4, vel: 0.45, in: ['A2', 'B2'] },
    { kind: 'mel', inst: 'choir', oct: 4, vel: 0.75, o: { vowel: 'ah', a: 0.05 }, in: ['C'] },
    { kind: 'mel', inst: 'organ', oct: 3, vel: 0.5, o: { reg: 'flute' }, in: ['C'] },
    { kind: 'line', inst: 'choir', lo: 57, hi: 72, vel: 0.55, o: { vowel: 'oo' }, rhythm: [2, 2], in: ['A', 'A2'] },
    { kind: 'pad', inst: 'choir', lo: 54, hi: 76, vel: 0.55, o: { vowel: 'oo' }, in: ['B', 'B2'] },
    { kind: 'pad', inst: 'strings', lo: 47, hi: 66, vel: 0.5, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'pad', inst: 'organ', lo: 42, hi: 62, vel: 0.36, o: { reg: 'diapason' }, in: ['A', 'B', 'A2', 'B2'] },
    { kind: 'bass', inst: 'organ', base: 23, vel: 0.6, len: 3.9, pat: 'R...............', step: 1, o: { reg: 'pedal', r: 0.3 }, in: ['C'] },
    { kind: 'bass', inst: 'bass', base: 23, vel: 0.82, pat: { all: 'r.ror.ror.ror.ro', B: 'r.r.r.r.r.r.r.rr' }, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'chug', base: 35, vel: 0.55, pat: 'r.rrr.r.r.rrr.r.', in: ['A2', 'B2'] },
    { kind: 'arp', inst: 'harpsi', pat: '0120121201201212', base: 59, vel: 0.55, in: ['B', 'B2'] },
    { kind: 'arp', inst: 'harpsi', pat: '0.1.2.1.0.1.2.1.', base: 59, vel: 0.5, in: ['C'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X.......', vel: 0.62, lo: 50, hi: 69, in: ['intro', 'A2', 'turn'] },
    { kind: 'timp', pat: 'R.......R.R.....', vel: 0.65, base: 35, in: ['A2'] },
  ],
  drums: { groove: { A: 'drive', B: 'rock16', C: 'halftime', A2: 'gallop', B2: 'drive' } },
  extra: (s) => {
    for (const bar of [4, 12, 28, 36]) s.add('bell', bar * 4, 4, 59, 0.6, { ring: 5 });
    s.add('drum', 20 * 4, 0, 'gong', 0.7, {});
  },
});
