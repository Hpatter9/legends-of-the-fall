// TRAIT-PERKS: a trait's card, opened by a tap (or a long press) on its chip on the deploy screen: the standard ornate card with the
// trait's three tiers (the ones reached lit, the next one marked), each with its rule, and the trait's heroes (those on the field first).
// It only reads; the words are `traitCardRules.ts`'s.

import { menuFoot, menuNote, menuSection, menuWell, ornateMenu } from './ornateMenu';
import { TRAITS } from './sim/traits';
import { countLine, ladderRows, traitHeroes } from './traitCardRules';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Open the card for a trait, read against the heroes placed. */
export function openTraitCard(id: string, kinds: readonly string[], featured?: string): void {
  const t = TRAITS[id];
  if (!t) return;
  const menu = ornateMenu({ id: 'traitCard', eyebrow: t.kind === 'origin' ? 'Origin' : 'Class', title: t.name, sub: countLine(id, kinds, featured), asked: true });
  // (a section's heading over the wells: the grid it makes for choice rows is not wanted here)
  const section = (title: string, line?: string): HTMLElement => {
    const grid = menuSection(menu.body, title, line, 2);
    const sec = grid.parentElement!;
    grid.remove();
    return sec;
  };
  const ladder = section('The perks', 'each tier keeps the ones below it');
  for (const r of ladderRows(id, kinds, featured)) {
    const w = menuWell(ladder);
    w.classList.add('tpTier');
    if (r.reached) w.classList.add('tpOn');
    if (r.next) w.classList.add('tpNext');
    const head = el('div', 'tpHead');
    head.append(el('span', 'tpRoman', r.roman), el('b', '', r.name), el('small', '', `${r.need} heroes${r.reached ? ' · awake' : r.next ? ' · next' : ''}`));
    w.append(head, el('p', 'tpRule', r.rule));
  }
  const heroes = traitHeroes(id, kinds);
  if (heroes.length) menuNote(section(`${t.name} heroes`), heroes.map((h) => (h.on ? `${h.name} (on the field)` : h.name)).join(', '));
  menuFoot(menu, { back: { word: 'close' } });
}
