// The Last Stand's retreat (STAND-RETREAT, docs/notes/stand-retreat.md): four acts in a fixed order of rooms, the choice to hold the line at
// an act's end, the walk out and the next room laid out with the heroes at the ring plan's posts, the last foes breaking off, and the saves.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standable, tileAt } from '../src/sim/board';
import { canPost, ringPlan, standBoard } from '../src/sim/standField';
import { hallPlan, type HallKind } from '../src/sim/standHalls';
import {
  ACT_HALLS, actOfHall, actOfWave, CHOICE_MS, exitOf, hallOfWave, HOLD_HARDER, holdGold, reachRoom, RETREAT_MS, retreatAfter, ROOM_BREAK_MS,
} from '../src/sim/standActs';
import {
  canSave, clearGold, fallBack, finishRetreat, holdSpec, holdTheLine, loadStand, newStandRun, roleOfKind, saveStand, settleStand, snapshot, standing, startFirstWave,
  startStand, stepStand, strength, waveSpec, type Stand, type StandNote, type StandRun, type StandSetup,
} from '../src/sim/stand';
import { gradeBoost } from '../src/sim/run';
import { newCastle } from '../src/sim/castle';
import { ARMIES } from '../src/sim/armies';
import { newMeta } from '../src/sim/meta';
import { TICK_MS } from '../src/sim/battle';

const setupAt = (level: number): StandSetup => ({ boost: () => gradeBoost(1, 0, level), castle: newCastle() });
const armies = ARMIES.map((a) => a.id);
const EIGHT = ['knight', 'paladin', 'samurai', 'kunoichi', 'archer', 'ranger', 'wizard', 'cleric'];

/** A run at wave `wave` (as if the waves before were cleared), in `hall`. */
function runAt(seed: number, wave: number, hall?: HallKind, act?: number): StandRun {
  const run = newStandRun(seed, EIGHT, armies);
  run.wave = wave;
  run.best = wave;
  if (hall) run.hall = hall;
  if (act === undefined) delete run.act;
  else run.act = act;
  return run;
}

/** Step until `done` says so (or the king falls), keeping every note. */
function stepUntil(s: Stand, done: (s: Stand) => boolean, notes: StandNote[] = [], max = 40000): StandNote[] {
  for (let i = 0; i < max && !done(s) && s.phase !== 'over'; i++) {
    stepStand(s);
    notes.push(...s.notes.splice(0));
  }
  return notes;
}

test('the acts: the courtyard for waves 1-5, the library 6-10, the chapel 11-15, the throne room from 16 to the end', () => {
  assert.deepEqual(ACT_HALLS, ['courtyard', 'library', 'chapel', 'hall']);
  const at = (n: number) => hallOfWave(n);
  assert.deepEqual([1, 5, 6, 10, 11, 15, 16, 40, 200].map(at), ['courtyard', 'courtyard', 'library', 'library', 'chapel', 'chapel', 'hall', 'hall', 'hall']);
  assert.deepEqual([1, 6, 11, 16, 99].map(actOfWave), [0, 1, 2, 3, 3]);
  assert.deepEqual(ACT_HALLS.map(actOfHall), [0, 1, 2, 3]);
  // (a retreat follows waves 5, 10 and 15 only, in the order's own rooms)
  const after = [];
  for (let n = 1; n <= 40; n++) if (retreatAfter(n, hallOfWave(n))) after.push(n);
  assert.deepEqual(after, [5, 10, 15]);
  assert.equal(newStandRun(7, EIGHT, armies).hall, 'courtyard');
  assert.equal(newStandRun(7, EIGHT, armies).act, 0);
});

