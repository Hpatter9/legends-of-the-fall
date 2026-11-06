// The Houses (docs/design/legends-expansion.md sections 3.3 to 3.7 and 5.2; docs/notes/dynasty-5.md and dynasty-6.md): Dynasties' family
// tree, a full page, and the Seasons' card from the camp's top bar. Every owned kind's line, its bearers top to bottom (generations grow the
// page downwards, which suits an upright phone), the partner who shares each heir on a gold thread, the cadets passed over in grey, the
// heirlooms, the honours, and the years. Phase 6 adds the heirs: naming one with a Sworn partner, its training, the two candidates,
// Passing the Mantle with its heirloom and the elder's honour (with the farewell), changing an honour, fielding an elder, and the
// Elders' table at the tavern.
// Built with the standard ornate menu (UI-STANDARD): full pages say "‹ Back", cards "Close". Nothing glows or pulses; a bearer's portrait
// wears the same steady grade as its sprite (the years, and an heir's tint).
//
// The icons are placeholders from the item art until Dynasties' own are made (the prompts are in docs/notes/dynasty-5.md and dynasty-6.md).

import { menuChoice, menuFoot, menuNote, menuPick, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import { portrait } from './render/sheets';
import { toastLines } from './achievementsView';
import { BOND_NAMES, bondKey, KINDRED, levelOf as bondLevelOf } from './sim/bonds';
import { agingAtTurn, ageWords, isAgeless, bearerOf, DYNASTY, fieldedOf, lineOf, lookWords, romanGen, seasonLine, seasonOf, SEASON_WORDS, stageAge, stageOf, STAGE_FROM, STAGE_WORDS, STAGES, toNextStage, wavesThisSeason, type Aged, type Bearer, type SeasonName, type Stage } from './sim/dynasty';
import { SEASON_LINES } from './sim/dynastyWords';
import { HERO_NAMES, heroName } from './sim/heroNames';
import { saveMeta, type Meta } from './sim/meta';
import { UNITS } from './sim/units';
import { lookMatrix } from './sim/heroLooks';
import { PERKS } from './sim/legacy';
import { heirloomLine, itemName, SLOT_NAMES } from './sim/equipment';
import {
  askRide, bannerChoices, bearerName, birthrightWords, cadetsOf, cadetVisiting, changeHonour, farewellLines, fieldBearer, hasHeirs, hearStory, heirLine, heirloomChoices, heirloomSlot, heirPartners, heirPicks, heirStageNote, heirState, HEIRS,
  HONOUR_LINES, HONOUR_WORDS, HONOURS, honourLock, nameHeir, passMantle, promiseLeft, regularOf, seatedToday, storyOf, storyteller, storyWaits, trainWords, whyNoHeir, whyNoMantle, whyNoRide, whyNotHonour, type Honour, type Mantle,
} from './sim/heirs';
import { todayKey } from './modes';
import springIcon from './art/items/moss_bell.png';
import summerIcon from './art/items/sun_crown.png';
import autumnIcon from './art/items/copper_torc.png';
import winterIcon from './art/items/rime_pearl.png';
import mentorIcon from './art/items/scholar_scroll.png';
import regularIcon from './art/items/holy_chalice.png';
import shadeIcon from './art/items/shadow_cloak.png';
import houseIcon from './art/items/founders_ledger.png';
import heirloomIcon from './art/items/gold_band.png';
import fallenIcon from './art/items/ember_brand.png';
import legendIcon from './art/items/saint_medal.png';
import { hasFallen, isLegend, mourningLeft, OATH, whyShadeHonour } from './sim/oath';
import { openNemesisCard } from './nemesisView';

/** The season icons (placeholders from the item art until the four are made). */
export const SEASON_ICON: Readonly<Record<SeasonName, string>> = { spring: springIcon, summer: summerIcon, autumn: autumnIcon, winter: winterIcon };
/** The fate icons (placeholders from the item art: the scroll, the chalice, the cloak, the ember brand for the fallen's candle; the Legend's
 *  laurel is the saint's medal). */
export const FATE_ICON: Readonly<Record<string, string>> = { mentor: mentorIcon, regular: regularIcon, shade: shadeIcon, fallen: fallenIcon };
export const LEGEND_ICON = legendIcon;
export const HOUSE_ICON = houseIcon;
export const HEIRLOOM_ICON = heirloomIcon;

const DAY_MS = 24 * 60 * 60 * 1000;
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
const kindName = (k: string): string => UNITS[k]?.name ?? k;
const founder = (k: string): string => HERO_NAMES[k]?.name ?? k;

/** The toasts for stages reached at a season's turn: an honour, said as one ("Kwame is a Veteran now: six seasons on the road"). */
export function agedLines(aged: readonly Aged[]): string[] {
  return aged.map((a) => {
    const what = a.to === 'elder' ? 'an Elder' : a.to === 'veteran' ? 'a Veteran' : 'in the Prime of life';
    const look = lookWords(a.kind, a.to);
    return `${a.name} is ${what} now, ${a.served} seasons on the road${look ? `: ${look}` : ''}${a.to === 'elder' ? '. Elder’s Counsel: +5% XP to the party' : ''}`;
  });
}

/** The page's colour filters for the portraits' looks (`lookMatrix`, the sprites' own grade), one SVG filter a look, made once. */
const lookFilters = new Map<string, string>();
function lookFilter(kind: string, stage: Stage, look?: string): string | null {
  const m = lookMatrix(kind, stage, look);
  if (!m) return null;
  const key = m.map((x) => x.toFixed(4)).join(' ');
  let id = lookFilters.get(key);
  if (!id) {
    id = `hsLook${lookFilters.size}`;
    lookFilters.set(key, id);
    let svg = document.getElementById('hsLooks') as Element | null;
    if (!svg) {
      const made = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      made.id = 'hsLooks';
      made.setAttribute('width', '0');
      made.setAttribute('height', '0');
      made.setAttribute('aria-hidden', 'true');
      made.style.position = 'absolute';
      document.body.append(made);
      svg = made;
    }
    const f = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    f.id = id;
    f.setAttribute('color-interpolation-filters', 'sRGB');
    const cm = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
    cm.setAttribute('type', 'matrix');
    cm.setAttribute('values', key);
    f.append(cm);
    svg.append(f);
  }
  return `url(#${id})`;
}

/** A bearer's face: the kind's portrait, in the steady grade of its stage and its heir's tint, the generation on its corner. */
export function bearerFace(kind: string, stage: Stage, gen: number, size: number, look?: string): HTMLElement {
  const box = el('span', `hsFace ${stage}`);
  const sheet = UNITS[kind]?.sheet;
  if (sheet) {
    const c = portrait(sheet, size);
    const f = lookFilter(kind, stage, look);
    if (f) c.style.filter = f;
    box.append(c);
  }
  box.append(el('i', 'hsGen', romanGen(gen)));
  box.setAttribute('aria-hidden', 'true');
  return box;
}
const faceOf = (kind: string, b: Bearer, size: number): HTMLElement => bearerFace(kind, stageOf(b.served), b.gen, size, b.look);

/** The kinds with a line, in the roster's order. */
const lineKinds = (m: Meta): string[] => m.unlocked.filter((k) => !!lineOf(m, k));

type Filter = 'all' | 'heirs' | 'veteran' | 'elder' | 'fallen';
const FILTERS: readonly Filter[] = ['all', 'heirs', 'veteran', 'elder', 'fallen'];
const FILTER_WORD: Readonly<Record<Filter, string>> = { all: 'All', heirs: 'With heirs', veteran: 'Veterans', elder: 'Elders', fallen: 'The fallen' };
/** Whether a line is shown under a filter. */
const shownUnder = (m: Meta, k: string, f: Filter): boolean => f === 'all' || (f === 'heirs' ? hasHeirs(lineOf(m, k)) : f === 'fallen' ? hasFallen(lineOf(m, k)) : stageOf(bearerOf(m, k)!.served) === f);

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
    row.prepend(bearerFace(t.kind, stageOf(t.served), bearerOf(m, t.kind)?.gen ?? 1, 40, bearerOf(m, t.kind)?.look));
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
      row.prepend(faceOf(k, b, 40));
      row.disabled = true;
    }
  }
  menuNote(menu.body, 'Ageing takes nothing away: a Veteran and an Elder keep every level, rank, talent and piece of gear, and fight at full strength for ever.');
  menuFoot(menu, { back: { word: 'close' }, primary: { label: 'The Houses', onClick: () => { menu.close(); houses(); } } });
  return menu;
}

