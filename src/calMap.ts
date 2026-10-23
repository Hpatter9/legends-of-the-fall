// The Calamity's map screen (`calmap.css`): each of the six maps is a realm of the void (the owner: "more like an interdimensional space"). Every spot is a small isometric island
// of that realm's ground with rock hanging under it, joined by bridges of light (stepping slabs along the roads of `sim/calLand.ts`), in a drifting sky of stars, a moon and a nebula
// (the packs' moon and cloudscape pictures, in CSS layers behind). Drawn in the camp's way: scene pixels times a whole number of device pixels, nearest neighbour. The islands, bridges and
// landmarks are baked once into canvases; what moves is only the void's slow drift, the bridges' breathing glow, the mist (a mask that lifts softly along a bridge when a spot is cleared),
// the portal and the squad's leader, who stands at the spot the party is at and walks the bridges to the next. It only draws and reports taps (`onSpot`): the run is changed by the
// tower view through the sim's own functions. Math.random is fine here.

import type { Meta } from './sim/meta';
import type { Run } from './sim/run';
import { choices, sideChoices } from './sim/tower';
import { fogOf, landOf, roadBetween, sideSpots, START_ID, type Cell, type Land, type LandSpot, type SideSpot } from './sim/calLand';
import { LAND_ART, RECTS, type LandArt } from './render/calArt';
import { loadImage } from './render/loadImage';
import { heroRig, lookKey } from './render/awakenRig';
import { shrinkRig, type Small } from './render/smallRig';
import { hash } from './render/campSpots';
import { drawSlab, drawUnderside, REALMS } from './render/calRealm';
import { twistBadge } from './twistView';
import atlasUrl from './art/calmap/atlas.png';
import portalUrl from './art/calmap/portal.png';
import starsUrl from './art/calmap/stars.png';
import rockUrl from './art/ground/rock.png';
import planetWhite from './art/calmap/planet_white.png';
import planetTan from './art/calmap/planet_tan.png';
import planetRed from './art/calmap/planet_red.png';
import planetBlue from './art/calmap/planet_blue.png';
import neb0 from './art/calmap/nebula_0.png';
import neb1 from './art/calmap/nebula_1.png';
import neb2 from './art/calmap/nebula_2.png';
import neb3 from './art/calmap/nebula_3.png';
import neb4 from './art/calmap/nebula_4.png';
import neb5 from './art/calmap/nebula_5.png';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const reduced = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** The realms' names, one for each map. */
export const LAND_NAMES: readonly string[] = REALMS.map((r) => r.name);
const PLANETS = { white: planetWhite, tan: planetTan, red: planetRed, blue: planetBlue };
const NEBULAE = [neb0, neb1, neb2, neb3, neb4, neb5];

interface Assets {
  atlas: HTMLImageElement;
  rock: ImageData;
}
let art: Promise<Assets> | null = null;
const loadAtlas = (): Promise<Assets> =>
  (art ??= (async () => {
    const [atlas, rock] = await Promise.all([loadImage(atlasUrl), loadImage(rockUrl)]);
    const c = document.createElement('canvas');
    c.width = rock.width;
    c.height = rock.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(rock, 0, 0);
    return { atlas, rock: g.getImageData(0, 0, rock.width, rock.height) };
  })());

/** The fog already lifted from each map, so a spot newly seen lifts it softly (by run and map). */
const seenFog = new Map<string, Set<string>>();

interface Geo {
  W: number;
  H: number;
  tw: number;
  th: number;
  /** The css pixels in a scene pixel (a whole number of device pixels each), and the device pixels per scene pixel. */
  unit: number;
  k: number;
  /** The screen spot of cell (0, 0), in scene pixels. */
  x0: number;
  y0: number;
}

/** How far a foot line is below the centre of its ground diamond, as a share of the tile's height (the camp's fire stands 16 of 52 up). */
const FOOT = 0.31;
/** The mist's pixels are this many scene pixels across: it is soft, and cheap to redraw while it lifts. */
const FOG_PX = 4;
/** The mist's clear patches round an island (across, up, down: the landmark above and the rock below) and along a bridge, in scene pixels. */
const HOLE_SPOT = { rx: 74, up: 96, down: 84 };
const HOLE_ROAD = 34;
/** Milliseconds a road cell takes to clear, and the stagger between cells (the fog rolls back along the road), then the spot at its end. */
const LIFT_MS = 520;
const LIFT_STEP = 70;
/** The leader's walk: scene pixels a second, the shortest and longest it takes. */
const WALK_SPEED = 210;
const WALK_MIN = 520;
const WALK_MAX = 1500;
/** How far left of a recruit tent its standard stands. */
const FLAG_DX = 40;

export interface CalMapHooks {
  meta(): Meta;
  /** A lit spot was tapped. */
  onSpot(id: number): void;
}

interface Lift {
  key: string;
  x: number;
  y: number;
  r: number;
  /** An island's patch reaches this far up (its landmark) and down (its rock). */
  up?: number;
  down?: number;
  /** When it starts to clear (ms from the start of the lift) and how long it takes; 0 delay and no `dur` for one already clear. */
  delay: number;
}

