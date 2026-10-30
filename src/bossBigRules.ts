// BOSS-BIG on the page (docs/notes/boss-big-attacks.md): the rules of how a boss's signature attack is shown. Pure: no DOM, no Pixi, so
// the tests read it; `render/bossFx.ts` draws the marks and the blow on the board, `bossMoment.ts` the cut-in band.
//
// The windup (the sim's `bossSig` warn event): the tiles it will strike are marked in red, each mark filling in from its middle over the
// windup's battle time (so it runs with the fight's speed), steady with reduced motion, and never blinking out. The cut-in: a red and black
// band slashes in with the boss's figure and the attack's name; in full (the Full ultimate scenes setting on, Auto off) the fight is held
// for it alone (`CUT_MS`, real time), not for the windup, which runs on after it; short (the setting off, or Auto) the band is shorter
// and the fight runs on under it. The blow: the ultimate's look at its size (ULT-EPIC: the element's painted burst on a few spots across
// the marks, its nova and ring), a ring of the element's wave on every struck tile, a short hit-stop and a hard shake (none with the
// screen kept still), and a deep sting.

/** The shared timings and sizes. */
export const BOSS_BIG_LOOK = {
  /** The cut-in in full: the fight held this long (real ms). */
  CUT_MS: 1000,
  /** The short cut-in (no hold). */
  SHORT_MS: 900,
  /** The hit-stop on the blow (ms) and the shake (the fight's trauma, 0 to 1). */
  HIT_STOP_MS: 150,
  SHAKE: 0.8,
  /** The painted bursts at most (battery saver: fewer). */
  BURSTS: 5,
  BURSTS_SAVER: 2,
  /** The marks: the colour, the outline's and the fill's strength as it fills in. */
  RED: 0xff2a1a,
  DARK: 0x3a0606,
  FILL_FROM: 0.12,
  FILL_TO: 0.62,
};

/** Whether a signature gets the held cut-in: the same rule as an ultimate's full moment (`fullScene`). */
export const heldCut = (ultFull: boolean, auto: boolean): boolean => ultFull && !auto;

/** How far a mark has filled in, 0 to 1, `t` ms into a windup of `ms` (eased so the end comes on sure). */
export function markFill(t: number, ms: number): number {
  if (ms <= 0) return 1;
  const k = Math.max(0, Math.min(1, t / ms));
  return 1 - (1 - k) * (1 - k);
}

/** The mark's look `t` ms into the windup: the inner fill's size (a share of the tile), its strength, and the outline's. With the screen
 *  kept still it fills the same way, but does not breathe. Never below its floor, so it never blinks out. */
export function markLook(t: number, ms: number, calm: boolean): { size: number; fill: number; edge: number } {
  const k = markFill(t, ms);
  const breathe = calm ? 0 : 0.08 * Math.sin((t / (300 - 180 * k)) * Math.PI);
  return { size: 0.25 + 0.75 * k, fill: BOSS_BIG_LOOK.FILL_FROM + (BOSS_BIG_LOOK.FILL_TO - BOSS_BIG_LOOK.FILL_FROM) * k + breathe * k, edge: 0.75 + 0.25 * k };
}

/** The tiles the painted bursts go on: spread over the marks (the one nearest their middle, then each the farthest from those chosen),
 *  at most `BURSTS` (`BURSTS_SAVER` on battery saver). Tiles by index on a board `w` wide. */
export function burstTiles(tiles: readonly number[], w: number, saver: boolean): { u: number; v: number }[] {
  const pts = tiles.map((i) => ({ u: i % w, v: Math.floor(i / w) }));
  if (!pts.length) return [];
  const n = Math.min(pts.length, saver ? BOSS_BIG_LOOK.BURSTS_SAVER : BOSS_BIG_LOOK.BURSTS);
  const mu = pts.reduce((s, p) => s + p.u, 0) / pts.length;
  const mv = pts.reduce((s, p) => s + p.v, 0) / pts.length;
  const d2 = (a: { u: number; v: number }, u: number, v: number) => (a.u - u) ** 2 + (a.v - v) ** 2;
  const out = [pts.reduce((best, p) => (d2(p, mu, mv) < d2(best, mu, mv) ? p : best))];
  while (out.length < n) {
    let far = pts[0];
    let farD = -1;
    for (const p of pts) {
      const d = Math.min(...out.map((o) => d2(p, o.u, o.v)));
      if (d > farD) {
        far = p;
        farD = d;
      }
    }
    // (a small spread: no two bursts on top of each other)
    if (farD < 4) break;
    out.push(far);
  }
  return out;
}
