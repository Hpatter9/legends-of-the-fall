import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBoss } from '../src/sim/foes';
import { bandFor, finish, isBossStage, loadRun, newRun, saveRun, startStage, START_GOLD, stageBoost } from '../src/sim/run';
import { AREAS } from '../src/sim/board';
import { dailyBossName } from '../src/sim/daily';
import { dailyArea, dailyInProgress, dailyLine, dailyRun, dailyScore, dailySeed, dateKey, modeNote, settleDaily, settleRun, startDaily, towerLine, towerOpen, towerRun, TOWER_UNLOCK } from '../src/sim/modes';
import { loadMeta, startedMeta, saveMeta, setParty } from '../src/sim/meta';
import { HEROES } from '../src/sim/units';
import { levelOfKind, xpFor } from '../src/sim/levels';

const store = () => {
  const s: Record<string, string> = {};
  return { getItem: (k: string) => s[k] ?? null, setItem: (k: string, v: string) => void (s[k] = v) };
};

test('the daily seed follows the date: the same day gives the same run, another day another', () => {
  assert.equal(dailySeed(20261021), dailySeed(20261021));
  assert.notEqual(dailySeed(20261021), dailySeed(20261022));
  const a = dailyRun(20261021);
  const b = dailyRun(20261021);
  assert.deepEqual(a, b);
  assert.notEqual(dailyRun(20261022).seed, a.seed);
  assert.equal(dateKey(2026, 10, 21), 20261021);
});

test('the daily run starts with the five heroes in the squad, the starting gold, and one land all day', () => {
  const run = dailyRun(20261021);
  assert.deepEqual(
    run.roster.map((h) => h.kind),
    [...HEROES],
  );
  assert.deepEqual(run.squad, run.roster.map((h) => h.id));
  assert.equal(run.gold, START_GOLD);
  assert.ok(AREAS.includes(dailyArea(20261021)));
  for (let stage = 1; stage <= 6; stage++) {
    run.stage = stage;
    assert.equal(startStage(run).board.area, run.area, `stage ${stage} keeps the day's land`);
  }
});

test('a daily run has no castle upgrades and its summons draw from the starting five', () => {
  const run = dailyRun(20261021);
  assert.equal(run.castle, undefined);
  assert.deepEqual(run.pool, [...HEROES]);
  assert.equal(run.mode?.kind, 'daily');
});

test('the first play of a date counts; a replay is practice and pays and records nothing', () => {
  const m = startedMeta(1);
  const first = startDaily(m, 20261021);
  assert.equal(first.mode?.kind === 'daily' && first.mode.practice, false);
  assert.equal(m.daily['20261021'].plays, 1);
  const again = startDaily(m, 20261021);
  assert.equal(again.mode?.kind === 'daily' && again.mode.practice, true);
  assert.equal(m.daily['20261021'].plays, 2);

  // the practice run wins wave 1 and then falls on wave 3: its note says so, and nothing is kept or paid
  const crowns = m.crowns;
  finish(again, true, 3);
  assert.deepEqual(settleDaily(m, again, { won: true, stage: 1 }), { counted: false, crowns: 0, cleared: false, chest: false, bonus: 0 });
  again.stage = 3;
  finish(again, false);
  settleDaily(m, again, { won: false, stage: 3 });
  settleRun(m, again, { won: false, stage: 3, stars: 0 });
  assert.equal(m.crowns, crowns);
  assert.equal(m.daily['20261021'].wave, undefined);
  assert.equal(m.daily['20261021'].best, 0);
  assert.match(modeNote(again), /wave 3\/10 \(practice, no reward\)/);

  // the counted one keeps its furthest wave, and its fall
  first.stage = 4;
  finish(first, false, 0);
  settleDaily(m, first, { won: false, stage: 4 });
  assert.equal(m.daily['20261021'].wave, 4);
  assert.equal(m.daily['20261021'].over, true);
  assert.equal(m.daily['20261021'].cleared, undefined);
  assert.equal(m.daily['20261021'].best, 300, 'the old score is still kept: three waves cleared');
});

test('the old daily score (waves cleared x 100 plus stars x 10) is still kept in the record', () => {
  const run = dailyRun(20261021);
  assert.equal(dailyScore(run), 0);
  run.stage = 6;
  run.stars = 7;
  assert.equal(dailyScore(run), 5 * 100 + 70);
  run.cleared = true;
  assert.equal(dailyScore(run), 10 * 100 + 70, 'a cleared daily has all ten waves');
});

test('a daily run in progress is resumed on the same date only', () => {
  const run = startDaily(startedMeta(1), 20261021);
  assert.equal(dailyInProgress(run, 20261021), run);
  assert.equal(dailyInProgress(run, 20261022), null);
  run.over = true;
  assert.equal(dailyInProgress(run, 20261021), null);
  assert.equal(dailyInProgress(newRun(3), 20261021), null);
});

test('the camp line names the boss of the day and how the day stands', () => {
  const m = startedMeta(1);
  const boss = dailyBossName(20261021);
  assert.equal(dailyLine(m, 20261021), `Today: ${boss} · not tried`);
  startDaily(m, 20261021);
  assert.equal(dailyLine(m, 20261021), `Today: ${boss} · wave 1/10`, 'a run going on');
  m.daily['20261021'].wave = 6;
  assert.equal(dailyLine(m, 20261021), `Today: ${boss} · wave 6/10`);
  m.daily['20261021'].over = true;
  assert.equal(dailyLine(m, 20261021), `Today: ${boss} · fell at 6/10`);
  m.daily['20261021'].cleared = true;
  assert.equal(dailyLine(m, 20261021), `Today: ${boss} · cleared ✓`);
  // a record from before the fixed daily (a score, no wave) reads as a fall
  m.daily['20261020'] = { best: 480, plays: 1 };
  assert.match(dailyLine(m, 20261020), /fell at 5\/10/);
});

