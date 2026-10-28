// The codex page (from the Castle page's chips): a Bestiary of every foe and boss met and a gallery of the heroes, as tabs over a
// grid of cards; a tap opens the detail sheet, with the sprite on its idle. Unmet foes and unowned heroes are dark silhouettes.
// Only reads the meta and the codex rules (`sim/codex.ts`); the Claim buttons call back to the home screen, which pays and saves.

import { KITS, type Kit } from './sim/abilities';
import { HERO_KITS, SKILL2_LEVEL } from './sim/heroKits';
import { codexWaiting, COLLECTIONS, COLLECTION_NAMES, crownsClaimed, crownsTotal, crownsWaiting, FOE_ENTRIES, gotOf, heroKnown, isMet, killsOf, milestoneClaimed, milestoneReached, milestonesOf, progressLine, ENTRY_STONES, entriesWaiting, stonesClaimed, stonesTotal, stonesWaiting, tipsOf, totalOf, whereMet, type Collection, type FoeEntry } from './sim/codex';
import { FOE_LORE, HERO_STORY } from './sim/codexLore';
import { ALL_HEROES, UNITS } from './sim/units';
import { lockInfo } from './sim/contentHeroes';
import { CLASS_NAMES, CLASS_OF } from './sim/starter';
import { TRAITS, traitsOf } from './sim/traits';
import type { Meta } from './sim/meta';
import { sceneList } from './sim/sceneRules';
import { settings } from './settings';
import { rulerWords } from './rulerRules';
import { LAYOUT_LIST, TERRAIN_INFO } from './sim/terrainInfo';
import { portrait, sprite, figureOf } from './render/sheets';
import { TIER_SKILLS } from './sim/tierSkills';
import { COMBOS, COMBO_NAME } from './sim/combos';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const CLASS_LABEL: Record<FoeEntry['class'], string> = { common: 'Foe', boss: 'Boss', elite: 'Tower elite', calamity: 'Calamity herald' };

/** The page's state that outlives a redraw: the tab it was on. */
let tabNow: Collection | 'scenes' | 'combos' | 'terrain' = 'bestiary';

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

/** A kit's lines (a hero's too lists its tier 2 and tier 3 skills, and the level its ultimate unlocks at). */
function kitLines(box: HTMLElement, kit: Kit | undefined, hero?: string): void {
  if (!kit) return;
  // (a hero: its two skills and what they cost from its pool, COMBAT-002; a foe: its one skill)
  const hk = hero ? HERO_KITS()[hero] : undefined;
  const rows: [string, { name: string; text: string }, number?][] = hk
    ? [[`Skill 1 (${hk.s1.cost} ${hk.pool})`, hk.s1.skill], [`Skill 2 (${hk.s2.cost} ${hk.pool})`, hk.s2.skill, SKILL2_LEVEL]]
    : [['Skill', kit.skill]];
  const tiers = hero ? TIER_SKILLS[hero] : undefined;
  if (tiers) rows.push(['Tier 2', tiers[0]], ['Tier 3', tiers[1]]);
  if (kit.ultimate) rows.push(['Ultimate', kit.ultimate, hero ? kit.ultimate.unlock : undefined]);
  rows.push(['Passive', kit.passive]);
  for (const [label, a, unlock] of rows) {
    const p = el('p');
    p.append(el('i', '', `${label} · ${a.name}: `), a.text);
    if (unlock) p.append(el('span', 'ultLock', ` Unlocks at level ${unlock}.`));
    box.append(p);
  }
}

/** Whether the combo has been seen in a fight. */
const comboSeen = (m: Meta, id: string): boolean => (m.combosSeen ?? []).includes(id);

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
    kitLines(box, KITS[kind], kind);
    const mine = COMBOS.filter((c) => c.heroes.includes(kind));
    if (mine.length) section(box, `${COMBO_NAME} (five heroes together)`, mine.map((c) => (comboSeen(m, c.id) ? `${c.name}: ${c.heroes.map((k) => UNITS[k].name).join(', ')}` : `${c.name}: not yet seen`)));
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

/** What `claim` is called with to take the new entries' stones (a milestone's id otherwise). */
export const ENTRIES_CLAIM = 'entries';

/**
 * The Codex page: the progress with its milestone rewards, the two tabs, and the grid. `claim` is called with a milestone's id when
 * its Claim is tapped (or `ENTRIES_CLAIM` for the new entries' stones) (the home screen pays, saves, and draws the page again). `root` is the sub-page's box (the sheet opens over it).
 * The third tab lists the cinematics (seen ones can be watched again with `watch`).
 */
