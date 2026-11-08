// ASSAULT-END (docs/notes/assault-1.md; the design's 3.4, 5.5 and 7.6): the lord's fall wins after the rout's five seconds; all the heroes
// down at once loses; twelve minutes is night; the retreat withdraws; a downed hero rises at the rally flag after 45 seconds while three or
// more of its soldiers stand, and not with two.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASSAULT_LIMIT_MS, ROUT_MS } from '../src/sim/assault/assault';
import { MORALE, RISE_MS } from '../src/sim/assault/holdMind';
import { soundRetreat } from '../src/sim/assault/platoons';
import { stepBattle } from '../src/sim/battle';
import { fell, quiet, steps } from './assaultKit';

test('the lord\'s fall: five seconds later the hold is conquered (morale and routing are off, the owner\'s choice)', () => {
  const b = quiet();
  const h = b.field!.hold!;
  fell(b, h.lord);
  stepBattle(b);
  assert.ok(h.lordFell !== undefined);
  assert.ok(!MORALE.on);
  assert.ok(h.posts.every((p) => p.mood !== 'routed'), 'no post routs');
  steps(b, ROUT_MS / 100 - 5);
  assert.equal(b.phase, 'fight');
  steps(b, 10);
  assert.equal(b.phase, 'won');
  assert.equal(h.outcome, 'won');
});

test('all five heroes down at once: the host falls back (lost)', () => {
  const b = quiet();
  for (const pl of b.field!.hold!.platoons) fell(b, pl.heroId);
  stepBattle(b);
  assert.equal(b.phase, 'lost');
  assert.equal(b.field!.hold!.outcome, 'lost');
});

test('night falls at twelve minutes: a withdrawal', () => {
  const b = quiet();
  b.t = ASSAULT_LIMIT_MS - 100;
  stepBattle(b);
  assert.equal(b.field!.hold!.outcome, 'night');
  assert.equal(b.phase, 'lost');
});

test('the retreat sounded ends the assault as a withdrawal at the next tick', () => {
  const b = quiet();
  assert.ok(soundRetreat(b));
  stepBattle(b);
  assert.equal(b.field!.hold!.outcome, 'withdrawn');
});

test('a downed hero rises at the rally flag after 45 seconds, at half health, with three soldiers standing; not with two', () => {
  for (const left of [3, 2]) {
    const b = quiet();
    const h = b.field!.hold!;
    const pl = h.platoons[0];
    const hero = b.field!.byId[pl.heroId];
    fell(b, hero.id);
    pl.soldiers.slice(left).forEach((s) => fell(b, s.id));
    steps(b, RISE_MS / 100 - 20);
    assert.ok(!hero.alive, 'still down');
    steps(b, 40);
    if (left === 3) {
      assert.ok(hero.alive, 'risen');
      assert.equal(hero.hp, Math.round(hero.maxHp * 0.5));
      assert.ok(Math.abs(hero.u - h.bp.rally.u) + Math.abs(hero.v - h.bp.rally.v) <= 4, 'at the rally flag');
    } else assert.ok(!hero.alive, 'two soldiers cannot carry it back');
  }
});
