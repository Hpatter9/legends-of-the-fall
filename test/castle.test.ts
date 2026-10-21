import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING_IDS, BUILDINGS, bonusGold, GOLD_PER_LEVEL, maxLevel, newCastle, nextCost, readCastle, upgrade } from '../src/sim/castle';
import { loadMeta, newMeta, saveMeta } from '../src/sim/meta';
import { place, startBattle, fight, stepBattle } from '../src/sim/battle';
import { newRun, startStage, START_GOLD, gradeBoost } from '../src/sim/run';
import { UNITS } from '../src/sim/units';

const store = () => {
  const d = new Map<string, string>();
  return { getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v) };
};

test('every building has 3 to 5 levels with rising costs', () => {
  for (const id of BUILDING_IDS) {
    const c = BUILDINGS[id].costs;
    assert.ok(c.length >= 3 && c.length <= 5, id);
    for (let i = 1; i < c.length; i++) assert.ok(c[i] > c[i - 1], id);
  }
});

test('upgrading pays the cost, levels up, and stops at the top or when poor', () => {
  const m = newMeta(1);
  m.crowns = 49;
  assert.equal(upgrade(m, 'treasury'), false);
  assert.equal(m.crowns, 49);
  m.crowns = 10000;
  const first = nextCost(m.castle, 'barracks')!;
  assert.equal(upgrade(m, 'barracks'), true);
  assert.equal(m.crowns, 10000 - first);
  assert.equal(m.castle.barracks, 1);
  assert.ok(nextCost(m.castle, 'barracks')! > first);
  while (upgrade(m, 'barracks'));
  assert.equal(m.castle.barracks, maxLevel('barracks'));
  assert.equal(nextCost(m.castle, 'barracks'), null);
  const left = m.crowns;
  assert.equal(upgrade(m, 'barracks'), false);
  assert.equal(m.crowns, left);
});

test('the treasury adds starting gold to a new run', () => {
  const c = { ...newCastle(), treasury: 3 };
  assert.equal(bonusGold(c), 3 * GOLD_PER_LEVEL);
  assert.equal(newRun(5, undefined, c).gold, START_GOLD + 30);
  assert.equal(newRun(5).gold, START_GOLD);
});

test('barracks and armoury strengthen the heroes of a run, not the foes', () => {
  const plain = startStage(newRun(9));
  const run = newRun(9, undefined, { ...newCastle(), barracks: 2, armoury: 2 });
  const b = startStage(run);
  for (const x of [plain, b]) place(x, 'knight', 3, 8, 1, gradeBoost(1));
  const hero = (x: typeof b) => x.units.find((u) => u.side === 'hero')!;
  assert.equal(hero(b).maxHp, Math.round(UNITS.knight.hp * 1.12));
  assert.ok(Math.abs((hero(b).power ?? 1) - 1.1) < 1e-9);
  assert.equal(hero(plain).maxHp, UNITS.knight.hp);
  assert.deepEqual(b.units.filter((u) => u.side === 'foe').map((u) => u.maxHp), plain.units.filter((u) => u.side === 'foe').map((u) => u.maxHp));
});

test('the mage tower fills the mana faster', () => {
  const mana = (castle: ReturnType<typeof newCastle>) => {
    const b = startStage(newRun(4, undefined, castle));
    place(b, 'knight', 3, 8);
    fight(b);
    for (let i = 0; i < 30; i++) stepBattle(b);
    return b.spells.mana;
  };
  const base = mana(newCastle());
  const fast = mana({ ...newCastle(), mageTower: 4 });
  assert.ok(fast > base, `${fast} > ${base}`);
});

test('a plain fight (no castle) is unchanged', () => {
  const a = startBattle(3);
  assert.equal(a.spells.rate, 1);
  assert.equal(a.heroBoost, undefined);
});

test('old saves load with an empty castle; odd levels are clamped; a castle survives a save', () => {
  const s = store();
  s.setItem('legends.meta', JSON.stringify({ seed: 3, crowns: 50, unlocked: ['knight'], pulls: 2, dry: 1 }));
  const m = loadMeta(1, s);
  assert.deepEqual(m.castle, newCastle());
  assert.equal(m.crowns, 50);
  assert.deepEqual(readCastle({ treasury: 99, barracks: -4, armoury: 'x', mageTower: 2.7 }), { treasury: 5, barracks: 0, armoury: 0, mageTower: 2 });
  m.crowns = 1000;
  upgrade(m, 'armoury');
  saveMeta(m, s);
  assert.equal(loadMeta(1, s).castle.armoury, 1);
});
