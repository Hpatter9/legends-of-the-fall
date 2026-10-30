// ULT-EPIC (docs/notes/ult-epic.md, `src/ultEpicRules.ts`): an ultimate's payoff. Which effects get the ultimate's scale, the freeze on the
// blow and when it comes, the dim eased off as it lands, what an ultimate touched (lit, and burst on), the camera's lean, and the painted
// kit's keys (in the manifest, used once imported; the fallbacks are real painted parts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { CHARGE_MAX, ULT_LEVEL, keyOf, ultimateOf } from '../src/sim/abilities';
import { ELEMENTS } from '../src/render/fxRules';
import { spellPart } from '../src/render/spellLooks';
import { ULT_MOMENT, UltQueue } from '../src/ultMomentRules';
import {
  FALLBACK_BURST, KIT, boostedScale, KIT_SESSION, ULT_EPIC, burstKey, burstPart, burstSpots, epicEvent, litPools, liftedDim, ultScale, ultTargets, ultZoom,
} from '../src/ultEpicRules';

const hit = (by: number, to: number): BattleEvent => ({ kind: 'hit', by, to, dmg: 40, heavy: true, splash: false, killed: false, src: 'skill' }) as BattleEvent;

test('only the ultimate playing its moment is drawn bigger: its one-off effects twice the size, its beams thicker, its fields as they are', () => {
  assert.equal(ultScale('once', true), 2);
  assert.ok(ultScale('beam', true) > 1 && ultScale('beam', true) < 2);
  assert.equal(ultScale('area', true), 1);
  assert.equal(ultScale('label', true), 1);
  for (const k of ['once', 'beam', 'area', 'label'] as const) assert.equal(ultScale(k, false), 1);
  const casters = new Set([1]);
  assert.ok(epicEvent(hit(1, 9), casters));
  assert.ok(epicEvent({ kind: 'skill', by: 1, name: 'Issen', ms: 500 }, casters));
  assert.ok(epicEvent({ kind: 'arc', from: 1, to: 9 }, casters));
  // (another hero's skill on the same tick, and a blow at the caster, keep their own size)
  assert.ok(!epicEvent({ kind: 'skill', by: 2, name: 'Volley', ms: 600 }, casters));
  assert.ok(!epicEvent(hit(9, 1), casters));
  assert.ok(!epicEvent(hit(1, 9), new Set()));
  assert.ok(!epicEvent({ kind: 'zone', u: 1, v: 1, ms: 3000 }, casters));
  // (twice the size, but a layer already huge (a 32 px nova at scale 6) only grows to the cap across, and never shrinks)
  assert.equal(boostedScale(1, 1, 32), 1);
  assert.equal(boostedScale(1, 2, 32), 2);
  assert.ok(Math.abs(boostedScale(6, 2, 32) * 32 - ULT_EPIC.MAX_PX) < 1e-9);
  assert.equal(boostedScale(12, 2, 32), 12);
});

test('what an ultimate touched: the struck, the helped, and the tiles it worked on; the bursts go on the struck, else the area, else the hero', () => {
  const events: BattleEvent[] = [
    { kind: 'skill', by: 1, name: 'X', ms: 500 },
    { kind: 'dash', by: 1, from: { u: 2, v: 2 }, to: { u: 2, v: 6 } },
    hit(1, 7),
    hit(1, 8),
    hit(1, 7),
    hit(4, 9),
    { kind: 'arc', from: 8, to: 10 },
    { kind: 'heal', to: 3, amount: 40, by: 1 },
    { kind: 'heal', to: 1, amount: 40, by: 1 },
    { kind: 'mark', to: 8, by: 1, what: 'x', ms: 2000 },
    { kind: 'area', by: 1, id: 'meteor', u: 4, v: 5, ms: 800 },
  ];
  const t = ultTargets(events, 1);
  assert.deepEqual(t.struck, [7, 8, 10]);
  assert.deepEqual(t.helped, [3]);
  assert.deepEqual(t.tiles, [{ u: 2, v: 2 }, { u: 2, v: 6 }, { u: 4, v: 5 }]);
  assert.deepEqual(burstSpots(t, 1, false), [{ unit: 7 }, { unit: 8 }, { unit: 10 }]);
  const many = { struck: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => n + 10), helped: [], tiles: [] };
  assert.equal(burstSpots(many, 1, false).length, ULT_EPIC.BURSTS);
  assert.equal(burstSpots(many, 1, true).length, ULT_EPIC.BURSTS_SAVER, 'battery saver: fewer bursts');
  assert.deepEqual(burstSpots({ struck: [], helped: [3], tiles: [{ u: 4, v: 5 }] }, 1, false), [{ u: 4, v: 5 }]);
  assert.deepEqual(burstSpots({ struck: [], helped: [3], tiles: [] }, 1, false), [{ unit: 1 }]);
});

