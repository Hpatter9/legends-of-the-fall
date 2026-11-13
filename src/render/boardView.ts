// The board drawn: each tile a column, its top a detailed grass (cracked flagstones on the high ground) laid onto the
// diamond, its two sides the dark rock face of the Undead tileset, down to a common foot. Boulders and bushes are the
// Fields tileset's own. The column sprite is drawn as in Chronos's raid board (tacticsView.ts
// `column`).

import { diagStep, diagTimed } from '../diag';
import { SOFT } from './softCanvas';
import { COLUMN_ROOM, WARM, warmMore } from './boardWarmRules';
import { Container, Graphics, Rectangle, Sprite, Texture, type Renderer } from 'pixi.js';
import { LAVA_LANDS, tileAt, type Area, type Board, type HazardKind, type Tile } from '../sim/board';
import { loadImage } from './loadImage';
import { ColumnTextures, columnKey, type ColumnLease } from './columnTextures';
import { depthIn, FOOT, HH, project, rawAt, TH, TW, type Frame } from './iso';
import { footDims, liesBehind, type Rot } from '../sim/turn';
import { AREA_URLS, BUSH_URLS, GROUND_URLS } from './areaArt';
import { TERRAIN_URLS } from './terrainArt';
import { LIT_PROPS } from './weatherRules';
import { birdOf, fallFrames, FALL_FRAMES, flairOf, flowFrames, FLOW_FRAMES, glow, growthOf, loadRoadArt, piece, sceneryPictures, setPiece, type Pic } from './roadArt';
import { loadLifeArt } from './boardLife';
import { darkTint, dressingOf, rimOf, torchLight, wallStuds, WALL_STUDS, puddleOn, RIMS, wallTorches, type RimPiece } from './landRimRules';
import { holdPiece, holdSpritesReady, loadHoldSprites } from './holdSprites';
import { settings } from '../settings';
import { sceneDepth } from '../sim/armyRoad';
import { mixSeed } from '../sim/rng';
import { fadeTall, loadZoneArt, noMotion, runeFrames, totemFrames, ZoneAir, zoneProps, type ZoneMotion } from './zoneLife';
import { propCell, RISK_RIM, TRAP_LOOKS, trapCell } from './trapLooks';
import { hasTrapArt, loadTrapArt, TRAP_ART_SCALE, trapTexture } from './trapArt';
import { HAZARD_LOOKS } from './hazardLooks';
import { flicker, sway } from './ambient';
import { faceOf, FACE_NAMES, FLOORS, floorRoles, fringesOf, pathOf, ROLES, seamsOf, slotOf, type Fringe, type Role } from './floorRules';
import { floorArt, gradedGround, loadFloorArt, type FloorArt } from './floorArt';
import { turnTile } from '../sim/turn';
import gateUrl from '../art/camp/gate.png';
import towerUrl from '../art/camp/tower.png';
// (the duel's ring of standing stones, cut from art-source/expansion/duel-ring.png by tools/expansion/duel-ring.py)
import ringStonesUrl from '../art/duel/ring-stones.png';
import RING_STONES from '../art/duel/ring-stones.json';

/** From this height up, a tile's top is stony. */
const STONY = 3;
/** How many steps of an army road's column are drawn below its top (they fade out past the first two). */
const ROAD_SKIRT = 5;

/** A tile's mark; `merge` is a hero on the field with a match ready to merge (MERGE-TWO). */
type Mark = 'deploy' | 'hover' | 'bad' | 'chosen' | 'merge' | 'twin' | null;
const MARK_COLOUR: Record<Exclude<Mark, null>, [number, number]> = {
  deploy: [0x4a9cff, 0.28],
  hover: [0xffe066, 0.5],
  bad: [0xff4a4a, 0.4],
  chosen: [0x6dff8a, 0.45],
  merge: [0xffb43a, 0.6],
  // (ONE-OF-EACH: the hero of a kind already on the field, where a copy held may swap in)
  twin: [0xff8ad8, 0.55],
};

/** A duel's ring (phase 4): a light gilt on its tiles, a brass line round its edge's. */
const RING_GILT = 0xe8c770;
const RING_BRASS = 0xc9a24a;

/** The colour of the lip at the edge of a tile's top: grass-like, then stony. */
const LIP: Record<Area, [string, string]> = {
  highlands: ['#7e9a48', '#a39e94'],
  forest: ['#3f7a40', '#8a9484'],
  snow: ['#dfe9f6', '#c4d6ee'],
  desert: ['#d9b878', '#e2c690'],
  volcano: ['#4a3430', '#6a5450'],
  dungeon: ['#585874', '#7c7c98'],
  plains: ['#6ea23c', '#a4ac84'],
  autumn: ['#b0641e', '#a08a74'],
  swamp: ['#2c5a40', '#667a68'],
  graveyard: ['#3c4a42', '#6e7690'],
  ruins: ['#948462', '#a8a08c'],
  temple: ['#3a7a48', '#d2c28e'],
  crystal: ['#3c3c92', '#7c8cd0'],
  forge: ['#463630', '#807672'],
  shrine: ['#4a3678', '#8c80a6'],
  warcamp: ['#6e6230', '#8c7258'],
  oasis: ['#64aa50', '#e4cc9a'],
};

/** The lip of a boss arena's tiles. */
const BOSS_LIP = '#c9a24a';
/** Where the baked sections sit among the host's tiles and the fighters: those nearer the screen than the host in front of
 *  all of them, under the effects; those further off (the road can turn back up the screen) behind all of them. */
const SCENERY_Z = 5000;
const SCENERY_BACK_Z = -100000;

/** The rim drawn round each kind of ground. */
const RIM = { water: 'rgba(120,190,255,0.9)', deep: 'rgba(40,90,180,0.95)', ice: 'rgba(210,245,255,0.95)', lava: 'rgba(255,150,40,0.95)', tall: 'rgba(30,70,20,0.6)', shrine: 'rgba(140,255,225,0.95)', coals: 'rgba(255,100,30,0.95)' };
/** The rim round a bridge's planks. */
const BRIDGE_RIM = 'rgba(44,26,12,0.9)';

/** The ground textures' side (they are laid onto the diamond whole). */
const SRC = 64;

interface AreaArt {
  tops: HTMLImageElement[];
  high: HTMLImageElement;
  side: HTMLImageElement;
  boulders: Texture[];
  tall: Texture[];
}
interface Art {
  areas: Record<Area, AreaArt>;
  water: HTMLImageElement;
  ice: HTMLImageElement;
  lava: HTMLImageElement;
  bushes: Texture[];
  barrel: Texture;
  walls: Texture[];
  crystal: Texture;
  planks: HTMLImageElement;
  gate: Texture;
  tower: Texture;
  /** The duel ring's standing stones, each with where its foot stands from the ring's middle (in tiles). */
  stones: { tex: Texture; fx: number; fy: number; du: number; dv: number }[];
}
let art: Art | null = null;
let artEpoch = 0;

export async function loadBoardArt(): Promise<void> {
  const all = (urls: string[]) => Promise.all(urls.map(loadImage));
  const areas = {} as Record<Area, AreaArt>;
  await Promise.all(
    (Object.keys(AREA_URLS) as Area[]).map(async (a) => {
      const u = AREA_URLS[a];
      const [tops, high, side, boulders, tall] = await Promise.all([all(u.tops), loadImage(u.high), loadImage(u.side), all(u.boulders), all(u.tall)]);
      areas[a] = { tops, high, side, boulders: boulders.map((i) => Texture.from(i)), tall: tall.map((i) => Texture.from(i)) };
    }),
  );
  const [water, ice, lava] = await Promise.all([loadImage(GROUND_URLS.water), loadImage(GROUND_URLS.ice), loadImage(GROUND_URLS.lava)]);
  const bushes = (await all(BUSH_URLS)).map((i) => Texture.from(i));
  const [barrel, crystal, planks] = await Promise.all([loadImage(TERRAIN_URLS.barrel), loadImage(TERRAIN_URLS.crystal), loadImage(TERRAIN_URLS.planks)]);
  const walls = (await all(TERRAIN_URLS.walls)).map((i) => Texture.from(i));
  const [gate, tower, ringStones] = await all([gateUrl, towerUrl, ringStonesUrl]);
  const stoneSheet = Texture.from(ringStones);
  const stones = RING_STONES.map((s) => ({ tex: new Texture({ source: stoneSheet.source, frame: new Rectangle(s.x, s.y, s.w, s.h) }), fx: s.fx, fy: s.fy, du: s.du, dv: s.dv }));
  await Promise.all([loadRoadArt(), loadZoneArt(), loadTrapArt(), loadLifeArt()]);
  artEpoch++;
  art = { areas, water, ice, lava, bushes, barrel: Texture.from(barrel), walls, crystal: Texture.from(crystal), planks, gate: Texture.from(gate), tower: Texture.from(tower), stones };
}

/** One section's tiles, built: a container for each tile (in row order), the marks over them, and the column textures made for them. */
interface Built {
  landmark: Container | null;
  tiles: Container[];
  marks: Graphics[];
  /** The Nemesis War, phase 4: each tile's layer for a duel's ring (`ring`), over its mark. */
  rings: Graphics[];
  /** Each tile's ground (FIXES-4): an empty layer just over its top and its mark, under its props and every fighter, where the effects lay
   *  their tile marks (a boss's windup, a hazard's tell, a burning ground), so a fighter standing in one shows over it. */
  grounds: Container[];
  tex: ColumnLease<Texture>[];
  /** LIVING-FIELDS: each column's sprite painted again (when its land's floor sheet arrives, or a tile's ground changes). */
  redo: (() => void)[];
  /** The powder barrels still standing (by tile index), so a blast can take one away. */
  barrels: Map<number, Sprite>;
  /** LIVING-FIELDS: what stands on a trap's tile (brambles, a totem, a ward's rune, a brazier and its light), so it goes when the trap does. */
  traps: Map<number, { made: Container[]; again: () => Container[] }>;
  /** What moves on its own (an army's road): swaying growth, flickering lights, running water, falls. */
  live: Live;
  /** A Calamity zone's things that move (`zoneLife.ts`). */
  zone: ZoneMotion;
}
/** The living land's moving parts on a section (looks only): each is a sprite made once and only moved or re-framed each frame. */
interface Live {
  sway: { sp: Sprite; ph: number; amp: number }[];
  lights: { sp: Sprite; ph: number; base: number; kind?: 'torch' | 'lava' | 'magic' }[];
  loops: { sp: Sprite; frames: Texture[]; ph: number; ms: number }[];
  /** ALIVE: still water's light, drifting and shimmering over the tile (where it lies at rest, and its phase). */
  ripples: { sp: Sprite; x: number; ph: number }[];
  /** LAND-IDENTITY: things that hang in the air and drift a little (mist over water, a will-o'-wisp). */
  drift: { sp: Sprite; x: number; y: number; ph: number }[];
}
const noLive = (): Live => ({ sway: [], lights: [], loops: [], ripples: [], drift: [] });

/** ALIVE: the light on still water: a few pale arcs inside the tile's diamond (one picture, made once, shared by every tile). */
let rippleTex: Texture | null = null;
function rippleOf(): Texture {
  if (rippleTex) return rippleTex;
  const c = document.createElement('canvas');
  c.width = TW;
  c.height = TH;
  const g = c.getContext('2d', SOFT)!;
  g.strokeStyle = 'rgba(235,248,255,0.85)';
  g.lineWidth = 1;
  for (const [x, y, w] of [[0.3, 0.42, 6], [0.62, 0.32, 5], [0.5, 0.62, 7], [0.72, 0.56, 4], [0.36, 0.7, 4]] as const) {
    g.beginPath();
    g.moveTo(TW * x - w, TH * y);
    g.quadraticCurveTo(TW * x, TH * y - 2, TW * x + w, TH * y);
    g.stroke();
  }
  return (rippleTex = Texture.from(c));
}
/** LIVING-FIELDS: one small canvas, used over and over, where a neighbour's ground is cut to a ragged edge before it is laid on a tile. */
let scratchCanvas: HTMLCanvasElement | null = null;
function scratch(): HTMLCanvasElement {
  if (!scratchCanvas) {
    scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = scratchCanvas.height = SRC;
  }
  return scratchCanvas;
}

/** A finished section baked into one texture, and where its top left lies against the section's own origin. */
interface Baked {
  tex: Texture;
  x: number;
  y: number;
}
/** LIVING-FIELDS: what a tile's top and faces are painted from (`floorRules.ts`): its ground's role, the ragged edges its neighbours lay
 *  over it, which of its sides show a line, and where it lies on the screen's grid (the textures run on from tile to tile by it). */
