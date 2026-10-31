// Hester's Stall (docs/notes/shop-books-gear.md): the camp's shop. A merchant, Hester Vane, with shelves of skill books, gear and XP
// tomes, the chest shop moved in (its own rules and stock, `chestShop.ts`), and the counters where the player sells spare gear and
// books and mends worn gear (`wear.ts`). The shelves' stock is drawn once a day from a side stream of the save's seed and the day (the
// page passes the day in, as for the daily and the chest shop), so a reload never rerolls it; each ware has a number of copies.
// Standing, the crowns spent here (buying and mending; selling and buying back do not count), opens the better shelves. Pure rules:
// no Pixi, no DOM; the stock draws only from its own stream.

import { BOOKS, BOOK_PRICE, BOOK_SELL_SHARE, RARE_BOOK_SELL, bookById, type BookDef } from './bookData';
import { copiesOf, grantBook, readersOf } from './books';
import { shopArmyIndex } from './chestShop';
import { EQUIP_BASES, EQUIP_BASE_IDS, EQUIP_SLOTS, MAX_ITEM_LEVEL, grantEquipment, sellPrice, spareEquipment, wearerOf, type Equipment, type NewEquipment, type Rarity } from './equipment';
import { SET_OF_BASE } from './gearSets';
import type { Meta } from './meta';
import { mixSeed, Rng } from './rng';
import { grantTomes, type TomeSize } from './tomes';
import { repairAll, repairItem } from './wear';

const STALL_SALT = 0x57a11;
const LINE_SALT = 0x57a12;

/** Standing with Hester: 1 a known face, 2 a valued customer, 3 a trusted friend, by the crowns spent at the stall. */
export const STANDINGS = [
  { n: 1, name: 'A known face', spent: 0 },
  { n: 2, name: 'A valued customer', spent: 4000 },
  { n: 3, name: 'A trusted friend', spent: 20000 },
] as const;
export const spentAt = (m: Meta): number => m.stall?.spent ?? 0;
export const standingOf = (m: Meta): 1 | 2 | 3 => (spentAt(m) >= STANDINGS[2].spent ? 3 : spentAt(m) >= STANDINGS[1].spent ? 2 : 1);
/** The crowns still to spend to reach the next standing (undefined at the top). */
export function toNextStanding(m: Meta): number | undefined {
  const s = standingOf(m);
  return s >= 3 ? undefined : STANDINGS[s === 1 ? 1 : 2].spent - spentAt(m);
}

/** Gear's base price at the stall by grade at item level 1 (Mythic is never sold: index 0 and 5 unused). */
export const GEAR_PRICE: readonly number[] = [0, 80, 200, 600, 1500, 0];
/** The XP tomes on the shelf: price, copies a day, and the standing that opens each. */
export const TOME_WARES: Readonly<Record<TomeSize, { price: number; copies: number; standing: 1 | 2 | 3 }>> = {
  small: { price: 150, copies: 3, standing: 1 },
  medium: { price: 2000, copies: 1, standing: 2 },
  large: { price: 7000, copies: 1, standing: 3 },
};
/** Sold pieces kept on the Sold today shelf, to buy back at the price paid. */
export const SOLD_TODAY = 10;

/** A ware on a shelf: a key unique for the day, what it is, its price, copies, and the standing it needs. */
export type Ware =
  | { key: string; type: 'book'; book: string; price: number; copies: number; standing: 1 | 2 | 3 }
  | { key: string; type: 'gear'; item: NewEquipment; price: number; copies: number; standing: 1 | 2 | 3 }
  | { key: string; type: 'tome'; size: TomeSize; price: number; copies: number; standing: 1 | 2 | 3 };

/** A day's shelves. */
export interface Stock {
  books: Ware[];
  gear: Ware[];
  tomes: Ware[];
}

/** What a book costs on the shelf: its base price, a quarter more for each army on (crowns come in far faster late), to 10. */
export const bookPrice = (m: Meta, book: BookDef): number => Math.round(((BOOK_PRICE[book.rarity] ?? 0) * (1 + 0.25 * shopArmyIndex(m))) / 10) * 10;
/** What a piece of gear costs on the shelf: its grade's price, a little more for each item level. */
export const gearPrice = (it: Pick<Equipment, 'rarity' | 'level'>): number => Math.round((GEAR_PRICE[it.rarity] * (1 + 0.04 * (it.level - 1))) / 10) * 10;
/** The item level of the stall's gear: 1 and 3 for each army on, as the gear balance tool assumes. */
export const stallLevel = (m: Meta): number => Math.min(MAX_ITEM_LEVEL, 1 + 3 * shopArmyIndex(m));

