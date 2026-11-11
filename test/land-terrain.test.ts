// LAND-IDENTITY, the terrain proposal (`src/sim/landTerrain.ts`): a land's own ground laid thicker. A rule of the fight, so it is behind
// its own switch (off: every fight is as it was) and laid from its own side stream.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, boardOk, DEPLOY_ROWS, makeBoard, standable } from '../src/sim/board';
import { startBattle } from '../src/sim/battle';
import { FLOODS, LAND_TERRAIN, layLandTerrain } from '../src/sim/landTerrain';

/** Play `run` with the switch set, and put it back as it was. */
const withSwitch = <T>(on: boolean, run: () => T): T => {
  const was = LAND_TERRAIN.on;
  LAND_TERRAIN.on = on;
  try {
    return run();
  } finally {
    LAND_TERRAIN.on = was;
  }
};
const flooded = <T>(run: () => T): T => withSwitch(true, run);
const dry = <T>(run: () => T): T => withSwitch(false, run);

test('the switch is on (the owner\'s call, 2026-11-11); with it off nothing is laid, and a fight\'s board is the board as it was', () => {
  assert.equal(LAND_TERRAIN.on, true);
  for (const area of AREAS)
    for (let seed = 1; seed <= 6; seed++) {
      const b = makeBoard(seed, area);
      const before = JSON.stringify(b);
      assert.deepEqual(dry(() => layLandTerrain(b, seed)), []);
      assert.equal(JSON.stringify(b), before);
      assert.equal(JSON.stringify(dry(() => startBattle(seed, 'skeletons', { area }).board)), before, `${area} ${seed}`);
    }
  // (and with it on, a fight on the mire is fought on the flooded board)
  let more = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const wet = (b: { tiles: { ground?: string }[] }) => b.tiles.filter((t) => t.ground === 'water').length;
    more += wet(startBattle(seed, 'skeletons', { area: 'swamp' }).board) - wet(makeBoard(seed, 'swamp'));
  }
  assert.ok(more >= 60, `${more} more shallow tiles over 20 fights on the mire`);
});

test('the mire floods: more shallow water on its lowest open ground, never deep, and every tile can still be walked to', () => {
  const flood = FLOODS.swamp!;
  let was = 0;
  let now = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const plain = makeBoard(seed, 'swamp');
    const b = makeBoard(seed, 'swamp');
    const laid = flooded(() => layLandTerrain(b, seed));
    assert.deepEqual(flooded(() => layLandTerrain(makeBoard(seed, 'swamp'), seed)), laid, 'the same seed, the same pools');
    assert.ok(laid.length <= flood.pools[1] * flood.size[1]);
    let low = Infinity;
    plain.tiles.forEach((t) => standable(t) && !t.ground && !t.bridge && !t.rock && !t.barrel && !t.brazier && !t.perch && !t.ramp && (low = Math.min(low, t.h)));
    b.tiles.forEach((t, i) => {
      const old = plain.tiles[i];
      if (!laid.includes(i)) return assert.deepEqual(t, old, 'only the pools\' tiles change');
      // (a pool lies on what was plain, open, low ground; it is shallow, and only the ground and the bush on it change)
      assert.equal(t.ground, 'water');
      assert.ok(standable(old) && !old.ground && !old.rock && !old.bridge && !old.barrel && !old.brazier);
      assert.ok(old.h <= low + flood.over, `a pool at height ${old.h}, the low ground at ${low}`);
      assert.equal(t.h, old.h);
    });
    assert.ok(boardOk(b), `seed ${seed}: the flooded board can be walked`);
    assert.ok(!b.tiles.some((t, i) => t.ground === 'deep' && plain.tiles[i].ground !== 'deep'), 'no new deep water');
    const open = b.tiles.filter((t) => standable(t)).length;
    const wet = b.tiles.filter((t) => t.ground === 'water').length;
    // (never more than the land's cap, unless the board was already wetter than that)
    assert.ok(wet / open <= Math.max(flood.most, plain.tiles.filter((t) => t.ground === 'water').length / open) + 1e-9);
    was += plain.tiles.filter((t) => t.ground === 'water').length;
    now += wet;
  }
  assert.ok(now >= was * 1.6 && now <= was * 3, `${was} shallow tiles as it is, ${now} flooded, over 120 boards`);
});

