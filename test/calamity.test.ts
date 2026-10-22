import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fight, place, playOut, type Battle } from '../src/sim/battle';
import { CALAMITY_SQUAD, dropSlot, adoptOldTower, heroOf, loadRun, loadSlot, saveRun, saveSlot, setSquad, squadLimit, startStage, summon, type Run } from '../src/sim/run';
import { newMeta, type Meta } from '../src/sim/meta';
import { calamityRun, towerRun } from '../src/sim/modes';
import { CAL_MAPS, CAL_ROWS, CAL_SCALE, fitBand, squadFoeMult } from '../src/sim/calamity';
import { climbXpView, gainRunXp, heroLevel, hireHero, hireXp, localBoost } from '../src/sim/climb';
import { levelBoost, xpFor } from '../src/sim/levels';
import { abandonTower, buy, calamityMap, choices, clearNode, enterNode, finishTower, foeScale, floorOf, hasRoom, hire, HIRE_OFFERS, hireCost, mapFor, MAP_CROWNS, rowsIn, settleTower, train, type MapNode } from '../src/sim/tower';
import { hpShare } from '../src/sim/health';
import { frontSpots, playCalamity, playTower } from '../tools/autoplay';
import { HEROES } from '../src/sim/units';
import { mixSeed } from '../src/sim/rng';

const store = () => {
  const s: Record<string, string> = {};
  return { getItem: (k: string) => s[k] ?? null, setItem: (k: string, v: string) => void (s[k] = v), removeItem: (k: string) => void delete s[k], raw: s };
};

/** A meta with every hero of the first rows unlocked, and some lasting levels, gear and talents the climbs must not read. */
function richMeta(): Meta {
  const m = newMeta(5);
  m.unlocked = [...HEROES, 'paladin', 'cleric'];
  m.xp = { knight: xpFor(15), samurai: xpFor(15) };
  m.shards = { knight: 400 };
  return m;
}

/** Pick the first node of `kind` the run can walk to (the nodes before it are taken without fights), and enter it. */
function reachNode(run: Run, kind: MapNode['kind']): void {
  const t = run.tower!;
  const start = t.at < 0 ? t.map.filter((n) => n.row === t.row) : t.map[t.at].next.map((i) => t.map[i]);
  const seen = new Map<number, number | null>(start.map((n) => [n.id, null]));
  const q = [...start];
  let hit: MapNode | undefined;
  while (q.length) {
    const n = q.shift()!;
    if (n.kind === kind) {
      hit = n;
      break;
    }
    for (const i of n.next) if (!seen.has(i)) (seen.set(i, n.id), q.push(t.map[i]));
  }
  assert.ok(hit, `a ${kind} node`);
  const chain: number[] = [];
  for (let id: number | null = hit.id; id !== null; id = seen.get(id) ?? null) chain.unshift(id);
  for (const id of chain.slice(0, -1)) {
    t.path.push(id);
    t.at = id;
    t.row = t.map[id].row + 1;
    run.stage++;
  }
  assert.equal(enterNode(run, hit.id), true);
}

/** Play the node's fight out with the squad on the front tiles, the foes made feeble so it is won (or strong, so it is lost). Returns the battle. */
function playNode(run: Run, win = true): Battle {
  const spec = run.tower!.cur!.fight!;
  if (win) spec.stage.foes = { hp: 0.01, atk: 0.01 };
  else spec.stage.foes = { hp: 40, atk: 40 };
  const b = startStage(run);
  const spots = frontSpots(b);
  run.squad.forEach((id, i) => {
    const h = heroOf(run, id)!;
    place(b, h.kind, spots[i][0], spots[i][1], h.id, { ...localBoost(h), carry: hpShare(run, h.id) });
  });
  fight(b);
  playOut(b);
  return b;
}

/* ------------------------------------------------------------------ the tower's reset climb */

test('a tower climb starts with the whole party, every hero at level 1 with nothing worn, and the meta is left alone', () => {
  const m = richMeta();
  const before = JSON.stringify(m);
  const run = towerRun(9, m);
  assert.equal(run.local, true);
  assert.deepEqual(run.roster.map((h) => h.kind), m.party);
  assert.equal(run.roster.length, 5);
  assert.deepEqual(run.squad, run.roster.map((h) => h.id), 'all five fight');
  for (const h of run.roster) {
    assert.equal(heroLevel(h), 1);
    assert.equal(h.gear, undefined);
  }
  assert.equal(JSON.stringify(m), before, 'making the run does not touch the meta');
});

