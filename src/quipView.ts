// The small speech bubble a hero (or Duchess) talks in: one at a time, a few words, in a framed box with a tail, over whatever is
// showing. It fades in once and fades out once (nothing loops or flashes), never takes a tap (pointer-events: none) and goes by
// itself after a moment. A banter reply follows the first line. Only the page uses this; the rules for when to speak are in
// `render/quipRules.ts`.

const CSS = `
#quip { position: fixed; z-index: 60; max-width: min(232px, calc(100vw - 24px)); box-sizing: border-box; padding: 6px 9px; pointer-events: none; opacity: 0; transition: opacity 0.18s ease-out;
  background: var(--s14); color: var(--s1); border: 2px solid var(--s1); border-radius: 6px; box-shadow: 0 2px 0 rgb(var(--black-rgb) / 0.5);
  font: 400 12px/1.3 var(--body, sans-serif); text-align: center; }
#quip.on { opacity: 1; }
#quip.off { transition-duration: 0.3s; }
#quip::after { content: ''; position: absolute; left: var(--tail, 50%); top: 100%; width: 0; height: 0; margin-left: -5px; border: 5px solid transparent; border-top-color: var(--s1); }
#quip.below::after { top: auto; bottom: 100%; border-top-color: transparent; border-bottom-color: var(--s1); }
#quip.goat { background: var(--e10); }
#quip small { display: block; margin-bottom: 1px; font: 400 12px/1.2 var(--body, sans-serif); color: var(--s9); }
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

/** Show `text` over `at` (replacing any bubble already up). `who` names the speaker in small type above it; `goat` is Duchess's cream bubble. */
export function showQuip(at: Anchor, text: string, opts: { who?: string; goat?: boolean; hold?: number } = {}): void {
  const el = ensure();
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
  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(above ? at.y - r.height - 10 : at.y + 14)}px`;
  el.style.setProperty('--tail', `${Math.round(Math.min(r.width - 12, Math.max(12, at.x - left)))}px`);
  void el.offsetWidth;
  el.classList.add('on');
  hideTimer = window.setTimeout(() => {
    el.classList.remove('on');
    el.classList.add('off');
  }, opts.hold ?? HOLD_MS);
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