/** The Houses: the line picker (every owned kind's current bearer, with its generation), filtered. A line with a trained heir wears a
 *  steady gold frame. A line opens its page. */
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
  const now = Date.now();
  const draw = () => {
    pane.replaceChildren();
    const kinds = lineKinds(m).filter((k) => shownUnder(m, k, shown));
    const grid = menuSection(pane, shown === 'all' ? 'The lines' : FILTER_WORD[shown], `${kinds.length} ${kinds.length === 1 ? 'House' : 'Houses'}`, 4);
    grid.classList.add('hsLines');
    for (const k of kinds) {
      const b = bearerOf(m, k)!;
      const st = stageOf(b.served);
      const ready = heirState(m, k, now).state === 'ready';
      const mourn = mourningLeft(m, k, day);
      const row = menuChoice(grid, { title: b.name, lines: [mourn ? 'In mourning' : b.fate === 'fallen' ? 'Fallen' : ready ? 'Heir ready' : STAGE_WORDS[st]], onPick: () => openLine(m, k, day) });
      row.classList.add('hsLine', st);
      if (ready) row.classList.add('hsReady');
      if (b.fate === 'fallen') row.classList.add('hsFallen');
      if (isLegend(b)) row.classList.add('hsLegend');
      row.prepend(faceOf(k, b, 48));
      if (b.fate && FATE_ICON[b.fate]) row.append(icon(FATE_ICON[b.fate], 'hsFate'));
      row.setAttribute('aria-label', `${b.name}, ${kindName(k)}, generation ${b.gen}, ${stageAge(k, b.served)}${b.fate === 'mentor' ? ', mentoring in the Hall of Legends' : ''}${ready ? ', an heir is ready' : ''}. Open the House`);
    }
    if (!kinds.length)
      menuNote(
        pane,
        shown === 'heirs'
          ? `No heir yet. ${heirStageNote} It needs level ${HEIRS.LEVEL} and a kindred partner at Sworn.`
          : shown === 'fallen'
            ? 'No bearer has fallen. Under the Legend Oath (Hard or harder, from the first Passing of the Mantle) a hero who falls twice in a run, or in a wave that is lost, is slain: the progress stays, the person does not.'
          : shown === 'elder'
            ? `No Elder yet. A hero is an Elder after ${STAGE_FROM.elder} seasons served.`
            : `No Veteran yet. A hero is a Veteran after ${STAGE_FROM.veteran} seasons served.`,
      );
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

/** How many generations a line's page shows before it folds the oldest into "The founders". */
const SHOWN_GENS = 6;

/** A line's page: its bearers top to bottom, the partner of each heir on a gold thread between the generations, the cadets in grey, the
 *  heir in training, the kindred lines its threads run to, and the years. */
export function openLine(m: Meta, kind: string, day: number): OrnateMenu | null {
  const line = lineOf(m, kind);
  if (!line) return null;
  const first = line.bearers[0];
  const cur = line.bearers[line.current];
  const now = Date.now();
  const menu = ornateMenu({ id: 'houseLine', eyebrow: 'The Houses', title: `The House of ${first.name}`, sub: `${kindName(kind)} · Gen ${romanGen(cur.gen)} · ${line.bearers.filter((b) => !b.cadet).length} ${line.bearers.filter((b) => !b.cadet).length === 1 ? 'bearer' : 'bearers'}`, kind: 'sheet' });
  menu.card.classList.add('hsPage');
  const reopen = () => {
    menu.close();
    openLine(m, kind, day);
  };
  // (generations top to bottom; a line deeper than six folds its oldest into "The founders")
  const gens = [...new Set(line.bearers.map((b) => b.gen))].sort((a, b) => a - b);
  const folded = gens.length > SHOWN_GENS ? gens.slice(0, gens.length - SHOWN_GENS) : [];
  if (folded.length) {
    const sec = menuSection(menu.body, `The founders (${folded.length})`, 'the oldest generations', 2);
    const well = menuWell(sec.parentElement!);
    sec.remove();
    well.classList.add('hsFounders');
    for (const g of folded)
      for (const b of line.bearers.filter((x) => x.gen === g && !x.cadet)) well.append(el('p', '', `Gen ${romanGen(g)} · ${b.name}${b.fate ? ` · ${HONOUR_WORDS[b.fate as Honour] ?? b.fate}` : ''}`));
  }
  for (const g of gens.filter((x) => !folded.includes(x))) {
    const heirB = line.bearers.find((b) => b.gen === g && !b.cadet && b.partner);
    // (between the generations, the partner who shared the heir, on a gold thread; a tap goes to that House)
    if (heirB?.partner) {
      const thread = menuSection(menu.body, undefined, undefined, 2);
      thread.classList.add('hsThreadRow');
      const p = heirB.partner;
      const owned = !!lineOf(m, p);
      const row = menuChoice(thread, { title: heirB.parents?.[1] ?? founder(p), lines: [`the other parent · the House of ${founder(p)}`, `the heir of ${heirB.parents?.[0] ?? ''} and ${heirB.parents?.[1] ?? ''}`], disabled: !owned, onPick: () => { menu.close(); openLine(m, p, day); } });
      row.classList.add('hsRow', 'hsThread', 'hsPartner');
      const pb = bearerOf(m, p);
      if (pb) row.prepend(faceOf(p, pb, 40));
    }
    const grid = menuSection(menu.body, `Generation ${romanGen(g)}`, g === cur.gen ? 'bears the name now' : '', 2);
    grid.classList.add('hsGenRow');
    line.bearers.forEach((b, i) => {
      if (b.gen !== g) return;
      const st = stageOf(b.served);
      if (b.cadet) {
        // (the passed-over candidate hangs to the side, in grey)
        const row = menuChoice(grid, { title: `${b.name}, passed over`, lines: ['the cadet line: visits the tavern now and then'], onPick: () => openBearer(m, kind, i, day) });
        row.classList.add('hsRow', 'hsCadet');
        row.prepend(faceOf(kind, b, 40));
        return;
      }
      const lines: (string | [string, 'pay' | 'lock'])[] = [stageAge(kind, b.served), `${b.served} ${b.served === 1 ? 'season' : 'seasons'} served`];
      if (b.fate) lines.push(fateWords(b));
      if (isLegend(b)) lines.push(['A Legend of the Oath', 'pay']);
      else if (b.legend) lines.push(`Legend renown: ${b.legend} of ${OATH.LEGEND} Oath clears`);
      if (b.foundling) lines.push('A foundling heir');
      if (i === line.current && line.mourning) lines.push([`The House mourns: ${mourningLeft(m, kind, day)} more ${mourningLeft(m, kind, day) === 1 ? 'day' : 'days'}`, 'lock']);
      if (i === line.current && b.fate !== 'mentor' && st === 'elder') lines.push(['Elder’s Counsel: +5% XP to the party', 'pay']);
      if (b.birthright) lines.push(['Birthright · ' + birthrightWords(b), 'pay']);
      if (i !== line.current && line.field === i) lines.push(['Fielded in the heir’s place', 'pay']);
      const row = menuChoice(grid, { title: b.name, lines, onPick: () => openBearer(m, kind, i, day) });
      row.classList.add('hsBearer', st);
      if (b.fate === 'fallen') row.classList.add('hsFallen');
      if (isLegend(b)) row.classList.add('hsLegend');
      row.prepend(faceOf(kind, b, 64));
      if (b.fate && FATE_ICON[b.fate]) row.append(icon(FATE_ICON[b.fate], 'hsFate'));
      // (the fallen: the slayer's chip; a tap opens its card while it lives)
      if (b.fate === 'fallen') slayerChip(m, b, row);
      if (b.heirloom !== undefined) {
        const it = (m.equipment ?? []).find((x) => x.id === b.heirloom);
        if (it) {
          const chip = el('small', 'omLine hsHeirloomChip');
          chip.append(icon(heirloomIcon, 'hsChipIco'), `Heirloom: ${itemName(it)}`);
          row.append(chip);
        }
      }
    });
  }
  // (the heir in training, or ready)
  const st = heirState(m, kind, now);
  if (st.state !== 'none') {
    const sec = menuSection(menu.body, 'The heir', st.state === 'ready' ? 'trained and waiting' : trainWords(st.left), 2);
    const row = menuChoice(sec, {
      title: st.state === 'ready' ? 'Choose the heir' : `In training with ${bearerName(m, st.partner)}`,
      lines: [st.state === 'ready' ? ['Two candidates wait: pass the mantle', 'pay'] : 'A ward at the castle, as study is'],
      onPick: () => (st.state === 'ready' ? openMantle(m, kind, day, reopen) : openBearer(m, kind, line.current, day)),
    });
    row.classList.add('hsRow');
    if (st.state === 'ready') row.classList.add('hsReady');
  }
  // (the gold threads: the kindred lines this House is bonded to, their bond's name; a tap goes to that House)
  const kin = KINDRED.map((key) => key.split('|')).filter((p) => p.includes(kind)).map((p) => (p[0] === kind ? p[1] : p[0]));
  if (kin.length) {
    const grid = menuSection(menu.body, 'Kindred Houses', 'the gold threads between the lines', 2);
    grid.classList.add('hsKin');
    for (const k of kin) {
      const owned = !!lineOf(m, k);
      const lv = bondLevelOf(m, bondKey(kind, k));
      const name = bearerOf(m, k)?.name ?? founder(k);
      const row = menuChoice(grid, { title: owned ? name : 'Not yet met', lines: [owned ? `${BOND_NAMES[lv] || 'Strangers'} · the House of ${founder(k)}` : `a ${kindName(k)} still to find`], disabled: !owned, onPick: () => { menu.close(); openLine(m, k, day); } });
      row.classList.add('hsRow', 'hsThread');
      if (owned) row.prepend(faceOf(k, bearerOf(m, k)!, 40));
    }
  }
  // (the years: the four stages, the bearer's own lit)
  const cst = stageOf(cur.served);
  const years = menuSection(menu.body, 'The years', `${wavesThisSeason(m, kind, day)} of ${DYNASTY.SEASON_WAVES} waves this season`, 4);
  years.classList.add('hsYears');
  for (const s of STAGES) {
    const row = menuChoice(years, { title: STAGE_WORDS[s], lines: [`${STAGE_FROM[s]}+ seasons`], on: s === cst });
    row.disabled = s !== cst;
  }
  menuNote(menu.body, 'A House keeps everything its hero has earned: level, ranks, talents, books, gear and skills belong to the line, and pass to the heir whole.');
  menuFoot(menu, { back: { word: 'back' } });
  return menu;
}

/** A bearer's honour in words. */
function fateWords(b: Bearer): string {
  if (b.fate === 'mentor') return 'Mentoring in the Hall of Legends';
  if (b.fate === 'regular') return 'A regular at the Elders’ table';
  if (b.fate === 'shade') return 'A Shade, waiting on the War Horn';
  if (b.fate === 'fallen') return 'Fallen under the Oath: a Shade on the War Horn';
  return '';
}

/** The slayer's chip on a fallen bearer's row: "Slain by Gash, Ravi-Killer · still living" (a tap opens the nemesis's card), or gone. */
function slayerChip(m: Meta, b: Bearer, row: HTMLElement): void {
  const n = b.slainBy !== undefined ? m.war?.members.find((x) => x.id === b.slainBy) : undefined;
  const chip = el('small', 'omLine hsSlayerChip');
  chip.append(icon(fallenIcon, 'hsChipIco'), b.slayer ? `Slain by ${b.slayer} · ${n ? 'still living' : 'gone from the War'}` : 'Slain under the Oath');
  if (n) {
    chip.classList.add('hsTap');
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      openNemesisCard(m, n);
    });
  }
  row.append(chip);
}

