// The Calamity's battle zones (CAL-ZONES, docs/notes/calamity-zones.md): six shapes of the Calamity's own laid on a portal court's
// inner field, each walkable end to end, its deploy rows clear, the same for the same seed, and picked by seed, world and land.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, canStep, DEPLOY_ROWS, makeBoard, solid, standable, tileAt, type Board } from '../src/sim/board';
import { ZONE_IDS, ZONE_INFO, zoneFor, type ZoneId } from '../src/sim/calZones';
import { layoutFor, LAYOUT_IDS } from '../src/sim/layouts';
import { destinationBoard, WORLD_IDS, WORLDS } from '../src/sim/sanctuary';
import { fight, place, startBattle, stepBattle } from '../src/sim/battle';
import { calamityRun } from '../src/sim/modes';
import { startedMeta } from '../src/sim/meta';
import { choices, enterNode } from '../src/sim/tower';

const IW = 10;
const D = 13;
const count = (b: Board, f: (t: Board['tiles'][number]) => boolean) => b.tiles.filter(f).length;
/** Every tile a walker who climbs one level reaches from (u, v). */
function reach(b: Board, u: number, v: number): Set<number> {
  const start = v * b.w + u;
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const i = queue.shift()!;
    const x = i % b.w;
    const y = Math.floor(i / b.w);
    for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = tileAt(b, x + du, y + dv);
      const j = (y + dv) * b.w + x + du;
      if (n && !seen.has(j) && canStep(b.tiles[i], n, 1) !== null) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen;
}

test('every zone lays on the Calamity board in every world\'s land: walkable end to end, the deploy rows clear, the same each time', () => {
  for (const zone of ZONE_IDS)
    for (const world of WORLD_IDS) {
      let took = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const b = makeBoard(seed * 7919, WORLDS[world].area, IW, D, zone);
        assert.ok(boardOk(b), `${zone} ${world} ${seed}`);
        for (let u = 0; u < IW; u++) for (const v of [0, 1, 2, D - 3, D - 2, D - 1]) assert.ok(standable(tileAt(b, u, v)) && !tileAt(b, u, v)!.barrel, `${zone} ${world} ${seed}: deploy ${u},${v}`);
        assert.deepEqual(b, makeBoard(seed * 7919, WORLDS[world].area, IW, D, zone), `${zone} is not repeatable`);
        if (b.layout === zone) took++;
      }
      assert.ok(took >= 29, `${zone} in ${world} took ${took} of 30`);
    }
});

test('each zone has its own shape, and its tall things stand only on tiles nobody stands on', () => {
  const shape: Record<ZoneId, (b: Board) => boolean> = {
    nave: (b) => count(b, (t) => !!t.wall) >= 3 && Math.max(...b.tiles.map((t) => t.h)) >= 3,
    cavern: (b) => count(b, (t) => !!t.chasm) >= 6,
    crypt: (b) => (b.props ?? []).filter((p) => p.kind === 'coffin').length >= 6,
    voidBridge: (b) => count(b, (t) => !!t.chasm) >= 20 && count(b, (t) => !!t.bridge) >= 3,
    ritual: (b) => count(b, (t) => !!t.wall) >= 4 && (b.props ?? []).filter((p) => p.kind === 'rune').length >= 8,
    floodVault: (b) => count(b, (t) => t.ground === 'water') >= 20 && count(b, (t) => t.h === 2) >= 6,
  };
  const TALL = new Set(['pillar', 'statue', 'brazier', 'crystal', 'totem', 'coffin', 'brokenPillar', 'chain', 'banner']);
  for (const zone of ZONE_IDS)
    for (let seed = 1; seed <= 20; seed++) {
      const b = makeBoard(seed * 131, 'dungeon', IW, D, zone);
      assert.equal(b.layout, zone);
      assert.ok(shape[zone](b), `${zone} ${seed}`);
      assert.ok(ZONE_INFO[zone].name && ZONE_INFO[zone].text);
      for (const p of b.props ?? []) {
        const t = tileAt(b, p.u, p.v)!;
        assert.ok(t, `${zone} ${seed}: a ${p.kind} off the board`);
        if (TALL.has(p.kind)) assert.ok(solid(t), `${zone} ${seed}: a ${p.kind} on open ground at ${p.u},${p.v}`);
        assert.ok(p.v >= DEPLOY_ROWS - 1 && p.v <= D - DEPLOY_ROWS, `${zone} ${seed}: a ${p.kind} in the deploy rows`);
      }
    }
});

