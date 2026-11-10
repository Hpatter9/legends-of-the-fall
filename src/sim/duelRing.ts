// The Nemesis War, phase 4: a duel's ring, as the fight sees it (`docs/design/legends-expansion.md`, section 2.10; `docs/notes/nemesis-4.md`).
// A duel is one hero against one nemesis on the board's middle 5x5 for sixty seconds. `Battle.duel` holds who fights and where the ring is;
// these are the fight's few rules for it: no step leaves the ring, and the duel ends with the champion's fall, the nemesis's, or the time.
// The offer, the multipliers and the outcome are `duel.ts`. Every hook that reads this is behind `Battle.duel`, so a fight without one is as
// it was. Pure rules: no Pixi, no DOM, no randomness.

import type { Battle } from './battle';
import type { At } from './board';

/** A duel's sixty seconds, and its ring's half-width (the middle 5x5). */
export const DUEL_MS = 60_000;
export const RING_R = 2;

export interface DuelRing {
  /** The champion's unit id, and its roster id (the hero who fought). */
  hero: number;
  tag?: number;
  /** The nemesis's unit id, and its War id. */
  nem: number;
  id: number;
  /** The ring's middle and half-width. */
  mid: At;
  r: number;
  /** DUEL-SHOW: every blow in the ring lands this many times softer (none: as hard as anywhere), so the duel lasts longer (`duel.ts`,
   *  `DUEL_LENGTH`). */
  soften?: number;
  /** How it ended: the nemesis fell, the champion fell, or the time ran out with both standing. */
  ended?: 'won' | 'lost' | 'timeout';
}

/** Whether a tile is inside a duel's ring. */
export const inRing = (d: Pick<DuelRing, 'mid' | 'r'>, a: At): boolean => Math.abs(a.u - d.mid.u) <= d.r && Math.abs(a.v - d.mid.v) <= d.r;

/** Every tile outside the ring, added to a walk's blocked set: a duel's two keep to the ring. */
export function fenceRing(b: Pick<Battle, 'board' | 'duel'>, blocked: Set<number>): void {
  const d = b.duel;
  if (!d) return;
  const w = b.board.w;
  for (let i = 0; i < b.board.tiles.length; i++) if (!inRing(d, { u: i % w, v: Math.floor(i / w) })) blocked.add(i);
}

/** Whether the duel is over (the nemesis down: won; the champion down: lost; sixty seconds with both standing: lost, by time). Sets the
 *  phase and `ended` when it is. */
export function duelEnd(b: Battle): boolean {
  const d = b.duel!;
  const hero = b.units.find((x) => x.id === d.hero);
  const nem = b.units.find((x) => x.id === d.nem);
  let ended: DuelRing['ended'];
  if (!nem?.alive) ended = 'won';
  else if (!hero?.alive) ended = 'lost';
  else if (b.t >= (b.timeLimit ?? DUEL_MS)) ended = 'timeout';
  if (!ended) return false;
  d.ended = ended;
  b.phase = ended === 'won' ? 'won' : 'lost';
  b.pending = [];
  return true;
}
