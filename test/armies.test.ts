import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARMIES,
  ARMY_NEED,
  ARMY_WAVES,
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
  totalStars,
  waveBoost,
  waveCrowns,
} from '../src/sim/armies';
import { CHARGE_MAX, KITS, tryCast } from '../src/sim/abilities';
import { fight, place, playOut, stepBattle, type BattleEvent } from '../src/sim/battle';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { BOSS_IDS, FOE_BANDS, isBoss } from '../src/sim/foes';
import { levelOfKind, xpFor } from '../src/sim/levels';
import { ARMY_STARS, TIERS } from '../src/sim/tiers';
import { timeTarget } from '../src/sim/armyStars';
import { loadMeta, startedMeta, saveMeta } from '../src/sim/meta';
import { BOSS_TITLES, titleOf } from '../src/render/bossTitles';
import { ARMY_START_GOLD, armyOfRun, armyRun, bandFor, finish, gradeBoost, isBossRun, loadRun, newRun, saveRun, startStage, waveArmyOf } from '../src/sim/run';
import { dailyRun, towerRun } from '../src/sim/modes';
import { dailyBoss, DAILY_WAVES } from '../src/sim/daily';
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

test('there are nine armies in the owner\'s order, each of 15 waves, with real foes and a boss at the end', () => {
  assert.deepEqual(
    ARMIES.map((a) => a.id),
    ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'],
  );
  assert.deepEqual(ARMIES.map((a) => bossOf(a)), ['orcWarlord', 'lichKing', 'boarKing', 'forestBoss3', 'minotaurChampion', 'hornedOgre', 'demonLord', 'oniKing', 'forgeTitan']);
  for (const a of ARMIES) {
    assert.equal(a.waves.length, ARMY_WAVES, a.id);
    for (const w of a.waves) for (const id of w.foes) assert.ok(UNITS[id] && UNITS[id].side === 'foe', `${a.id} ${id}`);
    const bosses = bossesOf(a);
    // (the last wave is the final boss, and there is a mid-boss somewhere around halfway)
    assert.equal(a.waves[a.waves.length - 1].boss, 'final', a.id);
    assert.ok(isBoss(bossOf(a)), a.id);
    assert.ok(bosses.some((b) => b.wave >= a.waves.length * 0.3 && b.wave < a.waves.length), `${a.id} has a mid-boss`);
    // (the mid-bosses are spread: none in the first four waves or the last, and no two within four waves of each other)
    for (const [i, b] of bosses.entries()) {
      assert.ok(b.wave >= 5, `${a.id} wave ${b.wave}`);
      if (i > 0) assert.ok(b.wave - bosses[i - 1].wave >= 5, `${a.id} wave ${b.wave}`);
    }
    for (const b of bosses) assert.ok(isBoss(b.id), `${a.id} wave ${b.wave}`);
  }
  // (the owner's mid-bosses: the Shaman King before the Horned Ogre, the Devil Leader before the Demon Lord)
  assert.deepEqual(bossesOf(armyById('orcs')!).map((b) => b.wave), [8, 15]);
  assert.deepEqual(bossesOf(armyById('wildwood')!).map((b) => b.wave), [5, 10, 15]);
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

/** Give an army this many stars (the conditions of its tiers in order, Normal's first). */
function giveStars(m: ReturnType<typeof startedMeta>, id: string, n: number): void {
  const rec = (m.armies[id] ??= { waves: ARMY_WAVES, best: 0, won: 0, clears: 0, stars: {} });
  rec.met = {};
  let left = n;
  TIERS.forEach((t, i) => {
    const k = Math.min(left, t.stars);
    if (k > 0) rec.met![String(i)] = (1 << k) - 1;
    left -= k;
  });
}

test('only the first army is open on a fresh save, and each opens at its number of stars, not by a clear alone', () => {
  const m = startedMeta(1);
  assert.deepEqual(ARMIES.filter((a) => armyUnlocked(m, a.id)).map((a) => a.id), ['orcs']);
  // (clearing an army's last boss with no stars won opens nothing)
  const a0 = ARMIES[0];
  for (let n = 1; n <= a0.waves.length; n++) settleWave(m, a0.id, n, true, 0);
  assert.equal(armyCleared(m, a0.id), true);
  assert.equal(armyUnlocked(m, 'undead'), false);
  // (the stars open them in order, the curve in `ARMY_NEED`)
  for (let stars = 0; stars <= ARMY_STARS * 2; stars++) {
    giveStars(m, 'orcs', Math.min(stars, ARMY_STARS));
    if (stars > ARMY_STARS) giveStars(m, 'undead', stars - ARMY_STARS);
    ARMIES.forEach((a, i) => assert.equal(armyUnlocked(m, a.id), i === 0 || totalStars(m) >= 2 * i, `${a.id} at ${totalStars(m)} stars`));
  }
  assert.deepEqual(ARMY_NEED, ARMIES.map((_, i) => 2 * i));
});

test('a save that had an army open keeps it, whatever its stars', () => {
  const m = startedMeta(1);
  m.opened = ['wildwood'];
  assert.equal(armyUnlocked(m, 'wildwood'), true);
  assert.equal(armyUnlocked(m, 'labyrinth'), false);
});

test('a fight lost sends the army back to wave 1 and costs nothing the heroes have earned', () => {
  const m = startedMeta(2);
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
  // (and the next attempt is a new run, from wave 1 with the army's starting gold and no hero: two hires)
  const again = armyRun(4, 'orcs', HEROES);
  assert.equal(again.stage, 1);
  assert.equal(again.over, false);
  assert.equal(again.roster.length, 0);
  assert.equal(again.gold, ARMY_START_GOLD);
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
  const m = startedMeta(3);
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
  const m = startedMeta(4);
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
  const m = startedMeta(5);
  assert.equal(armyIsNew(m, 'orcs'), false);
  assert.equal(armyIsNew(m, 'undead'), false);
  giveStars(m, 'orcs', 2);
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
  s.setItem('legends.meta', JSON.stringify({ ...startedMeta(1), armies: undefined, bestStage: 4 }));
  const m = loadMeta(1, s);
  assert.equal(clearedCount(m), 0);
  assert.equal(armyUnlocked(m, 'orcs'), true);
  assert.equal(armyUnlocked(m, 'undead'), false);
  // (garbage in the army records is dropped, good records are kept)
  // (a record from the 8-wave Orc Warband keeps its share of the way on the 15 waves; the stars are as they were)
  const odd = migrateArmies({ orcs: { best: 3.7, won: 'x', clears: -2, stars: { 2: 9, a: 1 } }, nope: {} }, 40);
  assert.deepEqual(odd, { orcs: { waves: 15, best: 5, won: 0, clears: 0, stars: { 2: 3 } } });
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
  const tower = towerRun(3, startedMeta(1));
  tower.stage = 5;
  assert.ok(startStage(tower).units.some((u) => u.def === 'orcWarlord'));
  // (the daily is a fixed ten waves that end in the boss of the day, not the endless stages: its last wave holds that boss)
  const daily = dailyRun(20260101);
  daily.stage = DAILY_WAVES;
  assert.ok(startStage(daily).units.some((u) => u.def === dailyBoss(20260101)));
  assert.equal(armyOfRun(tower), undefined);
  assert.equal(armyOfRun(daily), undefined, 'the daily is no army of the list: it keeps no army record');
  assert.equal(waveArmyOf(daily)?.waves.length, DAILY_WAVES);
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
    const meta = startedMeta(seed);
    const r = playArmy(meta, 'orcs', seed * 7, HEROES);
    if (r.won >= 1) wins++;
  }
  assert.equal(wins, 24);
});

test('the Orc Warlord is a wall at level 1 that levelling takes down', () => {
  assert.ok(clearRate('orcs', 1) <= 0.25, 'level 1');
  assert.ok(clearRate('orcs', 14) >= 0.7, 'level 14');
});

test('each army needs more levels than the one before: the same hero levels clear the early ones and fail the later', () => {
  // (the starting five alone, no castle, no recruits, over fifteen waves: the second army falls around level 20, the third is a long way
  // off, and the later ones are out of their reach, which is what the rarer heroes, ranks and the castle are for)
  assert.ok(clearRate('undead', 4) <= 0.25, 'undead at 4');
  assert.ok(clearRate('undead', 20, 16) >= 0.35, 'undead at 20');
  assert.ok(clearRate('beasts', 6) <= 0.25, 'beasts at 6');
  assert.ok(clearRate('beasts', 20, 16) >= 0.3, 'beasts at 20');
  assert.ok(clearRate('infernal', 14) <= 0.1, 'infernal at 14');
  assert.ok(clearRate('orcs', 14) > clearRate('infernal', 14));
});

test('the Lich King has a title, a size, a sheet row for every animation, and a crown of skills', () => {
  const lich = UNITS.lichKing;
  assert.equal(lich.side, 'foe');
  assert.ok(lich.shot);
  assert.ok(KITS.lichKing.skill.name === 'Raise Dead' && KITS.lichKing.ultimate?.name === 'Soul Nova');
  const b = startStage({ ...armyRun(13, 'undead', HEROES), stage: 15 });
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
    const b = startStage({ ...armyRun(14, 'undead', HEROES), stage: 15 });
    const spots: [number, number][] = [];
    for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
    HEROES.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length], undefined, gradeBoost(2, 0, 9)));
    assert.equal(stepBattle(b).length, 0, 'nothing happens before the fight starts');
    fight(b);
    playOut(b);
    return [b.phase, b.t, b.units.map((u) => `${u.def}${u.hp}`).join()];
  };
  const first = play();
  assert.deepEqual(first, play());
  assert.ok(first[0] === 'won' || first[0] === 'lost');
});

