// How a summoning is staged, as plain data and pure functions (no Pixi, no DOM, no sound), so a test can check them. The gacha has
// already decided the pull; this only picks how big a show it gets: a pull with a NEW hero in it gets the grand show (a ribbon,
// a banner and a showcase pose for the hero it is built round), a pull of repeats keeps the plain hall show and shows the shards
// gained, and the other new heroes of a ten-pull get a quick showcase each. No hero is grander than another: the show
// follows only whether it is new. The hall (`hall.ts`) draws the plan and `sound.ts` plays its cues.

import type { Pull } from '../sim/meta';
import { pullTimeline, type Timeline } from './hallSpots';

export type ShowTier = 'plain' | 'grand';

/** The tier of show for a pull: grand when it holds a new hero, plain when it is all repeats. */
export const showTier = (got: readonly Pick<Pull, 'isNew'>[]): ShowTier => (got.some((p) => p.isNew) ? 'grand' : 'plain');

/** The sounds a show asks for (`sound.ts` makes them). */
export type ShowCue = 'riseSummon' | 'stingSummon' | 'slam';

export interface Showcase {
  /** The index of the hero in the pull. */
  idx: number;
  at: number;
  dur: number;
  /** A quick one for an extra new hero of a ten-pull. */
  mini: boolean;
}

export interface Card {
  idx: number;
  at: number;
  end: number;
  /** A new hero (it gets the NEW HERO banner); a repeat shows its shards. */
  fresh: boolean;
}

export interface ShowPlan {
  tier: ShowTier;
  /** The hero the show is built round: the first new one, else the first. */
  star: number;
  fresh: boolean;
  /** The grand show with a showcase pose (the star is a new hero). */
  full: boolean;
  reduced: boolean;
  /** Charge, flare, beam and the heroes' arrivals (the old pull's shape); `done` includes the showcases. */
  tl: Timeline;
  /** How long each hero takes to rise (the star's is slower in the grand show). */
  rises: number[];
  /** When the star is fully in view. */
  revealAt: number;
  /** When the ribbon slams in (-1: no ribbon). */
  ribbonAt: number;
  /** How dark the room gets at most (0 to 1). */
  dim: number;
  /** The screen shake: when, how long, how far (css px at most). amp 0 for none. */
  shakeAt: number;
  shakeMs: number;
  shakeAmp: number;
  showcase: Showcase[];
  cards: Card[];
  cues: { at: number; cue: ShowCue }[];
}

/** The star of a pull: the first new hero, else the first hero. */
export function starOf(got: readonly Pick<Pull, 'isNew'>[]): number {
  const fresh = got.findIndex((p) => p.isNew);
  return fresh < 0 ? 0 : fresh;
}

/** Times (ms) of the grand show. */
const GRAND = { charge: 1900, flare: 300, beam: 1100, rise: 600, hold: 400, card: 1500, dim: 0.55, amp: 7, shakeMs: 700 } as const;

/** How long a quick showcase of an extra new hero lasts. */
export const MINI_MS = 900;
/** Most extra showcases in one pull (a ten pull of nothing but new heroes still moves along). */
export const MAX_EXTRAS = 4;

/** The show for a pull: its tier, timing, showcases and sounds. `reduced` is a calm fade: the ribbon stays, the shake and darkness go. */
export function summonPlan(got: readonly Pull[], reduced = false): ShowPlan {
  const tier = showTier(got);
  const star = starOf(got);
  const fresh = got[star].isNew;
  const none = { revealAt: 0, ribbonAt: -1, dim: 0, shakeAt: 0, shakeMs: 0, shakeAmp: 0, showcase: [], cards: [], cues: [] };
  if (tier === 'plain') {
    const tl = pullTimeline(got.length, reduced);
    return { tier, star, fresh, full: false, reduced, tl, rises: got.map(() => tl.rise), ...none };
  }
  const b = GRAND;
  const count = got.length;
  // (the star steps out last, so everything builds to it; the others keep the plain show's quick rhythm)
  const order = [...got.keys()].filter((i) => i !== star).concat(star);
  const gap = count > 5 ? 110 : 160;
  const charge = reduced ? 150 : b.charge;
  const flare = charge + (reduced ? 300 : Math.max(200, b.flare));
  const beam = flare + (reduced ? 250 : b.beam);
  const rise = reduced ? 500 : b.rise;
  const heroAt: number[] = Array(count).fill(0);
  const rises: number[] = Array(count).fill(reduced ? 500 : 380);
  order.forEach((idx, rank) => {
    heroAt[idx] = reduced ? flare : flare + 100 + rank * gap;
    if (idx === star) rises[idx] = rise;
  });
  const revealAt = heroAt[star] + rises[star];
  const hold = reduced ? 150 : b.hold;
  const ribbonAt = heroAt[star] + Math.round(rises[star] / 2);
  const cues: ShowPlan['cues'] = [{ at: 0, cue: 'riseSummon' }, { at: flare, cue: 'stingSummon' }, { at: ribbonAt, cue: 'slam' }];
  // showcases: the new star's pose, then a quick one for each other new hero
  const showcase: Showcase[] = [];
  const cards: Card[] = [];
  let end = Math.max(...heroAt.map((a, i) => a + rises[i])) + (reduced ? 300 : 700);
  let at = revealAt + hold;
  const dur = reduced ? 900 : b.card;
  showcase.push({ idx: star, at, dur, mini: false });
  at += dur;
  cards.push({ idx: star, at: ribbonAt, end: at, fresh: true });
  let extras = 0;
  got.forEach((p, i) => {
    if (i === star || !p.isNew || extras >= MAX_EXTRAS) return;
    extras++;
    const d = reduced ? 700 : MINI_MS;
    showcase.push({ idx: i, at, dur: d, mini: true });
    cards.push({ idx: i, at, end: at + d, fresh: true });
    at += d;
  });
  end = Math.max(end, at + 150);
  const tl: Timeline = { charge, flare, beam, heroAt, rise, done: end };
  return {
    tier, star, fresh, full: true, reduced, tl, rises,
    revealAt, ribbonAt,
    dim: reduced ? 0 : b.dim,
    shakeAt: flare,
    shakeMs: b.shakeMs,
    shakeAmp: reduced ? 0 : b.amp,
    showcase, cards,
    cues,
  };
}

/** The showcase playing at `t` (ms), if any. */
export const showcaseAt = (plan: ShowPlan, t: number): Showcase | null => plan.showcase.find((s) => t >= s.at && t < s.at + s.dur) ?? null;

/** The name card to show at `t` (ms), if any. */
export const cardAt = (plan: ShowPlan, t: number): Card | null => plan.cards.find((c) => t >= c.at && t < c.end) ?? null;

/** The darkness over the room at `t` (0 to 1): it falls over the charge, holds to the flare, then lifts. */
export function dimAt(plan: ShowPlan, t: number): number {
  if (plan.dim <= 0) return 0;
  const { charge, flare, beam } = plan.tl;
  if (t < charge) return plan.dim * Math.min(1, t / Math.max(1, charge * 0.8));
  if (t < flare) return plan.dim;
  const p = Math.min(1, (t - flare) / Math.max(1, beam - flare));
  return plan.dim * (1 - p);
}

/** The screen shake at `t` as a 0 to 1 strength (it fades out); the caller scales it by `shakeAmp`. */
export function shakeAt(plan: ShowPlan, t: number): number {
  if (plan.shakeAmp <= 0 || t < plan.shakeAt || t >= plan.shakeAt + plan.shakeMs) return 0;
  const p = (t - plan.shakeAt) / plan.shakeMs;
  return (1 - p) * (1 - p);
}
