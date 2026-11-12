// The new goal rules (QUESTS-3, Q3): several objectives, in order, one run, no hearts, time limits and the cooldown, streaks, no
// ultimates, no hires, a level cap, the best hero benched, named heroes barred, exactly n heroes, the campaign slot, `questPlace`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, recordOf } from '../src/sim/armies';
import { startedMeta, type Meta } from '../src/sim/meta';
import { ACTIVE_MAX, CAMPAIGN_MAX, FAIL_COOLDOWN, canOffer, cannotTake, condMet, dayNumber, daysLeft, handIn, heroesOwnedFor, isDone, noteQuests, objectivesOf, progressOf, readQuests, refreshOffers, takeQuest, tickQuests, type QuestFight } from '../src/sim/quests';
import { QUESTS, withQuests, type QuestDef } from '../src/sim/questData';
import { questPlace, ruleLines } from '../src/sim/questGoto';

const DAY = 20261030;
const after = (n: number): number => {
  const d = new Date(Date.UTC(2026, 9, 30 + n));
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};
const win: QuestFight = { won: true, waves: 1, boss: false, heroes: ['knight', 'archer'], flawless: true, kills: [], dailyCleared: false, run: 1, hearts: 0, hires: 0, ults: [], levels: { knight: 5, archer: 5 }, best: 'paladin' };
const def = (id: string, over: Partial<QuestDef>): QuestDef => ({
  id,
  title: id,
  giver: 'gwen',
  needs: { kind: 'any' },
  text: id,
  offer: ['o'],
  going: 'g',
  done: ['d'],
  goal: { kind: 'wavesWon', n: 2 },
  reward: { crowns: 1 },
  ...over,
});
const take = (m: Meta, q: QuestDef, date = DAY) => {
  m.quests = { active: [], offers: [{ id: q.id, giver: q.giver, day: date }], done: [], day: date };
  assert.ok(takeQuest(m, q.id, date));
  return m.quests.active[0];
};

test('several objectives: every one must be done, in any order, each with its own count; the checklist reads them', () => {
  const q = def('multi', { goal: { kind: 'wavesWon', n: 2 }, goals: [{ kind: 'bossDown', n: 1 }, { kind: 'duos', n: 3 }], steps: ['Win 2 waves', 'Fell a boss', 'Set off 3 duos'] });
  withQuests([q], () => {
    const m = startedMeta(1);
    const a = take(m, q);
    assert.equal(objectivesOf(q).length, 3);
    noteQuests(m, { ...win, boss: true, duos: 2 }, DAY);
    assert.deepEqual([a.progress, a.more], [1, [1, 2]]);
    assert.equal(isDone(a), false);
    noteQuests(m, { ...win, duos: 5 }, DAY);
    assert.deepEqual([a.progress, a.more], [2, [1, 3]], 'capped at each need');
    assert.ok(isDone(a));
    assert.deepEqual(progressOf(a), { now: 6, need: 6 });
    assert.ok(handIn(m, q.id, DAY));
  });
});

test('in order: an objective counts only once the one before it was done before the fight', () => {
  const q = def('ordered', { goal: { kind: 'bossDown', n: 1 }, goals: [{ kind: 'wavesWon', n: 1 }], ordered: true });
  withQuests([q], () => {
    const m = startedMeta(2);
    const a = take(m, q);
    noteQuests(m, { ...win, waves: 1 }, DAY);
    assert.deepEqual([a.progress, a.more ?? []], [0, []], 'the second waits for the first');
    noteQuests(m, { ...win, boss: true }, DAY);
    assert.deepEqual([a.progress, a.more ?? []], [1, []], 'the same fight does not count for both');
    noteQuests(m, win, DAY);
    assert.ok(isDone(a));
  });
});

test('one run: the counts restart when the run changes or ends undone; a run that finishes the quest keeps it', () => {
  const q = def('oneRun', { goal: { kind: 'wavesWon', n: 3 }, oneRun: true });
  withQuests([q], () => {
    const m = startedMeta(3);
    const a = take(m, q);
    noteQuests(m, { ...win, run: 7 }, DAY);
    noteQuests(m, { ...win, run: 7 }, DAY);
    assert.equal(a.progress, 2);
    noteQuests(m, { ...win, run: 8 }, DAY);
    assert.equal(a.progress, 1, 'a different run starts again');
    noteQuests(m, { ...win, run: 8, won: false, waves: 0, runOver: true }, DAY);
    assert.equal(a.progress, 0, 'the run ended undone');
    assert.equal(a.runId, undefined);
    for (let i = 0; i < 3; i++) noteQuests(m, { ...win, run: 9 }, DAY);
    assert.ok(isDone(a));
  });
});

