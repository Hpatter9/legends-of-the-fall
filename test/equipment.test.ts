import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { fight, place, playOut, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { Rng } from '../src/sim/rng';
import { ALL_HEROES, HEROES } from '../src/sim/units';
import { loadMeta, newMeta, saveMeta } from '../src/sim/meta';
import { boostOf } from '../src/sim/run';
import {
  AFFIXES, CALLING_BONUS, EQUIP_BASES, EQUIP_BASE_IDS, MAX_ITEM_LEVEL, QUALITY_WEIGHTS, RARITY_SCALE, SALVAGE_CROWNS, affixCount, callingOf, emptyStats, equipItem, equipStats, grantEquipment,
  grantSampleEquipment, itemStats, rollEquipment, salvageItem, spareEquipment, unequipItem, wearerOf, wornIn, type EquipStats, type NewEquipment,
} from '../src/sim/equipment';
import { readyBattle } from './helpers';

const sword = (rarity: 1 | 2 | 3 | 4 | 5 = 1, level = 1): NewEquipment => ({ base: 'ironSword', rarity, level, affixes: [] });
const stats = (p: Partial<EquipStats>): EquipStats => ({ ...emptyStats(), ...p });

/** A knight (with `eq`) placed on the front row against the skeleton band; the fight is begun. */
function duel(eq?: EquipStats, seed = 3): Battle {
  const b = startBattle(seed);
  let at: [number, number] | undefined;
  for (let u = 0; u < b.board.w && !at; u++) if (standable(tileAt(b.board, u, D - DEPLOY_ROWS))) at = [u, D - DEPLOY_ROWS];
  assert.ok(place(b, 'knight', at![0], at![1], 1, { equip: eq }));
  fight(b);
  return b;
}
const me = (b: Battle) => b.units.find((u) => u.def === 'knight')!;
function events(b: Battle, ticks: number): BattleEvent[] {
  const all: BattleEvent[] = [];
  for (let i = 0; i < ticks && b.phase === 'fight'; i++) all.push(...stepBattle(b));
  return all;
}

test('rolls are deterministic per seed and always a valid item', () => {
  const roll = (seed: number) => Array.from({ length: 40 }, (_, i) => rollEquipment(new Rng(seed + i), { quality: 'gold', armyIndex: i % 4, milestone: i % 3 === 0 }));
  assert.deepEqual(roll(11), roll(11));
  assert.notDeepEqual(roll(11), roll(12));
  for (const it of roll(5)) {
    assert.ok(EQUIP_BASES[it.base]);
    assert.ok(it.rarity >= 1 && it.rarity <= 5 && it.level >= 1 && it.level <= MAX_ITEM_LEVEL);
    assert.equal(it.affixes.length, affixCount(it.rarity));
    assert.equal(new Set(it.affixes).size, it.affixes.length);
    for (const a of it.affixes) assert.ok(EQUIP_BASES[it.base].affixes.includes(a));
  }
});

test('the rarity weights follow the chest quality', () => {
  for (const q of ['bronze', 'silver', 'gold'] as const) assert.equal(Object.values(QUALITY_WEIGHTS[q]).reduce((a, b) => a + b, 0), 100);
  const mean = (q: 'bronze' | 'silver' | 'gold') => {
    const rng = new Rng(99);
    const seen = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6000; i++) seen[rollEquipment(rng, { quality: q }).rarity]++;
    return seen;
  };
  const [bronze, silver, gold] = [mean('bronze'), mean('silver'), mean('gold')];
  assert.equal(bronze[4] + bronze[5], 0);
  assert.ok(bronze[1] > bronze[2] && bronze[2] > bronze[3]);
  assert.ok(gold[5] > 0 && gold[4] > silver[4] && silver[4] > 0);
  assert.ok(gold[1] < silver[1] && silver[1] < bronze[1]);
  // (each count is near its share)
  for (let r = 1; r <= 5; r++) assert.ok(Math.abs(gold[r] / 60 - QUALITY_WEIGHTS.gold[r as 1]) < 2.5, `gold ${r}`);
});

