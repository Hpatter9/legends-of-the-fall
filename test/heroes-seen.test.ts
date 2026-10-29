import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMeta, newMeta, pickStarter, pullOnce, saveMeta, startedMeta } from '../src/sim/meta';
import { heroSeen, markHeroSeen, readHeroesSeen, unseenHeroes } from '../src/sim/heroesSeen';
import { needOf, toCollect } from '../src/sim/unlock';
import { HEROES } from '../src/sim/units';

// SUMMON-TAROT: every hero has a first-time reveal the first time it joins; `Meta.heroesSeen` says whose has played.
const roundTrip = (m: object) => {
  const store: Record<string, string> = {};
  saveMeta(m as never, { setItem: (k, v) => (store[k] = v) });
  return loadMeta(1, { getItem: (k) => store[k] ?? null });
};

test('a save from before the reveals counts every hero it owns as seen', () => {
  const m = startedMeta(3) as unknown as Record<string, unknown>;
  delete m.heroesSeen;
  const back = roundTrip(m);
  assert.deepEqual(back.heroesSeen, back.unlocked);
  assert.deepEqual(unseenHeroes(back), []);
});

test('a new save counts its starters as seen, and nothing else', () => {
  const m = newMeta(9);
  assert.deepEqual(m.heroesSeen, []);
  assert.ok(pickStarter(m, 0));
  assert.deepEqual(unseenHeroes(m), []);
  for (const k of m.unlocked) assert.ok(heroSeen(m, k));
});

test('a hero who joins by shards is not seen until its reveal plays, and stays due across a reload', () => {
  const m = startedMeta(5);
  const kind = toCollect(m)[0];
  (m.unlock ??= {})[kind] = needOf(m) - 1;
  // (pull until the shard lands on it: the draw favours a hero begun)
  for (let i = 0; i < 400 && !m.unlocked.includes(kind); i++) pullOnce(m, { lucky: false });
  assert.ok(m.unlocked.includes(kind), 'the hero joined');
  assert.deepEqual(unseenHeroes(m), m.unlocked.filter((k) => !(HEROES as readonly string[]).includes(k)));
  assert.ok(!heroSeen(m, kind));
  const back = roundTrip(m);
  assert.ok(unseenHeroes(back).includes(kind), 'a missed reveal is still due after a reload');
  markHeroSeen(back, kind);
  assert.ok(heroSeen(back, kind));
  assert.ok(!unseenHeroes(back).includes(kind));
});

test('a lucky stone joins a hero whose reveal is due', () => {
  const m = startedMeta(6);
  const [p] = [pullOnce(m, { lucky: true })];
  assert.ok(p.isNew);
  assert.deepEqual(unseenHeroes(m), [p.kind]);
});

test('the saved list is made sane', () => {
  assert.deepEqual(readHeroesSeen(['knight', 'knight', 'nobody', 3], ['knight']), ['knight']);
  assert.deepEqual(readHeroesSeen(undefined, ['knight', 'archer']), ['knight', 'archer']);
  // (with no list at all every owned hero counts as seen; marking one starts the list without losing the others)
  const m = { unlocked: ['knight', 'archer'] as string[] } as { unlocked: string[]; heroesSeen?: string[] };
  assert.ok(heroSeen(m, 'knight'));
  markHeroSeen(m, 'archer');
  assert.deepEqual(m.heroesSeen, ['knight', 'archer']);
  assert.ok(!heroSeen(m, 'wizard'));
});
