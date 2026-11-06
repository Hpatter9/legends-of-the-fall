// Dynasties, part 1: seasons and the Houses (docs/design/legends-expansion.md sections 3.0 to 3.2, 3.7, 5.2 and 7; phase 5 of section 9;
// docs/notes/dynasty-5.md). A season is fourteen real days, counted from the day the Dynasties open for the save; they turn Spring,
// Summer, Autumn, Winter, four to a Year of the War. Every hero kind the player owns has a line (its House), and the person in the kind's
// slot is its **bearer**: the first is the hero as written (Kwame is Kwame), generation I.
//
// A bearer ages only by serving: a season counts for it if it fought 20 waves or more in it (an auto-replayed wave counts half, as the
// waves fought already do). Heroes on the bench never age. By seasons served a bearer is a Youth, in their Prime, a Veteran (6) or an
// Elder (10), and a season served is a year of story age. **Ageing is an honour, never a loss**: every lasting thing stays keyed by the
// hero's kind (its XP, level, ranks, talents, books, gear and skills), so a stage changes words and looks and nothing of a fight. An Elder
// on the field gives Elder's Counsel: +5% XP to the rest of the party. Heirs, the Mantle and the Oath come in later phases.
//
// The seeding is lazy and kind to old saves: each owned kind gets its line the first time the page opens the Dynasties, and seasons count
// from that day, so nobody is made old by an update. A long-time favourite is credited with its past, a season for every 250 waves it
// had fought, at most five (Prime: never straight to Veteran). Pure rules: no Pixi, no DOM, no clock and no randomness (the page passes
// the day key, yyyymmdd).

import { HERO_NAMES } from './heroNames';
import { retired } from './legacy';
import type { Meta } from './meta';
import { AGELESS, BASE_AGE, BEAST_LOOK, ELDER_LOOK, VETERAN_LOOK } from './dynastyWords';

/** The numbers (one place to tune them). */
export const DYNASTY = {
  /** Real days a season lasts. */
  SEASON_DAYS: 14,
  /** Waves a bearer must fight in a season for it to count. */
  SEASON_WAVES: 20,
  /** The past credited to a favourite when its line is first seeded: a season for this many waves fought ... */
  CREDIT_WAVES: 250,
  /** ... and no more than this many seasons (Prime, never Veteran). */
  CREDIT_CAP: 5,
  /** Elder's Counsel: the rest of the party's XP while an Elder is fielded. */
  COUNSEL_XP: 0.05,
  /** The caps a save is read to. */
  MAX_BEARERS: 40,
  MAX_MEMORY: 8,
  MAX_SERVED: 999,
};

