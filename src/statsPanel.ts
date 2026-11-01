// STATS batch 3: the Stats panel of the hero sheet (six score tiles, the figures they make, the saves, a plain line a tap opens) and the
// unit card's row of scores. Reads `sim/statLines.ts` only (which reads `sim/stats.ts`); it changes nothing in the game.

import type { Scores } from './sim/stats';
import { figureWhy, scoreWhy, signed, statPanelOf, type CardScores, type HeroAt } from './sim/statLines';

const el = (tag: string, cls = '', text = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The panel for a hero kind at a level, rank and grade; `lead` are the sheet's own cells (health, attack, armour) it carries on top.
 *  Undefined for a kind without a profile. */
export function drawStatsPanel(kind: string, at: HeroAt, lead: HTMLElement[] = [], extra?: Partial<Scores>): HTMLElement | undefined {
  const panel = statPanelOf(kind, at, extra);
  if (!panel) return undefined;
  const box = el('section', 'stPanel');
  box.setAttribute('aria-label', 'Ability scores');
  const head = el('div', 'stHead');
  head.append(el('b', '', 'Ability scores'), el('span', '', `Proficiency ${signed(panel.proficiency)}`));
  box.append(head);
  if (lead.length) {
    const row = el('div', 'stLead');
    row.append(...lead);
    box.append(row);
  }
  const why = el('p', 'stWhy', 'Tap a score or a figure to see what it does.');
  why.setAttribute('role', 'status');
  const buttons: HTMLButtonElement[] = [];
  const explain = (b: HTMLButtonElement, text: string): void => {
    for (const o of buttons) o.setAttribute('aria-pressed', String(o === b && o.getAttribute('aria-pressed') !== 'true'));
    why.textContent = b.getAttribute('aria-pressed') === 'true' ? text : 'Tap a score or a figure to see what it does.';
  };
  const button = (cls: string, text: string): HTMLButtonElement => {
    const b = el('button', cls) as HTMLButtonElement;
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', text);
    buttons.push(b);
    return b;
  };
  const tiles = el('div', 'stTiles');
  for (const t of panel.tiles) {
    const b = button(`stTile${t.primary ? ' prime' : ''}${t.weak ? ' weak' : ''}`, `${t.short} ${t.score}, ${signed(t.mod)}`);
    b.append(el('small', '', t.short), el('b', '', String(t.score)), el('em', '', signed(t.mod)));
    b.addEventListener('click', () => explain(b, scoreWhy(panel.profile, panel.derived, t.ability)));
    tiles.append(b);
  }
  box.append(tiles);
  const figs = el('div', 'stFigs');
  for (const f of panel.figures) {
    const b = button('stFig', `${f.label} ${f.value}`);
    b.append(el('small', '', f.label), el('b', '', f.value));
    b.addEventListener('click', () => explain(b, figureWhy(f.key, panel.derived)));
    figs.append(b);
  }
  box.append(figs);
  const saves = el('div', 'stSaves');
  saves.append(el('small', '', 'Saves'));
  for (const s of panel.saves) {
    const c = el('span', s.trained ? 'trained' : '', `${s.short} ${signed(s.bonus)}${s.trained ? '●' : ''}`);
    if (s.trained) c.title = 'Trained: proficiency is added';
    saves.append(c);
  }
  if (panel.saves.length) box.append(saves);
  box.append(why);
  box.append(el('small', 'stNext', panel.next ? `Next: ${panel.next}` : 'Every improvement gained'));
  return box;
}

/** The unit card's row of six scores (the modifiers small) and the rolls under it. */
export function drawCardScores(s: CardScores): HTMLElement {
  const box = el('div', 'uiScores');
  const row = el('div', 'uiScoreRow');
  for (const t of s.tiles) {
    const c = el('span');
    c.append(el('small', '', t.short), el('b', '', String(t.score)), el('em', '', signed(t.mod)));
    row.append(c);
  }
  box.append(row, el('small', 'uiRolls', s.rolls));
  return box;
}
