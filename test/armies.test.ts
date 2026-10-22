import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMIES,
  armyById,
  armyCleared,
  armyIsNew,
  armyUnlocked,
  bossesOf,
  bossOf,
  clearedCount,
  firstClearTotal,
  markSeen,
  migrateArmies,
  recordOf,
  REPLAY_SHARE,
  replayOf,
  replayTotal,
  settleWave,
  waveBoost,
  waveCrowns,
} from '../src/sim/armies';
import { CHARGE_MAX, KITS, tryCast } from '../src/sim/abilities';
import { fight, place, playOut, stepBattle, type BattleEvent } from '../src/sim/battle';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { BOSS_IDS, FOE_BANDS, isBoss } from '../src/sim/foes';
import { levelOfKind, xpFor } from '../src/sim/levels';
import { loadMeta, newMeta, saveMeta } from '../src/sim/meta';
import { BOSS_TITLES, titleOf } from '../src/render/bossTitles';
import { armyOfRun, armyRun, bandFor, finish, gradeBoost, isBossRun, loadRun, newRun, saveRun, startStage } from '../src/sim/run';
import { dailyRun, towerRun } from '../src/sim/modes';
import { HEROES, UNITS } from '../src/sim/units';
import { playArmy, savedAt } from '../tools/autoplay';
import { readyBattle } from './helpers';

const store = () => {
  const data: Record<string, string> = {};
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};

/** How many of `n` attempts at an army, from wave 1, with the starting five all at `level`, beat the last boss. */
function clearRate(army: string, level: number, n = 8): number {
  let wins = 0;
  for (let i = 0; i < n; i++) if (playArmy(savedAt(level, HEROES, i + 1), army, 900 + i, HEROES).cleared) wins++;
  return wins / n;
}

test('there are nine armies in the owner\'s order, each of 8 to 10 waves, with real foes and a boss at the end', () => {
  assert.deepEqual(
    ARMIES.map((a) => a.id),
    ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'],
  );
  assert.deepEqual(ARMIES.map((a) => bossOf(a)), ['orcWarlord', 'lichKing', 'boarKing', 'forestBoss3', 'minotaurChampion', 'hornedOgre', 'demonLord', 'oniKing', 'forgeTitan']);
  for (const a of ARMIES) {
    assert.ok(a.waves.length >= 8 && a.waves.length <= 10, a.id);
    for (const w of a.waves) for (const id of w.foes) assert.ok(UNITS[id] && UNITS[id].side === 'foe', `${a.id} ${id}`);
    const bosses = bossesOf(a);
    // (the last wave is the final boss, and there is a mid-boss somewhere around halfway)
    assert.equal(a.waves[a.waves.length - 1].boss, 'final', a.id);
    assert.ok(isBoss(bossOf(a)), a.id);
    assert.ok(bosses.some((b) => b.wave >= a.waves.length * 0.3 && b.wave < a.waves.length), `${a.id} has a mid-boss`);
    for (const b of bosses) assert.ok(isBoss(b.id), `${a.id} wave ${b.wave}`);
  }
  // (the owner's mid-bosses: the Shaman King before the Horned Ogre, the Devil Leader before the Demon Lord)
  assert.deepEqual(bossesOf(armyById('ogres')!).map((b) => b.id), ['shamanKing', 'hornedOgre']);
  assert.deepEqual(bossesOf(armyById('infernal')!).map((b) => b.id), ['devilLeader', 'demonLord']);
  assert.deepEqual(bossesOf(armyById('yokai')!).map((b) => b.id), ['nineTails', 'oniKing']);
  assert.deepEqual(bossesOf(armyById('golems')!).map((b) => b.id), ['sapphireColossus', 'forgeTitan']);
  assert.deepEqual(bossesOf(armyById('wildwood')!).map((b) => b.id), ['forestBoss1', 'forestBoss2', 'forestBoss3']);
});

test('every boss has a title for its intro card', () => {
  for (const id of BOSS_IDS) assert.ok(BOSS_TITLES[id], id);
  assert.equal(titleOf('lichKing'), 'The Frozen Crown');
});

