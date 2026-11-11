// POPUP-GUARD (docs/notes/popup-guard.md; the rule is `popupGuardRules.ts`): the page's side of the popup guard. One set of listeners, first
// in line on the window, reads each tap against the popups the game has raised (`GUARDED`) and swallows the ones the rule calls dead: a tap
// on a popup that has only just appeared, a click whose finger went down before it came, a tap on its backdrop. A popup not yet ready
// wears `pgWait` (its buttons dimmed), then `pgReady` for a moment as they light.
//
// Only a finger's own events are read (`isTrusted`): the phone's Back presses a popup's button from the page (`phoneBack.ts`), Escape is a
// key, and both close a popup at once. A cinematic is not in the list, so a tap skips one as before.

import { GUARD_MS, GUARDED, tapVerdict, type GuardedPopup } from './popupGuardRules';

interface Open {
  l: GuardedPopup;
  e: HTMLElement;
  at: number;
}

/** When each open popup appeared (by the page's clock). */
const seen = new WeakMap<Element, number>();
let open: Open[] = [];
let inRun: () => boolean = () => false;
/** This tap: when its finger went down, and whether that was swallowed. */
let downAt: number | null = null;
let downDead = false;
/** What the guard swallowed, for the checks (`window.__popupGuard.log`). */
const log: { type: string; why: string; popup: string; at: number }[] = [];

const ALL = GUARDED.map((l) => l.sel).join(', ');

const shown = (e: HTMLElement): boolean => {
  if (e.hidden || e.closest('[hidden]')) return false;
  const cs = getComputedStyle(e);
  return cs.display !== 'none' && cs.visibility !== 'hidden';
};

/** Read the page: stamp a popup newly open with the time and dim its buttons; forget one that has gone (shown again, it is new again). */
function scan(now: number): void {
  const found = document.querySelectorAll<HTMLElement>(ALL);
  const next: Open[] = [];
  const guard = inRun();
  for (const e of found) {
    const l = GUARDED.find((g) => e.matches(g.sel));
    if (!l || !(l.always || guard) || !shown(e)) continue;
    let at = seen.get(e);
    if (at === undefined) {
      at = now;
      seen.set(e, at);
      e.classList.add('pgWait');
      window.setTimeout(() => {
        if (!e.classList.contains('pgWait')) return;
        e.classList.replace('pgWait', 'pgReady');
        window.setTimeout(() => e.classList.remove('pgReady'), 400);
      }, GUARD_MS);
    }
    next.push({ l, e, at });
  }
  for (const o of open)
    if (!next.some((n) => n.e === o.e)) {
      seen.delete(o.e);
      o.e.classList.remove('pgWait', 'pgReady');
    }
  open = next;
}

let dirty = false;
function later(): void {
  if (dirty) return;
  dirty = true;
  requestAnimationFrame(() => {
    dirty = false;
    scan(performance.now());
  });
}

function on(type: 'down' | 'up' | 'click', e: Event): void {
  if (!e.isTrusted) return;
  const now = performance.now();
  scan(now);
  const key = type === 'click' && (e as MouseEvent).detail === 0;
  if (type === 'down') {
    downAt = now;
    downDead = false;
  }
  const t = e.target instanceof Node ? e.target : null;
  const newest = open.reduce((m, o) => Math.max(m, o.at), -Infinity);
  // (the innermost guarded popup holding what was tapped: its backdrop is "outside" it)
  const own = open.filter((o) => t && o.e.contains(t)).sort((a, b) => (a.e.contains(b.e) ? 1 : -1))[0];
  const facts = {
    type,
    young: open.length > 0 && now - newest < GUARD_MS,
    downBefore: !key && downAt !== null && downAt < newest,
    downDead: !key && downDead,
    onVeil: !!own && !!own.l.veil && t === own.e,
  };
  const verdict = open.length ? tapVerdict(facts) : 'pass';
  if (type === 'down') downDead = verdict === 'dead';
  if (type === 'click') {
    downAt = null;
    downDead = false;
  }
  if (verdict === 'pass') return;
  log.push({ type, why: facts.downDead ? 'downDead' : facts.young ? 'young' : facts.downBefore ? 'downBefore' : 'veil', popup: (own ?? open[open.length - 1])?.l.sel ?? '', at: Math.round(now) });
  if (log.length > 80) log.shift();
  e.preventDefault();
  e.stopImmediatePropagation();
}

/** How long ago the newest guarded popup appeared, or Infinity with none open (the short card's own tap asks: `main.ts`). */
export function popupAge(e: HTMLElement): number {
  scan(performance.now());
  const at = seen.get(e);
  return at === undefined ? Infinity : performance.now() - at;
}

/** Tell the guard how to know a run is going (anywhere but the home screen). */
export function guardRuns(running: () => boolean): void {
  inRun = running;
  later();
}

/** Start the guard. Once, before the page's other listeners, so it is first in line. */
export function installPopupGuard(): void {
  addEventListener('pointerdown', (e) => on('down', e), true);
  addEventListener('pointerup', (e) => on('up', e), true);
  addEventListener('click', (e) => on('click', e), true);
  new MutationObserver(later).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'open'] });
  later();
  (window as unknown as { __popupGuard: unknown }).__popupGuard = { log, open: () => open.map((o) => ({ sel: o.l.sel, id: o.e.id, age: Math.round(performance.now() - o.at) })), ms: GUARD_MS };
}
