// A tool's knob (never the game's): cap the tier skills that some heroes cast, so a fight can be played with a grade-4 hero casting its tier 3
// skill instead of its tier 4, and the two set side by side (`tools/rank4/step.ts`, `npm run balance -- --tier-cap 3`). It swaps entries in
// `TIER_SKILLS` in place for the life of the tool's process; `uncapTiers` puts them back.

import { TIER_SKILLS, type TierSkill } from '../../src/sim/tierSkills';

const table = TIER_SKILLS as unknown as Record<string, TierSkill[]>;
const kept = new Map<string, TierSkill[]>();

/** From now on each of `kinds` casts no higher than its tier `cap` skill (2 or 3), whatever its grade. */
export function capTiers(kinds: readonly string[], cap: number): void {
  if (cap >= 4) return;
  for (const k of kinds) {
    const row = table[k];
    if (!row) continue;
    if (!kept.has(k)) kept.set(k, row);
    const own = kept.get(k)!;
    table[k] = own.map((_, i) => own[Math.min(i, cap - 2)]);
  }
}

/** Every capped hero casts its own tier skills again. */
export function uncapTiers(): void {
  for (const [k, row] of kept) table[k] = row;
  kept.clear();
}
