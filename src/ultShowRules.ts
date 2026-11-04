// The ultimate's showcase (ULT-SHOW, docs/notes/ult-showcase-design.md): the long version of an ultimate's moment, where the hero is seen to do
// what its ultimate's words say (Ayame teleports behind each foe in a puff of smoke and cuts it down; the Wizard calls the meteors down out of a
// darkened sky; the Beastmaster's wolves bound in from the edge of the field). Pure: no DOM, no Pixi, so the tests read it; `ultShow.ts` plays it.
//
// It is presentation only. The ultimate has already been cast by the sim on the tick it fired, exactly as in the short version; the fight is
// held while the showcase plays, and the showcase reads that tick's events (the blinks, the blows, the meteors' aims, the fighters called up)
// to stage the real sprites: where the caster stood at each hop, which foe was cut and when. So the fight comes out exactly as it would have.
//
// When it plays: the full ultimate scenes on, Auto off, Shorter ultimates off, and the hero's ultimate has a showcase; then the hero's first
// use, and every Nth use after it (the setting, 10 by default; 0: the first only). The uses counted are the full moments the player saw,
// per hero kind, kept in the save (`Meta.ultSeen`).
//
// The x1 rule (the owner's): an ultimate's full moment, its showcase and an Eidolon's full call always play at x1 speed, whatever the fight's
// speed; the short versions keep the fight's speed (`momentSpeed`).

import type { BattleEvent, Unit } from './sim/battle';

/** How a showcase is staged: the shapes the pilot covers; the rest of the 45 take one of these or a new one (the design's batches). */
export type ShowStyle = 'blinks' | 'sky' | 'pack';

export interface Showcase {
  style: ShowStyle;
  /** What the player sees, in the game's words (the codex and the design list it). */
  line: string;
}

/** The heroes whose ultimate has a showcase (the pilot: Ayame, the Wizard, the Beastmaster). */
export const SHOWCASES: Record<string, Showcase> = {
  kunoichi: { style: 'blinks', line: 'She vanishes in a puff of smoke, appears behind each foe in turn and cuts it down, then stands where the last fell' },
  wizard: { style: 'sky', line: 'He raises his staff, the sky darkens, a burning circle marks each crowd and the meteors come down out of the clouds' },
  beastmaster: { style: 'pack', line: 'He sounds his horn and the wolves bound in from the edge of the field, one after another, to stand at his side' },
};

export const hasShowcase = (kind: string): boolean => kind in SHOWCASES;

/** The setting's choices for how often the long version comes back (0: the first use only). */
export const EVERY_CHOICES = [0, 5, 10, 20] as const;
export const DEFAULT_EVERY = 10;

/** Whether this use plays the long version: `seen` full moments of this hero's ultimate already played (0: this is the first), `every` the
 *  setting. The first use always does; then every `every`th after it (with 10: the 1st, 11th, 21st...). */
export const showDue = (seen: number, every: number): boolean => seen <= 0 || (every > 0 && seen % every === 0);

/** The save's count of full moments seen of a hero kind's ultimate, and one more (`Meta.ultSeen`). */
export const seenOf = (m: { ultSeen?: Record<string, number> }, kind: string): number => m.ultSeen?.[kind] ?? 0;
export function noteSeen(m: { ultSeen?: Record<string, number> }, kind: string): void {
  (m.ultSeen ??= {})[kind] = seenOf(m, kind) + 1;
}

/** Whether an ultimate that just fired gets its showcase. */
export function wantsShow(kind: string, o: { full: boolean; short: boolean; seen: number; every: number }): boolean {
  return o.full && !o.short && hasShowcase(kind) && showDue(o.seen, o.every);
}

/** The fight's speed while a moment plays (`moment`: an ultimate's full moment or showcase, or an Eidolon's full call, is on): x1 then. */
export const momentSpeed = (speed: number, moment: boolean): number => (moment ? 1 : speed);

/* ------------------------------------------------------------------ what the cast did */

export interface At {
  u: number;
  v: number;
}
/** One hop of a teleport slash: from, to, and the foe it cut (if any). */
export interface Hop {
  from: At;
  to: At;
  struck?: number;
}
/** What the cast's tick shows the caster did. */
export interface Cast {
  caster: number;
  /** Where it stood when it cast (its tile before any hop). */
  start: At;
  hops: Hop[];
  /** The tiles its salvo is aimed at (each once, in order). */
  aims: At[];
  /** The fighters it called up, and where they stand. */
  born: { id: number; at: At }[];
  /** Every foe it struck on the tick, and the tile each stood on. */
  struck: number[];
  tiles: Map<number, At>;
}

/** Read a cast from its tick's events (`events`), the caster (`me`, as it stands after the tick), the fighters that appeared on it, and where
 *  a fighter stands (`tileOf`, for the foes it struck). */
