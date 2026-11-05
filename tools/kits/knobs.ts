// The hero kits' per-hero knobs (the balance tuner's state file, `tools/kits/tune.mjs`): applied to the kits in this process before any fight.
//   { "<hero>": { "t1": 0.5, "t2": 1, "t3": 0.8, "up": 0.5, "ur": 1, "c1": 22, "c3": 30, "d3": 9000, "l5": 0.9 } }
// (l5 is the hero's own Level 5 tune, `LV5_TUNE`: read only by a skill at Level 5, `--skill-level 5`)

import { KITS } from '../../src/sim/abilities';
import { HERO_KITS, RES } from '../../src/sim/heroKits';
import type { SkillClass } from '../../src/sim/skillRules';
import { LV5_TUNE } from '../../src/sim/kits/lv5Tune';

export interface Knobs { t1?: number; t2?: number; t3?: number; up?: number; ur?: number; c1?: number; c2?: number; c3?: number; d1?: number; d2?: number; d3?: number; l5?: number; k3?: SkillClass; m3?: number }

export function applyKnobs(state: Record<string, Knobs>): void {
  // (a "$pace3" entry is the global `RES.SKILL3_PACE`, the pool's refill once skill 3 is open)
  const pace = (state as Record<string, unknown>).$pace3;
  if (typeof pace === 'number') (RES as { SKILL3_PACE: number }).SKILL3_PACE = pace;
  for (const [h, k] of Object.entries(state)) {
    if (h.startsWith('$')) continue;
    const kit = HERO_KITS()[h];
    if (!kit) continue;
    if (k.t1 !== undefined) kit.s1.tune = k.t1;
    if (k.t2 !== undefined) kit.s2.tune = k.t2;
    if (k.t3 !== undefined && kit.s3) kit.s3.tune = k.t3;
    if (k.c1 !== undefined) kit.s1.cost = k.c1;
    if (k.c2 !== undefined) kit.s2.cost = k.c2;
    if (k.c3 !== undefined && kit.s3) kit.s3.cost = k.c3;
    // (d1, d2 and d3 are the skills' cooldowns in ms, for trying a skill's cadence within its class)
    if (k.d1 !== undefined) kit.s1.cd = k.d1;
    if (k.d2 !== undefined) kit.s2.cd = k.d2;
    if (k.d3 !== undefined && kit.s3) kit.s3.cd = k.d3;
    // (k3 is skill 3's class and m3 its cast time in ms, for trying it in another class)
    if (k.k3 !== undefined && kit.s3) kit.s3.cls = k.k3;
    if (k.m3 !== undefined && kit.s3) kit.s3.skill.castMs = k.m3;
    if (k.l5 !== undefined) (LV5_TUNE as Record<string, number>)[h] = k.l5;
    const u = KITS[h].ultimate?.tuned;
    if (u && k.up !== undefined) u.power = k.up;
    if (u && k.ur !== undefined) u.rate = k.ur;
  }
}
