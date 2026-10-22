// How a summoning is staged, as plain data and pure functions (no Pixi, no DOM, no sound), so a test can check them. The gacha has
// already decided the pull; this only picks how big a show it gets: the best rarity in the pull sets the tier (Common and Rare
// keep the plain hall show, Epic, Legendary and Mythic escalate), a NEW hero of Epic or better gets the full show with a banner
// and a showcase pose, a repeat gets about half of it plus the shards gained, and the other new Legendary or Mythic heroes of a
// ten-pull get a quick showcase each. The hall (`hall.ts`) draws the plan and `sound.ts` plays its cues.

import type { Pull } from '../sim/meta';
import { pullTimeline, type Timeline } from './hallSpots';

export type ShowTier = 'plain' | 'epic' | 'legendary' | 'mythic';

/** The tier of show for the best rarity in a pull (1 to 5). */
export const showTier = (best: number): ShowTier => (best >= 5 ? 'mythic' : best === 4 ? 'legendary' : best === 3 ? 'epic' : 'plain');

/** The sounds a show asks for (`sound.ts` makes them). */
export type ShowCue = 'riseEpic' | 'riseLegend' | 'riseMythic' | 'stingEpic' | 'stingLegend' | 'stingMythic' | 'heartbeat' | 'slam';

export interface Showcase {
  /** The index of the hero in the pull. */
  idx: number;
  at: number;
  dur: number;
  /** A quick one for an extra high-rarity hero of a ten-pull. */
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
  /** The hero the show is built round: the best rarity, a new one before a repeat, then the first. */
  star: number;
  fresh: boolean;
  /** A new hero of Epic or better: the full show. */
  full: boolean;
  reduced: boolean;
  /** Charge, flare, beam and the heroes' arrivals (the old pull's shape); `done` includes the showcases. */
  tl: Timeline;
  /** How long each hero takes to rise (the star's is slower at Legendary and Mythic). */
  rises: number[];
  /** The star is a black silhouette until this time (0 for none). */
  silhouetteUntil: number;
  /** When the star is fully in view. */
  revealAt: number;
  /** When the ribbon slams in (-1: no ribbon). */
  ribbonAt: number;
  /** How dark the room gets at most (0 to 1). */
  dim: number;
  /** Heartbeat thumps (ms), Mythic only. */
  thumps: number[];
  /** The screen shake: when, how long, how far (css px at most). amp 0 for none. */
  shakeAt: number;
  shakeMs: number;
  shakeAmp: number;
  /** The white flash (-1: none). */
  flashAt: number;
  showcase: Showcase[];
  cards: Card[];
  cues: { at: number; cue: ShowCue }[];
}

/** The star of a pull: the best rarity, a new hero before a repeat of the same rarity, then the earliest. */
export function starOf(got: readonly Pick<Pull, 'rarity' | 'isNew'>[]): number {
  let star = 0;
  got.forEach((p, i) => {
    const s = got[star];
    if (p.rarity > s.rarity || (p.rarity === s.rarity && p.isNew && !s.isNew)) star = i;
  });
  return star;
}

/** Times (ms) of a tier's full show; a repeat takes half of the charge, beam and rise. */
const BASE = {
  epic: { charge: 1400, flare: 250, beam: 900, rise: 400, hold: 250, card: 1200, dim: 0.18, amp: 3, shakeMs: 350 },
  legendary: { charge: 1900, flare: 300, beam: 1100, rise: 600, hold: 400, card: 1500, dim: 0.55, amp: 7, shakeMs: 700 },
  mythic: { charge: 2300, flare: 350, beam: 1300, rise: 1000, hold: 500, card: 1600, dim: 0.88, amp: 9, shakeMs: 1000 },
} as const;

/** How long a quick showcase of an extra high-rarity hero lasts. */
export const MINI_MS = 900;
/** Most extra showcases in one pull (a ten pull of nothing but Legendaries still moves along). */
export const MAX_EXTRAS = 4;

const TIER_CUES = {
  epic: ['riseEpic', 'stingEpic'],
  legendary: ['riseLegend', 'stingLegend'],
  mythic: ['riseMythic', 'stingMythic'],
} as const;

