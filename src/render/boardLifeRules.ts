// LIVING-FIELDS, step 4 (docs/notes/living-fields.md): the life of an ordinary battlefield, as plain rules (pure: no Pixi, no DOM;
// `boardLife.ts` draws from them and the tests read them). Looks only: nothing here is read by the fight, and nothing draws from a stream
// of the fight (where things are is a hash of the board's seed and the tile).
//
// - CREATURES by land and weather: birds that peck and take off when a fighter comes near, butterflies over the meadows, frogs in the
//   mire, fireflies by night, fish in the water. They come back when the ground is quiet again.
// - DECALS: a few of the land's own lying about from the start (bones among the graves, cracks in dry ground, straw in the camp), and
//   the marks a fight leaves (scorch where fire landed, rubble where rocks fell), which fade.
// - FALLS: water (or lava) pouring off the board's near edges.
// - LIGHT: shafts through the trees and the temple's roof on a clear day.
// - SMOKE from fires, DUST under walking feet and SPLASHES in the shallows.
// Reduced motion holds it all still (creatures sit, nothing drifts); a battery saver has half the creatures and no shafts, dust or smoke.

import { DEPLOY_ROWS, LAVA_LANDS, standable, type Area, type Board, type HazardKind, type Trap } from '../sim/board';
import type { Weather } from '../sim/weather';
import { hash } from './fieldLooks';

export type Critter = 'bird' | 'butterfly' | 'frog' | 'firefly' | 'fish' | 'rabbit';
export const CRITTERS: readonly Critter[] = ['bird', 'butterfly', 'frog', 'firefly', 'fish', 'rabbit'];

/** How many of each a land has on a clear day on the usual board (fish are a share of its water tiles instead: `FISH_SHARE`). */
export const LAND_LIFE: Record<Area, Partial<Record<Exclude<Critter, 'fish'>, number>>> = {
  highlands: { bird: 2, rabbit: 1, butterfly: 1 },
  forest: { bird: 3, rabbit: 1, butterfly: 1, firefly: 2 },
  snow: { bird: 2, rabbit: 1 },
  desert: { bird: 1 },
  volcano: {},
  dungeon: { firefly: 2 },
  plains: { bird: 2, rabbit: 2, butterfly: 3 },
  autumn: { bird: 3, rabbit: 1 },
  swamp: { frog: 3, firefly: 4, bird: 1 },
  graveyard: { bird: 3, firefly: 2 },
  ruins: { bird: 2 },
  temple: { bird: 2, butterfly: 2, frog: 1 },
  crystal: { firefly: 4 },
  forge: {},
  shrine: { firefly: 5, frog: 1 },
  warcamp: { bird: 2 },
  oasis: { bird: 2, butterfly: 1, frog: 1 },
};
/** The share of a board's water tiles with a fish in them, and the most on a board. */
export const FISH_SHARE = 0.4;
export const FISH_MAX = 5;
/** The most creatures a board ever has (fish apart). */
export const CRITTER_MAX = 10;
/** How near a fighter comes (in tiles, on the screen's grid) before a creature takes fright, and how long the ground must be quiet before it comes back (ms). */
export const SCARE = 1.7;
export const RETURN_MS = 6000;
/** How long a creature takes to be gone once it flees (ms). */
export const FLEE_MS = 900;

/** The creatures a land has in a weather: birds and butterflies keep out of the rain, the snow and the ash; frogs like the rain; fireflies
 *  come out at night (and are about in the mire, the caves and the shrine whatever the hour). A battery saver has half, rounded up. */
