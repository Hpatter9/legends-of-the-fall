// STORE-CREDITS (docs/notes/store-credits.md): the in-app Credits page, opened from Settings: a standard ornate menu (UI-STANDARD), a
// sheet with "‹ Back". It lists `data/credits.ts`, written for players: one entry per creator or pack, grouped as Art, Characters and
// monsters, Music, Sound and Fonts, each with its licence (tagged "credit required" where the licence asks for it) and, where the
// licence asks, a link to the source. CREDITS.md stays the developers' record; the test keeps the two in step.
import { CREDIT_GROUPS, PLAYER_CREDITS, type PlayerCredit } from './data/credits';
import { menuFoot, menuNote, menuSection, menuWell, ornateMenu } from './ornateMenu';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** One entry: the work, its author, what it includes, then its licence's tag and the link. */
function entryOf(c: PlayerCredit): HTMLElement {
  const p = el('div', 'crEntry');
  p.append(el('p', 'crWork', c.work));
  if (c.author) p.append(el('p', 'crBy', c.author));
  if (c.includes?.length) p.append(el('p', 'crSub', c.includes.join(' · ')));
  if (c.licence || c.unconfirmed || c.link) {
    const tags = el('p', 'crLics');
    if (c.licence) tags.append(el('span', `crLic${c.credit ? ' crCredit' : ''}`, c.licence));
    if (c.credit) tags.append(el('span', 'crLic crCredit', 'Credit required'));
    if (c.unconfirmed) tags.append(el('span', 'crLic crUnconfirmed', 'Licence unconfirmed'));
    if (c.link) {
      const a = el('a', 'crLink', c.link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
      a.href = c.link;
      a.target = '_blank';
      a.rel = 'noopener';
      tags.append(a);
    }
    p.append(tags);
  }
  return p;
}

/** Opens the Credits page over Settings; "‹ Back" (or Escape) returns to Settings. */
export function openCredits(onClose?: () => void): void {
  const menu = ornateMenu({ id: 'credits', eyebrow: 'Settings', title: 'Credits', sub: 'The artists, composers and makers behind the game', kind: 'sheet', asked: true, onClose });
  menuNote(menu.body, 'Thank you to every artist, composer and type designer named here, who share their work for games like this one.');
  for (const group of CREDIT_GROUPS) {
    const well = menuWell(menuSection(menu.body, group));
    for (const c of PLAYER_CREDITS[group]) well.append(entryOf(c));
  }
  menuFoot(menu, { back: { word: 'back' } });
}
