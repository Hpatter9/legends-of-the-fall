import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { autoDeploy, autoRound } from '../src/sim/autoplay';
import { formationOf, formationSpots, FORMATIONS_LIST } from '../src/sim/formations';
import { loadMeta, saveMeta, startedMeta } from '../src/sim/meta';
import { armyRun, startStage } from '../src/sim/run';
import { pickedFormation, pickFormation, readFormations } from '../src/sim/tacticPick';
import { HEROES, UNITS } from '../src/sim/units';

// Auto place follows the formation picked on the prep screen's Formation sheet (COMBAT-HUD, docs/notes/combat-hud.md): with a shape picked
// the heroes are set out in it, the same each time; with none, Auto places as it always has.

const shapeOf = (b: ReturnType<typeof startStage>) =>
  formationOf(b.board.d, b.units.filter((u) => u.side === 'hero' && !UNITS[u.def].summon).map((u) => ({ id: u.id, kind: u.def, u: u.u, v: u.v })))?.kind;

test('the pick is kept per army or mode, Loose forgets it, and a save keeps only known shapes', () => {
  const m: { formations?: Record<string, string> } = {};
  assert.equal(pickedFormation(m.formations, { kind: 'army', army: 'ogres' }), undefined, 'none picked');
  pickFormation(m, { kind: 'army', army: 'ogres' }, 'spear');
  assert.equal(pickedFormation(m.formations, { kind: 'army', army: 'ogres', tier: 3 }), 'spear');
  assert.equal(pickedFormation(m.formations, { kind: 'army', army: 'undead' }), undefined);
  pickFormation(m, { kind: 'army', army: 'ogres' }, undefined);
  assert.equal(m.formations, undefined, 'Loose forgets the pick');
  const store: Record<string, string> = {};
  const meta = startedMeta(4);
  pickFormation(meta, { kind: 'daily', date: 20261105, practice: false }, 'wall');
  (meta.formations as Record<string, string>).calamity = 'phalanx';
  saveMeta(meta, { setItem: (k, v) => void (store[k] = v) });
  assert.deepEqual(loadMeta(1, { getItem: (k) => store[k] ?? null }).formations, { daily: 'wall' });
  assert.equal(readFormations({ x: 3 }), undefined);
});

test('Auto place with a shape picked sets the heroes out in it, the same each time; with none, as before', () => {
  let stood = 0;
  let tries = 0;
  for (let seed = 1; seed <= 24; seed++) {
    const run = armyRun(seed, ARMIES[seed % ARMIES.length].id, HEROES);
    const meta = startedMeta(seed);
    run.gold = 500;
    autoRound(run, meta);
    // (no shape: exactly the old placing)
    const plain = autoDeploy(startStage(run), run, meta);
    assert.deepEqual(autoDeploy(startStage(run), run, meta, undefined, undefined), plain);
    for (const shape of FORMATIONS_LIST) {
      const b = startStage(run);
      const spots = autoDeploy(b, run, meta, undefined, shape);
      assert.equal(spots.length, run.squad.length, 'every hero placed');
      assert.equal(new Set(spots.map((s) => `${s.u},${s.v}`)).size, spots.length, 'no two on a tile');
      assert.deepEqual(autoDeploy(startStage(run), run, meta, undefined, shape), spots, 'deterministic');
      // (each hero on its tile of the shape, as the Formation sheet's Arrange sets them out)
      const tiles = formationSpots(b.board, run.squad.map((id) => run.roster.find((h) => h.id === id)!.kind), shape);
      assert.deepEqual(spots.map((s) => [s.u, s.v]), tiles.map((t) => [t.u, t.v]), `${seed} ${shape}`);
      // (the shape reads back wherever the party can make it: a wall needs two front-liners, a spearhead three in the lead, and so on)
      tries++;
      if (shapeOf(b) === shape) stood++;
    }
  }
  assert.ok(stood > tries / 3, `${stood} of ${tries} stood in the picked shape`);
});

test('a party that can make every shape stands in each one Auto places it in', () => {
  // (the Knight and Minotaur in front, the Samurai to strike, the Archer and Cleric behind: the party of the formations test)
  const kinds = ['knight', 'minotaur', 'samurai', 'archer', 'cleric'];
  const run = armyRun(9, ARMIES[0].id, HEROES);
  run.roster = kinds.map((kind, i) => ({ ...run.roster[0], id: 900 + i, kind }));
  run.squad = run.roster.map((h) => h.id);
  const meta = startedMeta(9);
  for (const shape of FORMATIONS_LIST) {
    let ok = 0;
    for (let seed = 1; seed <= 10; seed++) {
      run.seed = seed;
      const b = startStage(run);
      autoDeploy(b, run, meta, undefined, shape);
      if (shapeOf(b) === shape) ok++;
    }
    assert.ok(ok >= 8, `${shape}: ${ok} of 10 boards`);
  }
});