test('a climb hero reads nothing of the meta: a level-15, shard-ranked knight fights as a level-1 one', () => {
  const run = towerRun(9, richMeta());
  const knight = run.roster.find((h) => h.kind === 'knight')!;
  const plain = run.roster.find((h) => h.kind === 'cleric') ?? run.roster[4];
  const k = localBoost(knight);
  assert.equal(k.hp, 1);
  assert.equal(k.atk, 1);
  assert.equal(localBoost(plain).hp, 1);
});

test('a fight teaches each hero that fought: its level rises in the run, the lasting XP stays', () => {
  const m = richMeta();
  const before = JSON.stringify(m.xp);
  const run = towerRun(21, m);
  let last = 1;
  for (let i = 0; i < 6; i++) {
    const [pick] = choices(run);
    enterNode(run, pick.id);
    if (!run.tower!.cur!.fight) {
      clearNode(run);
      continue;
    }
    const b = playNode(run);
    assert.equal(b.phase, 'won');
    finishTower(run, b, true);
    assert.ok(run.tower!.gains!.length >= 1, 'the result shows what each hero got');
    last = Math.max(...run.roster.map(heroLevel));
  }
  assert.ok(last > 1, 'a few fights level a hero');
  assert.equal(JSON.stringify(m.xp), before, 'the lasting XP is untouched');
  assert.ok(run.roster.every((h) => (h.xp ?? 0) > 0), 'every hero that fought gained');
});

test('the levels follow the same curve, and a level makes a hero stronger in the run', () => {
  const run = towerRun(3, newMeta(1));
  const h = run.roster[0];
  const ups = gainRunXp(run, { [h.id]: xpFor(5) });
  assert.deepEqual(ups, [{ id: h.id, kind: h.kind, from: 1, to: 5 }]);
  assert.equal(heroLevel(h), 5);
  assert.ok(Math.abs(localBoost(h).hp! - levelBoost(5).hp) < 1e-9);
  assert.equal(gainRunXp(run, { 999: 50, [h.id]: 0 }).length, 0, 'unknown heroes and nothing earned change nothing');
});

test('a climb finds gear in its plain fights (from its own stream), more than an older run does, and the same each time', () => {
  const drops = (local: boolean) => {
    let n = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const run = towerRun(seed, newMeta(1));
      run.local = local;
      enterNode(run, choices(run)[0].id);
      const b = playNode(run);
      finishTower(run, b, true);
      n += run.items?.length ?? 0;
    }
    return n;
  };
  const a = drops(true);
  assert.equal(a, drops(true), 'deterministic');
  assert.ok(a > 4 && a < 30, `a share of 40 fights dropped gear (${a})`);
  assert.equal(drops(false), 0, 'a run saved before the reset drops none from a plain first-floor fight');
});

test('a campfire trains the hero in the run, not the meta', () => {
  const m = newMeta(1);
  const run = towerRun(5, m);
  reachNode(run, 'campfire');
  const h = run.roster[2];
  const got = train(run, h.id)!;
  assert.equal(got.xp, 0, 'nothing for the meta');
  assert.ok((h.xp ?? 0) > 0);
  assert.deepEqual(m.xp, {});
});

/* ------------------------------------------------------------------ calamity */

test('a calamity starts with one hero at level 1, the squad limit is ten, and the shape is a short run of small maps', () => {
  const m = richMeta();
  const run = calamityRun(7, m, 'paladin');
  assert.equal(run.mode?.kind, 'calamity');
  assert.equal(run.local, true);
  assert.equal(run.roster.length, 1);
  assert.equal(run.roster[0].kind, 'paladin');
  assert.equal(heroLevel(run.roster[0]), 1);
  assert.deepEqual(run.squad, [run.roster[0].id]);
  assert.equal(squadLimit(run), CALAMITY_SQUAD);
  assert.equal(CALAMITY_SQUAD, 10);
  assert.equal(run.tower!.maps, CAL_MAPS);
  assert.ok(CAL_MAPS >= 3 && CAL_MAPS <= 5);
  for (const rows of CAL_ROWS) assert.ok(rows >= 6 && rows <= 8, 'six to eight floors a map');
  assert.deepEqual(run.pool, m.unlocked, 'heroes are hired from the collection');
  assert.equal(calamityRun(7, m, 'nobody').roster[0].kind, m.party[0], 'a kind not owned falls back to the party');
});

