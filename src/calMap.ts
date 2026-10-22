// The Calamity's map screen (`calmap.css`): a local isometric land for each of the six maps, drawn in the camp's way (scene pixels times a whole
// number of device pixels, nearest neighbour). The land (`sim/calLand.ts`: spots, roads, trees) is baked once into one canvas, ground and
// landmarks together; what moves is only the fog (a soft dark layer with holes where the party has seen, lifting along the road when a spot is
// cleared), the portal (a CSS-stepped strip), and the squad's leader, who stands at the spot the party is at and walks the road to the next.
// It only draws and reports taps (`onSpot`): the run is changed by the tower view through the sim's own functions. Math.random is fine here.

import type { Meta } from './sim/meta';
import type { Run } from './sim/run';
import { choices, sideChoices } from './sim/tower';
import { fogOf, landOf, roadBetween, sideSpots, START_ID, type Cell, type Land, type LandSpot, type SideSpot } from './sim/calLand';
import { LAND_ART, RECTS, type LandArt } from './render/calArt';
import { loadImage } from './render/loadImage';
import { heroRig, lookKey } from './render/awakenRig';
import { shrinkRig, type Small } from './render/smallRig';
import { hash } from './render/campSpots';
import { twistBadge } from './twistView';
import atlasUrl from './art/calmap/atlas.png';
import portalUrl from './art/calmap/portal.png';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const reduced = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** The lands' names, one for each map, and the fog's colour over each. */
export const LAND_NAMES: readonly string[] = ['The Ashen Road', 'The Thornwood', 'The Burning Sands', 'The Black Summit', 'The Cinder Waste', 'The Hollow Heart'];
const FOG_COLOURS: readonly string[] = ['13, 20, 32', '9, 20, 16', '28, 18, 12', '14, 22, 36', '22, 12, 12', '18, 13, 24'];
const BG_COLOURS: readonly string[] = ['#3f6a2c', '#2d4a24', '#a8793a', '#9aa8bc', '#3a2a22', '#4a4650'];

