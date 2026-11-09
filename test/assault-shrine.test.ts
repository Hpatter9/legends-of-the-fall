// ASSAULT-SHRINE (docs/notes/assault-4.md; the design's phase 4): the Moonlit Shrine, the Yokai Night Parade's hold. Its field is the same
// every time and sound (reachable outside, shut inside, every post on ground); the stream and its pond can be crossed only by the vermilion
// bridge and the two fords; the baileys open only through their gates; its structures, garrison and names are its own; and an assault on
// it plays to its end with the Yokai's own fighters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHold, fieldProblems, floodFrom, openFort } from '../src/sim/assault/fieldMap';
import { DEN } from '../src/sim/assault/maps/beasts';
import { ELDER_ROOT } from '../src/sim/assault/maps/wildwood';
import { MAZE_HEART } from '../src/sim/assault/maps/labyrinth';
import { BONEFIRE_CRAG } from '../src/sim/assault/maps/ogres';
import { BRIMSTONE_GATE } from '../src/sim/assault/maps/infernal';
import { MOONLIT_SHRINE } from '../src/sim/assault/maps/yokai';
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

test('the Moonlit Shrine is registered, named by the owner, the same every time it is built, and sound', () => {
  assert.equal(HOLDS.yokai, MOONLIT_SHRINE);
  assert.equal(blueprintOf('yokai'), MOONLIT_SHRINE);
  assert.equal(MOONLIT_SHRINE.name, 'Moonlit Shrine');
  assert.equal(holdName('yokai'), 'Moonlit Shrine');
  assert.equal(MOONLIT_SHRINE.stencil.length, 50);
  for (const row of MOONLIT_SHRINE.stencil) assert.equal(row.length, 50);
  assert.equal(sum(buildHold(MOONLIT_SHRINE)), sum(buildHold(MOONLIT_SHRINE)));
  for (const other of [BLOODTUSK, BARROW, DEN, ELDER_ROOT, MAZE_HEART, BONEFIRE_CRAG, BRIMSTONE_GATE]) assert.notEqual(sum(buildHold(MOONLIT_SHRINE)), sum(buildHold(other)), `its own field, not ${other.name}'s`);
  assert.deepEqual(fieldProblems(buildHold(MOONLIT_SHRINE), MOONLIT_SHRINE), []);
});

test('the stream and its pond run edge to edge: only the vermilion bridge and the two fords cross them', () => {
  const m = buildHold(MOONLIT_SHRINE);
  const w = m.board.w;
  const rally = MOONLIT_SHRINE.rally.v * w + MOONLIT_SHRINE.rally.u;
  // (the wood beyond the pond, by the Vermilion Gate's road)
  const fields = 60 * w + 77;
  assert.equal(floodFrom(cloneBoard(m.board), rally, 1)[fields], 1, 'reachable across the pond');
  // (with the bridge and the fords flooded, nothing crosses)
  const b = cloneBoard(m.board);
  for (let i = 0; i < b.tiles.length; i++) if (b.tiles[i].bridge || b.tiles[i].ground === 'water') b.tiles[i] = { ...b.tiles[i], bridge: undefined, ground: 'deep' };
  assert.equal(floodFrom(b, rally, 3)[fields], 0, 'the pond is a barrier');
  // (each approach's way stands on ground or the bridge, and the fords are shallow water)
  for (const a of MOONLIT_SHRINE.approaches) for (const p of a.way) assert.ok(standable(m.board.tiles[p.v * w + p.u]), `${a.id} at (${p.u}, ${p.v})`);
  const ford = m.board.tiles[70 * w + 92];
  assert.equal(ford.ground, 'water');
});

test('the baileys open only through a gate: the Vermilion Gate the outer, the Moon Gate the inner', () => {
  const m = buildHold(MOONLIT_SHRINE);
  const b = cloneBoard(m.board);
  const w = b.w;
  const rally = MOONLIT_SHRINE.rally.v * w + MOONLIT_SHRINE.rally.u;
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
  for (const n of ['The Vermilion Gate', 'The Moon Gate', 'The West Drum', 'The East Drum', 'The Gate Drum']) assert.ok(names.includes(n), n);
});

test('the garrison: 200 of the Yokai\'s own (180 posted, 20 to come), a Nine-Tailed Fox where the Council has no one, the Oni King on the seat', () => {
  const d = defendersOf(MOONLIT_SHRINE);
  assert.equal(d.posted + d.bands, 200);
  const b = startAssault(input({ army: 'yokai' }));
  const f = b.field!;
  const h = f.hold!;
  const kinds = new Set(h.garrison.map((id) => f.byId[id].def));
  for (const k of ['yokaiFox', 'yokaiWitch', 'yokaiMonk', 'yokaiCrow', 'nineTails', 'oniKing']) assert.ok(kinds.has(k), k);
  for (const k of kinds) assert.ok(!k.startsWith('orc'), `${k} is not one of Bloodtusk Hold's orcs`);
  assert.equal(f.byId[h.lord].def, 'oniKing');
  assert.equal(UNITS.warWolf.summon, true);
  // (the codex's page is built)
  const page = holdPages(startedMeta(1)).find((p) => p.army === 'yokai')!;
  assert.ok(page.built && page.name === 'Moonlit Shrine');
  assert.ok(page.facts.some((f) => f.includes('The Moon Gate')));
  assert.ok(page.facts.some((f) => /^3 great war drums$/.test(f)));
});

test('an assault on the Moonlit Shrine plays: Auto fights it to an end, the same way twice', () => {
  const play = () => {
    const b = startAssault(input({ army: 'yokai', auto: true }, 100));
    for (let i = 0; i < 7200 && b.phase === 'fight'; i++) stepAssault(b);
    return { phase: b.phase, t: b.t, out: b.field!.hold!.outcome, left: b.field!.hold!.garrison.filter((id) => b.field!.byId[id].alive).length };
  };
  const a = play();
  assert.notEqual(a.phase, 'fight', 'it ends');
  assert.deepEqual(play(), a, 'deterministic');
  void orderPlatoon;
});

test('the Warpath\'s bands are the hold\'s own army, not always orcs', async () => {
  const { quiet, steps } = await import('./assaultKit');
  const b = quiet({ army: 'yokai' });
  const h = b.field!.hold!;
  steps(b, 920);
  const band = h.posts.find((p) => p.def.zone === 'warpath');
  assert.ok(band, 'a band set out');
  for (const id of b.field!.groups[band.group].members) assert.ok(!b.field!.byId[id].def.startsWith('orc'), b.field!.byId[id].def);
});





test('the Yokai have bows: the fox witches shoot from the archers\' places, so Auto keeps the plan\'s split here; the crow tengu fly', async () => {
  const { archersOnly, bowless } = await import('../src/sim/assault/garrison');
  assert.equal(bowless('yokai'), false);
  assert.equal(archersOnly(MOONLIT_SHRINE.posts.find((p) => p.id === 'towerN')!, 'yokai'), true);
  assert.equal(UNITS.yokaiCrow.flies, true);
});
