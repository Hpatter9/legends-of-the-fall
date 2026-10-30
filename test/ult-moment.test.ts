// The ultimate's moment (ULT-CUTIN, docs/notes/battle-hud.md, `src/ultMomentRules.ts`): which ultimates hold the fight through their effects and
// which let it run on (a lingering one), the queue of moments, its phases in real time, a tap's skip; and every hero's ultimate gets a shape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, ULT_LEVEL, keyOf, ultimateOf } from '../src/sim/abilities';
import { ALL_HEROES } from '../src/sim/units';
import { fullScene, ULT_MOMENT, UltQueue, ultShape, type UltShape } from '../src/ultMomentRules';
import { ULT_EPIC } from '../src/ultEpicRules';

function arena(): Battle {
  const b = startBattle(5);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}

/** Fire `kind`'s ultimate in a small fight; its shape, from the tick it fired on. */
function fire(kind: string): { shape: UltShape; ms: number } | null {
  const b = arena();
  const me = addUnit(b, kind, 3, 2, { level: ULT_LEVEL });
  addUnit(b, 'knight', 2, 2, { level: ULT_LEVEL });
  for (const [u, v] of [[3, 5], [4, 5], [2, 6], [5, 6]]) addUnit(b, 'skeleton', u, v);
  b.autoUlt = true;
  for (let i = 0; i < 400 && b.phase === 'fight'; i++) {
    me.charge2 = CHARGE_MAX;
    const born = b.units.length;
    const events = stepBattle(b);
    const ult = ultimateOf(me)!;
    if (events.some((e) => e.kind === 'skill' && e.by === me.id && e.name === keyOf(ult))) return ultShape(ult, me.id, events, b.units.slice(born));
  }
  return null;
}

test('every hero ultimate fires and has a shape; the delayed ones wait no longer than the cap', () => {
  const shapes: Record<string, string> = {};
  for (const h of ALL_HEROES) {
    const s = fire(h);
    assert.ok(s, `${h}'s ultimate fired`);
    shapes[h] = s.shape;
    if (s.shape === 'delayed') assert.ok(s.ms > 0 && s.ms <= ULT_MOMENT.MAX_DELAY_MS, h);
    else assert.equal(s.ms, 0, h);
  }
  // (all three shapes are met among the 45)
  for (const shape of ['instant', 'delayed', 'lingering']) assert.ok(Object.values(shapes).includes(shape), `${shape}: ${JSON.stringify(shapes)}`);
});

test('the shape is read from what the cast did: summons, zones, auras and lasting buffs linger; a salvo is waited for; a blow is instant', () => {
  const text = { text: 'A great blow' };
  const hit: BattleEvent = { kind: 'hit', by: 1, to: 9, dmg: 50, heavy: true, splash: false, killed: false, src: 'skill' } as BattleEvent;
  assert.deepEqual(ultShape(text, 1, [hit]), { shape: 'instant', ms: 0 });
  assert.equal(ultShape(text, 1, [hit], [{ owner: 1 } as Unit]).shape, 'lingering');
  assert.equal(ultShape(text, 1, [hit], [{ owner: 2 } as Unit]).shape, 'instant');
  assert.equal(ultShape(text, 1, [{ kind: 'zone', u: 1, v: 1, ms: 4000 }]).shape, 'lingering');
  assert.equal(ultShape(text, 1, [{ kind: 'aura', by: 1, at: null, reach: 2, what: 'guard', ms: 5000 }]).shape, 'lingering');
  // (the caster's own talent haste as it casts is not a buff of the ultimate's; the team's is)
  assert.equal(ultShape(text, 1, [{ kind: 'haste', to: 1, ms: 3000 }]).shape, 'instant');
  assert.equal(ultShape(text, 1, [{ kind: 'haste', to: 2, ms: 3000 }]).shape, 'lingering');
  assert.equal(ultShape(text, 1, [{ kind: 'mark', to: 9, by: 1, what: 'x', ms: 500 }]).shape, 'instant');
  const salvo = ultShape(text, 1, [{ kind: 'area', by: 1, id: 'meteor', u: 1, v: 1, ms: 800 }]);
  assert.deepEqual(salvo, { shape: 'delayed', ms: 800 + ULT_MOMENT.TAIL_MS });
  assert.equal(ultShape(text, 1, [{ kind: 'area', by: 1, id: 'meteor', u: 1, v: 1, ms: 9000 }]).ms, ULT_MOMENT.MAX_DELAY_MS);
  // (a duration in the words is not enough (most ultimates stun "for 2s"); calling fighters up is)
  assert.equal(ultShape({ text: 'Foes are stunned for 2s' }, 1, [hit]).shape, 'instant');
  assert.equal(ultShape({ text: 'Summons three wolves' }, 1, [hit]).shape, 'lingering');
  assert.equal(ultShape(text, 1, [{ kind: 'song', by: 1, ms: 600 }]).shape, 'instant');
  assert.equal(ultShape(text, 1, [{ kind: 'banner', by: 1, ms: 9000 }]).shape, 'lingering');
});

