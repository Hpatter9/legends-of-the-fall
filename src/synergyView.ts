// The left edge of a fight. Once a column of plates for the team's trait bonuses ("3 Samurai"); now the owner's ask is that it hides
// during the wave unless it is part of a combo, so a fight shows only the combo bar (`combos.ts`): a name, a meter that fills as the five
// fight, and a pip for each of the five (dark when it has fallen). Tapping the bar lists the combo's five and what its move does. With no combo
// live the edge is empty. The plates and the trait list are still built (and still hidden in a fight) so the traits' tap list can come back
// between waves. Nothing plays at the fight's start and nothing loops; the one flash is the bar filling (a single, short CSS blink).
// Its elements and styles are made here the first time they are used.

import { traitBadge } from './traitBadge';
import { activeTier, nextTierLine, type TraitCount } from './sim/traits';
import { COMBO_NAME, COMBO_NEED, comboById, type ComboState } from './sim/combos';
import { type DuoCombo } from './sim/duoCombos';
import { UNITS } from './sim/units';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

// (solid plates and plain light-on-dark text with no outline or shadow: the pixel face reads crisply only on a flat ground)
const CSS = `
#synCol { position: fixed; left: 6px; z-index: 2; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 0; margin: 0; min-height: 0; width: auto; background: none; border: 0; border-radius: 0; box-shadow: none; clip-path: none; color: var(--ink, var(--e10)); font: 400 12px/1 var(--body, monospace); letter-spacing: 0; text-shadow: none; }
#synCol[hidden] { display: none; }
/* (the plates are hidden during the wave: only the combo bar shows) */
#synCol, #synList { display: none !important; }
body:not([data-phase='fight']) #comboBar, body:not([data-phase='fight']) #comboList { display: none; }
#synCol .sy { display: flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px 0 2px; box-sizing: border-box; background: var(--s1); border: 2px solid var(--s8); box-shadow: 0 2px 0 rgb(var(--black-rgb) / 0.6); white-space: nowrap; }
#synCol .sy i { display: block; width: 20px; height: 20px; font-style: normal; line-height: 20px; text-align: center; background: var(--s8); color: var(--white); }
#synCol .sy.class i { background: var(--b1); }
#synCol .sy.top { border-color: var(--gold, var(--e6)); }
#synCol .sy.top i { background: var(--gold, var(--e6)); color: var(--s1); }
#synCol .sy.class.top { border-color: var(--b5); }
#synCol .sy.class.top i { background: var(--b5); color: var(--b0); }
#synList { position: fixed; z-index: 4; padding: 8px 10px; box-sizing: border-box; background: var(--s1); border: 2px solid var(--gold, var(--e6)); box-shadow: 0 2px 0 var(--black); color: var(--ink, var(--e10)); font: 400 12px/1.5 var(--body, monospace); letter-spacing: 0; text-shadow: none; display: flex; flex-direction: column; gap: 8px; }
#synList[hidden] { display: none; }
#synList b { font-weight: normal; color: var(--gold, var(--e6)); }
#synList small { display: block; color: var(--dim, var(--e6)); font-size: 12px; }
#comboBar { position: fixed; left: 6px; z-index: 2; box-sizing: border-box; width: 56px; padding: 4px 4px 6px; display: flex; flex-direction: column; align-items: center; gap: 4px; background: var(--s1); border: 2px solid var(--s8); box-shadow: 0 2px 0 rgb(var(--black-rgb) / 0.6); color: var(--text); font: 400 12px/1 var(--body, monospace); letter-spacing: 0; text-shadow: none; border-radius: 0; }
#comboBar[hidden], #comboList[hidden] { display: none; }
#comboBar .cbName { font-size: 12px; color: var(--accent-hi); }
#comboBar .cbTrack { position: relative; width: 16px; height: 96px; background: var(--s4); border: 2px solid var(--s9); box-sizing: border-box; overflow: hidden; }
#comboBar .cbFill { position: absolute; left: 0; right: 0; bottom: 0; height: 0; background: var(--p4); }
#comboBar .cbPips { display: flex; gap: 2px; }
#comboBar .cbPips i { display: block; width: 6px; height: 6px; background: var(--accent); }
#comboBar .cbPips i.off { background: var(--s7); }
#comboBar.full { border-color: var(--accent); }
#comboBar.full .cbFill { background: var(--accent-hi); }
#comboBar.dim { border-color: var(--s7); }
#comboBar.dim .cbFill { background: var(--s9); }
/* (while the five cast, their banner has the left edge to itself) */
#comboBar.casting { visibility: hidden; }
#comboBar.went { animation: cbWent 0.12s steps(2, end) 1; }
@keyframes cbWent { from { background: var(--s11); } to { background: var(--s1); } }
@media (prefers-reduced-motion: reduce) { #comboBar.went { animation: none; } }
#comboList { position: fixed; z-index: 4; padding: 8px 10px; box-sizing: border-box; background: var(--s1); border: 2px solid var(--accent); box-shadow: 0 2px 0 var(--black); color: var(--text); font: 400 12px/1.5 var(--body, monospace); letter-spacing: 0; text-shadow: none; display: flex; flex-direction: column; gap: 8px; }
#comboList b { font-weight: normal; color: var(--accent-hi); }
#comboList small { display: block; color: var(--text-dim); font-size: 12px; }
`;

let col: HTMLElement | null = null;
let list: HTMLElement | null = null;
let bar: HTMLElement | null = null;
let barList: HTMLElement | null = null;
let fill: HTMLElement | null = null;
let pips: HTMLElement[] = [];
let shownFired = 0;

