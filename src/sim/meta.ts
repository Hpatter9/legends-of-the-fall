// Lasting progress across runs, and the recruiting draw (the usual gacha). Crowns are earned for each stage won and at
// a run's end; they buy chests (`chestShop.ts`), and chests hold summoning stones. Using a stone is the pull: one shard
// of a hero (and, one time in `LUCKY_ODDS`, a whole hero not yet owned). A repeat of a kind gives a shard of it; shards
// raise the kind's rank, and each rank makes its heroes a little stronger in every fight. Pure rules: no Pixi, no DOM;
// every pull draws from a side stream of the meta seed and the pull counter, so it replays exactly.

import { newCastle, readCastle, readChapel, readWorks, spellBudget, type Castle, type Works } from './castle';
import { newLoadout, readLoadout, STARTER_SPELLS, type Loadout } from './spells';
import { DAILY_WAVES } from './daily';
import { dailyStarsMax } from './dailyThemes';
import { Rng } from './rng';
import { ALL_HEROES, HEROES } from './units';
import { readStarter, starterPacks, type Starter } from './starter';
import { MAX_STARS, starCrowns } from './stars';
import { BOSS_IDS } from './foes';
import { readEquipment, readEquipped, type EquipSlot, type Equipment } from './equipment';
import { migrateArmies, readSeen, seenFor, type ArmyRecord } from './armies';
import { readStash } from './armyStars';
import { readTomes, type TomeCounts } from './tomes';
import { readTalents, type KindTalents } from './talents';
import { AWAKEN_MULT } from './awakenRules';
import { readAwakened } from './awaken';
import { readCodex, readCodexClaimed, readCodexPaid, type CodexRecord } from './codex';
import { readCombosSeen } from './combos';
import { readTickets } from './autoReplay';
import { grandfather } from './modeUnlock';
import { drawKind, giveShards, toCollect } from './unlock';
import { DUPLICATE_SHARDS, LUCKY_ODDS, LUCKY_RANK_SHARDS, PULL_HEROES, STONES_GIFT } from './unlockRules';
import { grantContent } from './contentHeroes';
import { grantSpells } from './spellSources';
import { readShop } from './chestShop';
import { readCards, readScenes } from './sceneRules';

export { DUPLICATE_SHARDS, LUCKY_ODDS, LUCKY_RANK_SHARDS };
/** Shards each rank needs in all: rank 1 at 1, rank 2 at 3, rank 3 at 6, rank 4 at 10. */
export const RANK_SHARDS: readonly number[] = [1, 3, 6, 10];
export const MAX_RANK = RANK_SHARDS.length;
/** Heroes in a party: the deck the summons draw from, and the run's starting heroes (fewer while fewer are unlocked). */
export const PARTY_SIZE = 5;
/** Hp and attack grow by this for each rank a hero kind has (1.05 until ranking up became the player's choice: see `docs/notes/hero-progress.md`). */
export const RANK_MULT = 1.08;
const SALT = 0x6ac4a;
const LUCKY_SALT = 0x1c4b5;

