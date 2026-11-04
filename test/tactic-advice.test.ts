import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adviseTactic } from '../src/sim/tacticAdvice';
import { FOE_BANDS } from '../src/sim/foes';

// The tactic sheet's advice (docs/notes/tactics.md, batch 5): Advance together against every band, and a warning against holding the line
// when two in five or more of the foes shoot (the measured loss: 7 to 17 points against the gorgons).

test('the advice is Advance together, and warns against holding the line only where the foes shoot', () => {
  for (const [band, foes] of Object.entries(FOE_BANDS)) {
    const a = adviseTactic(foes, 'hold');
    assert.equal(a.tactic, 'advance', band);
    assert.equal(adviseTactic(foes, 'advance').warn, undefined, `${band}: no warning for Advance`);
  }
  assert.ok(adviseTactic(FOE_BANDS.gorgons, 'hold').warn);
  assert.equal(adviseTactic(FOE_BANDS.minotaurs, 'hold').warn, undefined);
  assert.equal(adviseTactic(FOE_BANDS.skeletons, 'hold').warn, undefined, 'one archer in five is not a band that shoots');
  assert.equal(adviseTactic([], 'hold').warn, undefined);
});
