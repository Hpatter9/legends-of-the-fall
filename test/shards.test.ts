import { test } from 'node:test';
import assert from 'node:assert/strict';
import { place, startBattle } from '../src/sim/battle';
import { loadMeta, MAX_RANK, startedMeta, pullOnce, rankMult, rankOf, RANK_MULT, saveMeta } from '../src/sim/meta';
import { OVERFLOW_CROWNS, SHARD_CAP } from '../src/sim/awakenRules';
import { gradeBoost } from '../src/sim/run';
import { ALL_HEROES, HEROES, UNITS } from '../src/sim/units';

test('a pull of a hero owned gives a rank shard of it, not crowns; of a hero not owned, unlock shards (see hero-shards.test.ts)', () => {
  const m = startedMeta(12);
  const seen: string[] = [];
  for (let i = 0; i < 300; i++) {
    const crowns = m.crowns;
    const owned = [...m.unlocked];
    const p = pullOnce(m);
    if (!owned.includes(p.kind)) {
      assert.equal(p.shards, 0);
      assert.ok(p.unlock! >= 1);
      assert.equal(m.shards[p.kind] ?? 0, 0);
    } else {
      // (a hero already at the shard cap pays crowns instead: the fading odds send many pulls to the heroes owned)
      const capped = (m.shards[p.kind] ?? 0) >= SHARD_CAP && p.shards === 0;
      if (!capped) seen.push(p.kind);
      assert.equal(p.shards, capped ? 0 : 1);
      assert.equal(m.crowns, capped ? crowns + OVERFLOW_CROWNS : crowns);
    }
  }
  for (const kind of new Set(seen)) assert.equal(m.shards[kind], seen.filter((k) => k === kind).length);
});

test('ranks come at the shard thresholds: 1, 3, 6 and 10', () => {
  const m = startedMeta(1);
  const rankAt = (n: number) => {
    m.shards.knight = n;
    return rankOf(m, 'knight');
  };
  assert.deepEqual([0, 1, 2, 3, 5, 6, 9, 10, 11].map(rankAt), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(MAX_RANK, 4);
  assert.equal(rankOf(m, 'nobody'), 0);
});

test('each rank is a little stronger, and rank 0 is exactly the grade alone', () => {
  assert.equal(rankMult(0), 1);
  assert.ok(Math.abs(rankMult(1) - RANK_MULT) < 1e-9);
  assert.ok(rankMult(4) > rankMult(3) && rankMult(3) > rankMult(2));
  assert.deepEqual(gradeBoost(2), gradeBoost(2, 0));
  assert.ok(gradeBoost(1, 2).hp! > gradeBoost(1, 1).hp!);
  assert.equal(gradeBoost(1, 3).atk, gradeBoost(1, 3).hp);
});

test('the rank bonus reaches the fight: a ranked hero has more hp and attack', () => {
  const b = startBattle(31);
  assert.ok(place(b, 'knight', 0, 8, 1, gradeBoost(1, 0)));
  assert.ok(place(b, 'archer', 1, 8, 2, gradeBoost(1, 4)));
  const plain = b.units.find((u) => u.tag === 1)!;
  const ranked = b.units.find((u) => u.tag === 2)!;
  assert.equal(plain.maxHp, UNITS.knight.hp);
  assert.equal(ranked.maxHp, Math.round(UNITS.archer.hp * rankMult(4)));
  assert.ok(Math.abs((ranked.power ?? 1) - rankMult(4)) < 1e-9);
});

test('a saved meta without shards loads with none, and junk shards are dropped', () => {
  const old = JSON.stringify({ seed: 3, crowns: 40, unlocked: HEROES, pulls: 5, dry: 2 });
  const back = loadMeta(1, { getItem: () => old });
  assert.deepEqual(back.shards, {});
  assert.equal(back.crowns, 40);
  assert.equal(rankOf(back, 'knight'), 0);

  const junk = JSON.stringify({ seed: 3, crowns: 0, unlocked: HEROES, shards: { knight: 4, ghost: 9, archer: 'lots' } });
  const fixed = loadMeta(1, { getItem: () => junk });
  assert.deepEqual(fixed.shards, { knight: 4 });
  assert.equal(rankOf(fixed, 'knight'), 2);
});

test('shards save and load back', () => {
  const store: Record<string, string> = {};
  const m = startedMeta(6);
  m.shards.archer = 7;
  saveMeta(m, { setItem: (k, v) => void (store[k] = v) });
  const back = loadMeta(1, { getItem: (k) => store[k] ?? null });
  assert.equal(back.shards.archer, 7);
  assert.equal(rankOf(back, 'archer'), 3);
  assert.ok(ALL_HEROES.includes('archer'));
});
