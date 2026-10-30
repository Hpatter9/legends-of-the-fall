// The game's main theme, and the arranger that builds every battle track on it (the owner's ask: battle music that is
// "more unique, catchy, ours"; docs/notes/music-theme.md). One original tune, written once here in scale degrees and in
// chords built on the scale's degrees, so an arrangement can put it in any key and mode (the minor, the Dorian, the
// Phrygian, the labyrinth's own) and the harmony follows. Each army's track is the same tune in its own dress: a palette
// of instruments, a tempo, a groove and a few lines of its own (tracks/<army>.mjs).
//
// The hook is the first bar: a tresillo (3 + 3 + 2 sixteenths) that drops from the tonic to the fifth and back, then climbs to
// the third and steps home. Every phrase of the A section starts with that rhythm, so the tune is easy to know again.

import { Song } from './song.mjs';

/** The form of a battle track, in bars. The intro plays once; the turnaround at the end is the same music, so the loop (from
 *  the intro's end to the song's end) joins as if the intro were playing again. 44 bars: 40 of them loop. */
export const FORM = { intro: [0, 4], A: [4, 12], B: [12, 20], C: [20, 28], A2: [28, 36], B2: [36, 40], turn: [40, 44] };
export const BARS = 44;
export const INTRO = 4;

/** The chords, each a triad on a degree of the scale (`d5M` the major dominant, `d5M7` its seventh). */
export const PROG = {
  intro: 'd1 d6 d4 d5M7',
  A: 'd1 d6 d3 d7  d1 d6 d4+d5M d1',
  B: 'd6 d7 d3 d1  d4 d1 d6+d7 d5M',
  C: 'd6 d4 d1 d7  d6 d4 d5M d5M7',
  B2: 'd4 d1 d6+d7 d5M',
};

/** The tune, in scale degrees (`^` an octave up, `#` raised: `7#` is the minor key's leading note) and beats. */
const HOOK = '^1:.75 5:.75 ^1:.5 ^3:1 ^2:.5 ^1:.5';
const HOOK2 = '7:.75 6:.75 7:.5 ^1:2';
export const MELODY = {
  // the hook, its answer, then a run up the dominant into the A section
  intro: `${HOOK} | ${HOOK2} | ^4:.75 ^1:.75 ^4:.5 ^6:2 | 5:.5 6:.5 7#:.5 ^1:.5 ^2:.5 ^3:.5 ^4:.5 7#:.5`,
  // A: the hook, its answer; the hook a third up, its answer; the hook leaping to the fifth, the high sixth, the cadence
  A: `${HOOK} | ${HOOK2} | ^3:.75 7:.75 ^3:.5 ^5:1 ^4:.5 ^3:.5 | ^4:.75 ^3:.75 ^4:.5 ^2:2 | `
    + '^1:.75 5:.75 ^1:.5 ^5:1 ^4:.5 ^3:.5 | ^6:1.5 ^5:.5 ^3:1 ^1:1 | ^4:.75 ^1:.75 ^4:.5 ^2:1 7#:1 | ^1:2.5 r:.5 5:.5 7#:.5',
  // B: longer notes climbing to the high seventh, the hook's rhythm only in passing, ending high on the dominant
  B: '^1:1 ^3:1 ^6:2 | ^5:.75 ^4:.75 ^2:.5 ^4:2 | ^3:1 ^5:1 ^7:2 | ^6:.75 ^5:.75 ^3:.5 ^5:2 | '
    + '^6:1.5 ^4:.5 ^1:1 ^4:1 | ^5:1.5 ^3:.5 ^1:2 | ^3:1 ^1:1 ^2:1 ^4:1 | ^5:1.5 ^4:.5 ^2:1 7#:1',
  // C: the breakdown: the hook's rhythm alone, answered bar by bar, over other chords
  C: '^3:.75 ^1:.75 ^3:.5 ^6:2 | ^4:.75 ^1:.75 ^4:.5 ^6:2 | ^5:.75 ^3:.75 ^1:.5 ^3:2 | ^2:.75 7:.75 ^2:.5 ^4:2 | '
    + '^3:.75 ^1:.75 ^3:.5 ^6:1 ^5:.5 ^3:.5 | ^4:.75 ^6:.75 ^4:.5 ^1:2 | ^2:.75 7#:.75 ^2:.5 ^5:2 | ^4:.75 ^2:.75 7#:.5 5:2',
  // B2: the second half of B, the climb back to the dominant before the turnaround
  B2: '^6:1.5 ^4:.5 ^1:1 ^4:1 | ^5:1.5 ^3:.5 ^1:2 | ^3:1 ^1:1 ^2:1 ^4:1 | ^5:1.5 ^4:.5 ^2:1 7#:1',
};
MELODY.A2 = MELODY.A;
MELODY.turn = MELODY.intro;

/** The intro's drums: the band hits the hook's tresillo together. */
const HITS = { kick: 'X..X..X.X.......', snare: 'X..X..X.....X...', hat: '........x.x.x.x.' };

/** Where a section starts and ends. */
const at = (name) => FORM[name];

