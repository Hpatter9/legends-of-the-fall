import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, armyById, armyStars, migrateArmies, recordOf, settleWave, tierOpen, tierStars, waveBoost, firstClearTotal, replayTotal } from '../src/sim/armies';
import { armyRules, bestChest, chestCrowns, chestSeed, chestsOf, grantChests, openChest, peekChest, rollChest, settleArmyRun, timeTarget } from '../src/sim/armyStars';
import { ARMY_STARS, MILESTONES, RUN_STARS, TIERS, tierRange } from '../src/sim/tiers';
import { loadMeta, newMeta, saveMeta, rarityOf } from '../src/sim/meta';
import { armyRun, noteFight, startStage, tierOfRun, type Run } from '../src/sim/run';
import { fight, stepBattle, startBattle } from '../src/sim/battle';
import { speedOf } from '../src/sim/spells';
import { UNITS } from '../src/sim/units';
import { readyBattle } from './helpers';

const store = () => {
  const data: Record<string, string> = {};
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};

/** An army run that has just been cleared, with a tally. */
function cleared(army: string, tier: number, tally: { ms: number; lost: number; bossLost: number; bossFell?: number }): Run {
  const run = armyRun(1, army, undefined, undefined, tier);
  run.cleared = true;
  run.over = true;
  run.tally = tally;
  return run;
}
const perfect = { ms: 1000, lost: 0, bossLost: 0 };

test('the tiers hold 3, 3, 3 and 1 stars: ten in all, numbered in order', () => {
  assert.deepEqual(TIERS.map((t) => t.stars), [3, 3, 3, 1]);
  assert.equal(ARMY_STARS, 10);
  assert.deepEqual([0, 1, 2, 3].map(tierRange), [[1, 3], [4, 6], [7, 9], [10, 10]]);
  assert.deepEqual(TIERS.map((t) => t.need), [0, 3, 6, 9]);
  assert.deepEqual(MILESTONES, [3, 5, 10]);
});

test('each tier opens when the stars before it are all won', () => {
  const m = newMeta(1);
  const a = ARMIES[0];
  assert.deepEqual([0, 1, 2, 3].map((t) => tierOpen(m, a, t)), [true, false, false, false]);
  m.armies.orcs = { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 7 } };
  assert.deepEqual([0, 1, 2, 3].map((t) => tierOpen(m, a, t)), [true, true, false, false]);
  m.armies.orcs.met = { 0: 7, 1: 7 };
  assert.deepEqual([0, 1, 2, 3].map((t) => tierOpen(m, a, t)), [true, true, true, false]);
  m.armies.orcs.met = { 0: 7, 1: 7, 2: 7 };
  assert.deepEqual([0, 1, 2, 3].map((t) => tierOpen(m, a, t)), [true, true, true, true]);
  // (two stars short of a tier keeps it shut)
  m.armies.orcs.met = { 0: 7, 1: 3 };
  assert.equal(tierOpen(m, a, 2), false);
  // (a locked army opens no tier)
  assert.equal(tierOpen(m, ARMIES[2], 0), false);
});

test('a run earns at most three stars, whatever the tier', () => {
  const m = newMeta(1);
  for (const [t, a] of [[0, 'orcs'], [1, 'orcs'], [2, 'undead'], [3, 'undead']] as const) {
    const res = settleArmyRun(m, cleared(a, t, perfect))!;
    assert.ok(res.gained <= RUN_STARS && res.gained >= 1, `tier ${t}`);
    assert.equal(res.rules.length, t === 3 ? 1 : 3);
  }
  // (Legendary's single star is a flawless clear)
  const lost = settleArmyRun(newMeta(2), cleared('orcs', 3, { ms: 1, lost: 1, bossLost: 0, bossFell: 1 }))!;
  assert.equal(lost.gained, 0);
  // (a hero lost in the field waves, but none in a boss fight, is still flawless)
  assert.equal(settleArmyRun(newMeta(2), cleared('orcs', 3, { ms: 1, lost: 4, bossLost: 0, bossFell: 0 }))!.gained, 1);
  const flawless = settleArmyRun(newMeta(2), cleared('orcs', 3, perfect))!;
  assert.equal(flawless.gained, 1);
  // (a run that did not clear its army earns nothing)
  const run = armyRun(1, 'orcs');
  assert.equal(settleArmyRun(newMeta(3), run), null);
});

