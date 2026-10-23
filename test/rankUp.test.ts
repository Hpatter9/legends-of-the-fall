// Ranking up is the player's choice (docs/notes/hero-progress.md): shards earn a rank, a tap takes it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_RANK, RANK_MULT, RANK_SHARDS, heroRank, loadMeta, newMeta, rankMult, rankOf, saveMeta, startedMeta, takenRank, type Meta } from '../src/sim/meta';
import { canRankUp, kindsToRank, nextRank, rankPlan, rankUp, rankWaiting, readyToRise } from '../src/sim/rankUp';
import { awaken, canAwaken } from '../src/sim/awaken';
import { boostOf } from '../src/sim/run';
import { HEROES } from '../src/sim/units';

const chosen = (): Meta => {
  const m = startedMeta(7);
  m.ranked = {};
  return m;
};
const store = () => {
  let raw = '';
  return { setItem: (_: string, v: string) => (raw = v), getItem: () => raw };
};

test('shards earn a rank but it is not taken until the player taps', () => {
  const m = chosen();
  m.shards.knight = RANK_SHARDS[1];
  assert.equal(rankOf(m, 'knight'), 2, 'the shards have earned rank 2');
  assert.equal(takenRank(m, 'knight'), 0);
  assert.equal(heroRank(m, 'knight'), 0, 'the fight sees no rank yet');
  assert.equal(rankWaiting(m, 'knight'), 2);
  assert.ok(canRankUp(m, 'knight') && readyToRise(m, 'knight'));
  assert.deepEqual(kindsToRank(m, HEROES), ['knight']);
  assert.equal(rankUp(m, 'knight'), 1);
  assert.equal(heroRank(m, 'knight'), 1);
  assert.equal(rankUp(m, 'knight'), 2);
  assert.equal(rankUp(m, 'knight'), 0, 'nothing more is waiting');
  assert.equal(nextRank(m, 'knight'), null);
  assert.equal(heroRank(m, 'knight'), 2);
});

test('a rank gives hp and attack through the multiplier, and only once taken', () => {
  const m = chosen();
  m.shards.archer = RANK_SHARDS[0];
  const before = boostOf({ id: 1, kind: 'archer', grade: 1 }, heroRank(m, 'archer'), 1);
  rankUp(m, 'archer');
  const after = boostOf({ id: 1, kind: 'archer', grade: 1 }, heroRank(m, 'archer'), 1);
  assert.ok(Math.abs((after.hp ?? 0) / (before.hp ?? 1) - RANK_MULT) < 1e-9);
  assert.ok(RANK_MULT > 1.05 && RANK_MULT <= 1.1, 'a nice bonus, within the owner\'s range');
  const plan = rankPlan(m, 'archer');
  assert.equal(plan, null);
  m.shards.archer = RANK_SHARDS[1];
  const p = rankPlan(m, 'archer')!;
  assert.equal(p.to, 2);
  assert.ok(Math.abs(p.after / p.before - RANK_MULT) < 1e-9);
});

test('a hero not owned, or with nothing earned, has no rank to take', () => {
  const m = chosen();
  assert.equal(rankUp(m, 'knight'), 0);
  m.shards.tyrant = 10;
  assert.equal(canRankUp(m, 'tyrant'), false, 'not owned');
});

test('awakening needs the top rank taken, not just earned', () => {
  const m = chosen();
  m.shards.knight = 40;
  assert.equal(canAwaken(m, 'knight'), false);
  for (let i = 0; i < MAX_RANK; i++) rankUp(m, 'knight');
  assert.equal(takenRank(m, 'knight'), MAX_RANK);
  assert.ok(canAwaken(m, 'knight'));
  assert.equal(awaken(m, 'knight'), 1);
  assert.ok(Math.abs(rankMult(heroRank(m, 'knight')) - RANK_MULT ** MAX_RANK * 1.08) < 1e-9);
});

test('an old save keeps the ranks it had; shards beyond them wait for the tap', () => {
  const m = startedMeta(3);
  m.shards.knight = RANK_SHARDS[2];
  m.shards.archer = RANK_SHARDS[0];
  delete m.ranked;
  const back = loadMeta(3, { getItem: () => JSON.stringify(m) });
  assert.equal(takenRank(back, 'knight'), 3);
  assert.equal(takenRank(back, 'archer'), 1);
  // later shards are not taken for the player
  back.shards.knight = RANK_SHARDS[3];
  assert.equal(takenRank(back, 'knight'), 3);
  assert.equal(rankWaiting(back, 'knight'), 1);
  const s = store();
  saveMeta(back, s);
  const again = loadMeta(3, s);
  assert.equal(takenRank(again, 'knight'), 3);
  assert.equal(rankUp(again, 'knight'), 4);
});

test('a new save starts with no ranks taken, and a started meta (tests and tools) counts every earned rank', () => {
  assert.deepEqual(newMeta(1).ranked, {});
  const m = startedMeta(1);
  m.shards.knight = 6;
  assert.equal(takenRank(m, 'knight'), 3);
  assert.equal(canRankUp(m, 'knight'), false);
});

test('a saved rank beyond the shards is cut back to what they earned', () => {
  const m = chosen();
  m.shards.knight = 1;
  m.ranked = { knight: 4 };
  const back = loadMeta(1, { getItem: () => JSON.stringify(m) });
  assert.equal(takenRank(back, 'knight'), 1);
});
