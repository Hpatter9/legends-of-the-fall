// The sound of the Assault's holds (HOLD-SOUND, docs/notes/hold-sound.md), kept free of Web Audio and the DOM so the tests can check it:
// each hold's own voice (its ambience bed and what its "drums" are: war drums, bone bells, howling stones, pipers, horned altars, bonefires,
// fire circles, great war drums, steam hammers), the music of the war table and the field, the cue each of the field's events calls for (a
// gate struck, a wall breached, a ram, a ladder, the trebuchet, a keg, a weak point found, the horn, a drum silenced, the keep falling), how
// often the hold's drums beat while they stand, and what the music does as an assault ends (a hold conquered, the War's end, a retreat).
// `sound.ts` plays what it says (`setHold`, `playHold`, `endAssault`).

import type { FortKind } from '../sim/assault/blueprint';
import type { HoldEvent } from '../sim/assault/holdTypes';
import { panFromScreen, type BedId, type PlannedCue, type ShotKind } from './audioRules';
import type { BattleEnd } from './battleMusic';
import type { Place } from './epicMusic';
import type { Cue } from './soundRules';

/** A hold's own voice: the bed under its battle, and the one-shot its drums beat with (`AmbientBeds.setDrums`). */
export interface HoldVoice {
  bed: BedId;
  drum: ShotKind;
}

/** Each army's hold (`BLUEPRINTS`; the page's words for the drums are `DRUMS` in `holdCodex.ts`). */
export const HOLD_VOICE: Readonly<Record<string, HoldVoice>> = {
  // Bloodtusk Hold, the warcamp: the forge, the yards, the war drums
  orcs: { bed: 'warcamp', drum: 'drum' },
  // the Barrow Necropolis: the crypt's drone, the bone-bell belfries tolling
  undead: { bed: 'barrow', drum: 'bell' },
  // the Howling Den: the wind and the wolves; the howling stones answer them
  beasts: { bed: 'den', drum: 'howl' },
  // Elder Root: the deep wood; the pipers' rings
  wildwood: { bed: 'forest', drum: 'pipe' },
  // the Heart of the Maze: the echoing passages; the horned altars' low horns
  labyrinth: { bed: 'maze', drum: 'lowHorn' },
  // Bonefire Crag: the great bonefires, flaring
  ogres: { bed: 'bonefire', drum: 'flare' },
  // Brimstone Gate: the lava's rumble; the fire circles
  infernal: { bed: 'volcano', drum: 'flare' },
  // the Moonlit Shrine: the night and the shrine's bells; the great war drums are taiko
  yokai: { bed: 'shrine', drum: 'taiko' },
  // the Iron Foundry: the furnaces and the steam; the great steam hammers
  golems: { bed: 'foundry', drum: 'hammer' },
};

/** A hold with no voice of its own (one not yet built): the armies' rumble and a plain drum. */
export const HOLD_PLAIN: HoldVoice = { bed: 'armies', drum: 'drum' };
export const holdVoice = (army: string): HoldVoice => HOLD_VOICE[army] ?? HOLD_PLAIN;

/** Where the player is in the Assault: at the war table (the muster, the plan) or on the hold's field (the battle and its result). */
export interface HoldAt {
  army: string;
  at: 'table' | 'field';
  /** The Last Hold: the whole Dark Council on its walls. */
  last?: boolean;
}

/** The bed and the music's place for where the player is in the Assault. The war table is the host's own camp before the march (the
 *  armies' far drums, the deployment's music: it is the Assault's deployment; the Last Hold's table takes the darker map music); the field
 *  is the hold itself, and its music the battle's (`startFight`), with the deployment's under the loading and the triumph after a win. */
export function holdScene(h: HoldAt): { bed: BedId; place: Place } {
  if (h.at === 'table') return { bed: 'armies', place: h.last ? 'lastHold' : 'muster' };
  return { bed: holdVoice(h.army).bed, place: 'deploy' };
}

/* ------------------------------------------------------------------ the drums */

/** The quickest the hold's drums beat (seconds between two beats, all of them standing), and how much of a beat's wait is left to chance. */
export const DRUM_GAP_S = 2.6;
export const DRUM_SWING = 0.3;
/** A drum beat's level against a bed's own one-shots: the drums are the hold's voice, heard over its air, still under the music. */
export const DRUM_SCALE = 2;

/** The wait between two beats of the hold's drums (seconds, lowest and highest), or null when none stands: with every drum standing they
 *  beat steadily; each one silenced thins them (two of three beat half again as slowly, one of three three times), and the last one's
 *  silence is silence. */
export function drumGap(standing: number, total: number): [number, number] | null {
  if (!(standing > 0) || !(total > 0)) return null;
  const s = DRUM_GAP_S * (total / Math.min(standing, total));
  return [s, s * (1 + DRUM_SWING)];
}

/* ------------------------------------------------------------------ the field's events */

/** The gates of a hold (struck, they sound of timber and iron; the walls and the palisade of stone and stakes). */
const GATES: ReadonlySet<FortKind> = new Set<FortKind>(['southGate', 'northGate', 'ironGate', 'sallyPort']);

/** What a structure struck sounds like, by its kind. */
export function fortHitCue(kind: FortKind | undefined): Cue {
  if (kind === 'drum') return 'drumHit';
  return kind && GATES.has(kind) ? 'gateHit' : 'wallHit';
}

