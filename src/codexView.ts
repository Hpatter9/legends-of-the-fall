// The codex page (from the Castle page's chips): a Bestiary of every foe and boss met and a gallery of the heroes, as tabs over a
// grid of cards; a tap opens the detail sheet, with the sprite on its idle. Unmet foes and unowned heroes are dark silhouettes.
// Only reads the meta and the codex rules (`sim/codex.ts`); the Claim buttons call back to the home screen, which pays and saves.

import { KITS, type Kit } from './sim/abilities';
import { COLLECTIONS, COLLECTION_NAMES, FOE_ENTRIES, gotOf, heroKnown, isMet, killsOf, milestoneClaimed, milestoneReached, milestonesOf, progressLine, tipsOf, totalOf, whereMet, type Collection, type FoeEntry } from './sim/codex';
import { FOE_LORE, HERO_STORY } from './sim/codexLore';
import { ALL_HEROES, UNITS } from './sim/units';
import { lockInfo } from './sim/contentHeroes';
import { CLASS_NAMES, CLASS_OF } from './sim/starter';
import { TRAITS, traitsOf } from './sim/traits';
import type { Meta } from './sim/meta';
import { portrait, sprite, figureOf } from './render/sheets';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const CLASS_LABEL: Record<FoeEntry['class'], string> = { common: 'Foe', boss: 'Boss', elite: 'Tower elite', calamity: 'Calamity herald' };

/** The page's state that outlives a redraw: the tab it was on. */
let tabNow: Collection = 'bestiary';

/** A speed word for a step time. */
const paceOf = (ms: number): string => (ms >= 900 ? 'Slow' : ms >= 650 ? 'Steady' : ms >= 450 ? 'Quick' : 'Very quick');

/** The sprite on its idle in a framed picture, at a whole-number scale (twice where the figure is small); a silhouette when `dark`. Returns the picture and its animation timer's stop. */
function livePicture(sheet: string, dark: boolean): { pic: HTMLElement; stop: () => void } {
  const pic = el('div', 'cxPic');
  const k = figureOf(sheet) * 2 <= 130 ? 2 : 1;
  const spr = sprite(sheet, 0, k);
  spr.canvas.style.transform = spr.faceRight ? 'translateX(-50%)' : 'translateX(-50%) scaleX(-1)';
  if (dark) spr.canvas.style.filter = 'brightness(0)';
  pic.append(spr.canvas);
  let n = 0;
  // (the idle only plays for a figure that can be seen; a silhouette holds still)
  const timer = dark ? 0 : window.setInterval(() => (spr.canvas.isConnected ? spr.tick(++n) : stop()), 140);
  const stop = () => clearInterval(timer);
  return { pic, stop };
}

/** The card of a foe or hero in the grid: its portrait (a silhouette when unknown), name and a small line. */
function card(sheet: string, grade: number, name: string, line: string, known: boolean): HTMLButtonElement {
  const b = el('button', `cxCard${known ? '' : ' dark'}`);
  const pic = portrait(sheet, 52, grade);
  pic.className = 'cxPort';
  b.append(pic, el('b', '', known ? name : '???'), el('small', '', line));
  return b;
}

function stat(box: HTMLElement, rows: readonly (readonly [string, string])[]): void {
  const g = el('div', 'hstats');
  for (const [name, v] of rows) {
    const c = el('div');
    c.append(el('b', '', v), el('small', '', name));
    g.append(c);
  }
  box.append(g);
}

function kitLines(box: HTMLElement, kit: Kit | undefined): void {
  if (!kit) return;
  const rows: [string, { name: string; text: string }][] = [['Skill', kit.skill]];
  if (kit.ultimate) rows.push(['Ultimate', kit.ultimate]);
  rows.push(['Passive', kit.passive]);
  for (const [label, a] of rows) {
    const p = el('p');
    p.append(el('i', '', `${label} · ${a.name}: `), a.text);
    box.append(p);
  }
}

const section = (box: HTMLElement, title: string, lines: readonly string[]): void => {
  box.append(el('h4', 'cxH', title));
  const ul = el('ul', 'cxList');
  for (const l of lines) ul.append(el('li', '', l));
  box.append(ul);
};

/** The detail sheet over the page. Returns the function that closes it. */
function openFoe(root: HTMLElement, m: Meta, e: FoeEntry): void {
  const def = UNITS[e.defs[0]];
  const met = isMet(m, e);
  const { box, close } = sheet(root);
  const { pic, stop } = livePicture(def.sheet, !met);
  closers.push(stop);
  const head = el('div', 'hhead');
  const title = el('div');
  title.append(el('h3', '', met ? e.name : '???'), el('em', '', met ? `${CLASS_LABEL[e.class]}${e.epithet ? ` · ${e.epithet}` : ''} · ${def.role}` : 'not yet met'));
  if (met) title.append(el('span', 'lv', `Felled: ${killsOf(m, e)}`));
  head.append(pic, title);
  box.append(head);
  if (!met) {
    box.append(el('p', 'cxLore', 'A shape in the dark. Meet it in battle and it is yours to read.'));
  } else {
    box.append(el('p', 'cxLore', FOE_LORE[e.id]));
    stat(box, [['HP', String(def.hp)], ['Attack', String(def.atk)], ['Defence', String(def.def)], ['Range', String(def.range)], ['Walk', paceOf(def.moveMs)], ['Jump', def.flies ? 'Flies' : String(def.jump)], ['Blows', paceOf(def.atkMs * 0.8)]]);
    box.append(el('p', 'hint', 'Base stats: foes grow stronger the deeper you go.'));
    kitLines(box, KITS[e.defs[0]]);
    section(box, 'Weaknesses and tips', tipsOf(def, KITS[e.defs[0]]));
    section(box, 'Where it is met', whereMet(e));
  }
  box.append(closeButton(close));
}

