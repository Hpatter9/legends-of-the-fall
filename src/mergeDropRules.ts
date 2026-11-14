// EASY-MERGE: which match a dragged hero would merge into if let go now, kept free of Pixi and the DOM so a test can read it.
//
// The owner's ask: "Make it easier to merge heroes when dragging them out. It's too difficult to actually place them." On a phone the
// held hero covers its match, the tiles are small and slanted, and a match on a hill stands higher on the screen than its flat tile, so a
// drop a little off used to land on the tile next to it. Now a match counts when the finger (or the held hero's feet over it) is over its
// body: the box it is drawn in on the screen, padded a little. Everything is in screen px, so it holds at every zoom and height.

/** A box on the screen (client px): left, top, width, height. */
export interface ScreenBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Something a held hero might be let go over: its id, its drawn box, and whether it is a match it could merge into. */
export interface DropBody {
  id: number;
  box: ScreenBox;
  match: boolean;
}

/** How far past a match's drawn body on the board a drop still merges into it (screen px). */
export const BODY_PAD = 18;
/** The same for a card on the bench (the cards sit close together, so the pad is smaller). */
export const CARD_PAD = 10;

/** Whether a point is inside a box grown by `pad` each way. */
export function inBox(b: ScreenBox, px: number, py: number, pad = 0): boolean {
  return px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad;
}

/** How far a point is from a box's centre. */
export function fromCentre(b: ScreenBox, px: number, py: number): number {
  return Math.hypot(px - (b.x + b.w / 2), py - (b.y + b.h / 2));
}

/** The match a held hero merges into if let go with the finger at `points` (the finger, and the held hero's feet drawn over it), or null.
 *  A match counts when one of the points is inside its body padded by `pad`; where two count, the nearest body centre wins. The pad never
 *  takes a drop meant for another body: a point squarely on a body that is not a match (unpadded) does not count for a match's pad, so
 *  dropping onto a neighbour still swaps or places as before. */
export function mergeDropTarget(bodies: readonly DropBody[], points: readonly { x: number; y: number }[], pad = BODY_PAD): number | null {
  let best: number | null = null;
  let near = Infinity;
  for (const m of bodies) {
    if (!m.match) continue;
    for (const p of points) {
      if (!inBox(m.box, p.x, p.y, pad)) continue;
      // (in the pad only, and squarely on another, non-matching body: that drop is the other body's)
      const onOther = !inBox(m.box, p.x, p.y) && bodies.some((o) => !o.match && o.id !== m.id && inBox(o.box, p.x, p.y));
      if (onOther) continue;
      const d = fromCentre(m.box, p.x, p.y);
      if (d < near) {
        near = d;
        best = m.id;
      }
    }
  }
  return best;
}

/** A fielded fighter's drawn body on the screen, from where its feet are drawn (client px), how tall it is drawn and how wide (both in
 *  world px) and the world's scale on the screen. The body stands on its feet, a few px below them for the shadow. */
export function bodyBox(footX: number, footY: number, tall: number, wide: number, scale: number): ScreenBox {
  const w = wide * scale;
  return { x: footX - w / 2, y: footY - tall * scale, w, h: (tall + 6) * scale };
}
