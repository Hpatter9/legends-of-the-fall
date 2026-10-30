// ULT-EPIC (docs/notes/ult-epic.md): the rules that make an ultimate's moment land like the most powerful move in the game. The opening
// (`ultMomentRules.ts`) is the slash and the name; this is the payoff: the ultimate's own effects drawn about twice the size, a huge burst of
// its element where it lands, a short freeze on the blow (hit-stop), a shake, the dim lifted over the whole of what it touched and eased
// back off as it lands, and the camera's lean in on the hero during the opening. Pure: no DOM, no Pixi, so the tests read it; `fx.ts` and
// `ultMoment.ts` draw it.
//
// The painted kit (13 sheets, session `u-ultimate` in tools/spell-fx/spell-parts.json): the band's speed lines and glowing edge, the power
// gathering on the hero and a burst for each element. Until its atlas is imported the game draws the fallbacks named here; once
// `src/art/fx/spells/index.json` has the session, the painted parts are used with no code change.

import type { BattleEvent } from './sim/battle';
import type { Element } from './render/fxRules';

export const ULT_EPIC = {
  /** An ultimate's one-off effects (its painted parts, sparks, rings, its move's own look) are drawn this much bigger during its moment. */
  SCALE: 2,
  /** But no one-off drawn wider than this (world px) by the scale: an ultimate's nova or ring that was already huge grows only to here, so
   *  it never turns into a haze over the whole board. */
  MAX_PX: 300,
  /** A beam or a tether is drawn this much thicker (not longer: it still runs from the caster to the struck). */
  BEAM: 1.6,
  /** The freeze on the blow, real ms. */
  HIT_STOP_MS: 150,
  /** The camera's lean in on the hero during the opening, as a multiple of the view it held. */
  ZOOM: 1.3,
  /** The dim after the blow lands, as a share of its full strength, and how long it takes to ease there. */
  LIFT: 0.3,
  LIFT_MS: 420,
  /** The shake as the freeze lets go (the fight's trauma, 0 to 1). */
  SHAKE: 0.75,
  /** At most this many bursts (battery saver: fewer). */
  BURSTS: 5,
  BURSTS_SAVER: 2,
  /** The pools of light, screen px: round the caster, each one struck, each tile of the area; and the soft light over all of them. */
  SPOT_CASTER: 120,
  SPOT_STRUCK: 92,
  SPOT_TILE: 84,
  HULL_PAD: 48,
};

/** The painted kit's session and the parts the band and the gathering use. */
export const KIT_SESSION = 'u-ultimate';
export const KIT = { speedlines: 'ult-speedlines.beam', edge: 'ult-edge.beam', gather: 'ult-gather.cast' } as const;
/** The painted burst of an element. */
export const burstKey = (el: Element): string => `ult-burst-${el}.impact`;

/** Until the kit is painted: the strongest painted burst the game already has for each element, drawn big (none for ice, whose pack burst
 *  stands alone). Each is checked against the atlases by the tests. */
export const FALLBACK_BURST: Readonly<Record<Element, string | null>> = {
  fire: 'meteor-swarm.impact',
  ice: null,
  lightning: 'thunderwave.impact',
  light: 'holy-nova.impact',
  dark: 'circle-of-death.impact',
  forest: 'spike-growth.impact',
  poison: 'plague-tide.impact',
  earth: 'seismic-slam.impact',
  wind: 'whirlwind.impact',
  blood: 'reap.impact',
};

/** The burst to play for an element: the kit's when its atlas has it, else the fallback (null: the pack's burst alone). */
export function burstPart(el: Element, has: (key: string) => boolean): string | null {
  if (has(burstKey(el))) return burstKey(el);
  const f = FALLBACK_BURST[el];
  return f && has(f) ? f : null;
}

/** What a kind of effect is scaled by while an ultimate's moment plays (`epic`): a one-off twice the size, a beam thicker; a field, a ground
 *  loop or a wall keeps its size (that is the ground it really covers), and so do the words. */
export type FxKind = 'once' | 'beam' | 'area' | 'label';
export function ultScale(kind: FxKind, epic: boolean): number {
  if (!epic) return 1;
  return kind === 'once' ? ULT_EPIC.SCALE : kind === 'beam' ? ULT_EPIC.BEAM : 1;
}

/** A one-off's scale under the ultimate's `boost`, for a frame `framePx` wide: twice its size, but never past `MAX_PX` across (and never
 *  smaller than it was). */
export function boostedScale(scale: number, boost: number, framePx: number): number {
  if (boost === 1) return scale;
  return Math.min(scale * boost, Math.max(scale, ULT_EPIC.MAX_PX / Math.max(1, framePx)));
}

/** Who an event is by: its caster or striker, the start of an arc; undefined for one with no one behind it (a zone, a shove). */
function byOf(e: BattleEvent): number | undefined {
  const x = e as { by?: number; from?: unknown };
  if (typeof x.by === 'number') return x.by;
  if (e.kind === 'arc') return e.from;
  return undefined;
}

