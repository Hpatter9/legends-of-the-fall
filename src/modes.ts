// The page side of the modes (the daily challenge and the endless tower): the date and seeds the page gives the sim. The
// rules are in `src/sim/modes.ts`; main.ts starts and settles the runs, and home.ts shows the two buttons.

import { dateKey } from './sim/modes';

/** Today's date as yyyymmdd, in the phone's own calendar. */
export function todayKey(now = new Date()): number {
  return dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** A seed for a new tower or run from the clock (the sim itself stays pure). */
export const clockSeed = (): number => (Date.now() % 100000) + 1;