interface Walk {
  pts: { x: number; y: number }[];
  total: number;
  t0: number;
  dur: number;
  done: () => void;
}

export class CalMap {
  /** The scroll box, in the tower view's own classes so the page keeps its scroll rules. */
  readonly root = el('div', 'rtScroll cmScroll');
  private land = el('div', 'cmLand');
  /** The void behind the islands: the sky with its stars, a nebula that drifts, a moon, and (the last map) the rift swirling behind the lair. */
  private sky = el('div', 'cmSky');
  private nebula = el('div', 'cmNeb');
  private planet = el('img', 'cmPlanet');
  private swirl = el('div', 'calPortal cmSwirl');
  /** What the party sees of the islands and bridges: the baked pictures under the mist's mask. */
  private ground = el('canvas', 'cmGround');
  private glow = el('canvas', 'cmGlow');
  private bakedGround = document.createElement('canvas');
  private bakedGlow = document.createElement('canvas');
  private mask = document.createElement('canvas');
  private marks = el('div', 'cmMarks');
  private name = el('div', 'cmName');
  private portal = el('div', 'calPortal');
  private walker = el('canvas', 'cmWalker');
  private run!: Run;
  private model: Land | null = null;
  private key = '';
  private geo: Geo | null = null;
  private picked = -1;
  private atlas: Assets | null = null;
  private hero: { cut: string; small: Small } | null = null;
  private active = false;
  private raf = 0;
  private now = 0;
  private stand = START_ID;
  private pos = { x: 0, y: 0 };
  private face: 1 | -1 = 1;
  private walk: Walk | null = null;
  private lifts: { items: Lift[]; t0: number } | null = null;
  private fogItems: Lift[] = [];
  private top = 0;
  private keepTop = false;

  constructor(private hooks: CalMapHooks) {
    this.portal.style.setProperty('--calPortal', `url(${portalUrl})`);
    this.swirl.style.setProperty('--calPortal', `url(${portalUrl})`);
    this.swirl.hidden = true;
    this.land.append(this.sky, this.nebula, this.planet, this.swirl, this.ground, this.glow, this.marks, this.portal, this.walker);
    this.root.append(this.name, this.land);
    this.root.addEventListener(
      'scroll',
      () => {
        this.top = this.root.scrollTop;
        this.parallax();
      },
      { passive: true },
    );
    // (a tap while the leader walks: arrive at once)
    this.root.addEventListener('pointerdown', () => this.skip());
  }

  /** The spot the party stands at: the node in play, the one cleared last, or the portal. */
  private standId(): number {
    const t = this.run.tower!;
    // (a walk begun and not finished when the game closed: the leader is at the spot it was going to, which is not yet entered)
    const going = t.cur ? undefined : t.going !== undefined && this.openIds().has(t.going) ? t.going : undefined;
    return t.cur?.id ?? going ?? (t.at < 0 ? START_ID : t.at);
  }

  /** Put the leader back at the spot the party really stands at (it had set out for another, and the player chose a different one). */
  restand(): void {
    this.walk = null;
    this.stand = this.standId();
    this.pos = this.standAt(this.stand);
  }

