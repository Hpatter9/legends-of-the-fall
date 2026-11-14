// The small speech bubble a hero (or Duchess) talks in: one at a time, a few words, in a framed box with a tail, over whatever is
// showing. It fades in once and fades out once (nothing loops or flashes), never takes a tap (pointer-events: none) and goes by
// itself after a moment. A banter reply follows the first line. Only the page uses this; the rules for when to speak are in
// `render/quipRules.ts`.

import { FIGHT_HUD, hudBoxes } from './hudClear';

const CSS = `
#quip { position: fixed; z-index: 96; max-width: min(232px, calc(100vw - 24px)); box-sizing: border-box; padding: 6px 10px 7px; pointer-events: none; opacity: 0; transition: opacity 0.18s ease-out;
  background: linear-gradient(180deg, #2c3125 0%, #181b13 100%); color: #f1ead9; border: 1px solid #c9a35c; border-radius: 5px;
  box-shadow: inset 0 1px 0 rgba(255, 235, 185, 0.18), 0 0 0 1px #3a2e17, 0 3px 8px rgba(0, 0, 0, 0.6);
  font: 400 13px/1.3 var(--body, sans-serif); text-align: center; text-shadow: 0 1px 1px #000; }
#quip.on { opacity: 1; }
#quip.off { transition-duration: 0.3s; }
#quip::after { content: ''; position: absolute; left: var(--tail, 50%); top: 100%; width: 0; height: 0; margin-left: -6px; border: 6px solid transparent; border-top-color: #c9a35c; }
#quip.below::after { top: auto; bottom: 100%; border-top-color: transparent; border-bottom-color: #c9a35c; }
#quip.goat { background: linear-gradient(180deg, #f1e4c2 0%, #d8c599 100%); color: #2b1f0e; text-shadow: none; }
#quip small { display: block; margin-bottom: 1px; font: 400 12px/1.2 var(--display, serif); letter-spacing: 0.04em; color: var(--ornate-brass, #d8b976); }
#quip.goat small { color: #6d4f1f; }
@media (prefers-reduced-motion: reduce) { #quip { transition: none; } }
`;

/** Where a bubble points: the middle of a spot on the page, in CSS pixels (the speaker's head). */
export interface Anchor {
  x: number;
  y: number;
}

/** How long (ms) a bubble stays, and how long a reply waits behind the first line. */
export const HOLD_MS = 2600;
export const REPLY_AFTER_MS = 2300;

let box: HTMLElement | null = null;
let hideTimer = 0;
let offTimer = 0;
let queued = 0;

function ensure(): HTMLElement {
  if (box) return box;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.append(st);
  box = document.createElement('div');
  box.id = 'quip';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');
  document.body.append(box);
  return box;
}

/** UX-FIXES: pieces of the page a bubble must not sit on: the top bar, the fight's hero rows and a heading; and (COMBAT-HUD) the rest of the
 *  fight's HUD: the spell row, the boss's, twist's and combo bars, the tactic button and a toast in its lane. A bubble that would cover one is moved to the
 *  nearest clear spot (below it in the top half of the page, above it in the bottom half), again until it covers none. */
const KEEP_CLEAR = [
  ...FIGHT_HUD,
  '.toast.lane',
  '#hmTop',
  // (FIRST-FIVE: the starter's head and packs; the bench; the home screen's tabs, its battle button and plates)
  '#starter .omHead',
  '#starter .stPack',
  // (and, the director's rule, a hero's row or card on any list: the War Council's company and pool, the hero list, the Houses, the codex)
  '.ptSlot',
  '.ptHeroPick',
  '#ptGrid > *',
  '.hsLine',
  '.cxCard',
  '#benchWrap',
  '#hmTabs',
  '#home .hmBattle',
  '#home .cpPlate',
  '#home .cpPlace',
];

/** FIRST-FIVE: the layers that open over a speaker (a card, a sheet, a sub-page such as the codex, Settings, the Sanctum, the War Council,
 *  a wave's card): a speaker under one of them is out of sight, and its line is let go rather than laid over the layer. The starter pick is
 *  where its own speakers stand, so it is not one. */
// (the bubble stands over the standard menus' veil, z 95, so a speaker on the starter pick is heard; one under any other layer is not)
const COVERS = '.omVeil:not(#starter), #hmSheet, #hmSub, #settings, #gacha, #party, #result, #recap';
/** Whether the speaker at `at` is hidden under an open layer. */
function covered(at: Anchor): boolean {
  if (at.x < 0 || at.y < 0 || at.x > innerWidth || at.y > innerHeight) return false;
  const top = document.elementFromPoint(at.x, at.y);
  const layer = top?.closest<HTMLElement>(COVERS);
  return !!layer && !layer.hidden;
}
/** Where a bubble `w` x `h` meant for (`left`, `top`) can sit covering none of them: where it is; else the nearest spot just above or
 *  below one of them; else (AUTO-RIGHT) the same moved sideways just clear of one of them (on a short phone with a toast in the lane there
 *  is no row between the lane and the tactic button tall enough, but there is room beside the button); else nowhere (`null`: the line is
 *  let go rather than laid on the HUD). */
