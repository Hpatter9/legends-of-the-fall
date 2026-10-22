import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readyBattle } from './helpers';
import { playOut, type Battle } from '../src/sim/battle';
import { BOSS_STAR_TIME_MS, ratingOf, starCrowns, starGold, STAR_CROWNS, STAR_GOLD, STAR_TIME_MS } from '../src/sim/stars';
import { earn, loadMeta, startedMeta, recordStars, runCrowns, saveMeta, stageCrowns, starSummary } from '../src/sim/meta';
import { finish, newRun, reward, START_GOLD } from '../src/sim/run';

/** A fight already won in `t` ms, with no one fallen unless `fallen` says a hero did. */
function won(t: number, fallen = false): Battle {
  const b = readyBattle(3);
  b.phase = 'won';
  b.t = t;
  if (fallen) b.units.find((u) => u.side === 'hero')!.alive = false;
  return b;
}

test('a lost fight earns no stars, whatever else went well', () => {
  const b = won(1000);
  b.phase = 'lost';
  const r = ratingOf(b, false);
  assert.equal(r.stars, 0);
  assert.ok(r.rules.every((x) => !x.earned));
});

test('a win is one star, and each clean rule adds one', () => {
  assert.equal(ratingOf(won(STAR_TIME_MS - 100), false).stars, 3);
  assert.equal(ratingOf(won(STAR_TIME_MS - 100, true), false).stars, 2);
  assert.equal(ratingOf(won(STAR_TIME_MS, false), false).stars, 2);
  assert.equal(ratingOf(won(STAR_TIME_MS, true), false).stars, 1);
});

test('no one fell: a single fallen hero costs the second star', () => {
  const r = ratingOf(won(1000, true), false);
  assert.deepEqual(
    r.rules.map((x) => x.earned),
    [true, false, true],
  );
});

test('the time limit is 30 s, and a little more on a boss stage', () => {
  assert.equal(ratingOf(won(STAR_TIME_MS - 1), false).rules[2].earned, true);
  assert.equal(ratingOf(won(STAR_TIME_MS), false).rules[2].earned, false);
  assert.equal(ratingOf(won(STAR_TIME_MS), true).rules[2].earned, true);
  assert.equal(ratingOf(won(BOSS_STAR_TIME_MS - 1), true).stars, 3);
  assert.equal(ratingOf(won(BOSS_STAR_TIME_MS), true).stars, 2);
  assert.ok(BOSS_STAR_TIME_MS > STAR_TIME_MS);
});

test('the reasons name their limit', () => {
  assert.equal(ratingOf(won(1000), false).rules[2].text, 'Under 30 s');
  assert.equal(ratingOf(won(1000), true).rules[2].text, 'Under 45 s');
  assert.equal(ratingOf(won(1000), false).rules[1].text, 'No one fell');
});

test('a real fight rates the same way every time', () => {
  const a = ratingOf(playOut(readyBattle(7, 'skeletons')), false);
  const b = ratingOf(playOut(readyBattle(7, 'skeletons')), false);
  assert.deepEqual(a, b);
  assert.ok(a.stars >= 0 && a.stars <= 3);
});

test('each star adds crowns and gold to the win', () => {
  assert.equal(starCrowns(3), 3 * STAR_CROWNS);
  assert.equal(starGold(2), 2 * STAR_GOLD);
  assert.equal(starCrowns(0), 0);
  const m = startedMeta(1);
  assert.equal(earn(m, 4, true, 3), stageCrowns(4) + 9);
  assert.equal(earn(m, 4, false, 3), runCrowns(4));
  const r = newRun(4);
  finish(r, true, 3);
  assert.equal(r.gold, START_GOLD + reward(1) + 15);
});

test('the best stars are kept for each stage', () => {
  const m = startedMeta(2);
  assert.equal(starSummary(m), null);
  assert.equal(recordStars(m, 4, 2), true);
  assert.equal(recordStars(m, 4, 1), false);
  assert.equal(recordStars(m, 4, 3), true);
  assert.equal(recordStars(m, 4, 3), false);
  assert.equal(m.stars[4], 3);
  recordStars(m, 7, 1);
  assert.deepEqual(starSummary(m), { stage: 7, total: 4 });
});

test('a save from before stars loads with none, and bad entries are dropped', () => {
  const old = { seed: 5, crowns: 40, unlocked: ['knight'], pulls: 0, dry: 0, shards: {}, castle: {} };
  const fromOld = loadMeta(5, { getItem: () => JSON.stringify(old) });
  assert.deepEqual(fromOld.stars, {});
  const junk = { ...old, stars: { '3': 2, '5': 9, '6': -1, '7': 'a', x: 1, '0': 2 } };
  assert.deepEqual(loadMeta(5, { getItem: () => JSON.stringify(junk) }).stars, { '3': 2, '5': 3 });
});

test('stars save and load', () => {
  const m = startedMeta(6);
  recordStars(m, 9, 2);
  const saved: Record<string, string> = {};
  saveMeta(m, { setItem: (k, v) => (saved[k] = v) });
  const back = loadMeta(6, { getItem: (k) => saved[k] ?? null });
  assert.deepEqual(back.stars, { '9': 2 });
});
