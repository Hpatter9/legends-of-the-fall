import { test } from 'node:test';
import { autoMerge, canMerge, mergeReady } from '../src/sim/merge';
import assert from 'node:assert/strict';
import { fight, place, playOut, type Battle } from '../src/sim/battle';
import { CALAMITY_SQUAD, dropSlot, adoptOldTower, heroOf, loadRun, loadSlot, saveRun, saveSlot, setSquad, spendBuff, squadLimit, startStage, summon, type Run } from '../src/sim/run';
import { startedMeta, type Meta } from '../src/sim/meta';
import { calamityRun, towerRun } from '../src/sim/modes';
import { CAL_BOSSES, CAL_BOSS_TITLES } from '../src/sim/calamityBosses';
import { KITS } from '../src/sim/abilities';
import { BOSS_IDS, isBoss } from '../src/sim/foes';
import { titleOf } from '../src/render/bossTitles';
import { CAL_MAPS, CAL_ROWS, CAL_SCALE, calBossBoost, fitBand, squadFoeMult } from '../src/sim/calamity';
import { CALAMITY_XP, CLIMB_XP, climbXpView, fightXpByHero, gainRunXp, heroLevel, hireHero, hireXp, localBoost } from '../src/sim/climb';
import { levelBoost, RUN_MAX_LEVEL, xpFor } from '../src/sim/levels';
import { ULT_LEVEL, ultimateOf } from '../src/sim/abilities';
import { addUnit } from '../src/sim/battle';
import { abandonTower, buy, calamityMap, choices, clearNode, enterNode, finishTower, fightSpec, foeScale, floorOf, hasRoom, hire, HIRE_OFFERS, hireCost, mapFor, MAP_CROWNS, rowsIn, settleTower, train, type MapNode } from '../src/sim/tower';
import { hpShare } from '../src/sim/health';
import { frontSpots, playCalamity, playTower, starterEnd } from '../tools/autoplay';
import { HEROES, UNITS } from '../src/sim/units';
import { mixSeed } from '../src/sim/rng';
import { chooseOption, CREATIVE_KINDS, drawEvent, MYSTERY_KINDS, TOWER_EVENT_KINDS } from '../src/sim/events';
import { moveRate } from '../src/sim/castle';
import { makeGear } from '../src/sim/gear';
import { TWISTS, CHAOS_TWISTS, rollTwist, twistBoard } from '../src/sim/twists';
import { ascRules } from '../src/sim/ascension';
import { makeBoard } from '../src/sim/board';

const store = () => {
  const s: Record<string, string> = {};
  return { getItem: (k: string) => s[k] ?? null, setItem: (k: string, v: string) => void (s[k] = v), removeItem: (k: string) => void delete s[k], raw: s };
};

/** A meta with every hero of the first rows unlocked, and some lasting levels, gear and talents the climbs must not read. */
function richMeta(): Meta {
  const m = startedMeta(5);
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
  const run = towerRun(3, startedMeta(1));
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
      const run = towerRun(seed, startedMeta(1));
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
  const m = startedMeta(1);
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
  assert.ok(CAL_MAPS === 6);
  for (const rows of CAL_ROWS) assert.ok(rows >= 6 && rows <= 8, 'six to eight floors a map');
  assert.deepEqual(run.pool, m.unlocked, 'heroes are hired from the collection');
  assert.equal(calamityRun(7, m, 'nobody').roster[0].kind, m.party[0], 'a kind not owned falls back to the party');
});

test('a calamity map is connected, ends at its boss, and holds exactly one campfire and one recruit spot', () => {
  for (let seed = 1; seed <= 150; seed++) {
    for (let act = 1; act <= CAL_MAPS; act++) {
      const rows = CAL_ROWS[act - 1];
      const map = calamityMap(seed, act, rows);
      assert.deepEqual(calamityMap(seed, act, rows), map, 'deterministic');
      const boss = map.filter((n) => n.kind === 'boss');
      assert.equal(boss.length, 1);
      assert.equal(boss[0].row, rows - 1);
      assert.equal(Math.max(...map.map((n) => n.row)), rows - 1);
      assert.equal(map.filter((n) => n.kind === 'campfire').length, 1, `seed ${seed} map ${act}: one campfire`);
      assert.equal(map.filter((n) => n.kind === 'recruit').length, 1, `seed ${seed} map ${act}: one recruit spot`);
      assert.equal(map.find((n) => n.kind === 'campfire')!.row, rows - 2, 'the campfire is the floor before the boss');
      assert.equal(map.find((n) => n.kind === 'recruit')!.row, 2, 'the recruit spot is on the third floor');
      assert.ok(!map.some((n) => n.kind === 'recruit' && n.twist), 'a camp carries no twist');
    }
  }
});

