// The Assault's map, phase 0 (`docs/notes/assault-0.md`): a placeholder blueprint and the generator that lays a 100 x 100 field from
// it. A blueprint's bones are a ZONE STENCIL, a 50 x 50 grid of characters each covering 2 x 2 tiles and naming the zone (the
// design's section 2.1); the flesh (the relief, the boulders) is drawn from a side stream of a fixed seed. Phase 1 replaces the
// placeholder with Bloodtusk Hold's hand-drawn stencil (`maps/orcs.ts`); the generator stays.
//
// The placeholder is the hold's shape in plain form: our Landing at the south corner (u + v near 198), a river with two fords and
// a bridge, the killing fields, the ditch, bank and palisade (two gates), the outer bailey, a stone wall six steps above it (two
// gates, shut until broken), the inner bailey and the stepped mound at the centre, and the orcs' rear at the north corner.

import { relief, type Board, type Tile } from '../board';
import { mixSeed, Rng } from '../rng';

/** The field's side, in tiles. */
export const FIELD = 100;
/** The stencil's side, in cells of 2 x 2 tiles. */
export const STENCIL = FIELD / 2;
/** The salt of the map's side stream (its flesh: the relief, the boulders). */
export const ASSAULT_SALT = 0xa55a17;

/** The zones a stencil names, by character. */
export const ZONES = {
  L: 'landing',
  K: 'fields',
  R: 'river',
  F: 'ford',
  Y: 'bridge',
  D: 'ditch',
  E: 'bank',
  P: 'palisade',
  G: 'gate',
  B: 'bailey',
  S: 'wall',
  H: 'ironGate',
  I: 'inner',
  M: 'mound',
  N: 'warpath',
} as const;
export type ZoneChar = keyof typeof ZONES;

/** The ground of the land outside the palisade (the fields' base height and how much the relief adds). */
const LAND = 2;
const RELIEF = 4;

/** The placeholder stencil: 50 rows (v) of 50 characters (u). Drawn by rule here; a real hold's is drawn by hand. */
export function placeholderStencil(): string[] {
  const rows: string[] = [];
  for (let cy = 0; cy < STENCIL; cy++) {
    let row = '';
    for (let cx = 0; cx < STENCIL; cx++) row += cellZone(cx, cy);
    rows.push(row);
  }
  return rows;
}

function cellZone(cx: number, cy: number): ZoneChar {
  // (the ring a cell stands on, counted from the middle: 0.5 for the four middle cells, 24.5 at the edge)
  const r = Math.max(Math.abs(cx - 24.5), Math.abs(cy - 24.5));
  // (the gates' lines: across the +u face and the +v face, the two middle cells)
  const eastLine = (cy === 24 || cy === 25) && cx > 24;
  const westLine = (cx === 24 || cx === 25) && cy > 24;
  if (r <= 2.5) return 'M';
  if (r <= 4.5) return 'I';
  if (r === 5.5) return eastLine || westLine ? 'H' : 'S';
  if (r <= 9.5) return 'B';
  if (r <= 12.5) {
    if (eastLine || westLine) return 'G';
    return r === 10.5 ? 'E' : r === 11.5 ? 'P' : 'D';
  }
  const depth = cx + cy;
  const across = cx - cy;
  if (depth >= 90) return 'L';
  if (depth >= 82 && depth <= 84) {
    if (Math.abs(across) <= 1) return 'Y';
    if (Math.abs(across + 12) <= 1 || Math.abs(across - 12) <= 1) return 'F';
    return 'R';
  }
  if (depth < 20) return 'N';
  return 'K';
}

/** A field: the board, each tile's zone (its stencil character's code), and the places the generator marked. */
export interface FieldMap {
  board: Board;
  zone: Uint8Array;
  /** The stone wall's gate tiles, shut until broken (by board index). */
  ironGates: number[][];
}

/** Lay the field from a stencil and a seed: every tile its zone's height band and ground, the land's relief inside the soft zones,
 *  boulders scattered in the fields at their density. The same stencil and seed always lay the same field. */
