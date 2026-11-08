// DEPTH-BUILD (docs/notes/depth-build.md): the Mage Tower's Spell Lectern.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta } from '../src/sim/meta';
import { lecternDue, lecternSwap, spareChoices } from '../src/sim/lectern';
import { castList } from '../src/sim/schools';
import { readOrders } from '../src/sim/march';
import type { SpellId } from '../src/sim/spells';

test('the spare swaps in at the camp after the mid-boss, once, within the loadout\'s rules', () => {
  const m = startedMeta(1);
  const l = m.spellbook;
  const cast = castList(l);
  const spares = spareChoices(l);
  assert.ok(cast.length > 0);
  for (const s of spares) assert.ok(!cast.includes(s) && l.owned.includes(s));
  // (a spare the save knows: an open-slot spell when none is spare yet)
  const spare = (spares[0] ?? 'heal') as SpellId;
  if (!l.owned.includes(spare)) l.owned.push(spare);
  if (castList(l).includes(spare)) assert.equal(lecternSwap(l, spare, castList(l)[0], l.school), false, 'already equipped');
  else {
    const out = castList(l).find((id) => lecternSwap(structuredClone(l), spare, id, l.school))!;
    assert.ok(out, 'some spell can make room for it');
    assert.ok(lecternSwap(l, spare, out, l.school));
    assert.ok(castList(l).includes(spare) && !castList(l).includes(out));
  }
  assert.equal(lecternSwap(l, spare, 'nope' as SpellId, l.school), false, 'only an equipped spell goes out');
  assert.equal(lecternDue('heal', false, true), true);
  assert.equal(lecternDue('heal', true, true), false, 'once');
  assert.equal(lecternDue('heal', false, false), false, 'only after the mid-boss');
  assert.equal(lecternDue(undefined, false, true), false);
  assert.deepEqual(readOrders({ spare: 'heal', spareUsed: true }), { spare: 'heal', spareUsed: true });
});
