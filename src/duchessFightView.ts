// The short prompt when Duchess the goat joins a fight (DUCHESS-FIGHTS, `sim/duchessFight.ts`): a card just above the panel with her
// portrait from her own sheet, "Duchess joins the fight!", her level and one line. Two shapes, while the owner decides whether she can be
// turned away: `join` says so as the fight begins and goes by itself; `ask` comes up while the heroes are placed, with Let her fight
// and Not today. It only draws; the page tells the sim (the fight was made with her; a "Not today" is the sim's `declineDuchess`).

import { goatSheet } from './duchess';
import { FRAME } from './render/duchessRules';
import { DUCHESS_LEVEL } from './sim/duchessFight';

const CSS = `
.dfCard { position: fixed; left: 12px; right: 12px; z-index: 6; display: flex; align-items: center; gap: 10px; padding: 8px 10px; box-sizing: border-box;
  background: rgb(var(--s1-rgb) / 0.94); border: 2px solid var(--gold); box-shadow: 0 3px 0 var(--black), 0 0 18px rgb(var(--e5-rgb) / 0.45);
  text-shadow: 0 1px 0 var(--black); animation: dfIn 0.35s cubic-bezier(0.2, 1.5, 0.4, 1); }
.dfCard[hidden] { display: none; }
.dfCard canvas { flex: none; width: 56px; height: 56px; image-rendering: pixelated; background: rgb(var(--black-rgb) / 0.35); border: 2px solid var(--edge); }
.dfCard .dfWords { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; line-height: 1.2; }
.dfCard b { font: 700 15px var(--display); color: var(--gold); letter-spacing: 0.5px; }
.dfCard .dfLv { font-size: 12px; color: var(--ink); opacity: 0.85; }
.dfCard q { font-size: 13px; color: var(--ink); quotes: none; font-style: italic; }
.dfCard .dfRow { display: flex; gap: 8px; margin-top: 6px; }
.dfCard .dfRow button { flex: 1; min-height: 40px; font-size: 14px; }
@keyframes dfIn { from { transform: translateY(14px) scale(0.92); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .dfCard { animation: none; } }
`;

let card: HTMLElement | null = null;
let timer = 0;

function build(): HTMLElement {
  if (card) return card;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.append(st);
  card = document.createElement('div');
  card.className = 'dfCard';
  card.hidden = true;
  card.setAttribute('role', 'status');
  document.body.append(card);
  return card;
}

/** Her standing frame, facing right, drawn into a little canvas. */
function portrait(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = FRAME;
  void goatSheet().then((im) => {
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.drawImage(im, 4 * FRAME, 0, FRAME, FRAME, 0, 2, FRAME, FRAME);
  });
  return c;
}

/** Show the card above `bottom` (the panel's top, in CSS px). `join`: it goes by itself after `ms`. `ask`: it waits for an answer. */
export function showDuchessCard(kind: 'join' | 'ask', bottom: number, answer?: (yes: boolean) => void, ms = 3200): void {
  const box = build();
  clearTimeout(timer);
  box.replaceChildren();
  box.style.bottom = `${Math.max(8, innerHeight - bottom + 8)}px`;
  const words = document.createElement('span');
  words.className = 'dfWords';
  const title = document.createElement('b');
  title.textContent = kind === 'join' ? 'Duchess joins the fight!' : 'Duchess wanders onto the field';
  const lv = document.createElement('span');
  lv.className = 'dfLv';
  lv.textContent = `Her Grace the court goat · Level ${DUCHESS_LEVEL}`;
  const line = document.createElement('q');
  line.textContent = kind === 'join' ? 'Mehh.' : 'She looks at the foes, then at you. Mehh?';
  words.append(title, lv, line);
  if (kind === 'ask') {
    const row = document.createElement('span');
    row.className = 'dfRow';
    const yes = document.createElement('button');
    yes.className = 'primary';
    yes.textContent = 'Let her fight';
    const no = document.createElement('button');
    no.textContent = 'Not today';
    yes.onclick = () => ((box.hidden = true), answer?.(true));
    no.onclick = () => ((box.hidden = true), answer?.(false));
    row.append(yes, no);
    words.append(row);
  }
  box.append(portrait(), words);
  box.hidden = false;
  if (kind === 'join') timer = window.setTimeout(() => (box.hidden = true), ms);
}

/** Put the card away (a new fight, the home screen). */
export function hideDuchessCard(): void {
  clearTimeout(timer);
  if (card) card.hidden = true;
}
