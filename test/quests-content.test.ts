// Quests, batch 1b: the hundred unique quests and thirty repeatable ones (their data checked whole: every hero, army, boss, spell and
// combo they name exists; their words are their own; the goals are spread), repeats and their cooldowns, dropping a quest, the
// givers' slots (the patrons every other day, the Royal charges weekly, spoils and the rift's voice after a fight), the new goal kinds
// and riders, the new needs, the rewards (tomes, shards), and the pace: something fitting on the board at every stage of a save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { place, startBattle, type Battle, type BattleEvent } from '../src/sim/battle';
import { ARMIES, recordOf } from '../src/sim/armies';
import { BOSS_IDS } from '../src/sim/foes';
import { COMBOS } from '../src/sim/combos';
import { SPELL_IDS } from '../src/sim/spells';
import { ORES } from '../src/sim/awakenMats';
import { ALL_HEROES } from '../src/sim/units';
import { TRAITS } from '../src/sim/traits';
import { startedMeta, type Meta } from '../src/sim/meta';
import { settleRun } from '../src/sim/modes';
import { armyRun, newRun } from '../src/sim/run';
import {
  ACTIVE_MAX,
  canOffer,
  condMet,
  dropQuest,
  goalGain,
  handIn,
  heroesOwnedFor,
  needMet,
  noteQuests,
  offerAfterFight,
  payReward,
  questFightOf,
  readQuests,
  refreshOffers,
  slotOf,
  standFight,
  takeQuest,
  timesDone,
  trackQuest,
  ultsIn,
  type QuestFight,
} from '../src/sim/quests';
import { GIVERS, QUESTS, SLOTS, SLOT_RULES, questById, type Goal, type QuestDef } from '../src/sim/questData';
import { GWEN_REMARKS } from '../src/sim/questData/gwen';

const DAY = 20261030;
const clear = (m: Meta, ...ids: string[]) => ids.forEach((id) => (m.armies[id] = { ...recordOf(m, id), clears: 1 }));
const clearAll = (m: Meta) => clear(m, ...ARMIES.map((a) => a.id));
const plain: QuestFight = { won: true, waves: 1, boss: false, heroes: ['knight'], flawless: true, kills: [], dailyCleared: false };
// (the hero quests, SECRET-HEROES, are a set of their own, tested in secret-heroes.test.ts)
const uniques = QUESTS.filter((q) => !q.repeat && GIVERS[q.giver].slot !== 'tale');
const repeats = QUESTS.filter((q) => q.repeat);
/** A date `n` days after DAY (across months is fine: dates are counted by `dayNumber`). */
const after = (n: number): number => {
  const d = new Date(Date.UTC(2026, 9, 30 + n));
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
};

/* ------------------------------------------------------------------ the data */

test('a hundred unique quests and thirty repeatable ones, each with its own id, words, goal and pay', () => {
  // (batch 2 added eleven more uniques, one for each quest battle: the hundred of batch 1b are the rest)
  assert.equal(uniques.filter((q) => q.goal.kind !== 'battle').length, 100);
  assert.equal(uniques.filter((q) => q.goal.kind === 'battle').length, 11);
  assert.equal(repeats.length, 30);
  assert.equal(new Set(QUESTS.map((q) => q.id)).size, QUESTS.length);
  for (const q of QUESTS) {
    assert.ok(q.title && q.text && q.offer.length && q.done.length && q.going, q.id);
    assert.ok(q.offer.length <= 3 && q.offer.every((l) => l.length <= 320), `${q.id}: a card's lines stay short`);
    assert.ok(q.goal.n >= 1, q.id);
    const r = q.reward;
    assert.ok(r.crowns || r.stones || r.chest || r.ores || r.tomes || r.shards || r.hero, q.id);
    assert.ok(GIVERS[q.giver], q.id);
    if (q.repeat) assert.ok(q.repeat >= 1 && q.repeat <= 7 && !q.after, `${q.id}: a repeatable has a cooldown and no story before it`);
  }
});

