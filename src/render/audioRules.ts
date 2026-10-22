// The rules behind the page's audio engine, kept free of Web Audio and the DOM so the tests can check them: where a cue
// sits in the stereo field, which reasons are holding the music down (ducking), how the battle music follows the
// fight's tension, and the colour each tower act gives the music. `sound.ts` and `audioProcessors.ts` make the sound.

import type { Battle, BattleEvent } from '../sim/battle';
import { D, W } from '../sim/board';
import { at } from './iso';
import type { Cue } from './soundRules';

/* ------------------------------------------------------------------ stereo */

/** The furthest a cue is panned either way (0 is centre, 1 would be hard left or right). */
export const PAN_MAX = 0.6;

/** The pan for a spot on the screen: `x` against the board's `centre`, `half` being the board's half-width on screen.
 *  Gentle, and never past `PAN_MAX`. */
export function panFromScreen(x: number, centre: number, half: number): number {
  if (half <= 0) return 0;
  return Math.max(-PAN_MAX, Math.min(PAN_MAX, ((x - centre) / half) * PAN_MAX));
}

const BOARD_CENTRE = at((W - 1) / 2, (D - 1) / 2, 0)[0];
const BOARD_HALF = (at(W - 1, 0, 0)[0] - at(0, D - 1, 0)[0]) / 2;

/** The pan for a tile of the board (through the iso projection, so the board's left edge is the screen's left). */
export function panOfTile(u: number, v: number): number {
  return panFromScreen(at(u, v, 0)[0], BOARD_CENTRE, BOARD_HALF);
}

/** Where on the board a battle event happens, for its sound's pan: the fighter it is about, or the tile it lands on.
 *  Null for events with no place (the end of the fight). */
export function eventSpot(b: Battle, e: BattleEvent): { u: number; v: number } | null {
  const unit = (id: number) => b.units.find((x) => x.id === id);
  switch (e.kind) {
    case 'hit':
    case 'dodge':
    case 'heal':
    case 'gaze':
    case 'spellfx':
    case 'arc':
      return unit(e.to) ?? null;
    case 'swing':
    case 'shot':
    case 'skill':
    case 'song':
    case 'banner':
    case 'frenzy':
      return unit(e.by) ?? null;
    case 'dash':
    case 'blink':
      return e.from;
    case 'area':
    case 'zone':
    case 'trap':
    case 'spell':
      return { u: e.u, v: e.v };
    default:
      return null;
  }
}

/** The pan for a battle event's cues (0 for one with no place). */
export function panOfEvent(b: Battle, e: BattleEvent): number {
  const s = eventSpot(b, e);
  return s ? panOfTile(s.u, s.v) : 0;
}

/* ------------------------------------------------------------------ ducking */

/** How far the music (and later the ambience) dips under a menu, a card or the summoning show. */
export const DUCK_DB = -8;
/** The linear gain of `DUCK_DB`. */
export const DUCK_GAIN = 10 ** (DUCK_DB / 20);
/** The low-pass the ducked bed closes down to (Hz); open is `OPEN_HZ`. */
export const DUCK_HZ = 1400;
export const OPEN_HZ = 20000;

/** Which reasons are holding the music down. A reason counts each `on` and needs as many `off`s, so two sheets open at
 *  once keep it ducked until both close; an extra `off` never goes below none. */
export class DuckCounter {
  private counts = new Map<string, number>();

  /** Records one more or one fewer hold for `reason`; returns whether the music is ducked now. */
  set(reason: string, on: boolean): boolean {
    const n = (this.counts.get(reason) ?? 0) + (on ? 1 : -1);
    if (n > 0) this.counts.set(reason, n);
    else this.counts.delete(reason);
    return this.ducked;
  }

  get ducked(): boolean {
    return this.counts.size > 0;
  }

  /** The reasons holding it now (for the debug view). */
  get reasons(): string[] {
    return [...this.counts.keys()];
  }

  clear(): void {
    this.counts.clear();
  }
}

/* ------------------------------------------------------------------ adaptive music */

export type Track = 'town' | 'battle' | 'boss';

