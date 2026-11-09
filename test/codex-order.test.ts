// CODEX-ORDER (docs/notes/assault-3.md): the bestiary holds the same foes whatever order the modules load in. The Assault's own pieces (its
// troops, the War-wolf, the ram) join `UNITS` when its modules are first imported; loaded before the codex here, they stay out of it.
import '../src/sim/assault/troops';
import '../src/sim/assault/siege';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOE_ENTRIES } from '../src/sim/codex';
import { UNITS } from '../src/sim/units';

test('the Assault\'s pieces, loaded before the codex, are not in the bestiary', () => {
  assert.ok(UNITS.warWolf, 'the War-wolf is loaded');
  const ids = FOE_ENTRIES.flatMap((e) => e.defs);
  for (const d of ['warWolf', 'siegeRam']) assert.ok(!ids.includes(d), `${d} is not an entry`);
  assert.ok(!ids.some((d) => d.startsWith('troop_')));
});
