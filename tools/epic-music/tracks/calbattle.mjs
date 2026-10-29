// The Calamity's battle (a Rift Sanctuary fight that is not a boss): the main theme in F# minor at 176 bpm, everything at
// once: the electric guitar and the violins on the tune, the choir, brass on the hook's rhythm, synth arpeggios and bells
// like the rift's light, double kick, and a breakdown of taiko and synth under the trumpet's fragments.
import { arrange } from '../theme.mjs';

const DOUBLE = { kick: 'XxxxXxxxXxxxXxxx', snare: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' };

export default () => arrange({
  id: 'calbattle', key: 'F#', bpm: 176, seed: 71, target: 0.18,
  mix: { levels: { guitar: 1.05, choir: 1.1, synth: 1 } },
  prog: { C: 'd6 d7 d1 d1  d6 d7 d5M d5M7' },
  layers: [
    { kind: 'mel', inst: 'guitar', oct: 4, vel: 0.8, glide: 1.5, in: ['intro', 'A', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'violins', oct: 4, vel: 0.55, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'lead', oct: 4, vel: 0.62, in: ['B'] },
    { kind: 'mel', inst: 'trumpet', oct: 4, vel: 0.72, in: ['C'] },
    { kind: 'mel', inst: 'choir', oct: 3, vel: 0.6, o: { vowel: 'ah' }, in: ['A2'] },
    { kind: 'line', inst: 'horn', lo: 54, hi: 69, vel: 0.6, in: ['B', 'A2', 'B2'] },
    { kind: 'pad', inst: 'choir', lo: 54, hi: 76, vel: 0.55, o: { vowel: 'ah' }, in: ['intro', 'A', 'B', 'C', 'B2', 'turn'] },
    { kind: 'pad', inst: 'strings', lo: 49, hi: 68, vel: 0.5, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'bass', inst: 'bass', base: 30, vel: 0.85, pat: { all: 'r.ror.ror.ror.ro', C: 'R.......R.r.....' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'chug', base: 42, vel: 0.68, pat: 'r.rrr.rrr.rrr.r.', in: ['intro', 'A', 'A2', 'B2', 'turn'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...X...', vel: 0.74, lo: 54, hi: 71, in: ['intro', 'A', 'A2', 'turn'] },
    { kind: 'arp', inst: 'synth', pat: '0123432101234321', base: 66, vel: 0.45, in: ['B', 'C', 'B2'] },
    { kind: 'timp', pat: 'R.......R.R.....', vel: 0.75, base: 42, in: ['A2'] },
  ],
  drums: { map: { kick: 'kick2', snare: 'snare2' }, tomFill: 'tom', groove: { A: DOUBLE, B: 'drive', C: { taiko: 'X..X..X.X.......', kick: '........X.......', taikoRim: '....x.......x...' }, A2: DOUBLE, B2: 'drive' } },
  extra: (s) => {
    for (const bar of [12, 20, 24]) s.add('bell', bar * 4, 4, 66, 0.5, { ring: 5 });
  },
});
