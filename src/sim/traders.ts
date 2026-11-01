// The two visiting traders of Hester's Stall (docs/notes/shop-traders.md; the design is books-shop-gear-design.md, "Visiting traders").
// Rustam Saffar, the caravan master, comes one day a week (each save has its own day, so different saves meet him on different days)
// and sells a Rare book, two Epic pieces and a bundle of awakening ore. The Gloaming Dealer stands at the stall for the rest of the day
// after a Calamity guardian falls and sells a universal Rare book and a Legendary piece at twice the stall's price. Their stock is drawn
// from side streams of the save's seed (the caravan's by the week, the Dealer's by the guardians felled), so a reload never rerolls it
// and nothing else in the game draws differently. Pure rules: no Pixi, no DOM, no clock (the page passes the day in, `todayKey()`).

import { BOOKS, bookById } from './bookData';
import { grantBook, readersOf } from './books';
import { oreOf, ORES, ORE_TRAITS, grantOres } from './awakenMats';
import { shopArmyIndex } from './chestShop';
import { EQUIP_BASES, EQUIP_BASE_IDS, EQUIP_SLOTS, grantEquipment, type Equipment, type NewEquipment } from './equipment';
import type { Meta } from './meta';
import { mixSeed, Rng } from './rng';
import { gearPrice, stallLevel, standingOf } from './stall';

const CARAVAN_SALT = 0xca7a1;
const GLOAMING_SALT = 0x910a1;
const TRADER_LINE_SALT = 0x7ad1;

export type Trader = 'caravan' | 'gloaming';
export const TRADER_NAMES: Readonly<Record<Trader, { name: string; tab: string; title: string }>> = {
  caravan: { name: 'Rustam Saffar', tab: 'Caravan', title: 'the caravan master' },
  gloaming: { name: 'The Gloaming Dealer', tab: 'Gloaming', title: 'a dealer in what the rift leaves' },
};

/** A Rare book costs this at the first army, a quarter more for each army on, as Hester's books do (to 10). */
export const RARE_BOOK_PRICE = 2400;
/** The caravan prices Epic pieces a quarter above Hester's (he has carried them a long way). */
export const CARAVAN_GEAR_MARKUP = 1.25;
/** The Dealer's Legendary piece costs twice the stall's price. */
export const GLOAMING_GEAR_MARKUP = 2;
/** The awakening ore bundle: ores of one class, and its price at the first army (a quarter more for each army on). */
export const ORE_BUNDLE = { n: 6, price: 1500 } as const;

/** A ware of a trader: a book, a piece of gear or an ore bundle, with its price, copies and the standing Hester must have given the player. */
export type TradeWare =
  | { key: string; type: 'book'; book: string; price: number; copies: 1; standing: 1 | 2 | 3 }
  | { key: string; type: 'gear'; item: NewEquipment; price: number; copies: 1; standing: 1 | 2 | 3 }
  | { key: string; type: 'ore'; trait: string; n: number; price: number; copies: 1; standing: 1 | 2 | 3 };

// ---- the calendar (the page's day key is yyyymmdd; the sim only turns it into a weekday and a week) ----

const daysOf = (day: number): number => Math.floor(Date.UTC(Math.floor(day / 10000), (Math.floor(day / 100) % 100) - 1, day % 100) / 86400000);
/** 0 Monday to 6 Sunday. */
export const weekdayOf = (day: number): number => (daysOf(day) + 3) % 7;
/** The week a day is in (weeks run Monday to Sunday). */
export const weekOf = (day: number): number => Math.floor((daysOf(day) + 3) / 7);
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/** The weekday this save's caravan comes: from the save's seed, so saves meet Rustam on different days. */
export const caravanDay = (m: Pick<Meta, 'seed'>): number => mixSeed(m.seed, CARAVAN_SALT) % 7;
export const caravanHere = (m: Pick<Meta, 'seed'>, day: number): boolean => weekdayOf(day) === caravanDay(m);
/** The days until the caravan next comes (0 when it is here today). */
export const caravanIn = (m: Pick<Meta, 'seed'>, day: number): number => (caravanDay(m) - weekdayOf(day) + 7) % 7;

// ---- the Dealer's coming ----

/** A Calamity guardian fell (the Calamity's settle calls this with the guardians the run felled): the Dealer will stand at the stall,
 *  from the next time the page looks, for the rest of that day. */
export function noteGuardians(m: Meta, felled: number): void {
  if (felled <= 0) return;
  const s = (m.stall ??= { day: 0, sold: {}, spent: 0 });
  s.guardians = (s.guardians ?? 0) + Math.floor(felled);
  s.dealerDue = true;
}
/** The page looks at the stall on `day`: a Dealer who is due is given today (the rest of the day). Returns whether he is here. */
export function gloamingHere(m: Meta, day: number): boolean {
  const s = m.stall;
  if (s?.dealerDue) {
    s.gloaming = day;
    delete s.dealerDue;
  }
  return s?.gloaming === day;
}

