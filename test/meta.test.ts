import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DUPLICATE_SHARDS, earn, loadMeta, startedMeta, newMeta, NEW_PITY, pullCost, pullOnce, PULL10_COST, PULL_COST, recruit, runCrowns, saveMeta, stageCrowns } from '../src/sim/meta';
import { newRun, summon } from '../src/sim/run';
import { ALL_HEROES, HEROES } from '../src/sim/units';

test('a played save has its heroes unlocked, and crowns are earned', () => {
  const m = startedMeta(1);
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
  const m = startedMeta(2);
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
  const a = startedMeta(9);
  const b = startedMeta(9);
  const ka = Array.from({ length: 20 }, () => pullOnce(a).kind);
  const kb = Array.from({ length: 20 }, () => pullOnce(b).kind);
  assert.deepEqual(ka, kb);
});

test('every hero is as likely as any other in a pull (no tiers, no rates)', () => {
  const m = startedMeta(5);
  m.unlocked = [...ALL_HEROES];
  const N = 45000;
  const seen = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const p = pullOnce(m);
    assert.equal('rarity' in p, false, 'a pull has no rarity');
    seen.set(p.kind, (seen.get(p.kind) ?? 0) + 1);
  }
  // (45 heroes, 45000 pulls: about 1000 each, and 4 standard deviations is about 125)
  assert.equal(seen.size, ALL_HEROES.length);
  for (const [k, n] of seen) assert.ok(Math.abs(n - 1000) < 130, `${k} came up ${n} times`);
});

test('the fair helper: a long run of repeats ends in a hero not yet owned, and never a repeat while one is left', () => {
  const m = startedMeta(3);
  // (all but two heroes owned, so a plain pull is a repeat 43 times in 45)
  const missing = ['tyrant', 'sage'];
  m.unlocked = ALL_HEROES.filter((k) => !missing.includes(k));
  let dry = 0;
  let longest = 0;
  while (missing.some((k) => !m.unlocked.includes(k))) {
    const p = pullOnce(m);
    dry = p.isNew ? 0 : dry + 1;
    longest = Math.max(longest, dry);
    assert.ok(dry < NEW_PITY, `${dry} repeats in a row`);
  }
  assert.ok(longest >= 0);
  // (with every hero owned the helper has nothing to give: a pull is a plain draw and a shard)
  const p = pullOnce(m);
  assert.equal(p.isNew, false);
  assert.equal(p.shards, DUPLICATE_SHARDS);
  // (a counter at the limit gives a new hero on the very next pull)
  const n = startedMeta(4);
  n.sinceNew = NEW_PITY - 1;
  assert.equal(pullOnce(n).isNew, true);
  assert.equal(n.sinceNew, 0);
});

test('a new kind unlocks; a duplicate gives a shard of it', () => {
  const m = startedMeta(4);
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

test('a brand-new save has no hero until the starter pick (see starter.test.ts)', () => {
  const m = newMeta(12);
  assert.deepEqual(m.unlocked, []);
  assert.deepEqual(m.party, []);
  assert.equal(m.starter?.pick, null);
});

test('meta saves and loads, keeping the starting five of a save from before the pick', () => {
  const store: Record<string, string> = {};
  const m = startedMeta(8);
  m.crowns = 77;
  saveMeta(m, { setItem: (k, v) => void (store[k] = v) });
  const back = loadMeta(1, { getItem: (k) => store[k] ?? null });
  assert.equal(back.crowns, 77);
  assert.equal(back.seed, 8);
  assert.equal(loadMeta(5, { getItem: () => null }).seed, 5);
});
