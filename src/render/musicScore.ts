// The game's music as notes: three short loops (the town's, the battle's and the boss's), each in four stems (pad, bass,
// lead and drums) that `musicBake.ts` renders offline into buffers and `MusicPlayer` plays in step, mixing the stems with
// the fight's tension. This file is pure data and rules (no Web Audio, no DOM, no randomness), so the tests can read it.
// Times are in beats; a loop is eight bars of four beats.

export type Track = 'town' | 'battle' | 'boss' | 'opening' | 'gorvak';
/** The tracks that do not follow a fight's tension: the town's and the cinematics'. */
export const CALM_TRACKS: ReadonlySet<Track> = new Set<Track>(['town', 'opening', 'gorvak']);
export type Stem = 'pad' | 'bass' | 'lead' | 'drums';
export const STEMS: readonly Stem[] = ['pad', 'bass', 'lead', 'drums'];

/** A pitched note: when (beats), how long (beats), the MIDI pitch and the strength (0 to 1). */
export interface Note {
  t: number;
  d: number;
  midi: number;
  v: number;
}

export type Drum = 'kick' | 'snare' | 'hat' | 'tom' | 'crash';

/** A drum hit: when (beats), which drum and the strength (0 to 1). `tom` is a low tom; `pitch` moves it (semitones). */
export interface Hit {
  t: number;
  kind: Drum;
  v: number;
  pitch?: number;
}

export interface Score {
  bpm: number;
  /** The loop's length in beats. */
  beats: number;
  pad: Note[];
  bass: Note[];
  lead: Note[];
  drums: Hit[];
}

/** The pitch in Hz of a MIDI note. */
export const hzOf = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
/** How long a loop lasts, in seconds, at its own tempo. */
export const loopSeconds = (s: Score): number => (s.beats * 60) / s.bpm;

const BARS = 8;
const BEATS = BARS * 4;

/** A chord: the bass note's MIDI pitch and whether its third is minor (3) or major (4). */
interface Chord {
  root: number;
  third: 3 | 4;
}
const m = (root: number): Chord => ({ root, third: 3 });
const M = (root: number): Chord => ({ root, third: 4 });
const triad = (c: Chord, lift: number): number[] => [c.root + lift, c.root + lift + c.third, c.root + lift + 7];

/** Long, soft chord pads: a triad a bar, with the top note moving up an octave on the second half of the loop. */
function pads(chords: Chord[], lift: number, v: number): Note[] {
  return chords.flatMap((c, bar) => triad(c, lift).map((midi, i) => ({ t: bar * 4, d: 4, midi: i === 2 && bar >= 4 ? midi + 12 : midi, v: v * (i === 0 ? 1 : 0.8) })));
}

/** Notes from a list of `[beat, length, midi]` (a melody written out by hand). */
const tune = (rows: [number, number, number][], v: number): Note[] => rows.map(([t, d, midi]) => ({ t, d, midi, v: v * (t % 1 === 0 && t % 2 === 0 ? 1 : 0.85) }));

/* ------------------------------------------------------------------ the town: D major, unhurried, warm */

const TOWN_CHORDS: Chord[] = [M(38), m(35), M(43), M(33), M(38), m(35), M(43), M(33)];

const TOWN: Score = {
  bpm: 76,
  beats: BEATS,
  pad: pads(TOWN_CHORDS, 24, 0.5),
  // (the root on the bar's first beat, its fifth on the third, both long and round)
  bass: TOWN_CHORDS.flatMap((c, bar) => [
    { t: bar * 4, d: 2, midi: c.root, v: 0.9 },
    { t: bar * 4 + 2, d: 1.8, midi: c.root + 7, v: 0.6 },
  ]),
  lead: tune(
    [
      [0, 1.5, 78], [1.5, 0.5, 81], [2, 1, 83], [3, 1, 81],
      [4, 2, 78], [6, 1, 74], [7, 1, 76],
      [8, 1.5, 83], [9.5, 0.5, 81], [10, 1, 79], [11, 1, 76],
      [12, 2, 76], [14, 1, 81], [15, 1, 78],
      [16, 1.5, 78], [17.5, 0.5, 81], [18, 2, 86],
      [20, 1, 83], [21, 1, 81], [22, 2, 78],
      [24, 1, 79], [25, 1, 81], [26, 1, 83], [27, 1, 86],
      [28, 1, 85], [29, 1, 81], [30, 2, 76],
    ],
    0.8,
  ),
  drums: [],
};

/* ------------------------------------------------------------------ the battle: D minor, driving */

const BATTLE_CHORDS: Chord[] = [m(38), M(34), M(41), M(36), m(38), M(34), m(31), M(33)];

