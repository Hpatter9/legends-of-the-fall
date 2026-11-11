// ULT-CAMERA (docs/notes/ult-camera.md, `src/ultCameraRules.ts`): the camera through a show. The owner: "make sure the camera follows the
// effect. like if a spell is cast i want to see the casting, then the effect after." The caster's frame, the travel's timing, the strike's
// frame (every struck spot and the strike sheet's real box, inside the safe rectangle, at the three phone sizes), the return however the
// show ends, an Eidolon's frame on the board's picture, and a king's spell's glance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { at } from '../src/render/iso';
import type { Spot } from '../src/render/cameraRules';
import { SHOWCASES } from '../src/ultShowRules';
import { stagesFor } from '../src/ultStageRules';
import { UltQueue } from '../src/ultMomentRules';
import { ultLean, ULT_EPIC } from '../src/ultEpicRules';
import { artBoxAt, bothView, camAt, camPlan, effectBox, fitView, pictureFrame, shows, spellGlance, spellView, spotBox, stepAt, strikeArt, strikeViews, travelMs, travelPlan, ULT_CAM, zoomAboutPt, type ArtBox, type Room } from '../src/ultCameraRules';

/** The room the camera frames in at each phone size: the screen less the top bar and spell row above and the hero rows below, with the
 *  safe rectangle's margin, at the layout's scale for that width (as the page measures them, to the nearest few px). */
const ROOMS: Record<string, Room> = {
  '393x852': { w: 377, h: 318, base: 0.94, lo: 0.74, hi: 1.7 },
  '360x780': { w: 344, h: 282, base: 0.86, lo: 0.74, hi: 1.7 },
  '412x915': { w: 396, h: 352, base: 0.98, lo: 0.74, hi: 1.7 },
};
/** A fighter standing on a tile, and a bare tile. */
const on = (u: number, v: number, tall = 44): Spot => {
  const [x, y] = at(u, v, 0);
  return { x, y, tall };
};

test('the casting: the camera is on the caster (the push-in) until it leaves, and the casting is always seen for a while first', () => {
  // (the push-in itself is ULT-EPIC's: it builds to the full zoom, and stays off with the screen kept still)
  assert.ok(ultLean(0.1, false) > 1 && ultLean(1, false) === ULT_EPIC.ZOOM && ultLean(0.5, true) === 1);
  const room = ROOMS['393x852'];
  const caster = on(3, 9);
  const foes = [on(3, 2), on(4, 2)];
  const st = stagesFor('samurai');
  const plan = camPlan({ caster, from: { cx: caster.x, cy: caster.y - 22 }, spots: foes, bursts: foes, art: strikeArt('samurai'), room, held: 1.2, blowAt: st.windup.ms, endAt: st.total })!;
  assert.ok(plan.leaveAt >= ULT_CAM.CAST_MIN, `the casting is seen for ${plan.leaveAt} ms`);
  for (const t of [0, 200, plan.leaveAt - 1]) assert.deepEqual(camAt(plan, t), { beat: 'cast', view: null, ease: 0 }, String(t));
  assert.equal(camAt(plan, plan.leaveAt)!.beat, 'travel');
});

