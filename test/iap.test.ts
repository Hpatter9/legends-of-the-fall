import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadMeta, newMeta, pickStarter, saveMeta, stonesOf, type Meta } from '../src/sim/meta';
import {
  bonusOf,
  grantPurchase,
  noteStarter,
  OWNED_KEY,
  ownedFrom,
  PRODUCTS,
  productById,
  productOwned,
  providerFor,
  readOwned,
  readPurchases,
  recoverMissed,
  STARTER_MS,
  starterState,
} from '../src/iapRules';
import { fakeProvider, FAKE_KEY } from '../src/purchases';
import { tomesOf } from '../src/sim/tomes';

const T0 = Date.UTC(2026, 10, 14, 12);
const fresh = (seed = 4): Meta => {
  const m = newMeta(seed);
  pickStarter(m, 0);
  return m;
};
const memory = () => {
  const data: Record<string, string> = {};
  return { setItem: (k: string, v: string) => void (data[k] = v), getItem: (k: string) => data[k] ?? null, removeItem: (k: string) => void delete data[k], data };
};
const full = { setItem: () => { throw new DOMException('full', 'QuotaExceededError'); }, getItem: () => null };

test('the products are the owner’s: ids, contents and prices', () => {
  const want: Record<string, [number, number, number]> = {
    stones_pouch: [9, 0, 0.99], stones_satchel: [50, 0, 4.99], stones_coffer: [108, 0, 9.99], stones_hoard: [608, 0, 49.99],
    crowns_purse: [0, 6000, 1.99], crowns_chest: [0, 19000, 4.99], crowns_vault: [0, 45000, 9.99],
    starter_pack: [100, 20000, 2.99], bundle_recruit: [45, 7500, 4.99], bundle_warlord: [210, 37500, 19.99],
  };
  for (const [id, [s, c, usd]] of Object.entries(want)) {
    const p = productById(id)!;
    assert.ok(p, id);
    assert.equal(p.stones ?? 0, s, id);
    assert.equal(p.crowns ?? 0, c, id);
    assert.equal(p.usd, usd, id);
    assert.equal(p.ready, true, id);
  }
  assert.deepEqual(productById('starter_pack')!.tomes, { large: 2 });
  assert.deepEqual(productById('bundle_warlord')!.tomes, { large: 4 });
  for (const [id, usd] of [['look_duchess_regalia', 1.99], ['look_duchess_knight', 1.99], ['look_duchess_lantern', 1.99], ['bundle_wardrobe', 3.99], ['look_starfall', 3.99], ['ruler_ember', 6.99], ['ruler_starlit', 6.99]] as const) {
    const p = productById(id)!;
    assert.equal(p.usd, usd, id);
    assert.equal(p.consumable, false, id);
    // (a cosmetic is "Coming soon" until its art is in the game)
    assert.equal(p.ready, false, id);
    assert.ok(p.entitlements?.length, id);
  }
  // (Play's product ids: lowercase letters, digits, underscores and dots, starting with a letter or digit; each one once)
  for (const p of PRODUCTS) assert.match(p.id, /^[a-z0-9][a-z0-9_.]*$/);
  assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length);
  assert.equal(bonusOf(productById('stones_pouch')!), 0);
  assert.ok(bonusOf(productById('stones_hoard')!)! > bonusOf(productById('stones_coffer')!)!);
});

