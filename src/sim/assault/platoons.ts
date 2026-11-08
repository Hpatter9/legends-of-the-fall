// The platoons: their formations and their orders (phase 1, `docs/notes/assault-1.md`; the design's 3.4 and 3.5). The hero is the
// platoon's anchor: each soldier has a slot in the platoon's formation, an offset from the hero turned to face the platoon's heading.
//
// The four formations are the party's own (`formations.ts`), scaled up to ten and read per platoon:
//   - Shield Wall: a line two deep before the hero; harder to hurt.
//   - Spearhead: a wedge with the hero at the tip; its blows land harder, it takes a little more.
//   - Hollow Square: a ring round the hero; harder to hurt, and a hurt soldier's friends close round.
//   - Skirmish: loose, a tile apart, so a blast takes fewer.
//
// The orders are five verbs and a tap: Move (attack-move), Hold, Charge (once a platoon), Fall back, Assault (a structure) and Focus (a
// foe). Each is queued and applied at the start of the next tick, and kept in the hold's log, so an assault is its input, its seed and its
// log, and replays. Pure rules: no Pixi, no DOM.

import { DIRS, type At } from '../board';
import type { Battle } from '../battle';
import type { AssaultLogEntry, HoldState, PlatoonOrder, PlatoonState } from './holdTypes';
import { TROOPS, type PlatoonFormation } from './troops';

export const FORMATIONS: readonly PlatoonFormation[] = ['wall', 'spearhead', 'square', 'skirmish'];
export const FORMATION_NAMES: Readonly<Record<PlatoonFormation, string>> = { wall: 'Shield Wall', spearhead: 'Spearhead', square: 'Hollow Square', skirmish: 'Skirmish' };

/** Each formation's offsets for slots 1 to 10: [forward, across] from the hero, forward along the heading. */
const SLOTS: Readonly<Record<PlatoonFormation, readonly [number, number][]>> = {
  // (a line of five a tile before the hero, and four beside him, the tenth behind)
  wall: [[1, -2], [1, -1], [1, 0], [1, 1], [1, 2], [0, -2], [0, -1], [0, 1], [0, 2], [-1, 0]],
  // (the hero at the tip, the wedge opening behind)
  spearhead: [[-1, -1], [-1, 1], [-2, -2], [-2, 2], [-2, 0], [-3, -3], [-3, 3], [-3, -1], [-3, 1], [-4, 0]],
  // (a ring round the hero, two more at its sides)
  square: [[1, -1], [1, 0], [1, 1], [0, -1], [0, 1], [-1, -1], [-1, 0], [-1, 1], [0, -2], [0, 2]],
  // (two loose ranks behind, a tile apart)
  skirmish: [[-1, -4], [-1, -2], [-1, 0], [-1, 2], [-1, 4], [-3, -4], [-3, -2], [-3, 0], [-3, 2], [-3, 4]],
};

/** A formation's riders on the field (the party's formations read per platoon): blows on its soldiers land for `guard`, its own for `punch`. */
export const FORMATION_FX: Readonly<Record<PlatoonFormation, { guard: number; punch: number }>> = {
  wall: { guard: 0.88, punch: 0.95 },
  spearhead: { guard: 1.05, punch: 1.12 },
  square: { guard: 0.93, punch: 1 },
  skirmish: { guard: 1, punch: 1 },
};

/** A soldier's slot (1 to 10) round its anchor, turned to the heading (an index into `DIRS`). Leaderless, the slots close up on the
 *  platoon's middle: they are drawn in by half. */
export function slotAt(anchor: At, heading: number, form: PlatoonFormation, slot: number, close = false): At {
  const [fwd, across] = SLOTS[form][Math.max(0, Math.min(9, slot - 1))];
  const k = close ? 0.5 : 1;
  const [fu, fv] = DIRS[heading];
  return { u: Math.round(anchor.u + (fu * fwd - fv * across) * k), v: Math.round(anchor.v + (fv * fwd + fu * across) * k) };
}