/** The music's tempo goes up to this much quicker (a share) as the fight's tension climbs: unchanged from before. */
export const TENSION_RATE = 0.08;
/** The music's level swells by up to this share with tension: unchanged from before. */
export const TENSION_SWELL = 0.33;
/** The battle tracks' low-pass starts this share of the way open (of its act's ceiling) and opens fully at full tension. */
export const TENSION_CLOSED = 0.55;

/** The level multiplier a track's swell takes at tension `t` (the town's does not swell). */
export const swellOf = (track: Track, t: number): number => (track === 'town' ? 1 : 1 + TENSION_SWELL * clamp01(t));

/** The tempo multiplier at tension `t`, with the act's own (the tension's part never passes `1 + TENSION_RATE`). */
export const rateOf = (track: Track, t: number, act: number | null): number =>
  (colourOf(act)?.rate ?? 1) * (track === 'town' ? 1 : 1 + TENSION_RATE * clamp01(t));

/** The music's low-pass (Hz): the act's ceiling, and on a battle track opening from `TENSION_CLOSED` of it to all of it
 *  as tension climbs (exponentially, so the opening sounds even). */
export function cutoffOf(track: Track, t: number, act: number | null): number {
  const top = colourOf(act)?.cutoff ?? OPEN_HZ;
  if (track === 'town') return top;
  return top * TENSION_CLOSED ** (1 - clamp01(t));
}

/** How loud the percussion layer is at tension `t` (0 to 1): silent until the fight is half-way hot, full at the end. */
export function percLevel(t: number): number {
  const x = clamp01((t - 0.5) / 0.5);
  return x * x * (3 - 2 * x);
}

/** Whether the percussion layer needs its scheduler running at tension `t`. */
export const percActive = (t: number): boolean => percLevel(t) > 0.01;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/* ------------------------------------------------------------------ the tower's acts */

/** One steady voice of an act's drone. */
export interface DroneVoice {
  type: OscillatorType;
  hz: number;
  /** A second copy this many cents away, so the voice beats slowly. */
  detune?: number;
  gain: number;
}

/** What an act does to the music: a low-pass ceiling, a tempo, and a drone under the tracks. */
export interface ActColour {
  name: string;
  /** The low-pass ceiling (Hz) the music plays under. */
  cutoff: number;
  /** A tempo multiplier. */
  rate: number;
  drone: {
    voices: DroneVoice[];
    /** Its low-pass (Hz). */
    hz: number;
    /** Its overall level against the music (a share of the music level). */
    level: number;
    /** A slow swell: the drone's level rises and falls this share, `hz` times a second. */
    swell: { depth: number; hz: number };
    /** A band of noise (wind), swept slowly. */
    wind?: { hz: number; q: number; sweep: number; sweepHz: number; gain: number };
  };
}

/** Act 1 is a dark, muffled crypt; act 2 a grand hall; act 3 a summit in the storm. Later acts reuse the three, as the
 *  backdrops do. */
export const ACT_COLOURS: readonly ActColour[] = [
  {
    name: 'crypt',
    cutoff: 2600,
    rate: 0.97,
    drone: {
      voices: [
        { type: 'sine', hz: 55, gain: 0.5 },
        { type: 'sawtooth', hz: 82.4, detune: 9, gain: 0.16 },
      ],
      hz: 320,
      level: 0.55,
      swell: { depth: 0.35, hz: 0.11 },
    },
  },
  {
    name: 'halls',
    cutoff: 15000,
    rate: 1,
    drone: {
      voices: [
        { type: 'triangle', hz: 146.8, detune: 6, gain: 0.3 },
        { type: 'triangle', hz: 220, detune: 7, gain: 0.24 },
        { type: 'triangle', hz: 293.7, detune: 5, gain: 0.2 },
        { type: 'sine', hz: 73.4, gain: 0.3 },
      ],
      hz: 1400,
      level: 0.5,
      swell: { depth: 0.45, hz: 0.07 },
    },
  },
  {
    name: 'storm',
    cutoff: 5200,
    rate: 1.03,
    drone: {
      voices: [
        { type: 'sine', hz: 49, gain: 0.5 },
        { type: 'sawtooth', hz: 73.4, detune: 14, gain: 0.1 },
      ],
      hz: 240,
      level: 0.6,
      swell: { depth: 0.5, hz: 0.19 },
      wind: { hz: 520, q: 0.9, sweep: 380, sweepHz: 0.17, gain: 0.5 },
    },
  },
];

