import { test } from 'node:test';
import assert from 'node:assert/strict';
import { castPose, FIELD_FX, fxLevel, fxWeight, glanceAt, pickFx } from '../src/render/fieldFxRules';
import type { BattleEvent } from '../src/sim/battle';

// ASSAULT-SKILLS (docs/notes/assault-skills.md): which of a tick's events the Assault's field draws as effects, how many, and how simply.

test('Near draws the effects whole, Mid a simpler version, Far none; Mid is capped tighter', () => {
  assert.equal(fxLevel('near'), 'full');
  assert.equal(fxLevel('mid'), 'simple');
  assert.equal(fxLevel('far'), 'none');
  assert.ok(FIELD_FX.PER_FRAME.simple < FIELD_FX.PER_FRAME.full);
  assert.ok(FIELD_FX.LIVE.simple < FIELD_FX.LIVE.full && FIELD_FX.LIVE.full <= 200);
});

test('an ultimate weighs most, then a king\'s spell, a hero\'s skill before a foe\'s; a blow or a step is no effect', () => {
  const ult = (by: number) => by === 1;
  const ours = (id: number) => id < 10;
  const w = (e: BattleEvent) => fxWeight(e, ult, ours);
  const u = w({ kind: 'skill', by: 1, name: 'x', ms: 500 });
  const spell = w({ kind: 'spell', id: 'meteor', u: 0, v: 0 });
  const mine = w({ kind: 'skill', by: 2, name: 'x', ms: 500 });
  const theirs = w({ kind: 'skill', by: 20, name: 'x', ms: 500 });
  assert.ok(u > spell && spell > mine && mine > theirs && theirs > 0);
  assert.ok(w({ kind: 'heal', to: 2, amount: 5 }) > 0);
  assert.equal(w({ kind: 'heal', to: 2, amount: 0 }), 0);
  assert.equal(w({ kind: 'swing', by: 2, to: 3, ms: 400 } as BattleEvent), 0);
});

test('the frame\'s effects: the heaviest first, then the nearest the middle; none off screen; never more than the cap', () => {
  const evs = [
    { id: 'a', w: 1, d: 5 },
    { id: 'b', w: 3, d: 50 },
    { id: 'c', w: 3, d: 10 },
    { id: 'd', w: 2, d: Infinity },
    { id: 'e', w: 0, d: 1 },
    { id: 'f', w: 1, d: 5 },
  ];
  const got = pickFx(evs, (e) => e.w, (e) => e.d, 3).map((e) => e.id);
  assert.deepEqual(got, ['c', 'b', 'a']);
  assert.deepEqual(pickFx(evs, (e) => e.w, (e) => e.d, 10).map((e) => e.id), ['c', 'b', 'a', 'f']);
  assert.deepEqual(pickFx(evs, (e) => e.w, (e) => e.d, 0), []);
});

test('a cast\'s pose: a sheet with no cast row gathers on its attack\'s first frames, rising, then strikes; it ends on the last', () => {
  assert.deepEqual(castPose(0, false), { share: 0, lift: 0 });
  const mid = castPose(0.5, false);
  assert.ok(mid.share < 0.35 && mid.lift > 0);
  assert.ok(Math.abs(castPose(0.7, false).share - 0.35) < 1e-9);
  assert.equal(castPose(1, false).share, 1);
  assert.equal(castPose(2, false).share, 1);
  assert.deepEqual(castPose(0.4, true), { share: 0.4, lift: 0 });
});

test('the camera glances at an ultimate of ours only with the player\'s hands still, not following, not too often, not for reduced motion', () => {
  const ok = { level: 'full' as const, following: false, idleMs: 9000, sinceGlance: 9000, calm: false };
  assert.equal(glanceAt(ok, 6000), true);
  assert.equal(glanceAt({ ...ok, level: 'none' }, 6000), false);
  assert.equal(glanceAt({ ...ok, following: true }, 6000), false);
  assert.equal(glanceAt({ ...ok, idleMs: 100 }, 6000), false);
  assert.equal(glanceAt({ ...ok, sinceGlance: FIELD_FX.GLANCE_GAP_MS - 1 }, 6000), false);
  assert.equal(glanceAt({ ...ok, calm: true }, 6000), false);
});
