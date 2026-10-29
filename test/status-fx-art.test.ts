// STATUS-FX phase A: the ailments' look table and its art seam (docs/notes/status-fx.md, status-fx-art-brief.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AILMENTS, STATUS_KEYS, STATUS_STYLES, maxBodyFx } from '../src/render/statusStyles';
import pack from '../tools/status-fx/status-pack.json';
import atlas from '../src/art/fx/status/atlas.json';

test('all eleven ailments have a look: a body part, an icon, and a number colour for those that deal damage', () => {
  assert.equal(AILMENTS.length, 11);
  for (const a of AILMENTS) {
    const s = STATUS_STYLES[a];
    assert.ok(s.parts.icon, `${a} icon`);
    assert.ok(Object.keys(s.parts).some((p) => p !== 'icon' && p !== 'burst'), `${a} body part`);
    // (the battery saver keeps at least one body part of each)
    assert.ok(Object.entries(s.parts).some(([p, part]) => p !== 'icon' && p !== 'burst' && !part.saver), `${a} keeps a part on the saver`);
  }
  for (const a of ['burn', 'poison', 'freeze', 'bleed', 'shock', 'curse'] as const) assert.ok(STATUS_STYLES[a].number !== undefined, `${a} number colour`);
  // (the damage colours are told apart)
  const colours = AILMENTS.map((a) => STATUS_STYLES[a].number).filter((c) => c !== undefined);
  assert.equal(new Set(colours).size, colours.length);
  assert.ok(maxBodyFx(true) < maxBodyFx(false));
});

test('the atlas holds every part, and the importer reads the sheets in the table\'s order', () => {
  const parts = (atlas as { parts: Record<string, number[]> }).parts;
  for (const key of STATUS_KEYS) {
    assert.ok(parts[key], `${key} is in the atlas`);
    assert.ok(parts[key][2] >= 1, `${key} has frames`);
  }
  // (tools/status-fx/status-pack.json is the importer's row order: the same keys, in the same order, as the table)
  assert.deepEqual(Object.keys(pack), [...STATUS_KEYS]);
});
