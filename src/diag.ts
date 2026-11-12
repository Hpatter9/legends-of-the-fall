// WAVE-DELAY (docs/notes/wave-delay.md): the page's part of the stops' log (`diagRules.ts` has the rules). `diagFrame` is called once
// a frame by the page's own loop and costs two comparisons when nothing is wrong; `diagMark` is called where the page begins something
// heavy; the log is written to storage only when a stop is added.
import { diagText, doingIn, isStop, parseDiag, withStop, type DiagMark, type DiagStop } from './diagRules';

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

/** The frames stopped on purpose (the page hidden, the home screen up with the board's loop at rest): the next gap is not a stop. */
export function diagRest(): void {
  last = 0;
}

/** Once a frame: a gap of half a second or more since the last frame is kept. */
export function diagFrame(phase: string): void {
  const now = performance.now();
  const gap = last ? now - last : 0;
  const from = last;
  last = now;
  if (!isStop(gap)) return;
  log = withStop(load(), { at: Date.now() - Math.round(gap), ms: Math.round(gap), phase, v: __GAME_VERSION__, doing: doingIn(marks, from, now) });
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* (no room, or no storage: the log stays in memory) */
  }
}

/** The log as text, newest first. */
export const diagShown = (): string => diagText(load());

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