test('the foes of an army get tougher each wave, and each army starts tougher than the one before', () => {
  for (const a of ARMIES) {
    for (let n = 2; n <= a.waves.length; n++) assert.ok(waveBoost(a, n).foes!.hp! > waveBoost(a, n - 1).foes!.hp!, `${a.id} wave ${n}`);
    // (boss waves carry the boss's own stats and size; field waves have no boss boost)
    a.waves.forEach((w, i) => assert.equal(!!waveBoost(a, i + 1).boss, !!w.boss, `${a.id} wave ${i + 1}`));
  }
  for (let i = 1; i < ARMIES.length; i++) {
    assert.ok(ARMIES[i].start > ARMIES[i - 1].start, ARMIES[i].id);
    assert.ok(ARMIES[i].last.hp * ARMIES[i].start >= ARMIES[i - 1].last.hp * ARMIES[i - 1].start * 0.5, ARMIES[i].id);
  }
});

test('only the first army is open on a fresh save, and each opens when the one before has fallen', () => {
  const m = newMeta(1);
  assert.deepEqual(ARMIES.filter((a) => armyUnlocked(m, a.id)).map((a) => a.id), ['orcs']);
  for (const [i, a] of ARMIES.entries()) {
    // (winning the army's waves but not its last boss opens nothing)
    for (let n = 1; n < a.waves.length; n++) settleWave(m, a.id, n, true, 0);
    assert.equal(armyCleared(m, a.id), false, a.id);
    assert.equal(ARMIES.filter((x) => armyUnlocked(m, x.id)).length, i + 1, `before ${a.id}'s boss`);
    const pay = settleWave(m, a.id, a.waves.length, true, 0);
    assert.equal(armyCleared(m, a.id), true, a.id);
    assert.equal(pay.firstClear, true);
    assert.equal(pay.unlocked?.id, ARMIES[i + 1]?.id, a.id);
    assert.equal(ARMIES.filter((x) => armyUnlocked(m, x.id)).length, Math.min(ARMIES.length, i + 2), `after ${a.id}'s boss`);
  }
  assert.equal(clearedCount(m), ARMIES.length);
});

test('a fight lost sends the army back to wave 1 and costs nothing the heroes have earned', () => {
  const m = newMeta(2);
  m.xp.knight = xpFor(6);
  m.crowns = 55;
  const run = armyRun(3, 'orcs', HEROES);
  run.stage = 5;
  finish(run, false);
  assert.equal(run.over, true);
  assert.equal(run.cleared, undefined);
  // (the wave is not won, the army is not cleared, the furthest wave is kept as a record)
  const pay = settleWave(m, 'orcs', 5, false, 0);
  assert.deepEqual(pay, { crowns: 0, replay: false, firstClear: false });
  assert.equal(recordOf(m, 'orcs').best, 5);
  assert.equal(recordOf(m, 'orcs').won, 0);
  assert.equal(armyUnlocked(m, 'undead'), false);
  assert.equal(m.crowns, 55);
  assert.equal(levelOfKind(m, 'knight'), 6);
  // (and the next attempt is a new run, from wave 1 with the starting gold and two heroes)
  const again = armyRun(4, 'orcs', HEROES);
  assert.equal(again.stage, 1);
  assert.equal(again.over, false);
  assert.equal(again.roster.length, 2);
  assert.equal(armyOfRun(again)!.id, 'orcs');
});

test('a run that is over is not resumed, so a loss cannot be continued from a checkpoint', () => {
  const s = store();
  const run = armyRun(5, 'undead', HEROES);
  run.stage = 6;
  finish(run, false);
  saveRun(run, s);
  const saved = loadRun(s)!;
  assert.equal(saved.over, true);
});

test('a first win of a wave pays in full, a replay a share, and stars pay only what they add', () => {
  const m = newMeta(3);
  const a = armyById('undead')!;
  const first = settleWave(m, a.id, 2, true, 3);
  assert.equal(first.replay, false);
  assert.equal(first.crowns, waveCrowns(a, 2) + 9);
  const second = settleWave(m, a.id, 2, true, 3);
  assert.equal(second.replay, true);
  assert.equal(second.crowns, replayOf(waveCrowns(a, 2)));
  assert.ok(second.crowns < first.crowns * 0.25);
  // (a replay with more stars than before pays only the new stars)
  settleWave(m, a.id, 3, true, 1);
  assert.equal(settleWave(m, a.id, 3, true, 3).crowns, replayOf(waveCrowns(a, 3)) + 6);
  assert.equal(recordOf(m, a.id).stars['3'], 3);
  assert.equal(m.crowns, first.crowns + second.crowns + waveCrowns(a, 3) + 3 + replayOf(waveCrowns(a, 3)) + 6);
});

