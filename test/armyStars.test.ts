import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, armyById, armyStars, migrateArmies, recordOf, settleWave, tierOpen, tierStars, waveBoost, firstClearTotal, replayTotal } from '../src/sim/armies';
import { armyRules, chestCrowns, chestsOf, chestsReady, grantChests, openChest, rollChest, settleArmyRun, takeVault, timeTarget } from '../src/sim/armyStars';
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

test('a chest is given once at 3, 5 and 10 stars, and opened once', () => {
  const m = newMeta(1);
  const a = armyById('orcs')!;
  assert.deepEqual(chestsOf(m, a).map((c) => c.state), ['locked', 'locked', 'locked']);
  const r1 = settleArmyRun(m, cleared('orcs', 0, perfect))!;
  assert.deepEqual(r1.chests, [3]);
  assert.equal(chestsReady(m, a), 1);
  // again at the same stars: no second chest
  assert.deepEqual(settleArmyRun(m, cleared('orcs', 0, perfect))!.chests, []);
  assert.deepEqual(grantChests(m.armies.orcs), []);
  const r2 = settleArmyRun(m, cleared('orcs', 1, { ms: 1e9, lost: 3, bossLost: 1 }))!;
  assert.equal(r2.total, 4);
  assert.deepEqual(r2.chests, []);
  const r3 = settleArmyRun(m, cleared('orcs', 1, perfect))!;
  assert.deepEqual(r3.chests, [5]);
  // opening
  const loot = openChest(m, 'orcs', 3)!;
  assert.ok(loot && loot.items.length >= 2);
  assert.equal(openChest(m, 'orcs', 3), null);
  assert.equal(openChest(m, 'orcs', 10), null);
  assert.deepEqual(chestsOf(m, a).map((c) => c.state), ['opened', 'ready', 'locked']);
  // (a chest given and opened is not given again when the stars are met again)
  assert.deepEqual(grantChests(m.armies.orcs), []);
  // the 10th star
  m.armies.orcs.met = { 0: 7, 1: 7, 2: 7, 3: 1 };
  assert.deepEqual(grantChests(m.armies.orcs), [10]);
  assert.equal(armyStars(m, a).got, 10);
});

test('chest contents are deterministic: the same for a save seed, army and milestone, and not rerollable by reloading', () => {
  const a = armyById('wildwood')!;
  assert.deepEqual(rollChest(77, a, 5), rollChest(77, a, 5));
  assert.notDeepEqual(rollChest(77, a, 5), rollChest(78, a, 5));
  assert.notDeepEqual(rollChest(77, a, 5), rollChest(77, a, 3));
  assert.notDeepEqual(rollChest(77, a, 5), rollChest(77, armyById('undead')!, 5));
  // opening, saving, reloading and opening on a twin save pays the same
  const make = () => {
    const m = newMeta(4242);
    m.armies.orcs = { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 7 }, chests: [3], opened: [] };
    return m;
  };
  const m1 = make();
  const loot1 = openChest(m1, 'orcs', 3)!;
  const s = store();
  saveMeta(m1, s);
  const back = loadMeta(1, s);
  assert.equal(openChest(back, 'orcs', 3), null);
  const loot2 = openChest(make(), 'orcs', 3)!;
  assert.deepEqual(loot1, loot2);
  // the draw does not read the meta's other state (crowns, pulls)
  const rich = make();
  rich.crowns = 99999;
  rich.pulls = 40;
  assert.deepEqual(openChest(rich, 'orcs', 3), loot1);
});

