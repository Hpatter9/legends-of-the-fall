// CAM-SAFE (docs/notes/cam-safe.md): the part of the board the player can really see. The owner: "Make sure when the camera is centered on
// the action in the wave, it takes the on screen bars into account. Or the spells." The canvas is full screen, and parts of the page lie
// over it: the top bar, the fight's spell row (mana, the orbs, the Auto buttons; one row, or two when it wraps), a twist's banner, the
// boss's bar, the combo bar, the synergies, the tactic button's plaque under the row at the right, the War Horn in the bottom-right corner, a duel's bar, and at the bottom the
// bench and its buttons (or the hero rows in a fight). The camera frames and centres the fight in what is left: the safe rect. Pure: no DOM, no Pixi, so the tests
// run it; `camSafe.ts` reads the covers' real boxes from the page.
//
// The rule: start from the room (the canvas), then take each cover away, biggest first. A cover that lies over the room cuts it back from
// one side: from the top (to the cover's bottom), the bottom (to its top), the left or the right, whichever keeps the most room, so a bar
// across the top cuts from the top and a column down the side from that side. A button in a corner cuts from the top or the bottom unless
// a side costs clearly less (`LEVEL`), so the room stays centred across the upright screen. A cut
// that would leave less than `MIN` across or down is not made (the cover is then too big to frame round, as a sheet over the whole
// screen; the room is kept as it was). Then a small margin all round, so the fight never sits right against a bar.

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const SAFE = {
  /** The margin kept clear inside the safe rect, px. */
  MARGIN: 8,
  /** The least room a cut may leave, px across and down. */
  MIN_W: 160,
  MIN_H: 140,
  /** How much more a cut from the top or the bottom is worth than one from a side. */
  LEVEL: 1.15,
};

const area = (r: Rect): number => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
const overlaps = (a: Rect, b: Rect): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/** The room left once `covers` are taken from `view`, with the margin. Covers with no size are skipped. */
export function safeRect(view: Rect, covers: readonly Rect[], o: { margin?: number; minW?: number; minH?: number } = {}): Rect {
  const margin = o.margin ?? SAFE.MARGIN;
  const minW = o.minW ?? SAFE.MIN_W;
  const minH = o.minH ?? SAFE.MIN_H;
  let r: Rect = { ...view };
  const big = covers.filter((c) => c.x1 > c.x0 && c.y1 > c.y0).sort((a, b) => area(b) - area(a));
  for (const c of big) {
    if (!overlaps(r, c)) continue;
    // (a cut from the top or the bottom is worth a little more: on an upright phone the room had best stay centred across, so a button in a
    // corner trims the room's foot rather than a strip down its whole side, unless that costs clearly more)
    const cuts = [
      { r: { ...r, y0: Math.max(r.y0, c.y1) }, k: SAFE.LEVEL },
      { r: { ...r, y1: Math.min(r.y1, c.y0) }, k: SAFE.LEVEL },
      { r: { ...r, x0: Math.max(r.x0, c.x1) }, k: 1 },
      { r: { ...r, x1: Math.min(r.x1, c.x0) }, k: 1 },
    ].filter(({ r: k }) => k.x1 - k.x0 >= minW && k.y1 - k.y0 >= minH);
    if (!cuts.length) continue;
    r = cuts.reduce((best, k) => (area(k.r) * k.k > area(best.r) * best.k ? k : best)).r;
  }
  const m = Math.min(margin, (r.x1 - r.x0 - minW) / 2, (r.y1 - r.y0 - minH) / 2);
  return m > 0 ? { x0: r.x0 + m, y0: r.y0 + m, x1: r.x1 - m, y1: r.y1 - m } : r;
}

/** The parts of the page that lie over the board, by selector (`camSafe.ts` adds those registered later, as a duel's bar). Those not
 *  shown (hidden, display none, no size) are skipped when they are measured. */
export const CAM_COVERS = ['#top', '#twistBanner', '#hudSpells', '#bossBar', '#comboBar', '#synCol', '#tacticBtn', '#panel'] as const;

/** One step of `dt` ms easing each edge of `cur` towards `to` (the safe rect changes as the spell row comes in and the boss's bar shows:
 *  the view glides rather than jumping). */
export function easeRect(cur: Rect, to: Rect, dt: number, ms: number): Rect {
  const k = 1 - Math.exp(-dt / (ms / 3));
  return { x0: cur.x0 + (to.x0 - cur.x0) * k, y0: cur.y0 + (to.y0 - cur.y0) * k, x1: cur.x1 + (to.x1 - cur.x1) * k, y1: cur.y1 + (to.y1 - cur.y1) * k };
}
