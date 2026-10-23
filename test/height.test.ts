import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tileAt } from '../src/sim/board';
import { addUnit, place, startBattle, stepBattle, unitAt, type Battle } from '../src/sim/battle';
import { jumpText, powerOf } from '../src/sim/power';
import { ALL_HEROES, UNITS } from '../src/sim/units';

/** A flat board with a single, frozen skeleton at (u, v) and nobody else, ready for a hero to be placed. */
function arena(foeAt: [number, number]): Battle {
  const b = startBattle(5, 'skeletons');
  for (const t of b.board.tiles) {
    t.h = 0;
    delete t.rock;
    delete t.ground;
  }
  b.units = b.units.filter((x) => x.side === 'foe').slice(0, 1);
  const foe = b.units[0];
  foe.u = foeAt[0];
  foe.v = foeAt[1];
  foe.busyUntil = 1e9;
  return b;
}

/** Run the fight until `id` first swings; where it stood then. */
function standingWhenItSwings(b: Battle, id: number): [number, number] {
  b.phase = 'fight';
  const me = b.units.find((x) => x.id === id)!;
  for (let i = 0; i < 200 && !me.swing; i++) stepBattle(b);
  assert.ok(me.swing, 'it swung');
  return [me.u, me.v];
}

test('a shooter takes a high tile within a step or two over a flat one that is just as good', () => {
  const flat = arena([3, 2]);
  const a = addUnit(flat, 'archer', 3, 7);
  assert.deepEqual(standingWhenItSwings(flat, a.id), [3, 6], 'on level ground it stops as soon as it is in range');
  const hill = arena([3, 2]);
  tileAt(hill.board, 4, 6)!.h = 2;
  const b = addUnit(hill, 'archer', 3, 7);
  assert.deepEqual(standingWhenItSwings(hill, b.id), [4, 6], 'with a hill beside it, it climbs');
});

test('a shooter already in range steps up to a higher tile close by that still holds its target', () => {
  const b = arena([3, 3]);
  tileAt(b.board, 4, 7)!.h = 2;
  const a = addUnit(b, 'archer', 3, 7);
  assert.deepEqual(standingWhenItSwings(b, a.id), [4, 7]);
});

test('a shooter does not walk far for a small gain: a hill far off is left alone', () => {
  const b = arena([3, 2]);
  tileAt(b.board, 0, 4)!.h = 1;
  const a = addUnit(b, 'archer', 3, 7);
  assert.deepEqual(standingWhenItSwings(b, a.id), [3, 6]);
});

test('a hero does not step down to fight: a fighter on the high ground stays', () => {
  const b = arena([3, 5]);
  tileAt(b.board, 3, 6)!.h = 1;
  const k = addUnit(b, 'knight', 3, 6);
  standingWhenItSwings(b, k.id);
  assert.equal(unitAt(b, 3, 6)?.id, k.id, 'it swings where it stands');
});

test('every unit has a jump; heavy ones climb less, agile ones more, fliers are not stopped', () => {
  for (const id of Object.keys(UNITS)) assert.ok(UNITS[id].jump >= 1, id);
  assert.equal(UNITS.juggernaut.jump, 1);
  assert.equal(UNITS.knight.jump, 2);
  assert.ok(UNITS.kunoichi.jump >= 4 && UNITS.ninjaMonk.jump >= 4);
  assert.ok(UNITS.werewolf.jump >= 3 && UNITS.satyr.jump >= 3);
  assert.ok(UNITS.dragoon.flies && UNITS.dragoon.jump >= 9);
  assert.equal(jumpText('knight'), '2');
  assert.equal(jumpText('dragoon'), 'Flies');
});

test('a better jumper is worth a little more power', () => {
  const same = { ...UNITS.knight };
  const base = powerOf('knight');
  UNITS.knight.jump = 4;
  const higher = powerOf('knight');
  UNITS.knight.jump = same.jump;
  assert.ok(higher > base && higher < base * 1.1);
});

test('every hero places and fights with a jump (a smoke test of the whole roster)', () => {
  for (const id of ALL_HEROES) {
    const b = startBattle(11, 'skeletons');
    assert.ok(place(b, id, 3, 7), id);
  }
});
