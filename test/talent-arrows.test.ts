// TALENT-ARROWS (`docs/notes/guest-hero.md`): the tavern's gold chevron marks a hero with talent points to spend as well as one with a
// rank or an awakening ready; the Upgrades list has a row for its points (its button opens the hero's tree), "Next upgrade" stops at it,
// and "Upgrade all" leaves talents alone (they are choices).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta, type Meta } from '../src/sim/meta';
import { xpFor } from '../src/sim/levels';
import { learn, pointsFree, tierNodes, TREES } from '../src/sim/talents';
import { markReady, nextUpgradeKind, talentList, talentPointsReady, upgradeAll, upgradeReady } from '../src/sim/upgradesReady';
import { ALL_HEROES } from '../src/sim/units';

const fresh = (): Meta => {
  const m = startedMeta(7);
  m.ranked = {};
  m.shards = {};
  return m;
};
/** Two owned heroes with talent trees. */
const twoWithTrees = (m: Meta): [string, string] => {
  const ks = m.unlocked.filter((k) => TREES[k]);
  assert.ok(ks.length >= 2);
  return [ks[0], ks[1]];
};

test('a hero with talent points it can spend is marked; a fresh hero is not', () => {
  const m = fresh();
  const [a, b] = twoWithTrees(m);
  assert.equal(talentPointsReady(m, a), 0);
  assert.equal(markReady(m, a), false);
  m.xp[a] = xpFor(9);
  assert.equal(pointsFree(m, a), talentPointsReady(m, a));
  assert.ok(talentPointsReady(m, a) >= 3);
  assert.ok(markReady(m, a));
  // (no rank or awakening: the old mark says no, the new one yes)
  assert.equal(upgradeReady(m, a), false);
  assert.deepEqual(talentList(m, ALL_HEROES), [{ kind: a, points: talentPointsReady(m, a) }]);
  assert.equal(talentPointsReady(m, b), 0);
  // (a hero not owned is never marked)
  const out = ALL_HEROES.find((k) => !m.unlocked.includes(k) && TREES[k])!;
  m.xp[out] = xpFor(30);
  assert.equal(talentPointsReady(m, out), 0);
});

test('a point that can buy nothing yet is not marked', () => {
  const m = fresh();
  const [a] = twoWithTrees(m);
  const first = tierNodes(a, 1);
  // (the points for the whole first row and one over: the second row costs more than one)
  m.xp[a] = xpFor(15);
  for (const n of first) assert.ok(learn(m, a, n.id));
  assert.equal(pointsFree(m, a), 1);
  assert.equal(talentPointsReady(m, a), 0);
  assert.equal(markReady(m, a), false);
});

test('"Next upgrade" stops at a hero with talent points; "Upgrade all" never spends them', () => {
  const m = fresh();
  const [a, b] = twoWithTrees(m);
  m.xp[b] = xpFor(9);
  assert.equal(nextUpgradeKind(m, m.unlocked, a), b);
  const before = JSON.stringify(m.talents ?? {});
  const done = upgradeAll(m, m.unlocked);
  assert.equal(done.steps.length, 0);
  assert.equal(JSON.stringify(m.talents ?? {}), before);
  assert.ok(talentPointsReady(m, b) > 0);
});