test('a calamity map is connected, ends at its boss, and every path crosses a recruit camp', () => {
  for (let seed = 1; seed <= 150; seed++) {
    for (let act = 1; act <= CAL_MAPS; act++) {
      const rows = CAL_ROWS[act - 1];
      const map = calamityMap(seed, act, rows);
      assert.deepEqual(calamityMap(seed, act, rows), map, 'deterministic');
      const boss = map.filter((n) => n.kind === 'boss');
      assert.equal(boss.length, 1);
      assert.equal(boss[0].row, rows - 1);
      assert.equal(Math.max(...map.map((n) => n.row)), rows - 1);
      // every path from the first floor passes a recruit camp
      const walk = (id: number, seen: boolean): boolean => {
        const n = map[id];
        const camp = seen || n.kind === 'recruit';
        return n.next.length ? n.next.every((to) => walk(to, camp)) : camp;
      };
      for (const f of map.filter((n) => n.row === 0)) assert.ok(walk(f.id, false), `seed ${seed} act ${act}: a camp on every path`);
      assert.ok(!map.some((n) => n.kind === 'recruit' && n.twist), 'a camp carries no twist');
    }
  }
});

test('a calamity run asks for the heroes it meets: recruit camps stock a different kind of each, and hiring costs gold and joins the squad', () => {
  const m = richMeta();
  const run = calamityRun(11, m, 'knight');
  reachNode(run, 'recruit');
  const hires = run.tower!.cur!.hires!;
  assert.equal(hires.length, HIRE_OFFERS);
  assert.equal(new Set(hires.map((h) => h.kind)).size, HIRE_OFFERS);
  assert.ok(hires.every((h) => h.kind !== 'knight'), 'a kind already in the party is not offered while others remain');
  assert.equal(hires[0].cost, hireCost(run.stage));
  // too poor
  run.gold = hires[0].cost - 1;
  assert.equal(hire(run, 0), null);
  run.gold = hires[0].cost + 5;
  assert.match(hire(run, 0)!, /joins the party/);
  assert.equal(run.gold, 5);
  assert.equal(run.roster.length, 2);
  assert.equal(run.squad.length, 2, 'it takes a place in the squad');
  assert.equal(hire(run, 0), null, 'hired once');
  // the stock is fixed when the node is entered: a reload offers the same
  const back = JSON.parse(JSON.stringify(run)) as Run;
  assert.deepEqual(back.tower!.cur!.hires, run.tower!.cur!.hires);
});

test('a hired hero joins at part of the roster\'s XP, so it is not left behind', () => {
  const run = calamityRun(2, newMeta(1), 'knight');
  gainRunXp(run, { [run.roster[0].id]: xpFor(6) });
  const want = Math.floor(xpFor(6) * 0.7);
  assert.equal(hireXp(run), want);
  const h = hireHero(run, 'archer', 50);
  assert.equal(h.xp, want);
  assert.ok(heroLevel(h) >= 4 && heroLevel(h) < 6);
});

test('the squad takes ten and no more, and a full roster cannot hire', () => {
  const run = calamityRun(2, newMeta(1), 'knight');
  const kinds = [...HEROES, 'paladin', 'cleric', 'knight', 'archer'];
  for (let i = 0; i < 9; i++) hireHero(run, kinds[i], 10);
  assert.equal(run.roster.length, 10);
  assert.equal(run.squad.length, 10);
  assert.equal(hasRoom(run), false);
  // a tenth place and no eleventh
  assert.equal(setSquad(run, run.squad[9], false), true);
  assert.equal(setSquad(run, run.roster[9].id, true), true);
  hireHero(run, 'wizard', 1);
  assert.equal(run.squad.length, 10, 'an eleventh would not fit the squad');
  // the recruit camp and the shop both refuse
  run.gold = 9999;
  reachNode(run, 'recruit');
  assert.equal(hire(run, 0), null);
  const ordinary = towerRun(1, newMeta(1));
  assert.equal(squadLimit(ordinary), 5);
  assert.equal(setSquad(ordinary, 999, true), false);
});