function keepClear(left: number, top: number, w: number, h: number): { left: number; top: number } | null {
  const boxes = hudBoxes(KEEP_CLEAR);
  const vw = document.documentElement.clientWidth;
  const covers = (x: number, y: number) => boxes.some((b) => x < b.right && x + w > b.left && y < b.bottom && y + h > b.top);
  if (!covers(left, top)) return { left, top: Math.max(4, top) };
  // (BOSS-BAR: the nearest spot just above or below one of them that covers none and stays on the screen; on a short phone the tactic
  // button sits above the middle, and the old step (below a part in the top half, above it in the bottom half) sent a bubble back and forth
  // between it and the hero rows)
  const ys = [top, ...boxes.flatMap((b) => [b.bottom + 4, b.top - h - 4])].filter((y) => y >= 4 && y + h <= innerHeight - 4);
  const xs = [left, ...boxes.flatMap((b) => [b.left - w - 4, b.right + 4])].filter((x) => x >= 8 && x + w <= vw - 8);
  let best: { left: number; top: number } | null = null;
  let far = Infinity;
  // (a move up or down first, as before: a sideways move only when no row is clear, and the shortest of those)
  for (const x of xs)
    for (const y of ys) {
      if (covers(x, y)) continue;
      const d = Math.abs(y - top) + (x === left ? 0 : 10000 + Math.abs(x - left));
      if (d < far) [best, far] = [{ left: x, top: y }, d];
    }
  return best;
}

/** Show `text` over `at` (replacing any bubble already up). `who` names the speaker in small type above it; `goat` is Duchess's cream bubble. */
export function showQuip(at: Anchor, text: string, opts: { who?: string; goat?: boolean; hold?: number } = {}): void {
  const el = ensure();
  if (covered(at)) return;
  window.clearTimeout(hideTimer);
  window.clearTimeout(offTimer);
  el.replaceChildren();
  if (opts.who) el.append(Object.assign(document.createElement('small'), { textContent: opts.who }));
  el.append(text);
  el.className = opts.goat ? 'goat' : '';
  // (measure it where it will be, off screen, then set it down above the anchor, or below it when there is no room above)
  el.style.left = '0px';
  el.style.top = '-999px';
  const r = el.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const left = Math.min(vw - r.width - 8, Math.max(8, at.x - r.width / 2));
  const above = at.y - r.height - 10 >= 4;
  el.classList.toggle('below', !above);
  const spot = keepClear(left, above ? at.y - r.height - 10 : at.y + 14, r.width, r.height);
  if (!spot) {
    el.classList.remove('on');
    return;
  }
  el.style.left = `${Math.round(spot.left)}px`;
  el.style.top = `${Math.round(spot.top)}px`;
  el.style.setProperty('--tail', `${Math.round(Math.min(r.width - 12, Math.max(12, at.x - spot.left)))}px`);
  void el.offsetWidth;
  el.classList.add('on');
  hideTimer = window.setTimeout(() => {
    el.classList.remove('on');
    el.classList.add('off');
  }, opts.hold ?? HOLD_MS);
}

/** COMBAT-HUD: the bubble showing (or fading), set clear again of the HUD as it now stands (a line said at the deploy stays up as the fight's spell row
 *  and boss bar come in). Nothing moves when it already is clear. */
export function reclearQuip(): void {
  // (a bubble fading out is set clear too: a toast coming into the lane would otherwise lie under it for the fade, BOSS-BAR)
  if (!box || !(box.classList.contains('on') || box.classList.contains('off'))) return;
  const r = box.getBoundingClientRect();
  const spot = keepClear(r.left, r.top, r.width, r.height);
  // (no clear spot: the bubble goes at once rather than lie over the HUD while it fades)
  if (!spot) {
    box.classList.remove('on');
    box.style.top = '-999px';
    return;
  }
  if (Math.round(spot.top) !== Math.round(r.top)) box.style.top = `${Math.round(spot.top)}px`;
  if (Math.round(spot.left) !== Math.round(r.left)) {
    // (moved sideways: its tail keeps pointing at the speaker, as far as the bubble reaches)
    const tail = parseFloat(box.style.getPropertyValue('--tail')) || r.width / 2;
    box.style.left = `${Math.round(spot.left)}px`;
    box.style.setProperty('--tail', `${Math.round(Math.min(r.width - 12, Math.max(12, r.left + tail - spot.left)))}px`);
  }
}

/** Clear the bubble now (a screen closing, a new fight). */
export function hideQuip(): void {
  window.clearTimeout(hideTimer);
  window.clearTimeout(queued);
  box?.classList.remove('on');
}

/** A line, and after a beat a reply from someone else (the banter). `at` and `replyAt` are looked up when each is shown, as the speakers may have moved. */
export function showBanter(first: { at: () => Anchor | null; text: string; who: string }, reply: { at: () => Anchor | null; text: string; who: string }): void {
  const a = first.at();
  if (!a) return;
  showQuip(a, first.text, { who: first.who });
  window.clearTimeout(queued);
  queued = window.setTimeout(() => {
    const b = reply.at();
    if (b) showQuip(b, reply.text, { who: reply.who });
  }, REPLY_AFTER_MS);
}
