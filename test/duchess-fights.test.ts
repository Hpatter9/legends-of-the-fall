import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readyBattle } from './helpers';
import { fight, playOut, stepBattle, heroesPlaced, type Battle } from '../src/sim/battle';
import { DUCHESS_KIT, DUCHESS_LEVEL, DUCHESS_ODDS, duchessDue, duchessIn, duchessModeOk, duchessRolls, joinDuchess } from '../src/sim/duchessFight';
import { lastingBoost } from '../src/sim/levels';
import { ratingOf } from '../src/sim/stars';
import { fightXp } from '../src/sim/levels';
import { armyRun, startStage } from '../src/sim/run';
import { ARMIES } from '../src/sim/armies';
import { UNITS } from '../src/sim/units';
import { readFileSync } from 'node:fs';
import { DUCHESS_FIGHT_LINES } from '../src/duchessFightLines';
import { achievementById, checkAchievements } from '../src/sim/achievements';
import { startedMeta } from '../src/sim/meta';
import { dueScene, markSeen } from '../src/sim/sceneRules';
import { SCENES } from '../src/sim/sceneScripts';
import { newStandRun, startStand, type StandSetup } from '../src/sim/stand';
import { gradeBoost } from '../src/sim/run';
import { newCastle } from '../src/sim/castle';
import { foesOf } from '../src/sim/abilities';

const goat = (b: Battle) => b.units.find((u) => u.def === 'duchess');

test('about one fight in a thousand brings her, from the seed alone', () => {
  let n = 0;
  for (let seed = 1; seed <= 200_000; seed++) if (duchessRolls(seed)) n++;
  const share = n / 200_000;
  assert.ok(share > 0.7 / DUCHESS_ODDS && share < 1.3 / DUCHESS_ODDS, `share ${share}`);
  // (the same seed always answers the same)
  for (let seed = 1; seed < 5000; seed++) assert.equal(duchessRolls(seed), duchessRolls(seed));
  assert.equal(duchessDue(7, 'always'), true);
  assert.equal(duchessDue(7, 'never'), false);
});

test('a fight told to bring her has her join as it begins, at level 100, beside the heroes', () => {
  const b = readyBattle(3, undefined, { duchess: 'always' });
  assert.equal(b.duchess, true);
  assert.equal(goat(b), undefined, 'not on the board while the heroes are placed');
  const placed = heroesPlaced(b);
  assert.ok(fight(b));
  const me = goat(b)!;
  assert.ok(me, 'she has joined');
  assert.equal(me.level, DUCHESS_LEVEL);
  assert.equal(me.side, 'hero');
  assert.equal(me.maxHp, Math.round(UNITS.duchess.hp * lastingBoost(DUCHESS_LEVEL).hp));
  assert.ok(me.v >= b.board.d - 3, 'on the heroes\' rows');
  assert.equal(heroesPlaced(b), placed, 'she is not one of the placed heroes');
  assert.ok(stepBattle(b).some((e) => e.kind === 'duchess'), 'the page is told');
  assert.equal(joinDuchess(b), null, 'only one of her');
});

test('a fight without her plays out exactly as before', () => {
  const plain = playOut(readyBattle(11));
  const never = playOut(readyBattle(11, undefined, { duchess: 'never' }));
  assert.equal(never.t, plain.t);
  assert.equal(never.phase, plain.phase);
  assert.deepEqual(never.units.map((u) => u.hp), plain.units.map((u) => u.hp));
});

test('a fight with her plays out the same every time, and she earns no XP and costs no star', () => {
  const a = readyBattle(5, undefined, { duchess: 'always' });
  const c = readyBattle(5, undefined, { duchess: 'always' });
  fight(a);
  fight(c);
  playOut(a);
  playOut(c);
  assert.equal(a.t, c.t);
  assert.deepEqual(a.units.map((u) => u.hp), c.units.map((u) => u.hp));
  assert.ok(duchessIn(a).fought);
  assert.equal(fightXp(a).duchess, undefined);
  // (her fall alone does not take the "No one fell" star)
  const me = goat(a)!;
  if (a.phase === 'won' && a.units.every((u) => u.def === 'duchess' || u.side !== 'hero' || u.alive)) {
    me.alive = false;
    assert.ok(ratingOf(a, false).rules[1].earned);
  }
});

