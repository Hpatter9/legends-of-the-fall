import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta, type Meta } from '../src/sim/meta';
import { EQUIP_BASES, EQUIP_SLOTS, bestFor, equipAll, equipBest, equipItem, grantEquipment, itemScore, strongestFirst, wearerOf, wornIn, type NewEquipment } from '../src/sim/equipment';
import { xpFor } from '../src/sim/levels';

const give = (m: Meta, ...items: NewEquipment[]) => items.map((i) => grantEquipment(m, i));
const everyoneOnce = (m: Meta) => {
  const ids = Object.values(m.equipped ?? {}).flatMap((s) => Object.values(s));
  assert.equal(new Set(ids).size, ids.length, 'an item is on one hero at most');
};

test('a better piece scores higher: rarity, item level, calling and ability count', () => {
  const sword = (rarity: 1 | 2 | 3 | 4 | 5, level = 1) => ({ base: 'ironSword', rarity, level });
  assert.ok(itemScore(sword(3), 'knight') > itemScore(sword(2), 'knight'));
  assert.ok(itemScore(sword(2, 10), 'knight') > itemScore(sword(2, 1), 'knight'));
  // (a bow suits a shooter more than a swordsman: the calling bonus and the reach)
  const bow = { base: 'huntersBow', rarity: 2 as const, level: 3 };
  assert.equal(EQUIP_BASES.huntersBow.calling, 'shooter');
  assert.ok(itemScore(bow, 'archer') > itemScore(bow, 'knight'));
  // (the ability adds: Epic over Rare of the same base and level, by more than the stats alone)
  assert.ok(itemScore(sword(3, 5), 'knight') - itemScore(sword(2, 5), 'knight') > 10);
});

test('equip best fills the three slots from the bag with the strongest pieces', () => {
  const m = startedMeta(1);
  give(m, { base: 'ironSword', rarity: 1, level: 1 }, { base: 'runedBlade', rarity: 4, level: 8 }, { base: 'leatherJerkin', rarity: 2, level: 2 }, { base: 'thornplate', rarity: 4, level: 7 }, { base: 'luckyCharm', rarity: 1, level: 1 }, { base: 'phoenixFeather', rarity: 4, level: 6 });
  const n = equipBest(m, 'knight');
  assert.equal(n, 3);
  const worn = EQUIP_SLOTS.map((s) => wornIn(m, 'knight', s)!);
  assert.ok(worn.every(Boolean));
  assert.equal(worn[0].base, 'runedBlade');
  assert.equal(worn[1].base, 'thornplate');
  // (a second go changes nothing)
  assert.equal(equipBest(m, 'knight'), 0);
  everyoneOnce(m);
});

test('bag only never strips another hero; taking from others does, and never doubles an item', () => {
  const m = startedMeta(1);
  const [great, poor] = give(m, { base: 'runedBlade', rarity: 5, level: 15 }, { base: 'ironSword', rarity: 1, level: 1 });
  assert.ok(equipItem(m, 'samurai', great.id));
  // (the knight, from the bag only, gets the poor sword and leaves the samurai's alone)
  assert.equal(equipBest(m, 'knight', false), 1);
  assert.equal(wornIn(m, 'knight', 'weapon')!.id, poor.id);
  assert.equal(wearerOf(m, great.id), 'samurai');
  assert.deepEqual(bestFor(m, 'knight', false).slots, {});
  // taking from others: the knight would now take the great blade, the samurai is left bare
  assert.equal(bestFor(m, 'knight', true).slots.weapon, great.id);
  assert.equal(equipBest(m, 'knight', true), 1);
  assert.equal(wearerOf(m, great.id), 'knight');
  assert.equal(wornIn(m, 'samurai', 'weapon'), undefined);
  everyoneOnce(m);
  // (a locked item stays)
  assert.equal(equipBest(m, 'samurai', true, new Set([great.id])), 1);
  assert.equal(wearerOf(m, great.id), 'knight');
  assert.equal(wornIn(m, 'samurai', 'weapon')!.id, poor.id);
  everyoneOnce(m);
});

test('equip all serves the strongest heroes first and never puts an item on two heroes', () => {
  const m = startedMeta(1);
  m.xp.samurai = xpFor(10);
  m.xp.archer = xpFor(4);
  assert.deepEqual(strongestFirst(m).slice(0, 3), ['samurai', 'archer', 'knight']);
  give(m, { base: 'runedBlade', rarity: 5, level: 10 }, { base: 'claymore', rarity: 3, level: 4 }, { base: 'ironSword', rarity: 1, level: 1 }, { base: 'huntersBow', rarity: 3, level: 3 });
  const n = equipAll(m);
  assert.ok(n >= 4);
  everyoneOnce(m);
  // (the strongest hero got the best melee weapon)
  assert.equal(wornIn(m, 'samurai', 'weapon')!.base, 'runedBlade');
  // (a second go changes nothing; and with taking allowed an earlier hero keeps its piece)
  assert.equal(equipAll(m), 0);
  const before = JSON.stringify(m.equipped);
  equipAll(m, true);
  everyoneOnce(m);
  assert.equal(wornIn(m, 'samurai', 'weapon')!.base, 'runedBlade');
  void before;
  // (a locked hero is not equipped)
  const fresh = startedMeta(2);
  give(fresh, { base: 'ironSword', rarity: 1, level: 1 });
  assert.equal(equipBest(fresh, 'kitsune'), 0);
});
