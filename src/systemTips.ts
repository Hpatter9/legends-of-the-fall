// The one-time tips for the newer systems: each finds its element on the page (nothing when the element is not on show, or
// is locked), and `tips.ts` offers the tip when it is found. Kept apart so the page files carry no tip calls. The finders
// only read the DOM.

import type { TipId } from './tips';

const q = (sel: string): HTMLElement | null => document.querySelector<HTMLElement>(sel);

/** The first button under `sel` (or anywhere) whose text starts with `text`. */
const byText = (sel: string, text: string): HTMLElement | null => [...document.querySelectorAll<HTMLElement>(sel)].find((b) => b.textContent?.trim().startsWith(text)) ?? null;

/** An element is really on show when something other than it, or its parent or child, is not painted over its middle (a page slid away, a card or sheet in front). */
function onShow(e: HTMLElement | null): HTMLElement | null {
  if (!e || (e as HTMLButtonElement).disabled || e.classList.contains('lockedCard')) return null;
  const r = e.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return null;
  const top = document.elementFromPoint(x, y);
  return top && (e.contains(top) || top.contains(e)) ? e : null;
}

/** Where each system's tip points, found afresh each time it is asked. */
export const SYSTEM_FINDERS: Partial<Record<TipId, () => HTMLElement | null>> = {
  calamity: () => onShow(q('#hmCalamity')),
  tower: () => onShow(q('#hmTower')),
  talents: () => onShow(byText('#hmSheet button, #ptSheet button', 'Open talents')),
  castle: () => onShow(q('.bcard .buildBtn')),
  spellbook: () => onShow(q('.lbHead')),
  stash: () => onShow(q('.csStash:not(.empty) button')),
  equipment: () => onShow(byText('.eqAuto button', 'Equip best')),
  recycle: () => (document.body.dataset.phase === 'deploy' && (q('#bench')?.children.length ?? 0) > 1 ? onShow(q('#bench')) : null),
  retry: () => onShow(q('#retry')),
  autoReplay: () => onShow(q('.asAuto')),
};
