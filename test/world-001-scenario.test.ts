import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, canStep, DIRS, RAMP, sightClear, standable, tileAt, W, D } from '../src/sim/board';
import { shotReach } from '../src/sim/battle';
import { boardTileAt, buildChain, contactPairs, footprint, frameOf, seam, transferFormation, worldOf } from '../src/sim/chain';
import { armyRun, chainOf, loadRun, saveRun, startStage } from '../src/sim/run';
import { ARMIES, landsOf } from '../src/sim/armies';
import { ARMY_SCENARIOS, landmarkOfTheme, planScenario, SCENARIOS, SCENARIO_SIZE, scenarioForArmy, scenarioHeight } from '../src/sim/scenario';
import { landmarkBounds, project, rawAt } from '../src/render/iso';
import { dropDelay, dropEnd, FALL_MS, SETTLE_MS } from '../src/render/dropRules';

test('14×18 chain sections retain rotated footprints, projection, contact and deployment', () => {
  const { w, d } = SCENARIO_SIZE;
  const rots = new Set<number>();
  for (let seed = 1; seed <= 12; seed++) {
    const c = buildChain(seed, 10, 'highlands', (n) => seed * 100 + n, (n) => n === 10, { w, d });
    for (let k = 0; k < c.length; k++) {
      const s = c[k];
      rots.add(s.rot);
      assert.equal(s.board.tiles.length, w * d);
      assert.ok(boardOk(s.board));
      const rect = footprint(s);
      assert.equal((rect.x1 - rect.x0) * (rect.y1 - rect.y0), w * d);
      for (let v = 0; v < d; v++)
        for (let u = 0; u < w; u++) {
          const [U, V] = worldOf(s, u, v);
          assert.deepEqual(boardTileAt(s, U, V), [u, v]);
          assert.deepEqual(project(frameOf(s, s), u, v, 0), rawAt(U - s.origin.u, V - s.origin.v, 0));
        }
      if (k) assert.ok(contactPairs(c[k - 1], s).length >= 5);
      for (const [u, v] of transferFormation(s.board, [
        { id: 'a', u: 6, v: d - 4 },
        { id: 'b', u: 7, v: d - 1 },
      ]).values()) {
        assert.ok(v >= d - 3 && v < d && standable(tileAt(s.board, u, v)));
      }
    }
  }
  assert.equal(rots.size, 4);
});

for (const theme of SCENARIOS)
  test(`${theme}: coherent seeded 14×18 terrain, hills/rivers/bridges/trees/rocks, 30–60 world height, and legal routes from every surviving position`, () => {
    const { w, d } = SCENARIO_SIZE;
    const p = planScenario(7, theme, 15, (n) => n === 15);
    assert.deepEqual(p, planScenario(7, theme, 15, (n) => n === 15));
    assert.notDeepEqual(p, planScenario(19, theme, 15, (n) => n === 15));
    assert.equal(p.destination.kind, landmarkOfTheme(theme));

    for (let seed = 1; seed <= 25; seed++) {
      const c = planScenario(seed, theme, 15, (n) => n === 15).sections;
      let runMinH = Infinity;
      let runMaxH = -Infinity;
      let bridges = 0;
      let rivers = 0;
      let rocks = 0;
      let trees = 0;
      for (let k = 0; k < c.length; k++) {
        const s = c[k];
        assert.ok(boardOk(s.board));
        assert.equal(s.board.w, w);
        assert.equal(s.board.d, d);
        let boardMin = Infinity;
        let boardMax = -Infinity;
        for (let v = 0; v < d; v++)
          for (let u = 0; u < w; u++) {
            const t = tileAt(s.board, u, v)!;
            const [U, V] = worldOf(s, u, v);
            // (a boss's arena is levelled towards its middle: WORLD-ROAD, `levelArena`)
            if (!s.boss && !t.bridge && !t.perch && !t.ramp) assert.equal(t.h, scenarioHeight(theme, U, V, 15, seed));
            if (p.waterLevel !== null && (t.ground === 'deep' || t.ground === 'water')) assert.equal(t.h, 1);
            if (t.bridge) bridges++;
            if (t.ground === 'water' || t.ground === 'deep' || t.ground === 'lava' || t.ground === 'ice') rivers++;
            if (t.rock) rocks++;
            if (t.tree) trees++;
            boardMin = Math.min(boardMin, t.h);
            boardMax = Math.max(boardMax, t.h);
          }
        // Every single 14×18 wave section has 12–20+ tiles of local vertical relief.
        if (!s.boss) assert.ok(boardMax - boardMin >= 12, `${theme}/${seed}/wave ${k + 1} delta ${boardMax - boardMin}`);
        runMinH = Math.min(runMinH, boardMin);
        runMaxH = Math.max(runMaxH, boardMax);
        assert.equal(!!s.board.landmark, k >= c.length - 2);
        if (!k) continue;
        const old = c[k - 1];
        const { board, minU, minV } = seam(old, s);
        // (the next formation stands on the road: the middle standable tile of the new section's heroes' row; WORLD-ROAD leaves the rest of the row as scenery)
        const row = [...Array(w).keys()].filter((u) => standable(tileAt(s.board, u, d - 1)));
        const [U, V] = worldOf(s, row[Math.floor(row.length / 2)], d - 1);
        const goal = (V - minV) * board.w + U - minU;
        // Reverse flood: every standable survivor position must be able to walk TO the next formation.
        const seen = new Set([goal]);
        const queue = [goal];
        for (let at = 0; at < queue.length; at++) {
          const i = queue[at];
          for (const [du, dv] of DIRS) {
            const u = (i % board.w) + du;
            const v = Math.floor(i / board.w) + dv;
            const t = tileAt(board, u, v);
            const j = v * board.w + u;
            if (!t || !standable(t) || seen.has(j) || canStep(t, board.tiles[i], 1) === null) continue;
            seen.add(j);
            queue.push(j);
          }
        }
        for (let v = 0; v < old.board.d; v++) {
          for (let u = 0; u < old.board.w; u++) {
            const ot = tileAt(old.board, u, v)!;
            if (standable(ot)) {
              const [U, V] = worldOf(old, u, v);
              const si = (V - minV) * board.w + U - minU;
              assert.ok(seen.has(si), `${theme}/${seed}/${k} survivor at (${u}, ${v}) cannot reach next formation`);
            }
          }
        }
      }
      assert.ok(bridges > 0 && rivers > 0 && rocks > 0, `${theme}/${seed} has bridges, rivers, and rocks`);
      if (theme !== 'infernal' && theme !== 'golems') assert.ok(trees > 0, `${theme}/${seed} has trees`);
      // Across the 15-wave run, world elevation spans 30–60 tiles.
      assert.ok(runMaxH - runMinH >= 40 && runMaxH <= 60, `${theme}/${seed} world range ${runMinH}..${runMaxH}`);
    }
  });

