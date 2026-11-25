// IAP (docs/notes/iap.md): what the Shop sells and how a purchase reaches the save. Pure rules: no Pixi, no DOM, no store SDK, and
// nothing in the sim's fights. A grant adds stones, crowns or tomes to the meta, as a chest does; the page saves it at once through the
// guarded save. Every transaction is granted once (its id is kept in `Meta.purchases.granted`). Cosmetics are entitlements, kept by the
// store (RevenueCat) and cached on the device under their own key, which "Start over" does not wipe.
//
// The prices are the owner's (suggested USD tiers; the Shop shows the local price the store reports, never these).

import type { Meta } from './sim/meta';
import { clearedCount } from './sim/armies';
import { grantTomes, type TomeCounts } from './sim/tomes';

export type ProductKind = 'stones' | 'crowns' | 'starter' | 'bundle' | 'cosmetic';

export interface Product {
  /** The Play product id (and RevenueCat's): permanent once made in Play Console. */
  id: string;
  kind: ProductKind;
  name: string;
  /** What it gives, granted once per purchase (none for a cosmetic). */
  stones?: number;
  crowns?: number;
  tomes?: TomeCounts;
  /** The RevenueCat entitlements it unlocks (a cosmetic; the starter's "bought" mark). */
  entitlements?: string[];
  /** Consumable: it can be bought again. A non-consumable is sold once per Google account. */
  consumable: boolean;
  /** The suggested price, in US dollars (for the notes and the fake store only). */
  usd: number;
  /** One line of what it is (a cosmetic's look). */
  blurb?: string;
  /** Its picture's name in the art batch (`art-source/round2/<art>.png` on `art/round-2`); the Shop shows a stand-in until it is copied in. */
  art: string;
  /** False while its art is not in the game: shown as "Coming soon", with no Buy. */
  ready: boolean;
}

/** The stone pouch's rate, the base that a pack's bonus is measured against. */
export const BASE_STONES = 9;
export const BASE_STONES_USD = 0.99;
/** The crown purse's rate. */
export const BASE_CROWNS = 6000;
export const BASE_CROWNS_USD = 1.99;

export const PRODUCTS: readonly Product[] = [
  { id: 'stones_pouch', kind: 'stones', name: 'Pouch of stones', stones: 9, consumable: true, usd: 0.99, art: 'shop_stones_1', ready: true },
  { id: 'stones_satchel', kind: 'stones', name: 'Satchel of stones', stones: 50, consumable: true, usd: 4.99, art: 'shop_stones_2', ready: true },
  { id: 'stones_coffer', kind: 'stones', name: 'Coffer of stones', stones: 108, consumable: true, usd: 9.99, art: 'shop_stones_3', ready: true },
  { id: 'stones_hoard', kind: 'stones', name: 'Hoard of stones', stones: 608, consumable: true, usd: 49.99, art: 'shop_stones_4', ready: true },
  { id: 'crowns_purse', kind: 'crowns', name: 'Purse of crowns', crowns: 6000, consumable: true, usd: 1.99, art: 'shop_crowns_1', ready: true },
  { id: 'crowns_chest', kind: 'crowns', name: 'Chest of crowns', crowns: 19000, consumable: true, usd: 4.99, art: 'shop_crowns_2', ready: true },
  { id: 'crowns_vault', kind: 'crowns', name: 'Vault of crowns', crowns: 45000, consumable: true, usd: 9.99, art: 'shop_crowns_3', ready: true },
  { id: 'starter_pack', kind: 'starter', name: 'Starter pack', stones: 100, crowns: 20000, tomes: { large: 2 }, entitlements: ['starter'], consumable: false, usd: 2.99, blurb: 'Once only, for 72 hours', art: 'shop_starter', ready: true },
  { id: 'bundle_recruit', kind: 'bundle', name: 'Recruit’s bundle', stones: 45, crowns: 7500, consumable: true, usd: 4.99, art: 'shop_bundle_recruit', ready: true },
  { id: 'bundle_warlord', kind: 'bundle', name: 'Warlord’s bundle', stones: 210, crowns: 37500, tomes: { large: 4 }, consumable: true, usd: 19.99, art: 'shop_bundle_warlord', ready: true },
  { id: 'look_duchess_regalia', kind: 'cosmetic', name: 'Duchess: Royal Regalia', entitlements: ['duchess_regalia'], consumable: false, usd: 1.99, blurb: 'An ermine cape and a jewelled crown', art: 'costume_regalia', ready: false },
  { id: 'look_duchess_knight', kind: 'cosmetic', name: 'Duchess: Little Knight', entitlements: ['duchess_knight'], consumable: false, usd: 1.99, blurb: 'A plumed steel helm, polished for the charge', art: 'costume_knight', ready: true },
  { id: 'look_duchess_lantern', kind: 'cosmetic', name: 'Duchess: Lantern', entitlements: ['duchess_lantern'], consumable: false, usd: 1.99, blurb: 'A little brass lantern hung from her horns', art: 'costume_lantern', ready: false },
  { id: 'bundle_wardrobe', kind: 'cosmetic', name: 'Duchess: Wardrobe', entitlements: ['duchess_regalia', 'duchess_knight', 'duchess_lantern'], consumable: false, usd: 3.99, blurb: 'All three of her new costumes', art: 'costume_regalia', ready: false },
  { id: 'ruler_ember', kind: 'cosmetic', name: 'Ember Sovereign', entitlements: ['ruler_ember'], consumable: false, usd: 6.99, blurb: 'A new ruler: blackened gold armour and a mantle of embers', art: 'ruler_ember', ready: false },
  { id: 'ruler_starlit', kind: 'cosmetic', name: 'Starlit Empress', entitlements: ['ruler_starlit'], consumable: false, usd: 6.99, blurb: 'A new ruler: night-blue robes sewn with stars', art: 'ruler_starlit', ready: false },
  { id: 'look_starfall', kind: 'cosmetic', name: 'Starfall summons', entitlements: ['starfall_summons'], consumable: false, usd: 3.99, blurb: 'The summoning’s cards and burst in violet and gold', art: 'starfall_cardback', ready: true },
];

