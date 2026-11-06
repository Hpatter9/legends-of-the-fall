// The Houses (docs/design/legends-expansion.md sections 3.7 and 5.2; docs/notes/dynasty-5.md): Dynasties' family tree, a full page, and
// the Seasons' card from the camp's top bar. Phase 5 has the first generation: every owned kind's line, its bearer (portrait, name and
// generation, stage and age, fate), the kindred lines its gold threads run to, and the years it has served. Heirs, heirlooms and the
// fallen come with later phases, and grow the same page downwards (generations top to bottom, which suits an upright phone).
// Built with the standard ornate menu (UI-STANDARD): full pages say "‹ Back", cards "Close". Nothing glows or pulses; an aged bearer's
// portrait wears the same steady grade as its sprite.
//
// The icons are placeholders from the item art until Dynasties' own are made (the prompts are in docs/notes/dynasty-5.md).

import { menuChoice, menuFoot, menuNote, menuPick, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import { portrait } from './render/sheets';
import { BOND_NAMES, bondKey, KINDRED, levelOf as bondLevelOf } from './sim/bonds';
import { agingAtTurn, ageWords, isAgeless, bearerOf, DYNASTY, lineOf, lookWords, romanGen, seasonLine, seasonOf, SEASON_WORDS, stageAge, stageOf, STAGE_FROM, STAGE_WORDS, STAGES, toNextStage, wavesThisSeason, type Aged, type SeasonName, type Stage } from './sim/dynasty';
import { SEASON_LINES } from './sim/dynastyWords';
import { HERO_NAMES, heroName } from './sim/heroNames';
import type { Meta } from './sim/meta';
import { UNITS } from './sim/units';
import springIcon from './art/items/moss_bell.png';
import summerIcon from './art/items/sun_crown.png';
import autumnIcon from './art/items/copper_torc.png';
import winterIcon from './art/items/rime_pearl.png';
import mentorIcon from './art/items/scholar_scroll.png';
import houseIcon from './art/items/founders_ledger.png';

/** The season icons (placeholders from the item art until the four are made). */
export const SEASON_ICON: Readonly<Record<SeasonName, string>> = { spring: springIcon, summer: summerIcon, autumn: autumnIcon, winter: winterIcon };
/** The fate icons (phase 5 has the mentor's; the rest come with the heirs and the Oath). */
export const FATE_ICON: Readonly<Record<string, string>> = { mentor: mentorIcon };
export const HOUSE_ICON = houseIcon;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const icon = (src: string, cls: string): HTMLImageElement => {
  const i = el('img', cls);
  i.src = src;
  i.alt = '';
  i.setAttribute('aria-hidden', 'true');
  return i;
};

/** The toasts for stages reached at a season's turn: an honour, said as one ("Kwame is a Veteran now: six seasons on the road"). */
export function agedLines(aged: readonly Aged[]): string[] {
  return aged.map((a) => {
    const what = a.to === 'elder' ? 'an Elder' : a.to === 'veteran' ? 'a Veteran' : 'in the Prime of life';
    const look = lookWords(a.kind, a.to);
    return `${a.name} is ${what} now, ${a.served} seasons on the road${look ? `: ${look}` : ''}${a.to === 'elder' ? '. Elder’s Counsel: +5% XP to the party' : ''}`;
  });
}

/** A bearer's face: the kind's portrait, in the steady grade of its stage, the generation on its corner. */
export function bearerFace(kind: string, stage: Stage, gen: number, size: number): HTMLElement {
  const box = el('span', `hsFace ${stage}`);
  const sheet = UNITS[kind]?.sheet;
  if (sheet) box.append(portrait(sheet, size));
  box.append(el('i', 'hsGen', romanGen(gen)));
  box.setAttribute('aria-hidden', 'true');
  return box;
}

/** The kinds with a line, in the roster's order. */
const lineKinds = (m: Meta): string[] => m.unlocked.filter((k) => !!lineOf(m, k));

type Filter = 'all' | 'veteran' | 'elder';
const FILTERS: readonly Filter[] = ['all', 'veteran', 'elder'];
const FILTER_WORD: Readonly<Record<Filter, string>> = { all: 'All', veteran: 'Veterans', elder: 'Elders' };

/** The camp's top-bar chip: the season's icon and name. */
export function seasonChip(m: Meta, day: number, onOpen: () => void): HTMLButtonElement | null {
  if (!m.dynasty) return null;
  const s = seasonOf(m.dynasty, day);
  const b = el('button', 'chip hsSeasonChip');
  b.id = 'hmSeason';
  b.type = 'button';
  b.append(icon(SEASON_ICON[s.name], 'hsSeasonIco'), el('b', '', SEASON_WORDS[s.name]));
  b.setAttribute('aria-label', `${seasonLine(m.dynasty, day)}, ${s.daysLeft} ${s.daysLeft === 1 ? 'day' : 'days'} left. Open the season`);
  b.addEventListener('click', onOpen);
  return b;
}

/** The Seasons' card: the season, its days left, what it is like, and the heroes who will age at its turn. */
export function openSeasonCard(m: Meta, day: number, houses: () => void): OrnateMenu | null {
  const d = m.dynasty;
  if (!d) return null;
  const s = seasonOf(d, day);
  const menu = ornateMenu({ id: 'seasonCard', eyebrow: 'Dynasties · The Seasons', title: SEASON_WORDS[s.name], sub: `Year ${s.year} of the War · ${s.daysLeft} ${s.daysLeft === 1 ? 'day' : 'days'} left` });
  menu.card.classList.add('hsCard');
  const top = menuWell(menu.body);
  top.classList.add('hsSeasonWell');
  top.append(icon(SEASON_ICON[s.name], 'hsSeasonBig'), el('p', '', SEASON_LINES[s.name]));
  const turning = agingAtTurn(m, day);
  const at = menuSection(menu.body, 'At the turn of the season', turning.length ? `${turning.length} will have served it` : 'nobody yet', 2);
  if (!turning.length) menuNote(at.parentElement!, `A hero serves a season by fighting ${DYNASTY.SEASON_WAVES} waves in it. The bench never ages.`);
  for (const t of turning.slice(0, 8)) {
    const row = menuChoice(at, { title: t.name, lines: [t.stageUp ? `${t.served} seasons served: ${STAGE_WORDS[t.to]} at the turn` : `${t.served} seasons served: ${t.served + 1} at the turn`] });
    row.classList.add('hsRow');
    row.prepend(bearerFace(t.kind, stageOf(t.served), bearerOf(m, t.kind)?.gen ?? 1, 40));
    row.disabled = true;
  }
  // (the party's heroes on the road this season, and how far each is towards serving it)
  const road = m.party.filter((k) => lineOf(m, k) && !turning.some((t) => t.kind === k));
  if (road.length) {
    const grid = menuSection(menu.body, 'On the road', `${DYNASTY.SEASON_WAVES} waves serve a season`, 2);
    for (const k of road) {
      const b = bearerOf(m, k)!;
      const row = menuChoice(grid, { title: b.name, lines: [`${wavesThisSeason(m, k, day)} of ${DYNASTY.SEASON_WAVES} waves · ${STAGE_WORDS[stageOf(b.served)]}`] });
      row.classList.add('hsRow');
      row.prepend(bearerFace(k, stageOf(b.served), b.gen, 40));
      row.disabled = true;
    }
  }
  menuNote(menu.body, 'Ageing takes nothing away: a Veteran and an Elder keep every level, rank, talent and piece of gear, and fight at full strength for ever.');
  menuFoot(menu, { back: { word: 'close' }, primary: { label: 'The Houses', onClick: () => { menu.close(); houses(); } } });
  return menu;
}

/** The Houses: the line picker (every owned kind's current bearer, with its generation), filtered by stage. A line opens its page. */
export function openHouses(m: Meta, day: number, focus?: string): OrnateMenu | null {
  const d = m.dynasty;
  if (!d) return null;
  const menu = ornateMenu({ id: 'housesPage', eyebrow: 'Dynasties', title: 'The Houses', sub: seasonLine(d, day), kind: 'sheet', label: 'The Houses: your heroes’ lines' });
  menu.card.classList.add('hsPage');
  const tabs = menuSection(menu.body, undefined, undefined, 3);
  tabs.classList.add('hsTabs');
  const pane = el('div', 'hsPane');
  menu.body.append(pane);
  let shown: Filter = 'all';
  const draw = () => {
    pane.replaceChildren();
    const kinds = lineKinds(m).filter((k) => shown === 'all' || stageOf(bearerOf(m, k)!.served) === shown);
    const grid = menuSection(pane, shown === 'all' ? 'The lines' : FILTER_WORD[shown], `${kinds.length} ${kinds.length === 1 ? 'House' : 'Houses'}`, 4);
    grid.classList.add('hsLines');
    for (const k of kinds) {
      const b = bearerOf(m, k)!;
      const st = stageOf(b.served);
      const row = menuChoice(grid, { title: b.name, lines: [STAGE_WORDS[st]], onPick: () => openLine(m, k, day) });
      row.classList.add('hsLine', st);
      row.prepend(bearerFace(k, st, b.gen, 48));
      if (b.fate && FATE_ICON[b.fate]) row.append(icon(FATE_ICON[b.fate], 'hsFate'));
      row.setAttribute('aria-label', `${b.name}, ${UNITS[k]?.name ?? k}, generation ${b.gen}, ${stageAge(k, b.served)}${b.fate === 'mentor' ? ', mentoring in the Hall of Legends' : ''}. Open the House`);
    }
    if (!kinds.length) menuNote(pane, shown === 'elder' ? `No Elder yet. A hero is an Elder after ${STAGE_FROM.elder} seasons served.` : `No Veteran yet. A hero is a Veteran after ${STAGE_FROM.veteran} seasons served.`);
    menuNote(pane, `A season is ${DYNASTY.SEASON_DAYS} days. A hero serves it by fighting ${DYNASTY.SEASON_WAVES} waves in it (an auto-replayed wave counts half): only those on the road grow older.`);
  };
  menuPick(tabs, FILTERS, shown, (f) => ({ title: FILTER_WORD[f] }), (f) => {
    shown = f;
    draw();
    menu.body.scrollTop = 0;
  });
  draw();
  menuFoot(menu, { back: { word: 'back' } });
  if (focus && lineOf(m, focus)) openLine(m, focus, day);
  return menu;
}

/** A line's page: its bearers top to bottom (one generation in phase 5), the kindred lines its threads run to, and the years. */
export function openLine(m: Meta, kind: string, day: number): OrnateMenu | null {
  const line = lineOf(m, kind);
  if (!line) return null;
  const first = line.bearers[0];
  const cur = line.bearers[line.current];
  const menu = ornateMenu({ id: 'houseLine', eyebrow: 'The Houses', title: `The House of ${first.name}`, sub: `${UNITS[kind]?.name ?? kind} · Gen ${romanGen(cur.gen)} · ${line.bearers.length} ${line.bearers.length === 1 ? 'bearer' : 'bearers'}`, kind: 'sheet' });
  menu.card.classList.add('hsPage');
  // (generations top to bottom)
  const gens = [...new Set(line.bearers.map((b) => b.gen))].sort((a, b) => a - b);
  for (const g of gens) {
    const grid = menuSection(menu.body, `Generation ${romanGen(g)}`, g === cur.gen ? 'bears the name now' : '', 2);
    grid.classList.add('hsGenRow');
    line.bearers.forEach((b, i) => {
      if (b.gen !== g) return;
      const st = stageOf(b.served);
      const lines: (string | [string, 'pay' | 'lock'])[] = [stageAge(kind, b.served), `${b.served} ${b.served === 1 ? 'season' : 'seasons'} served`];
      if (b.fate === 'mentor') lines.push('Mentoring in the Hall of Legends');
      if (st === 'elder') lines.push(['Elder’s Counsel: +5% XP to the party', 'pay']);
      const row = menuChoice(grid, { title: b.name, lines, onPick: () => openBearer(m, kind, i, day) });
      row.classList.add('hsBearer', st);
      row.prepend(bearerFace(kind, st, b.gen, 64));
      if (b.fate && FATE_ICON[b.fate]) row.append(icon(FATE_ICON[b.fate], 'hsFate'));
    });
  }
  // (the gold threads: the kindred lines this House is bonded to, their bond's name; a tap goes to that House)
  const kin = KINDRED.map((key) => key.split('|')).filter((p) => p.includes(kind)).map((p) => (p[0] === kind ? p[1] : p[0]));
  if (kin.length) {
    const grid = menuSection(menu.body, 'Kindred Houses', 'the gold threads between the lines', 2);
    grid.classList.add('hsKin');
    for (const k of kin) {
      const owned = !!lineOf(m, k);
      const lv = bondLevelOf(m, bondKey(kind, k));
      const name = bearerOf(m, k)?.name ?? HERO_NAMES[k]?.name ?? k;
      const row = menuChoice(grid, { title: owned ? name : 'Not yet met', lines: [owned ? `${BOND_NAMES[lv] || 'Strangers'} · the House of ${HERO_NAMES[k]?.name ?? name}` : `a ${UNITS[k]?.name ?? k} still to find`], disabled: !owned, onPick: () => { menu.close(); openLine(m, k, day); } });
      row.classList.add('hsRow', 'hsThread');
      if (owned) row.prepend(bearerFace(k, stageOf(bearerOf(m, k)!.served), bearerOf(m, k)!.gen, 40));
    }
  }
  // (the years: the four stages, the bearer's own lit)
  const st = stageOf(cur.served);
  const years = menuSection(menu.body, 'The years', `${wavesThisSeason(m, kind, day)} of ${DYNASTY.SEASON_WAVES} waves this season`, 4);
  years.classList.add('hsYears');
  for (const s of STAGES) {
    const row = menuChoice(years, { title: STAGE_WORDS[s], lines: [`${STAGE_FROM[s]}+ seasons`], on: s === st });
    row.disabled = s !== st;
  }
  menuNote(menu.body, 'A House keeps everything its hero has earned: level, ranks, talents, books, gear and skills belong to the line, and the years take none of it.');
  menuFoot(menu, { back: { word: 'back' } });
  return menu;
}

/** A bearer's card: the face in its look, the years, its fate, and its memory. */
export function openBearer(m: Meta, kind: string, index: number, day: number): OrnateMenu | null {
  const line = lineOf(m, kind);
  const b = line?.bearers[index];
  if (!line || !b) return null;
  const st = stageOf(b.served);
  const menu = ornateMenu({ id: 'bearerCard', eyebrow: `The House of ${line.bearers[0].name} · Gen ${romanGen(b.gen)}`, title: b.name, sub: `${UNITS[kind]?.name ?? kind} · ${stageAge(kind, b.served)}` });
  menu.card.classList.add('hsCard');
  const top = menuWell(menu.body);
  top.classList.add('hsBearerWell');
  top.append(bearerFace(kind, st, b.gen, 96));
  const words = el('div', 'hsWords');
  const look = lookWords(kind, st);
  words.append(el('b', '', heroName(kind) === b.name ? `${b.name}, ${HERO_NAMES[kind]?.title ?? ''}` : b.name), el('small', '', look ? `The years show: ${look}.` : st === 'youth' ? 'Young, and new to the road.' : 'In the prime of life.'));
  top.append(words);
  const grid = menuSection(menu.body, 'Seasons served', isAgeless(kind) ? ageWords(kind, b.served) : `age ${ageWords(kind, b.served)}`, 2);
  const next = toNextStage(b.served);
  const fact = (g: HTMLElement, title: string, lines: (string | [string, 'pay' | 'lock'])[]) => {
    const row = menuChoice(g, { title, lines });
    row.disabled = true;
    row.classList.add('hsFact');
  };
  fact(grid, `${b.served} ${b.served === 1 ? 'season' : 'seasons'}`, [next ? `${STAGE_WORDS[STAGES[STAGES.indexOf(st) + 1]]} in ${next} more` : 'An Elder of the House']);
  if (index === line.current) fact(grid, `${wavesThisSeason(m, kind, day)} of ${DYNASTY.SEASON_WAVES}`, ['waves fought this season']);
  if (st === 'elder' || b.fate) {
    const h = menuSection(menu.body, 'Honours', undefined, 2);
    if (st === 'elder') fact(h, 'Elder’s Counsel', [['+5% XP to the rest of the party while fielded', 'pay']]);
    if (b.fate === 'mentor') fact(h, 'Mentor', ['a seat in the Hall of Legends']);
  }
  const mem = menuSection(menu.body, 'Remembered', undefined, 2);
  const well = menuWell(mem.parentElement!);
  mem.remove();
  well.classList.add('hsMemory');
  for (const l of b.memory?.length ? b.memory : ['No stories told yet: they are made on the road.']) well.append(el('p', '', l));
  menuFoot(menu, { back: { word: 'close' } });
  return menu;
}