test('the light is left over all of it: a pool on the caster, each one touched and each tile, and a soft light over the lot when they spread', () => {
  const lone = litPools({ x: 100, y: 300 }, [], []);
  assert.equal(lone.pools.length, 1);
  assert.equal(lone.hull, null);
  const wide = litPools({ x: 100, y: 300 }, [{ x: 300, y: 200 }, { x: 320, y: 420 }], [{ x: 200, y: 500 }]);
  assert.equal(wide.pools.length, 4);
  assert.equal(wide.pools[0].r, ULT_EPIC.SPOT_CASTER);
  const h = wide.hull!;
  // (every pool's centre is inside the soft light)
  for (const p of wide.pools) assert.ok(((p.x - h.x) / h.rx) ** 2 + ((p.y - h.y) / h.ry) ** 2 <= 1, JSON.stringify(p));
  assert.ok(h.rx > 100 && h.ry > 100);
  // (no caster on the screen: the touched are still lit)
  assert.equal(litPools(null, [{ x: 1, y: 1 }], []).pools.length, 1);
});

test('the dim eases off as the blow lands, never in a step; the camera leans in only through the opening and never with the screen still', () => {
  assert.equal(liftedDim(null), 1);
  assert.equal(liftedDim(0), 1);
  let last = 1;
  for (let t = 0; t <= ULT_EPIC.LIFT_MS + 200; t += 10) {
    const d = liftedDim(t);
    assert.ok(d <= last + 1e-12 && last - d < 0.05, `${t}: ${d} after ${last}`);
    last = d;
  }
  assert.ok(Math.abs(last - ULT_EPIC.LIFT) < 1e-9);
  assert.equal(ultZoom(true, false), ULT_EPIC.ZOOM);
  assert.equal(ultZoom(false, false), 1);
  assert.equal(ultZoom(true, true), 1);
});

test('the freeze on the blow: as an instant or lingering opening ends, or as a delayed salvo lands; real time, then the fight goes on', () => {
  const q = new UltQueue();
  q.push({ unit: 1, kind: 'samurai', name: 'Issen', shape: 'instant', ms: 0 });
  q.step(ULT_MOMENT.OPEN_MS - 1);
  assert.equal(q.strikes, 0);
  assert.equal(q.since, null);
  q.step(1);
  assert.equal(q.strikes, 1);
  assert.equal(q.stopLeft, ULT_EPIC.HIT_STOP_MS);
  assert.ok(q.holdsBattle && !q.runsEffects);
  // (the freeze holds the phase's own clock too: the impact's whole length still plays after it)
  q.step(ULT_EPIC.HIT_STOP_MS - 1);
  assert.equal(q.left, ULT_MOMENT.IMPACT_MS);
  assert.ok(!q.runsEffects);
  q.step(1);
  assert.ok(q.runsEffects && q.holdsBattle);
  assert.equal(q.dim, 1, 'the dim starts easing as the freeze lets go');
  q.step(ULT_EPIC.LIFT_MS);
  assert.ok(Math.abs(q.dim - ULT_EPIC.LIFT) < 1e-9);

  // (a lingering one: the freeze at the start of its fade holds the battle a beat)
  const l = new UltQueue();
  l.push({ unit: 2, kind: 'druid', name: 'Grove', shape: 'lingering', ms: 0 });
  l.step(ULT_MOMENT.OPEN_MS);
  assert.equal(l.phase, 'fade');
  assert.ok(l.holdsBattle && l.strikes === 1);
  l.step(ULT_EPIC.HIT_STOP_MS);
  assert.ok(!l.holdsBattle);

  // (a delayed one: no blow until the salvo lands; then the freeze holds the running battle)
  const d = new UltQueue();
  d.push({ unit: 3, kind: 'wizard', name: 'Meteor Swarm', shape: 'delayed', ms: 1200 });
  d.land();
  assert.equal(d.strikes, 0, 'a salvo cannot land during the opening');
  d.step(ULT_MOMENT.OPEN_MS + 300);
  assert.equal(d.phase, 'settle');
  assert.ok(!d.holdsBattle && d.strikes === 0 && d.dim === 1);
  d.land();
  assert.equal(d.strikes, 1);
  assert.ok(d.holdsBattle && !d.runsEffects);
  d.land();
  assert.equal(d.strikes, 1, 'once a moment');
  d.step(ULT_EPIC.HIT_STOP_MS);
  assert.ok(!d.holdsBattle);
  // (one never seen to land still gets its blow as its wait ends)
  const n = new UltQueue();
  n.push({ unit: 3, kind: 'wizard', name: 'Meteor Swarm', shape: 'delayed', ms: 600 });
  n.step(ULT_MOMENT.OPEN_MS + 600);
  assert.equal(n.phase, 'fade');
  assert.equal(n.strikes, 1);
});

