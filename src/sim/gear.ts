// Gear: one weapon, one armour and one charm for a hero, each a few percent of hp or attack. It drops from boss
// stages (always), chests and the merchant, sits in the run's pack until a hero is given it, and stays with that hero
// for the run (a hero lost in a merge hands it back to the pack). Pure rules: no Pixi, no DOM.

import type { Boost } from './battle';
import type { Rng } from './rng';

export type Slot = 'weapon' | 'armour' | 'charm';
export const SLOTS: readonly Slot[] = ['weapon', 'armour', 'charm'];
export const MAX_TIER = 3;

export interface Gear {
  /** Never reused in a run. */
  id: number;
  slot: Slot;
  /** 1 to 3; also picks the icon. */
  tier: number;
  name: string;
  /** Multipliers added to a hero's: +0.08 is +8%. */
  hp: number;
  atk: number;
}

const NAMES: Record<Slot, readonly string[]> = {
  weapon: ['Iron Blade', 'Steel Blade', 'Dark Edge'],
  armour: ['Leather Coat', 'Mail Coat', 'Silver Plate'],
  charm: ['Jade Charm', 'Sun Charm', 'Prism Charm'],
};

/** A piece of gear: weapons give attack, armour hp, charms a little of both. */
export function makeGear(id: number, slot: Slot, tier: number): Gear {
  const t = Math.max(1, Math.min(MAX_TIER, Math.floor(tier)));
  return {
    id,
    slot,
    tier: t,
    name: NAMES[slot][t - 1],
    hp: slot === 'armour' ? 0.08 * t : slot === 'charm' ? 0.03 * t : 0,
    atk: slot === 'weapon' ? 0.08 * t : slot === 'charm' ? 0.03 * t : 0,
  };
}

/** A random piece for a stage: the slot from the stream, the tier rising with the stage (one more for a boss drop). */
export function dropGear(rng: Rng, id: number, stage: number, bonusTier = 0): Gear {
  return makeGear(id, SLOTS[rng.int(0, SLOTS.length - 1)], 1 + Math.floor((stage - 1) / 8) + bonusTier);
}

export const gearText = (g: Gear) => [g.atk ? `+${Math.round(g.atk * 100)}% attack` : '', g.hp ? `+${Math.round(g.hp * 100)}% hp` : ''].filter(Boolean).join(', ');

/** What a hero's gear (a slot map, maybe absent) multiplies its hp and attack by. */
export function gearBoost(gear?: Partial<Record<Slot, Gear>>): Boost {
  let hp = 1;
  let atk = 1;
  for (const s of SLOTS) {
    hp += gear?.[s]?.hp ?? 0;
    atk += gear?.[s]?.atk ?? 0;
  }
  return { hp, atk };
}
