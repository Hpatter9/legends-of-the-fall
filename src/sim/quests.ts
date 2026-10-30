// Quests (batch 1 of the quests and Eidolons design, `docs/notes/quests-summons-design.md`, and batch 1b: repeats, drops, the hundred
// and thirty quests and their givers): the givers' offers, taking one, dropping one, the goals counted after each settled fight, and
// the hand-in that pays. Pure rules: no Pixi, no DOM, no clock: the page passes in the date (yyyymmdd, `todayKey()`), as the daily
// and the auto tickets do.
//
// - **Offers** are drawn once a date for each slot (Gwen's board, the notices, the passersby, the patrons, the Royal charges,
//   Duchess) from a side stream of the save's seed, the date and the slot, and kept in the save: the same save on the same day sees
//   the same offers, and nothing rerolls them. Two slots come after a fight instead: spoils found on an army's boss, and the rift's
//   voice when a Calamity guardian falls (`offerAfterFight`, its own side stream of the run's seed and the wave).
// - **A quest that needs particular heroes** (its goal's riders, or a patron who gives it) is not offered until the player owns heroes
//   who could do it (the owner's rule).
// - **At most three** ordinary quests are taken at once (`ACTIVE_MAX`). A unique quest is done once; a repeatable one (`repeat`) is
//   offered again its cooldown after its hand-in. A quest taken can be dropped: its progress is lost; a unique goes back to being
//   offerable, a repeatable waits its cooldown.
// - **Goals** are counted by `noteQuests`, called with `checkAchievements` (`settleRun`) and at the Last Stand's end; losing never
//   takes progress away. A done quest waits for its hand-in, which pays.
//
// The Eidolon chains (a later batch) will keep their state beside this in `Meta.quests` (`chains`, `pieces`).

import type { AchievementCtx } from './achievements';
import { ARMIES, armyCleared, armyUnlocked, clearedCount, recordOf, waveFoes } from './armies';
import { isBoss } from './foes';
import type { Battle, BattleEvent, Unit } from './battle';
import type { FightStats } from './fightStats';
import { mvpOf } from './fightStats';
import { keyOf, ultimateOf } from './abilities';
import { levelOfKind } from './levels';
import type { Meta } from './meta';
import { modeOpen } from './modeUnlock';
import { Rng, hashSeed, mixSeed } from './rng';
import { isBossRun, tierOfRun, waveArmyOf } from './run';
import { traitsOf } from './traits';
import { UNITS } from './units';
import { grantOres } from './awakenMats';
import { grantTomes } from './tomes';
import { giveShards } from './unlock';
import { COMBOS } from './combos';
import {
  BEST_GOALS,
  GIVERS,
  QUESTS,
  SLOTS,
  SLOT_RULES,
  questById,
  type Cond,
  type FightMode,
  type FoeFamily,
  type Goal,
  type GiverSlot,
  type Need,
  type QuestDef,
  type Reward,
  type StatKey,
  type With,
} from './questData';

/** The side streams: the day's offers, a quest's chest, and the offers a fight turns up. */
const QUEST_SALT = 0x9e57;
const CHEST_SALT = 0x9e5c;
const AFTER_SALT = 0x9e5a;
/** At most this many ordinary quests taken at once (the owner's decision). */
export const ACTIVE_MAX = 3;
/** The share of a day's draws that goes to a giver's repeatables while they have unique quests to offer too. */
export const REPEAT_SHARE = 0.3;
/** How likely a boss win turns up spoils, and a guardian's fall the rift's voice (the design). */
export const SPOILS_CHANCE = 1 / 3;
export const RIFT_CHANCE = 1 / 2;

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
  /** The quests handed in, oldest first (a repeatable once, moved to the end each time it is handed in again). */
  done: string[];
  /** The quest the player pinned to the Battle tab's chip (else the newest taken shows). */
  tracked?: string;
  /** The date the offers were last drawn. */
  day?: number;
  /** How many times each repeatable has been handed in (batch 1b; none before). */
  times?: Record<string, number>;
  /** The date each repeatable was last handed in or dropped: its cooldown runs from it. */
  last?: Record<string, number>;
  /** The date each slot with an `every` last drew an offer. */
  drawn?: Partial<Record<GiverSlot, number>>;
}

export const blankQuests = (): QuestState => ({ active: [], offers: [], done: [] });
const stateOf = (m: Meta): QuestState => (m.quests ??= blankQuests());

