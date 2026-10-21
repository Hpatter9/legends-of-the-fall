// The backdrop behind the board: parallax layers (back to front) of each area's pack, as plain files so the page stays
// light (`build.mjs` copies them to the web folder), shifted a little by the pan. The highlands keep the Mountain
// Backgrounds m1 set; the others sit in `src/art/areas/<area>/bgN.png`.

import type { Area } from '../sim/board';

const LAYERS: Record<Area, number> = { highlands: 5, forest: 5, snow: 3, desert: 5, volcano: 3, dungeon: 4 };
const file = (area: Area, n: number) => (area === 'highlands' ? `bg${n}.png` : `areas/${area}/bg${n}.png`);

/** The light over the backdrop: a gradient laid on top of the layers. */
const TINT: Record<Area, string> = {
  highlands: 'linear-gradient(rgba(20, 10, 6, 0.1), rgba(20, 10, 6, 0.35))',
  forest: 'linear-gradient(rgba(6, 20, 8, 0.1), rgba(4, 12, 6, 0.4))',
  snow: 'linear-gradient(rgba(200, 225, 255, 0.05), rgba(30, 50, 90, 0.3))',
  desert: 'linear-gradient(rgba(255, 200, 120, 0.08), rgba(90, 40, 10, 0.3))',
  volcano: 'linear-gradient(rgba(60, 0, 0, 0.15), rgba(40, 0, 0, 0.45))',
  dungeon: 'linear-gradient(rgba(10, 8, 24, 0.2), rgba(4, 4, 12, 0.5))',
};

let layers: HTMLElement[] = [];
let shown: Area | null = null;

/** The files of an area's parallax layers, back to front (the menus lay their own copy). */
export const backdropFiles = (area: Area): string[] => Array.from({ length: LAYERS[area] }, (_, i) => file(area, i + 1));

/** Show an area's backdrop (nothing to do when it is already up). */
export function setBackdrop(area: Area): void {
  const sky = document.getElementById('sky');
  if (!sky || shown === area) return;
  shown = area;
  sky.replaceChildren();
  layers = [];
  for (let n = 1; n <= LAYERS[area]; n++) {
    const el = document.createElement('div');
    el.style.backgroundImage = `url(${file(area, n)})`;
    // (the first layer is the sky: stretched over the whole page)
    if (n === 1) el.style.backgroundSize = '100% 100%';
    sky.appendChild(el);
    layers.push(el);
  }
  sky.style.setProperty('--tint', TINT[area]);
}

/** Slide the layers a little the other way from the camera (`fx`, `fy` in about -0.5 to 0.5 across the board). */
export function panBackdrop(fx: number, fy: number): void {
  const last = Math.max(1, layers.length - 1);
  layers.forEach((el, i) => {
    const near = 1 + (i * 4) / last;
    el.style.transform = `translate(${(-fx * near * 14).toFixed(1)}px, ${(-fy * i * (10 * 4) / last).toFixed(1)}px)`;
  });
}
