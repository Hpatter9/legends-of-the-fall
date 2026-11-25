// HALL-OF-HEROES (docs/notes/hall-of-heroes.md): the Hall's bonus, its caps, the trait sets' rewards (once), and rested heroes' XP.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimSet, claimSets, HALL, HALL_CAP, HALL_RATE, HALL_STAT, HALL_STATS, hallBonus, hallLine, isRested, lentBy, nearSets, noteRest, readHallSets, readRest, RESTED_RUNS, RESTED_XP, restedXp, SET_REWARD, SET_TRAITS, setOf, setProgress, setTarget } from '../src/sim/hall';
import { heroRows, setRows, statRows, titlesOf } from '../src/hallRules';
import { heroRank, startedMeta, type Meta } from '../src/sim/meta';
import { heroStats } from '../src/sim/talents';
import { TRAITS, traitsOf } from '../src/sim/traits';
import { ALL_HEROES, UNITS } from '../src/sim/units';

const CLASSES = Object.values(TRAITS).filter((t) => t.kind === 'class').map((t) => t.id);

/** A save owning these heroes at these ranks (shards give the ranks; every earned rank counts in a test's save). */
function withRanks(ranks: Record<string, number>, seed = 3): Meta {
  const m = startedMeta(seed);
  const SHARDS = [0, 1, 3, 6, 10];
  for (const [k, r] of Object.entries(ranks)) {
    if (!m.unlocked.includes(k)) m.unlocked.push(k);
    m.shards[k] = SHARDS[r];
  }
  return m;
}
const nm = (k: string): string => UNITS[k]?.name ?? k;

test('every class lends one of the four stats', () => {
  for (const c of CLASSES) assert.ok(HALL_STATS.includes(HALL_STAT[c]), `${c} lends a stat`);
});

test('each rank of an owned hero lends its class’s stat; rank 0 and heroes not owned lend nothing', () => {
  const m = withRanks({ knight: 2, samurai: 3, kunoichi: 1, wizard: 4 });
  assert.equal(heroRank(m, 'knight'), 2);
  assert.deepEqual(lentBy(m, 'knight'), { stat: 'hp', share: 2 * HALL_RATE.hp });
  assert.deepEqual(lentBy(m, 'samurai'), { stat: 'atk', share: 3 * HALL_RATE.atk });
  assert.deepEqual(lentBy(m, 'kunoichi'), { stat: 'crit', share: HALL_RATE.crit });
  assert.deepEqual(lentBy(m, 'wizard'), { stat: 'charge', share: 4 * HALL_RATE.charge });
  assert.equal(lentBy(m, 'paladin'), undefined, 'not owned');
  assert.match(hallLine(hallBonus(m)), /^Your Hall: \+/);
  assert.equal(hallLine({ hp: 0, atk: 0, crit: 0, charge: 0 }), 'Your Hall: nothing yet');
});

test('the bonus is the sum over the heroes owned, exactly', () => {
  const m = withRanks({ knight: 2, paladin: 4, samurai: 1 });
  // (the save's own other heroes are left at rank 0)
  for (const k of m.unlocked) if (!['knight', 'paladin', 'samurai'].includes(k)) m.shards[k] = 0;
  const b = hallBonus(m);
  assert.ok(Math.abs(b.hp - 6 * HALL_RATE.hp) < 1e-9, `hp ${b.hp}`);
  assert.ok(Math.abs(b.atk - 1 * HALL_RATE.atk) < 1e-9, `atk ${b.atk}`);
});

test('each stat stops at its cap, a full collection included', () => {
  const all = Object.fromEntries(ALL_HEROES.filter((k) => UNITS[k] && traitsOf(k)[1]).map((k) => [k, 4]));
  const m = withRanks(all);
  m.awakened = Object.fromEntries(Object.keys(all).map((k) => [k, 2]));
  const b = hallBonus(m);
  for (const s of HALL_STATS) assert.ok(b[s] <= HALL_CAP[s] + 1e-9, `${s} ${b[s]} within ${HALL_CAP[s]}`);
  // (a full collection reaches every cap but none past it: about +12% HP, +10% ATK, +4% crit, +8% charge)
  assert.deepEqual(b, { ...HALL_CAP });
  assert.ok(statRows(m).every((r) => r.full));
});

test('the Hall is added to every hero’s lasting stats, and nothing with the switch off', () => {
  const m = withRanks({ knight: 4, samurai: 4 });
  const on = heroStats(m, 'archer');
  HALL.on = false;
  try {
    const off = heroStats(m, 'archer');
    assert.equal(hallBonus(m).hp, 0);
    assert.ok((on?.hp ?? 0) > (off?.hp ?? 0));
    assert.ok((on?.atk ?? 0) > (off?.atk ?? 0));
  } finally {
    HALL.on = true;
  }
});