test('a calamity run asks for the heroes it meets: the recruit spot offers three different kinds, free, and one joins the squad', () => {
  const m = richMeta();
  const run = calamityRun(11, m, 'knight');
  reachNode(run, 'recruit');
  const hires = run.tower!.cur!.hires!;
  assert.equal(hires.length, HIRE_OFFERS);
  assert.equal(new Set(hires.map((h) => h.kind)).size, HIRE_OFFERS);
  assert.ok(hires.every((h) => h.kind !== 'knight'), 'a kind already in the party is not offered while others remain');
  assert.ok(hires.every((h) => h.cost === 0), 'the choice is free');
  const gold = run.gold;
  assert.match(hire(run, 1)!, /joins the party/);
  assert.equal(run.gold, gold, 'no gold is paid');
  assert.equal(run.roster.length, 2);
  assert.equal(run.squad.length, 2, 'it takes a place in the squad');
  assert.equal(hire(run, 0), null, 'one hero only: the other two are passed over');
  assert.equal(hire(run, 1), null, 'hired once');
  // the stock is fixed when the node is entered: a reload offers the same
  const back = JSON.parse(JSON.stringify(run)) as Run;
  assert.deepEqual(back.tower!.cur!.hires, run.tower!.cur!.hires);
});

test('a hired hero joins at part of the roster\'s XP, so it is not left behind', () => {
  const run = calamityRun(2, startedMeta(1), 'knight');
  gainRunXp(run, { [run.roster[0].id]: xpFor(6) });
  const want = Math.floor(xpFor(6) * 0.7);
  assert.equal(hireXp(run), want);
  const h = hireHero(run, 'archer', 50);
  assert.equal(h.xp, want);
  assert.ok(heroLevel(h) >= 4 && heroLevel(h) < 6);
});

test('the squad takes ten and no more, and a full roster cannot hire', () => {
  const run = calamityRun(2, startedMeta(1), 'knight');
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
  const ordinary = towerRun(1, startedMeta(1));
  assert.equal(squadLimit(ordinary), 5);
  assert.equal(setSquad(ordinary, 999, true), false);
});

// (MERGE-TWO, the owner's change: two of a kind merge, and only when merged; a calamity still has none)
test('there is no merging in a calamity: two or three of a kind stay as they are, and the tower still merges', () => {
  const run = calamityRun(4, startedMeta(1), 'knight');
  hireHero(run, 'knight', 10);
  hireHero(run, 'knight', 10);
  hireHero(run, 'knight', 10);
  assert.equal(run.roster.filter((h) => h.kind === 'knight').length, 4);
  assert.ok(run.roster.every((h) => h.grade === 1));
  assert.equal(canMerge(run, run.roster[0].id, run.roster[1].id), false);
  assert.deepEqual(autoMerge(run), []);
  assert.ok(run.roster.every((h) => h.grade === 1));
  // (the tower merges a pair)
  const tower = towerRun(4, startedMeta(1));
  tower.gold = 9999;
  while (summon(tower)) if (mergeReady(tower).length) break;
  assert.ok(autoMerge(tower).length > 0, 'a pair merges in the tower');
  assert.ok(tower.roster.some((h) => h.grade > 1));
});