export interface Meta {
  seed: number;
  crowns: number;
  /** Summoning stones held (`chestShop.ts` sells them in chests; using one is a pull). Saves from before have none, and are given `STONES_GIFT` on load. */
  stones?: number;
  /** The chest shop's sales on a day (a date, yyyymmdd): the stock is per day, so a new date starts again (`chestShop.ts`). */
  shop?: { day: number; sold: Partial<Record<'bronze' | 'silver' | 'gold', number>> };
  /** The chests bought from the shop so far (each one's contents roll from a side stream of the seed and this count). */
  shopBuys?: number;
  /** Stones a save from before the stones was given on load, for the page to say so once (then it is deleted). */
  stoneGift?: number;
  /** Hero kinds unlocked for summoning. */
  unlocked: string[];
  /** The party: the hero kinds a run's summons draw from (`partySlots` of them, all unlocked). */
  party: string[];
  /** Pulls so far (the draw follows it). */
  pulls: number;
  /** Pulls since the last one that gave a new hero (no longer used: kept so older saves read; see `unlockDry`). */
  sinceNew?: number;
  /** Unlock shards held towards each hero not yet owned (`unlock.ts`; missing is none). A hero joins at `unlockNeed` of them, at rank 0. */
  unlock?: Record<string, number>;
  /** Pulls in a row that gave no unlock shards (at `PITY_PULLS` the next one goes to the hero closest to joining). */
  unlockDry?: number;
  /** The starter pick: the three packs offered to a new save, and which was taken (null until then). Saves from before the pick have none. */
  starter?: Starter;
  /** The castle's upgrades (see `castle.ts`). */
  castle: Castle;
  /** Whether the Chapel has been bought (it opens the spellbook; saves from before count it built if they had spells or upgrades; see `castle.ts`). */
  chapel?: boolean;
  /** The builders' works: a castle level or the Chapel going up, and when it stands (`castle.ts`); none when they are idle. */
  works?: Works;
  /** Shards per hero kind (missing is none). */
  shards: Record<string, number>;
  /** The king's spells owned and equipped (see `spells.ts`; saves from before have the starting three). */
  spellbook: Loadout;
  /** The best stars won on each stage (keyed by the stage number; missing is none). */
  stars: Record<string, number>;
  /** Lasting XP per hero kind (missing is none); its level is read from it (`levels.ts`). */
  xp: Record<string, number>;
  /** The furthest stage fought in any run (the endless tower opens at 10). */
  bestStage: number;
  /** The most floors cleared in the endless tower (the old climb, kept as the record it was). */
  tower: number;
  /** The best wave reached in the Last Stand, the mode that took the tower's place at the camp (`stand.ts`). Missing in a save from before; 0. */
  stand?: number;
  /** A calamity's record: the most maps cleared in one run, and the runs cleared whole (none before the first calamity). */
  calamity?: { best: number; clears: number; /** The highest ascension level cleared whole (`ascension.ts`); none before the first clear after it came. */ asc?: number };
  /** The ascension levels a Calamity has been cleared at, each a title (`calReward.ts`); none before the first clear after it came. */
  calTitles?: number[];
  /** The daily challenge per date (yyyymmdd): the plays (the first counts) and how the counted run went: cleared, the furthest wave, the bonus stars. */
  daily: Record<string, DailyEntry>;
  /** The bosses beaten (`foes.ts`, by id). */
  bosses: string[];
  /** Each army's record: furthest wave, wins, clears and stars (`armies.ts`; missing is none). */
  armies: Record<string, ArmyRecord>;
  /** The armies whose open card the player has seen (a newly opened one glows until then). */
  armySeen: string[];
  /** The armies and modes ('castle', 'tower', 'calamity') a save from before the star unlocks already had open: they stay open (`modeUnlock.ts`). Missing in a save from before; read once. */
  opened?: string[];
  /** The achievements unlocked (`achievements.ts`, by id). */
  achievements: string[];
  /** The achievements whose crowns have been claimed (an older save's earned ones were paid at once, so they count as claimed). */
  claimed?: string[];
  /** The permanent equipment owned, worn or spare (`equipment.ts`; missing is none). */
  equipment?: Equipment[];
  /** The item ids each hero kind wears, by slot (an item is on one kind at most). */
  equipped?: Record<string, Partial<Record<EquipSlot, number>>>;
  /** The next equipment id. */
  nextItem?: number;
  /** The rank the player has taken for each hero kind (`rankUp.ts`): shards earn a rank, a tap on "Rank up" takes it. Missing means every earned rank counts (the tests' and tools' saves); a save from before is read with the ranks it had. */
  ranked?: Record<string, number>;
  /** The steps each hero kind has awakened above its top rank, 1 or 2 (`awaken.ts`; missing is none). */
  awakened?: Record<string, number>;
  /** The talents each hero kind has taken and the points it bought with shards (`talents.ts`; missing is none). */
  talents?: Record<string, KindTalents>;
  /** The codex: the foe kinds met and the kills per kind (`codex.ts`; saves from before have none), and the milestone rewards claimed. */
  codex?: CodexRecord;
  codexClaimed?: string[];
  /** The codex entries whose stone is taken (`codex.ts`, `claimEntries`): `foe:<entry>` and `hero:<kind>`. A save from before has every entry it had discovered counted as paid. */
  codexPaid?: string[];
  /** The five-hero combos seen in a fight (`combos.ts`; the codex lists a combo once it has been seen). Saves from before have none. */
  combosSeen?: string[];
  /** The auto runs spent on a date (yyyymmdd; `autoReplay.ts`, `AUTO_TICKETS` a day). Saves from before have none. */
  autoTickets?: { day: number; used: number };
  /** The XP tomes held, by size (`tomes.ts`): chests give them, and the player reads one to a hero from its page. Saves from before have none. */
  tomes?: TomeCounts;
  /** Chests earned from the armies' star milestones and not yet opened, oldest first (`armyStars.ts`). */
  stash: StashChest[];
  /** The cinematics seen (`sceneRules.ts`, by id): each plays once at its moment, and the codex's Scenes list plays a seen one again. Saves from before have none. */
  scenes?: string[];
  /** Whether the heroes' ultimates fire on their own in a fight (the hero bar's Auto switch, COMBAT-002); off (the player taps) when unset. Auto-replay always fires them. */
  ultAuto?: boolean;
  /** The bosses whose card (the slam-down ribbon as the fight begins) has been shown, by boss or `elite:<id>` (`sceneRules.ts` `cardKey`): once a save. Saves from before have none. */
  bossCards?: string[];
}

