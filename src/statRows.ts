// The stat rows (RANKUP-LAYOUT, docs/notes/rankup-layout.md): how a screen shows a hero's stats going up. Each stat is one row: its icon
// and name on the left, then the old value, an arrow, the new value, and the gain in the gain colour. The rows share one grid, so the
// columns line up down the card, with the numbers right-aligned in tabular figures; nothing wraps. The Rank up and Awakening card
// (`rankUpView.ts`) is built with it; the after-battle recap's level-up lines (`jrpgRecapView.ts`) wear the same columns.
// Plain DOM: no Pixi, no game rules. Its classes (`sr...`) are styled in `ornateMenus.css` (section 25).

export interface StatRow {
  /** The stat's name ("Health", "STR", "AC"). */
  name: string;
  /** The value before and after, as shown ("2552", "+5", "★★☆☆"). */
  from: string;
  to: string;
  /** The gain, as shown ("+314"); left out for a row with no number to its step (the rank's stars). */
  gain?: string;
  /** The stat's picture (a URL); a row without one wears a small brass pip. */
  icon?: string;
  /** `stars`: the values are rank stars or gems, set in the display type. */
  kind?: 'stars';
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The rows as one table. Every row has the same five cells (name, old, arrow, new, gain), so the columns hold. */
export function statRows(rows: readonly StatRow[]): HTMLElement {
  const table = el('div', 'srTable');
  table.setAttribute('role', 'table');
  for (const r of rows) {
    const row = el('div', `srRow${r.kind === 'stars' ? ' srStars' : ''}`);
    row.setAttribute('role', 'row');
    const name = el('span', 'srName');
    const ico = el('i', `srIco${r.icon ? '' : ' srPip'}`);
    ico.setAttribute('aria-hidden', 'true');
    if (r.icon) ico.style.backgroundImage = `url(${r.icon})`;
    name.append(ico, el('span', '', r.name));
    const arrow = el('span', 'srArrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    const cells = [name, el('span', 'srFrom', r.from), arrow, el('span', 'srTo', r.to), el('span', 'srGain', r.gain ?? '')];
    for (const c of cells) c.setAttribute('role', 'cell');
    row.setAttribute('aria-label', `${r.name}: ${r.from} to ${r.to}${r.gain ? `, ${r.gain}` : ''}`);
    row.append(...cells);
    table.append(row);
  }
  return table;
}
