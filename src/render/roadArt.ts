// The art of the land beside an army's road and of its arenas (WORLD-ROAD): walls, fences and standing stones for the arenas' rings,
// trees, crags, ruins, bones, lights and small flowers, all at the boards' own isometric angle. Two atlases: the road's own
// (`src/art/road/atlas.png`, `roadAtlas.ts`, cut from Chronos Settlement's isometric kits by `tools/army-road/prep.py`) and the
// Calamity map's (`src/art/calmap/atlas.png`, `calArt.ts`, cut from the same kits). Also painted here: the frames of running water and
// of a waterfall, and a soft glow for the lights, each made once.

import { Rectangle, Texture } from 'pixi.js';
import type { Area, PieceKind, Scenery } from '../sim/board';
import { RECTS } from './calArt';
import { ROAD_RECTS } from './roadAtlas';
import portalUrl from '../art/calmap-dungeon/arrival-portal.webp';
import calUrl from '../art/calmap/atlas.png';
import roadUrl from '../art/road/atlas.png';
import birdsUrl from '../art/road/birds.png';
import { loadImage } from './loadImage';
import { TH, TW } from './iso';

let cal: Texture | null = null;
let road: Texture | null = null;
let portal: Texture | null = null;
let birds: Texture[][] = [];
const cut = new Map<string, Texture>();

export async function loadRoadArt(): Promise<void> {
  if (cal && road) return;
  const [a, b, c, p] = await Promise.all([loadImage(calUrl), loadImage(roadUrl), loadImage(birdsUrl), loadImage(portalUrl)]);
  portal = Texture.from(p);
  cal = Texture.from(a);
  road = Texture.from(b);
  // (five small birds of DawnLike's, two frames each: a column a bird)
  const bs = Texture.from(c).source;
  birds = [0, 1, 2, 3, 4].map((k) => [0, 1].map((f) => new Texture({ source: bs, frame: new Rectangle(k * 16, f * 16, 16, 16) })));
}

/** A picture by its name: the road's atlas first, then the Calamity map's. */
export function piece(name: string): Texture | null {
  if (name === 'riftPortal') return portal;
  let t = cut.get(name);
  if (t) return t;
  const r = ROAD_RECTS[name] ?? RECTS[name];
  const src = ROAD_RECTS[name] ? road : cal;
  if (!r || !src) return null;
  t = new Texture({ source: src.source, frame: new Rectangle(r[0], r[1], r[2], r[3]) });
  cut.set(name, t);
  return t;
}

/** A picture to stand on a tile: its name, how big, where its foot is (anchor), its offset, whether it is mirrored, and whether it sways
 *  (a tree, a reed) or gives light (a torch, a lantern: `light` is how high above the foot its flame is, in the picture's own px). */
export interface Pic {
  name: string;
  scale: number;
  ax?: number;
  ay?: number;
  dx: number;
  dy: number;
  flip?: boolean;
  sway?: boolean;
  light?: { y: number; colour: number };
}