export function lifeFor(area: Area, weather: Weather, saver = false): Partial<Record<Exclude<Critter, 'fish'>, number>> {
  const out: Partial<Record<Exclude<Critter, 'fish'>, number>> = {};
  const wet = weather === 'rain';
  const foul = wet || weather === 'snow' || weather === 'ash' || weather === 'embers';
  for (const [k, n] of Object.entries(LAND_LIFE[area]) as [Exclude<Critter, 'fish'>, number][]) {
    let m = n;
    if (k === 'bird') m = foul ? 0 : weather === 'night' ? Math.min(1, n) : weather === 'fog' ? Math.ceil(n / 2) : n;
    else if (k === 'butterfly') m = foul || weather === 'night' || weather === 'fog' ? 0 : n;
    else if (k === 'rabbit') m = foul ? 0 : n;
    else if (k === 'frog') m = wet ? n + 1 : n;
    else if (k === 'firefly') m = weather === 'night' ? n + 2 : weather === 'clear' && area !== 'swamp' && area !== 'crystal' && area !== 'shrine' && area !== 'dungeon' ? 0 : n;
    if (saver) m = Math.ceil(m / 2);
    if (m > 0) out[k] = m;
  }
  let total = 0;
  for (const k of Object.keys(out) as Exclude<Critter, 'fish'>[]) {
    out[k] = Math.max(0, Math.min(out[k]!, CRITTER_MAX - total));
    total += out[k]!;
    if (!out[k]) delete out[k];
  }
  return out;
}

export interface Spot {
  kind: Critter;
  /** Its tile, and where on it (px from the tile's middle). */
  i: number;
  dx: number;
  dy: number;
  /** Which way it faces and flees (-1 left, 1 right), and a number for its own beat. */
  way: number;
  seed: number;
}

/** Where a board's creatures are, by a hash of its seed (the same board, the same creatures): on open ground nobody starts on (the
 *  middle rows and the board's rim), frogs beside water, fish in it. Never on a tile a trap or a strike is on. */
export function critterSpots(b: Board, weather: Weather, saver = false): Spot[] {
  const { w, d } = b;
  const salt = b.seed & 0xffff;
  const out: Spot[] = [];
  const open = (i: number) => {
    const t = b.tiles[i];
    const v = Math.floor(i / w);
    return standable(t) && !t.ground && !t.trap && !t.risk && !t.bridge && !t.scene && v >= DEPLOY_ROWS && v < d - DEPLOY_ROWS;
  };
  const wet = (i: number) => b.tiles[i].ground === 'water' || b.tiles[i].ground === 'deep';
  const nearWater = (i: number) => {
    const u = i % w;
    const v = Math.floor(i / w);
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([du, dv]) => u + du >= 0 && u + du < w && v + dv >= 0 && v + dv < d && wet((v + dv) * w + u + du));
  };
  const used = new Set<number>();
  // (a creature's tile: the open tile with the lowest hash for its kind and number, so they are spread about and stay put from build to build)
  const pick = (kind: Critter, n: number, ok: (i: number) => boolean): number => {
    let best = -1;
    let low = 2;
    for (let i = 0; i < w * d; i++) {
      if (used.has(i) || !ok(i)) continue;
      const h = hash(i % w, Math.floor(i / w), salt + CRITTERS.indexOf(kind) * 31 + n * 7);
      if (h < low) {
        low = h;
        best = i;
      }
    }
    return best;
  };
  const add = (kind: Critter, i: number, n: number) => {
    used.add(i);
    const h = hash(i % w, Math.floor(i / w), salt + n);
    out.push({ kind, i, dx: Math.round((h - 0.5) * 22), dy: Math.round((hash(i, n, salt) - 0.5) * 8), way: h < 0.5 ? -1 : 1, seed: Math.floor(h * 1000) });
  };
  if (!LAVA_LANDS.includes(b.area)) {
    const lakes = b.tiles.flatMap((_, i) => (wet(i) && !b.tiles[i].scene ? [i] : []));
    const fish = Math.min(saver ? Math.ceil(FISH_MAX / 2) : FISH_MAX, Math.round(lakes.length * FISH_SHARE));
    for (let n = 0; n < fish; n++) {
      const i = pick('fish', n, (j) => wet(j) && !b.tiles[j].scene);
      if (i >= 0) add('fish', i, n);
    }
  }
  for (const [kind, count] of Object.entries(lifeFor(b.area, weather, saver)) as [Exclude<Critter, 'fish'>, number][])
    for (let n = 0; n < count; n++) {
      // (a frog sits by the water when there is any)
      let i = kind === 'frog' ? pick(kind, n, (j) => open(j) && nearWater(j)) : -1;
      if (i < 0) i = pick(kind, n, open);
      if (i >= 0) add(kind, i, n);
    }
  return out;
}