/** An earned, unopened chest: where it came from, and the seed its contents are rolled from (fixed when it was earned). */
export interface StashChest {
  army: string;
  /** The star milestone: 3, 5 or 10. */
  at: number;
  /** The difficulty tier of the run that earned it. */
  tier: number;
  seed: number;
  /** Paid by an endless tower run (a run pays several of one milestone; an army's is given once). */
  tower?: boolean;
  /** A daily chest: the date (yyyymmdd) of the daily that paid it, and the bonus stars (0 to 2, 3 on a themed day) of the clear. `army` is 'daily'. */
  daily?: number;
  bonus?: number;
  /** Paid for an army's first clear on a tier (one per army and tier, told apart by its seed; `at` only sets the chest's size). */
  first?: boolean;
}

export interface DailyEntry {
  /** The score the older saves kept (waves cleared x 100 plus stars x 10); still written, nothing reads it for a goal. */
  best: number;
  plays: number;
  /** The counted run cleared the boss of the day. Missing is not (and for a save from before the fixed daily). */
  cleared?: boolean;
  /** The furthest wave the counted run fought (of `DAILY_WAVES`). */
  wave?: number;
  /** The counted run has ended (so a record that is not cleared is a fall, not a run going on). */
  over?: boolean;
  /** The bonus stars of the clear (0 to 2, 3 on a themed day), which added to the daily chest. */
  stars?: number;
}

export interface Pull {
  kind: string;
  /** The hero joined with this pull (its unlock bar filled). */
  isNew: boolean;
  /** Rank shards a hero already owned gets (0 for a hero not yet owned, and for one with nothing left to buy). */
  shards: number;
  /** Unlock shards a hero not yet owned gets, and its bar after this pull (`have` of `need`); none for a hero owned. */
  unlock?: number;
  have?: number;
  need?: number;
  /** The pull was the pity's: the hero closest to joining. */
  pity?: boolean;
  /** Crowns a repeat gives instead once the kind's shards have nothing left to buy (`SHARD_CAP`). */
  crowns?: number;
  /** The lucky roll (one stone in `LUCKY_ODDS`): a whole hero not yet owned joined at rank 0 (`isNew`), or, with every hero owned, `LUCKY_RANK_SHARDS` rank shards (`shards`). */
  lucky?: boolean;
}

/** A brand-new save: no hero yet, only the three starter packs to pick from (`pickStarter`). */
export const newMeta = (seed: number): Meta => ({ seed, crowns: 0, stones: 0, unlocked: [], party: [], starter: { packs: starterPacks(seed), pick: null }, pulls: 0, sinceNew: 0, shards: {}, stars: {}, xp: {}, castle: newCastle(), chapel: false, spellbook: newLoadout(), bestStage: 1, tower: 0, daily: {}, bosses: [], armies: {}, armySeen: [], opened: [], achievements: [], claimed: [], codexPaid: [], stash: [], ranked: {} });

