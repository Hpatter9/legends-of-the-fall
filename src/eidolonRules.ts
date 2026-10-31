// The Eidolon's call on the page, its rules (EIDOLONS batch 4, docs/notes/eidolons.md): the cinematic's beats and their times, in full and
// short, which one plays, when a tap may skip it, each Eidolon's colours and the beats of its attack, and how the War Horn shows its fill.
// Built on the ultimate's moment (`ultEpicRules.ts`: the hit-stop, the shake, the element bursts, the flash) at a larger scale. Pure: no
// DOM, no Pixi, so the tests read it; `eidolonCall.ts` draws it.

import { HORN_FULL } from './sim/warHorn';
import type { EidolonElement } from './sim/eidolons';

/** The beats of the call, ms from the tap (EIDOLON-CALL-2: the arrival from a rift became the pass across the screen, and the strike waits
 *  for the figure to have gone). The fight is held from the tap; the sim's strike is let through on the first attack beat, so the foes fall
 *  under the blow; the fight runs again at `RESUME`. */
export interface MomentTimes {
  /** The horn swings up and is blown; the board dims. */
  HORN: number;
  /** The Eidolon's painting comes on at one side and crosses the screen in its own way (`eidolonPass.ts`), its name stamped above it. */
  PASS: number;
  /** It has left the screen: nothing covers the board from here. */
  EXIT: number;
  /** The source of its attack flares (the trail it left, the sky, the edge) and the element runs from there to each foe. */
  BUILD: number;
  /** The attack's beats begin (one every `BEAT`); the first lets the strike through. */
  STRIKE: number;
  BEAT: number;
  /** The aftermath: the scorched or frosted ground, the drifting embers, steam or dust; the dim lifts. */
  AFTER: number;
  /** The fight runs again. */
  RESUME: number;
  /** The freeze on the first blow (real ms), and the shake as it lets go (0 to 1). */
  HIT_STOP: number;
  SHAKE: number;
  /** The dim's strength while the horn sounds (lighter as it passes, so the board shows under it). */
  DIM: number;
  /** Letterbox bars. */
  BARS: boolean;
}

/** In full: about three and three quarter seconds. */
export const FULL: MomentTimes = { HORN: 0, PASS: 420, EXIT: 1950, BUILD: 1950, STRIKE: 2500, BEAT: 260, AFTER: 3300, RESUME: 3800, HIT_STOP: 250, SHAKE: 1, DIM: 0.8, BARS: true };
/** The short one (the setting off, after the first call): a quicker pass, no horn shot or letterbox; about two seconds. */
export const SHORT: MomentTimes = { HORN: 0, PASS: 0, EXIT: 950, BUILD: 950, STRIKE: 1300, BEAT: 220, AFTER: 1750, RESUME: 2150, HIT_STOP: 160, SHAKE: 0.75, DIM: 0.65, BARS: false };

/**
 * The shots: horn (the horn blown, as the fight was) · pass (the figure crossing, the board under it) · build (it has gone; the source flares
 * and the element runs to the foes, a slow push in) · strike (the blows, a snap zoom on the first) · after (easing back over the aftermath).
 * Kept as plain data so a general shot layer can take them over later.
 */
export type Shot = 'horn' | 'pass' | 'build' | 'strike' | 'after' | 'resume';
export const SHOTS: readonly Shot[] = ['horn', 'pass', 'build', 'strike', 'after', 'resume'];
/** The shot playing `ms` into a cinematic. */
export function shotAt(m: MomentTimes, ms: number): Shot {
  if (ms >= m.RESUME) return 'resume';
  if (ms >= m.AFTER) return 'after';
  if (ms >= m.STRIKE) return 'strike';
  if (ms >= m.BUILD) return 'build';
  if (ms >= m.PASS) return 'pass';
  return 'horn';
}
/** The board's framing in each shot (a scale of the board's picture), and a snap zoom's on a blow. The trail and the runs are drawn on a
 *  layer framed the same way, so they stay on their tiles. */
