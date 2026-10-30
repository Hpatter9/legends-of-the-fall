// Quests, batch 1: the day's offers (seeded, kept, never rerolled), the owned-hero rule, the limit of three, the goals counted
// after a settled fight, the hand-in, and the save (old saves load with nothing begun).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { place, startBattle, type Battle } from '../src/sim/battle';
import { recordOf } from '../src/sim/armies';
import { loadMeta, newMeta, saveMeta, startedMeta, type Meta } from '../src/sim/meta';
import { dailyRun, settleRun } from '../src/sim/modes';
import { armyRun, newRun } from '../src/sim/run';
import {
  ACTIVE_MAX,
  canOffer,
  dayNumber,
  goalGain,
  handIn,
  heroesOwnedFor,
  noteQuests,
  questFightOf,
  readQuests,
  readyQuests,
  refreshOffers,
  standFight,
  takeQuest,
  trackedQuest,
  trackQuest,
  slotOf,
  type QuestFight,
} from '../src/sim/quests';
import { QUESTS, questById, type QuestDef } from '../src/sim/questData';

const DAY = 20261030;
const clear = (m: Meta, ...ids: string[]) => ids.forEach((id) => (m.armies[id] = { ...recordOf(m, id), clears: 1 }));

/** A finished fight with the given heroes placed against a band, won or lost; `fell` heroes lie fallen, and every foe is felled on a win. */
function fight(kinds: string[], band = 'skeletons', won = true, fell = 0): Battle {
  const b = startBattle(4, band);
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  kinds.forEach((k, i) => assert.ok(place(b, k, ...spots[(i * 3) % spots.length], i + 1), `place ${k}`));
  b.units.filter((u) => u.side === 'hero').slice(0, fell).forEach((u) => (u.alive = false));
  if (won) b.units.filter((u) => u.side === 'foe').forEach((u) => (u.alive = false));
  b.phase = won ? 'won' : 'lost';
  return b;
}

const plain: QuestFight = { won: true, waves: 1, boss: false, heroes: ['knight'], flawless: true, kills: [], dailyCleared: false };

test('the quests: unique ids, each with a giver, words, a goal of at least one and some pay', () => {
  assert.equal(new Set(QUESTS.map((q) => q.id)).size, QUESTS.length);
  assert.ok(QUESTS.length >= 6);
  for (const q of QUESTS) {
    assert.ok(q.title && q.text && q.offer.length && q.done.length && q.going, q.id);
    assert.ok(q.goal.n >= 1, q.id);
    assert.ok(q.reward.crowns || q.reward.stones || q.reward.chest || q.reward.ores, q.id);
  }
});

test('a fresh save is offered a quest by Gwen and one by a passerby on its first day', () => {
  // (batch 1b: the other givers' slots draw too, a quest each at most on the first day: the notices and the starter heroes' own)
  const m = startedMeta(7);
  assert.ok(refreshOffers(m, DAY));
  const slots = m.quests!.offers.map((o) => slotOf(questById(o.id)!));
  assert.equal(slots.filter((g) => g === 'gwen').length, 1);
  assert.equal(slots.filter((g) => g === 'passerby').length, 1);
  for (const slot of new Set(slots)) assert.equal(slots.filter((g) => g === slot).length, 1, slot);
  // (only what the save may do: nothing that needs an army cleared)
  for (const o of m.quests!.offers) assert.equal(questById(o.id)!.needs.kind, 'any', o.id);
});

test('offers are the same for the same save and date, and a second look the same day draws nothing new', () => {
  const a = startedMeta(11);
  const b = startedMeta(11);
  clear(a, 'orcs', 'undead');
  clear(b, 'orcs', 'undead');
  refreshOffers(a, DAY);
  refreshOffers(b, DAY);
  assert.deepEqual(a.quests!.offers, b.quests!.offers);
  const before = JSON.stringify(a.quests);
  assert.equal(refreshOffers(a, DAY), false);
  assert.equal(JSON.stringify(a.quests), before);
  // (taking one does not reroll the rest, and no new one comes the same day)
  takeQuest(a, a.quests!.offers[0].id, DAY);
  refreshOffers(a, DAY);
  assert.deepEqual(a.quests!.offers, b.quests!.offers.slice(1));
});