let art: Promise<HTMLImageElement> | null = null;
const loadAtlas = (): Promise<HTMLImageElement> => (art ??= loadImage(atlasUrl));

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
/** The fog's pixels are this many scene pixels across: it is soft, and cheap to redraw while it lifts. */
const FOG_PX = 4;
/** The size of the fog's holes round a spot and along a road, in scene pixels. */
const HOLE_SPOT = 92;
const HOLE_ROAD = 58;
/** Milliseconds a road cell takes to clear, and the stagger between cells (the fog rolls back along the road), then the spot at its end. */
const LIFT_MS = 520;
const LIFT_STEP = 70;
/** The leader's walk: scene pixels a second, the shortest and longest it takes. */
const WALK_SPEED = 210;
const WALK_MIN = 520;
const WALK_MAX = 1500;

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
  private ground = el('canvas', 'cmGround');
  private fog = el('canvas', 'cmFog');
  private marks = el('div', 'cmMarks');
  private name = el('div', 'cmName');
  private portal = el('div', 'calPortal');
  private walker = el('canvas', 'cmWalker');
  private run!: Run;
  private model: Land | null = null;
  private key = '';
  private geo: Geo | null = null;
  private picked = -1;
  private atlas: HTMLImageElement | null = null;
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
    this.land.append(this.ground, this.fog, this.marks, this.portal, this.walker);
    this.root.append(this.name, this.land);
    this.root.addEventListener('scroll', () => (this.top = this.root.scrollTop), { passive: true });
    // (a tap while the leader walks: arrive at once)
    this.root.addEventListener('pointerdown', () => this.skip());
  }

  /** The spot the party stands at: the node in play, the one cleared last, or the portal. */
  private standId(): number {
    const t = this.run.tower!;
    return t.cur?.id ?? (t.at < 0 ? START_ID : t.at);
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
      const H = Math.ceil(y0 + (aMax * th) / 2 + 40);
      this.geo = { W, H, tw, th, unit, k, x0: W / 2, y0 };
      this.land.style.width = `${W * unit}px`;
      this.land.style.height = `${H * unit}px`;
      this.land.style.setProperty('--cmU', String(unit));
      this.land.dataset.land = String(Math.min(Math.max(t.act, 1), LAND_ART.length));
      for (const c of [this.ground]) {
        c.width = W;
        c.height = H;
        c.style.width = `${W * unit}px`;
        c.style.height = `${H * unit}px`;
      }
      this.fog.width = Math.ceil(W / FOG_PX);
      this.fog.height = Math.ceil(H / FOG_PX);
      this.fog.style.width = `${W * unit}px`;
      this.fog.style.height = `${H * unit}px`;
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
    });
    this.startLoop();
    return this.root;
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

  private spot(id: number): LandSpot | undefined {
    return this.model?.spots.find((s) => s.id === id);
  }

  /** Where the leader stands at a spot: beside its landmark, a little to the front. */
  private standAt(id: number): { x: number; y: number } {
    const s = this.spot(id);
    if (!s) return { x: this.geo!.W / 2, y: this.geo!.H - 60 };
    const p = this.xy(s);
    const g = this.geo!;
    return id === START_ID ? { x: p.x - 36, y: p.y + g.th * FOOT + 14 } : { x: p.x + 30, y: p.y + g.th * FOOT + 12 };
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

  private bake(im: HTMLImageElement, model: Land, done: Set<number>): void {
    const g = this.geo!;
    const art = this.artOf();
    const c = this.ground.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = BG_COLOURS[(Number(this.land.dataset.land) || 1) - 1];
    c.fillRect(0, 0, g.W, g.H);
    const blit = (name: string, cx: number, footY: number, flip = false) => {
      const r = RECTS[name];
      if (!r) return;
      const [sx, sy, w, h] = r;
      const x = Math.round(cx - w / 2);
      const y = Math.round(footY - h);
      if (flip) {
        c.setTransform(-1, 0, 0, 1, x + w, 0);
        c.drawImage(im, sx, sy, w, h, 0, y, w, h);
        c.setTransform(1, 0, 0, 1, 0, 0);
      } else c.drawImage(im, sx, sy, w, h, x, y, w, h);
    };
    const roadCells = new Set<string>();
    for (const r of model.roads) for (const cell of r.cells) roadCells.add(`${cell.i},${cell.j}`);
    // (the ground: every cell of the screen's lattice, the road's cells in the road's tile; the far ones first)
    const aLo = Math.floor((-g.y0 * 2) / g.th) - 2;
    const aHi = Math.ceil(((g.H - g.y0) * 2) / g.th) + 2;
    const bMax = Math.ceil(g.W / g.tw) + 2;
    for (let a = aLo; a <= aHi; a++) {
      for (let b = -bMax; b <= bMax; b++) {
        if ((a + b) & 1) continue;
        const cell = { i: (a + b) / 2, j: (a - b) / 2 };
        const p = this.xy(cell);
        const isRoad = roadCells.has(`${cell.i},${cell.j}`);
        const pick = isRoad ? art.road : art.ground[hash(cell.i, cell.j) < 0.34 && art.ground.length > 1 ? 1 : 0];
        const flip = !isRoad && hash(cell.i + 7, cell.j * 3) < 0.5;
        const r = RECTS[pick];
        const [sx, sy, w, h] = r;
        const x = Math.round(p.x - w / 2);
        const y = Math.round(p.y - g.th / 2);
        if (flip) {
          c.setTransform(-1, 0, 0, 1, x + w, 0);
          c.drawImage(im, sx, sy, w, h, 0, y, w, h);
          c.setTransform(1, 0, 0, 1, 0, 0);
        } else c.drawImage(im, sx, sy, w, h, x, y, w, h);
      }
    }
    // (the things standing on it, by their foot lines)
    const foot = Math.round(g.th * FOOT);
    const list: { y: number; x: number; paint: () => void }[] = [];
    for (const d of model.decor) {
      const set = art[d.role];
      const name = set[d.v % set.length];
      const p = this.xy(d);
      list.push({ y: p.y + foot, x: p.x, paint: () => blit(name, p.x, p.y + foot, d.flip) });
    }
    const t = this.run.tower!;
    for (const s of model.spots) {
      const p = this.xy(s);
      const y = p.y + foot;
      const spent = done.has(s.id);
      const mark = (name: string, dx = 0, dy = 0) => list.push({ y: y + dy, x: p.x + dx, paint: () => blit(name, p.x + dx, y + dy) });
      if (s.id === START_ID) mark('start', 0, 14);
      else if (s.side) mark(s.kind === 'elite' ? (spent ? 'elite_spent' : 'side_elite') : spent ? 'side_treasure_spent' : 'side_treasure');
      else if (s.kind === 'boss') mark(art.lair, 0, 8);
      else if (s.kind === 'fight') mark(spent ? 'fight_spent' : 'fight');
      else if (s.kind === 'elite') mark(spent ? 'elite_spent' : 'elite');
      else if (s.kind === 'shop') mark(spent ? 'shop_spent' : 'shop');
      else if (s.kind === 'treasure') mark(spent ? 'treasure_spent' : 'treasure');
      else if (s.kind === 'campfire') mark(spent ? 'campfire_spent' : 'campfire');
      else if (s.kind === 'mystery') mark(spent ? 'mystery_spent' : 'mystery');
      else if (s.kind === 'recruit') {
        mark(spent ? 'recruit_spent' : 'recruit');
        mark(spent ? 'recruit_flag_spent' : 'recruit_flag', -46, -6);
      }
    }
    void t;
    list.sort((p, q) => p.y - q.y || p.x - q.x);
    for (const e of list) e.paint();
  }

  /** The fog: the holes it has, and a soft lift of those just opened. */
  private setFog(model: Land, fog: { spots: Set<number>; roads: Set<string> }): void {
    const t = this.run.tower!;
    const g = this.geo!;
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
      r.cells.forEach((cell, i) => {
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
      const it = { key: sk, x: p.x, y: p.y, r: HOLE_SPOT, delay: isNew ? (road ? road.cells.length * LIFT_STEP : 0) : 0 };
      items.push(it);
      if (isNew) fresh.push(it);
    }
    seenFog.set(key, now);
    this.fogItems = items;
    void g;
    if (fresh.length && !reduced()) this.lifts = { items: fresh, t0: performance.now() };
    else this.lifts = null;
    this.drawFog(performance.now());
  }

  private drawFog(now: number): void {
    const g = this.geo;
    if (!g) return;
    const c = this.fog.getContext('2d')!;
    const colour = FOG_COLOURS[(Number(this.land.dataset.land) || 1) - 1];
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, this.fog.width, this.fog.height);
    c.fillStyle = `rgba(${colour}, 0.995)`;
    c.fillRect(0, 0, this.fog.width, this.fog.height);
    c.globalCompositeOperation = 'destination-out';
    const lift = this.lifts;
    const own = lift ? new Map(lift.items.map((it) => [it.key, it])) : null;
    for (const it of this.fogItems) {
      let p = 1;
      if (own?.has(it.key)) p = Math.max(0, Math.min(1, (now - lift!.t0 - it.delay) / LIFT_MS));
      if (p <= 0) continue;
      // (an ease out: the fog gives way quickly, then settles)
      const e = 1 - (1 - p) * (1 - p);
      const x = it.x / FOG_PX;
      const y = it.y / FOG_PX;
      const r = (it.r * e) / FOG_PX;
      const rg = c.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(0, 0, 0, 1)');
      rg.addColorStop(0.55, 'rgba(0, 0, 0, 0.92)');
      rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      c.fillStyle = rg;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    if (lift && lift.items.every((it) => now - lift.t0 - it.delay >= LIFT_MS)) this.lifts = null;
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
      const p = this.xy(s);
      const isOpen = open.has(s.id);
      const isDone = done.has(s.id);
      const state = isDone ? 'done' : isOpen ? 'open' : t.cur?.id === s.id ? 'here' : 'passed';
      const wrap = el('div', `cmSpot ${s.kind} ${state}${s.side ? ' side' : ''}${s.id === this.picked ? ' picked' : ''}`);
      wrap.dataset.id = String(s.id);
      const ring = el('i', 'cmRing');
      ring.style.cssText = `left:${(p.x - g.tw / 2) * u}px;top:${(p.y - g.th / 2) * u}px;width:${g.tw * u}px;height:${g.th * u}px`;
      // (the button covers the landmark: its picture's size, at least a thumb wide)
      const body = this.bodyOf(s);
      const b = el('button', 'cmHit');
      const w = Math.max(48, body.w) * u;
      const h = Math.max(48, body.h) * u;
      b.style.cssText = `left:${(p.x - Math.max(48, body.w) / 2) * u}px;top:${(p.y + g.th * FOOT - Math.max(48, body.h)) * u}px;width:${w}px;height:${h}px`;
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

  /** The size of the picture a spot's landmark is drawn with. */
  private bodyOf(s: LandSpot): { w: number; h: number } {
    const art = this.artOf();
    const name =
      s.side ? (s.kind === 'elite' ? 'side_elite' : 'side_treasure') : s.kind === 'boss' ? art.lair : s.kind === 'recruit' ? 'recruit' : s.kind === 'start' ? 'start' : s.kind;
    const r = RECTS[name] ?? [0, 0, 60, 60];
    return { w: r[2], h: r[3] };
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