test('a strong party falls back room by room, in order, and each new room is laid out with the heroes at the ring plan\'s posts', () => {
  const s = startStand(newStandRun(21, EIGHT, armies), setupAt(100));
  startFirstWave(s);
  const rooms: { hall: HallKind; wave: number }[] = [];
  const notes: StandNote[] = [];
  for (let i = 0; i < 60000 && s.run.wave <= 16 && s.phase !== 'over'; i++) {
    if (s.phase === 'choice') {
      assert.ok(retreatAfter(s.run.wave - 1, s.run.hall!), 'the choice comes at an act\'s end');
      assert.ok(fallBack(s));
    }
    stepStand(s);
    for (const n of s.notes.splice(0)) {
      notes.push(n);
      if (n.kind === 'room') {
        rooms.push({ hall: n.hall, wave: s.run.wave });
        // (only the king and the heroes standing came along; no foes; every hero on a post of the new room, the ring plan's)
        assert.equal(s.b.board.tiles.length, standBoard(s.run.seed, undefined, n.hall).tiles.length);
        assert.deepEqual(s.b.board.tiles.map((t) => t.h), standBoard(s.run.seed, undefined, n.hall).tiles.map((t) => t.h), 'the board is the new room');
        assert.ok(!s.b.units.some((u) => u.side === 'foe'));
        const up = s.run.heroes.filter(standing);
        const plan = ringPlan(s.b.board, up.map((h) => h.kind), roleOfKind);
        up.forEach((h, k) => {
          assert.deepEqual(h.post, [plan[k].u, plan[k].v], `${h.kind} at its post`);
          const u = s.b.units.find((x) => x.tag === h.id)!;
          assert.deepEqual([u.u, u.v], h.post);
          assert.ok(canPost(s.b.board, u.u, u.v));
        });
        assert.equal(s.phase, 'break');
        assert.equal(s.breakLeft, ROOM_BREAK_MS);
        assert.equal(s.run.act, actOfHall(n.hall));
        assert.equal(s.run.retreat, undefined);
      }
    }
  }
  assert.deepEqual(rooms, [{ hall: 'library', wave: 6 }, { hall: 'chapel', wave: 11 }, { hall: 'hall', wave: 16 }]);
  // (each retreat says where from and where to, and its door is in a back wall)
  const retreats = notes.filter((n): n is Extract<StandNote, { kind: 'retreat' }> => n.kind === 'retreat');
  assert.deepEqual(retreats.map((r) => [r.from, r.to]), [['courtyard', 'library'], ['library', 'chapel'], ['chapel', 'hall']]);
  for (const r of retreats) assert.ok(r.exit.edge === 'north' || r.exit.edge === 'west');
});

test('the walk to the door: the heroes standing head for it, and the next room is laid out when it is over (or at once, skipped)', () => {
  const s = startStand(runAt(4, 5), setupAt(100));
  startFirstWave(s);
  stepUntil(s, (x) => x.phase === 'choice');
  assert.equal(s.phase, 'choice');
  assert.ok(fallBack(s));
  assert.equal(s.phase, 'retreat');
  const exit = exitOf(4, 'courtyard');
  const walkers = s.b.units.filter((u) => u.side === 'hero' && u.alive && u.tag !== undefined);
  const before = walkers.map((u) => Math.abs(u.u - exit.front.u) + Math.abs(u.v - exit.front.v));
  for (const u of walkers) assert.ok(Math.abs(u.post!.u - exit.front.u) + Math.abs(u.post!.v - exit.front.v) <= 8, 'its post for the walk is by the door');
  for (let t = 0; t < RETREAT_MS - TICK_MS; t += TICK_MS) stepStand(s);
  assert.equal(s.phase, 'retreat');
  const after = walkers.map((u) => Math.abs(u.u - exit.front.u) + Math.abs(u.v - exit.front.v));
  assert.ok(after.reduce((a, b) => a + b, 0) < before.reduce((a, b) => a + b, 0), 'they walk towards the door');
  stepStand(s);
  assert.equal(s.phase, 'break');
  assert.equal(s.run.hall, 'library');
  // (skipped: at once)
  const t = startStand(runAt(4, 5), setupAt(100));
  startFirstWave(t);
  stepUntil(t, (x) => x.phase === 'choice');
  fallBack(t);
  assert.ok(finishRetreat(t));
  assert.equal(t.run.hall, 'library');
  assert.ok(!finishRetreat(t), 'only once');
});

