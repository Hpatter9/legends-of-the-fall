// IAP (docs/notes/iap.md): the Shop, a standard ornate sheet reached by the coin medallion beside the trophy on the home screen. Four sections
// (Stones, Crowns, Bundles and Starter, Cosmetics), each item with its picture, contents and the local price the store reports; "Restore
// purchases" in the foot. Only a build with a provider shows it (`providerFor`: the Play app, or the web build with `?shop=fake` under the tools' automation); the web
// page and the GitHub release's app have no Shop at all. Offline, it says it needs a connection; the game itself plays on.
//
// A purchase is granted here, in the page: `grantPurchase` adds to the meta (once per transaction) and the guarded save keeps it at once.
// Nothing here touches a fight.

import stones1 from './art/treasury/shop_stones_1.webp';
import stones2 from './art/treasury/shop_stones_2.webp';
import stones3 from './art/treasury/shop_stones_3.webp';
import stones4 from './art/treasury/shop_stones_4.webp';
import crowns1 from './art/treasury/shop_crowns_1.webp';
import crowns2 from './art/treasury/shop_crowns_2.webp';
import crowns3 from './art/treasury/shop_crowns_3.webp';
import starterArt from './art/treasury/shop_starter.webp';
import recruitArt from './art/treasury/shop_bundle_recruit.webp';
import warlordArt from './art/treasury/shop_bundle_warlord.webp';
import regaliaArt from './art/treasury/costume_regalia.png';
import knightArt from './art/treasury/costume_knight.png';
import lanternArt from './art/treasury/costume_lantern.png';
import emberArt from './art/treasury/ruler_ember.webp';
import starlitArt from './art/treasury/ruler_starlit.webp';
import starfallArt from './art/treasury/starfall_cardback.webp';
import { offerPageTutorials } from './tutorialView';
import { menuChoice, menuFoot, menuNote, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import { saveMeta, type Meta } from './sim/meta';
import { STORE, inApp } from './appUpdate';
import { ICONS, icon } from './menuArt';
import {
  bonusOf,
  contentsOf,
  grantPurchase,
  noteStarter,
  OWNED_KEY,
  ownedFrom,
  PRODUCT_IDS,
  PRODUCTS,
  productOwned,
  providerFor,
  readOwned,
  recoverMissed,
  starterLeft,
  starterState,
  type Grant,
  type Owned,
  type Product,
} from './iapRules';
import { fakeProvider, RC_KEY, revenueCatProvider, type Customer, type PurchasesProvider, type StoreItem } from './purchases';
import { toolsOn } from './toolHooks';

let provider: PurchasesProvider | null | undefined;

/** This build's provider, made once (null: no Shop in this build). */
export function shopProvider(): PurchasesProvider | null {
  if (provider === undefined) {
    // (RELEASE-TRIM: the fake store, `?shop=fake`, where every purchase succeeds, answers only under automation, as the test page's other
    //  flags do: a player's address bar cannot open it, `toolHooks.ts`)
    const which = providerFor(STORE, inApp(), typeof location === 'undefined' || !toolsOn() ? '' : location.search, RC_KEY);
    provider = which === 'revenuecat' ? revenueCatProvider() : which === 'fake' ? fakeProvider({ delay: 250 }) : null;
  }
  return provider;
}
/** Whether this build has a Shop. */
export const shopOn = (): boolean => !!shopProvider();

/** What the store says is owned for good, as last heard (kept on the device apart from the save). */
export function ownedNow(): Owned {
  try {
    return readOwned(localStorage.getItem(OWNED_KEY));
  } catch {
    return { entitlements: [] };
  }
}
function keepOwned(c: Customer): void {
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify(ownedFrom(c.entitlements)));
  } catch {
    /* (a full storage: the store tells us again next time) */
  }
}

const online = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false;

/** At start (a Shop build, online): the store's record is read, the cosmetics kept in step, and a purchase the app closed before granting is
 *  granted now. `changed` is told when the save gained something (the page redraws its top bar). */
export async function startPurchases(m: Meta, changed: () => void): Promise<void> {
  const p = shopProvider();
  if (!p || !online()) return;
  try {
    await p.start();
    const c = await p.customer();
    keepOwned(c);
    const got = recoverMissed(m, c.txns, Date.now());
    if (got.length) {
      saveMeta(m);
      changed();
      showGranted(got, 'A purchase from before has arrived');
    }
  } catch {
    /* (no store just now: the next start tries again) */
  }
}