test('a portal court in a zone: every hero deploy tile reaches every foe deploy tile, and a full band and party stand on open ground', () => {
  for (const world of WORLD_IDS)
    for (let seed = 1; seed <= 40; seed++) {
      const b = destinationBoard(seed, world, 1 + (seed % 3));
      assert.ok(boardOk(b), `${world} ${seed}`);
      assert.deepEqual(b, destinationBoard(seed, world, 1 + (seed % 3)));
      const open = (v: number) => Array.from({ length: b.w }, (_, u) => u).filter((u) => standable(tileAt(b, u, v)));
      const from = reach(b, open(D - 1)[0], D - 1);
      for (let v = 0; v < DEPLOY_ROWS; v++) for (const u of open(v)) assert.ok(from.has(v * b.w + u), `${world} ${seed} (${b.layout}): foe tile ${u},${v} cut off`);
      for (let v = D - DEPLOY_ROWS; v < D; v++) for (const u of open(v)) assert.ok(from.has(v * b.w + u), `${world} ${seed}: hero tile ${u},${v} cut off`);
      for (const p of b.props ?? []) assert.ok(p.u >= 2 && p.u < b.w - 2, 'the zone\'s things stay on its field');
      const band = Array.from({ length: 13 }, (_, i) => (i % 2 ? 'boneArcher' : 'skeleton'));
      const fightOn = startBattle(seed, band, { board: b });
      assert.equal(fightOn.units.length, 13, `${world} ${seed}`);
      assert.ok(fightOn.units.every((u) => standable(tileAt(fightOn.board, u.u, u.v))));
    }
});

test('the zone is picked by seed, leaning by world and land; the other fights\' layouts do not move', () => {
  const seen: Record<string, Record<string, number>> = {};
  for (const world of WORLD_IDS)
    for (let s = 1; s <= 600; s++) {
      const z = zoneFor(s, world, 1);
      assert.equal(zoneFor(s, world, 1), z);
      (seen[world] ??= {})[z] = (seen[world][z] ?? 0) + 1;
    }
  for (const world of WORLD_IDS) assert.ok(Object.keys(seen[world]).length >= 5, `${world} sees ${Object.keys(seen[world]).join(', ')}`);
  for (const zone of ZONE_IDS) assert.ok(WORLD_IDS.some((w) => (seen[w][zone] ?? 0) > 60), `${zone} leads somewhere`);
  // (the Calamity's Heart leans to the void: more broken bridges than the Buried Sanctum)
  const bridges = (act: number) => WORLD_IDS.reduce((n, w) => n + Array.from({ length: 600 }, (_, s) => zoneFor(s + 1, w, act)).filter((z) => z === 'voidBridge').length, 0);
  assert.ok(bridges(3) > bridges(1) * 1.3, `${bridges(3)} against ${bridges(1)}`);
  // (no ordinary fight is laid in a zone: `layoutFor` keeps to its own shapes)
  for (let s = 1; s <= 300; s++) assert.ok((LAYOUT_IDS as readonly string[]).includes(layoutFor(s, 'dungeon')));
});

test('a fight plays out to its end on every zone', () => {
  for (const zone of ZONE_IDS)
    for (const world of WORLD_IDS.filter((w) => Array.from({ length: 400 }, (_, s) => zoneFor(s + 1, w)).includes(zone)).slice(0, 2)) {
      let seed = 1;
      while (destinationBoard(seed, world).layout !== zone && seed < 3000) seed++;
      const b = startBattle(seed, 'skeletons', { board: destinationBoard(seed, world), size: { w: 14, d: 13 } });
      assert.equal(b.board.layout, zone);
      let n = 0;
      for (let u = 2; u < 12 && n < 4; u++) if (place(b, ['knight', 'archer', 'samurai', 'wizard'][n], u, D - 1)) n++;
      assert.equal(n, 4);
      assert.ok(fight(b));
      for (let i = 0; i < 6000 && b.phase === 'fight'; i++) stepBattle(b);
      assert.notEqual(b.phase, 'fight', `${zone} in ${world}`);
    }
});

test('a portal fight entered in a run is laid in a zone of its land, the same each time it is entered', () => {
  const run = calamityRun(21, startedMeta(1), 'knight');
  assert.ok(enterNode(run, choices(run).find((n) => n.kind === 'fight')!.id));
  const board = run.tower!.cur!.fight!.stage.board!;
  assert.ok(board.layout && board.riftWorld);
  const again = calamityRun(21, startedMeta(1), 'knight');
  enterNode(again, choices(again).find((n) => n.kind === 'fight')!.id);
  assert.deepEqual(again.tower!.cur!.fight!.stage.board, board);
});
