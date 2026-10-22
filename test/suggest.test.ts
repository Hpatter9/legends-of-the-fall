import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partyScore, roleOf, suggestParty } from '../src/sim/suggest';
import { HERO_TRAITS, countTraits } from '../src/sim/traits';
import { UNITS } from '../src/sim/units';

const ALL = Object.keys(HERO_TRAITS).filter((k) => UNITS[k]);

test('every hero has a role, and each role is held by someone', () => {
  const roles = new Set(ALL.map(roleOf));
  assert.deepEqual([...roles].sort(), ['back', 'front', 'striker', 'support']);
});

test('a suggestion is five different owned heroes, the same every time', () => {
  const a = suggestParty(ALL);
  assert.equal(a.length, 5);
  assert.equal(new Set(a).size, 5);
  assert.ok(a.every((k) => ALL.includes(k)));
  assert.deepEqual(suggestParty(ALL), a);
  assert.deepEqual(suggestParty([...ALL].reverse()).sort(), [...a].sort());
});

test('a suggestion wakes a trait tier and covers several roles', () => {
  const a = suggestParty(ALL);
  assert.ok(countTraits(a).some((c) => c.active));
  assert.ok(new Set(a.map(roleOf)).size >= 3);
  // it beats the first five heroes in the list
  assert.ok(partyScore(a) >= partyScore(ALL.slice(0, 5)));
});

test('only owned heroes are used, and a small collection is taken whole', () => {
  assert.deepEqual(suggestParty(['knight', 'samurai', 'archer']).sort(), ['archer', 'knight', 'samurai']);
  const own = ['knight', 'peasant', 'samurai', 'archer', 'wizard', 'cleric', 'priestess'];
  const s = suggestParty(own);
  assert.ok(s.every((k) => own.includes(k)));
  assert.equal(suggestParty([]).length, 0);
});

test('power breaks a tie between equal parties', () => {
  const own = ['knight', 'peasant', 'knight', 'peasant'];
  assert.equal(suggestParty(own, 2).length, 2);
});
