// MARCH-STAYS (docs/notes/march-stays.md): the hand-over from the march between two waves to the next wave's deploy. The owner:
// "make sure the heroes don't disappear from the map in between waves. currently they walk to the next section, then disappear
// until the next round is ready. I also want the already fallen into place battleground to stay visible." The marchers were taken
// off the stage the moment the walk ended, and the next fight's fighters were only made a second and a half later (longer on a
// phone, longer still behind a card or a cinematic); nothing drew the party in between. So, by rule and not by timing: a marcher
// leaves the stage for one reason only, that the next fight's fighters have been made; and nothing that builds a board takes the
// picture on show away before the new one is ready to go up in the same frame. Pure: the tests read it; `chainView.ts`,
// `boardView.ts` and `main.ts` carry it out.
import { turnDir, type Rot } from '../sim/turn';

/** Where a marcher is: walking to the next section, standing on it where it arrived, or gone (its fighter of the next fight is up). */
export type Marcher = 'walking' | 'standing' | 'gone';

/** What can happen to a marcher: it `arrived` at its tile; the walk was `cut` short (a tap on the card, a new board asked for); the
 *  board was `built` again under it (the next fight's, or the loop watch's cure); the scenery was laid again (`synced`); the next
 *  fight's `fighters` were made. */
export type MarchEvent = 'arrived' | 'cut' | 'built' | 'synced' | 'fighters';

/** The marcher after `ev`. Only the next fight's fighters, made, take a marcher off the stage: a walk that ends or is cut short
 *  leaves it standing (at the tile it was walking to), and a board built or a road laid again under it changes nothing. */
export function marcherAfter(at: Marcher, ev: MarchEvent): Marcher {
  if (at === 'gone') return 'gone';
  if (ev === 'fighters') return 'gone';
  if (ev === 'arrived' || ev === 'cut') return 'standing';
  return at;
}

/** Whether a marcher is drawn: always, until it is gone. */
export const marcherDrawn = (at: Marcher): boolean => at !== 'gone';

/** Whether the fighters just made are the next fight's, so the marchers may go: they are when the battle on the page is no longer
 *  the one the party marched away from (or there was no march). (The loop watch's cure makes the finished fight's fighters again while the party stands:
 *  those are not the next fight's, and the marchers stay.) */
export const fightersTakeOver = (marchedFrom: unknown, battleNow: unknown): boolean => marchedFrom === null || marchedFrom === undefined || battleNow !== marchedFrom;

/** Which board is the one on show at the world's origin. Once the party has marched away from a finished fight the host is the
 *  section it marched to, not the finished fight's board: a board built afresh in that time (the loop watch's cure) must build the
 *  section, or the settled battleground would be swapped for a second copy of the old one. */
export const hostOnShow = (o: { marched: boolean; hasNext: boolean }): 'next section' | 'the battle' => (o.marched && o.hasNext ? 'next section' : 'the battle');

/** The steps of laying a board over the one on show, in the only order that never shows an empty field: the new columns are made
 *  first (the slow part, and the one that can fault); only then is the old picture taken down, and the new one goes up at once, in
 *  the same frame. A fault while making leaves the old picture standing. */
export const BUILD_ORDER = ['make the new', 'take the old down', 'put the new up'] as const;
export type BuildStep = (typeof BUILD_ORDER)[number];

/** What is on the stage after a build that ran `done` of its steps and then stopped (a fault): the old picture, the new one, or
 *  nothing. The rule is that this is never 'nothing' for a build that faulted while making. */
export function stageAfter(done: readonly BuildStep[]): 'old' | 'new' | 'nothing' {
  if (done.includes('put the new up')) return 'new';
  return done.includes('take the old down') ? 'nothing' : 'old';
}

/** The way a stander faces: as the deploy's fighter will (a hero is set down facing the far edge, the sim's facing 3), read through
 *  the next section's turn into the march's own unturned frame, so the fighter that takes its place looks the same. */
