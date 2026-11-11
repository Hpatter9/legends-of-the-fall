// ULT-EPIC, round 2 (docs/notes/ult-epic.md): the three stages of a show. The owner: "I want the ultimates to feel epic... between 4-6 seconds
// and for the game to slow to 1x speed for the animation then back to where it was after... Lets do the same for eidolons... 4-10 seconds
// for the casting." So an ultimate fired by hand, and an Eidolon called, each play in three stages the page can hang art on:
//
//   wind-up     the hero gathers: the screen darkens and takes the element's tint, the band calls out the hero and the ultimate, the camera
//               pushes in;
//   strike      the blow: the freeze, the bursts, the shake, and (for a flurry or a storm) further bursts in beats;
//   aftermath   the light lingers where it struck, dust drifts, the dim lifts and the camera settles back.
//
// This module is the data: for each ultimate its total length and each stage's start and length (`ULT_STAGES`, and `stagesFor` for one use
// of it: a salvo still in the air, or a showcase, moves the stages but never the limits), and the same for each Eidolon (`eidolonStages`).
// A frame sheet for a stage is attached in `STAGE_ART`; `stageFrame` says which of its frames shows. Pure: no DOM, no Pixi, so the tests
// read it. The show is presentation only: the fight is held or runs at x1 under it, and comes out as it would have without it.

import { ULT_EPIC } from './ultEpicRules';
import { SHOWCASES, type ShowStyle } from './ultShowRules';
import { bfxClip, ultBfx } from './render/blenderFxRules';
import { BFX_DENSITY } from './render/blenderFxData';

export type StageName = 'windup' | 'strike' | 'aftermath';
export const STAGE_NAMES: readonly StageName[] = ['windup', 'strike', 'aftermath'];

/** One stage: when it starts (ms from the show's start) and how long it lasts. */
export interface Stage {
  at: number;
  ms: number;
}

/** A show's three stages; they follow one another with no gap, and `total` is their sum. */
export interface Stages {
  total: number;
  windup: Stage;
  strike: Stage;
  aftermath: Stage;
}

/** How heavy an ultimate is, which sets its length: a single blow is the shortest, a storm or a summoning the longest. */
export type UltWeight = 'blow' | 'flurry' | 'wave' | 'storm' | 'summon';

export interface UltStages extends Stages {
  weight: UltWeight;
  /** Further bursts after the blow lands, ms after it (a flurry's quick blows, a storm's strikes one after another); none for a single blow. */
  echoes: readonly number[];
  /** One use with a showcase: how long the showcase plays (its own length, or a little less when a salvo must also land inside the
   *  strike: it is then played that much quicker). */
  show?: number;
}

/** The owner's limits for a show played by hand (ms), and what plays on Auto: the short banner over a fight that never stops (as before). */
export const ULT_LIMITS = {
  MIN: 4000,
  MAX: 6000,
  AUTO: 1500,
  /** ULT-EPIC 3 (the owner's call): a showcase whose salvo is still in the air when it ends (Meteor Swarm and the like: the volleys fall
   *  live after it) may run to about 7 s, so its wind-up and aftermath are not squeezed to nothing. Everything else stays within `MAX`. */
  SALVO_MAX: 7000,
};
export const EIDOLON_LIMITS = { MIN: 4000, MAX: 10000, AUTO: 2200 };

/** Each weight's stages (ms): the wind-up, the strike (the freeze on the blow is inside it) and the aftermath, and its echoes. */
const WEIGHTS: Readonly<Record<UltWeight, { windup: number; strike: number; aftermath: number; echoes: readonly number[] }>> = {
  blow: { windup: 1600, strike: 1100, aftermath: 1500, echoes: [] },
  flurry: { windup: 1700, strike: 1400, aftermath: 1600, echoes: [240, 460, 680] },
  wave: { windup: 1900, strike: 1500, aftermath: 1700, echoes: [420, 820] },
  storm: { windup: 2000, strike: 1900, aftermath: 1800, echoes: [380, 760, 1140] },
  summon: { windup: 2200, strike: 1700, aftermath: 2100, echoes: [620] },
};

/** What each showcase style weighs: a run or a leap is one great blow; a chain of hops, blows or hooks a flurry; a ring, a blessing or a
 *  change a wave over the field; what falls from the sky or is shot in turn a storm; fighters called up a summoning. */
const STYLE_WEIGHT: Readonly<Record<ShowStyle, UltWeight>> = {
  line: 'blow',
  leap: 'blow',
  blinks: 'flurry',
  blows: 'flurry',
  hooks: 'flurry',
  burrow: 'flurry',
  burst: 'wave',
  bless: 'wave',
  change: 'wave',
  sky: 'storm',
  shots: 'storm',
  pack: 'summon',
};

