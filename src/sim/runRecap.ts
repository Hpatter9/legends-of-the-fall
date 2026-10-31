// What a whole run came to, summed fight by fight: time, waves cleared, gold earned and spent, each hero kind's damage,
// healing and kills (the per-wave rows of `fightStats.ts`, added up), and the XP, levels, crowns and chests it paid out.
// It lives on the run (`run.recap`, optional, so older saves load as they were) and is shown when the run is over.
// Pure rules: no Pixi, no DOM.

import { mvpOf, recapKind, type FightStats, type HeroStat } from './fightStats';
import type { Run } from './run';
import type { WaveGain } from './waveGains';

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
  /** The gear and prizes the run picked up, by name (the wave's `run.found`; optional). Still kept, but no longer shown: the owner
   *  asked for a run's finds only on each wave's card, as they leave with the run (RECAP-REVEAL). */
  found?: string[];
  /** Each kind's lasting XP when it first earned any in the run (JRPG-RECAP: the end screen fills each hero's bar from here; optional,
   *  an older save reads it from the XP the run noted). */
  xpAt?: Record<string, number>;
  /** Everything the run's waves brought in, two of a thing as one line (RECAP-SPOILS, `runSpoils.ts`: the final recap's spoils page;
   *  optional, an older save shows what it has from here on). */
  spoils?: WaveGain[];
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

/** Note each kind's lasting XP before a fight paid it (`before`, by kind), for the kinds the run has not yet noted (JRPG-RECAP). */
export function noteXpStart(run: Run, before: Readonly<Record<string, number>>): void {
  const r = recapOf(run);
  for (const [k, xp] of Object.entries(before)) if (!(k in (r.xpAt ??= {}))) r.xpAt[k] = xp;
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
  const rows: HeroStat[] = Object.entries(r.heroes).filter(([kind]) => recapKind(kind)).map(([kind, t], id) => ({ id, kind, dealt: t.dealt, taken: t.taken, healed: t.healed, kills: t.kills }));
  return mvpOf(rows)?.kind ?? null;
}

/** What a recap gained since an earlier copy of it (`then`; none for the whole of it): the figures, XP and crowns added, each
 *  kind's level over the stretch (from where `then` left it), and the waves fought since. Pure: neither recap is changed. */
export function recapSince(now: RunRecap, then?: RunRecap): RunRecap {
  const out = newRecap();
  const was = then ?? newRecap();
  for (const k of ['fights', 'cleared', 'ms', 'earned', 'spent', 'crowns', 'chests'] as const) out[k] = Math.max(0, now[k] - was[k]);
  for (const [kind, t] of Object.entries(now.heroes)) {
    const b = was.heroes[kind];
    const d = { dealt: t.dealt - (b?.dealt ?? 0), taken: t.taken - (b?.taken ?? 0), healed: t.healed - (b?.healed ?? 0), kills: t.kills - (b?.kills ?? 0), grade: t.grade };
    if (d.dealt > 0 || d.taken > 0 || d.healed > 0 || d.kills > 0) out.heroes[kind] = d;
  }
  for (const [kind, n] of Object.entries(now.xp)) if (n - (was.xp[kind] ?? 0) > 0) out.xp[kind] = n - (was.xp[kind] ?? 0);
  for (const [kind, [from, to]] of Object.entries(now.levels)) {
    const start = was.levels[kind]?.[1] ?? from;
    if (to > start) out.levels[kind] = [start, to];
  }
  // (the waves fought since: as many of the latest rows as fights were added, the cap allowing)
  const rows = now.waves ?? [];
  const n = Math.min(rows.length, out.fights);
  if (n) out.waves = rows.slice(rows.length - n);
  return out;
}

/** A calamity's map has just been cleared (`mapDone`, set as its boss fell): once its last fight is in the run's recap, its share
 *  goes onto the map's recap (and its copy in `recaps`), and the next map counts from here. Nothing for any other run, or twice. */
export function closeMapLeg(run: Run): void {
  const t = run.tower;
  const done = t?.mapDone;
  if (!t || !done || done.detail) return;
  const now = recapOf(run);
  const detail = recapSince(now, t.recapAt);
  done.detail = detail;
  const kept = t.recaps?.at(-1);
  if (kept && kept !== done && kept.map === done.map) kept.detail = detail;
  t.recapAt = JSON.parse(JSON.stringify(now)) as RunRecap;
  // (the copy needs no wave lines or finds: `recapSince` counts fights, and the finds are the map recap's own)
  delete t.recapAt.waves;
  delete t.recapAt.found;
}
