import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { ABILITIES, EQUIP_BASES, bestFor, combineAll, combineGroup, combineGroups, combineItems, equipAll, equipBest, equipItem, equipStats, grantEquipment, itemStats, spareEquipment, wornIn, type NewEquipment } from '../src/sim/equipment';
import { GEAR_SETS, SET_OF_BASE, activeTiers, setBonus, setCounts } from '../src/sim/gearSets';

const give = (m: Meta, ...items: NewEquipment[]) => items.map((i) => grantEquipment(m, i));
const store = () => {
  let v = '';
  return { setItem: (_: string, s: string) => (v = s), getItem: () => v };
};
const EMBER = ['dragonboneAxe', 'emberRobe', 'emberAmulet'];

test('the sets: 8 to 12 of them, two or three pieces, one a slot, each base in one set, every ability real', () => {
  assert.ok(GEAR_SETS.length >= 8 && GEAR_SETS.length <= 12);
  const seen = new Set<string>();
  for (const set of GEAR_SETS) {
    assert.ok(set.pieces.length === 2 || set.pieces.length === 3, set.id);
    const slots = set.pieces.map((p) => EQUIP_BASES[p]?.slot);
    assert.ok(slots.every(Boolean), `${set.id} bases exist`);
    assert.equal(new Set(slots).size, slots.length, `${set.id}: one piece a slot`);
    for (const p of set.pieces) {
      assert.ok(!seen.has(p), `${p} is in one set only`);
      seen.add(p);
      assert.equal(SET_OF_BASE[p], set);
    }
    assert.equal(!!set.three, set.pieces.length === 3, `${set.id}: a three-piece tier only for three pieces`);
    for (const t of [set.two, set.three]) if (t?.ability) assert.ok(ABILITIES[t.ability.id], `${set.id}: ${t.ability.id}`);
    assert.ok(set.two.text && (set.two.stats || set.two.ability));
  }
  assert.equal(new Set(GEAR_SETS.map((s) => s.id)).size, GEAR_SETS.length);
  assert.equal(new Set(GEAR_SETS.map((s) => s.name)).size, GEAR_SETS.length);
});

test('one piece gives nothing, two the small bonus, three the strong one on top', () => {
  const ember = GEAR_SETS.find((s) => s.id === 'ember')!;
  assert.deepEqual(setBonus([EMBER[0]]).stats, {});
  assert.equal(setBonus([EMBER[0]]).active.length, 0);
  const two = setBonus(EMBER.slice(0, 2));
  assert.equal(two.stats.atk, 0.05);
  assert.equal(two.abilities.length, 0);
  const three = setBonus(EMBER);
  assert.ok(Math.abs((three.stats.atk ?? 0) - 0.09) < 1e-9, 'the three keeps the two');
  assert.equal(three.abilities[0].id, 'dragonfire');
  assert.equal(activeTiers(ember, 3).length, 2);
  assert.equal(setCounts([...EMBER, 'ironSword']).get(ember), 3);
  // (the same base twice is one piece; bases of different sets do not mix)
  assert.equal(setCounts([EMBER[0], EMBER[0]]).get(ember), 1);
  assert.equal(setBonus([EMBER[0], 'stormStaff']).active.length, 0);
});

test('a hero wearing a set gets its bonus in the fight stats, whatever the grades', () => {
  const m = startedMeta(2);
  const [a, b, c] = give(m, { base: EMBER[0], rarity: 1, level: 1 }, { base: EMBER[1], rarity: 1, level: 1 }, { base: EMBER[2], rarity: 1, level: 1 });
  equipItem(m, 'knight', a.id);
  const one = equipStats(m, 'knight')!;
  const solo = itemStats(a, 'knight');
  assert.equal(one.atk, solo.atk);
  equipItem(m, 'knight', b.id);
  const two = equipStats(m, 'knight')!;
  assert.ok(Math.abs(two.atk - (solo.atk + itemStats(b, 'knight').atk + 0.05)) < 1e-9);
  equipItem(m, 'knight', c.id);
  const three = equipStats(m, 'knight')!;
  assert.ok(three.abilities.some((x) => x.id === 'dragonfire'), 'the three-piece ability');
  // (an ability the piece already carries is not added twice: Common pieces have none, so the Epic axe's own stays alone)
  const n = startedMeta(2);
  const [axe, robe, amulet] = give(n, { base: EMBER[0], rarity: 3, level: 1 }, { base: EMBER[1], rarity: 1, level: 1 }, { base: EMBER[2], rarity: 1, level: 1 });
  for (const it of [axe, robe, amulet]) equipItem(n, 'knight', it.id);
  assert.equal(equipStats(n, 'knight')!.abilities.filter((x) => x.id === 'dragonfire').length, 1);
});

test('equip best weighs a set: it takes the matching pieces over a slightly stronger single one', () => {
  const m = startedMeta(4);
  // (a plain Rare sword beats a Common ember axe alone, but the set's two other pieces make the axe worth wearing)
  give(m, { base: 'ironSword', rarity: 2, level: 2 }, { base: EMBER[0], rarity: 1, level: 1 }, { base: EMBER[1], rarity: 2, level: 1 }, { base: EMBER[2], rarity: 2, level: 1 });
  const plan = bestFor(m, 'knight');
  const axe = m.equipment!.find((x) => x.base === EMBER[0])!;
  assert.equal(plan.slots.weapon, axe.id);
  assert.equal(equipBest(m, 'knight'), 3);
  assert.equal(wornIn(m, 'knight', 'weapon')!.base, EMBER[0]);
  // (again: nothing more to change)
  assert.equal(equipBest(m, 'knight'), 0);
});

