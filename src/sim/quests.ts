// Quests (batch 1 of the quests and Eidolons design, `docs/notes/quests-summons-design.md`): the givers' offers, taking one, the
// goals counted after each settled fight, and the hand-in that pays. Pure rules: no Pixi, no DOM, no clock: the page passes in
// the date (yyyymmdd, `todayKey()`), as the daily and the auto tickets do.
//
// - **Offers** are drawn once a date for each slot (Gwen's board, the passersby) from a side stream of the save's seed, the date and
//   the slot, and kept in the save: the same save on the same day sees the same offers, and nothing rerolls them. Gwen's board holds
//   up to three, one new a day, each kept three days; a passerby's lasts the day.
// - **A quest that needs a particular hero** (its goal's `with` rider) is not offered until the player owns a hero who could do it.
// - **At most three** ordinary quests are taken at once (`ACTIVE_MAX`). A quest is done once; it is not offered again.
// - **Goals** are counted by `noteQuests`, called with `checkAchievements` (`settleRun`) and at the Last Stand's end; losing never
//   takes progress away. A done quest waits for its hand-in, which pays.
//
// The Eidolon chains (a later batch) will keep their state beside this in `Meta.quests` (`chains`, `pieces`).

import type { AchievementCtx } from './achievements';
import { ARMIES, armyCleared, armyUnlocked, clearedCount } from './armies';
import { isBoss } from './foes';
import type { Meta } from './meta';
import { Rng, hashSeed, mixSeed } from './rng';
import { isBossRun, waveArmyOf } from './run';
import { traitsOf } from './traits';
import { UNITS } from './units';
import { grantOres } from './awakenMats';
import { GIVERS, QUESTS, SLOTS, SLOT_RULES, questById, type FoeFamily, type Goal, type GiverSlot, type Need, type QuestDef, type Reward, type With } from './questData';

/** The side streams: the day's offers, and a quest's chest. */
const QUEST_SALT = 0x9e57;
const CHEST_SALT = 0x9e5c;
/** At most this many ordinary quests taken at once (the owner's decision). */
export const ACTIVE_MAX = 3;

export interface QuestActive {
  id: string;
  /** How far on its goal is (a count). */
  progress: number;
  /** The date it was taken (yyyymmdd). */
  took: number;
}
export interface QuestOffer {
  id: string;
  giver: string;
  /** The date it was offered (yyyymmdd). */
  day: number;
}
/** The quests' lasting state (`Meta.quests`; a save from before has none: nothing begun). */
export interface QuestState {
  active: QuestActive[];
  offers: QuestOffer[];
  /** The quests handed in, oldest first. */
  done: string[];
  /** The quest the player pinned to the Battle tab's chip (else the newest taken shows). */
  tracked?: string;
  /** The date the offers were last drawn. */
  day?: number;
}

export const blankQuests = (): QuestState => ({ active: [], offers: [], done: [] });
const stateOf = (m: Meta): QuestState => (m.quests ??= blankQuests());

/** A date (yyyymmdd) as a count of days, so offers can be aged across months. */
export const dayNumber = (date: number): number => Math.floor(Date.UTC(Math.floor(date / 10000), (Math.floor(date / 100) % 100) - 1, date % 100) / 86_400_000);

/* ------------------------------------------------------------------ who may be offered what */

export function needMet(m: Meta, n: Need): boolean {
  if (n.kind === 'army') return armyCleared(m, n.army);
  if (n.kind === 'armies') return clearedCount(m) >= n.n;
  return true;
}

/** Whether a hero kind fits a goal's rider. */
const fits = (w: With, kind: string): boolean => !!w.heroes?.includes(kind) || !!w.traits?.some((t) => traitsOf(kind).includes(t));

/** The rider a goal asks of the heroes, if any. */
const riderOf = (g: Goal): With | undefined => ('with' in g ? g.with : undefined);

/** The owner's rule: a quest that needs a particular hero does not show until the player owns one who could do it. */
export function heroesOwnedFor(m: Meta, q: QuestDef): boolean {
  const w = riderOf(q.goal);
  return !w || m.unlocked.some((k) => fits(w, k));
}

/** Whether a quest could be offered now: its needs met, a hero to do it owned, and not taken, on offer, or done already. */
export function canOffer(m: Meta, q: QuestDef): boolean {
  const s = m.quests;
  if (s && (s.done.includes(q.id) || s.active.some((a) => a.id === q.id) || s.offers.some((o) => o.id === q.id))) return false;
  return needMet(m, q.needs) && heroesOwnedFor(m, q);
}

const slotOf = (q: QuestDef): GiverSlot => GIVERS[q.giver].slot;

/**
 * The day's offers: take down the ones past their days (and any whose quest is gone or no longer fits), then, the first time a date
 * is seen, draw one new offer for each slot that has room, from `mixSeed(seed, QUEST_SALT, day, slot)`. Returns whether the state
 * changed (the page saves it). Calling it again on the same date changes nothing.
 */
