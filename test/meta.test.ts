import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DUPLICATE_SHARDS, earn, loadMeta, newMeta, pullCost, pullOnce, PITY, PULL10_COST, PULL_COST, RATES, recruit, runCrowns, saveMeta, stageCrowns } from '../src/sim/meta';
import { newRun, summon } from '../src/sim/run';
import { HEROES } from '../src/sim/units';

test('the starting five are unlocked, and crowns are earned', () => {
  const m = newMeta(1);
  assert.deepEqual(m.unlocked, [...HEROES]);
  assert.equal(earn(m, 3, true), stageCrowns(3));
  assert.ok(stageCrowns(4) > stageCrowns(3));
  assert.ok(runCrowns(8) > runCrowns(3));
  assert.equal(m.crowns, stageCrowns(3));
  earn(m, 5, false);
  assert.equal(m.crowns, stageCrowns(3) + runCrowns(5));
});

test('pull costs: ten is cheaper than ten singles, and a poor player gets nothing', () => {
  assert.equal(pullCost(1), PULL_COST);
  assert.equal(pullCost(10), PULL10_COST);
  assert.ok(PULL10_COST < 10 * PULL_COST);
  const m = newMeta(2);
  m.crowns = PULL_COST - 1;
  assert.equal(recruit(m, 1), null);
  assert.equal(m.crowns, PULL_COST - 1);
  m.crowns = PULL10_COST + 5;
  const got = recruit(m, 10)!;
  assert.equal(got.length, 10);
  assert.equal(m.pulls, 10);
  assert.equal(m.crowns, 5);
  assert.equal(got.reduce((n, p) => n + p.shards, 0), Object.values(m.shards).reduce((n, s) => n + s, 0));
});

test('pulls are deterministic', () => {
  const a = newMeta(9);
  const b = newMeta(9);
  const ka = Array.from({ length: 20 }, () => pullOnce(a).kind);
  const kb = Array.from({ length: 20 }, () => pullOnce(b).kind);
  assert.deepEqual(ka, kb);
});

test('rates over many pulls follow the table, and the pity counters cap the dry spells', () => {
  const m = newMeta(5);
  const seen = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let dry = 0;
  let longest = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const p = pullOnce(m);
    seen[p.rarity]++;
    dry = p.rarity >= 4 ? 0 : dry + 1;
    longest = Math.max(longest, dry);
  }
  assert.ok(longest < PITY, `longest dry spell ${longest}`);
  for (const r of [1, 2, 3, 4, 5] as const) assert.ok(Math.abs(seen[r] / N - RATES[r] / 100) < 0.05, `tier ${r}`);
});

test('pity forces a legendary or better by the 30th pull', () => {
  const m = newMeta(3);
  m.dry = PITY - 1;
  assert.ok(pullOnce(m).rarity >= 4);
  assert.equal(m.dry, 0);
});

test('a new kind unlocks; a duplicate gives a shard of it', () => {
  const m = newMeta(4);
  const first = pullOnce(m);
  assert.equal(first.isNew, !(HEROES as readonly string[]).includes(first.kind));
  assert.ok(m.unlocked.includes(first.kind));
  let dup = null;
  for (let i = 0; i < 200 && !dup; i++) {
    const c = m.crowns;
    const p = pullOnce(m);
    if (!p.isNew) dup = { p, c };
  }
  assert.ok(dup);
  assert.equal(dup.p.shards, DUPLICATE_SHARDS);
  assert.equal(m.crowns, dup.c);
  assert.ok(m.shards[dup.p.kind] >= DUPLICATE_SHARDS);
  assert.equal(new Set(m.unlocked).size, m.unlocked.length);
});

test('run summons draw only unlocked kinds', () => {
  const pool = ['knight', 'archer'];
  const r = newRun(21, pool);
  r.gold = 1e6;
  for (let i = 0; i < 40; i++) summon(r);
  assert.ok(r.roster.every((h) => pool.includes(h.kind)));
});

test('meta saves and loads, keeping the starting five', () => {
  const store: Record<string, string> = {};
  const m = newMeta(8);
  m.crowns = 77;
  saveMeta(m, { setItem: (k, v) => void (store[k] = v) });
  const back = loadMeta(1, { getItem: (k) => store[k] ?? null });
  assert.equal(back.crowns, 77);
  assert.equal(back.seed, 8);
  assert.equal(loadMeta(5, { getItem: () => null }).seed, 5);
});