test('later armies and milestones roll higher item levels', () => {
  const avg = (armyIndex: number, milestone = false) => {
    const rng = new Rng(4);
    let n = 0;
    for (let i = 0; i < 400; i++) n += rollEquipment(rng, { quality: 'silver', armyIndex, milestone }).level;
    return n / 400;
  };
  assert.ok(avg(1) > avg(0) + 2 && avg(3) > avg(1) + 5 && avg(0, true) > avg(0) + 1);
  assert.equal(rollEquipment(new Rng(1), { quality: 'gold', armyIndex: 99, milestone: true }).level, MAX_ITEM_LEVEL);
});

test('items grow with rarity and level; a piece for the hero\'s calling is stronger on it', () => {
  for (let r = 2; r <= 5; r++) assert.ok(RARITY_SCALE[r] > RARITY_SCALE[r - 1]);
  assert.ok(itemStats(sword(3)).atk > itemStats(sword(2)).atk);
  assert.ok(itemStats(sword(1, 10)).atk > itemStats(sword(1, 1)).atk);
  const bow: NewEquipment = { base: 'huntersBow', rarity: 2, level: 3, affixes: [] };
  assert.equal(callingOf('archer'), 'shooter');
  assert.equal(callingOf('wizard'), 'caster');
  assert.equal(callingOf('knight'), 'melee');
  assert.ok(Math.abs(itemStats(bow, 'archer').atk / itemStats(bow, 'knight').atk - CALLING_BONUS) < 1e-9);
  assert.equal(itemStats(bow, 'archer').range, 1);
  assert.ok(itemStats(sword(1), 'archer').atk === itemStats(sword(1), 'knight').atk);
  // (affixes ride on Epic and better)
  assert.ok(itemStats({ base: 'ironSword', rarity: 3, level: 1, affixes: ['lifesteal'] }).lifesteal > 0);
  for (const id of EQUIP_BASE_IDS) assert.ok(EQUIP_BASES[id].affixes.every((a) => a in AFFIXES));
});

test('equip, swap, unequip and salvage follow the rules', () => {
  const m = newMeta(1);
  const a = grantEquipment(m, sword(1));
  const b = grantEquipment(m, sword(3));
  assert.notEqual(a.id, b.id);
  assert.deepEqual(spareEquipment(m).map((x) => x.id), [a.id, b.id]);
  assert.ok(equipItem(m, 'knight', a.id));
  assert.equal(wornIn(m, 'knight', 'weapon')?.id, a.id);
  assert.equal(wearerOf(m, a.id), 'knight');
  assert.deepEqual(spareEquipment(m).map((x) => x.id), [b.id]);
  // (one item is never on two heroes: a worn one is not spare)
  assert.equal(equipItem(m, 'samurai', a.id), false);
  assert.equal(equipItem(m, 'samurai', 999), false);
  assert.equal(equipItem(m, 'gunslinger', b.id), false, 'a hero not unlocked cannot wear it');
  // (a swap returns the old piece)
  assert.ok(equipItem(m, 'knight', b.id));
  assert.equal(wornIn(m, 'knight', 'weapon')?.id, b.id);
  assert.deepEqual(spareEquipment(m).map((x) => x.id), [a.id]);
  // (a worn piece can't be salvaged; a spare one pays crowns)
  assert.equal(salvageItem(m, b.id), 0);
  assert.equal(m.crowns, 0);
  assert.equal(salvageItem(m, a.id), SALVAGE_CROWNS[1]);
  assert.equal(m.crowns, SALVAGE_CROWNS[1]);
  assert.equal(m.equipment!.length, 1);
  assert.equal(salvageItem(m, a.id), 0);
  assert.ok(unequipItem(m, 'knight', 'weapon'));
  assert.equal(unequipItem(m, 'knight', 'weapon'), false);
  assert.equal(spareEquipment(m).length, 1);
  // (ids are never reused, even after a salvage)
  assert.ok(grantEquipment(m, sword(1)).id > b.id);
  assert.ok(salvageItem(m, b.id) > SALVAGE_CROWNS[3] - 1);
  assert.ok(grantEquipment(m, sword(1)).id > b.id + 1);
});