/** The heroes whose ultimate weighs other than its style says: three charges in a row are a flurry, the fallen raised is a summoning. */
const OWN_WEIGHT: Readonly<Record<string, UltWeight>> = {
  minotaur: 'flurry',
  rifleBot: 'flurry',
  priestess: 'summon',
};

/** How heavy a hero kind's ultimate is (a kind with no showcase is a wave). */
export const ultWeight = (kind: string): UltWeight => OWN_WEIGHT[kind] ?? (SHOWCASES[kind] ? STYLE_WEIGHT[SHOWCASES[kind].style] : 'wave');

const lay = (windup: number, strike: number, aftermath: number): Stages => ({
  total: windup + strike + aftermath,
  windup: { at: 0, ms: windup },
  strike: { at: windup, ms: strike },
  aftermath: { at: windup + strike, ms: aftermath },
});

/** A hero kind's ultimate as it plays most often (its blow landing as the wind-up ends): what art for it is made against. */
export function ultStages(kind: string): UltStages {
  const weight = ultWeight(kind);
  const w = WEIGHTS[weight];
  return { ...lay(w.windup, w.strike, w.aftermath), weight, echoes: w.echoes };
}

/** Every hero kind with a showcase, by kind: the table in the note, and what BLENDER-FX reads. */
export const ULT_STAGES: Readonly<Record<string, UltStages>> = Object.fromEntries(Object.keys(SHOWCASES).map((k) => [k, ultStages(k)]));

/** The least of a strike left after a salvo lands or a showcase ends: the freeze and a beat for the burst to bloom. */
const STRIKE_TAIL = 300;
/** The shortest a wind-up and an aftermath may be squeezed to (a long showcase). */
const WINDUP_MIN = 900;
const AFTERMATH_MIN = 560;

/** ULT-EPIC 3: every use fired by hand plays its showcase, so a showcase use's whole length goes by the ultimate's weight too: a single
 *  blow's is still the shortest, a storm's and a summoning's the longest (ms; a long showcase takes what it needs, up to the limit). */
const SHOW_TOTAL: Readonly<Record<UltWeight, number>> = { blow: 5000, flurry: 5400, wave: 5700, storm: 6000, summon: 6000 };

/** What a showcase with a salvo keeps for its wind-up and aftermath together, where the limit allows (ms). */
const SALVO_ROOM = 2000;

/** One use of a hero kind's ultimate. A salvo still in the air (`wait`: the longest it is waited for, the fight running under the dim) is
 *  inside the strike, and so is a showcase (`show`: its length, the fight held; a salvo's wait follows it); the wind-up and the aftermath
 *  give way so the whole stays within the owner's 4 to 6 s, or about 7 s for a showcase with a salvo to land after it (`SALVO_MAX`). A
 *  showcase that still could not fit would be played a little quicker (the result's `show`); none of the game's does. A showcase's own
 *  staging is the strike, so it has no echoes; nor has a salvo, whose own blows land live. */
export function stagesFor(kind: string, use: { wait?: number; show?: number } = {}): UltStages {
  const base = ultStages(kind);
  const tail = ULT_EPIC.HIT_STOP_MS + STRIKE_TAIL;
  const wait = use.wait ?? 0;
  if (use.show) {
    const most = wait ? ULT_LIMITS.SALVO_MAX : ULT_LIMITS.MAX;
    const show = Math.min(use.show, most - WINDUP_MIN - AFTERMATH_MIN - tail - wait);
    const strike = show + wait + tail;
    // (its weight's length, a second more with a salvo to wait for; never under what the strike needs, never over the limit)
    // (and with a salvo, room for a wind-up and an aftermath worth the name round a long strike)
    const room = wait ? SALVO_ROOM : WINDUP_MIN + AFTERMATH_MIN;
    const total = Math.min(most, Math.max(SHOW_TOTAL[base.weight] + (wait ? 1000 : 0), strike + room));
    const rest = total - strike;
    const windup = Math.max(WINDUP_MIN, Math.min(base.windup.ms, Math.round(rest * 0.55)));
    const aftermath = Math.max(AFTERMATH_MIN, Math.min(base.aftermath.ms, rest - windup));
    return { ...lay(windup, strike, aftermath), weight: base.weight, echoes: [], show };
  }
  if (wait) {
    const strike = Math.max(base.strike.ms, wait + tail);
    const over = Math.max(0, base.windup.ms + strike + base.aftermath.ms - ULT_LIMITS.MAX);
    const aftermath = Math.max(AFTERMATH_MIN, base.aftermath.ms - over);
    return { ...lay(base.windup.ms, strike, aftermath), weight: base.weight, echoes: [] };
  }
  return base;
}