  /** Show the land of the run's map (the box is in the page already when this is called: `width` is its width in css pixels). `picked` is the spot lit as chosen. */
  mount(run: Run, width: number, picked: number): HTMLElement {
    this.run = run;
    this.picked = picked;
    this.active = true;
    const t = run.tower!;
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.round(dpr));
    const unit = k / dpr;
    const W = Math.floor((Math.min(480, width) * dpr) / k);
    const land = Math.min(Math.max(t.act, 1), LAND_ART.length);
    this.name.replaceChildren(el('small', '', `Map ${t.act} of ${LAND_ART.length}`), el('b', '', LAND_NAMES[land - 1]));
    const key = `${run.seed}:${t.act}:${W}:${dpr}`;
    const fresh = key !== this.key;
    if (fresh) {
      this.key = key;
      const art = LAND_ART[Math.min(Math.max(t.act, 1), LAND_ART.length) - 1];
      this.model = landOf(run.seed, t.act, t.map);
      const { th, tw } = art;
      const aMax = this.model.aMax;
      const y0 = 70 - (this.model.aMin * th) / 2;
      const H = Math.ceil(y0 + (aMax * th) / 2 + 60);
      this.geo = { W, H, tw, th, unit, k, x0: W / 2, y0 };
      this.land.style.width = `${W * unit}px`;
      this.land.style.height = `${H * unit}px`;
      this.land.style.setProperty('--cmU', String(unit));
      this.land.dataset.land = String(land);
      for (const c of [this.ground, this.glow, this.bakedGround, this.bakedGlow]) {
        c.width = W;
        c.height = H;
      }
      for (const c of [this.ground, this.glow]) {
        c.style.width = `${W * unit}px`;
        c.style.height = `${H * unit}px`;
      }
      this.mask.width = Math.ceil(W / FOG_PX);
      this.mask.height = Math.ceil(H / FOG_PX);
      this.dress(land - 1, H, unit);
      this.walk = null;
      this.stand = this.standId();
      this.keepTop = false;
    }
    void loadAtlas().then((im) => {
      this.atlas = im;
      if (this.active && this.run === run) this.paint();
    });
    this.paint();
    // (the camera: on the spot the party stands at, the road ahead above it; kept where it was when the map is redrawn in place)
    requestAnimationFrame(() => {
      if (!this.geo) return;
      this.root.scrollTop = this.keepTop ? this.top : this.cameraFor(this.pos.y);
      this.keepTop = true;
      this.parallax();
    });
    this.startLoop();
    return this.root;
  }

  /** The void's layers for realm `n`: the sky's colours, the stars over it, the nebula and the moon (sized and placed by `parallax`). */
  private dress(n: number, H: number, unit: number): void {
    const r = REALMS[n];
    const u = unit;
    this.sky.style.cssText = `height:${H * 1.5 * u}px;top:${-H * 0.5 * u}px;background-image:url(${starsUrl}),linear-gradient(${r.sky[1]},${r.sky[0]} 28%,${r.sky[0]} 72%,${r.sky[1]});background-size:${576 * u}px ${324 * u}px,100% 100%`;
    this.nebula.style.cssText = `height:${Math.round(324 * u)}px;background-image:url(${NEBULAE[r.nebula]});background-size:${576 * u}px ${324 * u}px;--drift:${576 * u}px`;
    this.planet.src = PLANETS[r.planet];
    this.planet.style.width = `${Math.round((this.planet.naturalWidth || 90) * 0.4) * u}px`;
    this.planet.style.setProperty('--cmU', String(u));
  }

  /** The void moves slower than the land as the map scrolls (the sky at half the pace, the nebula and the moon a little less), so the party seems to travel through it. */
  private parallax(): void {
    const g = this.geo;
    if (!g) return;
    const r = REALMS[(Number(this.land.dataset.land) || 1) - 1];
    const u = g.unit;
    const top = this.root.scrollTop;
    const view = this.root.clientHeight || 560;
    const smax = Math.max(0, g.H * u - view);
    this.sky.style.transform = `translate3d(0, ${Math.round(top * 0.5)}px, 0)`;
    // (the nebula and the moon are placed so that, at the foot of the map, they hang in the upper part of the screen)
    const nebBase = smax * 0.4 + view * 0.08;
    this.nebula.style.transform = `translate3d(0, ${Math.round(nebBase + top * 0.6)}px, 0)`;
    const pw = (this.planet.naturalWidth ? this.planet.naturalWidth : 90) * 0.4 * u;
    this.planet.style.width = `${pw}px`;
    const base = view * r.planetAt[1] * 0.9;
    this.planet.style.transform = `translate3d(${Math.round(g.W * u * r.planetAt[0] - pw / 2)}px, ${Math.round(base + top * 0.92)}px, 0)`;
  }

  /** Leave the map (its loop stops). */
  release(): void {
    this.active = false;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.raf);
    this.raf = 0;
    this.walk = null;
    this.lifts = null;
  }

  /** The land is lit as `id` being chosen (-1 for none). */
  setPicked(id: number): void {
    this.picked = id;
    for (const b of this.marks.querySelectorAll<HTMLElement>('[data-id]')) b.classList.toggle('picked', Number(b.dataset.id) === id);
  }

  get walking(): boolean {
    return !!this.walk;
  }

  /** The spots the party may pick, as their ids: the road's choices, and a hidden side spot it stands beside. */
  openIds(): Set<number> {
    return new Set([...choices(this.run).map((n) => n.id), ...sideChoices(this.run).map((s) => s.id)]);
  }

  // ---- geometry ----

  private xy(c: Cell): { x: number; y: number } {
    const g = this.geo!;
    return { x: g.x0 + ((c.i - c.j) * g.tw) / 2, y: g.y0 + ((c.i + c.j) * g.th) / 2 };
  }

  /** The landmark's picture of a spot, by its kind (a recruit camp's tent varies from camp to camp), and how far it reaches left and right of its middle. */
  private markOf(s: LandSpot, spent: boolean): { name: string; flag?: string; l: number; r: number } {
    const art = this.artOf();
    const w = (n: string) => RECTS[n]?.[2] ?? 60;
    const sp = spent ? '_spent' : '';
    const one = (name: string) => ({ name, l: w(name) / 2, r: w(name) / 2 });
    if (s.id === START_ID) return one('start');
    if (s.side) return s.kind === 'elite' ? one(spent ? 'elite_spent' : 'side_elite') : one(`side_treasure${sp}`);
    switch (s.kind) {
      case 'boss':
        return one(art.lair);
      case 'fight':
        return one(spent ? 'fight_spent' : 'fight');
      case 'elite':
        return one(spent ? 'elite_spent' : 'elite');
      case 'recruit': {
        const tent = ['recruit', 'recruit_b', 'recruit_c'][s.id % 3];
        return { name: `${tent}${sp}`, flag: `recruit_flag${sp}`, l: Math.max(w(tent) / 2, FLAG_DX + w('recruit_flag') / 2), r: w(tent) / 2 };
      }
      default:
        return one(`${s.kind}${sp}`);
    }
  }

  /** Where a spot's landmark stands across the land: over its cell, but no further out than the scene's edge lets its picture show whole. */
  private ax(s: LandSpot, spent = false): number {
    const g = this.geo!;
    const x = this.xy(s).x;
    if (s.id === START_ID) return x;
    const { l, r } = this.markOf(s, spent);
    return Math.max(l + 3, Math.min(g.W - r - 3, x));
  }

  private spot(id: number): LandSpot | undefined {
    return this.model?.spots.find((s) => s.id === id);
  }

  /** Where the leader stands at a spot: beside its landmark, a little to the front. */
  private standAt(id: number): { x: number; y: number } {
    const s = this.spot(id);
    if (!s) return { x: this.geo!.W / 2, y: this.geo!.H - 60 };
    const p = this.xy(s);
    const g = this.geo!;
    const x = this.ax(s, this.run.tower!.path.includes(id));
    return id === START_ID ? { x: x - 36, y: p.y + g.th * FOOT + 14 } : { x: x + 30, y: p.y + g.th * FOOT + 12 };
  }

  private cameraFor(sceneY: number): number {
    const g = this.geo!;
    const view = this.root.clientHeight || 560;
    return Math.max(0, Math.min(g.H * g.unit - view, sceneY * g.unit - view * 0.62));
  }

  // ---- painting ----

  private artOf(): LandArt {
    return LAND_ART[Math.min(Math.max(this.run.tower!.act, 1), LAND_ART.length) - 1];
  }

  /** Draw everything that is not moving: the ground and its landmarks, the fog, the marks over the spots. */
  private paint(): void {
    const g = this.geo;
    const model = this.model;
    if (!g || !model) return;
    const t = this.run.tower!;
    const sides = sideSpots(this.run.seed, t.act, t.map);
    const fog = fogOf(t, sides);
    const open = this.openIds();
    const done = new Set([...t.path, ...(t.sideDone ?? [])]);
    this.paintMarks(model, fog.spots, open, done);
    this.placePortal();
    // (the heart of the rift: a great rift turns behind the lair once the lair is in sight)
    const boss = model.spots.find((x) => x.kind === 'boss');
    const rift = (Number(this.land.dataset.land) || 1) === REALMS.length && !!boss && fog.spots.has(boss.id);
    this.swirl.hidden = !rift;
    if (rift && boss) {
      const u = g.unit;
      const size = 64 * 4;
      this.swirl.style.cssText = `left:${(this.ax(boss) - size / 2) * u}px;top:${(this.xy(boss).y - size / 2 - 30) * u}px;width:${size * u}px;height:${size * u}px;--pu:${u * 4}`;
      this.swirl.style.setProperty('--calPortal', `url(${portalUrl})`);
    }
    if (this.atlas) this.bake(this.atlas, model, done);
    this.setFog(model, fog);
    // (the leader: where it stands now; a side spot cleared walks it back to the road)
    const to = this.standId();
    if (!this.walk) {
      if (to !== this.stand && this.stand >= 100 && this.spot(this.stand) && roadBetween(model, to, this.stand)) {
        const back = [...roadBetween(model, to, this.stand)!].reverse();
        this.startWalk(back, this.stand, to, 0.7, () => undefined);
      } else if (to !== this.stand) {
        this.stand = to;
        this.pos = this.standAt(to);
      } else if (!this.pos.x) this.pos = this.standAt(to);
    }
    this.drawWalker();
  }

  /** The cells of the island a spot stands on: its own tile (a small island with rock hanging under it); the portal's a plus of five; a lair's a wide diamond. */
  private islandOf(s: LandSpot): Cell[] {
    const c = { i: s.i, j: s.j };
    if (s.id === START_ID) return [c, { i: c.i + 1, j: c.j }, { i: c.i, j: c.j + 1 }, { i: c.i - 1, j: c.j }, { i: c.i, j: c.j - 1 }];
    if (s.kind === 'boss') {
      const out: Cell[] = [];
      for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) if (Math.abs(di) + Math.abs(dj) <= 3) out.push({ i: c.i + di, j: c.j + dj });
      return out;
    }
    return [c];
  }

  private bake(assets: Assets, model: Land, done: Set<number>): void {
    const im = assets.atlas;
    const g = this.geo!;
    const art = this.artOf();
    const realm = REALMS[(Number(this.land.dataset.land) || 1) - 1];
    const c = this.bakedGround.getContext('2d')!;
    const gl = this.bakedGlow.getContext('2d')!;
    for (const x of [c, gl]) {
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.clearRect(0, 0, g.W, g.H);
      x.imageSmoothingEnabled = false;
    }
    const tileOf = (cell: Cell): { name: string; flip: boolean } => ({ name: art.ground[hash(cell.i, cell.j) < 0.35 && art.ground.length > 1 ? 1 : 0], flip: hash(cell.i + 7, cell.j * 3) < 0.5 });
    const blit = (name: string, cx: number, footY: number, flip = false, alpha = 1) => {
      const r = RECTS[name];
      if (!r) return;
      const [sx, sy, w, h] = r;
      const x = Math.round(cx - w / 2);
      const y = Math.round(footY - h);
      c.globalAlpha = alpha;
      if (flip) {
        c.setTransform(-1, 0, 0, 1, x + w, 0);
        c.drawImage(im, sx, sy, w, h, 0, y, w, h);
        c.setTransform(1, 0, 0, 1, 0, 0);
      } else c.drawImage(im, sx, sy, w, h, x, y, w, h);
      c.globalAlpha = 1;
    };
    const key = (cell: Cell) => `${cell.i},${cell.j}`;
    // (islands: every spot's cells; bridges: the road's cells that are on no island)
    const islands = model.spots.map((s) => ({ s, cells: this.islandOf(s) }));
    const onIsland = new Set<string>();
    for (const isl of islands) for (const cell of isl.cells) onIsland.add(key(cell));
    const bridge = new Set<string>();
    for (const r of model.roads) for (const cell of r.cells) if (!onIsland.has(key(cell))) bridge.add(key(cell));
    const foot = Math.round(g.th * FOOT);
    const list: { y: number; x: number; paint: () => void }[] = [];
    // (a stepping slab for each cell of a bridge, and its glow)
    for (const k of bridge) {
      const [i, j] = k.split(',').map(Number);
      const p = this.xy({ i, j });
      list.push({
        y: p.y,
        x: p.x,
        paint: () => {
          drawSlab(c, p.x, p.y, Math.round(g.tw * 0.52), Math.round(g.th * 0.52), realm.bridge, hash(i * 3, j));
          const rg = gl.createRadialGradient(p.x, p.y + 3, 0, p.x, p.y + 3, g.tw * 0.62);
          rg.addColorStop(0, `rgba(${realm.bridge.glow}, 0.34)`);
          rg.addColorStop(1, `rgba(${realm.bridge.glow}, 0)`);
          gl.globalCompositeOperation = 'lighter';
          gl.fillStyle = rg;
          gl.fillRect(p.x - g.tw, p.y - g.tw * 0.6, g.tw * 2, g.tw * 1.2);
          gl.globalCompositeOperation = 'source-over';
        },
      });
    }
    // (an island: the rock hanging under it, then its tiles back to front, a glow under it)
    const thick = (RECTS[art.ground[0]]?.[3] ?? g.th + 8) - g.th;
    for (const { s, cells } of islands) {
      const centres = cells.map((cell) => this.xy(cell));
      const top = this.xy(s).y;
      list.push({
        y: top - 2,
        x: this.xy(s).x,
        paint: () => {
          drawUnderside(c, assets.rock, centres, g.tw, g.th, thick, realm.rock, Math.round(s.id * 7 + 13));
          const order = cells.map((cell, n) => ({ cell, p: centres[n] })).sort((a, b) => a.p.y - b.p.y || a.p.x - b.p.x);
          for (const { cell, p } of order) {
            const t = tileOf(cell);
            const [sx, sy, w, h] = RECTS[t.name];
            const x = Math.round(p.x - w / 2);
            const y = Math.round(p.y - g.th / 2);
            if (t.flip) {
              c.setTransform(-1, 0, 0, 1, x + w, 0);
              c.drawImage(im, sx, sy, w, h, 0, y, w, h);
              c.setTransform(1, 0, 0, 1, 0, 0);
            } else c.drawImage(im, sx, sy, w, h, x, y, w, h);
          }
          // (the glow under it, in the bridges' colour, faint)
          let xs = 0;
          let ys = 0;
          for (const p of centres) {
            xs += p.x;
            ys = Math.max(ys, p.y);
          }
          const cx = xs / centres.length;
          const rg = gl.createRadialGradient(cx, ys + 30, 0, cx, ys + 30, 70 + cells.length * 5);
          rg.addColorStop(0, `rgba(${realm.bridge.glow}, 0.22)`);
          rg.addColorStop(1, `rgba(${realm.bridge.glow}, 0)`);
          gl.globalCompositeOperation = 'lighter';
          gl.fillStyle = rg;
          gl.save();
          gl.translate(cx, ys + 30);
          gl.scale(1, 0.6);
          gl.translate(-cx, -(ys + 30));
          gl.fillRect(cx - 200, ys - 160, 400, 400);
          gl.restore();
          gl.globalCompositeOperation = 'source-over';
        },
      });
      // (a prop on the front cell of an ordinary island: a tree, a bush or a rock of the realm)
      if (s.id !== START_ID && s.kind !== 'boss' && hash(s.id * 5 + 3, g.W) < 0.8) {
        const role = (['tree', 'bush', 'rock'] as const)[Math.floor(hash(s.id, 11) * 3)];
        const set = art[role];
        const front = centres[0];
        const dx = (hash(s.id, 5) < 0.5 ? -1 : 1) * 34;
        list.push({ y: front.y + foot + 14, x: front.x + dx, paint: () => blit(set[s.id % set.length], front.x + dx, front.y + foot + 14, hash(s.id, 9) < 0.5) });
      }
    }
    // (bits of rock drifting in the void, here and there, clear of the islands and the bridges)
    const near = (cell: Cell, d: number) => {
      for (let di = -d; di <= d; di++) for (let dj = -d; dj <= d; dj++) if (onIsland.has(`${cell.i + di},${cell.j + dj}`) || bridge.has(`${cell.i + di},${cell.j + dj}`)) return true;
      return false;
    };
    for (const d of model.decor) {
      if (d.role !== 'rock' || near(d, 2) || hash(d.i * 3, d.j * 5) > 0.45) continue;
      const set = art.rock;
      const name = set[d.v % set.length];
      const p = this.xy(d);
      list.push({ y: p.y + foot, x: p.x, paint: () => blit(name, p.x, p.y + foot, d.flip, 0.85) });
    }
    // (the landmarks, by their foot lines)
    for (const s of model.spots) {
      const p = this.xy(s);
      const y = p.y + foot;
      const spent = done.has(s.id);
      const m = this.markOf(s, spent);
      const x = this.ax(s, spent);
      const lift = s.id === START_ID ? 14 : s.kind === 'boss' ? 8 : 0;
      list.push({ y: y + lift, x, paint: () => blit(m.name, x, y + lift) });
      if (m.flag) list.push({ y: y - 6, x: x - FLAG_DX, paint: () => blit(m.flag!, x - FLAG_DX, y - 6) });
    }
    list.sort((p, q) => p.y - q.y || p.x - q.x);
    for (const e of list) e.paint();
    this.compose();
  }

  /** The mist: a mask that is clear over the islands and bridges the party has seen (a patch round each, soft at its edge), and a soft lift of those just opened. */
  private setFog(model: Land, fog: { spots: Set<number>; roads: Set<string> }): void {
    const t = this.run.tower!;
    const key = `${this.run.seed}:${t.act}`;
    const items: Lift[] = [];
    const seen = seenFog.get(key);
    const now = new Set<string>();
    const fresh: Lift[] = [];
    const bridgeCells = new Set<string>();
    for (const s of model.spots) for (const c of this.islandOf(s)) bridgeCells.add(`${c.i},${c.j}`);
    for (const r of model.roads) {
      const rk = `${r.from}>${r.to}`;
      if (!fog.roads.has(rk)) continue;
      const isNew = !!seen && !seen.has(`r:${rk}`);
      now.add(`r:${rk}`);
      r.cells.forEach((cell, i) => {
        if (bridgeCells.has(`${cell.i},${cell.j}`)) return;
        const p = this.xy(cell);
        const it = { key: `${rk}:${i}`, x: p.x, y: p.y, r: HOLE_ROAD, delay: isNew ? i * LIFT_STEP : 0 };
        items.push(it);
        if (isNew) fresh.push(it);
      });
    }
    for (const s of model.spots) {
      if (!fog.spots.has(s.id)) continue;
      const sk = `s:${s.id}`;
      const isNew = !!seen && !seen.has(sk);
      now.add(sk);
      const p = this.xy(s);
      const road = model.roads.find((r) => r.to === s.id && fog.roads.has(`${r.from}>${r.to}`));
      const it = { key: sk, x: this.ax(s), y: p.y, r: HOLE_SPOT.rx, up: Math.max(HOLE_SPOT.up, this.bodyOf(s).h + 20), down: HOLE_SPOT.down, delay: isNew ? (road ? road.cells.length * LIFT_STEP : 0) : 0 };
      items.push(it);
      if (isNew) fresh.push(it);
    }
    seenFog.set(key, now);
    this.fogItems = items;
    if (fresh.length && !reduced()) this.lifts = { items: fresh, t0: performance.now() };
    else this.lifts = null;
    this.drawFog(performance.now());
  }

  private drawFog(now: number): void {
    const g = this.geo;
    if (!g) return;
    const c = this.mask.getContext('2d')!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.mask.width, this.mask.height);
    const lift = this.lifts;
    const own = lift ? new Map(lift.items.map((it) => [it.key, it])) : null;
    for (const it of this.fogItems) {
      let p = 1;
      if (own?.has(it.key)) p = Math.max(0, Math.min(1, (now - lift!.t0 - it.delay) / LIFT_MS));
      if (p <= 0) continue;
      // (a soft fade in: ease out)
      const e = 1 - (1 - p) * (1 - p);
      const isIsland = it.r === HOLE_SPOT.rx;
      const rx = (it.r / FOG_PX) * (isIsland ? 1 : 1);
      const up = (isIsland ? it.up ?? HOLE_SPOT.up : it.r) / FOG_PX;
      const down = (isIsland ? it.down ?? HOLE_SPOT.down : it.r) / FOG_PX;
      const x = it.x / FOG_PX;
      const y = it.y / FOG_PX;
      // (an island's patch is taller above (the landmark) and below (the rock) than it is wide: a unit disc stretched)
      const ry = (up + down) / 2;
      const cy = y + (down - up) / 2;
      c.save();
      c.translate(x, cy);
      c.scale(1, ry / rx);
      const r = rx * e;
      const rg = c.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, 'rgba(255, 255, 255, 1)');
      rg.addColorStop(0.62, 'rgba(255, 255, 255, 1)');
      rg.addColorStop(1, 'rgba(255, 255, 255, 0)');
      c.fillStyle = rg;
      c.beginPath();
      c.arc(0, 0, r, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    this.compose();
    if (lift && lift.items.every((it) => now - lift.t0 - it.delay >= LIFT_MS)) this.lifts = null;
  }

  /** What is seen: the baked islands, bridges and their glow, kept only where the mask is clear. */
  private compose(): void {
    const g = this.geo;
    if (!g) return;
    for (const [view, baked] of [[this.ground, this.bakedGround], [this.glow, this.bakedGlow]] as const) {
      const c = view.getContext('2d')!;
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, g.W, g.H);
      c.imageSmoothingEnabled = false;
      c.drawImage(baked, 0, 0);
      c.globalCompositeOperation = 'destination-in';
      c.imageSmoothingEnabled = true;
      c.drawImage(this.mask, 0, 0, g.W, g.H);
      c.globalCompositeOperation = 'source-over';
      c.imageSmoothingEnabled = false;
    }
  }

  /** The buttons and rings over the lit spots (the land under the fog has none). */
  private paintMarks(model: Land, lit: Set<number>, open: Set<number>, done: Set<number>): void {
    const g = this.geo!;
    const t = this.run.tower!;
    this.marks.replaceChildren();
    const u = g.unit;
    const here = this.standId();
    for (const s of model.spots) {
      if (s.id === START_ID || !lit.has(s.id)) continue;
      const p = { x: this.ax(s, done.has(s.id)), y: this.xy(s).y };
      const isOpen = open.has(s.id);
      const isDone = done.has(s.id);
      const state = isDone ? 'done' : isOpen ? 'open' : t.cur?.id === s.id ? 'here' : 'passed';
      const wrap = el('div', `cmSpot ${s.kind} ${state}${s.side ? ' side' : ''}${s.id === this.picked ? ' picked' : ''}`);
      wrap.dataset.id = String(s.id);
      const ring = el('i', 'cmRing');
      ring.style.cssText = `left:${(p.x - g.tw / 2) * u}px;top:${(p.y - g.th / 2) * u}px;width:${g.tw * u}px;height:${g.th * u}px`;
      // (the button covers the landmark: its picture's size, at least a thumb wide)
      const body = this.bodyOf(s, done.has(s.id));
      const b = el('button', 'cmHit');
      const w = Math.max(48, body.w) * u;
      const h = Math.max(48, body.h) * u;
      const mk = this.markOf(s, done.has(s.id));
      b.style.cssText = `left:${(p.x - mk.l - Math.max(0, (48 - body.w) / 2)) * u}px;top:${(p.y + g.th * FOOT - Math.max(48, body.h)) * u}px;width:${w}px;height:${h}px`;
      const label = s.side ? (s.kind === 'elite' ? 'Hidden mini-boss' : 'Hidden hoard') : `${s.kind}`;
      b.setAttribute('aria-label', `${label}${isOpen ? ', lit: tap to choose' : isDone ? ', done' : ''}`);
      b.disabled = !isOpen;
      b.addEventListener('click', () => {
        if (this.walk) return;
        this.hooks.onSpot(s.id);
      });
      wrap.append(ring, b);
      const node = t.map[s.id];
      const badge = !s.side && node ? twistBadge(node.twist) : null;
      if (badge) {
        badge.classList.add('cmBadge');
        badge.style.left = `${(p.x + body.w / 2 - 14) * u}px`;
        badge.style.top = `${(p.y + g.th * FOOT - body.h) * u}px`;
        wrap.append(badge);
      }
      if (isDone) {
        const tick = el('i', 'cmTick');
        tick.style.left = `${(p.x + 10) * u}px`;
        tick.style.top = `${(p.y - 6) * u}px`;
        wrap.append(tick);
      }
      this.marks.append(wrap);
    }
    void here;
  }

  /** The size of the picture a spot's landmark is drawn with (a recruit camp's tent and its standard together). */
  private bodyOf(s: LandSpot, spent = false): { w: number; h: number } {
    const m = this.markOf(s, spent);
    const r = RECTS[m.name] ?? [0, 0, 60, 60];
    const f = m.flag ? RECTS[m.flag] : undefined;
    return { w: m.l + m.r, h: Math.max(r[3], f?.[3] ?? 0) };
  }

  private placePortal(): void {
    const g = this.geo!;
    const s = this.spot(START_ID);
    if (!s) return;
    const p = this.xy(s);
    const u = g.unit;
    this.portal.style.cssText = `left:${(p.x - 32) * u}px;top:${(p.y - 56) * u}px;width:${64 * u}px;height:${64 * u}px;--pu:${u}`;
    this.portal.style.setProperty('--calPortal', `url(${portalUrl})`);
  }

  // ---- the leader ----

  private cut(): Small | null {
    const run = this.run;
    const lead = run.squad.map((id) => run.roster.find((x) => x.id === id)).find(Boolean);
    if (!lead) return null;
    const meta = this.hooks.meta();
    const sheet = lookKey(meta, lead.kind);
    if (this.hero?.cut === sheet) return this.hero.small;
    const rig = heroRig(meta, lead.kind);
    if (!rig) return null;
    const small = shrinkRig(rig, 44);
    this.hero = { cut: sheet, small };
    return small;
  }

  private drawWalker(): void {
    const g = this.geo;
    const small = this.cut();
    if (!g || !small) {
      this.walker.style.display = 'none';
      return;
    }
    this.walker.style.display = '';
    if (this.walker.width !== small.fw || this.walker.height !== small.fh) {
      this.walker.width = small.fw;
      this.walker.height = small.fh;
    }
    const u = g.unit;
    this.walker.style.width = `${small.fw * u}px`;
    this.walker.style.height = `${small.fh * u}px`;
    const c = this.walker.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, small.fw, small.fh);
    const moving = !!this.walk;
    const row = moving ? 1 : 0;
    const n = small.counts[moving ? 'walk' : 'idle'] ?? 1;
    const i = reduced() ? 0 : Math.floor(this.now / (moving ? 100 : 170)) % n;
    if ((this.face === 1) !== small.facesRight) {
      c.setTransform(-1, 0, 0, 1, small.fw, 0);
      c.drawImage(small.c, i * small.fw, row * small.fh, small.fw, small.fh, 0, 0, small.fw, small.fh);
      c.setTransform(1, 0, 0, 1, 0, 0);
    } else c.drawImage(small.c, i * small.fw, row * small.fh, small.fw, small.fh, 0, 0, small.fw, small.fh);
    this.walker.style.transform = `translate(${Math.round((this.pos.x - small.fw / 2) * u)}px, ${Math.round((this.pos.y - small.fh) * u)}px)`;
  }

  /** Walk the leader along the road to a lit spot, the camera with it; `done` runs on arrival (or when a tap skips). */
  walkTo(id: number, done: () => void): void {
    const model = this.model;
    const from = this.stand;
    const cells = model && roadBetween(model, from, id);
    if (!model || !cells || !this.geo) return done();
    this.startWalk(cells, from, id, 1, done);
  }

  private startWalk(cells: Cell[], from: number, to: number, speed: number, done: () => void): void {
    const pts: { x: number; y: number }[] = [this.standAt(from), ...cells.slice(1, -1).map((c) => ({ ...this.xy(c), y: this.xy(c).y + this.geo!.th * FOOT })), this.standAt(to)];
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const dur = reduced() ? 1 : Math.max(WALK_MIN * speed, Math.min(WALK_MAX, (total / WALK_SPEED) * 1000));
    this.stand = to;
    this.walk = { pts, total, t0: performance.now(), dur, done };
    this.pos = { ...pts[0] };
    this.startLoop();
  }

  /** Arrive at once (a tap on the map while the leader walks). */
  skip(): void {
    const w = this.walk;
    if (!w) return;
    w.t0 = performance.now() - w.dur;
  }

  private stepWalk(now: number): void {
    const w = this.walk;
    if (!w) return;
    const p = Math.min(1, (now - w.t0) / w.dur);
    const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
    let at = e * w.total;
    let i = 1;
    while (i < w.pts.length - 1 && at > Math.hypot(w.pts[i].x - w.pts[i - 1].x, w.pts[i].y - w.pts[i - 1].y)) {
      at -= Math.hypot(w.pts[i].x - w.pts[i - 1].x, w.pts[i].y - w.pts[i - 1].y);
      i++;
    }
    const a = w.pts[i - 1];
    const b = w.pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const f = Math.min(1, at / len);
    this.pos = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    if (Math.abs(b.x - a.x) > 0.5) this.face = b.x > a.x ? 1 : -1;
    // (the camera follows, easing)
    const target = this.cameraFor(this.pos.y);
    this.root.scrollTop += (target - this.root.scrollTop) * 0.22;
    if (p >= 1) {
      this.walk = null;
      this.pos = { ...w.pts[w.pts.length - 1] };
      w.done();
    }
  }

  // ---- the loop: the walker's idle frames and walk, and the fog lifting (it stops when nothing moves or the map is closed) ----

  private startLoop(): void {
    if (this.raf || !this.active) return;
    let last = 0;
    const tick = (t: number) => {
      this.raf = 0;
      if (!this.active) return;
      this.now = t;
      if (this.walk) this.stepWalk(t);
      if (this.lifts) this.drawFog(t);
      // (the idle frames are a few a second: in between, the loop sleeps)
      const busy = !!(this.walk || this.lifts);
      if (busy || t - last > 140) {
        last = t;
        this.drawWalker();
      }
      if (busy) this.raf = requestAnimationFrame(tick);
      else this.raf = window.setTimeout(() => (this.raf = requestAnimationFrame(tick)), 150) as unknown as number;
    };
    this.raf = requestAnimationFrame(tick);
  }
}

export type { SideSpot };
