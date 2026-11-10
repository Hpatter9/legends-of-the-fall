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
  | { kind: 'solid'; name: string; rect: Rect; wall?: boolean; burns?: boolean; sprite?: string; scale?: number; level?: boolean }
  /** A ground laid on a rectangle (the forge's coals, the shrine, the reeds). */
  | { kind: 'ground'; rect: Rect; ground: 'coals' | 'shrine' | 'tall' | 'water' }
  /** A rectangle at a height (the training pit sunk a step, the shrine's knoll). */
  | { kind: 'height'; rect: Rect; h: number }
  /** Flagstones (looks only): the roads. */
  | { kind: 'paved'; rect: Rect }
  /** A winding camp path; also kept clear of random tents and boulders. */
  | { kind: 'trail'; way: Spot[] }
  /** Small floor-level belongings, baked below fighters; never an invisible obstacle. */
  | { kind: 'dressing'; at: Spot; sprite: string; scale?: number; flip?: boolean }
  /** A ring of fence (looks only): the pens. */
  | { kind: 'fence'; rect: Rect }
  /** Walls of a barricade (solid, not breakable), with gaps left open; `look: 'maze'` draws them as a maze's walls (the Heart of the Maze). */
  | { kind: 'barricade'; tiles: Spot[]; look?: 'maze' }
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

/** A broad authored landform, added to the background relief before paths and fortifications. Heights are absolute tile levels. */
export interface Landform {
  name: string;
  kind: 'hill' | 'hollow';
  at: Spot;
  radius: [number, number];
  height: number;
  surface: 'heath' | 'mud' | 'grass';
  /** Rocky shelves with a broad walking ramp on the positive side of this axis. */
  terrace?: number;
  ramp?: 'u' | 'v';
}

/** The strength of a landform at a tile: a broad rounded crown and sloping shoulders, zero outside its ellipse. */
export function landformWeight(form: Landform, u: number, v: number): number {
  const distance = Math.hypot((u - form.at.u) / form.radius[0], (v - form.at.v) / form.radius[1]);
  return Math.max(0, Math.min(1, (1 - distance) / 0.75));
}

export interface CampDistrict {
  name: string;
  kind: 'forge' | 'living' | 'beasts' | 'supplies' | 'training' | 'refuse';
  at: Spot;
  radius: [number, number];
}

/** The closest camp yard covering a tile, so its ground and belongings tell the same story. */
export function districtAt(bp: Blueprint, u: number, v: number): CampDistrict | undefined {
  let nearest: CampDistrict | undefined;
  let distance = 1;
  for (const yard of bp.districts ?? []) {
    const d = Math.hypot((u - yard.at.u) / yard.radius[0], (v - yard.at.v) / yard.radius[1]);
    if (d < distance) { distance = d; nearest = yard; }
  }
  return nearest;
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
  /** The garrison hunts our shooters first (phase 4, the Howling Den's pack): a post marks the nearest of ours who shoots within its reach,
   *  going round the line to them, and only else the nearest of ours. */
  huntShooters?: boolean;
  /** Defences follow the stencil's contour rather than the original square ring. */
  contour?: boolean;
  /** A natural inner crag, with timber lookouts and dirt paths instead of dressed-stone curtain architecture. */
  wallStyle?: 'ridge';
  summitHeight?: number;
  /** Cosmetic wear and irregular summit edges; fort health is still shown only by its actual damage state. */
  weathered?: boolean;
  wornPaths?: boolean;
  /** Decorative labour and smoke. These sites never add units to the battle. */
  campLife?: readonly { kind: 'smoke' | 'worker'; at: Spot; job?: 'hammer' | 'chop' | 'butcher' | 'sort'; flip?: boolean; lift?: number }[];
  /** Height variation in the fields and camp, before walkable slopes are eased. */
  relief?: { fields: number; camp: number };
  landforms?: readonly Landform[];
  districts?: readonly CampDistrict[];
  /** Hidden structural flaws. Troops must inspect the outside of the containing fort to discover one. */
  weaknesses?: readonly { at: Spot; name: string; hint: string }[];
}
