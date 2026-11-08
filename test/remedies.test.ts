// SEVEN-SLOT GEAR batch 6: remedies (`remedies.ts`): bought, packed into a run (five at most, one Elixir), used between waves on the wounded,
// the unused home again, Auto's rule (off by default), the gear that makes them heal more, the stall's shelf and a daily's Bandage Roll.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armyRun, recruit, type Run } from '../src/sim/run';
import { startedMeta, loadMeta, saveMeta } from '../src/sim/meta';
import { equipItem, grantEquipment } from '../src/sim/equipment';
import { hpShare, setShare } from '../src/sim/health';
import { ELIXIR_MAX, REMEDIES, SATCHEL_MAX, autoRemedy, grantRemedy, packSatchel, pickSatchel, remedyBonus, satchelFor, sellRemedy, unpackSatchel, useRemedy } from '../src/sim/remedies';
import { buyWare, stockOf } from '../src/sim/stall';
import { settleFinds } from '../src/sim/runGear';

const DAY = 20260601;
function run3(): Run {
  const run = armyRun(4, 'orcs');
  for (const k of ['knight', 'archer', 'cleric']) recruit(run, k);
  run.squad = run.roster.map((h) => h.id);
  return run;
}

test('the satchel: five at most, one Elixir, the last choice remembered, as far as the remedies owned go', () => {
  const m = startedMeta(1);
  grantRemedy(m, 'bandage', 4);
  grantRemedy(m, 'elixir', 3);
  grantRemedy(m, 'draught', 2);
  const got = pickSatchel(m, { bandage: 9, elixir: 3, draught: 2 });
  assert.equal(got.elixir, ELIXIR_MAX);
  assert.deepEqual(got, { elixir: 1, draught: 2, bandage: 2 }, 'the strongest first when the room runs out');
  assert.equal(Object.values(got).reduce((n, x) => n + x!, 0), SATCHEL_MAX);
  const s = { box: {} as Record<string, string> };
  saveMeta(m, { setItem: (k, v) => void (s.box[k] = v) });
  assert.deepEqual(satchelFor(loadMeta(1, { getItem: (k) => s.box[k] ?? null })), got, 'remembered');
  // (packed into a run once; the unused come home at its end)
  const run = run3();
  packSatchel(m, run);
  assert.deepEqual(run.satchel, got);
  assert.equal(m.satchel!.bandage, 2);
  packSatchel(m, run);
  assert.equal(m.satchel!.elixir, 2, 'once');
  run.over = true;
  settleFinds(m, run);
  assert.equal(m.satchel!.bandage, 4);
  assert.equal(m.satchel!.draught, 2);
  assert.equal(m.satchel!.elixir, 3);
});

test('a remedy heals a wounded hero between waves, the squad ones every hero; none for the whole', () => {
  const run = run3();
  const [a, b] = run.roster;
  run.satchel = { bandage: 1, stew: 1, phoenix: 1 };
  assert.equal(useRemedy(run, 'bandage', a.id), false, 'nobody to heal');
  setShare(run, a.id, 0.5);
  setShare(run, b.id, 0.5);
  assert.ok(useRemedy(run, 'bandage', a.id));
  assert.ok(Math.abs(hpShare(run, a.id) - 0.8) < 1e-9);
  assert.equal(run.satchel.bandage, undefined);
  assert.ok(useRemedy(run, 'stew'));
  assert.ok(Math.abs(hpShare(run, b.id) - 0.75) < 1e-9);
  assert.ok(useRemedy(run, 'phoenix', b.id));
  assert.equal(hpShare(run, b.id), 1);
  // (the spire's wounds take them too)
  const tower = { ...run3(), tower: { hp: {} } } as unknown as Run;
  tower.satchel = { draught: 1 };
  setShare(tower, tower.roster[0].id, 0.25);
  assert.ok(useRemedy(tower, 'draught', tower.roster[0].id));
  assert.ok(Math.abs(tower.tower!.hp[String(tower.roster[0].id)] - 0.85) < 1e-9);
});

test('Auto\'s rule: the cheapest that brings a hero under half to three quarters; the Phoenix Ash and the Elixir kept for a boss', () => {
  const run = run3();
  const [a, b, c] = run.roster;
  run.satchel = { bandage: 2, draught: 1, phoenix: 1 };
  setShare(run, a.id, 0.4);
  setShare(run, b.id, 0.1);
  setShare(run, c.id, 0.6);
  // (a Bandage would leave the first at 70%, so a Draught; the second can reach 75% with nothing allowed, so the best left, a Bandage)
  assert.deepEqual(autoRemedy(run, false), ['draught', 'bandage']);
  assert.equal(hpShare(run, c.id), 0.6, 'above half is left');
  setShare(run, a.id, 0.2);
  assert.deepEqual(autoRemedy(run, false), ['bandage'], 'no Phoenix Ash before a boss');
  setShare(run, a.id, 0.1);
  assert.deepEqual(autoRemedy(run, true), ['phoenix']);
  // (off by default)
  assert.equal(startedMeta(2).autoRemedies, undefined);
});

test('the Alchemist\'s Sash and the Pilgrim\'s Cord make remedies heal more on their wearer', () => {
  const m = startedMeta(3);
  const sash = grantEquipment(m, { base: 'alchemistSash', rarity: 1, level: 1 });
  equipItem(m, 'knight', sash.id);
  assert.equal(remedyBonus(m, 'knight'), 0.25);
  assert.equal(remedyBonus(m, 'archer'), 0);
  const run = run3();
  run.satchel = { bandage: 1 };
  const knight = run.roster.find((h) => h.kind === 'knight')!;
  setShare(run, knight.id, 0.2);
  useRemedy(run, 'bandage', knight.id, (k) => remedyBonus(m, k));
  assert.ok(Math.abs(hpShare(run, knight.id) - (0.2 + 0.3 * 1.25)) < 1e-9);
});

test('the stall sells them by standing, a daily stock; they sell back for a fifth', () => {
  const m = startedMeta(4);
  m.crowns = 10000;
  const st = stockOf(m, DAY);
  const keys = st.tomes.filter((w) => w.type === 'remedy').map((w) => w.key);
  assert.deepEqual(keys, ['remedy:bandage', 'remedy:draught', 'remedy:stew', 'remedy:phoenix', 'remedy:elixir']);
  assert.deepEqual(buyWare(m, 'remedy:bandage', DAY), { type: 'remedy', remedy: 'bandage' });
  assert.equal(m.satchel!.bandage, 1);
  assert.equal(buyWare(m, 'remedy:phoenix', DAY), null, 'standing 2');
  for (let i = 0; i < 3; i++) buyWare(m, 'remedy:bandage', DAY);
  assert.equal(buyWare(m, 'remedy:bandage', DAY), null, 'four a day');
  assert.equal(sellRemedy(m, 'bandage'), Math.floor(REMEDIES.bandage.price / 5));
  assert.equal(m.satchel!.bandage, 3);
  unpackSatchel(m, run3());
});
