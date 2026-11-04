import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, playOut } from '../src/sim/battle';
import { boostOf, finish, loadRun, newRun, saveRun, startStage, SQUAD, summonCost } from '../src/sim/run';
import { loadMeta, startedMeta, saveMeta } from '../src/sim/meta';
import { settleRun, towerRun } from '../src/sim/modes';
import { drawEvent, chooseOption, TOWER_EVENT_KINDS } from '../src/sim/events';
import { FALLEN, healParty, hpShare, hurtParty, squadHealth } from '../src/sim/health';
import { frontSpots, playTower, savedAt } from '../tools/autoplay';
import { HEROES } from '../src/sim/units';
import {
  ACT_ROWS, actOf, buy, fightSpec, chestsFor, choices, clearNode, enterNode, finishMystery, finishTower, floorOf, gearChance, inBattle, LANES, makeMap, migrateTower, openTreasure, rest, rowOf, settleTower, train, trainXp,
  type MapNode, type NodeKind,
} from '../src/sim/tower';

const store = () => {
  const s: Record<string, string> = {};
  return { getItem: (k: string) => s[k] ?? null, setItem: (k: string, v: string) => void (s[k] = v) };
};

/** Every node reachable from `from` by the map's links. */
const reach = (map: MapNode[], from: number[]): Set<number> => {
  const seen = new Set(from);
  const todo = [...from];
  while (todo.length) for (const n of map[todo.pop()!].next) if (!seen.has(n)) (seen.add(n), todo.push(n));
  return seen;
};

test('a map is the same from the same seed and act, and differs by either', () => {
  assert.deepEqual(makeMap(11, 1), makeMap(11, 1));
  assert.notDeepEqual(makeMap(11, 1), makeMap(11, 2));
  assert.notDeepEqual(makeMap(11, 1), makeMap(12, 1));
});

test('every map is connected: each first-floor node leads to the boss, and every node can be reached from the start', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const act of [1, 2, 3]) {
      const map = makeMap(seed, act);
      const first = map.filter((n) => n.row === 0).map((n) => n.id);
      const boss = map.filter((n) => n.kind === 'boss');
      assert.equal(boss.length, 1);
      assert.equal(boss[0].row, ACT_ROWS - 1);
      assert.ok(first.length >= 2, 'at least two ways to begin');
      assert.equal(reach(map, first).size, map.length, `seed ${seed}: every node is on a path from the start`);
      for (const f of first) assert.ok(reach(map, [f]).has(boss[0].id), `seed ${seed}: node ${f} reaches the boss`);
      for (const n of map) {
        assert.ok(n.lane >= 0 && n.lane < LANES);
        if (n.kind !== 'boss') assert.ok(n.next.length > 0, 'no dead ends');
        for (const to of n.next) assert.equal(map[to].row, n.row + 1);
      }
    }
  }
});

test('a map has its fixed floors, a shop and an elite, and never two of a special kind in a row', () => {
  const special: NodeKind[] = ['elite', 'campfire', 'shop'];
  for (let seed = 1; seed <= 200; seed++) {
    const map = makeMap(seed, 1);
    for (const n of map) {
      if (n.row === 0) assert.equal(n.kind, 'fight');
      if (n.row === ACT_ROWS - 2) assert.equal(n.kind, 'campfire');
      if (n.row === 5) assert.equal(n.kind, 'treasure');
      if (n.row < 3) assert.notEqual(n.kind, 'elite');
    }
    assert.ok(map.some((n) => n.kind === 'shop'), `seed ${seed} has a shop`);
    assert.ok(map.some((n) => n.kind === 'elite'), `seed ${seed} has an elite`);
    for (const n of map) for (const to of n.next) if (special.includes(n.kind) && n.row < ACT_ROWS - 3 && map[to].row < ACT_ROWS - 2) assert.ok(map[to].kind !== n.kind || n.row === 0, `seed ${seed}: ${n.kind} twice in a row`);
  }
});