/** What the page needs of the hold to say what an event sounds like: each structure's kind, and which post is the throne's. */
export interface HoldLike {
  kinds: Readonly<Record<string, FortKind>>;
  posts: readonly { def: { id: string } }[];
}

/** The cues one event of the hold calls for (none for the quiet ones: a feint, a rout, a soldier fallen, whose blows the battle's own
 *  sounds already carry). */
export function holdCues(h: HoldLike, e: HoldEvent): PlannedCue[] {
  switch (e.kind) {
    // a structure struck: the gate's timbers, the wall's stones, a drum's skin (soft: a platoon strikes many times a second)
    case 'fortHit':
      return [{ cue: fortHitCue(h.kinds[e.fort]), gain: 0.7 }];
    // the ram's head swung home
    case 'ram':
      return [{ cue: 'ramHit' }];
    // a wall or a gate broken through; a sally port thrown open from inside
    case 'breach':
      return GATES.has(h.kinds[e.fort]) ? [{ cue: 'gateBreak' }] : [{ cue: 'wallBreak' }];
    case 'open':
      return [{ cue: 'gateBreak', gain: 0.6 }];
    case 'weakness':
      return [{ cue: 'weakPoint' }];
    case 'horn':
      return [{ cue: 'greatHorn' }];
    case 'silenced':
      return [{ cue: 'drumSilenced' }];
    case 'ladder':
      return [{ cue: e.up ? 'ladderUp' : 'ladderDown' }];
    // the trebuchet: the arm let go, then the stones landing
    case 'volleyTold':
      return [{ cue: 'trebLoose' }];
    case 'volley':
      return [{ cue: 'fireBoom' }, { cue: 'earthRumble', gain: 0.8, delay: 60 }];
    // a powder keg: its fuse lit, then the blast
    case 'keg':
      if (e.state === 'lit') return [{ cue: 'fuse' }];
      if (e.state === 'boom') return [{ cue: 'fireBoom', gain: 1.2 }, { cue: 'wallBreak', gain: 0.7, delay: 80 }];
      return [];
    case 'burn':
      return [{ cue: 'fireWhoosh' }];
    case 'campBurnt':
      return [{ cue: 'fireWhoosh' }, { cue: 'fireBoom', gain: 0.6, delay: 150 }];
    // a band coming down the Warpath: its horn, far off
    case 'reinforce':
    case 'march':
      return [{ cue: 'horn', gain: 0.6 }];
    // the Warpath held: no more bands (a small bright chime: good news)
    case 'held':
      return [{ cue: 'star' }];
    // a captain sallies; the lord himself comes down from the throne
    case 'captain':
      return [{ cue: h.posts[e.post]?.def.id === 'throne' ? 'standBoss' : 'eliteSting', gain: 0.7 }];
    case 'wolves':
      return [{ cue: 'wolfHowl' }];
    case 'rise':
      return [{ cue: 'heal', gain: 0.7 }];
    // the gate duel: the challenge, and how it ends
    case 'duelCalled':
      return [{ cue: 'eliteSting', gain: 0.8 }];
    case 'duelOver':
      return e.out === 'won' ? [{ cue: 'levelUp' }] : e.out === 'lost' ? [{ cue: 'kingHit' }] : [];
    case 'chiefFled':
      return [{ cue: 'blink' }, { cue: 'dash', delay: 120 }];
    // the lord falls: the keep is taken
    case 'lordFell':
      return [{ cue: 'keepFall' }];
    default:
      return [];
  }
}

/** The events of the hold that are heard only near the camera (the blows on the structures); every other is the battle's news, heard
 *  wherever the camera is. */
export const isNearOnly = (e: HoldEvent): boolean => e.kind === 'fortHit' || e.kind === 'ram' || e.kind === 'ladder';

/** How far (tiles, across the field's diamond) a near-only event is heard from the camera's middle. */
export const HOLD_HEAR_TILES = 22;

/** The pan for something `du`, `dv` tiles from the camera's middle on the hold's field: the field is drawn as a diamond, so a tile to the
 *  east or the north is to the right of the screen. Gentle, as the battle board's is. */
export function holdPan(du: number, dv: number): number {
  return panFromScreen(du - dv, 0, HOLD_HEAR_TILES * 2);
}

/* ------------------------------------------------------------------ the assault's end */

/** How an assault ended, as its result says it (`AssaultResult`). */
export interface AssaultEnd {
  won: boolean;
  outcome?: string;
  /** The Last Hold fell: the War is over. */
  warEnded?: boolean;
}

/** What the music and the cues do as an assault ends: a hold conquered rings the victory fanfare into the triumph bed under the result
 *  (and the War's end its own great sting over it); the host beaten back or caught by night, the defeat sting; a retreat the king himself
 *  sounded, only the horn (it was a choice, not a fall). */
export function assaultEnd(r: AssaultEnd): { music: BattleEnd; cues: PlannedCue[] } {
  if (r.won) return { music: 'victory', cues: r.warEnded ? [{ cue: 'warEnd', delay: 900 }] : [] };
  if (r.outcome === 'withdrawn') return { music: 'none', cues: [{ cue: 'greatHorn', gain: 0.7 }] };
  return { music: 'defeat', cues: [] };
}