test('a slot holds one piece, by the base\'s slot', () => {
  const m = newMeta(1);
  const w = grantEquipment(m, sword(1));
  const ar = grantEquipment(m, { base: 'chainMail', rarity: 2, level: 1, affixes: [] });
  equipItem(m, 'knight', w.id);
  equipItem(m, 'knight', ar.id);
  assert.equal(wornIn(m, 'knight', 'weapon')?.id, w.id);
  assert.equal(wornIn(m, 'knight', 'armour')?.id, ar.id);
  assert.equal(wornIn(m, 'knight', 'trinket'), undefined);
  const total = equipStats(m, 'knight')!;
  assert.ok(total.atk > 0 && total.hp > 0 && total.def > 0);
  assert.equal(equipStats(m, 'samurai'), undefined);
});

test('equipment survives a save, and an old save loads with none', () => {
  const store: Record<string, string> = {};
  const m = newMeta(8);
  grantSampleEquipment(m);
  equipItem(m, 'knight', m.equipment![1].id);
  saveMeta(m, { setItem: (k, v) => void (store[k] = v) });
  const back = loadMeta(8, { getItem: (k) => store[k] ?? null });
  assert.deepEqual(back.equipment, m.equipment);
  assert.deepEqual(back.equipped, m.equipped);
  assert.equal(back.nextItem, m.nextItem);
  // (a save from before equipment)
  const old = JSON.parse(JSON.stringify(newMeta(8)));
  delete old.equipment;
  delete old.equipped;
  delete old.nextItem;
  const loaded = loadMeta(8, { getItem: () => JSON.stringify(old) });
  assert.deepEqual(loaded.equipment, []);
  assert.deepEqual(loaded.equipped, {});
  assert.equal(equipStats(loaded, 'knight'), undefined);
  // (nonsense is dropped: unknown bases, an item on two heroes, the wrong slot)
  const bad = JSON.parse(JSON.stringify(m));
  bad.equipment.push({ id: 77, base: 'nope', rarity: 3, level: 2, affixes: [] }, { id: 78, base: 'ironSword', rarity: 9, level: 999, affixes: ['x', 'burn'] });
  bad.equipped = { knight: { weapon: bad.equipment[1].id, armour: 78 }, samurai: { weapon: bad.equipment[1].id }, ghost: { weapon: 78 } };
  const fixed = loadMeta(8, { getItem: () => JSON.stringify(bad) });
  assert.ok(!fixed.equipment!.some((x) => x.id === 77));
  const clamped = fixed.equipment!.find((x) => x.id === 78)!;
  assert.deepEqual([clamped.rarity, clamped.level, clamped.affixes], [5, MAX_ITEM_LEVEL, ['burn']]);
  assert.deepEqual(fixed.equipped, { knight: { weapon: bad.equipment[1].id } });
});

test('a sword raises the damage dealt, armour cuts the damage taken', () => {
  const firstHit = (b: Battle, side: 'hero' | 'foe') => {
    for (const e of events(b, 400)) if (e.kind === 'hit' && e.src === 'blow' && b.units.find((u) => u.id === e.by)!.side === side) return e;
    throw new Error('no hit');
  };
  const plain = firstHit(duel(), 'hero').dmg;
  assert.ok(firstHit(duel(stats({ atk: 0.5 })), 'hero').dmg > plain);
  const taken = firstHit(duel(), 'foe').dmg;
  assert.ok(firstHit(duel(stats({ def: 6 })), 'foe').dmg < taken);
  assert.ok(firstHit(duel(stats({ guard: 0.3 })), 'foe').dmg < taken);
  // (hp and attack go through the unit's stats)
  const w = duel(stats({ hp: 0.5, atk: 0.5 }));
  const k = w.units.find((u) => u.def === 'knight')!;
  assert.equal(k.maxHp, Math.round(380 * 1.5));
  assert.equal(k.power, 1.5);
});