export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: readonly SeasonName[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_WORDS: Readonly<Record<SeasonName, string>> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

export type Stage = 'youth' | 'prime' | 'veteran' | 'elder';
export const STAGES: readonly Stage[] = ['youth', 'prime', 'veteran', 'elder'];
/** The seasons served from which each stage begins. */
export const STAGE_FROM: Readonly<Record<Stage, number>> = { youth: 0, prime: 2, veteran: 6, elder: 10 };
export const STAGE_WORDS: Readonly<Record<Stage, string>> = { youth: 'Youth', prime: 'Prime', veteran: 'Veteran', elder: 'Elder' };

/** A bearer's fate once its time on the field is done (phase 5 has only the mentor: a hero retired to the Hall of Legends). */
export type Fate = 'mentor' | 'regular' | 'shade' | 'fallen';
const FATES: readonly Fate[] = ['mentor', 'regular', 'shade', 'fallen'];

/** A person in a kind's slot: the family tree's node. */
export interface Bearer {
  name: string;
  /** Generation: 1 for the hero as written. */
  gen: number;
  /** Seasons served (each one 20 waves or more fought in it). */
  served: number;
  fate?: Fate;
  /** Up to 8 short lines, already worded ("Became a Veteran · Year 2, Autumn"). */
  memory?: string[];
}
/** A kind's House: its bearers, oldest first, and which of them holds the slot. */
export interface Line {
  bearers: Bearer[];
  current: number;
}
export interface Dynasty {
  v: 1;
  /** The day key (yyyymmdd) the seasons count from: the day the Dynasties opened for the save. */
  start: number;
  lines: Record<string, Line>;
  /** This season's waves for the current bearers, by kind (the season's index with them, so a season past is settled when next read). */
  served?: Record<string, { season: number; waves: number }>;
  /** The last season whose turn the page has told ("Spring has come"), so it is told once. */
  told?: number;
}

/** A day key as a count of days (UTC, so a key is the same day everywhere). */
export const dayNumber = (day: number): number => Math.floor(Date.UTC(Math.floor(day / 10000), (Math.floor(day / 100) % 100) - 1, day % 100) / 86_400_000);

/** The season a day falls in, counted from the Dynasties' start (0 is the first Spring). */
export const seasonIndex = (d: Pick<Dynasty, 'start'>, day: number): number => Math.max(0, Math.floor((dayNumber(day) - dayNumber(d.start)) / DYNASTY.SEASON_DAYS));
/** A season's name, its Year of the War (from 1), and the days left in it on `day`. */
export function seasonOf(d: Pick<Dynasty, 'start'>, day: number): { index: number; name: SeasonName; year: number; daysLeft: number } {
  const index = seasonIndex(d, day);
  const into = Math.max(0, dayNumber(day) - dayNumber(d.start)) - index * DYNASTY.SEASON_DAYS;
  return { index, name: SEASONS[index % 4], year: Math.floor(index / 4) + 1, daysLeft: DYNASTY.SEASON_DAYS - into };
}
/** "Year 2 of the War · Autumn". */
export const seasonLine = (d: Pick<Dynasty, 'start'>, day: number): string => {
  const s = seasonOf(d, day);
  return `Year ${s.year} of the War · ${SEASON_WORDS[s.name]}`;
};
const seasonTag = (index: number): string => `Year ${Math.floor(index / 4) + 1}, ${SEASON_WORDS[SEASONS[index % 4]]}`;

/** The stage of a bearer by its seasons served. */
export const stageOf = (served: number): Stage => (served >= STAGE_FROM.elder ? 'elder' : served >= STAGE_FROM.veteran ? 'veteran' : served >= STAGE_FROM.prime ? 'prime' : 'youth');
/** Seasons still to serve to reach the next stage (0 at Elder, the last). */
export const toNextStage = (served: number): number => {
  const st = stageOf(served);
  const next = STAGES[STAGES.indexOf(st) + 1];
  return next ? STAGE_FROM[next] - served : 0;
};

/** A bearer's story age in words: "36" for a person, the ageless kinds' own words ("service year 13"). */
export function ageWords(kind: string, served: number): string {
  const a = AGELESS[kind];
  return a ? a.age(served) : String((BASE_AGE[kind] ?? 25) + served);
}
/** "Elder · 36" (or "Elder · service year 13"). */
export const stageAge = (kind: string, served: number): string => `${STAGE_WORDS[stageOf(served)]} · ${ageWords(kind, served)}`;
/** The touch of the years in this kind's look at a stage, in words (empty for a Youth or a Prime). */
export function lookWords(kind: string, stage: Stage): string {
  if (stage !== 'veteran' && stage !== 'elder') return '';
  const own = AGELESS[kind] ?? BEAST_LOOK[kind];
  if (own) return own[stage];
  return stage === 'veteran' ? VETERAN_LOOK : ELDER_LOOK;
}
/** Whether a kind is one of the ageless (its seasons are not told in years). */
export const isAgeless = (kind: string): boolean => !!AGELESS[kind];

const isHero = (kind: string): boolean => !!HERO_NAMES[kind];
const firstBearer = (kind: string, served: number): Bearer => ({ name: HERO_NAMES[kind]?.name ?? kind, gen: 1, served });

/** A kind's line, if it has one yet. */
export const lineOf = (m: Pick<Meta, 'dynasty'>, kind: string): Line | undefined => m.dynasty?.lines[kind];
/** The bearer holding a kind's slot. */
export const bearerOf = (m: Pick<Meta, 'dynasty'>, kind: string): Bearer | undefined => {
  const l = lineOf(m, kind);
  return l?.bearers[l.current];
};
/** The current bearer's stage (a Youth when the kind has no line yet). */
export const stageOfKind = (m: Pick<Meta, 'dynasty'>, kind: string): Stage => stageOf(bearerOf(m, kind)?.served ?? 0);
/** This season's waves the current bearer has fought, of the 20 it needs. */
export function wavesThisSeason(m: Pick<Meta, 'dynasty'>, kind: string, day: number): number {
  const d = m.dynasty;
  const s = d?.served?.[kind];
  return d && s && s.season === seasonIndex(d, day) ? s.waves : 0;
}

const remember = (b: Bearer, line: string): void => {
  b.memory = [...(b.memory ?? []), line].slice(-DYNASTY.MAX_MEMORY);
};

/** One bearer's turn of the years: a stage reached. */
export interface Aged {
  kind: string;
  name: string;
  served: number;
  from: Stage;
  to: Stage;
}

/** Open the Dynasties for a save that has heroes (the day they open is the first day of the first Spring), give every owned kind its
 *  line (with the past credited, capped at Prime), and settle any season that has ended since. Returns the stages reached, for the
 *  page to tell. Safe to call on every visit. */
export function openDynasty(m: Meta, day: number): Aged[] {
  if (!m.unlocked.length) return [];
  const d = (m.dynasty ??= { v: 1, start: day, lines: {} });
  for (const kind of m.unlocked) {
    if (!isHero(kind) || d.lines[kind]) continue;
    // (a favourite of many months is credited with its past: never more than Prime, so nobody is made old by an update)
    const credit = Math.min(DYNASTY.CREDIT_CAP, Math.floor((m.wavesFought?.[kind] ?? 0) / DYNASTY.CREDIT_WAVES));
    d.lines[kind] = { bearers: [firstBearer(kind, credit)], current: 0 };
  }
  // (a hero mentoring in the Hall of Legends is bearer I with the mentor's fate; recalled, the fate is cleared)
  for (const [kind, line] of Object.entries(d.lines)) {
    const b = line.bearers[line.current];
    if (!b) continue;
    if (retired(m, kind)) b.fate = 'mentor';
    else if (b.fate === 'mentor') delete b.fate;
  }
  return settleSeasons(m, day);
}

/** Every season that has ended: a bearer that fought its 20 waves in it serves it (a year older), and the stages reached are returned.
 *  Seasons with fewer waves simply pass: the bench never ages. */
export function settleSeasons(m: Meta, day: number): Aged[] {
  const d = m.dynasty;
  if (!d?.served) return [];
  const now = seasonIndex(d, day);
  const out: Aged[] = [];
  for (const [kind, s] of Object.entries(d.served)) {
    if (s.season >= now) continue;
    delete d.served[kind];
    if (s.waves < DYNASTY.SEASON_WAVES) continue;
    const b = bearerOf(m, kind);
    if (!b) continue;
    const from = stageOf(b.served);
    b.served = Math.min(DYNASTY.MAX_SERVED, b.served + 1);
    const to = stageOf(b.served);
    if (to !== from) {
      remember(b, `${to === 'elder' ? 'Became an Elder' : to === 'veteran' ? 'Became a Veteran' : 'Came into the Prime of life'} · ${seasonTag(s.season + 1)}`);
      out.push({ kind, name: b.name, served: b.served, from, to });
    }
  }
  if (!Object.keys(d.served).length) delete d.served;
  return out;
}

/** A wave has been settled: each hero kind placed on the board in it counts it towards its bearer's season (`share`: 1, or a half under
 *  auto-replay). Only the heroes who fought: the bench never ages. Returns the stages a season's end reached, if one had ended. */
export function noteServed(m: Meta, kinds: readonly string[], share: number, day: number): Aged[] {
  if (!m.dynasty) return [];
  const aged = settleSeasons(m, day);
  const d = m.dynasty;
  const now = seasonIndex(d, day);
  for (const kind of new Set(kinds)) {
    if (!isHero(kind) || !m.unlocked.includes(kind)) continue;
    if (!d.lines[kind]) d.lines[kind] = { bearers: [firstBearer(kind, 0)], current: 0 };
    const s = d.served?.[kind];
    const waves = (s && s.season === now ? s.waves : 0) + share;
    (d.served ??= {})[kind] = { season: now, waves: Math.round(waves * 2) / 2 };
  }
  return aged;
}

/** The bearers who will serve this season when it turns (20 waves fought already), with what they will reach. */
export function agingAtTurn(m: Pick<Meta, 'dynasty'>, day: number): { kind: string; name: string; served: number; to: Stage; stageUp: boolean }[] {
  const d = m.dynasty;
  if (!d) return [];
  const now = seasonIndex(d, day);
  const out: { kind: string; name: string; served: number; to: Stage; stageUp: boolean }[] = [];
  for (const [kind, s] of Object.entries(d.served ?? {})) {
    const b = bearerOf(m, kind);
    if (!b || s.season !== now || s.waves < DYNASTY.SEASON_WAVES) continue;
    out.push({ kind, name: b.name, served: b.served, to: stageOf(b.served + 1), stageUp: stageOf(b.served + 1) !== stageOf(b.served) });
  }
  return out.sort((a, b) => Number(b.stageUp) - Number(a.stageUp) || b.served - a.served || a.kind.localeCompare(b.kind));
}

/** A season's turn the page has not told yet: the season it is now (from the second), told once. */
export function takeSeasonNews(m: Meta, day: number): { name: SeasonName; year: number } | null {
  const d = m.dynasty;
  if (!d) return null;
  const s = seasonOf(d, day);
  if ((d.told ?? 0) >= s.index) return null;
  d.told = s.index;
  return { name: s.name, year: s.year };
}

/** Elder's Counsel: a fight's lasting XP with +5% for every hero but the Elder, while an Elder was fielded (an Elder gains it from another
 *  Elder fielded beside it). It does not stack: one Elder or five, the share is the same. XP only, never a fight's numbers. */
export function counselXp(m: Pick<Meta, 'dynasty'>, gains: Record<string, number>, fielded: readonly string[]): Record<string, number> {
  const elders = fielded.filter((k) => stageOfKind(m, k) === 'elder');
  if (!elders.length) return gains;
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(gains)) out[k] = elders.some((e) => e !== k) ? Math.round(n * (1 + DYNASTY.COUNSEL_XP)) : n;
  return out;
}
/** Whether this kind's bearer gives Elder's Counsel when fielded. */
export const givesCounsel = (m: Pick<Meta, 'dynasty'>, kind: string): boolean => stageOfKind(m, kind) === 'elder';

