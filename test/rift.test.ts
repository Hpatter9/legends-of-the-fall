import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, playOut, type BattleEvent } from '../src/sim/battle';
import { localBoost, heroLevel, hireHero } from '../src/sim/climb';
import { startedMeta } from '../src/sim/meta';
import { calamityRun, towerRun } from '../src/sim/modes';
import { loadSlot, recycle, saveSlot, startStage } from '../src/sim/run';
import { chooseAltar, growStarter, pendingAltar, reforgeAltar, RIFT_BOSSES } from '../src/sim/rift';
import { tickRift } from '../src/sim/riftBattle';
import { choices, enterNode, fightSpec, mapFor } from '../src/sim/tower';
import { CAL_MAPS, CAL_ROWS } from '../src/sim/calamity';
import { CAL_BOSSES } from '../src/sim/calamityBosses';
import { frontSpots } from '../tools/autoplay';

const fresh = () => calamityRun(14, startedMeta(1), 'knight');
function build(patron: string, corrupt = false) {
  const run = fresh();
  growStarter(run);
  assert.equal(chooseAltar(run, patron, corrupt), true);
  return run;
}
function field(patron: string, ally = false, corrupt = false) {
  const run = build(patron, corrupt);
  if (ally) hireHero(run, 'paladin', 0);
  run.tower!.cur = { id: 0, kind: 'boss', fight: { band: ['calBoss1'], stage: { foes: { hp: 2, atk: 0.1 } } } };
  const b = startStage(run);
  const spots = frontSpots(b);
  run.roster.forEach((h, i) => assert.equal(place(b, h.kind, spots[i][0], spots[i][1], h.id, localBoost(h)), true));
  assert.equal(fight(b), true);
  return { run, b, starter: b.units.find((x) => x.tag === run.rift!.starter)! };
}

test('new Calamity runs track one starter and three regions; legacy saved runs keep six maps', () => {
  const run = fresh();
  assert.equal(run.roster.length, 1);
  assert.equal(heroLevel(run.roster[0]), 1);
  assert.equal(run.tower!.maps, 3);
  assert.equal(run.rift!.starter, run.roster[0].id);
  const legacy = fresh();
  delete legacy.rift;
  legacy.tower!.rows = [...CAL_ROWS];
  legacy.tower!.maps = CAL_MAPS;
  for (let act = 1; act <= CAL_MAPS; act++) {
    legacy.tower!.act = act;
    assert.equal(fightSpec(legacy, 'boss', act * 6).band[0], CAL_BOSSES[act - 1]);
  }
  const values: Record<string, string> = {};
  const storage = { setItem: (k: string, v: string) => { values[k] = v; }, getItem: (k: string) => values[k] ?? null };
  saveSlot(legacy, storage);
  assert.deepEqual(loadSlot('calamity', storage), legacy);
  assert.equal(pendingAltar(legacy), undefined);
});

test('an altar unlocks after the solo opening, gates travel, and validates a choice atomically', () => {
  const run = fresh();
  assert.equal(pendingAltar(run), undefined);
  assert.equal(chooseAltar(run, 'ember'), false);
  growStarter(run);
  assert.equal(pendingAltar(run), 'patron');
  assert.equal(enterNode(run, choices(run)[0].id), false);
  const before = JSON.stringify(run);
  assert.equal(chooseAltar(run, 'toString', true), false);
  assert.equal(JSON.stringify(run), before);
  assert.equal(chooseAltar(run, 'ember'), true);
  assert.equal(chooseAltar(run, 'echo', true), false);
  assert.equal(run.rift!.corruption, 0);
  assert.equal(heroLevel(run.roster[0]), 6);
});

test('starter growth is guaranteed without kills, side fights cannot farm it, and a starter cannot be sold', () => {
  const meta = startedMeta(1);
  const before = JSON.stringify(meta);
  const run = calamityRun(4, meta, 'knight');
  for (let i = 0; i < 8; i++) growStarter(run);
  assert.equal(heroLevel(run.roster[0]), 17);
  growStarter(run, true);
  assert.equal(run.rift!.wins, 8);
  const ally = hireHero(run, 'paladin', 0);
  assert.ok(heroLevel(ally) > 1);
  assert.equal(recycle(run, run.rift!.starter), null);
  assert.ok(recycle(run, ally.id)! > 0);
  assert.equal(JSON.stringify(meta), before);
});

test('guardian milestones unlock offering and commandment once, surviving a save round trip', () => {
  const run = build('bastion');
  assert.equal(chooseAltar(run, 'fury'), false);
  run.tower!.bosses = 1;
  assert.equal(chooseAltar(run, 'fury', true), true);
  assert.equal(heroLevel(run.roster[0]), 16);
  run.tower!.bosses = 2;
  const restored = JSON.parse(JSON.stringify(run));
  assert.equal(pendingAltar(restored), 'commandment');
  assert.equal(chooseAltar(restored, 'together'), true);
  assert.equal(heroLevel(restored.roster[0]), 26);
  assert.equal(restored.rift.corruption, 1);
  assert.equal(pendingAltar(restored), undefined);
});

test('reforging changes the patron, spends the camp action and preserves corruption', () => {
  const run = build('ember', true);
  assert.equal(reforgeAltar(run, 'echo'), false);
  run.tower!.cur = { id: 1, kind: 'campfire' };
  assert.equal(reforgeAltar(run, 'echo'), true);
  assert.equal(run.rift!.patron, 'echo');
  assert.equal(run.rift!.corruption, 1);
  assert.equal(reforgeAltar(run, 'bastion'), false);
});