test('chests pay better by milestone and by army', () => {
  const crowns = (army: number, at: number) => chestCrowns(at, army);
  for (let i = 0; i < ARMIES.length; i++) assert.ok(crowns(i, 3) < crowns(i, 5) && crowns(i, 5) < crowns(i, 10));
  for (const at of MILESTONES) for (let i = 1; i < ARMIES.length; i++) assert.ok(crowns(i, at) > crowns(i - 1, at));
  // more things in a higher chest
  let items3 = 0;
  let items5 = 0;
  let items10 = 0;
  let rare3 = 0;
  let rare10 = 0;
  for (let seed = 1; seed <= 200; seed++) {
    for (const a of [ARMIES[0], ARMIES[8]]) {
      const r3 = rollChest(seed, a, 3);
      const r5 = rollChest(seed, a, 5);
      const r10 = rollChest(seed, a, 10);
      items3 += r3.shards.length + r3.recruits.length + r3.relics.length + r3.gear.length;
      items5 += r5.shards.length + r5.recruits.length + r5.relics.length + r5.gear.length;
      items10 += r10.shards.length + r10.recruits.length + r10.relics.length + r10.gear.length;
      rare3 += r3.shards.filter((k) => rarityOf(k) >= 3).length;
      rare10 += r10.shards.filter((k) => rarityOf(k) >= 3).length;
    }
  }
  assert.ok(items3 < items5 && items5 < items10, `${items3} ${items5} ${items10}`);
  assert.ok(rare10 > rare3, `${rare10} ${rare3}`);
  // a later army's chest draws rarer shards on average
  const rare = (a: (typeof ARMIES)[number]) => {
    let n = 0;
    for (let seed = 1; seed <= 400; seed++) n += rollChest(seed, a, 5).shards.reduce((s, k) => s + rarityOf(k), 0);
    return n;
  };
  assert.ok(rare(ARMIES[8]) > rare(ARMIES[0]));
});

test('the 10-star chest always holds a hero of Epic or better (higher on later armies), and the quality of gear rises', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const early = rollChest(seed, ARMIES[0], 10);
    assert.equal(early.recruits.length, 1);
    assert.ok(rarityOf(early.recruits[0].kind) >= 3);
    const mid = rollChest(seed, ARMIES[4], 10);
    assert.ok(rarityOf(mid.recruits[0].kind) >= 4);
    const late = rollChest(seed, ARMIES[8], 10);
    assert.equal(rarityOf(late.recruits[0].kind), 5);
    assert.ok(early.gear.length >= 1);
    assert.equal(rollChest(seed, ARMIES[0], 3).recruits.length, 0);
  }
});

test('opening a chest pays the meta: crowns, shards, a recruit (or shards if owned), and relics and gear for the next run', () => {
  const m = newMeta(9);
  m.armies.golems = { best: 10, won: 10, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1 }, chests: [10], opened: [] };
  const before = { crowns: m.crowns, unlocked: m.unlocked.length };
  const loot = openChest(m, 'golems', 10)!;
  assert.equal(loot.kind, 'gold');
  assert.ok(m.crowns > before.crowns);
  const prize = loot.items.find((i) => i.type === 'hero')!;
  assert.ok(prize.prize);
  assert.ok(m.unlocked.includes(prize.ref!));
  assert.ok(m.unlocked.length > before.unlocked);
  assert.ok(m.vault.gear.length >= 1);
  assert.ok(Object.values(m.shards).reduce((a, b) => a + b, 0) >= 1);
  // the vault goes into the next run, once
  const run = armyRun(5, 'orcs');
  const { relics, gear } = m.vault;
  assert.equal(takeVault(m, run), relics.length + gear.length);
  assert.equal(run.items!.length, gear.length);
  assert.deepEqual(run.relics, relics);
  assert.deepEqual(m.vault, { relics: [], gear: [] });
  assert.equal(new Set(run.items!.map((g) => g.id)).size, run.items!.length);
  assert.equal(takeVault(m, run), 0);
  // the vault survives a save
  const m2 = newMeta(9);
  m2.vault = { relics: ['banner', 'nope' as string], gear: [{ id: 0, slot: 'weapon', tier: 2, name: 'x', hp: 0, atk: 0.16 }] };
  const s = store();
  saveMeta(m2, s);
  const back = loadMeta(1, s);
  assert.deepEqual(back.vault.relics, ['banner']);
  assert.equal(back.vault.gear.length, 1);
  assert.equal(back.vault.gear[0].tier, 2);
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
  assert.equal(firstClearTotal(a), 294);
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
  assert.deepEqual(b.vault, { relics: [], gear: [] });
  // a save that has chests keeps exactly them (given, opened), and drops what is not a milestone
  const m3 = newMeta(5);
  m3.armies.orcs = { best: 8, won: 8, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 99 }, chests: [3, 5, 7 as number], opened: [3, 9 as number], hard: { 1: { won: 8, clears: 1 } } };
  saveMeta(m3, s);
  const c = loadMeta(1, s).armies.orcs;
  assert.deepEqual(c.chests, [3, 5]);
  assert.deepEqual(c.opened, [3]);
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