/** A bearer's card: the face in its look, the years, its birthright, heirloom, Blood Grudge and honour, its memory, and what it can do:
 *  for the current bearer, name an heir, the training, or pass the mantle; for an elder, change its honour and take the field. */
export function openBearer(m: Meta, kind: string, index: number, day: number): OrnateMenu | null {
  const line = lineOf(m, kind);
  const b = line?.bearers[index];
  if (!line || !b) return null;
  const now = Date.now();
  const st = stageOf(b.served);
  const isCur = index === line.current;
  const menu = ornateMenu({ id: 'bearerCard', eyebrow: `The House of ${line.bearers[0].name} · Gen ${romanGen(b.gen)}`, title: b.name, sub: `${kindName(kind)} · ${b.cadet ? 'passed over' : stageAge(kind, b.served)}` });
  menu.card.classList.add('hsCard');
  const reopen = () => {
    menu.close();
    document.getElementById('houseLine')?.dispatchEvent(new Event('omclose'));
    openLine(m, kind, day);
    openBearer(m, kind, index, day);
  };
  const top = menuWell(menu.body);
  top.classList.add('hsBearerWell');
  if (b.fate === 'fallen') top.classList.add('hsFallen');
  if (isLegend(b)) top.classList.add('hsLegend');
  top.append(faceOf(kind, b, 96));
  const words = el('div', 'hsWords');
  const look = lookWords(kind, st);
  words.append(
    el('b', '', heroName(kind) === b.name ? `${b.name}, ${HERO_NAMES[kind]?.title ?? ''}` : b.parents ? `${b.name}, heir of ${b.parents[0]} and ${b.parents[1]}` : b.name),
    el('small', '', b.cadet ? 'Passed over for the mantle. The cadet line visits the tavern now and then.' : look ? `The years show: ${look}.` : st === 'youth' ? 'Young, and new to the road.' : 'In the prime of life.'),
  );
  top.append(words);
  const fact = (g: HTMLElement, title: string, lines: (string | [string, 'pay' | 'lock'])[]) => {
    const row = menuChoice(g, { title, lines });
    row.disabled = true;
    row.classList.add('hsFact');
    return row;
  };
  if (!b.cadet) {
    const grid = menuSection(menu.body, 'Seasons served', isAgeless(kind) ? ageWords(kind, b.served) : `age ${ageWords(kind, b.served)}`, 2);
    const next = toNextStage(b.served);
    fact(grid, `${b.served} ${b.served === 1 ? 'season' : 'seasons'}`, [next ? `${STAGE_WORDS[STAGES[STAGES.indexOf(st) + 1]]} in ${next} more` : 'An Elder of the House']);
    if (isCur) fact(grid, `${wavesThisSeason(m, kind, day)} of ${DYNASTY.SEASON_WAVES}`, ['waves fought this season']);
  }
  // (what it was born with, and what it carries)
  const gifts = menuSection(menu.body, 'Born with', undefined, 2);
  if (b.birthright) fact(gifts, 'Birthright', [[birthrightWords(b), 'pay'], `the legacy perk of ${founder(b.birthright)}’s House, for this bearer alone`]);
  if (b.heirloom !== undefined) {
    const it = (m.equipment ?? []).find((x) => x.id === b.heirloom);
    if (it) fact(gifts, 'Heirloom', [[heirloomLine(it), 'pay']]);
  }
  if (b.grudge !== undefined) {
    const n = m.war?.members.find((x) => x.id === b.grudge);
    fact(gifts, 'Blood Grudge', n ? [[`+${Math.round(HEIRS.GRUDGE * 100)}% against ${n.name} ${n.epithet}`, 'pay'], 'who slew a parent of this House'] : [['The one who slew a parent is gone', 'lock']]);
  }
  if (b.foundling) fact(gifts, 'A foundling', ['taken up after a mourning, with no birthright']);
  const promise = promiseLeft(b, day);
  if (isCur && promise > 0) fact(gifts, 'The Heir’s Promise', [[`+${Math.round(HEIRS.PROMISE_XP * 100)}% XP for ${promise} more ${promise === 1 ? 'day' : 'days'}`, 'pay'], 'the heir’s first season']);
  if (!gifts.children.length) gifts.parentElement!.remove();
  // (its honours)
  if ((st === 'elder' && !b.cadet && isCur) || (b.fate && b.fate !== 'fallen')) {
    const h = menuSection(menu.body, 'Honours', undefined, 2);
    if (st === 'elder' && isCur) fact(h, 'Elder’s Counsel', [['+5% XP to the rest of the party while fielded', 'pay']]);
    if (b.fate && b.fate !== 'fallen') fact(h, HONOUR_WORDS[b.fate as Honour], [HONOUR_LINES[b.fate as Honour]]);
  }
  // (phase 7: the Oath: renown, the Legend, and the fall)
  if (b.legend || b.fate === 'fallen') {
    const o = menuSection(menu.body, 'The Legend Oath', undefined, 2);
    if (b.legend) fact(o, isLegend(b) ? 'A Legend' : 'Legend renown', [isLegend(b) ? ['A Legend of the Oath: a gold frame on the tree', 'pay'] : `${b.legend} of ${OATH.LEGEND} Oath clears`]);
    if (b.fate === 'fallen') {
      const n = b.slainBy !== undefined ? m.war?.members.find((x) => x.id === b.slainBy) : undefined;
      fact(o, 'Slain under the Oath', [b.slayer ? `by ${b.slayer}` : 'in a fight with no name to it', ...(n ? [['still living: the House’s Blood Grudge is on it', 'lock'] as [string, 'lock']] : [])]);
      // (greyed until it can answer: the War Horn must be held)
      const grey = whyShadeHonour(m);
      fact(o, 'A Shade', [grey ? [grey, 'lock'] : ['Waits on the War Horn: chosen on the horn’s card, it answers in the Eidolon’s place', 'pay']]);
      if (isCur && line.mourning) fact(o, 'Mourning', [[`${mourningLeft(m, kind, day)} more ${mourningLeft(m, kind, day) === 1 ? 'day' : 'days'}: the House cannot march`, 'lock'], 'then a foundling heir takes up the mantle']);
    }
  }
  // (what it can do)
  const acts = menuSection(menu.body, 'The line', undefined, 2);
  let primary: { label: string; onClick: () => void; disabled?: boolean } | undefined;
  if (isCur) {
    const hs = heirState(m, kind, now);
    if (hs.state === 'training') fact(acts, 'An heir in training', [heirLine(m, kind, now), `Ready in ${trainWords(hs.left).replace(' left', '')}`]);
    else if (hs.state === 'ready') primary = { label: 'Pass the Mantle', onClick: () => openMantle(m, kind, day, reopen) };
    else {
      const why = whyNoHeir(m, kind);
      if (why) fact(acts, 'Name an heir', [[why, 'lock']]);
      else primary = { label: 'Name an heir', onClick: () => openNameHeir(m, kind, day, reopen) };
    }
    if (line.field !== undefined && line.field !== line.current) {
      const row = menuChoice(acts, { title: 'Take the field again', lines: [`${line.bearers[line.field]?.name ?? 'The elder'} is fielded in ${b.name}’s place`], onPick: () => { fieldBearer(m, kind, line.current); saveMeta(m); toastLines([`${b.name} takes the field again`]); reopen(); } });
      row.classList.add('hsRow');
    }
  } else if (!b.cadet && b.fate !== 'fallen' && index < line.current) {
    const lock = honourLock(b, now);
    const row = menuChoice(acts, { title: b.fate ? 'Change honour' : 'Choose an honour', lines: [b.fate && lock ? [`${Math.ceil(lock / DAY_MS)} ${Math.ceil(lock / DAY_MS) === 1 ? 'day' : 'days'} before it can change`, 'lock'] : 'Mentor, tavern regular or Shade'], disabled: !!b.fate && lock > 0, onPick: () => openHonour(m, kind, index, day, reopen) });
    row.classList.add('hsRow');
    if (b.fate) {
      const fielded = line.field === index;
      const r2 = menuChoice(acts, {
        title: fielded ? 'Fielded in the heir’s place' : 'Field this bearer',
        lines: [fielded ? 'Tap to field the heir again' : 'At the kind’s full power, with their own birthright. Their honour lapses for the run.'],
        on: fielded,
        onPick: () => {
          fieldBearer(m, kind, fielded ? line.current : index);
          saveMeta(m);
          toastLines([fielded ? `${line.bearers[line.current].name} takes the field again` : `${b.name} takes the field in ${line.bearers[line.current].name}’s place`]);
          reopen();
        },
      });
      r2.classList.add('hsRow');
    }
  }
  if (!acts.children.length) acts.parentElement!.remove();
  const mem = menuSection(menu.body, 'Remembered', undefined, 2);
  const well = menuWell(mem.parentElement!);
  mem.remove();
  well.classList.add('hsMemory');
  for (const l of b.memory?.length ? b.memory : ['No stories told yet: they are made on the road.']) well.append(el('p', '', l));
  menuFoot(menu, { back: { word: 'close' }, ...(primary ? { primary } : {}) });
  return menu;
}