/** A save past the pick with the old starting five unlocked and in the party: what the saves from before the pick have, and what the tests and tools play with. */
export function startedMeta(seed: number): Meta {
  const m = newMeta(seed);
  delete m.starter;
  delete m.ranked; // (every earned rank counts, so the tests and tools need no tap)
  m.unlocked = [...HEROES];
  m.party = [...HEROES];
  return m;
}

/** Whether the save still waits for its starter pick (a new save, or one after Start over). */
export const needsStarter = (m: Meta): boolean => m.starter?.pick === null;

/** Take starter pack `index`: its three heroes become the unlocked heroes and the party. False (and nothing changes) when there is no pick to make or no such pack. */
export function pickStarter(m: Meta, index: number): boolean {
  const pack = m.starter?.packs[index];
  if (!m.starter || m.starter.pick !== null || !pack) return false;
  m.starter.pick = index;
  m.unlocked = [...pack];
  m.party = [...pack];
  return true;
}
/** The rank a hero kind's shards have earned (0 to MAX_RANK): the one it may take with "Rank up" (`rankUp.ts`). */
export const rankOf = (m: Meta, kind: string): number => RANK_SHARDS.filter((need) => (m.shards[kind] ?? 0) >= need).length;
/** The rank a hero kind has taken (0 to `rankOf`): what its stats, stars and look follow. */
export const takenRank = (m: Meta, kind: string): number => (m.ranked ? Math.min(m.ranked[kind] ?? 0, rankOf(m, kind)) : rankOf(m, kind));
/** A hero's whole rank: the rank taken (0 to 4) and one for each step it has awakened (`awaken.ts`; 5 and 6). */
export const heroRank = (m: Meta, kind: string): number => takenRank(m, kind) + (m.awakened?.[kind] ?? 0);
/** Hp and attack multiplier a rank gives (the ranks above `MAX_RANK` are awakened steps, `AWAKEN_MULT` each). */
export const rankMult = (rank: number): number => RANK_MULT ** Math.min(rank, MAX_RANK) * AWAKEN_MULT ** Math.max(0, rank - MAX_RANK);
/** Crowns a won stage pays. */
export const stageCrowns = (stage: number) => 10 + 2 * stage;
/** Crowns a run's end pays: more the further it got. */
export const runCrowns = (best: number) => 10 * (best - 1) + best * best;

/** How many heroes a party takes: five, or fewer while fewer are unlocked. */
export const partySlots = (m: Meta): number => Math.min(PARTY_SIZE, m.unlocked.length);

/** Set the party to these hero kinds: exactly `partySlots` different unlocked kinds. Returns false (and changes nothing) otherwise. */
export function setParty(m: Meta, kinds: readonly string[]): boolean {
  const ok = kinds.length === partySlots(m) && new Set(kinds).size === kinds.length && kinds.every((k) => m.unlocked.includes(k));
  if (ok) m.party = [...kinds];
  return ok;
}

/** Saved unlock shards that are sane: a hero kind to collect that is not owned yet, with a count. Anything else is dropped. */
function readUnlock(raw: unknown, unlocked: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object')
    for (const [k, n] of Object.entries(raw)) if (PULL_HEROES.includes(k) && !unlocked.includes(k) && typeof n === 'number' && n >= 1) out[k] = Math.floor(n);
  return out;
}

/** Saved ranks that are sane: a hero kind and a rank its shards have earned. A save with none (from before) takes the ranks it has. */
function readRanked(raw: unknown, m: Meta): Record<string, number> {
  const out: Record<string, number> = {};
  const had = !!raw && typeof raw === 'object';
  for (const k of ALL_HEROES) {
    const earned = rankOf(m, k);
    const n = had ? (raw as Record<string, unknown>)[k] : earned;
    if (typeof n === 'number' && n >= 1) out[k] = Math.min(earned, Math.floor(n), MAX_RANK);
  }
  return out;
}

