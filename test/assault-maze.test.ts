// ASSAULT-MAZE (docs/notes/assault-4.md; the design's phase 4): the Heart of the Maze, the Labyrinth's hold. Its field is the same every
// time and sound (reachable outside, shut inside, every post on ground); the canal can be crossed only by the stone bridge and the two fords;
// its maze walls stand on the approaches and every way still goes through; the baileys open only through their gates; its structures,
// garrison and names are its own; and an assault on it plays to its end with the Labyrinth's own fighters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHold, fieldProblems, floodFrom, openFort } from '../src/sim/assault/fieldMap';
import { DEN } from '../src/sim/assault/maps/beasts';
import { ELDER_ROOT } from '../src/sim/assault/maps/wildwood';
import { MAZE, MAZE_HEART } from '../src/sim/assault/maps/labyrinth';
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

test('the Heart of the Maze is registered, named by the owner, the same every time it is built, and sound', () => {
  assert.equal(HOLDS.labyrinth, MAZE_HEART);
  assert.equal(blueprintOf('labyrinth'), MAZE_HEART);
  assert.equal(MAZE_HEART.name, 'Heart of the Maze');
  assert.equal(holdName('labyrinth'), 'Heart of the Maze');
  assert.equal(MAZE_HEART.stencil.length, 50);
  for (const row of MAZE_HEART.stencil) assert.equal(row.length, 50);
  assert.equal(sum(buildHold(MAZE_HEART)), sum(buildHold(MAZE_HEART)));
  for (const other of [BLOODTUSK, BARROW, DEN, ELDER_ROOT]) assert.notEqual(sum(buildHold(MAZE_HEART)), sum(buildHold(other)), `its own field, not ${other.name}'s`);
  assert.deepEqual(fieldProblems(buildHold(MAZE_HEART), MAZE_HEART), []);
});

test('the canal runs edge to edge: only the stone bridge and the two fords cross it', () => {
  const m = buildHold(MAZE_HEART);
  const w = m.board.w;
  const rally = MAZE_HEART.rally.v * w + MAZE_HEART.rally.u;
  // (the hills beyond the canal, by the Horned Gate's road)
  const fields = 60 * w + 77;
  assert.equal(floodFrom(cloneBoard(m.board), rally, 1)[fields], 1, 'reachable across the canal');
  // (with the bridge and the fords flooded, nothing crosses)
  const b = cloneBoard(m.board);
  for (let i = 0; i < b.tiles.length; i++) if (b.tiles[i].bridge || b.tiles[i].ground === 'water') b.tiles[i] = { ...b.tiles[i], bridge: undefined, ground: 'deep' };
  assert.equal(floodFrom(b, rally, 3)[fields], 0, 'the canal is a barrier');
  // (each approach's way stands on ground or the bridge, and the fords are shallow water)
  for (const a of MAZE_HEART.approaches) for (const p of a.way) assert.ok(standable(m.board.tiles[p.v * w + p.u]), `${a.id} at (${p.u}, ${p.v})`);
  const ford = m.board.tiles[70 * w + 92];
  assert.equal(ford.ground, 'water');
});

test('the baileys open only through a gate: the Horned Gate the outer, the Bronze Gate the inner', () => {
  const m = buildHold(MAZE_HEART);
  const b = cloneBoard(m.board);
  const w = b.w;
  const rally = MAZE_HEART.rally.v * w + MAZE_HEART.rally.u;
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
  for (const n of ['The Horned Gate', 'The Bronze Gate', 'The West Horn Altar', 'The East Horn Altar', 'The Gate Horn Altar']) assert.ok(names.includes(n), n);
});

test('the garrison: 200 of the Labyrinth\'s own (180 posted, 20 to come), a Gorgon Queen where the Council has no one, the Minotaur Champion on the throne', () => {
  const d = defendersOf(MAZE_HEART);
  assert.equal(d.posted + d.bands, 200);
  const b = startAssault(input({ army: 'labyrinth' }));
  const f = b.field!;
  const h = f.hold!;
  const kinds = new Set(h.garrison.map((id) => f.byId[id].def));
  for (const k of ['mazeMino1', 'mazeMino3', 'mazeGorgon1', 'warWolf', 'gorgonQueen', 'minotaurChampion']) assert.ok(kinds.has(k), k);
  for (const k of kinds) assert.ok(!k.startsWith('orc'), `${k} is not an orc`);
  assert.equal(f.byId[h.lord].def, 'minotaurChampion');
  assert.equal(UNITS.warWolf.summon, true);
  // (the codex's page is built)
  const page = holdPages(startedMeta(1)).find((p) => p.army === 'labyrinth')!;
  assert.ok(page.built && page.name === 'Heart of the Maze');
  assert.ok(page.facts.some((f) => f.includes('The Bronze Gate')));
  assert.ok(page.facts.some((f) => /^3 horned altars$/.test(f)));
});

test('an assault on the Heart of the Maze plays: Auto fights it to an end, the same way twice', () => {
  const play = () => {
    const b = startAssault(input({ army: 'labyrinth', auto: true }, 95));
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
  const b = quiet({ army: 'labyrinth' });
  const h = b.field!.hold!;
  steps(b, 920);
  const band = h.posts.find((p) => p.def.zone === 'warpath');
  assert.ok(band, 'a band set out');
  for (const id of b.field!.groups[band.group].members) assert.ok(!b.field!.byId[id].def.startsWith('orc'), b.field!.byId[id].def);
});



test('the maze: walls a walker goes round on the approaches between the canal and the ring, drawn as the maze\'s, with every way through', async () => {
  const { bowless } = await import('../src/sim/assault/garrison');
  const { placementsOf } = await import('../src/render/fieldLooks');
  const m = buildHold(MAZE_HEART);
  const w = m.board.w;
  assert.ok(MAZE.length >= 60, `${MAZE.length} maze tiles`);
  for (const p of MAZE) {
    const t = m.board.tiles[p.v * w + p.u];
    assert.ok(t.wall && !standable(t), `(${p.u}, ${p.v}) is a wall`);
    // (outside the ring, short of the canal)
    assert.ok(Math.max(Math.abs(p.u - 49.5), Math.abs(p.v - 49.5)) > 28 && p.u + p.v < 156, `(${p.u}, ${p.v}) on the approaches`);
  }
  // (the maze is mirrored across the hold's middle line, as the approaches are)
  for (const p of MAZE) assert.ok(MAZE.some((q) => q.u === p.v && q.v === p.u));
  const looks = placementsOf(m.board, m.zone, MAZE_HEART, m.forts).filter((p) => p.name === 'mazeRun');
  assert.equal(looks.length, MAZE.length);
  // (the Labyrinth has bows: its gorgons shoot, so Auto does not huddle here)
  assert.equal(bowless('labyrinth'), false);
  assert.ok(UNITS.mazeGorgon1.range > 1);
});
