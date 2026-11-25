// WEEKLY-TRIAL (docs/notes/weekly-trial.md): the week's trial as a run, its entry and its rewards. The rules and the rotation are in
// `trialRules.ts`. The page passes today's day key (yyyymmdd, in Mountain time) and the sim turns it into the week (`weekOf`, weeks Monday to
// Sunday); nothing here reads a clock.
//
// - Entry: one try a day, the best of the week kept. The five strongest heroes the week admits start in the squad (a save's own
//   collection, so a week that asks for Beasts asks the player to have some), and Hire draws from the heroes it admits. The foes answer the
//   five's lasting power as the daily's do (`trialScale`), so a strong save meets as hard a trial as a new one.
// - Rewards, paid once a week by the furthest wave (`TRIAL_TIERS`): crowns at 3 waves, crowns and a stone at 5, and crowns, three stones and a
//   Trial Laurel at all seven. A week's rewards are about a daily's worth (`docs/notes/weekly-trial.md` has the pace).
// - Saved in `Meta.trial` (optional; a save from before has none). A new week starts the record afresh; the laurels are kept.
//
// Pure rules: no Pixi, no DOM.

import type { Meta } from './meta';
import { kindPower, powerOf } from './power';
import { levelOfKind } from './levels';
import { ULT_LEVEL } from './abilities';
import { gradeBoost, START_GOLD, type Run } from './run';
import { newRunes } from './runes';
import { shopArmyIndex } from './chestShop';
import { weekOf } from './traders';
import { DAILY_ANSWER } from './modes';
import { ARMY_WEAKNESS, classOf, matchMult, matchOf } from './armyWeakness';
import { UNITS } from './units';
import { mergedRule, trialEligible, trialHost, trialSeed, trialSquadOk, TRIAL_WAVES } from './trialRules';
import type { TrialRecord } from './trialSave';
export { readTrial, type TrialMeta, type TrialRecord } from './trialSave';

/** A reward tier: reached by clearing this many waves of the week's trial, paid once a week. */
export interface TrialTier {
  waves: number;
  crowns: number;
  stones?: number;
  /** A Trial Laurel: the full clear's badge. */
  laurel?: boolean;
}
export const TRIAL_TIERS: readonly TrialTier[] = [
  { waves: 3, crowns: 80 },
  { waves: 5, crowns: 80, stones: 1 },
  { waves: TRIAL_WAVES, crowns: 40, stones: 3, laurel: true },
];
/** A week's rewards in all. */
export const TRIAL_WEEK_PAY = { crowns: TRIAL_TIERS.reduce((n, t) => n + t.crowns, 0), stones: TRIAL_TIERS.reduce((n, t) => n + (t.stones ?? 0), 0) };

/** The tries a day. */
export const TRIAL_TRIES = 1;

/** The week a day key falls in. */
export const trialWeekOf = (day: number): number => weekOf(day);

/** A week's record in a save (a fresh one, not saved, when the save has none for the week). */
export const trialRecord = (m: Pick<Meta, 'trial'>, week: number): TrialRecord => (m.trial?.cur?.week === week ? m.trial.cur : { week, best: 0, paid: [], days: [] });

/** Tries left today. */
export const trialTriesLeft = (m: Pick<Meta, 'trial'>, day: number): number => Math.max(0, TRIAL_TRIES - trialRecord(m, trialWeekOf(day)).days.filter((d) => d === day).length);

/** The heroes a save owns that the week admits (secret heroes not yet found are not owned). */
export function trialEntrants(m: Pick<Meta, 'unlocked'>, week: number): string[] {
  return trialEligible(week, m.unlocked.filter((k) => UNITS[k] && UNITS[k].side === 'hero' && !UNITS[k].summon && classOf(k)));
}

/** What a hero is worth to a week's trial: its lasting power, a quarter more when the week's rules favour its class, and the army's weakness or
 *  resistance to it (`matchMult`), so the five a week starts with are the ones its rules and its army call for. */
export function trialWorth(m: Meta, week: number, kind: string): number {
  const c = classOf(kind);
  const shine = c && mergedRule(week).shine.includes(c) ? TRIAL_SHINE : 1;
  return kindPower(m, kind) * shine * (ARMY_WEAKNESS.on ? matchMult(matchOf(trialHost(week).id, kind)) : 1);
}
/** The share more a hero the week's rules favour is worth in the pick of the five. */
export const TRIAL_SHINE = 1.25;

/** The five who start the week's trial: the best it admits for its rules and its army (`trialWorth`), one of each class on a one-of-each week. */
export function trialFive(m: Meta, week: number): string[] {
  const all = trialEntrants(m, week).sort((a, b) => trialWorth(m, week, b) - trialWorth(m, week, a) || a.localeCompare(b));
  const out: string[] = [];
  for (const k of all) if (out.length < 5 && trialSquadOk(week, out, k)) out.push(k);
  return out;
}

/** How much the trial's foes answer a save's five (as the daily's, `dailyScale`): their lasting power over a fresh hero's, and a share more for each
 *  ultimate open. 1 for a fresh save, never less. */