export const productById = (id: string): Product | undefined => PRODUCTS.find((p) => p.id === id);
export const PRODUCT_IDS: readonly string[] = PRODUCTS.map((p) => p.id);

/** A pack's bonus over the base rate, as a whole percentage (0 for the base pack itself; undefined for what has no base). */
export function bonusOf(p: Product): number | undefined {
  if (p.kind === 'stones' && p.stones) return Math.round(((p.stones / p.usd) / (BASE_STONES / BASE_STONES_USD) - 1) * 100);
  if (p.kind === 'crowns' && p.crowns) return Math.round(((p.crowns / p.usd) / (BASE_CROWNS / BASE_CROWNS_USD) - 1) * 100);
  return undefined;
}

const n = (x: number): string => x.toLocaleString('en-GB');
/** What a product gives, in words ("100 summoning stones", "20,000 crowns", "2 large XP tomes"). */
export function contentsOf(p: Product): string[] {
  const out: string[] = [];
  if (p.stones) out.push(`${n(p.stones)} summoning stone${p.stones === 1 ? '' : 's'}`);
  if (p.crowns) out.push(`${n(p.crowns)} crowns`);
  for (const [size, k] of Object.entries(p.tomes ?? {})) if (k) out.push(`${k} ${size} XP tome${k === 1 ? '' : 's'}`);
  return out;
}

/* ---------------------------------------------------------------- the save's purchase record */

/** What the save keeps of its purchases: the transactions granted (each once), when this save first met the store (a purchase older than that
 *  is never granted again from the store's history: it belongs to an earlier save or phone), and when the starter pack's 72 hours began. */
export interface PurchaseRecord {
  granted: string[];
  since: number;
  starterFrom?: number;
}

/** The record made sane (or a new one begun at `now`). */
export function readPurchases(raw: unknown, now: number): PurchaseRecord {
  const r = raw as Partial<PurchaseRecord> | null | undefined;
  const granted = Array.isArray(r?.granted) ? [...new Set(r!.granted.filter((x): x is string => typeof x === 'string' && x.length > 0))] : [];
  const since = typeof r?.since === 'number' && r.since > 0 ? r.since : now;
  const out: PurchaseRecord = { granted, since };
  if (typeof r?.starterFrom === 'number' && r.starterFrom > 0) out.starterFrom = r.starterFrom;
  return out;
}

/** The save's purchase record, begun at `now` if it has none (kept on the meta). */
export function purchasesOf(m: Meta, now: number): PurchaseRecord {
  m.purchases = readPurchases(m.purchases, now);
  return m.purchases;
}

/** A transaction as the store reports it. */
export interface Txn {
  id: string;
  product: string;
  /** When it was made (ms). */
  at: number;
}

/** What a grant gave. */
export interface Grant {
  product: Product;
  txn: string;
  stones: number;
  crowns: number;
  tomes: TomeCounts;
}

/** Grant a purchase to the meta: its stones, crowns and tomes, once. Null (nothing given) when the transaction was already granted, or the
 *  product is unknown. A cosmetic gives nothing here (it is an entitlement), but its transaction is still marked. */
