// The stone cut (QUESTS-3, Q2): quest pay set by stars, the shop's smaller chests, stones only in the chests of a new best Last Stand
// wave, the daily chest's and the Calamity's smaller shares, and quest chests that hold no stones for the easy quests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { chestStones } from '../src/sim/armyStars';
import { SHOP } from '../src/sim/chestShop';
import { newMeta, startedMeta, type Meta } from '../src/sim/meta';
import { handIn } from '../src/sim/quests';
import { GIVERS, QUESTS, questById } from '../src/sim/questData';
import { CROWN_PAY, STONE_PAY, questPay, rewardOf, shareOf, totalQuestStones } from '../src/sim/questPay';
import { LENGTHS, lengthOf, partsOf, starsOf, storyParts } from '../src/sim/questStars';
import { CAL_STONES_PER_DRAW, DAILY_CHEST_STONES } from '../src/sim/unlockRules';
import { newStandRun, settleStand } from '../src/sim/stand';
import { clearStones } from '../src/sim/calReward';

const armies = ARMIES.map((a) => a.id);
const roster = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];

test('the pay table: no stones under three stars; a Short, Long, Chain and Campaign pay as the design says', () => {
  for (const len of LENGTHS) {
    assert.equal(STONE_PAY[len][1], 0);
    assert.equal(STONE_PAY[len][2], len === 'chain' ? 1 : 0);
    for (let s = 3; s <= 5; s++) assert.ok(STONE_PAY[len][s] > 0, `${len} ${s}`);
  }
  assert.deepEqual(STONE_PAY.short, [0, 0, 0, 1, 3, 6]);
  assert.deepEqual(STONE_PAY.chain, [0, 0, 1, 3, 6, 12]);
  assert.deepEqual(CROWN_PAY, [0, 150, 300, 600, 1000, 1600]);
  assert.deepEqual(questPay(4, 'long'), { crowns: 1500, stones: 4 });
  assert.deepEqual(questPay(5, 'campaign'), { crowns: 4800, stones: 20 });
});

test("a story's total is shared across its parts, the finale taking the most", () => {
  assert.equal([1, 2, 3].reduce((n, p) => n + shareOf(10, p, 3), 0), 10);
  assert.ok(shareOf(10, 3, 3) >= shareOf(10, 1, 3));
  assert.equal(shareOf(5, 1, 1), 5);
});

test('every quest pays what its stars say: no stones at one or two stars (a Chain two-star excepted), and the table at three and up', () => {
  for (const q of QUESTS) {
    const r = rewardOf(q);
    // (the tales and lost techniques pay as written)
    if (GIVERS[q.giver].slot === 'tale') {
      assert.deepEqual(r, q.reward, q.id);
      continue;
    }
    if (starsOf(q) <= 2 && lengthOf(q) !== 'chain') assert.equal(r.stones ?? 0, 0, q.id);
    if (starsOf(q) <= 3) assert.equal(r.shards, undefined, `${q.id}: shards are for four stars and five`);
    if (lengthOf(q) !== 'chain' && lengthOf(q) !== 'campaign' && starsOf(q) >= 3) assert.equal(r.stones, STONE_PAY[lengthOf(q)][starsOf(q)], q.id);
    assert.ok((r.crowns ?? 0) >= (q.reward.crowns ?? 0), `${q.id}: crowns are never cut`);
  }
  // (a story's parts add to its total)
  const last = QUESTS.filter((q) => GIVERS[q.giver].slot !== 'tale' && lengthOf(q) === 'chain' && !QUESTS.some((x) => x.after === q.id) && starsOf(q) >= 2);
  assert.ok(last.length > 0);
  for (const q of last) {
    const parts: typeof q[] = [];
    for (let c: typeof q | undefined = q; c; c = c.after ? questById(c.after) : undefined) parts.push(c);
    if (parts.some((p) => starsOf(p) !== starsOf(q) || lengthOf(p) !== 'chain')) continue;
    assert.equal(parts.length, storyParts(q));
    assert.equal(partsOf(q), parts.length);
    assert.equal(parts.reduce((n, p) => n + (rewardOf(p).stones ?? 0), 0), STONE_PAY.chain[starsOf(q)], q.id);
  }
  assert.ok(totalQuestStones() > 0 && totalQuestStones() < 600, `${totalQuestStones()} stones in all`);
});

test('a one-star quest handed in with a chest pays the chest with no stones; a three-star quest pays them', () => {
  const m = startedMeta(3);
  const dryQ = QUESTS.find((q) => q.reward.chest && starsOf(q) <= 2 && !q.repeat)!;
  const wetQ = QUESTS.find((q) => q.reward.chest && starsOf(q) >= 3 && !q.repeat);
  m.quests = { active: [{ id: dryQ.id, progress: dryQ.goal.n, took: 20261030 }], offers: [], done: [] };
  assert.ok(handIn(m, dryQ.id, 20261030));
  assert.equal(m.stash.length, 1);
  assert.equal(chestStones(m.stash[0]), 0);
  if (wetQ) {
    const w = startedMeta(4);
    w.quests = { active: [{ id: wetQ.id, progress: wetQ.goal.n, took: 20261030 }], offers: [], done: [] };
    assert.ok(handIn(w, wetQ.id, 20261030));
    assert.ok(chestStones(w.stash[0]) > 0);
  }
});

test("the shop's chests hold 1, 3 and 6 stones; the daily chest 1 and a stone a bonus star; a Calamity draw 1, and its chest half", () => {
  assert.deepEqual(SHOP.map((c) => c.stones), [1, 3, 6]);
  assert.equal(DAILY_CHEST_STONES, 1);
  assert.equal(chestStones({ at: 3, daily: 20261101, bonus: 2 }), 3);
  assert.equal(CAL_STONES_PER_DRAW, 1);
  assert.equal(clearStones(0), 2);
  assert.equal(chestStones({ at: 10 }), 3);
  assert.equal(chestStones({ at: 10, half: true }), 2);
  assert.equal(chestStones({ at: 10, dry: true }), 0);
});

test('the Last Stand pays stones only in the chests of a new best wave: a re-climb pays crowns and gear', () => {
  const climb = (m: Meta, best: number) => {
    const run = newStandRun(9, roster, armies);
    run.wave = best + 1;
    run.best = best;
    run.over = true;
    settleStand(m, run);
    return m.stash.filter((c) => c.tower);
  };
  const m = newMeta(1);
  for (const id of armies) m.armies[id] = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  const first = climb(m, 20);
  assert.ok(first.length > 0 && first.every((c) => !c.dry), 'a new best holds stones');
  m.stash = [];
  const again = climb(m, 20);
  assert.ok(again.length > 0 && again.every((c) => c.dry), 'the same wave again pays none');
  assert.ok(again.every((c) => chestStones(c) === 0));
  m.stash = [];
  const past = climb(m, 25);
  assert.ok(past.every((c) => !c.dry), 'past the record, stones again');
});