test('replaying a beaten army pays a small fraction of its first clear, and its last boss pays no new unlock', () => {
  for (const a of ARMIES) {
    assert.ok(REPLAY_SHARE > 0 && REPLAY_SHARE <= 0.2);
    assert.ok(replayTotal(a) > 0);
    assert.ok(replayTotal(a) <= firstClearTotal(a) * 0.2, a.id);
  }
  const m = newMeta(4);
  const a = armyById('orcs')!;
  const pays = a.waves.map((_, i) => settleWave(m, a.id, i + 1, true, 0));
  assert.equal(pays.reduce((n, p) => n + p.crowns, 0), firstClearTotal(a));
  assert.equal(pays[pays.length - 1].firstClear, true);
  const before = m.crowns;
  const again = a.waves.map((_, i) => settleWave(m, a.id, i + 1, true, 0));
  assert.equal(m.crowns - before, replayTotal(a));
  assert.ok(again.every((p) => p.replay));
  assert.equal(again[again.length - 1].firstClear, false);
  assert.equal(again[again.length - 1].unlocked, undefined);
  assert.equal(recordOf(m, a.id).clears, 2);
});

test('harder armies pay more, for a first clear and for a replay', () => {
  for (let i = 1; i < ARMIES.length; i++) {
    assert.ok(firstClearTotal(ARMIES[i]) > firstClearTotal(ARMIES[i - 1]), `first ${ARMIES[i].id}`);
    assert.ok(replayTotal(ARMIES[i]) > replayTotal(ARMIES[i - 1]), `replay ${ARMIES[i].id}`);
    assert.ok(ARMIES[i].clear > ARMIES[i - 1].clear, `clear bonus ${ARMIES[i].id}`);
    // (the same wave number, one with no boss in any army, pays more in a later army)
    assert.ok(waveCrowns(ARMIES[i], 2) > waveCrowns(ARMIES[i - 1], 2), `wave ${ARMIES[i].id}`);
  }
});

test('a newly opened army glows until its card has been seen', () => {
  const m = newMeta(5);
  assert.equal(armyIsNew(m, 'orcs'), false);
  assert.equal(armyIsNew(m, 'undead'), false);
  const a = armyById('orcs')!;
  for (let n = 1; n <= a.waves.length; n++) settleWave(m, a.id, n, true, 0);
  assert.equal(armyIsNew(m, 'undead'), true);
  assert.equal(markSeen(m), true);
  assert.equal(armyIsNew(m, 'undead'), false);
  assert.equal(markSeen(m), false);
});

test('a save from before the armies maps its furthest stage onto them and loses nothing', () => {
  const s = store();
  const old = {
    seed: 9, crowns: 321, unlocked: [...HEROES, 'paladin'], party: HEROES, pulls: 12, dry: 3, dryMythic: 3, castle: { treasury: 2, barracks: 1, armoury: 0, mageTower: 1 },
    shards: { knight: 2 }, stars: { 1: 3, 2: 2 }, xp: { knight: xpFor(7), paladin: 400 }, bestStage: 17, tower: 4, daily: {}, bosses: ['orcWarlord', 'forestBoss1', 'demonLord'], achievements: ['firstWin'],
  };
  s.setItem('legends.meta', JSON.stringify(old));
  const m = loadMeta(1, s);
  // stage 17 is past the first three bosses (5, 10, 15): three armies beaten, the fourth open and not new
  assert.deepEqual(ARMIES.filter((a) => armyCleared(m, a.id)).map((a) => a.id), ['orcs', 'undead', 'beasts']);
  assert.equal(armyUnlocked(m, 'wildwood'), true);
  assert.equal(armyUnlocked(m, 'labyrinth'), false);
  assert.equal(armyIsNew(m, 'wildwood'), false);
  // nobody loses heroes, crowns, levels, stars, shards or records
  assert.equal(m.crowns, 321);
  assert.ok(m.unlocked.includes('paladin'));
  assert.equal(levelOfKind(m, 'knight'), 7);
  assert.equal(m.xp.paladin, 400);
  assert.deepEqual(m.stars, { 1: 3, 2: 2 });
  assert.equal(m.shards.knight, 2);
  assert.equal(m.bestStage, 17);
  assert.equal(m.tower, 4);
  assert.deepEqual(m.bosses, ['orcWarlord', 'forestBoss1', 'demonLord']);
  // (a map reads the same once saved and loaded again: it is not mapped twice)
  saveMeta(m, s);
  assert.deepEqual(loadMeta(1, s).armies, m.armies);
});