/** A date (yyyymmdd) as a count of days, so offers can be aged across months. */
export const dayNumber = (date: number): number => Math.floor(Date.UTC(Math.floor(date / 10000), (Math.floor(date / 100) % 100) - 1, date % 100) / 86_400_000);

/* ------------------------------------------------------------------ who may be offered what */

/** The best level of any hero owned. */
const bestLevel = (m: Meta): number => Math.max(1, ...m.unlocked.map((k) => levelOfKind(m, k)));

/** Whether any army has been cleared on this tier or a harder one. */
const tierCleared = (m: Meta, tier: number): boolean =>
  ARMIES.some((a) => {
    const r = recordOf(m, a.id);
    if (tier <= 0) return r.clears > 0;
    for (let t = tier; t <= 4; t++) if (((r.first ?? 0) >> t) & 1 || (r.hard?.[String(t)]?.clears ?? 0) > 0) return true;
    return false;
  });

export function needMet(m: Meta, n: Need): boolean {
  switch (n.kind) {
    case 'army':
      return armyCleared(m, n.army);
    case 'armies':
      return clearedCount(m) >= n.n;
    case 'level':
      return bestLevel(m) >= n.n;
    case 'tier':
      return tierCleared(m, n.tier);
    case 'mode':
      return modeOpen(m, n.mode);
    case 'duchess':
      return !!(m.duchessTaps || m.duchessLucky || m.duchessHay);
    case 'spell':
      return !!m.spellbook?.owned.includes(n.id as never);
    case 'all':
      return n.of.every((x) => needMet(m, x));
    default:
      return true;
  }
}

/** Whether a hero kind fits a rider. */
const fits = (w: With, kind: string): boolean => !!w.heroes?.includes(kind) || !!w.traits?.some((t) => traitsOf(kind).includes(t));

/** The owner's rule: a quest that needs particular heroes (or is a patron's) does not show until the player owns heroes who could do it. */
export function heroesOwnedFor(m: Meta, q: QuestDef): boolean {
  const own = (k: string) => m.unlocked.includes(k);
  const some = (w: With) => m.unlocked.some((k) => fits(w, k));
  const g = q.goal as Goal & Cond & { by?: With; combo?: string };
  if (q.hero && !own(q.hero)) return false;
  if (g.with && !some(g.with)) return false;
  if (g.only && !some(g.only)) return false;
  if (g.by && !some(g.by)) return false;
  if (g.all && !g.all.every(own)) return false;
  if (g.kind === 'teamCombo' && g.combo && !(COMBOS.find((c) => c.id === g.combo)?.heroes ?? []).every(own)) return false;
  return true;
}

const isRepeat = (q: QuestDef): boolean => !!q.repeat;

/** Whether a repeatable's cooldown has run on `date` (a unique, or a date not given, has none to wait). */
export function cooledDown(m: Meta, q: QuestDef, date?: number): boolean {
  const last = m.quests?.last?.[q.id];
  return !q.repeat || !last || date === undefined || dayNumber(date) - dayNumber(last) >= q.repeat;
}

/** Whether a quest could be offered now: its needs met, the quest before it handed in, heroes to do it owned, and not taken, on offer, done already (a unique) or cooling down (a repeatable). */
export function canOffer(m: Meta, q: QuestDef, date?: number): boolean {
  const s = m.quests;
  if (s && (s.active.some((a) => a.id === q.id) || s.offers.some((o) => o.id === q.id))) return false;
  if (!isRepeat(q) && s?.done.includes(q.id)) return false;
  if (q.after && !s?.done.includes(q.after)) return false;
  return needMet(m, q.needs) && heroesOwnedFor(m, q) && cooledDown(m, q, date);
}

export const slotOf = (q: QuestDef): GiverSlot => GIVERS[q.giver].slot;

/** Pick an offer from what is open: a giver's unique quests first, with a share of the draws for their repeatables. */
function pickOffer(rng: Rng, open: readonly QuestDef[]): QuestDef | undefined {
  const uniq = open.filter((q) => !isRepeat(q));
  const reps = open.filter(isRepeat);
  const pool = uniq.length && (!reps.length || !rng.chance(REPEAT_SHARE)) ? uniq : reps;
  return pool.length ? rng.pick(pool) : undefined;
}

