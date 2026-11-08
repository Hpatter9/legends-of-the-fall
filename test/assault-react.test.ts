// ASSAULT-REACT (docs/notes/assault-1.md, phase 1b; the owner's tactics direction): the hold answers. Bands set out down the Warpath every
// ninety seconds while a drum beats, every two and a half minutes with the drums silenced, and none once ours hold its camp; a wall struck
// draws the nearest free post to it (a feint), and that post goes home when its own gate is struck; a captain sallies at a weakened platoon
// by his gate; the lord comes down off the mound once when ours reach the inner bailey; on the horn the wolves ride round for the cover.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breakFort, hitFort } from '../src/sim/assault/forts';
import { BAND_MS, BAND_SLOW_MS, HOLD_MS } from '../src/sim/assault/react';
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

function gather(b: Battle, n: number): HoldEvent[] {
  const all: HoldEvent[] = [];
  for (let i = 0; i < n && b.phase === 'fight'; i++) {
    steps(b, 1);
    all.push(...b.field!.hold!.events);
  }
  return all;
}

test('bands set out down the Warpath every ninety seconds while a drum beats, slower once all are silenced, none once its camp is held', () => {
  const beating = quiet();
  const h = beating.field!.hold!;
  steps(beating, BAND_MS / 100 + 12);
  assert.equal(h.bands, 1);
  assert.equal(h.warpath.marching.length, 1);
  const band = beating.field!.byId[h.warpath.marching[0].ids[0]];
  assert.ok(Math.abs(band.u - h.bp.warpath.u) + Math.abs(band.v - h.bp.warpath.v) <= 6, 'they gather at the reserve camp');
  // (the drums silenced: the next waits two and a half minutes)
  const silent = quiet();
  const s = silent.field!.hold!;
  s.forts.forEach((f, i) => f.spec.kind === 'drum' && breakFort(silent, s, i));
  steps(silent, BAND_MS / 100 + 12);
  assert.equal(s.bands, 0, 'not at ninety seconds');
  steps(silent, (BAND_SLOW_MS - BAND_MS) / 100);
  assert.equal(s.bands, 1, 'at two and a half minutes');
  // (held: ours at the camp ten seconds, no foe by it; then none come)
  const held = quiet();
  const k = held.field!.hold!;
  put(held, held.field!.byId[k.platoons[3].heroId], k.bp.warpath.u, k.bp.warpath.v);
  const ev = gather(held, HOLD_MS / 100 + 15);
  assert.ok(ev.some((e) => e.kind === 'held') && k.warpath.held);
  steps(held, BAND_MS / 100);
  assert.equal(k.bands, 0, 'the Warpath is held');
});

test('a wall struck draws the nearest free post to it, and that post goes home the moment its own gate is struck', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const f = b.field!;
  const w = b.board.w;
  // (the South Gate's crew awake at its post; a segment of the palisade nearer it than any other post struck)
  const gatePost = h.posts.find((p) => p.def.id === 'southGate')!;
  gatePost.mood = 'alerted';
  f.groups[gatePost.group].awake = true;
  const seg = h.forts.findIndex((x) => x.spec.kind === 'palisade' && x.spec.tiles.some((t) => t === 50 * w + 73 || t === 50 * w + 72));
  assert.ok(seg >= 0);
  const home = { ...f.groups[gatePost.group].home };
  hitFort(b, h, seg, 1, 0, []);
  const ev = gather(b, 25);
  assert.ok(ev.some((e) => e.kind === 'feint' && e.post === h.posts.indexOf(gatePost) && e.fort === h.forts[seg].spec.id), 'the gate crew goes');
  assert.equal(gatePost.errand?.kind, 'reinforce');
  assert.notDeepEqual(f.groups[gatePost.group].home, home);
  // (its own gate struck: home at once)
  const gate = h.forts.findIndex((x) => x.spec.kind === 'southGate');
  hitFort(b, h, gate, 1, 0, []);
  steps(b, 12);
  assert.equal(gatePost.errand, undefined);
  assert.deepEqual(f.groups[gatePost.group].home, home);
});

test('a captain sallies at a weakened platoon near his gate; the lord comes down off the mound once when ours reach the inner bailey', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const f = b.field!;
  const gatePost = h.posts.find((p) => p.def.id === 'southGate')!;
  gatePost.mood = 'alerted';
  // (platoon 0 half gone, its hero just outside the gate)
  h.platoons[0].soldiers.slice(0, 6).forEach((s) => fell(b, s.id));
  put(b, f.byId[h.platoons[0].heroId], 77, 58);
  const ev = gather(b, 12);
  assert.ok(ev.some((e) => e.kind === 'captain' && e.post === h.posts.indexOf(gatePost) && e.platoon === 0));
  assert.equal(gatePost.errand?.kind, 'sally');
  // (the lord: ours in the inner bailey)
  const throne = h.posts.find((p) => p.def.id === 'throne')!;
  put(b, f.byId[h.platoons[1].heroId], 41, 52);
  const ev2 = gather(b, 12);
  assert.ok(h.lordSallied && ev2.some((e) => e.kind === 'captain' && e.post === h.posts.indexOf(throne) && e.platoon === 1));
  assert.equal(throne.errand?.kind, 'sally');
});

test('on the great horn the wolves leave their pens and ride round for the cover', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const seg = h.forts.findIndex((x) => x.spec.kind === 'palisade');
  hitFort(b, h, seg, 1, 0, []);
  const ev = gather(b, 25);
  const wolves = h.posts.find((p) => p.def.id === 'wolves')!;
  const cover = h.platoons.findIndex((p) => p.role === 'cover');
  assert.ok(ev.some((e) => e.kind === 'wolves' && e.platoon === cover));
  assert.equal(wolves.errand?.kind, 'flank');
  assert.equal(wolves.errand?.platoon, cover);
});
