// Awakening: the two steps a hero kind can take above its top shard rank (rank 5 and rank 6). The numbers only, with no
// imports, so `meta.ts`, `talents.ts` and `awaken.ts` can all read them. See `awaken.ts` for the passives and the action.

/** The most steps a hero kind can awaken. */
export const MAX_AWAKEN = 2;
/** Shards a kind must have in all for each step (the top shard rank takes 10; the steps ask for 6 and then 10 more). */
export const AWAKEN_SHARDS: readonly number[] = [16, 26];
/** Shards each step uses up (they are taken from the ones a kind has to spend on talents, as `shardsToSpend` counts them). */
export const AWAKEN_COSTS: readonly number[] = [6, 10];
/** Hp and attack grow by this for each awakened step, on top of the ranks' (`RANK_MULT` each). */
export const AWAKEN_MULT = 1.08;
/** Shards in all past which a repeat pull has nothing left to buy (the last step's total), and the crowns it pays instead. */
export const SHARD_CAP = AWAKEN_SHARDS[MAX_AWAKEN - 1];
export const OVERFLOW_CROWNS = 40;

/** The shards the first `steps` awakenings used. */
export const awakenSpent = (steps: number): number => AWAKEN_COSTS.slice(0, Math.max(0, steps)).reduce((n, c) => n + c, 0);