/** Naming an heir: the Sworn partners to share it with, each with what its candidate's birthright would be. */
export function openNameHeir(m: Meta, kind: string, day: number, done: () => void): OrnateMenu | null {
  const b = bearerOf(m, kind);
  if (!b || whyNoHeir(m, kind)) return null;
  const menu = ornateMenu({ id: 'nameHeir', eyebrow: `The House of ${founder(kind)}`, title: 'Name an heir', sub: `${b.name} and a Sworn partner` });
  menu.card.classList.add('hsCard');
  menuNote(menu.body, `The heir trains at the castle for ${HEIRS.TRAIN_MS / DAY_MS} days. Then two candidates are shown: one with the partner’s legacy perk as its birthright, one with ${b.name}’s own. The pair’s own story decides what the heir is: a child, a ward, an apprentice or a successor.`);
  const grid = menuSection(menu.body, 'With whom', 'kindred partners at Sworn or more', 2);
  grid.classList.add('hsGenRow');
  let pick: string | undefined;
  const rows = heirPartners(m, kind).map((p) => {
    const pb = bearerOf(m, p.kind);
    const perk = PERKS[p.kind];
    const row = menuChoice(grid, {
      title: pb?.name ?? founder(p.kind),
      lines: [`${BOND_NAMES[p.lv]} · the House of ${founder(p.kind)}`, ...(perk ? [[`A birthright of ${perk.name}`, 'pay'] as [string, 'pay']] : [])],
      onPick: () => {
        pick = p.kind;
        rows.forEach((r) => r.classList.toggle('on', r === row));
        foot.primary!.disabled = false;
      },
    });
    row.classList.add('hsRow');
    if (pb) row.prepend(faceOf(p.kind, pb, 40));
    return row;
  });
  const foot = menuFoot(menu, {
    back: { word: 'close' },
    primary: {
      label: 'Name the heir',
      disabled: true,
      onClick: () => {
        if (!pick || !nameHeir(m, kind, pick, Date.now(), day)) return;
        saveMeta(m);
        toastLines([`${b.name} and ${bearerName(m, pick)} have named an heir: ${HEIRS.TRAIN_MS / DAY_MS} days of training at the castle`]);
        menu.close();
        done();
      },
    },
  });
  return menu;
}