test('every hero, army, boss, spell, combo, trait and ore a quest names is in the game', () => {
  const armies = new Set(ARMIES.map((a) => a.id));
  const heroes = new Set(ALL_HEROES);
  const traits = new Set(Object.keys(TRAITS));
  const withOk = (w: { heroes?: readonly string[]; traits?: readonly string[] } | undefined, id: string) => {
    for (const h of w?.heroes ?? []) assert.ok(heroes.has(h), `${id}: hero ${h}`);
    for (const t of w?.traits ?? []) assert.ok(traits.has(t), `${id}: trait ${t}`);
  };
  const needOk = (n: QuestDef['needs'], id: string): void => {
    if (n.kind === 'army') assert.ok(armies.has(n.army), `${id}: army ${n.army}`);
    if (n.kind === 'spell') assert.ok((SPELL_IDS as readonly string[]).includes(n.id), `${id}: spell ${n.id}`);
    if (n.kind === 'all') n.of.forEach((x) => needOk(x, id));
  };
  for (const q of QUESTS) {
    const g = q.goal as Goal & Record<string, unknown>;
    needOk(q.needs, q.id);
    if (q.hero) assert.ok(heroes.has(q.hero) && q.giver === 'patron', q.id);
    if (q.giver === 'patron') assert.ok(q.hero, `${q.id}: a patron's quest names its hero`);
    if (q.after) assert.ok(questById(q.after) && questById(q.after)!.id !== q.id, `${q.id}: after ${q.after}`);
    for (const b of q.from ?? []) assert.ok(BOSS_IDS.includes(b), `${q.id}: from ${b}`);
    if (q.giver === 'spoils') assert.ok(q.from?.length, `${q.id}: spoils name the boss they were found on`);
    if (typeof g.army === 'string') assert.ok(armies.has(g.army), `${q.id}: army ${g.army}`);
    if (typeof g.ofArmy === 'string') assert.ok(armies.has(g.ofArmy), `${q.id}: foes of ${g.ofArmy}`);
    for (const b of (g.boss as string[] | undefined) ?? []) assert.ok(BOSS_IDS.includes(b), `${q.id}: boss ${b}`);
    for (const s of [...((g.spells as string[] | undefined) ?? []), ...((g.spellsOnly as string[] | undefined) ?? [])]) assert.ok((SPELL_IDS as readonly string[]).includes(s), `${q.id}: spell ${s}`);
    for (const h of (g.all as string[] | undefined) ?? []) assert.ok(heroes.has(h), `${q.id}: hero ${h}`);
    if (typeof g.combo === 'string') assert.ok(COMBOS.some((c) => c.id === g.combo), `${q.id}: combo ${g.combo}`);
    withOk(g.with as never, q.id);
    withOk(g.only as never, q.id);
    withOk(g.by as never, q.id);
    for (const o of q.reward.ores ?? []) assert.ok(ORES[o.trait], `${q.id}: ore ${o.trait}`);
    if (q.reward.shards) assert.ok(heroes.has(q.reward.shards.kind), `${q.id}: shards of ${q.reward.shards.kind}`);
  }
  for (const id of Object.keys(GWEN_REMARKS)) assert.ok(questById(id)?.giver === 'gwen', `Gwen remarks on ${id}`);
});

test('the words are each quest\'s own: no offer, hand-in or going line is used twice, and the spelling is British', () => {
  const seen = new Map<string, string>();
  for (const q of QUESTS)
    for (const l of [...q.offer, ...q.done, q.going]) {
      // (the rift's one-word asides are its voice; anything of a sentence must be unique)
      if (l.length < 12) continue;
      assert.ok(!seen.has(l), `"${l}" is in ${seen.get(l)} and ${q.id}`);
      seen.set(l, q.id);
    }
  const american = /\b(color|colour?ed|armor|honor|favor|center|realize|realized|organize|neighbor|gray|theater|traveled|catalog|defense|offense)\b/i;
  for (const q of QUESTS) for (const l of [q.title, q.text, ...q.offer, ...q.done, q.going]) assert.ok(!american.test(l.replace(/colour/gi, '')), `${q.id}: "${l}"`);
});

test('the goals are spread: no goal kind with its riders unchanged is used by more than twelve unique quests', () => {
  // (a quest's shape: its kind and which riders it sets, numbers aside; "win 3 waves" and "win 10 waves" are the same shape)
  const shape = (g: Goal) => [g.kind, ...Object.keys(g).filter((k) => k !== 'kind' && k !== 'n').sort()].join('+');
  const count = new Map<string, number>();
  for (const q of uniques) count.set(shape(q.goal), (count.get(shape(q.goal)) ?? 0) + 1);
  for (const [s, n] of count) assert.ok(n <= 12, `${s}: ${n}`);
  const kinds = new Set(uniques.map((q) => q.goal.kind));
  assert.ok(kinds.size >= 15, `${kinds.size} goal kinds`);
  // (the moods are spread too: none above a third)
  const moods = new Map<string, number>();
  for (const q of uniques) moods.set(q.mood ?? 'none', (moods.get(q.mood ?? 'none') ?? 0) + 1);
  assert.ok(!moods.has('none'), 'every unique has a mood');
  for (const [m, n] of moods) assert.ok(n <= 33, `${m}: ${n}`);
  assert.ok(moods.size >= 7);
});

test('every giver has quests, the patrons are many heroes, and some quests are stories in parts', () => {
  const by = (g: string) => uniques.filter((q) => q.giver === g).length;
  for (const g of Object.keys(GIVERS)) if (GIVERS[g as keyof typeof GIVERS].slot !== 'tale') assert.ok(by(g) >= 4, `${g}: ${by(g)}`);
  assert.ok(new Set(uniques.filter((q) => q.hero).map((q) => q.hero)).size >= 15);
  const chains = uniques.filter((q) => q.after);
  assert.ok(chains.length >= 10);
  // (a three-part story: a quest whose quest-before has one before it too)
  assert.ok(chains.some((q) => questById(q.after!)!.after));
});

test('the rewards vary, and repeatables pay less than uniques', () => {
  const has = (k: keyof QuestDef['reward']) => uniques.filter((q) => q.reward[k] !== undefined).length;
  assert.ok(has('chest') >= 15 && has('ores') >= 15 && has('tomes') >= 8 && has('keepsake') >= 15);
  assert.ok(has('shards') >= 5 && has('shards') <= 12, `${has('shards')} quests pay shards`);
  assert.ok(uniques.filter((q) => !q.reward.crowns).length <= 5, 'crowns are not always there, but nearly');
  const crowns = (qs: QuestDef[]) => qs.map((q) => q.reward.crowns ?? 0);
  assert.ok(Math.max(...crowns(repeats)) <= 200);
  assert.ok(repeats.every((q) => !q.reward.chest && !q.reward.shards && (q.reward.stones ?? 0) <= 2));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.ok(mean(crowns(repeats)) * 2.5 < mean(crowns(uniques)), `repeat ${mean(crowns(repeats))} unique ${mean(crowns(uniques))}`);
});

