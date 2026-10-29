import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropGear } from '../src/sim/gear';
import { Rng } from '../src/sim/rng';
import { autoMerge } from '../src/sim/merge';
import { equip, heroOf, loadRun, newRun, paidOf, recycle, recycleValue, saveRun, summon, summonCost, SUMMON_BASE, SUMMON_STEP, type Run } from '../src/sim/run';

/** A run with plenty of gold that has bought `n` heroes. */
function bought(seed: number, n: number): Run {
  const r = newRun(seed);
  r.gold = 100000;
  for (let i = 0; i < n; i++) summon(r);
  return r;
}

test('a hero keeps count of the gold paid into it: starters the base price, summons their price, merges the sum', () => {
  const r = newRun(5);
  assert.deepEqual(r.roster.map(paidOf), [SUMMON_BASE, SUMMON_BASE]);
  r.gold = 100000;
  const price = summonCost(r);
  const got = summon(r)!;
  assert.equal(heroOf(r, got.id)!.grade === 1 ? paidOf(got) : 0, got.grade === 1 ? price : 0);
  // (MERGE-TWO: hires wait to be merged; summons until the bench is full, merging every pair as the Auto merge button does)
  for (let i = 0; i < 40; i++) {
    summon(r);
    autoMerge(r);
  }
  // (every hero's paid gold is at least a base price for each grade-1 hero it holds, and the whole roster has cost what was spent plus the two free ones)
  const spent = 100000 - r.gold;
  assert.equal(r.roster.reduce((n, h) => n + paidOf(h), 0), spent + 2 * SUMMON_BASE);
  assert.ok(r.roster.some((h) => h.grade > 1));
});

test('recycling pays half the current Hire price, rounded, at least 1, whatever the hero cost', () => {
  const r = bought(7, 12);
  for (const h of r.roster) {
    const v = recycleValue(r);
    assert.ok(v >= 1, `${h.kind}${h.grade}`);
    assert.equal(v, Math.round(summonCost(r) / 2));
  }
  const fresh = newRun(8);
  assert.equal(summonCost(fresh), SUMMON_BASE);
  assert.equal(recycleValue(fresh), 15);
  fresh.summons = 1;
  assert.equal(summonCost(fresh), SUMMON_BASE + SUMMON_STEP);
  assert.equal(recycleValue(fresh), 18);
  // (the price goes up with each hire, and so does what a recycle pays)
  const cheap = { ...fresh, summons: 0 };
  assert.ok(recycleValue(fresh) > recycleValue(cheap));
});

test('recycle removes the hero from the roster and squad, pays the gold, and leaves the others', () => {
  const r = bought(9, 6);
  const h = r.roster[0];
  assert.ok(r.squad.includes(h.id));
  const gold = r.gold;
  const left = r.roster.length - 1;
  const want = recycleValue(r);
  const pay = recycle(r, h.id)!;
  assert.equal(pay, want);
  assert.equal(r.gold, gold + pay);
  assert.equal(r.roster.length, left);
  assert.equal(heroOf(r, h.id), undefined);
  assert.equal(r.squad.includes(h.id), false);
  assert.equal(recycle(r, h.id), null);
  assert.equal(recycle(r, 99999), null);
});

test('a recycled hero hands its gear back to the pack', () => {
  const r = newRun(11);
  const g = dropGear(new Rng(3), 1, 1, 0);
  r.items = [g];
  const h = r.roster[0];
  assert.ok(equip(r, h.id, g.id));
  assert.equal(r.items.length, 0);
  recycle(r, h.id);
  assert.deepEqual(r.items, [g]);
});

test('the last hero cannot be recycled, and nothing is recycled once the run is over', () => {
  const r = newRun(13);
  assert.ok(recycle(r, r.roster[0].id) !== null);
  assert.equal(r.roster.length, 1);
  const last = r.roster[0].id;
  const gold = r.gold;
  assert.equal(recycle(r, last), null);
  assert.equal(r.roster.length, 1);
  assert.equal(r.gold, gold);
  const o = bought(13, 3);
  o.over = true;
  assert.equal(recycle(o, o.roster[0].id), null);
});

test('recycling never makes summons cheaper or rerolls them: the price and the draw go on from the summon count', () => {
  const a = bought(21, 5);
  const b = bought(21, 5);
  for (const h of [...a.roster].slice(0, 4)) recycle(a, h.id);
  assert.equal(a.summons, b.summons);
  assert.equal(summonCost(a), summonCost(b));
  // (the gold back is half a hire: buying and recycling over and over is a steady loss)
  const r = newRun(22);
  r.gold = 1000;
  const start = r.gold;
  for (let i = 0; i < 20; i++) {
    const got = summon(r)!;
    recycle(r, got.id);
  }
  assert.ok(r.gold < start);
  // (recycling does not touch the draw: the next summon is the hero it would have been)
  const c = newRun(23);
  const d = newRun(23);
  c.gold = d.gold = 1000;
  recycle(d, d.roster[0].id);
  assert.equal(summon(c)!.kind, summon(d)!.kind);
});

test('a run with a recycled hero saves and loads as it was', () => {
  const r = bought(31, 8);
  recycle(r, r.roster[1].id);
  let saved = '';
  saveRun(r, { setItem: (_k, v) => (saved = v) });
  const back = loadRun({ getItem: () => saved })!;
  assert.deepEqual(back, r);
  assert.equal(back.roster.map(paidOf).reduce((n, v) => n + v, 0), r.roster.map(paidOf).reduce((n, v) => n + v, 0));
});