test('each land\'s own flag: the mire and the snows are on, the ashlands and the highlands are off; the other lands, a board with scenery and a big field are left as they are', () => {
  assert.deepEqual(Object.keys(FLOODS).sort(), ['highlands', 'snow', 'swamp', 'volcano']);
  // (what the measure allowed, docs/notes/land-identity.md: a land ships on only within noise overall and with no band moved by more than about 8 points)
  assert.deepEqual(Object.entries(FLOODS).map(([a, f]) => [a, f.kind, f.on]).sort(), [['highlands', 'rock', false], ['snow', 'ice', true], ['swamp', 'water', true], ['volcano', 'lava', false]]);
  for (const area of AREAS) {
    if (FLOODS[area]?.on) continue;
    const b = makeBoard(5, area);
    const before = JSON.stringify(b);
    assert.deepEqual(flooded(() => layLandTerrain(b, 5)), [], area);
    assert.equal(JSON.stringify(b), before);
    assert.equal(JSON.stringify(flooded(() => startBattle(5, 'orcs', { area }).board)), before, `${area}: a fight there is on the board as it was`);
  }
  const big = makeBoard(5, 'swamp', 24, 24);
  assert.deepEqual(flooded(() => layLandTerrain(big, 5)), []);
});

test('ice on the snows, and (were they on) lava in the ashlands and boulders in the highlands: each laid on plain open ground, lava and boulders in the middle ground only, and every tile can still be walked to', () => {
  for (const area of ['snow', 'volcano', 'highlands'] as const) {
    const flood = FLOODS[area]!;
    const was = flood.on;
    flood.on = true;
    try {
      let before = 0;
      let after = 0;
      for (let seed = 1; seed <= 100; seed++) {
        const plain = makeBoard(seed, area);
        const b = makeBoard(seed, area);
        const laid = flooded(() => layLandTerrain(b, seed));
        assert.deepEqual(flooded(() => layLandTerrain(makeBoard(seed, area), seed)), laid, 'the same seed, the same patches');
        const is = (t: { ground?: string; rock?: boolean }) => (flood.kind === 'rock' ? !!t.rock : t.ground === flood.kind);
        b.tiles.forEach((t, i) => {
          const old = plain.tiles[i];
          if (!laid.includes(i)) return assert.deepEqual(t, old, 'only the patches\' tiles change');
          assert.ok(is(t) && !is(old), `${area}: a patch of ${flood.kind}`);
          assert.ok(standable(old) && !old.ground && !old.rock && !old.bridge && !old.barrel && !old.brazier && !old.perch && !old.ramp, 'on what was plain open ground');
          assert.equal(t.h, old.h);
          const v = Math.floor(i / b.w);
          // (lava and boulders keep out of both sides' rows, as the board's own do)
          if (flood.kind !== 'ice') assert.ok(v >= DEPLOY_ROWS && v <= b.d - 1 - DEPLOY_ROWS, `${area}: ${flood.kind} in row ${v}`);
        });
        assert.ok(boardOk(b), `${area} ${seed}: the board can be walked`);
        const stands = (t: (typeof b.tiles)[number]): boolean => standable(t);
        const open = b.tiles.filter((t) => stands(t) || (flood.kind === 'rock' && !!t.rock)).length;
        assert.ok(b.tiles.filter(is).length / open <= Math.max(flood.most, plain.tiles.filter(is).length / open) + 1e-9);
        before += plain.tiles.filter(is).length;
        after += b.tiles.filter(is).length;
      }
      assert.ok(after >= before * 1.8 && after <= before * 5, `${area}: ${before} tiles of ${flood.kind} as it is, ${after} laid thicker, over 100 boards`);
    } finally {
      flood.on = was;
    }
  }
});

test('flooding draws from its own side stream: a flooded fight has the same foes in the same places and the same stream as it had', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const was = dry(() => startBattle(seed, 'orcs', { area: 'swamp' }));
    const wet = flooded(() => startBattle(seed, 'orcs', { area: 'swamp' }));
    assert.equal(wet.rng, was.rng);
    assert.equal(wet.skillRng, was.skillRng);
    assert.deepEqual(wet.units.map((x) => [x.def, x.u, x.v]), was.units.map((x) => [x.def, x.u, x.v]));
    // (and off the mire a flooded fight is the fight as it was)
    assert.equal(JSON.stringify(flooded(() => startBattle(seed, 'orcs', { area: 'plains' }))), JSON.stringify(dry(() => startBattle(seed, 'orcs', { area: 'plains' }))));
  }
});