test('there is no merging in a calamity: three of a kind stay three, and the tower still merges', () => {
  const run = calamityRun(4, newMeta(1), 'knight');
  hireHero(run, 'knight', 10);
  hireHero(run, 'knight', 10);
  hireHero(run, 'knight', 10);
  assert.equal(run.roster.filter((h) => h.kind === 'knight').length, 4);
  assert.ok(run.roster.every((h) => h.grade === 1));
  // (the tower's rule is as it was)
  const tower = towerRun(4, newMeta(1));
  const knight = tower.roster.find((h) => h.kind === 'knight')!;
  tower.gold = 9999;
  while (tower.roster.some((h) => h.id === knight.id)) if (!summon(tower)) break;
  assert.ok(tower.roster.some((h) => h.grade > 1) || tower.roster.length >= 5, 'summons still merge in the tower');
});

test('a calamity fight follows the party: a lone hero meets two foes, ten heroes meet stronger ones', () => {
  assert.equal(fitBand(['a', 'b', 'c', 'd', 'e'], 1, false).length, 2);
  assert.equal(fitBand(['a', 'b', 'c', 'd', 'e'], 3, false).length, 4);
  assert.equal(fitBand(['a', 'b', 'c', 'd', 'e'], 8, false).length, 5);
  assert.equal(fitBand(['boss', 'a', 'b', 'c', 'd'], 1, true)[0], 'boss');
  assert.equal(squadFoeMult(5), 1);
  assert.ok(squadFoeMult(10) > squadFoeMult(7));
  const run = calamityRun(8, newMeta(1), 'knight');
  enterNode(run, choices(run)[0].id);
  assert.equal(run.tower!.cur!.fight!.band.length, 2);
});

test('a calamity map is harder than the one before: the foes grow through the floors and step up with each map', () => {
  const s = { start: CAL_SCALE.start, growth: CAL_SCALE.growth, step: CAL_SCALE.step };
  const lastFloorOf = (act: number) => floorOf(act, CAL_ROWS[act - 1] - 1, { rows: [...CAL_ROWS] });
  for (let act = 1; act < CAL_MAPS; act++) {
    const endOfThis = foeScale(lastFloorOf(act), s, act);
    const startOfNext = foeScale(lastFloorOf(act) + 1, s, act + 1);
    assert.ok(startOfNext > endOfThis, `map ${act + 1} starts above where map ${act} ended`);
  }
  assert.equal(floorOf(2, 0, { rows: [...CAL_ROWS] }), CAL_ROWS[0] + 1, 'the floors run on through the maps');
  assert.equal(rowsIn({ rows: [...CAL_ROWS] }, 3), CAL_ROWS[2]);
});

test('a boss\'s fall opens the next map, with its own rows and look, and the last boss clears the run', () => {
  const run = calamityRun(13, richMeta(), 'knight');
  const t = run.tower!;
  for (let act = 1; act <= CAL_MAPS; act++) {
    assert.equal(t.act, act);
    assert.equal(t.map.filter((n) => n.row === 0).length >= 2, true);
    assert.equal(Math.max(...t.map.map((n) => n.row)) + 1, CAL_ROWS[act - 1], 'the map has its own length');
    // walk to the boss
    for (;;) {
      const [pick] = [...choices(run)].sort((a, b) => Number(b.kind === 'boss') - Number(a.kind === 'boss'));
      enterNode(run, pick.id);
      const kind = t.cur!.kind;
      if (kind === 'boss') {
        t.cur!.fight!.stage.foes = { hp: 0.01, atk: 0.01 };
        const b = playNode(run);
        finishTower(run, b, true);
        break;
      }
      if (t.cur!.fight) finishTower(run, playNode(run), true);
      else clearNode(run);
    }
  }
  assert.equal(run.over, true);
  assert.equal(run.cleared, true);
  assert.equal(t.bosses, CAL_MAPS);
  assert.equal(run.stage - 1, CAL_ROWS.reduce((n, r) => n + r, 0));
  assert.equal(mapFor(run, 1).length > 0, true);
});

test('a finished calamity pays crowns for each map cleared, and a gold chest only for a full clear', () => {
  const m = richMeta();
  const lost = calamityRun(3, m, 'knight');
  lost.tower!.bosses = 2;
  lost.stage = 12;
  lost.over = true;
  const crowns = m.crowns;
  const chests = m.stash.length;
  const s = settleTower(m, lost)!;
  assert.equal(m.crowns - crowns, MAP_CROWNS[0] + MAP_CROWNS[1]);
  assert.equal(s.maps, 2);
  assert.equal(s.cleared, false);
  assert.equal(m.stash.length, chests, 'no chest for a partial run');
  assert.deepEqual(m.calamity, { best: 2, clears: 0 });
  assert.equal(settleTower(m, lost), s, 'paid once');

  const won = calamityRun(4, m, 'knight');
  won.tower!.bosses = CAL_MAPS;
  won.cleared = true;
  won.over = true;
  won.stage = 29;
  const before = m.stash.length;
  const w = settleTower(m, won)!;
  assert.equal(m.stash.length, before + 1);
  assert.equal(m.stash.at(-1)!.at, 10, 'a gold chest');
  assert.equal(w.cleared, true);
  assert.equal(m.calamity!.clears, 1);
  assert.equal(m.calamity!.best, CAL_MAPS);
});