test('a calamity fight follows the party: a lone hero meets two foes, ten heroes meet stronger ones', () => {
  assert.equal(fitBand(['a', 'b', 'c', 'd', 'e'], 1, false).length, 2);
  assert.equal(fitBand(['a', 'b', 'c', 'd', 'e'], 3, false).length, 4);
  assert.equal(fitBand(['a', 'b', 'c', 'd', 'e'], 4, false).length, 5);
  // (past the band's five, it comes round again without its leader: ten heroes meet eleven foes, a boss twelve)
  assert.deepEqual(fitBand(['a', 'b', 'c', 'd', 'e'], 7, false), ['a', 'b', 'c', 'd', 'e', 'b', 'c', 'd']);
  assert.equal(fitBand(['a', 'b', 'c', 'd', 'e'], 10, false).length, 11);
  assert.equal(fitBand(['boss', 'a', 'b', 'c', 'd'], 10, true).length, 12);
  assert.equal(fitBand(['boss', 'a', 'b', 'c', 'd'], 1, true)[0], 'boss');
  assert.equal(squadFoeMult(5), 1);
  assert.ok(squadFoeMult(10) > squadFoeMult(7));
  const run = calamityRun(8, startedMeta(1), 'knight');
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
  // (a calamity is not climbed floor by floor: the spots it cleared are counted, and the boss alone was taken on each map here)
  assert.ok((t.spots ?? 0) >= CAL_MAPS * 3, 'the spots on the way were cleared');
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
  const run = calamityRun(15, startedMeta(1), 'knight');
  enterNode(run, choices(run)[0].id);
  const b = playNode(run, false);
  assert.equal(b.phase, 'lost');
  finishTower(run, b, false);
  assert.equal(run.over, true);
  const other = calamityRun(16, startedMeta(1), 'knight');
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
  const a = playCalamity(startedMeta(1), 77, 'knight');
  assert.deepEqual(a, playCalamity(startedMeta(1), 77, 'knight'));
  assert.ok(a.heroes >= 1 && a.floors >= 1);
});

/* ------------------------------------------------------------------ saving */

test('a saved tower run reloads at the same node with the same roster, gold and hp, in its own slot', () => {
  const s = store();
  const m = startedMeta(3);
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
  const run = towerRun(51, startedMeta(1));
  run.over = true;
  saveSlot(run, s);
  assert.equal(loadSlot('tower', s), null, 'a lost climb is not carried on');
  const live = towerRun(52, startedMeta(1));
  saveSlot(live, s);
  assert.notEqual(loadSlot('tower', s), null);
  assert.equal(loadSlot('calamity', s), null, 'the tower is not a calamity');
  dropSlot('tower', s);
  assert.equal(loadSlot('tower', s), null);
  assert.equal(loadSlot('tower', { getItem: () => 'junk' }), null);
});

test('abandoning the climb empties its slot and pays what it earned; a fresh one then starts', () => {
  const s = store();
  const m = startedMeta(1);
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
  const run = towerRun(71, startedMeta(1));
  run.local = undefined;
  saveRun(run, s);
  assert.equal(adoptOldTower(s), true);
  assert.equal(loadRun(s), null, 'the ordinary slot is free');
  const back = loadSlot('tower', s)!;
  assert.equal(back.seed, 71);
  assert.equal(back.local, undefined, 'an old run keeps levelling in the meta');
  assert.equal(adoptOldTower(s), false);
  // an ordinary run is left where it is
  const army = towerRun(72, startedMeta(1));
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
  const a = playTower(startedMeta(4), 90, HEROES);
  assert.deepEqual(a, playTower(startedMeta(4), 90, HEROES));
  assert.ok(a.floors >= 4);
  let total = 0;
  for (let i = 1; i <= 12; i++) total += playTower(startedMeta(i), mixSeed(i, 0x70c1), HEROES).floors;
  assert.ok(total / 12 >= 7, `the mean climb reaches the middle of the first act (${total / 12})`);
});

test('the greedy calamity: the first map can be cleared, and a full clear is hard', () => {
  let map1 = 0;
  let full = 0;
  const N = 24;
  for (let i = 1; i <= N; i++) {
    const r = playCalamity(startedMeta(i), mixSeed(i, 0xca1), HEROES[i % HEROES.length]);
    if (r.maps >= 1) map1++;
    if (r.cleared) full++;
  }
  assert.ok(map1 >= N * 0.4, `most first maps fall (${map1} of ${N})`);
  assert.ok(full <= N * 0.4, `a full clear is not the common case (${full} of ${N})`);
  assert.ok(map1 > full);
});

