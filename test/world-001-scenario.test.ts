import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, canStep, DIRS, standable, tileAt, W, D } from '../src/sim/board';
import { boardTileAt, buildChain, contactPairs, footprint, frameOf, seam, transferFormation, worldOf } from '../src/sim/chain';
import { armyRun, chainOf, loadRun, saveRun, startStage } from '../src/sim/run';
import { ARMIES } from '../src/sim/armies';
import { planScenario, SCENARIOS, scenarioHeight } from '../src/sim/scenario';
import { landmarkBounds, project, rawAt } from '../src/render/iso';
import { dropDelay, dropEnd, FALL_MS, SETTLE_MS } from '../src/render/dropRules';

test('12×16 chain sections retain rotated footprints, projection, contact and deployment', () => {
  const rots = new Set<number>();
  for (let seed = 1; seed <= 12; seed++) {
    const c = buildChain(seed, 10, 'highlands', n => seed * 100 + n, n => n === 10, { w: 12, d: 16 });
    for (let k = 0; k < c.length; k++) {
      const s = c[k];
      rots.add(s.rot);
      assert.equal(s.board.tiles.length, 192);
      assert.ok(boardOk(s.board));
      const rect = footprint(s);
      assert.equal((rect.x1 - rect.x0) * (rect.y1 - rect.y0), 192);
      for (let v = 0; v < 16; v++) for (let u = 0; u < 12; u++) {
        const [U, V] = worldOf(s, u, v);
        assert.deepEqual(boardTileAt(s, U, V), [u, v]);
        assert.deepEqual(project(frameOf(s, s), u, v, 0), rawAt(U - s.origin.u, V - s.origin.v, 0));
      }
      if (k) assert.ok(contactPairs(c[k - 1], s).length >= 5);
      for (const [u, v] of transferFormation(s.board, [{ id: 'a', u: 5, v: 10 }, { id: 'b', u: 6, v: 15 }]).values()) {
        assert.ok(v >= 13 && v < 16 && standable(tileAt(s.board, u, v)));
      }
    }
  }
  assert.equal(rots.size, 4);
});

for (const theme of SCENARIOS) test(`${theme}: coherent seeded terrain and legal routes from every surviving position`, () => {
  const p = planScenario(7, theme, 12, n => n === 12);
  assert.deepEqual(p, planScenario(7, theme, 12, n => n === 12));
  assert.notDeepEqual(p, planScenario(19, theme, 12, n => n === 12));
  for (let seed = 1; seed <= 100; seed++) {
    const c = planScenario(seed, theme, 12, n => n === 12).sections;
    for (let k = 0; k < c.length; k++) {
      const s = c[k];
      assert.ok(boardOk(s.board));
      assert.equal(s.board.w, 12);
      assert.equal(s.board.d, 16);
      for (let v = 0; v < 16; v++) for (let u = 0; u < 12; u++) {
        const t = tileAt(s.board, u, v)!;
        if (!t.bridge) assert.equal(t.h, scenarioHeight(theme, u + s.origin.u, v + s.origin.v, 12, seed));
        if (t.ground === 'deep' || t.ground === 'water') assert.equal(t.h, 1);
      }
      assert.equal(!!s.board.landmark, k >= c.length - 2);
      if (!k) continue;
      const old = c[k - 1];
      const { board, minU, minV } = seam(old, s);
      const [U, V] = worldOf(s, 6, 15);
      const goal = (V - minV) * board.w + U - minU;
      // Reverse flood: every standable survivor position must be able to walk TO the next formation.
      const seen = new Set([goal]);
      const queue = [goal];
      for (let at = 0; at < queue.length; at++) {
        const i = queue[at];
        for (const [du, dv] of DIRS) {
          const u = i % board.w + du, v = Math.floor(i / board.w) + dv;
          const t = tileAt(board, u, v);
          const j = v * board.w + u;
          if (!t || !standable(t) || seen.has(j) || canStep(t, board.tiles[i], 1) === null) continue;
          seen.add(j); queue.push(j);
        }
      }
      board.tiles.forEach((t, i) => { if (standable(t)) assert.ok(seen.has(i), `${theme}/${seed}/${k} tile ${i}`); });
    }
  }
});

test('scenario saves resume identically, cache does not leak into standard armies or other modes', () => {
  const standard = armyRun(7, ARMIES[0].id);
  const baseline = chainOf(standard);
  for (const theme of SCENARIOS) {
    const run = armyRun(7, ARMIES[0].id);
    assert.equal(run.mode?.kind, 'army');
    if (run.mode?.kind !== 'army') throw new Error('army expected');
    run.mode.scenario = theme;
    run.stage = 2;
    let saved = '';
    saveRun(run, { setItem: (_, value) => { saved = value; } });
    const resumed = loadRun({ getItem: () => saved });
    assert.ok(resumed);
    assert.deepEqual(chainOf(resumed), chainOf(run));
    const battle = startStage(resumed);
    assert.equal(battle.board.tiles.length, 192);
    assert.equal(chainOf(standard), baseline);
    const malformed = JSON.parse(saved);
    malformed.mode.scenario = 'unknown';
    assert.equal(loadRun({ getItem: () => JSON.stringify(malformed) }), null);
  }
  assert.equal(startStage(standard).board.tiles.length, W * D);
});

test('all 192 columns finish dropping at the larger section deadline', () => {
  let end = 0;
  for (let v = 0; v < 16; v++) for (let u = 0; u < 12; u++) end = Math.max(end, dropDelay(u, v, 12, 16) + FALL_MS + SETTLE_MS);
  assert.equal(dropEnd(12, 16), end);
  assert.ok(dropDelay(6, 15, 12, 16) < dropDelay(6, 0, 12, 16));
});

test('destination stays in one world location across the final approach and boss section', () => {
  for (const theme of SCENARIOS) {
    const p = planScenario(7, theme, 15, n => n === 15);
    assert.equal(p.revealWave, 14);
    for (const s of p.sections.slice(0, 13)) assert.equal(s.board.landmark, undefined);
    const sites = p.sections.slice(13).map(s => {
      const site = s.board.landmarkAt!;
      const box = landmarkBounds(s.board, frameOf(s, s));
      assert.ok(box && box.x1 > box.x0 && box.y1 > box.y0);
      return { u: site.u + s.origin.u, v: site.v + s.origin.v, h: site.h };
    });
    assert.deepEqual(sites[0], sites[1]);
  }
});

test('known steep-row regression seeds keep a legal jump-1 return route', () => {
  for (const [seed, waves, transition] of [[97, 10, 6], [33, 12, 7], [97, 20, 6]]) {
    const c = planScenario(seed, 'mountain', waves, n => n === waves).sections;
    const { board } = seam(c[transition - 2], c[transition - 1]);
    // A one-step global gradient makes the graph reversible; no previous survivor is trapped below a two-step rise.
    for (let v = 0; v < board.d; v++) for (let u = 0; u < board.w; u++) {
      const t = tileAt(board, u, v)!;
      if (!standable(t)) continue;
      for (const [du, dv] of DIRS) {
        const next = tileAt(board, u + du, v + dv);
        if (standable(next)) assert.ok(Math.abs(t.h - next.h) <= 1);
      }
    }
  }
});
