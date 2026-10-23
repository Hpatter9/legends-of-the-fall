// Collecting heroes by shards. A hero not yet owned is gathered shard by shard (`Meta.unlock`, apart from the rank shards in
// `Meta.shards`) and joins, at rank 0, once it has `unlockNeed` of them; a hero owned takes rank shards as before. Pulls and
// chests give shards through `giveShards`; the pull's draw is `drawKind`. Pure rules: no Pixi, no DOM.

import { mixSeed, Rng } from './rng';
import { OVERFLOW_CROWNS, SHARD_CAP } from './awakenRules';
import type { Meta } from './meta';
import { DUPLICATE_SHARDS, isContent, PITY_PULLS, PULL_HEROES, STICKY, unlockNeed } from './unlockRules';

export { DUPLICATE_SHARDS };

const PITY_SALT = 0x9a17e;
const REPLACE_SALT = 0x5b57;

export const owns = (m: Meta, kind: string): boolean => m.unlocked.includes(kind);
/** How many pullable heroes the save owns (the number the shards needed rise with). */
export const ownedCount = (m: Meta): number => PULL_HEROES.filter((k) => owns(m, k)).length;
/** The shards a hero not owned needs to join now. */
export const needOf = (m: Meta): number => unlockNeed(ownedCount(m));
/** Unlock shards held towards a hero not yet owned. */
export const haveOf = (m: Meta, kind: string): number => m.unlock?.[kind] ?? 0;
/** The heroes still to collect by shards. */
export const toCollect = (m: Meta): string[] => PULL_HEROES.filter((k) => !owns(m, k));

/** The hero not owned that is closest to joining (most shards; the first of equals in roster order, or `rng`'s pick among them). Undefined when all are owned. */
export function closest(m: Meta, rng?: Rng): string | undefined {
  const left = toCollect(m);
  const top = Math.max(0, ...left.map((k) => haveOf(m, k)));
  const best = left.filter((k) => haveOf(m, k) === top);
  return rng ? rng.pick(best) : best[0];
}

/** What a gift of shards did. */
export interface Given {
  kind: string;
  /** Unlock shards added (the hero was not owned), and rank shards added (it was). */
  unlock: number;
  rank: number;
  /** The hero joined with this gift. */
  joined: boolean;
  /** Crowns instead, once a hero owned has nothing left to buy with shards. */
  crowns: number;
  /** The unlock bar after the gift (have of need), when the hero was not owned. */
  have: number;
  need: number;
}

/** Give `n` shards of a hero: unlock shards if it is not owned (it joins at its threshold, rank 0), rank shards if it is. A content hero not owned gets nothing (it joins on its milestone). */
export function giveShards(m: Meta, kind: string, n: number): Given {
  const out: Given = { kind, unlock: 0, rank: 0, joined: false, crowns: 0, have: 0, need: 0 };
  if (owns(m, kind)) {
    for (let i = 0; i < n; i++) {
      if ((m.shards[kind] ?? 0) >= SHARD_CAP) {
        m.crowns += OVERFLOW_CROWNS;
        out.crowns += OVERFLOW_CROWNS;
      } else {
        m.shards[kind] = (m.shards[kind] ?? 0) + 1;
        out.rank++;
      }
    }
    return out;
  }
  if (isContent(kind)) return out;
  const need = needOf(m);
  const have = Math.min(need, haveOf(m, kind) + n);
  out.unlock = have - haveOf(m, kind);
  out.need = need;
  if (have >= need) {
    out.joined = true;
    out.have = need;
    m.unlocked.push(kind);
    delete m.unlock?.[kind];
  } else {
    out.have = have;
    (m.unlock ??= {})[kind] = have;
  }
  return out;
}

/** A hero a chest rolled that cannot be given as it is (a content hero not owned): another pullable hero, drawn from a side stream of the chest's seed. */
export function swapContent(m: Meta, kind: string, seed: number, i: number): string {
  if (!isContent(kind) || owns(m, kind)) return kind;
  return Rng.from(mixSeed(seed, REPLACE_SALT, i)).pick(PULL_HEROES);
}

/** The kind a pull draws: any pullable hero (one begun is likelier, by `STICKY` for each shard held), or an owned content hero for its rank shards; every `PITY_PULLS` pulls without unlock shards, the hero closest to joining. */
export function drawKind(m: Meta, rng: Rng): { kind: string; pity: boolean } {
  const near = (m.unlockDry ?? 0) + 1 >= PITY_PULLS ? closest(m, Rng.from(m.seed, PITY_SALT, m.pulls)) : undefined;
  if (near) return { kind: near, pity: true };
  const pool = [...PULL_HEROES, ...m.unlocked.filter(isContent)];
  const weight = (k: string) => 1 + (owns(m, k) ? 0 : STICKY * haveOf(m, k));
  let r = rng.next() * pool.reduce((s, k) => s + weight(k), 0);
  for (const k of pool) {
    r -= weight(k);
    if (r < 0) return { kind: k, pity: false };
  }
  return { kind: pool[pool.length - 1], pity: false };
}