test('the choice waits for an answer; left to itself, the guard falls back', () => {
  const s = startStand(runAt(9, 5), setupAt(100));
  startFirstWave(s);
  stepUntil(s, (x) => x.phase === 'choice');
  assert.deepEqual(s.run.retreat, { to: 'library' });
  for (let t = 0; t < CHOICE_MS - TICK_MS; t += TICK_MS) stepStand(s);
  assert.equal(s.phase, 'choice');
  stepStand(s);
  assert.equal(s.phase, 'retreat');
  assert.ok(!holdTheLine(s) && !fallBack(s), 'only at the choice');
});

test('holding the line: a harder wave from every breach, its own side stream, a purse when held, then the fall back', () => {
  for (const n of [5, 10, 15]) {
    const hall = hallOfWave(n);
    const spec = holdSpec(33, armies, n, hall);
    assert.deepEqual(spec, holdSpec(33, armies, n, hall), 'the same for a seed');
    assert.ok(!spec.boss);
    assert.ok(Math.abs(spec.hp - strength(n + 1) * Math.sqrt(spec.raw / spec.foes.length) * HOLD_HARDER) < 1e-9, 'stronger than the next wave');
    assert.ok(spec.hp > waveSpec(33, armies, n + 1, hallOfWave(n + 1)).hp);
    assert.deepEqual([...spec.edges].sort(), hallPlan(33, hall).breaches.map((b) => b.edge).sort(), 'every breach at once');
    assert.ok(holdGold(n) >= 2 * clearGold(n));
  }
  const s = startStand(runAt(12, 5), setupAt(100));
  startFirstWave(s);
  stepUntil(s, (x) => x.phase === 'choice');
  const sixth = JSON.stringify(waveSpec(12, armies, 6, 'library'));
  assert.ok(holdTheLine(s));
  assert.equal(s.phase, 'wave');
  assert.ok(s.holding);
  assert.equal(s.run.wave, 6, 'the bonus wave is no numbered wave');
  assert.equal(s.run.best, 5);
  const gold = s.run.gold;
  const notes = stepUntil(s, (x) => x.phase === 'retreat');
  const held = notes.find((n) => n.kind === 'held');
  assert.ok(held && held.kind === 'held' && held.gold === holdGold(5), 'the purse is paid');
  assert.ok(s.run.gold >= gold + holdGold(5));
  assert.equal(s.phase, 'retreat');
  assert.equal(s.run.hall, 'courtyard', 'held in the same room');
  finishRetreat(s);
  assert.equal(s.run.hall, 'library');
  assert.equal(JSON.stringify(waveSpec(12, armies, 6, s.run.hall)), sixth, 'the waves after are as they would have been');
  // (the same run twice: the same purse, the same field)
  const twice = () => {
    const t = startStand(runAt(12, 5), setupAt(100));
    startFirstWave(t);
    stepUntil(t, (x) => x.phase === 'choice');
    holdTheLine(t);
    stepUntil(t, (x) => x.phase === 'retreat');
    return [t.run.gold, t.run.kills, t.b.t, t.b.units.filter((u) => u.alive).length];
  };
  assert.deepEqual(twice(), twice());
});

test('a king who falls holding the line ends the run: the end says the room, and that it was held', () => {
  const s = startStand(runAt(3, 5, 'courtyard', 0), setupAt(100));
  startFirstWave(s);
  stepUntil(s, (x) => x.phase === 'choice');
  holdTheLine(s);
  stepStand(s);
  s.king.hp = 0;
  s.king.alive = false;
  stepStand(s);
  assert.equal(s.phase, 'over');
  const m = newMeta(1);
  const sum = settleStand(m, s.run)!;
  assert.equal(sum.room, 'courtyard');
  assert.equal(sum.act, 0);
  assert.equal(sum.held, true);
  assert.equal(sum.best, 5);
});

