import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AURAS, AURA_KEYS, auraKey, auraOf, auraParts, FALLBACK_AURA, FOE_AURA } from '../src/render/auraStyles';
import { newPose, poseAura } from '../src/render/auraPlace';
import pack from '../tools/awaken/aura-pack.json';
import { HERO_TRAITS, TRAITS } from '../src/sim/traits';
import { ALL_HEROES } from '../src/sim/units';
import atlas from '../src/art/fx/aura/atlas.json';

test('every class trait has its own aura, and every hero wears its class trait\'s', () => {
  const classes = Object.values(TRAITS).filter((t) => t.kind === 'class').map((t) => t.id);
  assert.deepEqual(Object.keys(AURAS).sort(), [...classes].sort());
  for (const kind of ALL_HEROES) assert.equal(auraOf(kind).trait, HERO_TRAITS[kind][1], kind);
  assert.equal(auraOf('orcWarlord').trait, FOE_AURA, 'a foe shown awakened in a scene');
  assert.ok(AURAS[FALLBACK_AURA]);
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
  // (the art seam: every part's key is in the atlas, with frames, and in the pack's map that built it)
  const parts = (atlas as { cell: number; parts: Record<string, number[]> }).parts;
  assert.ok((atlas as { cell: number }).cell > 0);
  for (const k of AURA_KEYS) {
    assert.ok(parts[k] && parts[k].length === 3 && parts[k][2] > 0, k);
    assert.ok(k in pack, k);
  }
  assert.equal(new Set(AURA_KEYS).size, AURA_KEYS.length, 'part names are unique within a step');
  assert.equal(auraParts('knight', 1)[0].key, auraKey('guardian', 1, 'ground'));
});

test('placing a part reuses the caller\'s pose, stays in its strip, and holds still under reduced motion', () => {
  const pose = newPose();
  for (const kind of ['wizard', 'samurai', 'werewolf', 'ranger', 'priestess', 'lancer']) {
    for (const part of auraParts(kind, 2)) {
      for (let i = 0; i < (part.count ?? 1); i++) {
        const a = poseAura(part, i, 8, 1234, 40, 1, false, 32, pose);
        assert.equal(a, pose);
        assert.ok(a.frame >= 0 && a.frame < 8 && Number.isFinite(a.x) && Number.isFinite(a.y) && a.alpha > 0, `${kind} ${part.key}`);
        const s1 = { ...poseAura(part, i, 8, 100, 40, 1, true, 32, pose) };
        const s2 = { ...poseAura(part, i, 8, 5100, 40, 1, true, 32, pose) };
        assert.deepEqual(s1, s2, `${kind} ${part.key} still`);
        assert.ok(s1.alpha > 0, 'never hidden');
      }
    }
  }
});