test('floors count on through the acts', () => {
  assert.equal(floorOf(1, 0), 1);
  assert.equal(floorOf(1, ACT_ROWS - 1), ACT_ROWS);
  assert.equal(floorOf(2, 0), ACT_ROWS + 1);
  assert.equal(actOf(ACT_ROWS), 1);
  assert.equal(actOf(ACT_ROWS + 1), 2);
  assert.equal(rowOf(ACT_ROWS + 1), 0);
});

test('a tower run starts on the first floor of a map, with a whole party', () => {
  const run = towerRun(5, startedMeta(1));
  assert.equal(run.stage, 1);
  assert.equal(run.tower!.act, 1);
  assert.deepEqual(choices(run).map((n) => n.row), choices(run).map(() => 0));
  assert.ok(choices(run).length >= 2);
  for (const h of run.roster) assert.equal(hpShare(run, h.id), 1);
});

test('picking a node: only those joined to the last, and a node in play shuts the map', () => {
  const run = towerRun(5, startedMeta(1));
  const t = run.tower!;
  const far = t.map.find((n) => n.row === 4)!;
  assert.equal(enterNode(run, far.id), false);
  const first = choices(run)[0];
  assert.equal(enterNode(run, first.id), true);
  assert.equal(inBattle(run), true);
  assert.deepEqual(choices(run), []);
  assert.equal(enterNode(run, choices(run)[0]?.id ?? 0), false, 'one node at a time');
  clearNode(run);
  assert.equal(run.stage, 2);
  assert.deepEqual(choices(run).map((n) => n.id), first.next);
  assert.equal(enterNode(run, t.map.find((n) => n.row === 1 && !first.next.includes(n.id))?.id ?? -1), false);
});

test('a fight node brings a band fixed at entry, and a boss node the act boss', () => {
  const run = towerRun(5, startedMeta(1));
  enterNode(run, choices(run)[0].id);
  const spec = run.tower!.cur!.fight!;
  assert.equal(startStage(run).units.filter((u) => u.side === 'foe').length, spec.band.length);
  assert.deepEqual(startStage(run).units.map((u) => u.def), startStage(run).units.map((u) => u.def));
  const boss = towerRun(5, startedMeta(1));
  boss.tower!.at = -1;
  boss.stage = ACT_ROWS;
  boss.tower!.row = ACT_ROWS - 1;
  const bossNode = boss.tower!.map.find((n) => n.kind === 'boss')!;
  assert.equal(enterNode(boss, bossNode.id), true);
  const foes = startStage(boss).units.filter((u) => u.side === 'foe');
  assert.equal(foes[0].def, 'orcWarlord');
  assert.ok(foes[0].size! > 1, 'the boss is drawn big');
});

/** A run at a node of the kind, entered, with the floor given. */
const at = (kind: NodeKind, floor = 4, seed = 9) => {
  const run = towerRun(seed, startedMeta(1));
  run.stage = floor;
  const node = run.tower!.map.find((n) => n.kind === kind)!;
  run.tower!.row = node.row;
  run.tower!.at = -1;
  assert.ok(enterNode(run, node.id), kind);
  return run;
};

test('a campfire: rest heals everyone a share, the fallen too, once; training gives XP', () => {
  const run = at('campfire');
  run.tower!.hp = { [run.roster[0].id]: FALLEN, [run.roster[1].id]: 0.5 };
  assert.equal(rest(run), true);
  assert.ok(Math.abs(hpShare(run, run.roster[0].id) - (FALLEN + 0.45)) < 1e-9);
  assert.ok(Math.abs(hpShare(run, run.roster[1].id) - 0.95) < 1e-9);
  assert.equal(rest(run), false, 'one thing at a fire');
  assert.equal(train(run, run.roster[0].id), null);
  const fire = at('campfire', 6);
  // (a run saved before the climbs were reset trains the lasting XP of the kind)
  fire.local = false;
  const got = train(fire, fire.roster[0].id)!;
  assert.equal(got.kind, fire.roster[0].kind);
  assert.equal(got.xp, trainXp(6));
  assert.equal(rest(fire), false);
  clearNode(fire);
  assert.equal(fire.stage, 7);
});

