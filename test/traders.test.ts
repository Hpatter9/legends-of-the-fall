// The visiting traders (docs/notes/shop-traders.md): Rustam Saffar's weekly caravan and the Gloaming Dealer after a guardian falls.
// Which day each save meets the caravan, its stock (same all week, a new one each week, Rare book / two Epics / ore, on its own
// stream), the Dealer's coming and stock, buying and its reasons, standing gates, lines, and saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookById } from '../src/sim/bookData';
import { copiesOf } from '../src/sim/books';
import { oresOf } from '../src/sim/awakenMats';
import { startedMeta, type Meta } from '../src/sim/meta';
import { calamityRun } from '../src/sim/modes';
import { settleTower } from '../src/sim/tower';
import { readStall, stockOf, gearPrice } from '../src/sim/stall';
import { EQUIP_BASES } from '../src/sim/equipment';
import {
  buyFromTrader, caravanDay, caravanHere, caravanIn, caravanStock, gloamingHere, gloamingStock, noteGuardians, readTrade, traderLine, weekOf, weekdayOf, whyNotBuyFrom,
} from '../src/sim/traders';

const meta = (seed = 21): Meta => {
  const m = startedMeta(seed);
  m.crowns = 1_000_000;
  return m;
};
/** The first day (yyyymmdd) from `from` on that falls on a weekday. */
const dayKey = (d: Date): number => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
const days = (n: number, from = Date.UTC(2026, 10, 2)): number[] => Array.from({ length: n }, (_, i) => dayKey(new Date(from + i * 86400000)));

test('weekdays and weeks: 2 November 2026 is a Monday and a week runs Monday to Sunday', () => {
  assert.equal(weekdayOf(20261102), 0);
  assert.equal(weekdayOf(20261108), 6);
  assert.equal(weekOf(20261108), weekOf(20261102));
  assert.equal(weekOf(20261109), weekOf(20261102) + 1);
});

test('the caravan comes one day in seven, the save’s own weekday, and different saves meet it on different days', () => {
  const m = meta();
  const week = days(7);
  assert.equal(week.filter((d) => caravanHere(m, d)).length, 1);
  assert.equal(weekdayOf(week.find((d) => caravanHere(m, d))!), caravanDay(m));
  assert.equal(caravanIn(m, week.find((d) => caravanHere(m, d))!), 0);
  const seen = new Set<number>();
  for (let s = 1; s <= 60; s++) seen.add(caravanDay(meta(s)));
  assert.ok(seen.size >= 5, 'saves spread over the week');
  // (days to the next visit counts down to 0)
  const d = days(1)[0];
  assert.equal((weekdayOf(d) + caravanIn(m, d)) % 7, caravanDay(m));
});

test('the caravan sells one Rare book, two Epic pieces of different slots and a bundle of ore, the same all week and new each week', () => {
  const m = meta();
  const st = caravanStock(m, 20261102);
  assert.deepEqual(st, caravanStock(m, 20261108));
  assert.notDeepEqual(st, caravanStock(m, 20261109));
  assert.deepEqual(st.map((w) => w.type), ['book', 'gear', 'gear', 'ore']);
  for (const w of st) assert.equal(w.copies, 1);
  const [book, g1, g2, ore] = st;
  assert.ok(book.type === 'book' && bookById(book.book)!.rarity === 'rare' && book.standing === 2);
  assert.ok(g1.type === 'gear' && g2.type === 'gear' && g1.item.rarity === 3 && g2.item.rarity === 3);
  assert.equal(g1.standing, 1);
  assert.equal(g2.standing, 2);
  if (g1.type === 'gear' && g2.type === 'gear') assert.notEqual(EQUIP_BASES[g1.item.base].slot, EQUIP_BASES[g2.item.base].slot);
  assert.ok(ore.type === 'ore' && ore.n > 0);
});

