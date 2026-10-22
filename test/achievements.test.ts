import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, achievementById, checkAchievements, type AchievementCtx } from '../src/sim/achievements';
import { D, DEPLOY_ROWS, standable, tileAt } from '../src/sim/board';
import { place, startBattle, type Battle } from '../src/sim/battle';
import { BOSS_BANDS, BOSS_IDS } from '../src/sim/foes';
import { ARMIES } from '../src/sim/armies';
import { loadMeta, newMeta, saveMeta } from '../src/sim/meta';
import { dailyRun, settleRun } from '../src/sim/modes';
import { armyRun, newRun } from '../src/sim/run';
import { xpFor } from '../src/sim/levels';
import { ALL_HEROES } from '../src/sim/units';

/** A finished fight with the given heroes placed, won or lost. */
function fight(kinds: string[], won = true): Battle {
  const b = startBattle(4, 'skeletons');
  const spots: [number, number][] = [];
  for (let v = D - DEPLOY_ROWS; v < D; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
  kinds.forEach((k, i) => assert.ok(place(b, k, ...spots[(i * 3) % spots.length], i + 1), `place ${k}`));
  b.phase = won ? 'won' : 'lost';
  return b;
}

/** A context for a check: a win on `stage` with `stars`, or the run alone (no fight). */
function ctx(over: Partial<AchievementCtx> = {}): AchievementCtx {
  const meta = newMeta(1);
  return { won: false, stage: 1, stars: 0, run: newRun(2), meta, ...over };
}

const earned = (id: string, c: AchievementCtx) => achievementById(id)!.earned(c);

test('there are 15 to 20 achievements, each with its own id, a name and crowns', () => {
  assert.ok(ACHIEVEMENTS.length >= 15 && ACHIEVEMENTS.length <= 20, `${ACHIEVEMENTS.length} achievements`);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.name && a.text, a.id);
    assert.ok(a.crowns > 0, a.id);
  }
});

test('first blood: any win', () => {
  assert.equal(earned('firstWin', ctx({ won: true, battle: fight(['knight']) })), true);
  assert.equal(earned('firstWin', ctx({ won: false, battle: fight(['knight'], false) })), false);
});

test('not a scratch: a win with no hero lost', () => {
  const clean = fight(['knight', 'archer']);
  assert.equal(earned('flawless', ctx({ won: true, battle: clean })), true);
  const hurt = fight(['knight', 'archer']);
  hurt.units.find((u) => u.side === 'hero')!.alive = false;
  assert.equal(earned('flawless', ctx({ won: true, battle: hurt })), false);
  assert.equal(earned('flawless', ctx({ won: false, battle: clean })), false);
});

test('three stars: a win with all three stars', () => {
  assert.equal(earned('perfect', ctx({ won: true, stars: 3 })), true);
  assert.equal(earned('perfect', ctx({ won: true, stars: 2 })), false);
});

test('clearing stages 10, 20 and 30', () => {
  assert.equal(earned('stage10', ctx({ won: true, stage: 9 })), false);
  assert.equal(earned('stage10', ctx({ won: true, stage: 10 })), true);
  assert.equal(earned('stage20', ctx({ won: true, stage: 10 })), false);
  assert.equal(earned('stage20', ctx({ won: true, stage: 20 })), true);
  assert.equal(earned('stage30', ctx({ won: true, stage: 29 })), false);
  assert.equal(earned('stage30', ctx({ won: true, stage: 30 })), true);
});

test('yokai only: a win where every hero placed is a Yokai', () => {
  assert.equal(earned('yokaiOnly', ctx({ won: true, battle: fight(['kitsune', 'karasu', 'yamabushi']) })), true);
  assert.equal(earned('yokaiOnly', ctx({ won: true, battle: fight(['kitsune', 'knight']) })), false);
  assert.equal(earned('yokaiOnly', ctx({ won: false, battle: fight(['kitsune'], false) })), false);
});

test('a three-star hero: one merged to grade 3 in the roster', () => {
  const run = newRun(3);
  assert.equal(earned('threeStar', ctx({ run })), false);
  run.roster[0].grade = 3;
  assert.equal(earned('threeStar', ctx({ run })), true);
});

test('five relics in one run', () => {
  const run = newRun(3);
  run.relics = ['whetstone', 'banner', 'hourglass', 'warDrum'];
  assert.equal(earned('relics5', ctx({ run })), false);
  run.relics.push('luckyCoin');
  assert.equal(earned('relics5', ctx({ run })), true);
});

test('a hero at level 10', () => {
  const meta = newMeta(1);
  meta.xp.samurai = xpFor(10) - 1;
  assert.equal(earned('level10', ctx({ meta })), false);
  meta.xp.samurai = xpFor(10);
  assert.equal(earned('level10', ctx({ meta })), true);
});

