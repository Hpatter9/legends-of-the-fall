// GEAR-POPUP (docs/notes/gear-popup.md, `src/gearRules.ts`): the plate over a hero whose gear changed shows only the numbers that moved,
// old → new with ▲ for up and ▼ for down, and the Power with its change, read from the hero before and after as its card reads it (the Hall
// and everything `heroStats` counts); reading never writes to the save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startedMeta, type Meta } from '../src/sim/meta';
import { equipItem, grantEquipment, unequipItem, EQUIP_BASES } from '../src/sim/equipment';
import { heroFigures, kindPower } from '../src/sim/power';
import { gearDiff, gearWords, heroGearShot, shotOfBoost, touched, type GearShot } from '../src/gearRules';

const meta = (): Meta => startedMeta(7);
const shot = (over: Partial<GearShot> = {}): GearShot => ({ power: 7240, hp: 1000, atk: 120, def: 5, crit: 0.05, dodge: 0, atkSpeed: 0, moveSpeed: 0, range: 0, regen: 0, charge: 0, resist: 0, ...over });

test('only the numbers that changed are shown, each old → new with its sign, and the Power with its change', () => {
  const d = gearDiff(shot(), shot({ atk: 135, def: 3, crit: 0.08, power: 7515 }));
  assert.deepEqual(gearWords(d), ['ATK 120 → 135 ▲15', 'DEF 5 → 3 ▼2', 'Crit 5% → 8% ▲3%', 'Power 7,240 → 7,515 ▲275']);
  assert.deepEqual(d.stats.map((l) => l.up), [true, false, true]);
  assert.ok(d.power?.up);
  assert.deepEqual(gearDiff(shot(), shot()), { stats: [], power: undefined }, 'nothing changed: nothing shown');
  // (a share that moved by less than it is written to counts as unchanged)
  assert.deepEqual(gearDiff(shot(), shot({ crit: 0.0502 })).stats, []);
  assert.equal(gearDiff(shot(), shot({ power: 7000 })).power?.delta, '▼240');
});

test('a hero read for the plate matches its card: the same Power and figures as `kindPower` and `heroFigures`, and the save is not written', () => {
  const m = meta();
  const kind = m.unlocked[0];
  const before = JSON.stringify(m);
  const s = heroGearShot(m, kind);
  assert.equal(JSON.stringify(m), before, 'reading wrote nothing');
  assert.equal(s.power, kindPower(m, kind));
  const f = heroFigures(m, kind);
  assert.deepEqual([s.hp, s.atk, s.def], [f.hp, f.atk, f.def]);
});

test('equipping a piece shows its gains and a higher Power; taking it off shows the same numbers falling, each with ▼', () => {
  const m = meta();
  const kind = m.unlocked[0];
  const it = grantEquipment(m, { base: 'runedBlade', rarity: 3, level: 4 });
  assert.ok(EQUIP_BASES[it.base]);
  const bare = heroGearShot(m, kind);
  assert.ok(equipItem(m, kind, it.id));
  const dressed = heroGearShot(m, kind);
  const on = gearDiff(bare, dressed);
  assert.ok(on.stats.length > 0 && on.stats.every((l) => l.up), JSON.stringify(on));
  assert.ok(on.power && on.power.up && /^▲/.test(on.power.delta));
  assert.ok(unequipItem(m, kind, EQUIP_BASES[it.base].slot));
  const off = gearDiff(dressed, heroGearShot(m, kind));
  assert.deepEqual(off.stats.map((l) => l.key), on.stats.map((l) => l.key), 'the same numbers');
  assert.ok(off.stats.every((l) => !l.up && l.delta.startsWith('▼')), JSON.stringify(off));
  assert.ok(off.power && !off.power.up && off.power.delta === on.power.delta.replace('▲', '▼'));
});

test('a swap with a mix of better and worse shows both, green up and red down', () => {
  const d = gearDiff(shot({ hp: 1000, atk: 120 }), shot({ hp: 1100, atk: 110, power: 7300 }));
  assert.deepEqual(d.stats.map((l) => `${l.label}${l.up ? '+' : '-'}`), ['HP+', 'ATK-']);
});

test('a run hero is read from the boost it fights with, and a change touches the hero and a piece\'s last wearer once each', () => {
  const a = shotOfBoost('knight', { hp: 1, atk: 1 });
  const b = shotOfBoost('knight', { hp: 1, atk: 1.2 });
  assert.ok(gearDiff(a, b).stats.some((l) => l.key === 'atk' && l.up));
  assert.deepEqual(touched('knight', 'cleric', undefined, 'knight'), ['knight', 'cleric']);
});