export function drawCodex(body: HTMLElement, m: Meta, claim: (id: string) => void, root: HTMLElement = body.parentElement ?? body, watch?: (sceneId: string) => void): void {
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
    // (the rewards, one row each: what it pays, what it takes, and whether it is taken, ready or still to earn)
    block.append(el('p', 'cxPays', `Each new entry pays ${ENTRY_STONES} summoning stone, and counts towards a reward. Paid ${crownsClaimed(m, c)} of ${crownsTotal(c)} crowns and ${stonesClaimed(m, c)} of ${stonesTotal(c)} summoning stones.`));
    const list = el('div', 'cxRewards');
    for (const ms of milestonesOf(c)) {
      const done = milestoneClaimed(m, ms);
      const ready = milestoneReached(m, ms) && !done;
      const row = el('div', `cxReward${done ? ' done' : ready ? ' ready' : ''}`);
      row.append(el('span', 'cxWhat', `${ms.percent}%: ${ms.need} ${c === 'bestiary' ? 'foes' : 'heroes'}`), el('span', 'cxPay', `+${ms.crowns} crowns, +${ms.stones} stone${ms.stones === 1 ? '' : 's'}`));
      if (ready) {
        const go = el('button', 'primary', 'Claim');
        go.addEventListener('click', () => claim(ms.id));
        row.append(go);
      } else row.append(el('span', 'cxState', done ? 'Claimed ✓' : `${ms.need - got} to go`));
      list.append(row);
    }
    block.append(list);
    head.append(block);
  }
  // (one button takes everything that waits: the milestones, and a stone for each new entry, named under it)
  const waiting = codexWaiting(m);
  const fresh = entriesWaiting(m).length;
  if (waiting.length || fresh) {
    const stones = stonesWaiting(m) + fresh * ENTRY_STONES;
    const crowns = crownsWaiting(m);
    const all = el('button', 'primary cxClaimAll', `Claim rewards: ${crowns ? `+${crowns} crowns, ` : ''}+${stones} stone${stones === 1 ? '' : 's'}`);
    all.addEventListener('click', () => {
      if (fresh) claim(ENTRIES_CLAIM);
      waiting.forEach((ms) => claim(ms.id));
    });
    if (fresh) head.prepend(el('p', 'cxPays cxNew', `${fresh} new entr${fresh === 1 ? 'y' : 'ies'} discovered: +${fresh * ENTRY_STONES} summoning stone${fresh * ENTRY_STONES === 1 ? '' : 's'} to claim.`));
    head.prepend(all);
  }
  body.append(head);

  const tabs = el('div', 'cxTabs');
  const grid = el('div', 'cxGrid');
  const fill = () => {
    grid.replaceChildren();
    grid.classList.toggle('scList', tabNow === 'scenes' || tabNow === 'combos' || tabNow === 'terrain');
    grid.classList.toggle('cxGrid', tabNow !== 'scenes' && tabNow !== 'combos' && tabNow !== 'terrain');
    if (tabNow === 'terrain') {
      // (the ground a battlefield can have, then the shapes it can take: what each does, always shown)
      for (const t of TERRAIN_INFO) {
        const row = el('div', 'scRow');
        const chip = el('i', 'cxChip');
        chip.style.background = t.swatch;
        const text = el('div');
        text.append(el('b', '', t.name), el('small', '', t.tip));
        row.append(chip, text);
        grid.append(row);
      }
      grid.append(el('small', 'cxSub', 'Battlefields'));
      for (const l of LAYOUT_LIST) {
        const row = el('div', 'scRow');
        const text = el('div');
        text.append(el('b', '', l.name), el('small', '', l.tip));
        row.append(text);
        grid.append(row);
      }
    } else if (tabNow === 'combos') {
      // (a combo is listed once it has been seen in a fight; until then a locked row gives the first hero as a hint)
      for (const c of COMBOS) {
        const seen = comboSeen(m, c.id);
        const row = el('div', `scRow${seen ? '' : ' locked'}`);
        const text = el('div');
        if (seen) text.append(el('b', '', `${c.name}: ${c.move}`), el('small', '', `${c.heroes.map((k) => UNITS[k].name).join(', ')}. ${c.text}.`));
        else text.append(el('b', '', '???'), el('small', '', `Five heroes who belong together, one of them the ${UNITS[c.heroes[0]].name}. Fight with all five to see what they do.`));
        row.append(text);
        grid.append(row);
      }
    } else if (tabNow === 'scenes') {
      for (const sc of sceneList(m)) {
        const row = el('div', `scRow${sc.seen ? '' : ' locked'}`);
        const text = el('div');
        text.append(el('b', '', sc.title), el('small', '', rulerWords(sc.more ? `${sc.text} (${sc.more} to find)` : sc.text, settings().ruler)));
        row.append(text);
        if (sc.seen && watch) {
          const b = el('button', '', 'Watch');
          b.addEventListener('click', () => watch(sc.id));
          row.append(b);
        }
        grid.append(row);
      }
    } else if (tabNow === 'bestiary') {
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
  const buttons = new Map<Collection | 'scenes' | 'combos' | 'terrain', HTMLButtonElement>();
  for (const c of [...COLLECTIONS, 'combos' as const, 'scenes' as const, 'terrain' as const]) {
    const t = el('button', `cxTab${c === tabNow ? ' on' : ''}`, c === 'scenes' ? 'Scenes' : c === 'terrain' ? 'Terrain' : c === 'combos' ? `${COMBO_NAME}s` : COLLECTION_NAMES[c]);
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