/* ------------------------------------------------------------------ repeats and drops */

test('a repeatable is offered again its cooldown after its hand-in; the Done tab counts its times', () => {
  const m = startedMeta(21);
  const q = questById('repRegularsWager')!;
  clear(m, 'orcs');
  m.quests = { active: [{ id: q.id, progress: 1, took: DAY }], offers: [], done: [] };
  assert.ok(handIn(m, q.id, DAY));
  assert.equal(timesDone(m, q.id), 1);
  assert.equal(m.quests.last![q.id], DAY);
  assert.equal(canOffer(m, q, DAY), false, 'cooling down');
  assert.equal(canOffer(m, q, after(q.repeat! - 1)), false);
  assert.equal(canOffer(m, q, after(q.repeat!)), true, 'back once the cooldown has run');
  // (again: one Done entry, moved to the newest, counted twice; its chest seeds would differ)
  m.quests.active.push({ id: 'roundForTheHouse', progress: 10, took: DAY });
  handIn(m, 'roundForTheHouse', DAY);
  m.quests.active.push({ id: q.id, progress: 1, took: after(2) });
  assert.ok(handIn(m, q.id, after(2)));
  assert.equal(timesDone(m, q.id), 2);
  assert.deepEqual(m.quests.done, ['roundForTheHouse', q.id]);
  // (a unique is still done once and never offered again)
  assert.equal(canOffer(m, questById('roundForTheHouse')!, after(30)), false);
});

test('a repeatable comes back on the board by itself after its cooldown, from the same draws every time', () => {
  const pool = [questById('repGlasses')!];
  const m = startedMeta(22);
  refreshOffers(m, DAY, pool);
  assert.deepEqual(m.quests!.offers.map((o) => o.id), ['repGlasses']);
  takeQuest(m, 'repGlasses', DAY);
  m.quests!.active[0].progress = 5;
  handIn(m, 'repGlasses', DAY);
  refreshOffers(m, DAY, pool);
  assert.equal(m.quests!.offers.length, 0, 'not the same day');
  refreshOffers(m, after(1), pool);
  assert.deepEqual(m.quests!.offers.map((o) => o.id), ['repGlasses']);
});

test('dropping a quest: its progress is lost, a unique may be offered again, a repeatable waits its cooldown', () => {
  const m = startedMeta(23);
  clear(m, 'orcs');
  m.quests = { active: [{ id: 'cartersWheels', progress: 2, took: DAY }, { id: 'repRats', progress: 20, took: DAY }], offers: [], done: [] };
  trackQuest(m, 'cartersWheels');
  assert.ok(dropQuest(m, 'cartersWheels', DAY));
  assert.equal(m.quests.tracked, undefined);
  assert.ok(!m.quests.active.some((a) => a.id === 'cartersWheels'));
  assert.ok(!m.quests.done.includes('cartersWheels'), 'not done');
  assert.ok(canOffer(m, questById('cartersWheels')!, DAY), 'offerable again');
  // (taken again, it starts from nothing)
  m.quests.offers.push({ id: 'cartersWheels', giver: 'gwen', day: DAY });
  takeQuest(m, 'cartersWheels', DAY);
  assert.equal(m.quests.active.find((a) => a.id === 'cartersWheels')!.progress, 0);
  assert.ok(dropQuest(m, 'repRats', DAY));
  assert.equal(canOffer(m, questById('repRats')!, DAY), false);
  assert.equal(canOffer(m, questById('repRats')!, after(1)), true);
  assert.equal(timesDone(m, 'repRats'), 0, 'a drop is not a hand-in');
  assert.equal(dropQuest(m, 'nope', DAY), false);
  assert.equal(dropQuest(m, 'repRats', DAY), false, 'not taken now');
});

test('the save keeps the counts, cooldowns and slot draws, and drops junk', () => {
  const s = readQuests({ active: [], offers: [{ id: 'repGlasses', day: DAY }], done: ['repGlasses'], times: { repGlasses: 3, nope: 2, repRats: -1 }, last: { repGlasses: DAY, repRats: 'x' }, drawn: { patron: DAY, nope: DAY, royal: 12 } })!;
  assert.deepEqual(s.times, { repGlasses: 3 });
  assert.deepEqual(s.last, { repGlasses: DAY });
  assert.deepEqual(s.drawn, { patron: DAY });
  assert.deepEqual(s.offers.map((o) => o.id), ['repGlasses'], 'a repeatable done may be on offer again');
});

/* ------------------------------------------------------------------ the givers' slots */

