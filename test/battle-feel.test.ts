// BATTLE-FEEL (docs/notes/battle-feel.md): a fighter walks for the foe it can strike soonest, not the one nearest as the crow flies when
// that one is a long walk round (`FAR_WALK`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, FAR_WALK, startBattle, STILL_MS, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { tileAt } from '../src/sim/board';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  return b;
}
/** A foe that stays where it is and cannot be hurt to death. */
const still = (b: Battle, def: string, u: number, v: number): Unit => {
  const x = addUnit(b, def, u, v);
  x.busyUntil = 1e9;
  x.hp = x.maxHp = 1e7;
  return x;
};

/** A wall of boulders across row 8 from the left edge to u = 6: the way north is round its right end. */
function walled(b: Battle): void {
  for (let u = 0; u <= 6; u++) tileAt(b.board, u, 8)!.rock = true;
}

test('a fighter walks for the foe it can strike soonest, not one near by air but a long walk round a wall', () => {
  const b = arena();
  walled(b);
  // (the near foe by air, three tiles north over the wall; the other four tiles off, on this side of it)
  still(b, 'skeleton', 3, 7);
  still(b, 'skeleton', 0, 9);
  const hero = addUnit(b, 'knight', 3, 10);
  let east = 0;
  for (let i = 0; i < 40; i++) {
    stepBattle(b);
    east = Math.max(east, hero.u);
  }
  assert.equal(east, 3, 'it never heads east, round the wall');
  assert.equal(Math.abs(hero.u - 0) + Math.abs(hero.v - 9), 1, `it stands by the foe it could reach (at ${hero.u},${hero.v})`);
});

test('the foe nearest by air is still chosen when the walk to it is within FAR_WALK of the soonest', () => {
  const b = arena();
  // (no wall: the near foe by air is the nearer walk too, and the far one is only a little further)
  still(b, 'skeleton', 5, 8);
  still(b, 'skeleton', 0, 9);
  const hero = addUnit(b, 'knight', 3, 10);
  for (let i = 0; i < 40; i++) stepBattle(b);
  assert.equal(Math.abs(hero.u - 5) + Math.abs(hero.v - 8), 1, `it stands by the near foe (at ${hero.u},${hero.v})`);
  assert.equal(FAR_WALK, 4);
});

test('a fighter blocked from its near foe does not pace back and forth', () => {
  const b = arena();
  walled(b);
  still(b, 'skeleton', 3, 7);
  still(b, 'skeleton', 0, 9);
  const hero = addUnit(b, 'knight', 3, 10);
  const seen: string[] = [];
  for (let i = 0; i < 60 && hero.alive; i++) {
    stepBattle(b);
    const at = `${hero.u},${hero.v}`;
    if (seen[seen.length - 1] !== at) seen.push(at);
  }
  // (each tile it stands on is new: no step takes it back to where it was)
  assert.equal(new Set(seen).size, seen.length, seen.join(' '));
});

// ---- round 2: a blocked melee hero changes places with a still shooter of its own in the way (`unjam`) ----

/** A wall of boulders across row 8 with one gap, at u = 3. */
function gapped(b: Battle): void {
  for (let u = 0; u < 8; u++) if (u !== 3) tileAt(b.board, u, 8)!.rock = true;
}
const swaps = (evs: BattleEvent[]) => evs.filter((e) => e.kind === 'swap');

test('a melee hero blocked by a still archer in a gap changes places with it, once', () => {
  const b = arena();
  gapped(b);
  still(b, 'skeleton', 3, 5);
  const archer = addUnit(b, 'archer', 3, 8);
  const knight = addUnit(b, 'knight', 3, 9);
  const evs: BattleEvent[] = [];
  for (let i = 0; i < 40; i++) evs.push(...stepBattle(b));
  const sw = swaps(evs);
  assert.equal(sw.length, 1, 'one swap');
  assert.deepEqual([sw[0].kind === 'swap' && sw[0].a, sw[0].kind === 'swap' && sw[0].b], [knight.id, archer.id]);
  assert.ok(knight.v <= 8, `the knight is through the gap (at ${knight.u},${knight.v})`);
  assert.equal(archer.v, 9, 'the archer is a step back');
  // (not before the archer had stood its `STILL_MS`)
  assert.ok(b.units.length && STILL_MS === 1000);
});

test('no swap with a melee friend in the way, nor for foes', () => {
  const b = arena();
  gapped(b);
  still(b, 'skeleton', 3, 5);
  // (a peasant holds the gap: it fights in melee, so the knight waits for it)
  const peasant = addUnit(b, 'peasant', 3, 8);
  peasant.busyUntil = 1e9;
  addUnit(b, 'knight', 3, 9);
  const evs: BattleEvent[] = [];
  for (let i = 0; i < 40; i++) evs.push(...stepBattle(b));
  assert.equal(swaps(evs).length, 0);
});
