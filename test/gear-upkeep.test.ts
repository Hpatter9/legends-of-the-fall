// SEVEN-SLOT GEAR batch 3: gear that grows with use (seasoning), repair, patch or enchant (`wear.ts`, `enchant.ts`, `glyphs.ts`), and the
// economy's no-loop rules: patching then selling never beats selling, an enchanted piece sells for no more than a plain one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { equipItem, equipStats, grantEquipment, itemStats, maxDurability, sellPrice, type Equipment, type Rarity } from '../src/sim/equipment';
import { SEASON_CAP, durabilityOf, repairCost, season, seasonNeed, settleWear } from '../src/sim/wear';
import { GLYPHS, clearGlyphs, enchantItem, enchantOffers, glyphPrice, patchBlock, patchCost, patchItem, reforgeCost, reforgeItem, scarCap } from '../src/sim/enchant';
import { GEAR_PRICE } from '../src/sim/stall';
import { SHOP } from '../src/sim/chestShop';

const memory = () => {
  const box: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (box[k] = v), getItem: (k: string) => box[k] ?? null };
};
const worn = (m: Meta, base: string, rarity: Rarity = 2, level = 1): Equipment => {
  const it = grantEquipment(m, { base, rarity, level });
  equipItem(m, 'knight', it.id);
  return it;
};

test('seasoning: a worn piece gains a level each 8 + 2 x level waves, to its grade\'s cap; half under auto-replay; none while broken', () => {
  assert.deepEqual(SEASON_CAP, [0, 8, 12, 16, 20, 20]);
  const m = startedMeta(1);
  const sword = worn(m, 'ironSword', 1, 1);
  for (let i = 0; i < seasonNeed(1) - 1; i++) settleWear(m, [{ kind: 'knight', fell: false }]);
  assert.equal(sword.level, 1);
  settleWear(m, [{ kind: 'knight', fell: false }]);
  assert.equal(sword.level, 2, 'the tenth wave');
  assert.equal(sword.xp, undefined);
  settleWear(m, [{ kind: 'knight', fell: false }], true);
  assert.equal(sword.xp, 0.5, 'half under auto-replay');
  // (a Common piece stops at 8, and a longer life lasts a little longer)
  const it: Equipment = { id: 9, base: 'ironSword', rarity: 1, level: 7, xp: 21 };
  assert.ok(season(it, 1));
  assert.equal(it.level, 8);
  assert.ok(!season(it, 50));
  assert.equal(it.level, 8);
  // (a broken piece does not season)
  const n = startedMeta(2);
  const axe = worn(n, 'claymore', 2, 3);
  axe.wear = maxDurability(axe);
  settleWear(n, [{ kind: 'knight', fell: false }]);
  assert.equal(axe.xp, undefined);
  // (and a seasoned Rare at its cap beats a fresh Epic of a low level in its main stat)
  assert.ok(itemStats({ base: 'claymore', rarity: 2, level: 12 }, 'knight').atk > itemStats({ base: 'claymore', rarity: 3, level: 1 }, 'knight').atk);
});

test('patch: back to 60% for 40% of a repair, but two points of durability are lost for good, to a third; a reforge clears them', () => {
  const m = startedMeta(3);
  m.crowns = 100000;
  const plate = worn(m, 'plateCuirass', 3, 5);
  const full = maxDurability(plate);
  assert.equal(patchBlock(plate), 'healthy');
  plate.wear = full - 5;
  const repair = repairCost(plate, m.castle.armoury);
  assert.equal(patchCost(plate, m.castle.armoury), Math.ceil(repair * 0.4));
  assert.ok(patchItem(m, plate.id) > 0);
  assert.equal(plate.scars, 2);
  assert.equal(maxDurability(plate), full - 2);
  assert.ok(Math.abs(durabilityOf(plate) / maxDurability(plate) - 0.6) < 0.05);
  // (patched until the scars reach a third)
  for (let i = 0; i < 20; i++) {
    plate.wear = maxDurability(plate) - 1;
    patchItem(m, plate.id);
  }
  assert.ok(plate.scars! <= scarCap(plate));
  plate.wear = maxDurability(plate) - 1;
  assert.equal(patchBlock(plate), 'scarred');
  assert.equal(patchItem(m, plate.id), 0);
  // (a reforge costs a full repair from nothing, and clears the scars)
  const cost = reforgeCost(plate, m.castle.armoury);
  assert.equal(reforgeItem(m, plate.id), cost);
  assert.equal(plate.scars, undefined);
  assert.equal(reforgeItem(m, plate.id), 0, 'nothing to reforge');
});

