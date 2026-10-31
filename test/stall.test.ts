// Hester's Stall (docs/notes/shop-books-gear.md): the day's stock is the same all day and changes with the day, never a book no owned
// hero could read; copies, standing gates and prices; buying pays and counts for standing; repairs count, selling and buying back do
// not; selling replaced salvage (the same crowns for a full piece), the condition's price, bulk Commons, the Sold today shelf; spare
// books sell, Legendary never; and no crowns loop (buy then sell, repair then sell, combine then sell) at any grade, level or wear.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKS } from '../src/sim/bookData';
import { grantBook } from '../src/sim/books';
import { DUR, SALVAGE_CROWNS, equipItem, grantEquipment, maxDurability, salvageItem, sellPrice, type Equipment, type Rarity } from '../src/sim/equipment';
import { startedMeta, loadMeta, type Meta } from '../src/sim/meta';
import { STANDINGS, bookSellPrice, bulkCommons, buyBack, buyWare, gearPrice, hesterLine, readStall, sellAllCommons, sellBook, sellPiece, soldToday, stallRepair, standingOf, stockOf, whyNotBuy } from '../src/sim/stall';
import { repairCost } from '../src/sim/wear';
import { ALL_HEROES } from '../src/sim/units';

const DAY = 20261031;
const meta = (): Meta => {
  const m = startedMeta(21);
  m.crowns = 100000;
  return m;
};

test('the stock is the same all day, changes with the day, and holds only books an owned hero could read', () => {
  const m = meta();
  assert.deepEqual(stockOf(m, DAY), stockOf(m, DAY));
  assert.notDeepEqual(stockOf(m, DAY), stockOf(m, DAY + 1));
  // (the starting five: knight, samurai, kunoichi, archer, wizard read manuals and grimoires)
  for (let d = 0; d < 20; d++)
    for (const w of stockOf(m, DAY + d).books) {
      const b = BOOKS.find((x) => w.type === 'book' && x.id === w.book)!;
      assert.ok(b.kind === 'manual' || b.kind === 'grimoire' || b.kind === 'universal', b.id);
      assert.ok(b.rarity === 'common' || b.rarity === 'uncommon');
    }
  const st = stockOf(m, DAY);
  assert.equal(st.gear.length, 3);
  assert.deepEqual(st.gear.map((w) => w.type === 'gear' && w.item.rarity).filter((r) => r === 3 || r === 4).sort(), [3, 4], 'one Epic and one Legendary');
});

test('standing gates the better wares, and buying pays, counts the copies and the standing', () => {
  const m = meta();
  const st = stockOf(m, DAY);
  const epic = st.gear.find((w) => w.type === 'gear' && w.item.rarity === 3)!;
  assert.equal(whyNotBuy(m, epic, DAY), 'Standing 2');
  const small = st.tomes.find((w) => w.key === 'tome:small')!;
  for (let i = 0; i < 3; i++) assert.ok(buyWare(m, small.key, DAY));
  assert.equal(buyWare(m, small.key, DAY), null, 'sold out');
  assert.equal(m.tomes?.small, 3);
  assert.equal(m.crowns, 100000 - 450);
  assert.equal(m.stall?.spent, 450);
  const book = st.books[0];
  assert.ok(buyWare(m, book.key, DAY));
  assert.equal(m.books?.[book.type === 'book' ? book.book : ''], 1);
  m.stall!.spent = STANDINGS[1].spent;
  assert.equal(standingOf(m), 2);
  const got = buyWare(m, epic.key, DAY);
  assert.ok(got && got.type === 'gear' && got.item.rarity === 3);
  assert.equal(whyNotBuy(meta(), small, DAY), null, 'a new save can buy');
  // (a new day's sales start afresh, the standing stays)
  assert.ok(buyWare(m, small.key, DAY + 1));
  assert.ok(m.stall!.spent > STANDINGS[1].spent);
});

test('repairs count for standing; Hester says the same line on a reload', () => {
  const m = meta();
  const it = grantEquipment(m, { base: 'ironSword', rarity: 3, level: 5 });
  it.wear = 40;
  const paid = stallRepair(m, it.id, DAY);
  assert.ok(paid > 0);
  assert.equal(m.stall?.spent, paid);
  assert.equal(hesterLine(m, DAY, 'books'), hesterLine(meta(), DAY, 'books'));
});

