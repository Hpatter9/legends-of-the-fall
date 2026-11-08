// The Assault's field drawn (phase 0, `docs/notes/assault-0.md`; the design's sections 2.4 and 7.4): a 100 x 100 field is far too big
// for one baked texture on a phone, so it is drawn in CHUNKS of 10 x 10 tiles, each baked on demand as it comes into view (at most
// two a frame, at half resolution) and kept in a small cache, and at three LEVELS OF DETAIL by the camera's zoom:
//
// - NEAR (0.35 and up): the chunks, the tall things (boulders, walls, gates) as sprites sorted with the fighters, every fighter in
//   view animated on its sheet, hit sparks and arrows.
// - MID (0.15 to 0.35): the same, the fighters a little smaller, with no sparks or arrows.
// - FAR (below 0.15): one overview texture of the whole field baked at the start (1,024 px), each platoon a banner with its count
//   and every fighter a dot. No chunk is drawn.
//
// The levels change with a band either side of each threshold (`fieldDetail.ts`), so a pinch at the edge does not flicker. Fighters out
// of view have no sprite: theirs goes back to a pool. The renderer only reads the battle; it never changes it.
//
// Phase 1b (the art plan's 1.2, `docs/notes/assault-art-plan.md`): with the hold's own art (`src/art/assault/<army>/`, cut by
// `tools/assault/cut-sheets.py`), a chunk is baked from the looks of `fieldLooks.ts`: each tile's ground material (a 256 px texture over
// 4 x 4 tiles, so no 64 px repeat shows), the fringes where materials meet, the faces of each column (a lip, a body of four steps and a
// foot, with a dark band at the foot of the tall ones), the decals and the low clutter. The standing pieces (the structures in their
// states, the longhouses and huts, the keep, the towers, the trees) stand among the fighters; a structure's picture follows its hp
// (whole, battered, broken), a drum beats, a hut burns, the ladders lean on the wall and the ram rolls.

import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { Battle, Unit } from '../sim/battle';
import type { FieldState } from '../sim/assault/field';
import type { FieldEvent } from '../sim/assault/spike';
import type { Tile } from '../sim/board';
import { AREA_URLS, BUSH_URLS, GROUND_URLS } from './areaArt';
import { TERRAIN_URLS } from './terrainArt';
import { loadRoadArt, piece, setPiece } from './roadArt';
import { UNITS } from '../sim/units';
import { rankOf } from '../sim/assault/troops';
import { loadImage } from './loadImage';
import { facesRight, FOOT, HH, rawAt, TH, TW } from './iso';
import { facesRightOf, figureOf, framesOf, type Anim } from './sheets';
import { detailFor, type Detail } from './fieldDetail';
import { CHUNK, chunkHeights, chunksInView, focusOnScreen, viewRect, type PlayArea, type WorldRect } from './fieldCull';
import { clutterOf, decalOf, DEEP, MAT, faceOf, fortLook, fringesOf, materialsOf, placementsOf, type Placement } from './fieldLooks';
import { DECALS, EDGES, FACES, SPRITES } from './assaultOrcAtlas';
import { VFX, loadVfxArt } from './vfxArt';
import { holdMapOf, blueprintOf } from '../sim/assault/assault';
import { FieldLife } from './fieldLife';
import { WALL_TOP } from '../sim/assault/fieldMap';
import { VOLLEY_TELL_MS } from '../sim/assault/works';

export { MID_AT, NEAR_AT, type Detail } from './fieldDetail';
import gateUrl from '../art/camp/gate.png';
import impactUrl from '../art/fx/impact.png';
import arrowUrl from '../art/fx/arrow.png';

export { CHUNK, type PlayArea } from './fieldCull';
/** The chunks' bake resolution (of the world's pixels). */
const BAKE_RES = 0.5;
/** At most this many chunks are baked in one frame, and only while the frame's baking has taken less than `BAKE_BUDGET_MS`; with every chunk
 *  in view baked, one in the ring just outside it is baked ahead (prewarmed), so a pan finds it ready. */
const BAKES_A_FRAME = 2;
const BAKE_BUDGET_MS = 6;
/** The chunk cache: this many kept, the whole 10 x 10 of them (about 28 MB at half resolution; a tall phone at Mid wants 70 in view,
 *  and chunks in view are never let go). */
const CACHE = 100;
/** The haze past the hold's edge: the land beyond fades into it, and the page behind the field is this colour (phase 1b). */
export const FIELD_FOG = '#2b3230';
const FOG_RGB = [43, 50, 48];
/** The land beyond the hold: this many tiles each side, baked at this resolution (it is all haze and trees). */
const SKIRT = 10;
const SKIRT_RES = 0.25;
/** The shallows' place in the hold's ground textures. */
const MAT_SHALLOWS = MAT.shallows;
/** The pieces that give off firelight, and how high over their foot the flame is (world pixels). */
const LIGHTS: Record<string, number> = {
  bonfire: 18, bonefire: 22, brazier: 34, firepit: 8, forgeFire: 14, southGate: 40, ironGate: 46, northGate: 40, sallyPort: 30, keep: 40,
  throne: 22, drumStruck: 30,
};
/** Steady light for those who ask for less motion. */
const reducedMotion = (): boolean => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) || false;

/** The day's grade over the field (phase 1b): a warm light from the upper left, a cool shade towards the bottom. A layer of the page, over the
 *  canvas and under its buttons; it takes no taps. */
export function fieldGrade(host: HTMLElement): HTMLElement {
  const d = document.createElement('div');
  d.style.cssText =
    'position:absolute;inset:0;pointer-events:none;z-index:1;' +
    'background:radial-gradient(120% 80% at 18% 8%,rgba(255,200,130,.10),rgba(255,200,130,0) 60%),linear-gradient(rgba(0,0,0,0) 60%,rgba(30,36,70,.18));';
  host.append(d);
  return d;
}

/** The overview's width in pixels. */
const OVERVIEW_W = 1024;
/** Effects at once (sparks and arrows). */
const FX_POOL = 64;

/** The land a zone wears: the highlands outside the palisade, the war camp's mud and stone inside it (the design's 2.3). */
const CAMP_ZONES = new Set(['D', 'E', 'P', 'G', 'B', 'S', 'H', 'I', 'M'].map((c) => c.charCodeAt(0)));

interface LandArt {
  tops: HTMLImageElement[];
  high: HTMLImageElement;
  side: HTMLImageElement;
  boulders: Texture[];
  tall: HTMLImageElement[];
}
interface FieldArt {
  highlands: LandArt;
  warcamp: LandArt;
  water: HTMLImageElement;
  planks: HTMLImageElement;
  bushes: Texture[];
  walls: Texture[];
  gate: Texture;
  sparks: Texture[];
  arrow: Texture;
}
let art: FieldArt | null = null;

/** The hold's own art (phase 1b): the standing sprites' atlas, the ground textures, the transitions and decals turned four ways, the faces. */
interface HoldArt {
  sprites: HTMLImageElement;
  ground: HTMLImageElement;
  /** Each transition (by its `EDGES` name) and decal (`DECALS`), as four canvases, one a quarter turn. */
  edges: Record<string, HTMLCanvasElement[]>;
  decals: Record<string, HTMLCanvasElement[]>;
  faces: HTMLImageElement;
  tex: Map<string, Texture>;
  /** The kit's tall grass, dried to the highland's straw (it is drawn many times a chunk). */
  grass: HTMLCanvasElement | null;
  /** The faces shaded for the two sides (the light from the left): darkened where they are painted, never over their clear parts, so a step
   *  has no black outline. */
  faceShade: { right: HTMLCanvasElement; left: HTMLCanvasElement };
}
let hold: HoldArt | null = null;
/** The hold's art files, by URL (copied by `build.mjs` and kept by the service worker for offline play). */
const holdUrl = (army: string, f: string) => `assault/${army === 'orcs' ? 'orc' : army}/${f}.webp`;
/** The kit pieces are drawn at the Chronos kits' scale (a tile about 54 px once halved): this lifts them to the field's 64. */
const KIT_SCALE = 1.15;

/** Turn a square picture's cell four ways (a quarter turn clockwise each). */
function turned(img: HTMLImageElement, sx: number, sy: number, size: number): HTMLCanvasElement[] {
  return [0, 1, 2, 3].map((q) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d')!;
    g.translate(size / 2, size / 2);
    g.rotate((q * Math.PI) / 2);
    g.drawImage(img, sx, sy, size, size, -size / 2, -size / 2, size, size);
    return c;
  });
}

