import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadMeta, LUCKY_ODDS, LUCKY_RANK_SHARDS, newMeta, pickStarter, pullOnce, saveMeta, startedMeta, stonesOf, useStones, type Meta } from '../src/sim/meta';
import { haveOf, needOf, ownedCount, toCollect } from '../src/sim/unlock';
import { CAL_STONES_PER_DRAW, CHEST_STONES, CONTENT_KINDS, DAILY_CHEST_STONES, isContent, PULL_HEROES, STONES_GIFT } from '../src/sim/unlockRules';
import { buyChest, canBuy, peekShopChest, PRICE_GROW, readShop, SHOP, shopChest, shopPrice, stockLeft } from '../src/sim/chestShop';
import { clearStones } from '../src/sim/calReward';
import { ALL_HEROES } from '../src/sim/units';

const store = () => {
  const data: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (data[k] = v), getItem: (k: string) => data[k] ?? null, data };
};
const fresh = (seed: number): Meta => {
  const m = newMeta(seed);
  pickStarter(m, 0);
  return m;
};
const DAY = 20261101;

test('a stone gives exactly one shard of one hero (unlock shards for a hero not owned, a rank shard for one owned)', () => {
  const m = fresh(5);
  for (let i = 0; i < 300; i++) {
    const before = { unlock: Object.values(m.unlock ?? {}).reduce((a, b) => a + b, 0), shards: Object.values(m.shards).reduce((a, b) => a + b, 0), owned: m.unlocked.length };
    const p = pullOnce(m, { lucky: false });
    const after = { unlock: Object.values(m.unlock ?? {}).reduce((a, b) => a + b, 0), shards: Object.values(m.shards).reduce((a, b) => a + b, 0), owned: m.unlocked.length };
    const gained = after.shards - before.shards + (p.isNew ? 1 : after.unlock - before.unlock) + (p.crowns ? 1 : 0);
    assert.equal(gained, 1, `pull ${i}: ${JSON.stringify(p)}`);
    assert.equal(p.lucky, undefined);
  }
});

test('using stones is deterministic for a seed, and spends exactly one stone a pull', () => {
  const run = () => {
    const m = fresh(77);
    m.stones = 60;
    const got = [...useStones(m, 10)!, ...useStones(m, 10)!, ...useStones(m, 1)!];
    return { got, left: m.stones, unlocked: m.unlocked, unlock: m.unlock, shards: m.shards };
  };
  const a = run();
  assert.deepEqual(a, run());
  assert.equal(a.left, 60 - 21);
});

test('the lucky roll comes about one stone in a hundred, from a side stream (the shard draws are the same without it)', () => {
  assert.equal(LUCKY_ODDS, 100);
  let lucky = 0;
  const N = 20000;
  for (let seed = 1; seed <= 20; seed++) {
    const m = fresh(seed);
    for (let i = 0; i < N / 20; i++) {
      if (pullOnce(m).lucky) lucky++;
    }
  }
  assert.ok(lucky > 130 && lucky < 270, `${lucky} lucky rolls in ${N} stones`);
  // (a stone that is not lucky draws exactly as a pull always did: forcing the roll off changes nothing else)
  const a = fresh(9);
  const b = fresh(9);
  for (let i = 0; i < 40; i++) {
    const p = pullOnce(a);
    if (p.lucky) {
      // (the lucky pull used the pull counter: keep the other save in step so the later draws still line up)
      b.pulls++;
      b.unlocked = [...a.unlocked];
      b.unlock = { ...(a.unlock ?? {}) };
      b.unlockDry = a.unlockDry;
      continue;
    }
    assert.deepEqual(pullOnce(b, { lucky: false }), p);
  }
});

