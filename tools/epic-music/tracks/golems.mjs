// The Golem Foundry's battle: the main theme in C# minor at 150 bpm, mechanical. A square-wave synth lead on the tune, synth
// arpeggios in sixteenths, anvils on the backbeat and clanks for hats, a slap bass, and a breakdown of anvils and bells.
import { arrange } from '../theme.mjs';

const FORGE = { kick: 'X.....x.X.x.....', snare: '....X.......X...', anvilHit: '....x.......x...', clank: 'x.xxx.xxx.xxx.xx' };
const BREAK = { anvilHit: 'x..x..x.x...x...', clank: '..x...x...x...x.', kick: 'X.......X.......' };

export default () => arrange({
  id: 'golems', key: 'C#', bpm: 150, seed: 381, target: 0.165,
  mix: { levels: { lead: 1.1, synth: 1.1, metal: 0.9 } },
  layers: [
    { kind: 'mel', inst: 'sqlead', oct: 4, vel: 0.82, glide: 0.5, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'lead', oct: 3, vel: 0.55, in: ['A2', 'B2'] },
    { kind: 'mel', inst: 'anvil', oct: 5, vel: 0.7, art: 0.5, o: { ring: 0.7 }, in: ['C'] },
    { kind: 'mel', inst: 'sqlead', oct: 4, vel: 0.5, in: ['C'] },
    { kind: 'line', inst: 'brass', lo: 54, hi: 68, vel: 0.55, in: ['B', 'A2'] },
    { kind: 'pad', inst: 'strings', lo: 49, hi: 68, vel: 0.45, in: ['A', 'B', 'C', 'A2', 'B2'] },
    { kind: 'bass', inst: 'slap', base: 25, vel: 0.82, pat: { all: 'r.ro.ror.ro.r.ro', C: 'R.......R.......' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'arp', inst: 'synth', pat: '0123432101234321', base: 61, vel: 0.55, in: ['A', 'B', 'A2', 'B2'] },
    { kind: 'arp', inst: 'synth', pat: '0.2.4.2.0.2.4.2.', base: 61, vel: 0.5, in: ['C'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X...x...', vel: 0.65, lo: 52, hi: 70, in: ['intro', 'A2', 'turn'] },
    { kind: 'chug', base: 37, vel: 0.55, pat: 'r.rrr.rrr.rrr.r.', in: ['A2'] },
  ],
  drums: { map: { kick: 'kick2', hat: 'clank' }, groove: { A: FORGE, B: FORGE, C: null, A2: 'drive', B2: FORGE } },
  perc: [{ groove: BREAK, in: ['C'], vel: 0.9 }],
  extra: (s) => {
    for (const bar of [20, 24]) s.add('bell', bar * 4, 4, 61, 0.55, { ring: 4 });
    s.fill(27, 'snare', 0.9);
  },
});