export function refreshOffers(m: Meta, date: number, pool: readonly QuestDef[] = QUESTS): boolean {
  const s = stateOf(m);
  const today = dayNumber(date);
  const before = s.offers.length;
  s.offers = s.offers.filter((o) => {
    const q = pool.find((d) => d.id === o.id);
    return !!q && today - dayNumber(o.day) < SLOT_RULES[slotOf(q)].days && today >= dayNumber(o.day) && heroesOwnedFor(m, q);
  });
  let changed = s.offers.length !== before;
  if (s.day === date) return changed;
  s.day = date;
  changed = true;
  SLOTS.forEach((slot, i) => {
    const held = s.offers.filter((o) => slotOf(pool.find((d) => d.id === o.id)!) === slot).length;
    if (held >= SLOT_RULES[slot].cap) return;
    const open = pool.filter((q) => slotOf(q) === slot && canOffer(m, q));
    if (!open.length) return;
    const q = new Rng(mixSeed(m.seed, QUEST_SALT, today, i)).pick(open);
    s.offers.push({ id: q.id, giver: q.giver, day: date });
  });
  return changed;
}

/* ------------------------------------------------------------------ taking, tracking, handing in */

export type TakeRefusal = 'notOffered' | 'full';
/** Why a quest on offer cannot be taken now (null: it can). */
export function cannotTake(m: Meta, id: string): TakeRefusal | null {
  const s = m.quests;
  if (!s?.offers.some((o) => o.id === id)) return 'notOffered';
  if (s.active.length >= ACTIVE_MAX) return 'full';
  return null;
}

/** Take a quest on offer: it moves into the log. False (nothing changes) when it is not on offer or the log is full. */
export function takeQuest(m: Meta, id: string, date: number): boolean {
  if (cannotTake(m, id)) return false;
  const s = m.quests!;
  s.offers = s.offers.filter((o) => o.id !== id);
  s.active.push({ id, progress: 0, took: date });
  return true;
}

/** How far a quest is: its count and what it needs. */
export function progressOf(a: QuestActive): { now: number; need: number } {
  const need = questById(a.id)?.goal.n ?? 1;
  return { now: Math.min(need, a.progress), need };
}
export const isDone = (a: QuestActive): boolean => {
  const p = progressOf(a);
  return p.now >= p.need;
};

/** The quests whose goal is met, waiting to be handed in. */
export const readyQuests = (m: Meta): string[] => (m.quests?.active ?? []).filter(isDone).map((a) => a.id);

/** Pin a quest to the Battle tab's chip (or unpin with undefined). */
export function trackQuest(m: Meta, id: string | undefined): void {
  const s = stateOf(m);
  if (id === undefined || !s.active.some((a) => a.id === id)) delete s.tracked;
  else s.tracked = id;
}

/** The quest the chip shows: the pinned one, else the newest taken (none when the log is empty). */
export function trackedQuest(m: Meta): QuestActive | undefined {
  const act = m.quests?.active ?? [];
  return act.find((a) => a.id === m.quests?.tracked) ?? act[act.length - 1];
}

/** The chest a reward pays goes in the stash as a chest of the furthest army open (its contents follow that army), told apart by its seed. */
const CHEST_AT = { bronze: 3, silver: 5, gold: 10 } as const;

/** Pay a reward into the meta. */
export function payReward(m: Meta, r: Reward, id: string): void {
  if (r.crowns) m.crowns += r.crowns;
  if (r.stones) m.stones = (m.stones ?? 0) + r.stones;
  if (r.chest) {
    const army = [...ARMIES].reverse().find((a) => armyUnlocked(m, a.id)) ?? ARMIES[0];
    m.stash.push({ army: army.id, at: CHEST_AT[r.chest], tier: 0, seed: mixSeed(m.seed, CHEST_SALT, hashSeed(id)), tower: true });
  }
  if (r.ores?.length) grantOres(m, r.ores);
}

/** Hand in a done quest: its reward is paid and it moves to the done list. False (nothing changes) when it is not taken or not done. */
export function handIn(m: Meta, id: string): boolean {
  const s = m.quests;
  const a = s?.active.find((x) => x.id === id);
  const q = questById(id);
  if (!s || !a || !q || !isDone(a)) return false;
  s.active = s.active.filter((x) => x !== a);
  s.done.push(id);
  if (s.tracked === id) delete s.tracked;
  payReward(m, q.reward, id);
  return true;
}

/** Whether anything waits at the tavern: an offer on the board, or a quest to hand in (the Heroes tab's gold "!"). */
export const questsWaiting = (m: Meta): boolean => !!m.quests && (m.quests.offers.length > 0 || readyQuests(m).length > 0);

/* ------------------------------------------------------------------ counting the goals */

/** A settled fight, as the goals read it (built by `questFightOf`, or by the Last Stand at its end). */
export interface QuestFight {
  won: boolean;
  /** The army a run fought (army runs only). */
  army?: string;
  /** Waves won in this settle (1 for a won fight; the Last Stand's waves cleared). */
  waves: number;
  /** The fight was a boss wave. */
  boss: boolean;
  /** The hero kinds that fought in it (none known for the Last Stand). */
  heroes: readonly string[];
  /** No hero fell. */
  flawless: boolean;
  /** The foe kinds felled. */
  kills: readonly string[];
  /** A counted daily was cleared by this fight. */
  dailyCleared: boolean;
}

