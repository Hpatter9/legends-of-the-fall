// The ultimate's moment on the page (ULT-CUTIN, docs/notes/battle-hud.md; the rules and timings are `ultMomentRules.ts`). The owner's ask: an
// ultimate should feel special. In full (the default setting), as it fires the fight is held: a slash crosses the screen carrying the hero's
// painted art and the ultimate's name pops up, and the rest of the screen darkens but for what the ultimate touches, where its effect
// plays. Then the dim fades and the fight resumes: at once for a lingering ultimate, so its field or aura or summons work live; after the
// effects have played for an instant one. A tap skips. Short (the setting off): no hold and no dim; the hero rows' cut-in banner shows the
// hero's face instead (`fightHud.ts`). With reduced motion the slash does not sweep: the art and the name fade in and out, held still.
//
// ULT-EPIC (docs/notes/ult-epic.md, `ultEpicRules.ts`): the payoff. The band moves (speed lines rushing through it, the art drifting one way
// while the band slides the other, the name stamped in with a glow), power gathers on the hero under it, the camera leans in (the page's,
// `focus`), and a sting sounds. As the blow lands: a freeze of 0.15 s, a huge burst of the element on each one struck (the effects of the
// ultimate itself drawn twice the size by `fx.ts` while its moment plays: `Fx.epic`), a coloured flash eased in and out, a heavy sting, a
// shake as the freeze lets go, and the dim eased off over the whole of what it touched. The painted kit (session `u-ultimate`) is used
// when its atlas is there; until then the pack's and the painted spells' bursts stand in, and the band's lines are drawn in CSS.
//
// It never changes the battle: the page's fight loop asks `holdsBattle` before stepping it (and `runsEffects` before stepping the effects).

import { type Battle, type BattleEvent, type Unit } from './sim/battle';
import { keyOf, ultimateOf } from './sim/abilities';
import { heroName } from './sim/heroNames';
import { GLOW, skillElement } from './render/fxRules';
import type { Fx } from './render/fx';
import { play } from './render/sound';
import { spellImage } from './render/spellArt';
import { spellPart } from './render/spellLooks';
import { settings } from './settings';
import { whichCast } from './fightHudRules';
import { ULT_MOMENT, UltQueue, ultShape, type UltMoment, type UltPhase } from './ultMomentRules';
import { burstSpots, KIT, KIT_SESSION, litPools, ultTargets, ultZoom, type Pt, type UltTargets } from './ultEpicRules';

export interface UltMomentOpts {
  /** The middle of a fighter's sprite on the page, for the pool of light; null when it cannot be told. */
  anchor: (id: number) => { x: number; y: number } | null;
  /** The hero's painted art for the slash (its awakened art once awakened, else its portrait). */
  art: (u: Unit) => string;
  /** A tile's ground on the page (client px), for the light over an area; null when it cannot be told. */
  tile?: (u: number, v: number) => { x: number; y: number } | null;
  /** The fight's effects: the moment's gathering and bursts are drawn there, and it is told which casters' effects are the ultimate's. */
  fx?: Fx;
}

/** A hero's painted art: the awakened art once awakened, else the portrait (every one of the 45 has both, cached for offline play). */
export const heroArtUrl = (kind: string, awakened: number): string => (awakened > 0 ? `heroes/awakened-${kind}.webp` : `heroes/${kind}-portrait.webp`);

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const NONE: UltTargets = { struck: [], helped: [], tiles: [] };
/** The dim's canvas is drawn at a share of the screen's size (it is all soft gradients). */
const DIM_RES = 0.5;
/** The band leaves this long before the opening ends (its exit takes a little less), so it is gone as the blow lands. */
const BAND_OUT_MS = 260;

