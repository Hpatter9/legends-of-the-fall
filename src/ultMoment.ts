// The ultimate's moment on the page (ULT-CUTIN, docs/notes/battle-hud.md; the rules and timings are `ultMomentRules.ts`). The owner's ask: an
// ultimate should feel special. In full (the default setting), as it fires the fight is held: a slash crosses the screen carrying the hero's
// painted art and the ultimate's name pops up, and the rest of the screen darkens but for a pool of light round the caster, where its effect
// plays. Then the dim fades and the fight resumes: at once for a lingering ultimate, so its field or aura or summons work live; after the
// effects have played for an instant one. A tap skips. Short (the setting off): no hold and no dim; the hero rows' cut-in banner shows the
// hero's face instead (`fightHud.ts`). With reduced motion the slash does not sweep: the art and the name fade in and out, held still.
//
// It never changes the battle: the page's fight loop asks `holdsBattle` before stepping it (and `runsEffects` before stepping the effects).

import { type Battle, type BattleEvent, type Unit } from './sim/battle';
import { keyOf, ultimateOf } from './sim/abilities';
import { heroName } from './sim/heroNames';
import { GLOW, skillElement } from './render/fxRules';
import { whichCast } from './fightHudRules';
import { ULT_MOMENT, UltQueue, ultShape, type UltPhase } from './ultMomentRules';

export interface UltMomentOpts {
  /** The middle of a fighter's sprite on the page, for the pool of light; null when it cannot be told. */
  anchor: (id: number) => { x: number; y: number } | null;
  /** The hero's painted art for the slash (its awakened art once awakened, else its portrait). */
  art: (u: Unit) => string;
}

/** A hero's painted art: the awakened art once awakened, else the portrait (every one of the 45 has both, cached for offline play). */
export const heroArtUrl = (kind: string, awakened: number): string => (awakened > 0 ? `heroes/awakened-${kind}.webp` : `heroes/${kind}-portrait.webp`);

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export class UltMoments {
  readonly queue = new UltQueue();
  private layer: HTMLElement;
  private dim: HTMLElement;
  private shown = 0;
  private lastPhase: UltPhase = 'idle';
  private warmed = new Set<string>();
  /** The pictures kept loaded (a browser may drop an image nobody holds). */
  private keep: HTMLImageElement[] = [];

  constructor(private opts: UltMomentOpts) {
    this.layer = document.createElement('div');
    this.layer.className = 'umLayer';
    this.layer.hidden = true;
    this.dim = document.createElement('div');
    this.dim.className = 'umDim';
    this.layer.append(this.dim);
    // (a tap skips the moment playing)
    this.layer.addEventListener('click', (e) => {
      e.stopPropagation();
      this.queue.skip();
    });
    document.body.append(this.layer);
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

  /** A tick's events: each hero ultimate that fired becomes a moment (full setting only); true when the battle should stop stepping now. */
  note(b: Battle, events: readonly BattleEvent[], born: readonly Unit[]): boolean {
    for (const e of events) {
      if (e.kind !== 'skill') continue;
      const u = b.units.find((x) => x.id === e.by);
      if (!u || u.side !== 'hero' || whichCast(u, e.name) !== 'ult') continue;
      const ult = ultimateOf(u)!;
      const { shape, ms } = ultShape(ult, u.id, events, born);
      this.queue.push({ unit: u.id, kind: u.def, name: ult.name, shape, ms });
    }
    return this.queue.holdsBattle;
  }

  /** Each frame: move the moment on by `dt` real ms (unless `paused`: a sheet or a scene holds everything) and draw it. */
  frame(b: Battle, dt: number, paused = false): void {
    const q = this.queue;
    if (!q.current) {
      if (!this.layer.hidden) this.hide();
      return;
    }
    if (!paused) q.step(Math.min(dt, 250));
    const m = q.current;
    if (!m) return this.hide();
    const u = b.units.find((x) => x.id === m.unit);
    this.layer.hidden = false;
    // (the layer takes taps (to skip) while the battle is held; once it runs again they reach the page)
    this.layer.classList.toggle('live', q.holdsBattle);
    this.dim.style.opacity = q.dim.toFixed(3);
    const at = u ? this.opts.anchor(u.id) : null;
    if (at) {
      this.dim.style.setProperty('--x', `${Math.round(at.x)}px`);
      this.dim.style.setProperty('--y', `${Math.round(at.y)}px`);
    }
    if (q.phase === 'open' && this.shown !== q.seq && u) this.slash(u, m.name);
    if (q.phase !== 'open' && this.lastPhase === 'open') this.layer.querySelector('.umSlash')?.classList.add('out');
    this.lastPhase = q.phase;
  }

  private slash(u: Unit, name: string): void {
    this.shown = this.queue.seq;
    this.layer.querySelector('.umSlash')?.remove();
    const ult = ultimateOf(u);
    const colour = hex(GLOW[skillElement(ult ? keyOf(ult) : '')]);
    const el = document.createElement('div');
    el.className = 'umSlash';
    el.style.setProperty('--el', colour);
    el.style.setProperty('--open', `${ULT_MOMENT.OPEN_MS}ms`);
    const band = document.createElement('div');
    band.className = 'umBand';
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
    el.append(streak, band);
    this.layer.append(el);
  }

  private hide(): void {
    this.layer.hidden = true;
    this.layer.querySelector('.umSlash')?.remove();
    this.shown = 0;
    this.lastPhase = 'idle';
  }

  /** The fight is over or left: every moment dropped. */
  clear(): void {
    this.queue.clear();
    this.hide();
  }

  /** For the screenshots: the moment's animations frozen `ms` into the opening. */
  get root(): HTMLElement {
    return this.layer;
  }
}
