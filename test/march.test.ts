// DEPTH-BUILD (docs/notes/depth-build.md): march orders before an army run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armyRun, finish, loadRun, retriesLeft, startStage, type Run } from '../src/sim/run';
import { ARMIES } from '../src/sim/armies';
import { CURSES, MARCH, curseFor, marchCrowns, marchFx, marchOpen, marchPay, ordersFor, readOrders, skipsWave, ordersLine } from '../src/sim/march';
import { newCastle } from '../src/sim/castle';
import { strikeDef } from '../src/sim/battle';

const orcs = ARMIES[0];
const run = (mod?: 'cursed' | 'scouted' | 'night' | 'forced', seed = 5): Run => {
  const r = armyRun(seed, orcs.id);
  const o = mod ? ordersFor(mod, seed) : undefined;
  if (o) r.orders = o;
  return r;
};

test('a run saved before the orders loads as a plain march, and odd orders are dropped', () => {
  const r = run();
  const back = loadRun({ getItem: () => JSON.stringify(r) })!;
  assert.equal(back.orders, undefined);
  assert.deepEqual(readOrders({ mod: 'cursed', curse: 'nonsense' }), { mod: 'cursed', curse: 'healHalf' });
  assert.equal(readOrders({ mod: 'sideways' }), undefined);
  const odd = loadRun({ getItem: () => JSON.stringify({ ...r, orders: { mod: 'x' } }) })!;
  assert.equal(odd.orders, undefined);
  const kept = loadRun({ getItem: () => JSON.stringify({ ...r, orders: { mod: 'night' } }) })!;
  assert.deepEqual(kept.orders, { mod: 'night' });
});

test('the curse is fixed by the seed, and every curse is drawn by some seed', () => {
  assert.equal(curseFor(77), curseFor(77));
  assert.equal(ordersFor('cursed', 77)!.curse, curseFor(77));
  const seen = new Set(Array.from({ length: 60 }, (_, i) => curseFor(i)));
  assert.deepEqual([...seen].sort(), Object.keys(CURSES).sort());
  assert.equal(ordersFor('plain', 1), undefined);
});

test('a cursed run has one heart, tougher foes, and its curse in the fight', () => {
  assert.equal(retriesLeft(run()), 2);
  const c = run('cursed');
  assert.equal(retriesLeft(c), 1);
  const plain = startStage(run());
  const cursed = startStage(c);
  const hp = (b: ReturnType<typeof startStage>) => b.units.filter((u) => u.side === 'foe').reduce((n, u) => n + u.maxHp, 0);
  assert.ok(Math.abs(hp(cursed) / hp(plain) - MARCH.CURSED_HP) < 0.02, 'foes +20% health');
  // (the same seed draws the same foes in the same places: only the boost differs)
  assert.deepEqual(cursed.units.map((u) => [u.def, u.u, u.v]), plain.units.map((u) => [u.def, u.u, u.v]));
  assert.equal(marchFx({ mod: 'cursed', curse: 'healHalf' }).heroHeal, 0.5);
  assert.equal(marchFx({ mod: 'cursed', curse: 'secondForm' }).secondForm, 0.65);
  assert.match(ordersLine(c.orders)!, /^Cursed · /);
});

test('the Unbroken curse turns the final boss at 65%', () => {
  const r = run('cursed', 3);
  r.orders = { mod: 'cursed', curse: 'secondForm' };
  r.stage = orcs.waves.length;
  const b = startStage(r);
  const boss = b.units.find((u) => u.side === 'foe' && u.phase);
  assert.ok(boss, "the final boss has a second form");
  assert.equal(boss!.phase!.at, 0.65);
});

test('a forced march skips waves 4, 6, 11 and 13', () => {
  const r = run('forced');
  const seen: number[] = [];
  while (!r.over) {
    seen.push(r.stage);
    finish(r, true, 3);
    r.event = undefined;
  }
  assert.ok(r.cleared);
  for (const n of MARCH.SKIP) assert.ok(!seen.includes(n), `wave ${n} skipped`);
  assert.equal(seen.length, orcs.waves.length - MARCH.SKIP.length);
  assert.ok(skipsWave({ mod: 'forced' }, 4) && !skipsWave(undefined, 4));
});

