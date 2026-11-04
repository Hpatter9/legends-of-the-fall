// Repair, patch or enchant (SEVEN-SLOT GEAR batch 3, docs/notes/gear-runes-design.md section 5). Crowns are scarcer, so a worn piece asks a
// choice:
//
// - **Repair** at the smith (Hester's stall, or the piece's page): to full, at `REPAIR` a point (`wear.ts`).
// - **Patch**, anywhere at camp: back to 60% for 40% of what a repair would cost now, but the piece loses `PATCH_SCAR` points of its
//   maximum durability for good (`Equipment.scars`, at most a third of it). **Reforge** at the stall (standing 2) clears the scars, for the
//   price of a full repair from nothing.
// - **Enchant**, the stall's Enchant tab (standing 1): a piece takes up to three glyphs (`glyphs.ts`), chosen from three offered, drawn
//   from `mixSeed(m.seed, ENCHANT_SALT, piece id, count)` so a reload offers the same three. Each glyph wears the piece a fifth faster and
//   makes its repairs a quarter dearer. Glyphs can be cleared for free; the crowns are not returned. A glyph adds nothing to the sale price.
//
// Broken pieces still give nothing and are never destroyed; nothing repairs itself. Pure rules: no Pixi, no DOM; the offers draw only from
// their own stream.

import { DUR, EQUIP_BASES, maxDurability, type Equipment } from './equipment';
import { GLYPHS, MAX_GLYPHS, SLOT_GLYPHS, type Glyph } from './glyphs';
import type { Meta } from './meta';
import { mixSeed, Rng } from './rng';
import { durabilityOf, pointsCost, repairCost } from './wear';

export { GLYPHS, MAX_GLYPHS };
/** The side stream the enchant offers come from. */
export const ENCHANT_SALT = 0xe9c4a;
/** A patch mends to this share of the piece's (scarred) durability... */
export const PATCH_TO = 0.6;
/** ...for this share of a repair's price now... */
export const PATCH_SHARE = 0.4;
/** ...and costs this many points of maximum durability for good. */
export const PATCH_SCAR = 2;
/** The glyphs' prices, the first, second and third, before the grade's step. */
export const GLYPH_PRICE: readonly number[] = [300, 900, 2400];
/** The grade's step on a glyph's price (index 0 unused): Common 0.5 to Mythic 2. */
export const GLYPH_GRADE: readonly number[] = [0, 0.5, 0.8, 1.2, 1.6, 2];
/** The stall's standing for each: the Enchant tab at 1, the Reforge at 2. */
export const ENCHANT_STANDING = 1;
export const REFORGE_STANDING = 2;

const owned = (m: Meta, id: number): Equipment | undefined => m.equipment?.find((x) => x.id === id);
/** The most scars a piece can take: a third of its unscarred durability. */
export const scarCap = (it: Equipment): number => Math.floor((DUR[it.rarity] + it.level) / 3);

// ---- patch and reforge ----

/** Why a piece cannot be patched, or null when it can: it is at 60% or more already (`healthy`), or has all the scars it can take (`scarred`). */
export function patchBlock(it: Equipment): 'healthy' | 'scarred' | null {
  if ((it.scars ?? 0) + PATCH_SCAR > scarCap(it)) return 'scarred';
  const max = maxDurability({ ...it, scars: (it.scars ?? 0) + PATCH_SCAR });
  return durabilityOf(it) >= max * PATCH_TO ? 'healthy' : null;
}
/** What a patch costs now: 40% of what mending the piece to full would cost, rounded up (at least 1). */
export const patchCost = (it: Equipment, armoury = 0): number => Math.max(1, Math.ceil(repairCost(it, armoury) * PATCH_SHARE - 1e-9));
/** Patch a piece: the crowns are paid, it loses `PATCH_SCAR` points of maximum durability for good and stands at 60% of what is left.
 *  Returns the crowns paid, or 0 (nothing changes) when it cannot be patched, is not owned, or is too dear. */
export function patchItem(m: Meta, id: number): number {
  const it = owned(m, id);
  if (!it || patchBlock(it)) return 0;
  const cost = patchCost(it, m.castle.armoury);
  if (m.crowns < cost) return 0;
  m.crowns -= cost;
  it.scars = (it.scars ?? 0) + PATCH_SCAR;
  const max = maxDurability(it);
  it.wear = Math.round((max - Math.ceil(max * PATCH_TO)) * 4) / 4;
  if (it.wear <= 0) delete it.wear;
  return cost;
}
/** What a reforge costs: the price of a full repair from nothing (every point of the unscarred piece). */
export const reforgeCost = (it: Equipment, armoury = 0): number => pointsCost(it, DUR[it.rarity] + it.level, armoury);
/** Reforge a piece: the crowns are paid and its scars are gone (its wear is as it was). Returns the crowns paid, or 0 (nothing changes)
 *  when it has no scars, is not owned, or is too dear. The stall checks the standing. */
export function reforgeItem(m: Meta, id: number): number {
  const it = owned(m, id);
  if (!it || !it.scars) return 0;
  const cost = reforgeCost(it, m.castle.armoury);
  if (m.crowns < cost) return 0;
  m.crowns -= cost;
  delete it.scars;
  return cost;
}

// ---- enchanting ----

/** What the piece's next glyph costs (null when it has three, or is a named legend, which takes none). */
export function glyphPrice(it: Equipment): number | null {
  const n = it.glyphs?.length ?? 0;
  if (n >= MAX_GLYPHS || EQUIP_BASES[it.base]?.legend) return null;
  return Math.round((GLYPH_PRICE[n] * GLYPH_GRADE[it.rarity]) / 10) * 10;
}
/** The three glyphs offered for a piece's next one: from its slot's list, none it already has, drawn from the piece's own stream (the same
 *  three after a reload, new ones after each glyph taken or cleared). */
export function enchantOffers(m: Meta, it: Equipment): Glyph[] {
  if (glyphPrice(it) === null) return [];
  const pool = (SLOT_GLYPHS[EQUIP_BASES[it.base]?.slot] ?? []).filter((g) => !it.glyphs?.includes(g));
  const rng = new Rng(mixSeed(m.seed, ENCHANT_SALT, it.id, m.enchants?.[it.id] ?? 0));
  const out: Glyph[] = [];
  while (out.length < 3 && pool.length) out.push(GLYPHS[pool.splice(rng.int(0, pool.length - 1), 1)[0]]);
  return out;
}
/** Put one of the offered glyphs on a piece: the crowns are paid. Returns the crowns paid, or 0 (nothing changes) when the glyph is not
 *  offered, the piece takes no more, is not owned, or it is too dear. The stall checks the standing. */
export function enchantItem(m: Meta, id: number, glyph: string): number {
  const it = owned(m, id);
  const price = it ? glyphPrice(it) : null;
  if (!it || price === null || !enchantOffers(m, it).some((g) => g.id === glyph) || m.crowns < price) return 0;
  m.crowns -= price;
  (it.glyphs ??= []).push(glyph);
  (m.enchants ??= {})[it.id] = (m.enchants[it.id] ?? 0) + 1;
  return price;
}
/** Clear a piece's glyphs, for free (the crowns are not returned). False when it has none or is not owned. */
export function clearGlyphs(m: Meta, id: number): boolean {
  const it = owned(m, id);
  if (!it?.glyphs?.length) return false;
  delete it.glyphs;
  (m.enchants ??= {})[it.id] = (m.enchants[it.id] ?? 0) + 1;
  return true;
}