/**
 * Builds a battle track from a flavour:
 * - `id`, `key`, `mode` (or `scale`), `bpm`, `seed`, `target`, `mix`, `kbps`: the song's;
 * - `layers`: what plays, each `{ kind, in: [sections], ... }`, `kind` one of `mel` (the tune: `inst`, `oct`, `vel`, `o`,
 *   `glide`, `tr`, a `melody` of its own per section), `line` (a counter-melody from the chords: `lo`, `hi`, `rhythm`), `pad`,
 *   `bass` and `chug` (bass-line patterns: `pat`, a string or one per section), `stab`, `arp`, `timp`;
 * - `drums`: `{ groove: {section: groove}, map, vel, tomFill, crashes }`; `perc`: more kit lines `{ groove, in, vel, map }`;
 * - `snap`: semitones over the tonic the tune is moved onto (the yokai's pentatonic); `prog`: chords of its own per section;
 * - `extra(s)`: anything else, written straight onto the song.
 */
export function arrange(f) {
  const s = new Song({ id: f.id, bpm: f.bpm, key: f.key, mode: f.mode ?? 'min', scale: f.scale, bars: BARS, intro: INTRO, target: f.target ?? 0.17, seed: f.seed, kbps: f.kbps ?? 32, mix: f.mix ?? {} });
  const prog = { ...PROG, ...(f.prog ?? {}) };
  for (const name of Object.keys(FORM)) s.prog(at(name)[0], prog[name === 'A2' ? (prog.A2 ? 'A2' : 'A') : name === 'turn' ? 'intro' : name]);
  const pick = (v, name) => (v && typeof v === 'object' && !Array.isArray(v) ? v[name] ?? v.all : v);
  for (const L of f.layers) {
    for (const name of L.in) {
      const [from, to] = at(name);
      const pat = pick(L.pat, name);
      const vel = pick(L.vel, name) ?? 0.7;
      switch (L.kind) {
        case 'mel': {
          const text = pick(L.melody, name) ?? (f.melody ?? {})[name] ?? MELODY[name];
          if (text) s.mel(L.inst, from, text, { oct: L.oct ?? 4, vel, o: L.o ?? {}, tr: L.tr ?? 0, snap: L.snap ?? f.snap ?? null, glide: L.glide ?? 0, art: L.art ?? 0.95 });
          break;
        }
        case 'line':
          s.line(L.inst, from, to, { lo: L.lo, hi: L.hi, rhythm: pick(L.rhythm, name) ?? [2, 1.5, 0.5], vel, o: L.o ?? {} });
          break;
        case 'pad':
          s.pad(L.inst, from, to, { lo: L.lo ?? 55, hi: L.hi ?? 76, n: L.n ?? 4, vel, o: L.o ?? {} });
          break;
        case 'bass':
        case 'chug':
          s.bassline(L.inst ?? (L.kind === 'chug' ? 'chug' : 'bass'), from, to, { pat, base: L.base ?? 33, vel, len: L.len ?? (L.kind === 'chug' ? 0.5 : 0.85), step: L.step ?? 0.25, o: L.o ?? (L.kind === 'chug' ? { mute: true } : {}) });
          break;
        case 'stab':
          s.stab(L.inst, from, to, { pat, step: L.step ?? 0.25, lo: L.lo ?? 53, hi: L.hi ?? 72, n: L.n ?? 3, vel, len: L.len ?? 0.4, o: L.o ?? {} });
          break;
        case 'arp':
          s.arp(L.inst, from, to, { pat, base: L.base ?? 57, step: L.step ?? 0.25, vel, len: L.len ?? 0.8, o: L.o ?? {} });
          break;
        case 'timp':
          s.timp(from, to, { pat, vel, base: L.base ?? 38 });
          break;
        default:
          throw new Error(`unknown layer ${L.kind}`);
      }
    }
  }
  // the kit: the intro's hits, a crash at each section, a fill into the next, a half-time breakdown building into A2
  const d = f.drums ?? {};
  const g = { A: 'drive', B: 'rock16', C: 'halftime', A2: 'gallop', B2: 'rock16', ...(d.groove ?? {}) };
  const kitOpts = { vel: d.vel ?? 1, map: d.map ?? {}, tomFill: d.tomFill ?? 'tom' };
  for (const b of [0, 40]) {
    s.kit(b, b + 2, { groove: d.hits ?? HITS, crash: [b], ...kitOpts });
    s.kit(b + 2, b + 4, { groove: g.A, fills: [b + 3], ...kitOpts });
  }
  for (const name of ['A', 'B', 'C', 'A2', 'B2']) {
    const [from, to] = at(name);
    if (g[name] === null) continue;
    s.kit(from, to, { groove: g[name], crash: name === 'C' ? [] : [from], fills: [to - 1], ...kitOpts, tomFill: name === 'C' ? d.buildFill ?? 'snare' : kitOpts.tomFill });
  }
  s.swellTo(at('A2')[0] * 4, 8, 0.85);
  for (const P of f.perc ?? []) for (const name of P.in) s.kit(at(name)[0], at(name)[1], { groove: P.groove, vel: P.vel ?? 0.8, map: P.map ?? {} });
  if (f.extra) f.extra(s);
  return s;
}
