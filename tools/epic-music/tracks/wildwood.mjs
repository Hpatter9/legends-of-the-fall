// The Wildwood's battle: the main theme in G Dorian (the minor with a raised sixth, a folk tune's mode) at 168 bpm. A fiddle
// on the tune and a flute on the counter-line, a harp running, frame drum and shaker under a light kit, and a breakdown where
// the flute plays the hook over the harp alone.
import { arrange } from '../theme.mjs';

const JIG = { kick: 'X.......X.x.....', snare: '....x.......x..o', hat: 'x.xxx.xxx.xxx.xx' };
const FOLK = { frame: 'X..x..x.X..x.x..', shaker: 'x.xxx.xxx.xxx.xx' };

export default () => arrange({
  id: 'wildwood', key: 'G', mode: 'dor', bpm: 168, seed: 331, target: 0.165,
  mix: { levels: { fiddle: 1.1, flute: 1.05, koto: 0.9, drums: 0.85, bass: 1.45 }, masterEq: [{ type: 'ls', hz: 150, q: 0.7, g: 3 }, { type: 'hs', hz: 6000, q: 0.7, g: -2 }] },
  layers: [
    { kind: 'mel', inst: 'fiddle', oct: 4, vel: 0.8, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'flute', oct: 5, vel: 0.55, in: ['A2'] },
    { kind: 'mel', inst: 'flute', oct: 4, vel: 0.75, in: ['C'] },
    { kind: 'line', inst: 'flute', lo: 67, hi: 81, vel: 0.55, rhythm: [1, 1, 1.5, 0.5], in: ['B', 'B2'] },
    { kind: 'line', inst: 'horn', lo: 55, hi: 67, vel: 0.5, in: ['A2'] },
    { kind: 'pad', inst: 'strings', lo: 50, hi: 69, vel: 0.42, in: ['A', 'B', 'C', 'A2', 'B2'] },
    { kind: 'arp', inst: 'harp', pat: '0123210101232101', base: 55, vel: 0.62, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'bass', inst: 'bass', base: 31, vel: 0.72, pat: { all: 'r...5...r.o.5...', C: 'r.......5.......' }, len: 0.7, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'stab', inst: 'stac', pat: 'X..X..X.X...x...', vel: 0.62, lo: 55, hi: 74, n: 4, in: ['intro', 'A', 'A2', 'turn'] },
  ],
  drums: { vel: 0.85, groove: { A: JIG, B: JIG, C: null, A2: 'gallop', B2: JIG } },
  perc: [{ groove: FOLK, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'], vel: 0.72 }],
  extra: (s) => s.fill(27, 'snare', 0.8),
});
