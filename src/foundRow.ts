// The run's result card's Found row (RUN-GEAR, docs/notes/run-gear.md): the real pieces the run brought home, each in its grade frame
// (a "+4" chip when there are more), tappable for its line, what a full stash did with the rest, and **Sell the Commons · n** (the
// run's Commons that the stall's bulk sale would take: never the last of a base nor a piece of a set a hero wears).

import { itemIcon } from './equipView';
import { EQUIP_BASES, itemName, sellPrice, type Equipment } from './sim/equipment';
import { pieceText } from './sim/gear';
import type { Meta } from './sim/meta';
import type { FoundHome } from './sim/runGear';
import { bulkCommons, sellPiece } from './sim/stall';
import { heroName } from './sim/heroNames';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** How many pieces the row shows before the "+n" chip. */
const SHOWN = 6;

/** The run's Commons the bulk sale would take (still owned, spare). */
export function foundCommons(meta: Meta, home: FoundHome): Equipment[] {
  const ids = new Set(home.pieces.map((p) => p.id));
  return bulkCommons(meta).filter((x) => ids.has(x.id));
}

/** The Found row, or null when the run found nothing. `day` is today (the Sold today shelf's); `changed` runs after a sale. */
export function foundRow(meta: Meta, home: FoundHome | undefined, day: number, changed: () => void = () => {}): HTMLElement | null {
  if (!home || (!home.pieces.length && !home.cart && !home.sold)) return null;
  const box = el('section', 'rcFound');
  box.setAttribute('aria-label', 'Found');
  box.append(el('h3', '', 'Found'));
  const row = el('div', 'rcFoundRow');
  const line = el('p', 'rcFoundLine', 'Tap a piece to see it. Everything found is kept.');
  const owned = (p: Equipment) => meta.equipment?.find((x) => x.id === p.id);
  const show = (all: boolean) => {
    row.replaceChildren();
    const list = home.pieces.filter(owned);
    for (const p of all ? list : list.slice(0, SHOWN)) {
      const b = el('button', 'rcFoundPiece');
      b.append(itemIcon(owned(p), EQUIP_BASES[p.base].slot, 'small'));
      b.setAttribute('aria-label', itemName(p));
      b.addEventListener('click', () => {
        const who = home.worn[p.id];
        line.textContent = `${itemName(p)}, ${pieceText(p)}${who ? ` · worn by ${heroName(who)}` : ' · in the stash'}`;
      });
      row.append(b);
    }
    if (!all && list.length > SHOWN) {
      const more = el('button', 'rcFoundMore', `+${list.length - SHOWN}`);
      more.addEventListener('click', () => show(true));
      row.append(more);
    }
  };
  show(false);
  box.append(row, line);
  if (home.cart) box.append(el('p', 'rcFoundNote', `Stash full: ${home.cart} piece${home.cart === 1 ? '' : 's'} wait${home.cart === 1 ? 's' : ''} on the cart`));
  if (home.sold) box.append(el('p', 'rcFoundNote', `Stash full: ${home.sold} sold for ${home.soldFor} crowns`));
  if (home.missed) box.append(el('p', 'rcFoundNote', `Auto-replay: ${home.missed} other find${home.missed === 1 ? '' : 's'} left on the field`));
  const commons = foundCommons(meta, home);
  if (commons.length) {
    const pay = commons.reduce((n, p) => n + sellPrice(p), 0);
    const sell = el('button', 'rcFoundSell', `Sell the Commons · ${pay}`);
    sell.addEventListener('click', () => {
      let got = 0;
      for (const p of foundCommons(meta, home)) got += sellPiece(meta, p.id, day);
      sell.disabled = true;
      sell.textContent = `Sold for ${got} crowns`;
      show(false);
      changed();
    });
    box.append(sell);
  }
  return box;
}

/** RUN-GEAR-2: the auto-replay recap's list of finds: each piece in its grade frame (a "+n" chip past `SHOWN`), or null for none. The
 *  pieces are the runs' own (saved ids), so a piece sold or merged since still shows as it was found. */
export function foundList(pieces: readonly Equipment[]): HTMLElement | null {
  if (!pieces.length) return null;
  const box = el('div', 'asumFinds');
  box.setAttribute('aria-label', 'Finds');
  box.append(el('small', '', 'Finds'));
  const row = el('div', 'rcFoundRow');
  const best = [...pieces].sort((a, b) => b.rarity - a.rarity || b.level - a.level);
  for (const p of best.slice(0, SHOWN)) {
    const b = el('span', 'rcFoundPiece');
    b.append(itemIcon(p, EQUIP_BASES[p.base].slot, 'small'));
    b.title = itemName(p);
    row.append(b);
  }
  if (best.length > SHOWN) row.append(el('span', 'rcFoundMore', `+${best.length - SHOWN}`));
  box.append(row);
  return box;
}
