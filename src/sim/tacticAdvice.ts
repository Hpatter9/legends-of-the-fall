// The tactic sheet's advice (docs/notes/tactics.md, batch 5): only what the seeded fights bear out at every level (`node tools/tactics/run.mjs
// --tactic ... --formation ...`, levels 1, 10 and 30, about 600 fights a band each). Advance together, placed with care, was the best or within
// the noise of the best against every band; holding the line against a band that shoots lost 7 to 17 points (the gorgons). No formation
// beat a careful placing by more than 2 points at every level, so the advice names none.
//
// Pure rules: no Pixi, no DOM, no randomness.

import type { Tactic } from './tactics';
import { UNITS } from './units';

export interface Advice {
  tactic: Tactic;
  /** One line for the sheet. */
  line: string;
  /** A warning for the tactic picked, when it is the one that loses against these foes. */
  warn?: string;
}

/** The share of the foes that shoot, from which the advice warns against holding the line. */
export const ADVICE = { SHOOTERS: 0.4 };

/** The advice against `foes` (their kinds), with a warning if `picked` is the tactic that loses against them. */
export function adviseTactic(foes: readonly string[], picked: Tactic): Advice {
  const shooters = foes.filter((k) => !!UNITS[k]?.shot).length / Math.max(1, foes.length);
  if (shooters >= ADVICE.SHOOTERS) {
    return { tactic: 'advance', line: 'They shoot: advance together and close on them.', ...(picked === 'hold' ? { warn: 'Holding the line here lets their archers shoot you where you stand.' } : {}) };
  }
  return { tactic: 'advance', line: 'Advance together, the strikers behind the front line.' };
}
