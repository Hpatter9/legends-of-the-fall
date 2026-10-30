// The Last Stand's castle room drawn (STAND-003; the rooms are `sim/standHalls.ts`): the floor baked into one picture (flagstones, the red
// carpets, the 5x5 dais of carpet and its step, a courtyard's grass and paths), the walls and pillars as their own columns so they stand in front
// of whoever is behind them (the near walls cut down low, so the room can be seen into), and the dressing: stained glass and gilt pilasters on
// the back walls with the glass's coloured light across the floor, braziers and lamps in pools of light, the cover (rubble, shelves, a well,
// stores), standards, the castle's enthroned king on his throne with his health over him, smoke rolling in at the breaches, and a burst of dust at
// each breach as a wave comes in. Deliberate light and motion only: the flames breathe, nothing blinks off; with reduced motion all of it holds still.
// It only reads the board and the plan.

import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Board, Tile } from '../sim/board';
import { breachTiles, hallPlan, inward, type Edge, type HallKind, type HallPlan } from '../sim/standHalls';
import { FIELD, KING_AT } from '../sim/standField';
import { FOOT, HH, rawAt, TH, TW } from './iso';
import { loadImage } from './loadImage';
import floor1Url from '../art/stand/ornate/limestone.png';
import floor2Url from '../art/stand/ornate/paving.png';
import rugUrl from '../art/stand/ornate/velvet.png';
import wallfaceUrl from '../art/stand/ornate/masonry.png';
import walltopUrl from '../art/stand/ornate/paving.png';
import rubble1Url from '../art/stand/ornate/rubble.png';
import rubble2Url from '../art/stand/ornate/rubble.png';
import shelf1Url from '../art/stand/ornate/bookcase.png';
import shelf2Url from '../art/stand/ornate/bookcase.png';
import windowUrl from '../art/stand/ornate/window.png';
import pilasterUrl from '../art/stand/ornate/column.png';
import smokeUrl from '../art/stand/smoke.png';
import dustUrl from '../art/stand/dust.png';
import landdustUrl from '../art/stand/landdust.png';
import grass1Url from '../art/stand/ornate/grass.png';
import grass2Url from '../art/stand/ornate/grass.png';
import bannerUrl from '../art/stand/ornate/banner.png';
import brazierUrl from '../art/stand/ornate/brazier.png';
import lampUrl from '../art/castle/lamp.png';
import fountainUrl from '../art/stand/ornate/fountain.png';
import wellUrl from '../art/castle/well.png';
import chestsUrl from '../art/castle/chests.png';
import cratesUrl from '../art/castle/crates.png';
import barrelsUrl from '../art/castle/barrels.png';
import potsUrl from '../art/castle/pots.png';
import standardUrl from '../art/camp/standard.png';
import doorUrl from '../art/stand/door.png';
import { exitOf } from '../sim/standActs';
import arcadeUrl from '../art/stand/ornate/arcade.png';
import deskUrl from '../art/stand/ornate/desk.png';
import medallionUrl from '../art/stand/ornate/medallion.png';
import rosesUrl from '../art/stand/ornate/roses.png';
import bushUrl from '../art/stand/ornate/ivy.png';
import { rulerSeatTexture, rulerTextures, rulerThrone } from './rulerArt';
import { rulerFrame, type RulerAction } from '../rulerRules';
import { settings } from '../settings';

export { default as standBackwallUrl } from '../art/stand/backwall.png';

const URLS = {
  arcade: arcadeUrl, desk: deskUrl, medallion: medallionUrl, roses: rosesUrl, bush: bushUrl, floor1: floor1Url, floor2: floor2Url, rug: rugUrl, wallface: wallfaceUrl, walltop: walltopUrl, rubble1: rubble1Url, rubble2: rubble2Url, shelf1: shelf1Url, shelf2: shelf2Url,
  window: windowUrl, pilaster: pilasterUrl, smoke: smokeUrl, dust: dustUrl, landdust: landdustUrl, grass1: grass1Url, grass2: grass2Url, banner: bannerUrl, brazier: brazierUrl,
  lamp: lampUrl, fountain: fountainUrl, well: wellUrl, chests: chestsUrl, crates: cratesUrl, barrels: barrelsUrl, pots: potsUrl, standard: standardUrl,
  door: doorUrl,
};
type Key = keyof typeof URLS;
let images: Promise<Record<Key, HTMLImageElement>> | null = null;
/** The room's pictures, loaded once (they are in the game's own bundle, so they are there offline). */
export function standHallArt(): Promise<Record<Key, HTMLImageElement>> {
  return (images ??= Promise.all((Object.keys(URLS) as Key[]).map(async (k) => [k, await loadImage(URLS[k])] as const)).then((xs) => Object.fromEntries(xs) as Record<Key, HTMLImageElement>));
}

/** How high the near walls (the south and east, between the room and the viewer) are drawn: cut down, so the room can be seen into. */
const NEAR_H = 2;
/** Display height of the selected ruler's square atlas cell. */
const KING_H = 210;
const KING_SCALE = 0.62;
/** The dust burst's frames and their length (ms). */
const DUST_FRAMES = 10;
const LAND_FRAMES = 14;
const BURST_MS = 720;
const GLASS = ['#6ab8ff', '#ffc04a', '#ff5a6a', '#8aff9a'];
/** The door the guard falls back by (STAND-RETREAT): five frames of 32 px, closed to open; how long it takes to swing open (ms); its scale. */
const DOOR_FRAMES = 5;
const DOOR_MS = 500;
const DOOR_SCALE = 2.6;
/** The king's place in the drawing order at his place on the dais. */
const KING_Z = (KING_AT.u + KING_AT.v) * 10 + 5;
/** How long the rubble of a breach caving in takes to fall (ms). */
const CAVE_MS = 700;
const ATAN = Math.atan(0.5);

