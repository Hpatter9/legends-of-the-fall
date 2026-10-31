// The vault (the castle's Treasury) in plain words (the owner: "The vault isn't clear enough in how it works in the game";
// docs/notes/cinematic-reveal-vault.md). Its rules are unchanged (`sim/castle.ts`: +`GOLD_PER_LEVEL` starting gold a level, paid
// for in crowns and builder time; `bonusGold` is added to an army run's, a Calamity run's and a quest battle's purse, not the daily's
// or the Last Stand's): this only says them, with the save's own numbers. Pure: no Pixi, no DOM.

import { BUILDINGS, GOLD_PER_LEVEL, maxLevel, nextCost, type Castle } from './sim/castle';
import { SUMMON_BASE, SUMMON_STEP } from './sim/run';

export interface VaultInfo {
  level: number;
  max: number;
  /** The gold it adds to a run's purse now. */
  gold: number;
  /** The gold it would add at the next level, and that level's price in crowns (null at the top). */
  nextGold: number | null;
  nextCost: number | null;
  /** The most it can ever add. */
  topGold: number;
  /** The first hire in a run costs this much gold (the next ones a little more each). */
  hireCost: number;
}

export function vaultInfo(c: Castle): VaultInfo {
  const level = c.treasury;
  const max = maxLevel('treasury');
  const cost = nextCost(c, 'treasury');
  return {
    level,
    max,
    gold: GOLD_PER_LEVEL * level,
    nextGold: cost === null ? null : GOLD_PER_LEVEL * (level + 1),
    nextCost: cost,
    topGold: GOLD_PER_LEVEL * max,
    hireCost: SUMMON_BASE,
  };
}

/** The one line under the vault's name: what it does for you now. */
export function vaultLine(v: VaultInfo): string {
  return v.level === 0 ? `Not built: build it and every run starts with +${GOLD_PER_LEVEL} gold.` : `Every run starts with +${v.gold} gold in the purse.`;
}

/** The next step, in words: what the next level costs and pays, or that it is full. */
export function vaultNext(v: VaultInfo): string {
  return v.nextCost === null || v.nextGold === null ? `Full: +${v.topGold} gold, the most it holds.` : `Level ${v.level + 1}: +${v.nextGold} gold for ${v.nextCost} crowns.`;
}

/** "How the vault works": what goes in, what you get, when, and the limit. */
export function vaultBullets(v: VaultInfo): string[] {
  const prices = BUILDINGS.treasury.costs.join(', ');
  return [
    `What goes in: crowns, once a level (${prices}), and a little builder time. You never put gold in, and nothing is taken out.`,
    `What you get: +${GOLD_PER_LEVEL} gold a level, added to the purse a run starts with (a first hire costs ${v.hireCost} gold, then ${SUMMON_STEP} more each).`,
    'When: at the start of every army run, Calamity run and quest battle. Not the daily or the Last Stand, which start everyone the same.',
    `The limit: level ${v.max}, +${v.topGold} gold. The gold is spent in the run and does not carry over; the vault's level stays for good.`,
  ];
}
