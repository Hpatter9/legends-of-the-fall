// SEVEN-SLOT GEAR (docs/notes/gear-runes-design.md, batch 1): the catalogue's seven slots, the move of a save from before (every case of
// section 10), Equip best's search by set, the new `jump` stat, and the 60 bases from before giving exactly what they gave.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import {
  EQUIP_BASES,
  EQUIP_LIST,
  EQUIP_SLOTS,
  MAIN_SCALE,
  LEVEL_STEP,
  RARITY_SCALE,
  bestFor,
  equipBest,
  equipItem,
  equipStats,
  grantEquipment,
  itemStats,
  wornIn,
  type Equipment,
  type NewEquipment,
} from '../src/sim/equipment';
import { OLD_BASES } from '../src/sim/equipBases';
import { GEAR_SETS, SET_OF_BASE, setCounts } from '../src/sim/gearSets';
import { GEAR_V, migrateGear, migrateRunWorn, takeGearNote } from '../src/sim/gearMigrate';
import { place, startBattle, strikeDef } from '../src/sim/battle';
import { UNITS } from '../src/sim/units';
import type { Run } from '../src/sim/run';

const give = (m: Meta, ...items: NewEquipment[]) => items.map((i) => grantEquipment(m, i));
const memory = () => {
  const box: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (box[k] = v), getItem: (k: string) => box[k] ?? null };
};
/** A save as 0.331.0 wrote it: the old three slots and no gear version. */
function oldSave(seed: number, pieces: (NewEquipment & { wear?: number })[], worn: Record<string, Record<string, number>>): Meta {
  const m = startedMeta(seed);
  delete m.gearV;
  m.equipment = pieces.map((p, i) => ({ id: i + 1, base: p.base, rarity: p.rarity, level: p.level, ...(p.wear ? { wear: p.wear } : {}) }));
  m.nextItem = pieces.length + 1;
  m.equipped = worn as Meta['equipped'];
  return m;
}
const reload = (m: Meta): Meta => {
  const s = memory();
  saveMeta(m, s);
  return loadMeta(m.seed, s);
};

test('every base has a slot of the seven and a profile; every slot has its set pieces and ordinary ones', () => {
  for (const b of EQUIP_LIST) {
    assert.ok(EQUIP_SLOTS.includes(b.slot), b.id);
    assert.ok(Object.values(b.main).every((v) => v! > 0), b.id);
  }
  for (const slot of EQUIP_SLOTS) {
    const list = EQUIP_LIST.filter((b) => b.slot === slot);
    assert.equal(list.filter((b) => SET_OF_BASE[b.id]).length, 12, `${slot}: twelve set pieces`);
    assert.equal(list.filter((b) => !SET_OF_BASE[b.id]).length, 15, `${slot}: fifteen ordinary bases`);
  }
  // (a bow's left hand is a quiver: every calling can fill every slot)
  assert.ok(EQUIP_LIST.some((b) => b.slot === 'off' && b.calling === 'shooter'));
});

test('the 60 bases from before give exactly what they gave, at every grade and level (an unmigrated kit fights the same)', () => {
  for (const id of OLD_BASES)
    for (const rarity of [1, 2, 3, 4, 5] as const)
      for (const level of [1, 7, 20]) {
        const s = itemStats({ base: id, rarity, level });
        for (const [k, v] of Object.entries(EQUIP_BASES[id].main) as [string, number][]) {
          if (k === 'range' || k === 'jump') continue;
          const was = v * MAIN_SCALE * RARITY_SCALE[rarity] * (1 + LEVEL_STEP * (level - 1));
          assert.ok(Math.abs((s as unknown as Record<string, number>)[k] - was) < 1e-12, `${id} ${k}`);
        }
      }
  // (a new base in a quiet slot gives less than one in a hand)
  assert.ok(itemStats({ base: 'leatherBelt', rarity: 1, level: 1 }).hp < 0.05 * MAIN_SCALE);
});

