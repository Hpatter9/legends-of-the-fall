import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, type Board, type Tile } from '../src/sim/board';
import { nearIndex, nearPath, walkNear } from '../src/sim/path';
import { stepBattle, strikeDef, type Battle, type Unit } from '../src/sim/battle';
import { fileSlot, FRIEND_COST, friendsRound, makesWay, narrowAt, noteTrail, pointReach, sideStep, TRAIL_MAX, waitsForStragglers, NARROW_UNDER, POINT_REACH } from '../src/sim/assault/assault';
import { HERO_LEASH, orderPlatoon } from '../src/sim/assault/platoons';
import type { PlatoonState } from '../src/sim/assault/holdTypes';
import { quiet } from './assaultKit';
import { rebuildBuckets } from '../src/sim/assault/field';

// ASSAULT-AI (docs/notes/assault-skills.md, "The heroes' movement"): the owner's "my guys were pretty dumb": the heroes bunched up and
// got stuck. Each movement rule on a small staged field.

/** A flat board of `w` x `d` tiles, every tile walkable. */
function flat(w: number, d: number): Board {
  const b = makeBoard(3);
  const tiles: Tile[] = Array.from({ length: w * d }, () => ({ h: 0, deco: 0 }));
  return { ...b, w, d, tiles, hazards: [] };
}

/** Stand a fighter on a tile (the next tick puts it on the grid). */
function put(b: Battle, x: Unit, u: number, v: number): void {
  const f = b.field!;
  if (f.occ[x.v * f.w + x.u] === x.id) f.occ[x.v * f.w + x.u] = -1;
  x.u = u;
  x.v = v;
  x.step = undefined;
  f.occ[v * f.w + u] = x.id;
}

/** An open square of the hold's field, `r` tiles round its middle walkable and empty (the first such from the Landing up). */
function openSpot(b: Battle, r: number): { u: number; v: number } {
  const f = b.field!;
  for (let v = 90; v > 20; v--)
    for (let u = 90; u > 20; u--) {
      let ok = true;
      for (let dv = -r; dv <= r && ok; dv++)
        for (let du = -r; du <= r && ok; du++) {
          const t = b.board.tiles[(v + dv) * b.board.w + u + du];
          if (!t || t.wall || t.rock || t.ground === 'deep' || t.ground === 'water' || t.h !== b.board.tiles[v * b.board.w + u].h || f.occ[(v + dv) * f.w + u + du] >= 0) ok = false;
        }
      if (ok) return { u, v };
    }
  throw new Error('no open spot');
}

test('a walk goes round a friend where it can, and through one (at FRIEND_COST) where it cannot', () => {
  const b = flat(12, 12);
  // (a line of friends across the board at u = 5)
  const line = new Set<number>(Array.from({ length: 12 }, (_, v) => v * 12 + 5));
  const through = walkNear(b, { u: 0, v: 5 }, 1, () => false, 8, 'hero', (j) => (line.has(j) ? FRIEND_COST : 0));
  assert.equal(through.cost[nearIndex(through, 12, 5 * 12 + 7)], 7 + FRIEND_COST);
  // (a gap one tile off the straight way: round it is cheaper than through)
  line.delete(4 * 12 + 5);
  const round = walkNear(b, { u: 0, v: 5 }, 1, () => false, 8, 'hero', (j) => (line.has(j) ? FRIEND_COST : 0));
  const goal = 5 * 12 + 7;
  assert.equal(round.cost[nearIndex(round, 12, goal)], 9);
  assert.ok(nearPath(round, 12, goal, 20).includes(4 * 12 + 5), 'the way goes by the gap');
  // (and without the extra cost, as before: the line's tiles blocked)
  const old = walkNear(b, { u: 0, v: 5 }, 1, (j) => line.has(j), 8, 'hero');
  assert.equal(old.cost[nearIndex(old, 12, goal)], 9);
});