interface FloorTile {
  role: Role;
  fringes: Fringe[];
  seams: boolean[];
  U: number;
  V: number;
  /** LAND-IDENTITY: the land's own colour laid over this tile's liquid (the mire's murky green over its rim water), and a puddle
   *  standing on it (a wet land's lowest ground). Looks only. */
  tone?: string;
  puddle?: boolean;
}
const mod4 = (n: number) => ((Math.round(n) % 4) + 4) % 4;

/** What a section looks like beyond its board: a boss arena is drawn on flagstones with a gilded lip and a deeper plinth. */
export interface Look {
  boss?: boolean;
}
/** A section of the long map as the view needs it. */
export interface Scene {
  board: Board;
  look: Look;
  /** How many quarter turns it lies, and where its footprint's corner lies against the host's, in world tiles. */
  rot: Rot;
  ou: number;
  ov: number;
}

/** Stand a picture on a tile (its foot at the tile's middle, moved by its offset); note it if it sways or gives light. */
function addPic(tile: Container, p: Pic, x: number, y: number, live: Live): void {
  const tex = piece(p.name);
  if (!tex) return;
  const r = new Sprite(tex);
  r.anchor.set(p.ax ?? 0.5, p.ay ?? 0.88);
  r.scale.set(p.flip ? -p.scale : p.scale, p.scale);
  r.position.set(x + p.dx, y + p.dy);
  tile.addChild(r);
  const ph = (x * 0.071 + y * 0.113) % (Math.PI * 2);
  // (taller growth sways less at the foot, the same at the top: a skew about the foot)
  if (p.sway) live.sway.push({ sp: r, ph, amp: 0.035 });
  if (p.light) {
    const g = new Sprite(glow());
    g.anchor.set(0.5);
    g.tint = p.light.colour;
    g.blendMode = 'add';
    g.position.set(x + p.dx, y + p.dy - p.light.y * p.scale);
    g.alpha = 0.55;
    tile.addChild(g);
    live.lights.push({ sp: g, ph, base: 0.55 });
  }
}

/** The most baked sections kept at once (a long map is fifteen). */
const BAKED_MAX = 20;

export class BoardView {
  readonly root = new Container();
  // (WAVE-DELAY: room for the board fought on, the one before it and the next: a board built a second time (the march, then the
  // fight) or baked into the scenery finds its columns still here, and is not painted again)
  private columns = new ColumnTextures<Texture>((texture) => texture.destroy(true), COLUMN_ROOM.entries, COLUMN_ROOM.bytes);
  get columnStats() { return this.columns.stats; }
  private marks: Graphics[] = [];
  private rings: Graphics[] = [];
  private board: Board | null = null;
  private built: Built | null = null;
  /** Layers that outlive a rebuild (the effects': `build` must not destroy them, or nothing in a fight would show). */
  readonly keep: Container[] = [];
  /** The finished sections, each one sprite: those nearer the screen than the host drawn in front of the fight's own tiles,
   *  those further off (`sceneryBack`) behind them, so a section the road turned back past never covers the fighters. */
  readonly scenery = new Container();
  readonly sceneryBack = new Container();
  private sceneryOf = new Map<Board, Sprite>();
  private baked = new Map<Board, Baked>();
  private toBake: Scene[] = [];
  private scenesWanted: Scene[] = [];
  private viewBox: { x0: number; x1: number; y0: number; y1: number } | null = null;
  /** The section just fought, kept as live tiles while the heroes walk off it. */
  private old: (Built & { rot: Rot; ou: number; ov: number; section: Board }) | null = null;
  /** How the host section lies. */
  private rot: Rot = 0;
  /** The renderer, for baking (set by the page). */
  renderer: Renderer | null = null;

  constructor() {
    this.root.sortableChildren = true;
    this.scenery.zIndex = SCENERY_Z;
    this.sceneryBack.zIndex = SCENERY_BACK_Z;
    this.scenery.sortableChildren = this.sceneryBack.sortableChildren = true;
    this.keep.push(this.sceneryBack, this.scenery);
  }

  /** Build the board's columns (again, for a new board). `keepOld` leaves everything on the stage (the section handed to `demote`, the fighters walking off it) and only adds the new columns. */
  build(b: Board, look: Look = {}, rot: Rot = 0, keepOld = false): void {
    // (the land's floor sheet is fetched the first time its land is shown; the board is painted again when it lands)
    const hold = FLOORS[b.area].hold;
    if (!floorArt(hold)) void loadFloorArt(hold).then((got) => got && this.board === b && this.repaint());
    // (MARCH-STAYS: the new columns are made FIRST, while the picture on show still stands; only then is the old one taken down, and
    // the new goes up in the same frame (`BUILD_ORDER`, `marchStayRules.ts`). A fault while making leaves the old picture standing:
    // it was taken down first, so a fault here left the field empty for good)
    const made = this.section(b, look, { rot, ou: 0, ov: 0, w: b.w, d: b.d });
    this.board = b;
    this.rot = rot;
    if (!keepOld) {
      for (const c of this.root.removeChildren()) if (!this.keep.includes(c)) c.destroy({ children: true });
      this.ringStones = [];
      this.dropOld();
      this.rows.clear();
      this.root.addChild(...this.keep);
    }
    this.freeBuilt();
    this.built = made;
    // (WAVE-DELAY: what was painted ahead for this build is the section's own now)
    this.dropWarm();
    // (LAND-IDENTITY: what stands round the board and on it, once the land's pieces are here: `landRimRules.ts`)
    // (MARCH-STAYS: the rim's pieces go BEFORE its picture does. The march's build (`keepOld`) left the old board's rim on the stage
    // and destroyed the one picture its still pieces are drawn from: a sprite with a dead picture makes every drawing throw, so for
    // the whole march the canvas showed nothing but the backdrop, on every land that has a rim. The owner's "the battleground
    // disappears")
    this.dropRim();
    if (!look.boss && rot === 0) {
      if (holdSpritesReady(hold) && floorArt(hold)) this.layRim(b);
      else void Promise.all([loadHoldSprites(hold), loadFloorArt(hold)]).then(([got, floor]) => got && floor && this.board === b && this.built && this.layRim(b));
    }
    this.marks = this.built.marks;
    this.rings = this.built.rings;
    this.root.addChild(...this.built.tiles);
    // (a Calamity zone: its air over and under the field, `zoneLife.ts`; it goes with the board's other children on the next build)
    this.air = null;
    if (b.props?.length || b.tiles.some((t) => t.chasm)) {
      this.air = new ZoneAir(b, { rot, ou: 0, ov: 0, w: b.w, d: b.d }, this.built.zone, settings().saver);
      this.root.addChild(this.air.over, this.air.under);
    }
  }

  /** A Calamity zone's air (fog, motes, shafts, drips, bats), while its board is the one shown. */
  private air: ZoneAir | null = null;

  /** Each frame, with the fighters' places (world px): a zone's tall things fade while a fighter stands behind them. */
  fadeOver(who: readonly { x: number; y: number; tall: number }[], dt: number): void {
    if (this.built?.zone.tall.length) fadeTall(this.built.zone, who, dt);
  }

  /** A whole board baked into one sprite, for a big field (the Last Stand's 24 x 24 is 576 columns): drawn once, with the boulders and growth in it, and then it is a single quad each frame. The sprite is at the world's origin, behind everything (`zIndex`). */
  bakeField(b: Board, look: Look = {}): Sprite {
    const built = this.section(b, look, { rot: 0, ou: 0, ov: 0 });
    const c = new Container();
    c.sortableChildren = true;
    c.addChild(...built.tiles);
    const bounds = c.getLocalBounds();
    let tex: Texture;
    try {
      tex = this.renderer ? this.renderer.generateTexture({ target: c, resolution: 1 }) : Texture.EMPTY;
    } finally {
      c.destroy({ children: true });
      for (const x of built.tex) x.release();
    }
    const sp = new Sprite(tex);
    sp.position.set(bounds.minX, bounds.minY);
    sp.zIndex = -1e6;
    this.board = b;
    return sp;
  }

  /** The host is now behind the one to come (`section` is its board in the chain): its live tiles stay on show where they lie against the new host. */
  demote(section: Board, ou: number, ov: number): void {
    if (!this.built || !this.board) return;
    this.dropOld();
    // (MARCH-STAYS: the host's rim stood round it at the world's origin, where the next section is about to fall: it goes as the
    // host is moved aside, and the section behind is baked without one, as every finished section is)
    this.dropRim();
    // The destination is rendered once by the approaching/current host, never again in retired scenery.
    this.built.landmark?.destroy({ children: true });
    this.built.landmark = null;
    const [ox, oy] = rawAt(ou, ov, 0);
    const f = { rot: this.rot, ou, ov, w: this.board.w, d: this.board.d };
    this.built.tiles.forEach((t, i) => {
      t.position.set(ox, oy);
      t.zIndex = depthIn(f, i % this.board!.w, Math.floor(i / this.board!.w));
    });
    this.old = { ...this.built, rot: this.rot, ou, ov, section };
    for (const g of this.old.marks) g.clear();
    for (const g of this.old.rings) g.clear();
    this.built = null;
  }

  /** The old section has done: it goes to the scenery as one sprite (`look` as it was drawn). */
  retire(look: Look): void {
    const o = this.old;
    if (!o) return;
    const scene = { board: o.section, look, rot: o.rot, ou: o.ou, ov: o.ov };
    for (const t of o.tiles) t.destroy({ children: true });
    for (const x of o.tex) x.release();
    this.old = null;
    this.bake(scene);
    this.place(scene);
  }

  private dropOld(): void {
    if (!this.old) return;
    for (const t of this.old.tiles) if (!t.destroyed) t.destroy({ children: true });
    for (const x of this.old.tex) x.release();
    this.old = null;
  }

  private freeBuilt(): void {
    if (!this.built) return;
    for (const x of this.built.tex) x.release();
    this.built = null;
  }

  private liveT = 0;
  private liveSkip = false;
  private calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Each frame: the living land of the live sections moves (the host, and the one the heroes are walking off). Held still when the device asks
   *  for reduced motion; on a battery saver every other frame. Nothing is made here: the sprites are moved, re-tinted or re-framed. */
  step(dt: number): void {
    if (this.calm) return;
    if (settings().saver && (this.liveSkip = !this.liveSkip)) return;
    this.liveT += settings().saver ? dt * 2 : dt;
    const t = this.liveT / 1000;
    for (const live of [this.built?.live, this.old?.live]) {
      if (!live) continue;
      // (ALIVE: the shared motion, `ambient.ts`: growth sways and gusts, a flame's glow breathes and gutters, never going out)
      // (LIVING-FIELDS: a spent trap's things are gone from the stage; they are dropped from these lists here)
      if (live.sway.some((s) => s.sp.destroyed)) live.sway = live.sway.filter((s) => !s.sp.destroyed);
      if (live.lights.some((l) => l.sp.destroyed)) live.lights = live.lights.filter((l) => !l.sp.destroyed);
      if (live.loops.some((l) => l.sp.destroyed)) live.loops = live.loops.filter((l) => !l.sp.destroyed);
      for (const s of live.sway) s.sp.skew.x = sway(t, Math.round(s.ph * 1000), 1.2) * s.amp;
      for (const l of live.lights) {
        const k = flicker(t, Math.round(l.ph * 1000), l.kind ?? 'torch');
        l.sp.alpha = l.base * k;
        l.sp.scale.set(l.kind === 'lava' ? 1 : 0.92 + 0.08 * k);
      }
      for (const r of live.ripples) {
        r.sp.x = r.x + Math.sin(t * 0.9 + r.ph) * 2;
        r.sp.alpha = 0.24 + 0.2 * Math.sin(t * 1.7 + r.ph * 2);
      }
      for (const lp of live.loops) lp.sp.texture = lp.frames[(Math.floor(this.liveT / lp.ms) + lp.ph) % lp.frames.length];
      for (const m of live.drift) {
        if (m.sp.destroyed) continue;
        m.sp.position.set(m.x + Math.sin(t * 0.35 + m.ph) * 7, m.y + Math.sin(t * 0.6 + m.ph * 2) * 2.5);
        m.sp.alpha = 0.6 + 0.3 * Math.sin(t * 0.8 + m.ph);
      }
    }
    // (a Calamity zone: its runes, totems and candles loop, its glows breathe, its chains and banners swing, its air moves)
    const zone = this.built?.zone;
    if (zone) {
      for (const lp of zone.loops) lp.sp.texture = lp.frames[(Math.floor(this.liveT / lp.ms) + lp.ph) % lp.frames.length];
      for (const q of zone.pulses) q.sp.alpha = q.base + Math.sin(t * q.rate + q.ph) * q.amp;
      for (const q of zone.swings) q.sp.rotation = Math.sin(t * 1.1 + q.ph) * q.amp + Math.sin(t * 2.7 + q.ph) * q.amp * 0.3;
    }
    this.air?.step(settings().saver ? dt * 2 : dt);
  }

