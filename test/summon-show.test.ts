import test from 'node:test';
import assert from 'node:assert/strict';
import { cardTimes, drawOrder, HEROES_AFTER_MS, HEROES_AT_ONCE_MS, shardTotals } from '../src/render/summonRules';
import type { Pull } from '../src/sim/meta';

// SUMMON-SHOW (the owner: "Have the tarot cards, shards only show first. Then after that the unlocked heroes can show."):
// a draw's shard cards all come before any new hero, and the new heroes come one after another, the last one held.
const shard = (kind: string, n = 1, have?: number, need?: number): Pull => ({ kind, isNew: false, shards: have === undefined ? n : 0, ...(have !== undefined ? { unlock: n, have, need } : {}) });
const hero = (kind: string, lucky = false): Pull => ({ kind, isNew: true, shards: 0, ...(lucky ? { lucky } : {}) });

test('a ten-draw shows every shard card before any new hero, each in the order drawn', () => {
  const got = [shard('a'), hero('h1'), shard('b'), shard('c'), hero('h2'), shard('a'), shard('d'), shard('e'), hero('h3'), shard('b')];
  const o = drawOrder(got);
  assert.deepEqual(o.cards, [0, 2, 3, 5, 6, 7, 9]);
  assert.deepEqual(o.heroes, [1, 4, 8]);
  assert.equal(o.held, 8, 'the last new hero is the one held');
  assert.equal(o.heroesAfter, HEROES_AFTER_MS);
  // (every result is shown once)
  assert.deepEqual([...o.cards, ...o.heroes].sort((x, y) => x - y), [...got.keys()]);
});

test('a draw of shards only has no heroes and nothing held', () => {
  const o = drawOrder(Array.from({ length: 10 }, (_, i) => shard(`k${i % 3}`)));
  assert.equal(o.cards.length, 10);
  assert.deepEqual(o.heroes, []);
  assert.equal(o.held, -1);
  assert.equal(o.heroesAfter, 0);
});

test('a draw of new heroes only has no cards, and its first reveal comes almost at once', () => {
  const o = drawOrder(Array.from({ length: 10 }, (_, i) => hero(`h${i}`)));
  assert.deepEqual(o.cards, []);
  assert.equal(o.heroes.length, 10);
  assert.equal(o.held, 9);
  assert.equal(o.heroesAfter, HEROES_AT_ONCE_MS);
});

test('a single draw keeps working: one card, or one hero held', () => {
  assert.deepEqual(drawOrder([shard('a')]), { cards: [0], heroes: [], held: -1, heroesAfter: 0 });
  assert.deepEqual(drawOrder([hero('h')]), { cards: [], heroes: [0], held: 0, heroesAfter: HEROES_AT_ONCE_MS });
});

test('the shard cards turn one after another, quickly', () => {
  const t = cardTimes(10);
  assert.equal(t.length, 10);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1]);
  assert.ok(t[9] < 2000, 'ten cards turn within two seconds');
});

test('the shard totals list each hero once, its whole share and its bar after the last card', () => {
  const got = [shard('a', 1, 4, 15), shard('r', 2), hero('h'), shard('a', 1, 5, 15), { ...shard('t', 0), crowns: 40 }, shard('h', 1, 14, 15), shard('r', 1)];
  const t = shardTotals(got);
  assert.deepEqual(t.map((x) => x.kind), ['a', 'r', 't', 'h']);
  const a = t[0];
  assert.equal(a.cards, 2);
  assert.equal(a.unlock, 2);
  assert.equal(a.have, 5);
  assert.equal(a.need, 15);
  assert.equal(t[1].rank, 3);
  assert.equal(t[2].crowns, 40);
  assert.equal(t[3].joins, true, 'a hero whose shards are in the draw and who joins in it is marked');
  assert.equal(a.joins, false);
});
