// What clearing a whole Calamity pays, on top of the maps' crowns and the gold chests (the owner's ask: something big for finishing):
// a heap of crowns, hero shards (the pack's own rules, `giveShards`), a Legendary or Mythic piece of gear, and a title for the
// ascension cleared (the badge shows on the victory screen and in the Calamity's menu). More at every ascension level.
// Pure rules: no Pixi, no DOM; the draws come from side streams of the run's seed.

import { ascCrowns, ASC_MAX } from './ascension';
import { itemName, grantEquipment, rollEquipment, type Rarity } from './equipment';
import { mixSeed, Rng } from './rng';
import type { Meta } from './meta';
import { drawKind, giveShards } from './unlock';
import { CHEST_PRIZE_SHARDS } from './unlockRules';

/** Crowns a clear pays at ascension 0 (the maps' own bonus, 1,700, comes besides); each ascension level adds a fifth, as every calamity pay does. */
export const CLEAR_CROWNS = 2400;
export const clearCrowns = (level: number): number => Math.round(CLEAR_CROWNS * ascCrowns(level));
/** Shard draws a clear pays: two, and one more for every two levels; each draw is a prize chest's worth of one hero's shards. */
export const clearDraws = (level: number): number => 2 + Math.floor(Math.max(0, Math.min(ASC_MAX, level)) / 2);
export const SHARDS_PER_DRAW = CHEST_PRIZE_SHARDS;

/** The title for clearing the Calamity at an ascension level (index 0 is the plain clear). */
export const CLEAR_TITLES: readonly string[] = [
  'Calamity Breaker', 'Dawn Bringer', 'Rift Warden', 'Stormbound', 'Ashen Crown', 'Voidwalker', 'Star Forger', 'Doom Sunderer', 'Eternal Champion', 'World Shaper', 'Lord of the Fall',
];
export const titleOf = (level: number): string => CLEAR_TITLES[Math.max(0, Math.min(ASC_MAX, Math.floor(level)))];
/** The best title a save has earned (by the highest ascension cleared), or none. */
export const bestTitle = (m: Pick<Meta, 'calTitles'>): string | undefined => (m.calTitles?.length ? titleOf(Math.max(...m.calTitles)) : undefined);

/** What a clear paid, for the victory screen. */
export interface ClearReward {
  crowns: number;
  /** Shards given, by hero kind (unlock shards for a hero not owned, rank shards for one owned), and the heroes they brought in. */
  shards: { kind: string; n: number; joined: boolean }[];
  /** The gear piece's name and rarity name. */
  gear: { name: string; rarity: number; base: string; level: number };
  title: string;
  /** The title is new to this save. */
  newTitle: boolean;
  level: number;
}

/** Pay the finishing reward into the meta, once. `seed` is the run's. */
export function payClear(m: Meta, seed: number, level: number, armyIdx = 0): ClearReward {
  const crowns = clearCrowns(level);
  m.crowns += crowns;
  const rng = new Rng(mixSeed(seed, 0xca1d, level));
  const shards: ClearReward['shards'] = [];
  for (let i = 0; i < clearDraws(level); i++) {
    const { kind } = drawKind(m, rng);
    const got = giveShards(m, kind, SHARDS_PER_DRAW);
    const n = got.unlock + got.rank;
    if (!n && !got.crowns) continue;
    const seen = shards.find((s) => s.kind === kind);
    if (seen) {
      seen.n += n;
      seen.joined ||= got.joined;
    } else shards.push({ kind, n, joined: got.joined });
  }
  // (the gear: Legendary, or Mythic from the sixth level, at the level of a milestone chest; from its own stream)
  const grng = new Rng(mixSeed(seed, 0xca1e, level));
  const rarity: Rarity = level >= 6 ? 5 : 4;
  const base = rollEquipment(grng, { quality: 'gold', armyIndex: armyIdx, milestone: 2 });
  const item = grantEquipment(m, { ...base, rarity });
  const title = titleOf(level);
  const had = m.calTitles?.includes(level) ?? false;
  if (!had) (m.calTitles ??= []).push(level);
  return { crowns, shards, gear: { name: itemName(item), rarity, base: item.base, level: item.level }, title, newTitle: !had, level };
}
