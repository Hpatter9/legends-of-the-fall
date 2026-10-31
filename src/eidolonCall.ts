// The Eidolon's call on the page (EIDOLONS batch 4, docs/notes/eidolons.md; the rules and timings are `eidolonRules.ts`, the sim's call is
// `sim/eidolons.ts`, the horn's fill `sim/warHorn.ts`). Three parts:
//
// - **The War Horn**, in the fight beside the spell orbs and at the camp beside the stones: the horn's painting (`horn-empty`) with its lit
//   painting (`horn-light`) revealed from the mouthpiece to the bell as it fills, and a glow along it that grows with it. A gain streams motes
//   of light into it (a boss wave's is a rush). Full, it turns to its ready painting with a warm aura of drifting runes and a sheen crossing
//   it, steady (nothing blinks). A tap when full blows it (a confirm the first time). Before the first Eidolon is bound the horn is not the
//   player's yet (HORN-GIFT, `hornHeld`): both widgets are hidden, in the fight, the Last Stand and at the camp.
// - **The call's cinematic**, built on the ultimate's moment (the dim, the hit-stop, the shake, the element's painted bursts, the flash) at
//   a larger scale: the horn swings up and is blown, a summoning circle draws itself across the board, the sky tears open in the Eidolon's
//   colour, its painted figure rises large between letterbox bars, breathing, with motes drifting off it, its name and title stamp in, then
//   its attack in beats (each with its bursts across the board, a flash and a sound; the first with the hit-stop and the full shake, and the
//   sim's strike let through on it so the foes fall under the blow), and the board is washed in its colour as the figure fades up and out.
//   The first call of each Eidolon always plays in full and cannot be skipped; after that a tap skips once a second has played, and the
//   Settings switch gives the short version. Reduced motion: no sweeps or shakes, the figure and words fade in and out held still. Battery
//   saver: fewer motes and bursts, the same beats.
// - **The sheets**: the first blow's confirm (the fight held while it is open), the horn's card at the camp (its fill, how it fills, the
//   Eidolons bound, a tap choosing the one that answers).
//
// It never changes the battle except through the sim's own order (`orderEidolon`); the page's fight loop asks `holds` before stepping it,
// and steps one tick when `wantsTick` (the strike).

import type { Battle, BattleEvent } from './sim/battle';
import type { Meta } from './sim/meta';
import { armEidolon, canCallEidolon, eidolonById, eidolonFullName, EIDOLONS, type Eidolon } from './sim/eidolons';
import { orderEidolon } from './sim/orders';
import { blowHorn, boundOf, chooseEidolon, chosenOf, HORN, hornHeld, hornOf, hornReady, noteSeen, seenCall } from './sim/warHorn';
import { beatTimes, buildAt, BOARD_ZOOM, canSkip, CHOREO, EYES, hornLook, hornWords, lineOf, LOOKS, momentOf, motesFor, NO_EIDOLON, reactionOf, shotAt, skipTarget, SNAP_MS, SNAP_ZOOM, SUMMONER_HINT, type MomentTimes, type Shot } from './eidolonRules';
import { breathReach, exitPoint, hitAt, markTime, marksOf, maxRuns, PASS, passPose, passShare, runFrom, SOURCES, spriteFrame, spritePlace, SPRITES as MONS, wakeRate, type AttackSource, type EidolonSprite, type Mark, type PassSpec, type Sprite } from './eidolonPass';
import askelSprite from './art/eidolons/sprites/askel.png';
import askelBreath from './art/eidolons/sprites/askel-breath.png';
import nivraSprite from './art/eidolons/sprites/nivra.png';
import nivraBreath from './art/eidolons/sprites/nivra-breath.png';
import aurelanSprite from './art/eidolons/sprites/aurelan.png';
import aurelanBreath from './art/eidolons/sprites/aurelan-breath.png';
import voltaraSprite from './art/eidolons/sprites/voltara.png';
import voltaraBreath from './art/eidolons/sprites/voltara-breath.png';
import gormSprite from './art/eidolons/sprites/gorm.png';
import vaelkharSprite from './art/eidolons/sprites/vaelkhar.png';
import vaelkharBreath from './art/eidolons/sprites/vaelkhar-breath.png';
import flameFire from './art/fx/vfx/flame_fire.png';
import sparkleFire from './art/fx/vfx/sparkle_fire.png';
import puffFire from './art/fx/vfx/puff_fire.png';
import fireExplosion from './art/fx/magic/fire_explosion.png';
import puffIce from './art/fx/vfx/puff_ice.png';
import statusIce from './art/fx/vfx/status_ice.png';
import pillarLight from './art/fx/vfx/pillar_light.png';
import sparkleLight from './art/fx/vfx/sparkle_light.png';
import lightNova from './art/fx/magic/light_nova.png';
import lightningStrike from './art/fx/magic/lightning_strike.png';
import lightningBurst from './art/fx/magic/lightning_burst.png';
import puffSand from './art/fx/vfx/puff_sand.png';
import earthBurst from './art/fx/magic/earth_burst.png';
import dustWhite from './art/fx/vfx/dust_white.png';
import smokeDark from './art/fx/vfx/smoke_dark.png';
import darkCircle from './art/fx/magic/dark_circle.png';
import { faultLine, fxBudget, FX_CELL, jagged, pillarOrder, RING, spreadShocks, STRIKE_FX, type FxStrip, type StrikeLook } from './eidolonFx';
import type { Fx } from './render/fx';
import { play, duck } from './render/sound';
import { settings } from './settings';

export interface EidolonCallOpts {
  meta: () => Meta;
  save: () => void;
  fx?: Fx;
  /** The middle of a fighter on the page (client px), for the light and bursts; null when it cannot be told. */
  anchor: (id: number) => { x: number; y: number } | null;
  /** A tile's ground on the page (client px). */
  tile: (u: number, v: number) => { x: number; y: number } | null;
  /** After the strike: a hero's reaction line (the page shows it as a quip from a hero standing). */
  cheer?: (b: Battle, text: string) => void;
  /** The board's picture (the page's canvas): the cinematic's camera frames it (a scale about a point), and puts it back after. */
  stage?: () => HTMLElement | null;
  /** EIDOLON-CHAINS: open the Pact Gallery (from the horn's card at the camp). */
  gallery?: () => void;
}

const URL_OF = (name: string) => `eidolons/${name}.webp`;
export const figureUrl = (id: string) => URL_OF(`${id}-figure`);
export const cardUrl = (id: string) => URL_OF(`${id}-card`);

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const img = (src: string, cls: string): HTMLImageElement => {
  const i = el('img', cls);
  i.alt = '';
  i.decoding = 'async';
  i.draggable = false;
  i.src = src;
  return i;
};
/** EIDOLON-CALL-2: the pack strips (six frames of 32 px, already in the game and credited) the pass, the trail and the attack are drawn with. */
const SPRITES: Readonly<Record<Sprite, string>> = {
  flame: flameFire, embers: sparkleFire, firePuff: puffFire, fireBurst: fireExplosion, icePuff: puffIce, iceGlint: statusIce, pillar: pillarLight,
  sparkLight: sparkleLight, nova: lightNova, bolt: lightningStrike, ring: lightningBurst, sand: puffSand, earth: earthBurst, dust: dustWhite,
  smoke: smokeDark, darkCircle: darkCircle,
};
/** A pack strip at a point (client px): `foot` stands it on the point, else it is centred there; `loop` plays its frames on, else once. */
const strip = (kind: Sprite, cls: string, x: number, y: number, o: { scale?: number; loop?: boolean; foot?: boolean; ms?: number } = {}): HTMLElement => {
  const d = el('i', `ecSp ${cls}${o.loop ? ' loop' : ' once'}${o.foot ? '' : ' mid'}`);
  d.style.backgroundImage = `url(${SPRITES[kind]})`;
  d.style.left = `${Math.round(x)}px`;
  d.style.top = `${Math.round(y)}px`;
  if (o.scale) d.style.setProperty('--sc', String(o.scale));
  if (o.ms) d.style.setProperty('--ms', `${o.ms}ms`);
  return d;
};

/** EIDOLON-FX: an effect strip of the strike (`eidolonFx.ts`), loaded by URL (the service worker keeps them), at a point (client px): it
 *  plays its frames once (or on, `loop`) after `delay` ms, so a whole strike is laid out at the blow and rolls on by itself, frozen with
 *  the rest in the hit-stop. A negative delay starts it part-way, so the frozen frame is already the bright one. */