test('the queue: the opening holds the battle with the effects frozen; an instant one holds through its effects, a lingering one runs on', () => {
  const q = new UltQueue();
  assert.ok(!q.holdsBattle);
  assert.equal(q.phase, 'idle');
  assert.equal(q.dim, 0);
  q.push({ unit: 1, kind: 'samurai', name: 'Issen', shape: 'instant', ms: 0 });
  assert.equal(q.phase, 'open');
  assert.ok(q.holdsBattle && !q.runsEffects);
  assert.equal(q.dim, 1);
  q.step(ULT_MOMENT.OPEN_MS);
  assert.equal(q.phase, 'impact');
  // (ULT-EPIC: the blow lands as the opening ends, with a freeze on it (the effects held too), then its effects play on the held board)
  assert.ok(q.holdsBattle && !q.runsEffects);
  q.step(ULT_EPIC.HIT_STOP_MS);
  assert.ok(q.holdsBattle && q.runsEffects);
  q.step(ULT_MOMENT.IMPACT_MS);
  assert.equal(q.phase, 'fade');
  assert.ok(!q.holdsBattle);
  // (the dim was eased down to a veil as the blow landed (ULT-EPIC), and fades out from there)
  q.step(ULT_MOMENT.FADE_MS / 2);
  assert.ok(Math.abs(q.dim - ULT_EPIC.LIFT * 0.5) < 1e-9, String(q.dim));
  q.step(ULT_MOMENT.FADE_MS);
  assert.equal(q.phase, 'idle');
  // (lingering: straight from the opening to the fade, the battle running once the freeze on its blow is over)
  q.push({ unit: 2, kind: 'druid', name: 'Grove', shape: 'lingering', ms: 0 });
  q.step(ULT_MOMENT.OPEN_MS + ULT_EPIC.HIT_STOP_MS + 1);
  assert.equal(q.phase, 'fade');
  assert.ok(!q.holdsBattle);
  // (delayed: the battle runs under the dim until the salvo lands)
  q.clear();
  q.push({ unit: 3, kind: 'archer', name: 'Rain', shape: 'delayed', ms: 900 });
  q.step(ULT_MOMENT.OPEN_MS);
  assert.equal(q.phase, 'settle');
  assert.ok(!q.holdsBattle);
  assert.equal(q.dim, 1);
  q.step(900);
  assert.equal(q.phase, 'fade');
});

test('several ultimates queue, each its own opening; a long frame never skips an opening; a tap skips to the fade', () => {
  const q = new UltQueue();
  q.push({ unit: 1, kind: 'samurai', name: 'A', shape: 'instant', ms: 0 });
  q.push({ unit: 2, kind: 'wizard', name: 'B', shape: 'instant', ms: 0 });
  assert.equal(q.waiting, 1);
  const first = q.seq;
  // (one huge frame: the first plays out and the second's opening begins, and stops there)
  q.step(60000);
  assert.equal(q.current?.name, 'B');
  assert.equal(q.phase, 'open');
  assert.equal(q.seq, first + 1);
  assert.ok(q.left > 0);
  q.skip();
  assert.equal(q.phase, 'fade');
  assert.ok(!q.holdsBattle);
  q.step(ULT_MOMENT.FADE_MS);
  assert.equal(q.phase, 'idle');
  assert.equal(q.current, null);
});

test('the whole moment stays within a couple of seconds', () => {
  // (the freeze on the blow included: ULT-EPIC kept the whole about as long as it was)
  const instant = ULT_MOMENT.OPEN_MS + ULT_EPIC.HIT_STOP_MS + ULT_MOMENT.IMPACT_MS + ULT_MOMENT.FADE_MS;
  assert.ok(instant >= 1500 && instant <= 2600, String(instant));
  assert.ok(ULT_MOMENT.OPEN_MS + ULT_MOMENT.MAX_DELAY_MS + ULT_MOMENT.FADE_MS <= 3200);
});

test('with Auto on the moment is always the short banner; the full one needs the setting on and Auto off', () => {
  assert.equal(fullScene(true, false), true);
  assert.equal(fullScene(true, true), false);
  assert.equal(fullScene(false, false), false);
  assert.equal(fullScene(false, true), false);
});
