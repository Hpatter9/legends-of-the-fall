// WEEKLY-TRIAL: the save's record of the week's trial (`Meta.trial`) and its reading on load, kept apart from the run's rules so the save
// can read it without them (`trial.ts` has the rules of entry and reward). Pure: no Pixi, no DOM.

import { TRIAL_WAVES } from './trialRules';

/** A week's record: its week, the furthest wave cleared, the tiers paid (by their waves) and the days tried. */
export interface TrialRecord {
  week: number;
  best: number;
  paid: number[];
  days: number[];
}
export interface TrialMeta {
  /** This week's record (an older week's is dropped when the next is begun). */
  cur?: TrialRecord;
  /** Full clears, one at most a week: the Trial Laurels. */
  laurels?: number;
  /** The week whose trial the camp's pip was last cleared for (the pip shows on a new week). */
  seen?: number;
}

/** A saved trial record made safe on load (undefined when there is none). */
export function readTrial(raw: unknown): TrialMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<TrialMeta>;
  const out: TrialMeta = {};
  const int = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);
  const c = r.cur as Partial<TrialRecord> | undefined;
  if (c && int(c.week))
    out.cur = {
      week: c.week,
      best: Math.max(0, Math.min(TRIAL_WAVES, int(c.best) ? c.best : 0)),
      paid: Array.isArray(c.paid) ? [...new Set(c.paid.filter(int))] : [],
      days: Array.isArray(c.days) ? c.days.filter(int).slice(-14) : [],
    };
  if (int(r.laurels) && r.laurels > 0) out.laurels = r.laurels;
  if (int(r.seen)) out.seen = r.seen;
  return Object.keys(out).length ? out : undefined;
}