test('a narrow way: a bridge or a gap is narrow, open ground is not', () => {
  const board = flat(20, 20);
  const b = { board } as Battle;
  assert.equal(narrowAt(b, { u: 10, v: 10 }), false);
  // (a bridge two tiles wide over deep water)
  for (let v = 0; v < 20; v++) for (let u = 0; u < 20; u++) if (u < 9 || u > 10) board.tiles[v * 20 + u] = { h: 0, deco: 0, ground: 'deep' };
  assert.equal(narrowAt(b, { u: 10, v: 10 }), true);
  // (a gap in a wall: the 24 tiles round count fewer than NARROW_UNDER)
  const wall = flat(20, 20);
  for (let u = 0; u < 20; u++) if (u !== 10) for (const v of [9, 10, 11]) wall.tiles[v * 20 + u] = { h: 0, deco: 0, wall: true };
  assert.equal(narrowAt({ board: wall } as Battle, { u: 10, v: 10 }), true);
  assert.ok(NARROW_UNDER > 0 && NARROW_UNDER < 24);
});

test('in a narrow way the soldiers walk in file on their leader\'s trail; in the open, their formation', () => {
  const board = flat(20, 20);
  for (let v = 0; v < 20; v++) for (let u = 0; u < 20; u++) if (u !== 10) board.tiles[v * 20 + u] = { h: 0, deco: 0, ground: 'deep' };
  const b = { board } as Battle;
  const pl = { trail: [10 * 20 + 10, 11 * 20 + 10, 12 * 20 + 10, 13 * 20 + 10] } as PlatoonState;
  assert.deepEqual(fileSlot(b, pl, { u: 10, v: 10 }, 1), { u: 10, v: 11 });
  assert.deepEqual(fileSlot(b, pl, { u: 10, v: 10 }, 3), { u: 10, v: 13 });
  // (those further back than the trail kept take its last tile)
  assert.deepEqual(fileSlot(b, pl, { u: 10, v: 10 }, 9), { u: 10, v: 13 });
  assert.equal(fileSlot({ board: flat(20, 20) } as Battle, pl, { u: 10, v: 10 }, 1), null);
  assert.equal(fileSlot(b, { trail: [210] } as PlatoonState, { u: 10, v: 10 }, 1), null);
});

test('a platoon keeps its leader\'s trail: the newest tile first, once a tile, at most TRAIL_MAX', () => {
  const b = quiet();
  const f = b.field!;
  const pl = f.hold!.platoons[0];
  const hero = f.byId[pl.heroId];
  const at = openSpot(b, 2);
  pl.trail = [];
  put(b, hero, at.u, at.v);
  noteTrail(b, f, pl);
  noteTrail(b, f, pl);
  assert.deepEqual(pl.trail, [at.v * b.board.w + at.u]);
  for (let k = 1; k <= TRAIL_MAX + 3; k++) {
    put(b, hero, at.u + (k % 2), at.v);
    noteTrail(b, f, pl);
  }
  assert.equal(pl.trail.length, TRAIL_MAX);
  assert.equal(pl.trail[0], hero.v * b.board.w + hero.u);
});

test('a leader stops for its stragglers only with no foe near and no press of its own round it', () => {
  const b = quiet();
  const f = b.field!;
  const h = f.hold!;
  const at = openSpot(b, 3);
  const hero = f.byId[h.platoons[0].heroId];
  put(b, hero, at.u, at.v);
  // (its soldiers far off, the foes far off)
  h.platoons[0].soldiers.forEach((s, i) => put(b, f.byId[s.id], at.u - 3 + (i % 7), at.v + 3));
  assert.equal(friendsRound(f, hero), 0);
  assert.equal(waitsForStragglers(b, f, hero), true);
  const [s1, s2, s3] = h.platoons[1].soldiers.map((s) => f.byId[s.id]);
  put(b, s1, at.u + 1, at.v);
  put(b, s2, at.u - 1, at.v);
  put(b, s3, at.u, at.v + 1);
  assert.equal(friendsRound(f, hero), 3);
  assert.equal(waitsForStragglers(b, f, hero), false);
  put(b, s1, at.u - 3, at.v - 3);
  assert.equal(waitsForStragglers(b, f, hero), true);
  const foe = b.units.find((x) => x.side === 'foe' && x.alive)!;
  put(b, foe, at.u + 3, at.v - 2);
  rebuildBuckets(f, b.units);
  assert.equal(waitsForStragglers(b, f, hero), false);
});

