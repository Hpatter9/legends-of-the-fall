// The Heroes tab's one mark (BENCH-MARKS, docs/notes/bench-marks.md). The tab used to wear up to three at once: the red upgrade
// count, the gold quest "!" and Hester's coin. The owner's ask: one mark at most, and only when there is something to do inside.
// This is the pure rule (no DOM), so the tests can import it; `home.ts` draws what it picks.

/** What waits behind the Heroes tab, as `home.ts` reads it from the save. */
export interface HeroesNews {
  /** Heroes with a rank-up, merge or awakening ready to take. */
  ready: number;
  /** A quest waits at the tavern to be taken or handed in. */
  quest: boolean;
  /** Hester's stall has the day's stock unseen. */
  freshStock: boolean;
  /** A trader visits Hester's stall today. */
  visitor: 'dealer' | 'caravan' | null;
}

/** The one mark the tab shows: the red count for upgrades, the gold "!" for a quest, Hester's coin (in the visitor's colour) for her stall. */
export type HeroesMark = { kind: 'upgrade'; count: number } | { kind: 'quest' } | { kind: 'shop'; visitor: 'dealer' | 'caravan' | null };

/** The most pressing thing to do inside, or null when there is nothing (no mark at all). Upgrades come first (they make the heroes
 *  stronger now), then a quest, then the stall (a trader's visit over plain new stock). */
export function heroesTabMark(n: HeroesNews): HeroesMark | null {
  if (n.ready > 0) return { kind: 'upgrade', count: Math.min(n.ready, 99) };
  if (n.quest) return { kind: 'quest' };
  if (n.visitor) return { kind: 'shop', visitor: n.visitor };
  if (n.freshStock) return { kind: 'shop', visitor: null };
  return null;
}