test('the slots: patrons every other day, a Royal charge a week, Duchess once met; spoils and the rift never drawn with the day', () => {
  const m = startedMeta(24);
  clearAll(m);
  m.unlocked = [...ALL_HEROES];
  m.duchessTaps = 1;
  for (const a of ARMIES) m.armies[a.id] = { ...recordOf(m, a.id), clears: 1, first: 0b11111 };
  const drawnOn = (slot: string) => {
    const days: number[] = [];
    for (let i = 0; i < 14; i++) {
      const before = m.quests?.offers.filter((o) => slotOf(questById(o.id)!) === slot).map((o) => o.id + o.day) ?? [];
      refreshOffers(m, after(i));
      const now = m.quests!.offers.filter((o) => slotOf(questById(o.id)!) === slot);
      if (now.some((o) => !before.includes(o.id + o.day))) days.push(i);
      // (take everything offered so the slots always have room)
      for (const o of [...m.quests!.offers]) {
        m.quests!.offers = m.quests!.offers.filter((x) => x !== o);
      }
    }
    return days;
  };
  assert.deepEqual(drawnOn('royal'), [0, 7]);
  m.quests = undefined;
  assert.deepEqual(drawnOn('patron'), [0, 2, 4, 6, 8, 10, 12]);
  m.quests = undefined;
  assert.deepEqual(drawnOn('duchess'), [0, 3, 6, 9, 12]);
  m.quests = undefined;
  assert.deepEqual(drawnOn('spoils'), []);
  assert.deepEqual(drawnOn('rift'), []);
  assert.equal(SLOTS.slice(0, 2).join(), 'gwen,passerby', "batch 1's slots keep their streams");
  for (const s of SLOTS) assert.ok(SLOT_RULES[s].cap >= 1 && SLOT_RULES[s].days >= 1);
});

test('a patron\'s quest is offered only while the hero is owned; Duchess\'s only once she has been met', () => {
  const m = startedMeta(25);
  clearAll(m);
  const tiago = questById('tiagoSaltBetweenUs')!;
  m.unlocked = ['knight', 'samurai', 'archer', 'buccaneer'];
  assert.equal(heroesOwnedFor(m, tiago), false, 'Harrow is needed on the field too');
  m.unlocked.push('dreadPirate');
  assert.equal(heroesOwnedFor(m, tiago), true);
  m.unlocked = ['knight', 'samurai', 'archer', 'dreadPirate'];
  assert.equal(heroesOwnedFor(m, tiago), false, 'nor without Tiago, who asks');
  const duchess = questById('duchessMenu')!;
  assert.equal(canOffer(m, duchess, DAY), false);
  m.duchessTaps = 1;
  assert.equal(canOffer(m, duchess, DAY), true);
});

test('the owner\'s rule reads every rider: a hero, a pair, only a kind, a tally\'s heroes, a five-hero combo', () => {
  const m = startedMeta(26);
  clearAll(m);
  m.unlocked = ['knight', 'samurai', 'archer'];
  for (const id of ['zofiaSmallPrint', 'hobbUnburied', 'longTable', 'raviShowMeFire', 'oniMask']) {
    const q = questById(id)!;
    assert.equal(heroesOwnedFor(m, q), false, id);
  }
  m.unlocked.push('warlock', 'shambler', 'wizard', 'kitsune');
  for (const id of ['zofiaSmallPrint', 'hobbUnburied', 'raviShowMeFire', 'oniMask']) assert.equal(heroesOwnedFor(m, questById(id)!), true, id);
  assert.equal(heroesOwnedFor(m, questById('longTable')!), false, 'the Holy Order needs all five');
  m.unlocked.push('paladin', 'cleric', 'priestess', 'wanderer');
  assert.equal(heroesOwnedFor(m, questById('longTable')!), true);
  // (and nothing on the board ever asks for a hero not owned, whatever the day)
  const x = startedMeta(27);
  clearAll(x);
  for (let i = 0; i < 20; i++) {
    refreshOffers(x, after(i));
    for (const o of x.quests!.offers) assert.ok(heroesOwnedFor(x, questById(o.id)!), o.id);
    x.quests!.offers = [];
  }
});

test('the needs: a level, a tier, a mode, a spell, all of several; and a story\'s next part waits for the last', () => {
  const m = startedMeta(28);
  assert.equal(needMet(m, { kind: 'level', n: 30 }), false);
  m.xp[m.unlocked[0]] = 1e9;
  assert.equal(needMet(m, { kind: 'level', n: 30 }), true);
  assert.equal(needMet(m, { kind: 'tier', tier: 1 }), false);
  m.armies.orcs = { ...recordOf(m, 'orcs'), clears: 1, first: 0b11 };
  assert.equal(needMet(m, { kind: 'tier', tier: 1 }), true);
  assert.equal(needMet(m, { kind: 'tier', tier: 2 }), false);
  assert.equal(needMet(m, { kind: 'mode', mode: 'calamity' }), false);
  (m.opened ??= []).push('calamity');
  assert.equal(needMet(m, { kind: 'mode', mode: 'calamity' }), true);
  assert.equal(needMet(m, { kind: 'spell', id: 'wolves' }), false);
  m.spellbook.owned.push('wolves');
  assert.equal(needMet(m, { kind: 'spell', id: 'wolves' }), true);
  assert.equal(needMet(m, { kind: 'all', of: [{ kind: 'spell', id: 'wolves' }, { kind: 'duchess' }] }), false);
  m.duchessHay = true;
  assert.equal(needMet(m, { kind: 'all', of: [{ kind: 'spell', id: 'wolves' }, { kind: 'duchess' }] }), true);
  // (the carter's daughter waits for the carter)
  clear(m, 'orcs', 'undead');
  m.unlocked.push('knight');
  const daughter = questById('cartersDaughter')!;
  assert.equal(canOffer(m, daughter, DAY), false);
  m.quests = { active: [], offers: [], done: ['cartersWheels'] };
  assert.equal(canOffer(m, daughter, DAY), true);
});