test('the caravan’s dearer than Hester for the same piece, and draws on its own stream (the stall’s stock is untouched)', () => {
  const m = meta();
  const before = JSON.stringify(stockOf(m, 20261102));
  const g = caravanStock(m, 20261102)[1];
  assert.ok(g.type === 'gear' && g.price > gearPrice(g.item));
  caravanStock(m, 20261102);
  gloamingStock(m);
  assert.equal(JSON.stringify(stockOf(m, 20261102)), before);
});

test('buying from the caravan: only on its day, once a ware, with reasons, standing gates, and the week’s sales reset next week', () => {
  const m = meta();
  const day = days(7).find((d) => caravanHere(m, d))!;
  const off = days(7).find((d) => !caravanHere(m, d))!;
  const st = caravanStock(m, day);
  assert.ok(whyNotBuyFrom(m, 'caravan', st[3], off)!.includes('has gone'));
  assert.equal(buyFromTrader(m, 'caravan', st[3].key, off), null);
  // (standing 1: the first Epic and the ore; the Rare book and second Epic need standing 2)
  assert.equal(whyNotBuyFrom(m, 'caravan', st[0], day), 'Standing 2');
  assert.equal(whyNotBuyFrom(m, 'caravan', st[2], day), 'Standing 2');
  assert.equal(whyNotBuyFrom(m, 'caravan', st[1], day), null);
  const crowns = m.crowns;
  const got = buyFromTrader(m, 'caravan', st[1].key, day)!;
  assert.equal(got.type, 'gear');
  assert.equal(m.crowns, crowns - st[1].price);
  assert.equal(whyNotBuyFrom(m, 'caravan', st[1], day), 'Sold out');
  assert.equal(buyFromTrader(m, 'caravan', st[1].key, day), null);
  assert.equal(m.crowns, crowns - st[1].price);
  // (the ore goes into the pouch)
  const ore = st[3];
  assert.ok(ore.type === 'ore');
  const had = oresOf(m, ore.type === 'ore' ? ore.trait : '');
  assert.equal(buyFromTrader(m, 'caravan', ore.key, day)!.type, 'ore');
  assert.equal(oresOf(m, ore.type === 'ore' ? ore.trait : ''), had + (ore.type === 'ore' ? ore.n : 0));
  // (standing 2 opens the rest, and the sale does not count towards standing)
  assert.equal(m.stall?.spent ?? 0, 0);
  m.stall!.spent = 4000;
  const book = st[0];
  assert.ok(book.type === 'book');
  buyFromTrader(m, 'caravan', book.key, day);
  assert.equal(copiesOf(m, book.type === 'book' ? book.book : ''), 1);
  assert.equal(m.stall!.spent, 4000);
  // (a poor save is told how much it needs)
  const poor = meta();
  poor.crowns = 10;
  assert.match(whyNotBuyFrom(poor, 'caravan', caravanStock(poor, day)[1], day)!, /^Needs \d+ more crowns$/);
  // (next week the caravan has new wares and none sold)
  const next = day + 7 <= 0 ? day : dayKey(new Date(Date.UTC(Math.floor(day / 10000), (Math.floor(day / 100) % 100) - 1, day % 100) + 7 * 86400000));
  assert.ok(caravanHere(m, next));
  const st2 = caravanStock(m, next);
  assert.equal(whyNotBuyFrom(m, 'caravan', st2[1], next), null);
});

test('the Dealer comes after a guardian falls, for the rest of that day only, and each fall draws a new stock', () => {
  const m = meta();
  assert.equal(gloamingHere(m, 20261102), false);
  noteGuardians(m, 0);
  assert.equal(gloamingHere(m, 20261102), false);
  noteGuardians(m, 2);
  assert.equal(m.stall!.guardians, 2);
  assert.equal(gloamingHere(m, 20261102), true);
  assert.equal(gloamingHere(m, 20261102), true);
  assert.equal(gloamingHere(m, 20261103), false);
  const first = gloamingStock(m);
  assert.deepEqual(first, gloamingStock(m));
  noteGuardians(m, 1);
  assert.equal(gloamingHere(m, 20261110), true);
  assert.notDeepEqual(first, gloamingStock(m));
});