test('different seeds or days draw from their own streams', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 30; seed++) {
    const m = startedMeta(seed);
    clear(m, 'orcs', 'undead', 'beasts');
    refreshOffers(m, DAY);
    seen.add(m.quests!.offers.find((o) => o.giver === 'gwen')!.id);
  }
  assert.ok(seen.size >= 3, `Gwen's first offers across seeds: ${[...seen]}`);
});

test('the board holds up to three of Gwen\'s, one new a day, each kept three days; a passerby\'s lasts the day', () => {
  const m = startedMeta(3);
  clear(m, 'orcs', 'undead', 'beasts');
  refreshOffers(m, 20261030);
  refreshOffers(m, 20261031);
  refreshOffers(m, 20261101); // (across a month's end)
  const gwen = () => m.quests!.offers.filter((o) => o.giver === 'gwen');
  assert.equal(gwen().length, 3);
  const passing = () => m.quests!.offers.filter((o) => slotOf(questById(o.id)!) === 'passerby');
  assert.equal(passing().length, 1);
  assert.equal(passing()[0].day, 20261101);
  // (the first of Gwen's is three days old on the fourth day: it comes down, and one new one goes up)
  const first = gwen()[0];
  assert.equal(first.day, 20261030);
  refreshOffers(m, 20261102);
  assert.ok(!gwen().some((o) => o.id === first.id));
  assert.equal(gwen().length, 3);
  assert.equal(dayNumber(20261101) - dayNumber(20261031), 1);
});

test('a quest that needs a particular hero is not offered until one who could do it is owned', () => {
  const m = startedMeta(5);
  clear(m, 'wildwood');
  const pilgrim = questById('pilgrimsRoad')!;
  m.unlocked = ['knight', 'samurai', 'archer'];
  assert.equal(heroesOwnedFor(m, pilgrim), false);
  assert.equal(canOffer(m, pilgrim), false);
  m.unlocked.push('cleric');
  assert.equal(canOffer(m, pilgrim), true);
  // (the Carter's Wheels takes Kwame or any Guardian: the other starter pack has Minh, a Guardian)
  const carter = questById('cartersWheels')!;
  clear(m, 'orcs');
  m.unlocked = ['peasant', 'kunoichi', 'wizard'];
  assert.equal(canOffer(m, carter), true);
  m.unlocked = ['kunoichi', 'wizard'];
  assert.equal(canOffer(m, carter), false);
  // (and never on the board while unowned, whatever the seed)
  const pool: QuestDef[] = [pilgrim];
  for (let seed = 1; seed < 20; seed++) {
    const x = startedMeta(seed);
    clear(x, 'wildwood');
    x.unlocked = ['knight', 'samurai', 'archer'];
    refreshOffers(x, DAY, pool);
    assert.equal(x.quests!.offers.length, 0);
  }
});

test('at most three quests are taken at once', () => {
  const m = startedMeta(9);
  m.quests = { active: [], offers: QUESTS.slice(0, 5).map((q) => ({ id: q.id, giver: q.giver, day: DAY })), done: [] };
  for (let i = 0; i < ACTIVE_MAX; i++) assert.ok(takeQuest(m, QUESTS[i].id, DAY));
  assert.equal(takeQuest(m, QUESTS[3].id, DAY), false);
  assert.equal(m.quests.active.length, ACTIVE_MAX);
  assert.ok(m.quests.offers.some((o) => o.id === QUESTS[3].id), 'still on the board');
  assert.equal(takeQuest(m, 'nope', DAY), false);
});

