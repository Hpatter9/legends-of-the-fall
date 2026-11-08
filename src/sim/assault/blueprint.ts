// A hold's blueprint (phase 1, `docs/notes/assault-1.md`; the design's 2.1): its bones, drawn by hand as data, one file an army
// (`maps/<army>.ts`). The flesh (the relief, the scattered boulders and grass) is laid by `fieldMap.ts` from a fixed seed an army, so every
// player storms the same hold and learns it.
//
// - The ZONE STENCIL: 50 rows of 50 characters, each covering 2 x 2 tiles and naming the zone (`HOLD_ZONES`).
// - The STAMPS, in tiles: the set pieces the 2 x 2 cells are too coarse for (the gates, the towers, the stairs, the longhouses, the forge,
//   the drums), laid over the stencil in order.
// - The POSTS: where the garrison stands, each with its roster (section 4).
// - The APPROACHES: the opening plan's three ways over the river, and the Landing's muster places.

/** The zones a hold's stencil names (the placeholder's, `stencil.ts`, and a few more). */
export const HOLD_ZONES = {
  L: 'landing',
  C: 'camp',
  K: 'fields',
  T: 'meadow',
  V: 'village',
  R: 'river',
  F: 'ford',
  Y: 'bridge',
  D: 'ditch',
  E: 'bank',
  P: 'palisade',
  B: 'bailey',
  S: 'wall',
  I: 'inner',
  M: 'mound',
  N: 'warpath',
} as const;
export type HoldZone = keyof typeof HOLD_ZONES;

/** A rectangle of tiles, both ends kept. */
export interface Rect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}
export interface Spot {
  u: number;
  v: number;
}

/** The structures (5.1): what is struck by hand and breaks. */
export type FortKind = 'palisade' | 'sallyPort' | 'southGate' | 'northGate' | 'ironGate' | 'drum';

/** A stamp: one set piece laid over the stencil, in tiles. */
export type Stamp =
  /** A gate of a wall: its tiles stand shut (solid) until broken, and break to floor at `floor`. A causeway crosses the ditch before it. */
  | { kind: 'gate'; fort: Exclude<FortKind, 'palisade' | 'drum'>; name: string; rect: Rect; floor: number; causeway?: Rect; causewayH?: number }
  /** A raised perch (a watchtower, a corner tower, a gate's tower): its tiles at `h`; a ramp down from `ramp`, a step a tile in `dir`, to
   *  the land. */
  | { kind: 'perch'; name: string; rect: Rect; h: number; ramp?: Spot; dir?: [number, number] }
  /** A stair: from `from`, a step a tile in `dir`, from `h0` by `dh` each tile, `n` tiles, `wide` across. */
  | { kind: 'stair'; from: Spot; dir: [number, number]; h0: number; dh: number; n: number; wide?: number }
  /** Solid ground: a longhouse's walls or a log pile (boulders to the rules). `burns`: fire arrows can set it alight (phase 1b). */
  | { kind: 'solid'; name: string; rect: Rect; wall?: boolean; burns?: boolean }
  /** A ground laid on a rectangle (the forge's coals, the shrine, the reeds). */
  | { kind: 'ground'; rect: Rect; ground: 'coals' | 'shrine' | 'tall' | 'water' }
  /** A rectangle at a height (the training pit sunk a step, the shrine's knoll). */
  | { kind: 'height'; rect: Rect; h: number }
  /** Flagstones (looks only): the roads. */
  | { kind: 'paved'; rect: Rect }
  /** A ring of fence (looks only): the pens. */
  | { kind: 'fence'; rect: Rect }
  /** Walls of a barricade (solid, not breakable), with gaps left open. */
  | { kind: 'barricade'; tiles: Spot[] }
  /** A powder barrel. */
  | { kind: 'barrel'; at: Spot }
  /** A war drum (a structure on its tile). */
  | { kind: 'drum'; name: string; at: Spot }
  /** A stake field or the ditch's stakes: the `spikes` hazard on a clock. */
  | { kind: 'stakes'; rect: Rect; period: number; offset: number }
  /** A set piece drawn on a tile (looks only). */
  | { kind: 'piece'; at: Spot; piece: 'warGate' | 'drum' | 'tent' | 'flag' | 'campfire' | 'skulls' | 'brazier' | 'lamp' };

/** A post of the garrison (4.1): its name, its zone's group for the intelligence well, where it stands, and its roster. The roster's
 *  letters: G grunt, A archer, B brute, W war-wolf; L a lieutenant's place, C a captain's, K the lord's (filled from the Council, 4.2). The
 *  leader is the first officer's place, else the first fighter. `loop` walks a patrol's round; `wakes` names when it stirs besides being
 *  approached: on the great horn (the barracks, the sally ports, the wolves). */
export interface PostDef {
  id: string;
  name: string;
  zone: 'fields' | 'palisade' | 'bailey' | 'wall' | 'keep' | 'warpath';
  at: Spot;
  roster: string;
  loop?: Spot[];
  horn?: boolean;
  /** The drum it guards, the gate it mans (for the sally ports' opening and the gate's crew). */
  guards?: string;
}

/** One of the opening plan's ways (3.5): its name and its waypoints from the Landing over the river. */
export interface Approach {
  id: string;
  name: string;
  way: Spot[];
}

export interface Blueprint {
  army: string;
  name: string;
  /** The stencil: 50 rows (v) of 50 characters (u). */
  stencil: readonly string[];
  stamps: readonly Stamp[];
  posts: readonly PostDef[];
  /** Where the reinforcements enter (inside the North Gate), and how many bands of which roster at most. */
  reinforce: { at: Spot; roster: string; bands: number };
  /** The Warpath's reserve camp, where the bands gather and set out (phase 1b): held by ours, or burnt, it sends no more. */
  warpath: Spot;
  /** The siege park at the Landing, where the trebuchet stands (phase 2): one of our camp's tents, drawn as the trebuchet. */
  park: Spot;
  approaches: readonly Approach[];
  /** The rally flag at the Landing, and the five platoons' muster places round it. */
  rally: Spot;
  muster: readonly Spot[];
  /** The throne's yard (the lord's fight) and the North Gate, where the routed run once the lord has fallen. */
  throne: Spot;
  northGate: Spot;
  /** The two land skins (outside the palisade and inside it). */
  lands: { outer: string; inner: string };
}