test('the lucky roll summons a whole hero not yet owned, at rank 0, never an owned or a content hero', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const m = fresh(seed);
    const owned = [...m.unlocked];
    const left = toCollect(m);
    const p = pullOnce(m, { lucky: true });
    assert.equal(p.lucky, true);
    assert.equal(p.isNew, true);
    assert.ok(left.includes(p.kind), 'drawn from the heroes not yet owned');
    assert.ok(!owned.includes(p.kind));
    assert.ok(!isContent(p.kind), 'never a content hero');
    assert.deepEqual(m.unlocked, [...owned, p.kind]);
    assert.equal(m.shards[p.kind] ?? 0, 0, 'at rank 0');
    assert.equal(haveOf(m, p.kind), 0);
    assert.equal(m.pulls, 1);
  }
  // (a hero with a begun bar is summoned whole: the bar is spent)
  const m = fresh(3);
  const k = toCollect(m)[0];
  m.unlock = { [k]: 1 };
  for (let i = 0; i < 40 && !m.unlocked.includes(k); i++) pullOnce(m, { lucky: true });
  assert.ok(m.unlocked.includes(k));
  assert.equal(m.unlock?.[k], undefined);
  // (it goes on drawing unowned heroes until they are all owned, and never repeats one)
  const all = fresh(4);
  for (let i = 0; i < PULL_HEROES.length; i++) pullOnce(all, { lucky: true });
  assert.equal(new Set(all.unlocked).size, all.unlocked.length);
  assert.equal(ownedCount(all), PULL_HEROES.length);
  for (const c of CONTENT_KINDS) assert.ok(!all.unlocked.includes(c));
  // (and it is the same hero for the same save and stone)
  assert.equal(pullOnce(fresh(8), { lucky: true }).kind, pullOnce(fresh(8), { lucky: true }).kind);
});

test('with every pullable hero owned, the lucky roll gives a big batch of rank shards instead', () => {
  const m = fresh(6);
  m.unlocked = [...PULL_HEROES];
  const p = pullOnce(m, { lucky: true });
  assert.equal(p.lucky, true);
  assert.equal(p.isNew, false);
  assert.equal(p.shards, LUCKY_RANK_SHARDS);
  assert.equal(m.shards[p.kind], LUCKY_RANK_SHARDS);
  assert.ok(LUCKY_RANK_SHARDS >= 5, 'a big batch');
  assert.equal(m.unlocked.length, PULL_HEROES.length, 'nobody new joins');
});

test('shards come only from stones: no source calls giveShards but the stone draw', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts')) files.push(p);
    }
  };
  walk('src');
  const callers = files.filter((f) => /\bgiveShards\(/.test(readFileSync(f, 'utf8')) && !f.endsWith('src/sim/unlock.ts'));
  assert.deepEqual(callers, ['src/sim/meta.ts'], 'only pullOnce (the stone draw) gives shards');
});

test('crowns buy no pull; chests give stones (every chest source), and a stone is the only way to a shard', () => {
  const m = fresh(2);
  m.crowns = 1e7;
  assert.equal(useStones(m, 1), null);
  assert.deepEqual(m.unlock ?? {}, {});
  // (the sources: a chest's stones by size, the daily's, a calamity clear's)
  assert.ok(CHEST_STONES[3] >= 1 && CHEST_STONES[10] > CHEST_STONES[3]);
  assert.ok(DAILY_CHEST_STONES >= 1);
  assert.equal(clearStones(0), 2 * CAL_STONES_PER_DRAW);
});

test('the chest shop: prices, contents, a daily stock, and prices that rise with the heroes owned', () => {
  assert.deepEqual(SHOP.map((c) => [c.kind, c.price, c.stock, c.stones]), [['bronze', 400, 3, 3], ['silver', 1500, 1, 5], ['gold', 6000, 1, 8]]);
  const m = fresh(11);
  m.crowns = 100000;
  assert.equal(shopPrice(m, 'bronze'), 400, 'the base price while the starter is all you own');
  // (a bronze chest: its stones, and gear now and then)
  let gear = 0;
  for (let i = 0; i < 3; i++) {
    const before = { crowns: m.crowns, stones: stonesOf(m), gear: m.equipment?.length ?? 0 };
    const loot = buyChest(m, 'bronze', DAY)!;
    assert.equal(m.crowns, before.crowns - 400);
    assert.equal(stonesOf(m) - before.stones, 3);
    assert.equal(loot.kind, 'bronze');
    assert.equal(loot.items.find((i) => i.type === 'stones')!.n, 3);
    const got = loot.items.filter((i) => i.type === 'gear').length;
    assert.equal(m.equipment?.length ?? 0, before.gear + got);
    gear += got;
  }
  assert.equal(stockLeft(m, 'bronze', DAY), 0);
  assert.equal(canBuy(m, 'bronze', DAY), false, 'sold out for the day');
  assert.equal(buyChest(m, 'bronze', DAY), null);
  assert.equal(m.crowns, 100000 - 1200);
  assert.equal(stockLeft(m, 'bronze', DAY + 1), 3, 'it restocks the next day');
  // (silver and gold always hold a piece of gear)
  for (const kind of ['silver', 'gold'] as const) {
    const loot = buyChest(m, kind, DAY)!;
    assert.equal(loot.items.filter((i) => i.type === 'gear').length, 1, kind);
    assert.equal(loot.items.find((i) => i.type === 'stones')!.n, shopChest(kind).stones);
    assert.equal(m.crowns, 100000 - 1200 - (kind === 'silver' ? 1500 : 7500));
  }
  assert.ok(gear >= 0);
  // (a poor player buys nothing, and a look at the shop changes nothing)
  const poor = fresh(12);
  poor.crowns = 399;
  assert.equal(buyChest(poor, 'bronze', DAY), null);
  assert.equal(poor.crowns, 399);
  const peek = peekShopChest(m, 'gold');
  assert.equal(peek.kind, 'gold');
  assert.equal(m.shopBuys, 5);
  // (the price rises with the pullable heroes owned beyond the starter's three)
  const big = fresh(13);
  big.unlocked = [...PULL_HEROES];
  assert.equal(shopPrice(big, 'bronze'), Math.round((400 * (1 + PRICE_GROW * (PULL_HEROES.length - 3))) / 50) * 50);
  assert.ok(shopPrice(big, 'gold') > 10 * shopPrice(fresh(1), 'gold') / 2);
  // (the same save and the same purchase give the same chest: the gear comes from a side stream of the seed and the count)
  const a = fresh(21);
  const b = fresh(21);
  a.crowns = b.crowns = 5000;
  assert.deepEqual(buyChest(a, 'silver', DAY), buyChest(b, 'silver', DAY));
});

