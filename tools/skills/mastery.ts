// `--mastery auto` (SKILLS-10, docs/notes/skills-10.md; the skills overhaul's design, section 8): every hero fights with the skill levels a
// player whose hero is at that level really has, from the level pace's count of skill use (`node tools/levelPace.mjs`: a daily player's
// favourite, its use points from the sample army runs, auto-replays at half; the day it reaches each hero level). `MASTERY=auto` in the
// environment does the same (the tools' forked children inherit it). Off by default: the sweeps and cells fight every skill at Level 1.

import { USE_AT } from '../../src/sim/skillLevels';
import { HERO_KITS } from '../../src/sim/heroKits';
import { keyOf } from '../../src/sim/abilities';
import type { Meta } from '../../src/sim/meta';

const argMastery = process.argv.includes('--mastery') ? process.argv[process.argv.indexOf('--mastery') + 1] : process.env.MASTERY;
export const MASTERY_AUTO = argMastery === 'auto';
if (MASTERY_AUTO) process.env.MASTERY = 'auto';

/** The skill levels (skill 1, 2, 3) the level pace's favourite has at the end of the day it reaches each hero level (its median over 20 seeds,
 *  `node tools/levelPace.mjs`, SKILLS-10): hero level 10 and 20 both come on day 1, 30 on day 4, 40 on day 26, and by then every skill is
 *  mastered. A save's first fights (hero level 1 to 9) are at Level 1. */
export const MASTERY_AT: readonly (readonly [number, readonly [number, number, number]])[] = [
  [1, [1, 1, 1]],
  [10, [3, 3, 1]],
  [20, [3, 3, 1]],
  [30, [4, 5, 4]],
  [40, [5, 5, 5]],
];

/** The skill levels a hero of this level has, by the table (the row at or below its level). */
export function masteryAt(level: number): number[] {
  let row = MASTERY_AT[0][1];
  for (const [lv, r] of MASTERY_AT) if (level >= lv) row = r;
  return [...row];
}

/** Gives a save's heroes the use points of those levels, each skill of its own kit (the points each level starts at). */
export function giveMastery(m: Meta, party: readonly string[], level: number): void {
  const lv = masteryAt(level);
  for (const k of party) {
    const kit = HERO_KITS()[k];
    if (!kit) continue;
    kit.slots.forEach((s, i) => {
      const pts = USE_AT[(lv[i] ?? 1) - 1];
      if (pts > 0) ((m.skillUse ??= {})[k] ??= {})[keyOf(s.skill)] = pts;
    });
  }
}
