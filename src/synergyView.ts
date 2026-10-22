// How the team's trait bonuses show in a fight: a banner at the fight's start that fades once ("Samurai 4/4: +10% attack"),
// and a small steady row of badges under the top bar for the fight's length. Tapping the row lists what is active.
// Its elements and styles are made here the first time they are used. One-shot effects only: nothing loops.

import { activeTier, type TraitCount } from './sim/traits';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

const CSS = `
#synRow { position: fixed; left: 8px; z-index: 2; display: flex; gap: 4px; align-items: center; height: 26px; padding: 2px 4px; max-width: calc(100% - 16px); box-sizing: border-box; overflow: hidden; background: rgba(18, 12, 16, 0.7); border: 1px solid #6b4128; border-radius: 4px; color: var(--ink, #f4e6c8); font: inherit; }
#synRow[hidden] { display: none; }
body:not([data-phase='fight']) #synRow, body:not([data-phase='fight']) #synBanner, body:not([data-phase='fight']) #synList { display: none; }
#synRow .sy { flex: none; min-width: 26px; height: 20px; padding: 0 4px; box-sizing: border-box; border-radius: 3px; border: 1px solid var(--gold, #f0b44a); background: #2a1a10; color: var(--gold, #f0b44a); font-size: 12px; font-weight: normal; line-height: 18px; text-align: center; }
#synRow .sy.class { border-style: dashed; }
#synRow .sy.top { background: var(--gold, #f0b44a); color: #1a1008; }
#synRow small { font-size: 12px; color: var(--dim, #b8a888); white-space: nowrap; }
#synBanner { position: fixed; left: 12px; right: 12px; z-index: 3; display: flex; flex-direction: column; align-items: center; gap: 2px; pointer-events: none; text-align: center; text-shadow: 1px 0 0 #000, -1px 0 0 #000, 0 1px 0 #000, 0 -1px 0 #000, 0 2px 0 #000; font-size: 12px; font-weight: normal; line-height: 1.6; color: var(--gold-hi, #ffe27a); animation: synBanner 2.6s ease-out forwards; }
#synBanner[hidden] { display: none; }
#synBanner b { font: 400 12px var(--display, inherit); color: #fff; }
#synBanner span { padding: 2px 10px; background: rgba(18, 12, 16, 0.8); border: 1px solid var(--gold, #f0b44a); }
@keyframes synBanner { 0% { opacity: 0; transform: translateY(-8px); } 10% { opacity: 1; transform: none; } 80% { opacity: 1; } 100% { opacity: 0; } }
#synList { position: fixed; left: 8px; right: 8px; z-index: 4; padding: 8px 10px; box-sizing: border-box; background: rgba(18, 12, 16, 0.96); border: 2px solid var(--gold, #f0b44a); box-shadow: 0 2px 0 #000; color: var(--ink, #f4e6c8); font-size: 12px; line-height: 1.5; display: flex; flex-direction: column; gap: 4px; }
#synList[hidden] { display: none; }
#synList b { color: var(--gold, #f0b44a); }
#synList small { color: var(--dim, #b8a888); font-size: 12px; }
@media (prefers-reduced-motion: reduce) { #synBanner { animation-duration: 0.01s; opacity: 1; } }
`;

/** The row's height, fixed so the board can be fitted below it before the row is painted. */
const ROW_H = 26;
let row: HTMLElement | null = null;
let banner: HTMLElement | null = null;
let list: HTMLElement | null = null;
let timer = 0;

function made(): void {
  if (row) return;
  const style = el('style');
  style.textContent = CSS;
  document.head.append(style);
  row = el('button', '');
  row.id = 'synRow';
  row.hidden = true;
  banner = el('div');
  banner.id = 'synBanner';
  banner.hidden = true;
  list = el('div');
  list.id = 'synList';
  list.hidden = true;
  row.addEventListener('click', () => {
    list!.hidden = !list!.hidden;
    if (!list!.hidden) list!.style.top = `${row!.getBoundingClientRect().bottom + 4}px`;
  });
  list.addEventListener('click', () => (list!.hidden = true));
  document.body.append(row, banner, list);
}

/** The lines a banner or list shows for the active traits: "Samurai 4/4: +10% attack". */
export function synergyLines(counts: readonly TraitCount[]): string[] {
  return counts.filter((c) => c.active).map((c) => `${c.trait.name} ${c.count}/${activeTier(c)!.need}: ${activeTier(c)!.text}`);
}

/** A fight begins: the banner plays once, and the row of badges stays (nothing at all when no trait is active). */
export function startSynergies(counts: readonly TraitCount[]): void {
  made();
  const on = counts.filter((c) => c.active);
  clearTimeout(timer);
  banner!.hidden = true;
  list!.hidden = true;
  row!.replaceChildren();
  row!.hidden = !on.length;
  if (!on.length) return;
  for (const c of on) {
    const full = c.tier === c.trait.tiers.length - 1;
    const b = el('span', `sy ${c.trait.kind}${full ? ' top' : ''}`, c.trait.short);
    row!.append(b);
  }
  row!.append(el('small', '', `${on.length} ${on.length === 1 ? 'synergy' : 'synergies'}`));
  row!.title = 'Active synergies';
  const lines = synergyLines(counts);
  list!.replaceChildren(...lines.map((l) => el('div', '', l)), el('small', '', 'Tap to close'));
  const shown = lines.slice(0, 3);
  banner!.replaceChildren(el('b', '', 'SYNERGY'), ...shown.map((l) => el('span', '', l)), ...(lines.length > 3 ? [el('span', '', `and ${lines.length - 3} more`)] : []));
  // (replayed by taking it off and putting it back, so a second fight's banner plays too)
  banner!.style.animation = 'none';
  void banner!.offsetWidth;
  banner!.style.animation = '';
  banner!.hidden = false;
  timer = window.setTimeout(() => (banner!.hidden = true), 2700);
}

/** The fight is over (or the player left): the row and the banner go. */
export function endSynergies(): void {
  if (!row) return;
  clearTimeout(timer);
  row.hidden = true;
  banner!.hidden = true;
  list!.hidden = true;
}

/** Place the row under `top` and the banner a little lower; returns where the board may start (`top` when no row is shown). */
export function placeSynergies(top: number): number {
  if (!row || row.hidden) return top;
  row.style.top = `${top + 2}px`;
  banner!.style.top = `${top + 2 + ROW_H + 8}px`;
  return top + 2 + ROW_H + 2;
}
