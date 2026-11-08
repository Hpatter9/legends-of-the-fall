// Battle: the one battle track (docs/notes/battle-music-2.md), played in every battle (every army, the daily, the spire, the
// Calamity, the Last Stand, the quests). The main theme in D minor at 160 bpm, heroic and driving but not tiring over a long
// session: trumpets and violins carry the tune, horns sing the counter-line, a rock kit drives without a double kick, the
// breakdown thins to synth arpeggios under the horns' hook, and the electric guitar takes the tune when it comes back.
import { arrange } from '../theme.mjs';

export default () => arrange({
  id: 'battle', key: 'D', bpm: 160, seed: 29, target: 0.17,
  mix: { levels: { brass: 1.05, strings: 1, guitar: 0.9, lead: 0.8, drums: 0.95 } },
  layers: [
    // the tune: trumpets and violins together (the heroic dress), a soft synth lead under them in B for colour
    { kind: 'mel', inst: 'trumpet', oct: 4, vel: 0.76, in: ['intro', 'A', 'B2', 'turn'] },
    { kind: 'mel', inst: 'violins', oct: 4, vel: 0.56, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'lead', oct: 4, vel: 0.5, glide: 0.6, in: ['B'] },
    { kind: 'mel', inst: 'guitar', oct: 4, vel: 0.74, glide: 1.5, o: { slide: 0 }, in: ['A2'] },
    { kind: 'mel', inst: 'trumpet', oct: 3, vel: 0.62, in: ['A2'] },
    { kind: 'mel', inst: 'horn', oct: 3, vel: 0.66, in: ['C'] },
    // the counter-line and the bed
    { kind: 'line', inst: 'horn', lo: 55, hi: 70, vel: 0.58, in: ['A', 'B', 'A2', 'B2'] },
    { kind: 'pad', inst: 'strings', lo: 50, hi: 69, vel: 0.5, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'pad', inst: 'choir', lo: 57, hi: 77, vel: 0.45, o: { vowel: 'ah' }, in: ['C', 'A2'] },
    // the engine: a bass on the off-beats, palm-muted guitars, brass stabs on the hook's rhythm, string runs in B
    { kind: 'bass', inst: 'bass', base: 26, vel: 0.82, pat: { all: 'r.ror.ror.ror.ro', B: 'r.r.r.rorr.r.rro', C: 'R...r.r.R...r.r.' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'chug', base: 38, vel: 0.58, pat: 'r.rrr.rrr.rrr.r.', in: ['A', 'A2', 'B2'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...x...', vel: 0.66, in: ['intro', 'A', 'A2', 'turn'] },
    { kind: 'arp', inst: 'stac', pat: '0123432101234321', base: 57, vel: 0.46, in: ['B', 'B2'] },
    { kind: 'arp', inst: 'synth', pat: '0.2.4.2.0.2.4.2.', base: 62, vel: 0.42, in: ['C'] },
    { kind: 'timp', pat: 'R.......R.R.....', vel: 0.68, in: ['intro', 'C', 'A2', 'turn'] },
  ],
  drums: { map: { kick: 'kick2', snare: 'snare2' }, groove: { A: 'drive', B: 'rock16', C: 'halftime', A2: 'gallop', B2: 'drive' } },
});