export function standFacing(rot: Rot): number {
  const [dU, dV] = turnDir(rot, 0, -1);
  const i = [[1, 0], [0, 1], [-1, 0], [0, -1]].findIndex(([u, v]) => u === dU && v === dV);
  return i < 0 ? 3 : i;
}

/** The film's measure (`tools/march-stays/film.mjs` keeps the same sums): of the pictures drawn from the fight's end to the deploy,
 *  how many were short of a marcher, and how many, once the next section had settled, were short of a tile or had one in the air
 *  again. A hand-over holds when all three are nought. */
export interface FilmFrame {
  /** How many of the marchers have a fighter drawn. */
  heroes: number;
  /** The host section's tiles, how many are fully drawn, and how many are lifted off their places. */
  tiles: number;
  shown: number;
  lifted: number;
  /** Whether the next section has settled by this picture (every tile down, or the march over). */
  settled: boolean;
}
export function filmFaults(frames: readonly FilmFrame[], marchers: number): { heroGaps: number; tileGaps: number; refalls: number } {
  let heroGaps = 0;
  let tileGaps = 0;
  let refalls = 0;
  for (const f of frames) {
    if (f.heroes < marchers) heroGaps++;
    if (!f.settled) continue;
    if (f.tiles === 0 || f.shown < f.tiles) tileGaps++;
    if (f.lifted > 0) refalls++;
  }
  return { heroGaps, tileGaps, refalls };
}

/** A tile of a board. */
export type Spot2 = [number, number];

/** Where each of the squad is set down on a fight's deploy rows, in the squad's order: where it stood last (`wish`) when it still
 *  `fits` there, else the first `free` tile; `take` sets it down (and may refuse). Null for a hero with nowhere to stand. The page
 *  sets the squad down with this, and the march asks it first, of a rehearsal of the next fight, so each marcher walks to the very
 *  tile its fighter will be set down on: a hero whose old tile is a boulder, a trap or a foe's on the new board no longer stands in
 *  one place and jumps to another at the hand-over. */
export function squadTiles(
  ids: readonly number[],
  wish: (id: number) => Spot2 | undefined,
  fits: (id: number, at: Spot2) => boolean,
  free: () => Spot2 | null,
  take: (id: number, at: Spot2) => boolean,
): Map<number, Spot2 | null> {
  const out = new Map<number, Spot2 | null>();
  for (const id of ids) {
    const was = wish(id);
    const at = was && fits(id, was) ? was : free();
    out.set(id, at && take(id, at) ? at : null);
  }
  return out;
}

/** Who marches: every hero of the squad that fought and will be set down for the next wave, the fallen with the standing. A fallen
 *  hero is back for the next wave; it rises where it fell as the march sets out and walks in with the party, where it used to lie
 *  on the old section and then appear at the deploy. Summons and anyone not of the squad stay behind. */
export const marches = (u: { side: string; summon: boolean; tag?: number }, squad: readonly number[]): boolean => u.side === 'hero' && !u.summon && u.tag !== undefined && squad.includes(u.tag);

/** The camera at the hand-over: the deploy lays the page out afresh (the bench and the Fight button come up, the board is fitted to
 *  the room left), which moved the picture in one cut. This is the camera that shows, in the new layout, exactly the picture that
 *  was on the screen (`k` the world's scale on the screen, `baseX`/`baseY` where the world's origin was drawn), so the deploy's own
 *  eases carry it from there to the deploy's framing with no jump. With reduced motion the cut is kept (the page does not ask). */
export function sameView(was: { k: number; baseX: number; baseY: number }, scale: number, safe: { x: number; y: number; w: number; h: number }): { zoom: number; cx: number; cy: number } {
  return { zoom: was.k / scale, cx: (safe.x + safe.w / 2 - was.baseX) / was.k, cy: (safe.y + safe.h / 2 - was.baseY) / was.k };
}
