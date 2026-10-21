import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, newMeta, partySlots, saveMeta, setParty, type Meta } from '../src/sim/meta';
import { newRun, summon, START_GOLD } from '../src/sim/run';
import { ALL_HEROES, HEROES } from '../src/sim/units';

/** A store that holds one saved value, as `localStorage` would. */
const storeOf = (value: unknown) => ({ getItem: () => (value === undefined ? null : JSON.stringify(value)) });

test('a new meta takes the first five heroes as its party', () => {
  const m = newMeta(4);
  assert.deepEqual(m.party, [...HEROES]);
  assert.equal(partySlots(m), 5);
});

test('a party is saved and loaded back', () => {
  const m = newMeta(4);
  m.unlocked.push('kitsune', 'karasu');
  assert.equal(setParty(m, ['knight', 'kitsune', 'karasu', 'archer', 'wizard']), true);
  const store: Record<string, string> = {};
  saveMeta(m, { setItem: (k, v) => (store[k] = v) });
  const back = loadMeta(1, { getItem: (k) => store[k] ?? null });
  assert.deepEqual(back.party, ['knight', 'kitsune', 'karasu', 'archer', 'wizard']);
});

test('a party takes only unlocked kinds, each once, and a full five (or all unlocked)', () => {
  const m = newMeta(4);
  assert.equal(setParty(m, ['knight', 'samurai', 'kunoichi', 'archer']), false, 'four is not a party of five');
  assert.equal(setParty(m, ['knight', 'knight', 'kunoichi', 'archer', 'wizard']), false, 'no repeats');
  assert.equal(setParty(m, ['knight', 'samurai', 'kunoichi', 'archer', 'kitsune']), false, 'kitsune is not unlocked');
  assert.deepEqual(m.party, [...HEROES], 'a refused party changes nothing');
  // with only three unlocked, a party is those three
  const few = { ...newMeta(4), unlocked: ['knight', 'archer', 'wizard'] } as Meta;
  assert.equal(partySlots(few), 3);
  assert.equal(setParty(few, ['wizard', 'knight', 'archer']), true);
});

test('summons draw only from the party, starting heroes included', () => {
  const party = ['knight', 'archer'];
  const r = newRun(21, party);
  r.gold = 100000;
  assert.ok(r.roster.every((h) => party.includes(h.kind)), 'the starting heroes are from the party');
  for (let i = 0; i < 40; i++) summon(r);
  assert.ok(r.roster.every((h) => party.includes(h.kind)));
  assert.deepEqual(r.pool, party);
});

test('a run from a full party pays for summons from that party', () => {
  const m = newMeta(9);
  m.unlocked.push('peasant');
  setParty(m, ['peasant', 'samurai', 'kunoichi', 'archer', 'wizard']);
  const r = newRun(5, m.party, m.castle);
  assert.ok(r.gold >= START_GOLD);
  for (let i = 0; i < 20; i++) summon(r);
  assert.ok(r.roster.every((h) => m.party.includes(h.kind)));
  assert.ok(!r.roster.some((h) => h.kind === 'knight'), 'a hero left out of the party is never summoned');
});

test('an old save with no party gets the first five unlocked', () => {
  const old = { seed: 3, crowns: 5, unlocked: [...HEROES, 'peasant'], pulls: 0, dry: 0, shards: {}, stars: {}, xp: {} };
  const m = loadMeta(1, storeOf(old));
  assert.deepEqual(m.party, [...HEROES]);
});

test('a saved party keeps only kinds still unlocked, unique, at most five', () => {
  const saved = { seed: 3, crowns: 5, unlocked: [...HEROES, 'peasant'], party: ['peasant', 'ghost', 'peasant', 'knight', 'archer', 'samurai', 'kunoichi', 'wizard'] };
  assert.deepEqual(loadMeta(1, storeOf(saved)).party, ['peasant', 'knight', 'archer', 'samurai', 'kunoichi']);
  const emptied = { seed: 3, crowns: 5, unlocked: [...HEROES], party: ['ghost'] };
  assert.deepEqual(loadMeta(1, storeOf(emptied)).party, [...HEROES], 'nothing valid means the default');
});

test('every hero in the game can be put in a party once unlocked', () => {
  const m = newMeta(2);
  m.unlocked = [...ALL_HEROES];
  assert.equal(setParty(m, ALL_HEROES.slice(-5)), true);
});