test('every army uses its own dedicated story-spanning 14×18 campaign map by default', () => {
  assert.equal(ARMY_SCENARIOS.length, ARMIES.length);
  for (const army of ARMIES) {
    const theme = scenarioForArmy(army.id);
    assert.equal(theme, army.id);
    const run = armyRun(7, army.id);
    const c = chainOf(run)!;
    assert.equal(c.length, army.waves.length);
    assert.equal(c[0].board.w, SCENARIO_SIZE.w);
    assert.equal(c[0].board.d, SCENARIO_SIZE.d);
    // (the owner's rule: one land for the one long battle; each attempt keeps the land its seed picked from the army's lands)
    const areas = new Set(c.map((s) => s.board.area));
    assert.equal(areas.size, 1, `${army.id} keeps one land`);
    assert.ok(landsOf(army).includes(c[0].board.area), `${army.id} on one of its own lands`);
    assert.equal(c[c.length - 1].board.landmark, landmarkOfTheme(theme));
  }
});

test('scenario saves resume identically, cache isolates scenarios and classic fallback', () => {
  const { w, d } = SCENARIO_SIZE;
  const standard = armyRun(7, ARMIES[0].id);
  const baseline = chainOf(standard);
  for (const theme of SCENARIOS) {
    const run = armyRun(7, ARMIES[0].id);
    assert.equal(run.mode?.kind, 'army');
    if (run.mode?.kind !== 'army') throw new Error('army expected');
    run.mode.scenario = theme;
    run.stage = 2;
    let saved = '';
    saveRun(run, {
      setItem: (_, value) => {
        saved = value;
      },
    });
    const resumed = loadRun({ getItem: () => saved });
    assert.ok(resumed);
    assert.deepEqual(chainOf(resumed), chainOf(run));
    const battle = startStage(resumed);
    assert.equal(battle.board.tiles.length, w * d);
    assert.equal(chainOf(standard), baseline);
    const malformed = JSON.parse(saved);
    malformed.mode.scenario = 'unknown';
    assert.equal(loadRun({ getItem: () => JSON.stringify(malformed) }), null);
  }
  const classic = armyRun(7, ARMIES[0].id);
  if (classic.mode?.kind === 'army') classic.mode.scenario = 'classic';
  assert.equal(startStage(classic).board.tiles.length, W * D);
});