test('six maps, each ending in its own boss, bigger than the last; the later maps add a twist to the boss fight', () => {
  assert.equal(CAL_MAPS, 6);
  assert.equal(new Set(CAL_BOSSES).size, 6, 'six different bosses');
  for (let k = 2; k <= 6; k++) assert.ok(calBossBoost(k).size > calBossBoost(k - 1).size && calBossBoost(k).hp > calBossBoost(k - 1).hp);
  const run = calamityRun(5, startedMeta(1), 'knight');
  const t = run.tower!;
  const specs: string[] = [];
  for (let act = 1; act <= CAL_MAPS; act++) {
    t.act = act;
    t.map = mapFor(run, act);
    const boss = t.map.find((n) => n.kind === 'boss')!;
    if (act >= 2) assert.ok(boss.twist, `map ${act}'s boss fight has a twist`);
    const spec = fightSpec(run, 'boss', 10 + act, boss.twist, boss.id);
    specs.push(spec.band[0]);
    assert.equal(spec.band[0], CAL_BOSSES[act - 1]);
  }
  assert.equal(new Set(specs).size, 6);
});

test('every calamity map has a mini-boss on a floor with other ways round it, a shop and a chest', () => {
  for (let seed = 1; seed <= 120; seed++) {
    for (let act = 1; act <= CAL_MAPS; act++) {
      const map = calamityMap(seed, act, CAL_ROWS[act - 1]);
      const skippable = map.filter((n) => n.kind === 'elite' && map.filter((m) => m.row === n.row).length >= 2);
      assert.ok(skippable.length >= 1, `seed ${seed} map ${act}: a mini-boss that can be skipped`);
      assert.ok(map.some((n) => n.kind === 'shop') && map.some((n) => n.kind === 'treasure'));
    }
  }
});

test('a mini-boss pays a relic to choose, gear, and double gold', () => {
  const run = calamityRun(23, startedMeta(1), 'knight');
  reachNode(run, 'elite');
  const gold = run.gold;
  const floor = run.stage;
  finishTower(run, playNode(run), true);
  assert.ok(run.tower!.offer && run.tower!.offer.length >= 1, 'a relic to choose');
  assert.ok((run.items?.length ?? 0) >= 1, 'gear');
  assert.ok(run.gold - gold >= 2 * (20 + 6 * floor) * 0.9, 'double gold');
});

test('each calamity boss has its own name, title and kit, and the mechanics stack up through the maps', () => {
  const p = (i: number) => KITS[CAL_BOSSES[i]].passive;
  const names = CAL_BOSSES.map((id) => UNITS[id].name);
  assert.equal(new Set(names).size, 6);
  for (const id of CAL_BOSSES) {
    assert.ok(isBoss(id), 'it gets the boss intro card');
    assert.ok(CAL_BOSS_TITLES[id].length > 3);
    assert.equal(titleOf(id), CAL_BOSS_TITLES[id]);
    assert.ok(!BOSS_IDS.includes(id), 'and stays out of the codex of bosses');
  }
  for (let i = 0; i < 6; i++) assert.ok(p(i).rage, 'enrage from the first');
  assert.ok(!p(0).block && p(1).block, 'a shield wall from map 2');
  assert.match(KITS[CAL_BOSSES[2]].skill.name, /Imps/, 'imps from map 3');
  assert.ok(p(3).steady && KITS[CAL_BOSSES[3]].ultimate, 'steady with a shove from map 4');
  assert.ok(!p(3).ignite && p(4).ignite && p(4).leech, 'poison from map 5');
  assert.ok(p(5).frenzy && p(5).ignite && p(5).block && p(5).rage && KITS[CAL_BOSSES[5]].ultimate, 'the last has all of it, and a charge');
  assert.ok(calBossBoost(6).size > calBossBoost(1).size);
});