export const BOARD_ZOOM: Readonly<Record<Shot, number>> = { horn: 1, pass: 1, build: 1.06, strike: 1, after: 1, resume: 1 };
export const SNAP_ZOOM = 1.22;
export const SNAP_MS = 110;
/** Where each Eidolon's eyes are in its card (shares of its width and height): its portrait beside its line is centred there. */
export const EYES: Readonly<Record<string, readonly [number, number]>> = {
  askel: [0.6, 0.38],
  nivra: [0.45, 0.32],
  aurelan: [0.5, 0.4],
  voltara: [0.55, 0.36],
  gorm: [0.42, 0.33],
  vaelkhar: [0.5, 0.42],
};

/** The line an Eidolon speaks as it passes: its first words the first time, then one of its others in turn (by how often the horn has
 *  been blown). */
export function lineOf(e: { line: string; lines: readonly string[] }, first: boolean, calls: number): string {
  return first || !e.lines.length ? e.line : e.lines[calls % e.lines.length];
}

/** A hero's reaction once the strike has landed, in the game's voice, by the Eidolon's element (one in turn by the calls). */
export const REACTIONS: Readonly<Record<EidolonElement, readonly string[]>> = {
  fire: ['Remind me never to owe that dog money.', 'Well. That is one way to warm a field.', 'Somebody fetch a bucket. A very big bucket.'],
  ice: ['My eyebrows have frozen. Worth it.', 'Did anyone else feel their teeth go cold?', 'And they say the north is unfriendly.'],
  light: ['I can see again. I can see everything.', 'Up, all of you. Dawn is not done with us.', 'I felt that in my bones. The good bones.'],
  lightning: ['My hair is standing on end. Is that normal?', 'She did not even break a sweat. Do clocks sweat?', 'Lovely. Everything smells of copper.'],
  earth: ['The ground just fought on our side. I will take it.', 'I am never complaining about the hills again.', 'Stone skin. I could get used to this.'],
  dark: ['I am not afraid. I am simply very, very still.', 'Was that a king, or the end of the world?', 'Keep him on our side. Whatever it costs.'],
};
export const reactionOf = (el: EidolonElement, calls: number): string => REACTIONS[el][calls % REACTIONS[el].length];

/** A tap skips once this much has played (never on an Eidolon's first call). */
export const SKIP_AFTER_MS = 600;

/** Which cinematic plays: the first call of each Eidolon always in full; after that the setting says. */
export const momentOf = (firstCall: boolean, fullSetting: boolean): MomentTimes => (firstCall || fullSetting ? FULL : SHORT);

/** Whether a tap may skip now. */
export const canSkip = (ms: number, firstCall: boolean): boolean => !firstCall && ms >= SKIP_AFTER_MS;

/** A tap skips to the strike: the pass is cut, the source flares for a moment and the strike lands (never later than it would have). */
export const SKIP_BUILD_MS = 250;
export const skipTarget = (m: MomentTimes, ms: number): number => Math.max(ms, m.EXIT, m.STRIKE - SKIP_BUILD_MS);

/** How many of the attack's beats play (the short one plays two), and their times. */
export function beatTimes(m: MomentTimes, beats: number): number[] {
  const n = m === SHORT ? Math.min(2, beats) : beats;
  return Array.from({ length: n }, (_, i) => m.STRIKE + i * m.BEAT);
}

/** Each Eidolon's look: its glow, its deep colour (the dim's tint and the bars' edge), and what the board is washed with afterwards. */
export interface EidolonLook {
  glow: string;
  deep: string;
  wash: string;
  /** The sound each beat makes (cues the game has). */
  sound: 'fireBoom' | 'frostShatter' | 'holyChime' | 'thunder' | 'earthRumble' | 'shadowHum';
}
export const LOOKS: Readonly<Record<EidolonElement, EidolonLook>> = {
  fire: { glow: '#ff8a3a', deep: '#3a0d02', wash: 'rgb(255 110 40 / 0.22)', sound: 'fireBoom' },
  ice: { glow: '#9be4ff', deep: '#04203a', wash: 'rgb(170 225 255 / 0.24)', sound: 'frostShatter' },
  light: { glow: '#ffe28a', deep: '#3a2a04', wash: 'rgb(255 228 150 / 0.24)', sound: 'holyChime' },
  lightning: { glow: '#8fd2ff', deep: '#0b1240', wash: 'rgb(140 200 255 / 0.2)', sound: 'thunder' },
  earth: { glow: '#ffb54a', deep: '#2a1a08', wash: 'rgb(200 150 80 / 0.22)', sound: 'earthRumble' },
  dark: { glow: '#b77bff', deep: '#12041e', wash: 'rgb(90 40 150 / 0.28)', sound: 'shadowHum' },
};