test('the conditions: clear, no hero lost in the last boss fight, and a battle-time target', () => {
  const a = armyById('orcs')!;
  const earned = (tally: { ms: number; lost: number; bossLost: number }) => armyRules(a, 0, cleared('orcs', 0, tally)).map((r) => r.earned);
  assert.deepEqual(earned(perfect), [true, true, true]);
  assert.deepEqual(earned({ ms: 1000, lost: 3, bossLost: 1 }), [true, false, true]);
  assert.deepEqual(earned({ ms: timeTarget(a, 0) + 1, lost: 0, bossLost: 0 }), [true, true, false]);
  assert.ok(timeTarget(a, 2) > timeTarget(a, 0));
  // (a run not yet cleared has none)
  assert.deepEqual(armyRules(a, 0, armyRun(1, 'orcs')).map((r) => r.earned), [false, false, false]);
  assert.equal(armyRules(a, 1).length, 3);
});

test('stars are the best ever per tier: a replay adds only the new ones', () => {
  const m = newMeta(1);
  const first = settleArmyRun(m, cleared('orcs', 0, { ms: 1e9, lost: 5, bossLost: 2 }))!;
  assert.equal(first.gained, 1);
  assert.equal(tierStars(recordOf(m, 'orcs'), 0), 1);
  // a worse run adds nothing and takes nothing
  const worse = settleArmyRun(m, cleared('orcs', 0, { ms: 1e9, lost: 5, bossLost: 2 }))!;
  assert.equal(worse.gained, 0);
  assert.equal(tierStars(recordOf(m, 'orcs'), 0), 1);
  // a run that meets only the boss condition merges with the clear star
  const better = settleArmyRun(m, cleared('orcs', 0, { ms: 1e9, lost: 1, bossLost: 0 }))!;
  assert.equal(better.gained, 1);
  assert.deepEqual(better.fresh, [1]);
  assert.equal(tierStars(recordOf(m, 'orcs'), 0), 2);
  // a perfect run adds only the last one
  assert.equal(settleArmyRun(m, cleared('orcs', 0, perfect))!.gained, 1);
  assert.equal(armyStars(m, armyById('orcs')!).got, 3);
  // the tiers count apart
  assert.equal(settleArmyRun(m, cleared('orcs', 1, perfect))!.gained, 3);
  assert.equal(armyStars(m, armyById('orcs')!).got, 6);
});