/** Passing the Mantle: the two candidates, the heirloom (one of the elder's worn pieces, or none) and the elder's honour; a second tap
 *  confirms on the card. Then the farewell. */
export function openMantle(m: Meta, kind: string, day: number, done: () => void): OrnateMenu | null {
  const now = Date.now();
  const picks = heirPicks(m, kind, now);
  const elder = bearerOf(m, kind);
  if (!picks || !elder) return null;
  saveMeta(m);
  const menu = ornateMenu({ id: 'mantleCard', eyebrow: `The House of ${founder(kind)}`, title: 'Pass the Mantle', sub: `${elder.name} hands the House on` });
  menu.card.classList.add('hsCard');
  menuNote(menu.body, 'Nothing is lost: the heir takes the field at the same level, with the same ranks, talents, books, gear and skills. The other candidate becomes the cadet line.');
  let pick = -1;
  let heirloom: number | undefined;
  let honour: Honour | undefined = elder.fate === 'mentor' ? 'mentor' : undefined;
  let sure = false;
  const cands = menuSection(menu.body, 'The candidates', 'choose one', 2);
  cands.classList.add('hsGenRow');
  const candRows = picks.map((p, i) => {
    const row = menuChoice(cands, {
      title: p.name,
      lines: [[`Birthright · ${birthrightWords({ name: p.name, gen: 1, served: 0, birthright: p.birthright })}`, 'pay'], i === 0 ? `the perk of ${founder(p.birthright)}’s House, the partner’s` : `${elder.name}’s own perk`],
      onPick: () => {
        pick = i;
        candRows.forEach((r) => r.classList.toggle('on', r === row));
        update();
      },
    });
    row.classList.add('hsRow');
    row.prepend(bearerFace(kind, 'youth', elder.gen + 1, 48, p.look));
    return row;
  });
  const worn = heirloomChoices(m, kind);
  if (worn.length) {
    const sec = menuSection(menu.body, 'The heirloom', `+${3}% of its stats a generation, three at most`, 2);
    const items: (number | undefined)[] = [...worn.map((x) => x.id), undefined];
    menuPick(
      sec,
      items,
      heirloom,
      (id) => {
        if (id === undefined) return { title: 'No heirloom', lines: ['Hand down the name alone'] };
        const it = worn.find((x) => x.id === id)!;
        const slot = heirloomSlot(m, kind, id);
        return { title: itemName(it), lines: [`${slot ? SLOT_NAMES[slot] : ''}${it.heirloom ? ` · ${it.heirloom.marks} ${it.heirloom.marks === 1 ? 'mark' : 'marks'} already` : ''}`] };
      },
      (id) => {
        heirloom = id;
        update();
      },
    );
  }
  const hon = menuSection(menu.body, `${elder.name}’s honour`, 'can be changed later, once a week', 2);
  const honRows = HONOURS.map((h) => {
    const why = whyNotHonour(m, kind, h, now);
    const row = menuChoice(hon, {
      title: HONOUR_WORDS[h],
      lines: [why ? [why, 'lock'] : HONOUR_LINES[h]],
      disabled: !!why,
      on: honour === h,
      onPick: () => {
        honour = h;
        honRows.forEach((r) => r.classList.toggle('on', r === row));
        update();
      },
    });
    if (FATE_ICON[h]) row.append(icon(FATE_ICON[h], 'hsFate'));
    return row;
  });
  const foot = menuFoot(menu, {
    back: { word: 'close' },
    primary: {
      label: 'Pass the Mantle',
      disabled: true,
      onClick: () => {
        if (pick < 0 || !honour) return;
        const opts = { pick, honour, ...(heirloom !== undefined ? { heirloom } : {}) };
        if (whyNoMantle(m, kind, opts, Date.now())) return;
        if (!sure) {
          sure = true;
          foot.primary!.textContent = `Pass the Mantle to ${picks[pick].name}? Tap again`;
          return;
        }
        const r = passMantle(m, kind, opts, Date.now(), day);
        if (!r) return;
        saveMeta(m);
        menu.close();
        openFarewell(m, r, done);
      },
    },
  });
  const update = () => {
    sure = false;
    foot.primary!.textContent = 'Pass the Mantle';
    foot.primary!.disabled = pick < 0 || !honour;
  };
  return menu;
}