test('a night march: shooters below height 2 reach a tile less, fixed at the fight\'s start', () => {
  const b = startStage(run('night'));
  assert.equal(b.night, true);
  const plain = startStage(run());
  assert.equal(plain.night, undefined);
  const shooter = b.units.find((u) => u.side === 'foe' && plain.units.find((p) => p.id === u.id) && strikeDef(plain, plain.units.find((p) => p.id === u.id)!).shot);
  assert.ok(shooter, "wave 1 has a shooter");
  if (shooter) {
    const tile = b.board.tiles[shooter.v * b.board.w + shooter.u];
    const h = tile.h;
    const was = strikeDef(plain, plain.units.find((p) => p.id === shooter.id)!).range;
    tile.h = 0;
    assert.equal(strikeDef(b, shooter).range, Math.max(1, was - 1));
    tile.h = 2;
    assert.equal(strikeDef(b, shooter).range, was);
    tile.h = h;
  }
});

test('the orders pay once: cursed crowns and XP x1.4 and a chest; scouted crowns x0.9; forced XP x0.8', () => {
  assert.deepEqual(marchPay(undefined), { crowns: 1, xp: 1, chests: 0 });
  assert.deepEqual(marchPay({ mod: 'cursed', curse: 'noShop' }), { crowns: 1.4, xp: 1.4, chests: 1 });
  assert.equal(marchPay({ mod: 'night' }).chests, 1);
  const m = { crowns: 100 };
  const pay = { crowns: 50 };
  assert.equal(marchCrowns(m, pay, { mod: 'cursed' }), 20);
  assert.deepEqual([m.crowns, pay.crowns], [120, 70]);
  assert.equal(marchCrowns(m, { crowns: 50 }, { mod: 'scouted' }), -5);
  assert.equal(marchCrowns(m, { crowns: 50 }, undefined), 0);
});

test('the modifiers open with the Watchtower and with the army cleared at the tier', () => {
  const m = { castle: newCastle(), armies: {} as Record<string, { clears: number; hard?: Record<string, { clears: number }> }> };
  assert.equal(marchOpen(m, 'orcs', 0, 'plain').open, true);
  assert.deepEqual(marchOpen(m, 'orcs', 0, 'scouted'), { open: false, lock: 'Watchtower level 1' });
  assert.deepEqual(marchOpen(m, 'orcs', 1, 'cursed'), { open: false, lock: 'Clear this army on Hard first' });
  m.castle.watchtower = 1;
  assert.equal(marchOpen(m, 'orcs', 0, 'scouted').open, true);
  assert.equal(marchOpen(m, 'orcs', 0, 'night').open, false);
  m.armies.orcs = { clears: 1 };
  assert.equal(marchOpen(m, 'orcs', 0, 'cursed').open, true);
  assert.equal(marchOpen(m, 'orcs', 1, 'forced').open, false);
  m.armies.orcs.hard = { 1: { clears: 2 } };
  assert.equal(marchOpen(m, 'orcs', 1, 'forced').open, true);
});

import { farSight, routeLand, routesOf } from '../src/sim/march';
import { landsOf } from '../src/sim/armies';

test('Far Sight opens the roads (one a land of the army) and the next wave\'s foes; a road sets the land of every wave', () => {
  const lands = landsOf(ARMIES[0]);
  const castle = newCastle();
  assert.deepEqual(routesOf(lands, castle), []);
  assert.equal(farSight(castle), false);
  castle.watchtower = 3;
  assert.deepEqual(routesOf(lands, castle), [...lands]);
  assert.equal(farSight(castle), true);
  assert.equal(routeLand({ route: lands[1] }, lands), lands[1]);
  assert.equal(routeLand({ route: 'oasis' }, lands), undefined, 'not this army\'s land');
  const r = run();
  r.area = lands[1];
  assert.equal(startStage(r).board.area, lands[1]);
  assert.deepEqual(readOrders({ route: lands[1] }), { route: lands[1] });
});
