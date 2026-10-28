// The Battle tab: the company scouts its current enemy army from a cliffside command post.
// All troop ranks, animation and atmosphere are decorative; they never step the battle.

import { tok } from './render/tok';
import type { Meta } from './sim/meta';
import { heroRig, lookKey } from './render/awakenRig';
import type { Army } from './sim/armies';
import { sheetInfo } from './render/sheets';
import { canvasOf, ROWS, shrinkRig, type Small } from './render/smallRig';
import { loadImage } from './render/loadImage';
import { onSettings, settings } from './settings';
import { EMOTE_NAMES, EMOTES } from './tavern';
import { goatSheet } from './duchess';
import { goatSays } from './quips';
import { showQuip } from './quipView';
import {
  chewBob,
  drawDuchessCosmetic,
  drawHaystack,
  FRAME,
  goatFrame,
  hopLift,
  newGoat,
  rollDailyTreat,
  stepGoat,
  tapNudgeGoat,
  type Goat,
} from './render/duchessRules';
import type { Camp } from './render/campSpots';
import { CAMP_PAINT, scoutCamp, overlookLayout, overlookCrew, overlookRanks } from './render/overlookLayout';
import { UNITS } from './sim/units';
import { AREA_NAMES } from './menuArt';
import overlookUrl from './art/camp/overlook.png';
import campfireUrl from './art/castle/campfire.png';
import warCampUrl from './art/camp/camp-war.png';
import wildCampUrl from './art/camp/camp-wild.png';
import arcaneCampUrl from './art/camp/camp-arcane.png';

