// The Yokai Procession's battle: the main theme at 158 bpm moved onto a Japanese pentatonic (the "in" scale: D, Eb, G, A,
// Bb), over chords drawn from the same notes (a suspended tonic, the flat-second chord, the minor fourth) that close on the
// Phrygian cadence, flat second to tonic. A koto on the tune, pressed up into its leaps, a shakuhachi-like flute doubling it, taiko and
// its rim for the drums, and a breakdown of the koto and taiko alone.
import { arrange } from '../theme.mjs';

const IN = [0, 1, 5, 7, 8];
const TAIKO = { taiko: 'X.....x.X.......', taikoRim: '....x.......x.x.', kick: 'X.......X.x.....', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' };
const BREAK = { taiko: 'X..X..X.X..x.x..', taikoRim: '..x...x...x...xx', hand: 'x...x...x...x...' };

export default () => arrange({
  id: 'yokai', key: 'D', mode: 'phr', snap: IN,
  prog: {
    intro: 'isus4 iv@1 iv N',
    A: 'isus4 iv@1 N N  isus4 iv@1 iv+N isus4',
    B: 'iv@1 N N isus4  iv isus4 iv@1+N N',
    C: 'iv@1 iv isus4 N  iv@1 iv N N',
    B2: 'iv isus4 iv@1+N N',
  }, bpm: 158, seed: 371, target: 0.165,
  mix: { levels: { koto: 1.3, flute: 1, drums: 1 } },
  layers: [
    { kind: 'mel', inst: 'koto', oct: 4, vel: 0.85, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'koto', oct: 3, vel: 0.6, o: { pan: 0.3 }, in: ['A2'] },
    { kind: 'mel', inst: 'shaku', oct: 4, vel: 0.6, in: ['A', 'B', 'A2', 'B2'] },
    { kind: 'pad', inst: 'strings', lo: 50, hi: 67, vel: 0.42, in: ['A', 'B', 'A2', 'B2'] },
    { kind: 'pad', inst: 'choir', lo: 55, hi: 72, vel: 0.4, o: { vowel: 'oo' }, in: ['C'] },
    { kind: 'bass', inst: 'bass', base: 26, vel: 0.78, pat: { all: 'r..r..r.r...o...', C: 'R.......R.......' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'stab', inst: 'stac', pat: 'X..X..X.X...x...', vel: 0.6, lo: 55, hi: 72, in: ['intro', 'A2', 'turn'] },
    { kind: 'timp', pat: 'R.......R.......', vel: 0.6, base: 38, in: ['A2'] },
  ],
  drums: { tomFill: 'taiko', groove: { A: TAIKO, B: TAIKO, C: null, A2: TAIKO, B2: TAIKO } },
  perc: [{ groove: BREAK, in: ['C'], vel: 0.95 }],
  extra: (s) => {
    // the koto's ostinato on the in scale under the B sections, and a gong into the breakdown
    for (let bar = 12; bar < 20; bar++) [0, 7, 8, 12, 13, 12, 8, 7].forEach((iv, k) => s.add('koto', bar * 4 + k * 0.5, 0.4, 50 + iv, 0.5, { pan: -0.35 }));
    s.add('drum', 20 * 4, 0, 'gong', 0.75, {});
    s.fill(27, 'taiko', 1);
  },
});