test('the endless tower opens once a run has fought stage 10, or the first army is beaten, and not before', () => {
  const m = startedMeta(1);
  assert.equal(towerOpen(m), false);
  assert.match(towerLine(m), /beat the Orc Warband/);
  m.bestStage = TOWER_UNLOCK - 1;
  assert.equal(towerOpen(m), false);
  const run = newRun(5);
  run.stage = 10;
  finish(run, false);
  settleRun(m, run, { won: false, stage: 10, stars: 0 });
  assert.equal(towerOpen(m), true);
  assert.equal(m.bestStage, 10);
});

test('tower floors climb with the stage scaling, and every fifth floor is a boss', () => {
  assert.ok(stageBoost(20).foes!.hp! > stageBoost(10).foes!.hp!);
  assert.ok(stageBoost(30).foes!.atk! > stageBoost(29).foes!.atk!);
  assert.equal(isBossStage(5), true);
  assert.equal(isBossStage(6), false);
  const run = towerRun(9, startedMeta(1));
  run.stage = 5;
  const b = startStage(run);
  assert.ok(b.units.some((u) => u.side === 'foe' && isBoss(u.def)), 'a boss floor has its boss');
  run.stage = 4;
  assert.ok(!startStage(run).units.some((u) => u.side === 'foe' && isBoss(u.def)), 'an ordinary floor has none');
});

test('the tower has no events, pays gold as a run does, and keeps its best floor', () => {
  const m = startedMeta(1);
  m.bestStage = 12;
  const run = towerRun(7, m);
  assert.deepEqual(run.mode, { kind: 'tower' });
  assert.deepEqual(run.pool, m.party);
  const before = run.gold;
  run.stage = 2;
  finish(run, true, 3);
  assert.equal(run.event, undefined, 'no event between floors');
  assert.ok(run.gold > before);
  const plain = newRun(7);
  plain.stage = 2;
  finish(plain, true, 0);
  assert.ok(plain.event, 'an ordinary run does get events here (the check above is not vacuous)');

  settleRun(m, run, { won: true, stage: 2, stars: 3 });
  assert.equal(m.tower, 2, 'floors one and two cleared');
  run.stage = 8;
  run.over = true;
  settleRun(m, run, { won: false, stage: 8, stars: 0 });
  assert.equal(m.tower, 7, 'seven floors cleared');
  assert.match(towerLine(m), /best floor 7/);
});

test('a tower fight draws from the party at the heroes\' lasting levels', () => {
  const m = startedMeta(1);
  m.unlocked.push('kitsune');
  assert.equal(setParty(m, ['knight', 'samurai', 'kunoichi', 'archer', 'kitsune']), true);
  m.xp.knight = xpFor(10);
  const run = towerRun(11, m);
  assert.deepEqual(run.pool, m.party);
  assert.ok(run.pool!.includes('kitsune'));
  assert.ok(!run.pool!.includes('wizard'));
  assert.equal(levelOfKind(m, 'knight'), 10);
});

test('a boss won is kept by band, once', () => {
  const m = startedMeta(1);
  const run = newRun(2);
  run.stage = 5;
  finish(run, true, 1);
  settleRun(m, run, { won: true, stage: 5, stars: 1 });
  settleRun(m, run, { won: true, stage: 5, stars: 1 });
  assert.deepEqual(m.bosses, [bandFor(5)]);
});

test('the modes survive a save and a load, and bad entries are dropped', () => {
  const s = store();
  const m = startedMeta(4);
  m.bestStage = 14;
  m.tower = 6;
  m.daily = { '20261021': { best: 880, plays: 2, cleared: true, wave: 10, over: true, stars: 2 } };
  m.bosses = ['orcWarlord', 'notABoss'];
  saveMeta(m, s);
  const back = loadMeta(1, s);
  assert.equal(back.bestStage, 14);
  assert.equal(back.tower, 6);
  assert.deepEqual(back.daily, { '20261021': { best: 880, plays: 2, cleared: true, wave: 10, over: true, stars: 2 } });
  assert.deepEqual(back.bosses, ['orcWarlord']);

  const raw = { seed: 3, crowns: 5, unlocked: [...HEROES], pulls: 0, dry: 0, shards: {}, stars: {}, xp: {}, daily: { junk: { best: 1, plays: 1 }, '20261021': { best: 'x', plays: 1 } }, tower: -3 };
  const old = loadMeta(1, { getItem: () => JSON.stringify(raw) });
  assert.equal(old.bestStage, 1, 'an old save reads its best stage as 1');
  assert.equal(old.tower, 0);
  assert.deepEqual(old.daily, {});
  assert.deepEqual(old.achievements, []);
});

test('a daily run and a tower run save and load with their mode', () => {
  const s = store();
  const run = dailyRun(20261021);
  run.stars = 4;
  saveRun(run, s);
  const back = loadRun({ getItem: (k) => s.getItem(k) });
  assert.deepEqual(back?.mode, { kind: 'daily', date: 20261021, practice: false });
  assert.equal(back?.stars, 4);
  assert.equal(back?.area, run.area);
});
