// Rare drops on army waves (the owner's ask: "I want shards and tomes to be able to drop from armies too. It's just much much
// rarer."). A won wave of an army now and then drops a few hero shards (towards a hero the player is collecting, a begun one
// likelier; rank shards of an owned hero once every hero is owned), and less often an XP tome. Bosses drop a little more, and
// harder tiers a little more again. Replays roll at the same rates. Only the armies have them: not the daily, the tower, the
// Last Stand or the Calamity.
//
// The roll is drawn from a side stream of the run's seed and the wave's number (`DROP_SALT`), so the fight and every other reward
// play exactly as they did, and a wave refought in the same run (a reload mid-fight) rolls the same: a drop cannot be farmed by
// retrying. Paid into the meta as the wave is won, like the wave's crowns. Pure rules: no Pixi, no DOM. See `docs/notes/army-drops.md`.

import type { Meta } from './meta';
import { mixSeed, Rng } from './rng';
import { TOMES, grantTomes, type TomeSize } from './tomes';
import { giveShards, haveOf, toCollect } from './unlock';
import { heroTitle } from './heroNames';
import { STICKY, PULL_HEROES } from './unlockRules';

/** The salt of a wave's drop stream (mixed with the run's seed and the wave's number). */
export const DROP_SALT = 0xd409;

/** The chance a won wave drops shards: a plain wave, a mid-army boss, the last boss (before the tier's lift). */
export const SHARD_CHANCE = { plain: 0.0004, mid: 0.002, final: 0.003 };
/** The chance it drops a tome (drawn apart from the shards: a lucky wave can drop both). */
export const TOME_CHANCE = { plain: 0.00015, mid: 0.00075, final: 0.00125 };
/** Each tier above Normal lifts both chances by this share (Hard x1.15, Mythic x1.6). */
export const TIER_LIFT = 0.15;
/** The shards a drop holds: this many, one more for a boss, and a chance of one more again. */
export const DROP_SHARDS = 2;
export const EXTRA_SHARD = 0.5;
/** A dropped tome's size, by weight; each tier above Normal moves `TIER_TOME_SHIFT` of weight from small to medium and half that to large. */
export const TOME_WEIGHTS: Readonly<Record<TomeSize, number>> = { small: 60, medium: 35, large: 5 };
export const TIER_TOME_SHIFT = 6;

export type WaveBoss = 'mid' | 'final' | undefined;

export interface ArmyDrop {
  /** Shards of a hero: unlock shards when it is not owned, rank shards when it is (`giveShards`). */
  shards?: { kind: string; n: number };
  tome?: TomeSize;
}

/** A wave's chances after its tier's lift. */
export function dropChances(boss: WaveBoss, tier: number): { shards: number; tome: number } {
  const key = boss ?? 'plain';
  const lift = 1 + TIER_LIFT * Math.max(0, tier | 0);
  return { shards: SHARD_CHANCE[key] * lift, tome: TOME_CHANCE[key] * lift };
}

/** The hero a shard drop is for: a pullable hero not owned (one begun likelier, by `STICKY` for each shard held, as a stone's pull),
 *  or once every pullable hero is owned, any hero owned (for rank shards). */
function dropKind(m: Meta, rng: Rng): string {
  const left = toCollect(m);
  if (!left.length) return rng.pick(m.unlocked.length ? m.unlocked : PULL_HEROES);
  const weight = (k: string) => 1 + STICKY * haveOf(m, k);
  let r = rng.next() * left.reduce((s, k) => s + weight(k), 0);
  for (const k of left) {
    r -= weight(k);
    if (r < 0) return k;
  }
  return left[left.length - 1];
}

/** What a won army wave drops (none for most): the same run's seed and wave always roll the same. The draws are always made in the
 *  same order whatever is dropped, so the stream is one shape. */
export function rollArmyDrop(m: Meta, boss: WaveBoss, tier: number, seed: number, wave: number, sure = false): ArmyDrop | null {
  const rng = new Rng(mixSeed(seed, DROP_SALT, wave));
  const c = sure ? { shards: 1, tome: 1 } : dropChances(boss, tier);
  const shardRoll = rng.next();
  const tomeRoll = rng.next();
  const extra = rng.chance(EXTRA_SHARD);
  const t = Math.max(0, tier | 0);
  const w: Record<TomeSize, number> = { small: Math.max(0, TOME_WEIGHTS.small - TIER_TOME_SHIFT * 1.5 * t), medium: TOME_WEIGHTS.medium + TIER_TOME_SHIFT * t, large: TOME_WEIGHTS.large + (TIER_TOME_SHIFT / 2) * t };
  const size = rng.weighted(w);
  const kind = dropKind(m, rng);
  const out: ArmyDrop = {};
  if (shardRoll < c.shards) out.shards = { kind, n: DROP_SHARDS + (boss ? 1 : 0) + (extra ? 1 : 0) };
  if (tomeRoll < c.tome) out.tome = size;
  return out.shards || out.tome ? out : null;
}

/** The words of a drop for the wave card and the recap's spoils: "3 shards of Kwame · Knight", "a medium XP tome". */
export function dropWords(d: ArmyDrop): string[] {
  const out: string[] = [];
  if (d.shards) out.push(`${d.shards.n} shards of ${heroTitle(d.shards.kind)}`);
  if (d.tome) out.push(`a ${TOMES[d.tome].name.replace(/^./, (c) => c.toLowerCase())}`);
  return out;
}

/** What a settled drop paid: the drop, its words, and whether its shards brought a hero in. */
export interface DropPaid {
  drop: ArmyDrop;
  words: string[];
  joined: boolean;
}

/** Settle a fought army wave's drop into the meta: nothing for a loss or for a wave that drops nothing. `force` (the page's dev hook,
 *  for screenshots) makes a drop of its kind certain. */
export function settleArmyDrop(m: Meta, won: boolean, boss: WaveBoss, tier: number, seed: number, wave: number, force?: 'shards' | 'tome' | 'both'): DropPaid | null {
  if (!won) return null;
  let drop = rollArmyDrop(m, boss, tier, seed, wave);
  if (force) {
    // (a forced drop still takes its hero and size from the wave's own stream, with the chances set to sure)
    const sure = rollArmyDrop(m, boss, tier, seed, wave, true)!;
    drop = { ...(force !== 'tome' ? { shards: sure.shards } : {}), ...(force !== 'shards' ? { tome: sure.tome } : {}) };
  }
  if (!drop) return null;
  let joined = false;
  if (drop.shards) {
    joined = giveShards(m, drop.shards.kind, drop.shards.n).joined;
  }
  if (drop.tome) grantTomes(m, { [drop.tome]: 1 });
  const words = dropWords(drop);
  return { drop, words, joined };
}