test('healing never passes whole, and a cost never kills', () => {
  const run = at('campfire');
  const id = run.roster[0].id;
  run.tower!.hp[String(id)] = 0.9;
  healParty(run, 0.45);
  assert.equal(hpShare(run, id), 1);
  hurtParty(run, 2);
  assert.ok(hpShare(run, id) > 0);
  assert.ok(squadHealth(run) < 0.1);
});

test('a shop: buying spends gold, a piece is sold once, and a poor party cannot buy', () => {
  const run = at('shop', 5);
  const stock = run.tower!.cur!.shop!;
  assert.ok(stock.some((s) => s.kind === 'relic'));
  assert.ok(stock.some((s) => s.kind === 'hero'));
  assert.ok(stock.some((s) => s.kind === 'gear'));
  assert.ok(stock.some((s) => s.kind === 'heal') && stock.some((s) => s.kind === 'elixir'));
  const relic = stock.findIndex((s) => s.kind === 'relic');
  run.gold = stock[relic].cost - 1;
  assert.equal(buy(run, relic), null, 'too poor');
  run.gold = stock[relic].cost + 7;
  assert.ok(buy(run, relic));
  assert.equal(run.gold, 7);
  assert.ok(run.relics!.includes(stock[relic].ref!));
  run.gold = 999;
  assert.equal(buy(run, relic), null, 'sold');
  const hero = stock.findIndex((s) => s.kind === 'hero');
  const heroes = run.roster.length;
  assert.ok(buy(run, hero));
  assert.ok(run.roster.length > heroes || run.roster.some((h) => h.grade > 1), 'a hero joins, or merges up');
  const gear = stock.findIndex((s) => s.kind === 'gear');
  assert.ok(buy(run, gear));
  // (RUN-GEAR: a real piece, in the pack)
  assert.equal(run.pack!.length, 1);
});

test('a shop sells healing: the draught a share, the elixir all of it', () => {
  const run = at('shop', 5);
  run.gold = 999;
  const stock = run.tower!.cur!.shop!;
  for (const h of run.roster) run.tower!.hp[String(h.id)] = 0.2;
  buy(run, stock.findIndex((s) => s.kind === 'heal'));
  assert.ok(Math.abs(hpShare(run, run.roster[0].id) - 0.6) < 1e-9);
  buy(run, stock.findIndex((s) => s.kind === 'elixir'));
  assert.equal(hpShare(run, run.roster[0].id), 1);
});

test('a shop is the same each time it is entered, and its price for a hero follows the summons', () => {
  const a = at('shop', 5);
  const b = at('shop', 5);
  assert.deepEqual(a.tower!.cur!.shop, b.tower!.cur!.shop);
  assert.equal(a.tower!.cur!.shop!.find((s) => s.kind === 'hero')!.cost, summonCost(a) + 10);
});

test('treasure: the chest gives its gold and a relic or gear, once', () => {
  const run = at('treasure', 6);
  const before = run.gold;
  const lines = openTreasure(run)!;
  assert.ok(run.gold > before);
  assert.ok(lines.length >= 2);
  assert.ok((run.relics?.length ?? 0) + (run.pack?.length ?? 0) >= 1);
  assert.equal(openTreasure(run), null);
});

test('a mystery floor draws a card from the tower kinds; a spring heals; closing the card clears the floor', () => {
  assert.ok(TOWER_EVENT_KINDS.length > 5);
  const kinds = new Set<string>();
  for (let s = 1; s <= 80; s++) kinds.add(drawEvent(towerRun(s, startedMeta(1)), 4, TOWER_EVENT_KINDS).kind);
  for (const k of ['spring', 'gambler', 'altar']) assert.ok(kinds.has(k), `${k} comes up`);
  const run = towerRun(2, startedMeta(1));
  run.tower!.hp = { [run.roster[0].id]: 0.3 };
  run.event = { kind: 'spring', stage: 4, title: '', text: '', options: [{ label: 'Drink', text: '', cost: 0, effect: { t: 'heal', frac: 0.4 } }] };
  assert.ok(chooseOption(run, 0));
  assert.ok(Math.abs(hpShare(run, run.roster[0].id) - 0.7) < 1e-9);
  const m = towerRun(3, startedMeta(1));
  const node = m.tower!.map.find((n) => n.kind === 'mystery')!;
  m.tower!.row = node.row;
  m.stage = floorOf(1, node.row);
  assert.ok(enterNode(m, node.id));
  assert.ok(m.event, 'the card is waiting');
  finishMystery(m);
  assert.equal(m.stage, floorOf(1, node.row), 'not while the card is open');
  m.event = undefined;
  finishMystery(m);
  assert.equal(m.stage, floorOf(1, node.row) + 1);
});