test('the travel: it ends just before the blow, takes longer the further it goes, and never cuts the casting short', () => {
  const room = ROOMS['393x852'];
  for (const blowAt of [1600, 1900, 2200, 4400]) {
    for (const travel of [ULT_CAM.TRAVEL_MIN, 600, ULT_CAM.TRAVEL_MAX]) {
      const t = travelPlan(blowAt, travel);
      assert.equal(t.arriveAt, blowAt - ULT_CAM.LEAD_MS);
      assert.equal(t.leaveAt + t.ms, t.arriveAt, 'it arrives as planned');
      // (a wind-up long enough leaves the travel its whole length; a shorter one gives the casting its time first)
      if (blowAt - ULT_CAM.LEAD_MS - travel >= ULT_CAM.CAST_MIN) assert.equal(t.ms, travel);
      else assert.ok(t.ms < travel && t.leaveAt === ULT_CAM.CAST_MIN);
      assert.ok(t.leaveAt >= ULT_CAM.CAST_MIN);
    }
  }
  // (a blow that comes very soon: the casting is still seen first, the travel is what gives)
  const soon = travelPlan(1000, 900);
  assert.equal(soon.leaveAt, ULT_CAM.CAST_MIN);
  assert.equal(soon.leaveAt + soon.ms, 1000 - ULT_CAM.LEAD_MS);
  // (by how far the camera's point moves on the screen, within its limits)
  const from = { cx: 0, cy: 0 };
  const near = travelMs(from, { cx: 30, cy: 0, zoom: 1 }, room);
  const mid = travelMs(from, { cx: 240, cy: 60, zoom: 1 }, room);
  const far = travelMs(from, { cx: 2000, cy: 0, zoom: 1 }, room);
  assert.equal(near, ULT_CAM.TRAVEL_MIN);
  assert.ok(mid > near && mid < far);
  assert.equal(far, ULT_CAM.TRAVEL_MAX);
  // (the whole plan: on the way from the moment it leaves until it arrives, eased over the travel's own length, then on the strike)
  const caster = on(1, 10);
  const foes = [on(6, 1), on(7, 1)];
  const st = stagesFor('samurai');
  const plan = camPlan({ caster, from: { cx: caster.x, cy: caster.y - 22 }, spots: foes, bursts: foes, art: strikeArt('samurai'), room, held: 1.2, blowAt: st.windup.ms, endAt: st.total })!;
  assert.ok(!plan.both, 'far apart: a travel, not one frame for both');
  assert.equal(plan.leaveAt + plan.travelMs, st.windup.ms - ULT_CAM.LEAD_MS);
  const going = camAt(plan, plan.leaveAt + 10)!;
  assert.equal(going.beat, 'travel');
  assert.equal(going.ease, plan.travelMs);
  assert.deepEqual(going.view, plan.views[0], 'it heads for the strike\'s frame from the start');
  assert.equal(camAt(plan, st.windup.ms)!.beat, 'strike');
  assert.equal(camAt(plan, st.total - 10)!.beat, 'hold', 'held through the aftermath');
  // (a showcase that lets go of its caster early sends the camera on then, with longer to get there)
  const early = camPlan({ caster, from: { cx: caster.x, cy: caster.y - 22 }, spots: foes, bursts: foes, art: null, room, held: 1.2, blowAt: 4400, endAt: 7000, followUntil: 2050 })!;
  assert.equal(early.leaveAt, 2050);
  assert.ok(early.travelMs >= ULT_CAM.TRAVEL_MIN && early.travelMs <= ULT_CAM.TRAVEL_MAX);
});

test("the strike's frame holds every struck spot and the strike sheet's real box, inside the safe rectangle, at 393x852, 360x780 and 412x915", () => {
  // (foes in a knot, a line across the board, a spread over the far half, and one alone)
  const layouts: Spot[][] = [
    [on(3, 2), on(4, 2), on(3, 3), on(4, 3)],
    [on(1, 2), on(3, 2), on(5, 2), on(6, 2)],
    [on(0, 1), on(7, 1), on(2, 4), on(6, 5), on(4, 2)],
    [on(4, 3)],
  ];
  let withArt = 0;
  let stepped = 0;
  for (const [size, room] of Object.entries(ROOMS))
    for (const kind of Object.keys(SHOWCASES)) {
      const art = strikeArt(kind);
      if (art) withArt++;
      for (const [i, foes] of layouts.entries())
        // (and with the sheets half as big again, and twice the size: the strikes are being made larger)
        for (const mult of [1, 1.5, 2]) {
          const what = `${kind} ${size} layout ${i} x${mult}`;
          const views = strikeViews(foes, foes, art, room, mult);
          assert.ok(views.length >= 1, what);
          const whole = effectBox(foes, foes, art, mult)!;
          if (views.length === 1 && views[0].fits) {
            // (one frame: the whole effect is in the room)
            assert.ok(shows(views[0], whole, room), `${what}: the whole effect is shown`);
            for (const f of foes) {
              assert.ok(shows(views[0], spotBox(f), room), `${what}: every struck spot`);
              if (art) assert.ok(shows(views[0], artBoxAt(art, f.x, f.y, mult), room), `${what}: the sheet's box on it`);
            }
          } else {
            // (too wide to fit: stepped between, each burst in a frame of its own or with its neighbours, or framed about its middle)
            stepped++;
            for (const f of foes) {
              const box = art ? artBoxAt(art, f.x, f.y, mult) : spotBox(f);
              const mine = views.find((v) => shows(v, box, room));
              const centred = views.find((v) => !v.fits && Math.abs(v.cx - (box.x0 + box.x1) / 2) < 200 && Math.abs(v.cy - (box.y0 + box.y1) / 2) < 200);
              assert.ok(mine || centred, `${what}: the burst at ${Math.round(f.x)},${Math.round(f.y)} is framed`);
            }
          }
          for (const v of views) assert.ok(v.zoom >= room.lo && v.zoom <= room.hi, `${what}: zoom ${v.zoom}`);
          // (the first frame is where the blow lands)
          const first = art ? artBoxAt(art, foes[0].x, foes[0].y, mult) : spotBox(foes[0]);
          assert.ok(shows(views[0], first, room) || !views[0].fits, `${what}: the first burst is in the first frame`);
        }
    }
  assert.ok(withArt >= 70 * 3, 'every ultimate has its strike sheet, read for its size');
  assert.ok(stepped > 0, 'some spreads are too wide for one frame and are stepped between');
});