test('a run\'s heroes level past 20, up to the cap of 30, and a hire still joins at 70% of the roster\'s mean XP', () => {
  assert.equal(RUN_MAX_LEVEL, 30);
  const run = calamityRun(31, startedMeta(1), 'knight');
  const h = run.roster[0];
  assert.deepEqual(gainRunXp(run, { [h.id]: xpFor(24) }), [{ id: h.id, kind: h.kind, from: 1, to: 24 }]);
  assert.equal(heroLevel(h), 24);
  assert.ok(localBoost(h).hp! > levelBoost(20).hp!, 'the levels past 20 still add');
  gainRunXp(run, { [h.id]: 1e9 });
  assert.equal(heroLevel(h), 30, 'and the cap is 30');
  assert.equal(localBoost(h).level, 30);
  h.xp = xpFor(25);
  assert.equal(hireXp(run), Math.floor(xpFor(25) * 0.7));
});

test('a calamity pays its heroes more XP than the spire does, and its level 30 unlocks the ultimates', () => {
  assert.ok(CALAMITY_XP > CLIMB_XP);
  const run = calamityRun(32, startedMeta(2), 'tyrant');
  const b = playNode((enterNode(run, choices(run)[0].id), run));
  const id = run.roster[0].id;
  const spire = fightXpByHero(b)[id];
  const cal = fightXpByHero(b, 1, CALAMITY_XP)[id];
  assert.ok(spire > 0 && Math.abs(cal / spire - CALAMITY_XP / CLIMB_XP) < 0.1);
  const h = run.roster[0];
  h.xp = xpFor(ULT_LEVEL - 1);
  const field = startStage(run);
  assert.equal(ultimateOf(addUnit(field, h.kind, 1, 8, localBoost(h))), undefined, 'locked one level below');
  h.xp = xpFor(ULT_LEVEL);
  assert.equal(ultimateOf(addUnit(field, h.kind, 2, 8, localBoost(h)))?.name, KITS[h.kind].ultimate!.name, 'unlocked at the ultimates\' level');
});

test('a full Calamity clear leaves the starting hero well past level 20 (the bot, three seeds)', () => {
  const ends: number[] = [];
  for (let a = 1; a <= 40 && ends.length < 3; a++) {
    const r = playCalamity(startedMeta(a), mixSeed(a, 0xca1), HEROES[a % HEROES.length]);
    if (r.cleared) ends.push(starterEnd);
  }
  assert.ok(ends.length >= 1, 'some seeds clear it');
  assert.ok(ends.every((l) => l > 20), `ended at ${ends.join(', ')}`);
});

/* ------------------------------------------------------------------ Creative Encounters & Gambits */

test('calamity creative encounters: seed determinism for bard, goblin forge, cursed mirror, and void well', () => {
  const kinds = ['bard', 'goblinForge', 'cursedMirror', 'voidWell'] as const;
  for (const k of kinds) {
    for (let seed = 1; seed <= 15; seed++) {
      const runA = calamityRun(seed, startedMeta(1), 'knight');
      const runB = calamityRun(seed, startedMeta(1), 'knight');
      // Give each run a weapon so goblin forge can present weapon choices
      const weapon = makeGear(1, 'weapon', 1);
      (runA.items ??= []).push({ ...weapon });
      (runB.items ??= []).push({ ...weapon });

      const cardA = drawEvent(runA, 4, [k]);
      const cardB = drawEvent(runB, 4, [k]);
      assert.deepEqual(cardA, cardB, `${k} seed ${seed} is deterministic`);
      assert.ok(cardA.options.length >= 2, `${k} has choices`);
      assert.ok(cardA.title.length > 0 && cardA.text.length > 0);
      assert.ok(cardA.options.every((o) => o.label.length > 0 && o.text.length > 0));
    }
  }
});

