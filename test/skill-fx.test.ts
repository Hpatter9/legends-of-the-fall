import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hasSkill, KITS, keyOf } from '../src/sim/abilities';
import { kitSignature } from '../src/render/kitLooks';
import { SPELL_FX } from '../src/render/skillFx';

// (This file checked `SKILL_FX`, a sheet for each skill's cast and hit. That table could not play: every skill has a signature,
// and the renderer read the table only for a skill with none. It is removed (docs/notes/hit-sparks.md), and these check what
// does play: the signature.)
test('every hero and foe skill has an effect of its own: a signature that shows something', () => {
  // (FOE-STYLES: a common foe's kit has no skill)
  for (const kit of Object.values(KITS).filter(hasSkill)) {
    const sig = kitSignature(keyOf(kit.skill));
    assert.ok(sig, `no effect for ${keyOf(kit.skill)}`);
    assert.ok(sig.cast.length || sig.hit?.length, `${keyOf(kit.skill)} shows nothing`);
  }
});

test('the old table is gone from the renderer, and nothing reads it', () => {
  assert.ok(!readFileSync('src/render/fx.ts', 'utf8').includes('SKILL_FX'));
  assert.ok(!/export const SKILL_FX/.test(readFileSync('src/render/skillFx.ts', 'utf8')));
});

test('the king\'s heal and haste have sheets, and the sizes are sane', () => {
  for (const fx of [SPELL_FX.heal, SPELL_FX.haste]) assert.ok(fx.scale > 0 && fx.scale <= 3, `scale ${fx.scale} for ${fx.sheet}`);
});