test('the goals count what the fight did, with their riders', () => {
  const carter = questById('cartersWheels')!.goal;
  assert.equal(goalGain(carter, { ...plain, army: 'orcs' }), 1);
  assert.equal(goalGain(carter, { ...plain, army: 'undead' }), 0);
  assert.equal(goalGain(carter, { ...plain, army: 'orcs', heroes: ['peasant'] }), 1, 'a Guardian will do');
  assert.equal(goalGain(carter, { ...plain, army: 'orcs', heroes: ['wizard'] }), 0);
  assert.equal(goalGain(carter, { ...plain, army: 'orcs', won: false }), 0);
  const quiet = questById('quietHands')!.goal;
  assert.equal(goalGain(quiet, { ...plain, boss: true }), 1);
  assert.equal(goalGain(quiet, { ...plain, boss: true, flawless: false }), 0);
  assert.equal(goalGain(quiet, plain), 0);
  const bones = questById('boneCollector')!.goal;
  assert.equal(goalGain(bones, { ...plain, won: false, kills: ['skeleton', 'spearman', 'boneArcher', 'orc', 'boneCaptain'] }), 3, 'lost fights count; the bosses do not');
  assert.equal(goalGain(questById('freshBread')!.goal, { ...plain, dailyCleared: true }), 1);
  assert.equal(goalGain(questById('roundForTheHouse')!.goal, standFight(7)), 7, "the Last Stand's waves count");
});

test('settleRun counts an army wave for a quest taken, and the quest waits for its hand-in, which pays', () => {
  const m = startedMeta(13);
  m.quests = { active: [{ id: 'cartersWheels', progress: 2, took: DAY }], offers: [], done: [] };
  const run = armyRun(5, 'orcs');
  settleRun(m, run, { won: true, stage: 1, stars: 3, battle: fight(['knight', 'archer'], 'orcs') });
  assert.deepEqual(readyQuests(m), ['cartersWheels']);
  const crowns = m.crowns;
  const stones = m.stones ?? 0;
  assert.ok(handIn(m, 'cartersWheels'));
  assert.equal(m.crowns, crowns + 120);
  assert.equal(m.stones, stones + 2);
  assert.deepEqual(m.quests.done, ['cartersWheels']);
  assert.equal(m.quests.active.length, 0);
  assert.equal(handIn(m, 'cartersWheels'), false, 'paid once');
  // (a done quest is never offered again)
  clear(m, 'orcs');
  assert.equal(canOffer(m, questById('cartersWheels')!), false);
});

test('a quest not yet done cannot be handed in; losing never takes progress away', () => {
  const m = startedMeta(14);
  m.quests = { active: [{ id: 'roundForTheHouse', progress: 4, took: DAY }], offers: [], done: [] };
  assert.equal(handIn(m, 'roundForTheHouse'), false);
  noteQuests(m, { ...plain, won: false, waves: 0 });
  assert.equal(m.quests.active[0].progress, 4);
  const done = noteQuests(m, { ...plain, waves: 9 });
  assert.equal(m.quests.active[0].progress, 10, 'capped at the need');
  assert.deepEqual(done, ['roundForTheHouse']);
  assert.deepEqual(noteQuests(m, plain), [], 'told once');
});

test('the facts of a settled fight: the heroes, a flawless win, the foes felled, a daily cleared', () => {
  const m = startedMeta(15);
  const b = fight(['knight', 'wizard'], 'skeletons', true, 1);
  const f = questFightOf({ battle: b, won: true, stage: 1, stars: 1, run: newRun(3), meta: m });
  assert.deepEqual([...f.heroes].sort(), ['knight', 'wizard']);
  assert.equal(f.flawless, false);
  assert.equal(f.waves, 1);
  assert.ok(f.kills.includes('skeleton'));
  const daily = dailyRun(DAY);
  daily.cleared = true;
  assert.equal(questFightOf({ battle: fight(['knight']), won: true, stage: 10, stars: 1, run: daily, meta: m }).dailyCleared, true);
  const practice = dailyRun(DAY, true);
  practice.cleared = true;
  assert.equal(questFightOf({ battle: fight(['knight']), won: true, stage: 10, stars: 1, run: practice, meta: m }).dailyCleared, false, 'a practice replay does not count');
});