/** Saved party that is sane: unlocked kinds, no repeats, at most five. Missing or empty means the first unlocked. */
function readParty(raw: unknown, unlocked: readonly string[]): string[] {
  const kept = Array.isArray(raw) ? [...new Set(raw)].filter((k): k is string => typeof k === 'string' && unlocked.includes(k)).slice(0, PARTY_SIZE) : [];
  return kept.length ? kept : unlocked.slice(0, PARTY_SIZE);
}

/** Saved XP that is sane: a hero kind in the game and a number of XP. Anything else is dropped. */
function readXp(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') for (const [k, n] of Object.entries(raw)) if (ALL_HEROES.includes(k) && typeof n === 'number' && n >= 0) out[k] = Math.floor(n);
  return out;
}

/** Pay the crowns for a settled fight (a win pays for the stage and its stars; a loss ends the run and pays by how far it got). Returns the sum. */
export function earn(m: Meta, stage: number, won: boolean, stars = 0): number {
  const n = won ? stageCrowns(stage) + starCrowns(stars) : runCrowns(stage);
  m.crowns += n;
  return n;
}

/** Keep the best stars won on a stage. Returns whether it beat the one before. */
export function recordStars(m: Meta, stage: number, stars: number): boolean {
  const key = String(stage);
  if (stars <= (m.stars[key] ?? 0)) return false;
  m.stars[key] = stars;
  return true;
}

/** The furthest stage with any stars and the stars won across all stages (null before the first win). */
export function starSummary(m: Meta): { stage: number; total: number } | null {
  const stages = Object.keys(m.stars).map(Number);
  if (!stages.length) return null;
  return { stage: Math.max(...stages), total: Object.values(m.stars).reduce((n, s) => n + s, 0) };
}

/** Saved daily records that are sane: a date (yyyymmdd) with a best score and a play count. Anything else is dropped. */
function readDaily(raw: unknown): Record<string, DailyEntry> {
  const out: Record<string, DailyEntry> = {};
  if (raw && typeof raw === 'object')
    for (const [k, e] of Object.entries(raw)) {
      const d = e as Partial<DailyEntry> | null;
      if (/^\d{8}$/.test(k) && d && typeof d.best === 'number' && typeof d.plays === 'number') {
        const entry: DailyEntry = { best: Math.max(0, d.best | 0), plays: Math.max(0, d.plays | 0) };
        if (d.cleared === true) entry.cleared = true;
        if (typeof d.wave === 'number' && d.wave >= 1) entry.wave = Math.min(DAILY_WAVES, d.wave | 0);
        if (d.over === true) entry.over = true;
        if (typeof d.stars === 'number' && d.stars >= 1) entry.stars = Math.min(dailyStarsMax(Number(k)), d.stars | 0);
        out[k] = entry;
      }
    }
  return out;
}

/** Saved stars that are sane: a stage number and 1 to MAX_STARS. Anything else is dropped. */
function readStars(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') for (const [k, n] of Object.entries(raw)) if (/^[1-9]\d*$/.test(k) && typeof n === 'number' && n >= 1) out[k] = Math.min(MAX_STARS, n | 0);
  return out;
}

/** The stones a summon costs: one each. */
export const stoneCost = (count: 1 | 10): number => count;
/** The stones held. */
export const stonesOf = (m: Meta): number => m.stones ?? 0;

/** What forces a draw (the tests' and the page's debug hook): the lucky roll lands or does not, whatever the stream says. */
export interface PullOpts {
  lucky?: boolean;
}

/**
 * One stone used (no payment): one shard of one hero. A hero not yet owned gets an unlock shard (it joins when they fill its bar); one owned gets a rank
 * shard. Every `PITY_PULLS` pulls without unlock shards, the pull is the hero closest to joining. One stone in `LUCKY_ODDS` is the lucky roll instead:
 * a whole hero not yet owned joins at rank 0 (never a content hero), or, with every pullable hero owned, `LUCKY_RANK_SHARDS` rank shards of a hero.
 * The lucky roll has a side stream of its own, so the shard draws are the same as before it existed.
 */
