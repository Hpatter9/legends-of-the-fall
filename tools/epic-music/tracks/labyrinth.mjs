// The Labyrinth's battle: the main theme at 152 bpm in F# with a mode of its own (a minor scale with a raised fourth and
// sixth), so every chord is a little wrong: a diminished sixth, an augmented seventh. A harpsichord on the tune, a quiet
// square lead under it, pizzicato and a music box, a ride-led kit, and a breakdown where harpsichord and pizzicato answer
// each other in canon.
import { arrange, MELODY } from '../theme.mjs';

export default () => arrange({
  id: 'labyrinth', key: 'F#', scale: [0, 2, 3, 6, 7, 9, 10], bpm: 152, seed: 341, target: 0.165,
  mix: { levels: { harpsi: 1, keys: 0.7, bass: 1.25 }, masterEq: [{ type: 'hs', hz: 5500, q: 0.7, g: -3.5 }, { type: 'ls', hz: 160, q: 0.7, g: 2 }] },
  layers: [
    { kind: 'mel', inst: 'harpsi', oct: 4, vel: 0.85, in: ['intro', 'A', 'B', 'A2', 'B2', 'turn'] },
    { kind: 'mel', inst: 'sqlead', oct: 4, vel: 0.42, in: ['A', 'A2'] },
    { kind: 'mel', inst: 'harpsi', oct: 4, vel: 0.8, in: ['C'] },
    { kind: 'mel', inst: 'pizz', oct: 3, vel: 0.8, melody: { C: `r:2 ${MELODY.C}` }, in: ['C'] },
    { kind: 'mel', inst: 'mbox', oct: 5, vel: 0.5, in: ['B2'] },
    { kind: 'line', inst: 'strings', lo: 54, hi: 70, vel: 0.5, in: ['B', 'A2'] },
    { kind: 'pad', inst: 'organ', lo: 49, hi: 68, vel: 0.36, o: { reg: 'flute' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'pad', inst: 'choir', lo: 54, hi: 74, vel: 0.42, o: { vowel: 'oo' }, in: ['C'] },
    { kind: 'bass', inst: 'bass', base: 30, vel: 0.78, pat: { all: 'r.r.o.r.r.r.o.r.', C: 'r...o...r...o...' }, in: ['intro', 'A', 'B', 'C', 'A2', 'B2', 'turn'] },
    { kind: 'arp', inst: 'pizz', pat: '0.2.1.3.0.2.1.3.', base: 54, vel: 0.62, in: ['A', 'B', 'B2'] },
    { kind: 'arp', inst: 'synth', pat: '0242024202420242', base: 66, vel: 0.35, in: ['A2'] },
    { kind: 'stab', inst: 'brass', pat: 'X..X..X.X.......', vel: 0.6, lo: 54, hi: 71, in: ['intro', 'A2', 'turn'] },
  ],
  drums: { vel: 0.9, groove: { A: 'ride8', B: 'rock16', C: 'halftime', A2: 'drive', B2: 'ride8' } },
});