const TREES: Partial<Record<Area, string[]>> = {
  snow: ['snowyPine', 't3_0', 't3_1'],
  volcano: ['burntTree', 't2_0', 't2_1'],
  forge: ['ironTree', 'burntTree', 't2_1'],
  desert: ['burntTree', 't2_0'],
  graveyard: ['deadOak', 't5_0', 't2_0'],
  dungeon: ['deadOak', 't5_0'],
  crystal: ['t1_1', 'crystals', 't3_1'],
  shrine: ['willow', 'silverBirch', 't0_0'],
  swamp: ['deadOak', 'greatOak', 't3_1'],
  forest: ['greatOak', 'birch', 't0_1', 't0_0'],
  autumn: ['t2_0', 't0_0', 'birch'],
  temple: ['greatOak', 'birch', 't0_0'],
};
const GREEN = ['t0_0', 't0_1', 'birch', 't3_1'];
/** How big each tree is drawn (the road's trees are bigger pictures than the Calamity's). */
const TREE_SCALE: Record<string, number> = { greatOak: 0.36, birch: 0.42, willow: 0.4, silverBirch: 0.4, snowyPine: 0.5, burntTree: 0.5, deadOak: 0.42, ironTree: 0.55 };
const ROCKS: Partial<Record<Area, string[]>> = {
  snow: ['snowRock', 'r3_0', 'r3_1'],
  volcano: ['darkRocks', 'r2_0', 'r2_1'],
  forge: ['darkRocks', 'rubble', 'r2_0'],
  crystal: ['crystals', 'r1_1', 'r3_2'],
  graveyard: ['rubble', 'r3_2', 'r2_1'],
  dungeon: ['rubble', 'r3_2', 'darkRocks'],
};
const GREY = ['r3_1', 'r3_2', 'rubble', 'b0_1'];
/** The small things growing on the ground by land (looks only). */
const FLAIR: Partial<Record<Area, string[]>> = {
  snow: ['pebbles1', 'stump1'],
  volcano: ['pebbles1', 'thorns1'],
  forge: ['pebbles1'],
  desert: ['thorns1', 'pebbles1'],
  graveyard: ['bones2', 'mushrooms2', 'thorns1'],
  dungeon: ['mushrooms1', 'bones3', 'pebbles1'],
  crystal: ['pebbles1', 'mushrooms1'],
  swamp: ['reeds1', 'mushrooms1', 'fern'],
  warcamp: ['bones2', 'pebbles1', 'stump1'],
  shrine: ['flowers2', 'flowers3', 'fern'],
};
const MEADOW = ['flowers1', 'flowers2', 'flowers4', 'fern', 'mushrooms1', 'tallGrass'];
const LIGHTS: Record<string, { y: number; colour: number }> = {
  skullTorch: { y: 64, colour: 0xff9a40 },
  torchPost: { y: 68, colour: 0xff9a40 },
  brazierRed: { y: 56, colour: 0xff4a3a },
  brazier: { y: 82, colour: 0xff9a40 },
  bonfire: { y: 40, colour: 0xffa040 },
  lanternPost: { y: 66, colour: 0x7dffb4 },
  tasselLantern: { y: 50, colour: 0xffb050 },
  lightLantern: { y: 60, colour: 0xffd890 },
  mushroomLantern: { y: 60, colour: 0xffa860 },
  arcLamp: { y: 70, colour: 0xbfe6ff },
  coilStack: { y: 40, colour: 0x7ff0ff },
  campfire: { y: 14, colour: 0xffa040 },
  b2_1: { y: 48, colour: 0xff6a30 },
  b4_1: { y: 64, colour: 0xffc070 },
};
const lit = (name: string) => LIGHTS[name];

/** How a wall run is drawn: its picture and how big (it runs down to the right; mirrored, down to the left). */
function runOf(kind: Scenery, area: Area): { name: string; scale: number } | null {
  switch (kind) {
    case 'fence':
      return { name: 'spikedWall', scale: 0.4 };
    case 'ruin':
      return area === 'graveyard' || area === 'dungeon' ? { name: 'boneWall', scale: 0.34 } : { name: 'stoneWall', scale: 0.32 };
    case 'crystal':
      return { name: 'ironWall', scale: 0.34 };
    case 'bones':
      return { name: 'boneFence', scale: 0.46 };
    default:
      return null;
  }
}

/** The pictures standing on a tile of scenery, by the land and the tile's own number. `ring` is set for an arena's ring, with `across`:
 *  whether its run lies down to the left on the screen (the picture mirrored). `far` is how far it lies from the road. */
