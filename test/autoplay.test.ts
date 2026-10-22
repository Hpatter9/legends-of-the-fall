import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, armyCleared, settleWave } from '../src/sim/armies';
import { AUTO_COUNTS, afterFight, canAutoReplay, maxSpeed, startAuto, stopAuto, tierCleared } from '../src/sim/autoReplay';
import { autoDeploy, autoEvent, autoFormation, autoRound, gearCount, isBackline } from '../src/sim/autoplay';
import { canPlace, fight, playOut, startBattle } from '../src/sim/battle';
import { D, DEPLOY_ROWS, makeBoard, standable, tileAt, type Board } from '../src/sim/board';
import { fightXp, gainXp, xpFor } from '../src/sim/levels';
import { newMeta } from '../src/sim/meta';
import type { EventCard } from '../src/sim/events';
import { armyRun, finish, newRun, isBossRun, noteFight, startStage, SQUAD } from '../src/sim/run';
import { ratingOf } from '../src/sim/stars';
import { HEROES } from '../src/sim/units';

const FRONT = D - DEPLOY_ROWS;
const heroes = (...kinds: string[]) => kinds.map((kind, i) => ({ id: i + 1, kind }));
/** A board with no relief or cover: every tile at height 0. */
const flat = (seed = 3): Board => {
  const b = makeBoard(seed);
  return { ...b, tiles: b.tiles.map(() => ({ h: 0, deco: 0 })) };
};

test('auto-deploy is legal on every board and the same each time', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const run = armyRun(seed, ARMIES[seed % ARMIES.length].id, HEROES);
    const meta = newMeta(seed);
    run.gold = 500;
    autoRound(run, meta);
    assert.equal(run.squad.length, Math.min(SQUAD, run.roster.length));
    const b = startStage(run);
    const spots = autoDeploy(b, run, meta);
    assert.equal(spots.length, run.squad.length);
    const seen = new Set(spots.map((s) => `${s.u},${s.v}`));
    assert.equal(seen.size, spots.length, 'no two heroes share a tile');
    for (const s of spots) {
      assert.ok(s.v >= FRONT && standable(tileAt(b.board, s.u, s.v)), 'on a free tile of the heroes’ rows');
      assert.notEqual(tileAt(b.board, s.u, s.v)!.ground, 'lava');
    }
    assert.equal(b.units.filter((u) => u.side === 'hero').length, spots.length);
    // (a second go, on a fresh board, lands the same heroes on the same tiles; so does arranging a board that is already arranged)
    const again = autoDeploy(startStage(run), run, meta);
    assert.deepEqual(again, spots);
    assert.deepEqual(autoDeploy(b, run, meta), spots);
    assert.ok(fight(b));
  }
});

test('auto-deploy puts fighters in the front row and shooters behind', () => {
  const board = flat();
  const spots = autoFormation(board, heroes('knight', 'samurai', 'kunoichi', 'archer', 'wizard'));
  const kindOf = (id: number) => ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'][id - 1];
  for (const s of spots) assert.equal(s.v, isBackline(kindOf(s.id)) ? D - 1 : FRONT, kindOf(s.id));
  // (the toughest fighter holds the middle)
  const knight = spots.find((s) => s.id === 1)!;
  assert.equal(knight.u, 3);
  // (spread: nobody stands beside anybody in a row that has room)
  const front = spots.filter((s) => s.v === FRONT).map((s) => s.u).sort((a, b) => a - b);
  for (let i = 1; i < front.length; i++) assert.ok(front[i] - front[i - 1] >= 2);
});

test('auto-deploy takes high ground, skips water and lava, and never a boulder', () => {
  const board = flat();
  const at = (u: number, v: number) => board.tiles[v * board.w + u];
  // the back row has one tall tile: the archer takes it
  at(5, D - 1).h = 3;
  assert.deepEqual(autoFormation(board, heroes('archer')).map((s) => [s.u, s.v]), [[5, D - 1]]);
  // water on the best front tile and lava on the next: the knight goes elsewhere in the row
  at(3, FRONT).ground = 'water';
  at(2, FRONT).ground = 'lava';
  at(4, FRONT).rock = true;
  const [k] = autoFormation(board, heroes('knight'));
  assert.equal(k.v, FRONT);
  assert.ok(![2, 3, 4].includes(k.u));
  // with everything else bad it still stands somewhere legal
  const all = flat();
  for (let v = FRONT; v < D; v++) for (let u = 0; u < all.w; u++) all.tiles[v * all.w + u].ground = 'water';
  const b = startBattle(1);
  b.board = all;
  const spots = autoFormation(all, heroes('knight', 'archer'));
  assert.equal(spots.length, 2);
  for (const s of spots) assert.ok(canPlace(b, 'knight', s.u, s.v, s.id));
});

test('auto picks for an event are free and never a curse', () => {
  const run = newRun(5, HEROES);
  let taken = 0;
  for (let stage = 2; stage <= 40; stage += 2) {
    run.event = undefined;
    run.stage = stage;
    finish(run, true);
    const ev = run.event as EventCard | undefined;
    if (!ev) continue;
    const gold = run.gold;
    const kind = ev.kind;
    autoEvent(run);
    assert.equal(run.event, undefined);
    assert.ok(run.gold >= gold, `${kind} cost nothing`);
    assert.equal(run.buff?.foes, undefined, 'no cursed path');
    taken++;
  }
  assert.ok(taken > 0);
});

