// The Nemesis War, phase 3: the taunt cut-in on the page (the rules in `tauntCutRules.ts`; `docs/notes/nemesis-3.md`). Before the first wave
// of a run in which a nemesis stands, a band crosses the board between the top bar and the bench: the nemesis's portrait slides in from the
// left in its rank's frame with its scars, its name, rank and Might, one taunt; the hero it names answers from the right. It sits in the gap
// between the screen's top and bottom parts, measured as it opens, so it never covers the HUD (`tools/combat-hud/probe.mjs` checks it). A
// tap skips it once 0.6 s have played. Reduced motion: the portraits fade in, held still. It never touches the battle.
//
// Art: the commissioned banners behind the two bands (expansionArt.ts), the hero cards'
// brass frame round the faces, and the trophy drawn with the piece's own gear icon.

import { paintGearIcon } from './gearIcons';
import { portrait } from './render/sheets';
import { heroFace } from './heroFace';
import { reducedMotion } from './reviveView';
import { canSkip, cutLength, plateWords, TAUNT_CUT, type CutMode, type Taunt } from './tauntCutRules';
import { heroName } from './sim/heroNames';
import { trophyWords } from './sim/revenge';
import { UNITS } from './sim/units';
import { TAUNT_FOE, TAUNT_HERO } from './expansionArt';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The parts of the screen a cut-in must stay clear of: the top bar, the spell row, the boss's bar and the banners above; the bench, the
 *  hero rows and the tactic button below (each counted above or below by where its middle is). */
// (and the Assault's bar, minimap and command rows, phase 3: its opening cut-in sits between them)
const HUD = ['#top', '#hudSpells', '#bossBar', '#twistBanner', '#comboBar', '#phaseBanner', '#synCol', '#tacticBtn', '.ehHorn', '#panel', '.fhRow', '#autoBar', '#benchWrap', '#quip', '.asTop', '.asMini', '.asBottom'];

/** The free band of the screen between the top parts and the bottom ones (px from the top), for a cut-in `h` tall. */
function freeBand(h: number): number {
  const boxes = HUD.flatMap((sel) => [...document.querySelectorAll<HTMLElement>(sel)])
    .filter((e) => !e.closest('[hidden]') && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden')
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.height > 0 && r.width > 0);
  const mid = innerHeight / 2;
  const top = Math.max(0, ...boxes.filter((r) => (r.top + r.bottom) / 2 < mid).map((r) => r.bottom));
  const bottom = Math.min(innerHeight, ...boxes.filter((r) => (r.top + r.bottom) / 2 >= mid).map((r) => r.top));
  const room = bottom - top;
  // (in the gap's upper part when there is room, so the board's front rows show under it; never past either edge)
  return Math.round(room > h + 16 ? top + Math.min((room - h) * 0.35, 80) + 8 : top + Math.max(0, (room - h) / 2));
}

export class TauntCuts {
  private layer: HTMLElement;
  private queue: { t: Taunt; mode: CutMode }[] = [];
  private now: Taunt | null = null;
  /** Real ms played of the one showing, and its length. */
  private played = 0;
  private length = 0;
  /** A cut-in has opened (the page counts the nemesis met this run), and one has ended or been skipped (it marks a first meeting seen). */
  onOpen: (t: Taunt) => void = () => undefined;
  onShown: (t: Taunt) => void = () => undefined;

  constructor() {
    this.layer = el('div', 'tcLayer');
    this.layer.hidden = true;
    this.layer.addEventListener('pointerdown', (e) => {
      if (!this.now) return;
      e.stopPropagation();
      if (canSkip(this.played)) this.end();
    });
    document.body.append(this.layer);
  }

  /** Whether a cut-in is showing or waiting. */
  get busy(): boolean {
    return !!this.now || this.queue.length > 0;
  }

  /** Queue the wave's cut-ins (in the order they stand), with the setting's mode. */
  add(taunts: readonly Taunt[], mode: CutMode): void {
    for (const t of taunts) if (cutLength(mode, t).ms > 0) this.queue.push({ t, mode });
  }

  /** Each frame: `dt` real ms; `held` while something else has the screen (a boss's card, a scene). */
  frame(dt: number, held: boolean): void {
    if (!this.now) {
      if (held || !this.queue.length) return;
      const next = this.queue.shift()!;
      this.open(next.t, next.mode);
      return;
    }
    this.played += Math.min(dt, 250);
    const left = this.length - this.played;
    if (left <= TAUNT_CUT.OUT_MS) this.layer.firstElementChild?.classList.add('out');
    if (left <= 0) this.end();
  }

  /** The fight has begun, or the page has moved on: every cut-in goes at once. */
  clear(): void {
    // (one still waiting was never seen: it may come at the next wave it stands in)
    if (this.now) this.onShown(this.now);
    this.queue = [];
    this.now = null;
    this.layer.hidden = true;
    this.layer.replaceChildren();
  }

  private end(): void {
    const t = this.now;
    this.now = null;
    this.layer.hidden = true;
    this.layer.replaceChildren();
    if (t) this.onShown(t);
  }

  private open(t: Taunt, mode: CutMode): void {
    const { ms, full } = cutLength(mode, t);
    this.now = t;
    this.onOpen(t);
    this.played = 0;
    this.length = ms;
    const cut = el('div', `tcCut ${t.rank}${full ? '' : ' short'}${reducedMotion() ? ' still' : ''}`);
    cut.style.setProperty('--open', `${ms}ms`);
    cut.setAttribute('aria-live', 'polite');
    cut.setAttribute('aria-label', `${t.name}, ${plateWords(t)}: “${t.line}”${t.reply && t.hero ? ` ${heroName(t.hero)}: “${t.reply}”` : ''}`);
    const band = el('div', 'tcBand');
    band.style.setProperty('--tc-art', `url(${TAUNT_FOE})`);
    // (the nemesis: its sprite's portrait in its rank's frame, its scars on the frame)
    const foe = el('span', 'tcFace tcFoe');
    const sheet = UNITS[t.base]?.sheet;
    if (sheet) foe.append(portrait(sheet, 96));
    if (t.scars > 0) foe.append(el('i', 'tcScars', '✕'.repeat(Math.min(3, t.scars))));
    const words = el('div', 'tcWords');
    words.append(el('b', 'tcName', t.name), el('small', 'tcRank', plateWords(t)));
    if (full) words.append(el('q', 'tcLine', t.line));
    band.append(foe, words);
    // (the trophy it carries of the named hero's, drawn with the piece's own gear icon)
    if (full && t.trophy) {
      const tr = el('span', 'tcTrophy eqIcon');
      paintGearIcon(tr, t.trophy.base, t.trophy.rarity, 28);
      tr.title = trophyWords(t.trophy);
      foe.append(tr);
    }
    cut.append(band);
    // (the hero it names answers from the right)
    if (full && t.hero && t.reply) {
      const ans = el('div', 'tcAnswer');
      ans.style.setProperty('--tc-art', `url(${TAUNT_HERO})`);
      const face = el('span', 'tcFace tcHero');
      const hs = UNITS[t.hero]?.sheet;
      if (hs) face.append(heroFace(t.hero, 0, 96, portrait(hs, 96)));
      const said = el('div', 'tcSaid');
      said.append(el('b', 'tcWho', heroName(t.hero)), el('q', 'tcReply', t.reply));
      ans.append(said, face);
      cut.append(ans);
    }
    this.layer.replaceChildren(cut);
    this.layer.hidden = false;
    cut.style.top = `${freeBand(cut.getBoundingClientRect().height || (full ? 150 : 64))}px`;
  }
}