/** The day's shelves (the same all day for a save). Everything is drawn whatever the standing, so a new standing opens wares that
 *  were already there; the books are drawn from those at least one owned hero could read. */
export function stockOf(m: Meta, day: number): Stock {
  const rng = new Rng(mixSeed(m.seed, STALL_SALT, day));
  // (books: two Common, then two Uncommon for standings 2 and 3; never one no owned hero could read)
  const books: Ware[] = [];
  const shelf = (rarity: 'common' | 'uncommon', n: number, gates: (1 | 2 | 3)[]): void => {
    const pool = BOOKS.filter((b) => b.rarity === rarity && readersOf(m, b).length > 0);
    for (let i = 0; i < n && pool.length; i++) {
      const b = pool.splice(rng.int(0, pool.length - 1), 1)[0];
      const copies = rarity === 'common' && rng.chance(0.3) ? 2 : 1;
      books.push({ key: `book:${b.id}`, type: 'book', book: b.id, price: bookPrice(m, b), copies, standing: gates[i] });
    }
  };
  shelf('common', 2, [1, 1]);
  shelf('uncommon', 2, [2, 3]);
  // (gear: one piece a slot, Common or Rare; one of the three Epic from standing 2, another Legendary from standing 3)
  const level = stallLevel(m);
  const grades: Rarity[] = EQUIP_SLOTS.map(() => (rng.chance(0.4) ? 2 : 1));
  const epic = rng.int(0, 2);
  const legend = (epic + 1 + rng.int(0, 1)) % 3;
  const gear: Ware[] = EQUIP_SLOTS.map((slot, i) => {
    const bases = EQUIP_BASE_IDS.filter((id) => EQUIP_BASES[id].slot === slot);
    const base = bases[rng.int(0, bases.length - 1)];
    const rarity: Rarity = i === legend ? 4 : i === epic ? 3 : grades[i];
    const item: NewEquipment = { base, rarity, level };
    return { key: `gear:${slot}`, type: 'gear', item, price: gearPrice(item), copies: 1, standing: rarity === 4 ? 3 : rarity === 3 ? 2 : 1 };
  });
  const tomes: Ware[] = (Object.entries(TOME_WARES) as [TomeSize, (typeof TOME_WARES)[TomeSize]][]).map(([size, t]) => ({ key: `tome:${size}`, type: 'tome', size, price: t.price, copies: t.copies, standing: t.standing }));
  return { books, gear, tomes };
}

/** Copies of a ware bought on `day`. */
export const boughtOn = (m: Meta, key: string, day: number): number => (m.stall?.day === day ? m.stall.sold[key] ?? 0 : 0);
export const copiesLeft = (m: Meta, w: Ware, day: number): number => Math.max(0, w.copies - boughtOn(m, w.key, day));

/** Why a ware cannot be bought now (null when it can). */
export function whyNotBuy(m: Meta, w: Ware, day: number): string | null {
  if (standingOf(m) < w.standing) return `Standing ${w.standing}`;
  if (copiesLeft(m, w, day) <= 0) return 'Sold out';
  if (m.crowns < w.price) return `Needs ${w.price - m.crowns} more crowns`;
  return null;
}

/** The stall's record for `day` (a new day starts its sales, and its Sold today shelf, afresh). */
function today(m: Meta, day: number): NonNullable<Meta['stall']> {
  const s = (m.stall ??= { day, sold: {}, spent: 0 });
  if (s.day !== day) {
    s.day = day;
    s.sold = {};
    delete s.soldToday;
  }
  return s;
}

/** Spend crowns at the stall: they count towards standing. */
export function spend(m: Meta, n: number, day: number): void {
  if (n <= 0) return;
  today(m, day).spent += n;
}

/** What buying gave: the piece made, the book or tomes. */
export type Bought = { type: 'gear'; item: Equipment } | { type: 'book'; book: string } | { type: 'tome'; size: TomeSize };

/** Buy a ware on `day` (by its key on the day's shelves): the crowns are paid and count for standing. Null (nothing changes) when it
 *  cannot be bought. */