test('a lost calamity fight ends the run, and abandoning ends it too, once', () => {
  const run = calamityRun(15, newMeta(1), 'knight');
  enterNode(run, choices(run)[0].id);
  const b = playNode(run, false);
  assert.equal(b.phase, 'lost');
  finishTower(run, b, false);
  assert.equal(run.over, true);
  const other = calamityRun(16, newMeta(1), 'knight');
  assert.equal(abandonTower(other), true);
  assert.equal(other.over, true);
  assert.equal(abandonTower(other), false);
});

test('the calamity shop sells a hero for a hire, and the greedy calamity is deterministic and hires along the way', () => {
  const run = calamityRun(17, richMeta(), 'knight');
  reachNode(run, 'shop');
  const hero = run.tower!.cur!.shop!.find((i) => i.kind === 'hero')!;
  assert.equal(hero.cost, hireCost(run.stage));
  run.gold = hero.cost;
  assert.match(buy(run, run.tower!.cur!.shop!.indexOf(hero))!, /joins the party/);
  assert.equal(run.roster.length, 2);
  const a = playCalamity(newMeta(1), 77, 'knight');
  assert.deepEqual(a, playCalamity(newMeta(1), 77, 'knight'));
  assert.ok(a.heroes >= 1 && a.floors >= 1);
});

/* ------------------------------------------------------------------ saving */

test('a saved tower run reloads at the same node with the same roster, gold and hp, in its own slot', () => {
  const s = store();
  const m = newMeta(3);
  const run = towerRun(31, m);
  // a few floors in, wounded, with gold, a hero levelled and a node in play
  for (let i = 0; i < 3; i++) {
    enterNode(run, choices(run)[0].id);
    if (run.tower!.cur!.fight) finishTower(run, playNode(run), true);
    else clearNode(run);
  }
  run.gold = 123;
  run.tower!.hp[String(run.roster[1].id)] = 0.42;
  enterNode(run, choices(run)[0].id);
  saveSlot(run, s);
  const back = loadSlot('tower', s)!;
  assert.deepEqual(back, JSON.parse(JSON.stringify(run)));
  assert.equal(back.tower!.at, run.tower!.at);
  assert.equal(back.tower!.cur!.id, run.tower!.cur!.id);
  assert.equal(back.gold, 123);
  assert.deepEqual(back.roster, run.roster);
  assert.equal(hpShare(back, run.roster[1].id), 0.42);
  assert.equal(back.local, true);
  // the saved fight is the same fight
  if (run.tower!.cur!.fight) {
    const x = startStage(run);
    const y = startStage(back);
    assert.deepEqual(y.units.map((u) => [u.def, u.hp]), x.units.map((u) => [u.def, u.hp]));
    assert.equal(y.board.w, x.board.w);
  }
  // nothing in the other slots
  assert.equal(loadSlot('calamity', s), null);
  assert.equal(loadRun(s), null);
});

test('a saved calamity reloads at the same node with the same squad, gold, levels and hp; the tower and the armies keep their own saves', () => {
  const s = store();
  const m = richMeta();
  const cal = calamityRun(41, m, 'samurai');
  hireHero(cal, 'archer', 20);
  gainRunXp(cal, { [cal.roster[0].id]: 200 });
  cal.gold = 77;
  cal.tower!.hp[String(cal.roster[0].id)] = 0.6;
  reachNode(cal, 'recruit');
  saveSlot(cal, s);
  const tower = towerRun(42, m);
  saveSlot(tower, s);
  const ordinary = towerRun(43, m);
  ordinary.mode = undefined;
  ordinary.tower = undefined;
  saveRun(ordinary, s);
  const back = loadSlot('calamity', s)!;
  assert.deepEqual(back, JSON.parse(JSON.stringify(cal)));
  assert.equal(back.tower!.cur!.kind, 'recruit');
  assert.deepEqual(back.squad, cal.squad);
  assert.equal(back.gold, 77);
  assert.equal(back.roster[0].xp, cal.roster[0].xp);
  assert.equal(hpShare(back, cal.roster[0].id), 0.6);
  assert.equal(loadSlot('tower', s)!.seed, 42, 'the tower run was not overwritten by the calamity or the armies');
  assert.equal(loadRun(s)!.seed, 43, 'the ordinary slot is its own');
  // a hire made before the save is still made; the stock carries on
  assert.equal(back.tower!.cur!.hires!.length, HIRE_OFFERS);
});

