// The Last Stand's retreat (STAND-RETREAT, the owner's ask: "the battle starts in the courtyard and the army has to fall back with the king as
// they fight through waves, ending in the throne room"). A run is told in four acts, one room of the castle each, always in this order:
//
//   I    the courtyard   waves 1-5
//   II   the library     waves 6-10
//   III  the chapel      waves 11-15
//   IV   the throne room wave 16 on, to the end (the great hall with the king's dais, dressed as the throne room)
//
// After an act's last wave the guard may hold the room for one more, harder wave (`HOLD_HARDER`) for a purse (`holdGold`), or fall back at once;
// then the king and the heroes still standing walk out by a door in the back wall (`exitOf`) and the next room is laid out with them at the ring
// plan's posts. The rules of that are in `stand.ts`; this file is the schedule, the door, and the numbers. Pure: no Pixi, no DOM, no draws.

import type { At } from './board';
import { breachTiles, HALL_KINDS, hallPlan, type Edge, type HallKind } from './standHalls';

/** The rooms in the order the guard falls back through them: act I first. */
export const ACT_HALLS: readonly HallKind[] = ['courtyard', 'library', 'chapel', 'hall'];
/** The waves an act lasts (the last act runs on to the end). */
export const ACT_WAVES = 5;
/** The acts' numerals, for the title card. */
export const ACT_NUMERALS = ['I', 'II', 'III', 'IV'] as const;
/** The rooms' names as the page says them in a sentence ("Fell in the chapel") and on a card ("The Chapel"). */
export const ROOM_NAMES: Record<HallKind, { the: string; title: string; short: string }> = {
  courtyard: { the: 'the courtyard', title: 'The Courtyard', short: 'Courtyard' },
  library: { the: 'the library', title: 'The Library', short: 'Library' },
  chapel: { the: 'the chapel', title: 'The Chapel', short: 'Chapel' },
  hall: { the: 'the throne room', title: 'The Throne Room', short: 'Throne Room' },
};

/** The act (0 for act I to 3 for act IV) wave `n` is fought in. */
export const actOfWave = (n: number): number => Math.max(0, Math.min(ACT_HALLS.length - 1, Math.floor((n - 1) / ACT_WAVES)));
/** The room wave `n` is fought in, by the fixed order. */
export const hallOfWave = (n: number): HallKind => ACT_HALLS[actOfWave(n)];
/** A room's act (0 to 3). */
export const actOfHall = (k: HallKind): number => ACT_HALLS.indexOf(k);

/**
 * Whether clearing wave `n` in room `hall` is followed by a retreat: at the end of each act (a wave a multiple of `ACT_WAVES`) when the next wave
 * belongs to another room. A run saved under the old rule (a room drawn from the seed) keeps its room to the next act's end, then follows the
 * order; one past wave 15 in another room than the throne room falls back to it at the next fifth wave.
 */
export const retreatAfter = (n: number, hall: HallKind): boolean => n >= 1 && n % ACT_WAVES === 0 && hallOfWave(n + 1) !== hall;

/** Whether a string is a room's kind (for reading a save). */
export const isHall = (k: unknown): k is HallKind => (HALL_KINDS as readonly string[]).includes(k as string);

/* ------------------------------------------------------------------ holding the line */

/** The bonus wave's strength against the next wave's (it is that wave's size, by every breach of the room at once). */
export const HOLD_HARDER = 1.2;
/** The purse for holding the room one wave more after wave `n` (paid when the bonus wave is cleared): about two waves' clearing gold. */
export const holdGold = (n: number): number => 2 * (12 + 4 * n);

/* ------------------------------------------------------------------ timing */

/** How long (battle ms) the last foes of an act's wave take to break off and run before any still in the room are gone. */
export const FLEE_MS = 6000;
/** How long the choice waits for an answer when nobody is there to give one (a run left to itself, the headless runs): then it falls back. */
export const CHOICE_MS = 10_000;
/** How long (battle ms) the walk to the door lasts before the next room is laid out. */
export const RETREAT_MS = 4000;
/** The break in the new room (ms): longer than the usual, to look the room over and move a post. */
export const ROOM_BREAK_MS = 10_000;

/* ------------------------------------------------------------------ the door */

/** The door the guard leaves by: on a back wall (north, then west: the walls drawn tall), clear of the breaches. */
export interface Exit {
  edge: Edge;
  /** The wall tile the door is set in. */
  at: At;
  /** The floor tile in front of it, inside the room. */
  front: At;
}

/** Where a room's door is (from its plan: the breaches are the seed's). */
export function exitOf(seed: number, kind: HallKind): Exit {
  const plan = hallPlan(seed, kind);
  const gaps = plan.breaches.flatMap((b) => breachTiles({ ...b, width: b.width + 4 }));
  const clear = (p: At) => !gaps.some((g) => g.u === p.u && g.v === p.v);
  for (const edge of ['north', 'west'] as const)
    for (const i of [12, 9, 15, 7, 17, 5, 19]) {
      const at = edge === 'north' ? { u: i, v: 0 } : { u: 0, v: i };
      const front = edge === 'north' ? { u: i, v: 1 } : { u: 1, v: i };
      if (clear(at) && !plan.pillars.some((p) => p.u === front.u && p.v === front.v) && !plan.cover.some((p) => p.u === front.u && p.v === front.v)) return { edge, at, front };
    }
  return { edge: 'north', at: { u: 12, v: 0 }, front: { u: 12, v: 1 } };
}

/** The breach that caves in as the room is given up: the one nearest the king's dais is as good as any; the first of the plan. */
export const caveInOf = (seed: number, kind: HallKind): Edge | null => hallPlan(seed, kind).breaches[0]?.edge ?? null;

/** Keep the furthest room of the retreat a save has reached (`Meta.standAct`). True when it is further than before (the throne room, act IV, is
 *  the Last Stand's badge). */
export function reachRoom(m: { standAct?: number }, act: number): boolean {
  if (act <= (m.standAct ?? 0) && m.standAct !== undefined) return false;
  m.standAct = Math.max(m.standAct ?? 0, act);
  return true;
}