test('no freeze with the screen kept still, and a tap skips the freeze with the rest', () => {
  const q = new UltQueue();
  q.calm = true;
  q.push({ unit: 1, kind: 'samurai', name: 'Issen', shape: 'instant', ms: 0 });
  q.step(ULT_MOMENT.OPEN_MS);
  assert.equal(q.strikes, 1);
  assert.equal(q.stopLeft, 0);
  assert.ok(q.runsEffects);
  const s = new UltQueue();
  s.push({ unit: 1, kind: 'samurai', name: 'Issen', shape: 'instant', ms: 0 });
  s.step(ULT_MOMENT.OPEN_MS);
  s.skip();
  assert.equal(s.phase, 'fade');
  assert.ok(!s.holdsBattle && s.runsEffects);
});

test('the painted kit: thirteen sheets in the manifest under its session, a burst for every element; the fallbacks are painted parts', () => {
  const manifest = JSON.parse(readFileSync('tools/spell-fx/spell-parts.json', 'utf8')) as Record<string, Record<string, [string, string, number, number, number][]>>;
  const kit = manifest[KIT_SESSION];
  assert.ok(kit, 'the session is in the manifest');
  assert.equal(Object.keys(kit).length, 13);
  const part = (key: string) => {
    const dot = key.lastIndexOf('.');
    return kit[key.slice(0, dot)]?.find((r) => r[0] === key.slice(dot + 1));
  };
  assert.deepEqual(part(KIT.speedlines)?.slice(1, 4), ['loop', 4, 6]);
  assert.deepEqual(part(KIT.edge)?.slice(1, 4), ['loop', 4, 6]);
  assert.deepEqual(part(KIT.gather)?.slice(1, 4), ['once', 6, 8]);
  for (const el of ELEMENTS) {
    assert.equal(burstKey(el), `ult-burst-${el}.impact`);
    assert.deepEqual(part(burstKey(el))?.slice(1), ['once', 6, 8, 4], el);
    const f = FALLBACK_BURST[el];
    if (f) assert.ok(spellPart(f), `${el}: ${f} is painted`);
    // (the kit's own burst wins once it is there; else the fallback; else the pack's alone)
    assert.equal(burstPart(el, (k) => k === burstKey(el) || k === f), burstKey(el));
    assert.equal(burstPart(el, (k) => k === f), f);
    assert.equal(burstPart(el, () => false), null);
  }
  // (no atlas of the kit until its sheets are imported: nothing is asked for, so nothing 404s)
  assert.equal(spellPart(KIT.speedlines) === undefined, !JSON.parse(readFileSync('src/art/fx/spells/index.json', 'utf8'))[KIT_SESSION]);
});

/** Fire `kind`'s ultimate in a small fight; the events of the tick it fired on. */
function fire(kind: string): { b: Battle; id: number; events: BattleEvent[] } | null {
  const b = startBattle(5);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  const me = addUnit(b, kind, 3, 2, { level: ULT_LEVEL });
  addUnit(b, 'knight', 2, 2, { level: ULT_LEVEL });
  for (const [u, v] of [[3, 5], [4, 5], [2, 6], [5, 6]]) addUnit(b, 'skeleton', u, v);
  b.autoUlt = true;
  for (let i = 0; i < 400 && b.phase === 'fight'; i++) {
    me.charge2 = CHARGE_MAX;
    const events = stepBattle(b);
    if (events.some((e) => e.kind === 'skill' && e.by === me.id && e.name === keyOf(ultimateOf(me)!))) return { b, id: me.id, events };
  }
  return null;
}

test('the six the director looked at: each ultimate touches something to light and burst on as it fires', () => {
  for (const kind of ['samurai', 'paladin', 'minotaur', 'wizard', 'kraken', 'lightningMage']) {
    const f = fire(kind);
    assert.ok(f, `${kind}'s ultimate fired`);
    const t = ultTargets(f.events, f.id);
    assert.ok(t.struck.length + t.tiles.length > 0, `${kind}: ${JSON.stringify(t)}`);
    assert.ok(burstSpots(t, f.id, false).length >= 1);
  }
});
