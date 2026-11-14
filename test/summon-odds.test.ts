import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMeta, pickStarter, pullOnce, type Meta } from '../src/sim/meta';
import { drawPool, pityDue, toCollect } from '../src/sim/unlock';
import { LUCKY_ODDS, PULL_HEROES, pityAt } from '../src/sim/unlockRules';
import { SHOP } from '../src/sim/chestShop';
import { QUALITY_WEIGHTS } from '../src/sim/equipment';
import { chestOdds, heroRows, pct, stoneOdds } from '../src/summonOdds';

const fresh = (seed: number): Meta => {
  const m = newMeta(seed);
  pickStarter(m, 0);
  return m;
};
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const near = (a: number, b: number, eps = 1e-12) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test('the odds of a stone sum to 100%, the lucky summon is 1 in LUCKY_ODDS, and every hero in the pool is equally likely', () => {
  const m = fresh(3);
  const o = stoneOdds(m);
  near(sum(o.outcomes.map((x) => x.chance)), 1);
  near(sum(o.outcomes.filter((x) => x.what === 'whole').map((x) => x.chance)), 1 / LUCKY_ODDS);
  assert.deepEqual(o.shardFrom, drawPool(m));
  const shard = o.outcomes.filter((x) => x.what === 'shard');
  assert.equal(shard.length, drawPool(m).length);
  for (const x of shard) near(x.chance, (1 - 1 / LUCKY_ODDS) / drawPool(m).length);
  // (a lucky summon only ever lands on a hero not owned, each equally)
  const whole = o.outcomes.filter((x) => x.what === 'whole');
  assert.deepEqual(whole.map((x) => x.kind).sort(), toCollect(m).sort());
  // (the hero rows add up to the same)
  near(sum(heroRows(m, o).map((r) => r.shard + r.lucky)), 1);
});

test('the table equals what the sim draws: thousands of stones over many saves land as the table says', () => {
  // (each sample is a fresh save's first stone, so every draw has the same odds; the seed varies)
  const N = 20000;
  const base = fresh(1);
  const o = stoneOdds(base);
  let lucky = 0;
  const shards: Record<string, number> = {};
  for (let i = 0; i < N; i++) {
    const m = fresh(1000 + i);
    // (the starter pick is fixed, so every save has the same heroes and the same table)
    assert.deepEqual(m.unlocked, base.unlocked);
    const p = pullOnce(m);
    if (p.lucky) lucky++;
    else shards[p.kind] = (shards[p.kind] ?? 0) + 1;
  }
  // (the lucky rate within four standard deviations of 1%)
  const sd = Math.sqrt(N * (1 / LUCKY_ODDS) * (1 - 1 / LUCKY_ODDS));
  assert.ok(Math.abs(lucky - N / LUCKY_ODDS) < 4 * sd, `lucky ${lucky} of ${N}`);
  // (every shard landed on a hero the table lists, and each hero's share is near its chance)
  const listed = new Set(o.outcomes.filter((x) => x.what === 'shard').map((x) => x.kind));
  for (const k of Object.keys(shards)) assert.ok(listed.has(k), `${k} drawn but not in the table`);
  const each = (1 - 1 / LUCKY_ODDS) / o.shardFrom.length;
  const sdEach = Math.sqrt(N * each * (1 - each));
  for (const k of listed) assert.ok(Math.abs((shards[k] ?? 0) - N * each) < 5 * sdEach, `${k}: ${shards[k]} against ${N * each}`);
});

test('when the pity is due, the table puts every shard on the hero closest to joining, as the draw does', () => {
  const m = fresh(7);
  const k = toCollect(m)[4];
  (m.unlock ??= {})[k] = 1;
  m.unlockDry = pityAt(PULL_HEROES.filter((h) => m.unlocked.includes(h)).length);
  assert.ok(pityDue(m));
  const o = stoneOdds(m);
  assert.ok(o.pity);
  assert.deepEqual(o.shardFrom, [k]);
  near(sum(o.outcomes.map((x) => x.chance)), 1);
  const p = pullOnce(m, { lucky: false });
  assert.equal(p.kind, k);
  assert.ok(p.pity);
});

test('with every hero owned, the lucky summon is ten rank shards, spread as a shard is', () => {
  const m = fresh(9);
  for (const k of PULL_HEROES) if (!m.unlocked.includes(k)) m.unlocked.push(k);
  const o = stoneOdds(m);
  assert.equal(o.outcomes.filter((x) => x.what === 'whole').length, 0);
  near(sum(o.outcomes.filter((x) => x.what === 'rank10').map((x) => x.chance)), 1 / LUCKY_ODDS);
  near(sum(o.outcomes.map((x) => x.chance)), 1);
});

test('the chest shop odds are the shop and equipment tables, and each rarity table sums to 100%', () => {
  const c = chestOdds();
  assert.equal(c.length, SHOP.length);
  c.forEach((x, i) => {
    assert.equal(x.kind, SHOP[i].kind);
    near(sum(x.rarity.map((r) => r.chance)), 1);
    const w = QUALITY_WEIGHTS[SHOP[i].quality] as Record<number, number>;
    near(x.rarity[3].chance, w[4] / sum(Object.values(w)));
    assert.equal(x.lines.find((l) => l.what === 'a piece of gear')!.chance, SHOP[i].gearChance);
    assert.ok(x.lines[0].what.startsWith(`${SHOP[i].stones} summoning stone`));
  });
});

test('chances read cleanly', () => {
  assert.equal(pct(0.01), '1%');
  assert.equal(pct(0.99 / 55), '1.8%');
  assert.equal(pct(0.0002), '0.02%');
  assert.equal(pct(1), '100%');
  assert.equal(pct(0.000001), '<0.001%');
});