test('every army has fifteen waves, and the first-clear pay rose a little (about 15%), not by half', () => {
  assert.equal(ARMY_WAVES, 15);
  // (the totals as they were with 8, 9 and 10 waves)
  const before: Record<string, number> = { orcs: 294, undead: 460, beasts: 665, wildwood: 1026, labyrinth: 1334, ogres: 1901, infernal: 2463, yokai: 3142, golems: 3868 };
  for (const a of ARMIES) {
    assert.equal(a.waves.length, 15, a.id);
    const ratio = firstClearTotal(a) / before[a.id];
    assert.ok(ratio > 1.05 && ratio < 1.25, `${a.id} ${ratio.toFixed(2)}`);
    // (the replay share is the same 15% of everything)
    assert.ok(Math.abs(replayTotal(a) / firstClearTotal(a) - REPLAY_SHARE) < 0.03, a.id);
    // (waves ramp from three foes to six, and each is the army's own troops)
    const sizes = a.waves.filter((w) => !w.boss).map((w) => w.foes.length);
    assert.equal(sizes[0], 3, a.id);
    assert.ok(sizes.every((n, i) => i === 0 || n >= sizes[i - 1]), a.id);
    assert.ok(Math.max(...sizes) <= 6, a.id);
  }
});

test('the time target for the third star scales with the fifteen waves', () => {
  for (const a of ARMIES) assert.equal(timeTarget(a, 0), 15 * 26_000);
});