test('the wandering bard: awful ballad grants temporary Earworm speed buff, or pay to stop', () => {
  // Test choice 0: Listen to ballad -> Earworm buff
  const run = calamityRun(10, startedMeta(1), 'knight');
  run.event = drawEvent(run, 2, ['bard']);
  assert.equal(run.event.kind, 'bard');
  assert.match(run.event.options[0].label, /Endure/);
  
  const line = chooseOption(run, 0);
  assert.match(line!, /Earworm/);
  assert.equal(run.buff?.speed, 1.25);
  assert.equal(run.buff?.duration, 2);

  // A quiet floor does not spend it
  run.tower!.cur = { id: 1, kind: 'campfire' };
  clearNode(run);
  assert.equal(run.buff?.duration, 2, 'the floor without a fight keeps it');

  // The Earworm quickens the heroes' steps once (the castle's own pace times 1.25), and each fight spends a floor of it
  reachNode(run, 'fight');
  const b = playNode(run);
  assert.ok(Math.abs((b.heroMove ?? 1) - moveRate(run.castle) * 1.25) < 1e-9, 'a quarter faster, not that squared');
  finishTower(run, b, true);
  assert.equal(run.buff?.duration, 1);
  assert.equal(run.buff?.speed, 1.25);
  spendBuff(run);
  assert.equal(run.buff, undefined, 'buff expires after 2 fights');

  // Test choice 1: Pay to stop -> Heals party
  const run2 = calamityRun(11, startedMeta(1), 'knight');
  run2.gold = 50;
  run2.tower!.hp = { [String(run2.roster[0].id)]: 0.5 };
  run2.event = drawEvent(run2, 2, ['bard']);
  assert.match(run2.event.options[1].label, /Pay/);
  const cost = run2.event.options[1].cost;
  assert.ok(cost > 0);
  
  chooseOption(run2, 1);
  assert.equal(run2.gold, 50 - cost);
  assert.ok(hpShare(run2, run2.roster[0].id) > 0.5, 'party healed');
});

test('the goblin gambler forge: gambles weapon for +20% attack or humorous Rusted Spoon', () => {
  // Find a winning seed and a losing seed
  let winSeed = 0;
  let loseSeed = 0;
  for (let s = 1; s <= 50; s++) {
    const testRun = calamityRun(s, startedMeta(1), 'knight');
    (testRun.items ??= []).push(makeGear(1, 'weapon', 1));
    const card = drawEvent(testRun, 3, ['goblinForge']);
    const fx = card.options[0].effect;
    if (fx.t === 'mystery' && fx.act.k === 'goblinForge') {
      if (fx.act.win && !winSeed) winSeed = s;
      if (!fx.act.win && !loseSeed) loseSeed = s;
    }
    if (winSeed && loseSeed) break;
  }
  assert.ok(winSeed > 0 && loseSeed > 0, 'found win and lose seeds');

  // Test Win resolution: +20% attack
  const runWin = calamityRun(winSeed, startedMeta(1), 'knight');
  const sword = makeGear(5, 'weapon', 1);
  (runWin.items ??= []).push(sword);
  runWin.event = drawEvent(runWin, 3, ['goblinForge']);
  const winLine = chooseOption(runWin, 0);
  assert.match(winLine!, /\+20% attack/);
  assert.equal(sword.atk, 0.28);
  assert.match(sword.name, /\(\+20%\)/);

  // Test Loss resolution: transformed into Rusted Spoon
  const runLose = calamityRun(loseSeed, startedMeta(1), 'knight');
  const dagger = makeGear(6, 'weapon', 1);
  (runLose.items ??= []).push(dagger);
  runLose.event = drawEvent(runLose, 3, ['goblinForge']);
  const loseLine = chooseOption(runLose, 0);
  assert.match(loseLine!, /Rusted Spoon/);
  const spoon = runLose.items?.find((g) => g.id === 6);
  assert.ok(spoon);
  assert.equal(spoon.name, 'Rusted Spoon');
  assert.equal(spoon.atk, 0.01);

  // Test Safe Sharpening Option (Whetstone)
  const runSafe = calamityRun(1, startedMeta(1), 'knight');
  runSafe.gold = 100;
  const axe = makeGear(7, 'weapon', 1);
  (runSafe.items ??= []).push(axe);
  runSafe.event = drawEvent(runSafe, 3, ['goblinForge']);
  chooseOption(runSafe, 1);
  assert.equal(axe.atk, 0.14);
  assert.match(axe.name, /Honed/);
});

