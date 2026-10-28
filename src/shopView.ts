// The chest shop (#shop): crowns buy chests, and chests hold summoning stones and equipment. A card for each chest with what it holds,
// what is left of today's stock and the price; a tap on Buy pays and plays the usual chest opening (`showChest`). The rules are in
// `src/sim/chestShop.ts`; this only reads and changes the meta through them.

import { chestPicture, showChest } from './chestStash';
import { ICONS, icon } from './menuArt';
import { todayKey } from './modes';
import { buyChest, canBuy, shopPrice, SHOP, stockLeft, type ShopChest } from './sim/chestShop';
import { saveMeta, stonesOf, type Meta } from './sim/meta';
import { LUCKY_ODDS } from './sim/unlockRules';
import { play } from './render/sound';

const CSS = `
.shopView { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; gap: 10px; padding: calc(env(safe-area-inset-top) + 10px) 12px calc(env(safe-area-inset-bottom) + 10px); background: #06110d; color: #e8e5d4; overflow: hidden auto; overscroll-behavior: contain; }
.shopView[hidden] { display: none; }
.shopHead { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid #aa8745; }
.shopHead h2 { margin: 0; font: 400 24px var(--display); color: #ffe0a1; }
.shopPurse { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font: 400 12px var(--body); color: #f4d69a; }
.shopPurse span { display: flex; align-items: center; gap: 4px; }
.shopPurse img { width: 18px; height: 18px; image-rendering: pixelated; }
.shopNote { margin: 0; font: 400 12px/1.4 var(--body); color: #c3cec5; }
.shopList { display: flex; flex-direction: column; gap: 10px; }
.shopCard { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: center; padding: 10px; background: linear-gradient(#10251edb, #0a1816); border: 1px solid #8e733e; border-radius: 2px; }
.shopCard.gold { border-color: #d4ad5f; }
.shopCard h3 { margin: 0; font: 400 24px var(--display); color: #ffe0a1; }
.shopCard p { margin: 2px 0 0; font: 400 12px/1.4 var(--body); color: #d9e4d8; }
.shopCard .shopLeft { color: #bfa978; }
.shopBuy { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 6px; min-height: 48px; font: 400 24px var(--display); color: #ffe3a2; border: 2px solid #d0a452; border-radius: 3px; background: linear-gradient(135deg, #286846, #103e30); }
.shopBuy img { width: 24px; height: 24px; image-rendering: pixelated; }
.shopBuy:disabled { filter: saturate(.35); color: #b5b6a6; opacity: .72; }
.shopBuy small { font: 400 12px var(--body); }
.shopClose { min-height: 48px; font: 400 24px var(--display); color: #ffe3a2; border: 2px solid #d4ad5f; border-radius: 2px; background: linear-gradient(110deg, #17452f, #326648 50%, #17452f); }
`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const GEAR_LINE: Record<ShopChest['kind'], string> = {
  bronze: 'A 1 in 3 chance of a bronze piece of gear',
  silver: 'A piece of silver-grade gear',
  gold: 'A piece of gold-grade gear, a few levels higher',
};

/** Open the chest shop over the page. `onChange` runs after every sale (and when the shop is closed), so the page behind can redraw its crowns and stones. */
export function openShop(m: Meta, onChange: () => void): void {
  if (!document.getElementById('shopStyle')) {
    const st = el('style');
    st.id = 'shopStyle';
    st.textContent = CSS;
    document.head.append(st);
  }
  document.getElementById('shop')?.remove();
  const root = el('div', 'shopView');
  root.id = 'shop';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Chest shop');
  const draw = (): void => {
    const day = todayKey();
    const head = el('div', 'shopHead');
    head.append(el('h2', '', 'Chest Shop'));
    const purse = el('div', 'shopPurse');
    const crowns = el('span');
    crowns.append(icon(ICONS.crowns, ''), `${m.crowns} crowns`);
    const stones = el('span');
    stones.append(icon(ICONS.stones, ''), `${stonesOf(m)} stones`);
    purse.append(crowns, stones);
    head.append(purse);
    const note = el('p', 'shopNote', `Chests hold summoning stones and gear. Using a stone gives one hero shard, and 1 in ${LUCKY_ODDS} brings a whole new hero. The shop restocks each day, and prices rise with the heroes you own.`);
    const list = el('div', 'shopList');
    for (const c of SHOP) {
      const left = stockLeft(m, c.kind, day);
      const price = shopPrice(m, c.kind);
      const card = el('div', `shopCard ${c.kind}`);
      card.append(chestPicture(c.kind, 2).root);
      const text = el('div');
      text.append(el('h3', '', c.name), el('p', '', `${c.stones} summoning stones`), el('p', '', GEAR_LINE[c.kind]), el('p', 'shopLeft', `${left} of ${c.stock} left today`));
      card.append(text);
      const buy = el('button', 'shopBuy');
      buy.append(icon(ICONS.crowns, ''), `${price}`);
      if (left === 0) buy.append(el('small', '', ' · sold out today'));
      else if (m.crowns < price) buy.append(el('small', '', ` · need ${price - m.crowns} more`));
      buy.disabled = !canBuy(m, c.kind, day);
      buy.addEventListener('click', () => {
        const loot = buyChest(m, c.kind, day);
        if (!loot) return;
        saveMeta(m);
        play('summon');
        onChange();
        draw();
        showChest(loot, () => onChange());
      });
      card.append(buy);
      list.append(card);
    }
    const close = el('button', 'shopClose', 'Back');
    close.addEventListener('click', () => {
      root.remove();
      onChange();
    });
    root.replaceChildren(head, note, list, close);
  };
  draw();
  document.body.append(root);
}
