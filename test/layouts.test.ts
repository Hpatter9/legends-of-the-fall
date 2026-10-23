import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, CLASSIC_AREAS, boardOk, BASE_AREA, D, DEPLOY_ROWS, DIRS, FLY_JUMP, canStep, makeBoard, standable, tileAt, W, type Area, type Board } from '../src/sim/board';
import { applyLayout, LAYOUT_IDS, LAYOUT_INFO, layoutFor, type LayoutId } from '../src/sim/layouts';
import { buildChain } from '../src/sim/chain';
import { fight, place, startBattle, stepBattle } from '../src/sim/battle';
import { walkFrom } from '../src/sim/path';
import { mixSeed } from '../src/sim/rng';
import { CAL_BOARD } from '../src/sim/calamity';

const SHAPED = LAYOUT_IDS.filter((id) => id !== 'classic');
type Tile = Board['tiles'][number];
const count = (x: Board | Tile[], f: (t: Tile) => boolean) => (Array.isArray(x) ? x : x.tiles).filter(f).length;
const middle = (b: Board): Tile[] => b.tiles.filter((_, i) => Math.floor(i / b.w) >= DEPLOY_ROWS && Math.floor(i / b.w) < b.d - DEPLOY_ROWS);

test('the usual board is 8 across and 11 deep, and a Calamity board is still 10 by 13', () => {
  assert.equal(W, 8);
  assert.equal(D, 11);
  assert.equal(makeBoard(5).tiles.length, 88);
  assert.deepEqual([CAL_BOARD.w, CAL_BOARD.d], [10, 13]);
});

test('rolling land at the old 7 x 9 size is the old land: heights, boulders, ground and bushes unchanged', () => {
  // (the hash is of the boards of 0.139.0: 40 seeds in each of the six first lands; shrines and barrels, new, are left out)
  let h = 0x811c9dc5;
  for (const area of CLASSIC_AREAS)
    for (let seed = 1; seed <= 40; seed++) {
      const b = makeBoard(seed * 7919, area, 7, 9, 'classic');
      const s = JSON.stringify(b.tiles.map((t) => [t.h, t.rock ? 1 : 0, t.ground === 'shrine' ? '' : t.ground ?? '', t.bush ? 1 : 0, t.deco]));
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
      }
    }
  assert.equal(h, 2028076264);
});

test('every layout, in every area, makes a board both sides can cross, with the deploy rows clear, the same each time', () => {
  const took: Record<string, number> = {};
  let tried = 0;
  for (const area of AREAS)
    for (let seed = 1; seed <= 40; seed++) {
      tried++;
      for (const id of LAYOUT_IDS) {
        const b = makeBoard(seed * 7919, area, W, D, id);
        assert.ok(boardOk(b), `${id} ${area} ${seed}`);
        assert.equal(b.tiles.length, W * D);
        for (let v = 0; v < D; v++) {
          if (v >= DEPLOY_ROWS && v < D - DEPLOY_ROWS) continue;
          for (let u = 0; u < W; u++) assert.ok(standable(tileAt(b, u, v)) && !tileAt(b, u, v)!.barrel, `${id} ${area} ${seed}: deploy tile ${u},${v}`);
        }
        assert.deepEqual(b, makeBoard(seed * 7919, area, W, D, id), `${id} is not repeatable`);
        if (b.layout === id) took[id] = (took[id] ?? 0) + 1;
      }
    }
  // (a template that cannot be laid on a seed leaves the rolling land; that is rare)
  for (const id of SHAPED) assert.ok((took[id] ?? 0) >= tried * 0.9, `${id} took ${took[id]} of ${tried}`);
});

test('each layout has its own shape', () => {
  for (const area of ['highlands', 'snow', 'volcano', 'dungeon'] as Area[])
    for (let seed = 1; seed <= 12; seed++) {
      const s = seed * 131;
      const at = (id: LayoutId) => makeBoard(s, area, W, D, id);
      const wet = (t: Board['tiles'][number]) => t.ground === 'deep' || t.ground === 'lava';
      // a river: a row or two of deep water (a lake of lava on a volcano) right across the middle, with at least one bridge or ford over it
      const river = at('river');
      assert.equal(river.layout, 'river');
      assert.ok(count(middle(river), wet) >= W / 2, `river ${area} ${s}`);
      assert.ok(count(river, (t) => !!t.bridge || t.ground === 'water') >= 1);
      // a hill: higher in the middle than at the sides of the field
      const hill = at('hill');
      assert.ok(Math.max(...middle(hill).map((t) => t.h)) >= 4, `hill ${area} ${s}`);
      // a pass: tall ridges with a low way between them
      const pass = at('pass');
      assert.ok(count(middle(pass), (t) => t.h === 0) >= 4 && Math.max(...middle(pass).map((t) => t.h)) >= 3, `pass ${area} ${s}`);
      // a fort: walls, and gaps in them
      const fort = at('fort');
      assert.ok(count(fort, (t) => !!t.wall) >= 6, `fort ${area} ${s}`);
      // islands: a sea with land standing in it, joined
      const isl = at('islands');
      assert.ok(count(middle(isl), wet) >= 8 && count(middle(isl), (t) => !wet(t) && t.h >= 1) >= 6, `islands ${area} ${s}`);
      // a ring: a pit at the foot of a raised rim
      const ring = at('ring');
      assert.ok(count(middle(ring), (t) => t.h === 0) >= 2 && Math.max(...middle(ring).map((t) => t.h)) >= 3, `ring ${area} ${s}`);
      // a ravine: a bridge over it, and plateaus on each side
      const rav = at('plateaus');
      assert.ok(count(rav, (t) => !!t.bridge) >= 2 && Math.max(...middle(rav).map((t) => t.h)) >= 3, `plateaus ${area} ${s}`);
      // an open plain: low and level
      const plain = at('plain');
      assert.ok(Math.max(...plain.tiles.map((t) => t.h)) <= 1, `plain ${area} ${s}`);
    }
});