export function trialScale(m: Meta, five: readonly string[]): number {
  if (!five.length) return 1;
  const ratio = five.reduce((n, k) => n + kindPower(m, k) / powerOf(k, gradeBoost(1, 0, 1)), 0) / five.length;
  const ults = five.filter((k) => levelOfKind(m, k) >= ULT_LEVEL).length;
  return Math.max(1, Math.round(ratio ** DAILY_ANSWER.share * (1 + DAILY_ANSWER.ult * ults) * 100) / 100);
}

/** Why a save cannot start the trial today, or null when it can. */
export function trialBlock(m: Meta, day: number): 'tried' | 'nobody' | null {
  if (trialTriesLeft(m, day) <= 0) return 'tried';
  if (!trialEntrants(m, trialWeekOf(day)).length) return 'nobody';
  return null;
}

/** A week's trial run for a save: its five in the squad, the starting gold, Hire drawing from the heroes it admits, on the army's land. */
export function trialRun(m: Meta, week: number): Run {
  const five = trialFive(m, week);
  const scale = trialScale(m, five);
  const run: Run = {
    seed: trialSeed(week),
    gold: START_GOLD,
    stage: 1,
    summons: 0,
    roster: [],
    nextId: 1,
    squad: [],
    over: false,
    best: 1,
    pool: trialEntrants(m, week),
    area: trialHost(week).area,
    mode: { kind: 'trial', week, ...(scale > 1 ? { scale } : {}) },
    stars: 0,
    real: true,
    runes: newRunes(),
  };
  for (const kind of five) {
    run.roster.push({ id: run.nextId, kind, grade: 1 });
    run.squad.push(run.nextId++);
  }
  return run;
}

/** Start today's try at the week's trial, or null when it cannot be (`trialBlock`). Spends the day's try. */
export function startTrial(m: Meta, day: number): Run | null {
  if (trialBlock(m, day)) return null;
  const week = trialWeekOf(day);
  const t = (m.trial ??= {});
  if (t.cur?.week !== week) t.cur = { week, best: 0, paid: [], days: [] };
  t.cur.days.push(day);
  const run = trialRun(m, week);
  run.findAt = shopArmyIndex(m);
  return run;
}

/** The trial run going for this week, if one is (so the Trial card resumes it). */
export const trialInProgress = (run: Run | null, week: number): Run | null => (run && !run.over && run.mode?.kind === 'trial' && run.mode.week === week ? run : null);

/** The waves of the trial a run has cleared. */
export const trialCleared = (run: Run): number => (run.cleared ? TRIAL_WAVES : Math.max(0, run.stage - 1));

export interface TrialPay {
  /** The tiers this fight reached for the first time this week. */
  tiers: TrialTier[];
  crowns: number;
  stones: number;
  laurel: boolean;
}

/** Settle a fought wave of the trial (after `finish`): the week's furthest wave, and each reward tier reached for the first time this week, paid.
 *  A run of a week that has passed pays nothing. */
export function settleTrial(m: Meta, run: Run): TrialPay {
  const pay: TrialPay = { tiers: [], crowns: 0, stones: 0, laurel: false };
  if (run.mode?.kind !== 'trial') return pay;
  const rec = m.trial?.cur;
  if (!rec || rec.week !== run.mode.week) return pay;
  const got = trialCleared(run);
  rec.best = Math.max(rec.best, got);
  for (const tier of TRIAL_TIERS) {
    if (got < tier.waves || rec.paid.includes(tier.waves)) continue;
    rec.paid.push(tier.waves);
    (run.trialPaid ??= []).push(tier.waves);
    pay.tiers.push(tier);
    pay.crowns += tier.crowns;
    pay.stones += tier.stones ?? 0;
    m.crowns += tier.crowns;
    if (tier.stones) m.stones = (m.stones ?? 0) + tier.stones;
    if (tier.laurel) {
      m.trial!.laurels = (m.trial!.laurels ?? 0) + 1;
      pay.laurel = true;
    }
  }
  return pay;
}

/** The title a save's laurels earn (none before the first). */
export function trialTitle(laurels: number): string | null {
  if (laurels >= 12) return 'Trial Legend';
  if (laurels >= 5) return 'Trial Master';
  if (laurels >= 1) return 'Trialbreaker';
  return null;
}

/** Whether the camp's Trial wears its pip: a new week's trial not yet looked at. */
export const trialIsNew = (m: Pick<Meta, 'trial'>, week: number): boolean => m.trial?.seen !== week;
/** The week's trial has been looked at. */
export function markTrialSeen(m: Meta, week: number): void {
  (m.trial ??= {}).seen = week;
}

/** The week's standing in words: "not tried", "best 4/7" or "cleared ✓". */
export function trialStatus(m: Pick<Meta, 'trial'>, week: number): string {
  const rec = trialRecord(m, week);
  if (rec.best >= TRIAL_WAVES) return 'cleared ✓';
  if (!rec.days.length) return 'not tried';
  return `best ${rec.best}/${TRIAL_WAVES}`;
}

/** The rule's line for the card's "shines" row: the classes it favours, named. */
export const shineOf = (week: number): string[] => mergedRule(week).shine.map((c) => c[0].toUpperCase() + c.slice(1));
