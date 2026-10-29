// The Beast Horde's battle: the main theme in E minor at 160 bpm, tribal. Hand drums, frame drums, taiko and a shaker
// under a lighter kit, the tune on horns and a trumpet, and a breakdown of drums alone with the horns calling the hook.
import { arrange } from '../theme.mjs';

const TRIBE = { hand: '..x...x...x.x.x.', frame: 'X..x..x.X..x....', shaker: 'xxxxxxxxxxxxxxxx' };
const BREAK = { taiko: 'X..X..X.X...X...', hand: 'x.xxx.xxx.xxx.xx', frame: '....X.......X..x', shaker: 'x.x.x.x.x.x.x.x.' };
const KIT = { kick: 'X.....x.X.x.....', snare: '....X.......X...', tom3: '..........x...x.' };

export default () => arrange({
  id: 'beasts', key: 'E', bpm: 160, seed: 321, target: 0.17,
  mix: { levels: { brass: 1.1, drums: 1.05 } },
  layers: [
    { kind: 'mel', inst: 'horn', oct: 3, vel: 0.8, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'trumpet', oct: 4, vel: 0.62, in: ['A2', 'B2'] },
    { kind: 'mel', inst: 'flute', oct: 4, vel: 0.6, in: ['B'] },
    { kind: 'mel', inst: 'horn', oct: 3, vel: 0.8, in: ['C'] },
    { kind: 'line', inst: 'strings', lo: 52, hi: 69, vel: 0.55, in: ['A', 'A2'] },
    { kind: 'pad', inst: 'strings', lo: 47, hi: 66, vel: 0.48, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'pad', inst: 'choir', lo: 52, hi: 72, vel: 0.45, o: { vowel: 'oh' }, in: ['C'] },
    { kind: 'bass', inst: 'bass', base: 28, vel: 0.82, pat: { all: 'r..r..r.r.o.r.5.', C: 'R..r..r.R.......' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...x...', vel: 0.7, lo: 52, hi: 71, in: ['intro', 'A', 'A2', 'turn'] },
    { kind: 'arp', inst: 'pizz', pat: '0.2.1.2.0.2.1.2.', base: 59, vel: 0.6, in: ['B', 'B2'] },
    { kind: 'timp', pat: 'R..R..R.R.......', vel: 0.7, base: 40, in: ['C', 'A2'] },
  ],
  drums: { tomFill: 'taiko', groove: { A: KIT, B: KIT, C: null, A2: 'drive', B2: KIT } },
  perc: [{ groove: TRIBE, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'], vel: 0.75 }, { groove: BREAK, in: ['C'], vel: 0.95 }],
  extra: (s) => {
    s.fill(27, 'taiko', 1);
    s.add('drum', 28 * 4, 0, 'crash', 0.9, {});
  },
});