// ---- the stock ----

const bookWare = (m: Meta, id: string, standing: 1 | 2 | 3): TradeWare => ({ key: `book:${id}`, type: 'book', book: id, price: Math.round((RARE_BOOK_PRICE * (1 + 0.25 * shopArmyIndex(m))) / 10) * 10, copies: 1, standing });
const slotsPick = (rng: Rng, n: number): number[] => {
  const slots = EQUIP_SLOTS.map((_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(slots.splice(rng.int(0, slots.length - 1), 1)[0]);
  return out;
};
const gearWare = (m: Meta, slotIndex: number, rarity: 3 | 4, rng: Rng, markup: number, standing: 1 | 2 | 3): TradeWare => {
  const slot = EQUIP_SLOTS[slotIndex];
  const bases = EQUIP_BASE_IDS.filter((id) => EQUIP_BASES[id].slot === slot);
  const item: NewEquipment = { base: bases[rng.int(0, bases.length - 1)], rarity, level: stallLevel(m) };
  return { key: `gear:${slot}`, type: 'gear', item, price: Math.round((gearPrice(item) * markup) / 10) * 10, copies: 1, standing };
};

/** A Rare book at least one owned hero could read (universal books are read by all). */
function rareBook(m: Meta, rng: Rng, universalOnly: boolean): string {
  const pool = BOOKS.filter((b) => b.rarity === 'rare' && (!universalOnly || b.kind === 'universal') && readersOf(m, b).length > 0);
  return pool[rng.int(0, pool.length - 1)].id;
}

/** The caravan's wares for the week `day` is in (the same all week): one Rare book (standing 2), two Epic pieces (the first at standing 1,
 *  the second at standing 2) and a bundle of ore of an owned hero's class. */
export function caravanStock(m: Meta, day: number): TradeWare[] {
  const rng = new Rng(mixSeed(m.seed, CARAVAN_SALT, weekOf(day)));
  const book = bookWare(m, rareBook(m, rng, false), 2);
  const [a, b] = slotsPick(rng, 2);
  const gear = [gearWare(m, a, 3, rng, CARAVAN_GEAR_MARKUP, 1), gearWare(m, b, 3, rng, CARAVAN_GEAR_MARKUP, 2)];
  const classes = ORE_TRAITS.filter((t) => m.unlocked.some((k) => oreOf(k)?.trait === t));
  const pool = classes.length ? classes : ORE_TRAITS;
  const trait = pool[rng.int(0, pool.length - 1)];
  const ore: TradeWare = { key: `ore:${trait}`, type: 'ore', trait, n: ORE_BUNDLE.n, price: Math.round((ORE_BUNDLE.price * (1 + 0.25 * shopArmyIndex(m))) / 10) * 10, copies: 1, standing: 1 };
  return [book, ...gear, ore];
}

/** The Dealer's wares, drawn from the guardians felled so far (so each fall brings a new draw): one universal Rare book and one
 *  Legendary piece at twice the stall's price. He asks for no standing: he is not Hester's. */
export function gloamingStock(m: Meta): TradeWare[] {
  const rng = new Rng(mixSeed(m.seed, GLOAMING_SALT, m.stall?.guardians ?? 0));
  const book = bookWare(m, rareBook(m, rng, true), 1);
  const [slot] = slotsPick(rng, 1);
  return [book, gearWare(m, slot, 4, rng, GLOAMING_GEAR_MARKUP, 1)];
}

export const stockOfTrader = (m: Meta, trader: Trader, day: number): TradeWare[] => (trader === 'caravan' ? caravanStock(m, day) : gloamingStock(m));
/** The trader's visit that a sale belongs to: the week for the caravan, the guardians felled for the Dealer. */
const visitOf = (m: Meta, trader: Trader, day: number): number => (trader === 'caravan' ? weekOf(day) : m.stall?.guardians ?? 0);

export const boughtFrom = (m: Meta, trader: Trader, key: string, day: number): number => {
  const t = m.stall?.trade?.[trader];
  return t && t.visit === visitOf(m, trader, day) ? t.sold[key] ?? 0 : 0;
};
export const tradeLeft = (m: Meta, trader: Trader, w: TradeWare, day: number): number => Math.max(0, w.copies - boughtFrom(m, trader, w.key, day));

/** Whether a trader is at the stall on `day`. */
export const traderHere = (m: Meta, trader: Trader, day: number): boolean => (trader === 'caravan' ? caravanHere(m, day) : gloamingHere(m, day));

/** Why a trader's ware cannot be bought now (null when it can). */
export function whyNotBuyFrom(m: Meta, trader: Trader, w: TradeWare, day: number): string | null {
  if (!traderHere(m, trader, day)) return `${TRADER_NAMES[trader].name} has gone`;
  if (standingOf(m) < w.standing) return `Standing ${w.standing}`;
  if (tradeLeft(m, trader, w, day) <= 0) return 'Sold out';
  if (m.crowns < w.price) return `Needs ${w.price - m.crowns} more crowns`;
  return null;
}

/** What buying gave. */
export type TradeBought = { type: 'gear'; item: Equipment } | { type: 'book'; book: string } | { type: 'ore'; trait: string; n: number };

/** Buy a trader's ware. The crowns are paid (they do not count towards Hester's standing: they are not spent at her stall). Null, and
 *  nothing changes, when it cannot be bought. */
export function buyFromTrader(m: Meta, trader: Trader, key: string, day: number): TradeBought | null {
  const w = stockOfTrader(m, trader, day).find((x) => x.key === key);
  if (!w || whyNotBuyFrom(m, trader, w, day)) return null;
  m.crowns -= w.price;
  const s = (m.stall ??= { day, sold: {}, spent: 0 });
  const visit = visitOf(m, trader, day);
  const t = ((s.trade ??= {})[trader] ??= { visit, sold: {} });
  if (t.visit !== visit) {
    t.visit = visit;
    t.sold = {};
  }
  t.sold[key] = (t.sold[key] ?? 0) + 1;
  if (w.type === 'gear') return { type: 'gear', item: grantEquipment(m, w.item) };
  if (w.type === 'book') {
    grantBook(m, w.book);
    return { type: 'book', book: w.book };
  }
  grantOres(m, [{ trait: w.trait, n: w.n }]);
  return { type: 'ore', trait: w.trait, n: w.n };
}

/** An ore bundle's name ("Oathgold ×6"). */
export const oreWareName = (w: Extract<TradeWare, { type: 'ore' }>): string => `${ORES[w.trait]?.name ?? w.trait} ×${w.n}`;
export const tradeBookTitle = (id: string): string => bookById(id)?.title ?? id;

// ---- their lines ----

const TRADER_LINES: Readonly<Record<Trader, { open: readonly string[]; bought: readonly string[]; gone: string }>> = {
  caravan: {
    open: [
      'Saffron, silk, steel, and a book that walked here on its own, my friend!',
      'Come, come! Seven days on the road and every mile is in the price!',
      'Ah, Your Majesty! I have brought you things the road tried to keep.',
      'Look, touch, haggle. Then pay. It is the oldest dance there is!',
    ],
    bought: ['A fine choice! My grandmother would weep. She weeps at everything.', 'Done, my friend! May it never break, and if it does, may it break on someone else.', 'You have an eye. Mine is better, but you have an eye.'],
    gone: 'The caravan has moved on. Rustam comes again on his day.',
  },
  gloaming: {
    open: ['You came back from the rift. Most don’t. Buy something to remember it by.', 'It is quiet after a guardian falls. I like the quiet.', 'I trade in what the rift leaves behind. It leaves a great deal.'],
    bought: ['It has been waiting for you. It does not say so.', 'Take it. Do not ask where it was.', 'Another thing the rift will want back.'],
    gone: 'The Dealer is gone with the dusk. He comes when a guardian falls.',
  },
};
/** What a trader says on opening (`bought` false) or after a sale: drawn from a side stream of the day, so a reload says the same. */
export function traderLine(m: Meta, trader: Trader, day: number, bought = false): string {
  const list = bought ? TRADER_LINES[trader].bought : TRADER_LINES[trader].open;
  return list[new Rng(mixSeed(m.seed, TRADER_LINE_SALT, day, trader === 'caravan' ? 1 : 2, bought ? 1 : 0)).int(0, list.length - 1)];
}
export const traderGone = (trader: Trader): string => TRADER_LINES[trader].gone;

/** Saved trade records that are sane (a visit and sold counts); anything else is dropped. */
export function readTrade(raw: unknown): NonNullable<Meta['stall']>['trade'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: NonNullable<NonNullable<Meta['stall']>['trade']> = {};
  for (const tr of ['caravan', 'gloaming'] as const) {
    const t = (raw as Record<string, { visit?: unknown; sold?: Record<string, unknown> } | undefined>)[tr];
    if (!t || typeof t.visit !== 'number' || !Number.isFinite(t.visit) || !t.sold || typeof t.sold !== 'object') continue;
    const sold: Record<string, number> = {};
    for (const [k, n] of Object.entries(t.sold)) if (typeof n === 'number' && n >= 1) sold[k] = Math.floor(n);
    out[tr] = { visit: Math.floor(t.visit), sold };
  }
  return Object.keys(out).length ? out : undefined;
}
