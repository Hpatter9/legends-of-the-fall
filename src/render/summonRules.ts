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

/** Taps on the show this soon after it starts are let go (a second tap on the summon button, a common double tap on a phone, used to skip a new hero's whole arrival). */
export const SKIP_GUARD_MS = 450;

/** What a tap on the show at `t` (ms) does: `'ignore'` in the first moments, `'reveal'` (jump to `plan.revealAt`, the new hero in full view with its ribbon) while a grand show is still building, `'end'` (straight to the cards) otherwise. So a join is never skipped past the moment the hero appears. */
export function skipAction(plan: ShowPlan, t: number): 'ignore' | 'reveal' | 'end' {
  if (t < SKIP_GUARD_MS) return 'ignore';
  if (plan.full && t < plan.revealAt) return 'reveal';
  return 'end';
}

// SUMMON-SHOW: the order of a draw's results (the owner: "Have the tarot cards, shards only show first. Then after that the
// unlocked heroes can show"). Every shard card comes first, turned one after another (or all at once); only when every one is
// turned do the new heroes come, each with its own full reveal, in the order they were drawn, the last one held until a tap.

/** How long the spread waits, once every shard card is turned, before the first new hero's reveal (time to read the totals). */
export const HEROES_AFTER_MS = 1100;
/** With no shard card in the draw (every pull a new hero), the first reveal comes almost at once. */
export const HEROES_AT_ONCE_MS = 350;
/** How long a hero's reveal stays on its name before going on by itself to the next hero (all but the last; a tap goes sooner). */
export const HERO_ONWARD_MS = 1800;
/** The gap between one shard card turning by itself and the next. */
export const CARD_GAP_MS = 140;
/** When the first shard card turns by itself. */
export const FIRST_CARD_MS = 260;

export interface DrawOrder {
  /** The shard cards (every pull that is not a new hero), in the order drawn: shown first. */
  cards: number[];
  /** The new heroes, in the order drawn: each a full reveal after every card is turned. */
  heroes: number[];
  /** The hero whose reveal is held until a tap (the last); -1 with no new hero. */
  held: number;
  /** How long after the last card turns the first reveal starts (0 with no new hero). */
  heroesAfter: number;
}

/** The order a draw's results are shown in: shards first, then the new heroes. A draw of shards only has no heroes (it ends on the
 *  spread and its totals); a draw of new heroes only has no cards (the reveals start almost at once). */
export function drawOrder(got: readonly Pick<Pull, 'isNew'>[]): DrawOrder {
  const cards: number[] = [];
  const heroes: number[] = [];
  got.forEach((p, i) => (p.isNew ? heroes : cards).push(i));
  return {
    cards,
    heroes,
    held: heroes.length ? heroes[heroes.length - 1] : -1,
    heroesAfter: !heroes.length ? 0 : cards.length ? HEROES_AFTER_MS : HEROES_AT_ONCE_MS,
  };
}

/** When each shard card turns by itself (ms from the spread opening), in the order of `drawOrder`'s cards. */
export const cardTimes = (n: number): number[] => Array.from({ length: n }, (_, i) => FIRST_CARD_MS + i * CARD_GAP_MS);

/** A line of the shard totals: one hero's whole share of the draw. */
export interface ShardTotal {
  kind: string;
  /** How many cards of the draw were this hero's. */
  cards: number;
  /** Unlock shards gained (a hero not yet owned), and its bar after the last of them. */
  unlock: number;
  have?: number;
  need?: number;
  /** Rank shards gained (a hero owned). */
  rank: number;
  /** Crowns from cards of a hero with nothing left to buy. */
  crowns: number;
  /** The hero joins in this same draw (its reveal comes after the cards). */
  joins: boolean;
  lucky: boolean;
}

/** The shard totals of a draw, a line a hero, in the order each hero was first drawn. New-hero pulls add no line of their own (a
 *  hero with shard cards too is marked `joins`). */
export function shardTotals(got: readonly Pull[]): ShardTotal[] {
  const lines = new Map<string, ShardTotal>();
  for (const p of got) {
    if (p.isNew) continue;
    const t = lines.get(p.kind) ?? { kind: p.kind, cards: 0, unlock: 0, rank: 0, crowns: 0, joins: false, lucky: false };
    t.cards++;
    if (p.unlock) {
      t.unlock += p.unlock;
      t.have = p.have;
      t.need = p.need;
    }
    t.rank += p.shards;
    t.crowns += p.crowns ?? 0;
    t.lucky ||= !!p.lucky;
    lines.set(p.kind, t);
  }
  for (const p of got) {
    const t = lines.get(p.kind);
    if (p.isNew && t) t.joins = true;
  }
  return [...lines.values()];
}

// SUMMON-SHOW part 2: when each Blender piece of a new hero's show plays (pure). The pieces' own frames and times are in the generated
// `summonFxData.ts`; this lays them on the reveal's clock, which `firstReveal`'s beats share: the charge from 0 to the flash (1.4 s),
// the rift opening to the arrival (1.9 s), the burst over the arrival, then the aftermath, looping, under the hero until the scene closes.

/** The reveal's beats (ms) the show is laid to: the charge, the rift, the arrival. */
export const SHOW_AT = { charge: 0, rift: 1400, burst: 1900 } as const;
/** The aftermath fades in over this as the burst ends. */
export const AFTER_FADE_MS = 300;

export interface ShowClip { n: number; ms: number; loop: boolean }
export interface ShowFrame { piece: 'charge' | 'rift' | 'burst' | 'after'; frame: number; alpha: number }

/** The frames of a hero's show at `t` ms (drawn in order: under first). A piece played once holds no frame past its end. */
export function heroShowAt(t: number, clips: Readonly<Record<'charge' | 'rift' | 'burst' | 'after', ShowClip>>): ShowFrame[] {
  const out: ShowFrame[] = [];
  const once = (piece: 'charge' | 'rift' | 'burst', from: number, until: number): void => {
    const c = clips[piece];
    if (t < from || t >= until) return;
    out.push({ piece, frame: Math.min(c.n - 1, Math.floor((t - from) / c.ms)), alpha: 1 });
  };
  once('charge', SHOW_AT.charge, SHOW_AT.rift);
  once('rift', SHOW_AT.rift, SHOW_AT.burst);
  const burstEnd = SHOW_AT.burst + clips.burst.n * clips.burst.ms;
  const afterAt = burstEnd - AFTER_FADE_MS;
  if (t >= afterAt) {
    const a = clips.after;
    out.push({ piece: 'after', frame: Math.floor((t - afterAt) / a.ms) % a.n, alpha: Math.min(1, (t - afterAt) / AFTER_FADE_MS) });
  }
  once('burst', SHOW_AT.burst, burstEnd);
  return out;
}

/** Where a skipped show goes on from: the arrival's burst still plays (a skip never cuts the hero's entrance to nothing). */
export const skipShowTo = (t: number): number => Math.max(t, SHOW_AT.burst);

/** The frame of a shard card's flourish at `t` ms after its turn, or -1 once it is over. */
export const flourishAt = (t: number, clip: ShowClip): number => (t < 0 || t >= clip.n * clip.ms ? -1 : Math.floor(t / clip.ms));

/** How much a hero's show weighs once decoded (bytes: four to a pixel of every sheet), for the memory budget. */
export const decodedBytes = (sheets: readonly { w: number; h: number }[]): number => sheets.reduce((n, s) => n + s.w * s.h * 4, 0);
