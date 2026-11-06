// The Nemesis board (`docs/design/legends-expansion.md`, section 5.1; `docs/notes/nemesis-1.md`, `docs/notes/nemesis-2.md`): "The Dark
// Council", a full page opened from the war camp's Council place. Four tabs (`menuPick`): **Council**, the pyramid (the warchief across the
// top, the four captains in a row, the eight lieutenants in two rows under them, each lieutenant in its sworn captain's column with a brass
// line up to him, a red thread on a blood-oath); **News**, the last forty lines of the War; **Fallen**, the nemeses slain and how, and the
// Warchief's Heads; **Spoils**, where War Trophies buy unlock shards and scouts. A seat opens the nemesis's card (its traits and weaknesses,
// "?" until learned, its memory, its oath and loyalty, and what slaying it pays), whose Hunt opens its army. When the Muster is open, the
// footer's gilded button calls it. Built with the standard ornate menu (UI-STANDARD); nothing glows or pulses.
//
// The icons are placeholders from the item art until the Council's own are made (the prompts are in `docs/notes/nemesis-2.md`).

import { menuChoice, menuFoot, menuNote, menuPick, menuSection, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import { portrait } from './render/sheets';
import { armyById } from './sim/armies';
import { buyScout, buyShard, musterCount, newsWord, SCOUT_PRICE, scoutable, SHARD_PRICE, SHARD_WEEK, shardHeroes, shardsLeft, superiorOf, swornTo, TROPHY_DAY } from './sim/council';
import { heroName } from './sim/heroNames';
import type { Meta } from './sim/meta';
import { musterLine, musterOpen, warchiefOf } from './sim/muster';
import { fullName, MIGHT_MAX, payOf, rankWord, SEATS, type FallenNemesis, type Nemesis, type NewsKind, type War } from './sim/nemesis';
import { TRAITS, weakWords } from './sim/nemesisTraits';
import { avengersOf, awayRuns, grudgesOn, trophyWords } from './sim/revenge';
import { paintGearIcon } from './gearIcons';
import { UNITS } from './sim/units';
import bannerIcon from './art/items/banner.png';
import bandIcon from './art/items/gold_band.png';
import bladeIcon from './art/items/weapon1.png';
import fangIcon from './art/items/viper_fang.png';
import chaliceIcon from './art/items/holy_chalice.png';
import shieldIcon from './art/items/iron_shield.png';
import ringIcon from './art/items/oath_ring.png';
import bootsIcon from './art/items/swift_boots.png';
import crownIcon from './art/items/jewel_crown.png';
import sunCrownIcon from './art/items/sun_crown.png';
import namesIcon from './art/items/book_of_names.png';
import toothIcon from './art/items/ash_tooth.png';
import drumIcon from './art/items/war_drum.png';
import sigilIcon from './art/items/dragon_sigil.png';
import phoenixIcon from './art/items/phoenix.png';
import cloakIcon from './art/items/shadow_cloak.png';
import vialIcon from './art/items/blood_vial.png';
import brandIcon from './art/items/ember_brand.png';
import weaponIcon from './art/items/weapon2.png';

/** The News's event icons (placeholders from the item art until the Council's own ten are made). */
export const NEWS_ICON: Readonly<Record<NewsKind, string>> = { cheated: phoenixIcon, recruit: bannerIcon, promotion: bandIcon, feud: bladeIcon, betrayal: fangIcon, feast: chaliceIcon, trial: shieldIcon, oath: ringIcon, desertion: bootsIcon, claim: sunCrownIcon, crowned: crownIcon, named: namesIcon, slain: toothIcon, muster: drumIcon, fled: cloakIcon, humiliated: vialIcon, vengeance: brandIcon, reclaimed: weaponIcon };
/** The War Trophy token (a placeholder: the dragon sigil). */
export const TROPHY_ICON = sigilIcon;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const icon = (src: string, cls = 'nmIcon'): HTMLImageElement => {
  const i = el('img', cls);
  i.src = src;
  i.alt = '';
  i.setAttribute('aria-hidden', 'true');
  return i;
};

/** Might as pips ("●●●○○○○○○○"). */
export const mightPips = (might: number): string => '●'.repeat(Math.max(0, Math.min(MIGHT_MAX, might))) + '○'.repeat(Math.max(0, MIGHT_MAX - might));

/** A nemesis's face: its kind's portrait in its rank's frame (CSS), the scars beside it. */
function face(n: Pick<Nemesis, 'base' | 'rank' | 'scars'>, size: number): HTMLElement {
  const box = el('span', `nmFace ${n.rank}`);
  const sheet = UNITS[n.base]?.sheet;
  if (sheet) box.append(portrait(sheet, size));
  if (n.scars > 0) box.append(el('i', 'nmScars', '✕'.repeat(Math.min(3, n.scars))));
  box.setAttribute('aria-hidden', 'true');
  return box;
}

/** A hero's line on the card: its face and words. */
function heroLine(kind: string, text: string): HTMLElement {
  const p = el('p', 'nmHeroLine');
  const sheet = UNITS[kind]?.sheet;
  if (sheet) {
    const f = el('span', 'nmChip');
    f.append(portrait(sheet, 32));
    p.append(f);
  }
  p.append(el('b', '', heroName(kind)), el('small', '', text));
  return p;
}

/** A section whose body is a slate well (a list of words, not choices). */
function sectionWell(parent: HTMLElement, title: string, line: string): HTMLElement {
  const grid = menuSection(parent, title, line, 2);
  const sec = grid.parentElement!;
  grid.remove();
  const well = menuWell(sec);
  well.classList.add('nmList');
  return well;
}

/** The seats filled ("9 of 13 seats filled"). */
export const seatsFilled = (war: War | undefined): number => war?.members.length ?? 0;
const SEAT_COUNT = SEATS.warchief + SEATS.captain + SEATS.lieutenant;
/** The line under the board's title: the war turn and the seats filled. */
export const councilLine = (m: Meta): string => (m.war ? `War turn ${m.war.turn} · ${seatsFilled(m.war)} of ${SEAT_COUNT} seats filled` : 'The War has not begun');
/** The camp place's plate ("The Dark Council · 9 seats filled"). */
export const councilPlate = (m: Meta): string => `The Dark Council · ${seatsFilled(m.war)} ${seatsFilled(m.war) === 1 ? 'seat' : 'seats'} filled`;

/** What the board can do beyond showing: hunt a nemesis's army, call the Muster, and save after a purchase. */
export interface BoardHooks {
  hunt(army: string): void;
  /** Call the Muster (or carry on the one saved); left out, the board offers none. */
  muster?: () => void;
  /** A Muster is saved part-way (the button reads Resume). */
  musterSaved?: boolean;
  /** The page's day key (the Spoils' weekly limit). */
  day: number;
  save(): void;
}

type Tab = 'council' | 'news' | 'fallen' | 'spoils';
const TABS: readonly Tab[] = ['council', 'news', 'fallen', 'spoils'];
const TAB_WORD: Readonly<Record<Tab, string>> = { council: 'Council', news: 'News', fallen: 'Fallen', spoils: 'Spoils' };

/** Open the board, on a tab (the Council's pyramid by default). */
export function openNemesisBoard(m: Meta, hooks: BoardHooks, tab: Tab = 'council'): void {
  const menu = ornateMenu({ id: 'nemesisBoard', eyebrow: 'The Nemesis War', title: 'The Dark Council', sub: councilLine(m), kind: 'sheet', label: 'The Dark Council: the nemeses who remember you' });
  menu.card.classList.add('nmBoard');
  const tabs = menuSection(menu.body, undefined, undefined, 4);
  tabs.classList.add('nmTabs');
  const pane = el('div', 'nmPane');
  menu.body.append(pane);
  let shown: Tab = tab;
  const draw = () => {
    pane.replaceChildren();
    if (shown === 'council') drawCouncil(m, pane, menu, hooks);
    else if (shown === 'news') drawNews(m.war, pane);
    else if (shown === 'fallen') drawFallen(m.war, pane);
    else drawSpoils(m, pane, hooks, () => {
      menu.card.querySelector('.omSub')!.textContent = councilLine(m);
      draw();
    });
  };
  menuPick(tabs, TABS, shown, (t) => ({ title: TAB_WORD[t] }), (t) => {
    shown = t;
    draw();
    menu.body.scrollTop = 0;
  });
  draw();
  const open = musterOpen(m.war);
  menuFoot(menu, {
    back: { word: 'back' },
    ...(hooks.muster && (open || hooks.musterSaved) ? { primary: { label: hooks.musterSaved ? 'Resume the Muster' : 'Muster against the Warchief', onClick: () => { menu.close(); hooks.muster!(); } } } : {}),
  });
  menu.foot.querySelector('.omPrimary')?.classList.add('nmMuster');
}

/** A seat of the pyramid: the member's face, short name and Might; empty, a dim plinth. */
function seat(grid: HTMLElement, war: War, n: Nemesis | undefined, m: Meta, hooks: BoardHooks, menu: OrnateMenu, size: number, cls: string): HTMLButtonElement {
  if (!n) {
    const b = menuChoice(grid, { title: 'Vacant', lines: ['the strongest will rise'], disabled: true });
    b.classList.add('nmSeat', 'nmVacant', cls);
    b.setAttribute('aria-label', 'A vacant seat: the strongest will rise');
    return b;
  }
  const army = armyById(n.army)?.name ?? n.army;
  const b = menuChoice(grid, { title: n.name, lines: [`Might ${n.might}`], onPick: () => openNemesisCard(m, n, () => { menu.close(); hooks.hunt(n.army); }) });
  b.classList.add('nmSeat', cls, n.rank);
  b.prepend(face(n, size));
  if (n.oath !== undefined) b.append(el('i', 'nmOath', '⚭'));
  if (n.rank === 'warchief') b.prepend(icon(crownIcon, 'nmInsignia'));
  // (phase 3: an Avenger's or a Grudge holder's face on the card's corner; a member away licking its wounds is dimmed)
  const settler = Object.keys(avengersOf(m, n.id))[0] ?? Object.keys(grudgesOn(m, n.id))[0];
  if (settler && UNITS[settler]?.sheet) {
    const chip = el('span', 'nmChip nmCorner');
    chip.append(portrait(UNITS[settler].sheet, 24));
    b.append(chip);
  }
  if (awayRuns(war, n.id)) b.classList.add('nmAway');
  b.setAttribute('aria-label', `${rankWord(n.rank)} ${fullName(n)}, Might ${n.might}, of the ${army}${n.oath !== undefined ? ', sworn in blood' : ''}${awayRuns(war, n.id) ? ', licking its wounds' : ''}${settler ? `, ${heroName(settler)} has a score to settle` : ''}. Open its card`);
  return b;
}

/** The Council tab: the pyramid, then how the Muster stands. */
function drawCouncil(m: Meta, pane: HTMLElement, menu: OrnateMenu, hooks: BoardHooks): void {
  const war = m.war;
  if (!war || !war.members.length) {
    const well = menuWell(pane);
    well.append(el('p', 'nmEmpty', war ? 'No foe remembers you yet.' : 'The War has not begun.'));
    menuNote(pane, war ? 'A boss or a foe who slays, maims or escapes your heroes is named, and meets you again in its own army’s runs. The Council fills its seats between your runs.' : 'It opens when you first beat the Undead Legion on Normal.');
    return;
  }
  const chief = warchiefOf(war);
  const claim = war.claim !== undefined ? war.members.find((n) => n.id === war.claim) : undefined;
  const top = menuSection(pane, 'The Warchief', chief ? `Might ${chief.might} · ${armyById(chief.army)?.name ?? chief.army}` : claim ? `${claim.name} has claimed the seat` : 'the seat stands empty', 2);
  top.classList.add('nmChief');
  const c = seat(top, war, chief, m, hooks, menu, 72, 'nmBig');
  if (chief) {
    c.querySelector('small')!.textContent = mightPips(chief.might);
    c.querySelector('b')!.textContent = fullName(chief);
  }
  // (the captains in a row; each lieutenant in its sworn captain's column, so the brass line runs straight up to him)
  const caps = war.members.filter((n) => n.rank === 'captain').sort((a, b) => a.id - b.id);
  const capGrid = menuSection(pane, 'Captains', `${caps.length} of ${SEATS.captain} seats`, 4);
  capGrid.classList.add('nmRow4');
  for (let i = 0; i < SEATS.captain; i++) seat(capGrid, war, caps[i], m, hooks, menu, 44, 'nmCap');
  const lts = war.members.filter((n) => n.rank === 'lieutenant');
  const cols: (Nemesis | undefined)[][] = Array.from({ length: SEATS.captain }, (_, i) => (caps[i] ? swornTo(war, caps[i]).sort((a, b) => a.id - b.id) : []));
  const loose = lts.filter((n) => !cols.some((col) => col.includes(n))).sort((a, b) => a.id - b.id);
  // (a free slot in any column takes an unsworn lieutenant, left to right)
  for (const col of cols) while (col.length < 2 && loose.length && !caps[cols.indexOf(col)]) col.push(loose.shift());
  for (const col of cols) while (col.length < 2 && loose.length) col.push(loose.shift());
  const ltGrid = menuSection(pane, 'Lieutenants', `${lts.length} of ${SEATS.lieutenant} seats`, 4);
  ltGrid.classList.add('nmRow4', 'nmLts');
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < SEATS.captain; i++) {
      const n = cols[i][row];
      const s = seat(ltGrid, war, n, m, hooks, menu, 36, 'nmLt');
      if (n && n.sworn !== undefined) s.classList.add('sworn');
    }
  const oaths = war.members.filter((n) => n.oath !== undefined && n.id < n.oath);
  if (oaths.length) {
    const well = sectionWell(pane, 'Blood-oaths', 'when one falls, the other swears vengeance');
    for (const n of oaths) {
      const b = war.members.find((x) => x.id === n.oath);
      if (b) well.append(el('p', 'nmOathLine', `⚭ ${fullName(n)} and ${fullName(b)}`));
    }
  }
  const mw = sectionWell(pane, 'The Warchief’s Muster', musterCount(war));
  mw.append(el('p', musterOpen(war) ? 'nmMusterOpen' : 'nmMemory', musterLine(war)));
}

