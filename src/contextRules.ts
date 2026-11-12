// FREEZE-FIX (docs/notes/freeze-fix.md): the graphics context taken away (a phone short of graphics memory does it). Pixi keeps the loss
// from being final and rebuilds when the browser gives the context back. When it is not given back, the picture would stay dead for
// good, so the page is loaded again, into the same run and wave. Pure: no DOM, so the tests read it; `main.ts` asks it once a second.

export const CTX = {
  /** How long a lost context is waited for before the page is loaded again (real ms). */
  RELOAD_MS: 4000,
  /** No second reload within this long of the last (real ms): a phone that loses it again at once is not sent round in a tight loop.
   *  (It was a minute; a second loss inside that minute then left the picture dead for good, which is worse than a second reload.) */
  AGAIN_MS: 15000,
};

/** Whether to load the page again now. `lostMs`: how long the context has been lost (null: it is not). `phase`: the fight's. A fight
 *  going or a deploy is safe to leave: the run was saved as its wave began and nothing of the wave has been counted yet. A fight that
 *  has ended is not: its result is being counted and shown (that card is the page's, not the picture's, and still works), so the reload
 *  waits for the next wave's deploy, when the run has been saved with the wave won. `sinceReload`: ms since the last such reload (null:
 *  none this visit). */
export function ctxReload(lostMs: number | null, phase: string, sinceReload: number | null): boolean {
  if (lostMs === null || !(lostMs >= CTX.RELOAD_MS)) return false;
  if (sinceReload !== null && sinceReload < CTX.AGAIN_MS) return false;
  return phase === 'fight' || phase === 'deploy';
}