/** The line's words for the hero sheet: "Kwame's line · Gen I · 1 bearer". */
export const romanGen = (n: number): string => {
  const R: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  let x = Math.max(1, Math.min(39, Math.floor(n)));
  for (const [v, s] of R) while (x >= v) (out += s), (x -= v);
  return out;
};
export function lineWords(m: Pick<Meta, 'dynasty'>, kind: string): string {
  const l = lineOf(m, kind);
  const b = bearerOf(m, kind);
  const name = b?.name ?? HERO_NAMES[kind]?.name ?? kind;
  const n = l?.bearers.length ?? 1;
  return `${HERO_NAMES[kind]?.name ?? name}’s line · Gen ${romanGen(b?.gen ?? 1)} · ${n} ${n === 1 ? 'bearer' : 'bearers'}`;
}

/** Read the Dynasties as saved: unknown kinds are dropped, numbers clamped and lists cut to their caps, so a corrupted or hand-edited
 *  save cannot grow without bound. Missing (a save from before) stays missing: the page opens them on its next visit. */
export function readDynasty(raw: unknown): Dynasty | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<Dynasty>;
  // (the start must be a real day key, yyyymmdd)
  const start = typeof r.start === 'number' && Number.isInteger(r.start) ? r.start : 0;
  const mo = Math.floor(start / 100) % 100;
  const dd = start % 100;
  if (start < 19700101 || start > 99991231 || mo < 1 || mo > 12 || dd < 1 || dd > 31) return undefined;
  const d: Dynasty = { v: 1, start, lines: {} };
  for (const [kind, x] of Object.entries(r.lines && typeof r.lines === 'object' ? r.lines : {})) {
    if (!isHero(kind) || !x || typeof x !== 'object' || !Array.isArray(x.bearers)) continue;
    const bearers: Bearer[] = [];
    for (const y of x.bearers.slice(0, DYNASTY.MAX_BEARERS)) {
      if (!y || typeof y !== 'object' || typeof y.name !== 'string' || !y.name.trim()) continue;
      const b: Bearer = { name: y.name.slice(0, 40), gen: int(y.gen, 1, 99, 1), served: int(y.served, 0, DYNASTY.MAX_SERVED, 0) };
      if (FATES.includes(y.fate as Fate)) b.fate = y.fate;
      const mem = Array.isArray(y.memory) ? y.memory.filter((l): l is string => typeof l === 'string').map((l) => l.slice(0, 120)).slice(-DYNASTY.MAX_MEMORY) : [];
      if (mem.length) b.memory = mem;
      bearers.push(b);
    }
    if (!bearers.length) continue;
    d.lines[kind] = { bearers, current: int(x.current, 0, bearers.length - 1, bearers.length - 1) };
  }
  for (const [kind, s] of Object.entries(r.served && typeof r.served === 'object' ? r.served : {})) {
    if (!d.lines[kind] || !s || typeof s !== 'object') continue;
    const waves = Number(s.waves);
    if (!Number.isFinite(waves) || waves <= 0) continue;
    (d.served ??= {})[kind] = { season: int(s.season, 0, 1e6, 0), waves: Math.min(1e4, Math.round(waves * 2) / 2) };
  }
  if (typeof r.told === 'number' && Number.isFinite(r.told) && r.told > 0) d.told = int(r.told, 0, 1e6, 0);
  return d;
}

function int(v: unknown, lo: number, hi: number, dflt: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : dflt;
  return Math.max(lo, Math.min(hi, n));
}