test('spoils turn up after about one army boss win in three, found on the boss they belong to; the rift\'s voice after a guardian', () => {
  const boss: QuestFight = { ...plain, boss: true, mode: 'army', bosses: ['orcWarlord'] };
  let found = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const m = startedMeta(seed);
    m.quests = { active: [], offers: [], done: [], day: DAY };
    const got = offerAfterFight(m, boss, seed * 7, 15);
    if (got.length) {
      found++;
      assert.deepEqual(got, ['warlordsMap'], 'only the Warlord\'s own spoils are open to a fresh save');
      assert.equal(m.quests.offers[0].day, DAY);
      // (the same fight finds the same, and a second spoils waits while one is on the board)
      const again = startedMeta(seed);
      again.quests = { active: [], offers: [], done: [], day: DAY };
      assert.deepEqual(offerAfterFight(again, boss, seed * 7, 15), got);
      assert.deepEqual(offerAfterFight(m, { ...boss, bosses: ['orcWarlord'] }, seed * 7 + 1, 15), []);
    }
  }
  assert.ok(found > 70 && found < 130, `${found} of 300`);
  const m = startedMeta(3);
  m.quests = { active: [], offers: [], done: [], day: DAY };
  assert.deepEqual(offerAfterFight(m, { ...boss, won: false }, 1, 15), [], 'a loss finds nothing');
  assert.deepEqual(offerAfterFight(m, { ...plain, mode: 'army' }, 1, 3), [], 'nor a wave without a boss');
  const fresh = startedMeta(3);
  assert.deepEqual(offerAfterFight(fresh, boss, 1, 15), [], 'nor before the tavern has been seen');
  // (the rift: a calamity guardian; about one in two)
  let heard = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const x = startedMeta(seed);
    (x.opened ??= []).push('calamity');
    x.quests = { active: [], offers: [], done: [], day: DAY };
    const got = offerAfterFight(x, { ...plain, boss: true, mode: 'calamity', map: 2, bosses: ['calBoss2'] }, seed, 3);
    if (got.length) {
      heard++;
      assert.equal(questById(got[0])!.giver, 'rift');
    }
  }
  assert.ok(heard > 70 && heard < 130, `${heard} of 200`);
});

/* ------------------------------------------------------------------ the new goal kinds and riders */

test('the riders: an army, a mode, a tier, a stage, a pair, only a kind, at most some heroes', () => {
  assert.ok(condMet({ army: 'orcs' }, { ...plain, army: 'orcs' }));
  assert.ok(!condMet({ army: 'orcs' }, plain));
  assert.ok(condMet({ mode: 'daily' }, { ...plain, mode: 'daily' }));
  assert.ok(!condMet({ mode: 'daily' }, { ...plain, mode: 'army' }));
  assert.ok(condMet({ tier: 1 }, { ...plain, mode: 'army', tier: 2 }));
  assert.ok(!condMet({ tier: 1 }, { ...plain, mode: 'army', tier: 0 }));
  assert.ok(!condMet({ tier: 1 }, { ...plain, mode: 'daily', tier: 2 }), 'a tier is an army run\'s');
  assert.ok(condMet({ stage: 8 }, { ...plain, stage: 9 }));
  assert.ok(!condMet({ stage: 8 }, { ...plain, stage: 7 }));
  assert.ok(condMet({ all: ['buccaneer', 'dreadPirate'] }, { ...plain, heroes: ['dreadPirate', 'knight', 'buccaneer'] }));
  assert.ok(!condMet({ all: ['buccaneer', 'dreadPirate'] }, { ...plain, heroes: ['buccaneer', 'knight'] }));
  assert.ok(condMet({ only: { traits: ['undead'] } }, { ...plain, heroes: ['shambler', 'mummy'] }));
  assert.ok(!condMet({ only: { traits: ['undead'] } }, { ...plain, heroes: ['shambler', 'knight'] }));
  assert.ok(!condMet({ only: { traits: ['undead'] } }, { ...plain, heroes: [] }), 'nobody is not "only the dead"');
  assert.ok(condMet({ most: 3 }, { ...plain, heroes: ['a', 'b', 'c'] }));
  assert.ok(!condMet({ most: 3 }, { ...plain, heroes: ['a', 'b', 'c', 'd'] }));
});

