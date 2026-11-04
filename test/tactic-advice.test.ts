import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adviseTactic } from '../src/sim/tacticAdvice';
import { FOE_BANDS } from '../src/sim/foes';

// The tactic sheet's advice (docs/notes/tactics.md, batches 5 and 6): Charge against a band that shoots, Advance behind a Shield Wall
// against slow brutes, Advance against the rest; a warning for the tactic that loses (Hold against archers, Charge against brutes).

const PARTY = ['knight', 'minotaur', 'samurai', 'archer', 'cleric'];

test('the advice: Charge against archers, a Shield Wall against brutes, Advance against the rest', () => {
  assert.equal(adviseTactic(FOE_BANDS.gorgons, PARTY, 'advance').tactic, 'charge');
  const brutes = adviseTactic(FOE_BANDS.ogres, PARTY, 'advance');
  assert.equal(brutes.tactic, 'advance');
  assert.equal(brutes.formation, 'wall');
  assert.equal(adviseTactic(FOE_BANDS.minotaurs, ['kunoichi', 'archer', 'wizard'], 'advance').formation, undefined, 'no wall without two front-liners');
  for (const band of ['skeletons', 'werewolves', 'satyrs', 'mixed', 'orcs', 'demons']) assert.equal(adviseTactic(FOE_BANDS[band], PARTY, 'advance').tactic, 'advance', band);
});

test('the warnings: Hold against a band that shoots, Charge against brutes; none for the advised tactic', () => {
  assert.ok(adviseTactic(FOE_BANDS.gorgons, PARTY, 'hold').warn);
  assert.ok(adviseTactic(FOE_BANDS.minotaurs, PARTY, 'charge').warn);
  assert.equal(adviseTactic(FOE_BANDS.gorgons, PARTY, 'charge').warn, undefined);
  assert.equal(adviseTactic(FOE_BANDS.skeletons, PARTY, 'hold').warn, undefined, 'one archer in five is not a band that shoots');
  assert.equal(adviseTactic([], PARTY, 'hold').warn, undefined);
});
