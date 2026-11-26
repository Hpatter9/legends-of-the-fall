// EIDOLON-SMOOTH (docs/notes/eidolon-smooth.md): a ground sheet's picture cut to the tiles' tops as shapes, not through masks. Before,
// each diagonal row of tiles under a sigil or a crack drew the whole picture through a mask of its own (a stencil pass set up and taken
// down for every row, every frame: a call took the board from some 25 draws a frame to some 150). Here each tile's top is a small shape
// of its own with the picture's own part on it, so a row is one plain drawing with no mask, and tiles the picture never reaches are left
// out. Pure: the tests read it; `groundSheet.ts` draws with it.

/** A picture's rectangle on the board, in world px. */
export interface CutBox {
  left: number;
  top: number;
  w: number;
  h: number;
}

/** A convex shape (x, y pairs in order) cut to a rectangle: what is left of it inside (fewer than three corners: nothing). */
export function cutToBox(poly: readonly number[], box: CutBox): number[] {
  const edges: [0 | 1, number, 1 | -1][] = [[0, box.left, 1], [0, box.left + box.w, -1], [1, box.top, 1], [1, box.top + box.h, -1]];
  let pts = [...poly];
  for (const [axis, lim, sign] of edges) {
    const out: number[] = [];
    const inside = (i: number) => (pts[i * 2 + axis] - lim) * sign >= 0;
    const n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = inside(i), b = inside(j);
      if (a) out.push(pts[i * 2], pts[i * 2 + 1]);
      if (a !== b) {
        const k = (lim - pts[i * 2 + axis]) / (pts[j * 2 + axis] - pts[i * 2 + axis]);
        out.push(pts[i * 2] + (pts[j * 2] - pts[i * 2]) * k, pts[i * 2 + 1] + (pts[j * 2 + 1] - pts[i * 2 + 1]) * k);
      }
    }
    pts = out;
    if (pts.length < 6) return [];
  }
  return pts;
}

/** The shapes of one row's tiles under a picture: every tile's top (a diamond `tw` wide and `th` tall about its middle, a pixel over
 *  on each side as the old masks were, so no seam shows between two rows) cut to the picture's rectangle, as corners, where each lies on
 *  the picture (0 to 1 across and down) and triangles. A tile the picture does not reach gives nothing. */
export function rowShapes(tops: readonly { x: number; y: number }[], tw: number, th: number, box: CutBox): { positions: number[]; uvs: number[]; indices: number[] } {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (const t of tops) {
    const cut = cutToBox([t.x, t.y - th / 2 - 1, t.x + tw / 2 + 1, t.y, t.x, t.y + th / 2 + 1, t.x - tw / 2 - 1, t.y], box);
    const n = cut.length / 2;
    if (n < 3) continue;
    const first = positions.length / 2;
    for (let i = 0; i < n; i++) {
      positions.push(cut[i * 2], cut[i * 2 + 1]);
      uvs.push((cut[i * 2] - box.left) / box.w, (cut[i * 2 + 1] - box.top) / box.h);
    }
    for (let i = 1; i < n - 1; i++) indices.push(first, first + i, first + i + 1);
  }
  return { positions, uvs, indices };
}