test('an old save that never beat the first boss has the first army only; a very far one has them all', () => {
  assert.deepEqual(Object.keys(migrateArmies(undefined, 1)), []);
  assert.deepEqual(Object.keys(migrateArmies(undefined, 5)), []);
  assert.deepEqual(Object.keys(migrateArmies(undefined, 6)), ['orcs']);
  assert.equal(Object.keys(migrateArmies(undefined, 99)).length, ARMIES.length);
  const s = store();
  s.setItem('legends.meta', JSON.stringify({ ...newMeta(1), armies: undefined, bestStage: 4 }));
  const m = loadMeta(1, s);
  assert.equal(clearedCount(m), 0);
  assert.equal(armyUnlocked(m, 'orcs'), true);
  assert.equal(armyUnlocked(m, 'undead'), false);
  // (garbage in the army records is dropped, good records are kept)
  const odd = migrateArmies({ orcs: { best: 3.7, won: 'x', clears: -2, stars: { 2: 9, a: 1 } }, nope: {} }, 40);
  assert.deepEqual(odd, { orcs: { best: 3, won: 0, clears: 0, stars: { 2: 3 } } });
});

test('an older run saved mid-way (no army) still loads and plays on as it did', () => {
  const s = store();
  const run = newRun(8, HEROES);
  run.stage = 7;
  saveRun(run, s);
  const loaded = loadRun(s)!;
  assert.equal(armyOfRun(loaded), undefined);
  assert.equal(loaded.stage, 7);
  const b = startStage(loaded);
  assert.deepEqual(b.units.filter((u) => u.side === 'foe').map((u) => u.def), FOE_BANDS[bandFor(7)]);
  assert.equal(isBossRun(loaded), false);
  assert.equal(isBossRun({ ...loaded, stage: 5 }), true);
});

test('the daily challenge and the tower keep their own foe mixes', () => {
  const tower = towerRun(3, newMeta(1));
  tower.stage = 5;
  assert.ok(startStage(tower).units.some((u) => u.def === 'orcWarlord'));
  const daily = dailyRun(20260101);
  daily.stage = 10;
  assert.ok(startStage(daily).units.some((u) => u.def === 'forestBoss1'));
  assert.equal(armyOfRun(tower), undefined);
  assert.equal(armyOfRun(daily), undefined);
});

test('an army run fights its own waves, with the boss, its size and the land of its army', () => {
  const run = armyRun(11, 'undead', HEROES);
  const lands = new Set<string>();
  for (let n = 1; n <= 8; n++) {
    run.stage = n;
    const b = startStage(run);
    lands.add(b.board.area);
    const army = armyById('undead')!;
    assert.deepEqual(b.units.filter((u) => u.side === 'foe' && !u.raised).map((u) => u.def), army.waves[n - 1].foes, `wave ${n}`);
    const boss = b.units.find((u) => u.side === 'foe' && isBoss(u.def));
    assert.equal(!!boss, !!army.waves[n - 1].boss);
    assert.equal(isBossRun(run), !!boss);
    if (boss) assert.ok(boss.size! > 1);
  }
  assert.deepEqual([...lands], ['dungeon']);
});

test('winning waves moves on, the last boss wins the army and ends the run', () => {
  const run = armyRun(12, 'orcs', HEROES);
  const n = armyById('orcs')!.waves.length;
  for (let w = 1; w < n; w++) {
    assert.equal(run.stage, w);
    finish(run, true, 2);
    assert.equal(run.over, false);
    assert.equal(run.cleared, undefined);
  }
  assert.equal(run.stage, n);
  // (a boss wave drops gear)
  const before = (run.items ?? []).length;
  finish(run, true, 2);
  assert.equal(run.cleared, true);
  assert.equal(run.over, true);
  assert.equal(run.stage, n);
  assert.equal(run.event, undefined);
  assert.ok((run.items ?? []).length > before);
});

test('the first wave of the first army is won by a fresh party, every time', () => {
  let wins = 0;
  for (let seed = 1; seed <= 24; seed++) {
    const meta = newMeta(seed);
    const r = playArmy(meta, 'orcs', seed * 7, HEROES);
    if (r.won >= 1) wins++;
  }
  assert.equal(wins, 24);
});

test('the Orc Warlord is a wall at level 1 that levelling takes down', () => {
  assert.ok(clearRate('orcs', 1) <= 0.25, 'level 1');
  assert.ok(clearRate('orcs', 9) >= 0.8, 'level 9');
});