export function buyWare(m: Meta, key: string, day: number): Bought | null {
  const st = stockOf(m, day);
  const w = [...st.books, ...st.gear, ...st.tomes].find((x) => x.key === key);
  if (!w || whyNotBuy(m, w, day)) return null;
  m.crowns -= w.price;
  const s = today(m, day);
  s.sold[key] = (s.sold[key] ?? 0) + 1;
  s.spent += w.price;
  if (w.type === 'gear') return { type: 'gear', item: grantEquipment(m, w.item) };
  if (w.type === 'book') {
    grantBook(m, w.book);
    return { type: 'book', book: w.book };
  }
  grantTomes(m, { [w.size]: 1 });
  return { type: 'tome', size: w.size };
}

// ---- mending (the Repair tab: the rules are `wear.ts`; the crowns count for standing) ----

/** Mend one piece at the stall. Returns the crowns paid (0 when nothing was done). */
export function stallRepair(m: Meta, id: number, day: number): number {
  const n = repairItem(m, id);
  spend(m, n, day);
  return n;
}
/** Mend everything the heroes wear (or these kinds wear) at the stall. Returns the crowns paid. */
export function stallRepairAll(m: Meta, day: number, kinds?: readonly string[]): number {
  const n = repairAll(m, kinds);
  spend(m, n, day);
  return n;
}

// ---- selling ----

/** Whether a spare piece is the last of its base the player owns (worn pieces count). */
export const lastOfBase = (m: Meta, it: Equipment): boolean => (m.equipment ?? []).filter((x) => x.base === it.base).length <= 1;
/** Whether selling a piece should ask first: an Epic or better, or the last of its base. */
export const sellAsks = (m: Meta, it: Equipment): boolean => it.rarity >= 3 || lastOfBase(m, it);

/** Sell a spare piece: its price (`sellPrice`) is paid, and it goes on the Sold today shelf to buy back. Returns the crowns (0, nothing
 *  changes, when it is worn by a hero or not owned). */
export function sellPiece(m: Meta, id: number, day: number): number {
  const it = spareEquipment(m).find((x) => x.id === id);
  if (!it) return 0;
  const price = sellPrice(it);
  m.equipment = m.equipment!.filter((x) => x.id !== id);
  m.crowns += price;
  const s = today(m, day);
  s.soldToday = [{ item: { ...it }, price }, ...(s.soldToday ?? [])].slice(0, SOLD_TODAY);
  return price;
}

/** The spare Commons "Sell all Commons" sells: never the last of a base, nor a piece of a set a hero wears. */
export function bulkCommons(m: Meta): Equipment[] {
  const worn = new Set((m.equipment ?? []).filter((x) => wearerOf(m, x.id) !== undefined).map((x) => SET_OF_BASE[x.base]?.id).filter((x) => !!x));
  const left = new Map<string, number>();
  for (const x of m.equipment ?? []) left.set(x.base, (left.get(x.base) ?? 0) + 1);
  const out: Equipment[] = [];
  for (const it of spareEquipment(m).sort((a, b) => a.level - b.level || a.id - b.id)) {
    if (it.rarity !== 1 || worn.has(SET_OF_BASE[it.base]?.id ?? '')) continue;
    const n = left.get(it.base) ?? 0;
    if (n <= 1) continue;
    left.set(it.base, n - 1);
    out.push(it);
  }
  return out;
}
/** Sell every piece `bulkCommons` lists. Returns the crowns and the count. */
export function sellAllCommons(m: Meta, day: number): { crowns: number; n: number } {
  let crowns = 0;
  const list = bulkCommons(m);
  for (const it of list) crowns += sellPiece(m, it.id, day);
  return { crowns, n: list.length };
}

/** The Sold today shelf (empty on a new day). */
export const soldToday = (m: Meta, day: number): { item: Equipment; price: number }[] => (m.stall?.day === day ? m.stall.soldToday ?? [] : []);

/** Buy back a piece sold today at exactly the price paid (it does not count for standing). Returns the piece (with its old id and wear),
 *  or null when it is not on the shelf or too dear. */
export function buyBack(m: Meta, index: number, day: number): Equipment | null {
  const list = soldToday(m, day);
  const e = list[index];
  if (!e || m.crowns < e.price) return null;
  m.crowns -= e.price;
  list.splice(index, 1);
  const it: Equipment = { ...e.item };
  // (its old id is kept unless something has taken it since)
  if ((m.equipment ?? []).some((x) => x.id === it.id)) it.id = Math.max(m.nextItem ?? 1, ...(m.equipment ?? []).map((x) => x.id + 1));
  m.nextItem = Math.max(m.nextItem ?? 1, it.id + 1);
  (m.equipment ??= []).push(it);
  return it;
}