test('faster blows, crits and longer reach change the fight', () => {
  const swings = (eq?: EquipStats) => { const b = duel(eq); return events(b, 120).filter((e) => e.kind === 'swing' && e.by === me(b).id).length; };
  assert.ok(swings(stats({ atkSpeed: 0.5 })) > swings());
  const b = startBattle(3);
  place(b, 'archer', 3, D - 1, 1, { equip: stats({ range: 2 }) });
  place(b, 'archer', 4, D - 1, 2);
  fight(b);
  const [x, y] = [b.units.find((u) => u.tag === 1)!, b.units.find((u) => u.tag === 2)!];
  assert.equal(x.eq!.range, 2);
  assert.equal(y.eq, undefined);
  const crits = (eq?: EquipStats) => events(duel(eq, 7), 600).filter((e) => e.kind === 'hit' && e.src === 'blow' && e.heavy).length;
  assert.ok(crits(stats({ crit: 1 })) >= crits());
});

test('the affixes fire through the sim\'s own hooks', () => {
  // lifesteal: the wielder mends after its blow
  const hb = duel(stats({ lifesteal: 0.5 }));
  const h = events(hb, 600);
  assert.ok(h.some((e) => e.kind === 'heal' && e.to === me(hb).id), 'lifesteal heals');
  const pb = duel();
  assert.ok(!events(pb, 600).some((e) => e.kind === 'heal' && e.to === me(pb).id));
  // burn: a foe it hit burns
  const b = duel(stats({ burn: 0.3 }));
  let burned = false;
  for (let i = 0; i < 600 && b.phase === 'fight'; i++) {
    stepBattle(b);
    if (b.units.some((u) => u.side === 'foe' && u.dot?.kind === 'burn')) burned = true;
  }
  assert.ok(burned, 'burn sets the foe alight');
  // thorns: a foe that struck it is hurt back
  const tb = duel(stats({ thorns: 0.5 }));
  const t = events(tb, 900);
  assert.ok(t.some((e) => e.kind === 'hit' && e.src === 'skill' && e.by === me(tb).id), 'thorns hit back');
  // a start shield
  const s = duel(stats({ shield: 0.5 }));
  const k = s.units.find((u) => u.def === 'knight')!;
  assert.equal(k.shield?.hp, Math.round(k.maxHp * 0.5));
});

test('a run with no equipment plays out exactly as before', () => {
  const key = (b: Battle) => JSON.stringify([b.phase, b.t, b.units.map((u) => [u.def, u.hp, u.alive, u.power, u.u, u.v])]);
  const a = playOut(readyBattle(21));
  const none = readyBattle(21);
  for (const u of none.units) assert.equal(u.eq, undefined);
  assert.equal(key(playOut(none)), key(a));
  // (an empty set of stats equals no equipment, and boostOf adds nothing without it)
  assert.deepEqual(boostOf({ id: 1, kind: 'knight', grade: 1 }), boostOf({ id: 1, kind: 'knight', grade: 1 }, 0, 1, undefined));
  assert.equal('equip' in boostOf({ id: 1, kind: 'knight', grade: 1 }), false);
  const m = newMeta(1);
  for (const k of ALL_HEROES) assert.equal(equipStats(m, k), undefined);
  assert.equal(HEROES.length, 5);
});

test('worn equipment reaches the boost a run places its hero with', () => {
  const m = newMeta(1);
  equipItem(m, 'knight', grantEquipment(m, sword(4, 5)).id);
  const eq = equipStats(m, 'knight');
  assert.ok(eq && eq.atk > 0);
  const b = startBattle(2);
  place(b, 'knight', 3, D - 1, 1, boostOf({ id: 1, kind: 'knight', grade: 1 }, 0, 1, eq));
  const k = b.units[b.units.length - 1];
  assert.ok(Math.abs(k.power! - (1 + eq!.atk)) < 1e-9);
});
