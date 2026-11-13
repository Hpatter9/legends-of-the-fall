// SEVEN-SLOT GEAR batch 5: the rune page's pure helpers (`runes.ts`): a hero's sockets with their twins, its runes' total in words, where
// a tapped rune can go, and what a tap on a target does.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RUNE_SCALE, RUNE_STATS, dropRune, mergesReady, newRunes, runeTargets, runeTotals, socketsOf, type Rune } from '../src/sim/runes';

const rune = (id: number, kind: Rune['kind'], lv: Rune['lv']): Rune => ({ id, kind, lv });
const state = () => {
  const st = newRunes();
  st.bag.push(rune(1, 'ember', 1), rune(2, 'keystone', 2), rune(3, 'gale', 1));
  st.worn.knight = [rune(4, 'ember', 1), rune(5, 'bulwark', 2)];
  st.next = 6;
  return st;
};

test('a hero\'s three sockets: its runes, the empty ones, and which have a twin', () => {
  const st = state();
  const s = socketsOf(st, 'knight');
  assert.equal(s.length, 3);
  assert.deepEqual(s.map((x) => [x.rune?.id, x.twin]), [[4, true], [5, true], [undefined, false]]);
  assert.deepEqual(socketsOf(st, 'archer').map((x) => x.rune), [undefined, undefined, undefined]);
  assert.equal(mergesReady(st), 2);
});

test('the total in words, by the runes\' levels and the knob', () => {
  const st = state();
  const k = RUNE_SCALE.k;
  const line = runeTotals(st.worn.knight);
  assert.ok(line.includes(`+${Math.round(RUNE_STATS.ember.atk! * k * 1000) / 10}% attack`), line);
  assert.ok(line.includes('defence') && line.includes('hp'), line);
  // (FEWER-RUNES: the signatures it carries, by their short names)
  assert.ok(line.includes('kindling') && line.includes('brace'), line);
  assert.equal(runeTotals(undefined), '');
});

test('a tapped rune lights the heroes it can go on, the bag when worn, and its twins; a Keystone goes on no hero', () => {
  const st = state();
  // (FEWER-RUNES: a drag merges with any rune of its level or a Keystone, `merge`; a tap with its twins only)
  assert.deepEqual(runeTargets(st, 1, ['knight', 'archer']), { heroes: ['knight', 'archer'], bag: false, merge: [2, 3, 4], twins: [2, 4] });
  assert.deepEqual(runeTargets(st, 4, ['knight', 'archer']), { heroes: ['archer'], bag: true, merge: [1, 2, 3], twins: [1, 2] });
  assert.deepEqual(runeTargets(st, 2, ['knight']).heroes, [], 'a Keystone is never worn');
  assert.deepEqual(runeTargets(st, 2, ['knight']).merge, [1, 3, 4, 5], 'it merges with a rune of any level');
});

test('a tap on a target: onto a twin merges, onto a hero sets, onto the bag takes off, onto a hero\'s rune that is no twin swaps', () => {
  const st = state();
  assert.equal(dropRune(st, 1, { rune: 4 }), 'merged');
  assert.deepEqual(st.worn.knight[0], rune(4, 'ember', 2));
  assert.equal(dropRune(st, 3, { kind: 'archer' }), 'set');
  assert.deepEqual(st.worn.archer, [rune(3, 'gale', 1)]);
  assert.equal(dropRune(st, 3, { bag: true }), 'off');
  assert.equal(st.worn.archer, undefined);
  st.worn.knight.push(rune(6, 'hawk', 1));
  assert.equal(dropRune(st, 3, { rune: 6 }), 'set', 'a swap onto a full hero');
  assert.ok(st.worn.knight.some((r) => r.id === 3) && st.bag.some((r) => r.id === 6));
  assert.equal(dropRune(st, 2, { kind: 'knight' }), null, 'a Keystone cannot be set');
  // (FEWER-RUNES: two kinds of one level merge only by a drag, `anyKind`; a tap onto a hero's other rune swaps, as before)
  const two = state();
  assert.equal(dropRune(two, 3, { rune: 4 }), 'set', 'a tap: the Gale I swaps in for the Ember I');
  const three = state();
  assert.equal(dropRune(three, 3, { rune: 4, anyKind: true }), 'merged', 'a drag: they merge');
  assert.deepEqual(three.worn.knight[0], rune(4, 'ember', 2), 'into the kind of the one it landed on');
});
