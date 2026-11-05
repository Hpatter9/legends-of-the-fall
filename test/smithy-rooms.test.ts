// DEPTH-BUILD (docs/notes/depth-build.md): the Smithy's rooms: Patchwork, the Master's Mark (the Field Anvil is the page's, on `repairAll`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta } from '../src/sim/meta';
import { PATCH_SHARE, equipStats, maxDurability, type Equipment } from '../src/sim/equipment';
import { markedHero } from '../src/sim/march';
import { newCastle } from '../src/sim/castle';
import { EQUIP_BASES } from '../src/sim/equipBases';

function dressed() {
  const m = startedMeta(1);
  const [base, def] = Object.entries(EQUIP_BASES).find(([, b]) => b.slot === 'torso') ?? Object.entries(EQUIP_BASES)[0];
  const it = { id: 1, base, rarity: 2, level: 1 } as unknown as Equipment;
  m.equipment = [it];
  m.equipped = { knight: { [def.slot]: 1 } } as never;
  return { m, it };
}

test('Patchwork: a broken piece keeps half its numbers until mended; without it a broken piece gives nothing', () => {
  const { m, it } = dressed();
  const whole = equipStats(m, 'knight')!;
  assert.ok(whole);
  it.wear = maxDurability(it);
  assert.equal(equipStats(m, 'knight'), undefined, 'broken, no Patchwork');
  m.castle.smithy = 2;
  const half = equipStats(m, 'knight')!;
  for (const k of ['hp', 'atk', 'def'] as const) assert.ok(Math.abs(half[k] - whole[k] * PATCH_SHARE) < 1e-9, k);
  assert.equal(half.abilities.length, 0, 'no ability while broken');
});

test("the Master's Mark spares only the marked hero, and only with the room", () => {
  const castle = newCastle();
  const run = { orders: { marked: 'knight' }, castle };
  assert.equal(markedHero(run, 'knight'), false, 'no room');
  castle.smithy = 3;
  assert.equal(markedHero(run, 'knight'), true);
  assert.equal(markedHero(run, 'archer'), false);
});
