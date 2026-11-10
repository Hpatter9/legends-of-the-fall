// The rules behind the page's audio engine, kept free of Web Audio and the DOM so the tests can check them: where a cue
// sits in the stereo field, which reasons are holding the music down (ducking),
// and the colour each tower act gives the music (a battle's music no longer follows its tension). `sound.ts` and `audioProcessors.ts` make the sound.

import type { Battle, BattleEvent } from '../sim/battle';
import { D, W, type Area } from '../sim/board';
import type { SpellId } from '../sim/spells';
import { at } from './iso';
import type { Cue } from './soundRules';
import type { Track } from './musicScore';

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

/** The king's spells cast on no tile (their `target` is 'all'; named here, not read from `SPELLS`, as importing the spells here
 *  loops back on itself; `test/spell-sfx.test.ts` checks the two agree). */
export const NO_TILE_SPELLS: ReadonlySet<SpellId> = new Set<SpellId>(['rally', 'quake', 'warcry', 'bulwark', 'thunderclap']);

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
      return { u: e.u, v: e.v };
    // (a spell that goes everywhere is cast on no tile: its 0, 0 would pan it hard to one side)
    case 'spell':
      return NO_TILE_SPELLS.has(e.id) ? null : { u: e.u, v: e.v };
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

/** How far the music and the ambience dip (dB) for each reason, and the low-pass they close to (Hz; `OPEN_HZ` is none).
 *  docs/notes/sound-pass.md: the old one dip (-8 dB, muffled to 1.4 kHz) under every sheet, the Armies screen and the settings
 *  made the music all but vanish on a phone's speaker whenever a menu opened, and pumped with every line of a cinematic. Now a
 *  sheet or card only lowers it a little, and only the summoning show and the reveals (which have their own big sounds) dip it
 *  far and muffle it. */
export interface DuckDepth {
  db: number;
  hz: number;
}
export const OPEN_HZ = 20000;
export const DUCKS: Readonly<Record<string, DuckDepth>> = {
  // (a sheet over the game: the hero roster, the party, an auto-run's summary)
  sheet: { db: -4, hz: OPEN_HZ },
  // (an event's card)
  event: { db: -4, hz: OPEN_HZ },
  // (a boss's card, 2.4 s as the boss track comes in: a touch, never muffled, so the boss track arrives clear)
  boss: { db: -2, hz: OPEN_HZ },
  // (a cinematic: held down a little for the whole scene, under its words, never dipping and lifting line by line)
  cinematic: { db: -3, hz: OPEN_HZ },
  // (an eidolon's call, in the middle of a fight: lower, but the battle music stays clear (it was -8 dB and muffled to 1.4 kHz for
  //  the whole call, the owner's "muffled in battle"))
  eidolon: { db: -4, hz: OPEN_HZ },
  // (the shows off the battlefield with their own big sounds: the summoning show, a hero's reveal, a binding)
  summon: { db: -9, hz: 1800 },
  reveal: { db: -9, hz: 1800 },
  binding: { db: -9, hz: 1800 },
};
/** The reasons that belong to a fight's own moments and are counted by hand (an eidolon's call): a fight starting or ending lets
 *  them go whatever their count, so a call begun twice and ended once can never leave the battle music held down. (The boss's
 *  card follows its element, `bindDuck`, so it cannot stick.) */
export const FIGHT_DUCKS: readonly string[] = ['eidolon'];

/** A reason with no depth of its own. */
export const DUCK_OTHER: DuckDepth = { db: -6, hz: 4000 };

/** The dip for the reasons holding the music down: the deepest of them, and the lowest low-pass (none held: no dip). */
export function duckOf(reasons: Iterable<string>): { gain: number; hz: number } {
  let db = 0;
  let hz = OPEN_HZ;
  for (const r of reasons) {
    const d = DUCKS[r] ?? DUCK_OTHER;
    db = Math.min(db, d.db);
    hz = Math.min(hz, d.hz);
  }
  return { gain: 10 ** (db / 20), hz };
}

/** Whether the dip moves down (deeper or more muffled), up, or not at all when the reasons held go from `before` to `after`: a dip
 *  down comes at once, a lift up waits `DUCK_HOLD_S` (so a reason let go as another is raised never lets the music bob up). */
export function duckChange(before: Iterable<string>, after: Iterable<string>): 'down' | 'up' | null {
  const a = duckOf(before);
  const b = duckOf(after);
  if (b.gain < a.gain - 1e-9 || b.hz < a.hz) return 'down';
  if (b.gain > a.gain + 1e-9 || b.hz > a.hz) return 'up';
  return null;
}