/** Whether a creature at (x, y) on the screen takes fright at a fighter at (fx, fy): within `SCARE` tiles on the screen's grid. */
export function scaredBy(x: number, y: number, fx: number, fy: number, tw: number, th: number): boolean {
  const du = (fx - x) / (tw / 2);
  const dv = (fy - y) / (th / 2);
  return du * du + dv * dv < SCARE * SCARE * 2;
}

/** The decals of a hold's sheet (`decals.webp`, 4 x 4, each 128 px: `DECALS` in the atlases). */
export const DECAL_NAMES = ['bloodSpatter', 'bloodSmear', 'bloodPool', 'scorch', 'ashPatch', 'rubble', 'timber', 'ruts', 'bootTracks', 'wolfTracks', 'puddle', 'mudSplash', 'embers', 'bones', 'straw', 'cracks'] as const;
export type DecalName = (typeof DECAL_NAMES)[number];

/** What lies about each land from the start (looks only), and how many on the usual board. */
export const LAND_DECALS: Record<Area, { names: DecalName[]; n: number }> = {
  highlands: { names: ['wolfTracks', 'bootTracks'], n: 2 },
  forest: { names: ['timber', 'wolfTracks'], n: 3 },
  snow: { names: ['wolfTracks', 'bootTracks'], n: 3 },
  desert: { names: ['cracks', 'bones'], n: 3 },
  volcano: { names: ['cracks', 'embers', 'ashPatch'], n: 4 },
  dungeon: { names: ['bones', 'cracks', 'bloodSmear'], n: 4 },
  plains: { names: ['bootTracks', 'ruts'], n: 2 },
  autumn: { names: ['timber', 'wolfTracks'], n: 3 },
  swamp: { names: ['puddle', 'puddle', 'mudSplash'], n: 5 },
  graveyard: { names: ['bones', 'cracks'], n: 4 },
  ruins: { names: ['rubble', 'cracks', 'timber'], n: 5 },
  temple: { names: ['rubble', 'cracks'], n: 3 },
  crystal: { names: ['cracks', 'rubble'], n: 3 },
  forge: { names: ['embers', 'ashPatch', 'cracks'], n: 4 },
  shrine: { names: ['puddle'], n: 2 },
  warcamp: { names: ['straw', 'bootTracks', 'ruts', 'bloodSpatter'], n: 5 },
  oasis: { names: ['bootTracks', 'cracks'], n: 2 },
};

export interface Decal {
  i: number;
  name: DecalName;
  /** Quarter turns, and how strongly it shows. */
  turn: number;
  alpha: number;
}

/** The decals a board has from the start: on plain open tiles, two tiles apart at least, by a hash of the seed. Rain adds puddles. */
export function landDecals(b: Board, weather: Weather): Decal[] {
  const set = LAND_DECALS[b.area];
  const salt = (b.seed & 0xffff) + 77;
  const out: Decal[] = [];
  const names = weather === 'rain' && !LAVA_LANDS.includes(b.area) ? [...set.names, 'puddle' as const, 'puddle' as const] : set.names;
  const n = set.n + (weather === 'rain' ? 2 : 0);
  const scored = b.tiles
    .flatMap((t, i) => (standable(t) && !t.ground && !t.trap && !t.risk && !t.bridge && !t.scene && !t.paved ? [i] : []))
    .map((i) => [hash(i % b.w, Math.floor(i / b.w), salt), i] as const)
    .sort((x, y) => x[0] - y[0]);
  for (const [h, i] of scored) {
    if (out.length >= n) break;
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    if (out.some((o) => Math.abs((o.i % b.w) - u) + Math.abs(Math.floor(o.i / b.w) - v) < 2)) continue;
    out.push({ i, name: names[Math.floor(h * 9973) % names.length], turn: Math.floor(h * 4099) % 4, alpha: 0.75 });
  }
  return out;
}