/** The look of the three reused by act number (act 4 is act 1 again). Null for no act (the town, a stage, a daily). */
export function colourOf(act: number | null): ActColour | null {
  if (act === null || !Number.isFinite(act)) return null;
  return ACT_COLOURS[(Math.max(1, Math.floor(act)) - 1) % ACT_COLOURS.length];
}

/* ------------------------------------------------------------------ ambience beds */

/** Where the player is, as far as the sound cares: a home tab, the armies screen, or off the home screen. */
export type HomeSpot = 'recruit' | 'heroes' | 'battle' | 'castle' | 'spells' | 'armies';

/** The scenes the ambience knows. The castle and the spells share a bed; the tower has one for each of its three looks. */
export type Scene = 'camp' | 'tavern' | 'hall' | 'castle' | 'spells' | 'armies' | 'field' | 'tower1' | 'tower2' | 'tower3';

/** The beds themselves (one is playing at a time, besides a crossfade). */
export type BedId = 'camp' | 'tavern' | 'hall' | 'castle' | 'armies' | 'field' | 'crypt' | 'halls' | 'storm';

export const BED_OF: Record<Scene, BedId> = {
  camp: 'camp',
  tavern: 'tavern',
  hall: 'hall',
  castle: 'castle',
  spells: 'castle',
  armies: 'armies',
  field: 'field',
  tower1: 'crypt',
  tower2: 'halls',
  tower3: 'storm',
};

const HOME_SCENE: Record<HomeSpot, Scene> = { battle: 'camp', heroes: 'tavern', recruit: 'hall', castle: 'castle', spells: 'spells', armies: 'armies' };

/** The scene for what is on screen: the home tab (or the armies) while the home screen is up, else the tower's act (its map
 *  and its fights both) or the field (a stage, an army's wave or a daily). Acts 4 and up reuse the three, as the music does. */
export function sceneOf(spot: HomeSpot | null, act: number | null): Scene {
  if (spot) return HOME_SCENE[spot];
  if (act === null || !Number.isFinite(act)) return 'field';
  return `tower${((Math.max(1, Math.floor(act)) - 1) % 3) + 1}` as Scene;
}

/** How long a bed takes to crossfade in or out (seconds). */
export const BED_FADE_S = 1.5;
/** No bed's own level goes past this (the bus is already at the music's level, so a bed is never louder than the music). */
export const BED_LEVEL_MAX = 0.5;
/** The least time between two random one-shots of a bed (seconds): they are an occasional touch, not a pattern. */
export const MIN_SHOT_GAP_S = 2.5;

/** The one-shots a bed can sprinkle in. */
export type ShotKind = 'pop' | 'clink' | 'twinkle' | 'bird' | 'drum' | 'drip' | 'thunder' | 'gust';

/** A continuous layer of a bed: filtered noise or a held tone, with slow movement. */
export interface BedLayer {
  kind: 'noise' | 'tone';
  /** For a noise layer, the filter type and its Q; for a tone, the wave (`wave`). */
  filter?: BiquadFilterType;
  q?: number;
  wave?: OscillatorType;
  /** The filter's centre or cutoff (noise), or the pitch (tone), in Hz. */
  hz: number;
  /** A second copy this many cents away, so a tone beats slowly. */
  detune?: number;
  gain: number;
  /** The filter slowly sweeps this far (Hz) at this rate (noise only). */
  sweep?: { hz: number; depth: number };
  /** Swells of loudness: each is a slow (or fast) tremolo of `depth` (0 to 1) at `hz`. */
  mods?: { hz: number; depth: number }[];
}

export interface BedSpec {
  id: BedId;
  /** The whole bed's level (0 to `BED_LEVEL_MAX`). */
  level: number;
  layers: BedLayer[];
  /** A feedback delay on the bed (an echoing hall): the delay in seconds, the feedback and the wet share. */
  echo?: { delay: number; feedback: number; mix: number };
  /** The random one-shots: what they can be (weighted), and the range of the gap between them in seconds. */
  shots: { kind: ShotKind; weight: number }[];
  gap: [number, number];
}