test('a run\'s fight rolls for her only when the page asks, and never in the modes she stays out of', () => {
  const run = armyRun(9, ARMIES[0].id);
  assert.equal(startStage(run).duchess, undefined, 'headless callers never bring her');
  assert.equal(startStage(run, 'always').duchess, true);
  assert.equal(duchessModeOk({ kind: 'army', army: ARMIES[0].id }), true);
  assert.equal(duchessModeOk({ kind: 'daily', date: 20261028, practice: false }), true);
});

test('the Last Stand never has her, and the modes with a party may', () => {
  const setup: StandSetup = { boost: () => gradeBoost(1, 0, 20), castle: newCastle() };
  for (let seed = 1; seed <= 40; seed++) {
    const st = startStand(newStandRun(seed, ['knight', 'paladin', 'samurai', 'kunoichi', 'archer', 'ranger', 'wizard', 'cleric'], ARMIES.map((a) => a.id)), setup);
    assert.equal(st.b.duchess, undefined);
  }
  for (const kind of ['army', 'daily', 'tower', 'calamity'] as const) assert.ok(duchessModeOk({ kind } as never), kind);
  assert.equal(duchessModeOk({ kind: 'stand' } as never), false);
});

test('her headbutt knocks a foe back and dazes it; Nom eats a shield and mends her', () => {
  const b = readyBattle(4, undefined, { duchess: 'always' });
  fight(b);
  const me = goat(b)!;
  const f = foesOf(b, me)[0];
  // (a foe set down beside her)
  f.u = me.u;
  f.v = me.v - 1;
  const at = { u: f.u, v: f.v };
  assert.ok(DUCHESS_KIT.skill.cast(b, me, []));
  assert.ok(!f.alive || f.u !== at.u || f.v !== at.v || (f.stunUntil ?? 0) > b.t, 'shoved or dazed');
  if (!f.alive) return;
  f.u = me.u;
  f.v = me.v - 1;
  f.shield = { hp: 50, until: 1e9 };
  me.hp = Math.round(me.maxHp / 2);
  assert.ok(DUCHESS_KIT.ultimate!.cast(b, me, []));
  assert.equal(f.shield, undefined);
  assert.ok(me.hp > me.maxHp / 2);
});

test('her cinematic comes the first time she really fights, also for a save that saw the old visit scene', () => {
  const m = startedMeta(3);
  (m.scenes ??= []).push('duchessInFight');
  assert.equal(dueScene(m, { kind: 'duchessJoins' }), 'duchessJoins');
  markSeen(m, 'duchessJoins');
  assert.equal(dueScene(m, { kind: 'duchessJoins' }), null);
  assert.ok(SCENES.duchessJoins.shots.some((sh) => sh.lines?.some((l) => l.text.startsWith('Does she fight for your side'))));
});

test('Her Grace\'s Favour: a fight won with her on the field', () => {
  const a = achievementById('duchessFavour')!;
  assert.equal(a.crowns, 20);
  const b = readyBattle(5, undefined, { duchess: 'always' });
  fight(b);
  playOut(b);
  const meta = startedMeta(2);
  const run = armyRun(9, ARMIES[0].id);
  assert.equal(a.earned({ battle: b, won: true, stage: 1, stars: 1, run, meta }), true);
  assert.equal(a.earned({ battle: readyBattle(5), won: true, stage: 1, stars: 1, run, meta }), false);
  assert.equal(a.earned({ battle: b, won: false, stage: 1, stars: 0, run, meta }), false);
  assert.ok(checkAchievements({ battle: b, won: true, stage: 1, stars: 1, run, meta }).some((x) => x.id === 'duchessFavour'));
});

test('her fight lines are the writer\'s, and only ever "Mehh." or "Nom." in their variations', () => {
  const json = JSON.parse(readFileSync('docs/lines/new-lines.json', 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(DUCHESS_FIGHT_LINES)), json.duchess_fights);
  for (const lines of Object.values(DUCHESS_FIGHT_LINES)) for (const l of lines) assert.match(l, /^(M+E+H+|Meh+|Nom)/i, l);
});