/** How long a dip takes to go down, and to come back up (seconds to settle, about three time constants): down gently, up more
 *  gently still, so nothing pumps. */
export const DUCK_DOWN_S = 0.35;
export const DUCK_UP_S = 1.0;
/** A lift waits this long (seconds) before it starts: one sheet closing as the next opens, or a card that flickers, never lets
 *  the music bob up and down between them. */
export const DUCK_HOLD_S = 0.3;
/** The time constant of a dip going down (`on`) or coming back up. */
export const duckTc = (on: boolean): number => (on ? DUCK_DOWN_S : DUCK_UP_S) / 3;

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

  /** Lets go of `reason` however many holds it has. */
  drop(reason: string): void {
    this.counts.delete(reason);
  }

  /** The reasons holding it now (for the debug view). */
  get reasons(): string[] {
    return [...this.counts.keys()];
  }

  clear(): void {
    this.counts.clear();
  }
}

/* ------------------------------------------------------------------ the volume sliders */

/** The settings' volume sliders (0 to 100) are heard on a perceptual curve, not a straight gain: a step of the slider is the same
 *  step in how loud it sounds, all the way down. A sound is heard as half as loud about 10 dB down, so the slider's share `p` is
 *  heard as `p` of full when its gain is `p` to this power (half way is -10 dB, a quarter -20 dB, 10 % -33 dB). The old straight
 *  gain spent most of the slider's travel within 6 dB of full and fell off a cliff in its last tenth. */
export const SLIDER_POWER = Math.log(10) / (2 * Math.LN2);
/** The slider's step (the settings' range input). */
export const SLIDER_STEP = 5;

/** The gain (0 to 1) for a slider at `percent` (0 is silent). */
export function sliderGain(percent: number): number {
  if (!(percent > 0)) return 0;
  return Math.min(1, percent / 100) ** SLIDER_POWER;
}

/** The same in dB (-Infinity at 0). */
export const sliderDb = (percent: number): number => 20 * Math.log10(sliderGain(percent));

/** A volume saved under the old straight slider, moved to the new curve so it keeps the gain it had (to the slider's step, never
 *  rounded down to silent): 50 % was -6 dB and is now 65 %, 10 % was -20 dB and is now 25 %. 0 and 100 stay. */
export function curvedVolume(oldPercent: number): number {
  if (!(oldPercent > 0)) return 0;
  if (oldPercent >= 100) return 100;
  const p = 100 * (oldPercent / 100) ** (1 / SLIDER_POWER);
  return Math.max(SLIDER_STEP, Math.min(100, Math.round(p / SLIDER_STEP) * SLIDER_STEP));
}

/* ------------------------------------------------------------------ crossfades */

/** A fade's shape: `n` points from `from` to `to` on an equal-power curve (a quarter sine), so two tracks crossfading keep the
 *  music's loudness steady through the change, with no dip in the middle (two straight or exponential fades dip about 3 dB). */
export function fadeCurve(from: number, to: number, n = 32): Float32Array {
  const c = new Float32Array(Math.max(2, n));
  const last = c.length - 1;
  for (let i = 0; i <= last; i++) {
    const x = (i / last) * (Math.PI / 2);
    // (rising: from + rise × sin; falling: to + fall × cos, so each end is exact and the middle carries the power)
    c[i] = to >= from ? from + (to - from) * Math.sin(x) : to + (from - to) * Math.cos(x);
  }
  c[0] = from;
  c[last] = to;
  return c;
}

/** How long the music under a sting takes to fade (seconds): out from under the fanfare, never cut. */
export const STING_FADE_S = 0.8;
/** How long the sound takes to come back when the game is seen again (seconds), from silence to where it was. */
export const WAKE_FADE_S = 0.5;

/* ------------------------------------------------------------------ the limiters */

/** The extra gain (dB) a browser's native compressor (`DynamicsCompressorNode`, hard knee) adds to everything it passes, by the
 *  Web Audio spec's "makeup gain" (0.6 of the gain it takes off a full-scale signal). Measured in Chromium to 0.01 dB. The page
 *  undoes it, so the sound is as loud through the native compressor as through the limiter that takes over from it (before, the
 *  master's fallback added 3.9 dB, and the sound dropped by that when the limiter loaded, or stayed 3.9 dB louder and squashed
 *  where it never loaded). */
export function compressorMakeupDb(thresholdDb: number, ratio: number): number {
  return -0.6 * thresholdDb * (1 - 1 / ratio);
}

/** The master's limiter (and its native stand-in): every sound together, held under this (dBFS). */
export const MASTER_LIMIT_DB = -1.5;
/** The music and ambience bus's own limiter: the bed held under this (dBFS), well over where it plays, so it only ever catches a
 *  stray peak and never squashes the music against the effects. */
