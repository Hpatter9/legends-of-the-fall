import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta, heroRank, loadMeta, MAX_RANK, pullOnce, rankMult, rankOf, saveMeta, RANK_MULT, type Meta } from '../src/sim/meta';
import { AWAKEN_COSTS, AWAKEN_MULT, AWAKEN_SHARDS, MAX_AWAKEN, OVERFLOW_CROWNS, PASSIVES, SHARD_CAP, awaken, awakenPlan, awakenStats, awakenedOf, canAwaken, readAwakened } from '../src/sim/awaken';
import { ABILITIES } from '../src/sim/equipBases';
import { boostOf } from '../src/sim/run';
import { ALL_HEROES } from '../src/sim/units';
import { buyPoint, canBuyPoint, heroStats, shardsToSpend } from '../src/sim/talents';
import { lookSheet, stepOfRank } from '../src/render/awakenLook';
import { ORE_TRAITS } from '../src/sim/awakenMats';

const store = () => {
  let v = '';
  return { setItem: (_: string, s: string) => (v = s), getItem: () => v };
};
// (these tests are about the shards: the rift ores each step also asks for (AWAKEN-MATS) are given in plenty; `awaken-mats.test.ts` tests them)
const withShards = (n: number, kind = 'knight'): Meta => {
  const m = startedMeta(3);
  m.shards[kind] = n;
  m.ores = Object.fromEntries(ORE_TRAITS.map((t) => [t, 100]));
  return m;
};

test('awakening sits above the top rank: two steps at 16 and 26 shards, using 6 and 10', () => {
  assert.equal(MAX_AWAKEN, 2);
  assert.deepEqual([...AWAKEN_SHARDS], [16, 26]);
  assert.deepEqual([...AWAKEN_COSTS], [6, 10]);
  assert.ok(AWAKEN_SHARDS[0] > 10, 'more than the top rank step');
  // (not before the top rank, not before the shards)
  assert.equal(canAwaken(withShards(15), 'knight'), false);
  assert.equal(canAwaken(withShards(16), 'knight'), true);
  const m = withShards(16);
  assert.equal(awaken(m, 'knight'), 1);
  assert.equal(awakenedOf(m, 'knight'), 1);
  assert.equal(canAwaken(m, 'knight'), false, 'the second step needs 26');
  assert.equal(awaken(m, 'knight'), 0);
  m.shards.knight = 26;
  assert.equal(awaken(m, 'knight'), 2);
  assert.equal(awaken(m, 'knight'), 0, 'no third step');
  assert.equal(awakenPlan(m, 'knight').step, null);
  // (a kind that is not unlocked cannot)
  const locked = startedMeta(1);
  locked.unlocked = locked.unlocked.filter((k) => k !== 'knight');
  locked.shards.knight = 40;
  assert.equal(canAwaken(locked, 'knight'), false);
});

test('an awakening uses shards from the pool the talents buy from, and never lowers the rank', () => {
  const m = withShards(16);
  assert.equal(shardsToSpend(m, 'knight'), 16);
  awaken(m, 'knight');
  assert.equal(shardsToSpend(m, 'knight'), 10);
  assert.equal(rankOf(m, 'knight'), MAX_RANK);
  assert.equal(heroRank(m, 'knight'), MAX_RANK + 1);
  // (the rest still buys three talent points, and no more)
  let bought = 0;
  while (canBuyPoint(m, 'knight')) (buyPoint(m, 'knight'), bought++);
  assert.equal(bought, 3);
  // (a hero whose talents took the shards first has less to awaken with)
  const n = withShards(16);
  while (canBuyPoint(n, 'knight')) buyPoint(n, 'knight');
  assert.equal(shardsToSpend(n, 'knight'), 7);
  assert.equal(canAwaken(n, 'knight'), true);
  n.shards.knight = 16;
  assert.equal(awakenPlan(n, 'knight').free, 7);
});

test('each step makes the hero stronger by AWAKEN_MULT, on top of the ranks', () => {
  assert.ok(Math.abs(rankMult(MAX_RANK) - RANK_MULT ** MAX_RANK) < 1e-9, 'the shard ranks are as before');
  assert.ok(Math.abs(rankMult(5) - RANK_MULT ** 4 * AWAKEN_MULT) < 1e-9);
  assert.ok(Math.abs(rankMult(6) - RANK_MULT ** 4 * AWAKEN_MULT ** 2) < 1e-9);
  assert.ok(rankMult(6) > rankMult(5) && rankMult(5) > rankMult(4));
  const m = withShards(26);
  awaken(m, 'knight');
  awaken(m, 'knight');
  const k = boostOf({ id: 1, kind: 'knight', grade: 1 }, heroRank(m, 'knight'), 1);
  assert.ok(Math.abs((k.hp ?? 0) - rankMult(6)) < 1e-9);
});

