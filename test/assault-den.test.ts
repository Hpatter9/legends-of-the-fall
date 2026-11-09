// ASSAULT-DEN (docs/notes/assault-4.md; the design's phase 4): the Howling Den, the Beast Packs' hold. Its field is the same every time
// and sound (reachable outside, shut inside, every post on ground); the gorge's river can be crossed only by the rope bridge and the two
// fords; the baileys open only through their gates; its structures, garrison and names are its own; and an assault on it plays to its end
// with the Beast Packs' own fighters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHold, fieldProblems, floodFrom, openFort } from '../src/sim/assault/fieldMap';
import { DEN } from '../src/sim/assault/maps/beasts';
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

test('the Den is registered, named by the owner, the same every time it is built, and sound', () => {
  assert.equal(HOLDS.beasts, DEN);
  assert.equal(blueprintOf('beasts'), DEN);
  assert.equal(DEN.name, 'Howling Den');
  assert.equal(holdName('beasts'), 'Howling Den');
  assert.equal(DEN.stencil.length, 50);
  for (const row of DEN.stencil) assert.equal(row.length, 50);
  assert.equal(sum(buildHold(DEN)), sum(buildHold(DEN)));
  for (const other of [BLOODTUSK, BARROW]) assert.notEqual(sum(buildHold(DEN)), sum(buildHold(other)), `its own field, not ${other.name}'s`);
  assert.deepEqual(fieldProblems(buildHold(DEN), DEN), []);
});

test('the gorge\'s river runs edge to edge: only the rope bridge and the two fords cross it', () => {
  const m = buildHold(DEN);
  const w = m.board.w;
  const rally = DEN.rally.v * w + DEN.rally.u;
  // (the moor beyond the gorge, by the Fang Gate's road)
  const fields = 60 * w + 77;
  assert.equal(floodFrom(cloneBoard(m.board), rally, 1)[fields], 1, 'reachable across the gorge');
  // (with the bridge and the fords flooded, nothing crosses)
  const b = cloneBoard(m.board);
  for (let i = 0; i < b.tiles.length; i++) if (b.tiles[i].bridge || b.tiles[i].ground === 'water') b.tiles[i] = { ...b.tiles[i], bridge: undefined, ground: 'deep' };
  assert.equal(floodFrom(b, rally, 3)[fields], 0, 'the river is a barrier');
  // (each approach's way stands on ground or the bridge, and the fords are shallow water)
  for (const a of DEN.approaches) for (const p of a.way) assert.ok(standable(m.board.tiles[p.v * w + p.u]), `${a.id} at (${p.u}, ${p.v})`);
  const ford = m.board.tiles[70 * w + 92];
  assert.equal(ford.ground, 'water');
});

test('the baileys open only through a gate: the Fang Gate the outer, the Antler Gate the inner', () => {
  const m = buildHold(DEN);
  const b = cloneBoard(m.board);
  const w = b.w;
  const rally = DEN.rally.v * w + DEN.rally.u;
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
  for (const n of ['The Fang Gate', 'The Antler Gate', 'The West Howling Stone', 'The East Howling Stone', 'The Gate Howling Stone']) assert.ok(names.includes(n), n);
});

test('the garrison: 200 of the Beast Packs\' own (180 posted, 20 to come), an Alpha Werewolf where the Council has no one, the Boar King on the seat', () => {
  const d = defendersOf(DEN);
  assert.equal(d.posted + d.bands, 200);
  const b = startAssault(input({ army: 'beasts' }));
  const f = b.field!;
  const h = f.hold!;
  const kinds = new Set(h.garrison.map((id) => f.byId[id].def));
  for (const k of ['packBlack', 'packRed', 'packWhite', 'warWolf', 'alphaWolf', 'boarKing']) assert.ok(kinds.has(k), k);
  for (const k of kinds) assert.ok(!k.startsWith('orc'), `${k} is not an orc`);
  assert.equal(f.byId[h.lord].def, 'boarKing');
  assert.equal(UNITS.warWolf.summon, true);
  // (the codex's page is built)
  const page = holdPages(startedMeta(1)).find((p) => p.army === 'beasts')!;
  assert.ok(page.built && page.name === 'Howling Den');
  assert.ok(page.facts.some((f) => f.includes('The Antler Gate')));
  assert.ok(page.facts.some((f) => /^3 howling stones$/.test(f)));
});

test('an assault on the Den plays: Auto fights it to an end, the same way twice', () => {
  const play = () => {
    const b = startAssault(input({ army: 'beasts', auto: true }, 75));
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
  const b = quiet({ army: 'beasts' });
  const h = b.field!.hold!;
  steps(b, 920);
  const band = h.posts.find((p) => p.def.zone === 'warpath');
  assert.ok(band, 'a band set out');
  for (const id of b.field!.groups[band.group].members) assert.ok(!b.field!.byId[id].def.startsWith('orc'), b.field!.byId[id].def);
});

test('the Den draws no bows: its archers\' places are held by Red Werewolves, who hunt from them; the other holds\' archers keep to their perches', async () => {
  const { archersOnly } = await import('../src/sim/assault/garrison');
  const tower = DEN.posts.find((p) => p.id === 'towerN')!;
  assert.equal(tower.roster, 'AAA');
  assert.equal(archersOnly(tower, 'beasts'), false);
  assert.equal(archersOnly(BLOODTUSK.posts.find((p) => p.id === 'towerN')!, 'orcs'), true);
  assert.equal(archersOnly(BARROW.posts.find((p) => p.id === 'towerN')!, 'undead'), true);
  assert.equal(UNITS.packRed.range, 1);
});

test('the pack hunts our shooters first: a Den post goes round a nearer swordsman for an archer within its reach; Bloodtusk Hold\'s takes the nearer', async () => {
  const { quiet, steps } = await import('./assaultKit');
  const { occClear, occPut, rebuildBuckets } = await import('../src/sim/assault/field');
  const { freeNear } = await import('../src/sim/assault/garrison');
  assert.equal(DEN.huntShooters, true);
  assert.equal(BLOODTUSK.huntShooters, undefined);
  const markOf = (army: string) => {
    const b = quiet({ army });
    const f = b.field!;
    const h = f.hold!;
    const p = h.posts.find((x) => x.def.id === 'lumber')!;
    const home = f.groups[p.group].home;
    p.mood = 'alerted';
    const soldierOf = (kind: string) => f.byId[h.platoons.find((pl) => pl.hero === kind)!.soldiers[0].id];
    const put = (x: (typeof b.units)[number], at: { u: number; v: number }) => {
      occClear(f, x);
      const to = freeNear(b, f, at, false);
      x.u = to.u;
      x.v = to.v;
      occPut(f, x);
      return to;
    };
    const sword = put(soldierOf('knight'), { u: home.u + 3, v: home.v });
    const bow = put(soldierOf('archer'), { u: home.u, v: home.v + 8 });
    rebuildBuckets(f, b.units);
    steps(b, 10);
    return { mark: p.mark, sword, bow };
  };
  const den = markOf('beasts');
  assert.ok(Math.abs(den.mark.u - den.bow.u) + Math.abs(den.mark.v - den.bow.v) <= 2, `the Den's pack marks the archer (${JSON.stringify(den)})`);
  const orc = markOf('orcs');
  assert.ok(Math.abs(orc.mark.u - orc.sword.u) + Math.abs(orc.mark.v - orc.sword.v) <= 2, `Bloodtusk Hold's post marks the nearer swordsman (${JSON.stringify(orc)})`);
});
