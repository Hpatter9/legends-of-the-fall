import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heroLifts } from '../tools/heroSweep';
import { ALL_HEROES } from '../src/sim/units';
import { ULT_LEVEL } from '../src/sim/abilities';

// The same table as `hero-balance.test.ts`, with every hero at level 30 (the level its ultimate unlocks) and the fights at stage 39, where a team of
// level 30 heroes wins about two in five (the ultimates fire only in the longer fights, so they decide little of it; a hero's own skill and passive set most of its lift). Each hero's ultimate has its own meter speed and strength (`TUNE` in `ultimates.ts`), set so the roster stays within
// 4 points of its average with them on as well as off; when an ultimate or a hero's stats change, re-run the sweep and retune rather than loosening this.
test('every hero is within 4 points of the roster average win rate with its ultimate unlocked', () => {
  const lifts = heroLifts(12000, 39, 0, ULT_LEVEL);
  assert.equal(lifts.length, ALL_HEROES.length);
  const average = lifts.reduce((n, h) => n + h.win, 0) / lifts.length;
  assert.ok(average > 35 && average < 65, `the average team wins ${average.toFixed(1)}%, so the table can tell heroes apart`);
  for (const h of lifts) assert.ok(Math.abs(h.lift) <= 4, `${h.kind} is ${h.lift.toFixed(1)} points from the average at level ${ULT_LEVEL}`);
});
