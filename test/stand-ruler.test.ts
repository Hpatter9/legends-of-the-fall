// The ruler helps only when foes reach the central dais; the objective never chases them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, type BattleEvent } from '../src/sim/battle';
import { newCastle } from '../src/sim/castle';
import { ARMIES } from '../src/sim/armies';
import { gradeBoost } from '../src/sim/run';
import { KING_AT } from '../src/sim/standField';
import { killGold, newStandRun, startFirstWave, startStand, stepStand, type Stand } from '../src/sim/stand';
import { UNITS } from '../src/sim/units';

function heldFight(offset = 1): Stand {
  const heroes = ['knight', 'paladin', 'samurai', 'kunoichi', 'archer', 'ranger', 'wizard', 'cleric'];
  const s = startStand(newStandRun(5, heroes, ARMIES.map(a => a.id)), { boost: () => gradeBoost(1, 0, 20), castle: newCastle() });
  startFirstWave(s);
  s.queue.length = 0;
  for (const u of s.b.units) {
    if (u.side === 'foe') u.alive = false;
    if (u.tag !== undefined) u.busyUntil = 1e9;
  }
  const foe = addUnit(s.b, 'skeleton', KING_AT.u + offset, KING_AT.v);
  foe.hp = foe.maxHp = 1e6;
  foe.busyUntil = 1e9;
  return s;
}

function ticks(s: Stand, n: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (let i = 0; i < n; i++) events.push(...stepStand(s));
  return events;
}

test('the ruler damages a foe on the dais without moving or touching an ally', () => {
  const s = heldFight();
  const foe = s.b.units.find(u => u.side === 'foe' && u.alive)!;
  const events = ticks(s, 8);
  assert.ok(events.some(e => e.kind === 'swing' && e.by === s.king.id && e.to === foe.id));
  assert.ok(events.some(e => e.kind === 'hit' && e.by === s.king.id && e.to === foe.id && e.dmg > 1));
  assert.ok(foe.hp < foe.maxHp);
  assert.deepEqual({ u: s.king.u, v: s.king.v }, KING_AT);
  assert.ok(!events.some(e => e.kind === 'hit' && e.by === s.king.id && e.to !== foe.id));
});

test('the ruler does not chase distant foes, even during the final-foe hunt', () => {
  const s = heldFight(4);
  const events = ticks(s, 40);
  assert.equal(s.b.stand!.hunt, true);
  assert.ok(!events.some(e => e.kind === 'swing' && e.by === s.king.id));
  assert.deepEqual({ u: s.king.u, v: s.king.v }, KING_AT);
});

test('the ruler respects the normal attack cooldown and wind-up', () => {
  const s = heldFight();
  const foe = s.b.units.find(u => u.side === 'foe' && u.alive)!;
  const swings: number[] = [];
  const first = stepStand(s);
  assert.ok(first.some(e => e.kind === 'swing' && e.by === s.king.id));
  assert.equal(foe.hp, foe.maxHp, 'the wind-up has not landed yet');
  swings.push(s.b.t);
  for (let i = 0; i < 50; i++) {
    const events = stepStand(s);
    if (events.some(e => e.kind === 'swing' && e.by === s.king.id)) swings.push(s.b.t);
  }
  assert.ok(swings.length >= 3);
  for (let i = 1; i < swings.length; i++) assert.ok(swings[i] - swings[i - 1] >= UNITS.standKing.atkMs);
});

test('hidden foes are not struck and charm never makes the ruler attack their guards', () => {
  const s = heldFight();
  const foe = s.b.units.find(u => u.side === 'foe' && u.alive)!;
  foe.hideUntil = 1e9;
  assert.ok(!ticks(s, 10).some(e => e.kind === 'swing' && e.by === s.king.id));
  foe.hideUntil = undefined;
  s.king.charmUntil = 1e9;
  assert.ok(!ticks(s, 10).some(e => e.kind === 'swing' && e.by === s.king.id));
});

test('ruler defence stays deterministic for a saved seed', () => {
  const a = heldFight(), b = heldFight();
  assert.deepEqual(ticks(a, 50), ticks(b, 50));
  assert.equal(a.b.rng, b.b.rng);
  assert.equal(a.b.units.find(u => u.side === 'foe' && u.alive)!.hp, b.b.units.find(u => u.side === 'foe' && u.alive)!.hp);
});

test('a ruler finishing blow counts towards the run and pays only once', () => {
  const s = heldFight();
  const foe = s.b.units.find(u => u.side === 'foe' && u.alive)!;
  foe.hp = 1;
  const before = s.run.gold;
  ticks(s, 8);
  assert.equal(foe.alive, false);
  assert.equal(s.run.kills, 1);
  assert.ok(s.run.gold >= before + killGold(1));
  const paid = s.run.earned;
  ticks(s, 5);
  assert.equal(s.run.kills, 1);
  assert.equal(s.run.earned, paid);
});
