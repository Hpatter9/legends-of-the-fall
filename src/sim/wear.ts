// Gear that wears out (the owner's ask: "If gear is going to be purchasable, it needs to be able to break. So it can either be
// replaced or be repaired. Only being damaged while getting used."; docs/notes/shop-books-gear.md). A piece wears only when a hero
// placed on the board wears it in a wave: one point a wave, won or lost, one more on its armour if the hero falls, half under
// auto-replay. It keeps its full strength until it breaks (the owner's decision); at 25% it shows as worn, at nothing it is broken
// and gives nothing at all until mended. Nothing is ever destroyed by wear. Kept as `Equipment.wear` (points lost; missing is a full
// piece), so old saves are whole and the numbers can be retuned without touching saves. Pure rules: no Pixi, no DOM, no randomness.

import { DUR, EQUIP_SLOTS, itemName, maxDurability, wearerOf, wornIn, type EquipSlot, type Equipment } from './equipment';
import type { Meta } from './meta';

/** Crowns a point of repair costs by grade, at item level 1 (index 0 is unused). */
export const REPAIR: readonly number[] = [0, 0.2, 0.25, 0.35, 0.45, 0.55];
/** An auto-replay wave wears at this share (as the War Horn fills at half). */
export const AUTO_WEAR = 0.5;
/** At or under this share of its durability a piece shows as worn. */
export const WORN_AT = 0.25;
/** The castle's Armoury takes this much off repairs a level (up to 28% at level 7). */
export const ARMOURY_REPAIR_CUT = 0.04;

export { DUR, maxDurability };

export type WearState = 'good' | 'worn' | 'broken';

/** Durability left (it never goes under nothing). */
export const durabilityOf = (it: Equipment): number => Math.max(0, maxDurability(it) - (it.wear ?? 0));
/** Good, worn (25% or less left) or broken (none left). */
export function wearState(it: Equipment): WearState {
  const left = durabilityOf(it);
  if (left <= 0) return 'broken';
  return left <= maxDurability(it) * WORN_AT ? 'worn' : 'good';
}
export const isBroken = (it: Equipment): boolean => wearState(it) === 'broken';

/** One hero kind's part in a settled wave: it was placed on the board, and whether it fell. */
export interface Fought {
  kind: string;
  fell: boolean;
}
/** What a wave did to the gear: the pieces that turned worn, and the pieces that broke (with who wore them). */
export interface WearNote {
  kind: string;
  id: number;
  name: string;
  state: 'worn' | 'broken';
}

/** A wave has been settled: every piece worn by a hero that fought in it loses a point (half under auto-replay), and a hero that fell
 *  loses one more on its armour. Returns the pieces that crossed into worn or broken. */
export function settleWear(m: Meta, fought: readonly Fought[], auto = false, skip?: (kind: string, slot: EquipSlot) => boolean): WearNote[] {
  const out: WearNote[] = [];
  const share = auto ? AUTO_WEAR : 1;
  const seen = new Set<string>();
  for (const f of fought) {
    if (seen.has(f.kind)) continue;
    seen.add(f.kind);
    for (const slot of EQUIP_SLOTS) {
      const it = wornIn(m, f.kind, slot);
      // (RUN-GEAR: a lasting piece a run's find sits in for this run is not worn: `skip`)
      if (!it || skip?.(f.kind, slot)) continue;
      const was = wearState(it);
      if (was === 'broken') continue;
      const loss = share * (1 + (f.fell && slot === 'armour' ? 1 : 0));
      it.wear = Math.min(maxDurability(it), Math.round(((it.wear ?? 0) + loss) * 2) / 2);
      const now = wearState(it);
      if (now !== was && now !== 'good') out.push({ kind: f.kind, id: it.id, name: itemName(it), state: now });
    }
  }
  return out;
}

/** What mending a piece to full costs, with an Armoury of `armoury` levels: the grade's price a point, a little more for each item
 *  level, for every point lost; rounded up, at least 1 (0 for a full piece). */
export function repairCost(it: Equipment, armoury = 0): number {
  const lost = Math.ceil(it.wear ?? 0);
  if (lost <= 0) return 0;
  const cut = 1 - ARMOURY_REPAIR_CUT * Math.max(0, Math.min(7, armoury));
  return Math.max(1, Math.ceil(REPAIR[it.rarity] * (1 + 0.04 * (it.level - 1)) * lost * cut - 1e-9));
}

/** Every piece that has lost anything: those worn by heroes in the party first, then the rest worn by heroes, then spares; the most
 *  worn first within each. */
export function needingRepair(m: Meta): Equipment[] {
  const rank = (it: Equipment): number => {
    const who = wearerOf(m, it.id);
    return who === undefined ? 2 : m.party.includes(who) ? 0 : 1;
  };
  return (m.equipment ?? []).filter((x) => (x.wear ?? 0) > 0).sort((a, b) => rank(a) - rank(b) || durabilityOf(a) / maxDurability(a) - durabilityOf(b) / maxDurability(b) || a.id - b.id);
}

/** Mend a piece to full: the crowns are paid. Returns the crowns paid, or 0 (nothing changes) when it is full, not owned, or too dear. */
export function repairItem(m: Meta, id: number): number {
  const it = m.equipment?.find((x) => x.id === id);
  if (!it) return 0;
  const cost = repairCost(it, m.castle.armoury);
  if (cost <= 0 || m.crowns < cost) return 0;
  m.crowns -= cost;
  delete it.wear;
  return cost;
}

/** The pieces worn by these hero kinds (every hero when none are given) that need mending, and what mending them all costs. */
export function repairAllCost(m: Meta, kinds?: readonly string[]): { items: Equipment[]; cost: number } {
  const items = needingRepair(m).filter((it) => {
    const who = wearerOf(m, it.id);
    return who !== undefined && (!kinds || kinds.includes(who));
  });
  return { items, cost: items.reduce((n, it) => n + repairCost(it, m.castle.armoury), 0) };
}

/** Mend everything worn by these hero kinds (every hero when none are given), as one payment. Returns the crowns paid (0, nothing
 *  changes, when there is nothing to mend or too few crowns). */
export function repairAll(m: Meta, kinds?: readonly string[]): number {
  const { items, cost } = repairAllCost(m, kinds);
  if (!items.length || m.crowns < cost) return 0;
  m.crowns -= cost;
  for (const it of items) delete it.wear;
  return cost;
}

/** The worn and broken pieces these hero kinds wear (for the party's strip). */
export function partyWear(m: Meta, kinds: readonly string[]): { worn: number; broken: number } {
  let worn = 0;
  let broken = 0;
  for (const k of kinds)
    for (const slot of EQUIP_SLOTS) {
      const it = wornIn(m, k, slot);
      if (!it) continue;
      const s = wearState(it);
      if (s === 'worn') worn++;
      else if (s === 'broken') broken++;
    }
  return { worn, broken };
}

/** A wave's wear in words for the short card: "Kenji's Runed Blade broke", "Kenji's Runed Blade is worn". */
export const wearWords = (notes: readonly WearNote[], nameOf: (kind: string) => string): string[] => notes.map((n) => `${nameOf(n.kind)}’s ${n.name} ${n.state === 'broken' ? 'broke' : 'is worn'}`);
