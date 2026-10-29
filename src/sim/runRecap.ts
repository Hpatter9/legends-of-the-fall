// What a whole run came to, summed fight by fight: time, waves cleared, gold earned and spent, each hero kind's damage,
// healing and kills (the per-wave rows of `fightStats.ts`, added up), and the XP, levels, crowns and chests it paid out.
// It lives on the run (`run.recap`, optional, so older saves load as they were) and is shown when the run is over.
// Pure rules: no Pixi, no DOM.

import { mvpOf, type FightStats, type HeroStat } from './fightStats';
import type { Run } from './run';

/** One hero kind's totals over the run (all the heroes of the kind added together). */
export interface KindTotals {
  dealt: number;
  taken: number;
  healed: number;
  kills: number;
  /** The highest grade the kind was fielded at (its look in the recap). */
  grade: number;
}

export interface RunRecap {
  /** Fights fought, retried ones too. */
  fights: number;
  /** Waves (stages) cleared. */
  cleared: number;
  /** Battle time, in ms, over every fight. */
  ms: number;
  earned: number;
  spent: number;
  heroes: Record<string, KindTotals>;
  /** XP earned by kind. */
  xp: Record<string, number>;
  /** The level a kind began the run at and the one it reached, for kinds that levelled. */
  levels: Record<string, [number, number]>;
  crowns: number;
  chests: number;
  /** Each wave fought, in order (WAVE-RECAP: the short card after a wave leaves its detail to the end; optional, older saves have none). */
  waves?: WaveRow[];
  /** The gear and prizes the run picked up, by name (the wave's `run.found`, kept for the end; optional). */
  found?: string[];
}

/** One wave's line in the end recap's wave-by-wave strip. */
export interface WaveRow {
  /** The wave (stage) it was. */
  wave: number;
  won: boolean;
  /** Stars it earned (none for a loss). */
  stars: number;
  /** Its fight time, in ms. */
  ms: number;
  /** The hero kind that did the most in it, if anyone did anything. */
  mvp?: string;
  /** Hearts burned to win it (a fall a heart revived). */
  hearts?: number;
}

/** The most wave rows and finds a recap keeps (a long climb would grow the save without end). */
export const RECAP_WAVES = 60;
export const RECAP_FOUND = 40;

export const newRecap = (): RunRecap => ({ fights: 0, cleared: 0, ms: 0, earned: 0, spent: 0, heroes: {}, xp: {}, levels: {}, crowns: 0, chests: 0 });
export const recapOf = (run: Run): RunRecap => (run.recap ??= newRecap());

/** Add gold coming in (a wave's pay, a recycle, a retry's boost) or going out (a hire) to the run's books. */
export function noteGold(run: Run, kind: 'earned' | 'spent', n: number): void {
  if (n > 0) recapOf(run)[kind] += n;
}

/** Add a finished fight: its time, whether it was won, and each hero kind's rows (`grades`: the highest grade of each kind that stood in it). */
export function noteFightStats(run: Run, stats: FightStats, ms: number, won: boolean, grades: Record<string, number> = {}): void {
  const r = recapOf(run);
  r.fights++;
  r.ms += ms;
  if (won) r.cleared++;
  for (const s of stats) {
    const t = (r.heroes[s.kind] ??= { dealt: 0, taken: 0, healed: 0, kills: 0, grade: 1 });
    t.dealt += s.dealt;
    t.taken += s.taken;
    t.healed += s.healed;
    t.kills += s.kills;
    t.grade = Math.max(t.grade, grades[s.kind] ?? 1);
  }
}

/** Add what a fight paid out: XP by kind, the levels reached (`ups`: kind, from, to), crowns and chests. */
export function notePayout(run: Run, xp: Record<string, number>, ups: readonly { kind: string; from: number; to: number }[], crowns: number, chests: number): void {
  const r = recapOf(run);
  for (const [k, n] of Object.entries(xp)) r.xp[k] = (r.xp[k] ?? 0) + n;
  for (const u of ups) {
    const had = r.levels[u.kind];
    r.levels[u.kind] = [had ? had[0] : u.from, Math.max(had ? had[1] : 0, u.to)];
  }
  r.crowns += crowns;
  r.chests += chests;
}

/** Add a finished wave's line (its stars, time, MVP, hearts) and anything it found, for the end recap. */
export function noteWave(run: Run, row: WaveRow, found: readonly string[] = []): void {
  const r = recapOf(run);
  const rows = (r.waves ??= []);
  rows.push(row);
  if (rows.length > RECAP_WAVES) rows.splice(0, rows.length - RECAP_WAVES);
  if (found.length) {
    const got = (r.found ??= []);
    got.push(...found);
    if (got.length > RECAP_FOUND) got.splice(0, got.length - RECAP_FOUND);
  }
}

/** Hearts burned over the run (from the wave rows). */
export const heartsBurned = (r: RunRecap): number => (r.waves ?? []).reduce((n, w) => n + (w.hearts ?? 0), 0);

/** The kind that did the most over the run (by `fightStats`' own measure), or null when nobody did anything. */
export function mvpKind(r: RunRecap): string | null {
  const rows: HeroStat[] = Object.entries(r.heroes).map(([kind, t], id) => ({ id, kind, dealt: t.dealt, taken: t.taken, healed: t.healed, kills: t.kills }));
  return mvpOf(rows)?.kind ?? null;
}
