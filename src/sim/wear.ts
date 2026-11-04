// Gear that wears out (the owner's ask: "If gear is going to be purchasable, it needs to be able to break. So it can either be
// replaced or be repaired. Only being damaged while getting used."; docs/notes/shop-books-gear.md). A piece wears only when a hero
// placed on the board wears it in a wave: one point a wave, won or lost, one more on its armour if the hero falls, half under
// auto-replay (SEVEN-SLOT GEAR: the head, feet, belt and accessory wear at half again). It keeps its full strength until it breaks (the owner's decision); at 25% it shows as worn, at nothing it is broken
// and gives nothing at all until mended. Nothing is ever destroyed by wear. Kept as `Equipment.wear` (points lost; missing is a full
// piece), so old saves are whole and the numbers can be retuned without touching saves. Pure rules: no Pixi, no DOM, no randomness.

import { DUR, EQUIP_BASES, EQUIP_SLOTS, QUIET_SLOTS, itemName, maxDurability, wearerOf, wornIn, type EquipSlot, type Equipment } from './equipment';
import type { Meta } from './meta';

/** Crowns a point of repair costs by grade, at item level 1 (index 0 is unused): SEVEN-SLOT GEAR's economy, 1.6 times the old 0.2 to 0.55
 *  (the owner's answer to the design's question 4). */
export const REPAIR: readonly number[] = [0, 0.32, 0.4, 0.56, 0.72, 0.88];
/** Each enchanting glyph makes a piece wear this much faster, and its repairs this much dearer (`enchant.ts`). */
export const GLYPH_WEAR = 0.2;
export const GLYPH_REPAIR = 0.25;
/** SEVEN-SLOT GEAR batch 3: seasoning. A piece worn in a wave gains a point (half under auto-replay, none while broken); at
 *  `seasonNeed(level)` points its item level goes up one, to its grade's cap (index 0 unused: Common 8, Rare 12, Epic 16, Legendary and
 *  Mythic 20). A named legend grows by renown instead. */
export const SEASON_CAP: readonly number[] = [0, 8, 12, 16, 20, 20];
export const seasonNeed = (level: number): number => 8 + 2 * level;
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
    // (SEVEN-SLOT GEAR: the waves each hero has fought, for the Pilgrim's Cord, `legends.ts`)
    (m.wavesFought ??= {})[f.kind] = (m.wavesFought[f.kind] ?? 0) + share;
    for (const slot of EQUIP_SLOTS) {
      const it = wornIn(m, f.kind, slot);
      // (RUN-GEAR: a lasting piece a run's find sits in for this run is not worn: `skip`)
      if (!it || skip?.(f.kind, slot)) continue;
      // (a named legend's renown: the waves it has fought, broken or not)
      if (EQUIP_BASES[it.base]?.legend) it.renown = Math.round(((it.renown ?? 0) + share) * 2) / 2;
      const was = wearState(it);
      if (was === 'broken') continue;
      season(it, share);
      // (SEVEN-SLOT GEAR: the quiet slots wear at half; kept in quarters; each glyph wears it a fifth faster)
      const loss = share * (QUIET_SLOTS.includes(slot) ? 0.5 : 1 + (f.fell && slot === 'torso' ? 1 : 0)) * (1 + GLYPH_WEAR * (it.glyphs?.length ?? 0));
      it.wear = Math.min(maxDurability(it), Math.round(((it.wear ?? 0) + loss) * 4) / 4);
      const now = wearState(it);
      if (now !== was && now !== 'good') out.push({ kind: f.kind, id: it.id, name: itemName(it), state: now });
    }
  }
  return out;
}

/** A wave's seasoning on a worn piece (not a legend): `share` points, and an item level for each `seasonNeed` reached, to the grade's cap. */
export function season(it: Equipment, share: number): boolean {
  if (EQUIP_BASES[it.base]?.legend || it.level >= SEASON_CAP[it.rarity]) return false;
  let xp = (it.xp ?? 0) + share;
  let up = false;
  while (it.level < SEASON_CAP[it.rarity] && xp >= seasonNeed(it.level)) {
    xp -= seasonNeed(it.level);
    it.level++;
    up = true;
  }
  if (it.level >= SEASON_CAP[it.rarity] || xp <= 0) delete it.xp;
  else it.xp = Math.round(xp * 2) / 2;
  return up;
}

/** What mending `points` of a piece costs, with an Armoury of `armoury` levels: the grade's price a point, a little more for each item level
 *  and a quarter more for each glyph; rounded up, at least 1 (0 for none). */
export function pointsCost(it: Equipment, points: number, armoury = 0): number {
  const lost = Math.ceil(points - 1e-9);
  if (lost <= 0) return 0;
  const cut = 1 - ARMOURY_REPAIR_CUT * Math.max(0, Math.min(7, armoury));
  return Math.max(1, Math.ceil(REPAIR[it.rarity] * (1 + 0.04 * (it.level - 1)) * (1 + GLYPH_REPAIR * (it.glyphs?.length ?? 0)) * lost * cut - 1e-9));
}
/** What mending a piece to full costs (0 for a full piece). */
export const repairCost = (it: Equipment, armoury = 0): number => pointsCost(it, it.wear ?? 0, armoury);

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
