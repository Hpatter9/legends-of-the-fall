// Planning help for the party screen: which traits a hero would wake or raise, given the heroes already picked. Pure.

import { TRAITS, traitsOf } from './sim/traits';

/**
 * The traits `kind` would wake or lift to a higher tier if it joined `picked`: those where its arrival makes the count of
 * different heroes reach a tier's need. Empty for a hero already picked.
 */
export function raisedBy(picked: readonly string[], kind: string): string[] {
  if (picked.includes(kind)) return [];
  const have = new Set(picked);
  return traitsOf(kind).filter((id) => {
    const t = TRAITS[id];
    let n = 0;
    for (const k of have) if (traitsOf(k).includes(id)) n++;
    return t.tiers.some((tier) => tier.need === n + 1);
  });
}

/** Pips toward a trait's next tier: "●●○" (filled for heroes counted, up to the goal). */
export function pipsOf(count: number, goal: number): string {
  const full = Math.min(count, goal);
  return '●'.repeat(full) + '○'.repeat(goal - full);
}
