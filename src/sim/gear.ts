// Gear: one weapon, one armour and one charm for a hero, each a few percent of hp or attack. It drops from boss
// stages (always), chests and the merchant, sits in the run's pack until a hero is given it, and stays with that hero
// for the run (a hero lost in a merge hands it back to the pack). Pure rules: no Pixi, no DOM.
//
// RUN-GEAR (docs/notes/run-gear.md): a run started since then finds real pieces of equipment instead (`runGear.ts`). The same
// `Gear` carries such a find through the events, shops and prizes, with the piece on it (`piece`) and no hp or attack of its own,
// so every source hands it out at the same moment as before. The simple gear here stays only for the runs saved before (no `run.real`),
// which finish on the old rules.

import type { Boost } from './battle';
import type { Rng } from './rng';
import { EQUIP_BASES, itemName, itemStats, RARITY_NAMES, statLines, type Equipment } from './equipment';

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
  /** RUN-GEAR: a real piece found in a real-gear run (its name, slot and stats are the piece's; `hp` and `atk` are then 0). */
  piece?: Equipment;
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

/** A real piece's short line: its grade and item level, then its main stats ("Rare Lv 7: +5% attack, +2% crit chance"). */
export function pieceText(it: Equipment): string {
  const stats = statLines(itemStats(it)).map((l) => `${l.text} ${l.label.toLowerCase()}`);
  return `${RARITY_NAMES[it.rarity]} Lv ${it.level}${stats.length ? `: ${stats.join(', ')}` : ''}`;
}

export const gearText = (g: Gear) => (g.piece ? pieceText(g.piece) : [g.atk ? `+${Math.round(g.atk * 100)}% attack` : '', g.hp ? `+${Math.round(g.hp * 100)}% hp` : ''].filter(Boolean).join(', '));

/** A real piece carried as run gear (`piece`): its id is the piece's, its slot the base's (a trinket is a charm), its tier its grade (at most `MAX_TIER`). */
export function pieceGear(it: Equipment): Gear {
  const slot = EQUIP_BASES[it.base]?.slot;
  return { id: it.id, slot: slot === 'trinket' ? 'charm' : slot ?? 'weapon', tier: Math.max(1, Math.min(MAX_TIER, it.rarity)), name: itemName(it), hp: 0, atk: 0, piece: it };
}

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
