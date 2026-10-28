import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chestSeed, openAll, openChest, peekChest, bestChest, rollChest, sumLoot } from '../src/sim/armyStars';
import { ARMIES } from '../src/sim/armies';
import { buyChest, peekShopChest } from '../src/sim/chestShop';
import { loadMeta, newMeta, pickStarter, saveMeta, type Meta } from '../src/sim/meta';
import { levelOf, MAX_LEVEL, xpFor } from '../src/sim/levels';
import { canUseTome, readTomes, rollTomes, TOME_DROPS, TOMES, tomesOf, tomeTotal, useTome, type TomeChest } from '../src/sim/tomes';

const fresh = (seed: number): Meta => {
  const m = newMeta(seed);
  pickStarter(m, 0);
  return m;
};
const DAY = 20261101;
const store = () => {
  const data: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (data[k] = v), getItem: (k: string) => data[k] ?? null, data };
};
/** A stash of every kind of chest: army milestones (3, 5, 10, 11), first clears, tower chests and dailies. */
const filled = (seed: number): Meta => {
  const m = fresh(seed);
  ARMIES.slice(0, 4).forEach((a, i) => {
    for (const at of [3, 5, 10]) m.stash.push({ army: a.id, at, tier: i % 3, seed: chestSeed(m.seed, a, at) });
    m.stash.push({ army: a.id, at: 5, tier: 1, seed: 900 + i, first: true });
    m.stash.push({ army: a.id, at: 3, tier: 0, seed: 700 + i, tower: true });
  });
  m.stash.push({ army: ARMIES[5].id, at: 11, tier: 4, seed: 4242 });
  m.stash.push({ army: 'daily', at: 3, tier: 0, seed: 31337, daily: DAY, bonus: 2 });
  m.stash.push({ army: 'daily', at: 3, tier: 0, seed: 31338, daily: DAY + 1, bonus: 0 });
  return m;
};
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

test('the tomes are sized on the level curve: a small is a fight, a medium about level 20 to 21, a large several levels near 30', () => {
  assert.equal(TOMES.small.xp, 250);
  // (level 21 costs 4,800 over level 20)
  assert.ok(Math.abs(TOMES.medium.xp - (xpFor(21) - xpFor(20))) <= 500);
  // (from level 27 a large reaches 30; from 30 it is about one more level)
  assert.equal(levelOf(xpFor(27) + TOMES.large.xp), 29);
  assert.ok(levelOf(xpFor(27) + TOMES.large.xp + 200) >= 30);
  assert.equal(levelOf(xpFor(30) + TOMES.large.xp), 30);
  assert.ok(TOMES.small.xp < TOMES.medium.xp && TOMES.medium.xp < TOMES.large.xp);
});

test('tome drops are deterministic for a chest, and a bigger chest holds more XP in tomes', () => {
  const xpOf = (t: ReturnType<typeof rollTomes>) => (t.small ?? 0) * TOMES.small.xp + (t.medium ?? 0) * TOMES.medium.xp + (t.large ?? 0) * TOMES.large.xp;
  for (const kind of Object.keys(TOME_DROPS) as TomeChest[])
    for (let s = 0; s < 40; s++) assert.deepEqual(rollTomes(s * 977, kind, 1), rollTomes(s * 977, kind, 1));
  const mean = (kind: TomeChest) => {
    let n = 0;
    for (let s = 0; s < 2000; s++) n += xpOf(rollTomes(s * 7919 + 1, kind));
    return n / 2000;
  };
  const [bronze, silver, gold, mythic] = (['bronze', 'silver', 'gold', 'mythic'] as const).map(mean);
  assert.ok(bronze < silver && silver < gold && gold < mythic, `${bronze} ${silver} ${gold} ${mythic}`);
  // (every chest holds at least one tome; a daily's bonus stars add smalls)
  for (let s = 0; s < 200; s++) for (const kind of Object.keys(TOME_DROPS) as TomeChest[]) assert.ok(Object.values(rollTomes(s, kind)).reduce((a, b) => a + (b ?? 0), 0) >= 1);
  assert.equal((rollTomes(5, 'daily', 2).small ?? 0) - (rollTomes(5, 'daily', 0).small ?? 0), 2);
});

test('a chest still pays its crowns, stones and gear as before, and its tomes on top', () => {
  const m = filled(11);
  const before = clone(m);
  for (let i = 0; i < m.stash.length; i++) {
    const c = m.stash[i];
    const loot = peekChest(m, i)!;
    if (c.daily === undefined) {
      const roll = rollChest(c.seed, ARMIES.find((a) => a.id === c.army)!, c.at, c.tier);
      assert.equal(loot.items.find((it) => it.type === 'crowns')!.n, roll.crowns);
      assert.equal(loot.items.filter((it) => it.type === 'gear').length, roll.gear.length);
    }
    assert.ok(loot.items.some((it) => it.type === 'stones'));
    assert.ok(loot.items.some((it) => it.type === 'tomes'), 'every chest holds a tome');
  }
  // (peeking changes nothing)
  assert.deepEqual(m, before);
  const loot = openChest(m, 0)!;
  const got = sumLoot([loot]).tomes;
  for (const size of ['small', 'medium', 'large'] as const) assert.equal(tomesOf(m, size), got[size] ?? 0);
});

