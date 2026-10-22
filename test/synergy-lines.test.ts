import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeTier, closestTrait, countTraits, nextTierLine } from '../src/sim/traits';

const get = (kinds: string[], id: string) => countTraits(kinds).find((c) => c.trait.id === id)!;

test('a trait with no tier yet says what the first one needs', () => {
  const c = get(['samurai'], 'samurai');
  assert.equal(activeTier(c), null);
  assert.equal(nextTierLine(c), '1 more hero for +1% attack');
});

test('an active trait gives its tier and still asks for the next', () => {
  const c = get(['samurai', 'kunoichi'], 'samurai');
  assert.equal(activeTier(c)?.text, '+1% attack');
  assert.equal(nextTierLine(c), '2 more heroes for +10% attack');
});

test('a trait at its last tier wants nothing more', () => {
  const c = get(['samurai', 'kunoichi', 'archer', 'ninjaMonk'], 'samurai');
  assert.equal(activeTier(c)?.text, '+10% attack');
  assert.equal(nextTierLine(c), null);
});

test('the closest trait is the one needing the fewest more heroes', () => {
  assert.equal(closestTrait(countTraits([])), null);
  const near = closestTrait(countTraits(['samurai', 'kunoichi', 'archer']));
  assert.equal(near?.trait.id, 'samurai');
});