/** The formation a kind takes unless the player picks another (3.5). */
export const defaultFormation = (p: Pick<PlatoonState, 'troop'>): PlatoonFormation => TROOPS[p.troop].formation;

// ---- orders --------------------------------------------------------------------------------------------------------------------

const hold = (b: Battle): HoldState | undefined => b.field?.hold;

/** Ask a platoon for an order (the page's tap; the bot's plan): queued for the next tick. False when the fight is not on or the platoon
 *  has no one left standing, or Charge was used. */
export function orderPlatoon(b: Battle, p: number, order: PlatoonOrder): boolean {
  const h = hold(b);
  if (!h || b.phase !== 'fight' || h.outcome) return false;
  const pl = h.platoons[p];
  if (!pl || !standing(b, pl)) return false;
  if (order.kind === 'charge' && pl.charged) return false;
  h.queue.push({ t: b.t, p, kind: 'order', order });
  return true;
}

/** Change a platoon's formation (one tap on its chip): it reforms over a second or two. */
export function setFormation(b: Battle, p: number, to: PlatoonFormation): boolean {
  const h = hold(b);
  if (!h || b.phase !== 'fight' || !h.platoons[p]) return false;
  h.queue.push({ t: b.t, p, kind: 'formation', to });
  return true;
}

/** The Auto switch: the bot plays the platoons (on) or the player does (off). */
export function setAuto(b: Battle, on: boolean): boolean {
  const h = hold(b);
  if (!h || b.phase !== 'fight') return false;
  h.queue.push({ t: b.t, p: -1, kind: 'auto', on });
  return true;
}

/** Sound the retreat (the pause menu's, after its confirm): the assault ends as a withdrawal at the next tick. */
export function soundRetreat(b: Battle): boolean {
  const h = hold(b);
  if (!h || b.phase !== 'fight' || h.outcome) return false;
  h.queue.push({ t: b.t, p: -1, kind: 'retreat' });
  return true;
}

/** Whether a platoon has anyone standing: its hero or a soldier. */
export function standing(b: Battle, pl: PlatoonState): boolean {
  const f = b.field!;
  if (f.byId[pl.heroId]?.alive) return true;
  return pl.soldiers.some((s) => f.byId[s.id]?.alive);
}

/** Apply the orders waiting (at the start of a tick), keeping each in the log. */
export function applyQueued(b: Battle, h: HoldState): void {
  const due = h.queue.splice(0);
  for (const e of due) {
    h.log.push(e);
    if (e.kind === 'auto') h.auto = e.on;
    else if (e.kind === 'retreat') h.outcome = 'withdrawn';
    else if (e.kind === 'formation') h.platoons[e.p].formation = e.to;
    else givePlatoon(b, h, h.platoons[e.p], e.order);
  }
}

/** Put an order on a platoon now: its route gives way to it; a charge quickens it for six seconds, once. */
export function givePlatoon(b: Battle, _h: HoldState, pl: PlatoonState, order: PlatoonOrder): void {
  if (order.kind === 'charge') {
    if (pl.charged) return;
    pl.charged = true;
    pl.chargeUntil = b.t + CHARGE_MS;
  }
  pl.order = order;
  pl.route = order.kind === 'move' ? [order.at] : [];
}

/** Play an assault's log again: before each tick, the entries asked for at this battle time are asked for again (`replayAssault`'s step). */
export function replayEntries(b: Battle, log: readonly AssaultLogEntry[]): void {
  const h = hold(b);
  if (!h) return;
  for (const e of log) if (e.t === b.t) h.queue.push(e);
}

/** Charge: this long, this much quicker (the existing `CHARGE` edge, for one platoon). */
export const CHARGE_MS = 6000;
export const CHARGE_MOVE = 1.2;
/** A hero keeps within this many tiles of its order point unless it charges; a soldier within `LEASH` of its anchor. */
export const HERO_LEASH = 4;
export const LEASH = 6;
/** A soldier takes on a foe within its reach and this (Hold: one). */
export const ENGAGE = 2;
/** Leaderless, a platoon strikes this much less (3.4). */
export const LEADERLESS = 0.85;
