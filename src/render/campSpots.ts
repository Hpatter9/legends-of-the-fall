// The war camp's plan (the Battle tab): where the gate, wall, tents, fire, props and the five heroes stand, for a scene of
// `w` x `h` scene pixels. A scene pixel is a whole number of device pixels (about one css pixel; see `camp.ts`), so every picture
// is drawn at its own size, nearest neighbour. Plain data and sums (no Pixi, no DOM), so a test can check it. `x` is a piece's
// centre across and `y` its foot line (the bottom of its picture, which is also what the scene sorts by: a bigger `y` is drawn
// later, so nearer).

/** The pictures' sizes in scene pixels (src/art/camp/ from tools/camp/prep.py; the rest are the castle's own). */
export const SIZES: Record<string, [number, number]> = {
  gate: [137, 127],
  tent1: [103, 66],
  tent2: [105, 67],
  standard: [68, 123],
  skins: [64, 52],
  torch: [30, 71],
  dirt_tile: [90, 59],
  sky: [576, 324],
  cloud1: [576, 324],
  cloud2: [576, 324],
  night: [576, 324],
  // the castle's
  wall: [93, 121],
  campfire: [66, 46],
  rack: [86, 84],
  barrels: [33, 44],
  crates: [43, 52],
  cart: [82, 60],
  woodpile: [50, 54],
  hay: [48, 51],
  pine: [41, 88],
  bush: [38, 37],
  rocks: [36, 38],
  grass_tile: [89, 59],
  banner: [25, 79],
  chests: [70, 54],
};

/** The ground's lattice: diamonds 90 across and 52 down, rows half a tile along (the castle's). */
export const TILE_W = 90;
export const TILE_H = 52;
/** The wall's repeat along a run: one cell is 93 across and the next sits 54 lower (the castle's `WALL_STEP`). */
export const WALL_STEP = { dx: 93, dy: 54 };
/** The war table's top: a diamond twice as wide as tall, with the map on it. */
export const TABLE = { w: 56, h: 28 };
/** The notice boards the signposts carry, in scene pixels (the page's Daily and Tower cards sit in them). */
export const BOARD = { w: 92, h: 60, post: 30 };
/** How far up from the page's foot the Battle! button and its Party link cover the scene, in scene pixels (about css pixels). */
export const BUTTON_ZONE = 140;
/** From the fire's foot line up to the centre of the ground diamond it stands on. */
export const FIRE_RISE = 16;

export interface Piece {
  sprite: string;
  x: number;
  y: number;
  /** Mirrored left to right. */
  flip?: boolean;
  /** The line it sorts by when that is not its foot. */
  depth?: number;
}

