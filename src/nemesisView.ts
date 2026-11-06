// The Nemesis board, phase 1 (`docs/design/legends-expansion.md`, section 5.1; `docs/notes/nemesis-1.md`): "The Dark Council" as a simple
// list, opened from the war camp's war table. The captains, then the lieutenants, each a gilded row with its face, name, Might and pay; a tap
// opens the nemesis's card (its traits and weaknesses, "?" until learned, its memory and what slaying it pays), whose Hunt opens its army.
// The pyramid, the News and Fallen tabs and the Spoils come with the Council (phase 2). Built with the standard ornate menu (UI-STANDARD).

import { menuChoice, menuFoot, menuNote, menuSection, menuWell, ornateMenu } from './ornateMenu';
import { portrait } from './render/sheets';
import { armyById } from './sim/armies';
import { heroName } from './sim/heroNames';
import type { Meta } from './sim/meta';
import { fullName, MIGHT_MAX, payOf, rankWord, SEATS, type Nemesis } from './sim/nemesis';
import { TRAITS, weakWords } from './sim/nemesisTraits';
import { UNITS } from './sim/units';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
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

/** A section whose body is a slate well (a list of words, not choices). */
function sectionWell(parent: HTMLElement, title: string, line: string): HTMLElement {
  const grid = menuSection(parent, title, line, 2);
  const sec = grid.parentElement!;
  grid.remove();
  const well = menuWell(sec);
  well.classList.add('nmList');
  return well;
}

/** The line under the board's title: the seats filled. */
export const councilLine = (m: Meta): string => {
  const war = m.war;
  const n = (r: 'captain' | 'lieutenant') => war?.members.filter((x) => x.rank === r).length ?? 0;
  return `Captains ${n('captain')}/${SEATS.captain} · Lieutenants ${n('lieutenant')}/${SEATS.lieutenant}`;
};

/** Open the board. `hunt` opens a nemesis's army (its card's Hunt). */
export function openNemesisBoard(m: Meta, hunt: (army: string) => void): void {
  const war = m.war;
  const menu = ornateMenu({ id: 'nemesisBoard', eyebrow: 'The Nemesis War', title: 'The Dark Council', sub: councilLine(m), kind: 'sheet', label: 'The Dark Council: the nemeses who remember you' });
  menu.card.classList.add('nmBoard');
  if (!war || !war.members.length) {
    const well = menuWell(menu.body);
    well.append(el('p', 'nmEmpty', war ? 'No foe remembers you yet.' : 'The War has not begun.'));
    menuNote(menu.body, war ? 'A boss or a foe who slays, maims or escapes your heroes is named, and meets you again in its own army’s runs.' : 'It opens when you first beat the Undead Legion on Normal.');
  }
  for (const rank of ['captain', 'lieutenant'] as const) {
    const list = (war?.members ?? []).filter((n) => n.rank === rank).sort((a, b) => b.might - a.might || a.id - b.id);
    if (!list.length) continue;
    const grid = menuSection(menu.body, rank === 'captain' ? 'Captains' : 'Lieutenants', `${list.length} of ${SEATS[rank]} seats`, 2);
    for (const n of list) {
      const row = menuChoice(grid, { title: fullName(n), lines: [`Might ${n.might} · ${armyById(n.army)?.name ?? n.army}`, [`Slay: ${payOf(n)} crowns`, 'pay']], onPick: () => openNemesisCard(m, n, () => { menu.close(); hunt(n.army); }) });
      row.classList.add('nmRow');
      row.prepend(face(n, 40));
      row.setAttribute('aria-label', `${rankWord(n.rank)} ${fullName(n)}, Might ${n.might}, of the ${armyById(n.army)?.name ?? n.army}. Open its card`);
    }
    const empty = SEATS[rank] - list.length;
    if (empty > 0) menuNote(grid.parentElement!, `${empty} ${empty === 1 ? 'seat stands' : 'seats stand'} vacant: the strongest will rise.`);
  }
  menuFoot(menu, { back: { word: 'back' } });
}

/** A nemesis's card: what is known of it, what it remembers, and what slaying it pays. */
export function openNemesisCard(m: Meta, n: Nemesis, hunt?: () => void): void {
  void m;
  const army = armyById(n.army);
  const menu = ornateMenu({ id: 'nemesisCard', eyebrow: `${rankWord(n.rank)} · ${army?.name ?? n.army}`, title: fullName(n), sub: `${n.boss ? `${UNITS[n.base]?.name ?? ''} · ` : ''}Might ${n.might} of ${MIGHT_MAX}`, label: `${fullName(n)}, ${rankWord(n.rank)}` });
  menu.card.classList.add('nmCard');
  const top = menuWell(menu.body);
  top.classList.add('nmTop');
  top.append(face(n, 72));
  const facts = el('div', 'nmFacts');
  facts.append(el('b', 'nmPips', mightPips(n.might)), el('small', '', `Met ${n.met} ${n.met === 1 ? 'time' : 'times'}`), el('small', 'omPay', `Slay: ${payOf(n)} crowns`));
  top.append(facts);
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
        p.append(el('b', '', '?'), el('small', '', 'Meet it again to learn more'));
      }
      well.append(p);
    }
  };
  secrets('Traits', n.traits, (t) => ({ name: TRAITS[t]?.name ?? t, text: TRAITS[t]?.text ?? '' }));
  secrets('Weaknesses', n.weak, (w) => weakWords(w, heroName));
  if (n.memory.length) {
    const well = sectionWell(menu.body, 'Memory', 'what it remembers of you');
    for (const line of n.memory) well.append(el('p', 'nmMemory', line));
  }
  menuFoot(menu, { back: { word: 'close' }, ...(hunt ? { primary: { label: 'Hunt', onClick: () => { menu.close(); hunt(); } } } : {}) });
}
