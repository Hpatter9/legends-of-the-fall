// HUD-EVEN (docs/notes/hud-even.md): the page's side of the fight's even spell row. The rule is `spellRowGap` (fightHudRules.ts); this
// reads the row's pieces as they are drawn and sets the gap. The page only: it reads the DOM, never the battle.

import { spellRowGap, spellRowSpans } from './fightHudRules';

/** The row's pieces: the mana, each orb, and the Auto buttons. */
const PIECES = '#mana, #spellCards > .spell, .fhAuto';

/** The pieces that show now, left to right. */
export function spellRowPieces(row: HTMLElement): HTMLElement[] {
  return [...row.querySelectorAll<HTMLElement>(PIECES)].filter((e) => !e.hidden && !e.closest('[hidden]') && e.offsetWidth > 0);
}

/** Set the row's gap for the pieces it holds now (nothing while the row is not drawn). `data-spread` says how it stands: `span` edge to
 *  edge, `group` centred. */
export function laySpellRow(row: HTMLElement): void {
  const room = row.clientWidth;
  if (room <= 0) return;
  const widths = spellRowPieces(row).map((e) => e.offsetWidth);
  const gap = `${spellRowGap(room, widths)}px`;
  if (row.style.columnGap !== gap) row.style.columnGap = gap;
  const spread = spellRowSpans(room, widths) ? 'span' : 'group';
  if (row.dataset.spread !== spread) row.dataset.spread = spread;
}

/** Call `lay` whenever a piece comes or goes: an orb added or taken, a button shown or hidden. */
export function watchSpellRow(row: HTMLElement, lay: () => void): void {
  if (typeof MutationObserver !== 'function') return;
  // (only the pieces themselves: what changes inside one, as the mana's number each tick or an orb's cooldown, moves nothing)
  const holds = (n: Node): boolean => n === row || (n instanceof HTMLElement && (n.matches(PIECES) ? false : !n.closest(PIECES)));
  const watch = new MutationObserver((list) => {
    if (list.some((m) => (m.type === 'attributes' ? true : holds(m.target)))) lay();
  });
  watch.observe(row, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
}