test('an act\'s last foes break off and run for the breaches: gone, unpaid, and the wave is over', () => {
  const s = startStand(runAt(6, 4), setupAt(100));
  startFirstWave(s);
  // (wave 4: no breaking off; it ends as ever, by the hunt)
  const four = stepUntil(s, (x) => x.phase === 'break');
  assert.ok(!four.some((n) => n.kind === 'breakOff'));
  const five = stepUntil(s, (x) => x.phase === 'choice');
  const off = five.findIndex((n) => n.kind === 'breakOff');
  // (wave 5 is a boss wave: they break off only once the boss is down; the boss can be the last foe, so it may never come to it)
  if (off >= 0) {
    assert.ok(five.slice(off).every((n) => n.kind !== 'hunt'), 'no hunt once they run');
    assert.ok(s.b.units.every((u) => u.side !== 'foe' || !u.alive));
  }
  assert.equal(s.phase, 'choice');
  // (a hold wave has no boss: its last foes always break off)
  holdTheLine(s);
  const kills = s.run.kills;
  const notes = stepUntil(s, (x) => x.phase === 'retreat');
  assert.ok(notes.some((n) => n.kind === 'breakOff'), 'the last of the bonus wave break and run');
  assert.ok(s.run.kills > kills);
});

test('saves: a run from before the retreat keeps its room to its act\'s end, then follows the order; an open choice is asked again', () => {
  // (an old run at wave 3 in the chapel: the chapel to wave 5, then the library)
  const old = startStand(runAt(8, 3, 'chapel'), setupAt(100));
  assert.equal(old.run.act, undefined);
  startFirstWave(old);
  stepUntil(old, (x) => x.phase === 'choice');
  assert.equal(old.run.hall, 'chapel');
  assert.equal(old.run.wave, 6);
  assert.deepEqual(old.run.retreat, { to: 'library' });
  // (saved at the choice and loaded again: the question is open again)
  const store = new Map<string, string>();
  const mem = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  assert.ok(canSave(old));
  saveStand(snapshot(old), mem);
  const back = loadStand(mem)!;
  assert.deepEqual(back.retreat, { to: 'library' });
  const again = startStand(back, setupAt(100));
  assert.equal(again.phase, 'choice');
  assert.ok(fallBack(again));
  finishRetreat(again);
  assert.equal(again.run.hall, 'library');
  assert.equal(again.run.act, 1);
  // (an old run past wave 15 in the library: there to the next fifth wave, then the throne room)
  assert.ok(!retreatAfter(17, 'library') && retreatAfter(20, 'library') && !retreatAfter(20, 'hall'));
  // (an old save with no room at all takes the seed's, and reads as before)
  const plain = runAt(8, 3);
  delete plain.hall;
  store.set('legends.stand', JSON.stringify(plain));
  const read = loadStand(mem)!;
  assert.equal(read.hall, undefined);
  assert.equal(read.act, undefined);
  assert.equal(read.retreat, undefined);
  // (junk in the new fields is dropped)
  store.set('legends.stand', JSON.stringify({ ...plain, act: 9, retreat: { to: 'cellar' } }));
  assert.equal(loadStand(mem)!.act, undefined);
  assert.equal(loadStand(mem)!.retreat, undefined);
});

test('the furthest room reached is kept on the save; the throne room is the badge', () => {
  const m = newMeta(1);
  assert.equal(m.standAct, undefined);
  assert.ok(reachRoom(m, 0));
  assert.ok(!reachRoom(m, 0));
  assert.ok(reachRoom(m, 2));
  assert.ok(!reachRoom(m, 1), 'never back');
  assert.equal(m.standAct, 2);
  const run = runAt(2, 17, 'hall', 3);
  run.over = true;
  settleStand(m, run);
  assert.equal(m.standAct, 3);
});

test('every room\'s door is in a back wall, in front of a floor tile, clear of the breaches', () => {
  for (const kind of ACT_HALLS)
    for (let seed = 1; seed <= 40; seed++) {
      const ex = exitOf(seed, kind);
      const b = standBoard(seed, undefined, kind);
      assert.ok(ex.edge === 'north' || ex.edge === 'west');
      assert.ok(tileAt(b, ex.at.u, ex.at.v)!.wall, `${kind} ${seed}: the door is in the wall`);
      assert.ok(standable(tileAt(b, ex.front.u, ex.front.v)), `${kind} ${seed}: floor before the door`);
    }
});