test('a milestone puts a chest in the stash once; opening removes it and pays its rewards once', () => {
  const m = newMeta(1);
  const a = armyById('orcs')!;
  assert.deepEqual(chestsOf(m, a).map((c) => c.state), ['locked', 'locked', 'locked']);
  assert.equal(m.stash.length, 0);
  const r1 = settleArmyRun(m, cleared('orcs', 0, perfect))!;
  assert.deepEqual(r1.chests, [3]);
  assert.deepEqual(m.stash.map((c) => [c.army, c.at, c.tier]), [['orcs', 3, 0]]);
  // again at the same stars: no second chest
  assert.deepEqual(settleArmyRun(m, cleared('orcs', 0, perfect))!.chests, []);
  assert.deepEqual(grantChests(m, a, m.armies.orcs), []);
  assert.equal(m.stash.length, 1);
  const r2 = settleArmyRun(m, cleared('orcs', 1, { ms: 1e9, lost: 3, bossLost: 1 }))!;
  assert.equal(r2.total, 4);
  assert.deepEqual(r2.chests, []);
  const r3 = settleArmyRun(m, cleared('orcs', 1, perfect))!;
  assert.deepEqual(r3.chests, [5]);
  assert.deepEqual(m.stash.map((c) => [c.at, c.tier]), [[3, 0], [5, 1]]);
  assert.deepEqual(chestsOf(m, a).map((c) => [c.state, c.waiting]), [['earned', true], ['earned', true], ['locked', false]]);
  // opening the second first: only it leaves, and the first's contents do not change
  const peek = peekChest(m, 0)!;
  const crowns = m.crowns;
  const loot = openChest(m, 1)!;
  assert.equal(loot.at, 5);
  assert.ok(m.crowns > crowns);
  assert.deepEqual(m.stash.map((c) => c.at), [3]);
  assert.deepEqual(peekChest(m, 0), peek);
  assert.deepEqual(chestsOf(m, a).map((c) => [c.state, c.waiting]), [['earned', true], ['earned', false], ['locked', false]]);
  // (nothing there any more: no second payment)
  assert.equal(openChest(m, 1), null);
  const after = m.crowns;
  assert.ok(openChest(m, 0));
  assert.equal(openChest(m, 0), null);
  assert.ok(m.crowns > after);
  assert.equal(m.stash.length, 0);
  // (a chest earned and opened is not given again when the stars are met again)
  assert.deepEqual(grantChests(m, a, m.armies.orcs), []);
  assert.equal(m.stash.length, 0);
  // the 10th star
  m.armies.orcs.met = { 0: 7, 1: 7, 2: 7, 3: 1 };
  assert.deepEqual(grantChests(m, a, m.armies.orcs, 3), [10]);
  assert.deepEqual(m.stash.map((c) => [c.at, c.tier]), [[10, 3]]);
  assert.equal(armyStars(m, a).got, 10);
});

test('chest contents are deterministic: fixed when earned, by save seed, army and milestone; the order of opening does not matter', () => {
  const a = armyById('wildwood')!;
  const seed = (s: number, at: number, army = a) => chestSeed(s, army, at);
  assert.deepEqual(rollChest(seed(77, 5), a, 5), rollChest(seed(77, 5), a, 5));
  assert.notDeepEqual(rollChest(seed(77, 5), a, 5), rollChest(seed(78, 5), a, 5));
  assert.notDeepEqual(rollChest(seed(77, 5), a, 5), rollChest(seed(77, 3), a, 3));
  assert.notDeepEqual(rollChest(seed(77, 5), a, 5), rollChest(seed(77, 5, armyById('undead')!), armyById('undead')!, 5));
  // two chests, opened in either order on twin saves, give the same rewards
  const make = () => {
    const m = newMeta(4242);
    m.armies.orcs = { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 7, 1: 7 } };
    grantChests(m, armyById('orcs')!, m.armies.orcs);
    return m;
  };
  const m1 = make();
  const m2 = make();
  assert.equal(m1.stash.length, 2);
  const x1 = openChest(m1, 0)!;
  const y1 = openChest(m1, 0)!;
  const y2 = openChest(m2, 1)!;
  const x2 = openChest(m2, 0)!;
  assert.deepEqual(x1, x2);
  assert.deepEqual(y1, y2);
  assert.equal(m1.crowns, m2.crowns);
  assert.deepEqual(m1.shards, m2.shards);
  // reloading does not reroll: the stash keeps the seed it was earned with
  const m3 = make();
  const s = store();
  saveMeta(m3, s);
  const back = loadMeta(1, s);
  assert.deepEqual(back.stash, m3.stash);
  assert.deepEqual(openChest(back, 0), x1);
  // the draw does not read the meta's other state (crowns, pulls)
  const rich = make();
  rich.crowns = 99999;
  rich.pulls = 40;
  assert.deepEqual(openChest(rich, 0), x1);
});

