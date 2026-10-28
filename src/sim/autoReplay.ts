// Auto-replay: farming a beaten army without touching the screen. The page deploys each wave, fights it, and starts the
// next run when one ends, up to a count the player chose. This file holds the rules (what may be auto-played, and when
// it stops); the page does the playing. Pure: no DOM, no random numbers.

import { armyById, armyUnlocked, recordOf } from './armies';
import type { Meta } from './meta';

/** The run counts on offer. */
export const AUTO_COUNTS = [1, 3, 5, 10] as const;

/** Auto runs a day (the owner's ask: unlimited auto-replay was free crowns). Each auto run spends one when it starts, and
 * they refill when the phone's date changes. Fighting an army by hand is never limited. */
export const AUTO_TICKETS = 10;

/** The auto runs left on a date (yyyymmdd): all of them on a new day, or on a save from before the tickets. */
export const ticketsLeft = (m: Meta, date: number): number => (m.autoTickets?.day === date ? Math.max(0, AUTO_TICKETS - m.autoTickets.used) : AUTO_TICKETS);

/** Spends one auto run of a date's; false (and nothing spent) when none are left. */
export function spendTicket(m: Meta, date: number): boolean {
  if (ticketsLeft(m, date) < 1) return false;
  m.autoTickets = { day: date, used: m.autoTickets?.day === date ? m.autoTickets.used + 1 : 1 };
  return true;
}

/** Saved tickets that are sane, or none (a fresh day's worth). */
export function readTickets(t: unknown): Meta['autoTickets'] {
  const o = t as { day?: unknown; used?: unknown } | null;
  return o && typeof o === 'object' && typeof o.day === 'number' && typeof o.used === 'number' ? { day: o.day | 0, used: Math.max(0, o.used | 0) } : undefined;
}

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
  /** Rift ores the boss waves dropped (`awakenMats.ts`; missing is none). */
  ores?: number;
}

export type AutoEnd = 'done' | 'loss' | 'stopped' | 'tickets';

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

/** Begins an auto-replay, or null when the army or tier is not one already cleared, the count is not on offer, or (given a
 * date) more runs are asked for than the day has tickets left. The page spends a ticket as each run starts (`spendTicket`). */
export function startAuto(m: Meta, armyId: string, tier: number, count: number, date?: number): AutoReplay | null {
  if (!canAutoReplay(m, armyId, tier) || !(AUTO_COUNTS as readonly number[]).includes(count)) return null;
  if (date !== undefined && count > ticketsLeft(m, date)) return null;
  return { army: armyId, tier, count, run: 1, totals: { runs: 0, crowns: 0, xp: 0, chests: 0, gear: 0 } };
}

/** What a settled fight adds to the totals and what the replay does next: another `wave`, a new `run`, or `end` (see `ended`). */
export function afterFight(a: AutoReplay, f: { won: boolean; cleared: boolean; wave: number; crowns: number; xp: number; chests?: number; gear?: number; ores?: number }): 'wave' | 'run' | 'end' {
  a.totals.crowns += f.crowns;
  if (f.ores) a.totals.ores = (a.totals.ores ?? 0) + f.ores;
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
