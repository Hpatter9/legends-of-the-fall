// CAM-SAFE (docs/notes/cam-safe.md): the page's side of the safe rect (`render/safeRectRules.ts`). It keeps the list of the parts that lie
// over the board, reads their boxes as they are drawn now, and tells the page when any of them changes size or shows. A new overlay (a
// duel's bar, say) is registered once with `registerCamCover` and the camera keeps the fight clear of it from then on.

import { CAM_COVERS, safeRect, type Rect } from './render/safeRectRules';

const covers = new Set<string>(CAM_COVERS);
const listeners = new Set<(sel: string) => void>();

/** Add a part of the page that lies over the board (a CSS selector; every match counts). The camera frames the fight clear of it whenever
 *  it shows. */
export function registerCamCover(sel: string): void {
  if (covers.has(sel)) return;
  covers.add(sel);
  for (const f of listeners) f(sel);
}

/** The selectors registered now. */
export const camCovers = (): string[] => [...covers];

/** Be told of each cover registered from now on (the page watches its size too). */
export function onCamCover(f: (sel: string) => void): void {
  listeners.add(f);
}

/** The boxes of the covers that show now, in client px (none hidden, without size or invisible). */
export function coverBoxes(): Rect[] {
  const out: Rect[] = [];
  for (const sel of covers)
    for (const e of document.querySelectorAll<HTMLElement>(sel)) {
      if (e.hidden || e.closest('[hidden]')) continue;
      const r = e.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      out.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    }
  return out;
}

/** The safe rect of a room `view` (client px) as the page is drawn now. */
export const measureSafe = (view: Rect): Rect => safeRect(view, coverBoxes());

/** Every element of the covers now on the page (for a ResizeObserver to watch). */
export function coverElements(): HTMLElement[] {
  return camCovers().flatMap((sel) => [...document.querySelectorAll<HTMLElement>(sel)]);
}
