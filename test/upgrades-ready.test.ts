// The tavern's "upgrade ready" marks and its quick Upgrades list (TAVERN-RANKUP): what each hero can rise by now, the hop to the
// next one, and "Upgrade all", all through the rank and awakening rules' own functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_RANK, RANK_SHARDS, startedMeta, takenRank, type Meta } from '../src/sim/meta';
import { readyToRise } from '../src/sim/rankUp';
import { AWAKEN_COSTS, AWAKEN_SHARDS, awakenedOf } from '../src/sim/awaken';
import { AWAKEN_ORES, oreOf, oresOf } from '../src/sim/awakenMats';
import { ALL_HEROES } from '../src/sim/units';
import { nextUpgradeKind, planUpgradeAll, takeUpgrade, upgradeAll, upgradeList, upgradeOf, upgradeReady } from '../src/sim/upgradesReady';

const fresh = (): Meta => {
  const m = startedMeta(7);
  m.ranked = {};
  m.shards = {};
  return m;
};
/** Two owned heroes of one class (so they share its rift ore). */
const sameClass = (): [string, string] => {
  for (const a of ALL_HEROES)
    for (const b of ALL_HEROES) if (a !== b && oreOf(a) && oreOf(a) === oreOf(b)) return [a, b];
  throw new Error('no two heroes share a class');
};
/** A hero at the top rank with the shards for its first awakening. */
const atTop = (m: Meta, kind: string): void => {
  if (!m.unlocked.includes(kind)) m.unlocked.push(kind);
  m.shards[kind] = Math.max(RANK_SHARDS[MAX_RANK - 1], AWAKEN_SHARDS[0]) + AWAKEN_COSTS[0];
  m.ranked![kind] = MAX_RANK;
};

test('a hero with an earned rank is ready, with nothing used up; one with nothing earned is not', () => {
  const m = fresh();
  const [a, b] = m.unlocked;
  m.shards[a] = RANK_SHARDS[1];
  const u = upgradeOf(m, a)!;
  assert.equal(u.what, 'rank');
  assert.equal(u.to, 1);
  assert.ok(u.can && upgradeReady(m, a));
  assert.equal(upgradeOf(m, b), null);
  assert.equal(upgradeReady(m, b), false);
  // (the same answer as the Heroes tab's badge, for every hero)
  for (const k of ALL_HEROES) assert.equal(upgradeReady(m, k), readyToRise(m, k), k);
});

test('a hero not owned is never ready, however many shards it has', () => {
  const m = fresh();
  const out = ALL_HEROES.find((k) => !m.unlocked.includes(k))!;
  m.shards[out] = 99;
  assert.equal(upgradeOf(m, out), null);
});

test('an awakening short of its ores is listed but not ready; with the ores it is', () => {
  const m = fresh();
  const [a] = sameClass();
  atTop(m, a);
  const short = upgradeOf(m, a)!;
  assert.equal(short.what, 'awaken');
  assert.equal(short.can, false);
  assert.equal(upgradeReady(m, a), false);
  assert.ok(upgradeList(m, ALL_HEROES).some((u) => u.kind === a && !u.can));
  m.ores = { [short.ore]: AWAKEN_ORES[0] };
  const u = upgradeOf(m, a)!;
  assert.ok(u.can);
  assert.equal(u.oreCost, AWAKEN_ORES[0]);
  assert.deepEqual(takeUpgrade(m, a), { kind: a, what: 'awaken', n: 1 });
  assert.equal(awakenedOf(m, a), 1);
  assert.equal(oresOf(m, u.ore), 0);
});

test('the list puts the ready ones first, in the order given', () => {
  const m = fresh();
  const [x] = sameClass();
  atTop(m, x);
  const [a, b] = m.unlocked.filter((k) => k !== x);
  m.shards[b] = RANK_SHARDS[0];
  m.shards[a] = RANK_SHARDS[0];
  const list = upgradeList(m, [x, b, a]);
  assert.deepEqual(list.map((u) => u.kind), [b, a, x]);
  assert.deepEqual(list.map((u) => u.can), [true, true, false]);
});

test('the hop goes to the next hero with an upgrade ready, round the end, never to itself', () => {
  const m = fresh();
  const kinds = m.unlocked.slice(0, 4);
  m.shards[kinds[1]] = RANK_SHARDS[0];
  m.shards[kinds[3]] = RANK_SHARDS[0];
  assert.equal(nextUpgradeKind(m, kinds, kinds[0]), kinds[1]);
  assert.equal(nextUpgradeKind(m, kinds, kinds[1]), kinds[3]);
  assert.equal(nextUpgradeKind(m, kinds, kinds[3]), kinds[1], 'round from the end');
  takeUpgrade(m, kinds[1]);
  assert.equal(nextUpgradeKind(m, kinds, kinds[3]), null, 'no other hero is ready');
});

test('Upgrade all takes every rank waiting, then an awakening, and the plan matches without changing the meta', () => {
  const m = fresh();
  const [a, b] = m.unlocked;
  m.shards[a] = RANK_SHARDS[2]; // three ranks waiting
  m.shards[b] = RANK_SHARDS[0];
  const before = JSON.stringify(m);
  const plan = planUpgradeAll(m, m.unlocked);
  assert.equal(JSON.stringify(m), before, 'the plan changes nothing');
  assert.equal(plan.ranks, 4);
  assert.deepEqual(plan.heroes, [a, b]);
  const done = upgradeAll(m, m.unlocked);
  assert.deepEqual(done, plan);
  assert.equal(takenRank(m, a), 3);
  assert.equal(takenRank(m, b), 1);
  assert.equal(upgradeAll(m, m.unlocked).steps.length, 0, 'nothing is left');
});

test('Upgrade all pays two heroes of one class from its ores in order, and stops when they run out', () => {
  const m = fresh();
  const [a, b] = sameClass();
  atTop(m, a);
  atTop(m, b);
  const ore = oreOf(a)!.trait;
  m.ores = { [ore]: AWAKEN_ORES[0] };
  assert.ok(upgradeReady(m, a) && upgradeReady(m, b), 'each could be paid alone');
  const done = upgradeAll(m, [b, a]);
  assert.deepEqual(done.steps, [{ kind: b, what: 'awaken', n: 1 }]);
  assert.equal(done.awakenings, 1);
  assert.equal(done.shards, AWAKEN_COSTS[0]);
  assert.deepEqual(done.ores, { [ore]: AWAKEN_ORES[0] });
  assert.equal(upgradeReady(m, a), false, 'the second is now short of ore');
});
