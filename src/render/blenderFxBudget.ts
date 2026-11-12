// BLENDER-FX (docs/notes/blender-fx.md): what the effect atlases may cost a phone, and who goes first when they cost too much. Pure: the
// loader (`blenderFxArt.ts`) asks this what to start, what to give up and what to take off the graphics card, and does it.
//
// An atlas a fight loads as it needs it (an ultimate's stage, a showcase's beats) is held three ways: fetched and DECODED (its pixels in
// memory, four bytes each), and, once a clip of it has been drawn, UPLOADED to the graphics card as well. Both are budgeted in pixels. The
// rules:
//   - at most `LOADS` atlases are fetched and decoded at a time; the rest wait their turn (one asked for by something about to be drawn
//     goes to the front);
//   - an atlas is never started if it would take the decoded pixels over `DECODED_PX`: the least recently used ones are given up first to
//     make room, and if none may be given up yet it waits (its clips keep their older looks meanwhile);
//   - once the uploaded pixels pass `UPLOADED_PX`, the least recently drawn atlases are taken off the graphics card (they stay decoded, and
//     go back up if drawn again);
//   - nothing used within `GUARD_MS` is given up or taken down: a clip of it may still be on the screen;
//   - a load that has not answered in `TIMEOUT_MS` is given up as failed; a failed atlas is tried again, after `RETRY_MS`, `TRIES` times
//     in all;
//   - the atlases every fight needs (the core) are pinned: never given up, and outside the budget.

export const BFX_MEM = {
  /** How many atlases may be fetched and decoded at once. */
  LOADS: 2,
  /** The most pixels of fight-loaded atlases held decoded (12 million: 48 MB), and the most of them on the graphics card (6 million: 24 MB). */
  DECODED_PX: 12_000_000,
  UPLOADED_PX: 6_000_000,
  /** How long after its last use an atlas is left alone (ms): longer than any clip of it plays. */
  GUARD_MS: 8000,
  /** How long a load may take before it is given up (ms), how long before a failed one is tried again, and how many tries it has. */
  TIMEOUT_MS: 12000,
  RETRY_MS: 5000,
  TRIES: 3,
} as const;
export type BfxMem = { readonly [K in keyof typeof BFX_MEM]: number };

interface Page {
  state: 'queued' | 'loading' | 'ready' | 'failed';
  /** When it was last asked for or used (ms), and when its load began or failed. */
  used: number;
  since: number;
  tries: number;
  /** A clip of it has been handed out to be drawn since it was last taken off the graphics card. */
  drawn: boolean;
}

/** What the loader is to do now: begin these loads, forget these atlases altogether, take these off the graphics card. */
export interface BfxActions {
  start: number[];
  drop: number[];
  unload: number[];
}

/** The book of the fight-loaded atlases: which are wanted, loading, held and drawn, and the budget's rules over them. `px(a)` is atlas
 *  `a`'s pixels, `pinned(a)` whether it is one of the core. Times are the caller's clock, in ms. */
export class BfxPages {
  private pages = new Map<number, Page>();
  private queue: number[] = [];

  constructor(
    private px: (a: number) => number,
    private pinned: (a: number) => boolean,
    private mem: BfxMem = BFX_MEM,
  ) {}

  /** Atlas `a` is wanted (a fight warming its heroes' ultimates). `urgent`: something is about to draw it, so it goes to the front. */
  ask(a: number, now: number, urgent = false): void {
    const p = this.pages.get(a);
    if (p && p.state === 'failed') {
      if (p.tries >= this.mem.TRIES || now - p.since < this.mem.RETRY_MS) return;
      p.state = 'queued';
      p.used = now;
      this.queue.push(a);
    } else if (p) p.used = Math.max(p.used, now);
    else {
      this.pages.set(a, { state: 'queued', used: now, since: now, tries: 0, drawn: false });
      this.queue.push(a);
    }
    if (urgent && this.queue.includes(a)) this.queue = [a, ...this.queue.filter((q) => q !== a)];
  }

