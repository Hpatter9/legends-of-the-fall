// A hero's power: one number for how strong it is, so heroes can be set side by side. It reads what the fight reads: the
// kind's stats, the boost from its grade, rank, level and tier (and a run's gear), and the equipment and talents it fights
// with (`heroStats`). Toughness (hp held up by defence, dodge, mending and resistance) and harm (attack times how often it
// strikes, crits, splash and reach) are multiplied and square-rooted so neither alone runs away, then nudged by skill charge
// and by the abilities and talent changes it carries. A guide for comparing, not a promise of who wins.
// Pure rules: no Pixi, no DOM, no randomness.

import type { Boost } from './battle';
import { levelOfKind } from './levels';
import { rankOf, type Meta } from './meta';
import { gradeBoost } from './run';
import { heroStats } from './talents';
import { UNITS } from './units';

/** Scales the result so a fresh Common hero sits near a thousand. */
const POWER_SCALE = 10;
/** Defence counts against blows of about this size. */
const DEF_REF = 15;

/** The power of a hero of `kind` fighting with `boost` (its `equip` is the equipment and talents). */
export function powerOf(kind: string, boost: Boost = {}): number {
  const def = UNITS[kind];
  if (!def) return 0;
  const eq = boost.equip;
  const hp = def.hp * (boost.hp ?? 1) * (1 + (eq?.hp ?? 0));
  const tough = hp * (1 + (def.def + (eq?.def ?? 0)) / DEF_REF) / (1 - Math.min(0.6, eq?.dodge ?? 0)) * (1 + 30 * (eq?.regen ?? 0)) * (1 + 0.1 * (eq?.resist ?? 0));
  const harm =
    def.atk * (boost.atk ?? 1) * (1 + (eq?.atk ?? 0)) * (1000 / def.atkMs) * (1 + (eq?.atkSpeed ?? 0)) * (1 + (eq?.crit ?? 0)) * (def.splash ? 1.25 : 1) * (1 + 0.1 * (def.range - 1 + (eq?.range ?? 0)));
  const extra = (1 + 0.5 * (eq?.charge ?? 0)) * (1 + 0.15 * (eq?.moveSpeed ?? 0)) * (1 + 0.05 * (eq?.abilities.length ?? 0)) * (1 + 0.03 * Object.keys(eq?.tal ?? {}).length);
  return Math.round(Math.sqrt(tough * harm) * extra * POWER_SCALE);
}

/** A kind's power outside a run: grade 1, with its rank, level, tier, equipment and talents. */
export const kindPower = (m: Meta, kind: string): number => {
  const eq = heroStats(m, kind);
  return powerOf(kind, { ...gradeBoost(1, rankOf(m, kind), levelOfKind(m, kind)), ...(eq ? { equip: eq } : {}) });
};

/** A power for the page: 1,234. */
export const powerText = (p: number): string => p.toLocaleString('en-GB');