test('the riders: quick, a hero on low health, ultimates in one fight, only some spells, no spells, a boss by name', () => {
  assert.ok(condMet({ quick: 30 }, { ...plain, secs: 29.9 }));
  assert.ok(!condMet({ quick: 30 }, { ...plain, secs: 31 }));
  assert.ok(!condMet({ quick: 30 }, { ...plain, secs: 10, won: false }), 'a quick loss is no quick win');
  assert.ok(condMet({ lowHp: true }, { ...plain, lowHp: true }));
  assert.ok(!condMet({ lowHp: true }, plain));
  assert.ok(condMet({ ultsIn: 3 }, { ...plain, ults: ['wizard', 'knight', 'wizard'] }));
  assert.ok(!condMet({ ultsIn: 3 }, { ...plain, ults: ['wizard', 'knight'] }));
  const healing = ['heal', 'renewal', 'cleanse', 'resurrect'];
  assert.ok(condMet({ spellsOnly: healing }, { ...plain, spells: ['heal', 'renewal'] }));
  assert.ok(!condMet({ spellsOnly: healing }, { ...plain, spells: ['heal', 'meteor'] }));
  assert.ok(!condMet({ spellsOnly: healing }, { ...plain, spells: [] }), 'some must be cast');
  assert.ok(condMet({ noSpells: true }, { ...plain, spells: [] }));
  assert.ok(!condMet({ noSpells: true }, { ...plain, spells: ['haste'] }));
  assert.ok(condMet({ boss: ['lichKing'] }, { ...plain, bosses: ['lichKing'] }));
  assert.ok(!condMet({ boss: ['lichKing'] }, { ...plain, bosses: ['boneCaptain'] }));
});

test('the goal kinds: kills by kind or army, an army cleared, tallies, ultimates, spells, duos, a five-hero combo, the MVP', () => {
  assert.equal(goalGain({ kind: 'kills', n: 40, ofArmy: 'orcs' }, { ...plain, won: false, kills: ['orcGrunt', 'skeleton', 'orcBrute'] }), 2);
  assert.equal(goalGain({ kind: 'kills', n: 40, foes: ['skeleton'] }, { ...plain, kills: ['orcGrunt', 'skeleton'] }), 1);
  assert.equal(goalGain({ kind: 'kills', n: 40, mode: 'calamity' }, { ...plain, mode: 'calamity', kills: ['a', 'b'] }), 2);
  assert.equal(goalGain({ kind: 'kills', n: 40, mode: 'calamity' }, { ...plain, mode: 'army', kills: ['a', 'b'] }), 0);
  assert.equal(goalGain({ kind: 'clearArmy', n: 1, army: 'beasts', tier: 1 }, { ...plain, mode: 'army', army: 'beasts', tier: 1, cleared: true }), 1);
  assert.equal(goalGain({ kind: 'clearArmy', n: 1, army: 'beasts', tier: 1 }, { ...plain, mode: 'army', army: 'beasts', tier: 0, cleared: true }), 0);
  assert.equal(goalGain({ kind: 'clearArmy', n: 1 }, { ...plain, mode: 'army', army: 'beasts', cleared: false }), 0);
  assert.equal(goalGain({ kind: 'clearArmy', n: 1 }, { ...plain, mode: 'calamity', cleared: true }), 0, 'a calamity is not an army');
  const stats = [
    { kind: 'knight', dealt: 100, healed: 0, taken: 500.4, kills: 1 },
    { kind: 'cleric', dealt: 20, healed: 300, taken: 50, kills: 0 },
  ];
  assert.equal(goalGain({ kind: 'tally', n: 1e4, stat: 'taken', by: { traits: ['guardian'] } }, { ...plain, won: false, stats }), 500, 'won or lost, whole numbers');
  assert.equal(goalGain({ kind: 'tally', n: 1e4, stat: 'dealt' }, { ...plain, stats }), 120);
  assert.equal(goalGain({ kind: 'tally', n: 1e4, stat: 'kills', by: { heroes: ['knight'] }, flawless: true }, { ...plain, stats, flawless: false }), 0);
  assert.equal(goalGain({ kind: 'tally', n: 1e4, stat: 'healed' }, plain), 0, 'no tallies (the Last Stand, an old page): nothing');
  assert.equal(goalGain({ kind: 'ults', n: 5, by: { heroes: ['wizard'] } }, { ...plain, won: false, ults: ['wizard', 'knight', 'wizard'] }), 2);
  assert.equal(goalGain({ kind: 'ults', n: 5, mode: 'calamity' }, { ...plain, ults: ['wizard'], mode: 'army' }), 0);
  assert.equal(goalGain({ kind: 'spells', n: 6, spells: ['meteor', 'poison'] }, { ...plain, spells: ['meteor', 'heal', 'poison', 'meteor'] }), 3);
  assert.equal(goalGain({ kind: 'spells', n: 6 }, { ...plain, spells: ['heal', 'haste'] }), 2);
  assert.equal(goalGain({ kind: 'duos', n: 3 }, { ...plain, duos: 2 }), 2);
  assert.equal(goalGain({ kind: 'duos', n: 3, mode: 'calamity' }, { ...plain, duos: 2, mode: 'army' }), 0);
  assert.equal(goalGain({ kind: 'teamCombo', n: 1, combo: 'holyOrder' }, { ...plain, team: 'holyOrder' }), 1);
  assert.equal(goalGain({ kind: 'teamCombo', n: 1, combo: 'holyOrder' }, { ...plain, team: 'fleet' }), 0);
  assert.equal(goalGain({ kind: 'teamCombo', n: 1 }, plain), 0);
  assert.equal(goalGain({ kind: 'mvp', n: 3, by: { traits: ['blade'] } }, { ...plain, mvp: 'samurai' }), 1);
  assert.equal(goalGain({ kind: 'mvp', n: 3, by: { traits: ['blade'] } }, { ...plain, mvp: 'knight' }), 0);
  assert.equal(goalGain({ kind: 'mvp', n: 3, by: { traits: ['blade'] } }, { ...plain, mvp: 'samurai', won: false }), 0, 'the MVP of a win');
});

