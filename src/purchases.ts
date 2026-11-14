// IAP (docs/notes/iap.md): the purchases provider, one interface with two makers. RevenueCat (on Google Play Billing) in the Play build inside
// the app, and a fake store for the tests and the web build behind `?shop=fake`, so the whole flow can be played and photographed without Play.
// No other build has a provider, so no other build can sell anything (`providerFor` in `iapRules.ts`). The provider only talks to the store:
// granting is `iapRules.ts`, saving is the page's.

import { productById, type Txn } from './iapRules';

/** A product as the store sells it here: its id and the local price, as the store words it ("£0.99", "0,99 €"). */
export interface StoreItem {
  id: string;
  price: string;
}

/** What the store knows of this player: the entitlements held for good, and every one-time purchase. */
export interface Customer {
  entitlements: string[];
  txns: Txn[];
}

export type BuyResult = { ok: true; txn: Txn; customer: Customer } | { ok: false; why: 'cancelled' | 'failed'; message?: string };

export interface PurchasesProvider {
  readonly name: 'revenuecat' | 'fake';
  /** Set up (once). Rejects if the store can't be reached or isn't configured. */
  start(): Promise<void>;
  /** The local prices of these products (any the store doesn't know are left out). */
  products(ids: readonly string[]): Promise<StoreItem[]>;
  buy(id: string): Promise<BuyResult>;
  /** Restore purchases: what the store holds for this Google account, entitlements and all. */
  restore(): Promise<Customer>;
  /** What the store holds now (read on each start, to keep the cosmetics in step and pick up a purchase left half done). */
  customer(): Promise<Customer>;
}

/* ---------------------------------------------------------------- the fake store */

/** The fake store's own memory: a stand-in for Google's record of the account, kept in the browser so a reload (or "Start over") can be
 *  restored from, as a real account would be. */
export const FAKE_KEY = 'legends.fakeStore';

interface FakeState {
  txns: Txn[];
  next: number;
}

export interface FakeOptions {
  /** Where its memory is kept (the tests pass their own). */
  store?: Pick<Storage, 'getItem' | 'setItem'>;
  /** The clock (the tests pass their own). */
  now?: () => number;
  /** The next purchase's answer: 'cancelled' or 'failed' once, as a player backing out or a card refused would. */
  next?: 'cancelled' | 'failed';
  /** Delay each answer by this many ms, as a real store would (0 in the tests). */
  delay?: number;
}

/** The fake provider: prices in dollars from the catalogue, every purchase succeeds (unless told otherwise), and non-consumables are
 *  entitlements, as RevenueCat gives them. */
export function fakeProvider(o: FakeOptions = {}): PurchasesProvider & { failNext(why: 'cancelled' | 'failed'): void } {
  const store = o.store ?? localStorage;
  const now = o.now ?? (() => Date.now());
  let next = o.next;
  const wait = <T>(x: T): Promise<T> => (o.delay ? new Promise((r) => setTimeout(() => r(x), o.delay)) : Promise.resolve(x));
  const read = (): FakeState => {
    try {
      const s = JSON.parse(store.getItem(FAKE_KEY) ?? 'null') as FakeState | null;
      if (s && Array.isArray(s.txns)) return { txns: s.txns, next: s.next | 0 };
    } catch {
      /* a fresh store */
    }
    return { txns: [], next: 1 };
  };
  const write = (s: FakeState) => {
    try {
      store.setItem(FAKE_KEY, JSON.stringify(s));
    } catch {
      /* the fake store's memory is a convenience */
    }
  };
  const customer = (s: FakeState): Customer => ({
    txns: s.txns.map((t) => ({ ...t })),
    entitlements: [...new Set(s.txns.flatMap((t) => (productById(t.product)?.consumable === false ? productById(t.product)!.entitlements ?? [] : [])))],
  });
  return {
    name: 'fake',
    start: () => wait(undefined),
    products: (ids) => wait(ids.flatMap((id) => (productById(id) ? [{ id, price: `$${productById(id)!.usd.toFixed(2)}` }] : []))),
    async buy(id) {
      const p = productById(id);
      const why = next;
      next = undefined;
      if (why) return wait({ ok: false as const, why });
      if (!p) return wait({ ok: false as const, why: 'failed' as const, message: 'No such product' });
      const s = read();
      if (!p.consumable && customer(s).entitlements.length && (p.entitlements ?? []).every((e) => customer(s).entitlements.includes(e)))
        return wait({ ok: false as const, why: 'failed' as const, message: 'Already owned' });
      const txn: Txn = { id: `FAKE.${s.next}`, product: id, at: now() };
      s.txns.push(txn);
      s.next++;
      write(s);
      return wait({ ok: true as const, txn, customer: customer(s) });
    },
    restore: () => wait(customer(read())),
    customer: () => wait(customer(read())),
    failNext(why) {
      next = why;
    },
  };
}