test('a shop chest holds tomes too, the same on a peek and a buy, and its gear is unchanged by them', () => {
  for (const kind of ['bronze', 'silver', 'gold'] as const) {
    const m = fresh(3);
    m.crowns = 100000;
    const peek = peekShopChest(m, kind);
    const got = buyChest(m, kind, DAY)!;
    assert.deepEqual(got, peek);
    assert.ok(got.items.some((it) => it.type === 'tomes'));
    assert.ok(tomeTotal(m) >= 1);
  }
});

test('Open all gives exactly what opening the chests one by one on the cart gives, in the same order', () => {
  for (const seed of [1, 2, 99]) {
    const a = filled(seed);
    const b = clone(a);
    const one: ReturnType<typeof openChest>[] = [];
    while (b.stash.length) one.push(openChest(b, bestChest(b.stash)));
    const all = openAll(a);
    assert.deepEqual(all, one);
    assert.deepEqual(a, b);
    assert.equal(a.stash.length, 0);
    // (and the totals do not depend on the order: opening oldest first pays the same crowns, stones and tomes)
    const c = filled(seed);
    while (c.stash.length) openChest(c, 0);
    assert.equal(c.crowns, a.crowns);
    assert.equal(c.stones, a.stones);
    assert.deepEqual(c.tomes, a.tomes);
    assert.equal(c.equipment!.length, a.equipment!.length);
  }
});

test('the Open all summary adds up the chests and puts the best gear first', () => {
  const m = filled(7);
  const crowns = m.crowns;
  const stones = m.stones ?? 0;
  const loots = openAll(m);
  const sum = sumLoot(loots);
  assert.equal(sum.chests, loots.length);
  assert.equal(sum.crowns, m.crowns - crowns);
  assert.equal(sum.stones, (m.stones ?? 0) - stones);
  assert.deepEqual(sum.tomes, m.tomes);
  assert.equal(sum.gear.length, m.equipment!.length);
  for (let i = 1; i < sum.gear.length; i++) {
    const [p, q] = [sum.gear[i - 1], sum.gear[i]];
    assert.ok(p.rarity! > q.rarity! || (p.rarity === q.rarity && p.equip!.level >= q.equip!.level));
  }
  assert.deepEqual(openAll(m), []);
});

test('a tome adds its XP to one owned hero and is spent; the level-up is reported', () => {
  const m = fresh(4);
  const kind = m.unlocked[0];
  m.tomes = { small: 1, medium: 2 };
  const u = useTome(m, kind, 'medium')!;
  assert.equal(u.gain, TOMES.medium.xp);
  assert.equal(u.lost, 0);
  assert.equal(m.xp[kind], TOMES.medium.xp);
  assert.deepEqual(u.up, { kind, from: 1, to: levelOf(TOMES.medium.xp) });
  assert.equal(tomesOf(m, 'medium'), 1);
  // (none held, or a hero not owned: nothing happens)
  assert.equal(useTome(m, kind, 'large'), null);
  assert.equal(useTome(m, 'nobody', 'small'), null);
  assert.equal(tomesOf(m, 'small'), 1);
  useTome(m, kind, 'small');
  assert.equal(m.tomes!.small, undefined);
  // (a small tome that does not reach a level reports none)
  m.tomes = { small: 1 };
  m.xp[kind] = xpFor(40);
  assert.equal(useTome(m, kind, 'small')!.up, null);
});

test('a tome stops at the level cap: the rest is lost, and a hero at the cap cannot read one', () => {
  const m = fresh(4);
  const kind = m.unlocked[0];
  m.tomes = { large: 2 };
  m.xp[kind] = xpFor(MAX_LEVEL) - 1000;
  const u = useTome(m, kind, 'large')!;
  assert.equal(u.gain, 1000);
  assert.equal(u.lost, TOMES.large.xp - 1000);
  assert.equal(m.xp[kind], xpFor(MAX_LEVEL));
  assert.deepEqual(u.up, { kind, from: MAX_LEVEL - 1, to: MAX_LEVEL });
  assert.equal(canUseTome(m, kind, 'large'), false);
  assert.equal(useTome(m, kind, 'large'), null);
  assert.equal(tomesOf(m, 'large'), 1);
});

test('tomes save and load; an old save without them loads with none, and a bad count is dropped', () => {
  const s = store();
  const m = fresh(9);
  m.tomes = { small: 3, large: 1 };
  saveMeta(m, s);
  assert.deepEqual(loadMeta(1, s).tomes, { small: 3, large: 1 });
  // (a save from before the tomes)
  const old = fresh(9);
  const raw = JSON.parse(JSON.stringify(old));
  delete raw.tomes;
  const s2 = store();
  saveMeta(raw as Meta, s2);
  const back = loadMeta(1, s2);
  assert.equal(back.tomes, undefined);
  assert.equal(tomeTotal(back), 0);
  assert.deepEqual(back.stash, old.stash);
  assert.equal(readTomes({ small: -2, medium: 'x', large: 2.7 })?.large, 2);
  assert.equal(readTomes({ small: 0 }), undefined);
  assert.equal(readTomes(null), undefined);
});