/**
 * The day's offers: take down the ones past their days (and any whose quest is gone or no longer fits), then, the first time a date
 * is seen, draw one new offer for each slot that has room (and whose `every` has come round), from `mixSeed(seed, QUEST_SALT, day,
 * slot)`. Returns whether the state changed (the page saves it). Calling it again on the same date changes nothing.
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
    const rule = SLOT_RULES[slot];
    if (rule.after) return;
    const held = s.offers.filter((o) => slotOf(pool.find((d) => d.id === o.id)!) === slot).length;
    if (held >= rule.cap) return;
    const last = s.drawn?.[slot];
    if (rule.every && last && today - dayNumber(last) < rule.every) return;
    const q = pickOffer(new Rng(mixSeed(m.seed, QUEST_SALT, today, i)), pool.filter((d) => slotOf(d) === slot && canOffer(m, d, date)));
    if (!q) return;
    s.offers.push({ id: q.id, giver: q.giver, day: date });
    if (rule.every) (s.drawn ??= {})[slot] = date;
  });
  return changed;
}

/**
 * The offers a settled fight may turn up (the slots drawn `after` a fight): spoils on an army's boss wave won (about one in three),
 * the rift's voice on a Calamity guardian felled (about one in two). Drawn from the run's seed and the wave on a side stream, so the
 * same fight always finds the same; dated the day the board was last drawn (none before the tavern has been seen). Returns the ids
 * offered.
 */
export function offerAfterFight(m: Meta, f: QuestFight, runSeed: number, stage: number, pool: readonly QuestDef[] = QUESTS): string[] {
  const s = m.quests;
  if (!s?.day || !f.won || !f.boss) return [];
  const slot: GiverSlot | null = f.mode === 'army' ? 'spoils' : f.mode === 'calamity' && f.map ? 'rift' : null;
  if (!slot) return [];
  if (s.offers.filter((o) => slotOf(questById(o.id) ?? QUESTS[0]) === slot).length >= SLOT_RULES[slot].cap) return [];
  const rng = new Rng(mixSeed(m.seed, AFTER_SALT, runSeed, stage, SLOTS.indexOf(slot)));
  if (!rng.chance(slot === 'spoils' ? SPOILS_CHANCE : RIFT_CHANCE)) return [];
  const felled = f.bosses ?? [];
  const open = pool.filter((q) => slotOf(q) === slot && canOffer(m, q, s.day) && (!q.from || q.from.some((b) => felled.includes(b))));
  const q = pickOffer(rng, open);
  if (!q) return [];
  s.offers.push({ id: q.id, giver: q.giver, day: s.day });
  return [q.id];
}

/* ------------------------------------------------------------------ taking, dropping, tracking, handing in */

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

/**
 * Drop a quest taken (the owner's ask): it leaves the log and its progress is lost. A unique quest goes back to being offerable (a
 * later day's draw may offer it again); a repeatable waits its cooldown from `date`, as after a hand-in. False when it is not taken.
 */
