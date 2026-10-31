// What each hero can rise by right now, for the tavern's "upgrade ready" marks and its quick Upgrades list (TAVERN-RANKUP). A
// hero rises two ways, both the player's tap: a rank its shards have earned (`rankUp.ts`) or, at the top rank, an awakening
// step paid in shards and its class's rift ores (`awaken.ts`). This only reads those rules and calls their own functions to
// take a step; it adds no rule of its own. Pure: no Pixi, no DOM, no randomness.

import type { Meta } from './meta';
import { awaken, awakenPlan } from './awaken';
import { nextRank, rankUp } from './rankUp';

export interface Upgrade {
  kind: string;
  /** `rank`: a shard rank waiting; `awaken`: the next awakening step. */
  what: 'rank' | 'awaken';
  /** The rank (or awakened step) the tap takes the hero to. */
  to: number;
  /** Whether it can be taken now: a rank always can; an awakening may still be short of its ores. */
  can: boolean;
  /** A rank: the shards that earned it (none are used up). An awakening: the shards it uses up. */
  shards: number;
  /** An awakening's ore (a class trait, '' for a rank), how many it asks for and how many are held. */
  ore: string;
  oreCost: number;
  oreHave: number;
}

/** The next step a hero kind can rise by, or null when nothing is near: no rank waiting, and no awakening whose shards are
 *  ready (an awakening only short of ores is returned, with `can` false, so the list can say what is missing). */
export function upgradeOf(m: Meta, kind: string): Upgrade | null {
  if (!m.unlocked.includes(kind)) return null;
  const to = nextRank(m, kind);
  if (to !== null) return { kind, what: 'rank', to, can: true, shards: m.shards[kind] ?? 0, ore: '', oreCost: 0, oreHave: 0 };
  const p = awakenPlan(m, kind);
  if (!p.step || !p.shardsReady) return null;
  return { kind, what: 'awaken', to: p.step, can: p.can, shards: p.cost, ore: p.ore, oreCost: p.oreCost, oreHave: p.oreHave };
}

/** Whether a hero kind has a step it can take right now (the tavern's gold chevron). */
export const upgradeReady = (m: Meta, kind: string): boolean => upgradeOf(m, kind)?.can === true;

/** The owned heroes with a step near, in the order of `kinds`, the ones that can be taken now first. */
export function upgradeList(m: Meta, kinds: readonly string[]): Upgrade[] {
  const all = kinds.map((k) => upgradeOf(m, k)).filter((u): u is Upgrade => !!u);
  return [...all.filter((u) => u.can), ...all.filter((u) => !u.can)];
}

/** The next hero after `current` (in the order of `kinds`, round from the end to the start) with a step ready; null when no
 *  other hero has one. The hero sheet's "Next hero with an upgrade" hop. */
export function nextUpgradeKind(m: Meta, kinds: readonly string[], current: string): string | null {
  const at = kinds.indexOf(current);
  for (let i = 1; i <= kinds.length; i++) {
    const k = kinds[(at + i + kinds.length) % kinds.length];
    if (k !== current && upgradeReady(m, k)) return k;
  }
  return null;
}

export interface Took {
  kind: string;
  what: 'rank' | 'awaken';
  /** The new rank, or the new awakened step. */
  n: number;
}

/** Take a hero's next step through the rules' own functions: its rank when one waits, else its awakening. Null (and nothing
 *  changes) when it cannot. */
export function takeUpgrade(m: Meta, kind: string): Took | null {
  if (nextRank(m, kind) !== null) {
    const n = rankUp(m, kind);
    return n ? { kind, what: 'rank', n } : null;
  }
  const n = awaken(m, kind);
  return n ? { kind, what: 'awaken', n } : null;
}

export interface AllTaken {
  /** Every step taken, in order (a hero with two ranks waiting, or a rank then an awakening, has more than one). */
  steps: Took[];
  ranks: number;
  awakenings: number;
  /** The heroes that rose, once each, in order. */
  heroes: string[];
  /** The shards the awakenings used up, and the ores they spent by class trait. */
  shards: number;
  ores: Record<string, number>;
}

/** Take every step that can be taken, hero by hero in the order of `kinds` (each as far as it goes): "Upgrade all". Heroes of
 *  one class share its ores, so the first in the order is paid first. */
export function upgradeAll(m: Meta, kinds: readonly string[]): AllTaken {
  const out: AllTaken = { steps: [], ranks: 0, awakenings: 0, heroes: [], shards: 0, ores: {} };
  for (const kind of kinds) {
    for (let guard = 0; guard < 12; guard++) {
      const u = upgradeOf(m, kind);
      if (!u?.can) break;
      const took = takeUpgrade(m, kind);
      if (!took) break;
      out.steps.push(took);
      if (!out.heroes.includes(kind)) out.heroes.push(kind);
      if (took.what === 'rank') out.ranks++;
      else {
        out.awakenings++;
        out.shards += u.shards;
        out.ores[u.ore] = (out.ores[u.ore] ?? 0) + u.oreCost;
      }
    }
  }
  return out;
}

/** What "Upgrade all" would take, worked out on a copy (the confirm's totals): the meta given is not changed. */
export const planUpgradeAll = (m: Meta, kinds: readonly string[]): AllTaken => upgradeAll(JSON.parse(JSON.stringify(m)) as Meta, kinds);
