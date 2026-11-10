// BATTLE-FEEL (docs/notes/battle-feel.md): what the fight's effects and sounds make of the events. A skill's hit sounds in that skill's
// element (its hits come before its `skill` event), laid ground and the marks that change a fighter are heard, small heals are pooled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyOfKit } from '../src/sim/abilities';
import { castsOf, cuesFor, markCue, terrainCue } from '../src/render/soundRules';
import { HEAL_BIG, HEAL_POOL_MS, HealPool, SKILL_ELEMENT, towards, WALL_DIM } from '../src/render/fxRules';
import { readyBattle } from './helpers';

test("a skill's hit sounds in the element of the skill cast that tick, not the caster's first skill", () => {
  const b = readyBattle(3);
  const hero = b.units.find((u) => u.side === 'hero' && keyOfKit(u) && SKILL_ELEMENT[keyOfKit(u)] !== 'fire')!;
  const foe = b.units.find((u) => u.side === 'foe')!;
  // (a fire skill's hit, then its `skill` event, in one tick)
  const events = [
    { kind: 'hit' as const, by: hero.id, to: foe.id, dmg: 30, heavy: false, splash: false, killed: false, src: 'skill' as const },
    { kind: 'skill' as const, by: hero.id, name: 'Meteor', ms: 500 },
  ];
  const casts = castsOf(events);
  assert.equal(casts.get(hero.id), 'Meteor');
  assert.deepEqual(cuesFor(b, events[0], casts).map((q) => q.cue), ['fireWhoosh']);
  // (with no cast that tick, its kit's skill as before)
  assert.notDeepEqual(cuesFor(b, events[0]).map((q) => q.cue), ['fireWhoosh']);
});

test('ground a skill lays is heard, and its going is quiet', () => {
  const b = readyBattle(3);
  assert.deepEqual(cuesFor(b, { kind: 'terrain', u: 1, v: 1, what: 'fire', ms: 3000 }).map((q) => q.cue), ['fireWhoosh']);
  assert.deepEqual(cuesFor(b, { kind: 'terrain', u: 1, v: 1, what: 'fire', ms: 0 }), []);
  for (const w of ['fire', 'thorns', 'ice', 'stone', 'wind', 'light', 'flood', 'rampart', 'statue']) assert.ok(terrainCue(w).length, `${w} has a sound`);
});

test('the marks that change a fighter are heard; the bookkeeping ones are not', () => {
  for (const w of ['stone', 'fear', 'polymorph', 'charged', 'ward']) assert.ok(markCue(w).length, `${w} has a sound`);
  assert.deepEqual(markCue('bounty'), []);
});

test('small heals are pooled into one number a second; a big heal shows at once', () => {
  const pool = new HealPool();
  const max = 1000;
  // (an aura's tick, 1% a second)
  assert.equal(pool.add(1, 10, max, 0), false);
  assert.equal(pool.add(1, 10, max, 300), false);
  assert.deepEqual(pool.due(500, () => max), []);
  assert.deepEqual(pool.due(HEAL_POOL_MS, () => max), [{ id: 1, sum: 20 }]);
  assert.deepEqual(pool.due(HEAL_POOL_MS + 1, () => max), []);
  // (a big one shows now)
  assert.equal(pool.add(2, HEAL_BIG * max, max, 0), true);
  // (small ones that add up to a big heal show at once)
  pool.add(3, 30, max, 0);
  pool.add(3, 30, max, 10);
  assert.deepEqual(pool.due(20, () => max), [{ id: 3, sum: 60 }]);
  // (a fighter gone from the board takes its pool with it)
  pool.add(4, 5, max, 0);
  assert.deepEqual(pool.due(10, () => undefined), []);
});

test("a raised wall's loop eases down to WALL_DIM while a fighter stands in it, and back up", () => {
  let a = 1;
  for (let t = 0; t < 1000; t += 16) a = towards(a, WALL_DIM, 16);
  assert.equal(a, WALL_DIM);
  for (let t = 0; t < 400; t += 16) a = towards(a, 1, 16);
  assert.equal(a, 1);
  assert.ok(WALL_DIM > 0.2 && WALL_DIM < 0.7);
});