test('a transaction is granted exactly once', () => {
  const m = fresh();
  const s0 = stonesOf(m);
  const c0 = m.crowns;
  const g = grantPurchase(m, { id: 'GPA.1', product: 'starter_pack', at: T0 }, T0);
  assert.ok(g);
  assert.equal(stonesOf(m), s0 + 100);
  assert.equal(m.crowns, c0 + 20000);
  assert.equal(tomesOf(m, 'large'), 2);
  // (the same transaction again, from a retry or a second look at the store's history: nothing)
  assert.equal(grantPurchase(m, { id: 'GPA.1', product: 'starter_pack', at: T0 }, T0), null);
  assert.equal(recoverMissed(m, [{ id: 'GPA.1', product: 'starter_pack', at: T0 }], T0).length, 0);
  assert.equal(stonesOf(m), s0 + 100);
  assert.deepEqual(m.purchases!.granted, ['GPA.1']);
  // (another purchase of the same pack is a new transaction, and is granted)
  assert.ok(grantPurchase(m, { id: 'GPA.2', product: 'stones_pouch', at: T0 }, T0));
  assert.ok(grantPurchase(m, { id: 'GPA.3', product: 'stones_pouch', at: T0 }, T0));
  assert.equal(stonesOf(m), s0 + 118);
  // (an unknown product, or no id, grants nothing)
  assert.equal(grantPurchase(m, { id: 'GPA.4', product: 'no_such_thing', at: T0 }, T0), null);
  assert.equal(grantPurchase(m, { id: '', product: 'stones_pouch', at: T0 }, T0), null);
});

test('the grant survives a save and a reload, and is not granted again after it', () => {
  const st = memory();
  const m = fresh();
  grantPurchase(m, { id: 'GPA.9', product: 'crowns_chest', at: T0 }, T0);
  assert.ok(saveMeta(m, st));
  const back = loadMeta(1, st);
  assert.equal(back.crowns, m.crowns);
  assert.equal(grantPurchase(back, { id: 'GPA.9', product: 'crowns_chest', at: T0 }, T0), null);
  assert.equal(back.crowns, m.crowns);
});

test('the save-guard path: a full storage refuses the save without a throw, the grant stays in memory, and the next save keeps it', () => {
  const m = fresh();
  const s0 = stonesOf(m);
  grantPurchase(m, { id: 'GPA.20', product: 'stones_satchel', at: T0 }, T0);
  let ok = true;
  assert.doesNotThrow(() => (ok = saveMeta(m, full)));
  assert.equal(ok, false);
  assert.equal(stonesOf(m), s0 + 50);
  const st = memory();
  assert.ok(saveMeta(m, st));
  const back = loadMeta(1, st);
  assert.equal(stonesOf(back), s0 + 50);
  assert.deepEqual(back.purchases!.granted, ['GPA.20']);
});

test('a purchase left half done is recovered, but a new save is never paid again for an old one', () => {
  const m = fresh();
  readPurchases(undefined, T0);
  m.purchases = readPurchases(undefined, T0);
  const s0 = stonesOf(m);
  const txns = [
    { id: 'GPA.old', product: 'stones_coffer', at: T0 - 1000 },
    { id: 'GPA.new', product: 'stones_coffer', at: T0 + 1000 },
  ];
  const got = recoverMissed(m, txns, T0 + 2000);
  assert.deepEqual(got.map((g) => g.txn), ['GPA.new']);
  assert.equal(stonesOf(m), s0 + 108);
  // (again: nothing)
  assert.equal(recoverMissed(m, txns, T0 + 3000).length, 0);
  // (a save that meets the store later than both: nothing at all)
  const n = fresh(8);
  assert.equal(recoverMissed(n, txns, T0 + 5000).length, 0);
  assert.equal(n.purchases!.since, T0 + 5000);
});

test('restore: cosmetics come back from the store on a new save, consumables do not, and the cache is not one of the save’s keys', async () => {
  const st = memory();
  let clock = T0;
  const shop = fakeProvider({ store: st, now: () => clock });
  const m = fresh();
  m.purchases = readPurchases(undefined, clock);
  clock += 1000;
  const a = await shop.buy('stones_pouch');
  const b = await shop.buy('look_starfall');
  assert.ok(a.ok && b.ok);
  if (a.ok) grantPurchase(m, a.txn, clock);
  if (b.ok) grantPurchase(m, b.txn, clock);
  // (a non-consumable is sold once)
  const again = await shop.buy('look_starfall');
  assert.equal(again.ok, false);
  // ("Start over", or a new phone: a fresh save, the store's record kept)
  clock += 60_000;
  const n = fresh(11);
  const c = await shop.restore();
  const owned = ownedFrom(c.entitlements);
  assert.ok(productOwned(productById('look_starfall')!, owned));
  assert.equal(productOwned(productById('look_duchess_regalia')!, owned), false);
  const s0 = stonesOf(n);
  assert.equal(recoverMissed(n, c.txns, clock).length, 0);
  assert.equal(stonesOf(n), s0);
  // (the cache round-trips, and "Start over" does not wipe it)
  assert.deepEqual(readOwned(JSON.stringify(owned)).entitlements, ['starfall_summons']);
  assert.deepEqual(readOwned('not json').entitlements, []);
  const settings = readFileSync('src/settings.ts', 'utf8');
  const keys = settings.match(/export const SAVE_KEYS = \[([^\]]*)\]/)![1];
  assert.ok(keys.includes("'legends.meta'"));
  assert.ok(!keys.includes(OWNED_KEY), 'the purchases cache must survive Start over');
  assert.ok(!keys.includes(FAKE_KEY));
});