/* ---------------------------------------------------------------- RevenueCat (the Play build) */

/** RevenueCat's public Android SDK key, set by the Play build from `REVENUECAT_ANDROID_KEY` (empty everywhere else). */
export const RC_KEY: string = typeof __RC_KEY__ === 'string' ? __RC_KEY__ : '';

type RcModule = typeof import('@revenuecat/purchases-capacitor');
type RcCustomer = Awaited<ReturnType<RcModule['Purchases']['getCustomerInfo']>>['customerInfo'];

const fromRc = (c: RcCustomer): Customer => ({
  entitlements: Object.keys(c.entitlements.active),
  txns: c.nonSubscriptionTransactions.map((t) => ({ id: t.transactionIdentifier, product: t.productIdentifier, at: Date.parse(t.purchaseDate) || 0 })),
});

/** The RevenueCat provider, over Google Play Billing. The plugin is loaded only here, so a build that never makes this provider never runs it. */
export function revenueCatProvider(key = RC_KEY): PurchasesProvider {
  let rc: RcModule | null = null;
  let ready: Promise<void> | null = null;
  const sdk = async (): Promise<RcModule['Purchases']> => {
    await (ready ??= (async () => {
      if (!key) throw new Error('The Shop is not set up in this build');
      // (the plugin is in the Play build alone: in every other build this branch is folded away before bundling, so its code is not there)
      //  (`__STORE__` is the build's define; only the Play app ever calls this, so it is always defined here)
      if (__STORE__ === 'play') rc = await import('@revenuecat/purchases-capacitor');
      else throw new Error('The Shop is only in the Google Play version');
      await rc.Purchases.configure({ apiKey: key });
    })().catch((e) => {
      ready = null;
      throw e;
    }));
    return rc!.Purchases;
  };
  return {
    name: 'revenuecat',
    start: async () => void (await sdk()),
    async products(ids) {
      const P = await sdk();
      const { products } = await P.getProducts({ productIdentifiers: [...ids], type: rc!.PRODUCT_CATEGORY.NON_SUBSCRIPTION });
      return products.map((p) => ({ id: p.identifier, price: p.priceString }));
    },
    async buy(id) {
      const P = await sdk();
      try {
        const { products } = await P.getProducts({ productIdentifiers: [id], type: rc!.PRODUCT_CATEGORY.NON_SUBSCRIPTION });
        if (!products[0]) return { ok: false, why: 'failed', message: 'This item is not on sale just now' };
        const r = await P.purchaseStoreProduct({ product: products[0] });
        const t = r.transaction;
        return { ok: true, txn: { id: t.transactionIdentifier, product: t.productIdentifier, at: Date.parse(t.purchaseDate) || Date.now() }, customer: fromRc(r.customerInfo) };
      } catch (e) {
        const err = e as { code?: string; userCancelled?: boolean | null; message?: string };
        if (err.userCancelled || err.code === rc!.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { ok: false, why: 'cancelled' };
        return { ok: false, why: 'failed', message: err.message };
      }
    },
    restore: async () => fromRc((await (await sdk()).restorePurchases()).customerInfo),
    customer: async () => fromRc((await (await sdk()).getCustomerInfo()).customerInfo),
  };
}