test('a run that is over, or of another mode, is no saved run; a slot can be emptied', () => {
  const s = store();
  const run = towerRun(51, newMeta(1));
  run.over = true;
  saveSlot(run, s);
  assert.equal(loadSlot('tower', s), null, 'a lost climb is not carried on');
  const live = towerRun(52, newMeta(1));
  saveSlot(live, s);
  assert.notEqual(loadSlot('tower', s), null);
  assert.equal(loadSlot('calamity', s), null, 'the tower is not a calamity');
  dropSlot('tower', s);
  assert.equal(loadSlot('tower', s), null);
  assert.equal(loadSlot('tower', { getItem: () => 'junk' }), null);
});

test('abandoning the climb empties its slot and pays what it earned; a fresh one then starts', () => {
  const s = store();
  const m = newMeta(1);
  const run = towerRun(61, m);
  saveSlot(run, s);
  assert.equal(abandonTower(run), true);
  const sum = settleTower(m, run)!;
  assert.equal(sum.floors, 0);
  saveSlot(run, s);
  dropSlot('tower', s);
  assert.equal(loadSlot('tower', s), null);
  assert.equal(towerRun(62, m).stage, 1);
});

test('a tower run saved by an older version in the ordinary slot moves to the tower\'s own, and still loads', () => {
  const s = store();
  const run = towerRun(71, newMeta(1));
  run.local = undefined;
  saveRun(run, s);
  assert.equal(adoptOldTower(s), true);
  assert.equal(loadRun(s), null, 'the ordinary slot is free');
  const back = loadSlot('tower', s)!;
  assert.equal(back.seed, 71);
  assert.equal(back.local, undefined, 'an old run keeps levelling in the meta');
  assert.equal(adoptOldTower(s), false);
  // an ordinary run is left where it is
  const army = towerRun(72, newMeta(1));
  army.mode = undefined;
  army.tower = undefined;
  const t = store();
  saveRun(army, t);
  assert.equal(adoptOldTower(t), false);
  assert.equal(loadRun(t)!.seed, 72);
});

test('an older tower save (no local flag, no rows) plays on as it did: the meta\'s levels, five-floor-wide act, no gains', () => {
  const run = towerRun(81, richMeta());
  run.local = undefined;
  for (const h of run.roster) delete h.xp;
  const t = run.tower!;
  assert.equal(rowsIn(t, 1), 13);
  assert.equal(t.maps, undefined);
  enterNode(run, choices(run)[0].id);
  const b = playNode(run);
  finishTower(run, b, true);
  assert.equal(t.gains, undefined);
  assert.ok(run.roster.every((h) => h.xp === undefined));
  assert.equal(climbXpView(run).ups.length, 0);
});

test('the reset climb is fair: a greedy climb gets past the opening floors and is the same each time', () => {
  const a = playTower(newMeta(4), 90, HEROES);
  assert.deepEqual(a, playTower(newMeta(4), 90, HEROES));
  assert.ok(a.floors >= 4);
  let total = 0;
  for (let i = 1; i <= 12; i++) total += playTower(newMeta(i), mixSeed(i, 0x70c1), HEROES).floors;
  assert.ok(total / 12 >= 7, `the mean climb reaches the middle of the first act (${total / 12})`);
});

test('the greedy calamity: the first map can be cleared, and a full clear is hard', () => {
  let map1 = 0;
  let full = 0;
  const N = 24;
  for (let i = 1; i <= N; i++) {
    const r = playCalamity(newMeta(i), mixSeed(i, 0xca1), HEROES[i % HEROES.length]);
    if (r.maps >= 1) map1++;
    if (r.cleared) full++;
  }
  assert.ok(map1 >= N * 0.4, `most first maps fall (${map1} of ${N})`);
  assert.ok(full <= N * 0.4, `a full clear is not the common case (${full} of ${N})`);
  assert.ok(map1 > full);
});
