// The difficulty curve (`docs/notes/difficulty.md`): which hero level each army tier is for, pinned loosely (a tier is hard at the level it opens
// for and a first-try clear only well above it), the escorts and boss form a high tier brings, and the foes of the spire and the Calamity answering
// the castle. The tries are measured with the greedy player of `tools/autoplay.ts`, as `npm run balance -- --deep` does.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, armyById, waveBoost, waveFoes } from '../src/sim/armies';
import { PHASE_AT } from '../src/sim/bossPhases';
import { BUILDINGS, CASTLE_ANSWER, foeAnswer, heroBoost, maxLevel, newCastle, type BuildingId } from '../src/sim/castle';
import { levelOfKind } from '../src/sim/levels';
import { heroRank, startedMeta, type Meta } from '../src/sim/meta';
import { mixSeed } from '../src/sim/rng';
import { armyRun, boostOf, startStage, type Owned } from '../src/sim/run';
import { calamityRun, towerRun } from '../src/sim/modes';
import { choices, enterNode } from '../src/sim/tower';
import { TIERS } from '../src/sim/tiers';
import { heroStats, learn, tierNodes } from '../src/sim/talents';
import { playArmy, savedAt } from '../tools/autoplay';

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const maxed = newCastle();
for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);

/** Tries to clear an army (from a fresh save of a party at `level`, a maxed castle, gear dressed, with or without every talent row the level opens), at most `cap`. */
function tries(army: string, tier: number, level: number, talents: boolean, save: number, cap = 12): number {
  const meta = savedAt(level, party, save);
  if (talents)
    for (const k of party) {
      if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
      for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
    }
  const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
  let n = 0;
  while (n < cap) {
    n++;
    if (playArmy(meta, army, mixSeed(save, 0xd33b, ARMIES.findIndex((a) => a.id === army) * 100 + tier * 10 + n), party, maxed, true, tier, talents ? boostFor : undefined).cleared) return n;
  }
  return cap + 1;
}
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const meanTries = (army: string, tier: number, level: number, talents: boolean, saves = 3): number => mean(Array.from({ length: saves }, (_, i) => tries(army, tier, level, talents, i + 1)));

test('the five tiers rise in hp, attack and speed, and Mythic brings escorts and a fiercer boss', () => {
  assert.equal(TIERS.length, 5);
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(TIERS[i].hp > TIERS[i - 1].hp && TIERS[i].atk > TIERS[i - 1].atk && TIERS[i].speed >= TIERS[i - 1].speed, TIERS[i].name);
    assert.ok(TIERS[i].pay > TIERS[i - 1].pay && TIERS[i].xp > TIERS[i - 1].xp, TIERS[i].name);
    assert.ok((TIERS[i].extra ?? 0) >= (TIERS[i - 1].extra ?? 0), TIERS[i].name);
  }
  assert.equal(TIERS[0].extra, undefined);
  assert.ok((TIERS[4].extra ?? 0) >= 2 && TIERS[4].phaseAt! > PHASE_AT && TIERS[4].surge! > 1);
  // (Normal is as it was)
  assert.deepEqual(TIERS[0], { id: 'normal', name: 'Normal', need: 0, stars: 3, hp: 1, atk: 1, speed: 1, pay: 1, xp: 1 });
});

test('escorts: a high tier adds copies of the wave’s escorts, never a second boss, and Normal is the wave as it is', () => {
  for (const a of ARMIES) {
    a.waves.forEach((w, i) => {
      assert.deepEqual(waveFoes(a, i + 1, 0), w.foes);
      for (let t = 1; t < TIERS.length; t++) {
        const foes = waveFoes(a, i + 1, t);
        assert.deepEqual(foes.slice(0, w.foes.length), w.foes);
        assert.equal(foes.length - w.foes.length, w.boss && w.foes.length < 2 ? 0 : TIERS[t].extra ?? 0, `${a.id} wave ${i + 1} tier ${t}`);
        if (w.boss) assert.equal(foes.filter((f) => f === w.foes[0]).length, w.foes.filter((f) => f === w.foes[0]).length, 'the boss is not copied');
      }
    });
  }
  // (and the fight has them)
  const army = armyById('infernal')!;
  const count = (t: number) => startStage(armyRun(3, 'infernal', undefined, undefined, t)).units.filter((u) => u.side === 'foe').length;
  assert.equal(count(0), army.waves[0].foes.length);
  assert.equal(count(4), army.waves[0].foes.length + (TIERS[4].extra ?? 0));
});

test('Mythic’s last boss changes form earlier and hits harder in its second form', () => {
  const a = armyById('golems')!;
  const last = a.waves.length;
  assert.equal(waveBoost(a, last, 0).boss!.phase, PHASE_AT);
  assert.equal(waveBoost(a, last, 3).boss!.phase, PHASE_AT);
  assert.equal(waveBoost(a, last, 4).boss!.phase, TIERS[4].phaseAt);
  assert.equal(waveBoost(a, last, 4).boss!.surge, TIERS[4].surge);
  assert.equal(waveBoost(a, last, 3).boss!.surge, undefined);
  // (the surge is in the fight: the boss's attack after the change is higher on Mythic by the surge)
  const boss = (t: number) => startStage({ ...armyRun(7, 'golems', undefined, undefined, t), stage: last }).units.find((u) => u.side === 'foe')!;
  assert.equal(boss(4).phase!.surge, TIERS[4].surge);
  assert.equal(boss(3).phase!.surge, undefined);
});

