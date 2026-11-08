// ASSAULT-HEAVY (docs/notes/assault-2.md; the design's 5.2, phase 2): the trebuchet's volley is told three seconds before it lands, strikes the
// structures and the foes under it, and reloads in forty-five; three volleys on one stretch of the stone wall break it to a ramp that any
// walker crosses; a sapper fetches a barrel, carries it at half pace, sets it at the wall and it goes off five seconds later, breaking the
// stretch; burning the Warpath's reserve camp stops the bands.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jumpClass, reaches } from '../src/sim/assault/sectors';
import { holdBoosts } from '../src/sim/assault/garrison';
import { orderPlatoon } from '../src/sim/assault/platoons';
import { BAND_MS } from '../src/sim/assault/react';
import { TREB_FIRST_MS } from '../src/sim/assault/siege';
import { callVolley, canVolley, KEG_FUSE_MS, VOLLEY_EVERY_MS, VOLLEY_FORT, VOLLEY_TELL_MS, wallStretch } from '../src/sim/assault/works';
import type { Battle, Unit } from '../src/sim/battle';
import type { HoldEvent } from '../src/sim/assault/holdTypes';
import { fell, quiet, steps } from './assaultKit';

function put(b: Battle, x: Unit, u: number, v: number): void {
  const f = b.field!;
  if (f.occ[x.v * f.w + x.u] === x.id) f.occ[x.v * f.w + x.u] = -1;
  x.u = u;
  x.v = v;
  x.step = undefined;
  f.occ[v * f.w + u] = x.id;
}
function gather(b: Battle, n: number, until?: (e: HoldEvent) => boolean): HoldEvent[] {
  const all: HoldEvent[] = [];
  for (let i = 0; i < n && b.phase === 'fight'; i++) {
    steps(b, 1);
    all.push(...b.field!.hold!.events);
    if (until && b.field!.hold!.events.some(until)) break;
  }
  return all;
}

test('the volley is told three seconds before it lands, strikes the structures and foes under it, and reloads in forty-five seconds', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const gate = h.forts.find((f) => f.spec.kind === 'southGate')!;
  const [t] = gate.spec.tiles;
  const u = t % b.board.w;
  const v = Math.floor(t / b.board.w);
  assert.ok(!canVolley(b, u, v), 'not set up yet');
  steps(b, TREB_FIRST_MS / 100);
  assert.ok(!canVolley(b, 5, 5), 'beyond its reach');
  const foe = b.units.find((x) => x.side === 'foe' && x.alive && x.def === 'orcGrunt')!;
  put(b, foe, u + 1, v - 1);
  const hp = gate.hp;
  assert.ok(callVolley(b, u, v));
  assert.ok(h.events.some((e) => e.kind === 'volleyTold' && e.tiles.length === 9));
  assert.ok(!canVolley(b, u, v), 'loading again');
  const early = gather(b, VOLLEY_TELL_MS / 100 - 2);
  assert.ok(!early.some((e) => e.kind === 'volley'));
  foe.hp = foe.maxHp;
  const ev = gather(b, 4);
  assert.ok(ev.some((e) => e.kind === 'volley'));
  assert.equal(hp - gate.hp, Math.round(VOLLEY_FORT * (holdBoosts(h).foes.hp ?? 1)));
  assert.ok(foe.hp < foe.maxHp, 'the foe under it is struck');
  steps(b, (VOLLEY_EVERY_MS - VOLLEY_TELL_MS) / 100 + 2);
  assert.ok(canVolley(b, u, v), 'loaded again');
});

test('three volleys on one stretch of the stone wall break it to a ramp any walker crosses', () => {
  const b = quiet();
  const w = b.board.w;
  const at = 61 * w + 50;
  const s = wallStretch(b, at)!;
  assert.ok(s.tiles.length >= 4, 'three along, the wall through');
  const out = 62 * w + 50;
  const inn = 59 * w + 50;
  assert.ok(!reaches(b.field!.sectors, jumpClass(1), out, inn), 'no walker climbs it whole');
  steps(b, TREB_FIRST_MS / 100);
  for (let k = 0; k < 3; k++) {
    assert.ok(callVolley(b, 50, 61), `volley ${k + 1}`);
    const ev = gather(b, VOLLEY_TELL_MS / 100 + 2);
    assert.equal(ev.some((e) => e.kind === 'breach' && e.fort === 'wall'), k === 2, `breached on the third: ${k + 1}`);
    if (k < 2) steps(b, VOLLEY_EVERY_MS / 100);
  }
  for (const i of s.tiles) assert.ok(b.board.tiles[i].h <= 3);
  assert.ok(reaches(b.field!.sectors, jumpClass(1), out, inn), 'from the outer bailey into the inner over the rubble');
});

test('a sapper fetches a barrel, carries it at half pace, sets it at the wall, and five seconds later the stretch breaks', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const w = b.board.w;
  const hero = b.field!.byId[h.platoons[0].heroId];
  // (by the forge's barrels, the forge's brutes gone; the keg for the wall's south side, along the outer bailey)
  for (const x of b.units) if (x.side === 'foe' && x.u >= 50 && x.u <= 72 && x.v >= 50 && x.v <= 70) fell(b, x.id);
  put(b, hero, 67, 55);
  orderPlatoon(b, 0, { kind: 'plant', at: { u: 55, v: 61 } });
  const ev = gather(b, 600, (e) => e.kind === 'keg' && e.state === 'lit');
  assert.ok(ev.some((e) => e.kind === 'keg' && e.state === 'carried'), 'picked up');
  assert.ok(ev.some((e) => e.kind === 'keg' && e.state === 'lit'), 'set and lit');
  const lit = h.siege.keg!;
  assert.ok(lit.lit !== undefined && lit.lit - b.t <= KEG_FUSE_MS);
  const stretch = wallStretch(b, 61 * w + 55)!.tiles;
  const boom = gather(b, KEG_FUSE_MS / 100 + 2);
  assert.ok(boom.some((e) => e.kind === 'keg' && e.state === 'boom'));
  assert.ok(boom.some((e) => e.kind === 'breach' && e.fort === 'wall'));
  for (const i of stretch) assert.ok(b.board.tiles[i].h <= 3);
  assert.equal(h.siege.keg, undefined, 'one keg at a time: free again');
});

test('burning every tent of the Warpath\'s reserve camp stops the bands', () => {
  const b = quiet();
  const h = b.field!.hold!;
  for (const hut of h.siege.huts) if (hut.name === 'Reserve tent') hut.burning = b.t + 30_000;
  const ev = gather(b, 12);
  assert.ok(ev.some((e) => e.kind === 'campBurnt') && h.warpath.burnt);
  steps(b, BAND_MS / 100 + 12);
  assert.equal(h.bands, 0);
});
