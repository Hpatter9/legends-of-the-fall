import { clearCrowns } from '../src/sim/calReward';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ascChests, ascCleared, ascCrowns, ascOf, ascReward, ascRules, ascUnlocked, ASC_MAX, ASC_TEXT, CHAOS_ASC } from '../src/sim/ascension';
import { startedMeta, type Meta } from '../src/sim/meta';
import { calamityRun } from '../src/sim/modes';
import { CAL_MAPS, CAL_START_GOLD } from '../src/sim/calamity';
import { calamityMap, choices, enterNode, MAP_CROWNS, settleTower, REST_HEAL } from '../src/sim/tower';
import { healParty, hpShare } from '../src/sim/health';
import { TWISTS } from '../src/sim/twists';
import { place } from '../src/sim/battle';
import { startStage, type Run } from '../src/sim/run';
import { mendUnit } from '../src/sim/abilities';
import { playCalamity } from '../tools/autoplay';
import { newCastle } from '../src/sim/castle';
import { HEROES } from '../src/sim/units';

/** A meta that has cleared the calamity up to ascension `done` (-1 for never). */
function clearedTo(done: number): Meta {
  const m = startedMeta(1);
  if (done >= 0) m.calamity = { best: CAL_MAPS, clears: 1, asc: done };
  return m;
}

test('each level adds one rule on top of the ones before (level 3 two); level 0 changes nothing', () => {
  assert.equal(ASC_TEXT.length, ASC_MAX);
  const none = ascRules(0);
  assert.deepEqual(none, { foeHp: 1, foeAtk: 1, hires: 1, phaseAt: 0.5, elites: 1, shops: 1, heal: 1, startGold: 0, bossCurse: false, bossShield: 0 });
  let was = JSON.stringify(none);
  for (let n = 1; n <= ASC_MAX; n++) {
    const now = ascRules(n);
    const changed = Object.keys(now).filter((k) => JSON.stringify((now as never)[k]) !== JSON.stringify((JSON.parse(was) as never)[k]));
    // (level 3 also brings the chaos twists, the owner's call: CHAOS_ASC)
    if (n === CHAOS_ASC) assert.deepEqual(changed.sort(), ['chaosMutators', 'phaseAt'], `level ${n}: ${changed}`);
    else assert.equal(changed.length, 1, `level ${n} changes one rule: ${changed}`);
    was = JSON.stringify(now);
  }
  // (nothing is taken back going up, and a level past the top is the top)
  assert.deepEqual(ascRules(ASC_MAX + 5), ascRules(ASC_MAX));
  assert.deepEqual(ascRules(-3), none);
  assert.equal(ascRules(1).foeHp, 1.2);
  assert.equal(ascRules(3).phaseAt, 0.65);
  assert.equal(ascRules(6).heal, 0.5);
});

test('better clears pay better: crowns and chests only grow with the level', () => {
  for (let n = 1; n <= ASC_MAX; n++) {
    assert.ok(ascCrowns(n) > ascCrowns(n - 1), `crowns at ${n}`);
    assert.ok(ascChests(n) >= ascChests(n - 1), `chests at ${n}`);
  }
  assert.equal(ascChests(0), 1);
  assert.ok(ascChests(ASC_MAX) > ascChests(0));
  assert.match(ascReward(ASC_MAX), /gold chests/);
});

test('a clear opens the next level, and a save from before ascension counts its clear as level 0', () => {
  assert.equal(ascUnlocked(clearedTo(-1)), 0);
  assert.equal(ascCleared(clearedTo(-1)), -1);
  assert.equal(ascUnlocked(clearedTo(0)), 1);
  assert.equal(ascUnlocked(clearedTo(4)), 5);
  assert.equal(ascUnlocked(clearedTo(ASC_MAX)), ASC_MAX);
  // (the old meta has no `asc`)
  const old = startedMeta(1);
  old.calamity = { best: 6, clears: 2 };
  assert.equal(ascCleared(old), 0);
  assert.equal(ascUnlocked(old), 1);
  old.calamity = { best: 3, clears: 0 };
  assert.equal(ascCleared(old), -1);
  assert.equal(ascCleared(startedMeta(1)), -1, 'no calamity played at all');
});

test('a run is played at an unlocked level only, and the level is in the run and its save', () => {
  const m = clearedTo(2);
  assert.equal(ascOf(calamityRun(3, m, 'knight', 3)), 3);
  assert.equal(ascOf(calamityRun(3, m, 'knight', 9)), 3, 'a level not yet opened falls back to the highest open');
  assert.equal(ascOf(calamityRun(3, m, 'knight', -1)), 0);
  const plain = calamityRun(3, m, 'knight');
  assert.deepEqual(plain.mode, { kind: 'calamity' }, 'level 0 leaves the run as it always was');
  const back = JSON.parse(JSON.stringify(calamityRun(3, m, 'knight', 2))) as Run;
  assert.equal(ascOf(back), 2);
  // (an old save with no level is level 0)
  assert.equal(ascOf({ mode: { kind: 'calamity' } }), 0);
  assert.equal(ascOf({ mode: { kind: 'tower' } }), 0);
});