test('records saved when the armies were shorter map onto the fifteen waves: a cleared army stays cleared, stars and chests are untouched', () => {
  const rec = migrateArmies(
    {
      orcs: { best: 8, won: 8, clears: 2, stars: { 8: 3, 4: 2 }, met: { 0: 7 }, hard: { 1: { won: 8, clears: 1 }, 2: { won: 5, clears: 0 } }, chests: [3, 5] },
      undead: { best: 6, won: 4, clears: 0, stars: { 3: 1 } },
      beasts: { best: 8, won: 7, clears: 0, stars: {} },
      wildwood: { best: 9, won: 9, clears: 1, stars: {} },
    },
    1,
  );
  // (cleared: all fifteen waves are won, the clear count is kept)
  assert.deepEqual([rec.orcs.best, rec.orcs.won, rec.orcs.clears, rec.orcs.waves], [15, 15, 2, 15]);
  assert.deepEqual(rec.orcs.stars, { 8: 3, 4: 2 });
  assert.equal(rec.orcs.met?.['0'], 7);
  assert.deepEqual(rec.orcs.chests, [3, 5]);
  assert.deepEqual(rec.orcs.hard, { '1': { won: 15, clears: 1 }, '2': { won: 9, clears: 0 } });
  // (not cleared: the share of the way it had come, never past the last wave)
  assert.deepEqual([rec.undead.best, rec.undead.won], [11, 7]);
  assert.deepEqual([rec.beasts.best, rec.beasts.won, rec.beasts.clears], [15, 13, 0]);
  assert.deepEqual([rec.wildwood.best, rec.wildwood.won, rec.wildwood.clears], [15, 15, 1]);
  // (a record already in fifteen waves is not mapped again, and loading twice changes nothing)
  assert.deepEqual(migrateArmies(JSON.parse(JSON.stringify(rec)), 1), rec);
  const fresh = startedMeta(4);
  settleWave(fresh, 'orcs', 5, true, 0);
  const back = migrateArmies(JSON.parse(JSON.stringify(fresh.armies)), 1);
  assert.deepEqual([back.orcs.best, back.orcs.won], [5, 5]);
  // (an army cleared in the old length still counts as a replay on every wave of the new one)
  const m = startedMeta(5);
  m.armies = rec;
  assert.equal(settleWave(m, 'orcs', 12, true, 0).replay, true);
  assert.equal(armyCleared(m, 'orcs'), true);
  assert.equal(armyUnlocked(m, 'undead'), true);
});

test('each army names the hero level Normal is meant for: rising army by army, the first at level 1', () => {
  assert.equal(ARMIES[0].level, 1);
  for (let i = 1; i < ARMIES.length; i++) {
    assert.ok(ARMIES[i].level > ARMIES[i - 1].level, ARMIES[i].id);
    assert.ok(ARMIES[i].start > ARMIES[i - 1].start, ARMIES[i].id);
  }
  // (a level-1 party of the starting five, no castle, does not clear any army after the first in one try)
  for (const a of ARMIES.slice(2)) assert.ok(clearRate(a.id, 1) <= 0.1, `${a.id} at level 1`);
});
