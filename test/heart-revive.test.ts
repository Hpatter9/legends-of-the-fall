import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRetry, fallOutcome, finish, MAX_RETRIES, newRun, retriesLeft, retryGold, retryWave, summonCost, type Run } from '../src/sim/run';
import { startDaily } from '../src/sim/modes';
import { startedMeta } from '../src/sim/meta';

// A fall with a heart left burns the heart and resumes the existing fight; with none left the run ends.

test('a fall with hearts left spends one, keeps the wave and adds the retry gold', () => {
  const r = newRun(21);
  r.stage = 5;
  const gold = r.gold;
  const boost = retryGold(r);
  assert.equal(boost, summonCost(r));
  assert.equal(fallOutcome(r), 'heart');
  assert.equal(retryWave(r), boost);
  assert.equal(r.stage, 5, 'the same wave again');
  assert.equal(r.gold, gold + boost);
  assert.equal(retriesLeft(r), MAX_RETRIES - 1);
  assert.equal(r.over, false);
});

test('a fall with no heart left ends the run as a loss', () => {
  const r = newRun(22);
  for (let i = 0; i < MAX_RETRIES; i++) assert.ok(retryWave(r) !== null);
  assert.equal(fallOutcome(r), 'end');
  const gold = r.gold;
  assert.equal(retryWave(r), null, 'no heart, no boost');
  assert.equal(r.gold, gold);
  finish(r, false);
  assert.equal(r.over, true);
  assert.equal(fallOutcome(r), 'end');
});

test('the daily loses hearts like an army; a run on the tower or the calamity has none', () => {
  const daily = startDaily(startedMeta(6), 20261021);
  assert.equal(fallOutcome(daily), 'heart');
  assert.ok(retryWave(daily));
  const tower = { ...newRun(23), tower: {} } as unknown as Run;
  assert.equal(canRetry(tower), false);
  assert.equal(fallOutcome(tower), 'end');
  const calamity = { ...tower, mode: { kind: 'calamity' } } as unknown as Run;
  assert.equal(fallOutcome(calamity), 'end');
});

test('a revive is deterministic: the same run revived twice is the same run', () => {
  const a = newRun(24);
  const b = newRun(24);
  retryWave(a);
  retryWave(b);
  assert.deepEqual(a, b);
});

// A heart raises the existing fighters; it must never build a fresh enemy wave.
import { fight, reviveParty, stepBattle, TIME_LIMIT_MS } from '../src/sim/battle';
import { readyBattle } from './helpers';

test('a heart raises fallen heroes in place and preserves the existing fight', () => {
  const b = readyBattle(31);
  fight(b);
  for (let i = 0; i < 20; i++) stepBattle(b);
  const heroes = b.units.filter((u) => u.side === 'hero');
  const foes = b.units.filter((u) => u.side === 'foe');
  foes[0].hp = Math.max(1, foes[0].hp - 12);
  foes[1].hp = 0;
  foes[1].alive = false;
  for (const u of heroes) {
    u.hp = 0;
    u.alive = false;
    u.diedAt = b.t;
    u.undyingUsed = true;
  }
  b.phase = 'lost';
  const before = structuredClone(b);
  const units = [...b.units];
  assert.equal(reviveParty(b), true);
  assert.equal(b.phase, 'fight');
  assert.equal(b.t, before.t);
  assert.equal(b.rng, before.rng);
  assert.deepEqual(foes, before.units.filter((u) => u.side === 'foe'));
  assert.deepEqual(b.spells, before.spells);
  assert.deepEqual(b.traits, before.traits);
  for (const u of heroes) {
    const old = before.units.find((x) => x.id === u.id)!;
    assert.equal(u, units.find((x) => x.id === u.id));
    assert.equal(u.alive, true);
    assert.equal(u.hp, u.maxHp);
    assert.deepEqual([u.u, u.v, u.charge, u.charge2, u.dealt, u.kills], [old.u, old.v, old.charge, old.charge2, old.dealt, old.kills]);
    assert.equal(u.undyingUsed, true);
    assert.equal(u.diedAt, undefined);
  }
  assert.equal(reviveParty(b), false, 'cannot revive a running fight');
  stepBattle(b);
  assert.equal(b.t, before.t + 100, 'the existing clock continues');
});

test('a timed-out fight gets time to continue without rewinding the battle', () => {
  const b = readyBattle(32);
  assert.equal(reviveParty(b), false, 'deployment is not a defeat');
  fight(b);
  b.t = TIME_LIMIT_MS;
  b.phase = 'lost';
  assert.equal(reviveParty(b), true);
  stepBattle(b);
  assert.equal(b.phase, 'fight');
  assert.equal(b.t, TIME_LIMIT_MS + 100);
  assert.equal(b.timeLimit, TIME_LIMIT_MS * 2);
});