test('every hero unlocked', () => {
  const meta = newMeta(1);
  assert.equal(earned('allHeroes', ctx({ meta })), false);
  meta.unlocked = [...ALL_HEROES];
  assert.equal(earned('allHeroes', ctx({ meta })), true);
});

test('every boss beaten', () => {
  const meta = newMeta(1);
  meta.bosses = BOSS_IDS.slice(1);
  assert.equal(earned('bosses', ctx({ meta })), false);
  meta.bosses = [...BOSS_IDS];
  assert.equal(earned('bosses', ctx({ meta })), true);
});

test('fifty stars in all, across the stages', () => {
  const meta = newMeta(1);
  // sixteen stages of three stars make 48; one more star is 49
  for (let stage = 1; stage <= 16; stage++) meta.stars[String(stage)] = 3;
  meta.stars['17'] = 1;
  assert.equal(earned('stars50', ctx({ meta })), false);
  meta.stars['17'] = 2;
  assert.equal(earned('stars50', ctx({ meta })), true);
});

test('a daily score of 1000', () => {
  const meta = newMeta(1);
  meta.daily = { '20261021': { best: 990, plays: 1 } };
  assert.equal(earned('daily1000', ctx({ meta })), false);
  meta.daily['20261021'].best = 1000;
  assert.equal(earned('daily1000', ctx({ meta })), true);
});

test('finishing a daily challenge, counted or not', () => {
  const run = dailyRun(20261021);
  assert.equal(earned('daily', ctx({ run })), false);
  run.over = true;
  assert.equal(earned('daily', ctx({ run })), true);
  const plain = newRun(4);
  plain.over = true;
  assert.equal(earned('daily', ctx({ run: plain })), false);
});

test('the tower: a floor, and twenty floors', () => {
  const meta = newMeta(1);
  assert.equal(earned('tower1', ctx({ meta })), false);
  meta.tower = 1;
  assert.equal(earned('tower1', ctx({ meta })), true);
  assert.equal(earned('tower20', ctx({ meta })), false);
  meta.tower = 20;
  assert.equal(earned('tower20', ctx({ meta })), true);
});

test('recruiter: ten pulls', () => {
  const meta = newMeta(1);
  meta.pulls = 9;
  assert.equal(earned('recruiter', ctx({ meta })), false);
  meta.pulls = 10;
  assert.equal(earned('recruiter', ctx({ meta })), true);
});

test('checking pays each achievement once, and returns only what is new', () => {
  const meta = newMeta(1);
  const crowns = meta.crowns;
  const first = checkAchievements(ctx({ meta, won: true, stage: 10, battle: fight(['knight']) }));
  assert.ok(first.some((a) => a.id === 'firstWin'));
  assert.ok(first.some((a) => a.id === 'stage10'));
  const paid = first.reduce((n, a) => n + a.crowns, 0);
  assert.equal(meta.crowns, crowns + paid);
  assert.deepEqual(
    checkAchievements(ctx({ meta, won: true, stage: 10, battle: fight(['knight']) })).map((a) => a.id),
    [],
  );
  assert.ok(meta.achievements.includes('stage10'));
});

test('beating every boss, the endless climb\'s and every army\'s, earns the boss achievement', () => {
  const meta = newMeta(1);
  const run = newRun(6);
  BOSS_BANDS.forEach((_, i) => {
    const got = settleRun(meta, run, { won: true, stage: (i + 1) * 5, stars: 0 });
    assert.ok(!got.some((a) => a.id === 'bosses'));
  });
  assert.equal(meta.bosses.length, BOSS_BANDS.length);
  // (the armies' bosses count too, a wave at a time)
  for (const a of ARMIES) {
    const ar = armyRun(6, a.id);
    a.waves.forEach((w, i) => {
      if (w.boss) settleRun(meta, ar, { won: true, stage: i + 1, stars: 0 });
    });
  }
  assert.equal(new Set(meta.bosses).size, BOSS_IDS.length);
  assert.ok(meta.achievements.includes('bosses'));
});

test('a settled fight earns its achievements, and they save with the crowns', () => {
  const store: Record<string, string> = {};
  const s = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v) };
  const meta = newMeta(2);
  const got = settleRun(meta, newRun(8), { won: true, stage: 1, stars: 3, battle: fight(['knight']) });
  assert.deepEqual(got.map((a) => a.id).sort(), ['firstWin', 'flawless', 'perfect']);
  saveMeta(meta, s);
  const back = loadMeta(1, { getItem: (k) => s.getItem(k) });
  assert.deepEqual(back.achievements, meta.achievements);
  assert.equal(back.crowns, meta.crowns);
});
