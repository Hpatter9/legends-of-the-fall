// The small Auto card the repeat runs share (quest battles, tales, trials, the daily): how many runs, within the day's tickets.
// The rules are in `sim/autoReplay.ts`; this only asks. The armies keep their own toggle beside Fight! (`armiesView.ts`).
// A standard ornate menu (`ornateMenu.ts`, docs/notes/ui-standard.md; INT-386): the counts are gilded choice rows, Close and the start in
// its footer.

import { AUTO_COUNTS, AUTO_TICKETS, ticketsLeft } from './sim/autoReplay';
import type { Meta } from './sim/meta';
import { todayKey } from './modes';
import { menuFoot, menuNote, menuPick, menuSection, ornateMenu } from './ornateMenu';

const el = (tag: string, cls = '', text = ''): HTMLElement => Object.assign(document.createElement(tag), { className: cls, textContent: text });

/** Asks for a count of auto runs (1, 3, 5 or 10, no more than the tickets left today); `go` gets the choice. */
export function askAuto(m: Meta, title: string, go: (count: number) => void): void {
  const left = ticketsLeft(m, todayKey());
  const best = Math.max(...AUTO_COUNTS.filter((n) => n <= left), 0);
  let pick = Math.min(3, best);
  const menu = ornateMenu({ id: 'autoAsk', eyebrow: 'Repeat runs', title: 'Auto-fight', sub: title, asked: true });
  const grid = menuSection(menu.body, 'Runs', 'no reward, as many times as you pick', 4);
  menuPick<number>(grid, AUTO_COUNTS, pick || undefined, (n) => ({ title: `×${n}`, disabled: n > left }), (n) => ((pick = n), draw()));
  menuNote(menu.body, `Auto runs left today: ${left}/${AUTO_TICKETS} · more at midnight`);
  const { primary } = menuFoot(menu, { back: { word: 'close' }, primary: { label: '', onClick: () => (menu.close(), go(pick)) } });
  function draw(): void {
    primary!.textContent = pick ? `Auto-fight ×${pick}` : 'No auto runs left';
    primary!.disabled = !pick;
  }
  draw();
}

/** An Auto button for a replay row: it asks for the count, then hands it to `go`. */
export function autoButton(m: Meta, title: string, go: (count: number) => void, cls: string): HTMLButtonElement {
  const b = el('button', cls, 'Auto') as HTMLButtonElement;
  b.title = 'Repeat it on its own: no reward';
  b.addEventListener('click', () => askAuto(m, title, go));
  return b;
}
