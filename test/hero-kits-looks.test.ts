// The hero kits' new skills look like something (COMBAT-002): each borrows an existing FX-003 signature (recoloured) and an element until it has its own
// painting (the FX-004 list in docs/notes/hero-kits.md); every old skill keeps its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HERO_KITS } from '../src/sim/heroKits';
import { KITS } from '../src/sim/abilities';
import { ALL_HEROES } from '../src/sim/units';
import { SIGNATURES } from '../src/render/signatures';
import { KIT_LOOKS, kitSignature } from '../src/render/kitLooks';
import { skillElement } from '../src/render/fxRules';

test('every hero kit skill has a signature to play: its own, or a borrowed one recoloured', () => {
  for (const h of ALL_HEROES) {
    for (const slot of [HERO_KITS()[h].s1, HERO_KITS()[h].s2]) {
      const name = slot.skill.name;
      const own = !!SIGNATURES[name];
      assert.ok(own || KIT_LOOKS[name], `${h}: ${name} has no look`);
      assert.ok(kitSignature(name), `${h}: ${name} plays nothing`);
      if (!own) assert.ok(skillElement(name) === KIT_LOOKS[name].el, name);
    }
    // (the old skill is the same object, so its FX-003 painting and tier skills still find it by name)
    const k = HERO_KITS()[h];
    assert.ok(k.s1.skill === KITS[h].skill || k.s2.skill === KITS[h].skill, h);
  }
  for (const [name, look] of Object.entries(KIT_LOOKS)) {
    assert.ok(SIGNATURES[look.as], `${name} borrows ${look.as}, which has no signature`);
    assert.ok(!SIGNATURES[name], `${name} has its own signature now: drop it from KIT_LOOKS`);
  }
});