/** The farewell and the arrival: the elder hands over the heirloom, the honour's place behind them, in a few lines. */
export function openFarewell(m: Meta, r: Mantle, done: () => void): OrnateMenu {
  const menu = ornateMenu({ id: 'farewellCard', eyebrow: `The House of ${founder(r.kind)} · Gen ${romanGen(r.heir.gen)}`, title: 'The Mantle passes', sub: `${r.elder.name} to ${r.heir.name}` });
  menu.card.classList.add('hsCard');
  const top = menuWell(menu.body);
  top.classList.add('hsFarewellWell');
  top.append(faceOf(r.kind, r.elder, 64));
  if (FATE_ICON[r.honour]) top.append(icon(FATE_ICON[r.honour], 'hsFarewellIco'));
  top.append(faceOf(r.kind, r.heir, 64));
  const lines = menuWell(menu.body);
  lines.classList.add('hsMemory', 'hsFarewell');
  for (const [who, text] of farewellLines(r)) {
    const p = el('p', who === 'heir' ? 'hsHeirSays' : '');
    p.append(el('b', '', `${who === 'heir' ? r.heir.name : r.elder.name}: `), text);
    lines.append(p);
  }
  const g = menuSection(menu.body, 'What passes', undefined, 2);
  const fact = (title: string, l: (string | [string, 'pay' | 'lock'])[]) => {
    const row = menuChoice(g, { title, lines: l });
    row.disabled = true;
    row.classList.add('hsFact');
  };
  fact('Everything earned', ['Level, ranks, talents, books, gear and skills: the House’s, whole']);
  fact('Birthright', [[birthrightWords(r.heir), 'pay']]);
  if (r.heirloom) fact('Heirloom', [[heirloomLine(r.heirloom), 'pay']]);
  if (r.grudge !== undefined) {
    const n = m.war?.members.find((x) => x.id === r.grudge);
    if (n) fact('Blood Grudge', [[`+${Math.round(HEIRS.GRUDGE * 100)}% against ${n.name} ${n.epithet}`, 'pay']]);
  }
  fact('The Heir’s Promise', [[`+${Math.round(HEIRS.PROMISE_XP * 100)}% XP for the first season`, 'pay']]);
  if (r.honour !== 'fallen') fact(HONOUR_WORDS[r.honour], [`${r.elder.name}: ${HONOUR_LINES[r.honour]}`]);
  fact(`${r.cadet.name}, passed over`, ['the cadet line: visits the tavern now and then']);
  menuFoot(menu, { back: { word: 'close', onClick: () => done() } });
  return menu;
}