test('equip best with no set pieces picks the strongest of each slot as before, and ties go to the older item', () => {
  const m = startedMeta(4);
  const [first, second] = give(m, { base: 'ironSword', rarity: 2, level: 3 }, { base: 'ironSword', rarity: 2, level: 3 });
  equipBest(m, 'knight');
  assert.equal(wornIn(m, 'knight', 'weapon')!.id, first.id);
  assert.notEqual(second.id, first.id);
  const n = startedMeta(4);
  give(n, { base: 'ironSword', rarity: 1, level: 1 }, { base: 'huntersBow', rarity: 4, level: 6 });
  equipBest(n, 'archer');
  assert.equal(wornIn(n, 'archer', 'weapon')!.base, 'huntersBow');
});

test('equip all hands sets out hero by hero and never puts a piece on two heroes', () => {
  const m = startedMeta(6);
  const bases = [...EMBER, 'frostbrand', 'silkenRobe', 'sapphireRing'];
  give(m, ...bases.map((base) => ({ base, rarity: 2 as const, level: 2 })));
  equipAll(m);
  const ids = Object.values(m.equipped ?? {}).flatMap((s) => Object.values(s));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 6);
  // (the strongest-first hero ends with a whole set)
  const full = Object.entries(m.equipped!).filter(([k]) => setCounts(Object.values(m.equipped![k]!).map((id) => m.equipment!.find((x) => x.id === id)!.base)).size > 0);
  assert.ok(full.length >= 1);
  const again = JSON.stringify(m.equipped);
  equipAll(m);
  assert.equal(JSON.stringify(m.equipped), again, 'deterministic and settled');
});

test('combine: three of a base and grade make one of the next grade at the best item level', () => {
  const m = startedMeta(1);
  const [a, b, c, d] = give(m, ...[3, 9, 5, 2].map((level) => ({ base: 'ironSword', rarity: 1 as const, level })));
  assert.equal(combineItems(m, [a.id, b.id]), null, 'two are not enough');
  assert.equal(combineItems(m, [a.id, a.id, b.id]), null, 'three different pieces');
  const made = combineItems(m, [a.id, b.id, c.id])!;
  assert.equal(made.rarity, 2);
  assert.equal(made.level, 9, 'the best item level');
  assert.equal(made.base, 'ironSword');
  assert.deepEqual(m.equipment!.map((x) => x.id).sort(), [d.id, made.id].sort());
  assert.ok(made.id > d.id, 'ids are never reused');
  // (different bases or grades do not mix)
  const n = startedMeta(1);
  const mix = give(n, { base: 'ironSword', rarity: 1, level: 1 }, { base: 'ironSword', rarity: 1, level: 1 }, { base: 'ironSword', rarity: 2, level: 1 }, { base: 'claymore', rarity: 1, level: 1 });
  assert.equal(combineItems(n, mix.slice(0, 3).map((x) => x.id)), null);
  assert.equal(combineGroups(n).length, 0);
});

test('combine takes the best three of a bigger group and never a worn or a Mythic piece', () => {
  const m = startedMeta(1);
  const items = give(m, ...[1, 7, 4, 6, 2].map((level) => ({ base: 'ironSword', rarity: 2 as const, level })));
  equipItem(m, 'knight', items[1].id);
  assert.equal(spareEquipment(m).length, 4);
  assert.equal(combineGroup(m, 'ironSword', 2)!.level, 6, 'the worn Lv 7 is left out; the best spare three give Lv 6');
  assert.ok(m.equipment!.some((x) => x.id === items[1].id), 'the worn one is still there');
  const mythic = give(m, ...[1, 2, 3].map((level) => ({ base: 'claymore', rarity: 5 as const, level })));
  assert.equal(combineItems(m, mythic.map((x) => x.id)), null);
  assert.equal(combineGroup(m, 'claymore', 5), null);
});

test('auto-combine goes up the grades, so a made piece joins the next group', () => {
  const m = startedMeta(1);
  give(m, ...Array.from({ length: 9 }, (_, i) => ({ base: 'ironSword', rarity: 1 as const, level: i + 1 })));
  give(m, { base: 'claymore', rarity: 1, level: 1 }, { base: 'claymore', rarity: 1, level: 1 });
  const made = combineAll(m);
  assert.equal(made.length, 4, 'three Rares, then one Epic');
  const swords = m.equipment!.filter((x) => x.base === 'ironSword');
  assert.equal(swords.length, 1);
  assert.equal(swords[0].rarity, 3);
  assert.equal(swords[0].level, 9);
  assert.equal(m.equipment!.filter((x) => x.base === 'claymore').length, 2, 'two are left alone');
  assert.deepEqual(combineAll(m), []);
});

test('saves: combined and set gear round-trips through a save', () => {
  const m = startedMeta(8);
  give(m, ...Array.from({ length: 3 }, () => ({ base: EMBER[0], rarity: 1 as const, level: 4 })));
  combineAll(m);
  const s = store();
  saveMeta(m, s);
  const back = loadMeta(8, s);
  assert.deepEqual(back.equipment, m.equipment);
  assert.equal(back.equipment![0].rarity, 2);
  assert.equal(back.nextItem, m.nextItem);
});
