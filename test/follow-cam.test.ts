// BATTLE-POLISH (docs/notes/battle-polish.md): the fight camera follows the fighting (`followCamRules.ts`), and a camera the player moved is
// theirs for a few seconds after their last touch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { engagedAt, FOLLOW, followFrame, followView, heatOf, HOLD_MS, manualHeld, RETURN_MOVE_MS, RETURN_MS, returnEase, tileKey, type HotSpot } from '../src/render/followCamRules';
import { framing } from '../src/render/cameraRules';

const spot = (x: number, y: number, engaged: boolean, heat = engaged ? FOLLOW.ENGAGED : FOLLOW.IDLE): HotSpot => ({ x, y, tall: 40, engaged, heat });

test('heat: a little for being alive, more in a fight, more for a blow a moment ago, most for an ultimate; each fades to none', () => {
  assert.equal(heatOf({ engaged: false }), FOLLOW.IDLE);
  assert.equal(heatOf({ engaged: true }), FOLLOW.ENGAGED);
  assert.equal(heatOf({ engaged: true, sinceBlow: 0 }), FOLLOW.ENGAGED + FOLLOW.BLOW);
  assert.ok(heatOf({ engaged: true, sinceBlow: FOLLOW.BLOW_MS / 2 }) < FOLLOW.ENGAGED + FOLLOW.BLOW);
  assert.equal(heatOf({ engaged: true, sinceBlow: FOLLOW.BLOW_MS }), FOLLOW.ENGAGED);
  assert.ok(heatOf({ engaged: false, sinceUlt: 0 }) > heatOf({ engaged: true, sinceBlow: 0 }), 'an ultimate outweighs a blow');
  assert.equal(heatOf({ engaged: false, sinceUlt: FOLLOW.ULT_MS + 1 }), FOLLOW.IDLE);
});

test('engaged: a foe within two tiles, diagonals counting one', () => {
  const foes = new Set([tileKey(5, 5)]);
  assert.ok(engagedAt(3, 3, foes));
  assert.ok(engagedAt(7, 5, foes));
  assert.ok(!engagedAt(2, 5, foes));
  assert.ok(engagedAt(3.4, 5, foes), 'a fighter mid-step counts from its nearest tile');
});

test('the follow looks at the fight, not the average of everyone alive', () => {
  // (a fight of four at the right; two idle fighters far off at the left)
  const spots = [spot(400, 200, true), spot(440, 210, true), spot(420, 240, true), spot(460, 230, true), spot(-200, 100, false), spot(-220, 300, false)];
  const f = followFrame(spots)!;
  const everyone = framing(spots)!;
  const mid = (everyone.x0 + everyone.x1) / 2;
  assert.ok(f.cx > 380 && f.cx < 480, `looks at the fight: ${f.cx}`);
  assert.ok(f.cx > mid + 150, 'well off the middle of everyone');
  // (the idle ones are not framed: the box is the fight's)
  assert.ok(f.box.x0 > 0);
});

test('the follow leans to the hotter fight, and zooms out to keep every fight in view', () => {
  const left = [spot(0, 200, true), spot(30, 210, true)];
  const right = [spot(600, 200, true), spot(630, 210, true)];
  const even = followFrame([...left, ...right])!;
  const hot = followFrame([...left, ...right.map((s) => ({ ...s, heat: heatOf({ engaged: true, sinceUlt: 0 }) }))])!;
  assert.ok(hot.cx > even.cx + 100, 'an ultimate on the right draws the middle that way');
  // (even leaning, both fights stay inside the box)
  for (const s of [...left, ...right]) assert.ok(s.x >= hot.box.x0 && s.x <= hot.box.x1, `${s.x} in ${hot.box.x0}..${hot.box.x1}`);
  // (and the view zooms out for the wider box)
  const one = followView(left, 360, 400, 1, 0.2, 3)!;
  const both = followView([...left, ...right], 360, 400, 1, 0.2, 3)!;
  assert.ok(both.zoom < one.zoom);
  assert.equal(followView([], 360, 400, 1, 0.2, 3), null);
});

test('with nobody in a fight yet, it frames everyone', () => {
  const spots = [spot(0, 100, false), spot(300, 100, false)];
  const f = followFrame(spots)!;
  assert.ok(f.box.x0 <= 0 && f.box.x1 >= 300);
});

test('a moved camera is the player\'s for HOLD_MS after the last touch, while a finger is down, then eased back slowly', () => {
  assert.equal(manualHeld(null, 1000, false), false);
  assert.equal(manualHeld(1000, 1000 + HOLD_MS - 1, false), true);
  assert.equal(manualHeld(1000, 1000 + HOLD_MS, false), false);
  assert.equal(manualHeld(1000, 1000 + HOLD_MS * 5, true), true, 'a finger still on the board keeps it');
  const usual = { move: 420, zoom: 650 };
  assert.deepEqual(returnEase(null, 5000, usual), usual);
  assert.equal(returnEase(5000, 5000, usual).move, RETURN_MOVE_MS);
  assert.deepEqual(returnEase(5000, 5000 + RETURN_MS, usual), usual);
  assert.ok(HOLD_MS >= 3500 && HOLD_MS <= 4500, 'about 4 s, the owner\'s ask');
});
