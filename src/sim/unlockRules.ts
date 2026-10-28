// Unlocking heroes: the numbers only (few imports, so `meta.ts`, `starter.ts` and the pages can all read them). A hero is
// collected shard by shard, a summoning stone to a shard, until it joins; ten heroes never come that way and join on a milestone of
// the game instead (`contentHeroes.ts`). See `unlock.ts` for the pulls and the shards, and `docs/notes/hero-shards.md`.

import { ALL_HEROES } from './units';

/** The heroes that join on a milestone, never from a pull or a chest (their milestones are in `contentHeroes.ts`). */
export const CONTENT_KINDS: readonly string[] = ['werewolf', 'reaper', 'demonSwordsman', 'samuraiCommander', 'juggernaut', 'dreadPirate', 'tyrant', 'timeWitch', 'dragoon', 'sage'];
export const isContent = (kind: string): boolean => CONTENT_KINDS.includes(kind);
/** The heroes pulls and chests can unlock, collected by shards. */
export const PULL_HEROES: readonly string[] = ALL_HEROES.filter((k) => !isContent(k));

/** Unlock shards a hero not yet owned needs, by how many pullable heroes are owned (the starter's three count): few for the first heroes after the starter, many for the last. */
export const NEED_FIRST = 2;
export const NEED_LAST = 100;
const OWNED_FIRST = 3;
export const unlockNeed = (owned: number): number => {
  const t = Math.max(0, Math.min(1, (owned - OWNED_FIRST) / (PULL_HEROES.length - 1 - OWNED_FIRST)));
  return Math.round(NEED_FIRST + (NEED_LAST - NEED_FIRST) * t ** 1.6);
};

/** A hero already begun is this much likelier (per unlock shard held) to turn up in a pull than one not begun, so bars fill rather than all creeping. */
export const STICKY = 6;
/**
 * Each hero owned beyond the starter's three makes every hero owned likelier to turn up in a pull (weight `1 + OWNED_BOOST x (owned - 3) ^ OWNED_POW`),
 * so a pull is a new hero's shard less and less often as the roster grows, and most late pulls are rank shards: crowns stay useful for ranks, awakening
 * and talents while the pull stays at a flat price (crowns come in far faster late in the game than early, so a price alone could not gate it).
 */
export const OWNED_BOOST = 2;
export const OWNED_POW = 2.2;
/** After this many pulls in a row that gave no unlock shards, the next gives unlock shards of the hero closest to joining; the wait grows by `PITY_GROW` for each hero owned beyond the starter's three. */
export const PITY_PULLS = 3;
export const PITY_GROW = 6;
export const pityAt = (owned: number): number => PITY_PULLS + PITY_GROW * Math.max(0, owned - OWNED_FIRST);
/** The weight of every hero owned in a pull's draw, for a roster with `owned` pullable heroes. */
export const ownedWeight = (owned: number): number => 1 + OWNED_BOOST * Math.max(0, owned - OWNED_FIRST) ** OWNED_POW;
/** Unlock shards a repeat-of-a-pull gives, and the rank shards a repeat of an owned hero gives. */
export const DUPLICATE_SHARDS = 1;
/** Summoning stones an army chest holds, by its star milestone (3 bronze, 5 silver, 10 gold, 11 the Mythic star's), and a daily chest: its base, and one more for each bonus star. */
export const CHEST_STONES: Readonly<Record<number, number>> = { 3: 1, 5: 1, 10: 3, 11: 5 };
export const DAILY_CHEST_STONES = 2;
/** Stones each stone draw of a Calamity clear pays (`calReward.ts`). */
export const CAL_STONES_PER_DRAW = 3;
/** The lucky roll of a stone: one in this many summons a whole hero not yet owned instead of a shard. */
export const LUCKY_ODDS = 100;
/** The rank shards the lucky roll gives once every pullable hero is owned. */
export const LUCKY_RANK_SHARDS = 10;
/** Stones given once to a save from before the stones, past its starter pick (ten pulls' worth; the crowns it holds stay crowns). */
export const STONES_GIFT = 10;