const slow = (hz: number, depth: number) => ({ hz, depth });

export const BEDS: Record<BedId, BedSpec> = {
  // the war camp: a campfire (a low body of flame, a bright flutter, pops) and soft night insects
  camp: {
    id: 'camp',
    level: 0.4,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 520, gain: 0.5, mods: [slow(0.35, 0.5), slow(1.9, 0.25)] },
      { kind: 'noise', filter: 'bandpass', q: 1.2, hz: 2600, gain: 0.07, mods: [slow(3.1, 0.7)] },
      // (crickets: a high band chirping fast, in slow bursts)
      { kind: 'noise', filter: 'bandpass', q: 16, hz: 4600, gain: 0.05, mods: [slow(17, 1), slow(0.23, 0.9)] },
      { kind: 'noise', filter: 'bandpass', q: 16, hz: 5300, gain: 0.035, mods: [slow(21, 1), slow(0.17, 0.9)] },
    ],
    shots: [{ kind: 'pop', weight: 1 }],
    gap: [2.5, 5.5],
  },
  // the tavern: murmured talk (two bands swelling out of step), a hearth, the odd mug
  tavern: {
    id: 'tavern',
    level: 0.4,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 1.3, hz: 420, gain: 0.45, sweep: { hz: 0.11, depth: 90 }, mods: [slow(0.13, 0.7), slow(0.7, 0.2)] },
      { kind: 'noise', filter: 'bandpass', q: 1.0, hz: 950, gain: 0.25, sweep: { hz: 0.07, depth: 160 }, mods: [slow(0.09, 0.8)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 380, gain: 0.22, mods: [slow(0.4, 0.4)] },
    ],
    shots: [
      { kind: 'clink', weight: 2 },
      { kind: 'pop', weight: 1 },
    ],
    gap: [4, 9],
  },
  // the summoning hall: a low hum and a shimmer of high partials
  hall: {
    id: 'hall',
    level: 0.11,
    layers: [
      { kind: 'tone', wave: 'sine', hz: 110, detune: 7, gain: 0.3, mods: [slow(0.08, 0.35)] },
      { kind: 'tone', wave: 'sine', hz: 165, detune: 5, gain: 0.16, mods: [slow(0.06, 0.5)] },
      { kind: 'tone', wave: 'sine', hz: 1760, gain: 0.03, mods: [slow(0.21, 1)] },
      { kind: 'tone', wave: 'sine', hz: 2637, gain: 0.022, mods: [slow(0.34, 1)] },
      { kind: 'tone', wave: 'sine', hz: 3520, gain: 0.015, mods: [slow(0.27, 1)] },
    ],
    shots: [{ kind: 'twinkle', weight: 1 }],
    gap: [4, 9],
  },
  // the castle and the spells: quiet wind, a far bird
  castle: {
    id: 'castle',
    level: 0.35,
    layers: [{ kind: 'noise', filter: 'bandpass', q: 0.8, hz: 480, gain: 0.5, sweep: { hz: 0.12, depth: 220 }, mods: [slow(0.09, 0.6)] }],
    shots: [{ kind: 'bird', weight: 1 }],
    gap: [8, 18],
  },
  // the armies: a very soft low rumble and a distant drum
  armies: {
    id: 'armies',
    level: 0.5,
    layers: [{ kind: 'noise', filter: 'lowpass', q: 0.7, hz: 140, gain: 0.3, mods: [slow(0.1, 0.5)] }],
    shots: [{ kind: 'drum', weight: 1 }],
    gap: [4, 7],
  },
  // a field fight: soft wind, now and then a bird
  field: {
    id: 'field',
    level: 0.45,
    layers: [{ kind: 'noise', filter: 'bandpass', q: 0.7, hz: 620, gain: 0.45, sweep: { hz: 0.15, depth: 260 }, mods: [slow(0.11, 0.55)] }],
    shots: [{ kind: 'bird', weight: 1 }],
    gap: [6, 14],
  },
  // tower act 1, the crypt: drips and a cold low drone
  crypt: {
    id: 'crypt',
    level: 0.11,
    layers: [
      { kind: 'tone', wave: 'sine', hz: 55, detune: 6, gain: 0.35, mods: [slow(0.07, 0.3)] },
      { kind: 'tone', wave: 'triangle', hz: 82.4, detune: 9, gain: 0.08, mods: [slow(0.05, 0.5)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 260, gain: 0.18, mods: [slow(0.08, 0.5)] },
    ],
    shots: [{ kind: 'drip', weight: 1 }],
    gap: [3, 7],
  },
  // act 2, the echoing halls: wind with a long echo
  halls: {
    id: 'halls',
    level: 0.3,
    layers: [{ kind: 'noise', filter: 'bandpass', q: 1.1, hz: 540, gain: 0.5, sweep: { hz: 0.1, depth: 240 }, mods: [slow(0.08, 0.7)] }],
    echo: { delay: 0.42, feedback: 0.45, mix: 0.55 },
    shots: [{ kind: 'gust', weight: 1 }],
    gap: [6, 12],
  },
  // act 3, the storm: rain, wind, far thunder
  storm: {
    id: 'storm',
    level: 0.21,
    layers: [
      { kind: 'noise', filter: 'highpass', q: 0.6, hz: 1700, gain: 0.2, mods: [slow(0.13, 0.25)] },
      { kind: 'noise', filter: 'bandpass', q: 0.5, hz: 5500, gain: 0.12, mods: [slow(0.31, 0.3)] },
      { kind: 'noise', filter: 'bandpass', q: 0.9, hz: 380, gain: 0.4, sweep: { hz: 0.16, depth: 160 }, mods: [slow(0.12, 0.6)] },
    ],
    shots: [{ kind: 'thunder', weight: 1 }],
    gap: [9, 20],
  },
};