test('enchanting: three glyphs offered from the slot\'s list, the same after a reload; up to three, priced by the count and the grade', () => {
  const m = startedMeta(4);
  m.crowns = 100000;
  const boots = worn(m, 'bootsOfHaste', 3, 4);
  const offers = enchantOffers(m, boots);
  assert.equal(offers.length, 3);
  assert.deepEqual(enchantOffers(m, boots), offers, 'the same three');
  assert.equal(glyphPrice(boots), Math.round((300 * 1.2) / 10) * 10);
  assert.equal(enchantItem(m, boots.id, 'keen'), 0, 'a glyph not offered (keen is not a boot\'s)');
  const before = equipStats(m, 'knight')!;
  const paid = enchantItem(m, boots.id, offers[0].id);
  assert.ok(paid > 0);
  assert.deepEqual(boots.glyphs, [offers[0].id]);
  const after = equipStats(m, 'knight')!;
  const [k, v] = Object.entries(GLYPHS[offers[0].id].main)[0] as [keyof typeof after, number];
  assert.ok(Math.abs((after[k] as number) - (before[k] as number) - v) < 1e-9, 'the glyph adds its line');
  assert.ok(!enchantOffers(m, boots).some((g) => g.id === offers[0].id), 'never the same glyph twice');
  enchantItem(m, boots.id, enchantOffers(m, boots)[0].id);
  enchantItem(m, boots.id, enchantOffers(m, boots)[0].id);
  assert.equal(boots.glyphs!.length, 3);
  assert.equal(glyphPrice(boots), null);
  assert.deepEqual(enchantOffers(m, boots), []);
  // (saved and read back)
  const s = memory();
  saveMeta(m, s);
  assert.deepEqual(loadMeta(4, s).equipment!.find((x) => x.id === boots.id)!.glyphs, boots.glyphs);
  // (cleared for free; nothing returned)
  const crowns = m.crowns;
  assert.ok(clearGlyphs(m, boots.id));
  assert.equal(boots.glyphs, undefined);
  assert.equal(m.crowns, crowns);
  // (a legend takes no glyph)
  assert.equal(glyphPrice({ id: 99, base: 'gravesong', rarity: 4, level: 12 }), null);
});

test('the cost of power: each glyph wears a piece a fifth faster and makes its repairs a quarter dearer', () => {
  const m = startedMeta(5);
  const plain = worn(m, 'ironSword', 2, 1);
  const n = startedMeta(5);
  const rich = grantEquipment(n, { base: 'ironSword', rarity: 2, level: 1 });
  rich.glyphs = ['keen', 'mighty'];
  equipItem(n, 'knight', rich.id);
  for (let i = 0; i < 5; i++) {
    settleWear(m, [{ kind: 'knight', fell: false }]);
    settleWear(n, [{ kind: 'knight', fell: false }]);
  }
  assert.equal(plain.wear, 5);
  assert.equal(rich.wear, 7.5, '1.4 a wave, kept in quarters');
  const a: Equipment = { id: 1, base: 'ironSword', rarity: 2, level: 1, wear: 20 };
  assert.equal(repairCost({ ...a, glyphs: ['keen', 'mighty'] }), Math.ceil(0.4 * 1.5 * 20 - 1e-9));
  assert.equal(repairCost(a), Math.ceil(0.4 * 20));
});

test('no crowns loop: patching then selling never beats selling; an enchanted piece sells for no more than a plain one', () => {
  for (const rarity of [1, 2, 3, 4] as const)
    for (const level of [1, 8, 20])
      for (let wear = 1; wear < 40; wear += 3) {
        const it: Equipment = { id: 1, base: 'ironSword', rarity, level, wear: Math.min(wear, maxDurability({ rarity, level })) };
        const m = startedMeta(6);
        m.crowns = 1e6;
        m.equipment = [{ ...it }];
        const asIs = sellPrice(it);
        const cost = patchItem(m, 1);
        if (cost) assert.ok(sellPrice(m.equipment[0]) - cost <= asIs, `${rarity} ${level} ${wear}`);
        assert.equal(sellPrice({ ...it, glyphs: ['keen', 'mighty', 'quick'] }), asIs);
        // (and the stall still sells for at least five times what it pays)
        assert.ok(GEAR_PRICE[rarity] >= 5 * sellPrice({ ...it, wear: 0 }));
      }
});

test('the economy\'s prices: gear, chests, and the chests\' gear odds are the design\'s', () => {
  assert.deepEqual(GEAR_PRICE.slice(1, 5), [200, 550, 1600, 4000]);
  assert.deepEqual(SHOP.map((c) => [c.price, c.gearChance]), [[600, 0.15], [2400, 0.6], [9000, 1]]);
});