export function pullOnce(m: Meta, opts: PullOpts = {}): Pull {
  const rng = Rng.from(m.seed, SALT, m.pulls);
  const luck = Rng.from(m.seed, LUCKY_SALT, m.pulls);
  const lucky = opts.lucky ?? luck.int(1, LUCKY_ODDS) === 1;
  if (lucky) {
    m.pulls++;
    const left = toCollect(m);
    if (left.length) {
      const kind = luck.pick(left);
      m.unlocked.push(kind);
      delete m.unlock?.[kind];
      m.unlockDry = 0;
      return { kind, isNew: true, shards: 0, lucky: true };
    }
    // (everything is owned: a big batch of rank shards of a hero, as the odds of a pull would pick it)
    const { kind } = drawKind(m, rng);
    const g = giveShards(m, kind, LUCKY_RANK_SHARDS);
    return { kind, isNew: false, shards: g.rank, lucky: true, ...(g.crowns ? { crowns: g.crowns } : {}) };
  }
  const { kind, pity } = drawKind(m, rng);
  m.pulls++;
  const g = giveShards(m, kind, DUPLICATE_SHARDS);
  m.unlockDry = g.unlock ? 0 : (m.unlockDry ?? 0) + 1;
  const out: Pull = { kind, isNew: g.joined, shards: g.rank };
  if (g.unlock) Object.assign(out, { unlock: g.unlock, have: g.have, need: g.need });
  if (pity) out.pity = true;
  if (g.crowns) out.crowns = g.crowns;
  return out;
}

/** Use 1 or 10 summoning stones, a pull for each. Null when there are too few stones. */
export function useStones(m: Meta, count: 1 | 10, opts: PullOpts = {}): Pull[] | null {
  const cost = stoneCost(count);
  if (stonesOf(m) < cost) return null;
  m.stones = stonesOf(m) - cost;
  return Array.from({ length: count }, () => pullOnce(m, opts));
}