test('chests pay better by milestone, by army and by tier', () => {
  const crowns = (army: number, at: number, tier = 0) => chestCrowns(at, army, tier);
  for (let i = 0; i < ARMIES.length; i++) assert.ok(crowns(i, 3) < crowns(i, 5) && crowns(i, 5) < crowns(i, 10));
  for (const at of MILESTONES) for (let i = 1; i < ARMIES.length; i++) assert.ok(crowns(i, at) > crowns(i - 1, at));
  for (const at of MILESTONES) for (let t = 1; t < TIERS.length; t++) assert.ok(crowns(2, at, t) > crowns(2, at, t - 1));
  const roll = (seed: number, a: (typeof ARMIES)[number], at: number, tier = 0) => rollChest(chestSeed(seed, a, at), a, at, tier);
  let items3 = 0;
  let items5 = 0;
  let items10 = 0;
  let rare3 = 0;
  let rare10 = 0;
  for (let seed = 1; seed <= 200; seed++) {
    for (const a of [ARMIES[0], ARMIES[8]]) {
      const [r3, r5, r10] = [3, 5, 10].map((at) => roll(seed, a, at));
      items3 += r3.shards.length + r3.recruits.length;
      items5 += r5.shards.length + r5.recruits.length;
      items10 += r10.shards.length + r10.recruits.length;
      rare3 += r3.shards.filter((k) => rarityOf(k) >= 3).length;
      rare10 += r10.shards.filter((k) => rarityOf(k) >= 3).length;
    }
  }
  assert.ok(items3 < items5 && items5 < items10, `${items3} ${items5} ${items10}`);
  assert.ok(rare10 > rare3, `${rare10} ${rare3}`);
  const rare = (a: (typeof ARMIES)[number], tier = 0) => {
    let n = 0;
    for (let seed = 1; seed <= 400; seed++) n += roll(seed, a, 5, tier).shards.reduce((s, k) => s + rarityOf(k), 0);
    return n;
  };
  assert.ok(rare(ARMIES[8]) > rare(ARMIES[0]));
  assert.ok(rare(ARMIES[4], 3) > rare(ARMIES[4], 0));
});

test('the 10-star chest always holds a hero of Epic or better (higher on later armies)', () => {
  const roll = (seed: number, a: (typeof ARMIES)[number], at: number) => rollChest(chestSeed(seed, a, at), a, at);
  for (let seed = 1; seed <= 100; seed++) {
    const early = roll(seed, ARMIES[0], 10);
    assert.equal(early.recruits.length, 1);
    assert.ok(rarityOf(early.recruits[0].kind) >= 3);
    assert.ok(rarityOf(roll(seed, ARMIES[4], 10).recruits[0].kind) >= 4);
    assert.equal(rarityOf(roll(seed, ARMIES[8], 10).recruits[0].kind), 5);
    assert.equal(roll(seed, ARMIES[0], 3).recruits.length, 0);
  }
});

test('opening a chest pays crowns, shards and a recruit (or shards if owned)', () => {
  const m = newMeta(9);
  m.armies.golems = { best: 10, won: 10, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1 } };
  grantChests(m, armyById('golems')!, m.armies.golems);
  assert.deepEqual(m.stash.map((c) => c.at), [3, 5, 10]);
  const before = { crowns: m.crowns, unlocked: m.unlocked.length };
  const loot = openChest(m, 2)!;
  assert.equal(loot.kind, 'gold');
  assert.ok(m.crowns > before.crowns);
  const prize = loot.items.find((i) => i.type === 'hero')!;
  assert.ok(prize.prize);
  assert.ok(m.unlocked.includes(prize.ref!));
  assert.ok(m.unlocked.length > before.unlocked);
  assert.ok(Object.values(m.shards).reduce((a, b) => a + b, 0) >= 1);
  // (a prize hero already owned pays shards instead)
  const owned = [...m.unlocked];
  const again = openChest(m, 0)!;
  assert.ok(again.items.some((i) => i.type === 'crowns'));
  assert.ok(owned.every((k) => m.unlocked.includes(k)));
});

