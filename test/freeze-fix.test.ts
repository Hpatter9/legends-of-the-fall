// FREEZE-FIX (docs/notes/freeze-fix.md): nothing may hold a fight for good. An ultimate's moment always ends, whatever its lengths hold
// and whatever is done to it; the moments still waiting when a fight ends are dropped; an Eidolon's call waits for its strike only so
// long; and the camera's rules end for any input. The owner's freeze was a wave's end that waited on shows (10 to 20 s, or for good), so:
// one full show at a time, no show outlives the fight by more than a second, a belt pushes a stuck wave's end on, and a graphics context
// that is not given back has the page loaded again where it is safe to.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES } from '../src/sim/units';
import { Rng } from '../src/sim/rng';
import { momentLimit, oneShow, ULT_MOMENT, UltQueue, WAVE_END, waveEndStuck, type UltMoment, type UltShape } from '../src/ultMomentRules';
import { CTX, ctxReload } from '../src/contextRules';
import { stagesFor } from '../src/ultStageRules';
import { CALL_OVER_MS, STRIKE_WAIT_MS, strikeOverdue } from '../src/eidolonRules';
import { camAt, camPlan, effectBox, fitView, stepAt, strikeViews, type Room } from '../src/ultCameraRules';

const SHAPES: UltShape[] = ['instant', 'delayed', 'lingering'];
const moment = (kind: string, shape: UltShape, o: { show?: number; wait?: number } = {}): UltMoment => ({ unit: 1, kind, name: 'x', shape, ms: o.wait ?? 0, show: o.show, stages: stagesFor(kind, o) });

/** Step a queue in frames of `dt` until it is idle; the real ms it took, or -1 if it never was within a minute. */
function drain(q: UltQueue, dt = 33): number {
  for (let t = 0; t < 60000; t += dt) {
    if (!q.current) return t;
    q.step(dt);
  }
  return q.current ? -1 : 60000;
}

test('every hero\'s moment, of every shape, ends inside its own limit', () => {
  for (const h of ALL_HEROES)
    for (const shape of SHAPES)
      for (const show of [undefined, 2500]) {
        const m = moment(h, shape, { show, wait: shape === 'delayed' ? 900 : 0 });
        const q = new UltQueue();
        q.push(m);
        const took = drain(q);
        assert.ok(took >= 0 && took <= momentLimit(m), `${h} ${shape} ${show ?? ''}: ${took} ms, limit ${momentLimit(m)}`);
        assert.equal(q.overran, 0, `${h} ${shape}: a sound moment is never ended by its deadline`);
      }
});

test('a moment whose lengths are broken is ended by its deadline, and the next one plays', () => {
  for (const bad of [Infinity, NaN, -1, 1e12]) {
    for (const part of ['windup', 'strike', 'aftermath'] as const) {
      const m = moment('knight', 'instant');
      m.stages = { ...m.stages!, [part]: { ...m.stages![part], ms: bad } };
      const q = new UltQueue();
      q.push(m);
      q.push(moment('wizard', 'instant'));
      const took = drain(q);
      assert.ok(took >= 0, `${part} ${bad}: the queue drains`);
      assert.ok(took <= momentLimit(m) + momentLimit(moment('wizard', 'instant')) + 100, `${part} ${bad}: in bounded time (${took} ms)`);
    }
  }
  // (a showcase with no end, on a moment with no stages: the old lengths)
  const q = new UltQueue();
  q.push({ unit: 1, kind: 'knight', name: 'x', shape: 'instant', ms: 0, show: Infinity });
  assert.ok(Number.isFinite(momentLimit({ show: Infinity })));
  assert.ok(drain(q) >= 0);
  assert.equal(q.overran, 1);
  assert.equal(q.holdsBattle, false);
});

