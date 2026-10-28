import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, canStep, DEPLOY_ROWS, DIRS, RAMP, solid, standable, tileAt } from '../src/sim/board';
import { startBattle } from '../src/sim/battle';
import { ARENAS, levelArena, roadMask, sceneDepth } from '../src/sim/armyRoad';
import { ARMY_SCENARIOS, planScenario } from '../src/sim/scenario';
import { seam, worldOf } from '../src/sim/chain';

// (each army's bosses: the mid-boss at wave 8, the Wildwood's at 5 and 10, the final at 15)
const bossOf = (theme: string) => (n: number) => n === 15 || (theme === 'wildwood' ? n === 5 || n === 10 : n === 8);

test('the road through an ordinary section is a band six to ten tiles wide with scenery beside it', () => {
  for (const theme of ARMY_SCENARIOS)
    for (let seed = 1; seed <= 6; seed++) {
      const p = planScenario(seed, theme, 15, bossOf(theme));
      for (const s of p.sections) {
        const b = s.board;
        const scene = b.tiles.filter((t) => t.scene).length;
        // (a good share of every section is land beside the road, nobody's to stand on)
        assert.ok(scene >= b.tiles.length * 0.25, `${theme}/${seed}/${s.wave} scenery ${scene}`);
        for (const t of b.tiles) if (t.scene) assert.ok(solid(t) && !standable(t));
        if (s.boss) continue;
        // (the heroes' rows and the foes' rows lie on the road, with room for a squad of five and a band of six)
        for (const rows of [[b.d - DEPLOY_ROWS, b.d - 1], [0, DEPLOY_ROWS - 1]]) {
          let room = 0;
          for (let v = rows[0]; v <= rows[1]; v++) for (let u = 0; u < b.w; u++) if (standable(tileAt(b, u, v))) room++;
          assert.ok(room >= 12, `${theme}/${seed}/${s.wave} rows ${rows} room ${room}`);
        }
      }
    }
});

test('the road meets the next section where it goes on: every survivor walks on to the next formation', () => {
  for (const theme of ARMY_SCENARIOS)
    for (let seed = 1; seed <= 4; seed++) {
      const c = planScenario(seed, theme, 15, bossOf(theme)).sections;
      for (let k = 1; k < c.length; k++) {
        const { board, minU, minV } = seam(c[k - 1], c[k]);
        const [U, V] = worldOf(c[k], Math.floor(board.w / 2), c[k].board.d - 1);
        // (a goal on the new section's road: the middle of its standable heroes' row)
        const row = [...Array(c[k].board.w).keys()].filter((u) => standable(tileAt(c[k].board, u, c[k].board.d - 1)));
        const [GU, GV] = row.length ? worldOf(c[k], row[Math.floor(row.length / 2)], c[k].board.d - 1) : [U, V];
        const goal = (GV - minV) * board.w + GU - minU;
        const seen = new Set([goal]);
        const queue = [goal];
        for (let at = 0; at < queue.length; at++) {
          const i = queue[at];
          for (const [du, dv] of DIRS) {
            const u = (i % board.w) + du;
            const v = Math.floor(i / board.w) + dv;
            const t = tileAt(board, u, v);
            if (!t || !standable(t) || seen.has(v * board.w + u) || canStep(t, board.tiles[i], RAMP) === null) continue;
            seen.add(v * board.w + u);
            queue.push(v * board.w + u);
          }
        }
        const old = c[k - 1];
        for (let v = 0; v < old.board.d; v++)
          for (let u = 0; u < old.board.w; u++) {
            if (!standable(tileAt(old.board, u, v))) continue;
            const [OU, OV] = worldOf(old, u, v);
            assert.ok(seen.has((OV - minV) * board.w + OU - minU), `${theme}/${seed}/${k}: (${u}, ${v}) cut off`);
          }
      }
    }
});

test('each boss wave is fought in its army\'s own arena: a ring of its kind, a levelled floor, its set pieces', () => {
  for (const theme of ARMY_SCENARIOS) {
    const spec = ARENAS[theme];
    assert.ok(spec, `${theme} has an arena`);
    for (let seed = 1; seed <= 6; seed++) {
      const p = planScenario(seed, theme, 15, bossOf(theme));
      for (const s of p.sections.filter((x) => x.boss)) {
        const b = s.board;
        assert.ok(boardOk(b));
        assert.ok(b.tiles.filter((t) => t.scene === spec.ring).length >= 8, `${theme}/${seed}/${s.wave} ring`);
        assert.ok((b.pieces?.length ?? 0) >= 1, `${theme}/${seed}/${s.wave} set pieces`);
        for (const piece of b.pieces ?? []) assert.ok(tileAt(b, piece.u, piece.v)?.scene, 'a set piece stands on scenery');
        if (spec.paved) assert.ok(b.tiles.some((t) => t.paved));
        // (no two neighbours on the levelled floor or the road into it more than a step apart)
        for (let v = 0; v < b.d; v++)
          for (let u = 0; u < b.w; u++) {
            const t = tileAt(b, u, v)!;
            if (!standable(t)) continue;
            for (const [du, dv] of DIRS) {
              const n = tileAt(b, u + du, v + dv);
              if (standable(n)) assert.ok(Math.abs(n.h - t.h) <= 1, `${theme}/${seed}/${s.wave} step at (${u}, ${v})`);
            }
          }
        // (a band of six finds its rows; the foes start in the arena)
        const battle = startBattle(b.seed, ['skeleton', 'skeleton', 'spearman', 'spearman', 'boneArcher', 'boneArcher'], { board: b });
        assert.equal(battle.units.filter((x) => x.side === 'foe').length, 6);
      }
    }
  }
});

test('levelArena keeps neighbours within a step and pinned tiles at their own height', () => {
  const w = 10;
  const d = 10;
  const heights = Array.from({ length: w * d }, (_, i) => (i % w) + Math.floor(i / w));
  const floor = heights.map((_, i) => Math.abs((i % w) - 5) <= 2 && Math.abs(Math.floor(i / w) - 4) <= 2);
  const fixed = [9 * w + 4, 9 * w + 5];
  const out = levelArena(heights, w, d, floor, fixed, heights[4 * w + 5]);
  for (const f of fixed) assert.equal(out[f], heights[f]);
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++)
      for (const [du, dv] of DIRS) {
        const x = u + du;
        const y = v + dv;
        if (x >= 0 && y >= 0 && x < w && y < d) assert.ok(Math.abs(out[y * w + x] - out[v * w + u]) <= 1);
      }
  // (the floor is flatter than the land it was)
  const span = (hs: number[]) => Math.max(...hs) - Math.min(...hs);
  const on = (hs: number[]) => hs.filter((_, i) => floor[i]);
  assert.ok(span(on(out)) < span(on(heights)));
});

test('the road is the same for the same seed, and the land beside it is told apart by depth for the renderer', () => {
  assert.deepEqual(roadMask(14, 18, null, [[6, 0], [7, 0], [8, 0], [9, 0], [10, 0]], 5), roadMask(14, 18, null, [[6, 0], [7, 0], [8, 0], [9, 0], [10, 0]], 5));
  const b = planScenario(3, 'orcs', 15, bossOf('orcs')).sections[1].board;
  const depth = sceneDepth(b);
  b.tiles.forEach((t, i) => assert.equal(depth[i] === 0, !t.scene));
});