/** Eighth-note arpeggios over the chords: root, third, fifth and back, climbing an octave on the last bar of each half. */
function arps(chords: Chord[], lift: number, v: number): Note[] {
  const order = [0, 1, 2, 1, 2, 1, 2, 1];
  return chords.flatMap((c, bar) => {
    const tones = triad(c, lift);
    return order.map((k, i) => ({ t: bar * 4 + i * 0.5, d: 0.45, midi: tones[k] + (bar % 4 === 3 && i >= 4 ? 12 : 0), v: v * (i % 2 === 0 ? 1 : 0.7) }));
  });
}

/** A rock backbeat: kick on one and three (and the "and" of two on odd bars), snare on two and four, hats on eighths, a crash
 *  on the first bar of each half; the last bar of each half has a fill of snares. */
function backbeat(bars: number, fills: boolean): Hit[] {
  const hits: Hit[] = [];
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 4;
    hits.push({ t: t0, kind: 'kick', v: 1 }, { t: t0 + 2, kind: 'kick', v: 0.9 });
    if (bar % 2 === 1) hits.push({ t: t0 + 2.5, kind: 'kick', v: 0.7 });
    hits.push({ t: t0 + 1, kind: 'snare', v: 0.9 }, { t: t0 + 3, kind: 'snare', v: 1 });
    for (let i = 0; i < 8; i++) hits.push({ t: t0 + i * 0.5, kind: 'hat', v: i % 2 === 0 ? 0.7 : 0.4 });
    if (bar % 4 === 0) hits.push({ t: t0, kind: 'crash', v: 0.8 });
    if (fills && bar % 4 === 3) for (let i = 0; i < 4; i++) hits.push({ t: t0 + 3 + i * 0.25, kind: 'snare', v: 0.5 + i * 0.12 });
  }
  return hits;
}

const BATTLE: Score = {
  bpm: 132,
  beats: BEATS,
  pad: pads(BATTLE_CHORDS, 24, 0.5),
  // (a pulse of eighths on the root, an octave jump on the off-beats of the last two beats)
  bass: BATTLE_CHORDS.flatMap((c, bar) =>
    Array.from({ length: 8 }, (_, i) => ({ t: bar * 4 + i * 0.5, d: 0.42, midi: c.root + (i === 3 || i === 7 ? 12 : 0), v: i % 4 === 0 ? 1 : 0.7 })),
  ),
  lead: arps(BATTLE_CHORDS, 36, 0.7),
  drums: backbeat(BARS, true),
};

/* ------------------------------------------------------------------ the boss: E phrygian, heavy */

const BOSS_CHORDS: Chord[] = [m(40), m(40), M(41), m(40), M(36), M(38), m(40), M(35)];

/** A gallop: an eighth and two sixteenths, over and over, on the root. */
function gallop(chords: Chord[]): Note[] {
  return chords.flatMap((c, bar) =>
    [0, 1, 2, 3].flatMap((beat) => {
      const t = bar * 4 + beat;
      return [
        { t, d: 0.48, midi: c.root, v: 1 },
        { t: t + 0.5, d: 0.22, midi: c.root, v: 0.65 },
        { t: t + 0.75, d: 0.22, midi: c.root + (beat === 3 ? 12 : 0), v: 0.75 },
      ];
    }),
  );
}

const BOSS: Score = {
  bpm: 148,
  beats: BEATS,
  pad: pads(BOSS_CHORDS, 24, 0.55),
  bass: gallop(BOSS_CHORDS),
  // (stabs on the off-beats, then a rising line to turn the loop round)
  lead: [
    ...BOSS_CHORDS.flatMap((c, bar) => [1.5, 3.5].map((b) => ({ t: bar * 4 + b, d: 0.4, midi: c.root + 36, v: 0.85 }))),
    ...tune(
      [
        [3, 0.25, 76], [3.25, 0.25, 77], [3.5, 0.25, 79], [3.75, 0.25, 81],
        [15, 0.25, 76], [15.25, 0.25, 77], [15.5, 0.25, 79], [15.75, 0.25, 81],
        [23, 0.5, 79], [23.5, 0.5, 81],
        [31, 0.25, 78], [31.25, 0.25, 80], [31.5, 0.25, 82], [31.75, 0.25, 83],
      ],
      0.75,
    ),
  ],
  drums: [
    ...backbeat(BARS, false).filter((h) => h.kind !== 'kick'),
    // (a double kick under every bar, toms rolling down at the turn of each half)
    ...Array.from({ length: BARS }, (_, bar) => [0, 0.75, 1.5, 2, 2.75, 3.5].map((b) => ({ t: bar * 4 + b, kind: 'kick' as const, v: b === 0 || b === 2 ? 1 : 0.7 }))).flat(),
    ...[3, 7].flatMap((bar) => [0, 1, 2, 3].map((i) => ({ t: bar * 4 + 3 + i * 0.25, kind: 'tom' as const, v: 0.8, pitch: -i * 3 }))),
  ],
};