/** The News tab: the last forty lines of the War, newest first, each with its event's icon. */
function drawNews(war: War | undefined, pane: HTMLElement): void {
  const list = war?.news ?? [];
  const well = sectionWell(pane, 'War News', list.length ? `the last ${list.length} ${list.length === 1 ? 'line' : 'lines'}` : 'nothing yet');
  if (!list.length) well.append(el('p', 'nmEmpty', 'The Council has been quiet. It takes a turn after each army run, and on your first visit each day.'));
  for (const x of list) {
    const p = el('p', `nmNews ${x.kind}`);
    p.append(icon(NEWS_ICON[x.kind]));
    const words = el('span', 'nmNewsWords');
    words.append(el('small', '', `Turn ${x.turn} · ${newsWord(x.kind)}`), el('span', '', x.text));
    p.append(words);
    well.append(p);
  }
}

/** How a fallen nemesis fell, in words ("slain by Ravi", "slain by Gash in the Council", "slain at the Muster by Kwame"). */
export function fallWords(f: FallenNemesis): string {
  if (f.how === 'council') return `slain by ${f.foe ?? 'a rival'} in the Council`;
  const by = f.by ? ` by ${heroName(f.by)}` : '';
  const how = f.how === 'muster' ? `slain at the Muster${by}` : f.vengeance ? `slain${by} in Vengeance` : `slain${by}`;
  return f.reclaimed ? `${how}; ${f.reclaimed === 1 ? 'a trophy' : 'its trophies'} brought home` : how;
}