export function dropQuest(m: Meta, id: string, date: number): boolean {
  const s = m.quests;
  if (!s?.active.some((a) => a.id === id)) return false;
  s.active = s.active.filter((a) => a.id !== id);
  if (s.tracked === id) delete s.tracked;
  if (questById(id)?.repeat) (s.last ??= {})[id] = date;
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

/** How many times a quest has been handed in (a unique: 0 or 1). */
export const timesDone = (m: Meta, id: string): number => m.quests?.times?.[id] ?? (m.quests?.done.includes(id) ? 1 : 0);

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

/** Pay a reward into the meta (`times` tells a repeatable's chests apart). */
export function payReward(m: Meta, r: Reward, id: string, times = 0): void {
  if (r.crowns) m.crowns += r.crowns;
  if (r.stones) m.stones = (m.stones ?? 0) + r.stones;
  if (r.chest) {
    const army = [...ARMIES].reverse().find((a) => armyUnlocked(m, a.id)) ?? ARMIES[0];
    m.stash.push({ army: army.id, at: CHEST_AT[r.chest], tier: 0, seed: mixSeed(m.seed, CHEST_SALT, hashSeed(id), times), tower: true });
  }
  if (r.ores?.length) grantOres(m, r.ores);
  if (r.tomes) grantTomes(m, r.tomes);
  // (QUESTS-1b, the owner's ask: some quests pay a fitting hero's shards: unlock shards if not owned, rank shards if owned)
  if (r.shards) giveShards(m, r.shards.kind, r.shards.n);
}

/** Hand in a done quest: its reward is paid and it moves to the done list (a repeatable's count goes up, and its cooldown starts on `date`). False (nothing changes) when it is not taken or not done. */
export function handIn(m: Meta, id: string, date?: number): boolean {
  const s = m.quests;
  const a = s?.active.find((x) => x.id === id);
  const q = questById(id);
  if (!s || !a || !q || !isDone(a)) return false;
  s.active = s.active.filter((x) => x !== a);
  const times = timesDone(m, id);
  s.done = s.done.filter((x) => x !== id);
  s.done.push(id);
  if (q.repeat) {
    (s.times ??= {})[id] = times + 1;
    const when = date ?? s.day;
    if (when) (s.last ??= {})[id] = when;
  }
  if (s.tracked === id) delete s.tracked;
  payReward(m, q.reward, id, times);
  return true;
}

/** Whether anything waits at the tavern: an offer on the board, or a quest to hand in (the Heroes tab's gold "!"). */
export const questsWaiting = (m: Meta): boolean => !!m.quests && (m.quests.offers.length > 0 || readyQuests(m).length > 0);

/* ------------------------------------------------------------------ counting the goals */

/** One hero's tallies in a fight (as `fightStats.ts` keeps them). */
export interface QuestStat {
  kind: string;
  dealt: number;
  healed: number;
  taken: number;
  kills: number;
}

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
  /** The mode it was fought in. */
  mode?: FightMode;
  /** An army run's tier. */
  tier?: number;
  /** The wave (or floor) it was. */
  stage?: number;
  /** The bosses felled in it. */
  bosses?: readonly string[];
  /** How long it took (seconds). */
  secs?: number;
  /** A hero ended it standing on a quarter of its health or less. */
  lowHp?: boolean;
  /** The heroes of each ultimate fired (one entry an ultimate; from the page's tally of the fight's events). */
  ults?: readonly string[];
  /** The king's spells cast, by id. */
  spells?: readonly string[];
  /** Duo combos set off. */
  duos?: number;
  /** The five-hero combo that went off, if one did. */
  team?: string;
  /** The heroes' tallies (from the page's `FightStats`). */
  stats?: readonly QuestStat[];
  /** The MVP's kind (a won fight with tallies). */
  mvp?: string;
  /** It ended a run cleared (an army's last wave, a calamity's last guardian). */
  cleared?: boolean;
  /** The map of the Calamity guardian felled in it (1 to 6), if one was. */
  map?: number;
  /** The Last Stand's end: the best wave, the act reached (0 to 3) and how many times the line was held. */
  stand?: { best: number; act: number; held: number };
}

/** The foes of a family (by their look's sheet: every skeleton's sheet is a skeleton's). */
const inFamily = (fam: FoeFamily, def: string): boolean => fam === 'skeletons' && (UNITS[def]?.sheet ?? '').startsWith('skeleton') && !isBoss(def);

/** Every foe kind that marches in an army's waves (on Normal). */
const armyFoes = new Map<string, Set<string>>();
function foesOfArmy(id: string): Set<string> {
  let set = armyFoes.get(id);
  if (!set) {
    const a = ARMIES.find((x) => x.id === id);
    set = new Set(a ? a.waves.flatMap((_, i) => waveFoes(a, i + 1)) : []);
    armyFoes.set(id, set);
  }
  return set;
}

/** The ultimates fired in a tick's events: the hero kind of each (a `skill` event whose key is its caster's ultimate). The page keeps these for the fight and passes them to `settleRun`. */
export function ultsIn(events: readonly BattleEvent[], units: readonly Unit[]): string[] {
  const out: string[] = [];
  for (const e of events) {
    if (e.kind !== 'skill') continue;
    const u = units.find((x) => x.id === e.by);
    const ult = u && u.side === 'hero' ? ultimateOf(u) : undefined;
    if (u && ult && keyOf(ult) === e.name) out.push(u.def);
  }
  return out;
}

/** What the page adds to a settled fight: its heroes' tallies, and the ultimates fired. */
export interface FightExtra {
  stats?: FightStats;
  ults?: readonly string[];
}

const modeOf = (k: string | undefined): FightMode | undefined => (k === 'army' || k === 'daily' || k === 'tower' || k === 'calamity' ? k : undefined);