test('a strike wider than the room is framed about its middle; bursts spread too wide are stepped between through the strike', () => {
  const room = ROOMS['360x780'];
  const huge: ArtBox = { w: 900, h: 300, ax: 450, ay: 260 };
  const one = [on(4, 3)];
  const v = strikeViews(one, one, huge, room);
  assert.equal(v.length, 1);
  assert.equal(v[0].fits, false);
  assert.equal(v[0].zoom, room.lo, 'as far out as the camera goes');
  const box = effectBox(one, one, huge)!;
  assert.ok(Math.abs(v[0].cx - (box.x0 + box.x1) / 2) < 1e-9 && Math.abs(v[0].cy - (box.y0 + box.y1) / 2) < 1e-9, 'about its middle');
  // (each frame has an even share of the time from the blow to the show's end, in the order the bursts go off)
  assert.equal(stepAt(1, 0.9), 0);
  assert.deepEqual([0, 0.2, 0.34, 0.5, 0.67, 0.99, 1, 7].map((k) => stepAt(3, k)), [0, 0, 1, 1, 2, 2, 2, 2]);
  const spread = [on(0, 0), on(7, 0), on(0, 10), on(7, 10)];
  const big: ArtBox = { w: 120, h: 140, ax: 60, ay: 120 };
  const views = strikeViews(spread, spread, big, room);
  assert.ok(views.length > 1, 'more than one frame');
  const caster = on(3, 9);
  const plan = camPlan({ caster, from: { cx: caster.x, cy: caster.y }, spots: spread, bursts: spread, art: big, room, held: 1.2, blowAt: 2000, endAt: 5700 })!;
  assert.equal(plan.views.length, views.length);
  const seen = new Set<number>();
  for (let t = 2000; t < 5700; t += 50) seen.add(plan.views.indexOf(camAt(plan, t)!.view!));
  assert.deepEqual([...seen].sort(), plan.views.map((_, i) => i), 'every frame is visited');
  // (a salvo that lands late is counted from when it really lands)
  assert.deepEqual(camAt(plan, 4000, 0)!.view, plan.views[0]);
});

test('caster and effect close together share one frame; far apart, the camera travels', () => {
  for (const room of Object.values(ROOMS)) {
    const caster = on(3, 5);
    const near = [on(3, 4), on(4, 4)];
    const far = [on(7, 0), on(6, 0)];
    const both = bothView(caster, effectBox(near, near)!, room, 1.2);
    assert.ok(both, 'close: one frame');
    assert.ok(shows(both, spotBox(caster), room) && shows(both, effectBox(near, near)!, room));
    assert.equal(bothView(on(0, 10), effectBox(far, far)!, room, 1.2), null, 'far: none');
    // (a blessing on the caster's own friends beside it: one frame, held from the moment the push-in ends)
    const st = stagesFor('cleric');
    const plan = camPlan({ caster, from: { cx: caster.x, cy: caster.y - 22 }, spots: near, bursts: near, art: null, room, held: 1.2, blowAt: st.windup.ms, endAt: st.total })!;
    assert.ok(plan.both && plan.views.length === 1);
    assert.ok(shows(plan.views[0], spotBox(caster), room));
  }
});