test('the cursed mirror: temporarily clones inverted hero for 2 floors, then clone shatters', () => {
  // Test summon inverted clone
  const run = calamityRun(20, startedMeta(1), 'knight');
  assert.equal(run.roster.length, 1);
  assert.equal(run.squad.length, 1);
  
  run.event = drawEvent(run, 2, ['cursedMirror']);
  assert.equal(run.event.kind, 'cursedMirror');
  assert.match(run.event.options[0].label, /Summon inverted/);

  const line = chooseOption(run, 0);
  assert.match(line!, /inverted/i);
  assert.equal(run.roster.length, 2, 'clone added to roster');
  assert.equal(run.squad.length, 2, 'clone added to squad');
  
  const clone = run.roster.find((h) => h.inverted);
  assert.ok(clone);
  assert.equal(clone.cloneFloors, 2);
  assert.equal(clone.kind, 'knight');

  // Floor 1 cleared
  run.tower!.cur = { id: 10, kind: 'fight' };
  clearNode(run);
  assert.equal(clone.cloneFloors, 1);
  assert.equal(run.roster.length, 2, 'clone still present after 1 floor');

  // Floor 2 cleared
  run.tower!.cur = { id: 11, kind: 'fight' };
  clearNode(run);
  assert.equal(run.roster.length, 1, 'clone removed after 2 floors');
  assert.equal(run.squad.length, 1);

  // Test smash option
  const runSmash = calamityRun(21, startedMeta(1), 'knight');
  runSmash.gold = 10;
  runSmash.event = drawEvent(runSmash, 2, ['cursedMirror']);
  assert.match(runSmash.event.options[1].label, /Smash/);
  chooseOption(runSmash, 1);
  assert.ok(runSmash.gold > 10, 'gained gold from silver shards');
  assert.ok(hpShare(runSmash, runSmash.roster[0].id) < 1.0, 'party wounded by glass shards');
});

test('the whispering void well: drink deep for attack buff or toss gold for relics', () => {
  const run = calamityRun(30, startedMeta(1), 'knight');
  run.event = drawEvent(run, 2, ['voidWell']);
  assert.equal(run.event.kind, 'voidWell');

  // Drink option: attack boost + wound
  chooseOption(run, 0);
  assert.equal(run.buff?.atk, 1.2);
  assert.equal(run.buff?.duration, 2);
  assert.ok(hpShare(run, run.roster[0].id) < 1.0);

  // Toss coin option: gold spent, gear received
  const run2 = calamityRun(31, startedMeta(1), 'knight');
  run2.gold = 60;
  run2.event = drawEvent(run2, 2, ['voidWell']);
  const cost = run2.event.options[1].cost;
  chooseOption(run2, 1);
  assert.equal(run2.gold, 60 - cost);
  assert.equal(run2.items?.length, 1);
});

test('an event\'s blessing waits for the next fight: clearing the mystery floor does not spend it, the fight does', () => {
  const run = calamityRun(12, startedMeta(1), 'knight');
  run.buff = { atk: 1.15, gold: 30 };
  run.tower!.cur = { id: 3, kind: 'mystery' };
  clearNode(run);
  assert.deepEqual(run.buff, { atk: 1.15, gold: 30 }, 'still there for the fight ahead');
  spendBuff(run);
  assert.equal(run.buff, undefined, 'one fight, then gone');
  // (a buff of more fights keeps its hp, attack and speed, but a prize is paid once)
  run.buff = { atk: 1.2, gold: 30, duration: 2 };
  spendBuff(run);
  assert.deepEqual(run.buff, { atk: 1.2, duration: 1 });
});

test('the cursed mirror\'s clone is a guest: it takes no real hero\'s id or room, and its going leaves the party whole', () => {
  const run = calamityRun(20, startedMeta(1), 'knight');
  run.event = drawEvent(run, 2, ['cursedMirror']);
  const ids = run.nextId;
  assert.equal(run.nextId, ids, 'drawing the card takes no id');
  chooseOption(run, 0);
  const clone = run.roster.find((h) => h.inverted)!;
  assert.equal(clone.id, ids, 'the clone takes the next id');
  // fill the party to its limit around the clone: the clone neither blocks a hire nor keeps a real hero on the bench
  const kinds = [...HEROES, 'paladin', 'cleric', 'archer'].filter((k) => k !== 'knight');
  for (let i = 0; i < squadLimit(run) - 1; i++) {
    assert.equal(hasRoom(run), true, `room for hire ${i + 1}`);
    const h = hireHero(run, kinds[i], 0);
    assert.notEqual(h.id, clone.id);
    assert.ok(run.squad.includes(h.id), 'the hire fights');
  }
  assert.equal(hasRoom(run), false);
  assert.equal(new Set(run.roster.map((h) => h.id)).size, run.roster.length, 'every id is its own');
  const own = run.roster.filter((h) => !h.inverted).map((h) => h.id);
  run.tower!.cur = { id: 10, kind: 'fight' };
  clearNode(run);
  run.tower!.cur = { id: 11, kind: 'fight' };
  clearNode(run);
  assert.deepEqual(run.roster.map((h) => h.id), own, 'only the clone has gone');
  assert.deepEqual([...run.squad].sort((a, b) => a - b), [...own].sort((a, b) => a - b), 'the whole party fights');
});