/** An elder's honour: Mentor, tavern regular or Shade, each with what stands in its way; a change waits a week after the last. */
export function openHonour(m: Meta, kind: string, index: number, day: number, done: () => void): OrnateMenu | null {
  const b = lineOf(m, kind)?.bearers[index];
  if (!b) return null;
  const now = Date.now();
  const menu = ornateMenu({ id: 'honourCard', eyebrow: `The House of ${founder(kind)}`, title: b.fate ? 'Change honour' : 'Choose an honour', sub: b.name });
  menu.card.classList.add('hsCard');
  const g = menuSection(menu.body, 'Honours', b.fate ? `now: ${HONOUR_WORDS[b.fate as Honour]}` : undefined, 2);
  for (const h of HONOURS) {
    // (phase 7: the Shade's horn call is wired; until a Shade can answer the horn (it is held), the honour shows greyed)
    const why = b.fate === h ? 'Holds it now' : (whyNotHonour(m, kind, h, now, index) ?? (h === 'shade' ? whyShadeHonour(m) : null));
    const row = menuChoice(g, {
      title: HONOUR_WORDS[h],
      lines: [why ? [why, 'lock'] : HONOUR_LINES[h]],
      disabled: !!why,
      on: b.fate === h,
      onPick: () => {
        if (!changeHonour(m, kind, index, h, Date.now(), day)) return;
        saveMeta(m);
        toastLines([`${b.name} is a ${HONOUR_WORDS[h].toLowerCase()} now`]);
        menu.close();
        done();
      },
    });
    if (FATE_ICON[h]) row.append(icon(FATE_ICON[h], 'hsFate'));
  }
  menuNote(menu.body, 'Leaving the Hall is a recall: its seat stays empty for seven days. An honour can be changed again a week later.');
  menuFoot(menu, { back: { word: 'close' } });
  return menu;
}

