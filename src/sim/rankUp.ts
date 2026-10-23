// Ranking up is the player's choice. Shards earn a rank (`rankOf`, at `RANK_SHARDS`); the hero shows a "Rank up" badge, and
// the player takes the rank with a tap (`rankUp`), which raises `Meta.ranked`. Hp and attack (and the look, at the top rank's
// awakening) follow the rank taken (`takenRank`), never the shards alone. Pure rules: no Pixi, no DOM, no randomness.

import { MAX_RANK, RANK_MULT, RANK_SHARDS, rankMult, rankOf, takenRank, type Meta } from './meta';
import { canAwaken } from './awaken';

/** The rank a tap on "Rank up" would take for a hero kind: null when it is not owned or has no earned rank waiting. */
export function nextRank(m: Meta, kind: string): number | null {
  if (!m.unlocked.includes(kind)) return null;
  const have = takenRank(m, kind);
  return rankOf(m, kind) > have ? have + 1 : null;
}

export const canRankUp = (m: Meta, kind: string): boolean => nextRank(m, kind) !== null;

/** Ranks earned and waiting to be taken (0 for most heroes). */
export const rankWaiting = (m: Meta, kind: string): number => (m.unlocked.includes(kind) ? rankOf(m, kind) - takenRank(m, kind) : 0);

/** Heroes with a rank waiting, in the order of the roster given. */
export const kindsToRank = (m: Meta, kinds: readonly string[]): string[] => kinds.filter((k) => canRankUp(m, k));

export interface RankPlan {
  /** The rank now and the rank after the tap. */
  from: number;
  to: number;
  /** The shards the new rank needed in all (what the hero has earned it with). */
  shards: number;
  /** The share hp and attack gain: 1.08 for a rank. */
  gain: number;
  /** The whole multiplier of hp and attack before and after (through `rankMult`, with awakened steps counted). */
  before: number;
  after: number;
}

/** What the next rank brings (null when none is waiting). */
export function rankPlan(m: Meta, kind: string): RankPlan | null {
  const to = nextRank(m, kind);
  if (to === null) return null;
  const from = to - 1;
  const steps = m.awakened?.[kind] ?? 0;
  return { from, to, shards: RANK_SHARDS[to - 1], gain: RANK_MULT, before: rankMult(from + steps), after: rankMult(to + steps) };
}

/** Take the next earned rank. Returns the new rank, or 0 (and nothing changes) when none is waiting. */
export function rankUp(m: Meta, kind: string): number {
  const to = nextRank(m, kind);
  if (to === null) return 0;
  // (a meta with no record has every earned rank taken, so `nextRank` found none above and a record exists here)
  (m.ranked ??= {})[kind] = to;
  return to;
}

/** The top rank is awakening's door: a hero at it takes no more ranks. */
export const atTopRank = (m: Meta, kind: string): boolean => takenRank(m, kind) >= MAX_RANK;

/** Whether a hero has a step waiting for the player's tap: a rank its shards have earned, or (at the top rank) an awakening it can pay for. */
export const readyToRise = (m: Meta, kind: string): boolean => canRankUp(m, kind) || canAwaken(m, kind);

/** The heroes owned with something waiting, in the order of `kinds`. */
export const readyKinds = (m: Meta, kinds: readonly string[]): string[] => kinds.filter((k) => readyToRise(m, k));
