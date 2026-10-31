// Gear that wears (docs/notes/shop-books-gear.md): a point a wave for each piece a placed hero wears, one more on armour for a fall,
// half under auto-replay; worn at 25%, broken at nothing, and a broken piece gives nothing (no stats, no set, not chosen by Equip
// best); repairs priced by grade, level and points, cheaper with the Armoury; Repair all; old saves full; combining makes a fresh piece.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestFor, combineItems, equipItem, equipStats, grantEquipment, readEquipment } from '../src/sim/equipment';
import { loadMeta, startedMeta, type Meta } from '../src/sim/meta';
import { durabilityOf, maxDurability, needingRepair, partyWear, repairAll, repairAllCost, repairCost, repairItem, settleWear, wearState } from '../src/sim/wear';

const kit = (): Meta => {
  const m = startedMeta(9);
  m.crowns = 10000;
  for (const [base, rarity, level] of [['ironSword', 1, 1], ['leatherJerkin', 2, 1], ['luckyCharm', 1, 1]] as const) {
    const it = grantEquipment(m, { base, rarity, level });
    equipItem(m, 'knight', it.id);
  }
  return m;
};
const worn = (m: Meta, base: string) => m.equipment!.find((x) => x.base === base)!;

test('durability: grade and item level; a new piece is full', () => {
  assert.equal(maxDurability({ rarity: 1, level: 1 }), 31);
  assert.equal(maxDurability({ rarity: 5, level: 20 }), 110);
  const m = kit();
  assert.equal(durabilityOf(worn(m, 'ironSword')), 31);
  assert.equal(wearState(worn(m, 'ironSword')), 'good');
});

test('a wave wears every piece of a placed hero by one; a fall knocks the armour once more; auto wears at half; the bench nothing', () => {
  const m = kit();
  settleWear(m, [{ kind: 'knight', fell: false }]);
  assert.equal(worn(m, 'ironSword').wear, 1);
  settleWear(m, [{ kind: 'knight', fell: true }]);
  assert.equal(worn(m, 'ironSword').wear, 2);
  assert.equal(worn(m, 'leatherJerkin').wear, 3, 'the knock on the armour');
  settleWear(m, [{ kind: 'knight', fell: false }], true);
  assert.equal(worn(m, 'ironSword').wear, 2.5);
  settleWear(m, [{ kind: 'samurai', fell: false }]);
  assert.equal(worn(m, 'ironSword').wear, 2.5, 'another hero fighting wears nothing of the knight');
});

test('worn at a quarter, broken at nothing: a broken piece gives nothing, and Equip best passes it over', () => {
  const m = kit();
  const sword = worn(m, 'ironSword');
  const before = equipStats(m, 'knight')!.atk;
  sword.wear = 24;
  assert.equal(wearState(sword), 'worn');
  assert.equal(equipStats(m, 'knight')!.atk, before, 'worn keeps its full strength');
  const notes = settleWear(m, Array.from({ length: 1 }, () => ({ kind: 'knight', fell: false })));
  assert.equal(notes.length, 0);
  sword.wear = 30;
  const broke = settleWear(m, [{ kind: 'knight', fell: false }]);
  assert.deepEqual(broke.map((n) => [n.name, n.state]), [['Iron Sword', 'broken']]);
  assert.equal(wearState(sword), 'broken');
  assert.ok(equipStats(m, 'knight')!.atk < before, 'the broken sword gives nothing');
  settleWear(m, [{ kind: 'knight', fell: false }]);
  assert.equal(sword.wear, 31, 'never past broken');
  const spare = grantEquipment(m, { base: 'ironSword', rarity: 1, level: 1 });
  assert.equal(bestFor(m, 'knight').slots.weapon, spare.id, 'a whole sword replaces the broken one');
  spare.wear = 99;
  const read = readEquipment(m.equipment);
  assert.equal(read.find((x) => x.id === spare.id)!.wear, 31, 'saved wear is capped');
});

test('repairs: by grade, level and points lost, rounded up; the Armoury takes 4% a level; mending is to full', () => {
  const m = kit();
  const sword = worn(m, 'ironSword');
  assert.equal(repairCost(sword), 0);
  sword.wear = 31;
  assert.equal(repairCost(sword), 7);
  assert.equal(repairCost({ id: 1, base: 'ironSword', rarity: 5, level: 20, wear: 110 }), 107);
  assert.equal(repairCost({ id: 1, base: 'ironSword', rarity: 5, level: 20, wear: 110 }, 7), 77);
  m.castle.armoury = 0;
  assert.equal(repairItem(m, sword.id), 7);
  assert.equal(m.crowns, 9993);
  assert.equal(sword.wear, undefined);
  m.crowns = 0;
  sword.wear = 5;
  assert.equal(repairItem(m, sword.id), 0, 'too poor');
});

test('Repair all mends what the heroes wear in one payment; the list puts the party first', () => {
  const m = kit();
  worn(m, 'ironSword').wear = 10;
  worn(m, 'leatherJerkin').wear = 41;
  const spare = grantEquipment(m, { base: 'ironSword', rarity: 1, level: 1 });
  spare.wear = 3;
  assert.deepEqual(needingRepair(m).map((x) => x.base), ['leatherJerkin', 'ironSword', 'ironSword']);
  assert.equal(needingRepair(m)[2].id, spare.id, 'spares last');
  assert.deepEqual(partyWear(m, ['knight']), { worn: 0, broken: 1 });
  const { cost } = repairAllCost(m);
  assert.equal(repairAll(m), cost);
  assert.equal(needingRepair(m).length, 1, 'the spare is left');
});

test('an old save has full gear; combining makes a fresh piece', () => {
  const m = kit();
  const store = new Map([['legends.meta', JSON.stringify(m)]]);
  const back = loadMeta(1, { getItem: (k: string) => store.get(k) ?? null });
  assert.ok(back.equipment!.every((x) => x.wear === undefined));
  const ids = [1, 2, 3].map(() => {
    const it = grantEquipment(m, { base: 'katana', rarity: 1, level: 2 });
    it.wear = 30;
    return it.id;
  });
  const made = combineItems(m, ids)!;
  assert.equal(made.wear, undefined);
});