  /** A tile of the host falls: `dy` px above where it lies (up is negative), `alpha` how much of it shows. */
  lift(i: number, dy: number, alpha: number): void {
    const t = this.built?.tiles[i];
    if (!t) return;
    t.y = dy;
    t.alpha = alpha;
    t.visible = alpha > 0;
  }

  /** Show the finished sections behind the fight (those of `scenes`, each against the host), baking what is not baked yet, a section a frame (`pump`). Those no longer wanted go. */
  setScenery(scenes: Scene[]): void {
    this.scenesWanted = scenes;
    const want = new Set(scenes.map((s) => s.board));
    for (const [b, sp] of this.sceneryOf)
      if (!want.has(b)) {
        sp.destroy();
        this.sceneryOf.delete(b);
      }
    this.toBake = [];
    for (const s of scenes) {
      if (this.baked.has(s.board)) this.place(s);
      else if (s.board.w < 12 || (this.viewBox && this.inView(s, this.viewBox))) this.toBake.push(s);
    }
  }

  get sceneryReady(): boolean { return this.toBake.length === 0; }

  /** Bake one waiting section (called each frame, so a long map comes up a section a frame). */
  pump(): void {
    this.pumpWarm();
    const s = this.toBake[0];
    if (!s || !art) return;
    // (a section is baked once, so it waits a moment for its land's floor sheet: `floorArt.ts`)
    const hold = FLOORS[s.board.area].hold;
    if (!floorArt(hold) && !this.floorMissing.has(hold)) {
      if (!this.floorAsked.has(hold)) {
        this.floorAsked.add(hold);
        void loadFloorArt(hold).then((got) => !got && this.floorMissing.add(hold));
      }
      return;
    }
    this.toBake.shift();
    this.bake(s);
    this.place(s);
  }

  private floorAsked = new Set<string>();
  private floorMissing = new Set<string>();