/** The Fallen tab: the Warchief's Heads, then the slain (the last thirty). */
function drawFallen(war: War | undefined, pane: HTMLElement): void {
  const heads = war?.heads ?? [];
  if (heads.length) {
    const well = sectionWell(pane, 'Warchief’s Heads', `${heads.length} taken`);
    for (const h of heads) {
      const p = el('p', 'nmFallen');
      p.append(face({ base: h.base, rank: 'warchief', scars: 0 }, 32));
      const w = el('span', 'nmNewsWords');
      w.append(el('b', '', h.name), el('small', '', `Might ${h.might} · ${armyById(h.army)?.name ?? h.army}`));
      p.append(w);
      well.append(p);
    }
  }
  const list = war?.fallen ?? [];
  const well = sectionWell(pane, 'The Fallen', list.length ? `the last ${list.length}` : 'none yet');
  if (!list.length) well.append(el('p', 'nmEmpty', 'No nemesis has fallen yet.'));
  for (const f of list) {
    const p = el('p', 'nmFallen');
    p.append(face({ base: f.base, rank: f.rank, scars: 0 }, 32));
    const w = el('span', 'nmNewsWords');
    w.append(el('b', '', fullName(f)), el('small', '', `${rankWord(f.rank)} · Might ${f.might} · ${fallWords(f)}`));
    p.append(w);
    well.append(p);
  }
}

