import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { AWAKEN_ORES, BOSS_ORES, ORES, ORE_TRAITS, ascOres, bossOres, cacheOres, eliteOres, oreOf } from '../src/sim/awakenMats';
import { AURAS } from '../src/render/auraStyles';
import { HERO_TRAITS, TRAITS } from '../src/sim/traits';
import { ALL_HEROES } from '../src/sim/units';

test('every class trait has its own ore, in its aura colour, with an icon', () => {
  const classes = Object.values(TRAITS).filter((t) => t.kind === 'class').map((t) => t.id);
  assert.deepEqual([...ORE_TRAITS].sort(), [...classes].sort());
  assert.equal(new Set(ORE_TRAITS.map((t) => ORES[t].name)).size, ORE_TRAITS.length, 'names differ');
  for (const t of ORE_TRAITS) {
    assert.equal(ORES[t].colour, AURAS[t].colour, t);
    assert.ok(existsSync(`src/art/ui/ore/${ORES[t].icon}`), t);
  }
  for (const kind of ALL_HEROES) assert.equal(oreOf(kind)?.trait, HERO_TRAITS[kind][1], kind);
});

test('the drops are deterministic, of the heroes who fought, and grow with the ascension', () => {
  const kinds = ['knight', 'paladin', 'samurai'];
  for (let map = 1; map <= 6; map++) {
    const a = bossOres(42, map, 0, kinds);
    assert.deepEqual(a, bossOres(42, map, 0, kinds));
    assert.ok(['guardian', 'blade'].includes(a.trait), a.trait);
    assert.equal(a.n, BOSS_ORES[map - 1]);
    assert.ok(bossOres(42, map, 10, kinds).n >= a.n);
  }
  assert.deepEqual(eliteOres(7, 2, 1, 0), eliteOres(7, 2, 1, 0));
  assert.ok(ORE_TRAITS.includes(eliteOres(7, 2, 1, 0).trait));
  assert.equal(ascOres(2, 0), 2);
  assert.equal(cacheOres(10), 16);
  assert.deepEqual([...AWAKEN_ORES], [10, 20]);
});