/** The gap (seconds) for a unit random number `r` in a bed's range, never under `MIN_SHOT_GAP_S`. */
export function shotGap(range: readonly [number, number], r: number): number {
  const [lo, hi] = range;
  return Math.max(MIN_SHOT_GAP_S, lo + (hi - lo) * clamp01(r));
}

/** Which one-shot a bed makes for a unit random number `r` (by weight). */
export function pickShot(shots: readonly { kind: ShotKind; weight: number }[], r: number): ShotKind {
  const total = shots.reduce((n, s) => n + s.weight, 0);
  let x = clamp01(r) * total;
  for (const s of shots) {
    if (x < s.weight) return s.kind;
    x -= s.weight;
  }
  return shots[shots.length - 1].kind;
}

/** When a bed's next random one-shot is due (on the audio clock, in seconds). Never sooner than `MIN_SHOT_GAP_S` after the last
 *  one or after the bed began, and never catching up: a clock that jumped (the page was away) gives one shot, then a fresh gap. */
export class ShotClock {
  private next: number;

  constructor(
    private readonly range: readonly [number, number],
    private readonly rand: () => number,
    start: number,
  ) {
    this.next = start + shotGap(range, rand());
  }

  /** Whether a shot is due at `now`. Call `fired` when it is made. */
  due(now: number): boolean {
    return now >= this.next;
  }

  fired(now: number): void {
    this.next = now + shotGap(this.range, this.rand());
  }

  get at(): number {
    return this.next;
  }
}

/* ------------------------------------------------------------------ the new cues */

/** A cue a thing calls for, with its own level and a delay in ms (as the fight's `cuesFor` gives). */
export interface PlannedCue {
  cue: Cue;
  gain?: number;
  delay?: number;
}

/** The sound of a twist's reveal: a dark tone for a curse, a bright one for a blessing, and a mixed twist both, softly. */
export function twistCues(tone: 'curse' | 'blessing' | 'mixed'): PlannedCue[] {
  if (tone === 'curse') return [{ cue: 'twistCurse' }];
  if (tone === 'blessing') return [{ cue: 'twistBlessing' }];
  return [{ cue: 'twistCurse', gain: 0.6 }, { cue: 'twistBlessing', gain: 0.6, delay: 220 }];
}

/** The chime for a relic set tier just reached: a 2-piece chord, a bigger 3-piece fanfare (null for anything else). */
export function setChime(pieces: number): Cue | null {
  if (pieces === 2) return 'setChime2';
  if (pieces >= 3) return 'setChime3';
  return null;
}
