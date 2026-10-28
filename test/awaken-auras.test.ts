import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AURAS, AURA_SHEETS, auraOf, auraParts, FALLBACK_AURA } from '../src/render/auraStyles';
import { HERO_TRAITS, TRAITS } from '../src/sim/traits';
import { ALL_HEROES } from '../src/sim/units';
import atlas from '../src/art/fx/aura/atlas.json';

test('every class trait has its own aura, and every hero wears its class trait\'s', () => {
  const classes = Object.values(TRAITS).filter((t) => t.kind === 'class').map((t) => t.id);
  assert.deepEqual(Object.keys(AURAS).sort(), [...classes].sort());
  for (const kind of ALL_HEROES) assert.equal(auraOf(kind).trait, HERO_TRAITS[kind][1], kind);
  assert.equal(auraOf('noSuchHero').trait, FALLBACK_AURA);
  // (the styles differ: no two classes share a name or the same parts)
  const looks = Object.values(AURAS).map((a) => JSON.stringify(a.steps));
  assert.equal(new Set(looks).size, looks.length);
});

test('no aura below the first step; the second step is bigger and has more to it', () => {
  for (const [id, a] of Object.entries(AURAS)) {
    assert.equal(auraParts(id === 'guardian' ? 'knight' : Object.keys(HERO_TRAITS).find((k) => HERO_TRAITS[k][1] === id)!, 0).length, 0);
    const one = a.steps[1];
    const two = a.steps[2];
    assert.ok(one.length >= 2, `${id} step 1`);
    const count = (s: typeof one) => s.reduce((n, p) => n + (p.count ?? 1), 0);
    assert.ok(count(two) > count(one), `${id} step 2 has more parts`);
    assert.ok(Math.max(...two.map((p) => p.size)) > Math.max(...one.map((p) => p.size)) - 1e-9, `${id} step 2 is no smaller`);
  }
});

test('battery saver only drops the extra parts, and every strip is in the atlas', () => {
  for (const kind of ALL_HEROES) {
    const full = auraParts(kind, 2);
    const saver = auraParts(kind, 2, true);
    assert.deepEqual(saver, full.filter((p) => !p.extra));
    assert.ok(saver.length >= 2, kind);
  }
  for (const s of AURA_SHEETS) assert.ok(s in atlas, s);
});
