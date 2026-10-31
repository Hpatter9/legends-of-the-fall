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
import { beatTimes, BOARD_ZOOM, canSkip, CHOREO, EYES, hornLook, hornWords, lineOf, LOOKS, momentOf, motesFor, NO_EIDOLON, reactionOf, shotAt, SNAP_MS, SNAP_ZOOM, SUMMONER_HINT, type MomentTimes, type Shot } from './eidolonRules';
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

  private start(e: Eidolon, first: boolean): void {
    const m = momentOf(first, settings().eidolonFull);
    const calls = this.opts.meta().eidolons?.calls ?? 0;
    this.p = { e, m, first, t: 0, beats: beatTimes(m, CHOREO[e.id]?.length ?? 3), beatsDone: 0, struck: [], releasing: false, struckDone: false, stopLeft: 0, shot: '', snapLeft: 0, calls };
    const look = LOOKS[e.element];
    const L = this.layer;
    L.replaceChildren();
    L.className = `ecLayer el-${e.element}${m.BARS ? ' full' : ' short'}${this.reduced ? ' still' : ''}${settings().saver ? ' saver' : ''}`;
    L.style.setProperty('--glow', look.glow);
    L.style.setProperty('--deep', look.deep);
    L.style.setProperty('--wash', look.wash);
    L.style.setProperty('--dim', String(m.DIM));
    L.hidden = false;
    const dim = el('i', 'ecDim');
    const wash = el('i', 'ecWash');
    // (the summoning circle over the board's middle, a ground loop 2:1)
    const circle = el('i', 'ecCircle');
    const mid = this.boardMid();
    circle.style.left = `${mid.x}px`;
    circle.style.top = `${mid.y}px`;
    const rift = el('i', 'ecRift');
    const glow = el('i', 'ecAura');
    const fig = el('div', 'ecFig');
    fig.append(img(figureUrl(e.id), 'ecFigArt'));
    const motes = el('div', 'ecMotes');
    const n = this.reduced ? 0 : settings().saver ? 10 : 26;
    for (let i = 0; i < n; i++) {
      const s = el('i');
      s.style.setProperty('--x', `${(i * 37) % 100}%`);
      s.style.setProperty('--d', `${-((i * 530) % 4000)}ms`);
      s.style.setProperty('--s', `${3 + (i % 4) * 2}px`);
      motes.append(s);
    }
    const bars = el('div', 'ecBars');
    bars.append(el('i', 'top'), el('i', 'bot'));
    const name = el('div', 'ecName');
    name.append(el('small', '', e.title.replace(/^the /, 'The ')), el('b', '', e.name), el('em', '', e.attack));
    // (the close-up: a cut to its face, its painted card, pushing in on its eyes as it speaks its line)
    const close = el('div', 'ecClose');
    const face = img(cardUrl(e.id), 'ecFace');
    const [ex, ey] = EYES[e.id] ?? [0.5, 0.4];
    face.style.transformOrigin = `${ex * 100}% ${ey * 100}%`;
    const said = el('p', 'ecLine');
    said.append(el('b', '', e.name), document.createTextNode(` “${lineOf(e, first, calls)}”`));
    close.append(face, said);
    new Image().src = cardUrl(e.id);
    const hornBlast = el('div', 'ecHorn');
    hornBlast.append(el('i', 'ecCone'), img(URL_OF('horn-blast'), 'ecHornArt'), el('i', 'ecRing'));
    const flash = el('i', 'ecFlash');
    const skip = el('small', 'ecSkip', first ? '' : 'Tap to skip');
    L.append(dim, wash, circle, rift, glow, fig, motes, hornBlast, close, bars, name, flash, skip);
    duck(true, 'eidolon');
    play('horn');
    play('riseSummon');
  }

  /** The board's middle on the page. */
  private boardMid(): { x: number; y: number } {
    const b = this.b;
    const p = b ? this.opts.tile(Math.floor(b.board.w / 2), Math.floor(b.board.d * 0.4)) : null;
    return p ?? { x: innerWidth / 2, y: innerHeight * 0.42 };
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
    p.t += step;
    const shot = shotAt(p.m, p.t);
    if (shot !== p.shot) {
      p.shot = shot;
      this.layer.dataset.stage = shot;
      if (shot === 'arrive') play('stingSummon');
      this.frameBoard(BOARD_ZOOM[shot], null, shot === 'strike' || shot === 'close' ? 0 : 450);
    }
    // (the snap zoom on a blow eases back to the wide shot)
    if (p.snapLeft > 0) {
      p.snapLeft -= step;
      if (p.snapLeft <= 0) this.frameBoard(BOARD_ZOOM[p.shot as Shot], null, 260);
    }
    while (p.beatsDone < p.beats.length && p.t >= p.beats[p.beatsDone] && (p.beatsDone > 0 || p.struckDone)) this.beat(p, p.beatsDone++);
    if (p.t >= p.m.RESUME) this.end();
  }

  /** One beat of the attack: its bursts across the board, a flash, its sound; the first with the hit-stop and the full shake. */
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
        fx.rumble(this.reduced ? 0 : p.m.SHAKE);
      }
    }
    if (i === 0 && !this.reduced && settings().shake) p.stopLeft = p.m.HIT_STOP;
    // (a snap zoom on the blow: the first beat's on the foes struck, the others' where they land)
    const at = b && (plan === 'foes' ? (p.struck.length ? this.opts.anchor(p.struck[0]) : null) : this.opts.tile(Math.round(plan[0][0] * (b.board.w - 1)), Math.round(plan[0][1] * (b.board.d - 1))));
    if (i === 0 || p.m.BARS) {
      this.frameBoard(SNAP_ZOOM, at ?? null, SNAP_MS);
      p.snapLeft = SNAP_MS + 60;
    }
    play(look.sound);
    if (i === 0) play('ultImpact');
    const f = this.layer.querySelector('.ecFlash');
    if (f) {
      const g = f.cloneNode() as HTMLElement;
      f.replaceWith(g);
    }
  }

  /** A tap skips: the strike (if it has not come) is let through, the rest is cut. */
  private skip(): void {
    const p = this.p;
    if (!p) return;
    if (!p.struckDone) {
      p.t = p.beats[0];
      p.releasing = true;
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
    if (this.reduced || zoom === 1) {
      c.style.transition = this.reduced ? '' : `transform ${ms}ms ease-out`;
      c.style.transform = '';
      return;
    }
    const r = c.getBoundingClientRect();
    const o = at ?? this.boardMid();
    c.style.transformOrigin = `${Math.round(o.x - r.left)}px ${Math.round(o.y - r.top)}px`;
    c.style.transition = ms ? `transform ${ms}ms cubic-bezier(.2,.8,.3,1)` : 'none';
    c.style.transform = `scale(${zoom})`;
  }

  private end(): void {
    const p = this.p;
    this.p = null;
    duck(false, 'eidolon');
    const c = this.opts.stage?.();
    if (c) {
      c.style.transition = this.reduced ? '' : 'transform 600ms ease-out';
      c.style.transform = '';
      setTimeout(() => {
        if (!this.p) c.style.transition = c.style.transformOrigin = '';
      }, 700);
    }
    // (the wash and the figure fade out over the board running again)
    this.layer.dataset.stage = 'out';
    const L = this.layer;
    setTimeout(() => {
      if (!this.p) {
        L.hidden = true;
        L.replaceChildren();
      }
    }, this.reduced ? 300 : 1400);
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
