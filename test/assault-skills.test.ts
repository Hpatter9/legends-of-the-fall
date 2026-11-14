import { test } from 'node:test';
import assert from 'node:assert/strict';
import { castsFirst, startAssault } from '../src/sim/assault/assault';
import { orderPlatoon, setAuto } from '../src/sim/assault/platoons';
import { keyOf, ultimateOf } from '../src/sim/abilities';
import { stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX } from '../src/sim/abilities';
import type { HoldState, PlatoonState } from '../src/sim/assault/holdTypes';
import { input, quiet } from './assaultKit';

// ASSAULT-SKILLS (docs/notes/assault-skills.md): a hero in an assault casts from its own kit before its orders walk it on, and the king's
// spells are cast on Auto as in an ordinary fight.

/** Stand a fighter on a tile (the next tick puts it on the grid). */
function put(b: Battle, x: Unit, u: number, v: number): void {
  const f = b.field!;
  if (f.occ[x.v * f.w + x.u] === x.id) f.occ[x.v * f.w + x.u] = -1;
  x.u = u;
  x.v = v;
  x.step = undefined;
  f.occ[v * f.w + u] = x.id;
}

test('a hero may cast first on any order but a fall back, a flank, or with a keg in its arms', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const pl = h.platoons[0];
  const at = { u: 10, v: 10 };
  for (const [order, ok] of [[{ kind: 'move', at }, true], [{ kind: 'hold', at }, true], [{ kind: 'charge', at }, true], [{ kind: 'assault', fort: 'southGate' }, true], [{ kind: 'fallback', at }, false], [{ kind: 'flank', unit: 1 }, false]] as const) {
    const p: PlatoonState = { ...pl, order: order as PlatoonState['order'] };
    assert.equal(castsFirst(h, p), ok, order.kind);
  }
  const marching: PlatoonState = { ...pl, order: { kind: 'move', at } };
  const carried: HoldState = { ...h, platoons: [marching, ...h.platoons.slice(1)], siege: { ...h.siege, keg: { platoon: 0 } } };
  assert.equal(castsFirst(carried, marching), false);
  // (once lit and set down, it may cast again)
  assert.equal(castsFirst({ ...carried, siege: { ...h.siege, keg: { platoon: 0, lit: 1 } } }, marching), true);
});

test('a hero marching past foes in sight casts its full ultimate on the way, where it once walked on', () => {
  const b = quiet();
  const f = b.field!;
  const h = f.hold!;
  // (the Wizard's platoon, sent on a long march; a band of grunts in sight off to its side, out of its reach)
  const k = 3;
  const hero = f.byId[h.platoons[k].heroId];
  const ult = ultimateOf(hero)!;
  assert.ok(ult, 'the Wizard has its ultimate at level 55');
  hero.charge2 = CHARGE_MAX;
  const grunts = b.units.filter((x) => x.side === 'foe' && x.alive && x.def === 'orcGrunt').slice(0, 4);
  grunts.forEach((g, i) => put(b, g, hero.u + 6 + (i % 2), hero.v - 1 + Math.floor(i / 2)));
  orderPlatoon(b, k, { kind: 'move', at: { u: 50, v: 50 } });
  const ev: BattleEvent[] = [];
  for (let i = 0; i < 30 && b.phase === 'fight'; i++) ev.push(...stepBattle(b));
  assert.ok(ev.some((e) => e.kind === 'skill' && e.by === hero.id && e.name === keyOf(ult)), 'the ultimate went off on the march');
});

test("Auto casts the king's spells in an assault; the player's own hand does not, and a save that keeps them off casts none", () => {
  const on = startAssault(input({ auto: true, spells: ['heal', 'meteor'] }));
  assert.deepEqual(on.autoSpells, ['heal', 'meteor']);
  // (Auto off, at the next tick)
  setAuto(on, false);
  stepBattle(on);
  assert.equal(on.autoSpells, undefined);
  setAuto(on, true);
  stepBattle(on);
  assert.deepEqual(on.autoSpells, ['heal', 'meteor']);
  assert.equal(startAssault(input({ auto: false, spells: ['heal'] })).autoSpells, undefined);
  assert.equal(startAssault(input({ auto: true })).autoSpells, undefined);
});

test('an assault on Auto with its spells plays out the same way twice', () => {
  const play = () => {
    const b = startAssault(input({ auto: true, spells: ['heal', 'meteor', 'haste'] }));
    for (let i = 0; i < 1500 && b.phase === 'fight'; i++) stepBattle(b);
    return [b.t, b.units.filter((x) => x.alive).length, (b.log ?? []).filter((e) => e.kind === 'spell').length, b.units.reduce((n, x) => n + Math.round(x.hp), 0)];
  };
  const a = play();
  assert.ok(a[2] > 0, 'spells were cast');
  assert.deepEqual(play(), a);
});