test('the Dealer sells a universal Rare book and a Legendary piece at twice the stall’s price, asking no standing, and not the same twice', () => {
  const m = meta();
  noteGuardians(m, 1);
  const day = 20261102;
  assert.ok(gloamingHere(m, day));
  const [book, gear] = gloamingStock(m);
  assert.ok(book.type === 'book' && bookById(book.book)!.rarity === 'rare' && bookById(book.book)!.kind === 'universal');
  assert.ok(gear.type === 'gear' && gear.item.rarity === 4);
  if (gear.type === 'gear') assert.equal(gear.price, Math.round((gearPrice(gear.item) * 2) / 10) * 10);
  assert.equal(whyNotBuyFrom(m, 'gloaming', gear, day), null);
  const crowns = m.crowns;
  assert.equal(buyFromTrader(m, 'gloaming', gear.key, day)!.type, 'gear');
  assert.equal(m.crowns, crowns - gear.price);
  assert.equal(whyNotBuyFrom(m, 'gloaming', gear, day), 'Sold out');
  assert.equal(buyFromTrader(m, 'gloaming', book.key, day)!.type, 'book');
  assert.equal(buyFromTrader(m, 'gloaming', book.key, day), null);
  // (gone the next day)
  assert.equal(buyFromTrader(m, 'gloaming', book.key, 20261103), null);
  // (another guardian, another visit with its own wares to buy)
  noteGuardians(m, 1);
  gloamingHere(m, 20261110);
  const again = gloamingStock(m);
  assert.equal(whyNotBuyFrom(m, 'gloaming', again[1], 20261110), null);
});

test('the traders’ lines are in the game’s voice and the same on a reload', () => {
  const m = meta();
  for (const t of ['caravan', 'gloaming'] as const) {
    assert.equal(traderLine(m, t, 20261102), traderLine(m, t, 20261102));
    assert.equal(traderLine(m, t, 20261102, true), traderLine(m, t, 20261102, true));
    assert.ok(traderLine(m, t, 20261102).length > 10);
  }
  const lines = new Set(days(40).map((d) => traderLine(m, 'caravan', d)));
  assert.ok(lines.size > 1);
});

test('saves: the trade record, guardians and the Dealer’s day are kept, nonsense dropped, and an old stall record loads as before', () => {
  const m = meta();
  const day = days(7).find((d) => caravanHere(m, d))!;
  noteGuardians(m, 1);
  gloamingHere(m, day);
  buyFromTrader(m, 'caravan', caravanStock(m, day)[1].key, day);
  const back = readStall(JSON.parse(JSON.stringify(m.stall)))!;
  assert.deepEqual(back.trade, m.stall!.trade);
  assert.equal(back.guardians, 1);
  assert.equal(back.gloaming, day);
  assert.equal(readTrade({ caravan: { visit: 'x', sold: {} }, gloaming: { visit: 3, sold: { a: 'b', c: 2 } } })!.gloaming!.sold.c, 2);
  assert.equal(readTrade({ caravan: { visit: 'x', sold: {} } }), undefined);
  assert.equal(readTrade(7), undefined);
  const old = readStall({ day: 20261031, sold: {}, spent: 100 })!;
  assert.equal(old.trade, undefined);
  assert.equal(old.guardians, undefined);
});

test('a Calamity settled with guardians felled brings the Dealer; one lost on its first map does not', () => {
  const settled = (bosses: number): Meta => {
    const m = meta();
    const run = calamityRun(5, m, 'knight');
    run.over = true;
    run.tower!.bosses = bosses;
    settleTower(m, run);
    return m;
  };
  const won = settled(2);
  assert.equal(won.stall?.guardians, 2);
  assert.equal(gloamingHere(won, 20261102), true);
  const none = settled(0);
  assert.equal(gloamingHere(none, 20261102), false);
});
