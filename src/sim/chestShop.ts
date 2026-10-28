// The chest shop: crowns buy chests, and chests hold summoning stones, equipment and XP tomes (`tomes.ts`) (the owner's ask: "the crowns buy chests; the
// chests give equipment and summoning stones"). Three chests, bronze, silver and gold, at fixed prices; a bigger chest holds more
// stones, and better gear. What a chest holds is fixed by its kind, apart from which piece of gear it is, which
// rolls (with `rollEquipment`) from a side stream of the save's seed and the count of chests bought, so reloading cannot reroll it.
// The shop has a stock a day (it fills again each new day), because crowns alone cannot gate heroes: they come in far faster late
// in the game than early, so a price would hold nothing back; the stock does. Pure rules: no Pixi, no DOM. See `docs/notes/summon-stones.md`.

import { ARMIES, armyCleared } from './armies';
import { grantEquipment, rollEquipment, type Quality } from './equipment';
import type { Loot, LootItem } from './armyStars';
import { gearItem, stoneItems, tomeItems } from './armyStars';
import { grantTomes, rollTomes } from './tomes';
import type { Meta } from './meta';
import { mixSeed, Rng } from './rng';
import { ownedCount } from './unlock';

export type ShopKind = 'bronze' | 'silver' | 'gold';

export interface ShopChest {
  kind: ShopKind;
  name: string;
  /** Crowns at the start (see `shopPrice`: it rises with the heroes owned). */
  price: number;
  /** Chests of this kind the shop sells a day. */
  stock: number;
  /** Summoning stones it holds (exactly this many). */
  stones: number;
  /** The chance it holds a piece of equipment (1 for the bigger chests), and the quality that piece is rolled at. */
  gearChance: number;
  quality: Quality;
  /** The star milestone whose chest size it stands for (3, 5 or 10): sets its picture and the extra item levels of a milestone chest. */
  at: 3 | 5 | 10;
}

/** The shop's chests, smallest first. A bigger chest holds better gear, and a few more stones (the stock a day, not the price, is what bounds them). */
export const SHOP: readonly ShopChest[] = [
  { kind: 'bronze', name: 'Bronze chest', price: 400, stock: 3, stones: 3, gearChance: 0.35, quality: 'bronze', at: 3 },
  { kind: 'silver', name: 'Silver chest', price: 1500, stock: 1, stones: 8, gearChance: 1, quality: 'silver', at: 5 },
  { kind: 'gold', name: 'Gold chest', price: 6000, stock: 1, stones: 15, gearChance: 1, quality: 'gold', at: 10 },
];
export const shopChest = (kind: ShopKind): ShopChest => SHOP.find((c) => c.kind === kind)!;

const SHOP_SALT = 0x5409;

/** Each pullable hero owned beyond the starter's three adds this share of the base price to every chest: crowns come in far faster late than early, so a flat price gates nothing. */
export const PRICE_GROW = 0.6;
/** The crowns a chest costs this save now: its base price, plus `PRICE_GROW` of it for each pullable hero owned beyond the starter's three, to the nearest 50. */
export const shopPrice = (m: Meta, kind: ShopKind): number => Math.round((shopChest(kind).price * (1 + PRICE_GROW * Math.max(0, ownedCount(m) - 3))) / 50) * 50;

/** How far on the save is, for the item level of the gear: the furthest army cleared (0 before the first). */
export function shopArmyIndex(m: Meta): number {
  let far = 0;
  ARMIES.forEach((a, i) => {
    if (armyCleared(m, a.id)) far = i;
  });
  return far;
}

/** Chests of a kind bought on `day` (a date, yyyymmdd). */
export const soldOn = (m: Meta, kind: ShopKind, day: number): number => (m.shop?.day === day ? m.shop.sold[kind] ?? 0 : 0);
/** Chests of a kind still on sale on `day`. */
export const stockLeft = (m: Meta, kind: ShopKind, day: number): number => Math.max(0, shopChest(kind).stock - soldOn(m, kind, day));
/** Whether the save can pay for a chest and the shop has one left today. */
export const canBuy = (m: Meta, kind: ShopKind, day: number): boolean => m.crowns >= shopPrice(m, kind) && stockLeft(m, kind, day) > 0;

/** A saved shop record that is sane: today's sales by kind. Anything else is dropped. */
export function readShop(raw: unknown): Meta['shop'] {
  const r = raw as { day?: unknown; sold?: Record<string, unknown> } | null;
  if (!r || typeof r.day !== 'number' || !/^\d{8}$/.test(String(r.day)) || !r.sold || typeof r.sold !== 'object') return undefined;
  const sold: Partial<Record<ShopKind, number>> = {};
  for (const c of SHOP) {
    const n = r.sold[c.kind];
    if (typeof n === 'number' && n >= 1) sold[c.kind] = Math.min(c.stock, Math.floor(n));
  }
  return { day: r.day, sold };
}

/** What a chest bought now would hold (rolled from the next seed; nothing changes). */
export function peekShopChest(m: Meta, kind: ShopKind): Loot {
  return shopLoot(m, kind, false);
}

function shopLoot(m: Meta, kind: ShopKind, apply: boolean): Loot {
  const c = shopChest(kind);
  const rng = new Rng(mixSeed(m.seed, SHOP_SALT, m.shopBuys ?? 0));
  const items: LootItem[] = stoneItems(c.stones, 0);
  if (apply) m.stones = (m.stones ?? 0) + c.stones;
  // (XP tomes, on top: from a side stream of the same seed, so the gear rolls as it did before tomes)
  const tomes = rollTomes(mixSeed(m.seed, SHOP_SALT, m.shopBuys ?? 0), c.kind);
  if (apply) grantTomes(m, tomes);
  items.push(...tomeItems(tomes));
  if (c.gearChance >= 1 || rng.chance(c.gearChance)) {
    const item = rollEquipment(rng, { quality: c.quality, armyIndex: shopArmyIndex(m), milestone: c.at >= 10 });
    if (apply) grantEquipment(m, item);
    items.push(gearItem({ item }));
  }
  return { at: c.at, kind, army: 'shop', items };
}

/** Buy a chest on `day` (a date, yyyymmdd): the crowns are paid, its stones and gear go into the meta, and what it held is returned (for the opening). Null when too poor or sold out for the day. */
export function buyChest(m: Meta, kind: ShopKind, day: number): Loot | null {
  if (!canBuy(m, kind, day)) return null;
  m.crowns -= shopPrice(m, kind);
  const sold = m.shop?.day === day ? m.shop.sold : {};
  m.shop = { day, sold: { ...sold, [kind]: (sold[kind] ?? 0) + 1 } };
  const loot = shopLoot(m, kind, true);
  m.shopBuys = (m.shopBuys ?? 0) + 1;
  return loot;
}