/** The party picker's banner (section 3.5): which bearer of a line takes the field, the heir by default, or an honoured elder. */
export function openBanner(m: Meta, kind: string, done: () => void): OrnateMenu | null {
  const choices = bannerChoices(m, kind);
  if (choices.length < 2) return null;
  const now = fieldedOf(m, kind);
  const menu = ornateMenu({ id: 'bannerCard', eyebrow: `The House of ${founder(kind)}`, title: 'Who takes the field?', sub: 'one bearer of a line at a time' });
  menu.card.classList.add('hsCard');
  const g = menuSection(menu.body, 'The banner', undefined, 2);
  g.classList.add('hsGenRow');
  for (const c of choices) {
    const row = menuChoice(g, {
      title: c.bearer.name,
      lines: [c.current ? 'The heir, bearing the name now' : `${fateWords(c.bearer)}: the honour lapses for the run`, ...(c.bearer.birthright ? [[birthrightWords(c.bearer), 'pay'] as [string, 'pay']] : [])],
      on: c.bearer === now,
      onPick: () => {
        fieldBearer(m, kind, c.index);
        saveMeta(m);
        menu.close();
        done();
      },
    });
    row.classList.add('hsRow');
    row.prepend(faceOf(kind, c.bearer, 40));
  }
  menuNote(menu.body, 'Every bearer fights at the kind’s full power: its level, ranks, talents, books and gear are the line’s.');
  menuFoot(menu, { back: { word: 'close' } });
  return menu;
}

/** The Elders' table in the tavern's Hearth Hall: six seats, today's story (a Codex page and 50 crowns, once a day), an elder to ride
 *  with the next march as its guest (once a day, free, while its heir is not in the party), and now and then a cadet visiting. */
export function openEldersTable(m: Meta, day = todayKey(), changed?: () => void): OrnateMenu | null {
  if (!m.dynasty) return null;
  const seated = seatedToday(m, day);
  const menu = ornateMenu({ id: 'eldersTable', eyebrow: 'The tavern · The Hearth Hall', title: 'The Elders’ table', sub: seated.length ? `${seated.length} of ${HEIRS.SEATS} seats taken today` : 'the chairs wait' });
  menu.card.classList.add('hsCard');
  const reopen = () => {
    changed?.();
    menu.close();
    openEldersTable(m, day, changed);
  };
  // (today's story)
  const teller = storyteller(m, day);
  if (teller) {
    const s = storyOf(m, day)!;
    const waits = storyWaits(m, day);
    const sec = menuSection(menu.body, 'Today’s story', waits ? `+${HEIRS.STORY_CROWNS} crowns` : 'told', 2);
    sec.classList.add('hsGenRow');
    const row = menuChoice(sec, {
      title: waits ? `${s.name} has a story` : s.title,
      lines: waits ? [['Sit and listen', 'pay']] : [s.text],
      disabled: !waits,
      onPick: () => {
        const told = hearStory(m, day);
        if (!told) return;
        saveMeta(m);
        toastLines([`${told.title}: +${HEIRS.STORY_CROWNS} crowns`]);
        reopen();
      },
    });
    row.classList.add('hsRow', 'hsFact');
    row.prepend(faceOf(teller, regularOf(m, teller)!.bearer, 40));
  }
  const g = menuSection(menu.body, 'At the table', seated.length ? 'a regular may ride with the next march as your guest, once a day' : undefined, 2);
  g.classList.add('hsGenRow');
  for (const k of seated) {
    const r = regularOf(m, k)!;
    const why = whyNoRide(m, k, day);
    const asked = m.dynasty.guest?.kind === k && m.dynasty.guest.day === day;
    const row = menuChoice(g, {
      title: r.bearer.name,
      lines: [`${stageAge(k, r.bearer.served)} · the House of ${founder(k)}`, asked ? ['Rides with the next march', 'pay'] : why ? [why, 'lock'] : 'Ride with the next march, free'],
      disabled: !!why && !asked,
      on: asked,
      onPick: () => {
        if (asked || !askRide(m, k, day)) return;
        saveMeta(m);
        toastLines([`${r.bearer.name} will ride with the next march as your guest`]);
        reopen();
      },
    });
    row.classList.add('hsRow');
    row.prepend(faceOf(k, r.bearer, 40));
  }
  if (!seated.length) menuNote(g.parentElement!, 'An elder who passes the mantle may take a seat here as a tavern regular.');
  // (a cadet visiting, now and then)
  const c = cadetVisiting(m, day);
  if (c) {
    const sec = menuSection(menu.body, 'Visiting today', 'the cadet line', 2);
    sec.classList.add('hsGenRow');
    const row = menuChoice(sec, { title: `${c.bearer.name}, passed over`, lines: [`for ${c.heir}, of the House of ${founder(c.kind)}`, 'Stops for a drink, and asks after the family'] });
    row.disabled = true;
    row.classList.add('hsRow', 'hsCadet', 'hsFact', 'hsVisit');
    row.prepend(faceOf(c.kind, c.bearer, 40));
  } else if (cadetsOf(m).length) menuNote(menu.body, 'No cadet visits today.');
  menuFoot(menu, { back: { word: 'close' } });
  return menu;
}

/** The hero sheet's heir row: the training, or the mantle ready, with the way to the bearer's card. */
export function heirRowFor(m: Meta, kind: string, now: number): { line: string; ready: boolean } | null {
  const st = heirState(m, kind, now);
  if (st.state === 'none') {
    const why = whyNoHeir(m, kind);
    return why ? null : { line: `${bearerName(m, kind)} may name an heir with a Sworn partner`, ready: false };
  }
  return { line: heirLine(m, kind, now), ready: st.state === 'ready' };
}