function made(): void {
  if (col) return;
  const style = el('style');
  style.textContent = CSS;
  document.head.append(style);
  col = el('button', '');
  col.id = 'synCol';
  col.hidden = true;
  col.title = 'Active synergies';
  list = el('div');
  list.id = 'synList';
  list.hidden = true;
  col.addEventListener('click', () => {
    list!.hidden = !list!.hidden;
    if (list!.hidden) return;
    // (beside the column, from its top, as wide as the screen allows)
    const r = col!.getBoundingClientRect();
    list!.style.top = `${r.top}px`;
    list!.style.left = `${r.right + 6}px`;
    list!.style.right = '8px';
  });
  list.addEventListener('click', () => (list!.hidden = true));
  // (the combo bar: its name, the meter and a pip for each of the five)
  bar = el('button');
  bar.id = 'comboBar';
  bar.hidden = true;
  bar.title = `${COMBO_NAME}: five heroes fighting together`;
  const track = el('div', 'cbTrack');
  fill = el('i', 'cbFill');
  track.append(fill);
  const row = el('div', 'cbPips');
  pips = [0, 1, 2, 3, 4].map(() => el('i'));
  row.append(...pips);
  bar.append(el('span', 'cbName', COMBO_NAME), track, row);
  barList = el('div');
  barList.id = 'comboList';
  barList.hidden = true;
  bar.addEventListener('click', () => {
    barList!.hidden = !barList!.hidden;
    if (barList!.hidden) return;
    const r = bar!.getBoundingClientRect();
    barList!.style.top = `${r.top}px`;
    barList!.style.left = `${r.right + 6}px`;
    barList!.style.right = '8px';
  });
  barList.addEventListener('click', () => (barList!.hidden = true));
  document.body.append(col, list, bar, barList);
}

/** The lines the list shows for the active traits: "Samurai 3: +1% attack". */
export function synergyLines(counts: readonly TraitCount[]): string[] {
  return counts.filter((c) => c.active).map((c) => `${c.trait.name} ${c.count}: ${activeTier(c)!.text}`);
}

/** A fight begins: the combo bar shows for its length when the five of a combo are placed (the trait plates stay hidden in a fight). */
export function startSynergies(counts: readonly TraitCount[], combo?: ComboState, duos?: readonly DuoCombo[]): void {
  made();
  startComboBar(combo);
  const on = counts.filter((c) => c.active);
  list!.hidden = true;
  col!.replaceChildren();
  col!.hidden = !on.length && !duos?.length;
  if (!on.length && !duos?.length) return;
  for (const c of on) {
    const full = c.tier === c.trait.tiers.length - 1;
    const plate = el('span', `sy ${c.trait.kind}${full ? ' top' : ''}`);
    plate.append(traitBadge(c.trait.id, { small: true }), document.createTextNode(`${c.trait.name} ${c.count}`));
    col!.append(plate);
  }
  const rows: HTMLElement[] = on.map((c) => {
    const row = el('div');
    row.append(el('b', '', `${c.trait.name} ${c.count}`), document.createTextNode(` ${activeTier(c)!.text}`));
    const next = nextTierLine(c);
    if (next) row.append(el('small', '', next));
    return row;
  });
  if (duos?.length) {
    const dHeader = el('div');
    dHeader.append(el('b', '', 'Duo Harmonies'));
    rows.push(dHeader);
    for (const d of duos) {
      const dRow = el('div');
      dRow.append(el('b', '', `${d.name}: `), document.createTextNode(d.title));
      dRow.append(el('small', '', d.text));
      rows.push(dRow);
    }
  }
  rows.push(el('small', '', 'Tap to close'));
  list!.replaceChildren(...rows);
}

/** The combo bar for a fight: shown when it has a combo, with the combo's five and its move in the tap list. */
function startComboBar(state?: ComboState): void {
  const c = state && comboById(state.id);
  shownFired = 0;
  barList!.hidden = true;
  bar!.hidden = !c;
  if (!c) return;
  barList!.replaceChildren(
    el('b', '', `${COMBO_NAME}: ${c.name}`),
    el('div', '', c.heroes.map((k) => UNITS[k].name).join(', ')),
    el('div', '', `${c.move}: ${c.text}.`),
    el('small', '', 'The bar fills as the five fight. It stops if too many fall. Tap to close.'),
  );
  updateCombo(state);
}

/** Draw the bar from the fight's combo state: how full, which of the five stand, dim when it cannot go on, and one short blink when the move goes off. */
export function updateCombo(state: ComboState | undefined): void {
  if (!bar || bar.hidden || !state) return;
  fill!.style.height = `${Math.round((100 * state.charge) / COMBO_NEED)}%`;
  bar.classList.toggle('full', state.charge >= COMBO_NEED || state.landAt !== undefined);
  bar.classList.toggle('dim', state.broken);
  pips.forEach((p, i) => p.classList.toggle('off', i >= state.ids.length - state.fallen));
  // (hidden while the five cast, and one short blink as it comes back emptied)
  const casting = state.landAt !== undefined;
  bar.classList.toggle('casting', casting);
  if (state.fired > shownFired && !casting) {
    shownFired = state.fired;
    bar.classList.remove('went');
    void bar.offsetWidth;
    bar.classList.add('went');
  }
}

/** The fight is over (or the player left): the bar goes. */
export function endSynergies(): void {
  if (!col) return;
  col.hidden = true;
  list!.hidden = true;
  bar!.hidden = true;
  barList!.hidden = true;
}

/** Place the column under `top`, down the left edge over the board; the board keeps all its room, so `top` comes back. */
export function placeSynergies(top: number): number {
  if (col) col.style.top = `${top + 6}px`;
  if (bar) bar.style.top = `${top + 6}px`;
  return top;
}
