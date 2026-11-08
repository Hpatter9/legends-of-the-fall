// A Mythic's rank shards (docs/notes/mythics-finish.md). Mythics never come from pulls ("no tiers, no rates"), so a repeat can never give one a
// rank shard as it gives every other hero. Instead a Mythic grows by its own legend: once it has joined, its trial stays open on the quest log's
// Done tab as a replay (`questRun.ts`), and a replay won pays that Mythic a few rank shards. The amount is modest and capped:
//
// - `TRIAL_SHARDS` (2) for a replay won, the trial's last wave cleared (a lost try pays nothing);
// - once a day for each Mythic (`Meta.trialShards` keeps the day each was last paid);
// - never past `SHARD_CAP`, the shards the top rank and both awakenings take in all; past it a win pays nothing more.
//
// So a Mythic reaches its top rank in five days of replays and its last awakening in thirteen at the soonest, each day a hard trial won
// without a Mythic. Pure rules: no Pixi, no DOM.

import type { Meta } from './meta';
import type { Run } from './run';
import { SHARD_CAP } from './awakenRules';
import { isMythic } from './mythicRules';

/** Rank shards a replay of a Mythic's trial pays when it is won. */
export const TRIAL_SHARDS = 2;

/** The Mythic whose trial a quest battle is (`mythic-<kind>`), or null. */
export function trialMythic(battle: string): string | null {
  const kind = battle.startsWith('mythic-') ? battle.slice('mythic-'.length) : '';
  return isMythic(kind) ? kind : null;
}

/** What a replay of a trial won pays now: the Mythic and its shards (0 when nothing is due: not a replay, not owned, paid today or capped). */
export function trialShardsDue(m: Meta, run: Run, day: number | undefined): { kind: string; n: number } | null {
  if (run.mode?.kind !== 'quest' || !run.mode.practice || !run.cleared || day === undefined) return null;
  const kind = trialMythic(run.mode.quest);
  if (!kind || !m.unlocked.includes(kind)) return null;
  const n = m.trialShards?.[kind] === day ? 0 : Math.max(0, Math.min(TRIAL_SHARDS, SHARD_CAP - (m.shards[kind] ?? 0)));
  return { kind, n };
}

/** Pay a trial replay won (`settleRun`): the Mythic's rank shards, and the day noted. Returns what was paid, if anything. */
export function payTrialShards(m: Meta, run: Run, day: number | undefined): { kind: string; n: number } | null {
  const due = trialShardsDue(m, run, day);
  if (!due || !due.n) return null;
  m.shards[due.kind] = (m.shards[due.kind] ?? 0) + due.n;
  (m.trialShards ??= {})[due.kind] = day!;
  return due;
}

/** The line the page shows for a payment. */
export const trialShardsLine = (name: string, n: number): string => `${name} gains ${n} rank shard${n === 1 ? '' : 's'} from the trial (once a day).`;
