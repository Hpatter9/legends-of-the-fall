// WAVE-DELAY (docs/notes/wave-delay.md): the game's own log of its stops, so the owner can show what their phone does. Every gap
// between two frames of half a second or more is kept (when, how long, the fight's phase, and what the page had just begun, when it
// said so: a board built, a fight begun, a result shown, a skill's first use), the last thirty of them, in memory and in the save's
// storage. Settings, Diagnostics shows them, with a Copy button. Pure: no DOM, so the tests read it; `diag.ts` is the page's part.

export const DIAG = {
  /** A gap between two frames this long or longer is kept (ms). */
  GAP_MS: 500,
  /** How many are kept (the newest). */
  KEEP: 30,
  /** What the page said it was doing counts for a gap when it was said this long before the gap began at most (ms), or in it. */
  NEAR_MS: 300,
  /** A gap longer than this is the page left alone (the phone asleep, the app in the background), not a stop: not kept (ms). */
  AWAY_MS: 60000,
};

/** One stop: when (the wall clock, ms), how long (ms), the phase, the version, and what the page was doing. */
export interface DiagStop {
  at: number;
  ms: number;
  phase: string;
  v: string;
  doing: string;
}

/** What the page said it had begun, and when (the page's own clock, ms). */
export interface DiagMark {
  t: number;
  what: string;
}

/** Whether a gap between two frames is a stop to keep. */
export const isStop = (gap: number): boolean => gap >= DIAG.GAP_MS && gap < DIAG.AWAY_MS;

/** What the page was doing through a gap from `from` to `to` (its own clock): everything it said it had begun in the gap or just
 *  before it, in order, each once; "not known" with nothing said. */
export function doingIn(marks: readonly DiagMark[], from: number, to: number): string {
  const said = [...new Set(marks.filter((m) => m.t >= from - DIAG.NEAR_MS && m.t <= to).map((m) => m.what))];
  return said.length ? said.join('; ') : 'not known';
}

/** The log with one more stop: the newest `KEEP`. */
export const withStop = (log: readonly DiagStop[], stop: DiagStop): DiagStop[] => [...log, stop].slice(-DIAG.KEEP);

/** The log from what was stored (anything else: an empty log). */
export function parseDiag(raw: string | null): DiagStop[] {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is DiagStop => !!x && typeof x.at === 'number' && typeof x.ms === 'number' && typeof x.phase === 'string' && typeof x.doing === 'string').map((x) => ({ at: x.at, ms: x.ms, phase: x.phase, v: typeof x.v === 'string' ? x.v : '', doing: x.doing })).slice(-DIAG.KEEP);
  } catch {
    return [];
  }
}

const two = (n: number): string => String(n).padStart(2, '0');
/** A stop as a line of words: "14:02:31  2.4 s  fight  the next board built (0.537.0)". */
export function stopLine(s: DiagStop): string {
  const d = new Date(s.at);
  return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}  ${(s.ms / 1000).toFixed(1)} s  ${s.phase}  ${s.doing}${s.v ? ` (${s.v})` : ''}`;
}

/** Where the game is running, for the top of the log: the installed app or a browser, the browser's own name for itself, the device's
 *  memory as it tells it, the page's JS heap, the screen. Anything a browser does not tell is left out. */
export interface DiagEnv {
  v: string;
  app: boolean;
  agent: string;
  memoryGB?: number;
  heapMB?: number;
  heapLimitMB?: number;
  screen: string;
  cores?: number;
}

/** The log's heading: two or three plain lines. */
export function diagHead(e: DiagEnv): string {
  const parts = [
    `Version ${e.v} · ${e.app ? 'the installed app' : 'a browser'}`,
    e.agent,
    [e.memoryGB !== undefined ? `device memory ${e.memoryGB} GB` : '', e.cores !== undefined ? `${e.cores} cores` : '', e.heapMB !== undefined ? `heap ${e.heapMB}${e.heapLimitMB !== undefined ? ` of ${e.heapLimitMB}` : ''} MB` : '', `screen ${e.screen}`].filter(Boolean).join(' · '),
  ];
  return parts.filter(Boolean).join('\n');
}

/** The whole log as text, newest first, for the page and its Copy button. */
export const diagText = (log: readonly DiagStop[]): string => (log.length ? [...log].reverse().map(stopLine).join('\n') : 'No stop of half a second or more has been seen.');