/** What a spare book sells for: a fifth of its shelf price (Common, Uncommon), a fixed sum (Rare); a Legendary never sells (0). */
export function bookSellPrice(m: Meta, book: BookDef): number {
  if (book.rarity === 'legendary') return 0;
  if (book.rarity === 'rare') return RARE_BOOK_SELL;
  return Math.floor(bookPrice(m, book) * BOOK_SELL_SHARE);
}
/** Sell an unread copy of a book. Returns the crowns (0 when there is none, or it is a Legendary). */
export function sellBook(m: Meta, id: string): number {
  const book = bookById(id);
  if (!book || copiesOf(m, id) <= 0) return 0;
  const price = bookSellPrice(m, book);
  if (price <= 0) return 0;
  if (copiesOf(m, id) === 1) delete m.books![id];
  else m.books![id]--;
  if (m.books && !Object.keys(m.books).length) delete m.books;
  m.crowns += price;
  return price;
}

// ---- Hester's lines ----

export type StallTab = 'books' | 'gear' | 'tomes' | 'chests' | 'sell' | 'repair';
export const STALL_TABS: readonly StallTab[] = ['books', 'gear', 'tomes', 'chests', 'sell', 'repair'];
const LINES: Readonly<Record<StallTab | 'open', readonly string[]>> = {
  open: ['Morning, Your Majesty. Don’t touch the ones that hum.', 'Everything’s genuine. Mostly.', 'Back again? I’ll put the kettle on.', 'Fresh off the cart, Your Majesty. Mind the step.'],
  books: ['Every one of these was somebody’s whole life. Mind the margins.', 'Read it twice. Fight with it once.', 'A book a day keeps the goblins away. Nearly.'],
  gear: ['Swords, sir, ma’am, Majesty. Sharp end goes at the enemy.', 'All tested. On whom, I couldn’t say.', 'That one was a duke’s. Well. A duke’s cousin.'],
  tomes: ['A little light reading. Very little, very light.', 'One of these and they’ll know things they’ll wish they didn’t.'],
  chests: ['Locked, sealed, and none of my business what’s inside.', 'A gold chest I’d sell my own mother for. Well. Rent her.'],
  sell: ['Let’s see what the cat dragged in.', 'I’ll give you a fair price. Fair for me.', 'Bring me your dents and dings.'],
  repair: ['Who’ve you been hitting with this?', 'Good as new. Better, actually. Don’t tell the smith.', 'Leave it with me. And step back from the anvil.'],
};
/** What Hester says when the stall opens (`tab` undefined) or on a tab: drawn from a side stream of the day, so a reload says the same. */
export function hesterLine(m: Meta, day: number, tab?: StallTab): string {
  const list = LINES[tab ?? 'open'];
  const rng = new Rng(mixSeed(m.seed, LINE_SALT, day, tab ? STALL_TABS.indexOf(tab) + 1 : 0));
  return list[rng.int(0, list.length - 1)];
}
/** What she says on a new standing. */
export const STANDING_LINES: Readonly<Record<2 | 3, string>> = {
  2: 'You’re good for it. I’ll show you the back shelf.',
  3: 'Between friends, then. Come and see what I don’t put out.',
};

/** Whether the day's stock is new and the stall has not been looked at today (the plate's gold dot). */
export const newStock = (m: Meta, day: number): boolean => m.stall?.seen !== day;
/** The stall has been opened today. */
export function markSeen(m: Meta, day: number): void {
  today(m, day).seen = day;
}

/** A saved stall record that is sane. Anything else is dropped. */
export function readStall(raw: unknown): Meta['stall'] {
  const r = raw as Partial<NonNullable<Meta['stall']>> | null;
  if (!r || typeof r !== 'object' || typeof r.day !== 'number') return undefined;
  const sold: Record<string, number> = {};
  if (r.sold && typeof r.sold === 'object') for (const [k, n] of Object.entries(r.sold)) if (typeof n === 'number' && n >= 1) sold[k] = Math.floor(n);
  const out: NonNullable<Meta['stall']> = { day: r.day | 0, sold, spent: Math.max(0, Math.floor(Number(r.spent) || 0)) };
  if (typeof r.seen === 'number') out.seen = r.seen | 0;
  if (Array.isArray(r.soldToday)) {
    const list = r.soldToday.filter((e) => e && typeof e.price === 'number' && e.item && typeof e.item.id === 'number' && EQUIP_BASES[e.item.base]).slice(0, SOLD_TODAY);
    if (list.length) out.soldToday = list.map((e) => ({ item: { ...e.item }, price: Math.max(1, Math.floor(e.price)) }));
  }
  return out;
}