/** Whether an event is part of an ultimate playing its moment (by one of `casters`): its effects get the ultimate's scale. Another hero's
 *  skill or blow on the same tick stays as it was. */
export const epicEvent = (e: BattleEvent, casters: ReadonlySet<number>): boolean => {
  if (!casters.size) return false;
  const by = byOf(e);
  return by !== undefined && casters.has(by);
};

/** What an ultimate touched, read from a tick's events: the fighters it struck (`struck`: hit, chained to), the ones it helped (healed, marked
 *  on its own side), and the tiles it worked on (an area's centre, a dash's two ends, a zone or terrain it laid). */
export interface UltTargets {
  struck: number[];
  helped: number[];
  tiles: { u: number; v: number }[];
}

export function ultTargets(events: readonly BattleEvent[], caster: number): UltTargets {
  const struck: number[] = [];
  const helped: number[] = [];
  const tiles: { u: number; v: number }[] = [];
  const add = (list: number[], id: number) => id !== caster && !list.includes(id) && list.push(id);
  const tile = (u: number, v: number) => !tiles.some((t) => t.u === u && t.v === v) && tiles.push({ u, v });
  for (const e of events) {
    if (e.kind === 'hit' && e.by === caster) add(struck, e.to);
    else if (e.kind === 'arc' && (e.from === caster || struck.includes(e.from))) add(struck, e.to);
    else if (e.kind === 'heal' && e.by === caster && e.amount > 0) add(helped, e.to);
    else if (e.kind === 'mark' && e.by === caster) add(helped, e.to);
    else if (e.kind === 'area' && e.by === caster) tile(e.u, e.v);
    else if ((e.kind === 'dash' || e.kind === 'blink') && e.by === caster) {
      tile(e.from.u, e.from.v);
      tile(e.to.u, e.to.v);
    } else if (e.kind === 'zone') tile(e.u, e.v);
    else if (e.kind === 'terrain' && e.side !== 'foe') tile(e.u, e.v);
  }
  // (a mark the caster put on a foe is a blow of a kind: it moves to the struck)
  for (const id of [...helped]) if (struck.includes(id)) helped.splice(helped.indexOf(id), 1);
  return { struck, helped, tiles };
}

/** Where the huge bursts go: on each one struck (the most `saver`-wise), else the area's centres, else on the caster (an ultimate that only
 *  helps bursts round the hero). Kinds of target in that order of preference. */
export type BurstAt = { unit: number } | { u: number; v: number };
export function burstSpots(t: UltTargets, caster: number, saver: boolean): BurstAt[] {
  const cap = saver ? ULT_EPIC.BURSTS_SAVER : ULT_EPIC.BURSTS;
  if (t.struck.length) return t.struck.slice(0, cap).map((unit) => ({ unit }));
  const areas = t.tiles.slice(0, cap).map(({ u, v }) => ({ u, v }));
  if (areas.length) return areas;
  return [{ unit: caster }];
}

export interface Pt {
  x: number;
  y: number;
}
export interface Pool extends Pt {
  r: number;
}
/** The pools of light the dim leaves (screen px): the caster, each one struck or helped, each tile; and, when they spread, one soft ellipse
 *  over all of them (`hull`), so the space between them is lit too and a wide effect is never lost in the dark. */
export function litPools(caster: Pt | null, struck: readonly Pt[], tiles: readonly Pt[]): { pools: Pool[]; hull: { x: number; y: number; rx: number; ry: number } | null } {
  const pools: Pool[] = [];
  if (caster) pools.push({ ...caster, r: ULT_EPIC.SPOT_CASTER });
  for (const p of struck) pools.push({ ...p, r: ULT_EPIC.SPOT_STRUCK });
  for (const p of tiles) pools.push({ ...p, r: ULT_EPIC.SPOT_TILE });
  if (pools.length < 2) return { pools, hull: null };
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const p of pools) [x0, x1, y0, y1] = [Math.min(x0, p.x), Math.max(x1, p.x), Math.min(y0, p.y), Math.max(y1, p.y)];
  const pad = ULT_EPIC.HULL_PAD;
  return { pools, hull: { x: (x0 + x1) / 2, y: (y0 + y1) / 2, rx: (x1 - x0) / 2 + pad + ULT_EPIC.SPOT_STRUCK * 0.6, ry: (y1 - y0) / 2 + pad + ULT_EPIC.SPOT_STRUCK * 0.4 } };
}

/** An ease in and out (0 to 1). */
export const ease = (k: number): number => {
  const t = Math.max(0, Math.min(1, k));
  return t * t * (3 - 2 * t);
};

/** The dim's strength `since` ms after the blow landed (null: not yet): full, then eased down to `LIFT`, never a step. */
export function liftedDim(since: number | null): number {
  if (since === null) return 1;
  return 1 - (1 - ULT_EPIC.LIFT) * ease(since / ULT_EPIC.LIFT_MS);
}

/** The camera's zoom over the view it holds: leaning in through the opening (none with the screen kept still), back as the ultimate fires. */
export const ultZoom = (opening: boolean, calm: boolean): number => (opening && !calm ? ULT_EPIC.ZOOM : 1);