test('whatever is done to the queue (pushes, skips, landings, long and short frames), it never holds the fight for good', () => {
  const rng = new Rng(0xf7ee2e);
  for (let run = 0; run < 300; run++) {
    const q = new UltQueue();
    q.calm = rng.next() < 0.3;
    let pushed = 0;
    let held = 0;
    let worst = 0;
    for (let i = 0; i < 400; i++) {
      const r = rng.next();
      if (r < 0.05 && pushed < 6) {
        const shape = SHAPES[rng.int(0, 2)];
        q.push(moment(ALL_HEROES[rng.int(0, ALL_HEROES.length - 1)], shape, { show: rng.next() < 0.5 ? 2500 : undefined, wait: shape === 'delayed' ? rng.int(200, 1500) : 0 }));
        pushed++;
      } else if (r < 0.08) q.skip();
      else if (r < 0.12) q.land();
      const dt = r > 0.97 ? 250 : r > 0.9 ? 1 : 33;
      q.step(dt);
      held = q.holdsBattle ? held + dt : 0;
      worst = Math.max(worst, held);
    }
    assert.ok(drain(q) >= 0, `run ${run}: drains`);
    // (one moment holds the fight for its wind-up, its showcase and its strike at most; six in a row, six times that)
    assert.ok(worst <= 6 * 9000, `run ${run}: held ${worst} ms on end`);
  }
});

test('the moments still waiting are dropped once the fight is over; the one playing finishes', () => {
  const q = new UltQueue();
  for (const h of ['knight', 'wizard', 'archer', 'cleric', 'samurai']) q.push(moment(h, 'instant', { show: 2500 }));
  assert.equal(q.waiting, 4);
  q.step(500);
  assert.equal(q.dropWaiting(), 4);
  assert.equal(q.waiting, 0);
  assert.equal(q.dropped, 4);
  assert.equal(q.current?.kind, 'knight');
  const took = drain(q);
  assert.ok(took > 0 && took <= momentLimit(moment('knight', 'instant', { show: 2500 })), `the one playing ends in its own time (${took} ms)`);
  assert.equal(q.dropWaiting(), 0);
});

test('a moment\'s limit covers its real length, with room over', () => {
  for (const h of ALL_HEROES) {
    const m = moment(h, 'delayed', { show: 2500, wait: ULT_MOMENT.MAX_DELAY_MS });
    assert.ok(momentLimit(m) >= m.stages!.total + ULT_MOMENT.OVERRUN_MS, h);
    assert.ok(momentLimit(m) < 30000, h);
  }
});

test('an Eidolon\'s call waits for its strike only so long', () => {
  assert.equal(strikeOverdue(0), false);
  assert.equal(strikeOverdue(STRIKE_WAIT_MS - 1), false);
  assert.equal(strikeOverdue(STRIKE_WAIT_MS), true);
  // (a wait that cannot be told is overdue, never waited on)
  assert.equal(strikeOverdue(NaN), true);
  assert.ok(STRIKE_WAIT_MS >= 1000 && STRIKE_WAIT_MS <= 5000);
});

test('the camera\'s rules end, and give finite views, for any spots', () => {
  const room: Room = { w: 360, h: 420, base: 1.4, lo: 0.6, hi: 2.1 };
  const rng = new Rng(0xca3e7a);
  const odd = [0, -0, 1e9, -1e9, NaN, Infinity, -Infinity];
  for (let run = 0; run < 400; run++) {
    const n = rng.int(0, 14);
    const val = () => (rng.next() < 0.15 ? odd[rng.int(0, odd.length - 1)] : rng.int(-900, 900));
    const spot = () => ({ x: val(), y: val(), tall: rng.next() < 0.1 ? val() : rng.int(0, 60) });
    const spots = Array.from({ length: rng.int(0, 6) }, spot);
    const bursts = Array.from({ length: n }, spot);
    const art = rng.next() < 0.5 ? { w: rng.int(0, 900), h: rng.int(0, 700), ax: rng.int(0, 450), ay: rng.int(0, 600) } : null;
    const views = strikeViews(spots, bursts, art, room);
    // (never more frames than bursts, and at least one where there is anything to frame)
    assert.ok(views.length <= Math.max(1, bursts.length), `run ${run}: ${views.length} frames for ${bursts.length} bursts`);
    assert.equal(views.length === 0, !effectBox(spots, bursts, art));
    const plan = camPlan({ caster: spot(), from: { cx: val(), cy: val() }, spots, bursts, art, room, held: 1, blowAt: rng.int(0, 4000), endAt: rng.int(0, 9000) });
    if (plan) for (let ms = -100; ms < 9500; ms += 400) camAt(plan, ms, rng.next() < 0.3 ? rng.int(0, 3000) : null);
  }
  // (sound input gives sound numbers)
  const v = fitView({ x0: 0, y0: 0, x1: 0, y1: 0 }, room);
  assert.ok(Number.isFinite(v.cx) && Number.isFinite(v.zoom) && v.zoom <= room.hi);
  for (const k of [NaN, -1, 0, 0.5, 1, 2, Infinity]) for (const f of [0, 1, 3, 7]) assert.ok(stepAt(f, k) >= 0 && stepAt(f, k) <= Math.max(0, f - 1));
});

