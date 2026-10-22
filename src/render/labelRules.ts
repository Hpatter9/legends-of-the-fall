// Floating text labels that never overlap: a new label is lifted above every label still showing, fading ones included.

export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A label's box: `x` is its middle and `y` its bottom edge, as the text is anchored. */
const boxOf = (b: LabelBox) => ({ l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y - b.h, b: b.y });

/** How far (px, upward, or downward with `dir` -1) to move `box` so that it overlaps none of `shown` (plus `gap` between them). */
export function liftClear(shown: readonly LabelBox[], box: LabelBox, gap = 2, dir: 1 | -1 = 1): number {
  let lift = 0;
  // (lifting past one label can land on the next, so go again until the spot is clear; each pass lifts past a label for good)
  for (let pass = 0; pass <= shown.length; pass++) {
    const me = boxOf({ ...box, y: box.y - lift * dir });
    const hit = shown.map(boxOf).filter((o) => me.l < o.r && o.l < me.r && me.t < o.b + gap && o.t < me.b + gap);
    if (!hit.length) break;
    lift += Math.max(...hit.map((o) => (dir === 1 ? me.b - o.t : o.b - me.t) + gap));
  }
  return lift;
}

/** Where a label goes: lifted clear of the shown ones, but kept inside `view` (the board's room on the screen): stacked
 *  downward if there is no room above, and its sides pulled in from the screen's edges. */
export function placeLabel(shown: readonly LabelBox[], box: LabelBox, view: { x0: number; x1: number; y0: number; y1: number }): { x: number; y: number } {
  const half = box.w / 2;
  const x = view.x1 - view.x0 <= box.w ? (view.x0 + view.x1) / 2 : Math.min(view.x1 - half, Math.max(view.x0 + half, box.x));
  const at = { ...box, x };
  const up = box.y - liftClear(shown, at);
  if (up - box.h >= view.y0) return { x, y: up };
  const down = box.y + liftClear(shown, at, 2, -1);
  return { x, y: down <= view.y1 ? down : up };
}
