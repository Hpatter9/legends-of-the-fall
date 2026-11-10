// QUEST-POSSIBLE, round 2 (docs/notes/quest-possible.md; the director's calls): a taken quest that bars spells or ultimates holds that Auto
// switch off for a fight it would count for; Resurrect's quest waits for Resurrect; Voltara's ultimates part waits for a hero at level 30.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta, type Meta } from '../src/sim/meta';
import { needMet, takeQuest } from '../src/sim/quests';
import { questById, withQuests, type QuestDef } from '../src/sim/questData';
import { autoHolds, holdLines } from '../src/sim/autoHold';
import { CHAINS } from '../src/sim/eidolonChainData';
import { currentPart, noteChains, partLocked } from '../src/sim/eidolonChains';
import { ULT_LEVEL } from '../src/sim/abilities';
import { xpFor } from '../src/sim/levels';

const DAY = 20261110;
const quest = (id: string, goal: QuestDef['goal'], over: Partial<QuestDef> = {}): QuestDef => ({ id, title: id, giver: 'gwen', needs: { kind: 'any' }, text: id, offer: ['o'], going: 'g', done: ['d'], goal, reward: { crowns: 1 }, ...over });
const take = (m: Meta, ...qs: QuestDef[]) => {
  m.quests = { active: [], offers: qs.map((q) => ({ id: q.id, giver: q.giver, day: DAY })), done: [], day: DAY };
  for (const q of qs) assert.ok(takeQuest(m, q.id, DAY), q.id);
};
const ARMY = { mode: 'army', army: 'undead', tier: 1, stage: 8 };

test('a taken quest with no spells holds SPELL Auto off in a fight it would count for, and says why', () => {
  const q = quest('quietKing', { kind: 'wavesWon', n: 5, army: 'undead', noSpells: true });
  withQuests([q], () => {
    const m = startedMeta(3);
    assert.deepEqual(autoHolds(m, ARMY), {}, 'nothing taken: nothing held');
    take(m, q);
    assert.deepEqual(autoHolds(m, ARMY), { spells: 'quietKing' });
    assert.deepEqual(autoHolds(m, { ...ARMY, army: 'orcs' }), {}, 'another army: its fights do not count, the player’s Auto stands');
    assert.deepEqual(autoHolds(m, { mode: 'daily', tier: 0, stage: 3 }), {});
    assert.match(holdLines(autoHolds(m, ARMY))[0], /SPELL Auto is held off this fight: “quietKing”/);
    // (the player's own setting is not touched)
    assert.equal(m.spellAuto, true);
  });
});

test('no ultimates holds ULT Auto off; a quest done, or a rider the place does not meet, holds nothing', () => {
  const ults = quest('bareHands', { kind: 'bossDown', n: 1, tier: 2, noUlts: true });
  const both = quest('both', { kind: 'wavesWon', n: 1, mode: 'army', noUlts: true, noSpells: true });
  withQuests([ults, both], () => {
    const m = startedMeta(3);
    take(m, ults);
    assert.deepEqual(autoHolds(m, ARMY), {}, 'Hard is below the Elite it asks');
    assert.deepEqual(autoHolds(m, { ...ARMY, tier: 2 }), { ults: 'bareHands' });
    take(m, both);
    assert.deepEqual(autoHolds(m, ARMY), { spells: 'both', ults: 'both' });
    assert.deepEqual(holdLines(autoHolds(m, ARMY)), ["SPELL and ULT Auto are held off this fight: “both” asks for no king's spells and no ultimates"], 'one quest holding both: one line');
    assert.equal(holdLines({ spells: 'a', ults: 'b' }).length, 2, 'two quests: a line each');
    m.quests!.active[0].progress = 1;
    assert.deepEqual(autoHolds(m, ARMY), {}, 'done: the switches come back');
  });
});

test('the Lich King’s letter is offered only once Resurrect can be had', () => {
  const q = questById('lichsLetter')!;
  const m = startedMeta(3);
  assert.ok(!needMet(m, q.needs));
  m.spellbook.owned.push('resurrect');
  assert.ok(needMet(m, q.needs));
});

test('Thunder on Demand waits for a hero at level 30, when ultimates can be fired, and says so', () => {
  const part = CHAINS.flatMap((c) => c.parts).find((p) => p.id === 'voltara3')!;
  assert.deepEqual(part.needs, { kind: 'level', n: ULT_LEVEL }, 'the lock is the ultimates’ own level');
  const m = startedMeta(3);
  assert.match(partLocked(m, part) ?? '', /level 30/);
  m.xp[m.unlocked[0]] = xpFor(ULT_LEVEL);
  assert.equal(partLocked(m, part), null);
  // (a locked part counts nothing: no fight moves it on)
  const voltara = CHAINS.find((c) => c.parts.includes(part))!;
  const low = startedMeta(3);
  low.quests = { active: [], offers: [], done: [], day: DAY, chains: { [voltara.id]: { part: voltara.parts.indexOf(part), progress: 0 } } } as Meta['quests'];
  for (const c of CHAINS) if (c.order < voltara.order) low.quests!.chains![c.id] = { part: c.parts.length, progress: 0, bound: true };
  const f = { won: true, waves: 1, boss: false, heroes: ['knight'], flawless: true, kills: [], dailyCleared: false, mode: 'army' as const, tier: 1, stage: 3, ults: ['knight', 'knight', 'knight', 'knight', 'knight', 'knight'], spells: [] };
  assert.equal(currentPart(low)?.part.id, 'voltara3', 'the part going');
  assert.deepEqual(noteChains(low, f), []);
  assert.equal(low.quests!.chains![voltara.id].progress, 0, 'locked: the six ultimates count for nothing');
  low.xp[low.unlocked[0]] = xpFor(ULT_LEVEL);
  const found = noteChains(low, f);
  assert.equal(found[0]?.piece.id, part.piece.id, 'with a hero at level 30 the same fight counts, and its six ultimates finish the part');
  assert.equal(currentPart(low)?.index, voltara.parts.indexOf(part) + 1);
});
