// The Eidolon's call on the page, its rules (EIDOLONS batch 4, docs/notes/eidolons.md; `src/eidolonRules.ts`): which cinematic plays, when
// a tap may skip it, its beats, each Eidolon's looks and choreography, and how the War Horn shows its fill.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beatTimes, buildAt, canSkip, CHOREO, EYES, FULL, hornLine, hornLook, hornWords, lineOf, LOOKS, momentOf, motesFor, reactionOf, REACTIONS, SHORT, shotAt, SHOTS, SKIP_AFTER_MS, skipTarget, SNAP_ZOOM } from '../src/eidolonRules';
import { EIDOLONS } from '../src/sim/eidolons';
import { HORN_FULL } from '../src/sim/warHorn';
import { parseSettings } from '../src/settings';

test('the first call of each Eidolon plays in full and cannot be skipped; after it the setting picks, and a tap skips after a second', () => {
  assert.equal(momentOf(true, false), FULL);
  assert.equal(momentOf(false, true), FULL);
  assert.equal(momentOf(false, false), SHORT);
  assert.equal(canSkip(5000, true), false);
  assert.equal(canSkip(SKIP_AFTER_MS - 1, false), false);
  assert.equal(canSkip(SKIP_AFTER_MS, false), true);
  // (the setting is on by default and read safely)
  assert.equal(parseSettings(null).eidolonFull, true);
  assert.equal(parseSettings(JSON.stringify({ eidolonFull: false })).eidolonFull, false);
});

// (EIDOLON-CALL-2 changed the owner's requirement: the arrival from a rift and the close-up became a pass across the screen, the strike waits
// for the figure to have gone, and the whole call is about three to four seconds; a tap skips to the strike)
test('the beats run in order: the horn, the pass, the build-up, the strike in beats, the aftermath, the resume', () => {
  for (const m of [FULL, SHORT]) {
    const order = [m.HORN, m.PASS, m.EXIT, m.SPRITE, m.BUILD, m.STRIKE, m.AFTER, m.RESUME];
    for (let i = 1; i < order.length; i++) assert.ok(order[i] >= order[i - 1], `${i}`);
    assert.ok(m.STRIKE >= m.EXIT && m.STRIKE > m.BUILD, 'the strike lands only once the Eidolon has gone, after a build-up');
    const beats = beatTimes(m, 4);
    assert.ok(beats[0] === m.STRIKE && beats[beats.length - 1] < m.AFTER);
  }
  assert.ok(FULL.RESUME >= 3000 && FULL.RESUME <= 4000, 'about three to four seconds in full');
  assert.ok(buildAt(FULL, true) === FULL.BUILD && buildAt(FULL, false) === FULL.SPRITE, 'with no sprite the build-up begins as the painting goes');
  assert.deepEqual([0, FULL.PASS, FULL.SPRITE, FULL.BUILD, FULL.STRIKE, FULL.AFTER, FULL.RESUME].map((t) => shotAt(FULL, t)), ['horn', 'pass', 'sprite', 'build', 'strike', 'after', 'resume']);
  assert.ok(!SHOTS.map((x) => x).some((x, i) => SHOTS.indexOf(x) !== i));
  assert.ok(SNAP_ZOOM > 1, 'a snap zoom on the blow');
  assert.ok(SHORT.RESUME <= 2200, 'about two seconds short');
  assert.equal(beatTimes(SHORT, 4).length, 2);
  assert.ok(FULL.HIT_STOP > SHORT.HIT_STOP && FULL.HIT_STOP >= 150, 'a heavier freeze than an ultimate');
  assert.ok(FULL.BARS && !SHORT.BARS);
  // (a tap skips to the strike: never back in time, never before the figure has gone, never past the strike)
  for (const m of [FULL, SHORT])
    for (const t of [0, 300, m.PASS + 200, m.EXIT, m.STRIKE - 10]) {
      const to = skipTarget(m, t);
      assert.ok(to >= t && to >= m.EXIT && to <= Math.max(t, m.STRIKE));
    }
});

test('every Eidolon has its look and its own three or four beats', () => {
  for (const e of EIDOLONS) {
    assert.ok(LOOKS[e.element], e.id);
    // (its portrait's eyes, its lines as it passes (the first time its first words), and the heroes' answers)
    assert.ok(EYES[e.id], e.id);
    assert.equal(lineOf(e, true, 4), e.line);
    assert.ok(e.lines.length >= 2 && e.lines.includes(lineOf(e, false, 1)));
    assert.ok(REACTIONS[e.element].length >= 2 && reactionOf(e.element, 7));
    const c = CHOREO[e.id];
    assert.ok(c && c.length >= 3 && c.length <= 4, e.id);
    assert.equal(c[0], 'foes', `${e.id} strikes the foes on its first beat, where its attack has run to`);
    for (const b of c) if (b !== 'foes') for (const [x, y] of b) assert.ok(x >= 0 && x <= 1 && y >= 0 && y <= 1);
  }
});

test('the horn shows its fill from mouthpiece to bell, a glow growing with it, steady when full', () => {
  assert.deepEqual(hornLook(0), { share: 0, full: false, glow: 0.15 });
  assert.equal(hornLook(500).share, 0.5);
  assert.ok(hornLook(900).glow > hornLook(100).glow);
  assert.deepEqual(hornLook(HORN_FULL), { share: 1, full: true, glow: 1 });
  assert.equal(hornWords(640.5), '640/1000');
  assert.equal(hornWords(HORN_FULL), 'Full');
  assert.equal(hornLine({ added: 100, fill: 740, filled: false }), 'War Horn +100 · 740/1000');
  assert.match(hornLine({ added: 60, fill: 1000, filled: true })!, /full/);
  assert.equal(hornLine({ added: 0, fill: 1000, filled: false }), undefined);
  assert.ok(motesFor(100, false) > motesFor(1, false));
  assert.ok(motesFor(100, true) < motesFor(100, false));
});