export const BED_LIMIT_DB = -8;
/** The high-pass on the music and ambience (Hz): the deepest bass, which a phone's speaker cannot play and which only eats the
 *  limiter's headroom, is cut gently. */
export const BED_HIGHPASS_HZ = 40;

/* ------------------------------------------------------------------ adaptive music */

export type { Track };

/** The music's colour (its low-pass, in Hz, and its pace) under a tower act: the act's ceiling and pace, or open and as written
 *  with no act. The same for every track: a battle no longer follows the fight's tension (the owner's ask, "the battle music
 *  should stay on and consistent through battle"), so no low-pass muffles and opens it, no swell or rumble comes and goes and
 *  its pace never changes as a fight runs hot. See docs/notes/battle-music.md. */
export function musicColour(act: number | null): { cutoff: number; rate: number } {
  const c = colourOf(act);
  return { cutoff: c?.cutoff ?? OPEN_HZ, rate: c?.rate ?? 1 };
}

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

/** The scenes the ambience knows. The tower has one for each of its three looks; a field fight's bed is its land's (`bedOf`). */
export type Scene = 'camp' | 'tavern' | 'hall' | 'castle' | 'spells' | 'armies' | 'field' | 'tower1' | 'tower2' | 'tower3';

/** The beds themselves (one is playing at a time, besides a crossfade): the home screen's places, the tower's acts, and the
 *  battle boards' kinds of land. */
export type BedId =
  | 'camp' | 'tavern' | 'hall' | 'castle' | 'library' | 'armies' | 'field' | 'crypt' | 'halls' | 'storm'
  | 'meadow' | 'forest' | 'snow' | 'desert' | 'oasis' | 'volcano' | 'forge' | 'cave' | 'swamp' | 'graveyard' | 'ruins'
  // (the Assault's holds, `holdSound.ts`: the ones whose place no land's bed already is)
  | 'warcamp' | 'barrow' | 'den' | 'maze' | 'bonefire' | 'shrine' | 'foundry';

export const BED_OF: Record<Scene, BedId> = {
  camp: 'camp',
  tavern: 'tavern',
  hall: 'hall',
  castle: 'castle',
  spells: 'library',
  armies: 'armies',
  field: 'field',
  tower1: 'crypt',
  tower2: 'halls',
  tower3: 'storm',
};

/** A battle board's bed by its land (`Board.area`): the land's own air under the fight (`docs/notes/sound-pass.md`). */
export const LAND_BED: Record<Area, BedId> = {
  highlands: 'meadow', plains: 'meadow', forest: 'forest', autumn: 'forest', snow: 'snow', desert: 'desert', oasis: 'oasis',
  volcano: 'volcano', forge: 'forge', dungeon: 'cave', crystal: 'cave', swamp: 'swamp', graveyard: 'graveyard', ruins: 'ruins',
  temple: 'ruins', shrine: 'ruins', warcamp: 'armies',
};

/** The bed for a scene: a field fight's comes from its land when the land is known (else the plain field's wind and birds). */
export function bedOf(scene: Scene, land: Area | null = null): BedId {
  if (scene === 'field' && land) return LAND_BED[land] ?? 'field';
  return BED_OF[scene];
}

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
/** No bed's own level goes past this (with the ambience bus, a bed is never near the music's loudness). Each bed's `level` was set
 *  by measuring it (`tools/audio-mix/measure.mjs --only beds`) to sit about 14 LU under the place's music, its plain and its phone
 *  loudness together, as the music's trims are (docs/notes/sound-pass.md); a bed that is all bass is lifted no more than 8 dB. */
export const BED_LEVEL_MAX = 0.5;
/** The least time between two random one-shots of a bed (seconds): they are an occasional touch, not a pattern. */
export const MIN_SHOT_GAP_S = 2.5;