/* ------------------------------------------------------------------ the cinematics */

/** The opening scene: A minor, slow, a held drone and a lone bell line that waits between its notes; no drums, so it is quiet under the talk. */
const OPENING_CHORDS: Chord[] = [m(33), m(33), M(41), M(36), m(33), M(43), M(41), M(40)];
const OPENING: Score = {
  bpm: 62,
  beats: BEATS,
  pad: pads(OPENING_CHORDS, 24, 0.55),
  bass: OPENING_CHORDS.map((c, bar) => ({ t: bar * 4, d: 4, midi: c.root, v: 0.9 })),
  lead: tune(
    [
      [2, 2, 81], [6, 2, 76], [10, 1.5, 77], [12, 1, 79], [14, 2, 76],
      [18, 2, 81], [22, 1, 83], [23, 1, 81], [26, 2, 77], [30, 2, 76],
    ],
    0.8,
  ),
  drums: [],
};

/** Gorvak the Ashen: C minor, a slow heavy march: low toms on the beat, a kick, a lumbering bass and a sour two-note stab. */
const GORVAK_CHORDS: Chord[] = [m(36), m(36), M(32), m(36), m(36), M(34), M(32), M(31)];
const GORVAK: Score = {
  bpm: 88,
  beats: BEATS,
  pad: pads(GORVAK_CHORDS, 24, 0.55),
  bass: GORVAK_CHORDS.flatMap((c, bar) => [0, 1.5, 2, 3.5].map((b) => ({ t: bar * 4 + b, d: b % 2 ? 0.4 : 1.2, midi: c.root, v: b === 0 ? 1 : 0.7 }))),
  lead: GORVAK_CHORDS.flatMap((c, bar) => (bar % 2 === 1 ? [{ t: bar * 4 + 3, d: 0.5, midi: c.root + 36, v: 0.8 }, { t: bar * 4 + 3.5, d: 0.5, midi: c.root + 37, v: 0.8 }] : [])),
  drums: Array.from({ length: BARS }, (_, bar) => [
    { t: bar * 4, kind: 'kick' as const, v: 1 },
    { t: bar * 4, kind: 'tom' as const, v: 0.8, pitch: -4 },
    { t: bar * 4 + 2, kind: 'tom' as const, v: 0.7, pitch: -7 },
    { t: bar * 4 + 3, kind: 'snare' as const, v: 0.5 },
    ...(bar === 0 || bar === 4 ? [{ t: bar * 4, kind: 'crash' as const, v: 0.6 }] : []),
  ]).flat(),
};

export const SCORES: Record<Track, Score> = { town: TOWN, battle: BATTLE, boss: BOSS, opening: OPENING, gorvak: GORVAK };

/* ------------------------------------------------------------------ the mix */

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const smooth = (x: number): number => clamp01(x) * clamp01(x) * (3 - 2 * clamp01(x));

/** How loud each stem is (0 to 1) at the fight's tension `t`: the town is always the same; the battle opens with the pad and
 *  bass, brings the lead in as the sides thin out and the drums with it; the boss never drops its drums. */
export function stemLevels(track: Track, t: number): Record<Stem, number> {
  const x = clamp01(t);
  if (CALM_TRACKS.has(track)) return { pad: 1, bass: 0.9, lead: 1, drums: track === 'gorvak' ? 1 : 0 };
  if (track === 'battle') return { pad: 1 - 0.3 * x, bass: 0.85 + 0.15 * x, lead: 0.35 + 0.65 * smooth(x), drums: 0.45 + 0.55 * smooth(x) };
  return { pad: 1 - 0.2 * x, bass: 1, lead: 0.7 + 0.3 * x, drums: 0.85 + 0.15 * x };
}

/** The loudness (RMS, 0 to 1) each track is baked to with every stem at full level; `MUSIC_LEVEL` in `sound.ts` sits on top. */
export const TRACK_RMS: Record<Track, number> = { town: 0.1, battle: 0.24, boss: 0.26, opening: 0.1, gorvak: 0.2 };

/** How much each stem is trimmed in the bake so they sit in balance (measured: the drums and bass baked far louder than the pads). */
export const STEM_TRIM: Record<Track, Record<Stem, number>> = {
  town: { pad: 1.5, bass: 0.6, lead: 1, drums: 1 },
  battle: { pad: 2.4, bass: 0.75, lead: 1, drums: 0.5 },
  boss: { pad: 2.4, bass: 0.75, lead: 1.5, drums: 0.45 },
  opening: { pad: 1.5, bass: 0.6, lead: 1, drums: 1 },
  gorvak: { pad: 2.4, bass: 0.75, lead: 1.2, drums: 0.5 },
};

/** A small deterministic stream (for the baked noise): the same every time, so the music is the same on every phone. */
export function noiseStream(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2147483648 - 1;
  };
}