test('one full show at a time: an ultimate fired while a moment or a call plays gets the short banner', () => {
  assert.equal(oneShow(false, false), true);
  assert.equal(oneShow(true, false), false);
  assert.equal(oneShow(false, true), false);
  assert.equal(oneShow(true, true), false);
});

test('no show outlives the fight: whatever is playing or waiting, a second at most is left once the fight is over', () => {
  for (const h of ALL_HEROES)
    for (const shape of SHAPES)
      for (const at of [0, 400, 1500, 2600, 4200, 5200]) {
        const q = new UltQueue();
        q.push(moment(h, shape, { show: 2500, wait: shape === 'delayed' ? 900 : 0 }));
        q.push(moment('wizard', 'instant', { show: 2500 }));
        q.push(moment('archer', 'delayed', { wait: 1200 }));
        for (let t = 0; t < at && q.current; t += 33) q.step(33);
        // (the page asks every frame while the fight stays over)
        let took = 0;
        for (; took < 5000 && q.current; took += 33) {
          q.fightOver();
          assert.equal(q.holdsBattle, false);
          assert.equal(q.waiting, 0);
          q.step(33);
        }
        // (ULT-AUDIT, the director's decision: a moment whose blow had not been seen plays that blow, its strike's own run, and ends;
        // one whose blow had been seen has its second of aftermath. Either way far inside the two seconds the result waits)
        assert.ok(took <= Math.max(ULT_MOMENT.OVER_MS, ULT_MOMENT.OVER_STRIKE_MS) + 66, `${h} ${shape} at ${at}: ${took} ms left after the fight`);
        assert.equal(q.overran, 0);
      }
  assert.ok(ULT_MOMENT.OVER_MS <= 1000 && CALL_OVER_MS <= 1000);
  assert.ok(ULT_MOMENT.OVER_STRIKE_MS <= 1500, 'the blow played after a fight ends is short');
  // (nothing playing: nothing to do)
  const q = new UltQueue();
  q.fightOver();
  assert.equal(q.current, null);
});

test('the belt: a fight over for ten seconds with nothing shown is pushed on; anything the player can act on stays its hand', () => {
  assert.equal(waveEndStuck(0, false), false);
  assert.equal(waveEndStuck(WAVE_END.BELT_MS - 1, false), false);
  assert.equal(waveEndStuck(WAVE_END.BELT_MS, false), true);
  assert.equal(waveEndStuck(WAVE_END.BELT_MS * 10, true), false);
  assert.equal(waveEndStuck(NaN, false), true);
  assert.ok(WAVE_END.BELT_MS >= 5000 && WAVE_END.BELT_MS <= 12000);
});

test('a graphics context not given back in four seconds has the page loaded again, where nothing of a wave can be lost', () => {
  assert.equal(ctxReload(null, 'fight', null), false);
  assert.equal(ctxReload(CTX.RELOAD_MS - 1, 'fight', null), false);
  assert.equal(ctxReload(CTX.RELOAD_MS, 'fight', null), true);
  assert.equal(ctxReload(CTX.RELOAD_MS, 'deploy', null), true);
  // (a fight that has ended is being counted: the reload waits for the next wave's deploy)
  assert.equal(ctxReload(60000, 'won', null), false);
  assert.equal(ctxReload(60000, 'lost', null), false);
  // (never round in a loop)
  assert.equal(ctxReload(60000, 'fight', CTX.AGAIN_MS - 1), false);
  assert.equal(ctxReload(60000, 'fight', CTX.AGAIN_MS), true);
  assert.equal(CTX.RELOAD_MS, 4000);
});