/** Where each beat of the attack lands on the board, as a share of its width and depth from the foes' edge (0, 0) to the heroes' (1, 1):
 *  the beat's spots, drawn as the element's huge bursts. `foes` means on each foe struck. EIDOLON-CALL-2: the first beat is always the one on
 *  the foes (the strike lands where the element has just run to); the others are its aftershocks. */
export type BeatSpots = readonly (readonly [number, number])[] | 'foes';
export const CHOREO: Readonly<Record<string, readonly BeatSpots[]>> = {
  // the wall of fire round each foe bursts, the blaze rolls outward, embers rain
  askel: ['foes', [[0.15, 0.15], [0.85, 0.15], [0.5, 0.4]], [[0.3, 0.25], [0.7, 0.3]]],
  // the spears of ice under the foes, the frost bursting up mid-field, the ice shattering
  nivra: ['foes', [[0.5, 0.25]], [[0.2, 0.2], [0.8, 0.2], [0.5, 0.45]]],
  // the lances of light, the sunrise rolling across
  aurelan: ['foes', [[0.2, 0.3], [0.5, 0.35], [0.8, 0.3]], [[0.5, 0.15]]],
  // the bolts on the foes, one colossal bolt mid-field, static crackling off
  voltara: ['foes', [[0.5, 0.3]], [[0.3, 0.15], [0.7, 0.4]]],
  // the stone bursting up under the foes, the ground heaving, rubble raining
  gorm: ['foes', [[0.5, 0.3]], [[0.2, 0.3], [0.8, 0.3]]],
  // the torrent over the foes, the void collapsing behind it
  vaelkhar: ['foes', [[0.15, 0.25], [0.5, 0.25], [0.85, 0.25]], [[0.5, 0.3]]],
};

/** The horn's look for a fill: the share revealed from mouthpiece to bell (0 to 1), whether it is full, and how strong the code glow along
 *  it is (it grows with the fill, steady when full). */
export function hornLook(fill: number): { share: number; full: boolean; glow: number } {
  const share = Math.max(0, Math.min(1, fill / HORN_FULL));
  return { share, full: share >= 1, glow: share >= 1 ? 1 : 0.15 + 0.55 * share };
}

/** The horn's words: "640/1000", or "Full". */
export const hornWords = (fill: number): string => (fill >= HORN_FULL ? 'Full' : `${Math.floor(fill)}/${HORN_FULL}`);

/** How many light motes stream into the horn for a gain (a boss wave's is a rush; a foe's a single mote); battery saver halves them. */
export const motesFor = (gain: number, saver: boolean): number => {
  const n = gain >= 100 ? 18 : gain >= 25 ? 10 : Math.min(8, Math.max(1, Math.round(gain / 3)));
  return saver ? Math.max(1, Math.round(n / 2)) : n;
};

/** The words when the horn is tapped but cannot be blown. */
export const NO_EIDOLON = 'No Eidolon has answered you yet';
export const SUMMONER_HINT = 'The Summoner in the Sanctum knows the old pacts: when one is bound, a full horn calls it in any fight.';

/** The wave card's line for what a fight added to the horn: "War Horn +100 · 740/1000", "The War Horn is full", or none. */
export function hornLine(add: { added: number; fill: number; filled: boolean }): string | undefined {
  if (add.filled) return 'The War Horn is full: blow it in any fight';
  if (add.added <= 0) return undefined;
  return `War Horn +${Math.round(add.added * 10) / 10} · ${hornWords(add.fill)}`;
}
