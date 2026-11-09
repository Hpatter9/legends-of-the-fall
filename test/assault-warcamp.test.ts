// Bloodtusk's contour, tactical openings and discoverable damage to its defences.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHold, floodFrom, openFort } from '../src/sim/assault/fieldMap';
import { BLOODTUSK } from '../src/sim/assault/maps/orcs';
import { startAssault } from '../src/sim/assault/assault';
import { discoverWeaknesses, hitFort } from '../src/sim/assault/forts';
import { packMirror, applyMirror } from '../src/sim/assault/mirror';
import { campWorkVisible } from '../src/render/fieldCampRules';
import { input } from './assaultKit';

test('the camp has clipped shoulders, and every contoured run creates a usable opening', () => {
  const m = buildHold(BLOODTUSK);
  assert.equal(String.fromCharCode(m.zone[26 * 100 + 26]), 'K', 'the former square corner is open hillside');
  const runs = m.forts.filter((f) => f.kind === 'palisade');
  assert.ok(new Set(runs.map((f) => f.tiles[0] % 100)).size > 12, 'the perimeter changes direction across the hillside');
  for (const f of runs) {
    const board = structuredClone(m.board);
    openFort(board, f);
    const reach = floodFrom(board, BLOODTUSK.rally.v * 100 + BLOODTUSK.rally.u, 1);
    assert.ok(f.tiles.some((i) => reach[i]), `${f.id} must have a climbable rubble path`);
    assert.ok(m.zone.some((z, i) => z === 66 && reach[i]), `${f.id} must open into the camp`);
  }
});

test('a weak point stays hidden until a living platoon has a clear nearby view, and announces itself only once', () => {
  const b = startAssault(input());
  const h = b.field!.hold!;
  const f = h.forts.find((f) => f.spec.weakness)!;
  assert.ok(f, 'Bloodtusk has a weak point');
  discoverWeaknesses(b, h);
  assert.ok(!f.discovered, 'the Landing does not reveal the weakness');
  const hero = b.units.find((x) => x.id === h.platoons[0].heroId)!;
  Object.assign(hero, f.spec.front, { alive: false });
  discoverWeaknesses(b, h);
  assert.ok(!f.discovered, 'fallen troops cannot scout');
  hero.alive = true;
  discoverWeaknesses(b, h);
  assert.equal(f.discovered, true);
  discoverWeaknesses(b, h);
  assert.equal(h.events.filter((e) => e.kind === 'weakness').length, 1);
  const copy = structuredClone(b);
  assert.equal(copy.field!.hold!.forts.find((x) => x.spec.id === f.spec.id)!.discovered, true);
});

test('discovering the rotten posts enables triple damage and is preserved by the worker mirror', () => {
  const b = startAssault(input());
  const mirror = structuredClone(b);
  const h = b.field!.hold!;
  const n = h.forts.findIndex((f) => f.spec.weakness);
  const f = h.forts[n];
  const before = f.hp;
  hitFort(b, h, n, 10, 0, []);
  assert.equal(before - f.hp, 10, 'no bonus before discovery');
  Object.assign(b.units.find((x) => x.id === h.platoons[0].heroId)!, f.spec.front);
  discoverWeaknesses(b, h);
  const hp = f.hp;
  hitFort(b, h, n, 10, 0, []);
  assert.equal(hp - f.hp, 30);
  applyMirror(mirror, structuredClone(packMirror(b, [{ ev: [], hold: h.events }], [], new Set())));
  assert.equal(mirror.field!.hold!.forts[n].discovered, true);
  assert.equal(mirror.field!.hold!.forts[n].hp, f.hp);
  const ordinary = h.forts.findIndex((x) => x.spec.kind === 'palisade' && !x.spec.weakness);
  const otherHp = h.forts[ordinary].hp;
  hitFort(b, h, ordinary, 10, 0, []);
  assert.equal(otherHp - h.forts[ordinary].hp, 10, 'ordinary defences keep their toughness');
});


test('nearby troops cannot discover a flaw through an intervening obstruction', () => {
  const b = startAssault(input());
  const h = b.field!.hold!;
  const f = h.forts.find((x) => x.spec.weakness)!;
  const at = f.spec.front;
  const hero = b.units.find((x) => x.id === h.platoons[0].heroId)!;
  Object.assign(hero, { u: at.u + 3, v: at.v });
  const blocker = b.board.tiles[at.v * b.board.w + at.u + 1];
  blocker.wall = true;
  discoverWeaknesses(b, h);
  assert.ok(!f.discovered);
  delete blocker.wall;
  discoverWeaknesses(b, h);
  assert.equal(f.discovered, true);
});


