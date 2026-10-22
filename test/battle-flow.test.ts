import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HEROES } from '../src/sim/units';
import { makeGear } from '../src/sim/gear';
import { equipBestRun } from '../src/sim/runGear';
import { mvpKind, newRecap, noteFightStats, notePayout, recapOf } from '../src/sim/runRecap';
import { BENCH_MAX, benchFull, benched, canRetry, finish, hireBlock, MAX_RETRIES, newRun, recycle, recycleValue, retriesLeft, retryGold, retryWave, setSquad, summon, summonCost, SUMMON_BASE, type Run } from '../src/sim/run';

/** A run with `n` heroes on the bench and plenty of gold, made by recruiting straight in (no merging). */
function benchOf(seed: number, n: number): Run {
  const r = newRun(seed);
  r.gold = 100000;
  r.squad = [];
  let guard = 0;
  while (benched(r).length < n && guard++ < 500) {
    const before = r.roster.length;
    if (!summon(r)) break;
    if (r.roster.length <= before) continue;
  }
  return r;
}

test('the bench holds at most 10: a hire is refused when it is full, and the gold stays', () => {
  const r = benchOf(3, BENCH_MAX);
  assert.equal(benched(r).length, BENCH_MAX);
  assert.ok(benchFull(r));
  const gold = r.gold;
  const summons = r.summons;
  const blocked = hireBlock(r);
  if (blocked === 'bench') {
    assert.equal(summon(r), null);
    assert.equal(r.gold, gold);
    assert.equal(r.summons, summons);
  }
  // (however many hires are tried, the bench never goes past the limit)
  for (let i = 0; i < 60; i++) summon(r);
  assert.ok(benched(r).length <= BENCH_MAX);
});

test('choosing a hero for the squad frees a place on the bench', () => {
  const r = benchOf(5, BENCH_MAX);
  const blockedBefore = hireBlock(r);
  setSquad(r, benched(r)[0].id, true);
  assert.equal(benched(r).length, BENCH_MAX - 1);
  assert.equal(benchFull(r), false);
  assert.ok(blockedBefore === 'bench' || blockedBefore === null);
  assert.equal(hireBlock(r), null);
  assert.ok(summon(r));
});

test('a full bench still lets through a hire that merges three of a kind into one', () => {
  let merged = 0;
  let refused = 0;
  for (let seed = 1; seed <= 60; seed++) {
    // (a full bench of two knights and eight others, and a pool that can only draw a knight)
    const r = newRun(seed);
    r.pool = ['knight'];
    r.gold = 100000;
    r.squad = [];
    r.roster = [];
    const others = HEROES.filter((k) => k !== 'knight');
    for (let i = 0; i < BENCH_MAX; i++) r.roster.push({ id: r.nextId++, kind: i < 2 ? 'knight' : others[i % others.length], grade: i < 2 ? 1 : 3, paid: SUMMON_BASE });
    assert.ok(benchFull(r));
    const block = hireBlock(r);
    if (block === null) {
      assert.ok(summon(r));
      assert.equal(r.roster.length, BENCH_MAX - 1);
      assert.ok(r.roster.some((h) => h.kind === 'knight' && h.grade === 2));
      merged++;
    } else {
      // (a lucky draw comes as grade 2, which two grade-1 knights do not complete)
      assert.equal(block, 'bench');
      assert.equal(summon(r), null);
      assert.equal(r.roster.length, BENCH_MAX);
      refused++;
    }
  }
  assert.ok(merged > 0 && refused > 0, `${merged} merged, ${refused} refused`);
});

test('recycling a hero frees its place on a full bench', () => {
  const r = benchOf(7, BENCH_MAX);
  const h = benched(r)[0];
  assert.ok(recycle(r, h.id) !== null);
  assert.equal(benchFull(r), false);
});

test('a lost wave may be retried twice: same stage, a hire of gold to help, and the count shown', () => {
  const r = newRun(11);
  assert.equal(retriesLeft(r), MAX_RETRIES);
  assert.equal(MAX_RETRIES, 2);
  assert.ok(canRetry(r));
  r.stage = 4;
  r.summons = 3;
  const gold = r.gold;
  const price = summonCost(r);
  assert.equal(retryGold(r), price);
  assert.equal(retryWave(r), price);
  assert.equal(r.gold, gold + price);
  assert.equal(r.stage, 4);
  assert.equal(r.over, false);
  assert.equal(retriesLeft(r), 1);
  assert.ok(retryWave(r) !== null);
  assert.equal(retriesLeft(r), 0);
  assert.equal(canRetry(r), false);
  const g = r.gold;
  assert.equal(retryWave(r), null);
  assert.equal(r.gold, g);
});

test('a retry keeps the next fight\'s buff, and giving up ends the run as before', () => {
  const r = newRun(12);
  r.buff = { hp: 1.2 };
  retryWave(r);
  assert.deepEqual(r.buff, { hp: 1.2 });
  finish(r, false);
  assert.equal(r.over, true);
  assert.equal(canRetry(r), false);
  assert.equal(retryWave(r), null);
});