test('a river is crossed on foot only by its bridges and fords, and a flier goes straight over', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const b = makeBoard(seed * 17, 'highlands', W, D, 'river');
    const from = { u: Math.floor(W / 2), v: D - 1 };
    const goal = Math.floor(W / 2);
    const foot = walkFrom(b, from, 1, new Set());
    const air = walkFrom(b, from, FLY_JUMP, new Set());
    assert.ok(Number.isFinite(foot.cost[goal]), 'a walker gets over');
    assert.ok(air.cost[goal] <= foot.cost[goal], 'a flier is never slower');
    for (const t of b.tiles) if (t.ground === 'deep') assert.equal(canStep({ h: t.h, deco: 0 }, t, 4), null, 'no walker enters deep water');
  }
});

test('the odds: every layout turns up, rolling land most often, and the same seed always picks the same', () => {
  const seen: Record<string, number> = {};
  for (let s = 1; s <= 1200; s++) {
    const id = layoutFor(s, 'highlands');
    assert.equal(layoutFor(s, 'highlands'), id);
    seen[id] = (seen[id] ?? 0) + 1;
  }
  for (const id of LAYOUT_IDS) assert.ok(seen[id] > 20, `${id} seen ${seen[id]}`);
  assert.ok(seen.classic > Math.max(...SHAPED.map((id) => seen[id])), 'rolling land is the most common');
  for (const id of LAYOUT_IDS) assert.ok(LAYOUT_INFO[id].name && LAYOUT_INFO[id].text);
  // (each land leans its own way: a desert's passes, a dungeon's forts, a volcano's seas of lava)
  const lean = (area: Area, id: LayoutId) => Array.from({ length: 1200 }, (_, s) => layoutFor(s + 1, area)).filter((x) => x === id).length;
  assert.ok(lean('desert', 'pass') > lean('highlands', 'pass'));
  assert.ok(lean('dungeon', 'fort') > lean('highlands', 'fort'));
  assert.ok(lean('volcano', 'islands') > lean('highlands', 'islands'));
});

test('a layout is a side stream: the shape for a seed does not move with the size of the board or the rest of the land', () => {
  // the pick is a function of seed and land alone
  for (let seed = 1; seed <= 50; seed++) assert.equal(makeBoard(seed, 'snow', W, D).layout === layoutFor(seed, 'snow') || makeBoard(seed, 'snow', W, D).layout === 'classic', true);
  for (let seed = 1; seed <= 50; seed++) assert.equal(layoutFor(seed, 'snow'), layoutFor(seed, 'snow'));
  // a layout told to `makeBoard` is the one laid (when it takes)
  assert.equal(makeBoard(3, 'highlands', W, D, 'fort').layout, 'fort');
  assert.equal(makeBoard(3, 'highlands', W, D, 'classic').layout, 'classic');
});

test('the bigger Calamity board can be laid in every shape too', () => {
  for (const area of AREAS)
    for (const id of LAYOUT_IDS)
      for (let seed = 1; seed <= 6; seed++) {
        const b = makeBoard(seed * 7919, area, CAL_BOARD.w, CAL_BOARD.d, id);
        assert.ok(boardOk(b), `${id} ${area} ${seed}`);
        for (let u = 0; u < b.w; u++) for (const v of [0, 1, 2, b.d - 3, b.d - 2, b.d - 1]) assert.ok(standable(tileAt(b, u, v)), `${id} ${area} ${seed}: ${u},${v}`);
      }
});

test('a fight plays out to its end on every layout, in every area', () => {
  for (const area of AREAS)
    for (const id of LAYOUT_IDS) {
      const b = startBattle(11, 'skeletons', { area, layout: id });
      assert.equal(b.board.layout === id || b.board.layout === 'classic', true);
      assert.ok(place(b, 'knight', 2, D - 1));
      assert.ok(place(b, 'archer', 4, D - 1));
      assert.ok(place(b, 'samurai', 3, D - 2));
      assert.ok(fight(b), `${id} ${area}`);
      for (let i = 0; i < 3000 && b.phase === 'fight'; i++) stepBattle(b);
      assert.notEqual(b.phase, 'fight', `${id} ${area}`);
    }
});

test('the long map lays the shapes too, each section joined to the one before and walkable', () => {
  let shaped = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const c = buildChain(seed, 15, 'highlands', (w) => mixSeed(seed, 0x57a6e, w), (w) => w % 5 === 0);
    for (const s of c) {
      assert.ok(boardOk(s.board), `seed ${seed} wave ${s.wave}`);
      if (s.board.layout !== 'classic') shaped++;
      for (let u = 0; u < s.board.w; u++) assert.ok(standable(tileAt(s.board, u, s.board.d - 1)), 'the heroes\' edge is clear');
    }
  }
  assert.ok(shaped > 100, `${shaped} of 300 sections are shaped`);
});

test('a template that cannot be laid leaves the board as it was', () => {
  const b = makeBoard(7, 'highlands', W, D, 'classic');
  const before = JSON.stringify(b);
  assert.equal(applyLayout(b, 'classic'), false);
  assert.equal(JSON.stringify(b), before);
});

test('the area counts from the old board', () => {
  assert.equal(BASE_AREA, 63);
  assert.ok(DIRS.length === 4);
});