test('broad flank hills and the rear ridge remain prominent after movement easing, with low ground beside the river', () => {
  const m = buildHold(BLOODTUSK);
  const b = m.board;
  const height = (u: number, v: number) => b.tiles[v * b.w + u].h;
  assert.ok(height(34, 12) >= 10, 'the rear ridge has a high crown');
  assert.ok(height(13, 61) >= 9, 'the lumber flank has a substantial hill');
  assert.ok(height(86, 36) >= 8, 'the wolf flank is raised');
  assert.ok(height(41, 86) >= 7, 'the western approach has a distinct knoll');
  assert.ok(height(62, 83) <= 1, 'the river hollow remains low');
  const high = b.tiles.filter((t, i) => t.h >= 8 && (m.zone[i] === 75 || m.zone[i] === 78));
  assert.ok(high.length > 100, 'high ground covers broad hills rather than isolated spikes');
  const reach = floodFrom(b, BLOODTUSK.rally.v * b.w + BLOODTUSK.rally.u, 1);
  for (const [u, v] of [[34, 12], [13, 61], [86, 36], [41, 86], [62, 83]]) {
    assert.equal(reach[v * b.w + u], 1, `walkers can reach the terrain landmark at ${u},${v}`);
  }
});


test('camp buildings have level foundations and an accessible entrance after the main gate opens', () => {
  const m = buildHold(BLOODTUSK);
  const b = m.board;
  openFort(b, m.forts.find((f) => f.kind === 'southGate')!);
  const reach = floodFrom(b, BLOODTUSK.rally.v * b.w + BLOODTUSK.rally.u, 2);
  for (const s of BLOODTUSK.stamps) {
    if (s.kind !== 'solid' || !s.level) continue;
    const heights = new Set<number>();
    const entrances: number[] = [];
    for (let v = s.rect.v0; v <= s.rect.v1; v++) for (let u = s.rect.u0; u <= s.rect.u1; u++) heights.add(b.tiles[v * b.w + u].h);
    for (let u = s.rect.u0; u <= s.rect.u1; u++) entrances.push((s.rect.v1 + 1) * b.w + u);
    for (let v = s.rect.v0; v <= s.rect.v1; v++) entrances.push(v * b.w + s.rect.u1 + 1);
    assert.equal(heights.size, 1, `${s.name} stands on one foundation level`);
    assert.ok(entrances.some((i) => reach[i]), `${s.name} has a reachable front entrance`);
  }
});


test('the off-centre summit is reached by walking the bent climb after the two gates open', () => {
  const m = buildHold(BLOODTUSK);
  const b = m.board;
  const throne = BLOODTUSK.throne.v * b.w + BLOODTUSK.throne.u;
  assert.ok(BLOODTUSK.throne.u < 46 && BLOODTUSK.throne.v < 46, 'the chief occupies the north-west shoulder');
  assert.equal(b.tiles[throne].h, 12);
  const from = BLOODTUSK.rally.v * b.w + BLOODTUSK.rally.u;
  assert.equal(floodFrom(b, from, 4)[throne], 0);
  openFort(b, m.forts.find((f) => f.kind === 'southGate')!);
  assert.equal(floodFrom(b, from, 2)[throne], 0, 'the inner crag still holds behind the Iron Gate');
  openFort(b, m.forts.find((f) => f.kind === 'ironGate')!);
  const walk = floodFrom(b, from, 1);
  assert.equal(walk[throne], 1, 'ordinary walkers can climb all the way to the chief');
  for (const [u, v] of [[58, 49], [54, 49], [53, 49], [53, 45], [44, 55], [44, 46]]) {
    assert.ok(b.tiles[v * b.w + u].ramp, `the climbing route passes through ${u},${v}`);
    assert.equal(walk[v * b.w + u], 1);
  }
});


test('decorative workers stop before nearby heroes or the alarm can make them look like combat targets', () => {
  const b = startAssault(input());
  const site = { u: 62, v: 51 };
  const total = b.units.length;
  assert.equal(campWorkVisible(b, site, true), true);
  assert.equal(campWorkVisible(b, site, false), false);
  const hero = b.units.find((u) => u.side === 'hero')!;
  const home = { u: hero.u, v: hero.v };
  Object.assign(hero, { u: 63, v: 51 });
  assert.equal(campWorkVisible(b, site, true), false);
  Object.assign(hero, home);
  b.field!.hold!.horn = true;
  assert.equal(campWorkVisible(b, site, true), false);
  assert.equal(b.units.length, total, 'no decorative worker is a battle unit');
});
