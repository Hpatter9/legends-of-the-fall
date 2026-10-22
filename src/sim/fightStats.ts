// Each hero's numbers for a fight, read from the events `stepBattle` returns: damage dealt and taken, healing done, and
// kills. A tally starts from the heroes placed (`startStats`) and is added to as each tick's events come in (`tally`).
// The MVP is the hero who did the most (`mvpOf`). Pure: no Pixi, no DOM.

import type { BattleEvent, Unit } from './battle';

export interface HeroStat {
  /** The hero's unit id in the fight. */
  id: number;
  /** Its kind in `UNITS`. */
  kind: string;
  dealt: number;
  taken: number;
  healed: number;
  kills: number;
}

/** The heroes' rows for a fight, in the order they stood. */
export type FightStats = HeroStat[];

/** The numbers a row counts (the result screen's bars). */
export const STAT_KEYS = ['dealt', 'taken', 'healed', 'kills'] as const;

export function startStats(units: Unit[]): FightStats {
  return units.filter((u) => u.side === 'hero').map((u) => ({ id: u.id, kind: u.def, dealt: 0, taken: 0, healed: 0, kills: 0 }));
}

/** Add one tick's events to the tally (`units` are the fight's, to find who called up a decoy or treant). Foes and the king's own spells have no row, so they count for no one. */
export function tally(stats: FightStats, events: BattleEvent[], units: readonly Unit[] = []): void {
  // (a fighter a skill called up has no row: what it does, and what it takes, count for its caller)
  const row = (id: number) => {
    const owner = units.find((u) => u.id === id)?.owner;
    return stats.find((s) => s.id === (owner ?? id));
  };
  for (const e of events) {
    if (e.kind === 'hit') {
      const by = row(e.by);
      const to = row(e.to);
      if (by) {
        by.dealt += e.dmg;
        if (e.killed) by.kills++;
      }
      if (to) to.taken += e.dmg;
    } else if (e.kind === 'heal' && e.by !== undefined) {
      const by = row(e.by);
      if (by) by.healed += e.amount;
    }
  }
}

/** A hero's share of the work: damage and healing dealt, and half the damage taken (a tank works too). */
const score = (s: HeroStat) => s.dealt + s.healed + s.taken / 2;

/** The hero who did the most (the first of equals), or null when nobody did anything. */
export function mvpOf(stats: FightStats): HeroStat | null {
  let best: HeroStat | null = null;
  for (const s of stats) if (!best || score(s) > score(best)) best = s;
  return best && score(best) > 0 ? best : null;
}