test('no hearts, no hires, no ultimates, a level cap, the best benched, named heroes barred and an exact party', () => {
  const ok = (c: object, f: Partial<QuestFight>, want: boolean) => assert.equal(condMet(c, { ...win, ...f }), want, JSON.stringify([c, f]));
  ok({ noHeart: true }, { hearts: 0 }, true);
  ok({ noHeart: true }, { hearts: 1 }, false);
  ok({ noHires: true }, { hires: 0 }, true);
  ok({ noHires: true }, { hires: 2 }, false);
  ok({ noUlts: true }, { ults: [] }, true);
  ok({ noUlts: true }, { ults: ['knight'] }, false);
  ok({ levelCap: 5 }, {}, true);
  ok({ levelCap: 4 }, {}, false);
  ok({ benchBest: true }, { best: 'paladin' }, true);
  ok({ benchBest: true }, { best: 'knight' }, false);
  ok({ without: ['archer'] }, {}, false);
  ok({ without: ['mage'] }, {}, true);
  ok({ exactly: 2 }, {}, true);
  ok({ exactly: 3 }, {}, false);
  ok({ exactly: 2, noHeart: true, noUlts: true }, { hearts: 1 }, false);
  // (the Last Stand names no heroes, so a rule about heroes is not met by it)
  ok({ levelCap: 50 }, { heroes: [] }, false);
  // (and without a new rule a rider counts as it did)
  ok({}, {}, true);
});

test('a time limit: past its days the quest fails and leaves the log, and is back on the board after its cooldown, with nothing lost but the progress', () => {
  const q = def('timed', { goal: { kind: 'wavesWon', n: 5 }, within: 2 });
  withQuests([q], () => {
    const m = startedMeta(4);
    const a = take(m, q, DAY);
    noteQuests(m, win, DAY);
    assert.equal(daysLeft(a, DAY), 2);
    assert.equal(daysLeft(a, after(2)), 0, 'the last day');
    assert.deepEqual(tickQuests(m, after(2)), [], 'still going on its last day');
    assert.deepEqual(tickQuests(m, after(3)), ['timed']);
    assert.equal(m.quests!.active.length, 0);
    assert.equal(m.quests!.failed!.timed, after(3));
    assert.equal(canOffer(m, q, after(3)), false, 'cooling down');
    assert.equal(canOffer(m, q, after(2 + FAIL_COOLDOWN)), false);
    assert.equal(canOffer(m, q, after(3 + FAIL_COOLDOWN)), true, 'back after the cooldown');
    // (a done quest does not fail, however late it is handed in)
    const b = take(m, q, after(10));
    b.progress = 5;
    assert.deepEqual(tickQuests(m, after(20)), []);
    assert.ok(handIn(m, q.id, after(20)));
    // (the day's refresh does the ticking, and a retake clears the failure)
    const m2 = startedMeta(5);
    take(m2, q, DAY);
    refreshOffers(m2, after(5), QUESTS);
    assert.equal(m2.quests!.active.length, 0);
    m2.quests!.offers.push({ id: q.id, giver: 'gwen', day: after(9) });
    assert.ok(takeQuest(m2, q.id, after(9)));
    assert.equal(m2.quests!.failed?.timed, undefined);
  });
});

test('a streak counts one day at a time, and starts again when a day is missed', () => {
  const q = def('streak', { goal: { kind: 'wavesWon', n: 1 }, streak: 3 });
  withQuests([q], () => {
    const m = startedMeta(6);
    const a = take(m, q, DAY);
    noteQuests(m, win, DAY);
    noteQuests(m, win, DAY);
    assert.equal(a.progress, 1, 'two fights the same day count once');
    noteQuests(m, win, after(1));
    assert.equal(a.progress, 2);
    // (a missed day: the next day's tick breaks it)
    tickQuests(m, after(3));
    assert.equal(a.progress, 0);
    noteQuests(m, win, after(3));
    noteQuests(m, win, after(4));
    noteQuests(m, win, after(5));
    assert.ok(isDone(a));
    assert.equal(progressOf(a).need, 3);
    // (a missed day found at the next count, with no tick between)
    const m2 = startedMeta(7);
    const b = take(m2, q, DAY);
    noteQuests(m2, win, DAY);
    noteQuests(m2, win, after(2));
    assert.equal(b.progress, 1);
  });
});

