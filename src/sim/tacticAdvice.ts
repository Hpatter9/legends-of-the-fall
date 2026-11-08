// The tactic sheet's advice (docs/notes/tactics.md, batches 5 and 6): only what the seeded fights bear out at every level (`node
// tools/tactics/run.mjs --tactic ... [--formation ...]`, levels 1, 10 and 30, about 600 fights a band each).
//
//   - two in five or more shoot (the gorgons): Charge, whose edge lands its first blows on shooters hard (10, 10 and 4 points over Advance);
//     holding the line there loses 7 to 17;
//   - three in five or more are slow brutes (the minotaurs, the ogres): Advance together behind a Shield Wall; Charge there loses 2 to 7;
//   - else Advance together, placed with care.
//
// Pure rules: no Pixi, no DOM, no randomness.

import type { Formation } from './formations';
import { roleOf } from './suggest';
import type { Tactic } from './tactics';
import { UNITS } from './units';

export interface Advice {
  tactic: Tactic;
  formation?: Formation;
  /** One line for the sheet. */
  line: string;
  /** A warning for the tactic picked, when it is the one that loses against these foes. */
  warn?: string;
}

/** The shares of the foes that make a band that shoots and a band of slow brutes, and what a slow brute is. */
export const ADVICE = { SHOOTERS: 0.4, BRUTES: 0.6, BRUTE_HP: 400, BRUTE_MS: 900 };

/** The advice against `foes` (their kinds) for `party` (its kinds), with a warning if `picked` is the tactic that loses against them. */
export function adviseTactic(foes: readonly string[], party: readonly string[], picked: Tactic): Advice {
  const n = Math.max(1, foes.length);
  const shooters = foes.filter((k) => !!UNITS[k]?.shot).length / n;
  const brutes = foes.filter((k) => UNITS[k] && UNITS[k].hp >= ADVICE.BRUTE_HP && UNITS[k].moveMs >= ADVICE.BRUTE_MS).length / n;
  if (shooters >= ADVICE.SHOOTERS) {
    return { tactic: 'charge', line: 'They shoot: charge them, and the first blows land hard.', ...(picked === 'hold' ? { warn: 'Holding the line here lets their archers shoot you where you stand.' } : {}) };
  }
  if (brutes >= ADVICE.BRUTES) {
    const wall = party.filter((k) => roleOf(k) === 'front').length >= 2;
    return { tactic: 'advance', ...(wall ? { formation: 'wall' as const } : {}), line: wall ? 'Slow brutes: advance together behind a shield wall.' : 'Slow brutes: advance together, the strikers behind the front line.', ...(picked === 'charge' ? { warn: 'Charging these brutes sends your strikers in alone.' } : {}) };
  }
  return { tactic: 'advance', line: 'Advance together, the strikers behind the front line.' };
}