test('ULT-AUDIT: a fight that ends before the blow was seen gets the blow, then the end; one that ends after it gets its second of aftermath', () => {
  /** A queue stepped to `at` ms, then the fight ends: the strikes it had counted, the phases it goes through after, and how long it takes. */
  const cut = (shape: UltShape, at: number, extra = 0) => {
    const q = new UltQueue();
    q.push(moment('wizard', shape, { show: 2500, wait: shape === 'delayed' ? 900 : 0 }));
    for (let i = 0; i < extra; i++) q.push(moment('archer', 'instant', { show: 2500 }));
    for (let t = 0; t < at && q.current; t += 33) q.step(33);
    const before = q.strikes;
    const phases: string[] = [];
    let took = 0;
    for (; took < 6000 && q.current; took += 33) {
      q.fightOver();
      assert.equal(q.holdsBattle, false, 'nothing is held once the fight is over');
      assert.equal(q.waiting, 0, 'the moments waiting are dropped');
      if (phases[phases.length - 1] !== q.phase) phases.push(q.phase);
      q.step(33);
    }
    return { q, before, phases, took };
  };
  for (const shape of SHAPES) {
    // (cut in the wind-up, 400 ms in: the blow had not been seen. It lands at once, plays its strike's run, and the moment ends)
    const early = cut(shape, 400);
    assert.equal(early.before, 0);
    assert.equal(early.q.strikes, 1, `${shape}: the blow lands`);
    assert.equal(early.phases[0], 'impact', `${shape}: straight to the blow`);
    assert.ok(!early.phases.includes('open') && !early.phases.includes('show'), `${shape}: ${early.phases}`);
    assert.ok(early.took >= ULT_MOMENT.OVER_STRIKE_MS - 66 && early.took <= ULT_MOMENT.OVER_STRIKE_MS + 66, `${shape}: the strike's own run, ${early.took} ms`);
    // (cut in the showcase, before the blow: the same)
    const show = cut(shape, 2600);
    assert.equal(show.before, 0);
    assert.equal(show.q.strikes, 1);
    assert.ok(show.took <= ULT_MOMENT.OVER_STRIKE_MS + 66);
  }
  // (cut after the blow was seen: no second blow, a second of aftermath at most, as the freeze fix has it)
  const late = cut('instant', 5200);
  assert.equal(late.before, 1, 'the blow had landed');
  assert.equal(late.q.strikes, 1, 'it does not land twice');
  assert.deepEqual(late.phases, ['fade']);
  assert.ok(late.took <= ULT_MOMENT.OVER_MS + 66, `${late.took} ms`);
  // (a queue of several: the waiting ones are dropped, only the one playing has its blow)
  const many = cut('instant', 400, 3);
  assert.equal(many.q.strikes, 1);
  assert.equal(many.q.dropped, 3);
  assert.ok(many.took <= ULT_MOMENT.OVER_STRIKE_MS + 66);
  // (no path is longer than the blow's run, and the blow's run is well inside the two seconds every fight's end waits for its result)
  for (const shape of SHAPES) for (let at = 0; at <= 7000; at += 250) assert.ok(cut(shape, at).took <= ULT_MOMENT.OVER_STRIKE_MS + 66, `${shape} at ${at}`);
  assert.ok(ULT_MOMENT.OVER_STRIKE_MS < 2000);
  // (the next moment starts clean: a blow played at a fight's end does not carry over)
  const q = new UltQueue();
  q.push(moment('wizard', 'instant', { show: 2500 }));
  q.step(400);
  q.fightOver();
  drain(q);
  q.push(moment('samurai', 'instant', { show: 2500 }));
  assert.equal(q.holdsBattle, true, 'a new moment holds its fight through its opening as ever');
});