export function readCast(me: Pick<Unit, 'id' | 'u' | 'v'>, events: readonly BattleEvent[], born: readonly Pick<Unit, 'id' | 'owner' | 'u' | 'v'>[] = [], tileOf: (id: number) => At | undefined = () => undefined): Cast {
  const hops: Hop[] = [];
  const aims: At[] = [];
  const struck: number[] = [];
  for (const e of events) {
    if (e.kind === 'blink' && e.by === me.id) hops.push({ from: { ...e.from }, to: { ...e.to } });
    else if (e.kind === 'hit' && e.by === me.id && e.to !== me.id && e.src === 'skill') {
      const h = hops[hops.length - 1];
      if (h && h.struck === undefined) h.struck = e.to;
      if (!struck.includes(e.to)) struck.push(e.to);
    } else if (e.kind === 'area' && e.by === me.id && !aims.some((a) => a.u === e.u && a.v === e.v)) aims.push({ u: e.u, v: e.v });
  }
  const start = hops.length ? hops[0].from : { u: me.u, v: me.v };
  const tiles = new Map<number, At>();
  for (const id of struck) {
    const at = tileOf(id);
    if (at) tiles.set(id, { u: at.u, v: at.v });
  }
  return { caster: me.id, start, hops, aims, born: born.filter((u) => u.owner === me.id).map((u) => ({ id: u.id, at: { u: u.u, v: u.v } })), struck, tiles };
}

/* ------------------------------------------------------------------ the plan */

/** A sprite row the stage may pose a fighter in (`p`: how far through it, 0 to 1). */
export type PoseRow = 'idle' | 'walk' | 'attack' | 'attack2' | 'hurt';

/** A fighter's pose at a moment of the showcase: on a tile (or `from` a point off it, eased in by `k`), seen or not, in a row, facing a tile. */
export interface Pose {
  at: At;
  /** Coming in from this offset (world px from the tile), `k` of the way there (1: on the tile). */
  from?: { dx: number; dy: number };
  k?: number;
  alpha: number;
  row: PoseRow;
  p: number;
  look?: At;
}

/** A one-off beat: an effect or a sound at a time (ms into the showcase). */
export type Beat =
  | { at: number; kind: 'vanish'; where: At }
  | { at: number; kind: 'appear'; where: At }
  | { at: number; kind: 'cut'; from: At; foe: number }
  | { at: number; kind: 'gather'; where: At }
  | { at: number; kind: 'mark'; where: At; n: number }
  | { at: number; kind: 'sky'; where: At[] }
  | { at: number; kind: 'call'; where: At }
  | { at: number; kind: 'land'; where: At; id: number }
  | { at: number; kind: 'finish'; where: At };

export interface ShowPlan {
  style: ShowStyle;
  /** How long it plays (ms, real time: the x1 rule). */
  ms: number;
  beats: Beat[];
  cast: Cast;
  /** Where the camera follows (a fighter, or none: the held view) and how far it leans in. */
  zoom: number;
}

/** The timings (ms). A showcase runs 4 to 6 s with the opening before it and the fade after (the owner's ask). */
export const SHOW = {
  /** blinks: a beat before the first vanish, each hop's length, and the vanish, gone, appear and cut within a hop; the pose held after. */
  LEAD: 250,
  HOP: 620,
  GONE_AT: 110,
  APPEAR_AT: 200,
  CUT_AT: 330,
  CUT_END: 470,
  OUTRO: 550,
  /** sky: the caster raising the staff, each crowd's mark, the sky after the last mark, and the tail. */
  RAISE: 700,
  MARK: 400,
  SKY: 250,
  SKY_TAIL: 650,
  /** pack: the call, each beast's arrival in turn and its run, and the tail. */
  CALL: 800,
  BEAST: 420,
  RUN: 520,
  PACK_TAIL: 450,
  /** How far off its tile a beast starts its run (world px; it comes in from the side away from the foes). */
  RUN_FROM: 230,
};

/** The plan of a showcase for a cast, or null when the cast gives it nothing to show (no hop, no aim, no beast: the short version plays). */
export function planShow(kind: string, cast: Cast): ShowPlan | null {
  const sc = SHOWCASES[kind];
  if (!sc) return null;
  const beats: Beat[] = [];
  if (sc.style === 'blinks') {
    if (!cast.hops.length) return null;
    cast.hops.forEach((h, i) => {
      const s = SHOW.LEAD + i * SHOW.HOP;
      beats.push({ at: s, kind: 'vanish', where: h.from }, { at: s + SHOW.APPEAR_AT, kind: 'appear', where: h.to });
      if (h.struck !== undefined) beats.push({ at: s + SHOW.CUT_AT, kind: 'cut', from: h.to, foe: h.struck });
    });
    const end = SHOW.LEAD + cast.hops.length * SHOW.HOP;
    beats.push({ at: end, kind: 'finish', where: cast.hops[cast.hops.length - 1].to });
    return { style: 'blinks', ms: end + SHOW.OUTRO, beats, cast, zoom: 1.6 };
  }
  if (sc.style === 'sky') {
    if (!cast.aims.length) return null;
    beats.push({ at: 80, kind: 'gather', where: cast.start });
    cast.aims.forEach((a, i) => beats.push({ at: SHOW.RAISE + i * SHOW.MARK, kind: 'mark', where: a, n: i }));
    const sky = SHOW.RAISE + cast.aims.length * SHOW.MARK + SHOW.SKY;
    beats.push({ at: sky, kind: 'sky', where: cast.aims });
    return { style: 'sky', ms: sky + SHOW.SKY_TAIL, beats, cast, zoom: 1.5 };
  }
  if (!cast.born.length) return null;
  beats.push({ at: 60, kind: 'call', where: cast.start });
  cast.born.forEach((w, i) => beats.push({ at: SHOW.CALL + i * SHOW.BEAST + SHOW.RUN, kind: 'land', where: w.at, id: w.id }));
  const last = SHOW.CALL + (cast.born.length - 1) * SHOW.BEAST + SHOW.RUN;
  beats.push({ at: last + 80, kind: 'finish', where: cast.start });
  return { style: 'pack', ms: last + SHOW.PACK_TAIL, beats, cast, zoom: 1.6 };
}

