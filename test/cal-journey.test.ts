// DEPTH-BUILD (docs/notes/depth-build.md): the Calamity's journey, its crossroads and boons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOONS, FIXED_ROUTE, KARNOK_LAND, boonFoes, boonNow, chooseBoon, chooseLand, crossroadsAfter, landAt, type Journey } from '../src/sim/calJourney';
import { calamityRun } from '../src/sim/modes';
import { startedMeta } from '../src/sim/meta';
import { fightSpec, mapFor } from '../src/sim/tower';
import { CAL_BOSSES } from '../src/sim/calamityBosses';

test("the fixed order is the rift's guardians, and a run that never chooses keeps it", () => {
  assert.deepEqual(FIXED_ROUTE, [1, 3, 6]);
  const run = calamityRun(5, startedMeta(1), 'knight');
  const t = run.tower!;
  for (let act = 1; act <= 3; act++) {
    t.act = act;
    t.map = mapFor(run, act);
    const boss = t.map.find((n) => n.kind === 'boss')!;
    const spec = fightSpec(run, 'boss', 10 + act, boss.twist, boss.id);
    assert.equal(spec.band[0], CAL_BOSSES[FIXED_ROUTE[act - 1] - 1]);
  }
});

test("the first crossroads offers three guardians not yet met, never Karnok; the choice waits at the end of Act II at that act's strength", () => {
  for (let seed = 1; seed < 30; seed++) {
    const c = crossroadsAfter(seed, undefined, 1, 3) as { after: 1; lands: number[] };
    assert.equal(c.after, 1);
    assert.equal(new Set(c.lands).size, 3);
    for (const l of c.lands) assert.ok(l >= 2 && l <= 5);
  }
  assert.deepEqual(crossroadsAfter(9, undefined, 1, 3), crossroadsAfter(9, undefined, 1, 3), 'fixed by the seed');
  const j: Journey = { cross: crossroadsAfter(9, undefined, 1, 3) };
  const pick = (j.cross as { lands: number[] }).lands[0];
  assert.equal(chooseLand(j, 7), false);
  assert.ok(chooseLand(j, pick));
  assert.deepEqual(j.route, [1, pick, KARNOK_LAND]);
  assert.equal(landAt(j, 2), pick);
  const plain = calamityRun(9, startedMeta(1), 'knight');
  const run = calamityRun(9, startedMeta(1), 'knight');
  for (const r of [plain, run]) {
    r.tower!.act = 2;
    r.tower!.map = mapFor(r, 2);
  }
  run.tower!.journey = j;
  const node = run.tower!.map.find((n) => n.kind === 'boss')!;
  const spec = fightSpec(run, 'boss', 12, node.twist, node.id);
  const was = fightSpec(plain, 'boss', 12, node.twist, node.id);
  assert.equal(spec.band[0], CAL_BOSSES[pick - 1], 'the chosen guardian');
  assert.deepEqual(spec.stage.boss, was.stage.boss, 'at the strength of its place, not its name');
  assert.equal(crossroadsAfter(9, j, 1, 3), undefined, 'once');
});

test('the second crossroads offers three boons; each gives what it says, once', () => {
  const c = crossroadsAfter(4, { route: [1, 2, 6] }, 2, 3) as { after: 2; boons: (keyof typeof BOONS)[] };
  assert.equal(c.after, 2);
  assert.equal(c.boons.length, 3);
  const j: Journey = { cross: c };
  assert.ok(chooseBoon(j, c.boons[0]));
  assert.equal(chooseBoon(j, c.boons[1]), false, 'one');
  assert.deepEqual(boonNow('purse'), { gold: 80, mend: false });
  assert.deepEqual(boonNow('mended'), { gold: 0, mend: true });
  assert.equal(boonFoes({ boon: 'harder' }, 3), 1.15);
  assert.equal(boonFoes({ boon: 'harder' }, 2), 1);
  assert.equal(boonFoes({ boon: 'easier' }, 3), 0.9);
  assert.equal(crossroadsAfter(4, { route: [1, 2, 6] }, 2, 6), undefined, 'only a three-act Calamity');
});

import { PROVISIONS, buyProvision, eatProvision, provisionsOf } from '../src/sim/calJourney';
import { rest } from '../src/sim/tower';

test('provisions: three to start, six at most; a rest eats one, and with none the party rests at half', () => {
  const j: Journey = {};
  assert.equal(provisionsOf(j), PROVISIONS.START, 'a run saved before has the start\'s three');
  for (let i = 0; i < PROVISIONS.START; i++) assert.equal(eatProvision(j), 1);
  assert.equal(provisionsOf(j), 0);
  assert.equal(eatProvision(j), PROVISIONS.HUNGRY);
  const purse = { gold: 1000 };
  for (let i = 0; i < 10; i++) buyProvision(purse, j);
  assert.equal(provisionsOf(j), PROVISIONS.MAX);
  assert.equal(purse.gold, 1000 - PROVISIONS.MAX * PROVISIONS.COST);
  assert.equal(buyProvision({ gold: 0 }, { provisions: 1 }), false, 'too poor');
});

test('a Calamity campfire rest eats a provision', () => {
  const run = calamityRun(3, startedMeta(1), 'knight');
  const t = run.tower!;
  t.cur = { id: 0, kind: 'campfire' } as never;
  assert.ok(rest(run));
  assert.equal(provisionsOf(t.journey), PROVISIONS.START - 1);
  t.journey!.provisions = 0;
  t.cur = { id: 0, kind: 'campfire' } as never;
  rest(run);
  assert.match((t.cur as { camp?: string }).camp ?? '', /hungry/);
});
