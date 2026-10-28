// The page's side of Duchess joining a fight (DUCHESS-FIGHTS, `sim/duchessFight.ts`): the short card that says so as the fight begins,
// and her bubbles over her on the board (a headbutt, a nom, a win). The card sits just above the panel with her portrait from her own
// sheet, "Duchess joins the fight!", her level and one of her lines, and goes by itself after a few seconds; while it is up the heroes'
// speech bubbles keep quiet, so nothing lies over it. It only draws; nothing here changes the fight.

import { goatSheet } from './duchess';
import { DUCHESS_FIGHT_LINES, type DuchessFightLine } from './duchessFightLines';
import { FRAME } from './render/duchessRules';
import { hideQuip, showQuip, type Anchor } from './quipView';
import { settings } from './settings';
import { DUCHESS_LEVEL } from './sim/duchessFight';
import type { Battle, BattleEvent } from './sim/battle';

const CSS = `
.dfCard { position: fixed; left: 12px; right: 12px; z-index: 6; display: flex; align-items: center; gap: 10px; padding: 8px 10px; box-sizing: border-box; pointer-events: none;
  background: rgb(var(--s1-rgb) / 0.94); border: 2px solid var(--gold); box-shadow: 0 3px 0 var(--black), 0 0 18px rgb(var(--e5-rgb) / 0.45);
  text-shadow: 0 1px 0 var(--black); animation: dfIn 0.35s cubic-bezier(0.2, 1.5, 0.4, 1); }
.dfCard[hidden] { display: none; }
.dfCard canvas { flex: none; width: 56px; height: 56px; image-rendering: pixelated; background: rgb(var(--black-rgb) / 0.35); border: 2px solid var(--edge); }
.dfCard .dfWords { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; line-height: 1.2; }
.dfCard b { font: 700 15px var(--display); color: var(--gold); letter-spacing: 0.5px; }
.dfCard .dfLv { font-size: 12px; color: var(--ink); opacity: 0.85; }
.dfCard q { font-size: 13px; color: var(--ink); quotes: none; font-style: italic; }
body.dfUp #quip { visibility: hidden; }
@keyframes dfIn { from { transform: translateY(14px) scale(0.92); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .dfCard { animation: none; } }
`;

/** How long the card stays (ms). */
export const CARD_MS = 3400;
/** The least time (ms) between two of her bubbles in a fight. */
export const SAY_GAP_MS = 4000;

let card: HTMLElement | null = null;
let timer = 0;
let follow = 0;
let saidAt = -Infinity;

const pick = (kind: DuchessFightLine): string => {
  const lines = DUCHESS_FIGHT_LINES[kind];
  return lines[Math.floor(Math.random() * lines.length)];
};

function build(): HTMLElement {
  if (card) return card;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.append(st);
  card = document.createElement('div');
  card.className = 'dfCard';
  card.hidden = true;
  card.setAttribute('role', 'status');
  card.setAttribute('aria-live', 'polite');
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

/** Show the card just above the panel (`panelTop`, its top in CSS px, read each frame while the card is up: the panel settles as the fight's
 *  bar is built); it goes by itself after `ms`. */
export function showDuchessCard(panelTop: () => number, ms = CARD_MS): void {
  const box = build();
  clearTimeout(timer);
  cancelAnimationFrame(follow);
  box.replaceChildren();
  const place = () => {
    box.style.bottom = `${Math.max(8, innerHeight - panelTop() + 8)}px`;
    if (!box.hidden) follow = requestAnimationFrame(place);
  };
  const words = document.createElement('span');
  words.className = 'dfWords';
  const title = document.createElement('b');
  title.textContent = 'Duchess joins the fight!';
  const lv = document.createElement('span');
  lv.className = 'dfLv';
  lv.textContent = `Her Grace the court goat · Level ${DUCHESS_LEVEL}`;
  const line = document.createElement('q');
  line.textContent = pick('joins');
  words.append(title, lv, line);
  box.append(portrait(), words);
  box.hidden = false;
  place();
  // (the heroes' bubbles keep quiet while it is up, so none lies over it)
  hideQuip();
  document.body.classList.add('dfUp');
  timer = window.setTimeout(hideDuchessCard, ms);
}

/** Put the card away (its time is up, a new fight, the home screen). */
export function hideDuchessCard(): void {
  clearTimeout(timer);
  cancelAnimationFrame(follow);
  if (card) card.hidden = true;
  document.body.classList.remove('dfUp');
}

/** Her bubble over her for what a tick brought: a headbutt, a nom, or a won fight with her standing. `at` finds her head on the page. */
export function duchessFightSays(b: Battle, events: readonly BattleEvent[], at: () => Anchor | null): void {
  const me = b.units.find((u) => u.def === 'duchess');
  if (!me || !settings().quips) return;
  let kind: DuchessFightLine | null = null;
  for (const e of events) {
    if (e.kind === 'skill' && e.by === me.id) kind = e.name === 'Nom' ? 'nom' : 'headbutt';
    if (e.kind === 'end' && e.won && me.alive) kind = 'won';
  }
  const now = performance.now();
  if (!kind || (kind !== 'won' && now - saidAt < SAY_GAP_MS) || document.body.classList.contains('dfUp')) return;
  const where = at();
  if (!where) return;
  saidAt = now;
  showQuip(where, pick(kind), { who: 'Duchess', goat: true });
}
