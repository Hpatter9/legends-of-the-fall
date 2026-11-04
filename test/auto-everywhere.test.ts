// Auto on every beaten repeat run: the rules for what may be auto-played (docs/notes/auto-everywhere.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, settleWave } from '../src/sim/armies';
import { AUTO_TICKETS, afterFight, canAutoDaily, canAutoQuest, canAutoReplay, spendTicket, startAuto, startAutoDaily, startAutoQuest, ticketsLeft } from '../src/sim/autoReplay';
import { pickSquad } from '../src/sim/autoplay';
import { startedMeta } from '../src/sim/meta';
import { CHAIN_BATTLES, LOST_BATTLES, QUEST_BATTLES, TALE_BATTLES } from '../src/sim/questBattles';
import { startQuestBattle } from '../src/sim/questRun';
import { ALL_HEROES } from '../src/sim/units';

const ALL = [...QUEST_BATTLES, ...CHAIN_BATTLES, ...TALE_BATTLES, ...LOST_BATTLES];
const DAY = 20261104;

const open = () => {
  const m = startedMeta(7);
  m.unlocked = [...new Set([...m.unlocked, ...ALL_HEROES])];
  return m;
};
const won = (m: ReturnType<typeof open>, id: string) => ((m.quests ??= { active: [], done: [] } as never).won = [...(m.quests?.won ?? []), id]);

test('a quest battle takes Auto only once won, and only while its cast is owned', () => {
  const qb = ALL[0];
  const m = open();
  assert.equal(canAutoQuest(m, qb.id), false, 'not won yet');
  assert.equal(startAutoQuest(m, qb.id, 3, DAY), null);
  won(m, qb.id);
  assert.equal(canAutoQuest(m, qb.id), true);
  assert.equal(canAutoQuest(m, 'nope'), false);
  const a = startAutoQuest(m, qb.id, 3, DAY)!;
  assert.deepEqual([a.kind, a.quest, a.count], ['quest', qb.id, 3]);
  assert.equal(startAutoQuest(m, qb.id, 4, DAY), null, 'a count not on offer');
});

test('every kind of quest battle (ordinary, chain and trial, tale, lost technique) can be auto-played once won', () => {
  for (const group of [QUEST_BATTLES, CHAIN_BATTLES, TALE_BATTLES, LOST_BATTLES]) {
    assert.ok(group.length > 0);
    const m = open();
    for (const qb of group) won(m, qb.id);
    for (const qb of group) assert.equal(canAutoQuest(m, qb.id), true, qb.id);
  }
});

test('Auto uses the same daily tickets for every kind of run', () => {
  const m = open();
  const qb = ALL[0];
  won(m, qb.id);
  assert.equal(startAutoQuest(m, qb.id, 10, DAY) !== null, true);
  for (let i = 0; i < AUTO_TICKETS - 2; i++) assert.ok(spendTicket(m, DAY));
  assert.equal(ticketsLeft(m, DAY), 2);
  assert.equal(startAutoQuest(m, qb.id, 3, DAY), null, 'more runs than tickets left');
  m.daily[String(DAY)] = { best: 0, plays: 1, cleared: true };
  assert.equal(startAutoDaily(m, DAY, 3), null);
  assert.ok(startAutoDaily(m, DAY, 1));
});

test('the daily takes Auto only once cleared', () => {
  const m = open();
  assert.equal(canAutoDaily(m, DAY), false);
  m.daily[String(DAY)] = { best: 100, plays: 1, over: true };
  assert.equal(canAutoDaily(m, DAY), false, 'a fall is not a clear');
  m.daily[String(DAY)].cleared = true;
  assert.equal(canAutoDaily(m, DAY), true);
  assert.equal(canAutoDaily(m, DAY + 1), false, 'tomorrow\'s daily is new');
});

test('every cleared army tier takes Auto, and an uncleared one does not', () => {
  const m = open();
  const a = ARMIES[0];
  assert.equal(canAutoReplay(m, a.id, 0), false);
  settleWave(m, a.id, a.waves.length, true, 3);
  assert.equal(canAutoReplay(m, a.id, 0), true);
  assert.equal(canAutoReplay(m, a.id, 1), false, 'a harder tier not yet beaten');
  assert.equal(startAuto(m, a.id, 1, 3, DAY), null);
  m.armies[a.id] = { ...m.armies[a.id], hard: { '1': { clears: 1 } } } as never;
  assert.equal(canAutoReplay(m, a.id, 1), true);
});

test('an auto-replay of a quest battle ends on a loss, and repeats on a clear', () => {
  const m = open();
  won(m, ALL[0].id);
  const a = startAutoQuest(m, ALL[0].id, 3, DAY)!;
  const f = { won: true, cleared: true, wave: 1, crowns: 0, xp: 0 };
  assert.equal(afterFight(a, f), 'run');
  assert.equal(afterFight(a, { ...f, won: false }), 'end');
  assert.equal(a.ended, 'loss');
});

test('the required cast always fights an auto-played quest battle', () => {
  for (const qb of ALL) {
    const m = open();
    won(m, qb.id);
    const run = startQuestBattle(m, qb.id, m.party);
    if (!run || run.mode?.kind !== 'quest') continue;
    const squad = pickSquad(run, m).map((h) => h.kind);
    for (const k of run.mode.cast) assert.ok(squad.includes(k), `${qb.id}: ${k}`);
  }
});