/** How long a mark a fight leaves stays before it has faded (ms), and the most a board keeps at once. */
export const MARK_MS = 24000;
export const MARKS_MAX = 14;

/** The mark an event of the fight leaves on its tiles, if any: scorch where fire landed, rubble where rocks fell, cracks where the ground
 *  was struck, a puddle where steam burst or ice broke, embers where a brazier fell. */
export function markOf(what: 'boom' | 'slam' | 'zone' | HazardKind | Trap | 'brazier'): DecalName | null {
  switch (what) {
    case 'boom':
    case 'zone':
    case 'flare':
    case 'lightning':
      return 'scorch';
    case 'rockfall':
      return 'rubble';
    case 'slam':
    case 'spikes':
    case 'grasp':
    case 'stampede':
      return 'cracks';
    case 'geyser':
    case 'thin':
      return 'puddle';
    case 'brazier':
      return 'embers';
    default:
      return null;
  }
}

export interface FallSpot {
  u: number;
  v: number;
  /** The way it pours off: over the +u edge (down to the right on the screen) or the +v edge (down to the left). */
  du: number;
  dv: number;
  lava: boolean;
}

/** Where water or lava pours off a plain board's near edges: every tile of it on the last row or the last column (an army's road has
 *  its own, `Board.falls`). */
export function edgeFalls(b: Board): FallSpot[] {
  if (b.falls || b.tiles.some((t) => t.scene)) return [];
  const out: FallSpot[] = [];
  const lavaLand = LAVA_LANDS.includes(b.area);
  for (let v = 0; v < b.d; v++)
    for (let u = 0; u < b.w; u++) {
      const t = b.tiles[v * b.w + u];
      const g = t.ground;
      if (g !== 'water' && g !== 'deep' && g !== 'lava') continue;
      const lava = g === 'lava' || (g === 'deep' && lavaLand);
      if (u === b.w - 1) out.push({ u, v, du: 1, dv: 0, lava });
      if (v === b.d - 1) out.push({ u, v, du: 0, dv: 1, lava });
    }
  return out;
}

/** The lands with shafts of light on a clear day (through leaves, a broken roof, a cave's mouth), and how many. */
export const SHAFTS: Partial<Record<Area, number>> = { forest: 3, autumn: 2, temple: 2, ruins: 2, crystal: 2, dungeon: 1 };
export const shaftsFor = (area: Area, weather: Weather, saver: boolean, calm: boolean): number => (saver || (weather !== 'clear' && weather !== 'leaves') ? 0 : calm ? Math.min(1, SHAFTS[area] ?? 0) : SHAFTS[area] ?? 0);

/** How often a walking fighter's feet raise dust or a splash at most (ms between two, over the whole board), and what a step raises on each ground. */
export const STEP_EVERY = 140;
export function stepPuff(area: Area, ground: string | undefined): { key: 'earth-puff' | 'ice-puff' | 'forest-puff' | 'fire-puff'; scale: number; alpha: number; tint?: number } | null {
  if (ground === 'water') return { key: 'ice-puff', scale: 0.55, alpha: 0.7, tint: 0xbfe4ff };
  if (ground === 'deep' || ground === 'lava') return null;
  if (ground === 'coals') return { key: 'fire-puff', scale: 0.4, alpha: 0.5 };
  if (ground === 'tall') return { key: 'forest-puff', scale: 0.45, alpha: 0.5 };
  if (area === 'snow') return { key: 'ice-puff', scale: 0.4, alpha: 0.45 };
  if (area === 'desert' || area === 'oasis') return { key: 'earth-puff', scale: 0.5, alpha: 0.5, tint: 0xe8d0a0 };
  if (area === 'volcano' || area === 'forge') return { key: 'earth-puff', scale: 0.4, alpha: 0.4, tint: 0x8a8078 };
  return { key: 'earth-puff', scale: 0.4, alpha: 0.32 };
}
/** How often a fire on the board sends up a puff of smoke (ms). */
export const SMOKE_EVERY = 900;
