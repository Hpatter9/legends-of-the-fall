// The art of the land beside an army's road and of its arenas (WORLD-ROAD): trees, crags, bones, palisades, tents and the arenas'
// set pieces, cut from the Calamity map's atlas (`src/art/calmap/atlas.png`, pack art already in the game and credited; `calArt.ts`
// says where each picture sits) and the boards' own boulders and ruined walls.

import { Rectangle, Texture } from 'pixi.js';
import type { Area, PieceKind, Scenery } from '../sim/board';
import { RECTS } from './calArt';
import atlasUrl from '../art/calmap/atlas.png';
import { loadImage } from './loadImage';

let atlas: Texture | null = null;
const cut = new Map<string, Texture>();

export async function loadRoadArt(): Promise<void> {
  if (atlas) return;
  const im = await loadImage(atlasUrl);
  atlas = Texture.from(im);
}

/** A picture of the atlas by its name in `RECTS`. */
export function piece(name: string): Texture | null {
  if (!atlas) return null;
  let t = cut.get(name);
  if (!t) {
    const r = RECTS[name];
    if (!r) return null;
    t = new Texture({ source: atlas.source, frame: new Rectangle(r[0], r[1], r[2], r[3]) });
    cut.set(name, t);
  }
  return t;
}

/** The trees of each kind of land. */
const TREES: Partial<Record<Area, string[]>> = {
  snow: ['t3_0', 't3_1', 't3_0'],
  volcano: ['t2_0', 't2_1'],
  forge: ['t4_0', 't2_1'],
  desert: ['t2_0', 't2_1'],
  graveyard: ['t5_0', 't2_0', 't2_1'],
  dungeon: ['t5_0', 't2_1'],
  crystal: ['t1_1', 'r1_0', 't3_1'],
  shrine: ['t0_0', 't3_1', 't0_0'],
  swamp: ['t5_0', 't0_0', 't3_1'],
  autumn: ['t2_0', 't0_0', 't0_1'],
};
const GREEN = ['t0_0', 't0_1', 't3_1', 't0_0'];
const ROCKS: Partial<Record<Area, string[]>> = {
  snow: ['r3_0', 'r3_1', 'b3_0'],
  volcano: ['r2_0', 'r2_1', 'r3_2'],
  forge: ['r2_0', 'r3_2', 'r2_1'],
  crystal: ['r1_1', 'r3_2', 'r1_0'],
  graveyard: ['r3_2', 'r2_1', 'r5_0'],
  dungeon: ['r3_2', 'r2_1'],
};
const GREY = ['r3_1', 'r3_2', 'r0_0', 'b0_1'];

/** The atlas pictures standing on a tile of scenery (one or two), and how big, by the land and the tile's own number. Null for a kind drawn
 *  otherwise (a ruin and a grave use the boards' ruined walls, water and lava are the tile's own top). */
export function sceneryPictures(kind: Scenery, area: Area, deco: number): { name: string; scale: number; dx: number; dy: number }[] {
  const pick = (list: string[]) => list[deco % list.length];
  const jitter = ((deco >> 3) % 5) - 2;
  switch (kind) {
    case 'wood': {
      const list = TREES[area] ?? GREEN;
      // (a wood is a tree a tile, with a second smaller one now and then, so it reads as a wood and not a row of posts)
      const out = [{ name: pick(list), scale: 0.62 + ((deco >> 2) % 4) * 0.05, dx: jitter * 3, dy: 2 }];
      if (deco % 3 === 0) out.push({ name: list[(deco + 1) % list.length], scale: 0.45, dx: -14 - jitter, dy: -6 });
      if (deco % 5 === 1) out.push({ name: area === 'snow' ? 'b3_0' : 'b0_0', scale: 0.7, dx: 14, dy: 6 });
      return out;
    }
    case 'rocks':
      return [{ name: pick(ROCKS[area] ?? GREY), scale: 0.7, dx: jitter * 2, dy: 4 }];
    case 'crystal':
      return [{ name: pick(['r1_0', 't1_1', 'b5_0']), scale: 0.62, dx: jitter * 2, dy: 2 }];
    case 'bones':
      return [{ name: pick(['b5_1', 'elite_spent', 'b2_0']), scale: 0.62, dx: jitter * 2, dy: 4 }];
    case 'fence':
      return [{ name: 'fight', scale: 0.46, dx: 0, dy: 6 }];
    case 'stones':
      return [{ name: pick(['r5_0', 'b4_1', 'r3_1']), scale: 0.7, dx: 0, dy: 2 }];
    default:
      return [];
  }
}

/** An arena's set piece: its atlas picture and size. */
export const PIECES: Record<PieceKind, { name: string; scale: number }> = {
  warGate: { name: 'l0', scale: 0.9 },
  drum: { name: 'elite', scale: 0.7 },
  tent: { name: 'recruit_c', scale: 0.75 },
  flag: { name: 'recruit_flag', scale: 0.6 },
  mausoleum: { name: 'l2', scale: 0.95 },
  den: { name: 'l3', scale: 0.85 },
  arch: { name: 'l1', scale: 0.9 },
  circle: { name: 'start', scale: 0.8 },
  foundry: { name: 'l4', scale: 0.9 },
  gate: { name: 'l5', scale: 0.85 },
  shrine: { name: 'mystery_spent', scale: 0.9 },
  brazier: { name: 'b2_1', scale: 0.9 },
  lamp: { name: 'b4_1', scale: 0.7 },
  campfire: { name: 'campfire', scale: 0.7 },
  skulls: { name: 'b5_1', scale: 0.8 },
};