/** Load the hold's own art (the Orcs' for Bloodtusk Hold). It falls back to the lands' art if a file cannot be had. */
export async function loadHoldArt(army = 'orcs'): Promise<void> {
  if (hold) return;
  try {
    const [sprites, ground, edges, decals, faces] = await Promise.all(['sprites', 'ground', 'edges', 'decals', 'faces'].map((f) => loadImage(holdUrl(army, f))));
    const e: Record<string, HTMLCanvasElement[]> = {};
    EDGES.forEach((n, i) => (e[n] = turned(edges, (i % 4) * 64, Math.floor(i / 4) * 64, 64)));
    const d: Record<string, HTMLCanvasElement[]> = {};
    DECALS.forEach((n, i) => (d[n] = turned(decals, (i % 4) * 128, Math.floor(i / 4) * 128, 128)));
    let grass: HTMLCanvasElement | null = null;
    const gr = SPRITES.tallGrass?.r;
    if (gr) {
      grass = document.createElement('canvas');
      grass.width = gr[2];
      grass.height = gr[3];
      const gg = grass.getContext('2d')!;
      gg.drawImage(sprites, gr[0], gr[1], gr[2], gr[3], 0, 0, gr[2], gr[3]);
      gg.globalCompositeOperation = 'source-atop';
      gg.fillStyle = 'rgba(122,108,62,0.68)';
      gg.fillRect(0, 0, gr[2], gr[3]);
    }
    const shaded = (k: number) => {
      const c = document.createElement('canvas');
      c.width = faces.width;
      c.height = faces.height;
      const g = c.getContext('2d')!;
      g.drawImage(faces, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = `rgba(0,0,0,${k})`;
      g.fillRect(0, 0, c.width, c.height);
      return c;
    };
    hold = { sprites, ground, edges: e, decals: d, faces, tex: new Map(), grass, faceShade: { right: shaded(0.26), left: shaded(0.04) } };
  } catch {
    hold = null;
  }
  await loadVfxArt().catch(() => undefined);
}

/** A standing sprite of the hold's atlas, cut once. */
function holdTex(name: string): Texture | null {
  if (!hold || !SPRITES[name]) return null;
  let t = hold.tex.get(name);
  if (!t) {
    const [x, y, w, h] = SPRITES[name].r;
    const src = (hold.tex.get('') ?? hold.tex.set('', Texture.from(hold.sprites)).get(''))!.source;
    t = new Texture({ source: src, frame: new Rectangle(x, y, w, h) });
    hold.tex.set(name, t);
  }
  return t;
}

/** Load the field's art (the land's ground, sides and boulders, the ruins, the gate, a spark and an arrow from the fx packs). */
/** A hash of two numbers, 0 to 1 (looks only: the clutter's offsets). */
const noiseOf = (u: number, v: number): number => {
  const x = u / 6;
  const y = v / 6;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const a = hashOf(x0, y0);
  const b = hashOf(x0 + 1, y0);
  const c = hashOf(x0, y0 + 1);
  const d = hashOf(x0 + 1, y0 + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const hashOf = (a: number, b: number): number => (((Math.imul(a * 73856093 ^ b * 19349663, 0x9e3779b1) >>> 0) % 1000) / 1000);
/** Whether a piece is one of the Chronos kits' (drawn at their scale), not the hold's sheets'. */
const KIT_NAMES = new Set(['longhouse', 'boneHut', 'hideHut', 'forge', 'forgeFire', 'wargPen', 'pigPen', 'watchtower', 'lookout', 'warDrum', 'skullTotem', 'skullTorch', 'spearSign', 'bonfire', 'weaponStall', 'skullPile', 'warCart', 'granary', 'meatRacks', 'meatPile', 'barrels', 'chests', 'stockpile', 'woodpile', 'well', 'hides', 'logBridge', 'ruin1', 'ruin2', 'rubblePile', 'brazier', 'pine1', 'pine2', 'pineSmall', 'burntTree', 'gnarledTree', 'bareTree', 'thornBush', 'shrub1', 'shrub2', 'fern', 'stump1', 'stump2', 'fallenLog', 'boulders', 'rocks', 'darkRocks', 'darkRocksB', 'standingStone', 'reeds1', 'reeds2', 'bones1', 'bones2', 'bones3', 'flowers1', 'flowers2', 'pebbles', 'tallGrass', 'kitSpikedWall', 'kitSpikedCorner', 'kitSkullGate', 'kitStakeFence']);
const isKit = (name: string): boolean => KIT_NAMES.has(name);
/** The one-tile pieces big enough to show on the overview. */
const BIG = new Set(['longhouse', 'watchtower', 'wargPen', 'pigPen', 'throne', 'greatBanner', 'warTent', 'hideHut', 'bonfire']);

export async function loadFieldArt(): Promise<void> {
  if (art) return;
  const land = async (a: 'highlands' | 'warcamp'): Promise<LandArt> => {
    const u = AREA_URLS[a];
    const [tops, high, side, boulders, tall] = await Promise.all([Promise.all(u.tops.map(loadImage)), loadImage(u.high), loadImage(u.side), Promise.all(u.boulders.map(loadImage)), Promise.all(u.tall.map(loadImage))]);
    return { tops, high, side, boulders: boulders.map((i) => Texture.from(i)), tall };
  };
  const tex = async (url: string) => Texture.from(await loadImage(url));
  const [highlands, warcamp, water, planks, bushes, walls, gate, impact, arrow] = await Promise.all([
    land('highlands'), land('warcamp'), loadImage(GROUND_URLS.water), loadImage(TERRAIN_URLS.planks),
    Promise.all(BUSH_URLS.map(tex)), Promise.all(TERRAIN_URLS.walls.map(tex)), tex(gateUrl), tex(impactUrl), tex(arrowUrl),
  ]);
  // (the set pieces' atlas: the drums, tents, flags, fires and braziers of the arenas)
  await loadRoadArt();
  await loadHoldArt();
  // (the impact strip: seven frames of 48 x 48)
  const sparks = Array.from({ length: 7 }, (_, i) => new Texture({ source: impact.source, frame: new Rectangle(i * 48, 0, 48, 48) }));
  art = { highlands, warcamp, water, planks, bushes, walls, gate, sparks, arrow };
}

interface Chunk {
  sprite: Sprite;
  /** Its tall things (boulders, walls, gates), in the fighters' layer. */
  props: Sprite[];
  used: number;
}

/** A standing piece whose picture follows the battle: a structure's state, a drum's beat, a hut's fire. */
interface Live {
  sp: Sprite;
  p: Placement;
  /** Its foot's height (for the fire's place). */
  h: number;
}

interface FxLive {
  sp: Sprite;
  until: number;
  start: number;
  kind: 'spark' | 'arrow';
  from?: [number, number];
  to?: [number, number];
}

/** The field's view: add `root` to the stage, then call `update` each frame. */
export class FieldView {
  readonly root = new Container();
  private chunkLayer = new Container();
  private skirtLayer = new Container();
  private skirt = new Map<number, Sprite>();
  private unitLayer = new Container();
  private farLayer = new Container();
  private dots = new Graphics();
  private overview: Sprite | null = null;
  private chunks = new Map<number, Chunk>();
  private sprites = new Map<number, { body: Sprite; ring: Sprite }>();
  private pool: { body: Sprite; ring: Sprite }[] = [];
  private banners: Text[] = [];
  private fxLive: FxLive[] = [];
  private fxPool: Sprite[] = [];
  private rings: { hero: Texture; foe: Texture; chosen: Texture; elite: Texture; heroMid: Texture; foeMid: Texture };
  /** At Mid, a pennant over each platoon of ours with its count. */
  private pennants: { c: Container; t: Text }[] = [];
  /** The platoon chosen on the command bar (its fighters' rings are gold), or -1. */
  chosen = -1;
  /** The tiles a set piece stands on (the hold's pieces: drums, tents, flags...), and each gate's first tile (its picture). */
  private pieceAt = new Map<number, string>();
  private gateAt = new Set<number>();
  private frame = 0;
  detail: Detail = 'near';
  /** What the last frame drew (for the bench's readout). */
  drawn = { chunks: 0, fighters: 0, props: 0, baked: 0, fx: 0, bakeMs: 0 };
  private brokenGates = new Set<number>();
  /** Each chunk's highest and lowest ground, for culling. */
  private heights: ReturnType<typeof chunkHeights>;
  /** The hold's looks (phase 1b): each tile's material, the standing pieces by the chunk they sort in, the pieces that follow the battle. */
  private mats: Uint8Array | null = null;
  private placed = new Map<number, Placement[]>();
  private live = new Map<number, Live[]>();
  private works = new Container();
  private fires: Sprite[] = [];
  /** The firelight of each chunk's lights: a warm glow added over the scene, flickering. */
  private glows = new Map<number, { sp: Sprite; base: number; seed: number; big: boolean }[]>();
  private glowTex: Texture | null = null;
  /** The small life: embers off the fires, rings on the river (`fieldLife.ts`, a stand-in for the shared ambient module). */
  private life: FieldLife | null = null;
  private ladders: Sprite[] = [];
  /** The heavy works (phase 2): the volley's ground marks, its stone in flight, the keg carried or set, the blasts. */
  private marks = new Graphics();
  private stone: Sprite | null = null;
  private keg: Sprite | null = null;
  private fuse: Sprite | null = null;
  private blasts: { u: number; v: number; h: number; start: number; big: boolean; sp: Sprite[] }[] = [];

  constructor(private b: Battle, private renderer: { generateTexture: (o: Container | { target: Container }) => Texture }) {
    this.unitLayer.sortableChildren = true;
    this.root.addChild(this.skirtLayer, this.chunkLayer, this.unitLayer, this.farLayer);
    this.farLayer.addChild(this.dots);
    // (the team rings under the fighters' feet: a ring, as the selection ring is drawn, blue for ours and red for theirs)
    const ring = (c: number) => {
      const g = new Graphics().ellipse(0, 0, 18, 9).stroke({ width: 3, color: c, alpha: 0.85 });
      const t = this.renderer.generateTexture(g);
      g.destroy();
      return t;
    };
    // (at Mid, a filled disc under each fighter: a team's colour reads at a glance)
    const disc = (c: number) => {
      const g = new Graphics().ellipse(0, 0, 20, 10).fill({ color: c, alpha: 0.45 }).stroke({ width: 4, color: c, alpha: 0.95 });
      const t = this.renderer.generateTexture(g);
      g.destroy();
      return t;
    };
    this.rings = { hero: ring(0x4a9cff), foe: ring(0xff4a4a), chosen: ring(0xffd76a), elite: ring(0xe0b84a), heroMid: disc(0x4a9cff), foeMid: disc(0xff4a4a) };
    const w = this.b.board.w;
    for (const p of this.b.board.pieces ?? []) this.pieceAt.set(p.v * w + p.u, p.kind);
    // (the hold's gates: the camp's gate on each one's first tile; the drums are set pieces)
    for (const f of this.b.field?.hold?.forts ?? []) if (f.spec.kind !== 'palisade' && f.spec.kind !== 'drum') this.gateAt.add(f.spec.tiles[0]);
    // (the hold's looks, when its own art is loaded: each tile's material and every standing piece, by its chunk)
    const bp = this.b.field?.hold?.bp ?? blueprintOf('orcs');
    const map = bp ? holdMapOf(bp.army) : undefined;
    if (hold && bp && map && this.b.field) {
      this.mats = materialsOf(this.b.board, this.b.field.zone, bp);
      for (const p of placementsOf(this.b.board, this.b.field.zone, bp, this.b.field.hold?.forts.map((x) => x.spec) ?? map.forts)) {
        const key = Math.floor(Math.floor(p.front / w) / CHUNK) * 100 + Math.floor((p.front % w) / CHUNK);
        let list = this.placed.get(key);
        if (!list) this.placed.set(key, (list = []));
        list.push(p);
      }
    }
    if (this.mats) {
      const water: [number, number, number][] = [];
      this.mats.forEach((m, i) => m === DEEP && water.push([i % w, Math.floor(i / w), this.b.board.tiles[i].h]));
      this.life = new FieldLife(this.renderer as never, water);
      this.unitLayer.addChild(this.life.layer);
    }
    this.unitLayer.addChild(this.works);
    this.works.addChild(this.marks);
    this.works.zIndex = 0;
    this.works.sortableChildren = false;
    this.bakeOverview();
    const bd = this.b.board;
    this.heights = chunkHeights(bd.w, bd.d, (u, v) => bd.tiles[v * bd.w + u].h);
  }

  private get f(): FieldState {
    return this.b.field!;
  }

  // ----- the terrain -----

  private landOf(i: number): LandArt {
    return CAMP_ZONES.has(this.f.zone[i]) ? art!.warcamp : art!.highlands;
  }

  /** Bake one chunk's ground: each tile's two visible sides down to its front neighbours and its top, back to front. */
  private bakeChunk(cx: number, cy: number): Chunk {
    const b = this.b.board;
    const u0 = cx * CHUNK;
    const v0 = cy * CHUNK;
    const u1 = Math.min(b.w, u0 + CHUNK) - 1;
    const v1 = Math.min(b.d, v0 + CHUNK) - 1;
    // (past the field's edge: with the hold's art the land beyond carries the edge's height on, so the edge shows no wall; without it, a drop)
    const hOf = (u: number, v: number) =>
      u < b.w && v < b.d ? b.tiles[v * b.w + u].h : hold && this.mats ? b.tiles[Math.min(v, b.d - 1) * b.w + Math.min(u, b.w - 1)].h : -FOOT / HH;
    // the chunk's bounds in world pixels
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let v = v0; v <= v1; v++)
      for (let u = u0; u <= u1; u++) {
        const t = b.tiles[v * b.w + u];
        const [x, y] = rawAt(u, v, t.h);
        const low = Math.min(hOf(u + 1, v), hOf(u, v + 1), t.h);
        x0 = Math.min(x0, x - TW / 2);
        x1 = Math.max(x1, x + TW / 2);
        y0 = Math.min(y0, y - TH / 2);
        y1 = Math.max(y1, y + TH / 2 + (t.h - low) * HH);
      }
    const cw = Math.ceil((x1 - x0) * BAKE_RES) + 2;
    const ch = Math.ceil((y1 - y0) * BAKE_RES) + 2;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const g = canvas.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const S = BAKE_RES;
    const ox = -x0;
    const oy = -y0;
    // (a square texture laid onto a tile's diamond: its x along +u, its y along +v; the corner (u - 0.5, v - 0.5) at the top)
    const top = (img: HTMLImageElement, u: number, v: number, h: number) => {
      const [x, y] = rawAt(u - 0.5, v - 0.5, h);
      g.setTransform(((TW / 2) / img.width) * S, ((TH / 2) / img.width) * S, (-(TW / 2) / img.height) * S, ((TH / 2) / img.height) * S, (x + ox) * S, (y + oy) * S);
      g.drawImage(img, 0, 0);
    };
    // (a side face from corner a to corner b, `steps` tall, the side texture once a step, and a shade over it)
    const face = (img: HTMLImageElement, a: [number, number], z: [number, number], steps: number, shade: number) => {
      for (let s = 0; s < steps; s++) {
        g.setTransform(((z[0] - a[0]) / img.width) * S, ((z[1] - a[1]) / img.width) * S, 0, (HH / img.height) * S, (a[0] + ox) * S, (a[1] + oy + s * HH) * S);
        g.drawImage(img, 0, 0);
      }
      g.setTransform(S, 0, 0, S, ox * S, oy * S);
      g.fillStyle = `rgba(0,0,0,${shade})`;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(z[0], z[1]);
      g.lineTo(z[0], z[1] + steps * HH);
      g.lineTo(a[0], a[1] + steps * HH);
      g.closePath();
      g.fill();
    };
    // (the hold's art: a face of the sheet, a lip on the top step, a foot on the lowest, the body's four steps between; a dark band at the
    //  foot of a face three steps or more; a shade over it all)
    const H = hold;
    const mats = this.mats;
    const tall: number[] = [];
    const sheetFace = (name: string, a: [number, number], z: [number, number], steps: number, shade: number) => {
      const col = FACES.indexOf(name as (typeof FACES)[number]);
      const sx = (col % 6) * 64;
      const sy = Math.floor(col / 6) * 120;
      for (let k = 0; k < steps; k++) {
        const part = k === 0 ? 0 : k === steps - 1 && steps >= 2 ? 100 : 20 + ((k - 1) % 4) * 20;
        g.setTransform(((z[0] - a[0]) / 64) * S, ((z[1] - a[1]) / 64) * S, 0, (HH / 20) * S, (a[0] + ox) * S, (a[1] + oy + k * HH) * S);
        g.drawImage(shade > 0.1 ? H!.faceShade.right : H!.faceShade.left, sx, sy + part, 64, 20, 0, 0, 64, 20);
      }
      g.setTransform(S, 0, 0, S, ox * S, oy * S);
      const quad = (y0: number, y1: number, fill: string | CanvasGradient) => {
        g.fillStyle = fill;
        g.beginPath();
        g.moveTo(a[0], a[1] + y0);
        g.lineTo(z[0], z[1] + y0);
        g.lineTo(z[0], z[1] + y1);
        g.lineTo(a[0], a[1] + y1);
        g.closePath();
        g.fill();
      };
      if (steps >= 3) {
        const yb = Math.max(a[1], z[1]) + steps * HH;
        const grad = g.createLinearGradient(0, yb - HH * 1.5, 0, yb);
        grad.addColorStop(0, 'rgba(10,6,4,0)');
        grad.addColorStop(1, 'rgba(10,6,4,0.45)');
        quad(steps * HH - HH * 1.5, steps * HH, grad);
      }
    };
    // (a material's quarter of its 256 px texture: the tile's place in its 4 x 4)
    const matTop = (m: number, u: number, v: number, h: number) => {
      const [x, y] = rawAt(u - 0.5, v - 0.5, h);
      g.setTransform(((TW / 2) / 64) * S, ((TH / 2) / 64) * S, (-(TW / 2) / 64) * S, ((TH / 2) / 64) * S, (x + ox) * S, (y + oy) * S);
      g.drawImage(H!.ground, (m % 4) * 256 + (u % 4) * 64, Math.floor(m / 4) * 256 + (v % 4) * 64, 64, 64, 0, 0, 64, 64);
    };
    const overlay = (c: HTMLCanvasElement, u: number, v: number, h: number, span = 1) => {
      const [x, y] = rawAt(u - 0.5 - (span - 1) / 2, v - 0.5 - (span - 1) / 2, h);
      g.setTransform(((TW / 2) * span / c.width) * S, ((TH / 2) * span / c.width) * S, (-(TW / 2) * span / c.height) * S, ((TH / 2) * span / c.height) * S, (x + ox) * S, (y + oy) * S);
      g.drawImage(c, 0, 0);
    };
    // back to front: by u + v, then u
    for (let s = u0 + v0; s <= u1 + v1; s++)
      for (let u = Math.max(u0, s - v1); u <= Math.min(u1, s - v0); u++) {
        const v = s - u;
        const i = v * b.w + u;
        const t = b.tiles[i];
        const land = this.landOf(i);
        // (the bottom-right face, over the +u neighbour, and the bottom-left, over the +v one)
        const dr = Math.ceil(t.h - hOf(u + 1, v));
        const dl = Math.ceil(t.h - hOf(u, v + 1));
        if (H && mats) {
          const zone = this.f.zone;
          if (dr > 0) sheetFace(faceOf(b, zone, i, u + 1 < b.w ? i + 1 : -1), rawAt(u + 0.5, v - 0.5, t.h), rawAt(u + 0.5, v + 0.5, t.h), dr, 0.22);
          if (dl > 0) sheetFace(faceOf(b, zone, i, v + 1 < b.d ? i + b.w : -1), rawAt(u - 0.5, v + 0.5, t.h), rawAt(u + 0.5, v + 0.5, t.h), dl, 0.06);
          const m = mats[i];
          // (deep water: the sheet's water over its stones, darkened to the deep's blue-green)
          matTop(m === DEEP ? MAT_SHALLOWS : m, u, v, t.h);
          if (m === DEEP) {
            g.setTransform(S, 0, 0, S, ox * S, oy * S);
            this.diamond(g, u, v, t.h, 'rgba(18,56,88,0.38)');
          }
          for (const fr of fringesOf(b, mats, u, v)) overlay(H.edges[fr.edge][fr.turn], u, v, t.h);
          if (t.ground === 'tall') tall.push(i);
          continue;
        }
        if (dr > 0) face(land.side, rawAt(u + 0.5, v - 0.5, t.h), rawAt(u + 0.5, v + 0.5, t.h), dr, 0.32);
        if (dl > 0) face(land.side, rawAt(u - 0.5, v + 0.5, t.h), rawAt(u + 0.5, v + 0.5, t.h), dl, 0.12);
        top(this.topOf(t, land), u, v, t.h);
        if (t.ground === 'deep' || t.ground === 'water') {
          g.setTransform(S, 0, 0, S, ox * S, oy * S);
          this.diamond(g, u, v, t.h, t.ground === 'deep' ? 'rgba(20,50,120,0.45)' : 'rgba(120,190,255,0.12)');
        } else if (t.ground === 'tall') this.tufts(g, land, u, v, t.h, S, ox, oy);
      }
    // (the hold's art: the decals on the flat tiles away from the chunk's edge, then the low clutter, the tall grass and the low pieces, back
    //  to front)
    if (H && mats) {
      const flat = (u: number, v: number, h: number) => {
        for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) if (Math.abs(hOf(u + du, v + dv) - h) >= 1) return false;
        return true;
      };
      const bp = this.f.hold?.bp;
      if (bp)
        for (let v = v0 + 1; v < v1; v++)
          for (let u = u0 + 1; u < u1; u++) {
            const t = b.tiles[v * b.w + u];
            const dc = decalOf(b, this.f.zone, mats, bp, u, v);
            if (!dc || !flat(u, v, t.h)) continue;
            g.globalAlpha = dc.alpha;
            overlay(H.decals[dc.name][dc.turn], u, v, t.h, 2);
            g.globalAlpha = 1;
          }
      const low: { u: number; v: number; h: number; tex: Texture; ax: number; ay: number; scale: number; img?: HTMLCanvasElement }[] = [];
      for (let v = v0; v <= v1; v++)
        for (let u = u0; u <= u1; u++) {
          const t = b.tiles[v * b.w + u];
          const c = clutterOf(b, this.f.zone, mats, u, v);
          const tex = c ? holdTex(c) : null;
          if (tex && c) low.push({ u: u + (hashOf(u, v) - 0.5) * 0.4, v: v + (hashOf(v, u) - 0.5) * 0.4, h: t.h, tex, ax: SPRITES[c].foot[0], ay: SPRITES[c].foot[1], scale: 0.7 });
        }
      // (the tall grass: a few dried tufts a tile, fewer at a patch's edge and leaning in from it, each its own size, so a patch has no hard
      //  outline; the ground under it is the heath's)
      const grass = holdTex('tallGrass');
      const isTall = (u: number, v: number) => u >= 0 && v >= 0 && u < b.w && v < b.d && b.tiles[v * b.w + u].ground === 'tall';
      if (grass)
        for (const i of tall) {
          const u = i % b.w;
          const v = Math.floor(i / b.w);
          const open = [isTall(u - 1, v), isTall(u + 1, v), isTall(u, v - 1), isTall(u, v + 1)].filter((x) => !x).length;
          const tufts = open >= 2 ? 1 : open === 1 ? 1 + (hashOf(u, v) < 0.5 ? 1 : 0) : 2;
          // (leaning in: away from the open sides)
          const lu = (isTall(u - 1, v) ? 0 : 0.18) - (isTall(u + 1, v) ? 0 : 0.18);
          const lv = (isTall(u, v - 1) ? 0 : 0.18) - (isTall(u, v + 1) ? 0 : 0.18);
          for (let k = 0; k < tufts; k++)
            low.push({
              u: u + lu + (hashOf(u + k * 7, v) - 0.5) * 0.7,
              v: v + lv + (hashOf(v, u + k * 7) - 0.5) * 0.7,
              h: b.tiles[i].h,
              tex: grass,
              ax: SPRITES.tallGrass.foot[0],
              ay: SPRITES.tallGrass.foot[1],
              scale: 0.45 + hashOf(u * 3 + k, v * 5) * 0.3,
              img: H.grass ?? undefined,
            });
        }
      for (const p of this.placed.get(cy * 100 + cx) ?? []) {
        if (!p.low) continue;
        const tex = holdTex(p.name);
        if (!tex) continue;
        const t = b.tiles[p.front];
        low.push({ u: p.u, v: p.v, h: t.h, tex, ax: SPRITES[p.name].foot[0], ay: SPRITES[p.name].foot[1], scale: (p.scale ?? 1) * (isKit(p.name) ? KIT_SCALE : 1) });
      }
      low.sort((x, y) => x.u + x.v - (y.u + y.v));
      for (const l of low) {
        const [x, y] = rawAt(l.u, l.v, l.h);
        const fr = l.tex.frame;
        g.setTransform(S * l.scale, 0, 0, S * l.scale, (x + ox) * S - l.ax * l.scale * S, (y + oy) * S - l.ay * l.scale * S);
        if (l.img) g.drawImage(l.img, 0, 0);
        else g.drawImage(H.sprites, fr.x, fr.y, fr.width, fr.height, 0, 0, fr.width, fr.height);
      }
    }
    const texture = Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    const sprite = new Sprite(texture);
    sprite.position.set(x0 - 1 / S, y0 - 1 / S);
    sprite.scale.set(1 / S);
    sprite.zIndex = cx + cy;
    // the tall things on the chunk's tiles, as sprites among the fighters
    const props: Sprite[] = [];
    if (H && mats) {
      const live: Live[] = [];
      for (const p of this.placed.get(cy * 100 + cx) ?? []) {
        if (p.low) continue;
        const sp = this.standing(p);
        if (!sp) continue;
        const t = b.tiles[p.front];
        // (a structure stands at its floor, not on top of its own solid tiles)
        const h = p.fort !== undefined ? this.floorOf(p) : t.h;
        const [x, y] = rawAt(p.u, p.v, h);
        sp.position.set(x, y);
        const at = p.depth ?? p.front;
        sp.zIndex = ((at % b.w) + Math.floor(at / b.w)) * 10 + (p.depth !== undefined ? 1 : 4);
        props.push(sp);
        this.unitLayer.addChild(sp);
        if (p.fort !== undefined || p.hut !== undefined) live.push({ sp, p, h });
      }
      this.live.set(cy * 100 + cx, live);
      // (the firelight: a warm glow round each flame, above the scene, added)
      const glows: { sp: Sprite; base: number; seed: number; big: boolean }[] = [];
      for (const p of this.placed.get(cy * 100 + cx) ?? []) {
        const up = LIGHTS[p.road ? (p.road === 'campfire' ? 'bonfire' : p.road) : p.name];
        if (up === undefined || (p.road && p.road !== 'campfire')) continue;
        const t = b.tiles[p.front];
        const h = p.fort !== undefined ? this.floorOf(p) : t.h;
        const [x, y] = rawAt(p.u, p.v, h);
        const sp = new Sprite(this.glow());
        sp.anchor.set(0.5);
        sp.blendMode = 'add';
        const big = p.name === 'bonefire' || p.name === 'bonfire' || p.name === 'keep' ? 1.6 : p.name === 'wallBrazier' || p.name === 'skullTorch' ? 0.8 : 1.1;
        sp.scale.set(big, big * 0.7);
        sp.position.set(x, y - up * (p.scale ?? 1));
        sp.zIndex = 1e5;
        this.unitLayer.addChild(sp);
        props.push(sp);
        glows.push({ sp, base: 0.55, seed: p.front * 0.37, big: big > 1 });
      }
      this.glows.set(cy * 100 + cx, glows);
      this.drawn.baked++;
      return { sprite, props, used: this.frame };
    }
    for (let v = v0; v <= v1; v++)
      for (let u = u0; u <= u1; u++) {
        const i = v * b.w + u;
        const t = b.tiles[i];
        const p = this.propOf(t, i);
        if (!p) continue;
        const [x, y] = rawAt(u, v, t.h);
        p.position.set(x, y);
        p.zIndex = (u + v) * 10 + 4;
        props.push(p);
        this.unitLayer.addChild(p);
      }
    this.drawn.baked++;
    return { sprite, props, used: this.frame };
  }

  /** Tufts of tall grass, the land's own, in front of the tile's middle. */
  private tufts(g: CanvasRenderingContext2D, land: LandArt, u: number, v: number, h: number, S: number, ox: number, oy: number): void {
    const t = this.b.board.tiles[v * this.b.board.w + u];
    const [x, y] = rawAt(u, v, h);
    for (let k = 0; k < 5; k++) {
      const img = land.tall[(t.deco + k) % land.tall.length];
      const a = ((t.deco >> 2) + k * 2.1) % 6.283;
      const px = x + Math.cos(a) * 15;
      const py = y + 4 + Math.sin(a) * 5;
      g.setTransform(S * 3, 0, 0, S * 3, (px + ox) * S - (img.width * 3 * S) / 2, (py + oy) * S - img.height * 3 * S);
      g.drawImage(img, 0, 0);
    }
  }

  /** A standing piece's sprite: the hold's own picture on its foot point (or an arena set piece), mirrored for a run along v. */
  private standing(p: Placement): Sprite | null {
    if (p.road) {
      const pic = setPiece(p.road as Parameters<typeof setPiece>[0], this.b.board.area);
      const tex = piece(pic.name);
      if (!tex) return null;
      const s = new Sprite(tex);
      s.anchor.set(pic.ax ?? 0.5, pic.ay ?? 0.84);
      s.scale.set(pic.scale);
      return s;
    }
    if (p.name === 'landBoulder') {
      const set = art!.highlands.boulders;
      const tex = set[this.b.board.tiles[p.front].deco % set.length];
      const s = new Sprite(tex);
      s.anchor.set(0.5, 0.8);
      s.scale.set(Math.min(56 / tex.width, 66 / tex.height));
      return s;
    }
    const name = this.lookOf(p);
    const tex = holdTex(name);
    if (!tex) return null;
    const s = new Sprite(tex);
    this.footOn(s, name, p);
    if (p.tint !== undefined) s.tint = p.tint;
    return s;
  }

  /** Stand a sprite on its picture's foot point, at the piece's scale, mirrored if it runs along v. */
  private footOn(s: Sprite, name: string, p: Placement): void {
    const def = SPRITES[name];
    s.anchor.set(def.foot[0] / def.r[2], def.foot[1] / def.r[3]);
    const k = (p.scale ?? 1) * (isKit(name) ? KIT_SCALE : 1);
    s.scale.set(p.flip ? -k : k, k);
  }

  /** The picture a piece shows now: a structure's by its state, a hut's once burnt. */
  private lookOf(p: Placement): string {
    const h = this.f.hold;
    if (p.fort !== undefined && h) {
      const f = h.forts[p.fort];
      let look = fortLook(f.spec.kind, f.hp, f.maxHp, f.broken, !!f.open);
      if (look === 'palisadeRun' && p.inner) look = 'palisadeInner';
      // (a breached segment: the ramp of logs on the ring's outer row only)
      if (look === 'palisadeBreach' && Math.max(Math.abs(p.u - 49.5), Math.abs(p.v - 49.5)) < 23) return 'gatePost';
      return look;
    }
    if (p.hut !== undefined && h?.siege.huts[p.hut]?.burnt) return 'burntHeap';
    // (the stone wall broken: its crenels fallen to rubble, its braziers gone; a barrel a sapper lifted, gone)
    const t = this.b.board.tiles[p.front];
    if ((p.name === 'crenel' || p.name === 'wallBrazier') && t.h < WALL_TOP) return p.name === 'crenel' ? 'rubblePile' : '';
    if (p.name === 'barrels' && !t.barrel) return '';
    return p.name;
  }

  /** The floor a structure stands on: the lowest of its tiles' open neighbours (a gate on its passage, a segment on the bank). */
  private floorOf(p: Placement): number {
    const b = this.b.board;
    const f = this.f.hold?.forts[p.fort!];
    if (!f) return b.tiles[p.front].h;
    if (f.spec.kind === 'palisade' || f.spec.kind === 'drum') return b.tiles[p.front].h;
    return f.spec.floor;
  }

  private topOf(t: Tile, land: LandArt): HTMLImageElement {
    if (t.ground === 'deep' || t.ground === 'water') return art!.water;
    if (t.bridge) return art!.planks;
    if (t.paved || t.h >= 7) return land.high;
    return land.tops[t.deco % land.tops.length];
  }

  private diamond(g: CanvasRenderingContext2D, u: number, v: number, h: number, fill: string): void {
    const [x, y] = rawAt(u, v, h);
    g.fillStyle = fill;
    g.beginPath();
    g.moveTo(x, y - TH / 2);
    g.lineTo(x + TW / 2, y);
    g.lineTo(x, y + TH / 2);
    g.lineTo(x - TW / 2, y);
    g.closePath();
    g.fill();
  }

  /** The tall thing on a tile, if any: a boulder, a bush, a piece of palisade, a gate. */
  private propOf(t: Tile, i: number): Sprite | null {
    const a = art!;
    // (a set piece of the hold: its picture from the arenas' atlas)
    const pk = this.pieceAt.get(i);
    if (pk) {
      const pic = setPiece(pk as Parameters<typeof setPiece>[0], this.b.board.area);
      const tex = piece(pic.name);
      if (tex) {
        const s = new Sprite(tex);
        s.anchor.set(pic.ax ?? 0.5, pic.ay ?? 0.84);
        s.scale.set(pic.scale);
        return s;
      }
    }
    if (this.gateAt.has(i)) {
      const s = new Sprite(a.gate);
      s.anchor.set(0.5, 0.85);
      s.scale.set(0.8);
      s.label = `gate:${i}`;
      return s;
    }
    if (t.rock) {
      const set = this.landOf(i).boulders;
      const tex = set[t.deco % set.length];
      const s = new Sprite(tex);
      s.anchor.set(0.5, 0.8);
      s.scale.set(Math.min(56 / tex.width, 66 / tex.height));
      return s;
    }
    if (t.wall && this.f.zone[i] === 72) {
      // (a gate of the stone wall: the camp's gate, once for each pair of tiles)
      if (i % this.b.board.w % 2 || Math.floor(i / this.b.board.w) % 2) return null;
      const s = new Sprite(a.gate);
      s.anchor.set(0.5, 0.85);
      s.scale.set(0.8);
      s.label = `gate:${i}`;
      return s;
    }
    if (t.wall) {
      const s = new Sprite(a.walls[t.deco % a.walls.length]);
      s.anchor.set(0.5, 0.85);
      return s;
    }
    if (t.bush) {
      const s = new Sprite(a.bushes[t.deco % a.bushes.length]);
      s.anchor.set(0.5, 0.9);
      return s;
    }
    return null;
  }

  /** The whole field in one texture, for FAR: every tile's top, shaded by its height. */
  private bakeOverview(): void {
    const b = this.b.board;
    // (with the hold's art the overview takes in the land beyond too, hazing out, so Far shows no hard edge)
    const M = hold && this.mats ? SKIRT : 0;
    const [left] = rawAt(-0.5 - M, b.d - 0.5 + M, 0);
    const [right] = rawAt(b.w - 0.5 + M, -0.5 - M, 0);
    const [, topY] = rawAt(-0.5 - M, -0.5 - M, 12);
    const [, bottomY] = rawAt(b.w - 0.5 + M, b.d - 0.5 + M, -1);
    const S = OVERVIEW_W / (right - left);
    const canvas = document.createElement('canvas');
    canvas.width = OVERVIEW_W;
    canvas.height = Math.ceil((bottomY - topY) * S);
    const g = canvas.getContext('2d')!;
    if (M) {
      g.setTransform(S, 0, 0, S, -left * S, -topY * S);
      for (let v = -M; v < b.d + M; v++)
        for (let u = -M; u < b.w + M; u++) {
          const d = this.outside(u, v);
          if (!d) continue;
          const k = Math.min(1, (d / SKIRT) ** 1.1);
          const e = Math.max(0, Math.min(b.d - 1, v)) * b.w + Math.max(0, Math.min(b.w - 1, u));
          const wet = this.mats![e] === DEEP || this.mats![e] === MAT_SHALLOWS;
          const base = wet ? [52, 78, 92] : hashOf(u, v) < 0.12 + d * 0.05 ? [40, 58, 40] : [92, 104, 60];
          const c = base.map((x, j) => Math.round(x + (FOG_RGB[j] - x) * k));
          this.diamond(g, u, v, b.tiles[e].h, `rgb(${c.join(',')})`);
        }
    }
    for (let s = 0; s <= b.w + b.d - 2; s++)
      for (let u = Math.max(0, s - b.d + 1); u <= Math.min(b.w - 1, s); u++) {
        const v = s - u;
        const i = v * b.w + u;
        const t = b.tiles[i];
        const [x, y] = rawAt(u - 0.5, v - 0.5, t.h);
        const m = this.mats?.[i];
        if (hold && m !== undefined && m !== DEEP) {
          // (the hold's art: the tile's material, its own quarter of the texture)
          g.setTransform(((TW / 2) / 64) * S, ((TH / 2) / 64) * S, (-(TW / 2) / 64) * S, ((TH / 2) / 64) * S, (x - left) * S, (y - topY) * S);
          g.drawImage(hold.ground, (m % 4) * 256 + (u % 4) * 64, Math.floor(m / 4) * 256 + (v % 4) * 64, 64, 64, 0, 0, 64, 64);
        } else {
          const img = this.topOf(t, this.landOf(i));
          g.setTransform(((TW / 2) / img.width) * S, ((TH / 2) / img.width) * S, (-(TW / 2) / img.height) * S, ((TH / 2) / img.height) * S, (x - left) * S, (y - topY) * S);
          g.drawImage(img, 0, 0);
        }
        g.setTransform(S, 0, 0, S, -left * S, -topY * S);
        const shade = t.rock || t.wall ? 'rgba(40,30,20,0.55)' : t.ground === 'deep' ? 'rgba(20,50,120,0.45)' : `rgba(0,0,0,${Math.max(0, 0.25 - t.h * 0.03)})`;
        this.diamond(g, u, v, t.h, shade);
      }
    // (the hold's art: its landmarks shrunk onto the overview, so the field reads as places at Far)
    if (hold)
      for (const list of this.placed.values())
        for (const p of list) {
          const def = SPRITES[p.name];
          if (!def || p.low || (def.fp[0] * def.fp[1] < 4 && !BIG.has(p.name))) continue;
          const h = b.tiles[p.front].h;
          const [x, y] = rawAt(p.u, p.v, h);
          const k = (p.scale ?? 1) * (isKit(p.name) ? KIT_SCALE : 1) * S;
          g.setTransform(p.flip ? -k : k, 0, 0, k, (x - left) * S, (y - topY) * S);
          g.drawImage(hold.sprites, def.r[0], def.r[1], def.r[2], def.r[3], -def.foot[0], -def.foot[1], def.r[2], def.r[3]);
        }
    const texture = Texture.from(canvas);
    this.overview = new Sprite(texture);
    this.overview.position.set(left, topY);
    this.overview.scale.set(1 / S);
    this.farLayer.addChildAt(this.overview, 0);
  }

  /** A gate broken: its picture comes down, and its chunk will be baked again. */
  breach(tiles: readonly number[]): void {
    for (const i of tiles) this.brokenGates.add(i);
    this.retile(tiles);
  }

  /** Tiles changed (a breach, a barrel lifted): their chunks will be baked again. */
  retile(tiles: readonly number[]): void {
    const w = this.b.board.w;
    for (const i of tiles) {
      const key = Math.floor(Math.floor(i / w) / CHUNK) * 100 + Math.floor((i % w) / CHUNK);
      this.dropChunk(key);
    }
  }

  /** A blast on a tile (a volley's stone, a keg going off): fire and dust thrown up, then smoke. */
  blast(u: number, v: number, big: boolean): void {
    u = Math.round(u);
    v = Math.round(v);
    const h = this.b.board.tiles[v * this.b.board.w + u]?.h ?? 2;
    if (this.blasts.length > 12) this.blasts.shift()!.sp.forEach((x) => x.destroy());
    this.blasts.push({ u, v, h, start: this.simT, big, sp: [] });
  }

  private dropChunk(key: number): void {
    const c = this.chunks.get(key);
    this.live.delete(key);
    this.glows.delete(key);
    if (!c) return;
    c.sprite.texture.destroy(true);
    c.sprite.destroy();
    for (const p of c.props) p.destroy();
    this.chunks.delete(key);
  }

  // ----- each frame -----

  /** Draw the field for a camera looking at world (x, y) at `zoom`, on a screen `vw` x `vh` CSS pixels (Pixi's `app.screen`, not the
   *  canvas's device pixels). The camera's point is drawn halfway down `play`, the screen between the info panel and the buttons
   *  (`fieldCull.ts`). `simT` is the battle's time to draw (between ticks, for smooth steps). */
  update(cam: { x: number; y: number; zoom: number }, vw: number, vh: number, simT: number, events: readonly FieldEvent[], play?: PlayArea): void {
    this.frame++;
    this.detail = detailFor(cam.zoom, this.detail);
    const focus = focusOnScreen(vw, vh, play);
    this.root.scale.set(cam.zoom);
    this.root.position.set(focus[0] - cam.x * cam.zoom, focus[1] - cam.y * cam.zoom);
    const far = this.detail === 'far';
    this.chunkLayer.visible = !far;
    this.unitLayer.visible = !far;
    this.farLayer.visible = far;
    // the world rectangle in view, and a margin
    const view = viewRect(cam, vw, vh, focus);
    this.drawn = { chunks: 0, fighters: 0, props: 0, baked: 0, fx: 0, bakeMs: 0 };
    this.simT = simT;
    if (far) this.drawFar(simT, cam.zoom);
    else {
      this.drawSkirt(view);
      this.drawChunks(view);
      this.drawWorks(view);
      if (this.life) {
        const fires: [number, number][] = [];
        for (const key of this.wanted) for (const g of this.glows.get(key) ?? []) if (g.big && g.sp.visible) fires.push([g.sp.x, g.sp.y]);
        this.life.update(simT, view, fires, this.detail === 'near');
      }
      this.drawFighters(view, simT, events);
    }
  }

  /** The chunks the last frame wanted in view (keys cy * 100 + cx), for the bench and the screenshots' check. */
  wanted: number[] = [];

  /** The land beyond the hold (phase 1b): a ring of chunks of rolling heath and pines round the field, fading into the haze. */
  private drawSkirt(view: WorldRect): void {
    if (!hold || !this.mats) return;
    const b = this.b.board;
    const n = Math.ceil(b.w / CHUNK);
    let baked = 0;
    for (let cy = -1; cy <= n; cy++)
      for (let cx = -1; cx <= n; cx++) {
        if (cx >= 0 && cy >= 0 && cx < n && cy < n) continue;
        const key = (cy + 1) * 100 + cx + 1;
        // (the chunk's corners on the screen, at the land's height)
        const u0 = cx * CHUNK - 0.5;
        const v0 = cy * CHUNK - 0.5;
        const pts = [rawAt(u0, v0, 2), rawAt(u0 + CHUNK, v0, 2), rawAt(u0, v0 + CHUNK, 2), rawAt(u0 + CHUNK, v0 + CHUNK, 2)];
        const x0 = Math.min(...pts.map((p) => p[0]));
        const x1 = Math.max(...pts.map((p) => p[0]));
        const y0 = Math.min(...pts.map((p) => p[1])) - 80;
        const y1 = Math.max(...pts.map((p) => p[1]));
        const seen = x1 >= view.x0 && x0 <= view.x1 && y1 >= view.y0 && y0 <= view.y1;
        let sp = this.skirt.get(key);
        if (!seen) {
          if (sp) sp.visible = false;
          continue;
        }
        if (!sp) {
          if (baked >= 1) continue;
          sp = this.bakeSkirt(cx, cy);
          this.skirt.set(key, sp);
          this.skirtLayer.addChild(sp);
          baked++;
        }
        sp.visible = true;
      }
  }

  /** A sprite of the hold's atlas hazed by the distance (eighths of the haze), made once. */
  private haze = new Map<string, HTMLCanvasElement>();
  private hazed(name: string, eighths: number): HTMLCanvasElement {
    const key = `${name}:${eighths}`;
    let c = this.haze.get(key);
    if (c) return c;
    const def = SPRITES[name];
    c = document.createElement('canvas');
    c.width = def.r[2];
    c.height = def.r[3];
    const g = c.getContext('2d')!;
    g.drawImage(hold!.sprites, def.r[0], def.r[1], def.r[2], def.r[3], 0, 0, def.r[2], def.r[3]);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(${FOG_RGB.join(',')},${eighths / 8})`;
    g.fillRect(0, 0, c.width, c.height);
    this.haze.set(key, c);
    return c;
  }

  /** How far outside the hold a tile lies, in tiles (0 inside). */
  private outside(u: number, v: number): number {
    const b = this.b.board;
    return Math.max(0, -u, u - (b.w - 1), -v, v - (b.d - 1));
  }

  /** Bake one chunk of the land beyond: heath and grass, pines thickening outwards, all hazed by the distance from the hold. */
  private bakeSkirt(cx: number, cy: number): Sprite {
    const H = hold!;
    const u0 = cx * CHUNK;
    const v0 = cy * CHUNK;
    const [left] = rawAt(u0 - 0.5, v0 + CHUNK - 0.5, 0);
    const [right] = rawAt(u0 + CHUNK - 0.5, v0 - 0.5, 0);
    const [, top] = rawAt(u0 - 0.5, v0 - 0.5, 2);
    const [, bottom] = rawAt(u0 + CHUNK - 0.5, v0 + CHUNK - 0.5, 2);
    const S = SKIRT_RES;
    const pad = 90;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil((right - left) * S) + 2;
    canvas.height = Math.ceil((bottom - top + pad) * S) + 2;
    const g = canvas.getContext('2d')!;
    const ox = -left;
    const oy = -top + pad;
    const fog = (d: number) => Math.min(1, (d / SKIRT) ** 1.1);
    const pines = ['pine1', 'gnarledTree', 'pine1', 'burntTree'];
    for (let s = u0 + v0; s <= u0 + v0 + 2 * (CHUNK - 1); s++)
      for (let u = Math.max(u0, s - (v0 + CHUNK - 1)); u <= Math.min(u0 + CHUNK - 1, s - v0); u++) {
        const v = s - u;
        const d = this.outside(u, v);
        if (d <= 0 || d > SKIRT) continue;
        const k = fog(d);
        // (the edge's tile carried on: its height, and its water, so the river runs on into the haze)
        const b = this.b.board;
        const e = Math.max(0, Math.min(b.d - 1, v)) * b.w + Math.max(0, Math.min(b.w - 1, u));
        const h = b.tiles[e].h;
        const wet = this.mats![e] === DEEP || this.mats![e] === MAT_SHALLOWS;
        const n = noiseOf(u, v);
        const m = wet ? MAT_SHALLOWS : n < 0.3 ? 2 : n < 0.55 ? 0 : 1;
        const [x, y] = rawAt(u - 0.5, v - 0.5, h);
        g.setTransform(((TW / 2) / 64) * S, ((TH / 2) / 64) * S, (-(TW / 2) / 64) * S, ((TH / 2) / 64) * S, (x + ox) * S, (y + oy) * S);
        g.drawImage(H.ground, (m % 4) * 256 + (((u % 4) + 4) % 4) * 64, Math.floor(m / 4) * 256 + (((v % 4) + 4) % 4) * 64, 64, 64, 0, 0, 64, 64);
        // (the deep river running on, as the field's own deep water)
        if (wet && this.mats![e] === DEEP) {
          g.setTransform(S, 0, 0, S, ox * S, oy * S);
          this.diamond(g, u, v, h, 'rgba(18,56,88,0.38)');
        }
        g.setTransform(S, 0, 0, S, ox * S, oy * S);
        this.diamond(g, u, v, h, `rgba(${FOG_RGB.join(',')},${k})`);
        // (the trees: a few at the hold's edge, a forest further out; each as hazed as its tile)
        if (!wet && hashOf(u * 7 + 3, v * 13 + 1) < 0.12 + d * 0.05 && k < 0.95) {
          const name = pines[Math.floor(hashOf(v, u * 3) * pines.length)];
          const def = SPRITES[name];
          const [tx, ty] = rawAt(u + (hashOf(u, v) - 0.5) * 0.5, v + (hashOf(v, u) - 0.5) * 0.5, h);
          const sc = KIT_SCALE * (0.8 + hashOf(u + 5, v) * 0.4);
          g.setTransform(S * sc, 0, 0, S * sc, (tx + ox) * S - def.foot[0] * sc * S, (ty + oy) * S - def.foot[1] * sc * S);
          g.drawImage(this.hazed(name, Math.round(k * 8)), 0, 0);
        }
      }
    const sp = new Sprite(Texture.from(canvas));
    sp.position.set(left - 1 / S, top - pad - 1 / S);
    sp.scale.set(1 / S);
    return sp;
  }

  private drawChunks(view: WorldRect): void {
    const b = this.b.board;
    const want = chunksInView(view, b.w, b.d, this.heights);
    // (the nearest to the middle of the view first, so a pan fills in from the middle out)
    const mx = (view.x0 + view.x1) / 2;
    const my = (view.y0 + view.y1) / 2;
    const mid = (key: number) => {
      const [x, y] = rawAt((key % 100) * CHUNK + CHUNK / 2, Math.floor(key / 100) * CHUNK + CHUNK / 2, 2);
      return Math.abs(x - mx) + Math.abs(y - my);
    };
    want.sort((p, q) => mid(p) - mid(q));
    this.wanted = want;
    let baked = 0;
    let spent = 0;
    const bake = (key: number): Chunk => {
      const t0 = performance.now();
      const c = this.bakeChunk(key % 100, Math.floor(key / 100));
      spent += performance.now() - t0;
      this.chunks.set(key, c);
      baked++;
      return c;
    };
    const showing = new Set(want);
    let missing = false;
    for (const key of want) {
      let c = this.chunks.get(key);
      if (!c) {
        if (baked >= BAKES_A_FRAME || spent >= BAKE_BUDGET_MS) {
          missing = true;
          continue;
        }
        c = bake(key);
      }
      c.used = this.frame;
      if (!c.sprite.parent) this.chunkLayer.addChild(c.sprite);
      for (const l of this.live.get(key) ?? []) this.liveLook(l);
      // (the firelight flickers: two slow waves and a quick one, out of step light to light; steady for less motion)
      const steady = reducedMotion();
      for (const g of this.glows.get(key) ?? []) {
        const t = this.simT;
        const f = steady ? 0 : Math.sin(t * 0.011 + g.seed) * 0.5 + Math.sin(t * 0.027 + g.seed * 2.3) * 0.3 + Math.sin(t * 0.083 + g.seed * 5.1) * 0.2;
        g.sp.alpha = g.base * (0.85 + 0.15 * f);
        // (at Mid only the big fires glow: the many small lamps would only cost frames)
        g.sp.visible = this.detail === 'near' || g.big;
      }
      for (const p of c.props) {
        const gate = p.label?.startsWith('gate:') && this.brokenGates.has(Number(p.label.slice(5)));
        p.visible = !gate;
      }
      this.drawn.chunks++;
      this.drawn.props += c.props.length;
    }
    // (all in view baked and time to spare: one chunk of the ring round the view, baked ahead and left hidden till it is wanted)
    if (!missing && baked === 0 && this.chunks.size < CACHE - 4) {
      const m = CHUNK * TW;
      const ring = chunksInView({ x0: view.x0 - m, x1: view.x1 + m, y0: view.y0 - m / 2, y1: view.y1 + m / 2 }, b.w, b.d, this.heights)
        .filter((k) => !this.chunks.has(k))
        .sort((p, q) => mid(p) - mid(q));
      if (ring.length) {
        const c = bake(ring[0]);
        c.used = this.frame;
        for (const p of c.props) p.visible = false;
      }
    }
    this.drawn.baked = baked;
    this.drawn.bakeMs = spent;
    this.chunkLayer.sortableChildren = true;
    // (chunks out of view leave the scene; past the cache's size, the longest unused are let go)
    for (const [key, c] of this.chunks) {
      if (showing.has(key)) continue;
      if (c.sprite.parent) c.sprite.removeFromParent();
      for (const p of c.props) p.visible = false;
    }
    if (this.chunks.size > CACHE) {
      const idle = [...this.chunks].filter(([k]) => !showing.has(k)).sort((x, y) => x[1].used - y[1].used);
      for (const [key] of idle.slice(0, this.chunks.size - CACHE)) this.dropChunk(key);
    }
  }

  /** The firelight's texture: a warm radial glow, made once. */
  private glow(): Texture {
    if (this.glowTex) return this.glowTex;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,190,110,0.85)');
    r.addColorStop(0.35, 'rgba(255,140,60,0.35)');
    r.addColorStop(1, 'rgba(255,110,40,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    this.glowTex = Texture.from(c);
    return this.glowTex;
  }

  /** A piece that follows the battle: its state's picture, a drum's beat (a small squash), a hut's fire. */
  private liveLook(l: Live): void {
    const name = this.lookOf(l.p);
    const tex = holdTex(name);
    if (tex && l.sp.texture !== tex) {
      l.sp.texture = tex;
      this.footOn(l.sp, name, l.p);
    }
    if (name === 'drumStruck') {
      const k = (l.p.scale ?? 1);
      const beat = Math.max(0, Math.sin(this.simT / 140)) ** 6;
      l.sp.scale.set((l.p.flip ? -k : k) * (1 + beat * 0.04), k * (1 - beat * 0.05));
    }
  }

  /** The siege works that move (phase 1b): a fire over each burning hut, a ladder against the wall at each one up. Pooled; drawn at Near and Mid. */
  private drawWorks(view: WorldRect): void {
    const h = this.f.hold;
    const b = this.b.board;
    let nf = 0;
    let nl = 0;
    if (h && hold) {
      const flame = VFX.flameFire;
      const smoke = VFX.smokeDark;
      for (const hut of h.siege.huts) {
        if (hut.burning === undefined) continue;
        for (const [k, t] of hut.tiles.entries()) {
          const u = t % b.w;
          const v = Math.floor(t / b.w);
          const [x, y] = rawAt(u, v, b.tiles[t].h);
          if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) continue;
          for (const [set, dy, sc] of [[flame, -10, 1.6], [smoke, -46, 2.2]] as const) {
            if (!set?.length) continue;
            const sp = (this.fires[nf] ??= this.works.addChild(new Sprite()));
            sp.visible = true;
            sp.anchor.set(0.5, 1);
            sp.texture = set[Math.floor(this.simT / 90 + k * 2) % set.length];
            sp.position.set(x, y + dy);
            sp.scale.set(sc);
            sp.alpha = set === smoke ? 0.7 : 1;
            sp.zIndex = (u + v) * 10 + 8;
            this.unitLayer.addChild(sp);
            nf++;
          }
        }
      }
      const tex = holdTex('ladder');
      for (const l of h.siege.ladders) {
        if (!l.up || !tex) continue;
        const fu = l.foot % b.w;
        const fv = Math.floor(l.foot / b.w);
        const tu = l.top % b.w;
        const tv = Math.floor(l.top / b.w);
        const [x, y] = rawAt((fu + tu) / 2, (fv + tv) / 2, b.tiles[l.foot].h);
        if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) continue;
        const sp = (this.ladders[nl] ??= new Sprite(tex));
        sp.visible = true;
        // (the art leans to the upper right, onto a wall at -v; mirrored for a wall at -u)
        this.footOn(sp, 'ladder', { name: 'ladder', u: 0, v: 0, front: 0, flip: tu < fu || tv > fv, scale: 1.25 });
        sp.position.set(x, y);
        sp.zIndex = (fu + fv) * 10 + 6;
        this.unitLayer.addChild(sp);
        nl++;
      }
    }
    for (let i = nf; i < this.fires.length; i++) this.fires[i].visible = false;
    for (let i = nl; i < this.ladders.length; i++) this.ladders[i].visible = false;
    this.drawHeavy(view);
  }

  /** The heavy works (phase 2): the volley told (its nine tiles marked, pulsing, and the stone in the air from the trebuchet), the keg
   *  carried over its sapper's head or set and fizzing, and the blasts. */
  private drawHeavy(view: WorldRect): void {
    const h = this.f.hold;
    const b = this.b.board;
    const g = this.marks;
    g.clear();
    const steady = reducedMotion();
    const vol = h?.siege.volley;
    if (vol) {
      const left = Math.max(0, vol.lands - this.simT);
      const p = 1 - left / VOLLEY_TELL_MS;
      const pulse = steady ? 0.7 : 0.55 + 0.45 * Math.abs(Math.sin(this.simT / (120 - 70 * p)));
      for (let dv = -1; dv <= 1; dv++)
        for (let du = -1; du <= 1; du++) {
          const u = vol.u + du;
          const v = vol.v + dv;
          if (u < 0 || v < 0 || u >= b.w || v >= b.d) continue;
          const [x, y] = rawAt(u, v, b.tiles[v * b.w + u].h);
          const k = du || dv ? 0.92 : 0.8;
          g.poly([x, y - (TH / 2) * k, x + (TW / 2) * k, y, x, y + (TH / 2) * k, x - (TW / 2) * k, y]);
          g.fill({ color: 0xc8361e, alpha: 0.3 + 0.25 * p * pulse }).stroke({ width: 3, color: 0xffc060, alpha: pulse });
        }
      // (the stone: from the trebuchet at the park, high over the field, down on the middle tile)
      const park = h!.bp.park;
      const [x0, y0] = rawAt(park.u, park.v, b.tiles[park.v * b.w + park.u].h);
      const [x1, y1] = rawAt(vol.u, vol.v, b.tiles[vol.v * b.w + vol.u].h);
      const tex = holdTex('boulders');
      if (tex) {
        const st = (this.stone ??= this.works.addChild(new Sprite(tex)));
        st.anchor.set(0.5, 0.5);
        st.scale.set(0.35);
        const arc = Math.min(900, Math.hypot(x1 - x0, y1 - y0) * 0.6);
        st.position.set(x0 + (x1 - x0) * p, y0 - 60 + (y1 - y0 + 60) * p - arc * 4 * p * (1 - p));
        st.rotation = steady ? 0 : this.simT / 160;
        st.visible = true;
        st.zIndex = 99999;
        this.unitLayer.addChild(st);
      }
    } else if (this.stone) this.stone.visible = false;
    // (the keg: over the carrier's head, or set at the foot of the wall with its fuse burning)
    const k = h?.siege.keg;
    const ktex = holdTex('barrels');
    let showKeg = false;
    let showFuse = false;
    if (k && ktex) {
      const ks = (this.keg ??= new Sprite(ktex));
      let at: [number, number, number] | null = null;
      if (k.at !== undefined) {
        const u = k.at % b.w;
        const v = Math.floor(k.at / b.w);
        const [x, y] = rawAt(u, v, b.tiles[k.at].h);
        at = [x, y, (u + v) * 10 + 7];
      } else {
        const pl = h!.platoons[k.platoon];
        const lead = [this.f.byId[pl.heroId], ...pl.soldiers.map((x) => this.f.byId[x.id])].find((x) => x?.alive);
        if (lead) {
          const [x, y, depth] = this.placeOf(lead, this.simT);
          at = [x, y - 40, depth + 1];
        }
      }
      if (at && at[0] >= view.x0 && at[0] <= view.x1 && at[1] >= view.y0 && at[1] <= view.y1) {
        this.footOn(ks, 'barrels', { name: 'barrels', u: 0, v: 0, front: 0, scale: k.at !== undefined ? 0.5 : 0.38 });
        ks.position.set(at[0], at[1]);
        ks.zIndex = at[2];
        this.unitLayer.addChild(ks);
        showKeg = true;
        if (k.lit !== undefined && VFX.sparkleFire?.length) {
          const fs = (this.fuse ??= new Sprite());
          fs.anchor.set(0.5, 1);
          fs.texture = VFX.sparkleFire[Math.floor(this.simT / 70) % VFX.sparkleFire.length];
          // (the fuse burns faster as it runs out)
          const left = Math.max(0, k.lit - this.simT);
          fs.scale.set(1.1 + (steady ? 0 : 0.4 * Math.abs(Math.sin(this.simT / (60 + left / 40)))));
          fs.position.set(at[0] + 6, at[1] - 24);
          fs.zIndex = at[2] + 1;
          this.unitLayer.addChild(fs);
          showFuse = true;
        }
      }
    }
    if (this.keg) this.keg.visible = showKeg;
    if (this.fuse) this.fuse.visible = showFuse;
    // (the blasts: fire thrown up, dust round it, smoke rising after)
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const e = this.blasts[i];
      const age = this.simT - e.start;
      const life = e.big ? 1600 : 1100;
      if (age > life || age < 0) {
        e.sp.forEach((x) => x.destroy());
        this.blasts.splice(i, 1);
        continue;
      }
      const [x, y] = rawAt(e.u, e.v, e.h);
      const sets = [VFX.puffFire, VFX.puffSand, VFX.smokeDark] as const;
      sets.forEach((set, n) => {
        if (!set?.length) return;
        const sp = (e.sp[n] ??= new Sprite());
        const p = Math.min(1, age / (life * (n === 2 ? 1 : 0.55)));
        sp.visible = p < 1;
        if (!sp.visible) return;
        sp.anchor.set(0.5, 0.8);
        sp.texture = set[Math.min(set.length - 1, Math.floor(p * set.length))];
        const k = (e.big ? 1.4 : 1) * (n === 0 ? 3.2 : n === 1 ? 4.4 : 3) * (0.7 + 0.5 * p);
        sp.scale.set(k);
        sp.alpha = n === 2 ? 0.75 * (1 - p) : 1 - p * 0.6;
        sp.position.set(x, y - (n === 2 ? 30 + 50 * p : 0));
        sp.zIndex = (e.u + e.v) * 10 + 9 + n;
        this.unitLayer.addChild(sp);
      });
    }
  }

  private simT = 0;

  private drawFighters(view: WorldRect, simT: number, events: readonly FieldEvent[]): void {
    const f = this.f;
    const mid = this.detail === 'mid';
    const seen = new Set<number>();
    for (const x of this.b.units) {
      // (the fallen lie a moment, then are gone)
      if (!x.alive && simT - (x.diedAt ?? 0) > 1200) continue;
      const [px, py, depth] = this.placeOf(x, simT);
      if (px < view.x0 || px > view.x1 || py < view.y0 || py > view.y1) continue;
      seen.add(x.id);
      let s = this.sprites.get(x.id);
      if (!s) {
        s = this.pool.pop() ?? { body: new Sprite(), ring: new Sprite() };
        s.body.anchor.set(0.5, 1);
        s.ring.anchor.set(0.5, 0.5);
        this.unitLayer.addChild(s.ring, s.body);
        this.sprites.set(x.id, s);
      }
      // (the ram: the hold's picture of it, rolling, mirrored to its way; a red tint as it is struck)
      if (x.def === 'siegeRam') {
        const tex = holdTex('ram');
        if (tex) {
          s.body.texture = tex;
          this.footOn(s.body, 'ram', { name: 'ram', u: 0, v: 0, front: 0, flip: x.facing === 0 || x.facing === 3, scale: 0.85 });
          s.body.position.set(px, py + 2 + (x.step && simT < x.step.at + x.step.ms ? Math.sin(simT / 60) : 0));
          s.body.zIndex = depth + 5;
          s.body.visible = true;
          s.body.alpha = x.alive ? 1 : Math.max(0, 1 - (simT - (x.diedAt ?? 0)) / 1200);
          s.body.tint = x.alive && x.hurtAt !== undefined && simT - x.hurtAt < 120 ? 0xff9a9a : 0xffffff;
          s.ring.visible = false;
          this.drawn.fighters++;
          continue;
        }
      }
      // (a fighter a skill called up has no place in the field's lists: its own kind's numbers and sheet)
      const info = f.info[x.id] ?? { def: UNITS[x.def], sheet: UNITS[x.def].sheet, role: 'leader' as const, group: -1, slot: 0 };
      const [anim, ms] = this.animOf(x, simT);
      const frames = framesOf(info.sheet, anim);
      // (a sheet not loaded: nothing to draw for it)
      if (!frames?.length) {
        seen.delete(x.id);
        s.body.visible = false;
        s.ring.visible = false;
        continue;
      }
      s.body.visible = true;
      const per = anim === 'dead' ? 120 : anim === 'attack' ? Math.max(60, (x.swing?.ms ?? 500) / frames.length) : 110;
      const k = anim === 'dead' ? Math.min(frames.length - 1, Math.floor(ms / per)) : Math.floor(ms / per) % frames.length;
      s.body.texture = frames[k];
      // (heroes stand a head taller than their soldiers; the foes by their kind)
      // (a little larger at Mid, so the fighters still read when the camera is out)
      const tall = (info.role === 'leader' && x.side === 'hero' ? 66 : x.side === 'hero' ? 50 : info.def.id === 'orcBrute' || info.def.id === 'orcWarlord' ? 62 : 52) * (mid ? 1.2 : 1);
      const scale = tall / figureOf(info.sheet);
      const flip = facesRight(x.facing) !== facesRightOf(info.sheet);
      s.body.scale.set(flip ? -scale : scale, scale);
      s.body.position.set(px, py + 6);
      s.body.zIndex = depth + 5;
      s.body.tint = x.alive && x.hurtAt !== undefined && simT - x.hurtAt < 120 ? 0xff9a9a : 0xffffff;
      s.body.alpha = x.alive ? 1 : Math.max(0, 1 - (simT - (x.diedAt ?? 0)) / 1200);
      // (the chosen platoon's rings are gold; an Elite soldier's a darker gold, its glint at Near)
      s.ring.texture = x.side !== 'hero' ? (mid ? this.rings.foeMid : this.rings.foe) : info.group >= 0 && info.group === this.chosen ? this.rings.chosen : !mid && this.eliteOf(x.id) ? this.rings.elite : mid ? this.rings.heroMid : this.rings.hero;
      s.ring.position.set(px, py + 2);
      s.ring.zIndex = depth + 3;
      s.ring.visible = x.alive;
      this.drawn.fighters++;
    }
    // (at Mid, our platoons' pennants: a blue flag over each hero, or its acting soldier, with the platoon's count)
    let np = 0;
    const h = this.f.hold;
    if (mid && h)
      for (const pl of h.platoons) {
        const lead = [pl.heroId, ...pl.soldiers.map((x) => x.id)].map((id) => f.byId[id]).find((x) => x?.alive);
        if (!lead) continue;
        const [px, py] = this.placeOf(lead, simT);
        if (px < view.x0 || px > view.x1 || py < view.y0 || py > view.y1) continue;
        let pn = this.pennants[np];
        if (!pn) {
          const c = new Container();
          const flag = new Graphics().rect(-2, -150, 4, 150).fill(0x2a2116).poly([2, -150, 74, -128, 2, -106]).fill(0x2f6fd0).stroke({ width: 4, color: 0xf2dc9f });
          const t = new Text({ text: '', style: { fontFamily: 'Alegreya Sans, sans-serif', fontSize: 30, fontWeight: '700', fill: 0xffffff, stroke: { color: 0x000000, width: 6 } } });
          t.anchor.set(0.5);
          t.position.set(30, -128);
          c.addChild(flag, t);
          this.unitLayer.addChild(c);
          pn = { c, t };
          this.pennants.push(pn);
        }
        pn.c.visible = true;
        pn.c.position.set(px, py - 40);
        pn.c.scale.set(pl.group === this.chosen ? 0.75 : 0.6);
        pn.c.zIndex = 1e6 - 1;
        pn.t.text = String(pl.soldiers.filter((x) => f.byId[x.id]?.alive).length + (f.byId[pl.heroId]?.alive ? 1 : 0));
        np++;
      }
    for (let i = np; i < this.pennants.length; i++) this.pennants[i].c.visible = false;
    for (const [id, s] of this.sprites) {
      if (seen.has(id)) continue;
      s.body.removeFromParent();
      s.ring.removeFromParent();
      this.sprites.delete(id);
      this.pool.push(s);
    }
    // the effects (NEAR only): a spark on each hit in view, an arrow for each shot
    if (!mid)
      for (const e of events) {
        if (this.fxLive.length >= FX_POOL) break;
        if (e.kind === 'hit') {
          const to = f.byId[e.to];
          const [x, y] = this.placeOf(to, simT);
          if (x < view.x0 || x > view.x1 || y < view.y0 || y > view.y1) continue;
          this.addFx('spark', simT, 260, [x, y - 26]);
        } else if (e.kind === 'blow' && e.shot) {
          const by = f.byId[e.by];
          const to = f.byId[e.to];
          const a = this.placeOf(by, simT);
          const z = this.placeOf(to, simT);
          if (a[0] < view.x0 || a[0] > view.x1 || a[1] < view.y0 || a[1] > view.y1) continue;
          this.addFx('arrow', simT, 300, [a[0], a[1] - 30], [z[0], z[1] - 26]);
        }
      }
    for (let i = this.fxLive.length - 1; i >= 0; i--) {
      const e = this.fxLive[i];
      const p = (simT - e.start) / (e.until - e.start);
      if (p >= 1 || mid) {
        e.sp.removeFromParent();
        this.fxPool.push(e.sp);
        this.fxLive.splice(i, 1);
        continue;
      }
      if (e.kind === 'spark') e.sp.texture = art!.sparks[Math.min(6, Math.floor(p * 7))];
      else {
        const [x0, y0] = e.from!;
        const [x1, y1] = e.to!;
        e.sp.position.set(x0 + (x1 - x0) * p, y0 + (y1 - y0) * p - 40 * p * (1 - p) * 4);
        e.sp.rotation = Math.atan2(y1 - y0, x1 - x0);
      }
      this.drawn.fx++;
    }
  }

  /** Whether a soldier of ours is an Elite (6 marks or more). */
  private eliteOf(id: number): boolean {
    const h = this.b.field?.hold;
    if (!h) return false;
    for (const p of h.platoons) for (const x of p.soldiers) if (x.id === id) return rankOf(x.marks).rank === 'elite';
    return false;
  }

  private addFx(kind: 'spark' | 'arrow', simT: number, ms: number, at: [number, number], to?: [number, number]): void {
    const sp = this.fxPool.pop() ?? new Sprite();
    sp.anchor.set(0.5);
    sp.rotation = 0;
    sp.texture = kind === 'spark' ? art!.sparks[0] : art!.arrow;
    sp.scale.set(kind === 'spark' ? 0.9 : 0.5);
    sp.position.set(at[0], at[1]);
    sp.zIndex = 1e6;
    this.unitLayer.addChild(sp);
    this.fxLive.push({ sp, start: simT, until: simT + ms, kind, from: at, to });
  }

  /** Where a fighter is drawn at time `simT` (between the tiles of a step under way), and its depth. */
  private placeOf(x: Unit, simT: number): [number, number, number] {
    const b = this.b.board;
    const h = b.tiles[x.v * b.w + x.u].h;
    let u = x.u;
    let v = x.v;
    let hh = h;
    if (x.step && simT < x.step.at + x.step.ms) {
      const p = Math.max(0, (simT - x.step.at) / x.step.ms);
      u = x.step.u + (x.u - x.step.u) * p;
      v = x.step.v + (x.v - x.step.v) * p;
      hh = x.step.h + (h - x.step.h) * p;
    }
    const [px, py] = rawAt(u, v, hh);
    return [px, py, Math.round((u + v) * 10)];
  }

  private animOf(x: Unit, simT: number): [Anim, number] {
    if (!x.alive) return ['dead', simT - (x.diedAt ?? simT)];
    if (x.swing && simT < x.swing.at + x.swing.ms) return ['attack', simT - x.swing.at];
    if (x.step && simT < x.step.at + x.step.ms) return ['walk', simT];
    if (x.hurtAt !== undefined && simT - x.hurtAt < 200) return ['hurt', simT - x.hurtAt];
    return ['idle', simT + x.id * 37];
  }

  /** FAR: the overview, a dot for each fighter, a banner with its count over each platoon and each post still standing. */
  private drawFar(simT: number, zoom: number): void {
    const f = this.f;
    const g = this.dots;
    g.clear();
    for (const x of this.b.units) {
      if (!x.alive) continue;
      const [px, py] = this.placeOf(x, simT);
      // (a dot three screen pixels across, whatever the zoom)
      const r = 1.5 / zoom;
      g.rect(px - r, py - r, 2 * r, 2 * r).fill({ color: x.side === 'hero' ? 0x6ab8ff : 0xff5a4a });
    }
    let n = 0;
    for (const grp of f.groups) {
      const living = grp.members.filter((id) => f.byId[id].alive);
      if (!living.length || (grp.side === 'foe' && !grp.awake && grp.members.length < 4)) continue;
      const lead = f.byId[living[0]];
      const [px, py] = this.placeOf(lead, simT);
      let t = this.banners[n];
      if (!t) {
        t = new Text({ text: '', style: { fontFamily: 'Alegreya Sans, sans-serif', fontSize: 120, fontWeight: '700', fill: 0xffffff, stroke: { color: 0x000000, width: 14 } } });
        t.anchor.set(0.5, 1);
        this.banners.push(t);
        this.farLayer.addChild(t);
      }
      t.visible = true;
      t.text = String(living.length);
      t.style.fill = grp.side === 'hero' ? 0x9ad0ff : 0xffb0a0;
      t.position.set(px, py - 4 / zoom);
      // (the count about fourteen screen pixels tall, whatever the zoom)
      t.scale.set(14 / 120 / zoom);
      n++;
    }
    for (let i = n; i < this.banners.length; i++) this.banners[i].visible = false;
    this.drawn.fighters = this.b.units.filter((x) => x.alive).length;
  }

  /** The world's middle and size, for fitting the camera. */
  bounds(): { x0: number; x1: number; y0: number; y1: number } {
    const b = this.b.board;
    return { x0: rawAt(-0.5, b.d - 0.5, 0)[0], x1: rawAt(b.w - 0.5, -0.5, 0)[0], y0: rawAt(-0.5, -0.5, 10)[1], y1: rawAt(b.w - 0.5, b.d - 0.5, 0)[1] };
  }

  destroy(): void {
    for (const key of [...this.chunks.keys()]) this.dropChunk(key);
    this.root.destroy({ children: true });
  }
}
