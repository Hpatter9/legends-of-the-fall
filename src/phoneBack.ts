// PHONE-BACK (docs/notes/phone-back.md; the rules are `backRules.ts`): the phone's Back, and Escape, never leave the game. One handler,
// `phoneBack()`, reads the page (the topmost layer open, else where the player is) and does what `backAction` says: it presses the layer's
// own way out, skips a cinematic with a tap, goes to the Battle tab, or opens the place's own leave or pause control.
//
// How Back reaches it:
// - The browser and the installed app: a history guard. The page keeps one entry pushed over its own (`GUARD_KEY`); Back pops it, the page
//   hears `popstate`, handles it, and pushes the guard again, so there is always one to pop and the history never grows past two. The
//   address is kept as it is (its query, as `?bench=assault`, and any hash). Chrome skips an entry pushed without a touch when Back is
//   pressed, so the guard is pushed again at the next touch or key too.
// - The Android app (Capacitor): `MainActivity` takes the system Back itself and calls `window.__phoneBack()`; the app never finishes on it.
// - Escape on a desktop: the same handler, before any menu's own Escape, so one press closes one thing.

import { BACK_LAYERS, backAction, guardState, isGuard, wayOut, type BackAction, type BackLayer, type BackPlace } from './backRules';

export interface BackHooks {
  /** Where the player is with nothing open, and the home screen's tab. */
  place(): { place: BackPlace; tab?: string };
  /** Go to the home screen's Battle tab. */
  battleTab(): void;
  /** Open the place's own leave or pause control. */
  pause(place: BackPlace): void;
}

/** What each Back did, for the checks (`window.__backLog`). */
const log: { action: BackAction['do']; layer?: string; at: number }[] = [];

const shown = (e: Element): boolean => {
  if (!(e instanceof HTMLElement) || !e.isConnected) return false;
  if (e.hidden || e.closest('[hidden]')) return false;
  const cs = getComputedStyle(e);
  if (cs.display === 'none' || cs.visibility === 'hidden') return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** The open layers: every element a known layer's selector finds, shown. */
function openLayers(): { l: BackLayer; e: HTMLElement }[] {
  const out: { l: BackLayer; e: HTMLElement }[] = [];
  for (const l of BACK_LAYERS) for (const e of document.querySelectorAll<HTMLElement>(l.sel)) if (shown(e)) out.push({ l, e });
  return out;
}

/** The topmost open layer: the one holding what is uppermost on the screen at one of a few points (the screen's own hit-test, so the stacking
 *  order decides, whatever made it). A layer under something that is not one (a layer left under the Assault's field) is not on top. */
export function topLayer(): { l: BackLayer; e: HTMLElement } | null {
  const open = openLayers();
  if (!open.length) return null;
  const w = innerWidth;
  const h = innerHeight;
  for (const [x, y] of [[w / 2, h / 2], [w / 2, h * 0.3], [w / 2, h * 0.75], [w / 2, h * 0.08]]) {
    const hit = document.elementFromPoint(x, y);
    if (!hit) continue;
    // (the innermost open layer holding the point: a picker in Settings, a sheet on the home screen)
    const holding = open.filter((o) => o.e === hit || o.e.contains(hit));
    if (holding.length) return holding.sort((a, b) => (a.e.contains(b.e) ? 1 : b.e.contains(a.e) ? -1 : 0))[0];
  }
  return null;
}

/** A tap on an element (its middle): the pointer's down and up, and the click, as a finger's would be. */
function tap(e: HTMLElement): void {
  const r = e.getBoundingClientRect();
  const at = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch', isPrimary: true };
  e.dispatchEvent(new PointerEvent('pointerdown', at));
  e.dispatchEvent(new PointerEvent('pointerup', at));
  e.dispatchEvent(new MouseEvent('click', at));
}

/** Close or skip a layer: its named controls first, then a button of its own that reads as a way out, then its own close (an ornate menu),
 *  then a tap on it. */
function actOn({ l, e }: { l: BackLayer; e: HTMLElement }): void {
  for (const sel of l.act ?? []) {
    const c = [...e.querySelectorAll<HTMLElement>(sel), ...document.querySelectorAll<HTMLElement>(sel)].find((x) => (e === x || e.contains(x)) && shown(x) && !(x as HTMLButtonElement).disabled);
    if (c) return void c.click();
  }
  if (l.kind === 'overlay') {
    const buttons = [...e.querySelectorAll<HTMLButtonElement>('button')].filter((b) => shown(b) && !b.disabled);
    const i = wayOut(buttons.map((b) => b.textContent || b.getAttribute('aria-label') || ''));
    if (i >= 0) return void buttons[i].click();
    if (e.classList.contains('omVeil')) return void e.dispatchEvent(new Event('omclose'));
  }
  tap(e);
}

let hooks: BackHooks | null = null;

/** Back: do what `backAction` says from here. */
export function phoneBack(): BackAction['do'] {
  const top = topLayer();
  const where = hooks?.place() ?? { place: 'other' as BackPlace };
  const a = backAction({ top: top?.l.kind ?? null, place: where.place, tab: where.tab });
  log.push({ action: a.do, layer: top?.l.sel, at: Date.now() });
  if (log.length > 50) log.shift();
  if ((a.do === 'skip' || a.do === 'close') && top) actOn(top);
  else if (a.do === 'battleTab') hooks?.battleTab();
  else if (a.do === 'pause') hooks?.pause(where.place);
  return a.do;
}

/** Push the guard over the page's own entry, unless it is up already. The address is kept as it is. */
function arm(): void {
  try {
    if (!isGuard(history.state)) history.pushState(guardState(history.state), '', location.href);
  } catch {
    /* a sandboxed frame: Back is the platform's */
  }
}

/** Start: the hooks, the guard, Back's `popstate`, the touches that re-arm it, Escape, and the Android app's door. Once. */
export function initPhoneBack(h: BackHooks): void {
  if (hooks) return;
  hooks = h;
  arm();
  window.addEventListener('popstate', (e) => {
    // (a Back popped the guard: handle it, and put the guard back; a step forward onto the guard is nothing)
    if (isGuard(e.state)) return;
    phoneBack();
    arm();
  });
  // (Chrome skips an entry pushed without a touch: the next touch or key pushes it again if it is gone)
  for (const type of ['pointerdown', 'keydown'] as const) window.addEventListener(type, arm, { capture: true, passive: true });
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // (first, so a menu's own Escape does not close a second thing too)
      e.preventDefault();
      e.stopImmediatePropagation();
      phoneBack();
    },
    { capture: true },
  );
  const w = window as unknown as { __phoneBack: () => string; __backLog: typeof log };
  w.__phoneBack = () => phoneBack();
  w.__backLog = log;
}