  /** A conservative projected board rectangle, excluding destinations which retired sections never draw. */
  private inView(s: Scene, view: { x0: number; x1: number; y0: number; y1: number }): boolean {
    const f = { rot: s.rot, ou: s.ou, ov: s.ov, w: s.board.w, d: s.board.d };
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const u of [0, s.board.w - 1]) for (const v of [0, s.board.d - 1]) {
      const [x, y] = project(f, u, v, 0);
      x0 = Math.min(x0, x - TW); x1 = Math.max(x1, x + TW);
      y0 = Math.min(y0, y - 12 * HH - 120); y1 = Math.max(y1, y + FOOT + TH);
    }
    return x0 < view.x1 && x1 > view.x0 && y0 < view.y1 && y1 > view.y0;
  }

  /** Hide the baked sections that lie off the screen (`view`, in world px). */
  cull(view: { x0: number; x1: number; y0: number; y1: number }): void {
    this.viewBox = view;
    // On large prototypes, resume/pan only bakes the sections near the camera; panning back queues them on demand.
    this.toBake = this.toBake.filter(s => s.board.w < 12 || this.inView(s, view));
    for (const s of this.scenesWanted) {
      if (s.board.w >= 12 && !this.baked.has(s.board) && !this.toBake.some(q => q.board === s.board) && this.inView(s, view)) this.toBake.push(s);
    }
    for (const sp of this.sceneryOf.values()) {
      const x = sp.x;
      const y = sp.y;
      sp.visible = x < view.x1 && x + sp.width > view.x0 && y < view.y1 && y + sp.height > view.y0;
    }
  }

  private bake(s: Scene): void {
    if (this.baked.has(s.board) || !this.renderer) return;
    const built = this.section({ ...s.board, landmark: undefined, landmarkAt: undefined }, s.look, { rot: s.rot, ou: 0, ov: 0, w: s.board.w, d: s.board.d });
    const c = new Container();
    c.sortableChildren = true;
    c.addChild(...built.tiles);
    const bounds = c.getLocalBounds();
    let tex: Texture;
    try {
      const t0 = performance.now();
      tex = this.renderer.generateTexture({ target: c, resolution: s.board.w >= 12 ? 0.5 : 1 });
      diagStep(`the old board drawn into one picture of ${Math.round(bounds.width)}x${Math.round(bounds.height)}`, performance.now() - t0);
    } finally {
      c.destroy({ children: true });
      for (const x of built.tex) x.release();
    }
    this.baked.set(s.board, { tex, x: bounds.minX, y: bounds.minY });
    // (the oldest are let go once there are too many)
    while (this.baked.size > BAKED_MAX) {
      const [old, b] = this.baked.entries().next().value!;
      this.sceneryOf.get(old)?.destroy();
      this.sceneryOf.delete(old);
      b.tex.destroy(true);
      this.baked.delete(old);
    }
  }

  private place(s: Scene): void {
    const b = this.baked.get(s.board);
    if (!b) return;
    let sp = this.sceneryOf.get(s.board);
    if (!sp) {
      sp = new Sprite(b.tex);
      this.sceneryOf.set(s.board, sp);
    }
    // (a section further off than the host goes behind it, any other in front; among themselves, by their middles' depth)
    const [w, d] = footDims(s.rot, s.board.w, s.board.d);
    const layer = liesBehind(s.rot, s.ou, s.ov, this.rot, s.board.w, s.board.d, this.board?.w, this.board?.d) ? this.sceneryBack : this.scenery;
    if (sp.parent !== layer) layer.addChild(sp);
    sp.zIndex = (s.ou + s.ov) * 2 + w + d;
    const [ox, oy] = rawAt(s.ou, s.ov, 0);
    sp.position.set(ox + b.x, oy + b.y);
  }

  /** The tiles of a board, laid as the frame says (turned, and its footprint's corner some tiles from the origin). */
  /** WAVE-DELAY: everything kept from earlier boards is let go (the painted columns, what was painted ahead, the baked scenery's
   *  queue), so the next build paints from nothing. For the page's cure when its drawing keeps faulting (`loopRules.ts`). */
  forget(): void {
    this.dropWarm();
    this.toBake.length = 0;
    this.columns.clear();
  }

  /** WAVE-DELAY (docs/notes/wave-delay.md): the next board's columns painted ahead, a few a frame, so that building it is not one
   *  long stop at the wave's end: `prewarm` names the board, `pump` paints `warmSlice` of it each frame and holds what it painted, and
   *  the build that follows finds every column already there. */
  private warm: { b: Board; look: Look; rot: Rot; at: number; leases: ColumnLease<Texture>[] } | null = null;
  private warmFloor: { b: Board; floor: FloorTile[] | null } | null = null;
  /** `slow`: the fight is still on (a tile a frame); once it is won the page asks again without it, and the rest is hurried. */
  warmSlow = false;
  private warmAt = 0;
  prewarm(b: Board, look: Look = {}, rot: Rot = 0, slow = false): void {
    this.warmSlow = slow;
    if (this.warm?.b === b) return;
    this.dropWarm();
    this.warm = { b, look, rot, at: 0, leases: [] };
  }
  private dropWarm(): void {
    for (const l of this.warm?.leases ?? []) l.release();
    this.warm = null;
    this.warmFloor = null;
  }
  /** Paint the next few of the warmed board's columns: for `WARM.FRAME_MS` of work at most, `WARM.LEAST` tiles at least. */
  private pumpWarm(): void {
    const w = this.warm;
    if (!w || !art) return;
    const n = w.b.w * w.b.d;
    if (w.at >= n) return;
    // (its land's floor sheet first, as a section's bake waits for it: a column painted without it would be painted again)
    const hold = FLOORS[w.b.area].hold;
    if (!floorArt(hold) && !this.floorMissing.has(hold)) {
      if (!this.floorAsked.has(hold)) {
        this.floorAsked.add(hold);
        void loadFloorArt(hold).then((got) => !got && this.floorMissing.add(hold));
      }
      return;
    }
    const t0 = performance.now();
    const gap = t0 - this.warmAt;
    this.warmAt = t0;
    let done = 0;
    while (w.at < n && warmMore(done, performance.now() - t0, this.warmSlow, gap)) {
      const to = Math.min(n, w.at + (this.warmSlow ? WARM.FIGHT_LEAST : WARM.LEAST));
      this.section(w.b, w.look, { rot: w.rot, ou: 0, ov: 0, w: w.b.w, d: w.b.d }, { from: w.at, to, out: w.leases });
      done += to - w.at;
      w.at = to;
    }
  }

  private section(b: Board, look: Look, f: Frame, only?: { from: number; to: number; out: ColumnLease<Texture>[] }): Built {
    const tiles: Container[] = [];
    const marks: Graphics[] = [];
    const rings: Graphics[] = [];
    const grounds: Container[] = [];
    const tex: ColumnLease<Texture>[] = [];
    const redo: (() => void)[] = [];
    const barrels = new Map<number, Sprite>();
    const traps = new Map<number, { made: Container[]; again: () => Container[] }>();
    // (LIVING-FIELDS: which timed strike comes down on each marked tile, for its tell)
    const strikes = new Map<number, HazardKind>();
    for (const h of b.hazards ?? []) for (const i of h.tiles) if (b.tiles[i]?.risk) strikes.set(i, h.kind);
    const live = noLive();
    const zone = noMotion();
    // (an army's road: the land beside it sinks a little and its far edge is left ragged, so a section reads as a road through the land, not a slab)
    const depth = b.tiles.some((t) => t.scene) ? sceneDepth(b) : null;
    const held = new Set((b.pieces ?? []).map((p) => p.v * b.w + p.u));
    // (LIVING-FIELDS: the land's painted floor, once its sheet is here; `repaint` lays it when it arrives later)
    let floor = only && this.warmFloor?.b === b ? this.warmFloor.floor : this.floorOf(b, f);
    if (only) this.warmFloor = { b, floor };
    redo.push(() => (floor = this.floorOf(b, f)));
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        // (painting ahead: only the tiles asked for, and of those only the column)
        if (only && (v * b.w + u < only.from || v * b.w + u >= only.to)) continue;
        const raw = tileAt(b, u, v)!;
        const far = depth ? depth[v * b.w + u] : 0;
        if (only) {
          const edge = Math.min(u, v, b.w - 1 - u, b.d - 1 - v);
          const trimmed = !!depth && far >= 3 && !held.has(v * b.w + u) && raw.scene !== 'water' && raw.scene !== 'lava' && edge < 1 + ((mixSeed(b.seed, 0xed9e, u, v) >>> 0) % 3);
          const sink = raw.scene ? Math.min(2, Math.max(0, far - 1)) : 0;
          const now: Tile = raw.scene === 'water' || raw.scene === 'lava' ? { ...raw, h: raw.h - sink, ground: raw.scene === 'water' ? 'deep' : 'lava' } : sink ? { ...raw, h: raw.h - sink } : raw;
          if (!trimmed && !now.chasm) only.out.push(this.column(now, u, v, b.area, depth ? !!now.paved : !!look.boss, !!depth, floor?.[v * b.w + u], strikes.get(v * b.w + u)));
          continue;
        }
        const tile = new Container();
        tile.zIndex = depthIn(f, u, v);
        const edge = Math.min(u, v, b.w - 1 - u, b.d - 1 - v);
        // (water and lava are never trimmed: a river runs on to the edge, and pours off it)
        if (depth && far >= 3 && !held.has(v * b.w + u) && raw.scene !== 'water' && raw.scene !== 'lava' && edge < 1 + ((mixSeed(b.seed, 0xed9e, u, v) >>> 0) % 3)) {
          // (trimmed: nothing drawn, the tile is still there to the rules as land nobody stands on)
          const mark = new Graphics();
          const ring = new Graphics();
          const ground = new Container();
          tile.addChild(mark, ring, ground);
          marks.push(mark);
          rings.push(ring);
          grounds.push(ground);
          tiles.push(tile);
          continue;
        }
        const sink = raw.scene ? Math.min(2, Math.max(0, far - 1)) : 0;
        // (the tile as it is drawn; read again when it is repainted, for a tile whose ground has changed in the fight)
        const shown = (): Tile => {
          const raw = tileAt(b, u, v)!;
          return raw.scene === 'water' || raw.scene === 'lava' ? { ...raw, h: raw.h - sink, ground: raw.scene === 'water' ? 'deep' : 'lava' } : sink ? { ...raw, h: raw.h - sink } : raw;
        };
        const t = shown();
        const [x, y] = project(f, u, v, t.h);
        // (a Calamity zone's chasm draws no column: the void shows through, `zoneLife.ts` lights it from below)
        if (!t.chasm) {
          const paint = () => {
            const now = shown();
            return this.column(now, u, v, b.area, depth ? !!now.paved : !!look.boss, !!depth, floor?.[v * b.w + u], strikes.get(v * b.w + u));
          };
          const ct = paint();
          const slot = tex.length;
          tex.push(ct);
          const col = new Sprite(ct.value);
          col.position.set(x - TW / 2, y - TH / 2);
          tile.addChild(col);
          redo.push(() => {
            if (col.destroyed) return;
            const next = paint();
            col.texture = next.value;
            tex[slot].release();
            tex[slot] = next;
          });
        }
        const mark = new Graphics();
        mark.position.set(x, y);
        const ring = new Graphics();
        ring.position.set(x, y);
        // (the ground layer is at the world's origin, so an effect lays a mark at its tile's world point as it would anywhere)
        const ground = new Container();
        tile.addChild(mark, ring, ground);
        marks.push(mark);
        rings.push(ring);
        grounds.push(ground);
        const set = art?.areas[b.area];
        if (t.scene === 'grave') {
          addPic(tile, { name: 'gravestones', scale: 0.62, ay: 0.86, dx: 0, dy: 4 }, x, y, live);
        } else if (t.scene) {
          // (an arena's ring is a run of wall along the ring: down to the right on the screen, or mirrored down to the left)
          let across = false;
          if (t.ring) {
            const ringAt = (du: number, dv: number) => !!tileAt(b, u + du, v + dv)?.ring;
            const alongU = +ringAt(1, 0) + +ringAt(-1, 0) >= +ringAt(0, 1) + +ringAt(0, -1);
            const [ax, ay] = project(f, u + (alongU ? 1 : 0), v + (alongU ? 0 : 1), t.h);
            across = (ax - x) * (ay - y) < 0;
          }
          for (const p of sceneryPictures(t.scene, b.area, t.deco, !!t.ring, across, far)) addPic(tile, p, x, y, live);
          if (t.scene === 'ruin' && !t.ring && art && t.deco % 3 !== 0) {
            const r = new Sprite(art.walls[t.deco % art.walls.length]);
            r.anchor.set(0.5, 0.85);
            r.position.set(x, y + 4);
            tile.addChild(r);
          }
        }
        // (running water: streaks sliding the way the river runs)
        if (depth && t.stream && b.flow && (t.ground === 'water' || t.ground === 'deep' || t.ground === 'lava' || t.ground === 'ice')) {
          const [fx, fy] = project(f, u + b.flow[0], v + b.flow[1], t.h);
          const frames = flowFrames(fx - x, fy - y, t.ground === 'lava' || (t.ground === 'deep' && LAVA_LANDS.includes(b.area)));
          const sp = new Sprite(frames[0]);
          sp.position.set(x - TW / 2, y - TH / 2);
          tile.addChild(sp);
          live.loops.push({ sp, frames, ph: (u * 3 + v * 5) % FLOW_FRAMES, ms: 110 });
        }
        // (ALIVE: still water shimmers and drifts; lava and coals seethe with a breathing glow; a shrine's crystal pulses)
        this.tileLife(tile, t, b.area, x, y, u, v, live, !!(depth && t.stream && b.flow));
        if (t.scene) {
          // (the scenery's own picture is set; nothing more on it)
        } else if (t.rock && set) {        } else if (t.rock && set) {
          const tex = set.boulders[t.deco % set.boulders.length];
          const r = new Sprite(tex);
          r.anchor.set(0.5, 0.8);
          r.scale.set(Math.min(56 / tex.width, 66 / tex.height));
          r.position.set(x, y);
          tile.addChild(r);
        } else if (t.wall && art) {
          // (a ruined wall: a piece of ruin, the three kinds by the tile's own number; the land's own once the painted sheet has it, `trapArt.ts`)
          const own = trapTexture(propCell('wall', b.area, t.deco));
          const r = new Sprite(own ? own.tex : art.walls[t.deco % art.walls.length]);
          if (own) r.scale.set(TRAP_ART_SCALE);
          r.anchor.set(own ? own.ax : 0.5, own ? own.ay : 0.85);
          r.position.set(x, own ? y : y + 4);
          tile.addChild(r);
        } else if (t.barrel && art) {
          const own = trapTexture(propCell('barrel', b.area));
          const r = new Sprite(own ? own.tex : art.barrel);
          r.anchor.set(own ? own.ax : 0.5, own ? own.ay : 0.85);
          r.scale.set(own ? TRAP_ART_SCALE : 2);
          r.position.set(x, own ? y : y + 2);
          tile.addChild(r);
          barrels.set(v * b.w + u, r);
        } else if (t.ground === 'shrine' && art) {
          // (the shrine's crystal, a little behind the tile's middle)
          const own = trapTexture(propCell('shrine', b.area));
          const r = new Sprite(own ? own.tex : art.crystal);
          if (own) r.scale.set(TRAP_ART_SCALE);
          r.anchor.set(own ? own.ax : 0.5, own ? own.ay : 0.82);
          r.position.set(x, own ? y : y + 3);
          tile.addChild(r);
        } else if (t.ground === 'tall' && set) {
          // (tall growth: a clump of tufts that stands in front of the tile's top, hiding it from shots)
          const urls = AREA_URLS[b.area];
          for (let k = 0; k < urls.tallCount; k++) {
            const s = new Sprite(set.tall[(t.deco + k) % set.tall.length]);
            s.anchor.set(0.5, 1);
            s.scale.set(urls.tallScale);
            const a = ((t.deco >> 2) + k * 2.1) % (Math.PI * 2);
            s.position.set(x + Math.cos(a) * (urls.tallCount > 2 ? 17 : 10), y + 6 + Math.sin(a) * 6);
            tile.addChild(s);
            // (ALIVE: tall growth bends in the wind, about its foot)
            live.sway.push({ sp: s, ph: (x * 0.071 + y * 0.113 + k * 0.9) % (Math.PI * 2), amp: 0.07 });
          }
        } else if (t.bush && b.area === 'highlands' && set) {
          // (a bush grows at the tile's back corner, behind whoever stands there)
          const s = new Sprite(art!.bushes[t.deco % art!.bushes.length]);
          s.anchor.set(0.5, 0.9);
          s.position.set(x + ((t.deco >> 3) % 2 ? 12 : -12), y - 5);
          tile.addChild(s);
          live.sway.push({ sp: s, ph: (x * 0.071 + y * 0.113) % (Math.PI * 2), amp: 0.03 });
        } else if (t.bush && !depth && !t.trap && !t.risk && !t.ground && !t.bridge) {
          // (LIVING-FIELDS, step 4: every land grows its own on the tiles the board marked: the audit's finding 7)
          addPic(tile, growthOf(b.area, t.deco), x, y, live);
        }
        // (LIVING-FIELDS: what stands on a trap's tile; its mark on the ground is painted with the column)
        if (!t.scene && (t.trap || t.brazier || strikes.has(v * b.w + u))) {
          // (made again from the tile as it then is, when the trap changes: thin ice cracks, a brazier falls)
          const again = () => this.trapProps(tile, tileAt(b, u, v)!, b.area, x, y, live, strikes.get(v * b.w + u));
          traps.set(v * b.w + u, { made: again(), again });
        }
        // (an army's road: small things growing on it now and then)
        const flair = depth && !t.scene && !t.ground && !t.bridge && !t.rock && !t.wall && !t.barrel && !t.paved ? flairOf(b.area, t.deco) : null;
        if (flair) addPic(tile, flair, x, y, live);
        tiles.push(tile);
      }
    // (painting ahead: the columns are all that was wanted)
    if (only) return { tiles, marks, rings, grounds, tex, redo, barrels, traps, landmark: null, live, zone };
    // an arena's set pieces, each on its tile of the land round it
    for (const p of b.pieces ?? []) {
      const tile = tiles[p.v * b.w + p.u];
      if (!tile) continue;
      const t = tileAt(b, p.u, p.v)!;
      const far = depth ? depth[p.v * b.w + p.u] : 0;
      const [x, y] = project(f, p.u, p.v, t.h - Math.min(2, Math.max(0, far - 1)));
      const picture = setPiece(p.kind, b.area);
      // Rift courts have authored landmark pairs on their scenic margins.
      if (b.riftWorld && p.kind !== 'riftPortal') picture.scale *= p.v === 1 ? 1.8 : 1.25;
      addPic(tile, picture, x, y, live);
    }
    // a Calamity zone's things on its tiles (`zoneLife.ts`)
    zoneProps(b, f, tiles, zone);
    // a few small birds at the road's edge, pecking (on the land beside it, a tile off the road)
    if (depth) {
      let n = 0;
      b.tiles.forEach((t, i) => {
        if (n >= 3 || !t.scene || depth[i] !== 1 || t.scene === 'water' || t.scene === 'lava' || t.deco % 11 !== 5) return;
        const frames = birdOf(b.area, t.deco);
        if (!frames) return;
        const [x, y] = project(f, i % b.w, Math.floor(i / b.w), t.h);
        const sp = new Sprite(frames[0]);
        sp.anchor.set(0.5, 1);
        sp.scale.set((t.deco >> 4) % 2 ? -1.1 : 1.1, 1.1);
        sp.position.set(x + ((t.deco >> 2) % 3) * 6 - 6, y + 10);
        tiles[i].addChild(sp);
        live.loops.push({ sp, frames, ph: t.deco % 2, ms: 380 + (t.deco % 5) * 120 });
        n++;
      });
    }
    // water pouring off an open edge, where its face is towards the screen
    for (const fall of b.falls ?? []) {
      const tile = tiles[fall.v * b.w + fall.u];
      const t = tileAt(b, fall.u, fall.v)!;
      if (!tile || !depth) continue;
      const h = t.h - Math.min(2, Math.max(0, depth[fall.v * b.w + fall.u] - 1));
      const [x, y] = project(f, fall.u, fall.v, h);
      const [ox, oy] = project(f, fall.u + fall.du, fall.v + fall.dv, h);
      if (oy <= y) continue;
      const left = ox < x;
      const frames = fallFrames(left, fall.lava);
      const sp = new Sprite(frames[0]);
      sp.position.set(left ? x - TW / 2 : x, y);
      tile.addChild(sp);
      live.loops.push({ sp, frames, ph: fall.v % FALL_FRAMES, ms: 70 });
    }
    let landmark: Container | null = null;
    // (an army road draws no distant compound: the owner found the castle gate too angled for the grid; its final arena is the destination)
    if (b.landmark && b.landmarkAt && art && !depth) {
      // Existing credited gate/tower sprites form a scenic compound beyond the far edge, never collision terrain.
      const base = tiles[Math.floor(b.w / 2)];
      const site = b.landmarkAt;
      landmark = new Container();
      landmark.sortableChildren = true;
      base.addChild(landmark);
      // A nonwalkable scenic plinth anchors the compound in the landscape instead of suspending it over the sky.
      for (let v = -2; v <= 1; v++) for (let u = -5; u <= 5; u++) {
        const t: Tile = { h: site.h, deco: (u + 5) * 7 + v + 2 };
        const texture = this.column(t, u, v, b.area, true, !!depth);
        tex.push(texture);
        const column = new Sprite(texture.value);
        const [x, y] = project(f, site.u + u, site.v + v, site.h);
        column.position.set(x - TW / 2, y - TH / 2);
        column.zIndex = depthIn(f, site.u + u, site.v + v);
        landmark.addChild(column);
      }
      for (const [u, v, tower] of [[2, -2, true], [5.5, -2, false], [9, -2, true]] as const) {
        const sp = new Sprite(tower ? art.tower : art.gate);
        sp.anchor.set(0.5, 1);
        sp.scale.set(tower ? 2.4 : 2.8);
        sp.tint = b.landmark === 'mausoleum' ? 0x8c91ae : b.landmark === 'temple' ? 0xd7cb9d : 0xffffff;
        const [x, y] = project(f, site.u + u - 5.5, site.v + v + 2, site.h);
        sp.position.set(x, y);
        sp.zIndex = 100000;
        landmark.addChild(sp);
      }
    }
    return { tiles, marks, rings, grounds, tex, redo, barrels, traps, landmark, live, zone };
  }

  /** LAND-IDENTITY: the rim's columns and pieces, on the stage now (they go with the board at the next build). */
  private rim: Container[] = [];
  /** The far rim's still part, drawn once (`layRim`). */
  private rimTex: Texture | null = null;
  /** The rim is taken off the stage, its pieces first and only then the picture they are drawn from: never a sprite left with a dead
   *  picture (MARCH-STAYS). */
  private dropRim(): void {
    for (const c of this.rim) if (!c.destroyed) c.destroy({ children: true });
    this.rim = [];
    this.rimTex?.destroy(true);
    this.rimTex = null;
  }
  /** Whether the board's rim is laid (the page's light and life wait for it). */
  get rimLaid(): boolean {
    return this.rim.length > 0;
  }

  /** LAND-IDENTITY: lay what stands round the board and on it (`landRimRules.ts`): the rim's columns outside the two far edges (cavern
   *  walls, open water), each in the board's own draw order so it lies behind every fighter, with its set pieces; the wall's torches; and
   *  the small things on the board's own tiles (reeds, lilies). Looks only: none of it is a tile of the board. */
  private layRim(b: Board): void {
    const built = this.built;
    if (!built) return;
    this.dropRim();
    const f: Frame = { rot: 0, ou: 0, ov: 0, w: b.w, d: b.d };
    const hold = FLOORS[b.area].hold;
    const live = built.live;
    const stand = (parent: Container, p: RimPiece, x: number, y: number) => {
      const got = holdPiece(hold, p.name);
      if (!got) return;
      const sp = new Sprite(got.tex);
      sp.anchor.set(got.ax, got.ay);
      sp.scale.set(p.scale);
      sp.position.set(x + p.dx, y + p.dy);
      parent.addChild(sp);
      const ph = (x * 0.071 + y * 0.113) % (Math.PI * 2);
      if (p.sway) live.sway.push({ sp, ph, amp: 0.03 });
      if (p.drift) live.drift.push({ sp, x: sp.x, y: sp.y, ph });
      if (p.light) {
        const g = new Sprite(glow());
        g.anchor.set(0.5);
        g.tint = p.light.colour;
        g.blendMode = 'add';
        g.scale.set(p.light.reach * 0.7);
        g.position.set(x + p.dx, y + p.dy - p.light.up * p.scale);
        parent.addChild(g);
        live.lights.push({ sp: g, ph, base: 0.5, kind: 'magic' });
      }
    };
    const rim = rimOf(b);
    // (the far rim lies behind the whole board, so its ground, its walls and everything on it that stands still are drawn once into one
    //  picture laid under the board; only what moves stays a sprite of its own: what sways at the board's edge, what drifts, what glows)
    const still = new Container();
    still.sortableChildren = true;
    const leases: { release(): void }[] = [];
    for (const r of rim) {
      const far = r.u < 0 || r.v < 0;
      const tile: Tile = { h: r.h, deco: ((r.u + 64) * 31 + (r.v + 64) * 17) % 997, ground: r.ground };
      // (open water and lava run on unbroken; a wall's blocks keep their lines)
      const lease = this.column(tile, r.u, r.v, b.area, false, false, { role: r.role, fringes: [], seams: r.ground ? [false, false, false, false] : [true, true, true, true], U: r.u, V: r.v, tone: r.ground ? RIMS[b.area].tones?.[Math.min(r.ring, (RIMS[b.area].tones?.length ?? 1) - 1)] : undefined });
      const [x, y] = project(f, r.u, r.v, r.h);
      const col = new Sprite(lease.value);
      col.position.set(x - TW / 2, y - TH / 2);
      const z = depthIn(f, r.u, r.v);
      const moves = (p: RimPiece) => !!p.drift || !!p.light || (!!p.sway && (r.u === -1 || r.v === -1 || !far));
      const live = r.pieces.filter(moves);
      if (far && this.renderer) {
        const c = new Container();
        c.zIndex = z;
        // (a far ring thins away with everything on it, as into a haze)
        c.alpha = r.alpha;
        c.addChild(col);
        for (const p of r.pieces) if (!moves(p)) stand(c, { ...p, sway: false }, x, y);
        still.addChild(c);
        leases.push(lease);
      }
      if (!far || !this.renderer || live.length) {
        const c = new Container();
        c.zIndex = z;
        c.alpha = r.alpha;
        if (!far || !this.renderer) {
          built.tex.push(lease);
          c.addChild(col);
          for (const p of r.pieces) if (!moves(p)) stand(c, p, x, y);
        }
        for (const p of live) stand(c, p, x, y);
        this.root.addChild(c);
        this.rim.push(c);
      }
    }
    if (still.children.length && this.renderer) {
      const bounds = still.getLocalBounds();
      try {
        this.rimTex = diagTimed('the rim drawn into one picture', () => this.renderer!.generateTexture({ target: still, resolution: 1 }));
      } finally {
        still.destroy({ children: true });
        for (const l of leases) l.release();
      }
      const sp = new Sprite(this.rimTex);
      sp.position.set(bounds.minX, bounds.minY);
      sp.zIndex = -1e5;
      // (a dark land's walls take its dark as a tint, which costs nothing to draw; the dark layer itself then only has to cover the floor)
      sp.tint = darkTint(b.area);
      this.root.addChild(sp);
      this.rim.push(sp);
    } else still.destroy({ children: true });
    // the wall's torches, on the face that looks onto the board
    for (const t of wallTorches(b)) {
      const edge = tileAt(b, Math.max(0, t.u), Math.max(0, t.v))!;
      const c = new Container();
      c.zIndex = depthIn(f, t.u, t.v) + 1;
      const [x, y] = project(f, t.u + (t.edge === 'u' ? 0.5 : 0), t.v + (t.edge === 'v' ? 0.5 : 0), edge.h + t.up);
      const got = holdPiece(hold, 'wallLight') ?? holdPiece(hold, 'wallBrazier');
      if (got) {
        const sp = new Sprite(got.tex);
        sp.anchor.set(got.ax, got.ay);
        sp.scale.set(t.edge === 'u' ? -0.8 : 0.8, 0.8);
        sp.position.set(x, y);
        c.addChild(sp);
      }
      const g = new Sprite(glow());
      g.anchor.set(0.5);
      g.tint = torchLight(b.area);
      g.blendMode = 'add';
      g.scale.set(t.up > 2 ? 1.7 : 2.3);
      g.position.set(x, y - 14);
      c.addChild(g);
      live.lights.push({ sp: g, ph: (x * 0.071 + y * 0.113) % (Math.PI * 2), base: 0.85, kind: 'torch' });
      this.root.addChild(c);
      this.rim.push(c);
    }
    // what breaks up a tall wall's face: crystals in the rock, skulls in niches, pipes
    const stud = WALL_STUDS[b.area];
    const studArt = stud && holdPiece(hold, stud.name);
    if (stud && studArt)
      for (const t of wallStuds(b)) {
        const edge = tileAt(b, Math.max(0, t.u), Math.max(0, t.v))!;
        const [x, y] = project(f, t.u + (t.edge === 'u' ? 0.5 : 0), t.v + (t.edge === 'v' ? 0.5 : 0), edge.h + t.up);
        const sp = new Sprite(studArt.tex);
        sp.anchor.set(studArt.ax, studArt.ay);
        sp.scale.set(t.edge === 'u' ? -stud.scale : stud.scale, stud.scale);
        sp.position.set(x, y);
        sp.zIndex = depthIn(f, t.u, t.v) + 1;
        sp.tint = darkTint(b.area);
        this.root.addChild(sp);
        this.rim.push(sp);
      }
    // the small things on the board's own tiles
    for (const d of dressingOf(b)) {
      const tile = built.tiles[d.i];
      const t = b.tiles[d.i];
      if (!tile || tile.destroyed) continue;
      const [x, y] = project(f, d.i % b.w, Math.floor(d.i / b.w), t.h);
      const c = new Container();
      tile.addChild(c);
      stand(c, d.piece, x, y);
      this.rim.push(c);
    }
    this.onRim?.();
  }
  /** Called when the rim has been laid (the page lights the board then). */
  onRim: (() => void) | null = null;

  /** LIVING-FIELDS: every tile's floor (`floorRules.ts`), worked out on the board as it lies on the screen (a section of an army's road may
   *  lie turned), so the textures and the ragged edges run on across the tiles as they are seen. Null until the land's sheet is loaded. */
  private floorOf(b: Board, f: Frame): FloorTile[] | null {
    if (!floorArt(FLOORS[b.area].hold)) return null;
    const rot = f.rot;
    const [W, D] = footDims(rot, b.w, b.d);
    const tiles: Tile[] = new Array(W * D);
    const from = new Int32Array(W * D);
    const to = new Int32Array(W * D);
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const [U, V] = turnTile(rot, u, v, b.w, b.d);
        tiles[V * W + U] = b.tiles[v * b.w + u];
        from[V * W + U] = v * b.w + u;
        to[v * b.w + u] = V * W + U;
      }
    const tb: Board = { ...b, w: W, d: D, tiles };
    // (the path is walked on the board as the fight has it, from the heroes' edge to the foes')
    const roles = floorRoles(tb, new Set([...pathOf(b)].map((i) => to[i])));
    const out: FloorTile[] = new Array(W * D);
    for (let V = 0; V < D; V++)
      for (let U = 0; U < W; U++) out[from[V * W + U]] = { role: ROLES[roles[V * W + U]], fringes: fringesOf(tb, roles, U, V), seams: seamsOf(tb, U, V), U: U + f.ou, V: V + f.ov, puddle: puddleOn(b, from[V * W + U]) || undefined };
    return out;
  }

  /** LIVING-FIELDS: what stands on a trap's tile (`sim/fieldTraps.ts`), from the art the game has: the graveyard's thorns for brambles, the
   *  Calamity's skull totem and rune, the road's brazier with its light. Spikes, a snare, mud, a bog and thin ice are marks on the ground
   *  (`paintTrap`). Returns what it made, so it can be taken away when the trap is gone. */
  private trapProps(tile: Container, t: Tile, area: Area, x: number, y: number, live: Live, strike?: HazardKind): Container[] {
    const out: Container[] = [];
    const ph = (x * 0.071 + y * 0.113) % (Math.PI * 2);
    const put = (sp: Sprite) => {
      tile.addChild(sp);
      out.push(sp);
      return sp;
    };
    // (the painted sheet's cell, once it has one: it stands on the tile in the stand-in's place, `trapArt.ts`)
    const painted = trapTexture(trapCell(t, area, strike));
    if (painted) {
      const sp = put(new Sprite(painted.tex));
      sp.anchor.set(painted.ax, painted.ay);
      sp.scale.set(TRAP_ART_SCALE);
      sp.position.set(x, y);
      if (t.brazier) {
        const g = put(new Sprite(glow()));
        g.anchor.set(0.5);
        g.tint = TRAP_LOOKS.brazier.colour;
        g.blendMode = 'add';
        g.position.set(x, y - 22);
        live.lights.push({ sp: g, ph, base: 0.55 });
      }
      return out;
    }
    if (t.brazier) {
      const before = tile.children.length;
      addPic(tile, setPiece('brazier', area), x, y, live);
      out.push(...(tile.children.slice(before) as Container[]));
    } else if (t.trap === 'brambles' && art) {
      // (two low tangles, one behind the tile's middle and one before it: whoever stands there shows between them)
      const thorns = art.areas.graveyard.tall;
      for (const [k, dx, dy] of [[0, -9, -3], [1, 10, 7]] as const) {
        const sp = put(new Sprite(thorns[k % thorns.length]));
        sp.anchor.set(0.5, 1);
        sp.scale.set(k ? 0.34 : 0.5);
        sp.tint = area === 'graveyard' ? 0xffffff : area === 'oasis' ? 0xd8c890 : 0xb8c890;
        sp.position.set(x + dx, y + dy + 4);
        live.sway.push({ sp, ph: ph + k, amp: 0.03 });
      }
    } else if (t.trap === 'totem') {
      const frames = totemFrames();
      if (frames) {
        const sp = put(new Sprite(frames[0]));
        sp.anchor.set(0.5, 0.94);
        sp.scale.set(0.5);
        sp.position.set(x, y - 2);
        live.loops.push({ sp, frames, ph: t.deco % frames.length, ms: 150 });
      }
      const g = put(new Sprite(glow()));
      g.anchor.set(0.5);
      g.tint = TRAP_LOOKS.totem.colour;
      g.blendMode = 'add';
      g.scale.set(TW / 40, TH / 34);
      g.position.set(x, y);
      live.lights.push({ sp: g, ph, base: 0.4, kind: 'magic' });
    } else if (t.trap === 'ward') {
      const frames = runeFrames(area === 'shrine' || area === 'crystal' ? 'moon' : 'crystal');
      if (frames) {
        const sp = put(new Sprite(frames[0]));
        sp.anchor.set(0.5);
        sp.scale.set(1.5, 0.75);
        sp.blendMode = 'add';
        sp.position.set(x, y);
        live.loops.push({ sp, frames, ph: t.deco % frames.length, ms: 130 });
      }
      const g = put(new Sprite(glow()));
      g.anchor.set(0.5);
      g.tint = TRAP_LOOKS.ward.colour;
      g.blendMode = 'add';
      g.scale.set(TW / 44, TH / 38);
      g.position.set(x, y);
      live.lights.push({ sp: g, ph, base: 0.38, kind: 'magic' });
    }
    return out;
  }

  /** LIVING-FIELDS: a trap has sprung or changed (`fieldTrap`): what stood on its tile goes if it is gone, and the ground is painted again
   *  (its mark is gone, thin ice is cracked or water, a brazier's coals lie round it). */
  trapChanged(u: number, v: number, gone: boolean): void {
    const b = this.board;
    if (!b || !this.built) return;
    const i = v * b.w + u;
    const had = this.built.traps.get(i);
    if (had) {
      for (const c of had.made) if (!c.destroyed) c.destroy();
      // (a trap that is spent leaves nothing standing; one that has changed stands as it now is)
      had.made = gone && !tileAt(b, u, v)?.trap ? [] : had.again();
    }
    this.repaint();
  }

  /** LIVING-FIELDS: paint the host's columns again, in place: when its land's floor sheet has arrived, or a tile's ground has changed in the
   *  fight (thin ice breaking, a brazier's coals). Nothing else on the board is touched. */
  repaint(): void {
    for (const built of [this.built, this.old]) if (built) for (const f of built.redo) f();
  }

  /** ALIVE: a tile's own life (looks only): light shimmering on still water, a breathing glow over lava or coals, a pulse over a
   *  shrine. Made once with the tile; `step` moves them. */
  private tileLife(tile: Container, t: Tile, area: Area, x: number, y: number, u: number, v: number, live: Live, streaked: boolean): void {
    const lavaLike = t.ground === 'lava' || t.ground === 'coals' || (t.ground === 'deep' && LAVA_LANDS.includes(area));
    const ph = ((u * 7 + v * 13) % 31) * 0.37;
    if (lavaLike) {
      const g = new Sprite(glow());
      g.anchor.set(0.5);
      g.tint = t.ground === 'coals' ? 0xff6a20 : 0xff8a30;
      g.blendMode = 'add';
      g.scale.set(TW / 40, TH / 40);
      g.position.set(x, y);
      g.alpha = 0.3;
      tile.addChild(g);
      live.lights.push({ sp: g, ph, base: 0.32, kind: 'lava' });
    } else if (t.ground === 'water' || t.ground === 'deep') {
      // (running water has its own streaks)
      if (streaked) return;
      const sp = new Sprite(rippleOf());
      sp.position.set(x - TW / 2, y - TH / 2);
      sp.alpha = 0.25;
      tile.addChild(sp);
      live.ripples.push({ sp, x: x - TW / 2, ph });
    } else if (t.ground === 'shrine') {
      const g = new Sprite(glow());
      g.anchor.set(0.5);
      g.tint = 0x90ffe0;
      g.blendMode = 'add';
      g.scale.set(TW / 36, TH / 30);
      g.position.set(x, y - 6);
      g.alpha = 0.35;
      tile.addChild(g);
      live.lights.push({ sp: g, ph, base: 0.4, kind: 'magic' });
    }
  }

  /** Where the board's lit props stand (world px; a lantern, a torch, a forge fire), for night's glows (`weatherView.ts`). */
  litSpots(): [number, number][] {
    const b = this.board;
    const lit = b && LIT_PROPS[b.area];
    if (!b || !lit) return [];
    const n = AREA_URLS[b.area].boulders.length;
    const f = { rot: this.rot, ou: 0, ov: 0, w: b.w, d: b.d };
    const out: [number, number][] = [];
    b.tiles.forEach((t, i) => {
      if (t.rock && lit.includes(t.deco % n)) out.push(project(f, i % b.w, Math.floor(i / b.w), t.h));
    });
    return out;
  }

  /** Light a tile (or clear it). */
  mark(u: number, v: number, kind: Mark): void {
    const b = this.board;
    if (!b) return;
    const g = this.marks[v * b.w + u];
    g.clear();
    if (!kind) return;
    const [col, alpha] = MARK_COLOUR[kind];
    g.poly([0, -TH / 2 + 2, TW / 2 - 3, 0, 0, TH / 2 - 2, -TW / 2 + 3, 0])
      .fill({ color: col, alpha })
      .stroke({ color: col, alpha: Math.min(1, alpha * 2.2), width: 1.5 });
  }

  /** A powder barrel has gone off: its sprite goes. */
  removeBarrel(u: number, v: number): void {
    const b = this.board;
    if (!b || !this.built) return;
    const i = v * b.w + u;
    this.built.barrels.get(i)?.destroy();
    this.built.barrels.delete(i);
    // (the tile's own column is the same without it)
  }

  /** The ground layer of the host's tile (`Built.grounds`), or null off the board or with none built. */
  groundAt(u: number, v: number): Container | null {
    const b = this.board;
    if (!b || !this.built || u < 0 || v < 0 || u >= b.w || v >= b.d) return null;
    const g = this.built.grounds[v * b.w + u];
    return g && !g.destroyed ? g : null;
  }

  /** FIXES-4: the layer just over one diagonal row of the host's tiles (`depthIn`), under the fighters on it and the nearer rows: where a
   *  painted ground loop's piece for that row is laid (`GroundPaint`). Made when first asked for; a rebuild takes it with the board. */
  groundRow(depth: number): Container | null {
    if (!this.built) return null;
    let c = this.rows.get(depth);
    if (!c || c.destroyed || c.parent !== this.root) {
      c = new Container();
      c.zIndex = depth + 1;
      this.root.addChild(c);
      this.rows.set(depth, c);
    }
    return c;
  }
  private rows = new Map<number, Container>();

  clearMarks(): void {
    for (const g of this.marks) g.clear();
  }

  /** The Nemesis War, phase 4: a duel's ring, the middle 5x5 its two keep to (`duelRing.ts`): a ring of standing stones round it (PR #464's
   *  painting), a stone at each corner and four along each side, over a faint gilt on its floor, between the edge's tiles so none stands in a fighter's way. Each stands on
   *  the highest ground it touches (the board is not flat) and is drawn in the fighters' order, so one on the near side stands in front of
   *  the edge's fighters and one on the far side behind them. Until the art has loaded, the edge's tiles are outlined in brass as before.
   *  Kept through the fight (`clearMarks` leaves it; a rebuild takes it away); null takes it away. */
  ring(d: { mid: { u: number; v: number }; r: number } | null): void {
    for (const g of this.rings) g.clear();
    for (const s of this.ringStones) s.destroy();
    this.ringStones = [];
    const b = this.board;
    if (!d || !b) return;
    if (art?.stones.length) {
      const f = { rot: this.rot, ou: 0, ov: 0, w: b.w, d: b.d };
      // (the painting's ring is the 5x5's; a wider ring spreads the same stones out)
      const k = (d.r + 0.5) / 2.5;
      for (const st of art.stones) {
        const fu = d.mid.u + st.du * k;
        const fv = d.mid.v + st.dv * k;
        // (the highest of the tiles round the stone's foot)
        let h = -Infinity;
        for (const u of [Math.floor(fu), Math.ceil(fu)])
          for (const v of [Math.floor(fv), Math.ceil(fv)]) {
            const t = tileAt(b, u, v);
            if (t && !t.chasm) h = Math.max(h, t.h);
          }
        if (h === -Infinity) continue;
        const sp = new Sprite(st.tex);
        sp.anchor.set(st.fx / st.tex.width, st.fy / st.tex.height);
        const [x, y] = project(f, fu, fv, h);
        sp.position.set(Math.round(x), Math.round(y));
        sp.zIndex = depthIn(f, fu, fv) + 4;
        this.root.addChild(sp);
        this.ringStones.push(sp);
      }
      // (and the ring's floor a faint gilt, so the ground the two keep to reads among the land's own stones)
      for (let dv = -d.r; dv <= d.r; dv++)
        for (let du = -d.r; du <= d.r; du++) {
          const u = d.mid.u + du;
          const v = d.mid.v + dv;
          const g = u >= 0 && v >= 0 && u < b.w && v < b.d ? this.rings[v * b.w + u] : undefined;
          g?.poly([0, -TH / 2, TW / 2, 0, 0, TH / 2, -TW / 2, 0]).fill({ color: RING_GILT, alpha: 0.18 });
        }
      return;
    }
    for (let dv = -d.r; dv <= d.r; dv++)
      for (let du = -d.r; du <= d.r; du++) {
        const u = d.mid.u + du;
        const v = d.mid.v + dv;
        const g = u >= 0 && v >= 0 && u < b.w && v < b.d ? this.rings[v * b.w + u] : undefined;
        if (!g) continue;
        const edge = Math.abs(du) === d.r || Math.abs(dv) === d.r;
        g.poly([0, -TH / 2 + 3, TW / 2 - 4, 0, 0, TH / 2 - 3, -TW / 2 + 4, 0]).fill({ color: RING_GILT, alpha: edge ? 0.2 : 0.08 });
        if (edge) g.stroke({ color: RING_BRASS, alpha: 0.85, width: 2 });
      }
  }
  /** The duel ring's stones on the board now. */
  private ringStones: Sprite[] = [];

  /** One tile's column: its top laid on the diamond, its two sides down to the foot. */
  private column(t: Tile, u: number, v: number, area: Area, boss = false, road = false, fl?: FloorTile, strike?: HazardKind): ColumnLease<Texture> {
    const set = art?.areas[area];
    const top = (!road && t.h >= STONY) || boss || t.perch ? -1 : set ? (t.deco + u + v) % set.tops.length : -1;
    const skirt = road ? Math.min(t.h, ROAD_SKIRT) : -1;
    // (LIVING-FIELDS: a painted floor's column is its own: its ground, its place in the texture, its neighbours' edges and its seams)
    const floor = fl ? `floor:${fl.role}:${mod4(fl.U)}${mod4(fl.V)}:${fl.fringes.map((x) => `${x.role}${x.turn}${x.corner ? 'c' : ''}${x.foam ? 'f' : ''}`).join(',')}:${fl.seams.map((x) => +x).join('')}:${fl.tone ?? ''}:${fl.puddle ? 'p' : ''}` : '';
    // (and a trap's mark, or a strike's)
    const trap = t.trap || strike ? `trap:${t.trap ?? ''}:${strike ?? ''}:${t.deco % 4}` : '';
    const extra = (road ? `skirt${skirt}` : '') + floor + trap;
    const key = columnKey(area, boss, t.h, !!t.bridge, t.ground, top, artEpoch, u, v, !!t.perch, !!t.ramp, extra || undefined);
    const bytes = TW * (TH + (road ? skirt : t.h) * HH + FOOT + (boss && !road ? HH : 0)) * 4;
    // (WAVE-DELAY: how many columns a frame painted, how long that took, and how many it found already painted, for the stops' log)
    let painted = false;
    const lease = this.columns.acquire(
      key,
      bytes,
      () => {
        painted = true;
        return diagTimed('columns painted', () => this.paintColumn(t, u, v, area, boss, road ? skirt : -1, fl, strike));
      },
      // (a kept column is used again only while its texture is whole: one destroyed or emptied is painted afresh)
      (tex) => !tex.destroyed && !!tex.source && !tex.source.destroyed && !!tex.source.resource,
    );
    if (!painted) diagStep('columns from the cache', 0);
    return lease;
  }

  /** Original full-resolution painter; reuse only columns whose appearance inputs match. */
  private paintColumn(t: Tile, u: number, v: number, area: Area, boss = false, skirt = -1, fl?: FloorTile, strike?: HazardKind): Texture {
    const set = art?.areas[area];
    // (a boss arena stands on a plinth one step deeper; an army road's tile has a short skirt instead of a cliff to the foot)
    const road = skirt >= 0;
    const deep = road ? skirt * HH + FOOT : t.h * HH + FOOT + (boss ? HH : 0);
    const c = document.createElement('canvas');
    c.width = TW;
    c.height = TH + deep;
    const g = c.getContext('2d', SOFT)!;
    g.imageSmoothingEnabled = false;
    // (a boss arena is all flagstone, with a gilded lip; on an army's road only the paved tiles are, whatever the height)
    const stony = road ? boss : t.h >= STONY || boss;
    const lip = boss ? BOSS_LIP : LIP[area][stony ? 1 : 0];
    const face = (pts: [number, number][], fill: string | CanvasPattern) => {
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
      g.closePath();
      g.fill();
    };
    // the sides: the rock face tiled down them, the left lit and the right in shade
    const rock = set?.side;
    const side = (x0: number, x1: number, y0: number, y1: number, shade: string) => {
      g.save();
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.lineTo(x1, y1 + deep);
      g.lineTo(x0, y0 + deep);
      g.closePath();
      if (rock) {
        g.clip();
        const off = ((u * 23 + v * 11) % 5) * 16;
        for (let y = 0; y < TH + deep; y += rock.height)
          for (let x = -off; x < TW; x += rock.width) g.drawImage(rock, x, y);
        g.fillStyle = shade;
        g.fillRect(0, 0, TW, TH + deep);
      } else {
        g.fillStyle = '#6e6a62';
        g.fill();
      }
      g.restore();
    };
    // (LIVING-FIELDS: the land's painted floor, `floorRules.ts`: a boss's arena is paved, whatever the land)
    const fa: FloorArt | null = fl ? floorArt(FLOORS[area].hold) : null;
    const fset = FLOORS[area];
    const role: Role = !fl ? 'ground' : boss && (fl.role === 'ground' || fl.role === 'second' || fl.role === 'path' || fl.role === 'outcrop' || fl.role === 'shore' || fl.role === 'high') ? 'dais' : fl.role;
    if (fa) {
      // the faces: the sheet's face for this top, a lip on the top step, a foot on the lowest, the body's four steps between
      const col = FACE_NAMES.indexOf(faceOf(fset, role, t.h));
      const sx = (col % 6) * 64;
      const sy = Math.floor(col / 6) * 120;
      const steps = Math.ceil(deep / HH);
      const sheetFace = (img: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number) => {
        g.save();
        g.beginPath();
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.lineTo(x1, y1 + deep);
        g.lineTo(x0, y0 + deep);
        g.closePath();
        g.clip();
        g.imageSmoothingEnabled = true;
        for (let k = 0; k < steps; k++) {
          const part = k === 0 ? (fset.lip ? 0 : 20) : k === steps - 1 && steps >= 3 ? 100 : 20 + ((k - 1) % 4) * 20;
          g.setTransform((x1 - x0) / 64, (y1 - y0) / 64, 0, HH / 20, x0, y0 + k * HH);
          g.drawImage(img, sx, sy + part, 64, 20, 0, 0, 64, 20.6);
        }
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (fset.faceTint) {
          // (the land's own earth: its hue laid over the sheet's face, the face's light and shade kept)
          g.globalCompositeOperation = 'color';
          g.fillStyle = fset.faceTint;
          g.fillRect(0, 0, TW, TH + deep);
          g.globalCompositeOperation = 'source-over';
        }
        if (fset.tone) {
          g.fillStyle = fset.tone;
          g.fillRect(0, 0, TW, TH + deep);
        }
        g.restore();
      };
      // (behind the face, the old rock: the sheet's lip is ragged, and nothing should show through it)
      side(0, TW / 2, TH / 2, TH, 'rgba(10,8,6,0.55)');
      side(TW / 2, TW, TH, TH / 2, 'rgba(8,6,14,0.7)');
      sheetFace(fa.faces.left, 0, TH / 2, TW / 2, TH);
      sheetFace(fa.faces.right, TW / 2, TH, TW, TH / 2);
    } else {
      side(0, TW / 2, TH / 2, TH, 'rgba(60,40,20,0.12)');
      side(TW / 2, TW, TH, TH / 2, 'rgba(8,6,14,0.45)');
    }
    if (road && deep > 3 * HH) {
      // (the skirt fades out below its first steps: the land goes on into the haze rather than ending in a wall)
      g.save();
      g.globalCompositeOperation = 'destination-out';
      const fade = g.createLinearGradient(0, TH + 2.2 * HH, 0, TH + deep);
      fade.addColorStop(0, 'rgba(0,0,0,0)');
      fade.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = fade;
      g.fillRect(0, TH / 2 + 2.2 * HH, TW, deep + TH);
      g.restore();
    }
    // faint lines at each step (a painted face has its own courses)
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    g.lineWidth = 1;
    for (let k = HH; k < deep && !fa; k += HH) {
      g.beginPath();
      g.moveTo(0, TH / 2 + k);
      g.lineTo(TW / 2, TH + k);
      g.lineTo(TW, TH / 2 + k);
      g.stroke();
    }
    if (!fa || boss) face([[0, TH / 2], [TW / 2, TH], [TW, TH / 2], [TW, TH / 2 + 3], [TW / 2, TH + 3], [0, TH / 2 + 3]], lip);
    // the top: the tile's ground laid onto the diamond
    g.save();
    g.beginPath();
    g.moveTo(TW / 2, 0);
    g.lineTo(TW, TH / 2);
    g.lineTo(TW / 2, TH);
    g.lineTo(0, TH / 2);
    g.closePath();
    g.clip();
    if (art && fa && fl) {
      const a = TW / (2 * SRC);
      const b = TH / (2 * SRC);
      g.imageSmoothingEnabled = true;
      // (a role's picture laid on the tile's square: its quarter of the sheet's 4 x 4 tile texture, by where the tile lies, so the
      //  ground runs on from tile to tile; or a shared picture for what the sheet does not paint)
      const lay = (c: CanvasRenderingContext2D, r: Role): boolean => {
        const slot = slotOf(fset, r);
        // (the land's own colour for this ground, where it has one: the sheet's painting graded to it, `gradedGround`)
        const own = slot >= 0 && fset.tint?.[r] !== undefined ? gradedGround(fset.hold, slot, fset.tint[r]!) : null;
        if (own) c.drawImage(own, mod4(fl.U) * 64, mod4(fl.V) * 64, 64, 64, 0, 0, SRC, SRC);
        else if (slot >= 0) c.drawImage(fa.ground, (slot % 4) * 256 + mod4(fl.U) * 64, Math.floor(slot / 4) * 256 + mod4(fl.V) * 64, 64, 64, 0, 0, SRC, SRC);
        else if (r === 'ice') c.drawImage(art!.ice, 0, 0, SRC, SRC);
        else if (r === 'lava' || r === 'coals') c.drawImage(art!.lava, 0, 0, SRC, SRC);
        else if (r === 'water' || r === 'deep') c.drawImage(art!.water, 0, 0, SRC, SRC);
        else return false;
        return true;
      };
      g.setTransform(a, b, -a, b, TW / 2, 0);
      lay(g, role);
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (fl.tone) {
        // (the land's own water: its hue over the sheet's painting, the painting's light and shade kept; then its murk)
        g.globalCompositeOperation = 'color';
        g.fillStyle = fl.tone.replace(/[\d.]+\)$/, '1)');
        g.fillRect(0, 0, TW, TH);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = fl.tone.replace(/[\d.]+\)$/, `${(+(fl.tone.match(/([\d.]+)\)$/)?.[1] ?? 0.6) * 0.5).toFixed(2)})`);
        g.fillRect(0, 0, TW, TH);
      }
      const wash = role === 'water' ? fset.waterTone : role === 'deep' ? fset.deepTone : undefined;
      for (const tone of [wash, role === 'lava' && t.ground === 'deep' ? fset.deepTone : undefined, fset.tone]) {
        if (!tone) continue;
        g.fillStyle = tone;
        g.fillRect(0, 0, TW, TH);
      }
      // the ragged edges of the grounds beside it, and the waterline
      for (const fr of fl.fringes) {
        let pic: HTMLCanvasElement;
        if (fr.foam) pic = (fr.corner ? fa.foamCorner : fa.foam)[fr.turn];
        else {
          const c = scratch();
          const sg = c.getContext('2d', SOFT)!;
          sg.globalCompositeOperation = 'source-over';
          sg.clearRect(0, 0, SRC, SRC);
          if (!lay(sg, fr.role)) continue;
          if (fset.tone) {
            sg.fillStyle = fset.tone;
            sg.fillRect(0, 0, SRC, SRC);
          }
          sg.globalCompositeOperation = 'destination-in';
          sg.drawImage((fr.corner ? fa.raggedCorner : fa.ragged)[fr.turn], 0, 0);
          pic = c;
        }
        g.setTransform(a, b, -a, b, TW / 2, 0);
        g.drawImage(pic, 0, 0);
        g.setTransform(1, 0, 0, 1, 0, 0);
      }
      if (fl.puddle) {
        // (standing water on a wet land's low ground: a ragged pool of the land's water, dark at its rim, with a glint)
        const k = (u * 7 + v * 13) % 5;
        const [px, py, rx, ry] = [TW * (0.42 + k * 0.04), TH * (0.46 + (k % 3) * 0.05), TW * (0.2 + (k % 2) * 0.05), TH * (0.17 + (k % 3) * 0.03)];
        g.save();
        g.beginPath();
        g.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
        g.ellipse(px + rx * 0.7, py + ry * 0.5, rx * 0.55, ry * 0.6, 0, 0, Math.PI * 2);
        g.fillStyle = 'rgba(18,70,66,0.82)';
        g.fill();
        g.strokeStyle = 'rgba(8,30,26,0.55)';
        g.lineWidth = 1;
        g.stroke();
        g.strokeStyle = 'rgba(190,235,220,0.55)';
        g.beginPath();
        g.moveTo(px - rx * 0.45, py - ry * 0.2);
        g.quadraticCurveTo(px, py - ry * 0.55, px + rx * 0.45, py - ry * 0.2);
        g.stroke();
        g.restore();
      }
    } else if (art && set) {
      const a = TW / (2 * SRC);
      const b = TH / (2 * SRC);
      g.imageSmoothingEnabled = true;
      g.setTransform(a, b, -a, b, TW / 2, 0);
      const lie = t.bridge ? art.planks : t.ground === 'deep' ? (LAVA_LANDS.includes(area) ? art.lava : art.water) : t.ground === 'coals' ? art.lava : t.ground && t.ground !== 'tall' && t.ground !== 'shrine' ? art[t.ground] : null;
      // (planks are pixel art: not smoothed)
      if (t.bridge) g.imageSmoothingEnabled = false;
      g.drawImage(lie ?? (stony ? set.high : set.tops[(t.deco + u + v) % set.tops.length]), 0, 0, SRC, SRC);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      g.fillStyle = lip;
      g.fillRect(0, 0, TW, TH);
    }
    // (high ground a shade lighter, so the heights read at a glance)
    // (an army road stands tens of steps high: its tops take a soft band of light that rises and falls with the height, never bleaching out)
    const band = Math.abs((t.h % 16) - 8) / 8;
    g.fillStyle = `rgba(255,248,220,${road ? 0.02 + band * 0.1 : 0.03 + t.h * 0.035})`;
    g.fillRect(0, 0, TW, TH);
    // (the ground that matters is marked so it reads at a glance: ripples on shallows, glints on ice, a glow on lava)
    g.lineWidth = 1;
    if (t.ground === 'water') {
      g.strokeStyle = 'rgba(220,240,255,0.7)';
      for (const [x, y] of [[TW * 0.34, TH * 0.5], [TW * 0.6, TH * 0.36], [TW * 0.56, TH * 0.68]]) {
        g.beginPath();
        g.moveTo(x - 5, y);
        g.quadraticCurveTo(x, y - 2.5, x + 5, y);
        g.stroke();
      }
    } else if (t.ground === 'ice') {
      if (area === 'snow') {
        // (LAND-IDENTITY: on the snows ice is pale on pale, so it lies bluer there, with a bright rim of light along its far edges: looks only)
        g.fillStyle = 'rgba(24,104,222,0.5)';
        g.fillRect(0, 0, TW, TH);
        g.strokeStyle = 'rgba(235,250,255,0.9)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(3, TH / 2);
        g.lineTo(TW / 2, 1.5);
        g.lineTo(TW - 3, TH / 2);
        g.stroke();
        g.lineWidth = 1;
      }
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      for (const [x, y] of [[TW * 0.38, TH * 0.42], [TW * 0.64, TH * 0.6]]) {
        g.beginPath();
        g.moveTo(x - 4, y + 3);
        g.lineTo(x + 4, y - 3);
        g.moveTo(x - 2, y - 3);
        g.lineTo(x + 2, y + 3);
        g.stroke();
      }
    } else if (t.ground === 'lava') {
      const glow = g.createRadialGradient(TW / 2, TH / 2, 2, TW / 2, TH / 2, TW / 2.4);
      glow.addColorStop(0, 'rgba(255,230,120,0.5)');
      glow.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, TW, TH);
    } else if (t.ground === 'tall') {
      g.fillStyle = 'rgba(0,20,0,0.16)';
      g.fillRect(0, 0, TW, TH);
    } else if (t.ground === 'deep') {
      // (deep water: the shallows' texture, darkened, with a few long ripples; on a volcano a lake of lava, darkened to a crust)
      // (a painted floor has its own deep tone already, `FloorSet.deepTone`)
      g.fillStyle = fa ? 'rgba(0,0,0,0)' : LAVA_LANDS.includes(area) ? 'rgba(30,6,0,0.4)' : 'rgba(6,22,66,0.5)';
      g.fillRect(0, 0, TW, TH);
      g.strokeStyle = LAVA_LANDS.includes(area) ? 'rgba(255,170,80,0.45)' : 'rgba(160,200,255,0.4)';
      for (const [x, y] of [[TW * 0.4, TH * 0.4], [TW * 0.62, TH * 0.62]]) {
        g.beginPath();
        g.moveTo(x - 7, y);
        g.quadraticCurveTo(x, y - 3, x + 7, y);
        g.stroke();
      }
    } else if (t.ground === 'shrine') {
      // (a soft teal glow on the stone, and a ring of runes round the crystal: still, no pulse)
      const glow = g.createRadialGradient(TW / 2, TH / 2, 2, TW / 2, TH / 2, TW / 2.2);
      glow.addColorStop(0, 'rgba(150,255,230,0.55)');
      glow.addColorStop(1, 'rgba(60,200,180,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, TW, TH);
      g.strokeStyle = 'rgba(190,255,240,0.85)';
      g.beginPath();
      g.ellipse(TW / 2, TH / 2, TW * 0.3, TH * 0.3, 0, 0, Math.PI * 2);
      g.stroke();
    } else if (t.perch) {
      // (elevated archer perch: defensive flagstone tint and firing chevron pointing toward the enemy)
      g.fillStyle = 'rgba(235,215,180,0.18)';
      g.fillRect(0, 0, TW, TH);
      g.strokeStyle = 'rgba(255,235,175,0.7)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(TW * 0.32, TH * 0.58);
      g.lineTo(TW * 0.5, TH * 0.36);
      g.lineTo(TW * 0.68, TH * 0.58);
      g.stroke();
    } else if (t.ramp) {
      // (stepped ramp: wooden / stone stepped riser slats)
      g.fillStyle = 'rgba(180,150,110,0.15)';
      g.fillRect(0, 0, TW, TH);
      g.strokeStyle = 'rgba(240,210,165,0.75)';
      g.lineWidth = 1.4;
      for (const yFrac of [0.38, 0.52, 0.66]) {
        g.beginPath();
        g.moveTo(TW * 0.28, TH * yFrac);
        g.lineTo(TW * 0.72, TH * yFrac);
        g.stroke();
      }
    }
    // (LIVING-FIELDS: a trap's mark on the ground, or the mark of a strike that comes down here: its tell before the fight)
    if ((t.trap || strike) && !hasTrapArt(trapCell(t, area, strike))) paintTrap(g, t, area, strike);
    g.restore();
    g.strokeStyle = t.trap && t.trap !== 'thin' ? TRAP_LOOKS[t.trap].rim : strike && RISK_RIM[strike] ? RISK_RIM[strike]! : t.bridge ? BRIDGE_RIM : t.ground === 'deep' && LAVA_LANDS.includes(area) ? 'rgba(255,120,30,0.95)' : t.ground ? RIM[t.ground] : t.perch ? 'rgba(245,220,150,0.85)' : t.ramp ? 'rgba(215,185,135,0.75)' : boss ? 'rgba(255,226,140,0.75)' : 'rgba(20,14,8,0.35)';
    g.lineWidth = t.bridge || (t.ground && t.ground !== 'tall') || t.perch || t.ramp || t.trap || strike ? 2 : 1;
    if (fa && fl && !boss && !t.perch && !t.ramp) {
      // (a painted floor: a tile's line is drawn only on the sides where something changes, a height or a kind of ground the rules care
      //  about; between two tiles of one ground at one height there is only the faintest grid, so a field reads as a field)
      const pts = [[TW / 2, 0.5], [TW - 0.5, TH / 2], [TW / 2, TH - 0.5], [0.5, TH / 2]];
      const strong = g.strokeStyle;
      const wide = g.lineWidth;
      fl.seams.forEach((seam, k) => {
        g.strokeStyle = seam ? strong : 'rgba(20,14,8,0.1)';
        g.lineWidth = seam ? wide : 1;
        g.beginPath();
        g.moveTo(pts[k][0], pts[k][1]);
        g.lineTo(pts[(k + 1) % 4][0], pts[(k + 1) % 4][1]);
        g.stroke();
      });
      return Texture.from(c);
    }
    g.beginPath();
    g.moveTo(TW / 2, 0.5);
    g.lineTo(TW - 0.5, TH / 2);
    g.lineTo(TW / 2, TH - 0.5);
    g.lineTo(0.5, TH / 2);
    g.closePath();
    g.stroke();
    return Texture.from(c);
  }
}