/** Which stage a show is in `ms` into it, and how far through that stage (0 to 1); null before it or once it is over. */
export function stageAt(s: Stages, ms: number): { name: StageName; k: number } | null {
  if (ms < 0 || ms >= s.total) return null;
  for (const name of ['aftermath', 'strike', 'windup'] as const) {
    const st = s[name];
    if (ms >= st.at) return { name, k: st.ms > 0 ? Math.min(1, (ms - st.at) / st.ms) : 1 };
  }
  return null;
}

/* ------------------------------------------------------------------ the Eidolons */

/** An Eidolon's call in full, by its weight (ms, the freeze on its first blow included): the hound is the quickest, the Dragon King the
 *  longest. The short call (the setting off, or Auto on) is `EIDOLON_LIMITS.AUTO`. */
export const EIDOLON_MS: Readonly<Record<string, number>> = {
  askel: 5000,
  voltara: 5800,
  nivra: 6600,
  aurelan: 7400,
  gorm: 8600,
  vaelkhar: 9800,
};
/** An Eidolon the table does not name (a new one) takes a middling length. */
export const eidolonMs = (id: string): number => EIDOLON_MS[id] ?? 6600;

/** A call's three stages from its beats' times (`eidolonRules.ts`, `MomentTimes`): the wind-up is the horn, the pass, the sprite coming on
 *  and the build-up; the strike its blows (with the freeze on the first); the aftermath until the fight runs again. */
export function eidolonStages(m: { STRIKE: number; AFTER: number; RESUME: number; HIT_STOP: number }): Stages {
  return lay(m.STRIKE, m.AFTER - m.STRIKE + m.HIT_STOP, m.RESUME - m.AFTER);
}

/* ------------------------------------------------------------------ art for a stage */

/** A frame sheet for one stage of one show (BLENDER-FX attaches these): a strip of `frames` square cells, played once across the stage
 *  (`hold`: its last frame stays up until the stage ends) or over and over (`loop`, every `loopMs`). `on` is where it is drawn: on the
 *  caster, over what was struck, or across the whole board. */
export interface StageArt {
  sheet: string;
  frames: number;
  on: 'caster' | 'struck' | 'board';
  /** How wide a cell is drawn, in tiles. */
  tiles: number;
  loop?: boolean;
  loopMs?: number;
}

/** The sheets attached, by hero kind (or Eidolon id) and stage. BLENDER-FX (docs/notes/blender-fx.md) hangs every hero's ultimate here: its
 *  wind-up on the caster, its strike and its aftermath over what was struck, each a Blender-rendered clip named by `sheet` (its key in
 *  `blenderFxData.ts`; `Fx.ultGather`, `ultImpact` and `ultAfter` play them). A kind with none plays what the game has (the band, the
 *  gathering, the bursts, the afterglow): the Eidolons, until their batch. */
export const STAGE_ART: Readonly<Record<string, Partial<Record<StageName, StageArt>>>> = Object.fromEntries(
  Object.keys(SHOWCASES).flatMap((kind) => {
    const arts: Partial<Record<StageName, StageArt>> = {};
    for (const stage of STAGE_NAMES) {
      const sheet = ultBfx(kind, stage, ultWeight(kind));
      const clip = sheet ? bfxClip(sheet) : undefined;
      if (sheet && clip) arts[stage] = { sheet, frames: clip.n, on: stage === 'windup' ? 'caster' : 'struck', tiles: clip.w / BFX_DENSITY };
    }
    return Object.keys(arts).length ? [[kind, arts]] : [];
  }),
);

/** The art for a stage of a kind's show, if any has been attached. */
export const stageArt = (kind: string, stage: StageName): StageArt | undefined => STAGE_ART[kind]?.[stage];

/** Which frame of a sheet shows `k` of the way (0 to 1) through a stage that lasts `ms`: once across it, or looping. */
export function stageFrame(art: Pick<StageArt, 'frames' | 'loop' | 'loopMs'>, k: number, ms: number): number {
  const n = Math.max(1, art.frames);
  const share = Math.max(0, Math.min(1, k));
  if (art.loop) return Math.floor((share * ms) / Math.max(1, (art.loopMs ?? 480) / n)) % n;
  return Math.min(n - 1, Math.floor(share * n));
}