/** The page's look at the starter pack: its 72 hours begin once the second army is cleared. True if they began now. */
export function lookStarter(m: Meta): boolean {
  if (!shopOn()) return false;
  const began = noteStarter(m, Date.now());
  if (began) saveMeta(m);
  return began;
}
/** The Shop's medallion wears the "new" pip while the starter pack is on offer. */
export const starterOnOffer = (m: Meta): boolean => shopOn() && starterState(m, ownedNow(), Date.now()) === 'open';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The item's picture, from the round-2 art (`art-source/round2/`, cut by `tools/iap/art.py` into `src/art/treasury/`): a pile, a chest, a
 *  costume, a ruler; the starter and the bundles are wide banners behind their card (`bannerOf`). */
const ART: Record<string, string> = {
  shop_stones_1: stones1, shop_stones_2: stones2, shop_stones_3: stones3, shop_stones_4: stones4,
  shop_crowns_1: crowns1, shop_crowns_2: crowns2, shop_crowns_3: crowns3,
  shop_starter: starterArt, shop_bundle_recruit: recruitArt, shop_bundle_warlord: warlordArt,
  costume_regalia: regaliaArt, costume_knight: knightArt, costume_lantern: lanternArt,
  ruler_ember: emberArt, ruler_starlit: starlitArt, starfall_cardback: starfallArt,
};
/** The wide banners: the starter pack and the bundles. */
const bannerOf = (p: Product): string | undefined => (p.kind === 'starter' || p.kind === 'bundle' ? ART[p.art] : undefined);

function pictureOf(p: Product): HTMLElement {
  const box = el('span', `iapPic iap-${p.kind}`);
  const url = ART[p.art];
  if (url) {
    const im = el('img', `iapArt${/^costume_/.test(p.art) ? ' pixel' : ''}`);
    im.src = url;
    im.alt = '';
    im.draggable = false;
    box.append(im);
  } else box.append(icon(p.kind === 'crowns' ? ICONS.crowns : p.kind === 'stones' ? ICONS.stones : ICONS.gold, 'iapIco'));
  return box;
}

/** The card after a purchase (or a recovered one): what was added. */
function showGranted(gs: Grant[], title = 'Thank you'): void {
  const menu = ornateMenu({ id: 'iapDone', eyebrow: 'The Treasury', title, sub: 'added to your keep', asked: true });
  const well = menuWell(menu.body);
  for (const g of gs) {
    const lines = contentsOf(g.product);
    well.append(el('p', '', `${g.product.name}: ${lines.length ? lines.join(', ') : 'yours for good'}`));
  }
  menuFoot(menu, { back: { word: 'close' } });
}