/** A settled fight's facts, from what the achievements are checked with (and the page's tallies, when it has them). */
export function questFightOf(c: AchievementCtx, extra: FightExtra = {}): QuestFight {
  const b: Battle | undefined = c.battle;
  const units = b?.units ?? [];
  const heroes = units.filter((u) => u.side === 'hero' && !UNITS[u.def]?.summon);
  const run = c.run;
  const army = run.mode?.kind === 'army' ? run.mode.army : undefined;
  const fixed = waveArmyOf(run);
  const bossFoes = units.filter((u) => u.side === 'foe' && isBoss(u.def));
  const boss = (fixed ? !!fixed.waves[c.stage - 1]?.boss : run.tower ? run.tower.cur?.kind === 'boss' : isBossRun(run, c.stage)) || bossFoes.length > 0;
  const daily = run.mode?.kind === 'daily' && !run.mode.practice;
  const mode = modeOf(run.mode?.kind);
  // (a Calamity guardian felled: its map, from its kind, `calBoss1` to `calBoss6`)
  const guardian = Math.max(0, ...bossFoes.filter((u) => !u.alive && /^calBoss\d$/.test(u.def)).map((u) => Number(u.def.slice(7))));
  const stats = extra.stats?.map((s) => ({ kind: s.kind, dealt: s.dealt, healed: s.healed, taken: s.taken, kills: s.kills }));
  const mvp = c.won && extra.stats ? mvpOf(extra.stats)?.kind : undefined;
  const spells = (b?.log ?? []).flatMap((e) => (e.kind === 'spell' ? [e.id as string] : []));
  const duos = (b?.duoCombos ?? []).reduce((n, d) => n + d.triggerCount, 0);
  return {
    won: c.won,
    ...(army ? { army } : {}),
    waves: c.won && b ? 1 : 0,
    boss,
    heroes: heroes.map((u) => u.def),
    flawless: heroes.length > 0 && heroes.every((u) => u.alive),
    kills: units.filter((u) => u.side === 'foe' && !u.alive).map((u) => u.def),
    dailyCleared: c.won && daily && !!run.cleared,
    ...(mode ? { mode } : {}),
    tier: tierOfRun(run),
    stage: c.stage,
    bosses: bossFoes.filter((u) => !u.alive).map((u) => u.def),
    secs: b ? b.t / 1000 : 0,
    lowHp: c.won && heroes.some((u) => u.alive && u.hp <= u.maxHp / 4),
    ults: extra.ults ?? [],
    spells,
    duos,
    ...(b?.combo?.fired ? { team: b.combo.id } : {}),
    ...(stats ? { stats } : {}),
    ...(mvp ? { mvp } : {}),
    cleared: c.won && !!run.cleared,
    ...(guardian ? { map: guardian } : {}),
  };
}

/** The Last Stand's end, as the goals read it: its waves cleared count as waves won anywhere (its fights are not settled one by one), and its best wave, act and holds of the line. */
export const standFight = (cleared: number, run?: { best: number; act?: number; held?: number }): QuestFight => ({
  won: cleared > 0,
  waves: cleared,
  boss: false,
  heroes: [],
  flawless: false,
  kills: [],
  dailyCleared: false,
  mode: 'stand',
  ...(run ? { stand: { best: run.best, act: run.act ?? 0, held: run.held ?? 0 } } : {}),
});

/** Whether a fight meets a goal's riders. */
export function condMet(c: Cond, f: QuestFight): boolean {
  const h = f.heroes;
  if (c.army && f.army !== c.army) return false;
  if (c.mode && f.mode !== c.mode) return false;
  if (c.tier !== undefined && (f.mode !== 'army' || (f.tier ?? 0) < c.tier)) return false;
  if (c.stage !== undefined && (f.stage ?? 0) < c.stage) return false;
  if (c.with && !h.some((k) => fits(c.with!, k))) return false;
  if (c.all && !c.all.every((k) => h.includes(k))) return false;
  if (c.only && (!h.length || !h.every((k) => fits(c.only!, k)))) return false;
  if (c.most !== undefined && (!h.length || h.length > c.most)) return false;
  if (c.flawless && !f.flawless) return false;
  if (c.quick !== undefined && (!f.won || (f.secs ?? Infinity) > c.quick)) return false;
  if (c.lowHp && !f.lowHp) return false;
  if (c.ultsIn !== undefined && (f.ults?.length ?? 0) < c.ultsIn) return false;
  const spells = f.spells ?? [];
  if (c.spellsOnly && (!spells.length || !spells.every((s) => c.spellsOnly!.includes(s)))) return false;
  if (c.noSpells && spells.length) return false;
  if (c.boss && !c.boss.some((b) => f.bosses?.includes(b))) return false;
  return true;
}

/** The sum of a tally over the heroes who fit `by` (or every hero). */
const tallyOf = (f: QuestFight, stat: StatKey, by?: With): number => (f.stats ?? []).filter((s) => !by || fits(by, s.kind)).reduce((n, s) => n + s[stat], 0);

