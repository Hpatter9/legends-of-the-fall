// LAND-IDENTITY, the terrain proposal (`src/sim/landTerrain.ts`): a land's own ground laid thicker. A rule of the fight, so it is behind
// its own switch (off: every fight is as it was) and laid from its own side stream.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREAS, boardOk, makeBoard, standable } from '../src/sim/board';
import { startBattle } from '../src/sim/battle';
import { FLOODS, LAND_TERRAIN, layLandTerrain } from '../src/sim/landTerrain';

const flooded = <T>(run: () => T): T => {
  LAND_TERRAIN.on = true;
  try {
    return run();
  } finally {
    LAND_TERRAIN.on = false;
  }
};

test('the switch is off: nothing is laid, and a fight\'s board is the board as it was', () => {
  assert.equal(LAND_TERRAIN.on, false);
  for (const area of AREAS)
    for (let seed = 1; seed <= 6; seed++) {
      const b = makeBoard(seed, area);
      const before = JSON.stringify(b);
      assert.deepEqual(layLandTerrain(b, seed), []);
      assert.equal(JSON.stringify(b), before);
      assert.equal(JSON.stringify(startBattle(seed, 'skeletons', { area }).board), before, `${area} ${seed}`);
    }
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

test('only the mire floods; the other lands, a board with scenery and a big field are left as they are', () => {
  for (const area of AREAS) {
    if (FLOODS[area]) continue;
    const b = makeBoard(5, area);
    const before = JSON.stringify(b);
    assert.deepEqual(flooded(() => layLandTerrain(b, 5)), [], area);
    assert.equal(JSON.stringify(b), before);
  }
  assert.deepEqual(Object.keys(FLOODS), ['swamp']);
  const big = makeBoard(5, 'swamp', 24, 24);
  assert.deepEqual(flooded(() => layLandTerrain(big, 5)), []);
});

test('flooding draws from its own side stream: a flooded fight has the same foes in the same places and the same stream as it had', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const dry = startBattle(seed, 'orcs', { area: 'swamp' });
    const wet = flooded(() => startBattle(seed, 'orcs', { area: 'swamp' }));
    assert.equal(wet.rng, dry.rng);
    assert.equal(wet.skillRng, dry.skillRng);
    assert.deepEqual(wet.units.map((x) => [x.def, x.u, x.v]), dry.units.map((x) => [x.def, x.u, x.v]));
    // (and off the mire a flooded fight is the fight as it was)
    assert.equal(JSON.stringify(flooded(() => startBattle(seed, 'orcs', { area: 'plains' }))), JSON.stringify(startBattle(seed, 'orcs', { area: 'plains' })));
  }
});