function openHero(root: HTMLElement, m: Meta, kind: string): void {
  const def = UNITS[kind];
  const known = heroKnown(m, kind);
  const { box, close } = sheet(root);
  const { pic, stop } = livePicture(def.sheet, !known);
  closers.push(stop);
  const head = el('div', 'hhead');
  const title = el('div');
  title.append(el('h3', '', def.name), el('em', '', `${CLASS_NAMES[CLASS_OF[kind]]} · ${def.role}`));
  const marks = traitsOf(kind).map((t) => TRAITS[t].name).join(' · ');
  if (marks) title.append(el('span', 'lv', marks));
  head.append(pic, title);
  box.append(head);
  if (!known) {
    box.append(el('p', 'cxLore locked', `🔒 Their story is locked. ${lockInfo(m, kind)!.line}.`));
  } else {
    box.append(el('p', 'cxLore', HERO_STORY[kind]));
    stat(box, [['HP', String(def.hp)], ['Attack', String(def.atk)], ['Defence', String(def.def)], ['Range', String(def.range)], ['Walk', paceOf(def.moveMs)], ['Jump', def.flies ? 'Flies' : String(def.jump)], ['Blows', paceOf(def.atkMs * 0.8)]]);
    kitLines(box, KITS[kind]);
  }
  box.append(closeButton(close));
}

/** The open sheet's animation timers (stopped when it closes or the page is redrawn). */
let closers: (() => void)[] = [];
const stopAll = () => {
  for (const c of closers) c();
  closers = [];
};

function sheet(root: HTMLElement): { box: HTMLElement; close: () => void } {
  stopAll();
  root.querySelector('.cxOverlay')?.remove();
  const over = el('div', 'cxOverlay');
  const box = el('div', 'hsheet cxSheet');
  over.append(box);
  const close = () => {
    stopAll();
    over.remove();
  };
  over.addEventListener('click', (ev) => ev.target === over && close());
  root.append(over);
  return { box, close };
}

const closeButton = (close: () => void): HTMLButtonElement => {
  const b = el('button', 'primary', 'Close');
  b.addEventListener('click', close);
  return b;
};

/**
 * The Codex page: the progress with its milestone rewards, the two tabs, and the grid. `claim` is called with a milestone's id when
 * its Claim is tapped (the home screen pays, saves, and draws the page again). `root` is the sub-page's box (the sheet opens over it).
 */
export function drawCodex(body: HTMLElement, m: Meta, claim: (id: string) => void, root: HTMLElement = body.parentElement ?? body): void {
  stopAll();
  root.querySelector('.cxOverlay')?.remove();
  const head = el('div', 'cxHead');
  for (const c of COLLECTIONS) {
    const block = el('div', 'cxProg');
    const got = gotOf(m, c);
    const total = totalOf(c);
    block.append(el('b', '', progressLine(m, c)));
    const bar = el('div', 'xpbar');
    const fill = el('span');
    fill.style.width = `${(got / total) * 100}%`;
    bar.append(fill);
    block.append(bar);
    const pips = el('div', 'cxPips');
    for (const ms of milestonesOf(c)) {
      const done = milestoneClaimed(m, ms);
      const ready = milestoneReached(m, ms) && !done;
      const pip = el('button', `cxPip${done ? ' done' : ready ? ' ready' : ''}`);
      pip.disabled = !ready;
      pip.append(el('small', '', `${ms.percent}%`), el('b', '', done ? '✓' : ready ? `Claim +${ms.crowns}` : `${ms.need}`));
      if (ready) pip.addEventListener('click', () => claim(ms.id));
      pips.append(pip);
    }
    block.append(pips);
    head.append(block);
  }
  body.append(head);

  const tabs = el('div', 'cxTabs');
  const grid = el('div', 'cxGrid');
  const fill = () => {
    grid.replaceChildren();
    if (tabNow === 'bestiary') {
      for (const e of FOE_ENTRIES) {
        const met = isMet(m, e);
        const def = UNITS[e.defs[0]];
        const c = card(def.sheet, 1, e.name, met ? `Felled ${killsOf(m, e)}` : 'not met', met);
        c.classList.add(e.class);
        c.addEventListener('click', () => openFoe(root, m, e));
        grid.append(c);
      }
    } else {
      for (const k of ALL_HEROES) {
        const known = heroKnown(m, k);
        const def = UNITS[k];
        const c = card(def.sheet, 1, def.name, known ? CLASS_NAMES[CLASS_OF[k]] : 'locked', true);
        if (!known) c.classList.add('dark');
        c.addEventListener('click', () => openHero(root, m, k));
        grid.append(c);
      }
    }
  };
  const buttons = new Map<Collection, HTMLButtonElement>();
  for (const c of COLLECTIONS) {
    const t = el('button', `cxTab${c === tabNow ? ' on' : ''}`, COLLECTION_NAMES[c]);
    t.addEventListener('click', () => {
      tabNow = c;
      for (const [k, b] of buttons) b.classList.toggle('on', k === c);
      fill();
      body.scrollTop = 0;
    });
    buttons.set(c, t);
    tabs.append(t);
  }
  fill();
  body.append(tabs, grid);
}

/** Close any open sheet's timers (the page was left). */
export const stopCodex = stopAll;