test('the altar costs every hero hp for a relic, a gambler pays only on a win', () => {
  const run = towerRun(2, startedMeta(1));
  run.event = { kind: 'altar', stage: 4, title: '', text: '', options: [{ label: 'x', text: '', cost: 0, effect: { t: 'altar', frac: 0.25, id: 'banner' } }] };
  chooseOption(run, 0);
  assert.ok(run.relics!.includes('banner'));
  assert.ok(Math.abs(hpShare(run, run.roster[0].id) - 0.75) < 1e-9);
  const g = (win: boolean) => {
    const r = towerRun(2, startedMeta(1));
    r.gold = 100;
    r.event = { kind: 'gambler', stage: 4, title: '', text: '', options: [{ label: 'x', text: '', cost: 40, effect: { t: 'gamble', win, n: 90 } }] };
    chooseOption(r, 0);
    return r.gold;
  };
  assert.equal(g(true), 150);
  assert.equal(g(false), 60);
});

/** A run whose heroes are strong enough to win the first floor, entered at a fight node. */
const strongFight = (kind: NodeKind = 'fight') => {
  const run = towerRun(4, startedMeta(1));
  for (const h of run.roster) h.bump = { hp: 6, atk: 6 };
  const node = run.tower!.map.find((n) => n.row === 0 && n.kind === 'fight')!;
  assert.ok(enterNode(run, node.id));
  run.tower!.cur!.kind = kind;
  return run;
};
const play = (run: ReturnType<typeof strongFight>, carried: Record<string, number> = {}) => {
  const b = startStage(run);
  const spots = frontSpots(b);
  run.squad.slice(0, SQUAD).forEach((id, i) => {
    const h = run.roster.find((x) => x.id === id)!;
    place(b, h.kind, spots[i][0], spots[i][1], h.id, { ...boostOf(h), carry: carried[String(id)] });
  });
  return b;
};

test('wounds carry into the next fight, through the trait and relic bonuses', () => {
  const run = strongFight();
  const [a, c] = run.squad;
  const b = play(run, { [a]: 0.4 });
  const hero = (id: number) => b.units.find((u) => u.tag === id)!;
  assert.equal(hero(c).hp, hero(c).maxHp);
  assert.ok(Math.abs(hero(a).hp / hero(a).maxHp - 0.4) < 0.01);
  fight(b);
  assert.ok(Math.abs(hero(a).hp / hero(a).maxHp - 0.4) < 0.01, 'the start of the fight keeps the wound');
});

test('after a win the wounds are kept as shares, a fallen hero comes back at a quarter, and the party mends a little', () => {
  const run = strongFight();
  const b = play(run);
  fight(b);
  playOut(b);
  assert.equal(b.phase, 'won');
  const [a, c] = run.squad;
  const hero = (id: number) => b.units.find((u) => u.tag === id)!;
  hero(a).alive = false;
  hero(a).hp = 0;
  hero(c).hp = Math.round(hero(c).maxHp * 0.5);
  const gold = run.gold;
  finishTower(run, b, true, 3);
  assert.equal(run.stage, 2);
  assert.ok(run.gold > gold);
  assert.ok(Math.abs(hpShare(run, a) - (FALLEN + 0.1)) < 1e-9);
  assert.ok(Math.abs(hpShare(run, c) - 0.6) < 0.01);
  assert.deepEqual(run.tower!.path.length, 1);
});