test('all 480 columns finish dropping at the 20×24 section deadline', () => {
  const { w, d } = SCENARIO_SIZE;
  let end = 0;
  for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) end = Math.max(end, dropDelay(u, v, w, d) + FALL_MS + SETTLE_MS);
  assert.equal(dropEnd(w, d), end);
  assert.ok(dropDelay(Math.floor(w / 2), d - 1, w, d) < dropDelay(Math.floor(w / 2), 0, w, d));
});

test('destination stays in one world location across the final approach and boss section', () => {
  for (const theme of SCENARIOS) {
    const p = planScenario(7, theme, 15, (n) => n === 15);
    assert.equal(p.revealWave, 14);
    for (const s of p.sections.slice(0, 13)) assert.equal(s.board.landmark, undefined);
    const sites = p.sections.slice(13).map((s) => {
      const site = s.board.landmarkAt!;
      const box = landmarkBounds(s.board, frameOf(s, s));
      assert.ok(box && box.x1 > box.x0 && box.y1 > box.y0);
      const [wu, wv] = worldOf(s, site.u, site.v);
      return { u: wu, v: wv, h: site.h };
    });
    assert.deepEqual(sites[0], sites[1]);
  }
});

test('known steep-row regression seeds keep a legal jump-1 return route', () => {
  for (const [seed, waves, transition] of [
    [97, 10, 6],
    [33, 12, 7],
    [97, 20, 6],
  ]) {
    const c = planScenario(seed, 'mountain', waves, (n) => n === waves).sections;
    const { board } = seam(c[transition - 2], c[transition - 1]);
    // A one-step global gradient with controlled 2-level sheer cliffs on archer perches keeps the graph reversible.
    for (let v = 0; v < board.d; v++)
      for (let u = 0; u < board.w; u++) {
        const t = tileAt(board, u, v)!;
        if (!standable(t)) continue;
        for (const [du, dv] of DIRS) {
          const next = tileAt(board, u + du, v + dv);
          if (standable(next)) {
            const limit = t.perch || next.perch || t.ramp || next.ramp ? 2 : 1;
            assert.ok(Math.abs(t.h - next.h) <= limit, `steep step ${Math.abs(t.h - next.h)} > ${limit} at (${u}, ${v})`);
          }
        }
      }
  }
});

test('steep hills: elevated archer perches are climbable only from the south ramp and have sheer cliffs on the front/sides', () => {
  const { w, d } = SCENARIO_SIZE;
  for (const theme of SCENARIOS) {
    const p = planScenario(42, theme, 5, () => false);
    for (const section of p.sections) {
      const b = section.board;
      const perches: [number, number][] = [];
      const ramps: [number, number][] = [];
      for (let v = 0; v < d; v++) {
        for (let u = 0; u < w; u++) {
          const t = tileAt(b, u, v)!;
          if (t.perch) perches.push([u, v]);
          if (t.ramp) ramps.push([u, v]);
        }
      }
      assert.ok(perches.length >= 6, `${theme} has elevated perch tiles`);
      assert.ok(ramps.length >= 1, `${theme} has access ramp`);

      // Verify that every perch tile has sheer cliffs on north face: cannot be climbed from low ground
      for (const [pu, pv] of perches) {
        const pt = tileAt(b, pu, pv)!;
        const north = tileAt(b, pu, pv - 1);
        if (north && !north.perch && !north.ramp && standable(north)) {
          if (canStep(north, pt, RAMP) !== null) {
            console.log(`Failed at (${pu}, ${pv}): pt.h=${pt.h}, north.h=${north.h}`);
          }
          assert.equal(canStep(north, pt, RAMP), null, `front cliff at (${pu}, ${pv}) should be unsteppable from north`);
        }
      }

      // Verify that the ramp provides a valid jump-1 climb onto the perch
      for (const [ru, rv] of ramps) {
        const rt = tileAt(b, ru, rv)!;
        const south = tileAt(b, ru, rv + 1)!;
        const north = tileAt(b, ru, rv - 1)!;
        assert.ok(canStep(south, rt, RAMP) !== null, `ramp at (${ru}, ${rv}) should be steppable from south`);
        assert.ok(canStep(rt, north, RAMP) !== null, `perch should be steppable from ramp`);
      }

      // Archer high ground advantage: extra range and clear line of sight over the low valley
      const [pu, pv] = perches[0];
      const pt = tileAt(b, pu, pv)!;
      const lowTarget = tileAt(b, pu, pv - 4);
      if (lowTarget) {
        assert.ok(pt.h > lowTarget.h);
        const reach = shotReach(3, pt.h, lowTarget.h);
        assert.ok(reach > 3, 'archer gains bonus reach from high ground perch');
        assert.ok(sightClear(b, { u: pu, v: pv }, { u: pu, v: pv - 4 }), 'archer has clear line of sight');
      }
    }
  }
});