/** How much one settled fight adds to a goal (for a best goal: the value it reached). */
export function goalGain(g: Goal, f: QuestFight): number {
  switch (g.kind) {
    case 'wavesWon':
      return f.won && condMet(g, f) ? f.waves : 0;
    case 'bossDown':
      return f.won && f.boss && condMet(g, f) ? 1 : 0;
    case 'kills':
      if (!condMet(g, f)) return 0;
      return f.kills.filter((d) => (g.family ? inFamily(g.family, d) : true) && (!g.foes || g.foes.includes(d)) && (!g.ofArmy || foesOfArmy(g.ofArmy).has(d))).length;
    case 'clearDaily':
      return f.dailyCleared ? 1 : 0;
    case 'clearArmy':
      return f.won && f.cleared && f.mode === 'army' && condMet(g, f) ? 1 : 0;
    case 'tally':
      return condMet(g, f) ? Math.round(tallyOf(f, g.stat, g.by)) : 0;
    case 'ults':
      return condMet(g, f) ? (f.ults ?? []).filter((k) => !g.by || fits(g.by, k)).length : 0;
    case 'spells':
      return condMet(g, f) ? (f.spells ?? []).filter((s) => !g.spells || g.spells.includes(s)).length : 0;
    case 'duos':
      return condMet(g, f) ? f.duos ?? 0 : 0;
    case 'teamCombo':
      return f.team && (!g.combo || f.team === g.combo) && condMet(g, f) ? 1 : 0;
    case 'mvp':
      return f.won && f.mvp && fits(g.by, f.mvp) && condMet(g, f) ? 1 : 0;
    case 'calGuardian':
      return f.won && f.mode === 'calamity' && f.map !== undefined && f.map >= (g.map ?? 0) && condMet(g, f) ? 1 : 0;
    case 'calClear':
      return f.won && f.cleared && f.mode === 'calamity' && condMet(g, f) ? 1 : 0;
    case 'standWave':
      return f.stand?.best ?? 0;
    case 'standRoom':
      return f.stand && (!g.held || f.stand.held > 0) ? f.stand.act + 1 : 0;
    case 'holdLine':
      return f.stand?.held ?? 0;
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
    a.progress = Math.min(q.goal.n, BEST_GOALS.includes(q.goal.kind) ? Math.max(a.progress, add) : a.progress + add);
    if (isDone(a)) done.push(a.id);
  }
  return done;
}

/* ------------------------------------------------------------------ the save */

const isDate = (x: unknown): x is number => typeof x === 'number' && /^\d{8}$/.test(String(x));

/** A record of numbers by quest id, read safely (only quests still in the game, only sane numbers). */
function readCounts(raw: unknown, ok: (v: number) => boolean): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) if (questById(id) && typeof v === 'number' && ok(v)) out[id] = v;
  return Object.keys(out).length ? out : undefined;
}

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
  s.done = [...new Set((Array.isArray(r.done) ? r.done : []).filter((id): id is string => typeof id === 'string' && !!questById(id) && (!seen.has(id) || !!questById(id)?.repeat)))];
  for (const o of Array.isArray(r.offers) ? r.offers : []) {
    const q = o && typeof o.id === 'string' ? questById(o.id) : undefined;
    if (!q || seen.has(q.id) || (!q.repeat && s.done.includes(q.id)) || !isDate(o.day)) continue;
    seen.add(q.id);
    s.offers.push({ id: q.id, giver: q.giver, day: o.day });
  }
  if (typeof r.tracked === 'string' && s.active.some((a) => a.id === r.tracked)) s.tracked = r.tracked;
  if (isDate(r.day)) s.day = r.day;
  const times = readCounts(r.times, (v) => Number.isInteger(v) && v > 0 && v < 1e6);
  if (times) s.times = times;
  const last = readCounts(r.last, isDate);
  if (last) s.last = last;
  if (r.drawn && typeof r.drawn === 'object') {
    const drawn: Partial<Record<GiverSlot, number>> = {};
    for (const slot of SLOTS) if (isDate(r.drawn[slot])) drawn[slot] = r.drawn[slot];
    if (Object.keys(drawn).length) s.drawn = drawn;
  }
  // (a later batch's chain state, kept as it was so an older build does not wipe it)
  for (const k of ['chains', 'pieces', 'tries'] as const) if (k in (raw as object)) (s as unknown as Record<string, unknown>)[k] = (raw as Record<string, unknown>)[k];
  return s;
}
