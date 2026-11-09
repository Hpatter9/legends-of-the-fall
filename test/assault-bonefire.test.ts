// ASSAULT-BONEFIRE (docs/notes/assault-4.md; the design's phase 4): Bonefire Crag, the Ogre Clans' hold. Its field is the same every time
// and sound (reachable outside, shut inside, every post on ground); the torrent can be crossed only by the bone bridge and the two fords;
// the baileys open only through their gates; its structures, garrison and names are its own; and an assault on it plays to its end with
// the Ogre Clans' own fighters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHold, fieldProblems, floodFrom, openFort } from '../src/sim/assault/fieldMap';
import { DEN } from '../src/sim/assault/maps/beasts';
import { ELDER_ROOT } from '../src/sim/assault/maps/wildwood';
import { MAZE_HEART } from '../src/sim/assault/maps/labyrinth';
import { BONEFIRE_CRAG } from '../src/sim/assault/maps/ogres';
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

test('Bonefire Crag is registered, named by the owner, the same every time it is built, and sound', () => {
  assert.equal(HOLDS.ogres, BONEFIRE_CRAG);
  assert.equal(blueprintOf('ogres'), BONEFIRE_CRAG);
  assert.equal(BONEFIRE_CRAG.name, 'Bonefire Crag');
  assert.equal(holdName('ogres'), 'Bonefire Crag');
  assert.equal(BONEFIRE_CRAG.stencil.length, 50);
  for (const row of BONEFIRE_CRAG.stencil) assert.equal(row.length, 50);
  assert.equal(sum(buildHold(BONEFIRE_CRAG)), sum(buildHold(BONEFIRE_CRAG)));
  for (const other of [BLOODTUSK, BARROW, DEN, ELDER_ROOT, MAZE_HEART]) assert.notEqual(sum(buildHold(BONEFIRE_CRAG)), sum(buildHold(other)), `its own field, not ${other.name}'s`);
  assert.deepEqual(fieldProblems(buildHold(BONEFIRE_CRAG), BONEFIRE_CRAG), []);
});

test('the torrent runs edge to edge: only the bone bridge and the two fords cross it', () => {
  const m = buildHold(BONEFIRE_CRAG);
  const w = m.board.w;
  const rally = BONEFIRE_CRAG.rally.v * w + BONEFIRE_CRAG.rally.u;
  // (the plateau beyond the torrent, by the Tusk Gate's road)
  const fields = 60 * w + 77;
  assert.equal(floodFrom(cloneBoard(m.board), rally, 1)[fields], 1, 'reachable across the torrent');
  // (with the bridge and the fords flooded, nothing crosses)
  const b = cloneBoard(m.board);
  for (let i = 0; i < b.tiles.length; i++) if (b.tiles[i].bridge || b.tiles[i].ground === 'water') b.tiles[i] = { ...b.tiles[i], bridge: undefined, ground: 'deep' };
  assert.equal(floodFrom(b, rally, 3)[fields], 0, 'the torrent is a barrier');
  // (each approach's way stands on ground or the bridge, and the fords are shallow water)
  for (const a of BONEFIRE_CRAG.approaches) for (const p of a.way) assert.ok(standable(m.board.tiles[p.v * w + p.u]), `${a.id} at (${p.u}, ${p.v})`);
  const ford = m.board.tiles[70 * w + 92];
  assert.equal(ford.ground, 'water');
});

test('the baileys open only through a gate: the Tusk Gate the outer, the Skull Gate the inner', () => {
  const m = buildHold(BONEFIRE_CRAG);
  const b = cloneBoard(m.board);
  const w = b.w;
  const rally = BONEFIRE_CRAG.rally.v * w + BONEFIRE_CRAG.rally.u;
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
  for (const n of ['The Tusk Gate', 'The Skull Gate', 'The West Bonefire', 'The East Bonefire', 'The Gate Bonefire']) assert.ok(names.includes(n), n);
});

test('the garrison: 200 of the Ogre Clans\' own (180 posted, 20 to come), a Shaman King where the Council has no one, the Horned Ogre on the seat', () => {
  const d = defendersOf(BONEFIRE_CRAG);
  assert.equal(d.posted + d.bands, 200);
  const b = startAssault(input({ army: 'ogres' }));
  const f = b.field!;
  const h = f.hold!;
  const kinds = new Set(h.garrison.map((id) => f.byId[id].def));
  for (const k of ['clanBrute', 'clanOgre', 'warWolf', 'shamanKing', 'hornedOgre']) assert.ok(kinds.has(k), k);
  for (const k of kinds) assert.ok(!k.startsWith('orc'), `${k} is not one of Bloodtusk Hold's orcs`);
  assert.equal(f.byId[h.lord].def, 'hornedOgre');
  assert.equal(UNITS.warWolf.summon, true);
  // (the codex's page is built)
  const page = holdPages(startedMeta(1)).find((p) => p.army === 'ogres')!;
  assert.ok(page.built && page.name === 'Bonefire Crag');
  assert.ok(page.facts.some((f) => f.includes('The Skull Gate')));
  assert.ok(page.facts.some((f) => /^3 great bonefires$/.test(f)));
});

test('an assault on Bonefire Crag plays: Auto fights it to an end, the same way twice', () => {
  const play = () => {
    const b = startAssault(input({ army: 'ogres', auto: true }, 100));
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
  const b = quiet({ army: 'ogres' });
  const h = b.field!.hold!;
  steps(b, 920);
  const band = h.posts.find((p) => p.def.zone === 'warpath');
  assert.ok(band, 'a band set out');
  for (const id of b.field!.groups[band.group].members) assert.ok(!b.field!.byId[id].def.startsWith('orc'), b.field!.byId[id].def);
});



test('the clans draw no bows: their archers\' places hunt, and Auto keeps the host together here', async () => {
  const { archersOnly, bowless } = await import('../src/sim/assault/garrison');
  assert.equal(bowless('ogres'), true);
  assert.equal(archersOnly(BONEFIRE_CRAG.posts.find((p) => p.id === 'towerN')!, 'ogres'), false);
});
