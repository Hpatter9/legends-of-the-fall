// What a quest pays, set by its stars and length (QUESTS-3, Q2, `docs/notes/quests-design.md` section 5). One-star and two-star quests
// pay no summoning stones (crowns, tomes, ores and keepsakes instead); the stones go to the quests of three stars and up. A story's total
// (a chain or a campaign) is shared across its parts, with the most on the finale. Hero shards from quests are kept to four and five stars.
// Pure rules: no Pixi, no DOM.

import { GIVERS, QUESTS, type QuestDef, type Reward } from './questData';
import { lengthOf, partsOf, starsOf, storyParts, type QuestLength } from './questStars';

/** Stones by stars (index 1 to 5) and length: a Short or Long quest's, and the total of a Chain or a Campaign. */
export const STONE_PAY: Readonly<Record<QuestLength, readonly number[]>> = {
  short: [0, 0, 0, 1, 3, 6],
  long: [0, 0, 0, 2, 4, 8],
  chain: [0, 0, 1, 3, 6, 12],
  campaign: [0, 0, 0, 5, 10, 20],
};
/** Crowns for a Short quest by stars; a Long is 1.5 times, a Chain 2 times and a Campaign 3 times (the totals of a story). */
export const CROWN_PAY: readonly number[] = [0, 150, 300, 600, 1000, 1600];
export const CROWN_MULT: Readonly<Record<QuestLength, number>> = { short: 1, long: 1.5, chain: 2, campaign: 3 };

/** What the table pays in all for a quest of these stars and this length: crowns and stones (a story's total, for a chain or a campaign). */
export const questPay = (stars: number, length: QuestLength): { crowns: number; stones: number } => ({
  crowns: Math.round((CROWN_PAY[stars] ?? 0) * CROWN_MULT[length]),
  stones: STONE_PAY[length][stars] ?? 0,
});

/** A part's share of a story's total: an even share, the finale taking what is left (so the most). */
export const shareOf = (total: number, part: number, parts: number): number => {
  if (parts <= 1) return total;
  const each = Math.floor(total / parts);
  return part >= parts ? total - each * (parts - 1) : each;
};

/** The reward a quest really pays (a hero tale's or lost technique's own, unchanged): its authored one, with the stones, the crowns (never less than the authored) and the shards set by its stars. */
export function rewardOf(q: QuestDef): Reward {
  // (the hero tales and the lost techniques keep the pay they were written with: a hero joins, a book is found; the design leaves them as they are)
  if (GIVERS[q.giver].slot === 'tale') return q.reward;
  const stars = starsOf(q);
  const len = lengthOf(q);
  // (a story is paid by its whole; a part is its share, the finale the most)
  const parts = len === 'chain' || len === 'campaign' ? Math.max(1, storyParts(q)) : 1;
  const part = parts > 1 ? partsOf(q) : 1;
  const pay = questPay(stars, len);
  const r: Reward = { ...q.reward };
  const crowns = shareOf(pay.crowns, part, parts);
  if (crowns > (r.crowns ?? 0)) r.crowns = crowns;
  const stones = shareOf(pay.stones, part, parts);
  if (stones) r.stones = stones;
  else delete r.stones;
  // (hero shards from quests are for the hard ones; a hero joining is the tale's own prize)
  if (stars < 4 && r.shards) delete r.shards;
  return r;
}

/** Whether a quest's chest holds stones (a quest of one or two stars pays none). */
export const chestHoldsStones = (q: QuestDef): boolean => starsOf(q) >= 3;

/** The stones every quest pays in all (once each), for the pace tool and the tests. */
export const totalQuestStones = (pool: readonly QuestDef[] = QUESTS): number => pool.filter((q) => !q.repeat).reduce((n, q) => n + (rewardOf(q).stones ?? 0), 0);