test('level 7 starts with less gold', () => {
  const m = clearedTo(9);
  assert.equal(calamityRun(3, m, 'knight', 6).gold, CAL_START_GOLD);
  assert.equal(calamityRun(3, m, 'knight', 7).gold, CAL_START_GOLD - 15);
});

test('foes are tougher, deterministic, and only in an ascended calamity', () => {
  const m = clearedTo(9);
  const hpAt = (level: number) => {
    const run = calamityRun(8, m, 'knight', level);
    enterNode(run, choices(run)[0].id);
    return run.tower!.cur!.fight!.stage.foes!;
  };
  assert.ok(Math.abs(hpAt(1).hp! / hpAt(0).hp! - 1.2) < 1e-9);
  assert.equal(hpAt(1).atk, hpAt(0).atk, 'level 1 is health only');
  assert.ok(Math.abs(hpAt(9).atk! / hpAt(8).atk! - 1.15) < 1e-9);
  assert.deepEqual(hpAt(5), hpAt(5), 'the same seed, the same fight');
});

test('level 2 makes a shop hero 40% dearer; level 4 doubles the elites; level 8 curses every boss floor', () => {
  const m = clearedTo(9);
  const heroCost = (level: number) => {
    const run = calamityRun(6, m, 'knight', level);
    reach(run, 'shop');
    return run.tower!.cur!.shop!.find((i) => i.kind === 'hero')!.cost;
  };
  assert.equal(heroCost(2), Math.round(heroCost(1) * 1.4));
  assert.equal(ascRules(1).hires, 1);
  // (the recruit spot's free choice is not touched)
  assert.ok(calamityMap(5, 2, 7, 2).filter((n) => n.kind === 'recruit').length === 1);
  const elites = (asc: number) => {
    let n = 0;
    for (let seed = 1; seed <= 40; seed++) for (let act = 1; act <= CAL_MAPS; act++) n += calamityMap(seed, act, 8, asc).filter((x) => x.kind === 'elite').length;
    return n;
  };
  assert.ok(elites(4) > elites(3) * 1.3, 'more elites');
  for (let seed = 1; seed <= 8; seed++) {
    for (let act = 1; act <= CAL_MAPS; act++) {
      const boss = calamityMap(seed, act, 8, 8).find((n) => n.kind === 'boss')!;
      assert.ok(boss.twist && TWISTS[boss.twist].tone === 'curse', `seed ${seed} map ${act}: a curse`);
      assert.equal(calamityMap(seed, act, 8, 7).find((n) => n.kind === 'boss')!.twist === undefined || act >= 2, true, 'level 7 does not add one to the first boss');
    }
  }
  // (the same seed makes the same map)
  assert.deepEqual(calamityMap(5, 3, 7, 8), calamityMap(5, 3, 7, 8));
});

/** Walk the run to the first node of `kind` (the floors before it taken) and enter it. */
function reach(run: Run, kind: string): void {
  const t = run.tower!;
  const start = t.at < 0 ? t.map.filter((n) => n.row === t.row) : t.map[t.at].next.map((i) => t.map[i]);
  const seen = new Map<number, number | null>(start.map((n) => [n.id, null]));
  const q = [...start];
  let hit;
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
  assert.ok(enterNode(run, hit.id));
}

test('level 3 brings a boss\'s second form sooner; level 10 shields it from the start', () => {
  const m = clearedTo(9);
  const bossOf = (level: number) => {
    const run = calamityRun(2, m, 'knight', level);
    reach(run, 'boss');
    return startStage(run).units.find((u) => u.side === 'foe' && u.def === 'calBoss1')!;
  };
  assert.equal(bossOf(0).phase!.at, 0.5);
  assert.equal(bossOf(3).phase!.at, 0.65);
  assert.equal(bossOf(0).shield, undefined);
  assert.ok(bossOf(10).shield!.hp > 0);
});