test('chests drop permanent hero equipment: silver and gold always, bronze sometimes, once, and the same every time', () => {
  let bronze = 0;
  for (let seed = 1; seed <= 200; seed++) {
    assert.equal(rollChest(seed, ARMIES[3], 5).gear.length, 1);
    assert.equal(rollChest(seed, ARMIES[3], 10).gear.length, 1);
    const b = rollChest(seed, ARMIES[3], 3).gear;
    bronze += b.length;
    for (const g of b) assert.ok(g.item.rarity <= 3, 'a bronze chest never drops Legendary or better');
    assert.deepEqual(rollChest(seed, ARMIES[3], 10), rollChest(seed, ARMIES[3], 10));
  }
  assert.ok(bronze > 40 && bronze < 110, `bronze dropped ${bronze} of 200`);
  // (later armies roll higher item levels)
  const level = (army: number) => Array.from({ length: 100 }, (_, i) => rollChest(i + 1, ARMIES[army], 5).gear[0].item.level).reduce((a, n) => a + n, 0);
  assert.ok(level(6) > level(0) + 500);
  // (opening grants the item once, and it is the one the preview showed)
  const m = newMeta(4);
  m.armies.golems = { best: 10, won: 10, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1 } };
  grantChests(m, armyById('golems')!, m.armies.golems);
  const peek = peekChest(m, 1)!.items.find((i) => i.type === 'gear')!;
  assert.equal(m.equipment?.length ?? 0, 0, 'a look in the stash grants nothing');
  const loot = openChest(m, 1)!;
  const gear = loot.items.filter((i) => i.type === 'gear');
  assert.equal(gear.length, 1);
  assert.deepEqual(gear[0].equip, peek.equip);
  assert.equal(m.equipment!.length, 1);
  assert.equal(m.equipment![0].base, peek.equip!.base);
  assert.equal(m.equipment![0].rarity, peek.equip!.rarity);
  assert.equal(openChest(m, 5), null);
  assert.equal(m.equipment!.length, 1);
});

test('the foes get tougher by tier: hp, attack and speed', () => {
  const a = armyById('undead')!;
  const base = waveBoost(a, 3, 0).foes!;
  let lastHp = base.hp!;
  let lastAtk = base.atk!;
  let lastSpeed = 1;
  assert.equal(base.speed, undefined);
  for (const t of [1, 2, 3]) {
    const f = waveBoost(a, 3, t).foes!;
    assert.ok(f.hp! > lastHp && f.atk! > lastAtk && f.speed! > lastSpeed, `tier ${t}`);
    assert.ok(Math.abs(f.hp! / base.hp! - TIERS[t].hp) < 1e-9);
    [lastHp, lastAtk, lastSpeed] = [f.hp!, f.atk!, f.speed!];
  }
  // Normal is unchanged
  assert.deepEqual(waveBoost(a, 3), waveBoost(a, 3, 0));
  // in a fight: stronger foes with more hp, and quicker on their feet
  const run = (tier: number) => {
    const r = armyRun(3, 'undead', undefined, undefined, tier);
    return startStage(r);
  };
  const n = run(0);
  const l = run(3);
  const hp = (b: ReturnType<typeof run>) => b.units.filter((u) => u.side === 'foe').reduce((s, u) => s + u.maxHp, 0);
  assert.ok(hp(l) > hp(n) * 2.5);
  const foe = (b: ReturnType<typeof run>) => b.units.find((u) => u.side === 'foe')!;
  assert.equal(speedOf(n, foe(n)), 1);
  assert.equal(speedOf(l, foe(l)), TIERS[3].speed);
  const hero = readyBattle(5);
  assert.equal(speedOf(hero, hero.units.find((u) => u.side === 'hero')!), 1);
  // (a tier-3 foe that is faster takes shorter steps: the fight is deterministic)
  const again = run(3);
  assert.deepEqual(again.units.map((u) => [u.u, u.v, u.maxHp]), l.units.map((u) => [u.u, u.v, u.maxHp]));
  assert.equal(tierOfRun(armyRun(1, 'orcs', undefined, undefined, 2)), 2);
  assert.equal(tierOfRun(armyRun(1, 'orcs')), 0);
  assert.deepEqual(armyRun(1, 'orcs').mode, { kind: 'army', army: 'orcs' });
});

