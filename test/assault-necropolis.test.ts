// ASSAULT-NECROPOLIS (docs/notes/assault-4.md; the design's phase 4): the Barrow Necropolis, the Undead Legion's hold. Its field is the same
// every time and sound (reachable outside, shut inside, every post on ground); the still lake can be crossed only by the causeway and the
// two fords; the baileys open only through their gates; its structures, garrison and names are its own; and an assault on it plays to its
// end with the Undead's own fighters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHold, fieldProblems, floodFrom, openFort } from '../src/sim/assault/fieldMap';
import { BARROW } from '../src/sim/assault/maps/undead';
import { BLOODTUSK } from '../src/sim/assault/maps/orcs';
import { HOLDS } from '../src/sim/assault/holds';
import { blueprintOf, startAssault, stepAssault } from '../src/sim/assault/assault';
import { orderPlatoon } from '../src/sim/assault/platoons';
import { defendersOf, holdPages } from '../src/sim/assault/holdCodex';
import { holdName } from '../src/sim/assault/warAnswer';
import { cloneBoard } from '../src/sim/chain';
import { standable } from '../src/sim/board';
import { startedMeta } from '../src/sim/meta';
import { UNITS } from '../src/sim/units';
import { input } from './assaultKit';

const sum = (m: ReturnType<typeof buildHold>) => {
  let h = 0;
  m.board.tiles.forEach((t, i) => (h = (Math.imul(h ^ (t.h * 31 + (t.wall ? 1 : 0) + (t.rock ? 2 : 0) + (t.ground ? t.ground.length * 5 : 0) + i), 0x9e3779b1) >>> 0) ^ (h >>> 15)));
  return h >>> 0;
};

test('the Necropolis is registered, named by the owner, the same every time it is built, and sound', () => {
  assert.equal(HOLDS.undead, BARROW);
  assert.equal(blueprintOf('undead'), BARROW);
  assert.equal(BARROW.name, 'Barrow Necropolis');
  assert.equal(holdName('undead'), 'Barrow Necropolis');
  assert.equal(BARROW.stencil.length, 50);
  for (const row of BARROW.stencil) assert.equal(row.length, 50);
  assert.equal(sum(buildHold(BARROW)), sum(buildHold(BARROW)));
  assert.notEqual(sum(buildHold(BARROW)), sum(buildHold(BLOODTUSK)), 'its own field, not Bloodtusk Hold\'s');
  assert.deepEqual(fieldProblems(buildHold(BARROW), BARROW), []);
});

test('the still lake runs edge to edge: only the causeway and the two fords cross it', () => {
  const m = buildHold(BARROW);
  const w = m.board.w;
  const rally = BARROW.rally.v * w + BARROW.rally.u;
  // (the fields beyond the lake, by the Lych Gate's road)
  const fields = 60 * w + 77;
  assert.equal(floodFrom(cloneBoard(m.board), rally, 1)[fields], 1, 'reachable across the lake');
  // (with the causeway and the fords flooded, nothing crosses)
  const b = cloneBoard(m.board);
  for (let i = 0; i < b.tiles.length; i++) if (b.tiles[i].bridge || b.tiles[i].ground === 'water') b.tiles[i] = { ...b.tiles[i], bridge: undefined, ground: 'deep' };
  assert.equal(floodFrom(b, rally, 3)[fields], 0, 'the lake is a barrier');
  // (each approach's way stands on ground or the causeway, and the fords are shallow water)
  for (const a of BARROW.approaches) for (const p of a.way) assert.ok(standable(m.board.tiles[p.v * w + p.u]), `${a.id} at (${p.u}, ${p.v})`);
  const ford = m.board.tiles[66 * w + 90];
  assert.equal(ford.ground, 'water');
});

test('the baileys open only through a gate: the Lych Gate the outer, the Bone Gate the inner', () => {
  const m = buildHold(BARROW);
  const b = cloneBoard(m.board);
  const w = b.w;
  const rally = BARROW.rally.v * w + BARROW.rally.u;
  const inner = 46 * w + 57;
  const outer = 50 * w + 66;
  assert.equal(floodFrom(b, rally, 4)[outer], 0);
  openFort(b, m.forts.find((f) => f.kind === 'southGate')!);
  assert.equal(floodFrom(b, rally, 2)[outer], 1);
  assert.equal(floodFrom(b, rally, 2)[inner], 0);
  openFort(b, m.forts.find((f) => f.kind === 'ironGate')!);
  assert.equal(floodFrom(b, rally, 2)[inner], 1);
  // (its structures are named its own way)
  const names = m.forts.map((f) => f.name);
  for (const n of ['The Lych Gate', 'The Bone Gate', 'The West Bell', 'The East Bell', 'The Gate Bell']) assert.ok(names.includes(n), n);
});

test('the garrison: 200 of the Undead\'s own (180 posted, 20 to come), a Bone Captain where the Council has no one, the Lich King on the throne', () => {
  const d = defendersOf(BARROW);
  assert.equal(d.posted + d.bands, 200);
  const b = startAssault(input({ army: 'undead' }));
  const f = b.field!;
  const h = f.hold!;
  const kinds = new Set(h.garrison.map((id) => f.byId[id].def));
  for (const k of ['skeleton', 'boneVolley', 'spearman', 'graveWraith', 'boneCaptain', 'lichKing']) assert.ok(kinds.has(k), k);
  for (const k of kinds) assert.ok(!k.startsWith('orc'), `${k} is not an orc`);
  assert.equal(f.byId[h.lord].def, 'lichKing');
  assert.equal(UNITS.graveWraith.summon, true);
  // (the codex's page is built)
  const page = holdPages(startedMeta(1)).find((p) => p.army === 'undead')!;
  assert.ok(page.built && page.name === 'Barrow Necropolis');
  assert.ok(page.facts.some((f) => f.includes('The Bone Gate')));
});

test('an assault on the Necropolis plays: Auto fights it to an end, the same way twice', () => {
  const play = () => {
    const b = startAssault(input({ army: 'undead', auto: true }, 75));
    for (let i = 0; i < 7200 && b.phase === 'fight'; i++) stepAssault(b);
    return { phase: b.phase, t: b.t, out: b.field!.hold!.outcome, left: b.field!.hold!.garrison.filter((id) => b.field!.byId[id].alive).length };
  };
  const a = play();
  assert.notEqual(a.phase, 'fight', 'it ends');
  assert.deepEqual(play(), a, 'deterministic');
  void orderPlatoon;
});
