// DEPTH-BUILD (docs/notes/depth-build.md): hero legacy, the Hall of Legends.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY, PERKS, apprenticeXp, canRetire, legacyBoost, legacySnapshot, mentorOf, mentoredXp, perkFor, readMentors, recall, retire, retired, whyNotRetire } from '../src/sim/legacy';
import { startedMeta, loadMeta } from '../src/sim/meta';
import { xpFor } from '../src/sim/levels';
import { ALL_HEROES } from '../src/sim/units';

const T = 1_000_000;
const meta = () => {
  const m = startedMeta(1);
  m.unlocked = [...new Set([...m.unlocked, 'samurai', 'archer', 'barbarian', 'cleric', 'paladin', 'priestess'])];
  m.castle.hall = 2;
  m.xp.knight = xpFor(60);
  return m;
};

test('every hero has one legacy perk, small, rising at the bands', () => {
  for (const k of ALL_HEROES) {
    const p = PERKS[k];
    assert.ok(p, k);
    assert.ok(p.steps[0] < p.steps[1] && p.steps[1] < p.steps[2] && p.steps[2] <= 0.08, k);
  }
  assert.equal(Object.keys(PERKS).length, ALL_HEROES.length);
});

test('only level 60 and up, one a calling, one a seat of the Hall', () => {
  const m = meta();
  m.xp.samurai = xpFor(59);
  assert.match(whyNotRetire(m, 'samurai', T)!, /Level 60/);
  m.castle.hall = 0;
  assert.equal(canRetire(m, 'knight', T), false, 'no Hall');
  m.castle.hall = 1;
  assert.ok(retire(m, 'knight', T));
  assert.ok(retired(m, 'knight') && !m.party.includes('knight'));
  m.xp.samurai = xpFor(70);
  assert.match(whyNotRetire(m, 'samurai', T)!, /martial seat is taken/);
  m.xp.cleric = xpFor(60);
  assert.match(whyNotRetire(m, 'cleric', T)!, /Every seat/);
  m.castle.hall = 2;
  assert.ok(retire(m, 'cleric', T), 'a second seat, another calling');
});

test('apprentices earn +50% XP only while below half the mentor\'s level, and the perk only reaches apprentices', () => {
  const m = meta();
  m.xp.knight = xpFor(80);
  retire(m, 'knight', T);
  m.xp.samurai = xpFor(30);
  assert.equal(mentorOf(m, 'samurai'), 'knight');
  assert.equal(apprenticeXp(m, 'samurai'), 1.5);
  m.xp.samurai = xpFor(40);
  assert.equal(apprenticeXp(m, 'samurai'), 1, 'stops at half the mentor\'s level');
  assert.equal(apprenticeXp(m, 'cleric'), 1, 'another calling');
  assert.equal(apprenticeXp(m, 'knight'), 1, 'not the mentor itself');
  m.xp.samurai = xpFor(10);
  assert.deepEqual(mentoredXp(m, { samurai: 100, cleric: 100 }), { samurai: 150, cleric: 100 });
  const p = perkFor(m, 'samurai')!;
  assert.equal(p.value, PERKS.knight.steps[1], 'the level-80 band');
  assert.equal(perkFor(m, 'cleric'), null);
  const snap = legacySnapshot(m, ['samurai', 'cleric']);
  assert.deepEqual(Object.keys(snap), ['samurai']);
  const b = legacyBoost(snap, 'samurai', { hp: 2, atk: 2 });
  assert.equal(b.shield, PERKS.knight.steps[1], 'Shield-Call: a shield at the wave\'s start');
  assert.deepEqual(legacyBoost(snap, 'cleric', { hp: 2 }), { hp: 2 });
});

test('a bonded partner of the mentor has the perk at double strength', () => {
  const m = meta();
  retire(m, 'knight', T);
  m.bonds = { 'knight|samurai': 120 };
  assert.equal(perkFor(m, 'samurai')!.bonded, false, 'not kindred: Comrades at most');
  m.bonds = { 'knight|paladin': 120 };
  m.xp.paladin = xpFor(10);
  // (the paladin reads hymnals: not the knight's apprentice; a martial partner then)
  assert.equal(perkFor(m, 'paladin'), null);
  m.bonds = { 'knight|peasant': 120 };
  assert.ok(perkFor(m, 'peasant')!.bonded);
  assert.equal(perkFor(m, 'peasant')!.value, PERKS.knight.steps[0] * LEGACY.BOND_MULT);
});

test('recall stops the perks at once and shuts the seat for seven days', () => {
  const m = meta();
  retire(m, 'knight', T);
  assert.ok(recall(m, 'martial', T));
  assert.equal(retired(m, 'knight'), false);
  assert.equal(mentorOf(m, 'samurai'), undefined);
  assert.match(whyNotRetire(m, 'knight', T + 1000)!, /empty for a while/);
  assert.equal(canRetire(m, 'knight', T + LEGACY.RECALL_MS + 1), true);
});

test('old saves have no mentors; odd ones are dropped', () => {
  const m = meta();
  assert.equal(loadMeta(1, { getItem: () => JSON.stringify({ ...m, mentors: undefined }) }).mentors, undefined);
  assert.deepEqual(readMentors({ martial: { kind: 'knight', since: 5 }, arcane: { kind: 'knight' }, wild: 3 }), { martial: { kind: 'knight', since: 5 } });
});
