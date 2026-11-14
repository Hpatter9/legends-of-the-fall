// STORE-CREDITS (docs/notes/store-credits.md): the in-app Credits page, opened from Settings. A standard ornate menu (UI-STANDARD) made
// from CREDITS.md itself, taken into the bundle as text at build time, so the page shows exactly what the file says. Each entry names the
// licences it is under; one that asks for its author's credit (CC-BY, CC-BY-SA, GPL, the font licence) is marked so.
import creditsMd from '../CREDITS.md' with { type: 'text' };
import { creditLicences, creditSections, type CreditEntry } from './creditsRules';
import { menuFoot, menuNote, menuSection, menuWell, ornateMenu } from './ornateMenu';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** One entry: its lines, then a tag for each licence it names. */
function entryOf(e: CreditEntry): HTMLElement {
  const p = el('div', 'crEntry');
  e.lines.forEach((line, i) => p.append(el('p', i ? 'crSub' : '', line)));
  if (e.licences.length) {
    const tags = el('p', 'crLics');
    for (const l of e.licences) {
      const t = el('span', `crLic${l.credit ? ' crCredit' : ''}${l.unconfirmed ? ' crUnconfirmed' : ''}`, l.credit ? `${l.name} · credit required` : l.name);
      tags.append(t);
    }
    p.append(tags);
  }
  return p;
}

/** Opens the Credits page over Settings; "‹ Back" (or Escape) returns to Settings. */
export function openCredits(onClose?: () => void): void {
  const sections = creditSections(creditsMd);
  const menu = ornateMenu({ id: 'credits', eyebrow: 'Settings', title: 'Credits', sub: 'Where every picture, tune and sound comes from', kind: 'sheet', asked: true, onClose });
  const intro = menuWell(menu.body);
  intro.append(
    el('p', '', 'Legends of the Last Keep is made with free art and music packs, with art made for the game, and with sound made in the game. Thank you to every artist and composer named here.'),
    el('p', '', `Where a licence asks for its author to be credited (${creditLicences(sections).join(', ')}), it is named beside the work.`),
  );
  for (const s of sections) {
    const grid = menuSection(menu.body, s.title);
    const well = menuWell(grid);
    for (const e of s.entries) well.append(entryOf(e));
  }
  menuNote(menu.body, 'The full list, with the files each covers, is CREDITS.md in the game’s source.');
  menuFoot(menu, { back: { word: 'back' } });
}
