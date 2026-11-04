// The retune of the existing quests (QUESTS-3, Q4): every retune names a quest, the old goal is kept as `was`, a quest taken before the
// retune counts its old goal (and one taken since, the new), the stories and ids stay, and the board has a spread at every stage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, recordOf } from '../src/sim/armies';
import { startedMeta, type Meta } from '../src/sim/meta';
import { RETUNE } from '../src/sim/questRetune';
import { GIVERS, QUESTS, questById } from '../src/sim/questData';
import { activeDef, canOffer, isDone, noteQuests, progressOf, readQuests, takeQuest, type QuestFight } from '../src/sim/quests';
import { lengthOf, starsOf } from '../src/sim/questStars';

const DAY = 20261030;
const win: QuestFight = { won: true, waves: 1, boss: false, heroes: ['knight'], flawless: true, kills: ['skeleton'], dailyCleared: false };

test('every retune names a quest that exists, keeps its story, and keeps the old goal as `was`', () => {
  for (const [id, r] of Object.entries(RETUNE)) {
    const q = questById(id);
    assert.ok(q, `${id} is a quest`);
    assert.ok(q.was && q.was.text && q.was.goal, `${id} keeps what it asked before`);
    assert.equal(q.stars, r.stars);
    if (r.stars > 1) assert.ok(JSON.stringify(q.goal) !== JSON.stringify(q.was.goal) || r.goals || r.oneRun || r.within || r.streak, `${id}: the quest is harder`);
    assert.ok(r.stars >= 1 && r.stars <= 5);
    if (r.goals) assert.equal(r.steps?.length, r.goals.length + 1, `${id}: a step of words for each objective`);
    if (r.within) assert.ok(r.stars >= 3 && r.within >= 2, `${id}: a time limit is for three stars and up, and generous`);
    assert.ok(GIVERS[q.giver], id);
  }
  assert.ok(Object.keys(RETUNE).length >= 90, `${Object.keys(RETUNE).length} retuned`);
  // (the hero tales, the lost techniques and the quest battles are not retuned)
  for (const id of Object.keys(RETUNE)) {
    const q = questById(id)!;
    assert.notEqual(GIVERS[q.giver].slot, 'tale', id);
    assert.notEqual(q.goal.kind, 'battle', id);
  }
});

test('a quest taken before its retune keeps its old goal; one taken since counts the new; a save from before has the old', () => {
  const id = 'boneCollector';
  const q = questById(id)!;
  assert.equal(q.was!.goal.n, 60);
  assert.ok(q.goal.n > 60);
  const m = startedMeta(1);
  m.quests = { active: [{ id, progress: 59, took: DAY }], offers: [], done: [], day: DAY };
  const a = m.quests.active[0];
  assert.equal(activeDef(a)!.goal.n, 60, 'no `v`: the old goal');
  noteQuests(m, { ...win, kills: ['skeleton', 'skeleton'] }, DAY);
  assert.ok(isDone(a), 'sixty was enough for the one taken before');
  // (taken since: the new goal)
  const m2 = startedMeta(2);
  m2.quests = { active: [], offers: [{ id, giver: q.giver, day: DAY }], done: [], day: DAY };
  assert.ok(takeQuest(m2, id, DAY));
  const b = m2.quests.active[0];
  assert.equal(b.v, 1);
  noteQuests(m2, { ...win, kills: Array(70).fill('skeleton') }, DAY);
  assert.equal(isDone(b), false);
  assert.equal(progressOf(b).need, q.goal.n);
  // (and the save keeps which is which)
  const back = readQuests(JSON.parse(JSON.stringify(m2.quests)))!;
  assert.equal(back.active[0].v, 1);
  assert.equal(readQuests(JSON.parse(JSON.stringify(m.quests)))!.active[0].v, undefined);
  assert.equal(readQuests({ active: [{ id, progress: 100, took: DAY }], offers: [], done: [] })!.active[0].progress, 60, 'read against the old goal');
});

test('the one-off quests are spread over the stars and lengths, and the tutorial ones stay one star', () => {
  const ones = QUESTS.filter((q) => !q.repeat);
  const by = (s: number) => ones.filter((q) => starsOf(q) === s).length;
  for (let s = 1; s <= 5; s++) assert.ok(by(s) >= 4, `${by(s)} quests of ${s} stars`);
  assert.ok(by(3) + by(4) + by(5) > ones.length * 0.4, 'a third and more are hard');
  assert.equal(starsOf(questById('cartersWheels')!), 1);
  assert.equal(starsOf(questById('freshBread')!), 1);
  for (const len of ['short', 'long', 'chain'] as const) assert.ok(ones.filter((q) => lengthOf(q) === len).length >= 15, len);
});

/** A save at a stage: the first `n` armies cleared on Normal, and (from stage 6) Hard cleared on the first. */
function stage(n: number, hard = false): Meta {
  const m = startedMeta(n * 3 + 1);
  ARMIES.slice(0, n).forEach((a) => (m.armies[a.id] = { ...recordOf(m, a.id), clears: 1, ...(hard ? { first: 2, hard: { '1': { won: 15, clears: 1 } } } : {}) }));
  m.unlocked = [...new Set([...m.unlocked, 'knight', 'paladin', 'archer', 'warlock', 'cleric', 'samurai', 'kunoichi', 'peasant', 'wizard', 'samuraiCommander', 'buccaneer'])];
  return m;
}

test('at every stage of a save the quests open to it have at least three star counts and two lengths', () => {
  for (const [n, hard] of [[1, false], [2, false], [3, false], [4, false], [5, false], [6, false], [7, false], [9, false], [9, true]] as const) {
    const m = stage(n, hard);
    const open = QUESTS.filter((q) => !q.repeat && canOffer(m, q, DAY));
    assert.ok(new Set(open.map(starsOf)).size >= 3, `${n} armies${hard ? ' and Hard' : ''}: stars ${[...new Set(open.map(starsOf))]}`);
    assert.ok(new Set(open.map(lengthOf)).size >= 2, `${n} armies${hard ? ' and Hard' : ''}: lengths`);
  }
});