/** The foes of a family (by their look's sheet: every skeleton's sheet is a skeleton's). */
const inFamily = (fam: FoeFamily, def: string): boolean => fam === 'skeletons' && (UNITS[def]?.sheet ?? '').startsWith('skeleton') && !isBoss(def);

/** A settled fight's facts, from what the achievements are checked with. */
export function questFightOf(c: AchievementCtx): QuestFight {
  const units = c.battle?.units ?? [];
  const heroes = units.filter((u) => u.side === 'hero' && !UNITS[u.def]?.summon);
  const run = c.run;
  const army = run.mode?.kind === 'army' ? run.mode.army : undefined;
  const fixed = waveArmyOf(run);
  const boss = (fixed ? !!fixed.waves[c.stage - 1]?.boss : run.tower ? run.tower.cur?.kind === 'boss' : isBossRun(run, c.stage)) || units.some((u) => u.side === 'foe' && isBoss(u.def));
  const daily = run.mode?.kind === 'daily' && !run.mode.practice;
  return {
    won: c.won,
    ...(army ? { army } : {}),
    waves: c.won && c.battle ? 1 : 0,
    boss,
    heroes: heroes.map((u) => u.def),
    flawless: heroes.length > 0 && heroes.every((u) => u.alive),
    kills: units.filter((u) => u.side === 'foe' && !u.alive).map((u) => u.def),
    dailyCleared: c.won && daily && !!run.cleared,
  };
}

/** The Last Stand's end, as the goals read it: its waves cleared count as waves won anywhere (its fights are not settled one by one). */
export const standFight = (cleared: number): QuestFight => ({ won: cleared > 0, waves: cleared, boss: false, heroes: [], flawless: false, kills: [], dailyCleared: false });

/** How much one settled fight adds to a goal. */
export function goalGain(g: Goal, f: QuestFight): number {
  const w = riderOf(g);
  const riders = (!w || f.heroes.some((k) => fits(w, k))) && (!('flawless' in g && g.flawless) || f.flawless);
  switch (g.kind) {
    case 'wavesWon':
      return f.won && (!g.army || f.army === g.army) && riders ? f.waves : 0;
    case 'bossDown':
      return f.won && f.boss && riders ? 1 : 0;
    case 'kills':
      return f.kills.filter((d) => inFamily(g.family, d)).length;
    case 'clearDaily':
      return f.dailyCleared ? 1 : 0;
  }
}

/** Count a settled fight towards every quest taken. Returns the ids whose goal it completed (for the toast). Pure but for the meta. */
export function noteQuests(m: Meta, f: QuestFight): string[] {
  const done: string[] = [];
  for (const a of m.quests?.active ?? []) {
    const q = questById(a.id);
    if (!q || isDone(a)) continue;
    const add = goalGain(q.goal, f);
    if (!add) continue;
    a.progress = Math.min(q.goal.n, a.progress + add);
    if (isDone(a)) done.push(a.id);
  }
  return done;
}

/* ------------------------------------------------------------------ the save */

const isDate = (x: unknown): x is number => typeof x === 'number' && /^\d{8}$/.test(String(x));

/** A saved quest state, read safely: quests no longer in the game are dropped, counts kept sane. Undefined for a save with none. */
export function readQuests(raw: unknown): QuestState | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<QuestState>;
  const s = blankQuests();
  const seen = new Set<string>();
  for (const a of Array.isArray(r.active) ? r.active : []) {
    const q = a && typeof a.id === 'string' ? questById(a.id) : undefined;
    if (!q || seen.has(q.id) || s.active.length >= ACTIVE_MAX) continue;
    seen.add(q.id);
    s.active.push({ id: q.id, progress: Math.max(0, Math.min(q.goal.n, Math.floor(Number(a.progress) || 0))), took: isDate(a.took) ? a.took : 0 });
  }
  s.done = [...new Set((Array.isArray(r.done) ? r.done : []).filter((id): id is string => typeof id === 'string' && !!questById(id) && !seen.has(id)))];
  for (const o of Array.isArray(r.offers) ? r.offers : []) {
    const q = o && typeof o.id === 'string' ? questById(o.id) : undefined;
    if (!q || seen.has(q.id) || s.done.includes(q.id) || !isDate(o.day)) continue;
    seen.add(q.id);
    s.offers.push({ id: q.id, giver: q.giver, day: o.day });
  }
  if (typeof r.tracked === 'string' && s.active.some((a) => a.id === r.tracked)) s.tracked = r.tracked;
  if (isDate(r.day)) s.day = r.day;
  // (a later batch's chain state, kept as it was so an older build does not wipe it)
  for (const k of ['chains', 'pieces', 'tries'] as const) if (k in (raw as object)) (s as unknown as Record<string, unknown>)[k] = (raw as Record<string, unknown>)[k];
  return s;
}