test('retries are saved with the run and a run without the field has both left', () => {
  const r = newRun(13);
  retryWave(r);
  const back = JSON.parse(JSON.stringify(r)) as Run;
  assert.equal(retriesLeft(back), 1);
  const old = JSON.parse(JSON.stringify(newRun(13))) as Run;
  delete old.retries;
  assert.equal(retriesLeft(old), 2);
});

test('the pack\'s best gear goes on the fielded heroes, strongest first, and the rest stays in the pack', () => {
  const r = newRun(21);
  const [a, b] = r.roster;
  r.squad = [a.id, b.id];
  const low = makeGear(1, 'weapon', 1);
  const mid = makeGear(2, 'weapon', 2);
  const high = makeGear(3, 'weapon', 3);
  const armour = makeGear(4, 'armour', 2);
  a.gear = { weapon: low };
  r.items = [mid, high, armour];
  const changed = equipBestRun(r, [a.id, b.id]);
  assert.equal(changed, 3);
  const weapons = [a, b].map((h) => h.gear?.weapon?.id).sort();
  assert.deepEqual(weapons, [2, 3]);
  // (the worn low piece went back to the pack)
  assert.deepEqual(r.items!.map((g) => g.id), [1]);
  const armoured = [a, b].filter((h) => h.gear?.armour?.id === 4);
  assert.equal(armoured.length, 1);
  // (a second go changes nothing)
  assert.equal(equipBestRun(r, [a.id, b.id]), 0);
});

test('equipping the best leaves heroes not named alone, and no piece is on two heroes', () => {
  const r = newRun(22);
  r.gold = 1000;
  summon(r);
  const [a, b, c] = r.roster;
  const mine = makeGear(1, 'charm', 3);
  c.gear = { charm: mine };
  r.items = [makeGear(2, 'charm', 1), makeGear(3, 'charm', 2)];
  equipBestRun(r, [a.id, b.id]);
  assert.equal(c.gear?.charm?.id, 1);
  const worn = [a, b, c].flatMap((h) => Object.values(h.gear ?? {}).map((g) => g.id));
  const all = [...worn, ...(r.items ?? []).map((g) => g.id)];
  assert.equal(new Set(all).size, all.length);
  assert.equal(all.length, 3);
});

test('the run\'s recap adds up the waves: time, wins, per-kind figures with the highest grade, XP, levels, crowns and chests', () => {
  const r = newRun(31);
  noteFightStats(r, [{ id: 1, kind: 'knight', dealt: 100, taken: 40, healed: 0, kills: 2 }, { id: 2, kind: 'cleric', dealt: 10, taken: 5, healed: 80, kills: 0 }], 30000, true, { knight: 1, cleric: 2 });
  noteFightStats(r, [{ id: 1, kind: 'knight', dealt: 50, taken: 10, healed: 0, kills: 1 }], 20000, false, { knight: 2 });
  const rc = recapOf(r);
  assert.equal(rc.fights, 2);
  assert.equal(rc.cleared, 1);
  assert.equal(rc.ms, 50000);
  assert.deepEqual(rc.heroes.knight, { dealt: 150, taken: 50, healed: 0, kills: 3, grade: 2 });
  assert.equal(rc.heroes.cleric.healed, 80);
  assert.equal(mvpKind(rc), 'knight');
  notePayout(r, { knight: 30 }, [{ kind: 'knight', from: 2, to: 3 }], 5, 1);
  notePayout(r, { knight: 20, cleric: 10 }, [{ kind: 'knight', from: 3, to: 4 }], 2, 0);
  assert.deepEqual(rc.xp, { knight: 50, cleric: 10 });
  assert.deepEqual(rc.levels.knight, [2, 4]);
  assert.equal(rc.crowns, 7);
  assert.equal(rc.chests, 1);
  assert.equal(mvpKind(newRecap()), null);
});

test('the run\'s books count gold earned (waves, recycles, retries) and spent (hires)', () => {
  const r = newRun(32);
  r.gold = 500;
  const price = summonCost(r);
  summon(r);
  assert.equal(recapOf(r).spent, price);
  const back = recycle(r, r.roster[0].id)!;
  assert.equal(back, recycleValue(r) === back ? back : recycleValue(r));
  const rc = recapOf(r);
  assert.equal(rc.earned, back);
  const retry = retryWave(r)!;
  assert.equal(rc.earned, back + retry);
  const before = r.gold;
  finish(r, true, 0);
  assert.equal(rc.earned, back + retry + (r.gold - before));
});

test('a recap survives a save: JSON in and out, and a run without one has none', () => {
  const r = newRun(33);
  assert.equal(r.recap, undefined);
  noteFightStats(r, [{ id: 1, kind: 'knight', dealt: 1, taken: 0, healed: 0, kills: 0 }], 1000, true);
  const back = JSON.parse(JSON.stringify(r)) as Run;
  assert.deepEqual(back.recap, r.recap);
});
