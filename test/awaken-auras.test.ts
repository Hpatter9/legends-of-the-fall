import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AURAS, AURA_KEYS, PLAIN_KEYS, auraKey, auraOf, auraParts, gradeParts, guardParts, levelParts, markParts, FALLBACK_AURA, FOE_AURA } from '../src/render/auraStyles';
import { newPose, poseAura } from '../src/render/auraPlace';
import { HERO_TRAITS, TRAITS } from '../src/sim/traits';
import { ALL_HEROES } from '../src/sim/units';
import atlas from '../src/art/fx/aura/atlas.json';
import { AURA_PIXEL } from '../src/render/auraArt';

test('the rendered aura strips are small soft-edged transparent cells and fit without overlap', () => {
  const png = readFileSync('src/art/fx/aura/atlas.png');
  // (colour type 3 with its own alpha for each colour, or 6: either keeps graded transparency; the builder packs the first, a third the size)
  assert.ok(png[25] === 3 || png[25] === 6, 'the artwork keeps its transparency');
  assert.ok(png[25] !== 3 || png.includes(Buffer.from('tRNS')), 'a paletted atlas carries its alpha');
  // (AURAS-BLENDER: the atlas is rendered in Blender with soft edges and sampled smoothly; the painted one it replaced had 96 px cells and was 6.3 MB)
  assert.equal(atlas.cell, 48, 'small cells');
  assert.equal(AURA_PIXEL, false, 'soft-edged strips are sampled smoothly in both renderers');
  assert.ok(png.length < 400_000, 'the whole atlas stays small');
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  assert.ok(width <= 4096 && height <= 4096, 'fits mobile texture limits');
  const occupied = new Set<string>();
  assert.deepEqual(Object.keys(atlas.parts).sort(), [...AURA_KEYS, ...PLAIN_KEYS].sort());
  for (const [key, [x, y, frames]] of Object.entries(atlas.parts)) {
    assert.equal(frames, 8, `${key} has a complete animation loop`);
    assert.ok((x + frames) * atlas.cell <= width && (y + 1) * atlas.cell <= height, key);
    for (let i = 0; i < frames; i++) {
      const at = `${x + i}:${y}`;
      assert.ok(!occupied.has(at), `${key} does not overlap another strip`);
      occupied.add(at);
    }
  }
});

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
  // (the art seam: every part's key is in the atlas, with frames, and has a recipe in the builder that rendered it)
  const builder = readFileSync('tools/blender-fx/auras/build.py', 'utf8');
  const parts = (atlas as { cell: number; parts: Record<string, number[]> }).parts;
  assert.ok((atlas as { cell: number }).cell > 0);
  for (const k of AURA_KEYS) {
    assert.ok(parts[k] && parts[k].length === 3 && parts[k][2] > 0, k);
    assert.ok(builder.includes(`${k.split('.')[0]}=klass(`), k);
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

test('AURAS-BLENDER: nothing of an aura is drawn in front of the body, and the shell behind it is added light', () => {
  // (the owner's rule: an effect never hides a hero. The ring lies under the feet; the rest stands behind the body and shows round it)
  for (const [id, a] of Object.entries(AURAS)) {
    for (const part of [...a.steps[1], ...a.steps[2]]) assert.ok(!part.front, `${id} ${part.role}`);
    for (const step of [1, 2] as const) {
      assert.equal(a.steps[step][0].place, 'ground', `${id} step ${step} begins with its ring on the ground`);
      assert.ok(a.steps[step].some((p) => p.place === 'rise'), `${id} step ${step} has wisps rising`);
    }
    for (const step of [1, 2] as const) {
      const shell = a.steps[step].find((p) => p.role === 'shell');
      assert.ok(shell?.add && shell.place === 'wrap', `${id} wears a shell of added light at step ${step}`);
    }
    assert.ok(a.steps[2].find((p) => p.role === 'shell')!.alpha > a.steps[1].find((p) => p.role === 'shell')!.alpha, `${id}'s strong shell is the brighter`);
  }
  // (a hero that wears a rendered aura has no code-drawn halo behind it and no code-drawn sparkles over it)
  const view = readFileSync('src/render/unitView.ts', 'utf8');
  assert.ok(!/this\.glow\.ellipse|this\.aura\.ellipse|this\.mark\.ellipse|g\.star\(x, -this\.tall/.test(view), 'no halo, ring or rising star is drawn in code');
});

test('AURAS-BLENDER: a level\'s rings, a summon\'s ring and a higher grade\'s glow are plain rendered strips, tinted, under or behind the body', () => {
  const all = [...levelParts(3, true, 0xffb878), ...markParts(0x6cd060), ...gradeParts(4, 0xb06aff)];
  for (const part of all) {
    assert.ok(PLAIN_KEYS.includes(part.key), part.key);
    assert.ok(!part.front, `${part.key} is never in front of the body`);
    assert.ok(part.tint !== undefined, `${part.key} takes its colour`);
    assert.ok(['ground', 'wrap', 'rise'].includes(part.place));
  }
  // (none below the first milestone or the second grade; more rings higher up, a glow only from the halo's tier)
  assert.deepEqual(levelParts(0, false, 0), []);
  assert.deepEqual(gradeParts(1, 0xffffff), []);
  assert.equal(levelParts(1, false, 1).length, 1);
  assert.equal(levelParts(1, false, 1)[0].key, 'plain.ring1');
  assert.equal(levelParts(3, true, 1)[0].key, 'plain.ring3');
  assert.equal(levelParts(3, true, 1).length, 2);
  // (a summon of grade 2 glows; from grade 3 its motes rise, behind it, and are dropped on battery saver)
  assert.deepEqual(gradeParts(2, 1).map((x) => x.key), ['plain.shell']);
  assert.deepEqual(gradeParts(3, 1).map((x) => x.key), ['plain.shell', 'plain.rise']);
  assert.deepEqual(gradeParts(3, 1, true).map((x) => x.key), ['plain.shell']);
  assert.ok(gradeParts(4, 1)[0].alpha > gradeParts(2, 1)[0].alpha);
  const view = readFileSync('src/render/unitView.ts', 'utf8');
  assert.match(view, /\.\.\.\(this\.awakenAura \? \[\] : gradeParts\(/);
  assert.match(view, /this\.plainAura\.update\(t, this\.tall \/ this\.sizeNow, dx, !!this\.reduced\?\.matches\)/);
});

test('AURAS-BLENDER: a raised guard is hoops at the feet and a shell behind the body, from the plain strips, shown only while it is up', () => {
  const parts = guardParts();
  assert.deepEqual(parts.map((x) => [x.key, x.place]), [['plain.ring2', 'ground'], ['plain.shell', 'wrap']]);
  for (const part of parts) assert.ok(!part.front && part.tint !== undefined);
  const view = readFileSync('src/render/unitView.ts', 'utf8');
  assert.match(view, /this\.guardAura\.back\.visible = guarded;\n\s+if \(guarded\) this\.guardAura\.update\(t, this\.tall \/ this\.sizeNow, 1, !!this\.reduced\?\.matches\);/);
  assert.ok(!/VFX\.earthShield/.test(view), 'the painted ring is not drawn on a fighter any more');
});
