// The coming heroes' balance knobs (docs/notes/twenty-heroes.md): a passive's strength (`scalePassive`, the tuner's `p`), and the sweep that
// can field them (`SWEEP_POOL` with COMING=1) while the roster's own sweep is left as it was.
import { test } from 'node:test';
import { isMythic } from '../src/sim/mythicRules';
import assert from 'node:assert/strict';
import type { Passive } from '../src/sim/abilities';
import { COMING_PASSIVE, twentyKits as comingKits, scalePassive, setComingPassive } from '../src/sim/kits/coming';
import { SWEEP_POOL } from '../tools/heroSweep';
import { ALL_HEROES } from '../src/sim/units';

test('a passive scaled by k: shares and chances times k, multipliers above 1 times k, switches and timings as written', () => {
  const p: Passive = { name: 'P', text: 't', leech: 0.2, dodge: 0.1, prey: 1.5, sure: true, steady: true, undying: 0.4, crit: { chance: 0.2, mult: 1.6, bleed: { kind: 'bleed', dmg: 4, every: 500, ms: 3000 } }, mend: { every: 2500, share: 0.6 }, tune: { every: 3000, charge: 18 }, finish: { under: 0.5, mult: 1.3 } };
  assert.equal(scalePassive(p, 1), p, 'at 1 it is the passive as written');
  const h = scalePassive(p, 0.5);
  assert.ok(Math.abs(h.leech! - 0.1) < 1e-12 && Math.abs(h.dodge! - 0.05) < 1e-12 && Math.abs(h.undying! - 0.2) < 1e-12);
  assert.ok(Math.abs(h.prey! - 1.25) < 1e-12 && Math.abs(h.crit!.mult - 1.3) < 1e-12 && Math.abs(h.crit!.chance - 0.1) < 1e-12);
  assert.ok(Math.abs(h.finish!.mult - 1.15) < 1e-12 && Math.abs(h.mend!.share - 0.3) < 1e-12 && h.tune!.charge === 9);
  assert.equal(h.mend!.every, 2500);
  assert.equal(h.tune!.every, 3000);
  assert.equal(h.crit!.bleed, p.crit!.bleed);
  assert.ok(h.sure && h.steady);
  assert.equal(p.leech, 0.2, 'the written passive is unchanged');
});

test('the tuner can set a coming hero\'s passive strength in its kit, and back', () => {
  // (the kit holds the tuned strength, `COMING_PASSIVE`; the tuner's knob scales the passive as written)
  const tuned = comingKits().vampireLord.passive.leech!;
  setComingPassive('vampireLord', 1);
  const written = comingKits().vampireLord.passive.leech!;
  assert.ok(Math.abs(tuned - written * (COMING_PASSIVE.vampireLord ?? 1)) < 1e-12);
  setComingPassive('vampireLord', 0.5);
  assert.ok(Math.abs(comingKits().vampireLord.passive.leech! - written * 0.5) < 1e-12);
  setComingPassive('vampireLord', COMING_PASSIVE.vampireLord ?? 1);
  assert.equal(comingKits().vampireLord.passive.leech, tuned);
});

test('without COMING=1 the sweep draws from the roster alone, as the balance tests hold it', () => {
  assert.equal(process.env.COMING, undefined);
  // (less the Mythics: a random team of five could hold two, and only one may fight in a squad, docs/notes/mythic-heroes.md)
  assert.deepEqual([...SWEEP_POOL], ALL_HEROES.filter((k) => !isMythic(k)));
});
