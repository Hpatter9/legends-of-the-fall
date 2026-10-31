// The Eidolon's pass and its attack's source (EIDOLON-CALL-2, docs/notes/eidolon-call-2.md; `src/eidolonPass.ts`): each Eidolon crosses the
// screen in its own way and leaves it before its attack lands, and the attack comes from somewhere it left behind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exitPoint, markTime, marksOf, maxRuns, onScreen, PASS, passPose, passShare, runFrom, SOURCES, wakeRate } from '../src/eidolonPass';
import { FULL, SHORT } from '../src/eidolonRules';
import { EIDOLONS } from '../src/sim/eidolons';

// (the three phone sizes the owner checks, upright)
const ASPECTS = [393 / 852, 360 / 780, 412 / 915];
const GROUNDS = [0.26, 0.38, 0.5];

test('every Eidolon has its own pass and its attack a source', () => {
  const gaits = new Set<string>();
  const trails = new Set<string>();
  for (const e of EIDOLONS) {
    const p = PASS[e.id];
    const s = SOURCES[e.id];
    assert.ok(p && s, e.id);
    assert.ok(p.path.length >= 2 && p.size > 0.2 && p.size < 0.5, e.id);
    assert.ok(p.how.length > 20 && s.words.length > 20, e.id);
    gaits.add(p.gait);
    trails.add(p.trail);
  }
  assert.equal(gaits.size, EIDOLONS.length, 'each moves in its own way');
  assert.equal(trails.size, EIDOLONS.length, 'each leaves its own trail');
});

test('each pass comes on from off the screen, crosses it and leaves it before the strike', () => {
  for (const e of EIDOLONS) {
    const p = PASS[e.id];
    for (const aspect of ASPECTS)
      for (const g of GROUNDS) {
        assert.ok(!onScreen(p, passPose(p, 0, g), aspect), `${e.id} starts off the screen`);
        assert.ok(!onScreen(p, passPose(p, 1, g), aspect), `${e.id} ends off the screen (${aspect.toFixed(2)}, ${g})`);
        assert.ok(onScreen(p, passPose(p, 0.5, g), aspect), `${e.id} is on the screen mid-way`);
        // (it is seen for a good part of the pass)
        let seen = 0;
        for (let u = 0; u <= 1; u += 0.02) seen += onScreen(p, passPose(p, u, g), aspect) ? 1 : 0;
        assert.ok(seen >= 15, `${e.id} on screen ${seen}/51`);
      }
  }
  // (the strike never lands while it is still crossing)
  for (const m of [FULL, SHORT]) {
    assert.equal(passShare(m, m.STRIKE), 1);
    assert.equal(passShare(m, m.EXIT), 1);
    assert.equal(passShare(m, m.PASS), 0);
  }
});

test('the attack comes from somewhere seen: the trail it left, or the sky or edge it left by', () => {
  for (const e of EIDOLONS) {
    const p = PASS[e.id];
    const s = SOURCES[e.id];
    for (const g of GROUNDS) {
      const marks = marksOf(p, g);
      // (every pass leaves a trail on the screen, laid down while it is still on the screen)
      assert.ok(marks.length >= 2, `${e.id} leaves at least two marks (${marks.length})`);
      for (const k of marks) {
        assert.ok(k.x >= 0.05 && k.x <= 0.95 && k.y >= 0.05 && k.y <= 0.95);
        const t = markTime(FULL, k);
        assert.ok(t >= FULL.PASS && t < FULL.EXIT);
      }
      const ex = exitPoint(p, g);
      assert.ok(ex.x >= 0 && ex.x <= 1 && ex.y >= 0 && ex.y <= 1, `${e.id} left by a point on the screen`);
      const to = { x: 0.5, y: g };
      const from = runFrom(s, marks, ex, to, ASPECTS[0]);
      if (s.from === 'trail') assert.ok(marks.some((k) => k.x === from.x && k.y === from.y), `${e.id} runs from its trail`);
      else assert.deepEqual(from, ex, `${e.id} runs from where it left`);
    }
  }
  // (Aurelan leaps into the sky: the light falls from the top of the screen)
  assert.equal(SOURCES.aurelan.from, 'sky');
  assert.ok(exitPoint(PASS.aurelan, 0.38).y < 0.2);
  // (Askel's fire runs from his paw-prints, which fall at his footfalls on the ground line)
  assert.equal(SOURCES.askel.from, 'trail');
  for (const k of marksOf(PASS.askel, 0.38)) assert.ok(Math.abs(k.y - 0.4) < 0.01);
});

test('the pass leans and leaps by its gait, and the battery saver and reduced motion draw less', () => {
  // (Askel's bounds leave the ground between footfalls; Gorm's steps barely lift)
  const hi = (id: string) => Math.max(...Array.from({ length: 50 }, (_, i) => 0.4 + PASS[id].path[0][1] - passPose(PASS[id], i / 50, 0.4).y));
  assert.ok(hi('askel') > 0.08);
  assert.ok(hi('gorm') < 0.04);
  assert.ok(wakeRate(true, false) < wakeRate(false, false));
  assert.equal(wakeRate(false, true), 0);
  assert.ok(maxRuns(true) < maxRuns(false));
});
