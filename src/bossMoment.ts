// BOSS-BIG (docs/notes/boss-big-attacks.md, the rules in `bossBigRules.ts`): a boss's signature attack's cut-in on the page. As the windup
// begins, a slim red and black band slashes across near the top of the board, the other way from a hero's ultimate, with the boss's head
// and the attack's name stamped in (its rage name, marked ENRAGED, once the fight has dragged). The fight never stops for it (the owner:
// "the boss specials don't need to pause the game"): the windup's marks fill in on the board under it (`bossFx.ts`). Reduced motion: the
// band fades in and out, held still. It never touches the battle.

import type { Battle, BattleEvent } from './sim/battle';
import { UNITS } from './sim/units';
import { sheetInfo, wholeFigure } from './render/sheets';
import { GLOW, type Element } from './render/fxRules';
import { BOSS_BIG_LOOK } from './bossBigRules';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export class BossMoments {
  private layer: HTMLElement;
  /** Real ms left of the band. */
  private left = 0;

  constructor() {
    this.layer = document.createElement('div');
    this.layer.className = 'bmLayer';
    this.layer.hidden = true;
    document.body.append(this.layer);
  }

  /** A tick's events: a signature's windup brings the band. */
  note(b: Battle, events: readonly BattleEvent[]): void {
    const e = events.find((x): x is Extract<BattleEvent, { kind: 'bossSig' }> => x.kind === 'bossSig' && x.phase === 'warn');
    if (!e) return;
    const boss = b.units.find((u) => u.id === e.by);
    if (!boss) return;
    this.show(boss.def, e.name, e.el as Element, e.rage);
    this.left = BOSS_BIG_LOOK.BAND_MS;
  }

  /** Each frame: `dt` real ms (unless a sheet or a scene holds everything). */
  frame(dt: number, paused = false): void {
    if (this.layer.hidden || paused) return;
    const step = Math.min(dt, 250);
    this.left -= step;
    if (this.left <= 240) this.out();
    if (this.left <= 0) this.hide();
  }

  clear(): void {
    this.left = 0;
    this.hide();
  }

  private show(def: string, name: string, el: Element, rage: boolean): void {
    this.layer.replaceChildren();
    const cut = document.createElement('div');
    cut.className = `bmCut${rage ? ' rage' : ''}`;
    cut.style.setProperty('--el', hex(GLOW[el] ?? 0xff4030));
    cut.style.setProperty('--open', `${BOSS_BIG_LOOK.BAND_MS}ms`);
    const band = document.createElement('div');
    band.className = 'bmBand';
    const lines = document.createElement('i');
    lines.className = 'bmLines';
    // (the boss's figure from its sheet, facing into the band; the slim band shows its head and shoulders)
    const u = UNITS[def];
    const info = sheetInfo(u.sheet);
    const fig = wholeFigure(u.sheet, Math.min(innerWidth, 640) * 0.3, 150, !!info && info.facesRight);
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
    this.layer.replaceChildren();
  }

  /** For the screenshots. */
  get root(): HTMLElement {
    return this.layer;
  }
}
