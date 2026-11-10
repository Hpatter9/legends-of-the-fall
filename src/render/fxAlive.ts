// FX-ALIVE (docs/notes/fx-alive.md): how a patch of marked ground lives while it lasts. The owner: "Effects covering heroes are not animated
// and block them too much visually." A patch (an area's warning, a Mythic's diamond, a king's spell, an aura, the land's tell) was a flat tint
// with a fixed rim, the same on every tile, drawn on the heroes' own tiles. Now each tile:
//
// - is mostly see-through: a faint fill, and a bright rim round the patch that carries it (the edge marks the area, not the fill);
// - breathes on its own beat, out of step with its neighbours (`tilePhase`), so the patch shimmers instead of pulsing as one block;
// - carries the element's own animated strip from the pack (its rune), lying on the tile, each tile a few frames apart;
// - dims under a fighter standing in it (`ALIVE.OCCUPIED`), so the hero over it reads;
// - holds still and fainter with reduced motion, and leaves its strips out on the battery saver.
//
// Pure: no Pixi, no DOM. `fx.ts` draws it (`alivePatch`).

export const ALIVE = {
  /** The fill's strength at the top of a tile's breath (it was 0.2 to 0.45 before). */
  FILL: 0.11,
  /** The rim's strength: from `RIM_LOW` to `RIM` through a tile's breath. */
  RIM: 0.95,
  RIM_LOW: 0.5,
  /** The strip's strength (blended additively, so it brightens rather than covers). */
  STRIP: 0.5,
  /** One breath, in ms. */
  BREATH_MS: 1600,
  /** A strip's frame time, in ms. */
  STRIP_MS: 95,
  /** What a tile keeps of its fill and its strip while a fighter stands on it. */
  OCCUPIED: 0.4,
  /** FX-ALIVE-ART: a painted edge's strength, of the rim's (the painted loops are soft, so they are drawn a little over the rim's own), and
   *  what the drawn rim keeps of its own under a painted edge. */
  PAINTED: 1.6,
  PAINTED_RIM: 0.6,
  /** With reduced motion: the patch's share of its strength, held still (mid-breath). */
  CALM: 0.75,
} as const;

/** A tile's own beat, 0 to 1, from where it lies (neighbours differ by about a third of a breath, never by none). */
export const tilePhase = (u: number, v: number): number => (((u * 5 + v * 3) % 8) + 8) % 8 / 8;

/** How far through its breath a tile is at time `t` (ms): 0 to 1, a smooth rise and fall; mid-breath and still with reduced motion. */
export const breath = (t: number, phase: number, calm: boolean): number => (calm ? 0.5 : 0.5 + 0.5 * Math.sin(2 * Math.PI * (t / ALIVE.BREATH_MS + phase)));

export interface TileLook {
  /** The fill's alpha, the rim's, and the strip's. */
  fill: number;
  rim: number;
  strip: number;
}

/** How a tile of a patch looks at time `t` (ms): its fill, rim and strip strengths, before the patch's own fade (`strength`, 0 to 1). The
 *  fill and strip thin under a fighter (`occupied`); the rim stays, so the area's edge always shows. */
export function tileLook(t: number, phase: number, occupied: boolean, calm: boolean, strength = 1): TileLook {
  const k = breath(t, phase, calm);
  const under = occupied ? ALIVE.OCCUPIED : 1;
  const quiet = calm ? ALIVE.CALM : 1;
  return {
    fill: ALIVE.FILL * (0.6 + 0.4 * k) * under * quiet * strength,
    rim: (ALIVE.RIM_LOW + (ALIVE.RIM - ALIVE.RIM_LOW) * k) * quiet * strength,
    strip: ALIVE.STRIP * (0.65 + 0.35 * k) * under * quiet * strength,
  };
}

/** Which frame of an `n`-frame strip a tile shows at time `t` (ms): each tile a few frames on from its neighbours; the first, held, with
 *  reduced motion. */
export const stripFrame = (t: number, phase: number, n: number, calm: boolean): number => (calm || n <= 1 ? 0 : Math.floor(t / ALIVE.STRIP_MS + phase * n) % n);

/** FX-ALIVE-ART: which quarter of a painted tile's frame holds a diamond edge (`[a, b]`, the corners from the top going round to the right,
 *  as `rimEdges` gives them): its column and row, 0 or 1. The painted loops frame their whole diamond, so a patch shows only the quarters on
 *  its outer edges: inside, the frames would meet as a lattice of separate blocks. */
export const edgeQuarter = (edge: readonly [number, number]): [number, number] => [[1, 0], [1, 1], [0, 1], [0, 0]][edge[0]] as [number, number];