test('a cancelled or failed purchase grants nothing', async () => {
  const shop = fakeProvider({ store: memory(), now: () => T0 });
  shop.failNext('cancelled');
  const r = await shop.buy('stones_hoard');
  assert.deepEqual(r, { ok: false, why: 'cancelled' });
  shop.failNext('failed');
  assert.equal((await shop.buy('stones_hoard')).ok, false);
  assert.equal((await shop.customer()).txns.length, 0);
});

test('the starter pack: offered for 72 hours from the second army, once', () => {
  const m = fresh();
  const none = { entitlements: [] };
  assert.equal(noteStarter(m, T0), false);
  assert.equal(starterState(m, none, T0), 'waiting');
  const rec = { waves: 10, best: 10, won: 10, clears: 1, stars: {} };
  m.armies.orcs = { ...rec };
  assert.equal(noteStarter(m, T0), false);
  m.armies.undead = { ...rec };
  assert.equal(noteStarter(m, T0), true);
  assert.equal(noteStarter(m, T0 + 5000), false);
  assert.equal(starterState(m, none, T0 + STARTER_MS - 1), 'open');
  assert.equal(starterState(m, none, T0 + STARTER_MS), 'gone');
  // (bought on any phone: the store's entitlement says so)
  assert.equal(starterState(m, { entitlements: ['starter'] }, T0 + 1), 'bought');
  assert.equal(starterState(fresh(), { entitlements: ['starter'] }, T0), 'bought');
});

test('the Shop is only in the Play app (or the web build with ?shop=fake), never the web page or the GitHub app', () => {
  assert.equal(providerFor('play', true, '', 'goog_key'), 'revenuecat');
  assert.equal(providerFor('play', true, '?shop=fake', 'goog_key'), 'revenuecat');
  // (a Play build made without RevenueCat's key fails safe: no Shop, not one that cannot reach the store)
  assert.equal(providerFor('play', true, ''), null);
  assert.equal(providerFor('play', true, '', '  '), null);
  // (the Play build in a browser, the store's pictures: none)
  assert.equal(providerFor('play', false, '', 'goog_key'), null);
  assert.equal(providerFor('play', false, '?shop=fake'), null);
  // (the web page and the GitHub release's app)
  assert.equal(providerFor('', false, ''), null);
  assert.equal(providerFor('', true, ''), null);
  assert.equal(providerFor('', false, '?shop=real'), null);
  // (tests and pictures)
  assert.equal(providerFor('', false, '?shop=fake'), 'fake');
  // (the page's Shop medallion starts hidden; only a Shop build shows it)
  assert.match(readFileSync('src/index.html', 'utf8'), /<button id="hmShop"[^>]*\bhidden\b/);
});

test('purchases never reach the sim: nothing under src/sim imports the Shop', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
  for (const f of walk('src/sim').filter((f) => f.endsWith('.ts'))) {
    const s = readFileSync(f, 'utf8');
    assert.ok(!/from '\.\.\/(iapRules|purchases|iapView)'|from '\.\/(iapRules|purchases|iapView)'/.test(s), f);
    assert.ok(!/revenuecat/i.test(s), f);
  }
});