test('the shop record is read safely, and the day it names decides the stock', () => {
  assert.equal(readShop(undefined), undefined);
  assert.equal(readShop({ day: 'x', sold: {} }), undefined);
  assert.deepEqual(readShop({ day: DAY, sold: { bronze: 9, silver: -2, gold: 'x' } }), { day: DAY, sold: { bronze: 3 } });
});

test('an old save keeps its crowns, pity and heroes, and is given stones once', () => {
  const s = store();
  const old = startedMeta(31);
  old.crowns = 4321;
  old.pulls = 57;
  old.unlockDry = 4;
  old.unlock = { paladin: 1 };
  delete old.stones;
  saveMeta(old, s);
  assert.equal(JSON.parse(s.data['legends.meta']).stones, undefined, 'the save has no stones field');
  const back = loadMeta(1, s);
  assert.equal(back.stones, STONES_GIFT);
  assert.equal(back.stoneGift, STONES_GIFT, 'the page says so once');
  assert.equal(back.crowns, 4321, 'unspent pull crowns stay crowns');
  assert.equal(back.pulls, 57);
  assert.equal(back.unlockDry, 4, 'the pity counter carries on with stones');
  assert.equal(back.unlock?.paladin, 1);
  assert.deepEqual(back.unlocked, old.unlocked);
  // (saved again, it is not given again; the page's one-time note is gone once taken)
  delete back.stoneGift;
  saveMeta(back, s);
  const again = loadMeta(1, s);
  assert.equal(again.stones, STONES_GIFT);
  assert.equal(again.stoneGift, undefined);
  // (a save still waiting for its starter pick has none, and a new save starts with none)
  const waiting = newMeta(3);
  delete waiting.stones;
  saveMeta(waiting, s);
  assert.equal(loadMeta(1, s).stones, 0);
  assert.equal(newMeta(4).stones, 0);
  // (the pity still works with stones: the dry counter goes up on a stone that gives no unlock shard)
  const m = fresh(40);
  m.stones = 5;
  const dry = m.unlockDry ?? 0;
  useStones(m, 1, { lucky: false });
  assert.ok(m.unlockDry === 0 || m.unlockDry === dry + 1);
});

test('the pace holds its shape: stones a day from the shop and the chests are bounded, and the first heroes come at once', () => {
  // (the unlock-pace tool plays the whole year; these are the numbers it rests on: see docs/notes/summon-stones.md)
  const shopMax = SHOP.reduce((n, c) => n + c.stock * c.stones, 0);
  assert.equal(shopMax, 22, 'the shop sells at most 22 stones a day');
  assert.ok(DAILY_CHEST_STONES + 2 <= 4);
  // (a first day: the first clear's bronze chest, the daily chest and a bronze chest from the shop is about nine stones, five heroes)
  let five = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const m = fresh(seed);
    m.stones = CHEST_STONES[3] + DAILY_CHEST_STONES + 1 + shopChest('bronze').stones * 2;
    while (useStones(m, 1, { lucky: false })) if (m.unlocked.length >= 5) break;
    if (ownedCount(m) >= 5) five++;
  }
  assert.ok(five >= 30, `${five} of 40`);
  assert.ok(needOf(fresh(1)) <= 3);
  void ALL_HEROES;
});