test('selling replaced salvage: a full piece pays exactly what salvage did; a broken one 80%', () => {
  for (let r = 1; r <= 5; r++) {
    const full = { id: 1, base: 'ironSword', rarity: r as Rarity, level: 7 };
    assert.equal(sellPrice(full), SALVAGE_CROWNS[r] + 6);
    assert.equal(sellPrice({ ...full, wear: maxDurability(full) }), Math.floor((SALVAGE_CROWNS[r] + 6) * 0.8));
  }
  const m = meta();
  const it = grantEquipment(m, { base: 'katana', rarity: 2, level: 3 });
  assert.equal(salvageItem(m, it.id), 14);
});

test('a sold piece waits on the Sold today shelf, and buys back at the price paid (not counted for standing)', () => {
  const m = meta();
  const it = grantEquipment(m, { base: 'katana', rarity: 2, level: 3 });
  it.wear = 5;
  const worn = grantEquipment(m, { base: 'ironSword', rarity: 1, level: 1 });
  equipItem(m, 'knight', worn.id);
  assert.equal(sellPiece(m, worn.id, DAY), 0, 'a worn piece is not spare');
  const price = sellPiece(m, it.id, DAY);
  assert.equal(soldToday(m, DAY).length, 1);
  const back = buyBack(m, 0, DAY)!;
  assert.equal(back.wear, 5);
  assert.equal(m.crowns, 100000);
  assert.ok(price > 0);
  assert.equal(m.stall?.spent, 0);
  assert.equal(soldToday(m, DAY + 1).length, 0, 'the shelf empties at midnight');
});

test('Sell all Commons never sells the last of a base nor a piece of a worn set', () => {
  const m = meta();
  for (let i = 0; i < 3; i++) grantEquipment(m, { base: 'ironSword', rarity: 1, level: 1 });
  grantEquipment(m, { base: 'katana', rarity: 1, level: 1 });
  grantEquipment(m, { base: 'katana', rarity: 2, level: 1 });
  assert.deepEqual(bulkCommons(m).map((x) => x.base), ['ironSword', 'ironSword', 'katana']);
  const { n, crowns } = sellAllCommons(m, DAY);
  assert.equal(n, 3);
  assert.equal(crowns, 15);
  assert.equal(m.equipment!.length, 2);
});

test('spare books sell for a fifth of the shelf price, a Rare for 400', () => {
  const m = meta();
  grantBook(m, 'whirlingStep', 2);
  grantBook(m, 'riverbankIaido');
  assert.equal(sellBook(m, 'whirlingStep'), 70);
  assert.equal(m.books?.whirlingStep, 1);
  assert.equal(sellBook(m, 'riverbankIaido'), 400);
  assert.equal(sellBook(m, 'riverbankIaido'), 0);
  assert.equal(bookSellPrice(m, BOOKS.find((b) => b.rarity === 'common')!), 70);
});

test('no crowns loop: the stall sells for far more than it buys back; mending never pays for a sale (at best it breaks even); combining bought pieces loses', () => {
  for (let r = 1; r <= 4; r++)
    for (let level = 1; level <= 20; level++) {
      const it: Equipment = { id: 1, base: 'ironSword', rarity: r as Rarity, level };
      assert.ok(gearPrice(it) >= 5 * sellPrice(it), `buy ${gearPrice(it)} vs sell ${sellPrice(it)} at ${r}/${level}`);
      // (three bought pieces combine into one of the next grade: worth less than they cost)
      assert.ok(3 * gearPrice(it) > sellPrice({ ...it, rarity: (r + 1) as Rarity }));
    }
  for (let r = 1; r <= 5; r++)
    for (let level = 1; level <= 20; level++)
      for (let wear = 1; wear <= DUR[r] + level; wear++)
        for (const armoury of [0, 7]) {
          const it: Equipment = { id: 1, base: 'ironSword', rarity: r as Rarity, level, wear };
          const gain = sellPrice({ ...it, wear: undefined }) - sellPrice(it);
          assert.ok(repairCost(it, armoury) >= gain, `repair ${repairCost(it, armoury)} vs gain ${gain} at ${r}/${level}/${wear}`);
        }
});

test('saves: the stall record reads back; nonsense is dropped', () => {
  const m = meta();
  buyWare(m, 'tome:small', DAY);
  const it = grantEquipment(m, { base: 'katana', rarity: 2, level: 3 });
  sellPiece(m, it.id, DAY);
  const store = new Map([['legends.meta', JSON.stringify(m)]]);
  const back = loadMeta(1, { getItem: (k: string) => store.get(k) ?? null });
  assert.deepEqual(back.stall, m.stall);
  assert.equal(readStall({ day: 'x' }), undefined);
  assert.equal(ALL_HEROES.length > 0, true);
});