/** The show for a pull: its tier, timing, showcases and sounds. `reduced` is a calm fade: the ribbons stay, the shake, flash, darkness and thumps go. */
export function summonPlan(got: readonly Pull[], reduced = false): ShowPlan {
  const best = Math.max(...got.map((p) => p.rarity));
  const tier = showTier(best);
  const star = starOf(got);
  const fresh = got[star].isNew;
  const full = tier !== 'plain' && fresh;
  const none = { silhouetteUntil: 0, revealAt: 0, ribbonAt: -1, dim: 0, thumps: [], shakeAt: 0, shakeMs: 0, shakeAmp: 0, flashAt: -1, showcase: [], cards: [], cues: [] };
  if (tier === 'plain') {
    const tl = pullTimeline(got.length, best, reduced);
    return { tier, star, fresh, full, reduced, tl, rises: got.map(() => tl.rise), ...none };
  }
  const b = BASE[tier];
  const k = fresh ? 1 : 0.5;
  const count = got.length;
  // (the star steps out last, so everything builds to it; the others keep the plain show's quick rhythm)
  const order = [...got.keys()].filter((i) => i !== star).concat(star);
  const gap = count > 5 ? 110 : 160;
  const charge = reduced ? 150 : Math.round(b.charge * k);
  const flare = charge + (reduced ? 300 : Math.max(200, Math.round(b.flare * k)));
  const beam = flare + (reduced ? 250 : Math.round(b.beam * k));
  const rise = reduced ? 500 : Math.round(b.rise * k);
  const heroAt: number[] = Array(count).fill(0);
  const rises: number[] = Array(count).fill(reduced ? 500 : 380);
  order.forEach((idx, rank) => {
    heroAt[idx] = reduced ? flare : flare + 100 + rank * gap;
    if (idx === star) rises[idx] = rise;
  });
  const revealAt = heroAt[star] + rises[star];
  const hold = reduced ? 150 : Math.round(b.hold * k);
  const ribbonAt = tier === 'epic' ? -1 : tier === 'mythic' ? revealAt : heroAt[star] + Math.round(rises[star] / 2);
  const rise0 = reduced ? 'riseEpic' : TIER_CUES[tier][0];
  const cues: ShowPlan['cues'] = [{ at: 0, cue: rise0 }];
  const thumps: number[] = [];
  if (tier === 'mythic' && !reduced) {
    for (const f of (fresh ? [0.3, 0.5, 0.65, 0.78, 0.89] : [0.5, 0.75, 0.9])) thumps.push(Math.round(charge * f));
    for (const at of thumps) cues.push({ at, cue: 'heartbeat' });
  }
  cues.push({ at: flare, cue: TIER_CUES[tier][1] });
  if (ribbonAt >= 0) cues.push({ at: ribbonAt, cue: 'slam' });
  // showcases: the new star's pose, then a quick one for each other new Legendary or Mythic
  const showcase: Showcase[] = [];
  const cards: Card[] = [];
  let end = Math.max(...heroAt.map((a, i) => a + rises[i])) + (reduced ? 300 : 700);
  const cardAt = ribbonAt >= 0 ? ribbonAt : revealAt;
  let at = revealAt + hold;
  if (full) {
    const dur = reduced ? 900 : b.card;
    showcase.push({ idx: star, at, dur, mini: false });
    at += dur;
    cards.push({ idx: star, at: cardAt, end: at, fresh: true });
  } else {
    // (a repeat: its name and the shards it gave stay up for a moment)
    cards.push({ idx: star, at: cardAt, end: revealAt + hold + (reduced ? 700 : 900), fresh: false });
    end = Math.max(end, cards[0].end);
  }
  let extras = 0;
  if (tier !== 'epic') {
    got.forEach((p, i) => {
      if (i === star || !p.isNew || p.rarity < 4 || extras >= MAX_EXTRAS) return;
      extras++;
      const dur = reduced ? 700 : MINI_MS;
      showcase.push({ idx: i, at, dur, mini: true });
      cards.push({ idx: i, at, end: at + dur, fresh: true });
      at += dur;
    });
  }
  if (showcase.length) end = Math.max(end, at + 150);
  const tl: Timeline = { charge, flare, beam, heroAt, rise, done: end };
  return {
    tier, star, fresh, full, reduced, tl, rises,
    silhouetteUntil: tier === 'mythic' && !reduced ? revealAt : 0,
    revealAt, ribbonAt,
    dim: reduced ? 0 : b.dim * (fresh ? 1 : 0.7),
    thumps,
    shakeAt: flare,
    shakeMs: b.shakeMs,
    shakeAmp: reduced ? 0 : b.amp * (fresh ? 1 : 0.6),
    flashAt: reduced || tier === 'epic' ? -1 : flare,
    showcase, cards,
    cues,
  };
}

/** The showcase playing at `t` (ms), if any. */
export const showcaseAt = (plan: ShowPlan, t: number): Showcase | null => plan.showcase.find((s) => t >= s.at && t < s.at + s.dur) ?? null;

/** The name card to show at `t` (ms), if any. */
export const cardAt = (plan: ShowPlan, t: number): Card | null => plan.cards.find((c) => t >= c.at && t < c.end) ?? null;

/** The darkness over the room at `t` (0 to 1): it falls over the charge, holds to the flare, then lifts (a Mythic leaves a dusk). */
export function dimAt(plan: ShowPlan, t: number): number {
  if (plan.dim <= 0) return 0;
  const { charge, flare, beam } = plan.tl;
  const lift = plan.tier === 'mythic' ? 0.4 : 0;
  if (t < charge) return plan.dim * Math.min(1, t / Math.max(1, charge * (plan.tier === 'mythic' ? 0.4 : 0.8)));
  if (t < flare) return plan.dim;
  const p = Math.min(1, (t - flare) / Math.max(1, beam - flare));
  return plan.dim * (lift + (1 - lift) * (1 - p));
}

/** The screen shake at `t` as a 0 to 1 strength (it fades out); the caller scales it by `shakeAmp`. */
export function shakeAt(plan: ShowPlan, t: number): number {
  if (plan.shakeAmp <= 0 || t < plan.shakeAt || t >= plan.shakeAt + plan.shakeMs) return 0;
  const p = (t - plan.shakeAt) / plan.shakeMs;
  return (1 - p) * (1 - p);
}