test('the goal kinds: Calamity guardians and clears; the Last Stand\'s waves, rooms and holds (a best, not a sum)', () => {
  const g = { ...plain, mode: 'calamity' as const, boss: true };
  assert.equal(goalGain({ kind: 'calGuardian', n: 1, map: 2 }, { ...g, map: 3 }), 1);
  assert.equal(goalGain({ kind: 'calGuardian', n: 1, map: 2 }, { ...g, map: 1 }), 0);
  assert.equal(goalGain({ kind: 'calGuardian', n: 1 }, { ...g, map: undefined }), 0, 'a mini-boss is no guardian');
  assert.equal(goalGain({ kind: 'calGuardian', n: 1, map: 6, lowHp: true }, { ...g, map: 6, lowHp: true }), 1);
  assert.equal(goalGain({ kind: 'calClear', n: 1 }, { ...g, cleared: true }), 1);
  assert.equal(goalGain({ kind: 'calClear', n: 1 }, { ...g, cleared: false }), 0);
  const end = standFight(14, { best: 15, act: 2, held: 1 });
  assert.equal(goalGain({ kind: 'standWave', n: 20 }, end), 15);
  assert.equal(goalGain({ kind: 'standRoom', n: 3 }, end), 3, 'the chapel is the third room');
  assert.equal(goalGain({ kind: 'standRoom', n: 3, held: true }, standFight(14, { best: 15, act: 2, held: 0 })), 0);
  assert.equal(goalGain({ kind: 'holdLine', n: 2 }, end), 1);
  assert.equal(goalGain({ kind: 'wavesWon', n: 10 }, end), 14, "the Last Stand's waves still count as waves won");
  assert.equal(goalGain({ kind: 'wavesWon', n: 10, mode: 'army' }, end), 0);
  // (a best: a shorter run after a longer one takes nothing away and adds nothing)
  const m = startedMeta(30);
  m.quests = { active: [{ id: 'royalLongNight', progress: 0, took: DAY }, { id: 'hideoHoldTheLine', progress: 0, took: DAY }], offers: [], done: [] };
  noteQuests(m, standFight(12, { best: 13, act: 2, held: 1 }));
  noteQuests(m, standFight(8, { best: 9, act: 1, held: 1 }));
  assert.equal(m.quests.active[0].progress, 13);
  assert.equal(m.quests.active[1].progress, 2, 'holds add up across runs');
  assert.deepEqual(noteQuests(m, standFight(25, { best: 26, act: 3, held: 0 })), ['royalLongNight']);
  assert.equal(m.quests.active[0].progress, 20);
});

/** A finished fight with the given heroes, every foe felled on a win. */
function fight(kinds: string[], band = 'skeletons', won = true): Battle {
  const b = startBattle(4, band);
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  kinds.forEach((k, i) => assert.ok(place(b, k, ...spots[(i * 3) % spots.length], i + 1), `place ${k}`));
  if (won) b.units.filter((u) => u.side === 'foe').forEach((u) => (u.alive = false));
  b.phase = won ? 'won' : 'lost';
  return b;
}

test('the facts of a fight: the spells from its log, its duos and combo, its length, a hero on low health, the page\'s tallies and MVP', () => {
  const m = startedMeta(31);
  const b = fight(['knight', 'wizard']);
  b.log = [{ t: 1, kind: 'spell', id: 'heal', u: 1, v: 1 }, { t: 2, kind: 'ult', unit: 1 }, { t: 3, kind: 'spell', id: 'meteor', u: 1, v: 1 }];
  b.duoCombos = [{ id: 'x', heroAId: 1, heroBId: 2, heroAKind: 'a', heroBKind: 'b', harmonicCount: 0, triggerCount: 2 }];
  b.t = 23_500;
  const knight = b.units.find((u) => u.def === 'knight')!;
  knight.hp = Math.floor(knight.maxHp / 5);
  const stats = [
    { id: knight.id, kind: 'knight', dealt: 10, taken: 900, healed: 0, kills: 1 },
    { id: 99, kind: 'wizard', dealt: 1400, taken: 0, healed: 0, kills: 4 },
  ];
  const f = questFightOf({ battle: b, won: true, stage: 3, stars: 2, run: armyRun(5, 'orcs', undefined, undefined, 2), meta: m }, { stats, ults: ['wizard'] });
  assert.deepEqual(f.spells, ['heal', 'meteor']);
  assert.equal(f.duos, 2);
  assert.equal(f.secs, 23.5);
  assert.equal(f.lowHp, true);
  assert.equal(f.mvp, 'wizard');
  assert.deepEqual(f.ults, ['wizard']);
  assert.equal(f.mode, 'army');
  assert.equal(f.tier, 2);
  assert.equal(f.stage, 3);
  assert.equal(f.stats!.length, 2);
  // (without the page's tallies: no MVP, no ultimates, nothing else lost)
  const g = questFightOf({ battle: fight(['knight']), won: true, stage: 1, stars: 1, run: newRun(3), meta: m });
  assert.equal(g.mvp, undefined);
  assert.deepEqual(g.ults, []);
  assert.equal(g.lowHp, false);
});