test('an elite offers a relic choice and pays more; a loss ends the run', () => {
  const run = strongFight('elite');
  const b = play(run);
  fight(b);
  playOut(b);
  const plain = strongFight();
  const pb = play(plain);
  fight(pb);
  playOut(pb);
  finishTower(plain, pb, true);
  finishTower(run, b, true);
  assert.ok(run.found!.length >= 1);
  assert.equal(run.tower!.offer?.length, 3, 'an elite offers a choice of three relics (the page takes one: test/elites.test.ts)');
  assert.ok(run.gold > plain.gold, 'an elite pays more');
  const lost = strongFight();
  const lb = play(lost);
  finishTower(lost, lb, false);
  assert.equal(lost.over, true);
  assert.equal(lost.stage, 1);
});

test('a boss felled opens the next act: a new map from the first row, the floors running on', () => {
  const run = towerRun(5, startedMeta(1));
  run.stage = ACT_ROWS;
  run.tower!.row = ACT_ROWS - 1;
  const boss = run.tower!.map.find((n) => n.kind === 'boss')!;
  enterNode(run, boss.id);
  assert.equal(run.tower!.cur!.kind, 'boss');
  const first = run.tower!.map;
  clearNode(run);
  assert.equal(run.tower!.act, 2);
  assert.equal(run.tower!.bosses, 1);
  assert.equal(run.stage, ACT_ROWS + 1);
  assert.equal(run.tower!.row, 0);
  assert.notDeepEqual(run.tower!.map, first);
  assert.ok(choices(run).every((n) => n.row === 0));
});

test('later acts draw foes from the armies the run began with, and a harder foe each floor', () => {
  const m = startedMeta(1);
  const run = towerRun(7, m);
  run.stage = ACT_ROWS + 3;
  run.tower!.act = 2;
  run.tower!.armies = ['orcs', 'undead'];
  const bands = new Set<string>();
  for (let f = ACT_ROWS + 1; f < ACT_ROWS + 40; f++) {
    run.stage = f;
    const node = run.tower!.map.find((n) => n.row === 0)!;
    run.tower!.cur = undefined;
    run.tower!.row = 0;
    run.tower!.at = -1;
    enterNode(run, node.id);
    bands.add(run.tower!.cur!.fight!.band.join());
  }
  assert.ok(bands.size > 6, 'a mix of bands');
});

test('the foes grow stronger with each floor, an elite stronger than a fight', () => {
  const run = towerRun(7, startedMeta(1));
  const hp = (kind: NodeKind, floor: number) => fightSpec(run, kind, floor).stage.foes!.hp!;
  assert.ok(hp('fight', 10) > hp('fight', 2));
  assert.ok(hp('elite', 6) > hp('fight', 6));
  assert.ok(hp('fight', 80) > hp('fight', 40), 'no cap');
  assert.ok(fightSpec(run, 'elite', 6).stage.boss);
});

test('chests and equipment by floors: rewards grow with the furthest floor', () => {
  assert.deepEqual(chestsFor(5, 0), { bronze: 0, silver: 0, gold: 0 });
  assert.deepEqual(chestsFor(13, 1), { bronze: 1, silver: 1, gold: 0 });
  assert.deepEqual(chestsFor(40, 3), { bronze: 5, silver: 3, gold: 1 });
  assert.ok(gearChance(2) === 0 && gearChance(10) < gearChance(30) && gearChance(200) <= 0.9);
});