const KEY = 'legends.meta';
export const saveMeta = (m: Meta, store: Pick<Storage, 'setItem'> = localStorage) => store.setItem(KEY, JSON.stringify(m));
/** The saved meta, or a fresh one from `seed`. Kinds no longer in the game are dropped; a save from before the starter pick keeps the starting five. */
export function loadMeta(seed: number, store: Pick<Storage, 'getItem'> = localStorage): Meta {
  try {
    const m = JSON.parse(store.getItem(KEY) ?? 'null') as Meta | null;
    if (m && typeof m.crowns === 'number' && Array.isArray(m.unlocked) && typeof m.seed === 'number') {
      // (a save from before the starter pick always has the old five; one with a pick keeps just what it unlocked, and its pack)
      m.starter = readStarter(m.starter, m.seed);
      m.unlocked = [...new Set([...(m.starter ? [] : HEROES), ...m.unlocked.filter((k) => ALL_HEROES.includes(k))])];
      if (!m.starter) delete m.starter;
      // (saves from before parties have the first five unlocked)
      m.party = readParty(m.party, m.unlocked);
      m.pulls = m.pulls | 0;
      // (saves from before the stones have none; one that had picked its heroes is given a few pulls' worth, once, so it is not set back mid-collection)
      m.stones = typeof m.stones === 'number' ? Math.max(0, Math.floor(m.stones)) : m.starter?.pick === null ? 0 : (m.stoneGift = STONES_GIFT);
      m.shopBuys = Math.max(0, (m.shopBuys ?? 0) | 0);
      m.shop = readShop(m.shop);
      if (!m.shop) delete m.shop;
      if (!(m.stoneGift! > 0)) delete m.stoneGift;
      m.sinceNew = Math.max(0, (m.sinceNew ?? 0) | 0);
      m.unlock = readUnlock(m.unlock, m.unlocked);
      m.unlockDry = Math.max(0, (m.unlockDry ?? 0) | 0);
      m.castle = readCastle(m.castle);
      m.spellbook = readLoadout(m.spellbook, spellBudget(m.castle));
      m.chapel = readChapel(m.chapel, m.castle, m.spellbook, STARTER_SPELLS);
      m.works = readWorks(m.works);
      // (saves from before shards have none)
      const shards: Record<string, number> = {};
      if (m.shards && typeof m.shards === 'object') for (const [k, n] of Object.entries(m.shards)) if (ALL_HEROES.includes(k) && typeof n === 'number') shards[k] = n | 0;
      m.shards = shards;
      // (saves from before stars have none)
      m.stars = readStars(m.stars);
      // (saves from before XP have none)
      m.xp = readXp(m.xp);
      // (saves from before the modes and achievements have none)
      m.bestStage = Math.max(1, m.bestStage | 0);
      m.tower = Math.max(0, m.tower | 0);
      m.stand = Math.max(0, (m.stand ?? 0) | 0);
      m.daily = readDaily(m.daily);
      m.bosses = Array.isArray(m.bosses) ? m.bosses.filter((b) => BOSS_IDS.includes(b)) : [];
      // (saves from before the armies have their furthest stage mapped onto them, and the armies it opens are not new)
      const fresh = !m.armies || typeof m.armies !== 'object';
      const rawArmies = m.armies;
      m.armies = migrateArmies(m.armies, m.bestStage);
      m.armySeen = fresh ? seenFor(m) : readSeen(m.armySeen);
      m.achievements = Array.isArray(m.achievements) ? m.achievements.filter((a) => typeof a === 'string') : [];
      // (before claiming, an achievement paid its crowns when earned: those count as claimed)
      m.claimed = Array.isArray(m.claimed) ? m.claimed.filter((a) => typeof a === 'string' && m.achievements.includes(a)) : [...m.achievements];
      // (saves from before equipment have none)
      m.equipment = readEquipment(m.equipment);
      m.equipped = readEquipped(m.equipped, m.equipment);
      m.nextItem = Math.max((m.nextItem ?? 1) | 0, 1, ...m.equipment.map((x) => x.id + 1));
      // (saves from before ranking up was a choice keep the ranks they had; the shards beyond them wait for the player's tap)
      m.ranked = readRanked(m.ranked, m);
      // (saves from before awakening have none)
      m.awakened = readAwakened(m.awakened, m.shards);
      if (!Object.keys(m.awakened).length) delete m.awakened;
      // (saves from before the talents have none; the rest of the save is read first, as the points depend on levels and shards)
      m.talents = readTalents(m.talents, m);
      // (saves from before the army chests have an empty stash; a chest given but not opened by an earlier format goes into it)
      m.stash = readStash(m.stash, rawArmies, m.seed);
      // (saves from before the XP tomes have none)
      m.tomes = readTomes(m.tomes);
      if (!m.tomes) delete m.tomes;
      // (a save from before the star unlocks keeps what it had open: the armies, the castle, the tower and the Calamity it had reached)
      m.opened = Array.isArray(m.opened) ? m.opened.filter((x) => typeof x === 'string') : grandfather(m);
      // (saves from before the codex have none)
      m.codex = readCodex(m.codex);
      m.codexClaimed = readCodexClaimed(m.codexClaimed) ?? [];
      // (saves from before the entry stones: what they had discovered counts as paid, so only new entries pay)
      m.codexPaid = readCodexPaid(m.codexPaid, m);
      // (saves from before the combos have none seen)
      m.combosSeen = readCombosSeen(m.combosSeen);
      // (saves from before the auto tickets have none: a full day's worth)
      m.autoTickets = readTickets(m.autoTickets);
      if (!m.autoTickets) delete m.autoTickets;
      // (saves from before the cinematics have none; one that had picked its heroes counts the opening as seen)
      m.scenes = readScenes(m.scenes, !needsStarter(m));
      if (!m.scenes.length) delete m.scenes;
      // (saves from before the boss cards played once have none shown)
      m.bossCards = readCards(m.bossCards);
      if (!m.bossCards.length) delete m.bossCards;
      // (a content hero whose milestone a save from before has already reached joins now)
      if (!needsStarter(m)) grantContent(m);
      // (spells are no longer bought: those bought before are kept, and any whose tower level or milestone a save has already reached are learnt now)
      grantSpells(m);
      return m;
    }
  } catch {
    /* fall through to a fresh one */
  }
  return newMeta(seed);
}