export function sceneryPictures(kind: Scenery, area: Area, deco: number, ring = false, across = false, far = 1): Pic[] {
  const pick = (list: string[], k = 0) => list[(deco + k) % list.length];
  const jitter = ((deco >> 3) % 5) - 2;
  if (ring) {
    const run = runOf(kind, area);
    if (run) return [{ ...run, ay: 0.82, dx: 0, dy: 4, flip: across }];
    if (kind === 'stones') {
      // (a standing-stone ring; a shrine court's lanterns)
      if (area === 'shrine') return [{ name: pick(['tasselLantern', 'lightLantern']), scale: 0.62, dx: 0, dy: 4, light: lit(pick(['tasselLantern', 'lightLantern'])) }];
      return [{ name: 'menhir', scale: 0.36, ay: 0.86, dx: 0, dy: 4 }];
    }
    if (kind === 'wood') {
      const list = area === 'shrine' ? ['willow', 'silverBirch'] : ['greatOak', 'birch', 'greatOak'];
      const name = pick(list);
      return [{ name, scale: TREE_SCALE[name] ?? 0.6, ay: 0.9, dx: jitter * 2, dy: 4, sway: true }];
    }
  }
  switch (kind) {
    case 'wood': {
      const list = TREES[area] ?? GREEN;
      const name = pick(list);
      // (a wood is a tree a tile, a second smaller one now and then, and undergrowth, so it reads as a wood and not a row of posts)
      const out: Pic[] = [{ name, scale: (TREE_SCALE[name] ?? 0.62) * (0.9 + ((deco >> 2) % 4) * 0.06), ay: 0.9, dx: jitter * 3, dy: 2, sway: true }];
      if (deco % 3 === 0) {
        const second = pick(list, 1);
        out.push({ name: second, scale: (TREE_SCALE[second] ?? 0.62) * 0.7, ay: 0.9, dx: -14 - jitter, dy: -6, sway: true });
      }
      if (deco % 4 === 1) out.push({ name: area === 'snow' ? 'b3_0' : pick(['shrub1', 'shrub2', 'fern', 'b0_0']), scale: 0.6, dx: 14, dy: 7, sway: true });
      return out;
    }
    case 'rocks': {
      const out: Pic[] = [{ name: pick(ROCKS[area] ?? GREY), scale: 0.7, dx: jitter * 2, dy: 4 }];
      if (far >= 2 && deco % 5 === 0) out.push({ name: pick(FLAIR[area] ?? MEADOW, 2), scale: 0.5, dx: -12, dy: 8 });
      return out;
    }
    case 'crystal':
      return [{ name: pick(['crystals', 'r1_0', 't1_1']), scale: 0.62, dx: jitter * 2, dy: 2 }];
    case 'bones':
      return [{ name: pick(['bones1', 'skeleton', 'b5_1', 'bones3']), scale: deco % 4 === 1 ? 0.4 : 0.55, dx: jitter * 2, dy: 4 }];
    case 'fence':
      return [{ name: 'stakeFence', scale: 0.4, ay: 0.82, dx: 0, dy: 6, flip: deco % 2 === 0 }];
    case 'ruin':
      return deco % 3 === 0 ? [{ name: pick(['ruin1', 'ruin2', 'pillar1', 'pillar2', 'statue']), scale: 0.75, dx: jitter * 2, dy: 4 }] : [];
    case 'stones':
      if (area === 'shrine') {
        const name = pick(['tasselLantern', 'lightLantern']);
        return [{ name, scale: 0.6, dx: 0, dy: 4, light: lit(name) }];
      }
      return [{ name: pick(['menhir', 'r5_0', 'r3_1']), scale: deco % 2 ? 0.34 : 0.7, ay: 0.86, dx: 0, dy: 2 }];
    case 'water':
      // (reeds at the water's edge now and then)
      return far <= 1 && deco % 3 === 0 && area !== 'snow' ? [{ name: pick(['reeds1', 'reeds2']), scale: 0.7, dx: 10, dy: -2, sway: true }] : [];
    default:
      return [];
  }
}

/** The small things growing on a tile of the road, now and then (looks only; under whoever stands there). */
export function flairOf(area: Area, deco: number): Pic | null {
  if (deco % 7 !== 3) return null;
  const list = FLAIR[area] ?? MEADOW;
  return { name: list[(deco >> 3) % list.length], scale: 0.5, dx: (deco >> 5) % 2 ? 14 : -14, dy: -3, sway: true };
}

/** An arena's set piece: its picture and size, by the land where one kind can look different. */
export function setPiece(kind: PieceKind, area: Area): Pic {
  const p = (name: string, scale: number): Pic => ({ name, scale, ay: 0.84, dx: 0, dy: 6, light: lit(name) });
  switch (kind) {
    case 'warGate':
      return p('skullGate', 0.62);
    case 'drum':
      return p('warDrum', 0.6);
    case 'tent':
      return p('recruit_c', 0.75);
    case 'flag':
      return p('recruit_flag', 0.6);
    case 'mausoleum':
      return p('mausoleum', 0.62);
    case 'den':
      return p('caveDen', 0.6);
    case 'arch':
      return p('l1', 0.9);
    case 'circle':
      return p('stoneCircle', 0.52);
    case 'foundry':
      return p('generator', 0.6);
    case 'riftPortal':
      return p('riftPortal', 0.09);
    case 'shrine':
      return p('shrineFae', 0.75);
    case 'brazier':
      return p(area === 'volcano' || area === 'graveyard' ? 'brazierRed' : 'brazier', 0.7);
    case 'lamp':
      return p(area === 'graveyard' || area === 'dungeon' ? 'lanternPost' : area === 'shrine' ? 'tasselLantern' : area === 'forge' || area === 'crystal' ? 'arcLamp' : 'lightLantern', 0.62);
    case 'campfire':
      return p('bonfire', 0.55);
    case 'skulls':
      return p('b5_1', 0.8);
  }
}

/** A small bird's two frames, for a land: a pale one in the snow, a dark one over the graves, the others by the tile's number. Null where no bird would be. */
export function birdOf(area: Area, deco: number): Texture[] | null {
  if (!birds.length || area === 'volcano' || area === 'forge' || area === 'dungeon') return null;
  return birds[area === 'snow' || area === 'crystal' ? 3 : area === 'graveyard' ? 4 : [0, 1, 2][deco % 3]];
}

