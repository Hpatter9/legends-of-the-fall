// Campaign advice, not a battle prediction. Normal uses the army's published recommended
// level and a reference company; harder tiers follow their actual peak-wave power ratio.
// Formation, bonds, spells, castle bonuses and player decisions are outside this estimate.
import { tierOpen, waveBoost, waveFoes, type Army } from './armies';
import { partySlots, type Meta } from './meta';
import { partyPower, powerOf } from './power';
import { gradeBoost } from './run';
import { TIERS } from './tiers';
import { HEROES } from './units';

export type Challenge = 'Comfortable' | 'Matched' | 'Stretch' | 'Overmatched';

export function challengeLabel(strength: number, target: number): Challenge {
  const ratio = target > 0 ? strength / target : 0;
  return ratio >= 1.3 ? 'Comfortable' : ratio >= 0.9 ? 'Matched' : ratio >= 0.7 ? 'Stretch' : 'Overmatched';
}

function peakPower(a: Army, tier: number): number {
  return Math.max(...a.waves.map((_, i) => {
    const boost = waveBoost(a, i + 1, tier);
    return waveFoes(a, i + 1, tier).reduce((sum, kind, j) => sum + powerOf(kind, {
      hp: (boost.foes?.hp ?? 1) * (j === 0 ? boost.boss?.hp ?? 1 : 1),
      atk: (boost.foes?.atk ?? 1) * (j === 0 ? boost.boss?.atk ?? 1 : 1),
    }) * (boost.foes?.speed ?? 1), 0);
  }));
}

/** A full reference company's strength at the army's recommended level, scaled by tier. */
export function armyTarget(a: Army, tier: number, slots = 5): number {
  const normal = HEROES.reduce((sum, k) => sum + powerOf(k, gradeBoost(1, 0, a.level)), 0) / HEROES.length * slots;
  return Math.round(normal * peakPower(a, tier) / Math.max(1, peakPower(a, 0)));
}

export function armyChallenge(m: Meta, a: Army, tier: number, party: readonly string[] = m.party) {
  const strength = partyPower(m, party);
  const target = armyTarget(a, tier, partySlots(m));
  return { strength, target, label: challengeLabel(strength, target) };
}

/** Aim for a stretch among unlocked tiers, favouring an attainable fight over a wall. */
export function suggestedArmyTier(m: Meta, a: Army): number {
  const available = TIERS.flatMap((_, tier) => tierOpen(m, a, tier) ? [{ tier, ...armyChallenge(m, a, tier) }] : []);
  if (!available.length) return 0;
  const viable = available.filter((v) => v.label !== 'Overmatched');
  if (!viable.length) return available[0].tier;
  return viable.reduce((best, v) => Math.abs(v.strength / v.target - 0.8) < Math.abs(best.strength / best.target - 0.8) ? v : best).tier;
}