/** The Spoils tab: the War Trophies held, unlock shards (six, one a week) and scouts (two). */
function drawSpoils(m: Meta, pane: HTMLElement, hooks: BoardHooks, redraw: () => void): void {
  const war = m.war;
  const held = menuWell(pane);
  held.classList.add('nmTrophies');
  held.append(icon(TROPHY_ICON, 'nmToken'), el('b', '', `${war?.trophies ?? 0} War ${(war?.trophies ?? 0) === 1 ? 'Trophy' : 'Trophies'}`), el('small', '', `Slaying a nemesis wins them: a lieutenant 1, a captain 2, the warchief 5 (at most ${TROPHY_DAY} a day).`));
  if (!war) return;
  const left = shardsLeft(war, hooks.day);
  const heroes = shardHeroes(m);
  const shardGrid = menuSection(pane, 'Unlock shards', `${SHARD_PRICE} trophies each · ${left} of ${SHARD_WEEK} left this week`, 2);
  if (!heroes.length) menuNote(shardGrid.parentElement!, 'Every hero is yours: there is no shard to buy.');
  for (const k of heroes) {
    const b = menuChoice(shardGrid, { title: heroName(k), lines: [UNITS[k]?.name ?? k, left > 0 ? [`${SHARD_PRICE} War Trophies`, 'pay'] : ['One a week: another next week', 'lock']], disabled: war.trophies < SHARD_PRICE || left <= 0, onPick: () => {
      const got = buyShard(m, k, hooks.day);
      if (!got) return;
      hooks.save();
      redraw();
    } });
    b.classList.add('nmShard');
  }
  const scouts = scoutable(war);
  const scoutGrid = menuSection(pane, 'Scouts', `${SCOUT_PRICE} trophies: learn one secret`, 2);
  if (!scouts.length) menuNote(scoutGrid.parentElement!, 'Every secret of the Council is known.');
  for (const n of scouts.sort((a, b) => b.might - a.might || a.id - b.id)) {
    const unknown = [...n.traits, ...n.weak].filter((s) => !n.known.includes(s)).length;
    const b = menuChoice(scoutGrid, { title: fullName(n), lines: [`${rankWord(n.rank)} · ${unknown} unknown`, [`${SCOUT_PRICE} War Trophies`, 'pay']], disabled: war.trophies < SCOUT_PRICE, onPick: () => {
      const said = buyScout(m, n.id);
      if (!said) return;
      hooks.save();
      redraw();
      menuNote(pane, `The scout returns: ${said}.`).classList.add('nmScouted');
    } });
    b.classList.add('nmRow');
    b.prepend(face(n, 40));
  }
  menuNote(pane, 'A relic choice for your next army run, and the warchiefs’ name plates, come to the Spoils later in the War.');
}

