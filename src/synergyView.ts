// How the team's trait bonuses show in a fight: a short column of plates down the left edge, under the top bar, for the
// fight's length ("3 Samurai"). Tapping it lists what each one does. Nothing plays at the fight's start (the owner's ask: the
// list is a tap away), and nothing loops. Its elements and styles are made here the first time they are used.

import { traitBadge } from './traitBadge';
import { activeTier, nextTierLine, type TraitCount } from './sim/traits';

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
body:not([data-phase='fight']) #synCol, body:not([data-phase='fight']) #synList { display: none; }
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
`;

let col: HTMLElement | null = null;
let list: HTMLElement | null = null;

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
  document.body.append(col, list);
}

/** The lines the list shows for the active traits: "Samurai 3: +1% attack". */
export function synergyLines(counts: readonly TraitCount[]): string[] {
  return counts.filter((c) => c.active).map((c) => `${c.trait.name} ${c.count}: ${activeTier(c)!.text}`);
}

/** A fight begins: the column of plates shows for its length (nothing at all when no trait is active). */
export function startSynergies(counts: readonly TraitCount[]): void {
  made();
  const on = counts.filter((c) => c.active);
  list!.hidden = true;
  col!.replaceChildren();
  col!.hidden = !on.length;
  if (!on.length) return;
  for (const c of on) {
    const full = c.tier === c.trait.tiers.length - 1;
    const plate = el('span', `sy ${c.trait.kind}${full ? ' top' : ''}`);
    plate.append(traitBadge(c.trait.id, { small: true }), document.createTextNode(`${c.trait.name} ${c.count}`));
    col!.append(plate);
  }
  list!.replaceChildren(
    ...on.map((c) => {
      const row = el('div');
      row.append(el('b', '', `${c.trait.name} ${c.count}`), document.createTextNode(` ${activeTier(c)!.text}`));
      const next = nextTierLine(c);
      if (next) row.append(el('small', '', next));
      return row;
    }),
    el('small', '', 'Tap to close'),
  );
}

/** The fight is over (or the player left): the column goes. */
export function endSynergies(): void {
  if (!col) return;
  col.hidden = true;
  list!.hidden = true;
}

/** Place the column under `top`, down the left edge over the board; the board keeps all its room, so `top` comes back. */
export function placeSynergies(top: number): number {
  if (col) col.style.top = `${top + 6}px`;
  return top;
}
