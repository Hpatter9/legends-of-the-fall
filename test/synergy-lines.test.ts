import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeTier, closestTrait, countTraits, nextTierLine } from '../src/sim/traits';

const get = (kinds: string[], id: string) => countTraits(kinds).find((c) => c.trait.id === id)!;

test('a trait with no tier yet says what the first one needs', () => {
  const c = get(['samurai'], 'samurai');
  assert.equal(activeTier(c), null);
  assert.equal(nextTierLine(c), '1 more hero for First cut of each wave: a keen crit');
});

test('an active trait gives its tier and still asks for the next', () => {
  const c = get(['samurai', 'kunoichi'], 'samurai');
  assert.equal(activeTier(c)?.text, 'First cut of each wave: a keen crit');
  assert.equal(nextTierLine(c), '1 more hero for A lone duel won quickens the Samurai');
});

test('a trait at its last tier wants nothing more', () => {
  const c = get(['samurai', 'kunoichi', 'archer', 'ninjaMonk'], 'samurai');
  assert.equal(activeTier(c)?.text, 'The first Samurai to fall fights on, unkillable');
  assert.equal(nextTierLine(c), null);
});

test('the closest trait is the one needing the fewest more heroes', () => {
  assert.equal(closestTrait(countTraits([])), null);
  const near = closestTrait(countTraits(['samurai', 'kunoichi', 'archer']));
  assert.equal(near?.trait.id, 'samurai');
});
