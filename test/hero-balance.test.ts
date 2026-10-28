import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heroLifts } from '../tools/heroSweep';
import { ALL_HEROES } from '../src/sim/units';

// With the tiers gone, no hero is worth far more than another: each wins within 6 points of the roster average in random
// five-hero teams (the balance tool's table 1, at stage 5, where the average team wins about half). The band was 4 points until
// the hero kits (COMBAT-002), when the owner allowed heroes to be less equal: 6. The fights are seeded, so the numbers are the same
// every run; when a hero's stats or kit change, re-run `node tools/kits/tune.mjs` (or `npm run balance -- --heroes-only --games 12000`)
// and retune rather than loosening this.
test('every hero is within 6 points of the roster average win rate', () => {
  const lifts = heroLifts(12000, 5);
  assert.equal(lifts.length, ALL_HEROES.length);
  const average = lifts.reduce((n, h) => n + h.win, 0) / lifts.length;
  assert.ok(average > 35 && average < 65, `the average team wins ${average.toFixed(1)}%, so the table can tell heroes apart`);
  for (const h of lifts) assert.ok(Math.abs(h.lift) <= 6, `${h.kind} is ${h.lift.toFixed(1)} points from the average`);
});