test('ultsIn picks out the ultimates among a tick\'s skills', () => {
  const b = fight(['wizard', 'knight']);
  const wiz = b.units.find((u) => u.def === 'wizard')!;
  wiz.level = 40;
  const events: BattleEvent[] = [{ kind: 'skill', by: wiz.id, name: 'not an ultimate', ms: 0 }];
  assert.deepEqual(ultsIn(events, b.units), []);
  // (its ultimate's key, as the fight names it)
  const { ultimateOf, keyOf } = require('../src/sim/abilities') as typeof import('../src/sim/abilities');
  const ult = ultimateOf(wiz);
  assert.ok(ult, 'a level-40 wizard has an ultimate');
  assert.deepEqual(ultsIn([...events, { kind: 'skill', by: wiz.id, name: keyOf(ult!), ms: 0 }], b.units), ['wizard']);
});

test('settleRun counts the page\'s tallies and the felled bosses, and may turn up spoils', () => {
  const m = startedMeta(32);
  m.quests = { active: [{ id: 'kwameShieldPractice', progress: 0, took: DAY }, { id: 'apprenticeWanted', progress: 0, took: DAY }], offers: [], done: [], day: DAY };
  const b = fight(['knight', 'wizard'], 'orcs');
  settleRun(m, armyRun(5, 'orcs'), { won: true, stage: 1, stars: 3, battle: b, stats: [{ id: 1, kind: 'knight', dealt: 0, taken: 1200, healed: 0, kills: 0 }, { id: 2, kind: 'wizard', dealt: 800, taken: 0, healed: 0, kills: 0 }] });
  assert.equal(m.quests.active[0].progress, 1200);
  assert.equal(m.quests.active[1].progress, 800);
});

/* ------------------------------------------------------------------ rewards */

test('rewards pay tomes and a hero\'s shards; a keepsake is words only', () => {
  const m = startedMeta(33);
  const crowns = m.crowns;
  payReward(m, { crowns: 10, tomes: { small: 2, medium: 1 }, shards: { kind: 'cleric', n: 3 }, keepsake: 'a thing' }, 'x');
  assert.equal(m.crowns, crowns + 10);
  assert.equal(m.tomes?.small, 2);
  assert.equal(m.tomes?.medium, 1);
  assert.ok(m.unlock?.cleric === 3 || m.unlocked.includes('cleric'), 'unlock shards for a hero not owned (or it joins)');
  // (a repeatable's chests are told apart by how many times it has been done)
  payReward(m, { chest: 'bronze' }, 'repGlasses', 0);
  payReward(m, { chest: 'bronze' }, 'repGlasses', 1);
  const [a, b] = m.stash.slice(-2);
  assert.notEqual(a.seed, b.seed);
});

/* ------------------------------------------------------------------ pace */

test('the board always has something fitting: a fresh save, and a save at every stage of the road', () => {
  const stages: [string, (m: Meta) => void][] = [
    ['fresh', () => undefined],
    ['the Orcs cleared', (m) => clear(m, 'orcs')],
    ['three armies', (m) => clear(m, 'orcs', 'undead', 'beasts')],
    ['six armies, level 30', (m) => {
      clear(m, 'orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres');
      m.xp[m.unlocked[0]] = 1e9;
      (m.opened ??= []).push('tower');
    }],
    ['every army on Elite, every mode', (m) => {
      for (const a of ARMIES) m.armies[a.id] = { ...recordOf(m, a.id), clears: 1, first: 0b111 };
      (m.opened ??= []).push('tower', 'calamity');
      m.xp[m.unlocked[0]] = 1e9;
    }],
  ];
  for (const [name, set] of stages)
    for (const pack of [['knight', 'samurai', 'archer'], ['peasant', 'kunoichi', 'wizard']]) {
      const m = startedMeta(40);
      m.unlocked = [...pack];
      set(m);
      const open = uniques.filter((q) => canOffer(m, q, DAY));
      assert.ok(open.length >= 5, `${name}, ${pack[0]}'s pack: ${open.length} uniques open`);
      assert.ok(open.filter((q) => slotOf(q) === 'gwen').length >= 1, `${name}: Gwen has one`);
      assert.ok(QUESTS.filter((q) => slotOf(q) === 'passerby' && canOffer(m, q, DAY)).length >= 1, `${name}: a passerby has one`);
      // (and the first day's board is never empty)
      refreshOffers(m, DAY);
      assert.ok(m.quests!.offers.length >= 2, name);
    }
  // (and late in the game there is more open than the board can show: it keeps changing)
  const late = startedMeta(41);
  late.unlocked = [...ALL_HEROES];
  for (const a of ARMIES) late.armies[a.id] = { ...recordOf(late, a.id), clears: 1, first: 0b11111 };
  (late.opened ??= []).push('tower', 'calamity');
  late.duchessTaps = 3;
  late.xp.knight = 1e9;
  late.spellbook.owned.push('wolves', 'resurrect');
  const open = QUESTS.filter((q) => canOffer(late, q, DAY) && !q.from);
  assert.ok(open.length >= 80, `${open.length} open late`);
});

test('three quests at most, still, whatever the givers', () => {
  const m = startedMeta(42);
  m.quests = { active: [], offers: QUESTS.slice(0, 6).map((q) => ({ id: q.id, giver: q.giver, day: DAY })), done: [] };
  for (let i = 0; i < ACTIVE_MAX; i++) assert.ok(takeQuest(m, QUESTS[i].id, DAY));
  assert.equal(takeQuest(m, QUESTS[4].id, DAY), false);
});
