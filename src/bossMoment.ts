// BOSS-BIG (docs/notes/boss-big-attacks.md, the rules in `bossBigRules.ts`): a boss's signature attack's cut-in on the page. As the windup
// begins, a red and black band slashes across the screen the other way from a hero's ultimate, the boss's whole figure in it and the
// attack's name stamped in (its rage name, marked ENRAGED, once the fight has dragged). In full (the Full ultimate scenes setting on and
// Auto off) the fight is held for the band alone, about a second, then the windup runs on (its marks fill in on the board, `bossFx.ts`);
// a tap skips it. Short: the band is up a little less long and the fight runs on under it. Reduced motion: the band fades in and out,
// held still. It never changes the battle: the page's fight loop asks `holds` before stepping it.

import type { Battle, BattleEvent } from './sim/battle';
import { UNITS } from './sim/units';
import { sheetInfo, wholeFigure } from './render/sheets';
import { GLOW, type Element } from './render/fxRules';
import { BOSS_BIG_LOOK } from './bossBigRules';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export class BossMoments {
  private layer: HTMLElement;
  /** Real ms left of the band, and of the hold on the fight. */
  private left = 0;
  private holdLeft = 0;

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'bmLayer';
    this.layer.hidden = true;
    this.layer.addEventListener('click', (e) => {
      e.stopPropagation();
      this.holdLeft = 0;
      this.out();
    });
    document.body.append(this.layer);
  }

  /** A tick's events: a signature's windup brings the band; true when the fight is to be held for it (`full`). */
  note(b: Battle, events: readonly BattleEvent[], full: boolean): boolean {
    const e = events.find((x): x is Extract<BattleEvent, { kind: 'bossSig' }> => x.kind === 'bossSig' && x.phase === 'warn');
    if (!e) return false;
    const boss = b.units.find((u) => u.id === e.by);
    if (!boss) return false;
    this.show(boss.def, e.name, e.el as Element, e.rage, full);
    this.left = full ? BOSS_BIG_LOOK.CUT_MS : BOSS_BIG_LOOK.SHORT_MS;
    this.holdLeft = full ? BOSS_BIG_LOOK.CUT_MS : 0;
    return full;
  }

  /** Whether the fight is held now (the band in full). */
  get holds(): boolean {
    return this.holdLeft > 0;
  }

  /** Each frame: `dt` real ms (unless a sheet or a scene holds everything). */
  frame(dt: number, paused = false): void {
    if (this.layer.hidden || paused) return;
    const step = Math.min(dt, 250);
    this.holdLeft = Math.max(0, this.holdLeft - step);
    this.left -= step;
    this.layer.classList.toggle('live', this.holdLeft > 0);
    if (this.left <= 240) this.out();
    if (this.left <= 0) this.hide();
  }

  clear(): void {
    this.left = 0;
    this.holdLeft = 0;
    this.hide();
  }

  private show(def: string, name: string, el: Element, rage: boolean, full: boolean): void {
    this.layer.replaceChildren();
    const cut = document.createElement('div');
    cut.className = `bmCut${rage ? ' rage' : ''}${full ? '' : ' short'}`;
    cut.style.setProperty('--el', hex(GLOW[el] ?? 0xff4030));
    cut.style.setProperty('--open', `${full ? BOSS_BIG_LOOK.CUT_MS : BOSS_BIG_LOOK.SHORT_MS}ms`);
    const band = document.createElement('div');
    band.className = 'bmBand';
    const lines = document.createElement('i');
    lines.className = 'bmLines';
    // (the boss's whole figure from its sheet, facing into the band)
    const u = UNITS[def];
    const info = sheetInfo(u.sheet);
    const fig = wholeFigure(u.sheet, Math.min(innerWidth, 640) * 0.42, 210, !!info && info.facesRight);
    fig.className = 'bmArt';
    const words = document.createElement('div');
    words.className = 'bmWords';
    const who = document.createElement('small');
    who.textContent = rage ? `${u.name} · ENRAGED` : u.name;
    const title = document.createElement('b');
    title.textContent = name;
    words.append(who, title);
    band.append(lines, fig, words);
    const edges = document.createElement('i');
    edges.className = 'bmEdges';
    cut.append(band, edges);
    this.layer.append(cut);
    this.layer.hidden = false;
  }

  private out(): void {
    this.layer.querySelector('.bmCut:not(.out)')?.classList.add('out');
  }

  private hide(): void {
    this.layer.hidden = true;
    this.layer.classList.remove('live');
    this.layer.replaceChildren();
  }

  /** For the screenshots. */
  get root(): HTMLElement {
    return this.layer;
  }
}