const ART: Record<string, string> = { overlook: overlookUrl, campfire: campfireUrl, war: warCampUrl, wild: wildCampUrl, arcane: arcaneCampUrl };
type Art = Record<string, HTMLImageElement>;
let art: Art | null = null;
let artLoading: Promise<Art> | null = null;
/** The camp's pictures, loaded and decoded (the page waits for them behind its loading screen, so the camp never opens empty). */
export const campArtReady = (): Promise<unknown> => loadArt();
function loadArt(): Promise<Art> {
  if (art) return Promise.resolve(art);
  if (artLoading) return artLoading;
  artLoading = (async () => {
    const got: Art = {};
    await Promise.all(Object.entries(ART).map(async ([k, url]) => (got[k] = await loadImage(url))));
    return (art = got);
  })().catch((error: unknown) => {
    artLoading = null;
    throw error;
  });
  return artLoading;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const chance = (p: number) => Math.random() < p;

type Mood = 'idle' | 'out' | 'pause' | 'back' | 'flourish';

interface Actor {
  kind: string;
  spot: { x: number; y: number; face: 1 | -1 };
  small: Small;
  /** The sheet's figure height the shrink was cut for (a new form re-cuts it). */
  cut: string;
  x: number;
  face: 1 | -1;
  mood: Mood;
  at: number;
  clock: number;
  target: number;
  clip: string;
  emote: { name: string; until: number } | null;
  phase: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  sway: number;
}

/** The army being scouted: the active run's army, otherwise the next unbeaten army. */
export interface CampArmy {
  army: Army;
  /** The boss's name and its sheet. */
  boss: string;
  sheet: string;
}

export class CampScene {
  readonly root = el('div', 'cpWrap');
  /** Earned chests rest by the supplies at the left of the ledge. */
  readonly stashMount = el('div', 'cpStash');
  /** Two mode plaques below the company and the distant Calamity landmark. */
  readonly dailySlot = el('div', 'cpSlot');
  readonly towerSlot = el('div', 'cpSlot');
  readonly calamitySlot = el('div', 'cpSlot cpPortalSlot');
  private heading = el('div', 'cpHeading');
  private armyRigs = new Map<string, Small>();
  private bossRig: Small | null = null;
  private crew: string[] = [];
  private ranks: ReturnType<typeof overlookRanks> = [];
  /** The army's brass plaque doubles as the war council's party button. */
  private plate = el('button', 'cpPlate');
  private canvas = el('canvas', 'cpRoom');
  private ctx = this.canvas.getContext('2d')!;
  private camp: Camp | null = null;
  /** Css pixels per scene pixel: a whole number of device pixels each (`k`) over the device pixel ratio, so it stays crisp. */
  private unit = 1;
  private back: HTMLCanvasElement | null = null;
  private glow: HTMLCanvasElement | null = null;
  private flame: { base: HTMLCanvasElement; layer: HTMLCanvasElement; w: number; h: number } | null = null;
  private actors = new Map<string, Actor>();
  private party: string[] = [];
  private meta: Meta | null = null;
  private next: CampArmy | null = null;
  private sparks: Spark[] = [];
  private raf = 0;
  private last = 0;
  private now = 0;
  private running = false;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private saver = settings().saver;
  private down: { x: number; y: number; t: number } | null = null;
  private watch: ResizeObserver;
  private bubbles = new Map<string, HTMLCanvasElement>();
  /** Duchess, who wanders the camp, nibbles at the heroes and hops when tapped (`render/duchessRules.ts`). */
  private goat: Goat | null = null;
  private goatArt: HTMLImageElement | null = null;
  private goatWas = '';

  constructor(
    private onPick: (kind: string) => void,
    private onParty: () => void,
  ) {
    this.plate.addEventListener('click', () => this.onParty());
    this.heading.append(el('span', 'cpEyebrow', 'THE WAR COUNCIL'), el('h2', '', 'Battle Overlook'), el('p', '', 'Scout the approaching army'));
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Your company on a cliff overlooking the enemy army, with the Calamity citadel on the horizon.');
    this.root.append(this.canvas, this.stashMount, this.dailySlot, this.towerSlot, this.calamitySlot, this.plate, this.heading);
    this.ctx.imageSmoothingEnabled = false;
    onSettings((s) => (this.saver = s.saver));
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    this.canvas.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY, t: performance.now() }));
    this.canvas.addEventListener('pointercancel', () => (this.down = null));
    this.canvas.addEventListener('pointerup', (e) => {
      const d = this.down;
      this.down = null;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 14 && performance.now() - d.t < 700) this.tap(e);
    });
    this.watch = new ResizeObserver(() => this.fit());
    this.watch.observe(this.root);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.halt() : this.running && this.start()));
  }

  /** Refresh the party and enemy ranks without restarting actors already on the ledge. */
  update(meta: Meta, party: string[], next: CampArmy | null): void {
    this.meta = meta;
    this.party = party;
    for (const k of [...this.actors.keys()]) if (!party.includes(k)) this.actors.delete(k);
    const changed = next?.army.id !== this.next?.army.id || next?.boss !== this.next?.boss;
    this.next = next;
    if (art && this.camp) {
      this.dress(meta);
      if (changed || !this.bossRig) this.prepareArmy();
      this.layPlate();
    }
  }

  /** Make an actor for each party member (once the pictures are ready) and re-cut a sheet that has changed form. */
  private dress(meta: Meta): void {
    const camp = this.camp!;
    this.party.forEach((kind, i) => {
      const sheet = lookKey(meta, kind);
      const rig = heroRig(meta, kind);
      const spot = camp.heroes[i];
      if (!rig || !spot) return;
      const a = this.actors.get(kind);
      if (a) {
        a.x += spot.x - a.spot.x;
        a.target += spot.x - a.spot.x;
        a.spot = spot;
        if (a.cut !== sheet) {
          a.small = shrinkRig(rig, 46);
          a.cut = sheet;
        }
        return;
      }
      this.actors.set(kind, {
        kind,
        spot,
        small: shrinkRig(rig, 46),
        cut: sheet,
        x: spot.x,
        face: spot.face,
        mood: 'idle',
        at: this.now + rand(500, 3500) + i * 400,
        clock: rand(0, 4000),
        target: spot.x,
        clip: 'idle',
        emote: null,
        phase: rand(0, 6),
      });
    });
  }

  /** Start drawing (the tab is showing). */
  start(): void {
    this.running = true;
    if (this.raf || document.hidden) return;
    void loadArt().then(() => {
      if (!this.running || this.raf) return;
      this.fit();
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    });
  }

  stop(): void {
    this.running = false;
    this.halt();
  }

  private halt(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  // ---- layout and the parts that never change ----

  private fit(): void {
    const bw = this.root.clientWidth;
    const bh = this.root.clientHeight;
    if (!bw || !bh || !art) return;
    // (a scene pixel is `k` device pixels, about a css pixel: the canvas holds the scene one to one and the page stretches it by whole device pixels)
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.round(dpr));
    this.unit = k / dpr;
    const w = Math.ceil((bw * dpr) / k);
    const h = Math.ceil((bh * dpr) / k);
    if (this.camp && this.camp.w === w && this.camp.h === h && this.back) return;
    const camp = overlookLayout(w, h);
    this.camp = camp;
    this.ranks = overlookRanks(w, h);
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w * this.unit}px`;
    this.canvas.style.height = `${h * this.unit}px`;
    this.canvas.style.left = `${(bw - w * this.unit) / 2}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.paintBack(art, camp);
    this.glow = this.paintGlow(camp);
    this.flame = this.cutFlame(art);
    if (this.meta) {
      this.dress(this.meta);
      if (this.next) this.prepareArmy();
    }
    this.layOut();
  }

  /** Where a scene pixel is on the page. */
  private at(x: number, y: number): { left: string; top: string } {
    const ox = (this.root.clientWidth - this.camp!.w * this.unit) / 2;
    return { left: `${ox + x * this.unit}px`, top: `${y * this.unit}px` };
  }

  /** The DOM pieces over the canvas sit at scene positions turned to css pixels. */
  private layOut(): void {
    const camp = this.camp!;
    const u = this.unit;
    const box = (e: HTMLElement, r: { x: number; y: number; w: number; h: number }) => Object.assign(e.style, this.at(r.x, r.y), { width: `${r.w * u}px`, height: `${r.h * u}px` });
    box(this.stashMount, camp.stash);
    box(this.dailySlot, camp.places.daily.box);
    box(this.towerSlot, camp.places.tower.box);
    box(this.calamitySlot, camp.places.calamity.box);
    for (const e of [this.dailySlot, this.towerSlot, this.calamitySlot]) e.style.setProperty('--plateH', '44px');
    this.layPlate();
  }

  private layPlate(): void {
    const camp = this.camp;
    if (!camp) return;
    const n = this.next;
    this.plate.hidden = !n;
    if (!n) return;
    this.plate.replaceChildren(el('span', 'cpEyebrow', 'THE ENEMY BELOW'), el('b', '', n.army.name), el('small', '', `${scoutCamp(n.army.id).name} · ${n.boss}`));
    this.root.dataset.army = n.army.id;
    this.root.dataset.area = n.army.area;
    this.canvas.setAttribute('aria-label', `Your company on a cliff above ${n.army.name}, led by ${n.boss}, in ${AREA_NAMES[n.army.area]}. The Calamity citadel looms on the horizon.`);
    this.plate.setAttribute('aria-label', `War council: ${n.army.name}, led by ${n.boss}. Opens your party.`);
    Object.assign(this.plate.style, this.at(camp.table.x, camp.table.y + 1));
  }

  /** The shared cliff and horizon surround a different painted base for each army. */
  private paintBack(a: Art, camp: Camp): void {
    const c = canvasOf(camp.w, camp.h);
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(a.overlook, 0, 0, camp.w, camp.h);
    const plan = scoutCamp(this.next?.army.id ?? 'orcs');
    const atlas = a[plan.atlas];
    const patch = canvasOf(camp.w, Math.round(camp.h * CAMP_PAINT.h));
    const pg = patch.getContext('2d')!;
    pg.imageSmoothingEnabled = false;
    const panelH = atlas.height / 3;
    pg.drawImage(atlas, 0, plan.row * panelH, atlas.width, panelH, 0, 0, patch.width, patch.height);
    // Feather into the valley mist, keeping the foreground banners and cliff intact.
    pg.globalCompositeOperation = 'destination-in';
    const vertical = pg.createLinearGradient(0, 0, 0, patch.height);
    for (const [at, alpha] of [[0, 0], [0.12, 1], [0.82, 1], [1, 0]]) vertical.addColorStop(at, `rgba(0,0,0,${alpha})`);
    pg.fillStyle = vertical;
    pg.fillRect(0, 0, patch.width, patch.height);
    const horizontal = pg.createLinearGradient(0, 0, patch.width, 0);
    for (const [at, alpha] of [[0, 0], [0.12, 1], [0.88, 1], [1, 0]]) horizontal.addColorStop(at, `rgba(0,0,0,${alpha})`);
    pg.fillStyle = horizontal;
    pg.fillRect(0, 0, patch.width, patch.height);
    g.drawImage(patch, 0, Math.round(camp.h * CAMP_PAINT.y));
    this.root.dataset.camp = `${plan.atlas}:${plan.row}`;
    this.back = c;
  }

  /** Cache small sheets once per army; never resize/read sprite pixels in a frame. */
  private prepareArmy(): void {
    this.armyRigs.clear();
    if (this.camp) {
      this.ranks = overlookRanks(this.camp.w, this.camp.h, this.next?.army.id);
      if (art) this.paintBack(art, this.camp);
    }
    this.crew = this.next ? overlookCrew(this.next.army) : [];
    if (!this.crew.length && this.next) this.crew = [this.next.army.waves[0].foes[0]];
    for (const kind of this.crew) {
      const rig = sheetInfo(UNITS[kind].sheet);
      if (rig) this.armyRigs.set(kind, this.litRig(shrinkRig(rig, 24)));
    }
    const boss = this.next && sheetInfo(this.next.sheet);
    this.bossRig = boss ? this.litRig(shrinkRig(boss, 32)) : null;
  }

  /** Distant figures catch the sunset so they remain legible against detailed ground. */
  private litRig(rig: Small): Small {
    const c = canvasOf(rig.c.width, rig.c.height);
    const g = c.getContext('2d')!;
    g.filter = 'brightness(1.15) saturate(1.1)';
    g.drawImage(rig.c, 0, 0);
    return { ...rig, c };
  }

  private army(g: CanvasRenderingContext2D, camp: Camp): void {
    const draw = (rig: Small, x: number, y: number, size: number, phase: number) => {
      const scale = size / rig.figure;
      const w = Math.round(rig.fw * scale);
      const h = Math.round(rig.fh * scale);
      const frame = this.reduced ? 0 : Math.floor(this.now / 220 + phase) % (rig.counts.idle || 1);
      g.fillStyle = 'rgba(8, 16, 20, 0.45)';
      g.fillRect(x - size / 3, y - 1, size * 0.66, 2);
      g.drawImage(rig.c, frame * rig.fw, 0, rig.fw, rig.fh, Math.round(x - w / 2), y - h, w, h);
    };
    for (const [i, rank] of this.ranks.entries()) {
      const rig = this.armyRigs.get(this.crew[rank.kind % this.crew.length]);
      if (rig) draw(rig, rank.x, rank.y, rank.size, i * 1.7);
    }
    const [bx, by] = scoutCamp(this.next?.army.id ?? 'orcs').boss;
    if (this.bossRig) draw(this.bossRig, Math.round(camp.w * bx), Math.round(camp.h * (CAMP_PAINT.y + by * CAMP_PAINT.h)), 17, 0);
  }

  /** Low mist moves continuously; reduced motion keeps an identical still frame. */
  private mist(g: CanvasRenderingContext2D, camp: Camp): void {
    const drift = this.reduced ? 0 : this.now / 45000;
    const area = this.next?.army.area;
    const tint: Partial<Record<NonNullable<typeof area>, string>> = {
      snow: '#9cd4ee', graveyard: '#5c67b0', dungeon: '#77649a',
      forest: '#5a9569', swamp: '#76965c', volcano: '#c45c38',
      forge: '#cd843e', desert: '#d4b276', crystal: '#8c7ac9', shrine: '#9e75bb',
    };
    if (area && tint[area]) {
      g.save();
      g.globalAlpha = 0.17;
      g.fillStyle = tint[area]!;
      g.fillRect(0, 0, camp.w, Math.round(camp.h * 0.64));
      g.restore();
    }
    for (let i = 0; i < 3; i++) {
      const x = camp.w * (0.15 + i * 0.35 + Math.sin(drift + i) * 0.08);
      const y = camp.h * (0.44 + i * 0.07);
      const fog = g.createRadialGradient(x, y, 0, x, y, camp.w * 0.36);
      fog.addColorStop(0, 'rgba(178, 204, 211, 0.12)');
      fog.addColorStop(1, 'rgba(178, 204, 211, 0)');
      g.fillStyle = fog;
      g.fillRect(0, y - 14, camp.w, 28);
    }
    if (area === 'snow' || area === 'volcano' || area === 'forge') {
      const snow = area === 'snow';
      g.fillStyle = snow ? 'rgba(229, 243, 248, 0.65)' : 'rgba(241, 167, 84, 0.65)';
      for (let i = 0; i < 24; i++) {
        const travel = this.reduced ? 0 : this.now / (snow ? 110 : -150);
        const x = (i * 67 + Math.round(Math.sin(drift + i) * 9)) % camp.w;
        const span = Math.round(camp.h * 0.58);
        const y = ((i * 43 + travel) % span + span) % span + camp.h * 0.08;
        g.fillRect(x, Math.round(y), snow && i % 4 === 0 ? 2 : 1, 1);
      }
    }
  }

  /** The firelight: warm orange over the ground and the faces, drawn additively at a steady opacity (no flicker). */
  private paintGlow(camp: Camp): HTMLCanvasElement {
    const c = canvasOf(camp.w, camp.h);
    const g = c.getContext('2d')!;
    const lamp = (x: number, y: number, r: number, al: number, squash = 1) => {
      g.save();
      g.translate(x, y);
      g.scale(1, squash);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
      rg.addColorStop(0, `rgba(255, 170, 70, ${al})`);
      rg.addColorStop(0.5, `rgba(255, 130, 40, ${al * 0.4})`);
      rg.addColorStop(1, 'rgba(255, 110, 30, 0)');
      g.fillStyle = rg;
      g.fillRect(-r, -r, r * 2, r * 2);
      g.restore();
    };
    lamp(camp.fire.x, camp.fire.y - 14, 190, 0.34, 0.6);
    lamp(camp.fire.x, camp.fire.y - 30, 56, 0.34);
    for (const p of camp.props) if (p.sprite === 'torch') lamp(p.x, p.y - 62, 34, 0.3);
    return c;
  }

  /** The campfire's picture split in two: the logs and stones, and the flame cut out of it (for the flame to wave by itself). */
  private cutFlame(a: Art): { base: HTMLCanvasElement; layer: HTMLCanvasElement; w: number; h: number } {
    const im = a.campfire;
    const src = canvasOf(im.width, im.height);
    const sg = src.getContext('2d', { willReadFrequently: true })!;
    sg.drawImage(im, 0, 0);
    const data = sg.getImageData(0, 0, im.width, im.height);
    const flame = sg.createImageData(im.width, im.height);
    const base = sg.createImageData(im.width, im.height);
    for (let y = 0; y < im.height; y++)
      for (let x = 0; x < im.width; x++) {
        const k = (y * im.width + x) * 4;
        const [r, g, b, al] = [data.data[k], data.data[k + 1], data.data[k + 2], data.data[k + 3]];
        const hot = al > 0 && r > 185 && r - b > 110 && g > 70;
        if (!hot) {
          for (let j = 0; j < 4; j++) base.data[k + j] = data.data[k + j];
        } else {
          for (let j = 0; j < 4; j++) flame.data[k + j] = data.data[k + j];
          // (the logs keep a dark ember where the flame was low among the sticks, and nothing above)
          if (y > im.height * 0.5) {
            base.data[k] = 120;
            base.data[k + 1] = 44;
            base.data[k + 2] = 16;
            base.data[k + 3] = 255;
          }
        }
      }
    const layer = canvasOf(im.width, im.height);
    layer.getContext('2d')!.putImageData(flame, 0, 0);
    const bc = canvasOf(im.width, im.height);
    bc.getContext('2d')!.putImageData(base, 0, 0);
    return { base: bc, layer, w: im.width, h: im.height };
  }

  // ---- behaviour ----

  private think(a: Actor, now: number): void {
    if (a.mood === 'idle' && now >= a.at) {
      const roll = Math.random();
      if (roll < 0.3) a.face = a.face === 1 ? -1 : 1;
      else if (roll < 0.62) a.emote = { name: EMOTE_NAMES[Math.floor(Math.random() * EMOTE_NAMES.length)], until: now + rand(1800, 3000) };
      else if (!this.reduced && roll < 0.84) {
        a.target = a.spot.x + (chance(0.5) ? 1 : -1) * rand(8, 18);
        a.face = a.target > a.x ? 1 : -1;
        a.mood = 'out';
        a.clock = 0;
      } else if (!this.reduced) {
        a.mood = 'flourish';
        a.clip = 'attack';
        a.clock = 0;
      }
      a.at = now + rand(2500, 8000);
    }
  }

  private step(a: Actor, dt: number, now: number): void {
    a.clock += dt;
    if (a.mood === 'out' || a.mood === 'back') {
      const goal = a.mood === 'out' ? a.target : a.spot.x;
      const dx = goal - a.x;
      const move = 18 * (dt / 1000);
      if (Math.abs(dx) <= move) {
        a.x = goal;
        if (a.mood === 'out') {
          a.mood = 'pause';
          a.at = now + rand(1500, 3000);
        } else {
          a.mood = 'idle';
          a.face = a.spot.face;
          a.at = now + rand(2000, 6000);
        }
      } else a.x += Math.sign(dx) * move;
    } else if (a.mood === 'pause' && now >= a.at) {
      a.mood = 'back';
      a.face = a.spot.x > a.x ? 1 : -1;
    } else if (a.mood === 'flourish') {
      if (a.clock >= (a.small.counts.attack ?? 1) * 110) {
        a.mood = 'idle';
        a.at = now + rand(2500, 7000);
      }
    }
    if (a.emote && now >= a.emote.until) a.emote = null;
  }

  private frame(t: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const gap = this.saver ? 33 : 0;
    if (t - this.last < gap) return;
    const dt = Math.min(100, t - this.last);
    this.last = t;
    this.now += dt;
    for (const a of this.actors.values()) {
      if (!this.reduced) {
        this.think(a, this.now);
        this.step(a, dt, this.now);
      }
    }
    this.stepGoat(dt);
    this.burn(dt);
    this.draw();
  }

  /** Where Duchess's ground is: a strip across the front of the camp (her feet's line, and the ends), kept clear of the buttons. */
  private goatGround(camp: Camp): { y: number; min: number; max: number } {
    const y = Math.round(camp.h * 0.7);
    return { y, min: Math.round(camp.w * 0.27), max: Math.round(camp.w * 0.36) };
  }

  private stepGoat(dt: number): void {
    const camp = this.camp;
    if (!camp) return;
    if (!this.goatArt) {
      void goatSheet().then((im) => (this.goatArt = im));
      return;
    }
    const ground = this.goatGround(camp);
    const hayX = ground.min + 8;
    this.goat ??= { ...newGoat(ground.min, this.now), face: 1 };
    this.goat.x = Math.max(ground.min, Math.min(ground.max, this.goat.x));
    // Duchess occasionally nests on the haystack
    if (this.goat.mode !== 'nest' && this.goat.mode !== 'hop' && Math.random() < 0.003) {
      this.goat.mode = 'nest';
      this.goat.x = hayX;
      this.goat.at = this.now + 12000;
    }
    // (heroes' feet along her strip: she may go and nibble one)
    const friends = [...this.actors.values()].map((a) => a.x);
    stepGoat(this.goat, dt, this.now, { min: ground.min, max: ground.max, friends }, Math.random, this.reduced);
    // (a nibble starts: now and then she says so)
    if (this.goat.mode === 'nibble' && this.goatWas !== 'nibble') this.goatSpeak('nibble');
    this.goatWas = this.goat.mode;
  }

  /** Duchess's bubble, over her head. */
  private goatSpeak(kind: 'tap' | 'nibble'): void {
    const camp = this.camp;
    const goat = this.goat;
    if (!camp || !goat) return;
    const box = this.canvas.getBoundingClientRect();
    const g = this.goatGround(camp);
    goatSays(kind, { x: box.left + goat.x * this.unit, y: box.top + (g.y - 34) * this.unit });
  }

  /** Sparks lift off the fire and drift up and out, cooling from yellow to orange to dark. */
  private burn(dt: number): void {
    if (this.reduced || !this.camp) return;
    const f = this.camp.fire;
    if (this.sparks.length < 40 && Math.random() < dt / 60) {
      this.sparks.push({ x: f.x + rand(-9, 9), y: f.y - 24, vx: rand(-5, 5), vy: -rand(18, 46), age: 0, life: rand(1000, 2600), sway: rand(0, 6) });
    }
    for (const s of this.sparks) {
      s.age += dt;
      s.y += s.vy * (dt / 1000);
      s.x += (s.vx + Math.sin(s.age / 260 + s.sway) * 8) * (dt / 1000);
    }
    this.sparks = this.sparks.filter((s) => s.age < s.life);
  }

  // ---- drawing ----

  private draw(): void {
    const g = this.ctx;
    const camp = this.camp;
    const a = art;
    if (!a || !camp || !this.back) return;
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.drawImage(this.back, 0, 0);
    this.army(g, camp);
    this.mist(g, camp);
    const list: { depth: number; paint: () => void }[] = [];
    list.push({ depth: camp.fire.y, paint: () => this.fire(g, camp) });
    for (const actor of this.actors.values()) list.push({ depth: actor.spot.y, paint: () => this.hero(g, actor) });
    if (this.goat && this.goatArt) list.push({ depth: this.goatGround(camp).y, paint: () => this.duchess(g, camp) });
    list.sort((p, q) => p.depth - q.depth);
    for (const e of list) e.paint();
    this.sparksDraw(g);
    g.globalCompositeOperation = 'lighter';
    if (this.glow) {
      g.globalAlpha = 0.8;
      g.drawImage(this.glow, 0, 0);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    // (the emote bubbles stay clear of the dusk)
    for (const actor of this.actors.values()) if (actor.emote) this.bubble(g, actor);
  }

  /** The campfire: its logs, then its flame leaning slowly side to side (no flicker: the height holds still). */
  private fire(g: CanvasRenderingContext2D, camp: Camp): void {
    const f = this.flame;
    if (!f) return;
    const x = Math.round(camp.fire.x - f.w / 2);
    const y = Math.round(camp.fire.y - f.h);
    g.drawImage(f.base, x, y);
    const t = this.reduced ? 0 : this.now;
    for (let row = 0; row < f.h; row++) {
      const lean = (f.h - row) / f.h;
      const dx = this.reduced ? 0 : Math.round(Math.sin(t / 700 + row * 0.2) * 1.5 * lean);
      g.drawImage(f.layer, 0, row, f.w, 1, x + dx, y + row, f.w, 1);
    }
  }

  private sparksDraw(g: CanvasRenderingContext2D): void {
    for (const s of this.sparks) {
      const k = s.age / s.life;
      g.fillStyle = k < 0.3 ? '#fff0a0' : k < 0.65 ? '#ffa030' : '#c0501c';
      g.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
      if (k < 0.2) g.fillRect(Math.round(s.x), Math.round(s.y) - 1, 1, 1);
    }
  }

  /** What row and frame a hero shows now. */
  private pose(a: Actor): { row: number; i: number; lift: number } {
    if (this.reduced) return { row: 0, i: 0, lift: 0 };
    const walking = a.mood === 'out' || a.mood === 'back';
    const name = a.mood === 'flourish' ? 'attack' : walking ? 'walk' : 'idle';
    const n = a.small.counts[name] ?? 1;
    const per = a.mood === 'flourish' ? 110 : walking ? 100 : 150;
    const i = Math.floor((a.clock + a.phase * 977) / per) % n;
    const lift = name === 'idle' && n === 1 && Math.sin((this.now + a.phase * 1300) / 520) > 0.35 ? 1 : 0;
    return { row: ROWS.indexOf(name), i: a.mood === 'flourish' ? Math.min(i, n - 1) : i, lift };
  }

  private hero(g: CanvasRenderingContext2D, a: Actor): void {
    const { small } = a;
    const { row, i, lift } = this.pose(a);
    const fx = Math.round(a.x);
    const fy = a.spot.y;
    g.fillStyle = 'rgba(8, 3, 1, 0.4)';
    const sw = Math.max(8, Math.round(small.figure * 0.28));
    g.fillRect(fx - sw, fy - 1, sw * 2, 2);
    g.fillRect(fx - sw + 3, fy - 2, sw * 2 - 6, 1);
    g.fillRect(fx - sw + 3, fy + 1, sw * 2 - 6, 1);
    const dy = fy - lift - small.fh;
    // (a sheet's figures face right unless the sheet says otherwise; a mirror turns them)
    if ((a.face === 1) !== small.facesRight) {
      g.setTransform(-1, 0, 0, 1, fx, 0);
      g.drawImage(small.c, i * small.fw, row * small.fh, small.fw, small.fh, -Math.round(small.fw / 2), dy, small.fw, small.fh);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else g.drawImage(small.c, i * small.fw, row * small.fh, small.fw, small.fh, fx - Math.round(small.fw / 2), dy, small.fw, small.fh);
  }

  /** Duchess herself: a shadow, then her frame (the sheet is 48-pixel frames, her feet at the bottom). */
  private duchess(g: CanvasRenderingContext2D, camp: Camp): void {
    const goat = this.goat!;
    const foot = this.goatGround(camp).y;
    const hayX = this.goatGround(camp).min + 8;
    drawHaystack(g, hayX, foot, 1);
    const x = Math.round(goat.x);
    g.fillStyle = 'rgba(8, 3, 1, 0.4)';
    g.fillRect(x - 10, foot - 1, 20, 2);
    g.fillRect(x - 7, foot - 2, 14, 1);
    const lift = Math.round(hopLift(goat, this.now));
    const bob = chewBob(goat, this.now, this.reduced);
    const dy = foot - FRAME - lift - bob;
    g.drawImage(this.goatArt!, goatFrame(goat) * FRAME, 0, FRAME, FRAME, x - FRAME / 2, dy, FRAME, FRAME);
    drawDuchessCosmetic(g, settings().duchessHat, x - FRAME / 2, dy, 1, goat.face, 0);
  }

  /** The speech bubbles, each drawn once into a small canvas (the tavern's emotes). */
  private bubbleArt(name: string): HTMLCanvasElement {
    let c = this.bubbles.get(name);
    if (c) return c;
    const e = EMOTES[name];
    c = canvasOf(13, 15);
    const g = c.getContext('2d')!;
    g.fillStyle = tok('--s1', '#0b0e12');
    g.fillRect(1, 0, 11, 13);
    g.fillRect(0, 1, 13, 11);
    g.fillRect(5, 13, 3, 2);
    g.fillStyle = tok('--s14', '#cfd9e3');
    g.fillRect(1, 1, 11, 11);
    g.fillRect(5, 13, 2, 1);
    e.rows.forEach((row, ry) =>
      [...row].forEach((ch, rx) => {
        if (ch === '.') return;
        g.fillStyle = e.ink[ch];
        g.fillRect(3 + rx, 3 + ry, 1, 1);
      }),
    );
    this.bubbles.set(name, c);
    return c;
  }

  private bubble(g: CanvasRenderingContext2D, a: Actor): void {
    const y = a.spot.y - a.small.fh - 14 + (Math.floor(this.now / 380) % 2);
    g.drawImage(this.bubbleArt(a.emote!.name), Math.round(a.x) - 6, y);
  }

  // ---- tapping ----

  private tap(e: PointerEvent): void {
    const camp = this.camp;
    if (!camp) return;
    const box = this.canvas.getBoundingClientRect();
    const rx = (e.clientX - box.left) / this.unit;
    const ry = (e.clientY - box.top) / this.unit;
    // (Duchess first: a tap on her few pixels is hers, and she hops)
    if (this.goat && this.goatArt) {
      const foot = this.goatGround(camp).y;
      if (Math.abs(rx - this.goat.x) < 16 && ry > foot - 30 && ry < foot + 6) {
        const nudge = tapNudgeGoat(this.goat, this.now);
        if (nudge.hopped) {
          try {
            const raw = localStorage.getItem('legends.meta');
            if (raw) {
              const m = JSON.parse(raw);
              m.duchessTaps = (m.duchessTaps ?? 0) + 1;
              localStorage.setItem('legends.meta', JSON.stringify(m));
            }
          } catch {
            /* ignore */
          }
          if (nudge.nudgedFromNest) {
            this.claimHaystackTreat();
          } else {
            this.goatSpeak('tap');
          }
        }
        return;
      }
    }
    // (generous: the hero whose body is nearest the finger wins, within a reach a little wider and taller than the body)
    let best: { kind: string; d: number; y: number } | null = null;
    for (const a of this.actors.values()) {
      const half = Math.max(16, a.small.fw / 4) + 10;
      const tall = a.small.fh + 8;
      if (rx < a.x - half || rx > a.x + half || ry < a.spot.y - tall || ry > a.spot.y + 12) continue;
      const d = Math.hypot((rx - a.x) / half, (ry - (a.spot.y - tall / 2)) / (tall / 2));
      if (!best || d < best.d - 0.15 || (Math.abs(d - best.d) <= 0.15 && a.spot.y > best.y)) best = { kind: a.kind, d, y: a.spot.y };
    }
    if (best) return this.onPick(best.kind);
    // The painted war table at the left of the ledge also opens the party.
    if (rx < camp.w * 0.2 && ry > camp.h * 0.62 && ry < camp.h * 0.75) this.onParty();
  }

  private claimHaystackTreat(): void {
    const today = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
    let claimed = false;
    let meta: Meta | null = null;
    try {
      const raw = localStorage.getItem('legends.meta');
      if (raw) {
        meta = JSON.parse(raw);
        if (meta && meta.duchessTreat === today) claimed = true;
      }
    } catch {
      /* ignore */
    }

    const box = this.canvas.getBoundingClientRect();
    const g = this.goatGround(this.camp!);
    const x = box.left + this.goat!.x * this.unit;
    const y = box.top + (g.y - 34) * this.unit;

    if (claimed) {
      showQuip({ x, y }, 'Duchess hops off her hay! (Already found today’s treat)', { who: 'Duchess', goat: true, hold: 2200 });
      return;
    }

    const treat = rollDailyTreat();
    if (meta) {
      meta.duchessHay = true;
      meta.duchessTreat = today;
      if (treat.kind === 'stones') {
        meta.stones = (meta.stones ?? 0) + treat.amount;
      } else if (treat.kind === 'crowns') {
        meta.crowns = (meta.crowns ?? 0) + treat.amount;
      }
      try {
        localStorage.setItem('legends.meta', JSON.stringify(meta));
      } catch {
        /* ignore */
      }
    }
    showQuip({ x, y }, treat.message, { who: 'Duchess', goat: true, hold: 3200 });
  }
}
