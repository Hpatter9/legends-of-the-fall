import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KITS, keyOf } from '../src/sim/abilities';
import { SKILL_FX, SPELL_FX } from '../src/render/skillFx';

test('every hero and foe skill has an effect of its own', () => {
  for (const kit of Object.values(KITS)) {
    const fx = SKILL_FX[keyOf(kit.skill)];
    assert.ok(fx, `no effect for ${keyOf(kit.skill)}`);
    assert.ok(fx.cast || fx.hit, `${keyOf(kit.skill)} shows nothing`);
  }
});

test('no effect names a skill that is not in the kits', () => {
  const names = new Set(Object.values(KITS).flatMap((k) => [keyOf(k.skill), ...(k.ultimate ? [keyOf(k.ultimate)] : [])]));
  for (const name of Object.keys(SKILL_FX)) assert.ok(names.has(name), `${name} is not a skill`);
});

test('the king\'s heal and haste have sheets, and the sizes are sane', () => {
  for (const fx of [SPELL_FX.heal, SPELL_FX.haste, ...Object.values(SKILL_FX).flatMap((f) => [f.cast, f.hit])]) {
    if (!fx) continue;
    assert.ok(fx.scale > 0 && fx.scale <= 3, `scale ${fx.scale} for ${fx.sheet}`);
  }
});