interface Flame {
  sp: Sprite;
  base: number;
  phase: number;
}
interface Puff {
  sp: Sprite;
  x: number;
  y: number;
  dx: number;
  dy: number;
  phase: number;
  base: number;
}
interface Burst {
  ring: Sprite;
  land: Sprite;
  t: number;
}

/** A room drawn, its moving parts stepped by the page each frame. */
export class StandHall {
  /** Where the room's pieces go: the page's world container, so the walls and the dressing sort among the fighters by depth. */
  private root: Container = new Container();
  /** The pieces this room put there (let go with the room). */
  private kids: Container[] = [];
  /** The floor's one picture (behind everything). */
  private floor: Sprite | null = null;
  private flames: Flame[] = [];
  private puffs: Puff[] = [];
  private bursts: Burst[] = [];
  private king: Sprite | null = null;
  private emptyThrone: Sprite | null = null;
  private kingFrames: Texture[] = [];
  private kingBar = new Graphics();
  private decreeLeft = 0;
  private t = 0;
  private plan: HallPlan | null = null;
  private tex: Partial<Record<Key, Texture>> = {};
  private dustFrames: Texture[] = [];
  private landFrames: Texture[] = [];
  private burstLayer = new Container();
  /** The textures this room drew for itself (the floor, the columns, the glows): let go with the room. */
  private made: Texture[] = [];
  /** Where the king's head is (world px), for his speech. */
  kingTop = { x: 0, y: 0 };
  /** The retreat (STAND-RETREAT): the door in the back wall and its frames, the rubble falling into a breach, and the king's walk to the door. */
  private door: Sprite | null = null;
  private doorFrames: Texture[] = [];
  private doorT = -1;
  private doorZ = 0;
  private falling: { sp: Sprite; y: number; t: number }[] = [];
  private kingHome = { x: 0, y: 0 };
  private kingDoor = { x: 0, y: 0 };
  /** How far along the walk to the door the king is (0 to 1), or null when he is at his place. */
  private leave: number | null = null;
  reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
  }

  /** Lay a room out into `into` (its pictures must be loaded: `standHallArt`). The old room's pieces are let go. */
  build(into: Container, b: Board, seed: number, kind: HallKind, art: Record<Key, HTMLImageElement>): void {
    this.clear();
    this.root = into;
    const plan = (this.plan = hallPlan(seed, kind));
    const tex = (k: Key): Texture => (this.tex[k] ??= Texture.from(art[k]));
    for (const k of Object.keys(URLS) as Key[]) {
      const t = tex(k);
      if (t.source) t.source.scaleMode = 'nearest';
    }
    const shelf = tex('shelf1');
    const at = (u: number, v: number) => b.tiles[v * b.w + u];
    const top = (u: number, v: number, h = at(u, v).h): [number, number] => rawAt(u, v, h);
    const indoors = kind !== 'courtyard';
    const carpet = new Set(plan.carpets.flatMap((p) => [[p.u, p.v], [p.u - 1, p.v], [p.u + 1, p.v]])
      .filter(([u, v]) => u > 0 && v > 0 && u < FIELD - 1 && v < FIELD - 1)
      .map(([u, v]) => v * FIELD + u));
    const near = (u: number, v: number) => u === FIELD - 1 || v === FIELD - 1;

    // the floor: every tile that is not wall, in one picture
    this.floor = this.bakeFloor(b, art, (t, u, v) => {
      const r = Math.max(Math.abs(u - KING_AT.u), Math.abs(v - KING_AT.v));
      if (r <= 2) return art.rug;
      if (carpet.has(v * FIELD + u) && r > 3) return indoors ? art.rug : art.floor1;
      if (kind === 'chapel' && t.h >= 2 && r >= 9) return art.rug;
      if (!indoors && r > 6) return (u * 7 + v * 3) % 5 === 0 ? art.grass2 : art.grass1;
      return indoors ? art.floor1 : art.floor2;
    });
    this.put(this.floor);

    // Rear masonry and low foreground cutaways; interior columns use their own carved sprites.
    const columns = new Map<string, Texture>();
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const t = at(u, v);
        if (!t.wall) continue;
        const pillar = u > 0 && v > 0 && u < FIELD - 1 && v < FIELD - 1;
        if (pillar) continue; // The carved sprite below supplies the entire pillar silhouette.
        const h = near(u, v) ? Math.min(NEAR_H, t.h) : t.h + 4;
        const key = `${h}`;
        let c = columns.get(key);
        if (!c) {
          columns.set(key, (c = Texture.from(this.column(art, h))));
          this.made.push(c);
        }
        const sp = new Sprite(c);
        const [x, y] = top(u, v, h);
        sp.position.set(x - TW / 2, y - TH / 2);
        sp.zIndex = (u + v) * 10 + 4;
        this.put(sp);
      }

    const glows = { warm: Texture.from(glowCanvas(255, 170, 70)), gold: Texture.from(glowCanvas(255, 220, 120)), red: Texture.from(glowCanvas(255, 70, 40)) };
    this.made.push(glows.warm, glows.gold, glows.red);
    const add = (t: Texture, x: number, y: number, o: { ax?: number; ay?: number; scale?: number; sy?: number; z?: number; alpha?: number; add?: boolean; skewY?: number; tint?: number } = {}): Sprite => {
      const sp = new Sprite(t);
      sp.anchor.set(o.ax ?? 0.5, o.ay ?? 1);
      sp.position.set(x, y);
      sp.scale.set(o.scale ?? 1, (o.scale ?? 1) * (o.sy ?? 1));
      if (o.skewY) sp.skew.y = o.skewY;
      if (o.add) sp.blendMode = 'add';
      if (o.alpha !== undefined) sp.alpha = o.alpha;
      if (o.tint !== undefined) sp.tint = o.tint;
      sp.zIndex = o.z ?? 0;
      this.put(sp);
      return sp;
    };
    const pool = (u: number, v: number, t: Texture, size: number, alpha: number, z = -9e5) => {
      const [x, y] = top(u, v);
      return add(t, x, y, { ax: 0.5, ay: 0.5, scale: size / 128, sy: 0.55, add: true, alpha, z });
    };

    // Contact and cast shadows share the scenery's coordinates, behind every fighter.
    const shadows = new Graphics();
    shadows.zIndex = -9.5e5;
    for (let v = 1; v < b.d - 1; v++) for (let u = 1; u < b.w - 1; u++) {
      const tile = at(u, v);
      if (!tile.wall && !tile.rock) continue;
      const [x, y] = top(u, v, tile.wall ? 1 : tile.h);
      if (tile.wall) {
        shadows.poly([x - 30, y, x + 30, y + 12, x + 96, y + 62, x + 48, y + 64]).fill({ color: 0x0b101b, alpha: 0.26 });
      }
      shadows.ellipse(x + 6, y + 6, tile.wall ? 32 : 26, 12).fill({ color: 0x090c14, alpha: 0.32 });
    }
    this.put(shadows);

    // the back walls (north and west): stained glass and gilt pilasters (banners in the courtyard), the glass's light across the floor
    // (the breach and its broken ends are left bare)
    const gap = new Set(plan.breaches.flatMap((br) => breachTiles({ ...br, width: br.width + 2 }).map((p) => `${p.u},${p.v}`)));
    const shafts = new Graphics();
    shafts.zIndex = -8e5;
    shafts.blendMode = 'add';
    this.put(shafts);
    for (let i = 2; i <= FIELD - 3; i++) {
      for (const side of ['north', 'west'] as const) {
        const [u, v] = side === 'north' ? [i, 0] : [0, i];
        if (gap.has(`${u},${v}`) || !at(u, v).wall) continue;
        const [x, y] = top(u, v, at(u, v).h + 4);
        const dx = side === 'north' ? -TW / 4 : TW / 4;
        const skew = side === 'north' ? ATAN : -ATAN;
        if (indoors && kind !== 'library' && i % (kind === 'chapel' ? 3 : 4) === 2) {
          add(tex('window'), x + dx, y + TH / 4 + 6, { ax: 0.5, ay: 0, scale: kind === 'chapel' ? 0.9 : 0.8, skewY: skew, z: (u + v) * 10 + 5 });
          // (the glass's light falls across the floor below it, away from the wall)
          const [fx, fy] = top(side === 'north' ? i : 1, side === 'north' ? 1 : i, 1);
          const s = side === 'north' ? 1 : -1;
          shafts.poly([fx - 30 * s, fy - 6, fx - 6 * s, fy - 18, fx + 210 * s, fy + 100, fx + 144 * s, fy + 128]).fill({ color: GLASS[Math.floor(i / 3) % GLASS.length], alpha: kind === 'chapel' ? 0.24 : 0.14 });
        } else if (kind === 'library' && i % 4 === 2) {
          // Complete carved bookcase bays, at the same plane as the rear masonry.
          add(shelf, x + dx, y + 150, { scale: 0.96, skewY: skew, z: (u + v) * 10 + 5 });
        } else if (kind === 'courtyard' && i % 4 === 2) {
          add(tex('arcade'), x + dx, y + 12, { ay: 0, scale: 0.9, skewY: skew, z: (u + v) * 10 + 5 });
        } else if (i % 4 === 0) {
          add(tex('pilaster'), x + dx, y + 12, { ay: 0, scale: 0.83, z: (u + v) * 10 + 5 });
        }
      }
    }
    // The colonnades get the same carved, bannered stone as the rear wall.
    // Their feet stay on the actual blocked tiles, so fighters still sort around them.
    for (const p of plan.pillars) {
      if (!at(p.u, p.v).wall) continue;
      const [x, y] = top(p.u, p.v, 1);
      add(tex('pilaster'), x, y + 8, { scale: 0.95, z: (p.u + p.v) * 10 + 5 });
    }
    // The throne room (STAND-RETREAT, the great hall dressed for the last act): crimson banners hung between the windows down both back walls.
    if (kind === 'hall') {
      for (let i = 2; i <= FIELD - 3; i++)
        for (const side of ['north', 'west'] as const) {
          const [u, v] = side === 'north' ? [i, 0] : [0, i];
          if (i % 4 !== 0 || gap.has(`${u},${v}`) || !at(u, v).wall) continue;
          const [x, y] = top(u, v, at(u, v).h + 4);
          add(tex('banner'), x + (side === 'north' ? -TW / 4 : TW / 4), y + 30, { ay: 0, scale: 0.55, skewY: side === 'north' ? ATAN : -ATAN, z: (u + v) * 10 + 6 });
        }
    }
    // The door the guard falls back by: set in a back wall, clear of the breaches (`exitOf`); shut until the room is given up.
    {
      const ex = exitOf(seed, kind);
      this.doorZ = (ex.front.u + ex.front.v) * 10 + 5;
      const door = tex('door');
      this.doorFrames = Array.from({ length: DOOR_FRAMES }, (_, i) => new Texture({ source: door.source, frame: new Rectangle(i * 32, 0, 32, 32) }));
      const [x, y] = top(ex.at.u, ex.at.v, 1);
      const north = ex.edge === 'north';
      this.door = add(this.doorFrames[0], x + (north ? -TW / 4 : TW / 4), y + TH / 4, { ay: 1, scale: DOOR_SCALE, skewY: north ? ATAN : -ATAN, z: (ex.at.u + ex.at.v) * 10 + 6 });
      this.doorT = -1;
      this.kingDoor = (([fx, fy]) => ({ x: fx, y: fy + 8 }))(top(ex.front.u, ex.front.v));
    }
    if (kind === 'courtyard') {
      // Planting crowns the boundary stone; it never suggests an obstacle on the field.
      for (let i = 1; i < FIELD - 1; i++) {
        for (const [u, v] of [[i, 0], [0, i], [i, FIELD - 1], [FIELD - 1, i]]) {
          if (!at(u, v).wall || gap.has(`${u},${v}`)) continue;
          const [x, y] = top(u, v, near(u, v) ? NEAR_H : at(u, v).h + 4);
          if (!near(u, v) && i % 4 === 1)
            add(tex('bush'), x, y + 6, { ay: 0, scale: 0.85, z: (u + v) * 10 + 6 });
          if (near(u, v) && i % 3 === 0)
            add(tex('roses'), x, y + 12, { scale: 0.85, z: (u + v) * 10 + 6 });
        }
      }
    }

    // banners on the near walls' tops, so the room reads whole where their faces are hidden
    for (let i = 3; i <= FIELD - 4; i += 5) {
      for (const [u, v] of [[i, FIELD - 1], [FIELD - 1, i]]) {
        if (!at(u, v).wall || gap.has(`${u},${v}`)) continue;
        const [x, y] = top(u, v, NEAR_H);
        add(tex('banner'), x, y + 2, { ay: 0, scale: 0.34, z: (u + v) * 10 + 5 });
      }
    }

    // braziers and lamps, each in a pool of light
    for (const p of plan.braziers) {
      if (at(p.u, p.v).wall || at(p.u, p.v).rock) continue;
      const [x, y] = top(p.u, p.v);
      this.flames.push({ sp: pool(p.u, p.v, glows.warm, 160, 0.5), base: 0.5, phase: p.u * 1.7 + p.v });
      add(tex('brazier'), x, y + 4, { scale: 0.78, z: (p.u + p.v) * 10 + 6 });
      this.flames.push({ sp: add(glows.warm, x, y - 72, { ax: 0.5, ay: 0.5, scale: 0.36, add: true, alpha: 0.85, z: (p.u + p.v) * 10 + 7 }), base: 0.85, phase: p.v * 2.3 + p.u });
    }
    for (const p of plan.lamps) {
      if (at(p.u, p.v).wall || at(p.u, p.v).rock) continue;
      const [x, y] = top(p.u, p.v);
      this.flames.push({ sp: pool(p.u, p.v, glows.warm, 120, 0.38), base: 0.38, phase: p.u + p.v * 0.7 });
      add(tex('lamp'), x, y + 4, { scale: 0.7, z: (p.u + p.v) * 10 + 6 });
    }

    // the cover: what stands on each tile of it (only where the field kept it)
    for (const c of plan.cover) {
      if (!at(c.u, c.v).rock) continue;
      const [x, y] = top(c.u, c.v);
      const z = (c.u + c.v) * 10 + 6;
      const pick = (c.u * 3 + c.v) % 2;
      if (c.what === 'rubble') add(tex(pick ? 'rubble1' : 'rubble2'), x, y + 8, { scale: 0.85, z });
      else if (c.what === 'shelf') add(tex((c.u + c.v) % 5 === 0 ? 'desk' : 'shelf1'), x, y + 6, { scale: 0.65, z });
      else {
        const k: Key = c.what === 'crate' ? 'crates' : c.what === 'barrel' ? 'barrels' : c.what === 'chest' ? 'chests' : c.what;
        add(tex(k), x, y + 10, { scale: c.what === 'fountain' ? 1.05 : 0.85, z });
      }
    }

    // The ruler stands at the centre, with their throne on the reserved tile behind them.
    for (const [u, v] of [[KING_AT.u - 1, KING_AT.v - 2], [KING_AT.u + 1, KING_AT.v - 2]]) {
      const [x, y] = top(u, v);
      add(tex('standard'), x, y, { scale: 0.5, z: (u + v) * 10 + 3 });
    }
    const [kx, ky] = top(KING_AT.u, KING_AT.v);
    pool(KING_AT.u, KING_AT.v, glows.gold, 280, 0.42);
    this.flames.push({ sp: add(glows.gold, kx, ky - 64, { ax: 0.5, ay: 0.5, scale: 1.0, add: true, alpha: 0.5, z: (KING_AT.u + KING_AT.v) * 10 + 2 }), base: 0.5, phase: 0.3 });
    this.kingFrames = rulerTextures(settings().ruler, 'idle');
    const [throneX, throneY] = top(KING_AT.u - 1, KING_AT.v - 1);
    this.emptyThrone = add(rulerThrone(settings().ruler), throneX, throneY + 8, { scale: KING_SCALE, z: (KING_AT.u + KING_AT.v - 2) * 10 + 4 });
    this.emptyThrone.width = this.emptyThrone.height = KING_H * KING_SCALE;
    this.emptyThrone.visible = true;
    this.king = add(this.kingFrames[0], kx, ky + 8, { scale: KING_SCALE, z: (KING_AT.u + KING_AT.v) * 10 + 5 });
    this.king.width = this.king.height = KING_H * KING_SCALE;
    this.kingTop = { x: kx, y: ky + 8 - KING_H * KING_SCALE };
    this.kingHome = { x: kx, y: ky + 8 };
    this.leave = null;
    this.kingBar.zIndex = 1e6;
    this.put(this.kingBar);

    // the breaches: rolling smoke, a red glow beyond, and the dust bursts' sprites (shown when a wave comes in)
    const dust = tex('dust');
    this.dustFrames = Array.from({ length: DUST_FRAMES }, (_, i) => new Texture({ source: dust.source, frame: new Rectangle(i * 64, 0, 64, 64) }));
    const land = tex('landdust');
    this.landFrames = Array.from({ length: LAND_FRAMES }, (_, i) => new Texture({ source: land.source, frame: new Rectangle((i % 5) * 96, Math.floor(i / 5) * 96, 96, 96) }));
    this.burstLayer.zIndex = 1e5;
    this.put(this.burstLayer);
    for (const br of plan.breaches) {
      const tiles = breachTiles(br);
      const [du, dv] = inward(br.edge);
      const mid = tiles[Math.floor(tiles.length / 2)];
      pool(mid.u, mid.v, glows.red, 170, 0.32);
      tiles.forEach((p, i) => {
        if (i % 2) return;
        const [x, y] = top(p.u + du, p.v + dv);
        const [ix, iy] = top(p.u + 3 * du, p.v + 3 * dv);
        this.puffs.push({ sp: add(tex('smoke'), x, y - 24, { ax: 0.5, ay: 0.5, scale: 1, alpha: 0.5, tint: 0x8a8070, z: (p.u + p.v + 2) * 10 + 8 }), x, y: y - 24, dx: (ix - x) * 0.6, dy: (iy - y) * 0.6 - 26, phase: i * 0.37 + p.u * 0.11, base: 0.5 });
      });
    }
  }

  /** The floor in one picture: each tile's top laid on its diamond (by `topOf`), its two faces of dressed stone down to a common foot. */
  private bakeFloor(b: Board, art: Record<Key, HTMLImageElement>, topOf: (t: Tile, u: number, v: number) => HTMLImageElement): Sprite {
    const maxH = Math.max(...b.tiles.filter((t) => !t.wall).map((t) => t.h));
    const x0 = -FIELD * (TW / 2) - TW / 2;
    const y0 = -TH / 2 - maxH * HH;
    const w = FIELD * TW + TW;
    const h = FIELD * TH + TH + maxH * HH + FOOT + HH;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const face = art.wallface;
    const order: [number, number][] = [];
    for (let v = 0; v < b.d; v++) for (let u = 0; u < b.w; u++) order.push([u, v]);
    order.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
    for (const [u, v] of order) {
      const t0 = b.tiles[v * b.w + u];
      // (under a wall, the floor at its foot)
      const t = t0.wall ? { ...t0, h: 1 } : t0;
      const [cx, cy] = rawAt(u, v, t.h);
      const ox = cx - x0 - TW / 2;
      const oy = cy - y0 - TH / 2;
      const deep = t.h * HH + FOOT;
      const sideFace = (xa: number, ya: number, xb: number, yb: number, shade: string) => {
        g.save();
        g.beginPath();
        g.moveTo(ox + xa, oy + ya);
        g.lineTo(ox + xb, oy + yb);
        g.lineTo(ox + xb, oy + yb + deep);
        g.lineTo(ox + xa, oy + ya + deep);
        g.closePath();
        g.clip();
        for (let y = 0; y < TH + deep; y += face.height) for (let x = -((u * 23 + v * 11) % 5) * 16; x < TW; x += face.width) g.drawImage(face, ox + x, oy + y);
        g.fillStyle = shade;
        g.fillRect(ox, oy, TW, TH + deep);
        g.restore();
      };
      sideFace(0, TH / 2, TW / 2, TH, 'rgba(40,28,20,0.18)');
      sideFace(TW / 2, TH, TW, TH / 2, 'rgba(8,6,14,0.5)');
      g.save();
      g.beginPath();
      g.moveTo(ox + TW / 2, oy);
      g.lineTo(ox + TW, oy + TH / 2);
      g.lineTo(ox + TW / 2, oy + TH);
      g.lineTo(ox, oy + TH / 2);
      g.closePath();
      g.clip();
      const a = TW / (2 * 64);
      const bb = TH / (2 * 64);
      g.setTransform(a, bb, -a, bb, ox + TW / 2, oy);
      const surface = topOf(t, u, v);
      if (surface === art.rug) g.drawImage(surface, 0, 0, 64, 64);
      else g.drawImage(surface, (u % 2) * 64, (v % 2) * 64, 64, 64, 0, 0, 64, 64);
      const kind = this.plan!.kind;
      // Warm limestone, cool sanctuary stone and dark library slate replace the checkerboard.
      if (surface === art.floor1 || surface === art.floor2) {
        g.fillStyle = kind === 'hall' ? 'rgba(132,98,51,0.28)' : kind === 'library' ? 'rgba(35,48,43,0.34)' : 'rgba(30,38,65,0.2)';
        g.fillRect(0, 0, 64, 64);
      }
      if (surface === art.rug) {
        g.fillStyle = 'rgba(68,8,20,0.28)';
        g.fillRect(0, 0, 64, 64);
        g.strokeStyle = 'rgba(224,180,87,0.7)';
        g.lineWidth = 2;
        // Borders follow the carpet's perimeter, rather than outlining every carpet tile.
        const rugAt = (du: number, dv: number) => {
          const a = u + du, b0 = v + dv;
          return a >= 0 && b0 >= 0 && a < b.w && b0 < b.d && topOf(b.tiles[b0 * b.w + a], a, b0) === art.rug;
        };
        for (const [du, dv, ax, ay, bx, by] of [[-1,0,3,3,3,61],[1,0,61,3,61,61],[0,-1,3,3,61,3],[0,1,3,61,61,61]]) {
          if (rugAt(du, dv)) continue;
          g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
        }
      }
      // Stable variation gives stone its age without animated noise.
      g.fillStyle = `rgba(10,8,18,${((u * 17 + v * 31) % 7) * 0.012})`;
      g.fillRect(0, 0, 64, 64);
      g.setTransform(1, 0, 0, 1, 0, 0);
      // Occlusion hugs walls and raised steps, leaving the central battlefield readable.
      const edge = Math.min(u, v, b.w - 1 - u, b.d - 1 - v);
      g.fillStyle = `rgba(8,9,18,${edge < 3 ? (3 - edge) * 0.12 : 0.025})`;
      g.fillRect(ox, oy, TW, TH);
      for (const [du, dv] of [[-1, 0], [0, -1]]) {
        const neighbour = b.tiles[(v + dv) * b.w + u + du];
        if (u + du < 0 || v + dv < 0 || !neighbour || (!neighbour.wall && neighbour.h <= t.h)) continue;
        const shadow = g.createLinearGradient(ox, oy, ox, oy + TH);
        shadow.addColorStop(0, 'rgba(8,6,15,0.38)'); shadow.addColorStop(1, 'rgba(8,6,15,0)');
        g.fillStyle = shadow; g.fillRect(ox, oy, TW, TH);
      }
      // (raised floor a shade lighter, so the heights read at a glance; a dark line round each step)
      g.fillStyle = `rgba(255,240,210,${0.02 + (t.h - 1) * 0.04})`;
      g.fillRect(ox, oy, TW, TH);
      g.restore();
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(ox, oy + TH / 2 + 0.5);
      g.lineTo(ox + TW / 2, oy + TH + 0.5);
      g.lineTo(ox + TW, oy + TH / 2 + 0.5);
      g.stroke();
    }
    if (this.plan!.kind === 'chapel' || this.plan!.kind === 'library') {
      const u = KING_AT.u, v = KING_AT.v + 6;
      const tile = b.tiles[v * b.w + u];
      if (!tile.wall && !tile.rock) {
        const [x, y] = rawAt(u, v, tile.h);
        g.save();
        g.setTransform(0.5, 0.25, -0.5, 0.25, x - x0, y - y0);
        g.drawImage(art.medallion, -128, -128, 256, 256);
        g.restore();
      }
    }
    // A quiet pool of warm light pulls the eye to the central throne; the edges fall into cool shade.
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const [kx, ky] = rawAt(KING_AT.u, KING_AT.v, 1);
    const ambience = g.createRadialGradient(kx - x0, ky - y0, 70, kx - x0, ky - y0, FIELD * TH);
    ambience.addColorStop(0, 'rgba(237,170,65,0.10)');
    ambience.addColorStop(0.48, 'rgba(17,21,32,0.05)');
    ambience.addColorStop(1, 'rgba(9,15,30,0.48)');
    g.fillStyle = ambience;
    g.fillRect(0, 0, w, h);
    g.restore();
    const tex = Texture.from(c);
    this.made.push(tex);
    const sp = new Sprite(tex);
    sp.position.set(x0, y0);
    sp.zIndex = -1e6;
    return sp;
  }

  /** A wall's or pillar's column `h` steps tall: its coping on top, dressed stone down both faces. */
  private column(art: Record<Key, HTMLImageElement>, h: number): HTMLCanvasElement {
    const deep = h * HH + FOOT;
    const c = document.createElement('canvas');
    c.width = TW;
    c.height = TH + deep;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const face = art.wallface;
    const side = (xa: number, ya: number, xb: number, yb: number, shade: string) => {
      g.save();
      g.beginPath();
      g.moveTo(xa, ya);
      g.lineTo(xb, yb);
      g.lineTo(xb, yb + deep);
      g.lineTo(xa, ya + deep);
      g.closePath();
      g.clip();
      for (let y = 0; y < TH + deep; y += face.height) for (let x = 0; x < TW; x += face.width) g.drawImage(face, x, y);
      g.fillStyle = shade;
      g.fillRect(0, 0, TW, TH + deep);
      g.restore();
    };
    side(0, TH / 2, TW / 2, TH, 'rgba(26,22,24,0.3)');
    side(TW / 2, TH, TW, TH / 2, 'rgba(8,6,14,0.58)');
    g.save();
    g.beginPath();
    g.moveTo(TW / 2, 0);
    g.lineTo(TW, TH / 2);
    g.lineTo(TW / 2, TH);
    g.lineTo(0, TH / 2);
    g.closePath();
    g.clip();
    const a = TW / 128;
    const b = TH / 128;
    g.setTransform(a, b, -a, b, TW / 2, 0);
    g.drawImage(art.walltop, 0, 0, 64, 64);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = 'rgba(255,240,210,0.12)';
    g.fillRect(0, 0, TW, TH);
    g.restore();
    // (a gilt line along the coping's edge)
    g.strokeStyle = 'rgba(214,180,100,0.55)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, TH / 2 + 0.5);
    g.lineTo(TW / 2, TH + 0.5);
    g.lineTo(TW, TH / 2 + 0.5);
    g.stroke();
    return c;
  }

  /** A wave comes in by these edges: a burst of dust at each of their breaches (none with reduced motion: the smoke is enough). */
  burst(edges: readonly Edge[]): void {
    if (!this.plan || this.reduced) return;
    for (const br of this.plan.breaches) {
      if (!edges.includes(br.edge)) continue;
      const tiles = breachTiles(br);
      const [du, dv] = inward(br.edge);
      const mid = tiles[Math.floor(tiles.length / 2)];
      const [x, y] = rawAt(mid.u + du, mid.v + dv, 1);
      const ring = new Sprite(this.dustFrames[0]);
      ring.anchor.set(0.5);
      ring.position.set(x, y - 6);
      ring.scale.set(2.2, 1.4);
      const land = new Sprite(this.landFrames[0]);
      land.anchor.set(0.5, 70 / 96);
      land.position.set(x, y + 2);
      land.scale.set(1.6);
      this.burstLayer.addChild(ring, land);
      this.bursts.push({ ring, land, t: 0 });
    }
  }

  /** The king proclaims (a cleared wave): his decree frame a moment. */
  decree(): void {
    this.decreeLeft = 1600;
  }

  /** The room is given up (STAND-RETREAT): the breach on `edge` caves in (rubble drops into it with a burst of dust; with reduced motion it is
   *  simply there), and the door swings open. */
  giveUp(edge: Edge | null): void {
    this.doorT = this.reduced ? DOOR_MS : 0;
    const br = this.plan?.breaches.find((b) => b.edge === edge);
    const rubble = this.tex.rubble1;
    if (!br || !rubble) return;
    if (!this.reduced) this.burst([br.edge]);
    breachTiles(br).forEach((p, i) => {
      const [x, y] = rawAt(p.u, p.v, 1);
      const sp = new Sprite(rubble);
      sp.anchor.set(0.5, 1);
      sp.scale.set(i % 2 ? 0.95 : 0.8);
      sp.position.set(x, y + 8 - (this.reduced ? 0 : 90 + i * 14));
      sp.zIndex = (p.u + p.v) * 10 + 7;
      this.put(sp);
      this.falling.push({ sp, y: y + 8, t: this.reduced ? CAVE_MS : -i * 70 });
    });
  }

  /** The king's walk to the door, `k` of the way there (0 to 1), or null to stand him at his place again. */
  walk(k: number | null): void {
    this.leave = k === null ? null : Math.max(0, Math.min(1, k));
  }

  private rulerAction: RulerAction = 'idle';
  private rulerStarted = 0;
  react(action: 'hurt' | 'cast' | 'strike' | 'dead'): void {
    if (this.rulerAction === 'dead') return;
    this.rulerAction = action;
    this.rulerStarted = this.t;
  }

  /** The moving parts: flames and pools breathe, smoke rolls in and fades, the dust bursts play out, the king's frame, his health bar. */
  step(dt: number, kingHp: number): void {
    this.t += dt;
    const still = this.reduced;
    for (const f of this.flames) f.sp.alpha = still ? f.base : f.base * (0.86 + 0.1 * Math.sin(this.t / 170 + f.phase) + 0.04 * Math.sin(this.t / 53 + f.phase * 3));
    for (const p of this.puffs) {
      // (each puff drifts in from the breach and thins as it goes, then starts again faint: never blinking off)
      const k = still ? 0.35 : ((this.t / 5200 + p.phase) % 1 + 1) % 1;
      p.sp.position.set(p.x + p.dx * k, p.y + p.dy * k);
      p.sp.scale.set(0.8 + 0.7 * k);
      p.sp.alpha = p.base * Math.sin(Math.PI * Math.max(0.05, k)) * 0.9 + 0.06;
    }
    for (const b of this.bursts) {
      b.t += dt;
      const k = Math.min(1, b.t / BURST_MS);
      b.ring.texture = this.dustFrames[Math.min(DUST_FRAMES - 1, Math.floor(k * DUST_FRAMES))];
      b.land.texture = this.landFrames[Math.min(LAND_FRAMES - 1, Math.floor(k * LAND_FRAMES))];
      b.ring.alpha = b.land.alpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
    }
    for (const b of this.bursts.filter((x) => x.t >= BURST_MS)) {
      b.ring.destroy();
      b.land.destroy();
    }
    this.bursts = this.bursts.filter((x) => x.t < BURST_MS);
    if (this.door && this.doorT >= 0) {
      this.doorT = Math.min(DOOR_MS, this.doorT + dt);
      this.door.texture = this.doorFrames[Math.min(DOOR_FRAMES - 1, Math.floor((this.doorT / DOOR_MS) * DOOR_FRAMES))];
    }
    for (const f of this.falling) {
      if (f.t >= CAVE_MS) continue;
      f.t += dt;
      const k = Math.max(0, Math.min(1, f.t / CAVE_MS));
      // (it drops, eased in, and lands; nothing blinks)
      f.sp.y = f.y - (f.y - f.sp.y) * (1 - k * k);
      if (k >= 1) f.sp.y = f.y;
    }
    if (this.king) {
      this.decreeLeft = Math.max(0, this.decreeLeft - dt);
      if (kingHp <= 0 && this.rulerAction !== 'dead') this.react('dead');
      const elapsed = this.t - this.rulerStarted;
      if (this.rulerAction !== 'dead' && elapsed >= 720) this.rulerAction = 'idle';
      const action = this.rulerAction !== 'idle' ? this.rulerAction : this.decreeLeft > 0 ? 'cast' : 'idle';
      if (this.emptyThrone) {
        this.emptyThrone.texture = rulerThrone(settings().ruler);
        this.emptyThrone.width = this.emptyThrone.height = KING_H * KING_SCALE;
        this.emptyThrone.visible = true;
      }
      this.king.texture = rulerTextures(settings().ruler, action)[rulerFrame(action, this.rulerAction === 'idle' && this.decreeLeft > 0 ? 1600 - this.decreeLeft : action === 'idle' ? this.t : elapsed, still)];
      // (in the throne room the ruler sits enthroned while nothing is happening, and rises to strike, cast or take a blow: STAND-RETREAT)
      const enthroned = this.plan?.kind === 'hall' && this.rulerAction === 'idle' && this.leave === null && kingHp > 0;
      if (enthroned) this.king.texture = rulerSeatTexture(settings().ruler, this.decreeLeft > 0 ? 'command' : 'seated', this.decreeLeft > 0 ? 1600 - this.decreeLeft : this.t, still);
      if (this.emptyThrone) this.emptyThrone.visible = !enthroned;
      // (the walk to the door: his walking frames, along the floor from his place to the door, facing the way he goes)
      if (this.leave !== null) {
        const k = this.leave;
        this.king.texture = rulerTextures(settings().ruler, still ? 'idle' : 'walk')[still ? 0 : rulerFrame('walk', this.t, false)];
        this.king.position.set(this.kingHome.x + (this.kingDoor.x - this.kingHome.x) * k, this.kingHome.y + (this.kingDoor.y - this.kingHome.y) * k);
        this.king.zIndex = Math.round(KING_Z + (this.doorZ - KING_Z) * k);
      } else {
        this.king.position.set(this.kingHome.x, this.kingHome.y);
        this.king.zIndex = KING_Z;
      }
      this.kingTop = { x: this.king.x, y: this.king.y - KING_H * KING_SCALE };
      this.king.width = this.king.height = KING_H * KING_SCALE;
      if (this.leave !== null && this.kingDoor.x < this.kingHome.x) this.king.scale.x = -Math.abs(this.king.scale.x);
      // (his health over his head: green, low and red, on a dark gilt-edged plate)
      const g = this.kingBar;
      g.clear();
      const w = 52;
      const x = this.kingTop.x - w / 2;
      const y = this.kingTop.y - 4;
      const share = Math.max(0, Math.min(1, kingHp));
      g.rect(x - 2, y - 2, w + 4, 9).fill({ color: 0x14100a }).stroke({ color: 0xc9a75e, width: 1 });
      g.rect(x, y, w * share, 5).fill({ color: share < 0.35 ? 0xd8452f : 0x5fbf58 });
    }
  }

  /** Put pieces into the world, kept to be let go with the room. */
  private put(...c: Container[]): void {
    this.root.addChild(...c);
    this.kids.push(...c);
  }

  clear(): void {
    for (const c of this.kids) if (c !== this.kingBar && c !== this.burstLayer) c.destroy();
    for (const c of [this.kingBar, this.burstLayer]) c.parent?.removeChild(c);
    this.kids = [];
    this.burstLayer.removeChildren().forEach((c) => c.destroy());
    this.kingBar.clear();
    this.flames = [];
    this.puffs = [];
    this.bursts = [];
    this.king = null;
    this.emptyThrone = null;
    this.door = null;
    this.doorT = -1;
    this.falling = [];
    this.leave = null;
    this.rulerAction = 'idle';
    this.rulerStarted = 0;
    this.floor = null;
    this.plan = null;
    for (const t of this.made) t.destroy(true);
    this.made = [];
  }
}

/** A soft round light, drawn once (the pools of torchlight, the auras and the breaches' glow). */
function glowCanvas(r: number, g: number, b: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
  gr.addColorStop(0.45, `rgba(${r},${g},${b},0.3)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 128, 128);
  return c;
}