/** Open the Shop over the home screen. `changed` is told after a purchase (the page redraws its top bar). */
export function openTreasury(m: Meta, changed: () => void): OrnateMenu | null {
  const p = shopProvider();
  if (!p) return null;
  lookStarter(m);
  const menu = ornateMenu({ id: 'iapShop', eyebrow: 'The Treasury', title: 'Shop', sub: 'stones, crowns and new looks', kind: 'sheet', asked: true, onClose: () => {
    window.removeEventListener('online', redraw);
    window.removeEventListener('offline', redraw);
  } });
  menu.root.classList.add('iapShop');
  let prices: Map<string, string> | null = null;
  let trouble = '';
  let busy = false;
  let restored = '';

  const priceOf = (id: string): string => prices?.get(id) ?? (trouble ? '—' : '…');

  function item(grid: HTMLElement, pr: Product, extra: (string | [string, 'pay' | 'lock'])[] = [], sold = false): void {
    const owned = productOwned(pr, ownedNow());
    const lines: (string | [string, 'pay' | 'lock'])[] = [...contentsOf(pr), ...(pr.blurb && pr.kind === 'cosmetic' ? [pr.blurb] : [])];
    const bonus = bonusOf(pr);
    if (bonus) lines.push([`+${bonus}% more`, 'pay']);
    lines.push(...extra);
    if (!pr.ready) lines.push(['Coming soon', 'lock']);
    else if (owned || sold) lines.push(['Owned', 'pay']);
    const b = menuChoice(grid, { title: pr.name, lines, disabled: busy || !pr.ready || owned || sold || !prices?.has(pr.id) });
    b.classList.add('iapItem');
    b.dataset.product = pr.id;
    const banner = bannerOf(pr);
    if (banner) {
      // (a whole row: the banner across its top, the words under it)
      b.classList.add('iapWide');
      const im = el('img', 'iapBanner');
      im.src = banner;
      im.alt = '';
      im.draggable = false;
      b.prepend(im);
    } else b.prepend(pictureOf(pr));
    if (pr.ready && !owned && !sold) b.append(el('span', 'iapPrice', priceOf(pr.id)));
    b.addEventListener('click', () => void buy(pr));
  }

  function draw(): void {
    menu.body.replaceChildren();
    if (!online()) {
      menuWell(menu.body).append(el('p', '', 'The Shop needs a connection. Everything else in the game plays offline as ever.'));
      menuFoot(menu, { back: { word: 'back' }, primary: { label: 'Restore purchases', onClick: () => {}, disabled: true } });
      return;
    }
    if (trouble) menuNote(menu.body, trouble);
    if (restored) menuNote(menu.body, restored);
    const o = ownedNow();
    const now = Date.now();
    const stones = menuSection(menu.body, 'Summoning stones', 'each stone is one summon', 2);
    for (const pr of PRODUCTS.filter((x) => x.kind === 'stones')) item(stones, pr);
    const crowns = menuSection(menu.body, 'Crowns', 'for chests, the castle and more', 2);
    for (const pr of PRODUCTS.filter((x) => x.kind === 'crowns')) item(crowns, pr);
    const bundles = menuSection(menu.body, 'Bundles and starter', 'more for less', 2);
    const st = starterState(m, o, now);
    const starter = PRODUCTS.find((x) => x.kind === 'starter')!;
    if (st === 'open') item(bundles, starter, [[starterLeft(m, now), 'pay']]);
    else if (st === 'bought') item(bundles, starter, [], true);
    for (const pr of PRODUCTS.filter((x) => x.kind === 'bundle')) item(bundles, pr);
    if (st === 'waiting') menuNote(bundles.parentElement!, 'A one-time starter pack is offered for 72 hours once you clear your second army.');
    const looks = menuSection(menu.body, 'Cosmetics', 'new looks only: everything you can earn stays free', 2);
    for (const pr of PRODUCTS.filter((x) => x.kind === 'cosmetic')) item(looks, pr);
    menuNote(menu.body, 'Everything here has fixed contents. Summoning odds are on the Odds button in the Summoning Sanctum. The game is whole without buying anything.');
    menuFoot(menu, { back: { word: 'back' }, primary: { label: 'Restore purchases', onClick: () => void restore(), disabled: busy } });
  }
  const redraw = (): void => {
    if (online() && !prices) void load();
    draw();
  };
  window.addEventListener('online', redraw);
  window.addEventListener('offline', redraw);

  async function load(): Promise<void> {
    try {
      await p!.start();
      const items: StoreItem[] = await p!.products(PRODUCT_IDS);
      prices = new Map(items.map((x) => [x.id, x.price]));
      trouble = '';
    } catch (e) {
      trouble = `The Shop could not reach the store just now (${(e as Error).message || 'no answer'}). Try again later.`;
    }
    if (document.getElementById('iapShop')) draw();
  }

  async function buy(pr: Product): Promise<void> {
    if (busy) return;
    busy = true;
    draw();
    const r = await p!.buy(pr.id);
    busy = false;
    if (r.ok) {
      keepOwned(r.customer);
      const g = grantPurchase(m, r.txn, Date.now());
      saveMeta(m);
      changed();
      draw();
      showGranted(g ? [g] : []);
    } else {
      restored = r.why === 'cancelled' ? '' : `The purchase did not go through${r.message ? ` (${r.message})` : ''}. Nothing was charged here.`;
      draw();
    }
  }

  async function restore(): Promise<void> {
    if (busy) return;
    busy = true;
    draw();
    try {
      const c = await p!.restore();
      keepOwned(c);
      const got = recoverMissed(m, c.txns, Date.now());
      if (got.length) {
        saveMeta(m);
        changed();
      }
      restored = c.entitlements.length ? 'Your purchases are restored.' : 'Nothing to restore on this account.';
    } catch {
      restored = 'The store could not be reached to restore purchases. Try again later.';
    }
    busy = false;
    draw();
  }

  draw();
  if (online()) void load();
  // (the Shop's tutorial, the first time it opens: fixed contents, the odds, Restore)
  offerPageTutorials('shop');
  return menu;
}
