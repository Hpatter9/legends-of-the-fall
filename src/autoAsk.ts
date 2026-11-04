// The small Auto card the repeat runs share (quest battles, tales, trials, the daily): how many runs, within the day's tickets.
// The rules are in `sim/autoReplay.ts`; this only asks. The armies keep their own toggle beside Fight! (`armiesView.ts`).

import { AUTO_COUNTS, AUTO_TICKETS, ticketsLeft } from './sim/autoReplay';
import type { Meta } from './sim/meta';
import { todayKey } from './modes';

const el = (tag: string, cls = '', text = ''): HTMLElement => Object.assign(document.createElement(tag), { className: cls, textContent: text });

/** Asks for a count of auto runs (1, 3, 5 or 10, no more than the tickets left today); `go` gets the choice. */
export function askAuto(m: Meta, title: string, go: (count: number) => void): void {
  const left = ticketsLeft(m, todayKey());
  const best = Math.max(...AUTO_COUNTS.filter((n) => n <= left), 0);
  let pick = Math.min(3, best);
  const root = el('div', 'autoAsk');
  const card = el('div', 'asumCard');
  card.setAttribute('role', 'dialog');
  card.append(el('h2', '', 'Auto-fight'), el('p', 'asumWhy', title));
  const counts = el('div', 'asCounts', 'Runs');
  const start = el('button', 'primary', '');
  const draw = (): void => {
    counts.replaceChildren('Runs ');
    for (const n of AUTO_COUNTS) {
      const c = el('button', n === pick ? 'on' : '', String(n)) as HTMLButtonElement;
      c.disabled = n > left;
      c.addEventListener('click', () => ((pick = n), draw()));
      counts.append(c);
    }
    start.textContent = pick ? `Auto-fight ×${pick}` : 'No auto runs left';
    (start as HTMLButtonElement).disabled = !pick;
  };
  draw();
  start.addEventListener('click', () => (root.remove(), go(pick)));
  const back = el('button', '', 'Back');
  back.addEventListener('click', () => root.remove());
  card.append(counts, el('p', 'asHint', `Auto runs left today: ${left}/${AUTO_TICKETS} · more at midnight`), start, back);
  root.append(card);
  document.body.append(root);
}

/** An Auto button for a replay row: it asks for the count, then hands it to `go`. */
export function autoButton(m: Meta, title: string, go: (count: number) => void, cls: string): HTMLButtonElement {
  const b = el('button', cls, 'Auto') as HTMLButtonElement;
  b.title = 'Repeat it on its own: no reward';
  b.addEventListener('click', () => askAuto(m, title, go));
  return b;
}
