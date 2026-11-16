import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defOf, stepBattle, type Battle, type Unit } from '../src/sim/battle';
import { followTrail, narrowAt, squadJump, squadPace, straggling, waitsTurn, SQUAD_STRAGGLE, MARCH_CLOSE } from '../src/sim/assault/assault';
import { orderPlatoon, slotAt } from '../src/sim/assault/platoons';
import { aggroOf, huntOf, AGGRO, FIELD_HUNT, HUNT, WAKE } from '../src/sim/assault/holdMind';
import { rebuildBuckets } from '../src/sim/assault/field';
import { input, quiet } from './assaultKit';
import { startAssault } from '../src/sim/assault/assault';

// ASSAULT-SQUADS (docs/notes/assault-squads.md): the owner's "the hero and its troops form a group so they need to travel closely together.
// The troops always get stuck before crossing the river. The enemies in the area should be coming to the heroes if they're within distance."

/** Stand a fighter on a tile (the next tick puts it on the grid). */
function put(b: Battle, x: Unit, u: number, v: number): void {
  const f = b.field!;
  if (f.occ[x.v * f.w + x.u] === x.id) f.occ[x.v * f.w + x.u] = -1;
  x.u = u;
  x.v = v;
  x.step = undefined;
  f.occ[v * f.w + u] = x.id;
}

/** A free, walkable tile exactly `r` from `at` (along an axis or a diagonal). */
function freeAround(b: Battle, at: { u: number; v: number }, r: number): { u: number; v: number } {
  const f = b.field!;
  for (const [du, dv] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
    const u = at.u + du;
    const v = at.v + dv;
    const t = b.board.tiles[v * b.board.w + u];
    if (t && !t.wall && !t.rock && t.ground !== 'deep' && f.occ[v * f.w + u] < 0) return { u, v };
  }
  throw new Error('no free tile');
}

/** An open square of the hold's field, `r` tiles round its middle walkable, level and empty. */
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

test('a leader walks with its squad\'s jump: the Dragoon\'s leap only where its Lancers can follow', () => {
  const b = quiet();
  const f = b.field!;
  const pl = f.hold!.platoons[4];
  const dragoon = f.byId[pl.heroId];
  assert.ok(defOf(dragoon).jump > 2);
  const lancers = defOf(f.byId[pl.soldiers[0].id]).jump;
  assert.equal(squadJump(f, dragoon, defOf(dragoon).jump), lancers);
  for (const s of pl.soldiers) f.byId[s.id].alive = false;
  assert.equal(squadJump(f, dragoon, defOf(dragoon).jump), defOf(dragoon).jump);
});

test('on the march a leader keeps its slowest soldier\'s pace; in a fight its own', () => {
  const b = quiet();
  const f = b.field!;
  const pl = f.hold!.platoons[2];
  const archer = f.byId[pl.heroId];
  const slowest = Math.max(...pl.soldiers.map((s) => defOf(f.byId[s.id]).moveMs));
  assert.equal(squadPace(b, f, pl, archer), Math.max(defOf(archer).moveMs, slowest));
  const at = openSpot(b, 3);
  put(b, archer, at.u, at.v);
  const foe = b.units.find((x) => x.side === 'foe' && x.alive)!;
  put(b, foe, at.u + 2, at.v);
  rebuildBuckets(f, b.units);
  assert.equal(squadPace(b, f, pl, archer), defOf(archer).moveMs);
});

test('a straggler: a soldier further than SQUAD_STRAGGLE from its leader and not in a fight of its own', () => {
  const b = quiet();
  const f = b.field!;
  const pl = f.hold!.platoons[0];
  const hero = f.byId[pl.heroId];
  const at = openSpot(b, 3);
  put(b, hero, at.u, at.v);
  pl.soldiers.forEach((s, i) => put(b, f.byId[s.id], at.u - 2 + (i % 5), at.v + 1 + Math.floor(i / 5)));
  rebuildBuckets(f, b.units);
  assert.equal(straggling(b, f, pl, hero), false);
  // (one sent off to a free tile further than SQUAD_STRAGGLE)
  const lag = f.byId[pl.soldiers[0].id];
  const far = freeAround(b, at, SQUAD_STRAGGLE + 1);
  put(b, lag, far.u, far.v);
  rebuildBuckets(f, b.units);
  assert.equal(straggling(b, f, pl, hero), true);
  // (a straggler with a foe at its blade is fighting, not lagging)
  const foe = b.units.find((x) => x.side === 'foe' && x.alive)!;
  put(b, foe, lag.u, lag.v - 1);
  rebuildBuckets(f, b.units);
  assert.equal(straggling(b, f, pl, hero), false);
});

test('on the march the formation is drawn in round the hero', () => {
  const open = slotAt({ u: 50, v: 50 }, 0, 'line', 9);
  const march = slotAt({ u: 50, v: 50 }, 0, 'line', 9, false, MARCH_CLOSE);
  const d = (a: { u: number; v: number }) => Math.abs(a.u - 50) + Math.abs(a.v - 50);
  assert.ok(d(march) < d(open));
  assert.deepEqual(slotAt({ u: 50, v: 50 }, 0, 'wall', 3), slotAt({ u: 50, v: 50 }, 0, 'wall', 3, false, 1));
});

