// ASSAULT-WORKS (docs/notes/assault-1.md, phase 1b; the design's 5.2): the owner's siege tools. A ladder goes up four seconds after its
// platoon stands at the wall's foot and joins the foot to the wall-walk for walkers, and the defenders push it down; the ram batters the gate
// its platoon assaults, and shots burn it twice as hard; six fire arrows burn a hut, whose smoke chokes the foes by it; suppression halves the
// blows of the foes round its spot while a shooter keeps it; the works not used are paid back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jumpClass, reaches } from '../src/sim/assault/sectors';
import { assaultChecksum } from '../src/sim/assault/assault';
import { garrisonBoosts, ASSAULT } from '../src/sim/assault/garrison';
import { orderPlatoon } from '../src/sim/assault/platoons';
import { BURN_MS, CHOKE, FIRE_NEED, LADDER_HP, LADDER_PUSH, RAM_BURNS, RAM_HIT, SCALE_MS, SIEGE_PRICES, SUPPRESSED, siegeBlow, siegeRefund } from '../src/sim/assault/siege';
import type { Battle, Unit } from '../src/sim/battle';
import type { HoldEvent } from '../src/sim/assault/holdTypes';
import { fell, quiet, steps } from './assaultKit';

/** Stand a fighter on a tile (the next tick puts it on the grid). */
function put(b: Battle, x: Unit, u: number, v: number): void {
  const f = b.field!;
  if (f.occ[x.v * f.w + x.u] === x.id) f.occ[x.v * f.w + x.u] = -1;
  x.u = u;
  x.v = v;
  x.step = undefined;
  f.occ[v * f.w + u] = x.id;
}

/** Step, gathering the hold's events. */
function gather(b: Battle, n: number): HoldEvent[] {
  const all: HoldEvent[] = [];
  for (let i = 0; i < n && b.phase === 'fight'; i++) {
    steps(b, 1);
    all.push(...b.field!.hold!.events);
  }
  return all;
}

test('a ladder goes up four seconds after its platoon reaches the wall, joins the foot to the wall-walk, and the defenders push it down', () => {
  const b = quiet({ siege: { ladders: ['knight'] } });
  const h = b.field!.hold!;
  const f = b.field!;
  const w = b.board.w;
  assert.ok(h.platoons[0].ladder, 'the kit is carried');
  const foot = 62 * w + 50;
  const top = 61 * w + 50;
  assert.ok(!reaches(f.sectors, jumpClass(2), foot, top), 'no walker climbs six steps of wall');
  put(b, f.byId[h.platoons[0].heroId], 50, 63);
  orderPlatoon(b, 0, { kind: 'scale', at: { u: 50, v: 61 } });
  const early = gather(b, SCALE_MS / 100 - 5);
  assert.ok(!early.some((e) => e.kind === 'ladder'), 'not yet');
  const ev = gather(b, 30);
  assert.ok(ev.some((e) => e.kind === 'ladder' && e.up && e.tiles[0] === foot && e.tiles[1] === top), 'up, where it was put');
  assert.equal(h.platoons[0].ladder, false, 'the kit is spent');
  assert.equal(b.board.tiles[foot].ladder, b.board.tiles[top].ladder);
  assert.ok(reaches(f.sectors, jumpClass(2), foot, top), 'a walker climbs it');
  // (the platoon goes back; a defender stands beside the ladder's top)
  orderPlatoon(b, 0, { kind: 'fallback', at: { ...h.bp.rally } });
  steps(b, 30);
  // (a defender beside its top pushes 60 a second off its 600)
  const foe = b.units.find((x) => x.side === 'foe' && x.alive && x.def === 'orcGrunt')!;
  put(b, foe, 50, 60);
  const l = h.siege.ladders[0];
  steps(b, 30);
  assert.ok(l.hp <= LADDER_HP - 2 * LADDER_PUSH && l.hp > 0, `pushed: ${l.hp}`);
  const down = gather(b, (LADDER_HP / LADDER_PUSH) * 10 + 20);
  assert.ok(down.some((e) => e.kind === 'ladder' && !e.up), 'down');
  assert.equal(b.board.tiles[top].ladder, undefined);
  assert.ok(!reaches(f.sectors, jumpClass(2), foot, top), 'the way is gone with it');
});