const FX_URL = (sheet: string) => (sheet === RING.sheet ? `eidolons/fx/${sheet}.png` : `eidolons/fx/${sheet}.webp`);
function fxEl(st: FxStrip, x: number, y: number, o: { delay?: number; mul?: number; cls?: string; filter?: string } = {}): HTMLElement {
  const d = el('i', `ecFx${st.foot ? ' foot' : ''}${o.cls ? ` ${o.cls}` : ''}`);
  const size = Math.round(FX_CELL * st.scale * (o.mul ?? 1));
  d.style.width = d.style.height = `${size}px`;
  d.style.left = `${Math.round(x)}px`;
  d.style.top = `${Math.round(y)}px`;
  d.style.backgroundImage = `url(${FX_URL(st.sheet)})`;
  d.style.backgroundSize = `${st.n * 100}% 100%`;
  d.style.setProperty('--hold', `${st.n > 1 ? (st.hold / (st.n - 1)) * 100 : 0}%`);
  if (o.filter) d.style.filter = o.filter;
  const delay = Math.round(o.delay ?? 0);
  d.style.setProperty('--life', `${st.ms + 300}ms`);
  d.style.setProperty('--delay', `${Math.max(0, delay)}ms`);
  // (a strip with a delay stays unseen until its time, then plays: `ecFxIn` holds it hidden, so frame one never shows early)
  const wait = delay > 0 ? `, ecFxIn 1ms linear ${delay}ms both` : '';
  d.style.animation = st.loop
    ? `ecFxPlay ${st.ms}ms steps(${st.n}, jump-none) ${delay}ms infinite${wait}`
    : `ecFxPlay ${st.ms}ms steps(${st.n}, jump-none) ${delay}ms both${wait}, ecFxEnd 240ms ease-in ${delay + st.ms - 120}ms forwards`;
  return d;
}

/** The sprite Eidolons' sheets (the owner's addition: `eidolonPass.ts` `SPRITES`). */
const MON_SHEETS: Readonly<Record<EidolonSprite['sheet'], string>> = { askel: askelSprite, nivra: nivraSprite, aurelan: aurelanSprite, voltara: voltaraSprite, gorm: gormSprite, vaelkhar: vaelkharSprite };
/** Their breaths, beams and bolts (EIDOLON-FX: each its own strip, drawn from the mouth or hands across the foes). */
const MON_BREATHS: Readonly<Partial<Record<EidolonSprite['sheet'], string>>> = { askel: askelBreath, nivra: nivraBreath, aurelan: aurelanBreath, voltara: voltaraBreath, vaelkhar: vaelkharBreath };

/** The full call's strike to aftermath (ms): the aftershocks' delays in `eidolonFx.ts` are set to it, and the short call's are scaled. */
const STRIKE_FX_SPAN = 730;

const reducedNow = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A War Horn widget: the three paintings stacked, the glow, the sheen and the aura, and its words. */
export class HornView {
  readonly root: HTMLButtonElement;
  private words: HTMLElement;
  private motes: HTMLElement;
  private last = '';
  constructor(cls: string, label: string) {
    this.root = el('button', `ehHorn ${cls}`);
    this.root.type = 'button';
    this.root.setAttribute('aria-label', label);
    const art = el('span', 'ehArt');
    art.append(el('i', 'ehAura'), img(URL_OF('horn-empty'), 'ehEmpty'), img(URL_OF('horn-light'), 'ehLight'), el('i', 'ehFill'), img(URL_OF('horn-ready'), 'ehReady'), el('i', 'ehSheen'));
    this.motes = el('span', 'ehMotes');
    this.words = el('b', 'ehWords');
    this.root.append(art, this.motes, this.words);
  }
  /** Show a fill (and whether an Eidolon can answer it). Only writes when something changed. */
  set(fill: number, ready: boolean, spent = false): void {
    const look = hornLook(fill);
    const key = `${look.share.toFixed(3)}|${ready}|${spent}`;
    if (key === this.last) return;
    this.last = key;
    this.root.style.setProperty('--fill', look.share.toFixed(3));
    this.root.style.setProperty('--glow', look.glow.toFixed(2));
    this.root.dataset.state = spent ? 'spent' : look.full ? (ready ? 'ready' : 'none') : 'filling';
    this.words.textContent = spent ? 'Blown' : hornWords(fill);
  }
  /** Motes of light stream in and swell where they land (a boss wave's gain is a rush, a foe's a single mote). */
  gain(amount: number): void {
    if (amount <= 0 || reducedNow()) return;
    const n = motesFor(amount, settings().saver);
    for (let i = 0; i < n; i++) {
      const m = el('i');
      const a = (i / n) * Math.PI * 2 + i * 0.7;
      const r = 26 + ((i * 37) % 22);
      m.style.setProperty('--dx', `${Math.round(Math.cos(a) * r)}px`);
      m.style.setProperty('--dy', `${Math.round(Math.sin(a) * r - 10)}px`);
      m.style.animationDelay = `${i * (amount >= 100 ? 45 : 90)}ms`;
      m.addEventListener('animationend', () => m.remove());
      this.motes.append(m);
    }
  }
}

interface Playing {
  e: Eidolon;
  m: MomentTimes;
  first: boolean;
  t: number;
  beats: number[];
  beatsDone: number;
  /** The foes the strike struck (their ids), read from its events. */
  struck: number[];
  /** Waiting for the strike's tick (the page steps one), and whether it has come. */
  releasing: boolean;
  struckDone: boolean;
  stopLeft: number;
  shot: Shot | '';
  /** A snap zoom on a blow: how long it has left, and where. */
  snapLeft: number;
  calls: number;
  /** EIDOLON-CALL-2: its pass across the screen and its attack's source. */
  spec: PassSpec;
  src: AttackSource;
  /** The ground line the pass runs along (a share of the screen's height: the foes' rows). */
  ground: number;
  /** The trail it leaves, each mark's time and its elements (laid down as it passes). */
  marks: { mark: Mark; at: number; els: HTMLElement[]; on: boolean }[];
  /** The point at the edge or in the sky it left by (client px). */
  exit: { x: number; y: number };
  fig: HTMLElement;
  shadow: HTMLElement;
  /** The wake's motes owed (fractions carried frame to frame). */
  wakeOwed: number;
  /** The source has flared and the runs are laid out. */
  built: boolean;
  /** The runs to come: from, to (client px), when they start, how long they take; and those drawn. */
  runs: { from: { x: number; y: number }; to: { x: number; y: number }; at: number; ms: number; el?: HTMLElement }[];
  /** The sprite that performs the attack on the board (none for an Eidolon no pack has), its element, and where it comes from and stands
   *  (client px, set as it comes on); when the build-up begins. */
  mon: EidolonSprite | null;
  monEl: HTMLElement | null;
  /** Its breath's flame (Askel's), drawn from its mouth across the foes. */
  breathEl: HTMLElement | null;
  /** Where its attack aims (the foes' middle, client px). */
  monAim: { x: number; y: number } | null;
  monFrom: { x: number; y: number } | null;
  monStand: { x: number; y: number } | null;
  buildT: number;
}

export class EidolonCall {
  /** The horn in the fight's spell orbs row (the page places it). */
  readonly horn = new HornView('ehFight', 'The War Horn');
  /** The horn at the camp, beside the stones. */
  readonly camp = new HornView('ehCamp', 'The War Horn');
  private layer: HTMLElement;
  private sheet: HTMLElement;
  private b: Battle | null = null;
  private p: Playing | null = null;
  private reduced = reducedNow();
  /** A sheet is up in a fight (the confirm): the page holds the fight. */
  sheetOpen = false;

