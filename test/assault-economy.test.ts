// ASSAULT-ECONOMY (docs/notes/assault-1.md; the design's section 6 and 7.6): buying takes crowns and stops at zero; Fill the ranks costs 60 an
// empty place; the fallen are struck as they fall and gone after a win, a loss and a withdrawal; a page closed mid-battle loses exactly the
// soldiers already fallen; marks are paid; tribute pays once a day; the save round-trips, and an older save loads with no assault.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASSAULT_PRICES, assaultOpen, buyRecruit, buySiege, siegeCost, SIEGE_PRICES, canAssault, claimTribute, fillCost, fillRanks, marksEarned, noteFallen, readAssault, spoilsOf, troopsOf, tributeDue } from '../src/sim/assault/economy';
import { settleAssault, assaultXp, FOUGHT_MS } from '../src/sim/assault/assaultMode';
import { startedMeta, loadMeta, saveMeta, type Meta } from '../src/sim/meta';
import { recordOf } from '../src/sim/armies';
import { soundRetreat } from '../src/sim/assault/platoons';
import { stepBattle } from '../src/sim/battle';
import { fell, quiet, steps, PARTY } from './assaultKit';

const store = () => {
  const data: Record<string, string> = {};
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};
const saveWith = (crowns: number): Meta => {
  const m = startedMeta(5);
  m.crowns = crowns;
  m.party = [...PARTY];
  return m;
};

test('buying a recruit takes 60 crowns, and stops when the crowns or the places run out', () => {
  const m = saveWith(150);
  assert.ok(buyRecruit(m, 'knight'));
  assert.ok(buyRecruit(m, 'knight'));
  assert.ok(!buyRecruit(m, 'knight'), 'thirty crowns buy nobody');
  assert.equal(m.crowns, 150 - 2 * ASSAULT_PRICES.recruit);
  assert.deepEqual(troopsOf(m, 'knight'), [0, 0]);
  m.crowns = 10000;
  assert.equal(fillCost(m, 'knight'), 8 * 60);
  assert.equal(fillRanks(m, 'knight'), 8);
  assert.equal(troopsOf(m, 'knight').length, 10);
  assert.equal(fillCost(m, 'knight'), 0);
  assert.ok(!buyRecruit(m, 'knight'), 'a full platoon');
});

test('a fall is struck from the save at once: a page closed mid-assault loses exactly the soldiers already fallen', () => {
  const m = saveWith(10000);
  fillRanks(m, 'archer');
  m.assault!.troops.archer = [4, 0, 7, 0, 0, 0, 0, 0, 0, 1];
  noteFallen(m, 'archer', 2);
  noteFallen(m, 'archer', 9);
  const s = store();
  saveMeta(m, s);
  const back = loadMeta(1, s);
  assert.deepEqual(back.assault!.troops.archer, [4, 0, 0, 0, 0, 0, 0, 0]);
});

test('the save round-trips, an older save has no assault, and a bad one is read safely', () => {
  const m = saveWith(0);
  const s = store();
  saveMeta(m, s);
  assert.equal(loadMeta(1, s).assault, undefined, 'an older save: nothing bought, nothing conquered');
  m.assault = { v: 1, troops: { knight: [1, 2, 300], someLaterHero: [3] }, conquered: { orcs: { day: 20261108, tier: 3, wins: 2 }, nowhere: { day: 1, tier: 3, wins: 1 } }, tries: { orcs: 4 }, tribute: 20261108 };
  saveMeta(m, s);
  const back = loadMeta(1, s).assault!;
  assert.deepEqual(back.troops.knight, [1, 2, 99], 'marks clamped');
  assert.deepEqual(back.troops.someLaterHero, [3], 'an unknown hero kind is kept');
  assert.ok(back.conquered.orcs && !back.conquered.nowhere, 'an unknown army is dropped');
  assert.equal(back.tries.orcs, 4);
  assert.deepEqual(readAssault({ troops: { knight: Array(20).fill(1) } })!.troops.knight.length, 10);
});

test('marks: one for living, one for every three kills, two more for a conquest', () => {
  assert.equal(marksEarned(0, false), 1);
  assert.equal(marksEarned(7, false), 3);
  assert.equal(marksEarned(3, true), 4);
});

test('tribute: each conquered hold pays once a real day', () => {
  const m = saveWith(0);
  assert.equal(tributeDue(m, 20261108), 0);
  m.assault = { v: 1, troops: {}, conquered: { orcs: { day: 20261107, tier: 3, wins: 1 } }, tries: {} };
  assert.equal(claimTribute(m, 20261108), 150);
  assert.equal(claimTribute(m, 20261108), 0, 'once a day');
  assert.equal(claimTribute(m, 20261109), 150);
  assert.equal(m.crowns, 300);
});

