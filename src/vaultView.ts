// The vault's plain-words box (docs/notes/cinematic-reveal-vault.md): on the Treasury's sheet, its numbers (now, the next level, the
// most it holds) and "How the vault works", four lines from `vaultRules.ts`. The first time the sheet is opened the box comes up open
// with a NEW mark; after that it is folded under its heading (a tap opens it). The first visit is remembered on this device only
// (localStorage `legends.vaultSeen`; no store, and it shows open again, which does no harm).

import type { Castle } from './sim/castle';
import { vaultBullets, vaultInfo, vaultLine, vaultNext } from './vaultRules';

const KEY = 'legends.vaultSeen';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Whether this is the first time the vault's sheet is opened here (and remember that it has been). */
function firstVisit(): boolean {
  try {
    if (localStorage.getItem(KEY)) return false;
    localStorage.setItem(KEY, '1');
  } catch {
    /* (no store: treat it as a first visit) */
  }
  return true;
}

/** The vault's numbers and its explainer, for the Treasury's sheet. */
export function vaultBox(c: Castle): HTMLElement {
  const v = vaultInfo(c);
  const wrap = el('div', 'vtWrap');
  wrap.append(el('p', '', vaultLine(v)));
  const nums = el('div', 'vtNums');
  const cell = (big: string, small: string): HTMLElement => {
    const d = el('div');
    d.append(el('b', '', big), el('small', '', small));
    return d;
  };
  nums.append(
    cell(`+${v.gold}`, 'gold a run now'),
    cell(v.nextGold === null ? 'Full' : `+${v.nextGold}`, v.nextCost === null ? 'top level' : `next, ${v.nextCost} crowns`),
    cell(`+${v.topGold}`, `the most, level ${v.max}`),
  );
  wrap.append(nums, el('p', 'hint', vaultNext(v)));
  const box = el('details', 'vtBox');
  const sum = el('summary', '', 'ⓘ How the vault works');
  const first = firstVisit();
  if (first) {
    box.open = true;
    sum.append(el('span', 'vtNew', 'NEW'));
  }
  const list = el('ul');
  for (const b of vaultBullets(v)) list.append(el('li', '', b));
  box.append(sum, list);
  wrap.append(box);
  return wrap;
}