test('an old save moves over: weapon to the right hand, armour to the torso, a trinket to its base\'s slot; nothing is lost', () => {
  const m = oldSave(
    3,
    [
      { base: 'runedBlade', rarity: 3, level: 5 },
      { base: 'chainMail', rarity: 2, level: 3, wear: 7 },
      { base: 'circlet', rarity: 1, level: 1 },
      { base: 'bootsOfHaste', rarity: 2, level: 2 },
      { base: 'ironRing', rarity: 4, level: 6, wear: 2.5 },
      { base: 'claymore', rarity: 1, level: 1 },
    ],
    { knight: { weapon: 1, armour: 2, trinket: 3 }, samurai: { trinket: 4 }, archer: { trinket: 5 } },
  );
  const before = m.equipment!.map((x) => x.id);
  const back = reload(m);
  assert.equal(back.gearV, GEAR_V);
  assert.deepEqual(back.equipment!.map((x) => x.id), before, 'every piece is still owned');
  assert.equal(wornIn(back, 'knight', 'main')!.base, 'runedBlade');
  assert.equal(wornIn(back, 'knight', 'torso')!.base, 'chainMail');
  assert.equal(wornIn(back, 'knight', 'head')!.base, 'circlet');
  assert.equal(wornIn(back, 'samurai', 'feet')!.base, 'bootsOfHaste');
  assert.equal(wornIn(back, 'archer', 'acc')!.base, 'ironRing');
  // (Hester's welcome: everything mended, once)
  assert.ok(back.equipment!.every((x) => !x.wear));
  assert.deepEqual(takeGearNote(back, 'knight', () => ''), ['Hester’s welcome: everything mended']);
  // (a second load moves nothing and mends nothing)
  back.equipment![0].wear = 3;
  const again = reload(back);
  assert.equal(again.equipment![0].wear, 3);
  assert.deepEqual(again.equipped, back.equipped);
});

test('two pieces landing in one slot: the trinket stays worn, the other goes to the stash (never sold) and the sheet says so', () => {
  const m = oldSave(4, [{ base: 'grimoire', rarity: 2, level: 4 }, { base: 'scryingOrb', rarity: 3, level: 2 }, { base: 'mageRobe', rarity: 1, level: 1 }], { wizard: { weapon: 1, armour: 3, trinket: 2 } });
  const back = reload(m);
  assert.equal(wornIn(back, 'wizard', 'off')!.base, 'scryingOrb');
  assert.equal(wornIn(back, 'wizard', 'torso')!.base, 'mageRobe');
  assert.equal(back.equipment!.length, 3, 'the Grimoire is kept');
  assert.ok(!Object.values(back.equipped!.wizard!).includes(1), 'and is spare');
  const lines = takeGearNote(back, 'wizard', (id) => (id === 1 ? 'Grimoire' : '?'));
  assert.ok(lines.includes('Moved to your stash: Grimoire'));
  assert.deepEqual(takeGearNote(back, 'wizard', () => ''), [], 'each line shows once');
});

test('a hero wearing a full old set is given a Common fourth piece, so it keeps the set\'s ability; its fight stats are not lower', () => {
  const pieces = [{ base: 'frostbrand', rarity: 2 as const, level: 3 }, { base: 'silkenRobe', rarity: 2 as const, level: 3 }, { base: 'sapphireRing', rarity: 1 as const, level: 2 }];
  const m = oldSave(5, pieces, { samurai: { weapon: 1, armour: 2, trinket: 3 } });
  // (what the three pieces gave before, without the set: the floor its stats must not drop under)
  const floor = pieces.map((p) => itemStats(p, 'samurai'));
  const back = reload(m);
  const worn = EQUIP_SLOTS.map((s) => wornIn(back, 'samurai', s)).filter((x): x is Equipment => !!x);
  assert.equal(worn.length, 4);
  const gift = worn.find((x) => !OLD_BASES.has(x.base))!;
  assert.equal(SET_OF_BASE[gift.base].id, 'frost');
  assert.equal(gift.rarity, 1);
  const s = equipStats(back, 'samurai')!;
  assert.ok(s.abilities.some((a) => a.id === 'deepFreeze'), 'the old three-piece ability is the new four-piece tier');
  for (const k of ['atk', 'atkSpeed', 'crit', 'charge'] as const) assert.ok(s[k] >= floor.reduce((n, x) => n + x[k], 0) - 1e-12, k);
  // (a hero with two old pieces of a set gets no gift; Windrunner had only two)
  const n = oldSave(6, [{ base: 'leatherJerkin', rarity: 1, level: 1 }, { base: 'bootsOfHaste', rarity: 1, level: 1 }, { base: 'frostbrand', rarity: 1, level: 1 }], { knight: { armour: 1, trinket: 2 }, samurai: { weapon: 3 } });
  const nb = reload(n);
  assert.equal(nb.equipment!.length, 3);
});