/** The one-shots a bed can sprinkle in. */
export type ShotKind =
  | 'pop' | 'clink' | 'twinkle' | 'bird' | 'drum' | 'drip' | 'thunder' | 'gust' | 'frog' | 'crow' | 'anvil' | 'page'
  // (the holds' own: a wolf's howl, a tolling bell, a shrine's small bell, a hiss of steam, a far low horn, a piper's phrase, a great
  //  taiko, a steam hammer's fall, a flare of fire)
  | 'howl' | 'bell' | 'chime' | 'steam' | 'lowHorn' | 'pipe' | 'taiko' | 'hammer' | 'flare';

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
  // the camp, the overlook at dusk: the campfire by the ledge (a low body of flame, a bright flicker, pops and crackles), the far
  // waterfalls and the river (a steady low rush and its hiss), the wind over the cliff, and night insects
  camp: {
    id: 'camp',
    level: 0.19,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 520, gain: 0.42, mods: [slow(0.35, 0.5), slow(1.9, 0.25)] },
      { kind: 'noise', filter: 'bandpass', q: 1.2, hz: 2600, gain: 0.07, mods: [slow(3.1, 0.7), slow(7.3, 0.5)] },
      // (the falls, far below: a steady rush, low and soft, with its hiss over it)
      { kind: 'noise', filter: 'lowpass', q: 0.5, hz: 750, gain: 0.2, mods: [slow(0.05, 0.15)] },
      { kind: 'noise', filter: 'bandpass', q: 0.6, hz: 2300, gain: 0.05, mods: [slow(0.07, 0.2)] },
      // (the wind over the cliff, rising and falling slowly)
      { kind: 'noise', filter: 'bandpass', q: 0.8, hz: 450, gain: 0.16, sweep: { hz: 0.09, depth: 200 }, mods: [slow(0.06, 0.7)] },
      // (crickets: a high band chirping fast, in slow bursts)
      { kind: 'noise', filter: 'bandpass', q: 16, hz: 4600, gain: 0.05, mods: [slow(17, 1), slow(0.23, 0.9)] },
      { kind: 'noise', filter: 'bandpass', q: 16, hz: 5300, gain: 0.035, mods: [slow(21, 1), slow(0.17, 0.9)] },
    ],
    shots: [{ kind: 'pop', weight: 1 }],
    gap: [2.5, 5],
  },
  // the tavern: murmured talk (two bands swelling out of step), the hearth's crackle, the odd mug
  tavern: {
    id: 'tavern',
    level: 0.21,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 1.3, hz: 420, gain: 0.45, sweep: { hz: 0.11, depth: 90 }, mods: [slow(0.13, 0.7), slow(0.7, 0.2)] },
      { kind: 'noise', filter: 'bandpass', q: 1.0, hz: 950, gain: 0.25, sweep: { hz: 0.07, depth: 160 }, mods: [slow(0.09, 0.8)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 380, gain: 0.22, mods: [slow(0.4, 0.4)] },
      // (the hearth: a bright flicker of flame)
      { kind: 'noise', filter: 'bandpass', q: 1.5, hz: 2200, gain: 0.05, mods: [slow(4.3, 0.8), slow(1.3, 0.4)] },
    ],
    shots: [
      { kind: 'clink', weight: 2 },
      { kind: 'pop', weight: 2 },
    ],
    gap: [3, 7],
  },
  // the summoning hall: a low hum and a shimmer of high partials
  hall: {
    id: 'hall',
    level: 0.085,
    layers: [
      { kind: 'tone', wave: 'sine', hz: 110, detune: 7, gain: 0.3, mods: [slow(0.08, 0.35)] },
      { kind: 'tone', wave: 'sine', hz: 165, detune: 5, gain: 0.16, mods: [slow(0.06, 0.5)] },
      { kind: 'tone', wave: 'sine', hz: 1760, gain: 0.09, mods: [slow(0.21, 1)] },
      { kind: 'tone', wave: 'sine', hz: 2637, gain: 0.066, mods: [slow(0.34, 1)] },
      { kind: 'tone', wave: 'sine', hz: 3520, gain: 0.045, mods: [slow(0.27, 1)] },
    ],
    shots: [{ kind: 'twinkle', weight: 1 }],
    gap: [4, 9],
  },
  // the castle: wind, and the trees on the hill moving in it (a high rustle that comes and goes with the gusts); a far bird
  castle: {
    id: 'castle',
    level: 0.175,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 0.8, hz: 480, gain: 0.45, sweep: { hz: 0.12, depth: 220 }, mods: [slow(0.09, 0.6)] },
      { kind: 'noise', filter: 'bandpass', q: 0.6, hz: 3200, gain: 0.1, sweep: { hz: 0.13, depth: 900 }, mods: [slow(0.11, 0.8), slow(0.37, 0.4)] },
    ],
    shots: [{ kind: 'bird', weight: 1 }],
    gap: [8, 18],
  },
  // the Spells study: the hush of the candles (a soft breath of flame, flickering), a low magic hum that beats slowly, a faint
  // high shimmer; now and then a page turning or a glint of a spell
  library: {
    id: 'library',
    level: 0.1,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 320, gain: 0.3, mods: [slow(0.5, 0.3)] },
      { kind: 'noise', filter: 'bandpass', q: 2, hz: 1200, gain: 0.09, mods: [slow(2.7, 0.8), slow(0.9, 0.4)] },
      { kind: 'tone', wave: 'sine', hz: 196, detune: 4, gain: 0.2, mods: [slow(0.1, 0.4)] },
      { kind: 'tone', wave: 'sine', hz: 294, detune: 6, gain: 0.14, mods: [slow(0.13, 0.5)] },
      { kind: 'tone', wave: 'sine', hz: 1568, gain: 0.035, mods: [slow(0.3, 1)] },
    ],
    shots: [
      { kind: 'page', weight: 2 },
      { kind: 'twinkle', weight: 1 },
    ],
    gap: [6, 13],
  },
  // the armies: a very soft low rumble and a distant drum
  armies: {
    id: 'armies',
    level: 0.5,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 140, gain: 0.4, mods: [slow(0.1, 0.5)] },
      // (a far wind over the plain, which a phone's speaker can play: the rumble and the drums alone were all bass)
      { kind: 'noise', filter: 'bandpass', q: 0.8, hz: 520, gain: 0.12, sweep: { hz: 0.1, depth: 200 }, mods: [slow(0.08, 0.6)] },
    ],
    shots: [{ kind: 'drum', weight: 1 }],
    gap: [4, 7],
  },
  // a field fight: soft wind, now and then a bird
  field: {
    id: 'field',
    level: 0.15,
    layers: [{ kind: 'noise', filter: 'bandpass', q: 0.7, hz: 620, gain: 0.45, sweep: { hz: 0.15, depth: 260 }, mods: [slow(0.11, 0.55)] }],
    shots: [{ kind: 'bird', weight: 1 }],
    gap: [6, 14],
  },
  // tower act 1, the crypt: drips and a cold low drone
  crypt: {
    id: 'crypt',
    level: 0.1,
    layers: [
      { kind: 'tone', wave: 'sine', hz: 55, detune: 6, gain: 0.35, mods: [slow(0.07, 0.3)] },
      { kind: 'tone', wave: 'triangle', hz: 82.4, detune: 9, gain: 0.08, mods: [slow(0.05, 0.5)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 260, gain: 0.18, mods: [slow(0.08, 0.5)] },
      // (cold air moving in the passages, which a phone's speaker can play: the drone alone is all bass)
      { kind: 'noise', filter: 'bandpass', q: 0.8, hz: 700, gain: 0.25, mods: [slow(0.06, 0.6)] },
    ],
    shots: [{ kind: 'drip', weight: 1 }],
    gap: [3, 7],
  },
  // act 2, the echoing halls: wind with a long echo
  halls: {
    id: 'halls',
    level: 0.18,
    layers: [{ kind: 'noise', filter: 'bandpass', q: 1.1, hz: 540, gain: 0.5, sweep: { hz: 0.1, depth: 240 }, mods: [slow(0.08, 0.7)] }],
    echo: { delay: 0.42, feedback: 0.45, mix: 0.55 },
    shots: [{ kind: 'gust', weight: 1 }],
    gap: [6, 12],
  },
  // act 3, the storm: rain, wind, far thunder
  storm: {
    id: 'storm',
    level: 0.048,
    layers: [
      { kind: 'noise', filter: 'highpass', q: 0.6, hz: 1700, gain: 0.2, mods: [slow(0.13, 0.25)] },
      { kind: 'noise', filter: 'bandpass', q: 0.5, hz: 5500, gain: 0.12, mods: [slow(0.31, 0.3)] },
      { kind: 'noise', filter: 'bandpass', q: 0.9, hz: 380, gain: 0.4, sweep: { hz: 0.16, depth: 160 }, mods: [slow(0.12, 0.6)] },
    ],
    shots: [{ kind: 'thunder', weight: 1 }],
    gap: [9, 20],
  },
  // ---- the battle boards' lands (`LAND_BED`): each land's own air, under the fight
  // grassland and highland: the wind, the grass hissing in it, a bird
  meadow: {
    id: 'meadow',
    level: 0.14,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 0.7, hz: 620, gain: 0.42, sweep: { hz: 0.15, depth: 260 }, mods: [slow(0.11, 0.55)] },
      { kind: 'noise', filter: 'highpass', q: 0.6, hz: 2800, gain: 0.05, mods: [slow(0.11, 0.7), slow(0.29, 0.3)] },
    ],
    shots: [{ kind: 'bird', weight: 1 }],
    gap: [6, 14],
  },
  // the woods (green or autumn): the trees moving in the wind, insects, birds and now and then a crow
  forest: {
    id: 'forest',
    level: 0.22,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 0.8, hz: 420, gain: 0.3, sweep: { hz: 0.1, depth: 160 }, mods: [slow(0.08, 0.6)] },
      { kind: 'noise', filter: 'bandpass', q: 0.6, hz: 3000, gain: 0.12, sweep: { hz: 0.14, depth: 900 }, mods: [slow(0.12, 0.8), slow(0.41, 0.4)] },
      { kind: 'noise', filter: 'bandpass', q: 14, hz: 6200, gain: 0.025, mods: [slow(29, 1), slow(0.19, 0.9)] },
    ],
    shots: [
      { kind: 'bird', weight: 3 },
      { kind: 'crow', weight: 1 },
    ],
    gap: [4, 10],
  },
  // snow: a cold wind that howls (a narrow band, swept), its low roar, and gusts
  snow: {
    id: 'snow',
    level: 0.28,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 3, hz: 700, gain: 0.3, sweep: { hz: 0.07, depth: 300 }, mods: [slow(0.09, 0.7)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 320, gain: 0.3, mods: [slow(0.06, 0.5)] },
      { kind: 'noise', filter: 'highpass', q: 0.5, hz: 4500, gain: 0.03, mods: [slow(0.13, 0.6)] },
    ],
    shots: [{ kind: 'gust', weight: 1 }],
    gap: [5, 11],
  },
  // desert: a dry wind, sand hissing in it, gusts
  desert: {
    id: 'desert',
    level: 0.13,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 0.6, hz: 1000, gain: 0.32, sweep: { hz: 0.08, depth: 380 }, mods: [slow(0.07, 0.65)] },
      { kind: 'noise', filter: 'highpass', q: 0.5, hz: 4200, gain: 0.05, mods: [slow(0.07, 0.8), slow(0.5, 0.3)] },
    ],
    shots: [{ kind: 'gust', weight: 1 }],
    gap: [7, 14],
  },
  // the oasis: soft wind, water trickling over stones, birds and a frog
  oasis: {
    id: 'oasis',
    level: 0.235,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 0.7, hz: 700, gain: 0.25, sweep: { hz: 0.1, depth: 200 }, mods: [slow(0.08, 0.5)] },
      { kind: 'noise', filter: 'bandpass', q: 1.5, hz: 1800, gain: 0.06, sweep: { hz: 0.6, depth: 300 }, mods: [slow(5.3, 0.6), slow(3.7, 0.5)] },
      { kind: 'noise', filter: 'lowpass', q: 0.6, hz: 600, gain: 0.1, mods: [slow(0.2, 0.3)] },
    ],
    shots: [
      { kind: 'bird', weight: 2 },
      { kind: 'frog', weight: 1 },
    ],
    gap: [5, 11],
  },
  // the volcano: a deep rumble, the roar of fire, pops of the lava and far eruptions
  volcano: {
    id: 'volcano',
    level: 0.385,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 110, gain: 0.5, mods: [slow(0.1, 0.5)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 650, gain: 0.22, mods: [slow(0.3, 0.4), slow(1.7, 0.25)] },
      { kind: 'noise', filter: 'bandpass', q: 1.2, hz: 2400, gain: 0.04, mods: [slow(3.3, 0.7)] },
    ],
    shots: [
      { kind: 'pop', weight: 3 },
      { kind: 'thunder', weight: 1 },
    ],
    gap: [3, 8],
  },
  // the forge: the roar of the furnaces, and far hammers on anvils
  forge: {
    id: 'forge',
    level: 0.335,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 160, gain: 0.35, mods: [slow(0.12, 0.4)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 700, gain: 0.25, mods: [slow(0.4, 0.4), slow(2.1, 0.25)] },
    ],
    shots: [
      { kind: 'anvil', weight: 2 },
      { kind: 'pop', weight: 1 },
    ],
    gap: [3, 7],
  },
  // a dungeon or a crystal cave: a cold low drone, dark air, drips and a glint
  cave: {
    id: 'cave',
    level: 0.11,
    layers: [
      { kind: 'tone', wave: 'sine', hz: 55, detune: 6, gain: 0.3, mods: [slow(0.07, 0.3)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 300, gain: 0.22, mods: [slow(0.08, 0.5)] },
      { kind: 'noise', filter: 'bandpass', q: 0.8, hz: 650, gain: 0.25, mods: [slow(0.07, 0.6)] },
      { kind: 'tone', wave: 'sine', hz: 2093, gain: 0.015, mods: [slow(0.23, 1)] },
    ],
    shots: [
      { kind: 'drip', weight: 3 },
      { kind: 'twinkle', weight: 1 },
    ],
    gap: [3, 7],
  },
  // the swamp: insects thick in the air, a low wind, frogs
  swamp: {
    id: 'swamp',
    level: 0.45,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 400, gain: 0.25, mods: [slow(0.07, 0.5)] },
      { kind: 'noise', filter: 'bandpass', q: 10, hz: 3800, gain: 0.05, mods: [slow(23, 1), slow(0.21, 0.7)] },
      { kind: 'noise', filter: 'bandpass', q: 12, hz: 4500, gain: 0.04, mods: [slow(31, 1), slow(0.13, 0.8)] },
    ],
    shots: [{ kind: 'frog', weight: 1 }],
    gap: [3, 8],
  },
  // the graveyard: a low, thin wind, a crow, a gust through the stones
  graveyard: {
    id: 'graveyard',
    level: 0.375,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 1.4, hz: 380, gain: 0.35, sweep: { hz: 0.06, depth: 140 }, mods: [slow(0.07, 0.7)] },
      { kind: 'noise', filter: 'bandpass', q: 4, hz: 1300, gain: 0.04, sweep: { hz: 0.05, depth: 400 }, mods: [slow(0.1, 0.8)] },
    ],
    shots: [
      { kind: 'crow', weight: 2 },
      { kind: 'gust', weight: 1 },
    ],
    gap: [7, 15],
  },
  // ruins, a temple, a shrine: the wind among old stones, echoing, and a bird
  ruins: {
    id: 'ruins',
    level: 0.18,
    layers: [{ kind: 'noise', filter: 'bandpass', q: 0.9, hz: 560, gain: 0.45, sweep: { hz: 0.11, depth: 240 }, mods: [slow(0.08, 0.6)] }],
    echo: { delay: 0.31, feedback: 0.3, mix: 0.35 },
    shots: [
      { kind: 'bird', weight: 2 },
      { kind: 'gust', weight: 1 },
    ],
    gap: [6, 13],
  },
  // ---- the Assault's holds (`HOLD_VOICE` in `holdSound.ts`): the place itself, under the battle; the hold's drums are a line of their own
  // Bloodtusk Hold, the orcs' warcamp: the forge's roar and its bellows, the cook fires, the yards at work (hammers on anvils, a far drum)
  warcamp: {
    id: 'warcamp',
    level: 0.33,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 170, gain: 0.32, mods: [slow(0.12, 0.4)] },
      // (the bellows: the furnace breathing in and out)
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 720, gain: 0.24, mods: [slow(0.45, 0.6), slow(2.1, 0.25)] },
      // (the cook fires and the butcher's: a bright flicker)
      { kind: 'noise', filter: 'bandpass', q: 1.3, hz: 2400, gain: 0.05, mods: [slow(3.7, 0.7), slow(6.1, 0.5)] },
      // (the camp's own noise: a low murmur of many voices)
      { kind: 'noise', filter: 'bandpass', q: 1.2, hz: 380, gain: 0.16, sweep: { hz: 0.09, depth: 80 }, mods: [slow(0.14, 0.7)] },
    ],
    shots: [
      { kind: 'anvil', weight: 3 },
      { kind: 'pop', weight: 2 },
      { kind: 'crow', weight: 1 },
    ],
    gap: [3, 6],
  },
  // the Barrow Necropolis: a cold drone under the mounds, thin wind through the stones, and now and then a drip or a crow
  barrow: {
    id: 'barrow',
    level: 0.17,
    layers: [
      { kind: 'tone', wave: 'sine', hz: 55, detune: 7, gain: 0.12, mods: [slow(0.06, 0.35)] },
      { kind: 'tone', wave: 'triangle', hz: 82.4, detune: 11, gain: 0.04, mods: [slow(0.05, 0.5)] },
      // (a hollow fifth, far and faint: the barrows' voices)
      { kind: 'tone', wave: 'sine', hz: 220, detune: 9, gain: 0.05, mods: [slow(0.09, 0.9)] },
      { kind: 'noise', filter: 'bandpass', q: 1.4, hz: 520, gain: 0.42, sweep: { hz: 0.06, depth: 140 }, mods: [slow(0.07, 0.7)] },
      { kind: 'noise', filter: 'bandpass', q: 4, hz: 1300, gain: 0.09, sweep: { hz: 0.05, depth: 400 }, mods: [slow(0.1, 0.8)] },
    ],
    echo: { delay: 0.38, feedback: 0.35, mix: 0.4 },
    shots: [
      { kind: 'drip', weight: 2 },
      { kind: 'crow', weight: 1 },
      { kind: 'gust', weight: 1 },
    ],
    gap: [5, 11],
  },
  // the Howling Den: the wind howling over the crags (a narrow band, swept), its low roar, and wolves far off
  den: {
    id: 'den',
    level: 0.31,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 3.5, hz: 640, gain: 0.3, sweep: { hz: 0.08, depth: 280 }, mods: [slow(0.1, 0.7)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 300, gain: 0.28, mods: [slow(0.06, 0.5)] },
      { kind: 'noise', filter: 'bandpass', q: 0.6, hz: 2800, gain: 0.06, sweep: { hz: 0.13, depth: 800 }, mods: [slow(0.12, 0.8)] },
    ],
    shots: [
      { kind: 'howl', weight: 3 },
      { kind: 'gust', weight: 1 },
    ],
    gap: [5, 10],
  },
  // the Heart of the Maze: still air in the stone passages, a low drone, every sound coming back off the walls
  maze: {
    id: 'maze',
    level: 0.15,
    layers: [
      { kind: 'tone', wave: 'sine', hz: 61.7, detune: 6, gain: 0.1, mods: [slow(0.07, 0.3)] },
      { kind: 'noise', filter: 'bandpass', q: 1.1, hz: 520, gain: 0.34, sweep: { hz: 0.09, depth: 200 }, mods: [slow(0.08, 0.7)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 280, gain: 0.1, mods: [slow(0.08, 0.5)] },
    ],
    echo: { delay: 0.47, feedback: 0.5, mix: 0.6 },
    shots: [
      { kind: 'drip', weight: 2 },
      { kind: 'gust', weight: 1 },
      { kind: 'lowHorn', weight: 1 },
    ],
    gap: [5, 11],
  },
  // Bonefire Crag: the great fires roaring (a low body, a rolling flame, a bright crackle), the wind on the crag
  bonefire: {
    id: 'bonefire',
    level: 0.3,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 420, gain: 0.4, mods: [slow(0.3, 0.5), slow(1.6, 0.3)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 130, gain: 0.3, mods: [slow(0.1, 0.5)] },
      { kind: 'noise', filter: 'bandpass', q: 1.2, hz: 2500, gain: 0.08, mods: [slow(3.3, 0.7), slow(7.1, 0.5)] },
      { kind: 'noise', filter: 'bandpass', q: 0.8, hz: 480, gain: 0.12, sweep: { hz: 0.08, depth: 200 }, mods: [slow(0.07, 0.7)] },
    ],
    shots: [
      { kind: 'pop', weight: 4 },
      { kind: 'flare', weight: 1 },
    ],
    gap: [3, 6],
  },
  // the Moonlit Shrine: the night's insects, a soft wind in the pines, a held high note like a bowl singing, and the shrine's bells
  shrine: {
    id: 'shrine',
    level: 0.2,
    layers: [
      { kind: 'noise', filter: 'bandpass', q: 0.7, hz: 560, gain: 0.3, sweep: { hz: 0.1, depth: 220 }, mods: [slow(0.08, 0.6)] },
      { kind: 'noise', filter: 'bandpass', q: 0.6, hz: 3200, gain: 0.07, sweep: { hz: 0.13, depth: 900 }, mods: [slow(0.11, 0.8)] },
      { kind: 'noise', filter: 'bandpass', q: 16, hz: 4800, gain: 0.04, mods: [slow(19, 1), slow(0.21, 0.9)] },
      { kind: 'tone', wave: 'sine', hz: 587, detune: 4, gain: 0.03, mods: [slow(0.11, 1)] },
    ],
    shots: [
      { kind: 'chime', weight: 3 },
      { kind: 'bell', weight: 1 },
    ],
    gap: [4, 9],
  },
  // the Iron Foundry: the furnaces' roar, the engines turning over (a low pulse), steam, and hammers
  foundry: {
    id: 'foundry',
    level: 0.27,
    layers: [
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 160, gain: 0.34, mods: [slow(0.12, 0.4)] },
      { kind: 'noise', filter: 'lowpass', q: 0.7, hz: 700, gain: 0.22, mods: [slow(0.4, 0.4), slow(2.1, 0.25)] },
      // (the engines: a low hum that throbs, about one stroke a second)
      { kind: 'tone', wave: 'triangle', hz: 73.4, detune: 5, gain: 0.12, mods: [slow(1.1, 0.8)] },
      // (steam leaking somewhere: a thin high hiss that comes and goes)
      { kind: 'noise', filter: 'highpass', q: 0.6, hz: 5200, gain: 0.03, mods: [slow(0.17, 0.9)] },
    ],
    shots: [
      { kind: 'anvil', weight: 2 },
      { kind: 'steam', weight: 2 },
    ],
    gap: [3, 7],
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