test('three quests and one campaign at a time, each with its own room', () => {
  const camp = def('camp', { goal: { kind: 'wavesWon', n: 9 }, length: 'campaign' });
  const camp2 = def('camp2', { goal: { kind: 'wavesWon', n: 9 }, length: 'campaign' });
  const q = (i: number) => def(`plain${i}`, {});
  const list = [camp, camp2, q(1), q(2), q(3), q(4)];
  withQuests(list, () => {
    const m = startedMeta(8);
    m.quests = { active: [], offers: list.map((x) => ({ id: x.id, giver: 'gwen', day: DAY })), done: [] };
    for (const x of [q(1), q(2), q(3)]) assert.ok(takeQuest(m, x.id, DAY));
    assert.equal(cannotTake(m, 'plain4'), 'full', 'the fourth ordinary quest waits');
    assert.equal(cannotTake(m, 'camp'), null, 'but a campaign has its own slot');
    assert.ok(takeQuest(m, 'camp', DAY));
    assert.equal(cannotTake(m, 'camp2'), 'full', `only ${CAMPAIGN_MAX} campaign`);
    assert.equal(m.quests!.active.length, ACTIVE_MAX + CAMPAIGN_MAX);
  });
});

test('the new fields survive a save and are read safely', () => {
  const q = def('saved', { goal: { kind: 'wavesWon', n: 3 }, goals: [{ kind: 'bossDown', n: 2 }], oneRun: true, streak: undefined });
  withQuests([q], () => {
    const m = startedMeta(9);
    const a = take(m, q);
    noteQuests(m, { ...win, boss: true, run: 11 }, DAY);
    const back = readQuests(JSON.parse(JSON.stringify(m.quests)))!;
    assert.deepEqual(back.active[0], a);
    assert.equal(back.active[0].runId, 11);
    // (junk: counts clipped, the wrong shapes dropped; a failed date that is not a date is dropped)
    const junk = readQuests({ active: [{ id: 'saved', progress: 99, took: DAY, more: [99, 'x'], runId: 'no' }], offers: [], done: [], failed: { saved: 12, gone: DAY } })!;
    assert.deepEqual([junk.active[0].progress, junk.active[0].more, junk.active[0].runId], [3, [2], undefined]);
    assert.equal(junk.failed, undefined);
  });
  // (an old save has none of them)
  const old = readQuests({ active: [{ id: 'roundForTheHouse', progress: 4, took: DAY }], offers: [], done: [] })!;
  assert.deepEqual(old.active[0], { id: 'roundForTheHouse', progress: 4, took: DAY });
});

test('the owner\'s rule reaches the new riders: a quest asking for exactly four heroes needs four owned', () => {
  const q = def('exact', { goal: { kind: 'wavesWon', n: 1, exactly: 4 } });
  const m = startedMeta(10);
  m.unlocked = ['knight', 'archer'];
  assert.equal(heroesOwnedFor(m, q), false);
  m.unlocked = ['knight', 'archer', 'cleric', 'wizard'];
  assert.equal(heroesOwnedFor(m, q), true);
});

test('every quest has a place at every point of a save where it is open, and the place names its rules', () => {
  const m = startedMeta(11);
  for (const a of ARMIES) m.armies[a.id] = { ...recordOf(m, a.id), clears: 1 };
  m.unlocked = [...new Set([...m.unlocked, 'knight', 'archer', 'cleric', 'wizard', 'samurai', 'kunoichi', 'peasant'])];
  let n = 0;
  for (const q of QUESTS) {
    const p = questPlace(m, q);
    assert.ok(p.dest && p.dest.to, q.id);
    assert.ok(p.objective >= 0 && p.objective < objectivesOf(q).length);
    n++;
  }
  assert.equal(n, QUESTS.length);
  // (the second objective once the first is done; the rules in words)
  const q = def('place', { goal: { kind: 'wavesWon', n: 1 }, goals: [{ kind: 'calGuardian', n: 1, noUlts: true, levelCap: 30 }], oneRun: true });
  withQuests([q], () => {
    const a = take(m, q);
    assert.equal(questPlace(m, q, a).objective, 0);
    a.progress = 1;
    const p = questPlace(m, q, a);
    assert.equal(p.objective, 1);
    assert.deepEqual(p.dest, { to: 'calamity' });
    assert.deepEqual(p.rules, ['All in one army run', 'No ultimates in this fight (ULT Auto off)', 'Heroes of level 30 or lower']);
    assert.deepEqual(ruleLines(def('r', { goal: { kind: 'wavesWon', n: 1, noHeart: true, without: ['knight'], exactly: 4, benchBest: true } })), ['The whole party never falls', 'Your best hero sits out', 'Without Kwame', 'Exactly 4 heroes']);
  });
  void dayNumber;
});