  constructor(private opts: EidolonCallOpts) {
    this.layer = el('div', 'ecLayer');
    this.layer.hidden = true;
    this.layer.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = this.p;
      if (p && canSkip(p.t, p.first)) this.skip();
    });
    this.sheet = el('div', 'ehSheet');
    this.sheet.hidden = true;
    this.sheet.addEventListener('click', (e) => {
      if (e.target === this.sheet) this.closeSheet();
    });
    document.body.append(this.layer, this.sheet);
    this.horn.root.addEventListener('click', () => this.tapFight());
    this.camp.root.addEventListener('click', () => this.openCamp());
    // (HORN-GIFT: hidden from the start until the save holds the horn)
    this.refresh(null);
    if (typeof matchMedia === 'function') matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
  }

  /* ------------------------------------------------------------------ the fight */

  /** A fight begins: it may call the chosen Eidolon when the horn is full (`mid`: the wave's boss is a mid-boss). */
  arm(b: Battle, mid = false, trial = false): void {
    this.b = b;
    const m = this.opts.meta();
    const id = chosenOf(m);
    if (hornReady(m) && id) armEidolon(b, id, { mid, trial });
    this.refresh(b);
    // (the figure loaded before it is needed, so the cinematic never waits on it)
    if (id && hornReady(m)) new Image().src = figureUrl(id);
  }

  /** Each frame: the page's battle (a new wave's deploy shows the horn as the save holds it, not the last fight's blown one). */
  see(b: Battle): void {
    if (this.b === b) return;
    if (this.p) return;
    this.b = b;
    this.closeSheet();
    // (a fight already going, as a Last Stand carried on from its save: armed now)
    if (b.phase === 'fight' && !b.eidolon) {
      const id = chosenOf(this.opts.meta());
      if (id && hornReady(this.opts.meta())) armEidolon(b, id);
    }
    this.refresh(b);
  }

  /** The horn's look in the fight. */
  refresh(b: Battle | null = this.b): void {
    const m = this.opts.meta();
    const spent = !!b?.eidolon && b.eidolon.called !== undefined;
    this.horn.set(hornOf(m), hornReady(m), spent);
    this.horn.root.hidden = !hornHeld(m);
    this.refreshCamp();
  }

  /** The fight's horn tapped. */
  private tapFight(): void {
    const b = this.b;
    const m = this.opts.meta();
    if (!b || b.phase !== 'fight' || this.p) return;
    if (!hornReady(m) || !b.eidolon) {
      const words = !boundOf(m).length ? NO_EIDOLON : hornOf(m) < 1000 ? `The War Horn is ${hornWords(hornOf(m))}: boss waves and fallen foes fill it` : 'The horn was filled after this fight began: blow it in the next';
      this.note(words);
      return;
    }
    if (!canCallEidolon(b)) return;
    const e = eidolonById(b.eidolon.id)!;
    if (!m.eidolons?.confirmed) return this.confirm(e);
    this.blow(e);
  }

  /** A short note by the horn (it fades). */
  private note(words: string): void {
    this.horn.root.parentElement?.querySelector('.ehNote')?.remove();
    const n = el('div', 'ehNote', words);
    const r = this.horn.root.getBoundingClientRect();
    n.style.left = `${Math.max(8, Math.min(innerWidth - 248, r.left - 4))}px`;
    n.style.top = `${r.bottom + 6}px`;
    document.body.append(n);
    n.addEventListener('animationend', () => n.remove());
  }

  /** The first blow: a confirm, the fight held while it is up. */
  private confirm(e: Eidolon): void {
    this.sheetOpen = true;
    const box = el('div', 'ehBox');
    box.append(this.cardOf(e, true), el('p', 'ehAsk', 'Blow the War Horn? It empties, and the Eidolon strikes the whole field. Once a fight; Auto never blows it.'));
    const row = el('div', 'ehRow');
    const no = el('button', '', 'Not now');
    const yes = el('button', 'primary', 'Blow the horn');
    no.addEventListener('click', () => this.closeSheet());
    yes.addEventListener('click', () => {
      const m = this.opts.meta();
      (m.eidolons ??= { horn: 0 }).confirmed = true;
      this.closeSheet();
      this.blow(e);
    });
    row.append(no, yes);
    box.append(row);
    this.showSheet(box);
  }

  private showSheet(box: HTMLElement): void {
    this.sheet.replaceChildren(box);
    this.sheet.hidden = false;
  }

  closeSheet(): void {
    this.sheet.hidden = true;
    this.sheet.replaceChildren();
    this.sheetOpen = false;
  }

  /** An Eidolon's card: its painting, name, title, element and rider. */
  private cardOf(e: Eidolon, chosen: boolean): HTMLElement {
    const c = el('div', `ehCard el-${e.element}${chosen ? ' on' : ''}`);
    const words = el('div', 'ehCardWords');
    words.append(el('b', '', e.name), el('small', '', e.title), el('em', '', `${e.attack} · ${e.element}`), el('span', '', e.rider));
    c.append(img(cardUrl(e.id), 'ehCardArt'), words);
    return c;
  }

  /** Blow it: the sim takes the order, the save's horn empties at once (so quitting mid-fight cannot keep a full horn and a struck boss),
   *  and the cinematic begins, the fight held. */
  private blow(e: Eidolon): void {
    const b = this.b;
    const m = this.opts.meta();
    if (!b || !orderEidolon(b, e.id)) return;
    blowHorn(m);
    const first = !seenCall(m, e.id);
    noteSeen(m, e.id);
    this.opts.save();
    this.refresh(b);
    this.start(e, first);
  }

  /** Whether the page should hold the fight: a confirm is open, or the cinematic plays (except the one tick of the strike). */
  get holds(): boolean {
    return this.sheetOpen || (!!this.p && !this.p.releasing);
  }
  /** The cinematic is playing (the page waits for it before a fight's result). */
  get playing(): boolean {
    return !!this.p;
  }
  /** The strike's tick is due: the page steps the fight once. */
  get wantsTick(): boolean {
    return !!this.p?.releasing;
  }

  /** A tick's events: the strike has come (its struck foes noted, the fight held again); true when the fight is to be held. */
  noteEvents(b: Battle, events: readonly BattleEvent[]): boolean {
    const p = this.p;
    if (!p) return false;
    if (events.some((e) => e.kind === 'eidolon' && e.phase === 'call')) {
      p.struck = events.flatMap((e) => (e.kind === 'hit' && e.eidolon ? [e.to] : []));
      p.releasing = false;
      p.struckDone = true;
      this.refresh(b);
    }
    return this.holds;
  }

  /** The fight is over or left: the cinematic and the sheet go. */
  clear(): void {
    if (this.p) this.end();
    this.closeSheet();
    this.b = null;
  }

  /* ------------------------------------------------------------------ the cinematic */

  /** The board's layer (the trail, the runs, the walls, the aftermath): framed with the board's picture. */
  private board: HTMLElement = el('div', 'ecBoard');

  private start(e: Eidolon, first: boolean): void {
    const m = momentOf(first, settings().eidolonFull);
    const calls = this.opts.meta().eidolons?.calls ?? 0;
    const spec = PASS[e.id] ?? PASS.askel;
    const src = SOURCES[e.id] ?? SOURCES.askel;
    const look = LOOKS[e.element];
    const L = this.layer;
    L.replaceChildren();
    L.className = `ecLayer el-${e.element}${m.BARS ? ' full' : ' short'}${this.reduced ? ' still' : ''}${settings().saver ? ' saver' : ''}`;
    L.style.setProperty('--glow', look.glow);
    L.style.setProperty('--deep', look.deep);
    L.style.setProperty('--wash', look.wash);
    L.style.setProperty('--dim', String(m.DIM));
    L.hidden = false;
    const W = innerWidth;
    const H = innerHeight;
    // (the ground line it runs along: the foes' rows on the board, so its prints fall among them)
    const ground = this.foeGround();
    this.board = el('div', 'ecBoard');
    // (the trail, laid down as it passes: a pool of the element's light and the mark's strip at each)
    const marks = marksOf(spec, ground).map((mark) => {
      const x = mark.x * W;
      const y = mark.y * H;
      const pool = el('i', 'ecPool');
      pool.style.left = `${Math.round(x)}px`;
      pool.style.top = `${Math.round(y)}px`;
      const sp = strip(src.mark, 'ecMark', x, y, { loop: true, foot: src.mark !== 'ring' && src.mark !== 'smoke', scale: spec.gait === 'swoop' ? 2.2 : 1.3 });
      this.board.append(pool, sp);
      return { mark, at: markTime(m, mark), els: [pool, sp], on: false };
    });
    const ex = exitPoint(spec, ground);
    const exit = { x: ex.x * W, y: ex.y * H };
    if (src.from !== 'trail') {
      const gate = el('i', 'ecGate');
      gate.style.left = `${Math.round(exit.x)}px`;
      gate.style.top = `${Math.round(exit.y)}px`;
      this.board.append(gate);
    }
    // (the figure, its feet placed each frame; a soft shadow on the ground under it)
    const fig = el('div', `ecFig${spec.flip ? ' flip' : ''}`);
    fig.style.height = fig.style.width = `${Math.round(spec.size * H)}px`;
    fig.style.visibility = 'hidden';
    fig.append(img(figureUrl(e.id), ''));
    const shadow = el('i', 'ecShadow');
    shadow.style.visibility = 'hidden';
    const dim = el('i', 'ecDim');
    const wash = el('i', 'ecWash');
    const bars = el('div', 'ecBars');
    bars.append(el('i', 'top'), el('i', 'bot'));
    const name = el('div', 'ecName');
    name.append(el('small', '', e.title.replace(/^the /, 'The ')), el('b', '', e.name), el('em', '', e.attack));
    // (its line as it passes, beside its face: its first words the first time)
    const say = el('div', 'ecSay');
    const face = img(cardUrl(e.id), '');
    const [fx, fy] = EYES[e.id] ?? [0.5, 0.4];
    face.style.objectPosition = `${fx * 100}% ${fy * 100}%`;
    const said = el('p');
    said.append(el('b', '', e.name), document.createTextNode(`“${lineOf(e, first, calls)}”`));
    say.append(face, said);
    const hornBlast = el('div', 'ecHorn');
    hornBlast.append(el('i', 'ecCone'), img(URL_OF('horn-blast'), 'ecHornArt'), el('i', 'ecRing'));
    const flash = el('i', 'ecFlash');
    const skip = el('small', 'ecSkip', first ? '' : 'Tap to skip');
    L.append(dim, wash, this.board, shadow, fig, hornBlast, bars, name, say, flash, skip);
    this.p = {
      e, m, first, t: 0, beats: beatTimes(m, CHOREO[e.id]?.length ?? 3), beatsDone: 0, struck: [], releasing: false, struckDone: false, stopLeft: 0, shot: '', snapLeft: 0, calls,
      spec, src, ground, marks, exit, fig, shadow, wakeOwed: 0, built: false, runs: [],
      mon: null, monEl: null, breathEl: null, monAim: null, monFrom: null, monStand: null, buildT: m.SPRITE,
    };
    // (the owner's addition: the sprite that comes onto the board and performs the attack, when a pack has one)
    const mon = MONS[e.id] ?? null;
    if (mon) {
      const k = mon.px / mon.fh;
      const d = el('i', 'ecMon');
      d.style.width = `${Math.round(mon.fw * k)}px`;
      d.style.height = `${Math.round(mon.px)}px`;
      d.style.backgroundImage = `url(${MON_SHEETS[mon.sheet]})`;
      d.style.backgroundSize = `${Math.round(mon.perRow * mon.fw * k)}px ${Math.round(mon.rows * mon.px)}px`;
      d.style.filter = mon.glow;
      d.style.visibility = 'hidden';
      this.board.append(d);
      let breathEl: HTMLElement | null = null;
      if (mon.breath) {
        breathEl = el('i', 'ecBreath');
        breathEl.style.backgroundImage = `url(${MON_BREATHS[mon.sheet] ?? askelBreath})`;
        breathEl.style.visibility = 'hidden';
        this.board.append(breathEl);
      }
      Object.assign(this.p, { mon, monEl: d, breathEl, buildT: buildAt(m, true) });
    }
    duck(true, 'eidolon');
    if (m.HORN < m.PASS) play('horn');
    play('riseSummon');
  }

  /** The board's middle on the page. */
  private boardMid(): { x: number; y: number } {
    const b = this.b;
    const p = b ? this.opts.tile(Math.floor(b.board.w / 2), Math.floor(b.board.d * 0.4)) : null;
    return p ?? { x: innerWidth / 2, y: innerHeight * 0.42 };
  }

  /** The foes' middle on the page (client px): where the strike's great burst lands. */
  private foeMid(ids?: readonly number[]): { x: number; y: number } {
    const b = this.b;
    const foes = (b?.units ?? []).filter((u) => (ids ? ids.includes(u.id) : u.side === 'foe' && u.alive));
    const pts = foes.map((u) => this.opts.tile(u.u, u.v)).filter((x): x is { x: number; y: number } => !!x);
    if (!pts.length) return this.boardMid();
    return { x: pts.reduce((a, c) => a + c.x, 0) / pts.length, y: pts.reduce((a, c) => a + c.y, 0) / pts.length };
  }

  /** The foes' rows on the page, as a share of its height (where the pass runs). */
  private foeGround(): number {
    const b = this.b;
    const foes = b?.units.filter((u) => u.side === 'foe' && u.alive) ?? [];
    let y: number | undefined;
    if (b && foes.length) {
      const ys = foes.map((u) => this.opts.tile(u.u, u.v)?.y).filter((v): v is number => v !== undefined);
      if (ys.length) y = ys.reduce((a, c) => a + c, 0) / ys.length;
    }
    if (y === undefined && b) y = this.opts.tile(Math.floor(b.board.w / 2), Math.floor(b.board.d * 0.25))?.y;
    // (a little in front of them, towards the heroes, so what it leaves runs up the board to them)
    return Math.max(0.26, Math.min(0.62, (y ?? innerHeight * 0.36) / innerHeight + 0.07));
  }

  /** Each frame: move the cinematic on by `dt` real ms (unless `paused`: a scene holds everything). */
  frame(dt: number, paused = false): void {
    const p = this.p;
    if (!p || paused) return;
    let step = Math.min(dt, 120);
    // (the freeze on the first blow: everything of the cinematic stands still)
    if (p.stopLeft > 0) {
      p.stopLeft -= step;
      this.layer.classList.toggle('stop', p.stopLeft > 0);
      return;
    }
    // (the strike's tick has not come yet: wait for it on the first beat, so the blow and the falls land together)
    const firstBeat = p.beats[0];
    if (!p.struckDone && p.t + step >= firstBeat) {
      step = Math.max(0, firstBeat - p.t);
      if (!p.releasing && p.t + step >= firstBeat) p.releasing = true;
    }
    const was = p.t;
    p.t += step;
    const shot = shotAt(p.m, p.t);
    if (shot !== p.shot) {
      p.shot = shot;
      this.layer.dataset.stage = shot;
      if (shot === 'pass') play(p.src.passSound);
      if (shot === 'sprite' && p.mon) play(p.mon.comes === 'fly' ? 'windGust' : 'dash');
      this.frameBoard(BOARD_ZOOM[shot], null, shot === 'build' ? Math.max(200, p.m.STRIKE - p.m.BUILD) : 400);
    }
    this.pass(p, was, step);
    this.sprite(p);
    if (!p.built && p.t >= p.buildT) this.build(p);
    // (the runs due start now)
    for (const r of p.runs) if (!r.el && p.t >= r.at) r.el = this.run(p, r.from, r.to, r.ms);
    // (the snap zoom on a blow eases back to the wide shot)
    if (p.snapLeft > 0) {
      p.snapLeft -= step;
      if (p.snapLeft <= 0) this.frameBoard(BOARD_ZOOM[p.shot as Shot], null, 260);
    }
    while (p.beatsDone < p.beats.length && p.t >= p.beats[p.beatsDone] && (p.beatsDone > 0 || p.struckDone)) this.beat(p, p.beatsDone++);
    if (p.t >= p.m.RESUME) this.end();
  }

  /** The pass: the figure placed on its path (feet at its point, leaning, facing its way), its shadow under it, the trail's marks laid down
   *  as it reaches them, the wake falling behind. Reduced motion: it fades in where it would be mid-way and out again, held still. */
  private pass(p: Playing, was: number, step: number): void {
    const { m, spec } = p;
    const W = innerWidth;
    const H = innerHeight;
    const on = p.t >= m.PASS && p.t < m.EXIT;
    const u = this.reduced ? 0.5 : passShare(m, p.t);
    const pose = passPose(spec, u, p.ground);
    const size = spec.size * H;
    p.fig.style.visibility = p.shadow.style.visibility = on ? 'visible' : 'hidden';
    if (on) {
      p.fig.style.transform = `translate(${Math.round(pose.x * W - size / 2)}px, ${Math.round(pose.y * H - size)}px) rotate(${pose.rot.toFixed(1)}deg)`;
      if (this.reduced) {
        const k = passShare(m, p.t);
        p.fig.style.opacity = String(Math.min(1, k * 5, (1 - k) * 5));
      }
      const gy = spec.gait === 'swoop' || spec.gait === 'float' ? (p.ground + 0.03) * H : pose.y * H;
      // (the shadow shrinks as a leap lifts it off the ground)
      const lift = Math.max(0, Math.min(1, (gy - pose.y * H) / (H * 0.25)));
      p.shadow.style.transform = `translate(${Math.round(pose.x * W)}px, ${Math.round(gy)}px) scale(${(1 - lift * 0.5).toFixed(2)})`;
      p.shadow.style.opacity = String(1 - lift * 0.6);
      // (the wake: a mote of its element every so often, falling behind its feet)
      p.wakeOwed += (wakeRate(settings().saver, this.reduced) * step) / 1000;
      const dir = spec.path[spec.path.length - 1][0] >= spec.path[0][0] ? 1 : -1;
      while (p.wakeOwed >= 1) {
        p.wakeOwed -= 1;
        const fx = pose.x * W - dir * size * (0.15 + ((p.t * 7) % 13) / 60);
        const fy = (spec.gait === 'float' || spec.gait === 'swoop' ? pose.y * H - size * 0.35 : pose.y * H - size * 0.12) + (((p.t * 13) % 17) - 8);
        if (fx < -20 || fx > W + 20) continue;
        const w = strip(p.src.wake, 'ecWake', fx, fy, { scale: 1.2 + ((p.t * 3) % 7) / 10 });
        w.style.setProperty('--dx', `${-dir * 14}px`);
        w.style.setProperty('--dy', `${p.src.wake === 'smoke' || p.src.wake === 'sand' ? -10 : -30}px`);
        w.addEventListener('animationend', (ev) => ev.animationName === 'ecWake' && w.remove());
        this.board.append(w);
      }
    }
    // (the marks it has reached: laid down, with a footfall's sound and, for the titan, a thud)
    for (const k of p.marks) {
      if (k.on || p.t < k.at) continue;
      k.on = true;
      for (const x of k.els) x.classList.add('on');
      if (was < k.at && k.at <= p.t && p.t < p.m.EXIT) {
        if (p.src.stepSound) play(p.src.stepSound);
        if (spec.gait === 'stomp' && !this.reduced && settings().shake) this.opts.fx?.rumble(0.22);
      }
    }
  }

  /** The sprite on the board: it comes on from the side the painting left by, stands before the foes, attacks (its blow on the strike) and
   *  goes back the way it came. Placed by the clock, so a skip finds it where it should be. */
  private sprite(p: Playing): void {
    const sp = p.mon;
    const d = p.monEl;
    if (!sp || !d) return;
    const f = spriteFrame(sp, p.m, p.t);
    if (!f) {
      d.style.visibility = 'hidden';
      return;
    }
    if (!p.monStand) this.placeMon(p, sp);
    const at = spritePlace(p.m, p.t, p.monFrom!, p.monStand!);
    const k = sp.px / sp.fh;
    const w = sp.fw * k;
    const flip = this.monFlip(p, sp);
    d.style.visibility = 'visible';
    d.style.opacity = at.alpha.toFixed(2);
    d.style.backgroundPosition = `${-Math.round(f.i * w)}px ${-Math.round(f.row * sp.px)}px`;
    d.style.transform = `translate(${Math.round(at.x - w / 2)}px, ${Math.round(at.y - sp.px)}px)${flip ? ' scaleX(-1)' : ''}`;
    // (its breath: the flame's own strip, from its mouth out across the foes, reaching them as the strike lands)
    const br = p.breathEl;
    if (br && sp.breath) {
      const reach = breathReach(sp, p.m, p.t);
      const mouth = this.monMouth(p);
      const aim = p.monAim;
      if (!reach || !mouth || !aim) {
        br.style.visibility = 'hidden';
        return;
      }
      // (EIDOLON-FX: out the way it faces, tilted at most a little towards the foes' height: a sprite held inside the screen can stand
      // close to the foes' middle, and its breath must still pour across them, never back over itself)
      const face = p.monStand && aim.x < p.monStand.x ? -1 : 1;
      const dx = face * Math.max(Math.abs(aim.x - mouth.x), innerWidth * 0.35);
      const dy = Math.max(-0.3 * Math.abs(dx), Math.min(0.3 * Math.abs(dx), aim.y - mouth.y));
      // (long enough to sweep across the foes: past their middle, at least half the screen)
      const len = Math.max(innerWidth * 0.55, Math.hypot(dx, dy) * 1.6);
      const k = sp.px / sp.fh;
      const h = sp.breath.fh * k * (0.55 + 0.35 * reach);
      const i = Math.floor(p.t / 90) % sp.breath.n;
      const w = len * reach;
      br.style.visibility = 'visible';
      br.style.width = `${Math.round(w)}px`;
      br.style.height = `${Math.round(h)}px`;
      br.style.backgroundSize = `${Math.round(w * sp.breath.n)}px ${Math.round(h)}px`;
      br.style.backgroundPosition = `${-Math.round(i * w)}px 0`;
      br.style.opacity = p.t >= p.m.AFTER ? reach.toFixed(2) : '1';
      // (pointing left it is mirrored, not turned upside down)
      br.style.transform = `translate(${Math.round(mouth.x)}px, ${Math.round(mouth.y - h / 2)}px) rotate(${Math.atan2(dy, dx).toFixed(3)}rad)${dx < 0 ? ' scaleY(-1)' : ''}`;
    }
  }

  /** Which way the sprite faces: the way it is going as it comes on and leaves, at the foes as it attacks. */
  private monFlip(p: Playing, sp: EidolonSprite): boolean {
    if (!p.monStand || !p.monFrom) return false;
    const attacking = p.t >= p.m.BUILD && p.t < p.m.AFTER;
    const right = attacking && p.monAim ? p.monAim.x >= p.monStand.x : p.t >= p.m.AFTER ? p.monFrom.x >= p.monStand.x : p.monStand.x >= p.monFrom.x;
    return right !== sp.facesRight;
  }

  /** Where the sprite comes from (the edge the painting left by, along the ground, or down from the sky for a flier) and where it stands
   *  (just in front of the foes, towards the heroes, held inside the screen). */
  private placeMon(p: Playing, sp: EidolonSprite): void {
    const W = innerWidth;
    const H = innerHeight;
    const b = this.b;
    const pts = (b?.units.filter((u) => u.side === 'foe' && u.alive) ?? []).map((u) => this.opts.tile(u.u, u.v)).filter((x): x is { x: number; y: number } => !!x);
    const mid = pts.length ? { x: pts.reduce((a, c) => a + c.x, 0) / pts.length, y: pts.reduce((a, c) => a + c.y, 0) / pts.length } : this.boardMid();
    const left = p.exit.x < W / 2;
    // (it stands, or a flier hangs, to the side of the foes it came from, so it breathes or strikes across them (EIDOLON-FX: the fliers'
    // own sheets are side-on too, so they no longer hang in front))
    const sx = mid.x + (left ? -1 : 1) * W * 0.3;
    const stand = { x: Math.max(W * 0.2, Math.min(W * 0.8, sx)), y: Math.min(H * 0.7, mid.y + H * (sp.comes === 'run' ? 0.07 : 0.03)) };
    p.monAim = mid;
    const half = (sp.fw * sp.px) / sp.fh / 2;
    const from = sp.comes === 'fly' ? { x: left ? W * 0.15 : W * 0.85, y: -20 } : { x: left ? -half - 10 : W + half + 10, y: stand.y };
    p.monStand = stand;
    p.monFrom = from;
  }

  /** The sprite's mouth or fists, where its element leaves it (client px), once it stands. */
  private monMouth(p: Playing): { x: number; y: number } | null {
    const sp = p.mon;
    if (!sp || !p.monStand || !p.monFrom) return null;
    const w = (sp.fw * sp.px) / sp.fh;
    const flip = (p.monAim ? p.monAim.x >= p.monStand.x : p.monStand.x >= p.monFrom.x) !== sp.facesRight;
    const mx = flip ? 1 - sp.mouth[0] : sp.mouth[0];
    return { x: p.monStand.x - w / 2 + mx * w, y: p.monStand.y - sp.px + sp.mouth[1] * sp.px };
  }

  /** The figure has gone: the source flares (the trail's marks, the sky or the edge it left by), and the element is sent from there to each
   *  foe standing, arriving as the strike lands. Lightning first leaps from spark to spark along the trail. */
  private build(p: Playing): void {
    p.built = true;
    const b = this.b;
    play(p.src.buildSound);
    for (const k of p.marks) for (const x of k.els) x.classList.add('on', 'lit');
    this.board.querySelector('.ecGate')?.classList.add('on');
    // (the marks flare into the element's own fire, frost, light, sparks, stone or smoke)
    for (const k of p.marks) this.board.append(strip(p.src.flare, 'ecFlare', k.mark.x * innerWidth, k.mark.y * innerHeight, { scale: 1.4, foot: p.src.flare === 'flame', ms: 450 }));
    if (!b) return;
    const left = Math.max(120, p.m.STRIKE - p.t - 30);
    // (EIDOLON-FX: the charge: the element gathers into a ring closing on the foes' middle, arriving as the strike lands)
    const mid = this.foeMid();
    const kind = STRIKE_FX[p.e.id]?.sig.charge ?? 'ring';
    const charge = el('i', `ecCharge ${kind}`);
    if (kind === 'none') charge.style.display = 'none';
    charge.style.left = `${Math.round(mid.x)}px`;
    charge.style.top = `${Math.round(mid.y)}px`;
    charge.style.setProperty('--ms', `${Math.round(left)}ms`);
    this.board.append(charge);
    if (p.mon?.fromSprite) {
      if (!p.monStand) this.placeMon(p, p.mon);
      const mouth = this.monMouth(p);
      if (mouth) this.board.append(strip(p.src.flare, 'ecFlare', mouth.x, mouth.y, { scale: 1.6, ms: 450 }));
    }
    const aspect = innerWidth / innerHeight;
    let at = p.t;
    let ms = left;
    if (p.src.run === 'arc' && p.marks.length > 1) {
      // (lightning leaps along the hanging sparks first, then down onto the foes)
      const hop = Math.round(left * 0.4 / (p.marks.length - 1));
      p.marks.slice(1).forEach((k, i) => {
        const a = p.marks[i].mark;
        p.runs.push({ from: { x: a.x * innerWidth, y: a.y * innerHeight }, to: { x: k.mark.x * innerWidth, y: k.mark.y * innerHeight }, at: p.t + i * hop, ms: hop + 60 });
      });
      at = p.t + left * 0.4;
      ms = left * 0.6;
    }
    const foes = b.units.filter((u) => u.side === 'foe' && u.alive).slice(0, maxRuns(settings().saver));
    if (p.mon && !p.monStand) this.placeMon(p, p.mon);
    const mouth = p.mon?.fromSprite ? this.monMouth(p) : null;
    for (const f of foes) {
      const to = this.opts.tile(f.u, f.v);
      if (!to) continue;
      // (the owner's addition: the sprite breathes or strikes it out itself)
      if (mouth) {
        // (a breath's fire races out with its flame, from the moment it opens its jaws)
        const from = p.mon ? Math.max(at, hitAt(p.mon, p.m)) : at;
        p.runs.push({ from: mouth, to, at: from, ms: Math.max(120, p.m.STRIKE - from - 30) });
        continue;
      }
      const share = runFrom(p.src, p.marks.map((k) => k.mark), { x: p.exit.x / innerWidth, y: p.exit.y / innerHeight }, { x: to.x / innerWidth, y: to.y / innerHeight }, aspect);
      p.runs.push({ from: { x: share.x * innerWidth, y: share.y * innerHeight }, to, at, ms });
    }
  }

  /** One run: a streak drawn out from `from` to `to` behind a racing head of the element. */
  private run(p: Playing, from: { x: number; y: number }, to: { x: number; y: number }, ms: number): HTMLElement {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.max(4, Math.hypot(dx, dy));
    const r = el('div', `ecRun run-${p.src.run} go`);
    r.style.left = `${Math.round(from.x)}px`;
    r.style.top = `${Math.round(from.y)}px`;
    r.style.rotate = `${Math.atan2(dy, dx)}rad`;
    r.style.setProperty('--len', `${Math.round(len)}px`);
    r.style.setProperty('--ms', `${Math.round(ms)}ms`);
    const head = el('i', 'ecHead');
    head.append(strip(p.src.head, '', 0, 0, { loop: true }));
    r.append(el('i', 'ecStreak'), head);
    this.board.append(r);
    return r;
  }

  /** One beat of the attack: its bursts across the board, a flash, its sound; the first (the strike) with the hit-stop and the full shake,
   *  the element rising over each foe struck where its run arrived, and the aftermath left on their ground. */
  private beat(p: Playing, i: number): void {
    const b = this.b;
    const fx = this.opts.fx;
    const look = LOOKS[p.e.element];
    const saver = settings().saver;
    const plan = CHOREO[p.e.id]?.[i] ?? 'foes';
    if (b && fx) {
      let spots: ({ unit: number } | { u: number; v: number })[] =
        plan === 'foes' ? p.struck.map((unit) => ({ unit })) : plan.map(([x, y]) => ({ u: Math.round(x * (b.board.w - 1)), v: Math.round(y * (b.board.d - 1)) }));
      if (!spots.length) spots = [{ u: Math.floor(b.board.w / 2), v: Math.floor(b.board.d * 0.3) }];
      fx.ultImpact(b, p.e.element, spots.slice(0, saver ? 2 : 5));
      if (i === 0) {
        fx.hitStop(p.m.HIT_STOP);
        fx.rumble(this.reduced || !settings().shake ? 0 : p.m.SHAKE * (STRIKE_FX[p.e.id]?.sig.shake.amp ?? 1));
      }
    }
    if (i === 0) this.landed(p);
    if (i === 0 && !this.reduced && settings().shake) p.stopLeft = p.m.HIT_STOP;
    // (a snap zoom on the first blow, on the foes struck)
    const at = i === 0 && b && p.struck.length ? this.opts.anchor(p.struck[0]) : null;
    if (i === 0) {
      this.frameBoard(SNAP_ZOOM, at ?? null, SNAP_MS);
      p.snapLeft = SNAP_MS + 60;
    }
    play(look.sound);
    if (i === 0) play('ultImpact');
    const f = this.layer.querySelector('.ecFlash');
    if (f) {
      const g = f.cloneNode() as HTMLElement;
      // (EIDOLON-FX: the blow's flash is a hard white one; the aftershocks' the soft one of the element)
      g.classList.toggle('big', i === 0);
      // (each Eidolon's own flash: none at all for Gorm, Nivra and Vaelkhar, a gold or copper-blue one for the rest)
      const sg = STRIKE_FX[p.e.id]?.sig;
      if (sg) {
        if (sg.flash <= 0) g.style.display = 'none';
        g.style.setProperty('--flashA', String(sg.flash));
        if (sg.flashTint) g.style.setProperty('--flashC', sg.flashTint);
      }
      f.replaceWith(g);
    }
  }

  /** The strike lands: the runs end, the element rises over each foe struck (a wall of fire, spears of ice, a pillar of light...), and the
   *  ground is left scorched, frosted or broken, with embers, steam, sparks, dust or smoke drifting up off it. */
  private landed(p: Playing): void {
    const b = this.b;
    for (const r of p.runs) r.el?.classList.add('done');
    this.board.querySelector('.ecGate')?.classList.remove('on');
    for (const k of p.marks) for (const x of k.els) x.classList.remove('on', 'lit');
    if (!b) return;
    const saver = settings().saver;
    const ids = p.struck.length ? p.struck : b.units.filter((u) => u.side === 'foe').map((u) => u.id);
    const spots = ids.map((id) => b.units.find((u) => u.id === id)).flatMap((u) => (u ? [this.opts.tile(u.u, u.v)] : [])).filter((x): x is { x: number; y: number } => !!x).slice(0, maxRuns(saver));
    this.strikeFx(p, spots);
    spots.forEach((s, n) => {
      const scar = el('i', `ecAfter after-${p.src.after}`);
      scar.style.left = `${Math.round(s.x)}px`;
      scar.style.top = `${Math.round(s.y)}px`;
      this.board.prepend(scar);
      const drifts = saver ? 1 : 3;
      for (let k = 0; k < drifts; k++) {
        const d = el('i', 'ecDrift');
        d.style.left = `${Math.round(s.x + (k - 1) * 14)}px`;
        d.style.top = `${Math.round(s.y - 6)}px`;
        d.style.setProperty('--dx', `${(k - 1) * 10}px`);
        d.style.setProperty('--delay', `${300 + k * 260 + n * 40}ms`);
        d.style.setProperty('--ms', `${1500 + k * 200}ms`);
        d.append(strip(p.src.drift, '', 0, 0, { loop: true, scale: 1.3 }));
        this.board.append(d);
      }
    });
  }

  /** EIDOLON-FX: the blow, laid out at once and rolling on by the strips' own delays (`eidolonFx.ts`): the bloom, the shockwave ring and
   *  the huge burst on the foes' middle, the Eidolon's pillar over each foe a beat after the last (with a shaft out of the sky for the
   *  light and the bolt), debris flung out of each, the aftershocks' bursts across the foes' half, the board shaken as the freeze lets go,
   *  and what lingers on their ground from the aftermath on. */
  private strikeFx(p: Playing, spots: readonly { x: number; y: number }[]): void {
    const look: StrikeLook = STRIKE_FX[p.e.id] ?? STRIKE_FX.askel;
    const sig = look.sig;
    const saver = settings().saver;
    const budget = fxBudget(saver, this.reduced);
    const W = innerWidth;
    const H = innerHeight;
    const mid = this.foeMid(p.struck.length ? p.struck : undefined);
    const mouth = p.mon?.fromSprite ? this.monMouth(p) : null;
    // (the short call's aftershocks and aftermath come sooner)
    const span = p.m.AFTER - p.m.STRIKE;
    const k = span / (STRIKE_FX_SPAN);
    const L = this.board;
    const put = <T extends HTMLElement>(d: T, x: number, y: number, w?: number, h?: number): T => {
      d.style.left = `${Math.round(x)}px`;
      d.style.top = `${Math.round(y)}px`;
      if (w) d.style.width = `${Math.round(w)}px`;
      if (h) d.style.height = `${Math.round(h)}px`;
      return d;
    };
    const timed = <T extends HTMLElement>(d: T, delay: number, ms?: number): T => {
      d.style.animationDelay = `${Math.round(delay * k)}ms`;
      if (ms) d.style.animationDuration = `${Math.round(ms)}ms`;
      return d;
    };
    const solid = sig.solid ? ' solid' : '';
    // (the bloom of the element's light: stronger or softer, or none at all, by Eidolon)
    if (sig.bloom > 0) {
      const bloom = put(el('i', 'ecBloom'), mid.x, mid.y);
      bloom.style.setProperty('--bloom', look.bloom);
      bloom.style.setProperty('--bloomA', String(sig.bloom));
      if (sig.bloomSoft) bloom.style.animationDuration = '1500ms';
      L.append(bloom);
    }
    // (the shockwave ring along the ground, as wide as the screen)
    if (sig.shock > 0) {
      const ringW = Math.round(W * 1.1);
      const ring = put(el('i', 'ecFx ecRingFx'), mid.x, mid.y, ringW, (ringW * RING.fh) / RING.fw);
      ring.style.setProperty('--ry', `${-((RING.mid / RING.fh) * 100).toFixed(1)}%`);
      ring.style.backgroundImage = `url(${FX_URL(RING.sheet)})`;
      ring.style.backgroundSize = `${RING.n * 100}% 100%`;
      ring.style.setProperty('--hold', `${(RING.hold / (RING.n - 1)) * 100}%`);
      ring.style.setProperty('--life', `${RING.ms + 300}ms`);
      ring.style.filter = look.ring;
      ring.style.opacity = String(sig.shock);
      ring.style.animation = `ecFxPlay ${RING.ms}ms steps(${RING.n}, jump-none) -60ms both, ecFxEnd 300ms ease-in ${RING.ms - 200}ms forwards`;
      L.append(ring);
    }
    // (the Eidolon's own extra layers: each is one-shot, and held still with reduced motion)
    this.signature(p, look, mid, mouth, spots, { W, H, k, put, timed, saver });
    // (the one huge burst on their middle: already blazing in the frozen frame, or late, where the blow is something else coming first)
    L.append(fxEl(look.burst, mid.x, mid.y - 18, { delay: sig.burstAt * k, cls: `ecBurst${solid}` }));
    // (the pillar over each foe, rolling across them in the Eidolon's own order and rhythm; a shaft out of the sky onto each for the light)
    const foes = spots.map((s) => ({ x: s.x, y: s.y }));
    const rank = pillarOrder(sig.order, foes, mid, mouth);
    rank.forEach((fi, n) => {
      const s = foes[fi];
      const delay = n * sig.stagger * Math.min(1, k + 0.3) - (sig.stagger < 100 && n === 0 ? 40 : 0);
      if (look.sky === 'beam') {
        const sh = el('i', 'ecShaft beam');
        put(sh, s.x, s.y + 4, undefined, s.y + 40);
        sh.style.animationDelay = `${Math.round(delay)}ms`;
        L.append(sh);
      }
      L.append(fxEl(look.pillar, s.x, s.y + 6, { delay, cls: `ecPillar${solid}`, mul: 1 - Math.min(0.25, n * 0.02) }));
      for (let c = 0; c < budget.debris; c++) {
        const chip = put(el('i', 'ecChip'), s.x, s.y - 20);
        const side = c % 2 ? 1 : -1;
        chip.style.setProperty('--dx', `${side * (36 + ((c * 37 + n * 23) % 70))}px`);
        chip.style.setProperty('--up', `${-(70 + ((c * 53 + n * 19) % 80))}px`);
        chip.style.setProperty('--dn', `${10 + ((c * 29) % 24)}px`);
        chip.style.animationDelay = `${Math.round(Math.max(0, delay) + 40 + c * 25)}ms`;
        chip.append(strip(look.debris, '', 0, 0, { loop: true, scale: 1.4 + (c % 3) * 0.3 }));
        L.append(chip);
      }
    });
    // (the aftershocks, by the Eidolon's own spread)
    const fault = p.e.id === 'gorm' ? faultLine(mid, W, (mouth?.x ?? 0) < W / 2 ? 'left' : 'right') : undefined;
    for (const e of spreadShocks(sig.spread, budget.extras + (sig.spread === 'wave' ? 2 : 0), mid, W, H, sig, mouth, fault)) {
      L.append(fxEl(look.extra, e.x, e.y, { delay: e.delay * k, cls: `ecExtra${solid}`, mul: e.mul }));
    }
    // (what lingers on their ground, from the aftermath on)
    spots.slice(0, budget.linger).forEach((s, n) => {
      const w = put(el('i', 'ecLinger'), s.x, s.y + 6);
      w.style.animationDelay = `${Math.round(span * 0.75 + n * 40)}ms`;
      w.append(fxEl(look.after, 0, 0, { delay: -n * 90 }));
      L.prepend(w);
    });
    // (the board shaken as the freeze lets go: the cinematic's layer with the board's picture, which the fight's own shake moves; Gorm's
    // is deep and long, Nivra's light)
    if (!this.reduced && settings().shake) {
      L.style.setProperty('--shk', String(sig.shake.amp));
      L.style.setProperty('--shkMs', `${sig.shake.ms}ms`);
      L.classList.remove('shake');
      void L.offsetWidth;
      L.classList.add('shake');
    }
  }

  /** EIDOLON-FX, each one's own layers (`docs/notes/eidolon-fx.md`, "each one's signature"): Askel's wave of fire along the rows and the
   *  firestorm column; Nivra's frost creeping tile by tile and the mist; Aurelan's dome and rays; Voltara's chain arc; Gorm's fault line,
   *  falling boulders and dust; Vaelkhar's dimmed screen and the maw that swallows the foes' half. */
  private signature(
    _p: Playing,
    look: StrikeLook,
    mid: { x: number; y: number },
    mouth: { x: number; y: number } | null,
    spots: readonly { x: number; y: number }[],
    c: { W: number; H: number; k: number; put: <T extends HTMLElement>(d: T, x: number, y: number, w?: number, h?: number) => T; timed: <T extends HTMLElement>(d: T, delay: number, ms?: number) => T; saver: boolean },
  ): void {
    const L = this.board;
    const { W, H, k, put, timed, saver } = c;
    const sig = look.sig;
    switch (sig.special) {
      case 'wave': {
        // the firestorm column, rising on their middle after the wave has passed, then the smoulder (the aftermath)
        L.append(fxEl({ ...look.pillar, scale: 3.6, ms: 1300 }, mid.x, mid.y + 24, { delay: 520 * k, cls: 'ecPillar ecStorm' }));
        const fromRight = (mouth?.x ?? 0) >= W / 2;
        for (let i = 0; i < (saver ? 4 : 7); i++) {
          const t = i / (saver ? 3 : 6);
          const x = W * (fromRight ? 0.95 - 0.9 * t : 0.05 + 0.9 * t);
          L.append(fxEl({ ...look.pillar, scale: 1.25, ms: 900 }, x, mid.y + 14 + (i % 2) * 12, { delay: (30 + i * 55) * k, cls: 'ecPillar ecWaveFlame' }));
        }
        break;
      }
      case 'frost': {
        // frost spreading over the ground tile by tile from the foes' middle outward, the mist rising off it
        const cells = saver ? 6 : 14;
        for (let i = 0; i < cells; i++) {
          const ring = 1 + Math.floor(i / 5);
          const a = i * 2.39996;
          const hold = put(el('i', 'ecFrostHold'), mid.x + Math.cos(a) * W * 0.11 * ring, mid.y + 12 + Math.sin(a) * H * 0.045 * ring);
          timed(hold, 40 + i * 42, 1500 + (sig.burstAt - 40 - i * 42));
          hold.append(fxEl({ ...look.after, ms: 620 }, 0, 0, { delay: -i * 70 }));
          L.prepend(hold);
        }
        for (let i = 0; i < (saver ? 2 : 5); i++) {
          const mist = put(el('i', 'ecMist'), mid.x + (i - 2) * W * 0.2, mid.y + 20 - (i % 2) * H * 0.04, W * 0.55, W * 0.28);
          timed(mist, 500 + i * 160, 2600);
          L.append(mist);
        }
        break;
      }
      case 'dome': {
        // a single dome of radiant light swelling over their half, its rays turning, once the lances have fallen
        const rays = put(el('i', 'ecRays'), mid.x, mid.y, W * 1.6, W * 1.6);
        timed(rays, sig.burstAt - 60);
        L.append(rays);
        const dome = put(el('i', 'ecDome'), mid.x, mid.y + 10, W * 1.25, W * 0.7);
        timed(dome, sig.burstAt - 60);
        L.append(dome);
        break;
      }
      case 'arc': {
        // the chain arc leaping foe to foe from the sky, jagged, drawn in quick steps, each hop flickering once
        const foes = spots.map((s) => ({ x: s.x, y: s.y }));
        const rank = pillarOrder('chain', foes, mid, mouth);
        const path: { x: number; y: number }[] = [{ x: foes[rank[0]]?.x ?? mid.x, y: -10 }, ...rank.map((i) => foes[i])];
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'ecArc');
        svg.setAttribute('width', String(W));
        svg.setAttribute('height', String(H));
        for (let i = 1; i < path.length; i++) {
          const pts = jagged(path[i - 1], { x: path[i].x, y: path[i].y - 18 }, i === 1 ? 7 : 4, i === 1 ? 26 : 18, i);
          const d = pts.map((q, j) => `${j ? 'L' : 'M'}${Math.round(q.x)} ${Math.round(q.y)}`).join('');
          for (const [cls, w] of [['glow', 9], ['core', 3]] as const) {
            const pa = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pa.setAttribute('d', d);
            pa.setAttribute('class', `arc-${cls}`);
            pa.setAttribute('stroke-width', String(w));
            pa.setAttribute('pathLength', '1');
            pa.style.animationDelay = `${Math.round((i - 1) * sig.stagger * 1.4 * k)}ms`;
            svg.append(pa);
          }
        }
        L.append(svg);
        break;
      }
      case 'fault': {
        // the crack racing across the ground from the hammer, spikes of rock along it, boulders dropping, the dust cloud swelling
        const from = (mouth?.x ?? 0) < W / 2 ? 'left' : 'right';
        const line = faultLine(mid, W, from);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'ecCrack');
        svg.setAttribute('width', String(W));
        svg.setAttribute('height', String(H));
        const d = line.map((q, j) => `${j ? 'L' : 'M'}${Math.round(q.x)} ${Math.round(q.y)}`).join('');
        for (const [cls, w] of [['edge', 16], ['dark', 8]] as const) {
          const pa = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pa.setAttribute('d', d);
          pa.setAttribute('class', `crack-${cls}`);
          pa.setAttribute('stroke-width', String(w));
          pa.setAttribute('pathLength', '1');
          pa.style.animationDelay = `${Math.round(-30 * k)}ms`;
          svg.append(pa);
        }
        L.prepend(svg);
        const spikes = saver ? 4 : 8;
        for (let i = 0; i < spikes; i++) {
          const q = line[Math.min(line.length - 1, Math.round(((i + 0.5) / spikes) * (line.length - 1)))];
          const x = Math.max(W * 0.05, Math.min(W * 0.95, q.x));
          L.append(fxEl({ ...look.pillar, scale: 1.3, ms: 1000 }, x, q.y + 12, { delay: (90 + i * 105) * k, cls: 'ecPillar solid', mul: 0.8 + (i % 3) * 0.2 }));
        }
        const rocks = saver ? 3 : 7;
        for (let i = 0; i < rocks; i++) {
          const b = put(el('i', 'ecBoulder'), W * (0.12 + 0.76 * ((i * 0.618) % 1)), mid.y + (((i * 41) % 7) - 3) * H * 0.03);
          b.style.setProperty('--fall', `${Math.round(H * 0.45)}px`);
          b.style.animationDelay = `${Math.round((330 + i * 120) * k)}ms`;
          b.append(strip('sand', '', 0, 0, { loop: true, scale: 1.7 + (i % 3) * 0.4 }));
          L.append(b);
        }
        for (let i = 0; i < (saver ? 3 : 6); i++) {
          const dust = put(el('i', 'ecDust'), mid.x + (i - 2.5) * W * 0.17, mid.y + 22 - (i % 3) * H * 0.03, W * 0.5, W * 0.34);
          timed(dust, 380 + i * 110, 2200);
          L.append(dust);
        }
        break;
      }
      case 'void': {
        // the screen dims, violet-black fire pours in and a maw swallows the foes' half, imploding; embers of violet after
        const wash = el('i', 'ecVoidWash');
        wash.style.setProperty('--dimA', String(sig.dim));
        L.prepend(wash);
        const maw = put(el('i', 'ecMaw'), mid.x, mid.y, W * 1.5, W * 0.8);
        timed(maw, 0, 1300);
        L.append(maw);
        for (let i = 0; i < (saver ? 2 : 5); i++) {
          const a = i * 1.7 + 0.4;
          const stream = put(el('i', 'ecPour'), mid.x + Math.cos(a) * W * 0.5, mid.y + Math.sin(a) * H * 0.2, W * 0.5, W * 0.14);
          stream.style.setProperty('--tx', `${Math.round(-Math.cos(a) * W * 0.5)}px`);
          stream.style.setProperty('--ty', `${Math.round(-Math.sin(a) * H * 0.2)}px`);
          stream.style.rotate = `${Math.atan2(-Math.sin(a) * H * 0.2, -Math.cos(a) * W * 0.5)}rad`;
          timed(stream, 40 + i * 80, 760);
          L.append(stream);
        }
        for (let i = 0; i < (saver ? 3 : 8); i++) {
          const chip = put(el('i', 'ecEmber'), mid.x + (((i * 61) % 9) - 4) * W * 0.09, mid.y + 10 + (i % 3) * 10);
          chip.style.setProperty('--rise', `${-Math.round(H * (0.1 + (i % 4) * 0.04))}px`);
          timed(chip, 900 + i * 90, 1800);
          chip.append(strip('embers', '', 0, 0, { loop: true, scale: 1.6 + (i % 3) * 0.3 }));
          L.append(chip);
        }
        break;
      }
    }
  }

  /** A tap skips to the strike: the pass is cut, the source flares a moment and the strike lands; once it has, the rest is cut. */
  private skip(): void {
    const p = this.p;
    if (!p) return;
    if (!p.struckDone) {
      p.t = skipTarget(p.m, p.t);
      this.frame(0);
      return;
    }
    p.t = p.m.RESUME;
    this.frame(0);
  }

  /** The camera on the board's picture: a scale about a point (the board's middle when none), eased over `ms` (0: a cut). Held still with
   *  reduced motion. */
  private frameBoard(zoom: number, at: { x: number; y: number } | null, ms: number): void {
    const c = this.opts.stage?.();
    if (!c) return;
    // (EIDOLON-CALL-2: the board's layer of the cinematic is framed the same way, so the trail and the runs stay on their tiles)
    const d = this.board;
    if (this.reduced || zoom === 1) {
      for (const x of [c, d]) {
        x.style.transition = this.reduced ? '' : `transform ${ms}ms ease-out`;
        x.style.transform = '';
      }
      return;
    }
    const r = c.getBoundingClientRect();
    const o = at ?? this.boardMid();
    c.style.transformOrigin = `${Math.round(o.x - r.left)}px ${Math.round(o.y - r.top)}px`;
    d.style.transformOrigin = `${Math.round(o.x)}px ${Math.round(o.y)}px`;
    for (const x of [c, d]) {
      x.style.transition = ms ? `transform ${ms}ms cubic-bezier(.2,.8,.3,1)` : 'none';
      x.style.transform = `scale(${zoom})`;
    }
  }

  private end(): void {
    const p = this.p;
    this.p = null;
    duck(false, 'eidolon');
    const c = this.opts.stage?.();
    if (c) {
      for (const x of [c, this.board]) {
        x.style.transition = this.reduced ? '' : 'transform 600ms ease-out';
        x.style.transform = '';
      }
      setTimeout(() => {
        if (!this.p) c.style.transition = c.style.transformOrigin = '';
      }, 700);
    }
    // (the wash and the aftermath fade out over the board running again)
    this.layer.dataset.stage = 'out';
    const L = this.layer;
    setTimeout(() => {
      if (!this.p) {
        L.hidden = true;
        L.replaceChildren();
      }
    }, this.reduced ? 1100 : 1400);
    if (p && this.b) this.opts.cheer?.(this.b, reactionOf(p.e.element, p.calls));
  }

  /* ------------------------------------------------------------------ the camp */

  /** The camp horn's look follows the save (the home screen's top bar asks). */
  refreshCamp(): void {
    const m = this.opts.meta();
    this.camp.set(hornOf(m), hornReady(m));
    // (HORN-GIFT: no horn at the camp until the first binding gives it)
    this.camp.root.hidden = !hornHeld(m);
  }

  /** The horn's card at the camp: its fill, how it fills, and the Eidolons bound (a tap chooses the one that answers). */
  openCamp(): void {
    const m = this.opts.meta();
    const box = el('div', 'ehBox camp');
    const head = el('div', 'ehHead');
    const big = new HornView('ehBig', 'The War Horn');
    big.set(hornOf(m), hornReady(m));
    const words = el('div', 'ehHeadWords');
    words.append(el('b', '', 'The War Horn'), el('span', '', hornWords(hornOf(m))));
    head.append(big.root, words);
    box.append(head);
    box.append(el('p', 'ehAsk', `Boss waves won add ${HORN.BOSS}, each foe slain ${HORN.FOE}; an auto-replay adds half. Full, it waits; blow it in any fight to call an Eidolon to strike the whole field. Once a fight.`));
    const bound = boundOf(m);
    if (!bound.length) {
      box.append(el('p', 'ehNone', NO_EIDOLON), el('p', 'ehAsk', SUMMONER_HINT));
    } else {
      box.append(el('p', 'ehAsk', 'The Eidolon that answers it (tap to choose; the horn keeps its fill):'));
      const list = el('div', 'ehList');
      for (const e of EIDOLONS.filter((x) => bound.includes(x.id))) {
        const c = this.cardOf(e, chosenOf(m) === e.id);
        c.addEventListener('click', () => {
          if (chooseEidolon(m, e.id)) this.opts.save();
          this.openCamp();
        });
        list.append(c);
      }
      box.append(list);
    }
    const row = el('div', 'ehRow');
    // (EIDOLON-CHAINS: the Pact Gallery, the six alcoves, from the horn's card)
    if (this.opts.gallery) {
      const gal = el('button', '', 'Pact Gallery');
      gal.addEventListener('click', () => {
        this.closeSheet();
        this.opts.gallery!();
      });
      row.append(gal);
    }
    const close = el('button', 'primary', 'Close');
    close.addEventListener('click', () => this.closeSheet());
    row.append(close);
    box.append(row);
    this.showSheet(box);
    this.sheetOpen = false;
  }

  /** A gain on the horn after a fight: the motes stream in (at the camp's horn and the fight's). */
  gained(amount: number): void {
    this.refresh(this.b);
    this.horn.gain(amount);
    this.camp.gain(amount);
  }

  /** For the screenshots: the cinematic's layer. */
  get root(): HTMLElement {
    return this.layer;
  }
  /** For the screenshots: the cinematic's clock. */
  get clock(): number {
    return this.p?.t ?? -1;
  }
}

export { eidolonFullName };