test('a straggler catches up along its leader\'s trail, not straight for its place', () => {
  const b = quiet();
  const f = b.field!;
  const pl = f.hold!.platoons[0];
  const hero = f.byId[pl.heroId];
  const at = openSpot(b, 3);
  const w = b.board.w;
  // (the leader walked an L: down six, then right six, round the square's edge; the soldier stands at the L's start)
  const way: number[] = [];
  for (let k = 0; k <= 6; k++) way.push((at.v - 3 + k) * w + at.u - 3);
  for (let k = 1; k <= 6; k++) way.push((at.v + 3) * w + at.u - 3 + k);
  pl.trail = way.reverse();
  put(b, hero, at.u + 3, at.v + 3);
  const s = f.byId[pl.soldiers[0].id];
  put(b, s, at.u - 3, at.v - 3);
  rebuildBuckets(f, b.units);
  assert.equal(followTrail(b, f, pl, s, []), true);
  // (its first step is down the L, along the trail, not across the corner towards the hero)
  assert.equal(s.u, at.u - 3);
  assert.equal(s.v, at.v - 2);
});

test('squads take turns at a narrow way: the one in it first, the next waits at its mouth', () => {
  const b = quiet();
  const f = b.field!;
  const h = f.hold!;
  // (the Old Bridge's narrow way: a narrow tile with a wide one beside it, the mouth)
  let mouth: { u: number; v: number } | null = null;
  let neck: { u: number; v: number } | null = null;
  for (let v = 70; v < 92 && !mouth; v++)
    for (let u = 70; u < 92 && !mouth; u++) {
      const t = b.board.tiles[v * b.board.w + u];
      if (!t || t.wall || t.rock || t.ground === 'deep' || f.occ[v * f.w + u] >= 0 || !narrowAt(b, { u, v })) continue;
      for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const m = { u: u + du, v: v + dv };
        const tm = b.board.tiles[m.v * b.board.w + m.u];
        if (tm && !tm.wall && !tm.rock && tm.ground !== 'deep' && f.occ[m.v * f.w + m.u] < 0 && !narrowAt(b, m)) {
          mouth = m;
          neck = { u, v };
          break;
        }
      }
    }
  assert.ok(mouth && neck, 'the bridge has a mouth');
  const pl = h.platoons[0];
  const hero = f.byId[pl.heroId];
  put(b, hero, mouth!.u, mouth!.v);
  rebuildBuckets(f, b.units);
  assert.equal(waitsTurn(b, f, pl, hero), false, 'nobody in it');
  const other = f.byId[h.platoons[1].soldiers[0].id];
  put(b, other, neck!.u, neck!.v);
  rebuildBuckets(f, b.units);
  assert.equal(waitsTurn(b, f, pl, hero), true, 'another squad in it');
  // (its own soldier there is no reason to wait)
  put(b, other, 1, 1);
  const own = f.byId[pl.soldiers[0].id];
  put(b, own, neck!.u, neck!.v);
  rebuildBuckets(f, b.units);
  assert.equal(waitsTurn(b, f, pl, hero), false);
});

test('a squad sent over the river arrives on the far bank together', () => {
  const b = startAssault(input());
  const f = b.field!;
  const h = f.hold!;
  // (every platoon over the Old Bridge to its far end, the hold's posts on the bank left asleep for the test)
  for (const p of h.posts) p.def = { ...p.def, horn: true };
  const goal = h.bp.approaches.find((a) => a.id === 'bridge')!.way.at(-1)!;
  orderPlatoon(b, 0, { kind: 'move', at: goal });
  for (let i = 0; i < 1500 && b.phase === 'fight'; i++) stepBattle(b);
  const pl = h.platoons[0];
  const hero = f.byId[pl.heroId];
  assert.ok(Math.abs(hero.u - goal.u) + Math.abs(hero.v - goal.v) <= 6, `the hero at ${hero.u},${hero.v}, the goal ${goal.u},${goal.v}`);
  const men = pl.soldiers.map((s) => f.byId[s.id]).filter((x) => x.alive);
  const off = men.filter((x) => Math.max(Math.abs(x.u - hero.u), Math.abs(x.v - hero.v)) > SQUAD_STRAGGLE + 2);
  assert.equal(off.length, 0, `stragglers left: ${off.map((x) => `${x.u},${x.v}`).join(' ')}`);
});

test('foes come to you: a post in the fields wakes to ours further off and hunts further; the works keep their places', () => {
  const field = { def: { id: 'camp', zone: 'fields' } } as never;
  const wall = { def: { id: 'tower', zone: 'wall' } } as never;
  const horn = { def: { id: 'barracks', zone: 'fields', horn: true } } as never;
  const throne = { def: { id: 'throne', zone: 'keep' } } as never;
  assert.equal(aggroOf(field), AGGRO);
  assert.ok(AGGRO > WAKE);
  assert.equal(aggroOf(wall), WAKE);
  assert.equal(aggroOf(horn), 4);
  assert.equal(huntOf(field), FIELD_HUNT);
  assert.ok(FIELD_HUNT > AGGRO, 'it hunts further than it wakes, and goes home past that');
  assert.equal(huntOf(wall), HUNT);
  assert.ok(huntOf(throne) < HUNT);
  // (in a hold: a post in the fields, ours a little beyond the old wake radius, it wakes within a second)
  const b = quiet();
  const f = b.field!;
  const h = f.hold!;
  const post = h.posts.find((p) => p.def.zone === 'fields' && !p.def.horn && p.mood === 'posted')!;
  const home = f.groups[post.group].home;
  const hero = f.byId[h.platoons[0].heroId];
  let spot: { u: number; v: number } | null = null;
  for (let r = WAKE + 2; r < AGGRO && !spot; r++)
    for (const [du, dv] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
      const u = home.u + du;
      const v = home.v + dv;
      const t = b.board.tiles[v * b.board.w + u];
      if (t && !t.wall && !t.rock && t.ground !== 'deep' && f.occ[v * f.w + u] < 0) {
        spot = { u, v };
        break;
      }
    }
  assert.ok(spot);
  put(b, hero, spot!.u, spot!.v);
  for (let i = 0; i < 12; i++) stepBattle(b);
  assert.notEqual(post.mood, 'posted');
});