test('the camera goes back to the fight however the show ends: played out, skipped, or the fight over', () => {
  const room = ROOMS['393x852'];
  const caster = on(3, 9);
  const foes = [on(3, 2)];
  const st = stagesFor('wizard');
  const plan = camPlan({ caster, from: { cx: caster.x, cy: caster.y }, spots: foes, bursts: foes, art: strikeArt('wizard'), room, held: 1.2, blowAt: st.windup.ms, endAt: st.total })!;
  // (the plan itself: nothing before the show, nothing once it is over)
  assert.equal(camAt(plan, -1), null);
  assert.equal(camAt(plan, st.total), null);
  assert.equal(camAt(plan, st.total + 5000), null);
  // (the queue's clock is the camera's: real ms since the moment began, the freeze counted, started afresh for each moment)
  const q = new UltQueue();
  q.push({ unit: 1, kind: 'wizard', name: 'X', shape: 'instant', ms: 0, stages: st });
  let t = 0;
  while (q.current) {
    assert.ok(Math.abs(q.clock - t) < 1e-6, `${q.clock} vs ${t}`);
    assert.ok(camAt(plan, q.clock) !== null, 'the camera is the show\'s while it plays');
    q.step(16);
    t += 16;
  }
  assert.ok(Math.abs(t - st.total) <= 16);
  q.push({ unit: 1, kind: 'wizard', name: 'X', shape: 'instant', ms: 0, stages: st });
  assert.equal(q.clock, 0);
  // (the page asks for a frame only while a moment plays, so each of these gives the camera back on the next frame)
  q.step(900);
  q.clear();
  assert.equal(q.current, null, 'the fight over or left');
  q.push({ unit: 1, kind: 'wizard', name: 'X', shape: 'instant', ms: 0, stages: st });
  q.step(900);
  q.skip();
  assert.ok(q.phase === 'fade' && q.since === null, 'skipped before its blow: the page gives the camera back at once');
  const page = readFileSync('src/ultMoment.ts', 'utf8');
  assert.match(page, /q\.current && !\(q\.phase === 'fade' && q\.since === null\) \? this\.camOf\(q\.current\) : null/);
  // (reduced motion: no plan is made at all, so there is no camera travel)
  assert.match(page, /const room = this\.reduced \? null : this\.opts\.room\?\.\(\)/);
  // (and the page never frames over a camera the player has moved, and glides back when a frame ends)
  const main = readFileSync('src/main.ts', 'utf8');
  assert.match(main, /const uf = b\.phase === 'fight' && !this\.manualCam \? this\.ultm\.focus : null/);
  assert.match(main, /if \(this\.camFramed && !framed && !this\.manualCam\) this\.camFreedAt = performance\.now\(\)/);
});

