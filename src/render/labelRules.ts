// Floating text labels that never overlap: a new label is lifted above every label still showing, fading ones included.

export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A label's box: `x` is its middle and `y` its bottom edge, as the text is anchored. */
const boxOf = (b: LabelBox) => ({ l: b.x - b.w / 2, r: b.x + b.w / 2, t: b.y - b.h, b: b.y });

/** How far (px, upward) to lift `box` so that it overlaps none of `shown` (plus `gap` between them). */
export function liftClear(shown: readonly LabelBox[], box: LabelBox, gap = 2): number {
  let lift = 0;
  // (lifting past one label can land on the next, so go again until the spot is clear; each pass lifts past a label for good)
  for (let pass = 0; pass <= shown.length; pass++) {
    const me = boxOf({ ...box, y: box.y - lift });
    const hit = shown.map(boxOf).filter((o) => me.l < o.r && o.l < me.r && me.t < o.b + gap && o.t < me.b + gap);
    if (!hit.length) break;
    lift += Math.max(...hit.map((o) => me.b - o.t + gap));
  }
  return lift;
}