/** LIVING-FIELDS: a trap's mark painted on its tile's top (the canvas is clipped to the diamond): the tell every fighter and the player can
 *  see before the fight. Plain stand-ins, drawn here, until the painted sheet lands (`docs/notes/land-identity-art-prompts.md`); brambles,
 *  totems, wards and braziers also have something standing on the tile (`trapProps`). */
function paintTrap(g: CanvasRenderingContext2D, t: Tile, area: Area, strike?: HazardKind): void {
  const cx = TW / 2;
  const cy = TH / 2;
  const blob = (rx: number, ry: number, fill: string) => {
    g.fillStyle = fill;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  };
  const ring = (rx: number, ry: number, stroke: string, width = 1.5) => {
    g.strokeStyle = stroke;
    g.lineWidth = width;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.stroke();
  };
  const sandy = area === 'desert' || area === 'oasis';
  switch (t.trap) {
    case 'spikes': {
      // (a stone plate with its holes, the spikes' tips just showing)
      blob(TW * 0.3, TH * 0.3, 'rgba(60,54,48,0.85)');
      ring(TW * 0.3, TH * 0.3, 'rgba(224,200,144,0.9)');
      g.fillStyle = 'rgba(236,230,214,0.95)';
      for (const [dx, dy] of [[-10, 0], [0, -4], [10, 0], [0, 4], [-5, 3], [5, -3]]) {
        g.beginPath();
        g.moveTo(cx + dx - 2, cy + dy + 1.5);
        g.lineTo(cx + dx, cy + dy - 4);
        g.lineTo(cx + dx + 2, cy + dy + 1.5);
        g.closePath();
        g.fill();
      }
      break;
    }
    case 'snare': {
      // (a loop of rope on the ground, pegged)
      ring(TW * 0.24, TH * 0.24, 'rgba(60,40,16,0.9)', 4);
      ring(TW * 0.24, TH * 0.24, 'rgba(214,176,104,0.95)', 2);
      g.strokeStyle = 'rgba(214,176,104,0.95)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx + TW * 0.24, cy);
      g.lineTo(cx + TW * 0.38, cy - 3);
      g.stroke();
      g.fillStyle = 'rgba(90,60,30,1)';
      g.fillRect(cx + TW * 0.37, cy - 6, 3, 6);
      break;
    }
    case 'ward': {
      // (a ring of runes: the rune itself glows over it, `trapProps`)
      blob(TW * 0.3, TH * 0.3, 'rgba(120,90,220,0.28)');
      ring(TW * 0.3, TH * 0.3, 'rgba(200,170,255,0.95)');
      ring(TW * 0.19, TH * 0.19, 'rgba(200,170,255,0.7)', 1);
      break;
    }
    case 'brambles':
      blob(TW * 0.34, TH * 0.34, 'rgba(40,26,14,0.4)');
      break;
    case 'mud': {
      // (deep mud; on sand, quicksand: a paler sink with its rings)
      blob(TW * 0.36, TH * 0.36, sandy ? 'rgba(150,116,70,0.75)' : 'rgba(58,40,24,0.8)');
      ring(TW * 0.24, TH * 0.24, sandy ? 'rgba(232,206,150,0.7)' : 'rgba(120,92,60,0.75)', 1);
      ring(TW * 0.12, TH * 0.12, sandy ? 'rgba(232,206,150,0.7)' : 'rgba(120,92,60,0.75)', 1);
      break;
    }
    case 'bog': {
      blob(TW * 0.36, TH * 0.36, 'rgba(52,70,26,0.85)');
      g.strokeStyle = 'rgba(170,230,90,0.9)';
      g.lineWidth = 1;
      for (const [dx, dy, r] of [[-9, -1, 3], [5, 3, 2.2], [9, -3, 1.6], [-2, 4, 1.6]]) {
        g.beginPath();
        g.ellipse(cx + dx, cy + dy, r, r * 0.6, 0, 0, Math.PI * 2);
        g.stroke();
      }
      break;
    }
    case 'thin':
    case 'cracked': {
      // (thin ice: hairline cracks; cracked: dark water showing through them)
      const deep = t.trap === 'cracked';
      g.strokeStyle = deep ? 'rgba(20,60,110,0.95)' : 'rgba(90,150,200,0.8)';
      g.lineWidth = deep ? 2 : 1;
      g.beginPath();
      for (const line of [[-14, -2, -4, 1, 2, -3, 12, 2], [-4, 1, -7, 6], [2, -3, 5, -7], [2, -3, 6, 5, 3, 8]]) {
        g.moveTo(cx + line[0], cy + line[1]);
        for (let k = 2; k < line.length; k += 2) g.lineTo(cx + line[k], cy + line[k + 1]);
      }
      g.stroke();
      break;
    }
    case 'totem':
      ring(TW * 0.3, TH * 0.3, 'rgba(230,150,60,0.9)');
      break;
    default:
      break;
  }
  if (!strike || t.trap) return;
  // a timed strike's tile: a mark of what comes down here, in the strike's own colour
  const c = HAZARD_LOOKS[strike].colour;
  const css = (a: number) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
  if (strike === 'geyser') {
    blob(TW * 0.16, TH * 0.16, 'rgba(20,16,14,0.9)');
    ring(TW * 0.2, TH * 0.2, css(0.85));
    ring(TW * 0.3, TH * 0.3, css(0.35), 1);
  } else if (strike === 'rockfall') {
    g.fillStyle = 'rgba(96,84,70,0.9)';
    for (const [dx, dy, r] of [[-10, 1, 3], [-2, -4, 2.2], [7, 2, 3.4], [2, 5, 2], [12, -2, 1.8]]) {
      g.beginPath();
      g.ellipse(cx + dx, cy + dy, r, r * 0.7, 0, 0, Math.PI * 2);
      g.fill();
    }
    ring(TW * 0.34, TH * 0.34, css(0.5), 1);
  } else if (strike === 'grasp') {
    blob(TW * 0.3, TH * 0.3, 'rgba(30,22,34,0.6)');
    g.strokeStyle = css(0.85);
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(cx - 10, cy + 1);
    g.lineTo(cx - 3, cy - 2);
    g.lineTo(cx + 3, cy + 2);
    g.lineTo(cx + 10, cy - 1);
    g.stroke();
  } else if (strike === 'blades') {
    // (the slot the blade swings in)
    g.strokeStyle = 'rgba(16,14,18,0.9)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(cx - TW * 0.3, cy);
    g.lineTo(cx + TW * 0.3, cy);
    g.stroke();
    g.strokeStyle = css(0.9);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx - TW * 0.3, cy - 2);
    g.lineTo(cx + TW * 0.3, cy - 2);
    g.stroke();
  } else if (strike === 'lightning') {
    // (a scorched star where it has struck before)
    blob(TW * 0.2, TH * 0.2, 'rgba(30,26,20,0.6)');
    g.strokeStyle = css(0.85);
    g.lineWidth = 1.5;
    g.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.3;
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * TW * 0.26, cy + Math.sin(a) * TH * 0.26);
    }
    g.stroke();
  } else ring(TW * 0.3, TH * 0.3, css(0.6));
}