/** A soft round glow, white in the middle (tinted and added over a flame). */
let glowTex: Texture | null = null;
export function glow(): Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 48, 48);
  return (glowTex = Texture.from(c));
}

/** How many frames each looping picture has (the running water, the falls). */
export const FLOW_FRAMES = 8;
export const FALL_FRAMES = 8;
/** How tall a fall is drawn below its edge (px). */
export const FALL_H = 150;

const flowCache = new Map<string, Texture[]>();
/** The frames of running water on a tile's top: thin light streaks moving along (`sx`, `sy`), the screen way the water runs, clipped to the diamond. */
export function flowFrames(sx: number, sy: number, lava: boolean): Texture[] {
  const key = `${Math.sign(sx)},${Math.sign(sy)},${lava}`;
  const have = flowCache.get(key);
  if (have) return have;
  const len = Math.hypot(sx, sy) || 1;
  const [ux, uy] = [sx / len, sy / len];
  const frames: Texture[] = [];
  for (let f = 0; f < FLOW_FRAMES; f++) {
    const c = document.createElement('canvas');
    c.width = TW;
    c.height = TH;
    const g = c.getContext('2d')!;
    g.beginPath();
    g.moveTo(TW / 2, 1);
    g.lineTo(TW - 2, TH / 2);
    g.lineTo(TW / 2, TH - 1);
    g.lineTo(2, TH / 2);
    g.closePath();
    g.clip();
    g.strokeStyle = lava ? 'rgba(255,220,120,0.55)' : 'rgba(225,245,255,0.5)';
    g.lineWidth = 1;
    // (three streaks, each a short line along the flow, sliding a whole tile over the loop)
    for (const [ox, oy, l] of [[-0.25, -0.1, 7], [0.1, 0.18, 9], [0.3, -0.22, 6]] as const) {
      const t = (f / FLOW_FRAMES + (ox + 1) * 0.37) % 1;
      const cx = TW / 2 + ox * TW * 0.5 + ux * (t - 0.5) * TW * 0.9;
      const cy = TH / 2 + oy * TH * 0.6 + uy * (t - 0.5) * TW * 0.9;
      g.beginPath();
      g.moveTo(cx - ux * l, cy - uy * l);
      g.lineTo(cx + ux * l, cy + uy * l);
      g.stroke();
    }
    frames.push(Texture.from(c));
  }
  flowCache.set(key, frames);
  return frames;
}

const fallCache = new Map<string, Texture[]>();
/** The frames of a fall pouring over an edge face: `left` for a face down to the left of the tile's bottom corner, else down to the right;
 *  streaks run down it, it fades as it falls, and spray rises where it fades. Drawn from the face's top edge. */
export function fallFrames(left: boolean, lava: boolean): Texture[] {
  const key = `${left},${lava}`;
  const have = fallCache.get(key);
  if (have) return have;
  const w = TW / 2;
  const frames: Texture[] = [];
  const body = lava ? [255, 120, 30] : [120, 180, 235];
  const streak = lava ? 'rgba(255,230,140,' : 'rgba(235,248,255,';
  for (let f = 0; f < FALL_FRAMES; f++) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = FALL_H + TH / 2;
    const g = c.getContext('2d')!;
    const top = (x: number) => (left ? x * 0.5 : (w - x) * 0.5);
    for (let x = 0; x < w; x++) {
      const y0 = top(x);
      const grad = g.createLinearGradient(0, y0, 0, y0 + FALL_H);
      grad.addColorStop(0, `rgba(${body.join(',')},0.85)`);
      grad.addColorStop(0.6, `rgba(${body.join(',')},0.45)`);
      grad.addColorStop(1, `rgba(${body.join(',')},0)`);
      g.fillStyle = grad;
      g.fillRect(x, y0, 1, FALL_H);
      // (streaks sliding down: each column has its own, a loop of FALL_FRAMES frames)
      const ph = ((x * 37) % 23) / 23;
      for (let k = 0; k < 3; k++) {
        const y = y0 + (((f / FALL_FRAMES + ph + k / 3) % 1) * FALL_H);
        const a = 0.65 * (1 - (y - y0) / FALL_H);
        if (x % 3 === 1) continue;
        g.fillStyle = `${streak}${a.toFixed(2)})`;
        g.fillRect(x, y, 1, 6 + (x % 4));
      }
    }
    frames.push(Texture.from(c));
  }
  fallCache.set(key, frames);
  return frames;
}