export function grantPurchase(m: Meta, t: Txn, now: number): Grant | null {
  const rec = purchasesOf(m, now);
  const p = productById(t.product);
  if (!p || !t.id || rec.granted.includes(t.id)) return null;
  rec.granted.push(t.id);
  const g: Grant = { product: p, txn: t.id, stones: p.stones ?? 0, crowns: p.crowns ?? 0, tomes: { ...(p.tomes ?? {}) } };
  if (g.stones) m.stones = (m.stones ?? 0) + g.stones;
  if (g.crowns) m.crowns += g.crowns;
  grantTomes(m, g.tomes);
  return g;
}

/** A purchase the store has that this save never granted (the app closed between the payment and the grant): granted now, but only those
 *  made since this save first met the store, so a new save or a new phone is never paid again for what an old one had. */
export function recoverMissed(m: Meta, txns: readonly Txn[], now: number): Grant[] {
  const rec = purchasesOf(m, now);
  const out: Grant[] = [];
  for (const t of txns) {
    if (t.at < rec.since || rec.granted.includes(t.id)) continue;
    const g = grantPurchase(m, t, now);
    if (g) out.push(g);
  }
  return out;
}

/* ---------------------------------------------------------------- entitlements (cosmetics), kept apart from the save */

/** The device's cache of what the store says is owned for good. Not one of the save's keys: "Start over" leaves it, and the store restores it on
 *  a new phone. */
export const OWNED_KEY = 'legends.purchases';

export interface Owned {
  entitlements: string[];
}

export function readOwned(raw: string | null): Owned {
  try {
    const o = JSON.parse(raw ?? 'null') as Partial<Owned> | null;
    return { entitlements: Array.isArray(o?.entitlements) ? [...new Set(o!.entitlements.filter((x): x is string => typeof x === 'string'))].sort() : [] };
  } catch {
    return { entitlements: [] };
  }
}

/** COSMETICS: whether the store last said this entitlement is owned on this device (the cache under `OWNED_KEY`); false with no storage
 *  (the tests, a blocked storage). Read when a cosmetic is drawn or listed, so a purchase or a restore shows at once. */
export function entitledHere(entitlement: string): boolean {
  try {
    return readOwned(typeof localStorage === 'undefined' ? null : localStorage.getItem(OWNED_KEY)).entitlements.includes(entitlement);
  } catch {
    return false;
  }
}

/** What the store reports as owned replaces the cache (a refund takes a cosmetic away again). */
export const ownedFrom = (entitlements: readonly string[]): Owned => ({ entitlements: [...new Set(entitlements)].sort() });

/** Whether a product that is sold once is owned (every entitlement it gives is held). */
export const productOwned = (p: Product, o: Owned): boolean => !p.consumable && !!p.entitlements?.length && p.entitlements.every((e) => o.entitlements.includes(e));

/* ---------------------------------------------------------------- the starter pack */

export const STARTER_HOURS = 72;
export const STARTER_MS = STARTER_HOURS * 3600 * 1000;
/** The armies cleared that open the starter pack's window. */
export const STARTER_ARMIES = 2;

/** Start the starter pack's 72 hours once the second army is cleared (the page calls this on each look at the Shop or the camp). True if it began now. */
export function noteStarter(m: Meta, now: number): boolean {
  const rec = purchasesOf(m, now);
  if (rec.starterFrom || clearedCount(m) < STARTER_ARMIES) return false;
  rec.starterFrom = now;
  return true;
}

export type StarterState = 'waiting' | 'open' | 'gone' | 'bought';

/** Where the starter pack stands: not yet offered, on offer, its time gone, or bought (on any phone: the store's entitlement). */
export function starterState(m: Meta, o: Owned, now: number): StarterState {
  if (o.entitlements.includes('starter')) return 'bought';
  const from = m.purchases?.starterFrom;
  if (!from) return 'waiting';
  return now < from + STARTER_MS ? 'open' : 'gone';
}

/** The time left on the starter pack, in words ("71 h left", "45 min left"). */
export function starterLeft(m: Meta, now: number): string {
  const left = Math.max(0, (m.purchases?.starterFrom ?? 0) + STARTER_MS - now);
  const h = Math.floor(left / 3600_000);
  return h >= 1 ? `${h} h left` : `${Math.max(1, Math.ceil(left / 60_000))} min left`;
}

/* ---------------------------------------------------------------- where the Shop shows */

/** Which store provider a build uses, if any: RevenueCat in the Play build inside the app, when the build carries RevenueCat's key, the fake store on the web build with `?shop=fake`
 *  (tests and pictures), and none anywhere else: the web page and the GitHub release's app never offer a purchase. */
export function providerFor(store: string, app: boolean, search: string, key = ''): 'revenuecat' | 'fake' | null {
  // (a Play build made without REVENUECAT_ANDROID_KEY fails safe: no Shop at all, rather than one that cannot reach the store)
  if (store === 'play') return app && key.trim() !== '' ? 'revenuecat' : null;
  if (store === '' && new URLSearchParams(search).get('shop') === 'fake') return 'fake';
  return null;
}