export interface HeroSpot {
  x: number;
  y: number;
  /** 1 faces right, -1 left (where they look at first; they turn now and then). */
  face: 1 | -1;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Camp {
  w: number;
  h: number;
  /** The centre line. */
  cx: number;
  /** The gate's foot line; the wall cells run from it down and out to both edges. */
  gateY: number;
  wall: Piece[];
  /** Where the fire burns (its foot line). */
  fire: { x: number; y: number };
  props: Piece[];
  /** The five hero spots: the best hero in front and in the middle (index 0), then outwards. */
  heroes: HeroSpot[];
  /** The war table's foot line and centre. */
  table: { x: number; y: number };
  /** The cart on the left; its bed is the chest stash's mount. */
  cart: { x: number; y: number };
  stash: Rect;
  /** The two notice boards on posts (the page's Daily card on the right, the Tower card on the left), each as a box with the post running down from it. */
  boards: { daily: Rect; tower: Rect };
  /** The first row of scene pixels the Battle! button covers. */
  buttonTop: number;
}

/** The camp for a scene of w x h scene pixels (360 to 412 across and 616 to 751 high on the three phones). */
export function campLayout(w: number, h: number): Camp {
  const cx = Math.round(w / 2);
  const buttonTop = h - BUTTON_ZONE;
  const gateY = Math.round(h * 0.27);
  const fireY = Math.round(h * 0.55);
  const fx = cx;
  const hero = (dx: number, dy: number, face: 1 | -1): HeroSpot => ({ x: fx + dx, y: fireY + dy, face });
  const heroes = [hero(0, 50, 1), hero(-56, 36, 1), hero(56, 36, -1), hero(-96, 6, 1), hero(96, 6, -1)];
  const tableY = buttonTop - 38;
  const cartY = buttonTop - 6;
  const wall: Piece[] = [];
  // (the wall runs from the gate down and out to both edges, one cell at a time, each laid a step along and below the last)
  const reach = Math.ceil(cx / WALL_STEP.dx) + 1;
  for (let i = 0; i < reach; i++) {
    const dx = 48 + WALL_STEP.dx / 2 + i * WALL_STEP.dx;
    const dy = i * WALL_STEP.dy;
    wall.push({ sprite: 'wall', x: cx - dx, y: gateY - 10 + dy });
    wall.push({ sprite: 'wall', x: cx + dx, y: gateY - 10 + dy, flip: true });
  }
  const props: Piece[] = [
    { sprite: 'tent1', x: cx - 126, y: fireY + 2 },
    { sprite: 'tent2', x: cx + 128, y: fireY - 6 },
    { sprite: 'standard', x: cx - 64, y: fireY - 50 },
    { sprite: 'rack', x: cx + 62, y: fireY - 38 },
    { sprite: 'torch', x: cx - 58, y: gateY + 14 },
    { sprite: 'torch', x: cx + 58, y: gateY + 14 },
    { sprite: 'woodpile', x: cx + 72, y: fireY + 30 },
    { sprite: 'barrels', x: cx + 146, y: fireY + 46 },
    { sprite: 'crates', x: cx + 128, y: fireY + 52 },
    { sprite: 'hay', x: cx - 142, y: fireY + 34 },
    { sprite: 'skins', x: cx - 70, y: fireY + 86 },
    { sprite: 'pine', x: cx - 176, y: fireY + 120 },
    { sprite: 'pine', x: cx + 178, y: fireY + 128 },
    { sprite: 'bush', x: cx + 40, y: fireY + 126 },
    { sprite: 'rocks', x: cx - 24, y: fireY + 134 },
  ];
  const cart = { x: cx - 98, y: cartY };
  const boardY = gateY - 4;
  return {
    w,
    h,
    cx,
    gateY,
    wall,
    fire: { x: fx, y: fireY },
    props,
    heroes,
    table: { x: cx + 104, y: tableY },
    cart,
    stash: { x: cart.x - 78, y: cart.y - 84, w: 156, h: 66 },
    boards: {
      daily: { x: w - BOARD.w - 8, y: boardY, w: BOARD.w, h: BOARD.h },
      tower: { x: 8, y: boardY, w: BOARD.w, h: BOARD.h },
    },
    buttonTop,
  };
}

/** The ground lattice's cells covering the scene, back to front: each tile's diamond centre. One diamond is centred under the fire. */
export function groundCells(camp: Camp): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const cy = camp.fire.y - FIRE_RISE;
  const first = -Math.ceil((cy + TILE_H) / (TILE_H / 2));
  const last = Math.ceil((camp.h - cy + TILE_H) / (TILE_H / 2));
  const span = Math.ceil((camp.w + TILE_W) / TILE_W);
  for (let m = first; m <= last; m++) {
    const x0 = camp.fire.x + (Math.abs(m) % 2 === 1 ? TILE_W / 2 : 0);
    for (let k = -span; k <= span; k++) {
      const x = x0 + k * TILE_W;
      if (x > -TILE_W && x < camp.w + TILE_W) out.push({ x, y: cy + m * (TILE_H / 2) });
    }
  }
  return out;
}

/** A small fixed hash for stars: the same camp looks the same every time. */
export function hash(a: number, b = 0): number {
  let n = (a * 374761393 + b * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Stars in the sky above the wall, each with its own moment to appear (0 to 1 of the dusk's fall) and twinkle phase. */
export function starsFor(camp: Camp): { x: number; y: number; at: number; big: boolean; phase: number }[] {
  const sky = camp.gateY - 40;
  const n = Math.round((camp.w * sky) / 900);
  return Array.from({ length: n }, (_, i) => ({
    x: Math.floor(hash(i, 1) * camp.w),
    y: 4 + Math.floor(hash(i, 2) * Math.max(10, sky - 4)),
    at: hash(i, 3),
    big: hash(i, 4) > 0.82,
    phase: hash(i, 5) * 6.28,
  }));
}
