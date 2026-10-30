import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanAtlasCell } from '../src/render/atlasCell';
import { KITS, keyOf } from '../src/sim/abilities';
import { SPELL_IDS } from '../src/sim/spells';
import { SIGNATURES } from '../src/render/signatures';
import { SPELL_SIGNATURES } from '../src/render/spellSignatures';
import { ABILITY_ART, ABILITY_LOOKS, abilitySource, shapeFamily } from '../src/render/abilityLooks';
import { FORMS, PALETTE, formOf, type PaintedElement } from '../src/render/cinematicRules';
import type { Family } from '../src/render/fxRules';

const atlas = JSON.parse(readFileSync('src/art/fx/pack/atlas.json', 'utf8')) as Record<string, number[]>;

test('every actual hero, ultimate, enemy skill and king spell has individual authored artwork', () => {
  const names = new Set(Object.values(KITS).flatMap(k => [keyOf(k.skill), ...(k.ultimate ? [keyOf(k.ultimate)] : [])]));
  assert.equal(names.size, 108);
  const expected = [...names].map(n => `skill:${n}`).concat(SPELL_IDS.map(id => `spell:${id}`));
  assert.equal(expected.length, 129);
  assert.deepEqual(Object.keys(ABILITY_LOOKS).sort(), expected.sort());
  assert.equal(new Set(ABILITY_ART.map(row => row.id)).size, expected.length);
  assert.equal(new Set(ABILITY_ART.map(row => abilitySource(row.id))).size, expected.length, 'different names must resolve to different source cells');
  assert.equal(new Set(ABILITY_ART.map(row => row.motif)).size, expected.length);
});

test('individual artwork is actually attached to every release and hit, without a colour-swap tint', () => {
  for (const [name, look] of Object.entries(SIGNATURES)) {
    for (const steps of [look.cast, look.hit]) {
      assert.equal(steps[0].art, `skill:${name}`);
      assert.ok(abilitySource(steps[0].art!));
      assert.equal(steps[0].t, undefined);
      assert.ok(shapeFamily(steps[0].s));
    }
    assert.ok(look.cast[0].z! >= 1.5, name);
  }
  for (const id of SPELL_IDS) {
    for (const steps of [SPELL_SIGNATURES[id].cast, SPELL_SIGNATURES[id].hit]) assert.equal(steps[0].art, `spell:${id}`);
  }
});

test('the king spells have different release geometry as well as different paintings', () => {
  const shapes = SPELL_IDS.map(id => SPELL_SIGNATURES[id].cast[0].s);
  assert.equal(new Set(shapes).size, SPELL_IDS.length);
  assert.notEqual(abilitySource('skill:Meteor'), abilitySource('spell:meteor'));
  assert.notEqual(abilitySource('skill:Chain Lightning'), abilitySource('spell:chain'));
  assert.notEqual(abilitySource('skill:Starfall'), abilitySource('spell:starfall'));
  assert.notEqual(abilitySource('skill:Earthquake'), abilitySource('spell:quake'));
  assert.notEqual(abilitySource('skill:Hex'), abilitySource('spell:hex'));
});

test('the shipping source cells exist and use bounded transparent atlases', () => {
  for (const row of ABILITY_ART) {
    const png = readFileSync(`src/art/fx/abilities/atlas-${row.atlas}.png`);
    const size = row.atlas === 8 ? 256 : 768;
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[25], 6);
    assert.ok(row.cell >= 0 && row.cell < (row.atlas === 8 ? 1 : 16));
  }
});

test('all resolved supporting elements have a real palette, including moon, star and water', () => {
  for (const name of Object.keys(atlas)) {
    const [element, family] = name.split('-') as [PaintedElement, Family];
    assert.ok(PALETTE[element] > 0, `${name} needs a palette`);
    assert.ok(FORMS.includes(formOf(element, family)), name);
  }
});

test('cell extraction removes a detached neighbour fragment while retaining central detail and nearby sparks', () => {
  const w = 64;
  const pixels = new Uint8ClampedArray(w * w * 4);
  const fill = (x: number, y: number, width: number, height: number) => {
    for (let dy = y; dy < y + height; dy++) for (let dx = x; dx < x + width; dx++) pixels[(dy * w + dx) * 4 + 3] = 255;
  };
  fill(20, 20, 24, 24); // Main painting.
  fill(25, 4, 6, 1); // Thin row from the cell above, as seen in the first contact sheets.
  fill(46, 30, 2, 2); // Intended nearby sparkle.
  fill(2, 14, 5, 18); // A larger clipped sliver of the adjacent painting.
  cleanAtlasCell(pixels, w);
  assert.equal(pixels[(4 * w + 27) * 4 + 3], 0);
  assert.equal(pixels[(20 * w + 4) * 4 + 3], 0);
  assert.equal(pixels[(30 * w + 30) * 4 + 3], 255);
  assert.equal(pixels[(30 * w + 46) * 4 + 3], 255);
});
