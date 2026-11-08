// BENCH-MARKS: the Heroes tab wears one mark at most, and only when there is something to do inside (docs/notes/bench-marks.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heroesTabMark, type HeroesNews } from '../src/heroesTabMark';

const none: HeroesNews = { ready: 0, quest: false, freshStock: false, visitor: null };

test('nothing to do inside: no mark at all', () => {
  assert.equal(heroesTabMark(none), null);
});

test('each thing to do alone gives its own mark', () => {
  assert.deepEqual(heroesTabMark({ ...none, ready: 2 }), { kind: 'upgrade', count: 2 });
  assert.deepEqual(heroesTabMark({ ...none, quest: true }), { kind: 'quest' });
  assert.deepEqual(heroesTabMark({ ...none, freshStock: true }), { kind: 'shop', visitor: null });
  assert.deepEqual(heroesTabMark({ ...none, visitor: 'caravan' }), { kind: 'shop', visitor: 'caravan' });
});

test('several at once: only the most pressing one shows', () => {
  const all: HeroesNews = { ready: 3, quest: true, freshStock: true, visitor: 'dealer' };
  assert.deepEqual(heroesTabMark(all), { kind: 'upgrade', count: 3 });
  assert.deepEqual(heroesTabMark({ ...all, ready: 0 }), { kind: 'quest' });
  assert.deepEqual(heroesTabMark({ ...all, ready: 0, quest: false }), { kind: 'shop', visitor: 'dealer' });
});

test('the upgrade count is capped at 99', () => {
  assert.deepEqual(heroesTabMark({ ...none, ready: 140 }), { kind: 'upgrade', count: 99 });
});
