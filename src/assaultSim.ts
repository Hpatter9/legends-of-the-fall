// The Assault's simulation for the page (phase 2, `docs/notes/assault-2.md`): in a Web Worker where the browser has one (`assaultWorker.ts`), so
// a slow tick never holds up a frame, or on the page's own thread where it has none (or the worker fails to start). Either way the page sees
// the same: `b`, the battle to draw and read (the worker's copy, merged after each batch, `sim/assault/mirror.ts`), `pump` to step it, `call`
// for the player's orders, and `final` for the battle to settle.

import { startAssault, stepAssault } from './sim/assault/assault';
import { applyMirror, type TickOut } from './sim/assault/mirror';
import { snapshotDue } from './sim/assault/snapshot';
import { CALLS, type CallName } from './sim/assault/calls';
import type { AssaultInput } from './sim/assault/holdTypes';
import type { Battle } from './sim/battle';
import type { FromWorker, ToWorker } from './assaultWorker';
import { saveBattle } from './assaultSave';

/** The worker's file (built beside game.js by `build.mjs`, kept by the service worker). */
const WORKER_URL = 'assault-worker.js';
/** A worker that has not answered the start by then is let go, and the battle runs on the page. */
const START_MS = 8000;

export class AssaultSim {
  /** Each tick's milliseconds (in the worker, or here). */
  readonly ms: number[] = [];
  /** With a worker, each batch's milliseconds on the page: the copy brought up to it (the page's whole share of the simulation). */
  readonly copyMs: number[] = [];
  /** A snapshot was kept (the page notes it in the save). */
  onSnapshot?: () => void;
  private queue: TickOut[] = [];
  private pending = 0;
  private finalWait: ((b: Battle) => void) | null = null;

  private constructor(readonly b: Battle, private worker: Worker | null) {}

  /** Whether the simulation runs in a worker. */
  get inWorker(): boolean {
    return !!this.worker;
  }

  /** Start an assault (or resume one): in a worker if it can be had and `worker` is not false. */
  static async start(o: { input?: AssaultInput; ranks?: Battle['spells']['ranks']; resume?: Battle; worker?: boolean }): Promise<AssaultSim> {
    if (o.worker !== false && typeof Worker !== 'undefined') {
      try {
        const w = new Worker(WORKER_URL);
        const battle = await new Promise<Battle | null>((ok) => {
          const timer = setTimeout(() => ok(null), START_MS);
          w.onmessage = (e: MessageEvent<FromWorker>) => {
            if (e.data.type !== 'init') return;
            clearTimeout(timer);
            ok(e.data.battle);
          };
          w.onerror = () => {
            clearTimeout(timer);
            ok(null);
          };
          const msg: ToWorker = o.resume ? { type: 'resume', battle: o.resume } : { type: 'start', input: o.input!, ...(o.ranks ? { ranks: o.ranks } : {}) };
          w.postMessage(msg);
        });
        if (battle) {
          const sim = new AssaultSim(battle, w);
          w.onmessage = (e: MessageEvent<FromWorker>) => sim.hear(e.data);
          return sim;
        }
        w.terminate();
      } catch {
        // (no worker: the page runs it)
      }
    }
    const b = o.resume ?? startAssault(o.input!);
    if (!o.resume && o.ranks) b.spells.ranks = o.ranks;
    return new AssaultSim(b, null);
  }

  private hear(m: FromWorker): void {
    if (m.type === 'batch') {
      const t0 = performance.now();
      applyMirror(this.b, m);
      this.copyMs.push(performance.now() - t0);
      this.queue.push(...m.ticks);
      this.ms.push(...m.ms);
      this.pending = 0;
      if (m.snapshot) this.onSnapshot?.();
    } else if (m.type === 'final') this.finalWait?.(m.battle);
  }

  /** Ask for up to `n` more ticks; the ticks stepped since the last call come back (with a worker, a frame or so after they are asked for). */
  pump(n: number): TickOut[] {
    if (this.worker) {
      if (!this.pending && n > 0 && this.b.phase === 'fight') {
        this.pending = n;
        this.worker.postMessage({ type: 'step', n } satisfies ToWorker);
      }
      return this.queue.splice(0);
    }
    const out: TickOut[] = [];
    for (let i = 0; i < n && this.b.phase === 'fight'; i++) {
      const t0 = performance.now();
      const ev = stepAssault(this.b);
      this.ms.push(performance.now() - t0);
      out.push({ ev, hold: this.b.field!.hold!.events.slice() });
      if (snapshotDue(this.b)) {
        void saveBattle(this.b);
        this.onSnapshot?.();
      }
    }
    return out;
  }

  /** A call of the player's: made on the page's battle (its answer is the one shown) and, with a worker, sent to the worker's. */
  call<N extends CallName>(name: N, ...args: Parameters<(typeof CALLS)[N]> extends [Battle, ...infer R] ? R : never): ReturnType<(typeof CALLS)[N]> {
    const r = (CALLS[name] as (b: Battle, ...a: unknown[]) => ReturnType<(typeof CALLS)[N]>)(this.b, ...(args as unknown[]));
    this.worker?.postMessage({ type: 'call', name, args } satisfies ToWorker);
    return r;
  }

  /** The battle to settle: the worker's own (the truth), or the page's. */
  final(): Promise<Battle> {
    if (!this.worker) return Promise.resolve(this.b);
    return new Promise((ok) => {
      this.finalWait = ok;
      this.worker!.postMessage({ type: 'final' } satisfies ToWorker);
    });
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
