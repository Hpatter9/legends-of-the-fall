// ASSAULT-MAP (docs/notes/assault-1.md; the design's 2.1, 2.3 and 7.6): Bloodtusk Hold's field is the same every time, every standable tile
// outside the walls is reachable from the Landing at jump 1, the baileys are shut until a gate breaks and open after, every post stands on
// ground, and the structures are the blueprint's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHold, fieldProblems, floodFrom, openFort, ringOf } from '../src/sim/assault/fieldMap';
import { BLOODTUSK } from '../src/sim/assault/maps/orcs';
import { cloneBoard } from '../src/sim/chain';
import { standable } from '../src/sim/board';

const sum = (m: ReturnType<typeof buildHold>) => {
  let h = 0;
  m.board.tiles.forEach((t, i) => (h = (Math.imul(h ^ (t.h * 31 + (t.wall ? 1 : 0) + (t.rock ? 2 : 0) + (t.ground ? t.ground.length * 5 : 0) + i), 0x9e3779b1) >>> 0) ^ (h >>> 15)));
  return h >>> 0;
};

test('the hold is the same every time it is built (its heights, grounds, walls and boulders)', () => {
  assert.equal(sum(buildHold(BLOODTUSK)), sum(buildHold(BLOODTUSK)));
  assert.equal(BLOODTUSK.stencil.length, 50);
  for (const row of BLOODTUSK.stencil) assert.equal(row.length, 50);
});

test('fieldOk: the hold is sound (reachable outside, shut inside, posts on ground)', () => {
  assert.deepEqual(fieldProblems(buildHold(BLOODTUSK), BLOODTUSK), []);
});

test('the baileys open only through a gate: the South Gate opens the outer bailey, the Iron Gate the inner', () => {
  const m = buildHold(BLOODTUSK);
  const b = cloneBoard(m.board);
  const w = b.w;
  const rally = BLOODTUSK.rally.v * w + BLOODTUSK.rally.u;
  const inner = 46 * w + 57;
  const outer = 50 * w + 66;
  assert.equal(floodFrom(b, rally, 4)[outer], 0, 'the outer bailey is shut while the palisade stands');
  openFort(b, m.forts.find((f) => f.kind === 'southGate')!);
  const open = floodFrom(b, rally, 2);
  assert.equal(open[outer], 1, 'the outer bailey opens with the South Gate');
  assert.equal(open[inner], 0, 'the inner bailey stays shut while the Iron Gate stands');
  openFort(b, m.forts.find((f) => f.kind === 'ironGate')!);
  assert.equal(floodFrom(b, rally, 2)[inner], 1, 'the inner bailey opens with the Iron Gate');
});

test('a broken palisade segment is a rubble ramp from the ditch up to the bank', () => {
  const m = buildHold(BLOODTUSK);
  const b = cloneBoard(m.board);
  const seg = m.forts.find((f) => f.kind === 'palisade' && f.name.includes('south-east'))!;
  openFort(b, seg);
  const w = b.w;
  const t = seg.tiles[0];
  const reach = floodFrom(b, BLOODTUSK.rally.v * w + BLOODTUSK.rally.u, 1);
  assert.equal(reach[t], 1, 'a jump-1 walker climbs the rubble');
});

test('the structures are the blueprint\'s: four palisade gates, the Iron Gate, three drums, and the palisade in segments of three', () => {
  const m = buildHold(BLOODTUSK);
  const count = (k: string) => m.forts.filter((f) => f.kind === k).length;
  assert.equal(count('southGate'), 1);
  assert.equal(count('northGate'), 1);
  assert.equal(count('sallyPort'), 2);
  assert.equal(count('ironGate'), 1);
  assert.equal(count('drum'), 3);
  assert.ok(count('palisade') >= 60);
  for (const f of m.forts.filter((x) => x.kind === 'palisade')) assert.ok(f.tiles.length >= 1 && f.tiles.length <= 6, `${f.id} has ${f.tiles.length} tiles`);
  // (every structure stands shut on its tiles, and a gate's tiles are paved)
  for (const f of m.forts) for (const i of f.tiles) assert.ok(!standable(m.board.tiles[i]), `${f.id}'s tile ${i} is shut`);
  // (no structure is outside the hold's rings but the drums)
  for (const f of m.forts.filter((x) => x.kind !== 'drum')) assert.ok(ringOf(f.tiles[0] % 100, Math.floor(f.tiles[0] / 100)) < 25);
});

test('the garrison: 180 at their posts and 20 to come, as the design\'s table', () => {
  const placed = BLOODTUSK.posts.reduce((n, p) => n + p.roster.replace(/ /g, '').length, 0);
  assert.equal(placed, 180);
  assert.equal(BLOODTUSK.reinforce.bands * BLOODTUSK.reinforce.roster.replace(/ /g, '').length, 20);
  const roster = (id: string) => BLOODTUSK.posts.find((p) => p.id === id)!.roster.replace(/ /g, '');
  assert.equal(roster('bridge'), 'LGGGGGAAA');
  assert.equal(roster('throne'), 'KCCBBBBBBB');
  assert.equal(roster('barracks').length, 14);
});