test('a jammed walker side-steps to the free tile nearest its mark, even one no nearer; boxed in, it cannot', () => {
  const b = quiet();
  const f = b.field!;
  const h = f.hold!;
  const at = openSpot(b, 2);
  const hero = f.byId[h.platoons[0].heroId];
  put(b, hero, at.u, at.v);
  const s = h.platoons[1].soldiers.map((x) => f.byId[x.id]);
  // (the step towards the mark is taken: only the side ones are free)
  put(b, s[0], at.u, at.v - 1);
  put(b, s[1], at.u, at.v + 1);
  assert.equal(sideStep(b, f, hero, { u: at.u, v: at.v - 10 }, []), true);
  assert.equal(hero.v, at.v);
  assert.equal(Math.abs(hero.u - at.u), 1);
  // (boxed in on all four sides)
  const b2 = quiet();
  const f2 = b2.field!;
  const hero2 = f2.byId[f2.hold!.platoons[0].heroId];
  const at2 = openSpot(b2, 2);
  put(b2, hero2, at2.u, at2.v);
  const t = f2.hold!.platoons[1].soldiers.map((x) => f2.byId[x.id]);
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([du, dv], i) => put(b2, t[i], at2.u + du, at2.v + dv));
  assert.equal(sideStep(b2, f2, hero2, { u: at2.u, v: at2.v - 10 }, []), false);
});

test('a friend makes way for a leader: a soldier of any platoon; not one mid-step or striking; a shooter never pushes in beside a foe', () => {
  const b = quiet();
  const f = b.field!;
  const h = f.hold!;
  const at = openSpot(b, 3);
  const knight = f.byId[h.platoons[0].heroId];
  const archer = f.byId[h.platoons[2].heroId];
  assert.ok(!strikeDef(b, knight).shot && !!strikeDef(b, archer).shot);
  const other = f.byId[h.platoons[1].soldiers[0].id];
  put(b, knight, at.u, at.v);
  put(b, other, at.u, at.v - 1);
  const j = (at.v - 1) * b.board.w + at.u;
  assert.equal(makesWay(b, f, knight, j), true);
  other.step = { u: other.u, v: other.v + 1, h: 0, at: b.t, ms: 500 };
  assert.equal(makesWay(b, f, knight, j), false);
  other.step = undefined;
  other.swing = { at: b.t, ms: 400, to: 0 } as Unit['swing'];
  assert.equal(makesWay(b, f, knight, j), false);
  other.swing = undefined;
  // (a foe beside the tile: the knight goes in, the archer holds back)
  const foe = b.units.find((x) => x.side === 'foe' && x.alive)!;
  put(b, foe, at.u, at.v - 2);
  put(b, archer, at.u + 1, at.v);
  rebuildBuckets(f, b.units);
  assert.equal(makesWay(b, f, knight, j), true);
  assert.equal(makesWay(b, f, archer, j), false);
});

test('at its point a melee hero takes on a foe a little beyond its reach and leash; a shooter only what it can nearly shoot', () => {
  assert.equal(pointReach({ range: 1 }), 1 + HERO_LEASH + 1 + POINT_REACH);
  assert.equal(pointReach({ range: 5, shot: {} }), 6);
});

test('a hero sent through a press of another platoon\'s soldiers gets through it', () => {
  const b = quiet();
  const f = b.field!;
  const h = f.hold!;
  const at = openSpot(b, 3);
  const hero = f.byId[h.platoons[0].heroId];
  put(b, hero, at.u, at.v + 2);
  // (two ranks of the Samurai's and the Archers' soldiers across the way, seven wide)
  const press = [...h.platoons[1].soldiers, ...h.platoons[2].soldiers].map((s) => f.byId[s.id]);
  press.slice(0, 14).forEach((x, i) => put(b, x, at.u - 3 + (i % 7), at.v + Math.floor(i / 7)));
  // (the Knight's own soldiers behind it)
  h.platoons[0].soldiers.slice(0, 7).forEach((s, i) => put(b, f.byId[s.id], at.u - 3 + i, at.v + 3));
  rebuildBuckets(f, b.units);
  orderPlatoon(b, 0, { kind: 'move', at: { u: at.u, v: at.v - 6 } });
  for (let i = 0; i < 120 && b.phase === 'fight'; i++) stepBattle(b);
  assert.ok(hero.v < at.v, `through the press (v ${hero.v}, the press at ${at.v} and ${at.v + 1})`);
});