test('every combination of the old three slots moves without losing a piece or wearing one twice', () => {
  const weapons = ['ironSword', 'grimoire', 'huntersBow'];
  const armours = ['chainMail', 'mageRobe'];
  const trinkets = ['luckyCharm', 'scryingOrb', 'circlet', 'bootsOfHaste', 'vialOfVigor', 'scholarScroll'];
  for (const w of [undefined, ...weapons])
    for (const a of [undefined, ...armours])
      for (const t of [undefined, ...trinkets]) {
        const pieces = [w, a, t].filter((x): x is string => !!x).map((base) => ({ base, rarity: 2 as const, level: 2 }));
        const slots: Record<string, number> = {};
        let id = 1;
        if (w) slots.weapon = id++;
        if (a) slots.armour = id++;
        if (t) slots.trinket = id++;
        const back = reload(oldSave(7, pieces, { knight: slots }));
        assert.equal(back.equipment!.length, pieces.length, `${w} ${a} ${t}: nothing lost`);
        const ids = Object.values(back.equipped?.knight ?? {});
        assert.equal(new Set(ids).size, ids.length);
        // (only the left hand can take two: the Grimoire with a left-hand trinket)
        const clash = w === 'grimoire' && t && EQUIP_BASES[t].slot === 'off';
        assert.equal(ids.length, pieces.length - (clash ? 1 : 0), `${w} ${a} ${t}`);
      }
});

test('a run saved before seven slots finishes as it is: its heroes\' finds move to the new slots', () => {
  const run = { worn: { knight: { weapon: 11, armour: 12, trinket: 13 } }, pack: [{ id: 11, base: 'claymore', rarity: 2, level: 3 }, { id: 12, base: 'chainMail', rarity: 1, level: 3 }, { id: 13, base: 'vialOfVigor', rarity: 1, level: 3 }] } as unknown as Run;
  migrateRunWorn(run);
  assert.deepEqual(run.worn, { knight: { main: 11, torso: 12, belt: 13 } });
  migrateRunWorn(run);
  assert.deepEqual(run.worn, { knight: { main: 11, torso: 12, belt: 13 } }, 'a run already moved is left as it is');
});

test('a fresh save needs no move, and the move never runs twice on the same save', () => {
  const m = startedMeta(9);
  assert.equal(m.gearV, GEAR_V);
  assert.equal(migrateGear(m), false);
});

test('equip best searches by set across seven slots: a full set beats stronger loose pieces when its power is worth it', () => {
  const m = startedMeta(10);
  const frost = GEAR_SETS.find((s) => s.id === 'frost')!;
  // (the whole Winter Court at Rare, and a strong loose piece for some of its slots)
  give(m, ...frost.pieces.map((base) => ({ base, rarity: 2 as const, level: 4 })));
  give(m, { base: 'claymore', rarity: 3, level: 4 }, { base: 'kettleHelm', rarity: 3, level: 4 });
  equipBest(m, 'samurai');
  const bases = EQUIP_SLOTS.map((s) => wornIn(m, 'samurai', s)?.base).filter((b): b is string => !!b);
  assert.equal(bases.length, 7, 'every slot filled');
  assert.ok((setCounts(bases).get(frost) ?? 0) >= 4, 'at least the four-piece tier');
  // (settled and the same every time)
  assert.deepEqual(bestFor(m, 'samurai').slots, {});
  const n = startedMeta(10);
  give(n, ...frost.pieces.map((base) => ({ base, rarity: 2 as const, level: 4 })));
  give(n, { base: 'claymore', rarity: 3, level: 4 }, { base: 'kettleHelm', rarity: 3, level: 4 });
  equipBest(n, 'samurai');
  assert.deepEqual(n.equipped, m.equipped);
});

test('jump: Climber\'s Boots lift a hero a step higher, and gear gives at most one step', () => {
  const m = startedMeta(11);
  const [boots] = give(m, { base: 'climberBoots', rarity: 1, level: 1 });
  equipItem(m, 'knight', boots.id);
  const s = equipStats(m, 'knight')!;
  assert.equal(s.jump, 1);
  const b = startBattle(3, 'orcs');
  assert.ok(place(b, 'knight', 3, 9, undefined, { equip: s }));
  const u = b.units.find((x) => x.def === 'knight')!;
  const plain = startBattle(3, 'orcs');
  place(plain, 'knight', 3, 9);
  const v = plain.units.find((x) => x.def === 'knight')!;
  assert.equal(strikeDef(b, u).jump, strikeDef(plain, v).jump + 1);
  // (the boots and the Peakwarden's two pieces: still one step)
  const [hood, axe] = give(m, { base: 'peakHood', rarity: 1, level: 1 }, { base: 'peakAxe', rarity: 1, level: 1 });
  equipItem(m, 'knight', hood.id);
  equipItem(m, 'knight', axe.id);
  assert.equal(equipStats(m, 'knight')!.jump, 1);
  assert.ok(UNITS.knight.jump >= 1);
});
