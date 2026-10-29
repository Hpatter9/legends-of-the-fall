// Merging heroes (MERGE-TWO, `docs/notes/merge-two.md`): two heroes of the same kind and grade make one of the next grade, up to
// `MAX_GRADE` (4): 1+1 make 2, 2+2 make 3, 3+3 make 4. Nothing merges on its own: the player drags one hero onto its match, or taps
// Auto merge (`autoMerge`), which merges every pair ready and then the pairs those make, and stops. The Calamity has no merging (its
// heroes rise by level), and a cursed mirror's clone never merges. Pure rules: no Pixi, no DOM, no randomness.

import { isClone, MAX_GRADE, paidOf, type Owned, type Run } from './run';

/** What a merge made: the hero that holds the new grade (the target, keeping its id, squad place and gear) and the one merged into it. */
export interface Merged {
  id: number;
  kind: string;
  grade: number;
  /** The roster id of the hero merged away. */
  gone: number;
}

/** Whether heroes may merge in this run at all: not when it is over, nor in a Calamity. */
const mergesHere = (run: Run): boolean => !run.over && run.mode?.kind !== 'calamity';

/** Whether a hero can take part in a merge: below the top grade and not a mirror's clone. */
const mergeable = (h: Owned): boolean => h.grade < MAX_GRADE && !isClone(h);

/** Whether hero `aId` may be merged into hero `bId`: both owned, different heroes, the same kind and grade, below the top grade, in a run that merges. */
export function canMerge(run: Run, aId: number, bId: number): boolean {
  if (aId === bId || !mergesHere(run)) return false;
  const a = run.roster.find((h) => h.id === aId);
  const b = run.roster.find((h) => h.id === bId);
  return !!a && !!b && a.kind === b.kind && a.grade === b.grade && mergeable(a) && mergeable(b);
}

/** Merge hero `aId` (the one moved) into hero `bId` (the target): the target rises a grade and keeps its id, its squad place and its gear;
 *  the moved hero leaves the roster and the squad and its gear goes back to the pack. The gold paid into both is summed, and a run that
 *  levels its own heroes keeps the higher XP. Returns what was made, or null (and nothing changes) when `canMerge` says no. */
export function merge(run: Run, aId: number, bId: number): Merged | null {
  if (!canMerge(run, aId, bId)) return null;
  const a = run.roster.find((h) => h.id === aId)!;
  const b = run.roster.find((h) => h.id === bId)!;
  for (const g of Object.values(a.gear ?? {})) (run.items ??= []).push(g);
  b.paid = paidOf(a) + paidOf(b);
  if (run.local) b.xp = Math.max(a.xp ?? 0, b.xp ?? 0);
  b.grade++;
  run.roster = run.roster.filter((h) => h.id !== aId);
  run.squad = run.squad.filter((id) => id !== aId);
  return { id: b.id, kind: b.kind, grade: b.grade, gone: aId };
}

/** The pairs ready to merge now, each hero in at most one: the lowest grade first, then the oldest heroes (the smallest ids). In each pair
 *  the target is the one in the squad if only one is (so a fielded hero keeps its place), else the older. */
export function mergeReady(run: Run): [number, number][] {
  if (!mergesHere(run)) return [];
  const groups = new Map<string, Owned[]>();
  for (const h of run.roster) {
    if (!mergeable(h)) continue;
    const key = `${h.grade}:${h.kind}`;
    groups.set(key, [...(groups.get(key) ?? []), h]);
  }
  const out: { grade: number; first: number; pair: [number, number] }[] = [];
  for (const hs of groups.values()) {
    const sorted = [...hs].sort((x, y) => x.id - y.id);
    for (let i = 0; i + 1 < sorted.length; i += 2) {
      const [x, y] = [sorted[i], sorted[i + 1]];
      // (the pair is [moved, target])
      const pair: [number, number] = run.squad.includes(y.id) && !run.squad.includes(x.id) ? [x.id, y.id] : [y.id, x.id];
      out.push({ grade: x.grade, first: x.id, pair });
    }
  }
  return out.sort((p, q) => p.grade - q.grade || p.first - q.first).map((p) => p.pair);
}

/** The heroes that have a match ready (the page marks them). */
export const mergeMatches = (run: Run): Set<number> => new Set(mergeReady(run).flat());

/** The Auto merge button: merge every pair ready, the lowest grade first and the oldest heroes first, then the pairs those merges make, up to
 *  the top grade, and stop. Returns each merge in order. */
export function autoMerge(run: Run): Merged[] {
  const done: Merged[] = [];
  for (let guard = 0; guard < 1000; guard++) {
    const next = mergeReady(run)[0];
    if (!next) break;
    const m = merge(run, next[0], next[1]);
    if (!m) break;
    done.push(m);
  }
  return done;
}