export function buildField(stencil: readonly string[], seed: number): FieldMap {
  const rng = new Rng(mixSeed(seed, ASSAULT_SALT));
  const w = FIELD;
  const d = FIELD;
  const tiles: Tile[] = new Array(w * d);
  const zone = new Uint8Array(w * d);
  const noise = mixSeed(seed, ASSAULT_SALT, 1);
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      const z = stencil[v >> 1][u >> 1] as ZoneChar;
      zone[v * w + u] = z.charCodeAt(0);
      // (the land's own relief, on a lattice eight tiles apart, so no two neighbours differ by more than a step)
      const n = relief(noise, (u * 3) / 8, (v * 3) / 8);
      const t: Tile = { h: LAND, deco: (mixSeed(noise, u, v) >>> 0) % 1000 };
      switch (z) {
        case 'L': t.h = 1 + Math.floor(n * 1.6); break;
        case 'K': case 'N': t.h = LAND + Math.floor(n * RELIEF); break;
        case 'R': t.h = 0; t.ground = 'deep'; break;
        case 'F': t.h = 0; t.ground = 'water'; break;
        case 'Y': t.h = 0; t.bridge = true; break;
        case 'D': t.h = 0; break;
        case 'E': t.h = LAND + 2; break;
        case 'P': t.h = LAND + 2; t.wall = true; break;
        case 'G': t.h = LAND; t.paved = true; break;
        case 'B': t.h = LAND + Math.floor(n * 1.8); break;
        case 'S': t.h = LAND + 6; t.paved = true; break;
        case 'H': t.h = LAND; t.wall = true; t.paved = true; break;
        case 'I': t.h = LAND; break;
        case 'M': {
          const r = Math.max(Math.abs((u >> 1) - 24.5), Math.abs((v >> 1) - 24.5));
          t.h = LAND + (r <= 0.5 ? 7 : r <= 1.5 ? 5 : 3);
          t.paved = r <= 0.5;
          break;
        }
      }
      tiles[v * w + u] = t;
    }
  const board: Board = { seed, area: 'highlands', w, d, tiles };
  // (the soft land is eased to a walker's single step, against itself and the water; the walls, the ditch and the mound keep their faces)
  easeSoft(board, zone);
  // (the field round the ditch meets it at the land's height, so the ditch is two steps down and the bank two up)
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      const r = Math.max(Math.abs(u - 49.5), Math.abs(v - 49.5));
      if (r > 25 && r < 28 && zone[v * w + u] === 75) tiles[v * w + u].h = LAND;
    }
  easeSoft(board, zone);
  // (the mound's staircase, on its +u face along the gates' line: a step a tile from the top down to the inner bailey)
  for (let v = 48; v <= 51; v++)
    for (let u = 52; u <= 58; u++) {
      const t = tiles[v * w + u];
      t.h = Math.max(LAND, Math.min(LAND + 7, LAND + 7 - (u - 51)));
      t.ramp = true;
    }
  // (a stair up the stone wall's inner face on its -v side, two wide, from the inner bailey to the wall-walk)
  for (let v = 40; v <= 41; v++)
    for (let u = 40; u <= 45; u++) {
      const t = tiles[v * w + u];
      t.h = LAND + 6 - (u - 39);
      t.ramp = true;
    }
  // the flesh: boulders and bushes in the fields and the rear, tall grass in patches
  for (let i = 0; i < w * d; i++) {
    const z = String.fromCharCode(zone[i]);
    const t = tiles[i];
    if (z !== 'K' && z !== 'N') continue;
    const u = i % w;
    const v = (i - u) / w;
    // (keep the field's edges clear by a tile, so the stencil's lines stay walkable)
    if (u < 1 || v < 1 || u > w - 2 || v > d - 2) continue;
    const roll = rng.next();
    if (roll < 0.035) t.rock = true;
    else if (roll < 0.06) t.bush = true;
    else if (roll < 0.09) t.ground = 'tall';
  }
  const ironGates: number[][] = [[], []];
  for (let i = 0; i < w * d; i++) {
    if (zone[i] !== 72) continue;
    const u = i % w;
    ironGates[u > 50 ? 0 : 1].push(i);
  }
  return { board, zone, ironGates };
}

/** The zones whose land rolls (and is eased); the others keep their faces. */
const SOFT = new Set(['L', 'K', 'N', 'B', 'I'].map((c) => c.charCodeAt(0)));
const EASE_TO = new Set(['L', 'K', 'N', 'B', 'I', 'R', 'F', 'Y', 'G'].map((c) => c.charCodeAt(0)));

function easeSoft(b: Board, zone: Uint8Array): void {
  for (let pass = 0; pass < 12; pass++) {
    let moved = false;
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const i = v * b.w + u;
        if (!SOFT.has(zone[i])) continue;
        const a = b.tiles[i];
        for (const [du, dv] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const nu = u + du;
          const nv = v + dv;
          if (nu < 0 || nv < 0 || nu >= b.w || nv >= b.d) continue;
          const j = nv * b.w + nu;
          if (!EASE_TO.has(zone[j])) continue;
          const n = b.tiles[j];
          if (a.h - n.h > 1) {
            a.h = n.h + 1;
            moved = true;
          }
        }
      }
    if (!moved) break;
  }
}
