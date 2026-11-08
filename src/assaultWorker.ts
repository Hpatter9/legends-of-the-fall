// The Assault's simulation in a Web Worker (phase 2, `docs/notes/assault-2.md`; the design's fallback in 7.2): the long field fight runs here,
// off the page's thread, so a slow tick never holds up a frame. The page sends it the start (an input, or a battle to resume), the number of
// ticks to step, and the player's calls; it sends back each batch's events and what changed (`sim/assault/mirror.ts`), and keeps the battle
// for a resume every twenty seconds (`assaultSave.ts`, IndexedDB works in a worker).
//
// The battle here is the truth. It steps exactly as it would on the page: the same functions, in the same order.

import { startAssault, stepAssault } from './sim/assault/assault';
import { packMirror, type TickOut } from './sim/assault/mirror';
import { snapshotDue } from './sim/assault/snapshot';
import { CALLS, type CallName } from './sim/assault/calls';
import { saveBattle } from './assaultSave';
import type { Battle } from './sim/battle';
import type { AssaultInput } from './sim/assault/holdTypes';

export type ToWorker =
  | { type: 'start'; input: AssaultInput; ranks?: Battle['spells']['ranks'] }
  | { type: 'resume'; battle: Battle }
  | { type: 'step'; n: number }
  | { type: 'call'; name: CallName; args: unknown[] }
  | { type: 'final' };

export type FromWorker = { type: 'init'; battle: Battle } | ({ type: 'batch'; snapshot: boolean } & ReturnType<typeof packMirror>) | { type: 'final'; battle: Battle };

let b: Battle | null = null;
const sent = new Set<number>();
const post = (m: FromWorker) => (self as unknown as Worker).postMessage(m);

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  if (m.type === 'start' || m.type === 'resume') {
    b = m.type === 'start' ? startAssault(m.input) : m.battle;
    if (m.type === 'start' && m.ranks) b.spells.ranks = m.ranks;
    sent.clear();
    for (const x of b.units) sent.add(x.id);
    post({ type: 'init', battle: b });
    return;
  }
  if (!b) return;
  if (m.type === 'call') {
    (CALLS[m.name] as (b: Battle, ...a: unknown[]) => unknown)(b, ...m.args);
    return;
  }
  if (m.type === 'final') {
    post({ type: 'final', battle: b });
    return;
  }
  // (a batch: the ticks asked for, each timed, its events kept; the battle kept for a resume when a snapshot falls)
  const ticks: TickOut[] = [];
  const ms: number[] = [];
  let snapshot = false;
  for (let i = 0; i < m.n && b.phase === 'fight'; i++) {
    const t0 = performance.now();
    const ev = stepAssault(b);
    ms.push(performance.now() - t0);
    ticks.push({ ev, hold: b.field!.hold!.events.slice() });
    if (snapshotDue(b)) {
      snapshot = true;
      void saveBattle(b);
    }
  }
  post({ type: 'batch', snapshot, ...packMirror(b, ticks, ms, sent) });
};