test('the tracked quest: the pinned one, else the newest taken', () => {
  const m = startedMeta(16);
  m.quests = { active: [{ id: 'roundForTheHouse', progress: 0, took: DAY }, { id: 'freshBread', progress: 0, took: DAY }], offers: [], done: [] };
  assert.equal(trackedQuest(m)!.id, 'freshBread');
  trackQuest(m, 'roundForTheHouse');
  assert.equal(trackedQuest(m)!.id, 'roundForTheHouse');
  trackQuest(m, 'nope');
  assert.equal(trackedQuest(m)!.id, 'freshBread');
});

test('the save: quests survive a save and load; an old save loads with nothing begun; junk is dropped', () => {
  const store = new Map<string, string>();
  const io = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  const m = startedMeta(17);
  clear(m, 'orcs');
  refreshOffers(m, DAY);
  takeQuest(m, m.quests!.offers[0].id, DAY);
  m.quests!.active[0].progress = 1;
  saveMeta(m, io);
  assert.deepEqual(loadMeta(1, io).quests, m.quests);
  // (a save from before the quests)
  const old = startedMeta(18);
  delete old.quests;
  saveMeta(old, io);
  const back = loadMeta(1, io);
  assert.equal(back.quests, undefined);
  // (and its first look at the board is offered what it has already earned: no back pay)
  clear(back, 'orcs', 'undead', 'beasts', 'wildwood');
  const crowns = back.crowns;
  refreshOffers(back, DAY);
  // (one from Gwen and one passing, as before; batch 1b's other givers may add theirs)
  assert.equal(back.quests!.offers.filter((o) => slotOf(questById(o.id)!) === 'gwen').length, 1);
  assert.equal(back.quests!.offers.filter((o) => slotOf(questById(o.id)!) === 'passerby').length, 1);
  assert.equal(back.crowns, crowns);
  // (junk: unknown ids, progress past the need, too many taken, repeats)
  const s = readQuests({ active: [{ id: 'nope', progress: 1 }, { id: 'freshBread', progress: 99, took: DAY }, { id: 'freshBread', progress: 0 }, { id: 'quietHands', progress: -3 }, { id: 'boneCollector', progress: 2 }, { id: 'roundForTheHouse', progress: 1 }], offers: [{ id: 'freshBread', day: DAY }, { id: 'pilgrimsRoad', day: 'x' }], done: ['nope', 'cartersWheels'], tracked: 'nope', chains: { a: 1 } })!;
  assert.deepEqual(s.active.map((a) => [a.id, a.progress]), [['freshBread', 1], ['quietHands', 0], ['boneCollector', 2]]);
  assert.deepEqual(s.offers, []);
  assert.deepEqual(s.done, ['cartersWheels']);
  assert.equal(s.tracked, undefined);
  assert.deepEqual((s as unknown as { chains: unknown }).chains, { a: 1 }, "a later batch's state is kept");
  assert.equal(readQuests(null), undefined);
  assert.equal(newMeta(1).quests, undefined);
});

test('the quests draw nothing from the fight: settling with quests taken leaves the battle as it was', () => {
  const m = startedMeta(19);
  m.quests = { active: [{ id: 'boneCollector', progress: 0, took: DAY }], offers: [], done: [] };
  const b = fight(['knight', 'archer']);
  const rng = JSON.stringify(b.rng);
  settleRun(m, newRun(4), { won: true, stage: 1, stars: 3, battle: b });
  assert.equal(JSON.stringify(b.rng), rng);
  assert.ok(m.quests.active[0].progress > 0);
});