test('every hero has its own passive, from a real ability, and no two share one', () => {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const kind of ALL_HEROES) {
    const p = PASSIVES[kind];
    assert.ok(p, `${kind} has a passive`);
    assert.ok(ABILITIES[p.ability], `${kind}: ${p.ability} is an ability`);
    assert.ok(p.text.length > 5);
    ids.add(p.ability);
    names.add(p.name);
  }
  assert.equal(ids.size, ALL_HEROES.length, 'a different ability for each hero');
  assert.equal(names.size, ALL_HEROES.length, 'a different name for each hero');
});

test('the passive switches on at the first step and grows at the second; it reaches the fight through the hero stats', () => {
  const m = withShards(26, 'paladin');
  m.unlocked.push('paladin');
  assert.equal(awakenStats(m, 'paladin'), undefined);
  assert.equal(heroStats(m, 'paladin'), undefined);
  awaken(m, 'paladin');
  const one = awakenStats(m, 'paladin')!.abilities[0];
  assert.equal(one.id, PASSIVES.paladin.ability);
  assert.equal(one.name, PASSIVES.paladin.name);
  assert.equal(heroStats(m, 'paladin')!.abilities.length, 1);
  awaken(m, 'paladin');
  assert.ok(awakenStats(m, 'paladin')!.abilities[0].s > one.s);
});

test('a repeat always has a use: shards until nothing is left to buy, then crowns', () => {
  const m = startedMeta(21);
  let sawCrowns = false;
  for (let i = 0; i < 4000 && !sawCrowns; i++) {
    const before = { ...m.shards };
    const crowns = m.crowns;
    const p = pullOnce(m, { lucky: false });
    if (p.unlock) continue;
    if ((before[p.kind] ?? 0) >= SHARD_CAP) {
      sawCrowns = true;
      assert.equal(p.shards, 0);
      assert.equal(p.crowns, OVERFLOW_CROWNS);
      assert.equal(m.crowns, crowns + OVERFLOW_CROWNS);
      assert.equal(m.shards[p.kind], before[p.kind], 'the shards stop at the cap');
    } else {
      assert.equal(p.shards, 1);
      assert.equal(p.crowns, undefined);
    }
  }
  assert.ok(sawCrowns, 'a hero pulled often enough hit the cap');
  for (const n of Object.values(m.shards)) assert.ok(n <= SHARD_CAP);
});

test('the cap is exactly what the ranks, both steps and the talents can use', () => {
  const m = withShards(SHARD_CAP);
  awaken(m, 'knight');
  awaken(m, 'knight');
  let bought = 0;
  while (canBuyPoint(m, 'knight')) (buyPoint(m, 'knight'), bought++);
  assert.equal(bought, 3);
  assert.ok(shardsToSpend(m, 'knight') >= 0);
});

test('saves: awakening is optional, round-trips, and cannot be more than the shards paid for', () => {
  const old = startedMeta(5);
  old.shards.knight = 12;
  const s = store();
  saveMeta(old, s);
  const back = loadMeta(5, s);
  assert.equal(back.awakened, undefined);
  assert.equal(awakenedOf(back, 'knight'), 0);
  const m = withShards(26);
  awaken(m, 'knight');
  awaken(m, 'knight');
  saveMeta(m, s);
  const again = loadMeta(3, s);
  assert.equal(awakenedOf(again, 'knight'), 2);
  assert.equal(heroRank(again, 'knight'), 6);
  // (a hand-edited save is cut back to what its shards allow, and nonsense dropped)
  assert.deepEqual(readAwakened({ knight: 2, archer: 1, nobody: 2, wizard: 'x', samurai: -1 }, { knight: 17, archer: 3 }), { knight: 1 });
  assert.deepEqual(readAwakened(null, {}), {});
  assert.deepEqual(readAwakened({ knight: 9 }, { knight: 99 }), { knight: 2 });
});

test('the awakened look: no recolour and no colour variant, the top form kept (AWAKEN-002: the class aura marks it)', () => {
  assert.equal(stepOfRank(4), 0);
  assert.equal(stepOfRank(5), 1);
  assert.equal(stepOfRank(6), 2);
  // (the Werewolf no longer turns red: the owner dropped the red sheet with the recolour)
  assert.equal(lookSheet('werewolf', 5, 3), lookSheet('werewolf', 4, 3));
  assert.equal(lookSheet('werewolf', 6, 3), 'hero_res_werewolf_brute');
  assert.equal(lookSheet('paladin', 5, 3), 'hero_res_paladin', 'the top form');
  for (const k of ALL_HEROES) assert.equal(lookSheet(k, 6, 3), lookSheet(k, 4, 3), k);
});