test('a lost run pays its chests into the stash and its equipment into the inventory, once and the same every time', () => {
  const lost = (floors: number, bosses: number) => {
    const run = towerRun(21, startedMeta(1));
    run.stage = floors + 1;
    run.tower!.bosses = bosses;
    run.tower!.act = bosses + 1;
    run.over = true;
    return run;
  };
  const a = startedMeta(1);
  const run = lost(30, 2);
  assert.equal(settleTower(a, { ...run, over: false }), null, 'not while it goes on');
  const s = settleTower(a, run)!;
  assert.equal(s.floors, 30);
  assert.equal(a.stash.length, s.bronze + s.silver + s.gold);
  assert.equal(s.bronze, 3);
  assert.equal(s.silver, 2);
  assert.equal(new Set(a.stash.map((c) => c.seed)).size, a.stash.length, 'each chest has its own seed');
  assert.equal(a.equipment?.length ?? 0, s.gear.length);
  const again = settleTower(a, run)!;
  assert.deepEqual(again, s);
  assert.equal(a.stash.length, s.bronze + s.silver + s.gold, 'paid once');
  const b = startedMeta(1);
  settleTower(b, lost(30, 2));
  assert.deepEqual(b.stash, a.stash);
  assert.deepEqual(b.equipment, a.equipment);
  const small = startedMeta(1);
  const ss = settleTower(small, lost(2, 0))!;
  assert.equal(small.stash.length, 0);
  assert.ok(ss.floors < s.floors);
});

test('the chests of a run survive a reload, even several of one kind', () => {
  const m = startedMeta(3);
  const run = towerRun(8, m);
  run.stage = 25;
  run.over = true;
  settleTower(m, run);
  assert.ok(m.stash.length >= 3);
  const s = store();
  saveMeta(m, s);
  const back = loadMeta(1, s);
  assert.equal(back.stash.length, m.stash.length);
});

test('the tower record is the furthest floor cleared, and an old best carries over', () => {
  const m = startedMeta(1);
  m.tower = 17;
  const s = store();
  saveMeta(m, s);
  assert.equal(loadMeta(1, s).tower, 17);
  const run = towerRun(2, m);
  run.stage = 21;
  run.best = 21;
  settleRun(m, run, { won: true, stage: 20, stars: 0 });
  assert.equal(m.tower, 20);
  settleRun(m, run, { won: true, stage: 20, stars: 0 });
  run.stage = 5;
  settleRun(m, run, { won: true, stage: 4, stars: 0 });
  assert.equal(m.tower, 20, 'never lowered');
});

test('an old tower run (no map) gets one on load, standing on the floor it was on', () => {
  const old = newRun(6);
  old.mode = { kind: 'tower' };
  old.stage = ACT_ROWS + 4;
  const s = store();
  saveRun(old, s);
  const run = loadRun(s)!;
  assert.equal(run.tower, undefined);
  migrateTower(run, ['orcs']);
  assert.equal(run.tower!.act, 2);
  assert.equal(run.tower!.row, 3);
  assert.equal(run.stage, ACT_ROWS + 4);
  assert.ok(choices(run).every((n) => n.row === 3));
  assert.ok(choices(run).length > 0);
  const before = JSON.stringify(run);
  migrateTower(run, ['orcs']);
  assert.equal(JSON.stringify(run), before, 'a run with a map is left alone');
  const plain = newRun(6);
  migrateTower(plain, ['orcs']);
  assert.equal(plain.tower, undefined);
});

test('a tower run saves and loads whole, mid-node', () => {
  const run = at('shop', 8);
  run.gold = 500;
  buy(run, 0);
  const s = store();
  saveRun(run, s);
  assert.deepEqual(loadRun(s), JSON.parse(JSON.stringify(run)));
  assert.ok(loadRun(s)!.tower!.cur!.shop![0].sold);
});

test('finish() still moves a plain run on, and a plain run has no tower', () => {
  const run = newRun(3);
  assert.equal(run.tower, undefined);
  finish(run, true);
  assert.equal(run.stage, 2);
});

test('the greedy climb is deterministic, climbs past a fresh party and (at the meta\'s lasting levels, as an older save does) goes deeper with a strong one', () => {
  const a = playTower(savedAt(3, HEROES, 1), 33, HEROES);
  const b = playTower(savedAt(3, HEROES, 1), 33, HEROES);
  assert.deepEqual(a, b);
  assert.ok(a.floors >= 1);
  const weak = playTower(savedAt(1, HEROES, 2), 34, HEROES, undefined, 40, true).floors;
  const strong = playTower(savedAt(20, HEROES, 2), 34, HEROES, undefined, 40, true).floors;
  assert.ok(strong > weak);
});
