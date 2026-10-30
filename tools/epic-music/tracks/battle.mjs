// Battle, the general one (the daily, the Last Stand, the spire's floors and a field fight): the main theme in D minor at
// 156 bpm in its plainest JRPG dress. A bright synth lead and the violins on the tune, the horns' counter-line, brass stabs
// on the hook's rhythm, a driving bass and palm-muted guitars, and the electric guitar taking the tune when it comes back.
import { arrange } from '../theme.mjs';

export default () => arrange({
  id: 'battle', key: 'D', bpm: 156, seed: 21, target: 0.17,
  mix: { levels: { lead: 1, brass: 0.95, guitar: 0.9 } },
  layers: [
    { kind: 'mel', inst: 'lead', oct: 4, vel: 0.8, glide: 0.7, in: ['intro', 'A', 'B', 'B2', 'turn'] },
    { kind: 'mel', inst: 'violins', oct: 4, vel: 0.5, in: ['A', 'A2', 'B2'] },
    { kind: 'mel', inst: 'guitar', oct: 4, vel: 0.78, glide: 1.5, o: { slide: 0 }, in: ['A2'] },
    { kind: 'mel', inst: 'lead', oct: 3, vel: 0.6, in: ['A2'] },
    { kind: 'mel', inst: 'trumpet', oct: 4, vel: 0.72, in: ['C'] },
    { kind: 'mel', inst: 'horn', oct: 3, vel: 0.62, in: ['C'] },
    { kind: 'line', inst: 'horn', lo: 55, hi: 70, vel: 0.6, in: ['B', 'A2', 'B2'] },
    { kind: 'pad', inst: 'strings', lo: 50, hi: 69, vel: 0.5, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'pad', inst: 'choir', lo: 57, hi: 79, vel: 0.55, in: ['C', 'A2'] },
    { kind: 'bass', inst: 'bass', base: 26, vel: 0.82, pat: { all: 'r.ror.ror.ror.ro', B: 'r.r.r.rorr.r.rro', C: 'R...r.r.R...r.r.' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'chug', base: 38, vel: 0.62, pat: 'r.rrr.rrr.rrr.r.', in: ['A', 'A2', 'B2'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...x...', vel: 0.7, in: ['intro', 'A', 'A2', 'turn'] },
    { kind: 'arp', inst: 'stac', pat: '0123432101234321', base: 57, vel: 0.5, in: ['B', 'B2'] },
    { kind: 'arp', inst: 'synth', pat: '0.2.4.2.0.2.4.2.', base: 62, vel: 0.45, in: ['C'] },
    { kind: 'timp', pat: 'R.......R.R.....', vel: 0.7, in: ['C', 'A2'] },
  ],
  drums: { map: { kick: 'kick2', snare: 'snare2' }, groove: { A: 'drive', B: 'rock16', C: 'halftime', A2: 'gallop', B2: 'drive' } },
});
