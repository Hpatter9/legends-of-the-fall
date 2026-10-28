// The Calamity's map screen (`calmap.css`): each of the six maps is a realm of the void (the owner: "more like an interdimensional space"). Every spot is a small isometric island
// of that realm's ground with rock hanging under it, joined by bridges of light (stepping slabs along the roads of `sim/calLand.ts`), in a drifting sky of stars, a moon and a nebula
// (the packs' moon and cloudscape pictures, in CSS layers behind). Drawn in the camp's way: scene pixels times a whole number of device pixels, nearest neighbour. The islands, bridges and
// landmarks are baked once into canvases; what moves is only the void's slow drift, the bridges' breathing glow, the mist (a mask that lifts softly along a bridge when a spot is cleared),
// the portal and the squad's leader, who stands at the spot the party is at and walks the bridges to the next. It only draws and reports taps (`onSpot`): the run is changed by the
// tower view through the sim's own functions. Math.random is fine here.

import type { Meta } from './sim/meta';
import type { Run } from './sim/run';
import { choices, hereOf, routeTo, sideChoices } from './sim/tower';
import { fogOf, landOf, openSet, sideSpots, START_ID, type Cell, type Land, type LandSpot, type SideSpot } from './sim/calLand';
import { LAND_ART, RECTS, type LandArt } from './render/calArt';
import { loadImage } from './render/loadImage';
import { awakenedStep, heroRig, lookKey } from './render/awakenRig';
import { drawAura, drawAuraGlow } from './render/auraCanvas';
import { settings } from './settings';
import { auraParts, type AuraPart } from './render/auraStyles';
import { shrinkRig, type Small } from './render/smallRig';
import { hash } from './render/campSpots';
import { drawChunk, drawIsland, drawStone, outlineOf, REALMS, type IslandSpec } from './render/calRealm';
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
const HOLE_MARGIN = { rx: 20, up: 22, down: 14 };
const HOLE_ROAD = 30;
/** A bridge's stones: how far clear of an island's middle the first stands, and the gap between two. */
const STONE_CLEAR = 46;
const STONE_GAP = 30;
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
  /** An island's patch (an ellipse): how far it reaches up (its landmark) and down (its rock); an island's `r` is its half width. */
  island?: boolean;
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
  private stoneKey: Land | null = null;
  private isleKey: Land | null = null;
  private isleCache = new Map<number, IslandSpec>();
  private stoneCache = new Map<string, { x: number; y: number }[]>();
  private key = '';
  private geo: Geo | null = null;
  private picked = -1;
  private atlas: Assets | null = null;
  private hero: { cut: string; small: Small; kind: string; step: number; aura: readonly AuraPart[] } | null = null;
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
    return going ?? hereOf(t);
  }

  /** Put the leader back at the spot the party really stands at (it had set out for another, and the player chose a different one). */
  restand(): void {
    this.walk = null;
    this.stand = this.standId();
    this.pos = this.standAt(this.stand);
  }

  /** Show the land of the run's map (the box is in the page already when this is called: `width` is its width in css pixels). `picked` is the spot lit as chosen. */
  mount(run: Run, width: number, picked: number, recentre = false): HTMLElement {
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
      // (a new map: the leader stands at this map's own start, not where the last map left it)
      this.pos = this.standAt(this.stand);
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
      const target = this.cameraFor(this.pos.y);
      if (!this.keepTop) {
        // (a map just opened: the camera starts a little off the party and eases onto it)
        this.root.scrollTop = reduced() ? target : Math.min(this.root.scrollHeight, target + 150);
        this.easeCamera(target);
      } else if (recentre) {
        // (the box was taken out of the page and put back, which resets its scroll: it starts where it was, and eases onto the party)
        this.root.scrollTop = this.top;
        this.easeCamera(target);
      }
      else this.root.scrollTop = this.top;
      this.keepTop = true;
      this.parallax();
    });
    this.startLoop();
    return this.root;
  }

  private easing = 0;

  /** Ease the camera onto a scroll position, the way it follows a walk: smooth, about half a second, no snap (at once under reduced motion). */
  easeCamera(target: number): void {
    cancelAnimationFrame(this.easing);
    const from = this.root.scrollTop;
    if (reduced() || Math.abs(from - target) < 2) {
      this.root.scrollTop = target;
      return;
    }
    const t0 = performance.now();
    const MS = 520;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / MS);
      const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
      this.root.scrollTop = from + (target - from) * e;
      if (p < 1 && this.active && !this.walk) this.easing = requestAnimationFrame(tick);
    };
    this.easing = requestAnimationFrame(tick);
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

  /** The spots the party may go to and enter: any spot a revealed bridge leads to from a cleared one (not yet cleared), a hidden side spot, and a shop already cleared (open to visit again). */
  openIds(): Set<number> {
    const t = this.run.tower!;
    const shops = t.map.filter((n) => n.kind === 'shop' && t.path.includes(n.id)).map((n) => n.id);
    return new Set([...choices(this.run).map((n) => n.id), ...sideChoices(this.run).map((s) => s.id), ...shops]);
  }

  /** The spots the party has cleared (and the portal): it may walk to any of them, freely. */
  walkIds(): Set<number> {
    return openSet(this.run.tower!);
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
    return Math.max(0, Math.min(g.H * g.unit - view, sceneY * g.unit - view * 0.55));
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
    // (the leader: where it stands now)
    const to = this.standId();
    if (!this.walk) {
      if (to !== this.stand) {
        this.stand = to;
        this.pos = this.standAt(to);
      } else if (!this.pos.x) this.pos = this.standAt(to);
    }
    this.drawWalker();
  }

  /** The small stones of the bridge between two spots: a single file, evenly spaced along the line between their islands' centres, clear of the islands. The line is straight, but bends once (away from the island) where it would pass over another island. */
  private stones(a: number, b: number): { x: number; y: number }[] {
    if (!this.model) return [];
    if (this.stoneKey !== this.model) {
      // (every bridge laid once, in order; a stone that would stand beside a stone already laid (two bridges leaving an island at close angles) is left out, so the track stays one stone wide)
      this.stoneKey = this.model;
      this.stoneCache.clear();
      const placed: { x: number; y: number }[] = [];
      for (const r of this.model.roads) {
        const mine = this.lay(r.from, r.to).filter((q) => !placed.some((o) => Math.hypot(o.x - q.x, (o.y - q.y) * 1.6) < STONE_GAP * 0.8));
        placed.push(...mine);
        this.stoneCache.set(`${r.from}>${r.to}`, mine);
      }
    }
    return this.stoneCache.get(`${a}>${b}`) ?? [];
  }

  private lay(a: number, b: number): { x: number; y: number }[] {
    const A = this.spot(a);
    const B = this.spot(b);
    if (!A || !B || !this.model) return [];
    const p = this.xy(A);
    const q = this.xy(B);
    let path = [p, q];
    // (another island close to the straight line: one turn, round the far side of it)
    for (const o of this.model.spots) {
      if (o.id === a || o.id === b) continue;
      const c = this.xy(o);
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len2 = dx * dx + dy * dy || 1;
      const t = ((c.x - p.x) * dx + (c.y - p.y) * dy) / len2;
      if (t < 0.12 || t > 0.88) continue;
      const nx = p.x + dx * t;
      const ny = p.y + dy * t;
      const off = Math.hypot((c.x - nx) * 1, (c.y - ny) * 1.7);
      if (off > 64) continue;
      // (the turn: the nearest point on the line pushed to the side the island is not on)
      const side = (c.x - nx) * -dy + (c.y - ny) * dx > 0 ? -1 : 1;
      const l = Math.sqrt(len2);
      const push = 70 - off + 20;
      path = [p, { x: nx + (-dy / l) * push * side, y: ny + (dx / l) * push * side }, q];
      break;
    }
    // (stones along the path, from STONE_CLEAR beyond the first island's middle to STONE_CLEAR short of the second's)
    const segs: number[] = [];
    let len = 0;
    for (let i = 1; i < path.length; i++) {
      segs.push(Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
      len += segs[i - 1];
    }
    const span = len - 2 * STONE_CLEAR;
    const at = (d: number) => {
      let rest = d;
      for (let i = 0; i < segs.length; i++) {
        if (rest <= segs[i] || i === segs.length - 1) {
          const f = Math.min(1, rest / segs[i]);
          return { x: path[i].x + (path[i + 1].x - path[i].x) * f, y: path[i].y + (path[i + 1].y - path[i].y) * f };
        }
        rest -= segs[i];
      }
      return path[path.length - 1];
    };
    if (span < 8) return [at(len / 2)];
    const n = Math.max(1, Math.round(span / STONE_GAP));
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i <= n; i++) out.push(at(STONE_CLEAR + (span * i) / n));
    return out;
  }

  /** The island a spot stands on: sized to its landmark (a little ground showing all round it), the portal's and the lair's bigger, never so wide that it meets its neighbours'. */
  private isleOf(s: LandSpot): IslandSpec {
    if (this.isleKey !== this.model) {
      this.isleKey = this.model;
      this.isleCache.clear();
    }
    const hit = this.isleCache.get(s.id);
    if (hit) return hit;
    const m = this.markOf(s, false);
    const half = (m.l + m.r) / 2;
    let rx = s.id === START_ID ? 82 : s.kind === 'boss' ? Math.max(76, Math.min(124, half * 0.85 + 16)) : Math.max(46, Math.min(72, half * 0.9 + 16));
    // (islands apart: the ellipses' halves, in the lattice's own squash, must not meet)
    const p = this.xy(s);
    for (const o of this.model!.spots) {
      if (o.id === s.id) continue;
      const q = this.xy(o);
      const d = Math.hypot(q.x - p.x, (q.y - p.y) / 0.56);
      rx = Math.min(rx, Math.max(40, d * 0.5 - 6));
    }
    const ry = rx * 0.56;
    const spec = { cx: this.ax(s), cy: p.y + 15, rx, ry, depth: Math.max(44, Math.min(118, rx * 1.15 + 14)), seed: s.id * 977 + 31, realm: (Number(this.land.dataset.land) || 1) - 1 };
    this.isleCache.set(s.id, spec);
    return spec;
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
    const isles = model.spots.map((s) => ({ s, sp: this.isleOf(s) }));
    const foot = Math.round(g.th * FOOT);
    const list: { y: number; x: number; paint: () => void }[] = [];
    // (a bridge: one line of small stones from island to island, a thin beam of light through them, a soft glow under each)
    for (const r of model.roads) {
      const pts = this.stones(r.from, r.to);
      const A = this.spot(r.from);
      const B = this.spot(r.to);
      if (!A || !B) continue;
      const pa = this.xy(A);
      const pb = this.xy(B);
      list.push({
        y: Math.min(pa.y, pb.y) - 1,
        x: pa.x,
        paint: () => {
          gl.globalCompositeOperation = 'lighter';
          gl.strokeStyle = `rgba(${realm.bridge.glow}, 0.16)`;
          gl.lineWidth = 2;
          gl.beginPath();
          gl.moveTo(pa.x, pa.y);
          for (const q of pts) gl.lineTo(q.x, q.y);
          gl.lineTo(pb.x, pb.y);
          gl.stroke();
          gl.globalCompositeOperation = 'source-over';
        },
      });
      pts.forEach((p, n) =>
        list.push({
          y: p.y,
          x: p.x,
          paint: () => {
            drawStone(c, p.x, p.y, realm.bridge, hash(Math.round(p.x), Math.round(p.y) + n));
            const rg = gl.createRadialGradient(p.x, p.y + 2, 0, p.x, p.y + 2, 24);
            rg.addColorStop(0, `rgba(${realm.bridge.glow}, 0.3)`);
            rg.addColorStop(1, `rgba(${realm.bridge.glow}, 0)`);
            gl.globalCompositeOperation = 'lighter';
            gl.fillStyle = rg;
            gl.fillRect(p.x - 26, p.y - 24, 52, 52);
            gl.globalCompositeOperation = 'source-over';
          },
        }),
      );
    }
    // (an island: a cluster of ground cut to its own rounded outline, an earth lip and a craggy root of rock under it, a glow beneath, a few props on its rim, a fragment of rock near it)
    for (const { s, sp } of isles) {
      list.push({
        y: sp.cy - 4,
        x: sp.cx,
        paint: () => {
          drawIsland(c, assets.rock, sp, (tg, ox, oy) => {
            const reach = sp.rx * 1.4 + g.tw;
            for (let a = -Math.ceil(reach / (g.th / 2)); a <= Math.ceil(reach / (g.th / 2)); a++) {
              for (let b = -Math.ceil(reach / (g.tw / 2)); b <= Math.ceil(reach / (g.tw / 2)); b++) {
                if ((a + b) & 1) continue;
                const cell = { i: (a + b) / 2 + s.id * 3, j: (a - b) / 2 + s.id };
                const px = ox + (b * g.tw) / 2;
                const py = oy + (a * g.th) / 2;
                const t = tileOf(cell);
                const [sx, sy, w, h] = RECTS[t.name];
                // (each tile a little larger than its cell, so the ones beside it overlap its edge and the seams between them close)
                const W2 = w + 4;
                const H2 = h + 3;
                const x = Math.round(px - W2 / 2);
                const y = Math.round(py - g.th / 2 - 1);
                if (t.flip) {
                  tg.setTransform(-1, 0, 0, 1, x + W2, 0);
                  tg.drawImage(im, sx, sy, w, h, 0, y, W2, H2);
                  tg.setTransform(1, 0, 0, 1, 0, 0);
                } else tg.drawImage(im, sx, sy, w, h, x, y, W2, H2);
              }
            }
          });
          // (the glow under it, in the bridges' colour, faint)
          const gy = sp.cy + sp.ry + sp.depth * 0.45;
          const rg = gl.createRadialGradient(sp.cx, gy, 0, sp.cx, gy, sp.rx * 1.3);
          rg.addColorStop(0, `rgba(${realm.bridge.glow}, 0.2)`);
          rg.addColorStop(1, `rgba(${realm.bridge.glow}, 0)`);
          gl.globalCompositeOperation = 'lighter';
          gl.fillStyle = rg;
          gl.save();
          gl.translate(sp.cx, gy);
          gl.scale(1, 0.7);
          gl.translate(-sp.cx, -gy);
          gl.fillRect(sp.cx - sp.rx * 1.4, gy - sp.rx * 1.4, sp.rx * 2.8, sp.rx * 2.8);
          gl.restore();
          gl.globalCompositeOperation = 'source-over';
          // (a fragment of rock drifting near it, now and then)
          if (hash(s.id, 77) < 0.5) drawChunk(c, sp.cx + (hash(s.id, 3) < 0.5 ? -1 : 1) * (sp.rx + 10 + hash(s.id, 4) * 18), sp.cy + sp.ry + sp.depth * (0.45 + hash(s.id, 5) * 0.3), 4 + hash(s.id, 6) * 5, realm.rock.map((v) => v * 150) as [number, number, number], s.id * 5 + 1);
        },
      });
      // (a prop or two on the front rim of an ordinary island: a tuft, a rock, a crystal of the realm, small beside the landmark)
      if (s.id !== START_ID && s.kind !== 'boss') {
        const rim = outlineOf(sp);
        for (let k = 0; k < 2; k++) {
          const pt = rim[Math.floor((0.12 + 0.3 * k + hash(s.id, 20 + k) * 0.16) * rim.length) % rim.length];
          const role = (['bush', 'rock'] as const)[(s.id + k) % 2];
          const set = art[role];
          const name = set[(s.id + k) % set.length];
          const px = pt.x + (sp.cx - pt.x) * 0.12;
          const py = pt.y - 2;
          list.push({ y: py, x: px, paint: () => blit(name, px, py, hash(s.id, 30 + k) < 0.5) });
        }
      }
    }
    // (bits of rock drifting in the void, here and there, clear of the islands and the bridges)
    const allStones = model.roads.flatMap((r) => this.stones(r.from, r.to));
    const near = (cell: Cell) => {
      const p = this.xy(cell);
      if (isles.some(({ sp }) => Math.hypot(sp.cx - p.x, (sp.cy - p.y) / 0.56) < sp.rx * 1.5 + 30)) return true;
      return allStones.some((q) => Math.hypot(q.x - p.x, (q.y - p.y) * 1.6) < 70);
    };
    for (const d of model.decor) {
      if (d.role !== 'rock' || near(d) || hash(d.i * 3, d.j * 5) > 0.3) continue;
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
    for (const r of model.roads) {
      const rk = `${r.from}>${r.to}`;
      if (!fog.roads.has(rk)) continue;
      const isNew = !!seen && !seen.has(`r:${rk}`);
      now.add(`r:${rk}`);
      this.stones(r.from, r.to).forEach((p, i) => {
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
      const road = model.roads.find((r) => r.to === s.id && fog.roads.has(`${r.from}>${r.to}`));
      const sp = this.isleOf(s);
      const it = { key: sk, x: sp.cx, y: sp.cy, r: sp.rx + HOLE_MARGIN.rx, island: true, up: Math.max(sp.ry + HOLE_MARGIN.up, this.bodyOf(s).h + HOLE_MARGIN.up), down: sp.ry + sp.depth + HOLE_MARGIN.down, delay: isNew ? (road ? road.cells.length * LIFT_STEP : 0) : 0 };
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
      const isIsland = !!it.island;
      const rx = (it.r / FOG_PX) * (isIsland ? 1 : 1);
      const up = (isIsland ? it.up ?? it.r : it.r) / FOG_PX;
      const down = (isIsland ? it.down ?? it.r : it.r) / FOG_PX;
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
    const walk = this.walkIds();
    const g = this.geo!;
    const t = this.run.tower!;
    this.marks.replaceChildren();
    const u = g.unit;
    const here = this.standId();
    for (const s of model.spots) {
      if (!lit.has(s.id)) continue;
      const p = { x: this.ax(s, done.has(s.id)), y: this.xy(s).y };
      const isOpen = open.has(s.id);
      const isDone = done.has(s.id);
      const walkable = walk.has(s.id);
      const state = s.id === START_ID ? 'start' : isDone ? (isOpen ? 'done again' : 'done') : isOpen ? 'open' : t.cur?.id === s.id ? 'here' : 'passed';
      const wrap = el('div', `cmSpot ${s.kind} ${state}${s.side ? ' side' : ''}${s.id === this.picked ? ' picked' : ''}`);
      wrap.dataset.id = String(s.id);
      const ring = el('i', 'cmRing');
      const sp = this.isleOf(s);
      const rw = Math.min(g.tw, sp.rx * 1.7);
      ring.style.cssText = `left:${(p.x - rw / 2) * u}px;top:${(sp.cy - (rw * 0.57) / 2) * u}px;width:${rw * u}px;height:${rw * 0.57 * u}px`;
      // (the button covers the landmark: its picture's size, at least a thumb wide)
      const body = this.bodyOf(s, done.has(s.id));
      const b = el('button', 'cmHit');
      const w = Math.max(48, body.w) * u;
      const h = Math.max(48, body.h) * u;
      const mk = this.markOf(s, done.has(s.id));
      b.style.cssText = `left:${(p.x - mk.l - Math.max(0, (48 - body.w) / 2)) * u}px;top:${(p.y + g.th * FOOT - Math.max(48, body.h)) * u}px;width:${w}px;height:${h}px`;
      const label = s.side ? (s.kind === 'elite' ? 'Hidden mini-boss' : 'Hidden hoard') : `${s.kind}`;
      b.setAttribute('aria-label', `${label}${isOpen ? ', lit: tap to choose' : isDone ? ', done' : ''}`);
      b.disabled = !isOpen && !walkable;
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
    const step = awakenedStep(meta, lead.kind);
    this.hero = { cut: sheet, small, kind: lead.kind, step, aura: auraParts(lead.kind, step, settings().saver) };
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
    // (an awakened leader walks in its class's aura: the canvas has room round the figure for it)
    const hero = this.hero!;
    const pad = hero.step ? Math.round(small.figure * 0.45) : 0;
    const cw = small.fw + pad * 2;
    const ch = small.fh + pad * 2;
    if (this.walker.width !== cw || this.walker.height !== ch) {
      this.walker.width = cw;
      this.walker.height = ch;
    }
    const u = g.unit;
    this.walker.style.width = `${cw * u}px`;
    this.walker.style.height = `${ch * u}px`;
    const c = this.walker.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, cw, ch);
    const moving = !!this.walk;
    const row = moving ? 1 : 0;
    const n = small.counts[moving ? 'walk' : 'idle'] ?? 1;
    const calm = reduced();
    const i = calm ? 0 : Math.floor(this.now / (moving ? 100 : 170)) % n;
    const feet = pad + small.fh;
    if (hero.step) {
      drawAuraGlow(c, hero.kind, hero.step, cw / 2, feet, small.figure);
      drawAura(c, hero.aura, cw / 2, feet, small.figure, this.now, 'back', this.face, calm);
    }
    if ((this.face === 1) !== small.facesRight) {
      c.setTransform(-1, 0, 0, 1, pad + small.fw, pad);
      c.drawImage(small.c, i * small.fw, row * small.fh, small.fw, small.fh, 0, 0, small.fw, small.fh);
      c.setTransform(1, 0, 0, 1, 0, 0);
    } else c.drawImage(small.c, i * small.fw, row * small.fh, small.fw, small.fh, pad, pad, small.fw, small.fh);
    if (hero.step) drawAura(c, hero.aura, cw / 2, feet, small.figure, this.now, 'front', this.face, calm);
    this.walker.style.transform = `translate(${Math.round((this.pos.x - cw / 2) * u)}px, ${Math.round((this.pos.y - small.fh - pad) * u)}px)`;
  }

  /** Walk the leader to a spot over the bridges, the shortest way through cleared spots, the camera with it; `done` runs on arrival (or when a tap skips). */
  walkTo(id: number, done: () => void): void {
    const route = routeTo(this.run, id);
    if (!route || !this.geo || !this.model) return done();
    this.startWalk(route, 1, done);
  }

  /** Set the leader walking a route of spots: along each bridge's stones, through the spots between. */
  private startWalk(route: number[], speed: number, done: () => void): void {
    // (a route of one spot: the party already stands there, as at a shop it has just left and is visiting again. There is nothing to walk, and a walk of one point would never end)
    if (route.length < 2) return done();
    const pts: { x: number; y: number }[] = [this.standAt(route[0])];
    for (let i = 1; i < route.length; i++) {
      const from = route[i - 1];
      const to = route[i];
      const there = this.model!.roads.some((r) => r.from === from && r.to === to);
      const way = there ? this.stones(from, to) : [...this.stones(to, from)].reverse();
      for (const q of way) pts.push({ x: q.x, y: q.y + 16 });
      pts.push(this.standAt(to));
    }
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const dur = reduced() ? 1 : Math.max(WALK_MIN * speed, Math.min(WALK_MAX, (total / WALK_SPEED) * 1000));
    this.stand = route[route.length - 1];
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