/** A nemesis's card: what is known of it, its place on the Council, what it remembers of you, and what slaying it pays. */
export function openNemesisCard(m: Meta, n: Nemesis, hunt?: () => void): void {
  const army = armyById(n.army);
  const menu = ornateMenu({ id: 'nemesisCard', eyebrow: `${rankWord(n.rank)} · ${army?.name ?? n.army}`, title: fullName(n), sub: `${n.boss ? `${UNITS[n.base]?.name ?? ''} · ` : ''}Might ${n.might} of ${MIGHT_MAX}`, label: `${fullName(n)}, ${rankWord(n.rank)}` });
  menu.card.classList.add('nmCard');
  const top = menuWell(menu.body);
  top.classList.add('nmTop');
  top.append(face(n, 72));
  const facts = el('div', 'nmFacts');
  facts.append(el('b', 'nmPips', mightPips(n.might)), el('small', '', `Met ${n.met} ${n.met === 1 ? 'time' : 'times'}`), el('small', 'omPay', `Slay: ${payOf(n) * (n.trophies?.length ? 2 : 1)} crowns${n.trophies?.length ? ', doubled for the trophy' : ''}`));
  top.append(facts);
  // (its place on the Council: whom it serves, how loyal, its blood-oath, its vengeance)
  const war = m.war;
  if (war) {
    const well = sectionWell(menu.body, 'On the Council', `loyalty ${n.loyalty} of 100`);
    const sup = superiorOf(war, n);
    if (sup) well.append(el('p', 'nmMemory', `${n.rank === 'lieutenant' && n.sworn !== undefined ? 'Sworn to' : 'Serves'} ${rankWord(sup.rank).toLowerCase()} ${fullName(sup)}`));
    if (n.rank === 'captain') {
      const under = swornTo(war, n);
      well.append(el('p', 'nmMemory', under.length ? `Commands ${under.map((x) => x.name).join(' and ')}` : 'Commands no lieutenant'));
    }
    if (n.rank === 'warchief') well.append(el('p', 'nmMemory', 'Only the heroes can bring him down: the Council’s feuds never touch the warchief.'));
    const brother = n.oath !== undefined ? war.members.find((x) => x.id === n.oath) : undefined;
    if (brother) well.append(el('p', 'nmOathLine', `⚭ Sworn in blood to ${fullName(brother)}`));
    if (n.vengeful) well.append(el('p', 'nmOathLine', `Vengeful against ${heroName(n.vengeful)}: +20% damage to ${heroName(n.vengeful)}, whom it goes for first`));
    // (phase 3: away licking its wounds, and Stitched)
    const away = awayRuns(war, n.id);
    if (away) well.append(el('p', 'nmOathLine', `Licking its wounds: it sits out ${away === 1 ? 'the next run' : `the next ${away} runs`} of its army`));
    if (n.stitched) well.append(el('p', 'nmMemory', 'Stitched: it cheated death, and once more at 0 health it will stand again at 20%'));
  }
  // (phase 3: the trophies it took, drawn with each piece's own gear icon)
  if (n.trophies?.length) {
    const well = sectionWell(menu.body, 'Trophies', 'slay it to bring them home, for double pay');
    for (const t of n.trophies) {
      const p = el('p', 'nmTrophyRow');
      const ic = el('span', 'eqIcon nmTrophy');
      paintGearIcon(ic, t.base, t.rarity, 28);
      p.append(ic, el('b', '', trophyWords(t)), el('small', '', '+5% attack while it carries it'));
      well.append(p);
    }
  }
  // (phase 3: the heroes with a Grudge on it, and their Avengers)
  const grudges = Object.entries(grudgesOn(m, n.id));
  const avengers = Object.entries(avengersOf(m, n.id));
  if (grudges.length || avengers.length) {
    const well = sectionWell(menu.body, 'Grudges', 'the heroes with a score to settle');
    for (const [k, steps] of grudges) well.append(heroLine(k, `Grudge · +${steps * 10}% against it (it slew ${heroName(k)}${steps > 1 ? ` ${steps} times` : ''})`));
    for (const [k, fallen] of avengers) well.append(heroLine(k, `Avenger of ${heroName(fallen)} · +15% attack on it, skills 10% quicker; a killing blow is Vengeance`));
  }
  // (its secrets: a trait or weakness not yet learned shows as "?")
  const secrets = (title: string, list: readonly string[], words: (s: string) => { name: string; text: string }) => {
    const well = sectionWell(menu.body, title, `${list.filter((s) => n.known.includes(s)).length} of ${list.length} known`);
    for (const s of list) {
      const p = el('p', 'nmSecret');
      if (n.known.includes(s)) {
        const w = words(s);
        p.append(el('b', '', w.name), el('small', '', w.text));
      } else {
        p.classList.add('hidden');
        p.append(el('b', '', '?'), el('small', '', 'Meet it again, or send a scout, to learn more'));
      }
      well.append(p);
    }
  };
  secrets('Traits', n.traits, (t) => ({ name: TRAITS[t]?.name ?? t, text: TRAITS[t]?.text ?? '' }));
  secrets('Weaknesses', n.weak, (w) => weakWords(w, heroName));
  if (n.memory.length) {
    const well = sectionWell(menu.body, 'Memory', 'what it remembers');
    for (const line of n.memory) well.append(el('p', 'nmMemory', line));
  }
  menuFoot(menu, { back: { word: 'close' }, ...(hunt ? { primary: { label: 'Hunt', onClick: () => { menu.close(); hunt(); } } } : {}) });
}