test("an Eidolon's strike: the foes' side is brought to the middle of the room, the picture always covers the page, a wide strike is framed about its middle", () => {
  for (const [size, [w, h]] of Object.entries({ '393x852': [393, 852], '360x780': [360, 780], '412x915': [412, 915] })) {
    const safe = { x0: 8, y0: Math.round(h * 0.2), x1: w - 8, y1: Math.round(h * 0.62) };
    const c = { x: (safe.x0 + safe.x1) / 2, y: (safe.y0 + safe.y1) / 2 };
    const covers = (f: { zoom: number; tx: number; ty: number }) => f.tx <= 1e-9 && f.ty <= 1e-9 && f.tx + w * f.zoom >= w - 1e-9 && f.ty + h * f.zoom >= h - 1e-9;
    for (const focus of [{ x: w * 0.5, y: h * 0.3 }, { x: w * 0.7, y: h * 0.26 }, { x: w * 0.3, y: h * 0.4 }, { x: w * 0.55, y: h * 0.5 }])
      for (const box of [{ w: 120, h: 150 }, { w: 260, h: 230 }, { w: w * 1.6, h: 300 }]) {
        const f = pictureFrame(focus, box, safe, w, h);
        const what = `${size} focus ${Math.round(focus.x)},${Math.round(focus.y)} box ${Math.round(box.w)}`;
        assert.ok(f.zoom >= 1 && f.zoom <= ULT_CAM.EIDOLON_ZOOM, `${what}: zoom ${f.zoom}`);
        assert.ok(covers(f), `${what}: the picture covers the page`);
        // (the focus is moved towards the middle of the room, never away from it, and reaches it where the zoom allows)
        const to = { x: focus.x * f.zoom + f.tx, y: focus.y * f.zoom + f.ty };
        assert.ok(Math.abs(to.x - c.x) <= Math.abs(focus.x - c.x) + 1e-6 && Math.abs(to.y - c.y) <= Math.abs(focus.y - c.y) + 1e-6, `${what}: towards the middle`);
        // (a strike wider than the room is hardly zoomed: zooming in would only crop more of it)
        if (box.w > w) assert.ok(f.zoom <= ULT_CAM.EIDOLON_WIDE + 1e-9, `${what}: zoom ${f.zoom}`);
      }
    // (a strike already in the middle and small enough is zoomed in on, as far as it fits)
    const snug = pictureFrame(c, { w: 200, h: 200 }, safe, w, h);
    assert.ok(snug.zoom > 1);
    assert.ok(Math.abs(c.x * snug.zoom + snug.tx - c.x) < 1e-6 && Math.abs(c.y * snug.zoom + snug.ty - c.y) < 1e-6);
  }
  // (the call's other shots: a plain zoom about a point keeps that point where it is)
  const z = zoomAboutPt({ x: 200, y: 300 }, 1.07);
  assert.ok(Math.abs(200 * z.zoom + z.tx - 200) < 1e-9 && Math.abs(300 * z.zoom + z.ty - 300) < 1e-9);
  assert.deepEqual(zoomAboutPt({ x: 200, y: 300 }, 1), { zoom: 1, tx: 0, ty: 0 });
});

test("a king's spell cast by hand: a glance at its target and what it touches, never closer than the fight's frame, never over a show or a moved camera", () => {
  const room = ROOMS['393x852'];
  const target = on(4, 3, 0);
  const tiles = [on(3, 3, 0), on(4, 3, 0), on(5, 3, 0), on(4, 2, 0), on(4, 4, 0)];
  const art: ArtBox = { w: 96, h: 120, ax: 48, ay: 100 };
  const v = spellView(target, tiles, art, room, 1.1)!;
  assert.ok(v.zoom <= 1.1 + 1e-9, 'a glance, not a push-in');
  assert.ok(shows(v, effectBox(tiles, [target], art)!, room), 'its target, its tiles and its sheet are in the frame');
  // (a wide one zooms out to fit, as far as the camera goes)
  const wide = spellView(target, [on(0, 0, 0), on(7, 10, 0), on(0, 10, 0), on(7, 0, 0)], null, room, 1.1)!;
  assert.ok(wide.zoom < 1.1 && wide.zoom >= room.lo);
  assert.equal(spellGlance({ manual: false, show: false, reduced: false }), true);
  assert.equal(spellGlance({ manual: true, show: false, reduced: false }), false, 'the player has just moved the camera');
  assert.equal(spellGlance({ manual: false, show: true, reduced: false }), false, "an ultimate's show or an Eidolon's call is running");
  assert.equal(spellGlance({ manual: false, show: false, reduced: true }), false, 'reduced motion');
  assert.ok(ULT_CAM.SPELL_MS <= 1500 && ULT_CAM.SPELL_EASE < ULT_CAM.SPELL_MS / 2, 'quick');
  // (the view is of the room: fitView never goes past the limits)
  assert.equal(fitView({ x0: 0, x1: 10, y0: 0, y1: 10 }, room).zoom, room.hi);
});