test('a harder tier pays more crowns, and keeps its own firsts and clears', () => {
  const a = armyById('orcs')!;
  for (let t = 1; t < TIERS.length; t++) {
    assert.ok(firstClearTotal(a, t) > firstClearTotal(a, t - 1));
    assert.ok(replayTotal(a, t) > replayTotal(a, t - 1));
  }
  // (15 waves: a first clear pays about 15% more than the 8 waves it was, 294)
  assert.equal(firstClearTotal(a), 339);
  const m = newMeta(1);
  const normal = settleWave(m, 'orcs', 1, true, 0, 0);
  const again = settleWave(m, 'orcs', 1, true, 0, 0);
  const hard = settleWave(m, 'orcs', 1, true, 0, 1);
  assert.equal(normal.replay, false);
  assert.equal(again.replay, true);
  // (a first win on Hard is its own first: it pays more than a Normal replay, and more than the Normal first)
  assert.equal(hard.replay, false);
  assert.ok(hard.crowns > normal.crowns);
  assert.equal(settleWave(m, 'orcs', 1, true, 0, 1).replay, true);
  // only the first Normal clear opens the next army
  const m2 = newMeta(2);
  const last = a.waves.length;
  assert.equal(settleWave(m2, 'orcs', last, true, 0, 1).unlocked, undefined);
  assert.equal(recordOf(m2, 'orcs').clears, 0);
  assert.equal(settleWave(m2, 'orcs', last, true, 0, 0).unlocked?.id, 'undead');
  assert.equal(recordOf(m2, 'orcs').hard?.['1'].clears, 1);
});

test('a run tallies its fights: time, heroes lost, and the last boss fight', () => {
  const run = armyRun(7, 'orcs');
  const b = readyBattle(7, ['orcGrunt']);
  fight(b);
  for (let i = 0; i < 40; i++) stepBattle(b);
  const hero = b.units.find((u) => u.side === 'hero')!;
  hero.alive = false;
  noteFight(run, b);
  assert.equal(run.tally!.lost, 1);
  assert.equal(run.tally!.bossLost, 0);
  assert.ok(run.tally!.ms > 0);
  run.stage = armyById('orcs')!.waves.length;
  noteFight(run, b);
  assert.equal(run.tally!.lost, 2);
  assert.equal(run.tally!.bossLost, 1);
  // (the last wave is a boss wave: its fall counts among the boss fights too)
  assert.equal(run.tally!.bossFell, 1);
  // (a summoned helper that falls does not count)
  const run2 = armyRun(7, 'orcs');
  const b2 = startBattle(1, ['orcGrunt']);
  const helper = Object.values(UNITS).find((u) => u.summon && u.side === 'hero')!;
  b2.units.push({ id: 99, def: helper.id, side: 'hero', u: 0, v: 0, hp: 0, maxHp: 1, facing: 0, alive: false, busyUntil: 0, charge: 0 });
  noteFight(run2, b2);
  assert.equal(run2.tally!.lost, 0);
});