/** The poses of the fighters the showcase stages at `t` ms into it (the caster, the foes it cuts, the beasts it calls): the page draws them
 *  so, over what the sim says, until the showcase ends. Fighters not listed are drawn as the sim says. */
export function posesAt(plan: ShowPlan, t: number): Map<number, Pose> {
  const out = new Map<number, Pose>();
  const c = plan.cast;
  if (plan.style === 'blinks') {
    const i = Math.min(c.hops.length - 1, Math.max(-1, Math.floor((t - SHOW.LEAD) / SHOW.HOP)));
    if (i < 0) out.set(c.caster, { at: c.start, alpha: 1, row: 'idle', p: 0, look: c.hops[0].to });
    else {
      const h = c.hops[i];
      const local = t - SHOW.LEAD - i * SHOW.HOP;
      const last = t >= SHOW.LEAD + c.hops.length * SHOW.HOP;
      const look = h.struck !== undefined ? posOf(plan, h.struck) ?? h.to : h.to;
      if (last) out.set(c.caster, { at: h.to, alpha: 1, row: 'idle', p: 0, look });
      else if (local < SHOW.GONE_AT) out.set(c.caster, { at: h.from, alpha: 1 - local / SHOW.GONE_AT, row: 'idle', p: 0, look: h.to });
      else if (local < SHOW.APPEAR_AT) out.set(c.caster, { at: h.to, alpha: 0, row: 'idle', p: 0, look });
      else if (local < SHOW.CUT_END) out.set(c.caster, { at: h.to, alpha: Math.min(1, (local - SHOW.APPEAR_AT) / 60), row: 'attack', p: Math.min(1, (local - SHOW.APPEAR_AT) / (SHOW.CUT_END - SHOW.APPEAR_AT)), look });
      else out.set(c.caster, { at: h.to, alpha: 1, row: 'attack', p: 1, look });
    }
    // (each foe stands as it stood until its cut, flinches with it, and holds its flinch: the sim's fall plays once the fight runs again)
    c.hops.forEach((h, j) => {
      if (h.struck === undefined || out.has(h.struck)) return;
      const cut = SHOW.LEAD + j * SHOW.HOP + SHOW.CUT_AT;
      const at = posOf(plan, h.struck);
      if (!at) return;
      out.set(h.struck, t < cut ? { at, alpha: 1, row: 'idle', p: 0, look: h.to } : { at, alpha: 1, row: 'hurt', p: Math.min(1, (t - cut) / 240), look: h.to });
    });
    return out;
  }
  if (plan.style === 'sky') {
    const p = Math.min(1, t / SHOW.RAISE);
    out.set(c.caster, { at: c.start, alpha: 1, row: 'attack2', p: t < SHOW.RAISE ? p * 0.6 : 0.6, look: c.aims[0] });
    return out;
  }
  out.set(c.caster, { at: c.start, alpha: 1, row: 'attack2', p: Math.min(1, t / SHOW.CALL), look: c.born[0]?.at });
  c.born.forEach((w, i) => {
    const s = SHOW.CALL + i * SHOW.BEAST;
    const side = runSide(c.start, w.at);
    if (t < s) out.set(w.id, { at: w.at, alpha: 0, row: 'idle', p: 0 });
    else if (t < s + SHOW.RUN) {
      const k = (t - s) / SHOW.RUN;
      out.set(w.id, { at: w.at, from: { dx: side * SHOW.RUN_FROM, dy: -SHOW.RUN_FROM * 0.35 }, k: easeOut(k), alpha: Math.min(1, k * 3), row: 'walk', p: (k * 3) % 1 });
    } else out.set(w.id, { at: w.at, alpha: 1, row: 'idle', p: 0, look: c.start });
  });
  return out;
}

const posOf = (plan: ShowPlan, id: number): At | undefined => plan.cast.tiles.get(id);

/** A beast runs in from the caster's side of it, along the board's u (screen left or right), -1 or 1. */
const runSide = (from: At, to: At): number => (to.u - from.u + (to.v - from.v) * 0.5 >= 0 ? 1 : -1);
const easeOut = (k: number): number => 1 - (1 - k) * (1 - k);
