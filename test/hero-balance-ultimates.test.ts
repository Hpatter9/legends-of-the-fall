import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heroLifts } from '../tools/heroSweep';
import { ALL_HEROES } from '../src/sim/units';
import { ULT_LEVEL } from '../src/sim/abilities';

// The same table as `hero-balance.test.ts`, with every hero at level 30 (both skills and its ultimate open) and the fights at stage 78, where a team of
// level 30 heroes wins about half. (It was stage 39 until ULT-CHARGE, docs/notes/ult-charge.md: the ultimates used to fire about once in ten fights, and
// now each hero fires its own once or twice a fight, so a level-30 team is that much stronger and the stage where it wins half is that much higher.) Each hero's skill 2
// strength (`TUNE2` in `kits/table.ts`) and ultimate (`TUNE` in `ultimates.ts`) are set so the roster stays within 6 points of its average (4 until the
// hero kits, COMBAT-002, when the owner allowed heroes to be less equal); when a kit or a hero's stats change, re-run `node tools/kits/tune.mjs` and retune
// rather than loosening this.
test('every hero is within 6 points of the roster average win rate with its ultimate unlocked', () => {
  const lifts = heroLifts(12000, 78, 0, ULT_LEVEL);
  assert.equal(lifts.length, ALL_HEROES.length);
  const average = lifts.reduce((n, h) => n + h.win, 0) / lifts.length;
  assert.ok(average > 35 && average < 65, `the average team wins ${average.toFixed(1)}%, so the table can tell heroes apart`);
  for (const h of lifts) assert.ok(Math.abs(h.lift) <= 6, `${h.kind} is ${h.lift.toFixed(1)} points from the average at level ${ULT_LEVEL}`);
});