export class UltMoments {
  readonly queue = new UltQueue();
  private layer: HTMLElement;
  private dim: HTMLCanvasElement;
  private shown = 0;
  private struckSeen = 0;
  private lastPhase: UltPhase = 'idle';
  private warmed = new Set<string>();
  /** The pictures kept loaded (a browser may drop an image nobody holds). */
  private keep: HTMLImageElement[] = [];
  /** The painted kit's band canvas, while a slash with it is up, and the ms since the slash began (its lines' clock). */
  private kitCanvas: HTMLCanvasElement | null = null;
  private slashT = 0;
  private reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private opts: UltMomentOpts) {
    this.layer = document.createElement('div');
    this.layer.className = 'umLayer';
    this.layer.hidden = true;
    this.dim = document.createElement('canvas');
    this.dim.className = 'umDim';
    this.layer.append(this.dim);
    // (a tap skips the moment playing)
    this.layer.addEventListener('click', (e) => {
      e.stopPropagation();
      this.queue.skip();
    });
    document.body.append(this.layer);
    if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
  }

  /** Load the placed heroes' art before the fight, so the slash never waits on a picture. */
  warm(b: Battle): void {
    for (const u of b.units) {
      if (u.side !== 'hero' || !ultimateOf(u)) continue;
      const url = this.opts.art(u);
      if (this.warmed.has(url)) continue;
      this.warmed.add(url);
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      this.keep.push(img);
    }
  }

  /** A tick's events: each hero ultimate that fired becomes a moment (full setting only); true when the battle should stop stepping now.
   *  It also tells the effects whose events are an ultimate's (drawn at its scale), and sees a delayed ultimate's salvo land. */
  note(b: Battle, events: readonly BattleEvent[], born: readonly Unit[]): boolean {
    const epic = new Set<number>();
    for (const e of events) {
      if (e.kind !== 'skill') continue;
      const u = b.units.find((x) => x.id === e.by);
      if (!u || u.side !== 'hero' || whichCast(u, e.name) !== 'ult') continue;
      const ult = ultimateOf(u)!;
      const { shape, ms } = ultShape(ult, u.id, events, born);
      this.queue.push({ unit: u.id, kind: u.def, name: ult.name, shape, ms, el: skillElement(keyOf(ult)), targets: ultTargets(events, u.id) });
      epic.add(u.id);
    }
    // (a salvo in the air under the dim: its blows are the ultimate's too, and the first of them is its impact)
    const m = this.queue.current;
    if (m && this.queue.phase === 'settle') {
      epic.add(m.unit);
      const t = ultTargets(events, m.unit);
      if (t.struck.length) {
        m.landing = t;
        if (m.targets) m.targets = { ...m.targets, struck: [...new Set([...m.targets.struck, ...t.struck])] };
        this.queue.land();
      }
    }
    if (this.opts.fx) this.opts.fx.epic = epic;
    return this.queue.holdsBattle;
  }

  /** Where the page's camera should lean in now (the hero, through the opening), and how far over the view it holds; null: as it was. */
  get focus(): { unit: number; zoom: number } | null {
    const q = this.queue;
    if (!q.current || q.phase !== 'open') return null;
    const zoom = ultZoom(true, this.calm());
    return zoom === 1 ? null : { unit: q.current.unit, zoom };
  }

  private calm(): boolean {
    return this.opts.fx ? this.opts.fx.calm() : this.reduced;
  }

  /** Each frame: move the moment on by `dt` real ms (unless `paused`: a sheet or a scene holds everything) and draw it. */
  frame(b: Battle, dt: number, paused = false): void {
    const q = this.queue;
    const fx = this.opts.fx;
    const step = Math.min(dt, 250);
    q.calm = this.calm();
    if (!q.current) {
      // (the moment's bursts play out after it; no caster's effects are the ultimate's any more)
      if (fx?.epic.size) fx.epic = new Set();
      if (!paused) fx?.stepMoment(step);
      if (!this.layer.hidden) this.hide();
      return;
    }
    if (!paused) q.step(step);
    // (the moment's own effects stand still through the freeze on the blow)
    if (!paused && q.stopLeft <= 0) fx?.stepMoment(step);
    const m = q.current;
    if (!m) return this.hide();
    const u = b.units.find((x) => x.id === m.unit);
    this.layer.hidden = false;
    // (the layer takes taps (to skip) while the battle is held; once it runs again they reach the page)
    this.layer.classList.toggle('live', q.holdsBattle);
    if (q.phase === 'open' && this.shown !== q.seq && u) {
      this.slash(u, m.name);
      fx?.ultGather(u.id, m.el ?? 'light', ULT_MOMENT.OPEN_MS);
      play('ultSlash');
    }
    if (q.strikes !== this.struckSeen) {
      this.struckSeen = q.strikes;
      this.impact(b, m);
    }
    // (the band slashes away just before the blow, so the blow lands on an open board, ULT-EPIC)
    if ((q.phase === 'open' && q.left <= BAND_OUT_MS) || (q.phase !== 'open' && this.lastPhase === 'open')) this.layer.querySelector('.umSlash:not(.out)')?.classList.add('out');
    this.lastPhase = q.phase;
    this.drawDim(m, q.dim);
    if (!paused) this.slashT += step;
    if (this.kitCanvas) this.drawKit(m);
  }

  /** The blow lands: the bursts, a flash of the element's colour eased in and out round where it struck, and the heavy sting. */
  private impact(b: Battle, m: UltMoment): void {
    const el = m.el ?? 'light';
    const t = m.landing ?? m.targets ?? NONE;
    const spots = burstSpots(t, m.unit, settings().saver);
    this.opts.fx?.ultImpact(b, el, spots);
    play('ultImpact');
    const at = spots.map((s) => ('unit' in s ? this.opts.anchor(s.unit) : this.opts.tile?.(s.u, s.v) ?? null)).filter((p): p is Pt => !!p);
    const c = at.length ? { x: at.reduce((n, p) => n + p.x, 0) / at.length, y: at.reduce((n, p) => n + p.y, 0) / at.length } : { x: innerWidth / 2, y: innerHeight * 0.45 };
    this.layer.querySelector('.umFlash')?.remove();
    const flash = document.createElement('i');
    flash.className = 'umFlash';
    flash.style.setProperty('--el', hex(GLOW[el]));
    flash.style.setProperty('--x', `${Math.round(c.x)}px`);
    flash.style.setProperty('--y', `${Math.round(c.y)}px`);
    this.layer.append(flash);
    flash.addEventListener('animationend', () => flash.remove());
  }

  /** The dim over the board, with the light left over the caster, everyone it touched and the tiles it worked on (and a softer light over
   *  all of them together), at `level` (0 to 1). */
  private drawDim(m: UltMoment, level: number): void {
    const cv = this.dim;
    cv.style.opacity = level.toFixed(3);
    if (level <= 0) return;
    const w = Math.max(1, Math.round(innerWidth * DIM_RES));
    const h = Math.max(1, Math.round(innerHeight * DIM_RES));
    if (cv.width !== w || cv.height !== h) [cv.width, cv.height] = [w, h];
    const g = cv.getContext('2d');
    if (!g) return;
    const t = m.targets ?? NONE;
    const pts = (ids: readonly number[]) => ids.map((id) => this.opts.anchor(id)).filter((p): p is Pt => !!p);
    const tiles = this.opts.tile ? t.tiles.map((x) => this.opts.tile!(x.u, x.v)).filter((p): p is Pt => !!p) : [];
    const { pools, hull } = litPools(this.opts.anchor(m.unit), [...pts(t.struck), ...pts(t.helped)], tiles);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgb(4 6 12 / 0.84)';
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    const k = DIM_RES;
    if (hull) {
      g.save();
      g.translate(hull.x * k, hull.y * k);
      g.scale(1, hull.ry / hull.rx);
      const r = hull.rx * k;
      const grad = g.createRadialGradient(0, 0, r * 0.35, 0, 0, r);
      grad.addColorStop(0, 'rgb(0 0 0 / 0.55)');
      grad.addColorStop(1, 'rgb(0 0 0 / 0)');
      g.fillStyle = grad;
      g.fillRect(-r, -r, r * 2, r * 2);
      g.restore();
    }
    for (const p of pools) {
      const r = p.r * k;
      const grad = g.createRadialGradient(p.x * k, p.y * k, r * 0.45, p.x * k, p.y * k, r);
      grad.addColorStop(0, 'rgb(0 0 0 / 1)');
      grad.addColorStop(1, 'rgb(0 0 0 / 0)');
      g.fillStyle = grad;
      g.fillRect(p.x * k - r, p.y * k - r, r * 2, r * 2);
    }
  }

  private slash(u: Unit, name: string): void {
    this.shown = this.queue.seq;
    this.slashT = 0;
    this.layer.querySelector('.umSlash')?.remove();
    const ult = ultimateOf(u);
    const colour = hex(GLOW[skillElement(ult ? keyOf(ult) : '')]);
    const el = document.createElement('div');
    el.className = 'umSlash';
    el.style.setProperty('--el', colour);
    el.style.setProperty('--open', `${ULT_MOMENT.OPEN_MS}ms`);
    const band = document.createElement('div');
    band.className = 'umBand';
    // (the speed lines rushing through the band: the painted kit's when its atlas has loaded, else CSS lines; and its glowing edges)
    const kit = spellImage(KIT_SESSION) && spellPart(KIT.speedlines) ? document.createElement('canvas') : null;
    this.kitCanvas = kit;
    if (kit) {
      kit.className = 'umKit';
      band.classList.add('kit');
      band.append(kit);
    } else {
      const lines = document.createElement('i');
      lines.className = 'umLines';
      band.append(lines);
    }
    const img = document.createElement('img');
    img.className = 'umArt';
    img.alt = '';
    img.decoding = 'async';
    img.src = this.opts.art(u);
    const words = document.createElement('div');
    words.className = 'umWords';
    const who = document.createElement('small');
    who.textContent = heroName(u.def);
    const title = document.createElement('b');
    title.textContent = name;
    words.append(who, title);
    band.append(img, words);
    const streak = document.createElement('i');
    streak.className = 'umStreak';
    const edges = document.createElement('i');
    edges.className = 'umEdges';
    el.append(streak, band, edges);
    this.layer.append(el);
  }

  /** The painted kit's speed lines, tiled along the band and rushing to the right (held still with reduced motion), tinted to the element,
   *  and its glowing edge along the band's top and bottom. */
  private drawKit(m: UltMoment): void {
    const cv = this.kitCanvas!;
    const img = spellImage(KIT_SESSION);
    const lines = spellPart(KIT.speedlines);
    if (!img || !lines || !cv.isConnected) return;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== w || cv.height !== h) [cv.width, cv.height] = [w, h];
    const g = cv.getContext('2d');
    if (!g) return;
    const t = this.reduced ? 0 : this.slashT;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    const cell = lines.cell;
    const f = Math.floor(t / 80) % lines.frames;
    const tile = h;
    const off = ((t * 0.9) % tile) - tile;
    g.globalAlpha = 0.85;
    for (let x = off; x < w; x += tile) g.drawImage(img, (lines.col + f) * cell, lines.row * cell, cell, cell, x, 0, tile, h);
    const edge = spellPart(KIT.edge);
    if (edge) {
      const fe = Math.floor(t / 90) % edge.frames;
      const eh = 54;
      for (const y of [-eh / 2, h - eh / 2]) for (let x = off * 1.4 % eh - eh; x < w; x += eh * 2) g.drawImage(img, (edge.col + fe) * cell, edge.row * cell, cell, cell, x, y, eh * 2, eh);
    }
    // (tinted to the element: the painting is white and gold)
    g.globalAlpha = 0.45;
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = hex(GLOW[m.el ?? 'light']);
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
  }

  private hide(): void {
    this.layer.hidden = true;
    this.layer.querySelector('.umSlash')?.remove();
    this.layer.querySelector('.umFlash')?.remove();
    this.kitCanvas = null;
    this.shown = 0;
    this.lastPhase = 'idle';
  }

  /** The fight is over or left: every moment dropped. */
  clear(): void {
    this.queue.clear();
    this.struckSeen = this.queue.strikes;
    if (this.opts.fx) this.opts.fx.epic = new Set();
    this.hide();
  }

  /** For the screenshots: the moment's animations frozen `ms` into the opening. */
  get root(): HTMLElement {
    return this.layer;
  }
}
