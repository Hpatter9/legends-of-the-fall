// ASSAULT-SIEGE (docs/notes/assault-1.md; the design's section 5 and 7.6): a structure struck to 0 opens its tiles and tells of the breach,
// a blow on one has its riders off, a flier reaches the wall-walk and a walker cannot, a gate opens from inside ten seconds after its crew
// falls. (The drums' reinforcements are the Warpath's now: `assault-react`.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitFort, strikeFort, landFortHits } from '../src/sim/assault/forts';
import { jumpClass, reaches } from '../src/sim/assault/sectors';
import { holdMapOf } from '../src/sim/assault/assault';
import { GATE_OPEN_MS } from '../src/sim/assault/holdMind';
import { orderPlatoon } from '../src/sim/assault/platoons';
import { fell, quiet, steps } from './assaultKit';

test('a gate struck to nothing opens its tiles, the way is found again, and the page is told of the breach', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const w = b.board.w;
  const i = h.forts.findIndex((f) => f.spec.kind === 'southGate');
  const gate = h.forts[i];
  const rally = h.bp.rally.v * w + h.bp.rally.u;
  const inside = 59 * w + 66;
  assert.ok(!reaches(b.field!.sectors, jumpClass(2), rally, inside));
  const rebuilds = b.field!.stats.rebuilds;
  hitFort(b, h, i, gate.hp + 1, 0, []);
  assert.ok(gate.broken);
  for (const t of gate.spec.tiles) assert.ok(!b.board.tiles[t].wall, 'the gate\'s tiles stand open');
  assert.ok(h.events.some((e) => e.kind === 'breach' && e.fort === 'southGate'));
  assert.ok(h.events.some((e) => e.kind === 'horn'), 'the first blow on the palisade sounds the horn');
  assert.equal(b.field!.stats.rebuilds, rebuilds + 1, 'one rebuild for the break');
  assert.ok(reaches(b.field!.sectors, jumpClass(2), rally, inside), 'the outer bailey is open now');
});

test('a blow on a structure has its riders off: no skill charge, no mana, nothing but the structure\'s hp', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const hero = b.field!.byId[h.platoons[0].heroId];
  const i = h.forts.findIndex((f) => f.spec.kind === 'drum');
  const before = { charge: hero.charge, hp: h.forts[i].hp, mana: b.spells.mana };
  strikeFort(b, h, hero, i, []);
  b.t += 1000;
  landFortHits(b, h, []);
  assert.ok(h.forts[i].hp < before.hp);
  assert.equal(hero.charge, before.charge);
  assert.equal(b.spells.mana, before.mana);
});

test('from the outer bailey a flier reaches the wall-walk; a walker of any jump cannot (the palisade stops both: it is solid)', () => {
  const m = holdMapOf('orcs')!;
  const b = quiet();
  const w = b.board.w;
  const walk = 52 * w + 60;
  const bailey = 50 * w + 66;
  assert.ok(reaches(b.field!.sectors, jumpClass(9), bailey, walk));
  for (const j of [1, 2, 3, 4]) assert.ok(!reaches(b.field!.sectors, jumpClass(j), bailey, walk), `jump ${j}`);
  assert.ok(!reaches(b.field!.sectors, jumpClass(9), m.board.w * 93 + 93, walk), 'not from outside the palisade');
});

test('the Iron Gate opens from inside ten seconds after its crew falls, with one of ours inside the wall by it', () => {
  const b = quiet();
  const h = b.field!.hold!;
  const f = b.field!;
  for (const p of h.posts.filter((x) => x.def.guards === 'ironGate')) for (const id of f.groups[p.group].members) fell(b, id);
  // (a hero inside the wall by the gate, holding there)
  const hero = f.byId[h.platoons[1].heroId];
  f.occ[hero.v * f.w + hero.u] = -1;
  hero.u = 58;
  hero.v = 47;
  orderPlatoon(b, 1, { kind: 'hold', at: { u: 58, v: 47 } });
  // (the lord's one sally, phase 1b's reactive hold, would come down at him: it is `assault-react`'s to test, not this)
  h.lordSallied = true;
  const gate = h.forts.find((x) => x.spec.kind === 'ironGate')!;
  steps(b, 20);
  assert.ok(!gate.broken, 'not yet');
  steps(b, GATE_OPEN_MS / 100 + 10);
  assert.ok(gate.broken, 'the bar is lifted');
});