test('saves from before the 10 stars: a beaten army has its Normal clear star, no chest is lost or given twice', () => {
  // a record with clears but no stars fields
  const rec = migrateArmies({ orcs: { best: 8, won: 8, clears: 2, stars: { 8: 3 } }, undead: { best: 3, won: 2, clears: 0, stars: {} } }, 1);
  assert.deepEqual(rec.orcs.met, { '0': 3 });
  assert.equal(rec.undead.met, undefined);
  assert.equal(rec.orcs.chests, undefined);
  // an army beaten with a weaker last wave: only the clear star
  assert.deepEqual(migrateArmies({ orcs: { best: 8, won: 8, clears: 1, stars: { 8: 2 } } }, 1).orcs.met, { '0': 1 });
  // saves older still map their furthest stage: the Normal clear star each
  const old = migrateArmies(undefined, 12);
  assert.deepEqual(Object.keys(old), ['orcs', 'undead']);
  assert.equal(old.orcs.met!['0'], 1);
  // loading: the stars count, nothing opens, and a second load changes nothing
  const m = newMeta(5);
  m.armies = { orcs: { best: 8, won: 8, clears: 1, stars: { 8: 3 } } };
  const s = store();
  saveMeta(m, s);
  const a = loadMeta(1, s);
  assert.equal(armyStars(a, armyById('orcs')!).got, 2);
  assert.deepEqual(chestsOf(a, armyById('orcs')!).map((c) => c.state), ['locked', 'locked', 'locked']);
  saveMeta(a, s);
  const b = loadMeta(1, s);
  assert.deepEqual(b.armies, a.armies);
  assert.deepEqual(b.stash, []);
  assert.equal(a.stash.length, 0);
  // a save that has chests keeps exactly them (given, opened), and drops what is not a milestone
  const m3 = newMeta(5);
  m3.armies.orcs = { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 99 }, chests: [3, 5, 7 as number], hard: { 1: { won: 8, clears: 1 } } };
  m3.stash = [{ army: 'orcs', at: 5, tier: 1, seed: 123 }, { army: 'orcs', at: 5, tier: 1, seed: 124 }, { army: 'nope', at: 3, tier: 0, seed: 1 }, { army: 'orcs', at: 4, tier: 0, seed: 1 }];
  saveMeta(m3, s);
  const loaded = loadMeta(1, s);
  const c = loaded.armies.orcs;
  // (the stash keeps what is real and drops the rest, and a chest twice)
  assert.deepEqual(loaded.stash, [{ army: 'orcs', at: 5, tier: 1, seed: 123 }]);
  assert.deepEqual(c.chests, [3, 5]);
  assert.deepEqual(c.met, { '0': 7, '1': 7, '2': 3 });
  assert.equal(c.hard!['1'].clears, 1);
  // (stars from the 10-star record: the old per-wave stars stay as they were)
  assert.deepEqual(rec.orcs.stars, { '8': 3 });
});

test('the army card total counts the army stars (and the top bar sums them)', () => {
  const m = newMeta(1);
  m.armies.orcs = { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 7, 3: 1 } };
  m.armies.undead = { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 1 } };
  assert.equal(ARMIES.reduce((n, a) => n + armyStars(m, a).got, 0), 5);
  assert.equal(armyStars(m, ARMIES[0]).max, 10);
});

test('a save from the earlier chest format keeps its unopened chests, none twice, none lost', () => {
  const m = newMeta(31);
  const s = store();
  const old = { ...m, armies: { orcs: { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 7, 1: 7 }, chests: [3, 5], opened: [3] }, undead: { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 7 }, chests: [3], opened: [3] } } };
  delete (old as Partial<typeof old>).stash;
  s.setItem('legends.meta', JSON.stringify(old));
  const a = loadMeta(1, s);
  assert.deepEqual(a.stash.map((c) => [c.army, c.at]), [['orcs', 5]]);
  // the seed is the one the chest would have been earned with
  assert.equal(a.stash[0].seed, chestSeed(31, armyById('orcs')!, 5));
  // loading again from the saved result adds nothing
  saveMeta(a, s);
  const b = loadMeta(1, s);
  assert.deepEqual(b.stash, a.stash);
  // (the chest that was opened is not given again)
  assert.deepEqual(grantChests(b, armyById('undead')!, b.armies.undead), []);
  assert.equal(b.stash.length, 1);
});

test('the cart shows the best chest waiting: the highest milestone, then the hardest tier, then the later army', () => {
  assert.equal(bestChest([]), -1);
  assert.equal(bestChest([{ army: 'orcs', at: 3, tier: 0 }]), 0);
  assert.equal(bestChest([{ army: 'orcs', at: 3, tier: 0 }, { army: 'orcs', at: 10, tier: 0 }, { army: 'orcs', at: 5, tier: 2 }]), 1);
  assert.equal(bestChest([{ army: 'orcs', at: 5, tier: 0 }, { army: 'orcs', at: 5, tier: 1 }]), 1);
  assert.equal(bestChest([{ army: 'undead', at: 5, tier: 0 }, { army: 'orcs', at: 5, tier: 0 }]), 0);
});