test('level 5 makes shops dearer, and level 6 halves every healing', () => {
  const m = clearedTo(9);
  const shop = (level: number) => {
    const run = calamityRun(6, m, 'knight', level);
    reach(run, 'shop');
    return run.tower!.cur!.shop!;
  };
  const base = shop(4);
  const dear = shop(5);
  assert.equal(base.length, dear.length);
  // (a hero's price is rounded once for the hires rule and once for the shops, so it may differ by one)
  base.forEach((it, i) => assert.ok(Math.abs(dear[i].cost - Math.round(it.cost * 1.25)) <= (it.kind === 'hero' ? 1 : 0), it.label));
  assert.match(shop(6).find((i) => i.kind === 'heal')!.text, /20%/);
  // healing: a campfire's rest, a win's mending, a draught
  const heal = (level: number) => {
    const run = calamityRun(6, m, 'knight', level);
    run.tower!.hp[String(run.roster[0].id)] = 0.1;
    healParty(run, REST_HEAL);
    return hpShare(run, run.roster[0].id);
  };
  assert.ok(Math.abs(heal(0) - (0.1 + REST_HEAL)) < 1e-9);
  assert.ok(Math.abs(heal(6) - (0.1 + REST_HEAL / 2)) < 1e-9);
  const elixir = calamityRun(6, m, 'knight', 6);
  elixir.tower!.hp[String(elixir.roster[0].id)] = 0.1;
  healParty(elixir, 1, true);
  assert.equal(hpShare(elixir, elixir.roster[0].id), 1, 'an elixir still heals whole');
  // in the fight: the heroes' healing is halved, the foes' is not
  const run = calamityRun(6, m, 'knight', 6);
  reach(run, 'fight');
  const bt = startStage(run);
  assert.equal(bt.heroHeal, 0.5);
  place(bt, 'knight', 3, bt.board.d - 1);
  assert.equal(bt.units.find((u) => u.side === 'hero')!.healMult, 0.5);
  assert.equal(bt.units.find((u) => u.side === 'foe')!.healMult, undefined);
  const hero = bt.units.find((u) => u.side === 'hero')!;
  hero.hp = 1;
  mendUnit(hero, 100, []);
  assert.equal(hero.hp, 51);
});

test('a full clear opens the next level and pays more; a loss pays by the maps and opens nothing', () => {
  const finish = (m: Meta, level: number, maps: number, cleared: boolean) => {
    const run = calamityRun(4, clearedTo(level - 1), 'knight', level);
    run.tower!.bosses = maps;
    run.over = true;
    run.cleared = cleared;
    const crowns = m.crowns;
    const stash = m.stash.length;
    const s = settleTower(m, run)!;
    return { s, paid: m.crowns - crowns, chests: m.stash.length - stash };
  };
  // level 0 as it was: the sum of the maps' crowns, one chest
  const m0 = startedMeta(1);
  const all0 = MAP_CROWNS.reduce((n, c) => n + c, 0);
  const r0 = finish(m0, 0, CAL_MAPS, true);
  assert.equal(r0.paid, all0 + clearCrowns(0));
  assert.equal(r0.chests, 1);
  assert.equal(m0.calamity!.asc, 0, 'a level 0 clear opens level 1');
  assert.equal(ascUnlocked(m0), 1);
  // level 5: more crowns, more chests, the next level opens
  const m5 = clearedTo(4);
  const r5 = finish(m5, 5, CAL_MAPS, true);
  assert.equal(r5.paid, Math.round(all0 * ascCrowns(5)) + clearCrowns(5));
  assert.equal(r5.chests, ascChests(5));
  assert.ok(r5.chests > r0.chests && r5.paid > r0.paid);
  assert.equal(m5.calamity!.asc, 5);
  assert.equal(r5.s.ascension, 5);
  assert.equal(ascUnlocked(m5), 6);
  // clearing a lower level later never lowers the best
  const again = finish(m5, 2, CAL_MAPS, true);
  assert.equal(m5.calamity!.asc, 5);
  assert.ok(again.paid < r5.paid);
  // a loss: crowns for the maps cleared (scaled), no chest, no new level
  const mL = clearedTo(3);
  const rl = finish(mL, 4, 3, false);
  assert.equal(rl.chests, 0);
  assert.equal(rl.paid, Math.round(MAP_CROWNS.slice(0, 3).reduce((n, c) => n + c, 0) * ascCrowns(4)));
  assert.equal(mL.calamity!.asc, 3);
  // a loss with no earlier clear leaves the field unset
  const fresh = startedMeta(1);
  finish(fresh, 0, 2, false);
  assert.equal(fresh.calamity!.asc, undefined);
  assert.equal(ascUnlocked(fresh), 0);
});

test('a meta saved with the new field loads and an old one without it does too', () => {
  const m = clearedTo(3);
  const back = JSON.parse(JSON.stringify(m)) as Meta;
  assert.equal(back.calamity!.asc, 3);
  const old = JSON.parse(JSON.stringify(startedMeta(1))) as Meta;
  old.calamity = { best: 2, clears: 0 };
  assert.equal(ascUnlocked(old), 0);
});

test('the greedy player plays an ascended calamity through (the level changes the climb, not the rules of play)', () => {
  const plain = playCalamity(startedMeta(3), 3, HEROES[0], newCastle(), 0);
  const hard = playCalamity(startedMeta(3), 3, HEROES[0], newCastle(), 10);
  assert.ok(plain.floors >= 1 && hard.floors >= 1);
  assert.ok(hard.maps <= plain.maps + 1);
});
