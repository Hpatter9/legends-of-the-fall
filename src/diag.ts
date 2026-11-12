// WAVE-DELAY (docs/notes/wave-delay.md): the page's part of the stops' log (`diagRules.ts` has the rules). `diagFrame` is called once
// a frame by the page's own loop and costs two comparisons when nothing is wrong; `diagMark` is called where the page begins something
// heavy; the log is written to storage only when a stop is added.
import { inApp } from './appUpdate';
import { diagHead, diagText, doingIn, isStop, parseDiag, stepsText, withStop, type DiagEnv, type DiagMark, type DiagStep, type DiagStop } from './diagRules';

declare const __GAME_VERSION__: string;
const KEY = 'legends.diag';
let log: DiagStop[] | null = null;
let last = 0;
let marks: DiagMark[] = [];

function load(): DiagStop[] {
  if (!log) {
    try {
      log = parseDiag(localStorage.getItem(KEY));
    } catch {
      log = [];
    }
  }
  return log;
}

/** The page has begun something that may take a while (a few words: "the next board built"). */
export function diagMark(what: string): void {
  marks.push({ t: performance.now(), what });
  if (marks.length > 40) marks = marks.slice(-20);
}

/** A part of this frame's work took `ms` (and ran once more): kept until the frame's end, and written into a stop's line if the frame
 *  turns out to be one, so a long stop says which part of it was long. Costs a map's update. */
const steps = new Map<string, DiagStep>();
export function diagStep(name: string, ms: number): void {
  const s = steps.get(name);
  if (s) {
    s.ms += ms;
    s.n++;
  } else steps.set(name, { ms, n: 1 });
}

/** Do `fn`, and keep how long it took as a part of this frame's work. */
export function diagTimed<T>(name: string, fn: () => T): T {
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    diagStep(name, performance.now() - t0);
  }
}

/** The frames stopped on purpose (the page hidden, the home screen up with the board's loop at rest): the next gap is not a stop. */
export function diagRest(): void {
  last = 0;
  steps.clear();
}

/** Once a frame: a gap of half a second or more since the last frame is kept. */
export function diagFrame(phase: string): void {
  const now = performance.now();
  const gap = last ? now - last : 0;
  const from = last;
  last = now;
  const parts = steps.size ? stepsText(steps) : '';
  steps.clear();
  if (!isStop(gap)) return;
  log = withStop(load(), { at: Date.now() - Math.round(gap), ms: Math.round(gap), phase, v: __GAME_VERSION__, doing: `${doingIn(marks, from, now)}${parts ? ` [${parts}]` : ''}` });
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* (no room, or no storage: the log stays in memory) */
  }
}

/** Where the game is running, as far as the browser tells. */
function env(): DiagEnv {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  return {
    v: __GAME_VERSION__,
    app: inApp(),
    agent: nav.userAgent,
    memoryGB: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : undefined,
    heapLimitMB: mem ? Math.round(mem.jsHeapSizeLimit / 1048576) : undefined,
    screen: `${innerWidth}x${innerHeight} at ${devicePixelRatio}`,
  };
}

/** Something the page did to cure itself (a stopped loop started again, a board built afresh, the page loaded again): written to
 *  the log as a line of its own, with no length. */
export function diagEvent(phase: string, what: string): void {
  log = withStop(load(), { at: Date.now(), ms: 0, phase, v: __GAME_VERSION__, doing: what });
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* (the log stays in memory) */
  }
}

/** The log as text: where the game is running, then the stops, newest first. */
export const diagShown = (): string => `${diagHead(env())}\n\n${diagText(load())}`;

/** Put the log on the clipboard: the browser's own way, or, where that is not there or is refused (an app's WebView), a text box
 *  selected and copied the old way. Says whether it went. */
export async function diagCopy(): Promise<boolean> {
  const text = diagShown();
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* (the old way below) */
  }
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;left:0;top:0;opacity:0;';
    document.body.append(box);
    box.select();
    box.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    box.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Empty the log. */
export function diagClear(): void {
  log = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* (nothing to do) */
  }
}

if (typeof document !== 'undefined') document.addEventListener('visibilitychange', diagRest);