test('Ember deals damage, Bastion protects nearby allies and Echo charges their skills', () => {
  const ember = field('ember');
  const foe = ember.b.units.find((x) => x.side === 'foe')!;
  const hp = foe.hp;
  ember.b.t = 4000;
  tickRift(ember.b, []);
  assert.ok(foe.hp < hp);
  const bastion = field('bastion', true);
  bastion.b.t = 4000;
  tickRift(bastion.b, []);
  assert.ok(bastion.starter.shield!.hp > 0);
  assert.ok(bastion.b.units.find((x) => x.tag === bastion.run.roster[1].id)!.shield!.hp > 0);
  const echo = field('echo', true);
  echo.b.units.filter((x) => x.side === 'hero').forEach((x) => { x.charge = 0; });
  echo.b.t = 4000;
  tickRift(echo.b, []);
  assert.equal(echo.starter.charge, 12);
  assert.equal(echo.b.units.find((x) => x.tag === echo.run.roster[1].id)!.charge, 12);
});

test('commandments reward the specified formation and require a living starter', () => {
  const { b, starter } = field('echo');
  b.rift!.commandment = 'solitude';
  starter.charge = 0;
  b.t = 4000;
  tickRift(b, []);
  assert.equal(starter.charge, 28); // rank two: (12 + 4) * 1.75
  starter.alive = false;
  starter.charge = 0;
  b.t = 8000;
  tickRift(b, []);
  assert.equal(starter.charge, 0);
});

test('corruption strengthens both sides and a boss telegraphs its damaging pulse', () => {
  const safe = field('ember');
  const risky = field('ember', false, true);
  assert.ok(risky.starter.power! > safe.starter.power!);
  const safeFoe = safe.b.units.find((x) => x.side === 'foe')!;
  const riskyFoe = risky.b.units.find((x) => x.side === 'foe')!;
  assert.ok(riskyFoe.maxHp > safeFoe.maxHp);
  assert.ok(riskyFoe.power! > safeFoe.power!);
  const events: BattleEvent[] = [];
  risky.b.t = 7000;
  tickRift(risky.b, events);
  assert.ok(events.some((x) => x.kind === 'skill' && x.name === 'Calamity pulse'));
  const hp = risky.starter.hp;
  risky.b.t = 8000;
  tickRift(risky.b, []);
  assert.ok(risky.starter.hp < hp);
  safe.b.t = 8000;
  const safeHp = safe.starter.hp;
  tickRift(safe.b, []);
  assert.equal(safe.starter.hp, safeHp);
});

test('all altar paths replay deterministically and ordinary tower battles have no altar state', () => {
  for (const patron of ['ember', 'bastion', 'echo']) {
    const a = field(patron, true, true).b;
    const c = field(patron, true, true).b;
    playOut(a);
    playOut(c);
    assert.deepEqual(a, c);
  }
  assert.equal(startStage(towerRun(14, startedMeta(1))).rift, undefined);
});

test('new regions end in the first herald, third herald and final Calamity', () => {
  const run = fresh();
  for (let act = 1; act <= 3; act++) {
    run.tower!.act = act;
    run.tower!.map = mapFor(run, act);
    assert.equal(fightSpec(run, 'boss', act * 6).band[0], CAL_BOSSES[RIFT_BOSSES[act - 1] - 1]);
  }
});

test('a final boss entry guarantees level 30 and tier three, even on a short route', () => {
  const run = build('ember');
  run.tower!.bosses = 2;
  chooseAltar(run, 'fury');
  chooseAltar(run, 'solitude');
  const t = run.tower!;
  t.act = 3;
  t.map = mapFor(run, 3);
  const boss = t.map.find((n) => n.kind === 'boss')!;
  // Reach the lair over cleared bridges, as a short route would.
  t.path = t.map.filter((n) => n.id !== boss.id).map((n) => n.id);
  t.here = t.map.find((n) => n.next.includes(boss.id))!.id;
  assert.equal(enterNode(run, boss.id), true);
  assert.equal(heroLevel(run.roster[0]), 30);
  assert.equal(run.roster[0].grade, 3);
});

test('a corrupted boss inherits its patron: Bastion shields and Echo drains charge', () => {
  const bastion = field('bastion', false, true);
  const foe = bastion.b.units.find((x) => x.side === 'foe')!;
  foe.shield = undefined;
  bastion.b.t = 8000;
  tickRift(bastion.b, []);
  assert.ok(foe.shield!.hp > 0);
  const echo = field('echo', false, true);
  echo.starter.charge = 100;
  echo.starter.shield = { hp: 1000000, until: 10000 };
  echo.b.rift!.corruption = 3;
  echo.b.t = 8000;
  tickRift(echo.b, []);
  assert.equal(echo.starter.charge, 90.25); // drain 24, recover 2.25 from taking a hit and 12 from the altar
});

test('a fallen boss stops pulsing even while its escort is alive', () => {
  const { b, starter } = field('ember', false, true);
  const boss = b.units.find((x) => x.side === 'foe')!;
  b.units.push({ ...boss, id: b.nextId++ });
  boss.alive = false;
  const hp = starter.hp;
  b.t = 8000;
  tickRift(b, []);
  assert.equal(starter.hp, hp);
});
