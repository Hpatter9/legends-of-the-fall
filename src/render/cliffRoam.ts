// Where the party may wander on the Battle Overlook (docs/notes/cliff-roam.md): the flat rock of the cliff's ledge in the foreground,
// from the left edge by the fire to the lip on the right, as a polygon in fractions of the scene (the painted overlook,
// `art/camp/overlook.png`, is stretched over the whole scene, so a fraction of the scene is a fraction of the picture). The step
// picking is here too, plain sums with the random passed in (the camp passes Math.random: the wandering is only drawn and never
// touches a battle), so a test can check every spot and every walk stays on the rock. No Pixi, no DOM.

export type Pt = readonly [number, number];

/** The ledge's flat rock, clockwise from its back left, fitted to the painting: the back edge is the far rim of the rock (behind it the
 *  valley and the enemy camp), the right side follows the cliff's lip round its rock pillars, the front stops above the "Enemy below"
 *  banner and the Daily, and the left side keeps off the war table, the crates and the fire's own picture (a hero walks by the fire,
 *  never through it). */
export const CLIFF: readonly Pt[] = [
  [0.16, 0.64],
  [0.4, 0.63],
  [0.56, 0.635],
  [0.68, 0.65],
  [0.78, 0.675],
  [0.835, 0.705],
  [0.83, 0.75],
  [0.8, 0.775],
  [0.7, 0.8],
  [0.62, 0.82],
  [0.52, 0.83],
  [0.3, 0.835],
  [0.21, 0.83],
  [0.2, 0.79],
  [0.13, 0.75],
  [0.12, 0.7],
];

/** The ledge in scene pixels for a scene `w` x `h`. */
export const cliffIn = (w: number, h: number): Pt[] => CLIFF.map(([x, y]) => [x * w, y * h] as const);

/** The point is inside the polygon (even-odd rule; a point on an edge may count either way). */
export function inside(p: Pt, poly: readonly Pt[]): boolean {
  const [x, y] = p;
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const cross = (o: Pt, a: Pt, b: Pt): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** The two segments cross (touching at an end does not count). */
function crosses(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** A straight walk from `a` to `b` stays on the rock: both ends inside, and it crosses none of the ledge's edges (the ledge is not
 *  convex, so two spots on it can have the drop, or the fire's corner, between them). */
export function walkInside(a: Pt, b: Pt, poly: readonly Pt[]): boolean {
  if (!inside(a, poly) || !inside(b, poly)) return false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) if (crosses(a, b, poly[j], poly[i])) return false;
  return true;
}

/** How a hero picks the next spot (scene pixels). */
export const ROAM = {
  /** The shortest and longest stroll at a time. */
  minStep: 24,
  maxStep: 120,
  /** How close a new spot may come to where another hero stands or is going. */
  apart: 26,
  /** Tries before a hero gives up and stays put for now. */
  tries: 24,
  /** Walking pace, scene pixels a second (an easy amble). */
  speed: 20,
};

/**
 * The next spot for a hero at `from` on the ledge `poly`: a stroll of a comfortable length in any direction, on the rock, reached by
 * a straight walk that never leaves it, and not on top of the others (`others`: where the rest stand or are heading). Null when no
 * such spot turned up in a few tries (the hero idles a while longer and asks again). `rand` gives numbers in [0, 1).
 */
export function pickSpot(from: Pt, poly: readonly Pt[], others: readonly Pt[], rand: () => number): Pt | null {
  for (let t = 0; t < ROAM.tries; t++) {
    const ang = rand() * Math.PI * 2;
    const len = ROAM.minStep + rand() * (ROAM.maxStep - ROAM.minStep);
    // (the ledge is shallow front to back: a stroll goes further across than up and down it)
    const to: Pt = [from[0] + Math.cos(ang) * len, from[1] + Math.sin(ang) * len * 0.45];
    if (!walkInside(from, to, poly)) continue;
    if (others.some((o) => Math.hypot(o[0] - to[0], (o[1] - to[1]) * 1.6) < ROAM.apart)) continue;
    return to;
  }
  return null;
}

/** Brings a point that has fallen off the ledge (a resize, a stale spot) back onto it: towards the ledge's middle until it is on. */
export function onLedge(p: Pt, poly: readonly Pt[]): Pt {
  if (inside(p, poly)) return p;
  const cx = poly.reduce((s, q) => s + q[0], 0) / poly.length;
  const cy = poly.reduce((s, q) => s + q[1], 0) / poly.length;
  for (let k = 1; k <= 20; k++) {
    const q: Pt = [p[0] + (cx - p[0]) * (k / 20), p[1] + (cy - p[1]) * (k / 20)];
    if (inside(q, poly)) return q;
  }
  return [cx, cy];
}
