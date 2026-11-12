// ULT-AUDIT (docs/notes/ult-audit.md): an ultimate's effect must show what the ability does. The owner's report (2026-11-12): Spirit
// Guardians no longer showed guardians circling the Cleric. They were still drawn, but 0.6 of a tile tall and thin, lost under everything
// else. This holds what was restored: the spirits are a fighter's size, several, circling her out past her own body, for as long as the
// aura lasts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../src/sim/battle';
import { AURA_MOTES } from '../src/render/movePaints';
import { auraLook } from '../src/render/toolkitLooks';

test('Spirit Guardians shows its guardians: spirits a fighter tall circling the Cleric for as long as the aura lasts', () => {
  const look = auraLook('Spirit Guardians');
  assert.equal(look.paint, 'spirit-guardians');
  const own = AURA_MOTES[look.paint!];
  assert.ok(own, 'the spirits have their own size and ring');
  // (the painted spirit is 0.6 of a tile: at 2.2 times it is about a fighter's height)
  assert.ok(own.mult * 0.6 >= 1.2, `a spirit is ${own.mult * 0.6} tiles tall`);
  assert.ok(own.n >= 4 && own.saver >= 3, 'four of them, three on the battery saver: still a ring of guardians');
  assert.ok(own.r >= 1 && own.r <= 2, 'they circle outside her own body, inside the aura');
  // (they are the aura's own loop: drawn while the aura lives, turning unless motion is reduced, over the fighters)
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /const own = AURA_MOTES\[sheet\];/);
  assert.match(fx, /\}, live, \{ tint: o\.tint, \.\.\.\(own \? \{ mult: own\.mult, depthOf: \(\) => 9999 \} : \{\}\) \}\);/);
  assert.match(fx, /this\.reduced \? 0 : \(performance\.now\(\) - born\) \/ \(own\?\.turn \?\? 1400\)/);
});
