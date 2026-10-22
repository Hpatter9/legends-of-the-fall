// Auto-replay: farming a beaten army without touching the screen. The page deploys each wave, fights it, and starts the
// next run when one ends, up to a count the player chose. This file holds the rules (what may be auto-played, and when
// it stops); the page does the playing. Pure: no DOM, no random numbers.

import { armyById, armyUnlocked, recordOf } from './armies';
import type { Meta } from './meta';

/** The run counts on offer. */
export const AUTO_COUNTS = [1, 3, 5, 10] as const;

/** Whether an army's tier has been cleared before (Normal's clears are on the record itself, a harder tier's under `hard`). */
export function tierCleared(m: Meta, armyId: string, tier: number): boolean {
  const rec = recordOf(m, armyId);
  return (tier ? rec.hard?.[String(tier)]?.clears : rec.clears) ? true : false;
}

/** Auto-replay is offered only on an army that is open and a tier already cleared, so it can never skip new content. */
export const canAutoReplay = (m: Meta, armyId: string, tier: number): boolean => !!armyById(armyId) && armyUnlocked(m, armyId) && tierCleared(m, armyId, tier);

/** The fastest speed a fight may run at: ×3 only on a tier already cleared, or while auto-replaying one. */
export const maxSpeed = (m: Meta, armyId: string | undefined, tier: number, auto: boolean): 2 | 3 => (auto || (!!armyId && tierCleared(m, armyId, tier)) ? 3 : 2);

export interface AutoTotals {
  /** Runs cleared. */
  runs: number;
  crowns: number;
  xp: number;
  chests: number;
  gear: number;
}

export type AutoEnd = 'done' | 'loss' | 'stopped';

export interface AutoReplay {
  army: string;
  tier: number;
  /** The runs asked for. */
  count: number;
  /** The run going now (1-based). */
  run: number;
  totals: AutoTotals;
  /** Why it stopped; unset while it goes. */
  ended?: AutoEnd;
  /** The wave a lost run fell at. */
  lostAt?: number;
}

/** Begins an auto-replay, or null when the army or tier is not one already cleared (or the count is not on offer). */
export function startAuto(m: Meta, armyId: string, tier: number, count: number): AutoReplay | null {
  if (!canAutoReplay(m, armyId, tier) || !(AUTO_COUNTS as readonly number[]).includes(count)) return null;
  return { army: armyId, tier, count, run: 1, totals: { runs: 0, crowns: 0, xp: 0, chests: 0, gear: 0 } };
}

/** What a settled fight adds to the totals and what the replay does next: another `wave`, a new `run`, or `end` (see `ended`). */
export function afterFight(a: AutoReplay, f: { won: boolean; cleared: boolean; wave: number; crowns: number; xp: number; chests?: number; gear?: number }): 'wave' | 'run' | 'end' {
  a.totals.crowns += f.crowns;
  a.totals.xp += f.xp;
  if (!f.won) {
    a.ended = 'loss';
    a.lostAt = f.wave;
    a.totals.gear += f.gear ?? 0;
    return 'end';
  }
  if (!f.cleared) return 'wave';
  a.totals.runs++;
  a.totals.chests += f.chests ?? 0;
  a.totals.gear += f.gear ?? 0;
  if (a.run >= a.count) {
    a.ended = 'done';
    return 'end';
  }
  a.run++;
  return 'run';
}

/** The player tapped Stop (or left for the home screen). */
export const stopAuto = (a: AutoReplay): void => void (a.ended ??= 'stopped');
