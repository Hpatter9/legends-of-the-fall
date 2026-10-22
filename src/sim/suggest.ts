// Party suggestion: from the heroes a player owns, pick a party that wakes good trait tiers and has a sensible mix of
// roles (a front-liner, a striker, a back-liner, support). A greedy climb from each possible first hero, scored by the
// traits woken and the roles covered; ties go to the stronger hero, then by name, so the answer is always the same.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { UNITS } from './units';
import { countTraits, traitsOf } from './traits';

export type PartyRole = 'front' | 'striker' | 'back' | 'support';

export const ROLE_NAMES: Record<PartyRole, string> = { front: 'Front-liner', striker: 'Striker', back: 'Back-liner', support: 'Support' };

/** The job a hero does in a party: supports by trait, shooters and casters at the back, the sturdy at the front, the rest strike. */
export function roleOf(kind: string): PartyRole {
  const def = UNITS[kind];
  const ts = traitsOf(kind);
  if (ts.includes('support') || ts.includes('holy') || /\bheal|cleanse|hasten/i.test(def.role)) return 'support';
  if (def.range >= 3) return 'back';
  if (ts.includes('guardian') || ts.includes('warden') || ts.includes('bulwark') || def.hp >= 250 || def.def >= 8) return 'front';
  return 'striker';
}



/** How good a party is: each active tier is worth more the higher it is, and each role covered is worth more than a trait. */
export function partyScore(kinds: readonly string[]): number {
  let score = 0;
  for (const c of countTraits(kinds)) {
    if (c.active) score += 10 * (c.tier + 1) + c.trait.tiers[c.tier].need;
    else score += c.count; // (a half-built trait is a little better than none)
  }
  const roles = new Set(kinds.map(roleOf));
  score += 14 * roles.size;
  return score;
}

/**
 * The best party of up to `size` heroes from `owned` (ties are broken by `power` of a kind, when
 * given, in favour of the stronger, then by name). Fewer owned than `size`: all of them.
 */
export function suggestParty(owned: readonly string[], size = 5, power: (kind: string) => number = () => 0): string[] {
  const pool = [...new Set(owned)].filter((k) => UNITS[k]).sort();
  if (pool.length <= size) return pool;
  let best: string[] = [];
  let bestScore = -1;
  let bestPower = -1;
  for (const first of pool) {
    const party = [first];
    while (party.length < size) {
      let pick = '';
      let pickScore = -1;
      let pickPower = -1;
      for (const k of pool) {
        if (party.includes(k)) continue;
        const s = partyScore([...party, k]);
        const p = power(k);
        if (s > pickScore || (s === pickScore && p > pickPower)) {
          pick = k;
          pickScore = s;
          pickPower = p;
        }
      }
      party.push(pick);
    }
    const s = partyScore(party);
    const p = party.reduce((n, k) => n + power(k), 0);
    if (s > bestScore || (s === bestScore && p > bestPower)) {
      best = party;
      bestScore = s;
      bestPower = p;
    }
  }
  // (in name order, so the party reads the same however it was reached)
  return pool.filter((k) => best.includes(k));
}


