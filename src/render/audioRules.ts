// The rules behind the page's audio engine, kept free of Web Audio and the DOM so the tests can check them: where a cue
// sits in the stereo field, which reasons are holding the music down (ducking), how the battle music follows the
// fight's tension, and the colour each tower act gives the music. `sound.ts` and `audioProcessors.ts` make the sound.

import type { Battle, BattleEvent } from '../sim/battle';
import { D, W } from '../sim/board';
import { at } from './iso';

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