test('the ram batters the gate its platoon assaults, every two seconds; shots set it burning twice as hard', () => {
  const b = quiet({ siege: { ram: 'knight' } });
  const h = b.field!.hold!;
  const f = b.field!;
  const ram = f.byId[h.siege.ram!.id];
  assert.equal(ram.side, 'hero');
  const gate = h.forts.find((x) => x.spec.kind === 'southGate')!;
  put(b, ram, 74, 58);
  put(b, f.byId[h.platoons[0].heroId], 76, 59);
  orderPlatoon(b, 0, { kind: 'assault', fort: gate.spec.id });
  const ev = gather(b, 45);
  const k = garrisonBoosts('orcs', ASSAULT.foeShare).foes.hp ?? 1;
  const rams = ev.filter((e) => e.kind === 'ram').length;
  assert.ok(rams >= 2 && rams <= 3, `${rams} blows in four and a half seconds`);
  assert.ok(ev.some((e) => e.kind === 'fortHit' && e.by === ram.id && e.dmg === Math.round(RAM_HIT * k)), 'each for 600 at the garrison toughness');
  const archer = b.units.find((x) => x.side === 'foe' && x.def === 'orcArcher')!;
  const grunt = b.units.find((x) => x.side === 'foe' && x.def === 'orcGrunt')!;
  assert.equal(siegeBlow(b, h, archer, ram), RAM_BURNS);
  assert.equal(siegeBlow(b, h, grunt, ram), 1);
});

test('six fire arrows burn a hut; its smoke chokes the foes by it and softens their blows; it burns out', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const f = b.field!;
  const hut = h.siege.huts.find((x) => x.name === 'Longhouse')!;
  assert.ok(hut, 'the longhouses burn');
  const archer = f.byId[h.platoons[2].heroId];
  put(b, archer, 66, 29);
  orderPlatoon(b, 2, { kind: 'fire', hut: hut.id });
  const ev = gather(b, 200);
  assert.ok(ev.some((e) => e.kind === 'burn' && e.hut === hut.id), 'alight');
  assert.ok(hut.fire >= FIRE_NEED && hut.burning !== undefined);
  // (a foe by the hut chokes)
  const foe = b.units.find((x) => x.side === 'foe' && x.alive && x.def === 'orcGrunt' && x.u < 30)!;
  put(b, foe, 62, 30);
  foe.hp = foe.maxHp;
  steps(b, 12);
  assert.ok(foe.hp < foe.maxHp, 'it chokes');
  assert.equal(siegeBlow(b, h, foe, archer), CHOKE);
  steps(b, BURN_MS / 100);
  assert.ok(hut.burnt && hut.burning === undefined, 'burnt out');
});

test('suppression halves the blows of the foes round its spot while one of its shooters stands near it', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const f = b.field!;
  const archer = f.byId[h.platoons[2].heroId];
  const foe = b.units.find((x) => x.side === 'foe' && x.def === 'orcArcher')!;
  put(b, archer, foe.u + 5, foe.v);
  orderPlatoon(b, 2, { kind: 'suppress', at: { u: foe.u, v: foe.v } });
  steps(b, 2);
  assert.equal(h.siege.zones.length, 1);
  assert.equal(siegeBlow(b, h, foe, archer), SUPPRESSED);
  const far = b.units.find((x) => x.side === 'foe' && Math.abs(x.u - foe.u) + Math.abs(x.v - foe.v) > 6)!;
  assert.equal(siegeBlow(b, h, far, archer), 1);
  // (its shooters gone, the volleys stop)
  fell(b, archer.id);
  for (const s of h.platoons[2].soldiers) fell(b, s.id);
  steps(b, 2);
  assert.equal(h.siege.zones.length, 0);
});

test('the siege works not used are paid back: a ladder never raised, the ram still standing', () => {
  const b = quiet({ siege: { ram: 'knight', ladders: ['samurai', 'archer'] } });
  const h = b.field!.hold!;
  assert.equal(siegeRefund(b, h), 2 * SIEGE_PRICES.ladder + SIEGE_PRICES.ram);
  fell(b, h.siege.ram!.id);
  h.platoons[1].ladder = false;
  assert.equal(siegeRefund(b, h), SIEGE_PRICES.ladder);
});

test('an assault with the siege works plays out the same from the same seed and log', () => {
  const run = () => {
    const b = quiet({ siege: { ram: 'knight', ladders: ['samurai', 'archer'] }, auto: true, tactical: true });
    steps(b, 1500);
    return b;
  };
  const a = run();
  const c = run();
  assert.equal(assaultChecksum(a), assaultChecksum(c));
  assert.deepEqual(a.field!.hold!.siege.ladders, c.field!.hold!.siege.ladders);
});