test('the mode opens with the tenth star (nine is not enough)', () => {
  const m = saveWith(0);
  assert.ok(!assaultOpen(m) && !canAssault(m, 'orcs'));
  const rec = recordOf(m, 'orcs');
  // (the stars are each tier's conditions met: three on Normal, Hard and Elite, then Legendary's one)
  m.armies.orcs = { ...rec, met: { '0': 7, '1': 7, '2': 7 } };
  assert.ok(!canAssault(m, 'orcs'), 'nine stars');
  m.armies.orcs.met = { '0': 7, '1': 7, '2': 7, '3': 1 };
  assert.ok(canAssault(m, 'orcs') && assaultOpen(m), 'ten stars');
  assert.ok(!canAssault(m, 'undead'));
});

for (const how of ['won', 'lost', 'withdrawn'] as const)
  test(`settling a ${how} assault: the fallen are gone, the survivors marked, the tries counted`, () => {
    const m = saveWith(10000);
    for (const k of PARTY) fillRanks(m, k);
    const b = quiet({ troops: Object.fromEntries(PARTY.map((k) => [k, troopsOf(m, k)])) });
    const h = b.field!.hold!;
    // (three of the knight's soldiers fall, and the samurai's first)
    for (const s of h.platoons[0].soldiers.slice(0, 3)) fell(b, s.id);
    fell(b, h.platoons[1].soldiers[0].id);
    stepBattle(b);
    for (const e of h.events) if (e.kind === 'fell') noteFallen(m, h.platoons[e.platoon].hero, e.index);
    // (an assault counts as fought after two minutes: the survivors' mark and the XP)
    b.t = Math.max(b.t, FOUGHT_MS);
    if (how === 'won') {
      fell(b, h.lord);
      steps(b, 80);
    } else if (how === 'lost') {
      for (const pl of h.platoons) fell(b, pl.heroId);
      stepBattle(b);
    } else {
      soundRetreat(b);
      stepBattle(b);
    }
    assert.equal(h.outcome, how);
    const crowns = m.crowns;
    const r = settleAssault(m, b, 20261108);
    assert.equal(troopsOf(m, 'knight').length, 7);
    assert.equal(troopsOf(m, 'samurai').length, 9);
    assert.equal(troopsOf(m, 'archer').length, 10);
    assert.ok(troopsOf(m, 'archer').every((x) => x === (how === 'won' ? 3 : 1)), 'the survivors earn their marks');
    assert.equal(r.platoons[0].fallen, 3);
    assert.equal(m.assault!.tries.orcs, 1);
    assert.equal(r.xp, assaultXp('orcs', how === 'won'));
    if (how === 'won') {
      assert.ok(r.first && r.chest);
      assert.equal(m.crowns, crowns + spoilsOf('orcs'));
      assert.ok(m.stash.some((c) => c.conquest), 'the Conquest chest');
      assert.ok(m.assault!.conquered.orcs);
    } else {
      assert.equal(m.crowns, crowns);
      assert.ok(!m.assault!.conquered.orcs);
    }
  });

test('a retreat sounded at the start earns no marks for living and no XP', () => {
  const m = saveWith(10000);
  for (const k of PARTY) fillRanks(m, k);
  const b = quiet({ troops: Object.fromEntries(PARTY.map((k) => [k, troopsOf(m, k)])) });
  soundRetreat(b);
  stepBattle(b);
  const r = settleAssault(m, b, 20261108);
  assert.equal(r.xp, 0);
  assert.ok(troopsOf(m, 'archer').every((x) => x === 0));
});

test('the siege works are chosen on the muster, paid at the march as far as the crowns go (the ram first), and kept in the save', () => {
  const party = ['knight', 'samurai', 'archer'];
  const choice = { ladders: ['samurai', 'archer', 'nobody'], ram: 'knight' };
  assert.equal(siegeCost(party, choice), 2 * SIEGE_PRICES.ladder + SIEGE_PRICES.ram);
  const m = { crowns: SIEGE_PRICES.ram + SIEGE_PRICES.ladder + 50 } as unknown as Parameters<typeof buySiege>[0];
  const got = buySiege(m, party, choice);
  assert.deepEqual(got, { ram: 'knight', ladders: ['samurai'] });
  assert.equal(m.crowns, 50);
  assert.deepEqual(readAssault({ siege: { ladders: ['samurai', 'samurai', 3], ram: 'knight' } })!.siege, { ladders: ['samurai'], ram: 'knight' });
  assert.equal(readAssault({ siege: { ladders: 'x' } })!.siege, undefined);
});