test('a trait set: its progress, its summon target, and its reward paid once', () => {
  const m = startedMeta(5);
  m.unlocked = ['knight', 'samurai', 'archer'];
  const undead = setOf('undead');
  assert.ok(undead.length >= 4);
  // (the set short of one a summon can bring: the last of it in the roster's order that is not earned in play)
  undead.sort((a, b) => Number(b === 'reaper' || b === 'dreadPirate') - Number(a === 'reaper' || a === 'dreadPirate'));
  m.unlocked.push(...undead.slice(0, -1));
  const p = setProgress(m, 'undead');
  assert.equal(p.have, undead.length - 1);
  assert.deepEqual(p.missing, undead.slice(-1));
  assert.equal(p.done, false);
  assert.deepEqual(setTarget(m, undead[undead.length - 1]), { trait: 'undead', left: 1 });
  assert.equal(setTarget(m, 'knight'), undefined, 'owned');
  // (a hero earned in play is never a summon target)
  assert.equal(setTarget(m, 'reaper'), undefined);
  assert.ok(nearSets(m).some((s) => s.trait === 'undead'));
  assert.equal(claimSet(m, 'undead'), false, 'not done');
  m.unlocked.push(undead[undead.length - 1]);
  const stones = m.stones ?? 0;
  const crowns = m.crowns;
  assert.equal(claimSet(m, 'undead'), true);
  assert.equal((m.stones ?? 0) - stones, SET_REWARD.stones);
  assert.equal(m.crowns - crowns, SET_REWARD.crowns);
  assert.equal(claimSet(m, 'undead'), false, 'once');
  assert.ok(!claimSets(m).includes('undead'), 'once, by the sweep too');
  assert.equal(m.crowns - crowns, SET_REWARD.crowns);
  assert.ok(titlesOf(m).includes('Keeper of the Undead'));
  const row = setRows(m, nm).find((r) => r.trait === 'undead')!;
  assert.equal(row.paid, true);
  assert.equal(row.progress, `${undead.length} of ${undead.length} Undead`);
});

test('every trait with heroes has a set, each of two heroes or more', () => {
  const sets = SET_TRAITS();
  assert.ok(sets.length >= 20);
  for (const t of sets) assert.ok(setOf(t.id).length >= 2, t.id);
});

test('a rested hero: three army runs sat out; half again the XP; its rest starts again when it fights', () => {
  const m = startedMeta(6);
  m.unlocked = ['knight', 'samurai', 'archer', 'wizard'];
  for (let i = 0; i < RESTED_RUNS; i++) {
    assert.equal(isRested(m, 'wizard'), false);
    noteRest(m, ['knight', 'samurai', 'archer']);
  }
  assert.equal(isRested(m, 'wizard'), true);
  assert.equal(isRested(m, 'knight'), false);
  assert.deepEqual(restedXp(m, { wizard: 100, knight: 100 }), { wizard: Math.round(100 * (1 + RESTED_XP)), knight: 100 });
  // (a fourth run sat out keeps it rested, counted no higher)
  noteRest(m, ['knight']);
  assert.equal(m.rest?.wizard, RESTED_RUNS);
  noteRest(m, ['wizard', 'knight']);
  assert.equal(isRested(m, 'wizard'), false);
  assert.equal(m.rest?.wizard, undefined);
  HALL.on = false;
  try {
    m.rest = { wizard: RESTED_RUNS };
    assert.equal(isRested(m, 'wizard'), false);
    assert.deepEqual(restedXp(m, { wizard: 100 }), { wizard: 100 });
  } finally {
    HALL.on = true;
  }
});

test('the save keeps the sets paid and the rest, and reads a bad one as none', () => {
  assert.deepEqual(readHallSets(['undead', 'nope', 'undead', 3]), ['undead']);
  assert.equal(readHallSets([]), undefined);
  assert.equal(readHallSets('x'), undefined);
  assert.deepEqual(readRest({ wizard: 9, knight: 1, nope: 2, archer: -1 }), { wizard: RESTED_RUNS, knight: 1 });
  assert.equal(readRest(null), undefined);
});

test('the page’s hero rows: owned first, each with what it lends', () => {
  const m = withRanks({ knight: 2 });
  const rows = heroRows(m, nm);
  assert.equal(rows.length, ALL_HEROES.filter((k) => UNITS[k]).length);
  assert.equal(rows[0].owned, true);
  assert.ok(rows.find((r) => r.kind === 'knight')!.lends.startsWith(`+${Math.round(2 * HALL_RATE.hp * 1000) / 10}% HP`));
  assert.equal(rows[rows.length - 1].owned, false);
  assert.equal(rows[rows.length - 1].lends, 'Not yet joined');
});

test('a duel’s champion fights without the Hall: its stats as with the Hall off', async () => {
  const { withoutHall } = await import('../src/sim/hall');
  const { boostOf } = await import('../src/sim/run');
  const m = withRanks({ knight: 4, samurai: 4, kunoichi: 3, wizard: 3 });
  const h = { id: 1, kind: 'archer', grade: 1 };
  const on = boostOf(h, heroRank(m, 'archer'), 30, heroStats(m, 'archer'));
  HALL.on = false;
  let off;
  try {
    off = boostOf(h, heroRank(m, 'archer'), 30, heroStats(m, 'archer'));
  } finally {
    HALL.on = true;
  }
  const duel = withoutHall(m, on);
  for (const k of ['hp', 'atk', 'crit', 'charge'] as const) assert.ok(Math.abs((duel.equip?.[k] ?? 0) - (off.equip?.[k] ?? 0)) < 1e-9, k);
  assert.ok((on.equip?.hp ?? 0) > (off.equip?.hp ?? 0), 'the Hall was there');
});