test('auto-replay is offered only on armies and tiers already cleared', () => {
  const m = newMeta(1);
  const [first, second] = ARMIES;
  assert.equal(canAutoReplay(m, first.id, 0), false);
  assert.equal(startAuto(m, first.id, 0, 3), null);
  m.armies[first.id] = { best: 8, won: 8, clears: 1, stars: {} };
  assert.ok(armyCleared(m, first.id));
  assert.equal(canAutoReplay(m, first.id, 0), true);
  // (the next army is open now but not beaten; a harder tier is a tier not beaten)
  assert.equal(canAutoReplay(m, second.id, 0), false);
  assert.equal(canAutoReplay(m, first.id, 1), false);
  m.armies[first.id].hard = { '1': { won: 8, clears: 1 } };
  assert.equal(tierCleared(m, first.id, 1), true);
  assert.equal(canAutoReplay(m, first.id, 1), true);
  // (an army whose predecessor is unbeaten is shut, whatever its record says)
  m.armies[ARMIES[3].id] = { best: 8, won: 8, clears: 1, stars: {} };
  assert.equal(canAutoReplay(m, ARMIES[3].id, 0), false);
  assert.equal(startAuto(m, first.id, 0, 4), null, 'only the counts on offer');
  for (const n of AUTO_COUNTS) assert.ok(startAuto(m, first.id, 0, n));
});

test('x3 speed is for cleared tiers and auto-replay only', () => {
  const m = newMeta(1);
  const id = ARMIES[0].id;
  assert.equal(maxSpeed(m, id, 0, false), 2);
  assert.equal(maxSpeed(m, undefined, 0, false), 2);
  assert.equal(maxSpeed(m, id, 0, true), 3);
  m.armies[id] = { best: 8, won: 8, clears: 1, stars: {} };
  assert.equal(maxSpeed(m, id, 0, false), 3);
  assert.equal(maxSpeed(m, id, 1, false), 2);
  assert.equal(maxSpeed(m, undefined, 0, false), 2);
});

test('auto-replay stops on its count, on a loss and on Stop', () => {
  const m = newMeta(1);
  m.armies[ARMIES[0].id] = { best: 8, won: 8, clears: 1, stars: {} };
  const win = { won: true, cleared: false, wave: 1, crowns: 10, xp: 5 };
  const clear = { ...win, cleared: true, chests: 1, gear: 2 };
  const a = startAuto(m, ARMIES[0].id, 0, 3)!;
  assert.equal(afterFight(a, win), 'wave');
  assert.equal(afterFight(a, clear), 'run');
  assert.equal(a.run, 2);
  assert.equal(afterFight(a, clear), 'run');
  assert.equal(afterFight(a, clear), 'end');
  assert.equal(a.ended, 'done');
  assert.deepEqual(a.totals, { runs: 3, crowns: 40, xp: 20, chests: 3, gear: 6 });
  const b = startAuto(m, ARMIES[0].id, 0, 10)!;
  afterFight(b, clear);
  assert.equal(afterFight(b, { won: false, cleared: false, wave: 4, crowns: 0, xp: 3, gear: 1 }), 'end');
  assert.equal(b.ended, 'loss');
  assert.equal(b.lostAt, 4);
  assert.equal(b.totals.runs, 1);
  const c = startAuto(m, ARMIES[0].id, 0, 5)!;
  stopAuto(c);
  assert.equal(c.ended, 'stopped');
});

/** Plays an auto-replay through the sim the way the page does (no settling of the meta beyond the XP), until it ends. */
function replay(count: number, level: number, armyIndex = 0) {
  const m = newMeta(9);
  for (const k of HEROES) m.xp[k] = xpFor(level);
  const army = ARMIES[armyIndex];
  // (every army up to this one has been beaten, so this one is open)
  for (const x of ARMIES.slice(0, armyIndex + 1)) m.armies[x.id] = { best: x.waves.length, won: x.waves.length, clears: 1, stars: {} };
  const a = startAuto(m, army.id, 0, count)!;
  let seed = 100;
  let run = armyRun(seed, army.id, m.party, m.castle);
  let guard = 0;
  while (!a.ended && guard++ < 500) {
    autoRound(run, m);
    const b = startStage(run);
    autoDeploy(b, run, m);
    assert.ok(fight(b));
    playOut(b);
    const won = b.phase === 'won';
    const stage = run.stage;
    noteFight(run, b);
    finish(run, won, ratingOf(b, isBossRun(run)).stars);
    gainXp(m, fightXp(b));
    const next = afterFight(a, { won, cleared: !!run.cleared, wave: stage, crowns: 1, xp: 1, gear: run.over ? gearCount(run) : 0 });
    if (next === 'run') run = armyRun(++seed, army.id, m.party, m.castle);
  }
  return a;
}

test('an auto-replay of a strong party clears its runs and stops at the count', () => {
  const a = replay(3, 40);
  assert.equal(a.ended, 'done');
  assert.equal(a.totals.runs, 3);
  assert.equal(a.run, 3);
});

test('an auto-replay of a party too weak for the army stops on the loss', () => {
  const a = replay(5, 1, 5);
  assert.equal(a.ended, 'loss');
  assert.equal(a.totals.runs, 0);
  assert.ok((a.lostAt ?? 0) >= 1);
});

test('settling a wave still pays when it is a replay (the totals count the pay)', () => {
  const m = newMeta(2);
  const id = ARMIES[0].id;
  const first = settleWave(m, id, 1, true, 3);
  const again = settleWave(m, id, 1, true, 3);
  assert.ok(first.crowns > again.crowns && again.crowns > 0);
});