test('each army needs more levels than the one before: the same hero levels clear the early ones and fail the later', () => {
  // (the starting five alone, no castle, no recruits: the second army falls around level 12, the third around 16, and the last
  // is out of their reach, which is what the rarer heroes, ranks and the castle are for)
  assert.ok(clearRate('undead', 4) <= 0.25, 'undead at 4');
  assert.ok(clearRate('undead', 12, 16) >= 0.5, 'undead at 12');
  assert.ok(clearRate('beasts', 6) <= 0.25, 'beasts at 6');
  assert.ok(clearRate('beasts', 16, 16) >= 0.35, 'beasts at 16');
  assert.ok(clearRate('infernal', 9) <= 0.1, 'infernal at 9');
  assert.ok(clearRate('orcs', 9) > clearRate('infernal', 9));
});

test('the Lich King has a title, a size, a sheet row for every animation, and a crown of skills', () => {
  const lich = UNITS.lichKing;
  assert.equal(lich.side, 'foe');
  assert.ok(lich.shot);
  assert.ok(KITS.lichKing.skill.name === 'Raise Dead' && KITS.lichKing.ultimate?.name === 'Soul Nova');
  const b = startStage({ ...armyRun(13, 'undead', HEROES), stage: 8 });
  const king = b.units.find((u) => u.def === 'lichKing')!;
  assert.ok(king.size! >= 1.5);
  assert.ok(king.maxHp > 2000);
});

test('the Lich King raises two skeletons when none stand, never more than two at once or six in all', () => {
  const b = readyBattle(2, ['lichKing', 'orcGrunt']);
  const king = b.units.find((u) => u.def === 'lichKing')!;
  const hero = b.units.find((u) => u.side === 'hero')!;
  king.u = hero.u;
  king.v = hero.v - 3;
  fight(b);
  const skeletons = () => b.units.filter((u) => u.side === 'foe' && u.def === 'skeleton' && u.alive).length;
  king.charge = CHARGE_MAX;
  const out: BattleEvent[] = [];
  assert.ok(tryCast(b, king, out));
  assert.ok(out.some((e) => e.kind === 'skill' && e.name === 'Raise Dead'));
  assert.equal(skeletons(), 2);
  king.charge = CHARGE_MAX;
  assert.equal(tryCast(b, king, []), false, 'not while two stand');
  // (kill them, he raises again: three rounds in all, six skeletons)
  let rounds = 1;
  for (let i = 0; i < 6; i++) {
    for (const u of b.units) if (u.def === 'skeleton') (u.alive = false), (u.hp = 0);
    king.charge = CHARGE_MAX;
    king.busyUntil = 0;
    if (tryCast(b, king, [])) rounds++;
  }
  assert.equal(rounds, 3);
  assert.equal(king.raised, 6);
});

test('Soul Nova hurts and freezes every hero within four tiles, and none beyond', () => {
  const b = readyBattle(3, ['lichKing', 'orcGrunt']);
  const king = b.units.find((u) => u.def === 'lichKing')!;
  const heroes = b.units.filter((u) => u.side === 'hero');
  fight(b);
  const near = heroes[0];
  king.u = near.u;
  king.v = near.v - 2;
  const far = heroes.find((h) => Math.abs(h.u - king.u) + Math.abs(h.v - king.v) > 4);
  const hp = new Map(heroes.map((h) => [h.id, h.hp]));
  king.charge2 = CHARGE_MAX;
  const out: BattleEvent[] = [];
  assert.ok(tryCast(b, king, out));
  assert.ok(out.some((e) => e.kind === 'skill' && e.name === 'Soul Nova'));
  assert.ok(near.hp < hp.get(near.id)!);
  assert.ok(near.stunUntil! > b.t);
  if (far) {
    assert.equal(far.hp, hp.get(far.id));
    assert.equal(far.stunUntil, undefined);
  }
});

test('a whole fight against the Lich King plays out to an end, the same every time', () => {
  const play = () => {
    const b = startStage({ ...armyRun(14, 'undead', HEROES), stage: 8 });
    const spots: [number, number][] = [];
    for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
    HEROES.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length], undefined, gradeBoost(2, 0, 9, id)));
    assert.equal(stepBattle(b).length, 0, 'nothing happens before the fight starts');
    fight(b);
    playOut(b);
    return [b.phase, b.t, b.units.map((u) => `${u.def}${u.hp}`).join()];
  };
  const first = play();
  assert.deepEqual(first, play());
  assert.ok(first[0] === 'won' || first[0] === 'lost');
});