  /** A clip of atlas `a` is about to be drawn: true when the atlas is held (and it counts as drawn, and used now); else it is asked for,
   *  urgently, and the caller keeps its older look this time. */
  use(a: number, now: number): boolean {
    const p = this.pages.get(a);
    if (p?.state === 'ready') {
      p.used = Math.max(p.used, now);
      p.drawn = true;
      return true;
    }
    this.ask(a, now, true);
    return false;
  }

  /** A load ended: well (the atlas is held from now) or not (it failed; `ask` may try it again later). False when the book had already
   *  given the load up (it was late): the caller throws its picture away. */
  done(a: number, ok: boolean, now: number): boolean {
    const p = this.pages.get(a);
    if (!p || p.state !== 'loading') return false;
    p.state = ok ? 'ready' : 'failed';
    p.since = now;
    p.used = Math.max(p.used, now);
    return true;
  }

  /** What to do now. Loads past their time are given up first; then the uploaded pixels are brought under their budget; then the queue is
   *  started, two at a time, each only if the decoded budget has room for it or room can be made. */
  step(now: number): BfxActions {
    const out: BfxActions = { start: [], drop: [], unload: [] };
    for (const p of this.pages.values()) {
      if (p.state === 'loading' && now - p.since >= this.mem.TIMEOUT_MS) {
        p.state = 'failed';
        p.since = now;
      }
    }
    // (the least recently used first, among those held, not pinned, and left alone long enough)
    const idle = (drawnOnly: boolean) =>
      [...this.pages.entries()]
        .filter(([a, p]) => p.state === 'ready' && !this.pinned(a) && now - p.used >= this.mem.GUARD_MS && (!drawnOnly || p.drawn))
        .sort((x, y) => x[1].used - y[1].used || x[0] - y[0])
        .map(([a]) => a);
    let up = this.uploadedPx();
    for (const a of idle(true)) {
      if (up <= this.mem.UPLOADED_PX) break;
      this.pages.get(a)!.drawn = false;
      out.unload.push(a);
      up -= this.px(a);
    }
    let loading = [...this.pages.values()].filter((p) => p.state === 'loading').length;
    let held = this.decodedPx(true);
    const spare = idle(false);
    const waiting: number[] = [];
    for (const a of this.queue) {
      const p = this.pages.get(a)!;
      if (loading >= this.mem.LOADS) {
        waiting.push(a);
        continue;
      }
      if (!this.pinned(a)) {
        while (held + this.px(a) > this.mem.DECODED_PX && spare.length) {
          const gone = spare.shift()!;
          this.pages.delete(gone);
          out.drop.push(gone);
          held -= this.px(gone);
        }
        if (held + this.px(a) > this.mem.DECODED_PX) {
          waiting.push(a);
          continue;
        }
        held += this.px(a);
      }
      p.state = 'loading';
      p.since = now;
      p.tries++;
      loading++;
      out.start.push(a);
    }
    this.queue = waiting;
    return out;
  }

  /** Whether anything is still waiting or loading (the loader keeps its clock running while so). */
  busy(): boolean {
    return this.queue.length > 0 || [...this.pages.values()].some((p) => p.state === 'loading');
  }

  /** The pixels of fight-loaded atlases held decoded (with `loading`, those being decoded too), and those on the graphics card. */
  decodedPx(loading = false): number {
    let n = 0;
    for (const [a, p] of this.pages) if (!this.pinned(a) && (p.state === 'ready' || (loading && p.state === 'loading'))) n += this.px(a);
    return n;
  }
  uploadedPx(): number {
    let n = 0;
    for (const [a, p] of this.pages) if (!this.pinned(a) && p.state === 'ready' && p.drawn) n += this.px(a);
    return n;
  }
  /** How many atlases are held (the pinned ones too). */
  held(): number {
    return [...this.pages.values()].filter((p) => p.state === 'ready').length;
  }
  state(a: number): Page['state'] | undefined {
    return this.pages.get(a)?.state;
  }
}