test('Normal at level 1 keeps its feel: the first army falls in a try or two, the Labyrinth takes a few', () => {
  assert.ok(meanTries('orcs', 0, 1, false) <= 2);
  assert.ok(meanTries('labyrinth', 0, 1, false) >= 2);
});

test('Hard is not a first-try clear at level 1, and Elite not at level 15 (no talents or with)', () => {
  for (const army of ['wildwood', 'infernal', 'golems']) {
    assert.ok(meanTries(army, 1, 1, false) > 2, `Hard ${army}`);
    assert.ok(meanTries(army, 2, 15, true) > 2, `Elite ${army}`);
  }
});

test('Legendary needs the 60s: not a first-try clear at level 45, even with talents', () => {
  for (const army of ['infernal', 'yokai', 'golems']) assert.ok(meanTries(army, 3, 45, true) > 2, army);
});

test('Mythic is still not a first-try clear at level 100 with every talent, on the late armies', () => {
  for (const army of ['infernal', 'yokai', 'golems']) assert.ok(meanTries(army, 4, 100, true) > 1.5, army);
  // (and a level-100 party does win it in the end: it is a hard tier, not a wall)
  assert.ok(tries('golems', 4, 100, true, 1, 25) <= 25);
});

test('the foes of the spire and the Calamity answer the castle’s hp and attack; an army’s do not', () => {
  assert.deepEqual(foeAnswer(newCastle()), { hp: 1, atk: 1 });
  const h = heroBoost(maxed);
  const a = foeAnswer(maxed);
  assert.ok(Math.abs(a.hp! - h.hp! ** CASTLE_ANSWER.share) < 1e-9 && Math.abs(a.atk! - h.atk! ** CASTLE_ANSWER.share) < 1e-9);
  // the castle's boost is more than cancelled in hp and attack (the mana, the Library and the spells it also gives are covered)
  assert.ok(a.hp! >= h.hp! && a.atk! >= h.atk!);
  const foeHp = (m: Meta, kind: 'tower' | 'calamity') => {
    const run = kind === 'tower' ? towerRun(5, m) : calamityRun(5, m, 'knight');
    const first = choices(run).find((n) => n.kind === 'fight') ?? choices(run)[0];
    assert.ok(enterNode(run, first.id));
    return startStage(run).units.filter((u) => u.side === 'foe').reduce((n, u) => n + u.maxHp, 0);
  };
  for (const kind of ['tower', 'calamity'] as const) {
    const bare = startedMeta(5);
    const built = startedMeta(5);
    built.castle = { ...maxed };
    const ratio = foeHp(built, kind) / foeHp(bare, kind);
    assert.ok(Math.abs(ratio - a.hp!) < 0.03, `${kind}: foes ${ratio.toFixed(3)}x for a castle at its top`);
  }
  // (an army run is not local: its foes are the tier's alone)
  const army = startedMeta(5);
  army.castle = { ...maxed };
  const plain = startStage(armyRun(5, 'orcs')).units.filter((u) => u.side === 'foe').reduce((n, u) => n + u.maxHp, 0);
  const withCastle = startStage({ ...armyRun(5, 'orcs', undefined, army.castle) }).units.filter((u) => u.side === 'foe').reduce((n, u) => n + u.maxHp, 0);
  assert.equal(plain, withCastle);
});

test('the daily’s foes scale with the squad’s lasting power: a fresh save meets it as it was, a levelled one meets stronger foes', async () => {
  const { dailyRun, dailyScale, startDaily } = await import('../src/sim/modes');
  const { xpFor } = await import('../src/sim/levels');
  const { HEROES } = await import('../src/sim/units');
  const fresh = startedMeta(3);
  assert.equal(dailyScale(fresh), 1);
  assert.equal(startDaily(fresh, 20260301).mode!.kind === 'daily' && (startDaily(fresh, 20260302).mode as { scale?: number }).scale, undefined);
  const late = startedMeta(3);
  for (const k of HEROES) late.xp[k] = xpFor(100);
  const k = dailyScale(late);
  assert.ok(k > 3, `scale ${k}`);
  const foeHp = (scale: number) => startStage(dailyRun(20260301, false, scale)).units.filter((u) => u.side === 'foe').reduce((n, u) => n + u.maxHp, 0);
  assert.ok(Math.abs(foeHp(k) / foeHp(1) - k) < 0.05);
  assert.equal((startDaily(late, 20260303).mode as { scale?: number }).scale, k);
});

test('a saved Mythic run loads (runFits reads the waves, not the tier), and one past its last wave does not', async () => {
  const { loadRun, saveRun } = await import('../src/sim/run');
  const data: Record<string, string> = {};
  const store = { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
  const run = armyRun(1, 'golems', undefined, undefined, 4);
  run.stage = armyById('golems')!.waves.length;
  saveRun(run, store);
  assert.equal(loadRun(store)?.mode?.kind === 'army' && loadRun(store)?.mode?.tier, 4);
  run.stage++;
  saveRun(run, store);
  assert.equal(loadRun(store), null);
});