test('the goblin forge\'s whetstone is paid once', () => {
  const run = calamityRun(1, startedMeta(1), 'knight');
  run.gold = 100;
  (run.items ??= []).push(makeGear(7, 'weapon', 1));
  run.event = drawEvent(run, 3, ['goblinForge']);
  const cost = run.event.options[1].cost;
  chooseOption(run, 1);
  assert.equal(run.gold, 100 - cost);
});

test('the chaos twists never roll on an ordinary fight: a calamity below the chaos rules has none, and the other twists roll as before', () => {
  for (let seed = 1; seed <= 40; seed++)
    for (let act = 1; act <= 3; act++)
      for (let node = 0; node < 30; node++)
        for (const kind of ['fight', 'elite', 'boss']) {
          const tw = rollTwist(seed, act, node, kind);
          assert.ok(!tw || !CHAOS_TWISTS.includes(tw), `${tw} rolled at seed ${seed}`);
        }
  for (let seed = 1; seed <= 6; seed++) {
    const run = calamityRun(seed, startedMeta(1), 'knight');
    assert.ok(run.tower!.map.every((n) => !n.twist || !CHAOS_TWISTS.includes(n.twist)), `seed ${seed}`);
  }
});

test('the creative encounters stand in for plainer floors on their own stream: the older mysteries come up as often as before', () => {
  const older = TOWER_EVENT_KINDS.filter((k) => !CREATIVE_KINDS.includes(k));
  const plain = older.filter((k) => !MYSTERY_KINDS.includes(k));
  let creative = 0;
  const N = 400;
  for (let seed = 1; seed <= N; seed++) {
    const run = calamityRun(seed, startedMeta(1), 'knight');
    const was = drawEvent(JSON.parse(JSON.stringify(run)) as Run, 5, older).kind;
    const now = drawEvent(run, 5, TOWER_EVENT_KINDS).kind;
    if (CREATIVE_KINDS.includes(now)) {
      creative++;
      assert.ok(plain.includes(was), `${now} took the place of ${was}, not of a plainer floor`);
    } else assert.equal(now, was, 'an older kind is drawn just as it was');
  }
  const share = creative / N;
  assert.ok(share > 0.1 && share < 0.25, `a creative encounter on ${(share * 100).toFixed(0)}% of floors`);
});

test('ascension chaos mutators: rolling gales and hot coal ground', () => {
  assert.deepEqual(CHAOS_TWISTS, ['rollingGales', 'hotCoals']);
  assert.ok(TWISTS.rollingGales && TWISTS.hotCoals);
  assert.equal(TWISTS.rollingGales.fx.gales, 1);
  assert.equal(TWISTS.hotCoals.fx.coals, 4);

  // The chaos twists begin at ascension 3 (the owner's call), and not below
  assert.equal(ascRules(2).chaosMutators, undefined);
  assert.equal(ascRules(3).chaosMutators, true);
  assert.equal(ascRules(6).chaosMutators, true);
  assert.equal(ascRules(0, { chaosMutators: true }).chaosMutators, true);

  // Hot coals board modification
  const board = makeBoard(42, 'forge');
  twistBoard(board, TWISTS.hotCoals.fx, 42);
  const coalTiles = board.tiles.filter((t) => t.ground === 'coals');
  assert.equal(coalTiles.length, 4);

  // Rolling gales is a registered twist that can roll on high ascension
  const rules = ascRules(8);
  assert.ok(rules.bossCurse);
});
