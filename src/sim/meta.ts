import { oneMythic, validMythicSquad } from './mythicRules';
// Lasting progress across runs, and the recruiting draw (the usual gacha). Crowns are earned for each stage won and at
// a run's end; they buy chests (`chestShop.ts`), and chests hold summoning stones. Using a stone is the pull: one shard
// of a hero (and, one time in `LUCKY_ODDS`, a whole hero not yet owned). A repeat of a kind gives a shard of it; shards
// raise the kind's rank, and each rank makes its heroes a little stronger in every fight. Pure rules: no Pixi, no DOM;
// every pull draws from a side stream of the meta seed and the pull counter, so it replays exactly.

import { readAssault } from './assault/economy';
import { newCastle, readCastle, readChapel, readWorks, type Castle, type Works } from './castle';
import { newLoadout, readLoadout, STARTER_SPELLS, type Loadout } from './spells';
import { spellSlots } from './spellSlots';
import { DAILY_WAVES } from './daily';
import { dailyStarsMax } from './dailyThemes';
import { Rng } from './rng';
import { ALL_HEROES, HEROES } from './units';
import { readStarter, starterPacks, type Starter } from './starter';
import { MAX_STARS, starCrowns } from './stars';
import { BOSS_IDS } from './foes';
import { readCart, readEquipment, readEquipped, type CartPiece, type EquipSlot, type Equipment } from './equipment';
import { GEAR_V, migrateGear, type GearNote } from './gearMigrate';
import { claimLegends, readLegends } from './legends';
import { readRemedies, type RemedyId } from './remedies';
import { migrateArmies, readSeen, seenFor, type ArmyRecord } from './armies';
import { readStash } from './armyStars';
import { readTomes, type TomeCounts } from './tomes';
import { readTalents, type KindTalents } from './talents';
import { AWAKEN_MULT } from './awakenRules';
import { readAwakened } from './awaken';
import { readCaches, readOres } from './awakenMats';
import { readCodex, readCodexClaimed, type CodexRecord } from './codex';
import { readWeak, type WeakRecord } from './weakness';
import { readBonds } from './bonds';
import { openWar, readGrudges, readWar, type Grudges, type War } from './nemesis';
import { readMentors } from './legacy';
import { readDynasty, type Dynasty } from './dynasty';
import type { Calling } from './weakness';
import { readCombosSeen } from './combos';
import { readHeroesSeen } from './heroesSeen';
import { readTickets } from './autoReplay';
import { grandfather } from './modeUnlock';
import { drawKind, giveShards, toCollect } from './unlock';
import { DUPLICATE_SHARDS, LUCKY_ODDS, LUCKY_RANK_SHARDS, PULL_HEROES, STONES_GIFT } from './unlockRules';
import { grantContent } from './contentHeroes';
import { grantSpells } from './spellSources';
import { readShop } from './chestShop';
import { readStall } from './stall';
import { readBooks } from './books';
import { readSkillUse } from './skillLevels';
import { readCards, readScenes } from './sceneRules';
import { readQuests, type QuestState } from './quests';
import { readEidolons, type EidolonMeta } from './warHorn';
import { readFormations, readTactics } from './tacticPick';

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
  /** The furthest room of the Last Stand's retreat reached (0 the courtyard to 3 the throne room: `standActs.ts`). Missing before the retreat, or none reached yet. */
  standAct?: number;
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
  /** FIRST-HOUR 3: the armies whose first clear's hero gift is settled (`clearHero.ts`), given or not: each is settled once a save. */
  clearHeroes?: string[];
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
  /** SEVEN-SLOT GEAR: the gear version the save is on (`gearMigrate.ts`; missing is a save from before seven slots, moved over once). */
  gearV?: number;
  /** What moving to seven slots did, for the hero sheet's lines (each shown once; `gearMigrate.ts`). */
  gearNote?: GearNote;
  /** The named legends given, by legend id to the piece's id (`legends.ts`: one copy each, for good). Missing is none. */
  legends?: Record<string, number>;
  /** The legends given since the page last said so (`takeLegendNews`). */
  legendsNew?: string[];
  /** Waves each hero kind has fought (halves under auto-replay; the Pilgrim's Cord's source). Missing is none counted. */
  wavesFought?: Record<string, number>;
  /** The glyphs taken or cleared on each piece, by piece id (`enchant.ts`: its offers' stream moves on with each). Missing is none. */
  enchants?: Record<number, number>;
  /** SEVEN-SLOT GEAR batch 6 (`remedies.ts`): the remedies owned, the satchel last chosen for a run, and whether Auto may use them (off). */
  satchel?: Partial<Record<RemedyId, number>>;
  satchelPick?: Partial<Record<RemedyId, number>>;
  autoRemedies?: boolean;
  /** RUN-GEAR: pieces brought home to a full stash (`STASH_MAX`), waiting on the camp's cart (at most `CART_MAX`) until room is made
   *  (`runGear.ts` `unloadCart`). They have no id until they move in. Missing is none. */
  cart?: CartPiece[];
  /** The rank the player has taken for each hero kind (`rankUp.ts`): shards earn a rank, a tap on "Rank up" takes it. Missing means every earned rank counts (the tests' and tools' saves); a save from before is read with the ranks it had. */
  ranked?: Record<string, number>;
  /** The steps each hero kind has awakened above its top rank, 1 or 2 (`awaken.ts`; missing is none). */
  awakened?: Record<string, number>;
  /** The rift ores held, by class trait (`awakenMats.ts`): an awakening step asks for its class's on top of the shards. Missing is none. */
  ores?: Record<string, number>;
  /** Rift Caches waiting to be opened on a hero's awakening panel (`awakenMats.ts`). A save from before the ores is paid one for each Calamity it cleared, up to five, the first time it is read. */
  caches?: number;
  /** The talents each hero kind has taken and the points it bought with shards (`talents.ts`; missing is none). */
  talents?: Record<string, KindTalents>;
  /** The codex: the foe kinds met and the kills per kind (`codex.ts`; saves from before have none), and the milestone rewards claimed. */
  codex?: CodexRecord;
  /** DEPTH-BUILD: what is known of each boss's weakness and the Hunter's marks won (`weakness.ts`); missing is nothing known. */
  weak?: Record<string, WeakRecord>;
  /** DEPTH-BUILD: bond points by pair ("knight|peasant"), the rivalries settled, the bond scenes seen (`bonds.ts`); missing is none. */
  bonds?: Record<string, number>;
  bondSettled?: string[];
  bondScenes?: string[];
  /** DEPTH-BUILD: the Barracks' Sparring Yard: the pair sparring and when they are done (`bonds.ts`). */
  sparring?: { a: string; b: string; doneAt: number };
  /** The Nemesis War (`nemesis.ts`): the named foes, the fallen, and the next id; missing until the War opens (the Undead Legion's first Normal clear). */
  war?: War;
  /** The Nemesis War, phase 3: each hero's Grudges, by the nemeses that slew it (`revenge.ts`). */
  grudges?: Grudges;
  /** Dynasties (`dynasty.ts`): the seasons' start, each owned kind's line of bearers, and this season's waves; missing until the page first
   *  opens them (a save from before is seeded then, with nobody made old). */
  dynasty?: Dynasty;
  /** DEPTH-BUILD: the Hall of Legends' mentors by calling, and when each recalled calling's seat opens again (`legacy.ts`). */
  mentors?: Partial<Record<Calling, { kind: string; since: number; heir?: true }>>;
  recalled?: Partial<Record<Calling, number>>;
  codexClaimed?: string[];
  /** The five-hero combos seen in a fight (`combos.ts`; the codex lists a combo once it has been seen). Saves from before have none. */
  combosSeen?: string[];
  /** The heroes whose first-time reveal has played (`heroesSeen.ts`): one owned and not listed still has its reveal due. Saves from before count every hero they own. */
  heroesSeen?: string[];
  /** The auto runs spent on a date (yyyymmdd; `autoReplay.ts`, `AUTO_TICKETS` a day). Saves from before have none. */
  autoTickets?: { day: number; used: number };
  /** The XP tomes held, by size (`tomes.ts`): chests give them, and the player reads one to a hero from its page. Saves from before have none. */
  tomes?: TomeCounts;
  /** Chests earned from the armies' star milestones and not yet opened, oldest first (`armyStars.ts`). */
  stash: StashChest[];
  /** The Assault (`src/sim/assault/economy.ts`, docs/notes/assault-1.md): the platoons, the holds conquered, the tries, the tribute. Saves from
   *  before have none: nothing bought, nothing conquered. */
  assault?: import('./assault/economy').AssaultMeta;
  /** The cinematics seen (`sceneRules.ts`, by id): each plays once at its moment, and the codex's Scenes list plays a seen one again. Saves from before have none. */
  scenes?: string[];
  /** Number of times Duchess has been tapped (unlocks Tiny Tin Crown at 5). */
  duchessTaps?: number;
  /** Whether Duchess's Lucky Bleat has been used in battle (unlocks Wizard Hat). */
  duchessLucky?: boolean;
  /** Whether Duchess's daily haystack treat has been found (unlocks Archery Quiver). */
  duchessHay?: boolean;
  /** Date (yyyymmdd) Duchess's haystack treat was last claimed. */
  duchessTreat?: number;
  /** Whether the heroes' ultimates fire on their own in a fight (the hero bar's Auto switch, COMBAT-002); off (the player taps) when unset. Auto-replay always fires them. */
  ultAuto?: boolean;
  /** BATTLE-POLISH: whether the ruler's equipped spells are cast on their own (the fight's Auto spells button). Unset: as `ultAuto`, the one
   *  switch that covered both before Auto was split (`spellAutoSaved`). */
  spellAuto?: boolean;
  /** ULT-SHOW: how many full moments of each hero kind's ultimate the player has seen (only heroes with a showcase are counted; the first
   *  and every Nth play the long showcase: `ultShowRules.ts`). Saves from before have none: every showcase still to see. */
  ultSeen?: Record<string, number>;
  /** The day (yyyymmdd) each Mythic was last paid rank shards for a replay of its trial won (`mythicEcho.ts`); saves from before have none. */
  trialShards?: Record<string, number>;
  /** The party's tactic picked, by mode and by army (`tacticPick.ts`, docs/notes/tactics.md); Advance together where none is. Saves from before have none. */
  tactics?: Record<string, string>;
  /** The formation picked on the prep screen, by mode and by army (`tacticPick.ts`), which Auto place sets the heroes out in; none: Auto places as before. */
  formations?: Record<string, string>;
  /** The bosses whose card (the slam-down ribbon as the fight begins) has been shown, by boss or `elite:<id>` (`sceneRules.ts` `cardKey`): once a save. Saves from before have none. */
  bossCards?: string[];
  /** The deploy bar's earned helpers whose unlocking has been told (`featureUnlocks.ts`): once a save. Saves from before have none. */
  featuresTold?: string[];
  /** SPELL-SLOTS: how many spell slots' opening has been told (`spellSlots.ts`): one on a new save (the slot it starts with). A save
   *  from before the slots has no such key, and is told none of the slots it already holds. */
  slotsTold?: number;
  /** The quests: the offers on the board, the ones taken and their counts, the ones handed in (`quests.ts`). Saves from before have none: nothing begun. */
  quests?: QuestState;
  /** EIDOLONS: the War Horn's fill, the Eidolons bound and the one chosen to answer it (`warHorn.ts`). Saves from before have none: an empty horn. */
  eidolons?: EidolonMeta;
  /** Hester's Stall (`stall.ts`): the day's sales by ware, the crowns ever spent there (standing), the day it was last looked at, and the
   *  pieces sold today (to buy back). Saves from before have none: standing 1, nothing bought. */
  stall?: {
    day: number; sold: Record<string, number>; spent: number; seen?: number; soldToday?: { item: Equipment; price: number }[];
    /** The visiting traders (`traders.ts`): Calamity guardians felled, the day the Gloaming Dealer stands at the stall, a Dealer due on the page's next look, and each trader's sales for the visit (the caravan's week, the Dealer's guardian count). */
    guardians?: number; gloaming?: number; dealerDue?: boolean; trade?: { caravan?: { visit: number; sold: Record<string, number> }; gloaming?: { visit: number; sold: Record<string, number> } };
  };
  /** Skill books (`books.ts`): unread copies by book, the books each hero kind has learned, the book each is studying (fights done),
   *  the progress of books put down, and the skills each kind has chosen for its three slots (a two-slot save is made whole when read). Saves from before have none. */
  books?: Record<string, number>;
  learned?: Record<string, string[]>;
  study?: Record<string, { book: string; done: number }>;
  /** DEPTH-BUILD: the Library's Reading Room: each student's queued next book (its copy already out of the bag); missing is none. */
  studyNext?: Record<string, string>;
  studyKept?: Record<string, Record<string, number>>;
  loadout?: Record<string, string[]>;
  /** Skill levels by use (the skills overhaul's batch 5, `skillLevels.ts`): the use points each hero kind has earned with each of its skills, under the
   *  skill's fixed key (its own three and the learned ones alike). Saves from before have none: every skill at Level 1. */
  skillUse?: Record<string, Record<string, number>>;
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
  /** QUESTS-3: a chest that holds no summoning stones (a Last Stand re-climb's, a quest of one or two stars's). */
  dry?: boolean;
  /** QUESTS-3: a chest that holds half its stones, rounded up (a Calamity clear's). */
  half?: boolean;
  /** The Assault: the Conquest chest a hold's first fall pays (a gold chest's size, half again its crowns and stones; one a hold). */
  conquest?: boolean;
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

/** A brand-new save: no hero yet, only the two starter packs to pick from (`pickStarter`). */
// (FIRST-HOUR 2: a new save starts with Auto spells on, the director's call: the king's spells decide the first army, and a new player
// who never casts one meets a wall. A save made before has no `spellAuto` key and keeps what it had, `spellAutoSaved`.)
export const newMeta = (seed: number): Meta => ({ spellAuto: true, slotsTold: 1, seed, crowns: 0, stones: 0, unlocked: [], party: [], starter: { packs: starterPacks(), pick: null }, pulls: 0, sinceNew: 0, shards: {}, stars: {}, xp: {}, castle: newCastle(), chapel: false, spellbook: newLoadout(), bestStage: 1, tower: 0, daily: {}, bosses: [], armies: {}, armySeen: [], heroesSeen: [], opened: [], achievements: [], claimed: [], stash: [], ranked: {}, gearV: GEAR_V });

/** A save past the pick with the old starting five unlocked and in the party: what the saves from before the pick have, and what the tests and tools play with. */
export function startedMeta(seed: number): Meta {
  const m = newMeta(seed);
  delete m.starter;
  delete m.ranked; // (every earned rank counts, so the tests and tools need no tap)
  m.unlocked = [...HEROES];
  m.party = [...HEROES];
  m.heroesSeen = [...HEROES];
  // (SPELL-SLOTS: a save from before the slots: the starting three in the slots and all four slots open, as every table was measured)
  m.spellbook = { ...readLoadout(undefined), slots: 4 };
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
  // (the starters are met in the pick itself: no first-time reveal for them)
  m.heroesSeen = [...pack];
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
  const ok = validMythicSquad(kinds) && kinds.length === partySlots(m) && new Set(kinds).size === kinds.length && kinds.every((k) => m.unlocked.includes(k));
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
  return oneMythic(kept.length ? kept : unlocked.slice(0, PARTY_SIZE), k => k);
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
      m.starter = readStarter(m.starter);
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
      m.spellbook = readLoadout(m.spellbook);
      m.chapel = readChapel(m.chapel, m.castle, m.spellbook, STARTER_SPELLS);
      // (DEPTH-BUILD: the Chapel is levelled; the old flag reads as level 1, and a level keeps the flag set, which the spellbook reads)
      if (m.chapel) m.castle.chapel = Math.max(1, m.castle.chapel ?? 0);
      else if ((m.castle.chapel ?? 0) > 0) m.chapel = true;
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
      if (m.standAct !== undefined) m.standAct = Math.max(0, Math.min(3, m.standAct | 0));
      m.daily = readDaily(m.daily);
      // (the party's tactics: saves from before have none)
      const tactics = readTactics(m.tactics);
      if (tactics) m.tactics = tactics;
      else delete m.tactics;
      const formations = readFormations(m.formations);
      if (formations) m.formations = formations;
      else delete m.formations;
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
      m.nextItem = Math.max((m.nextItem ?? 1) | 0, 1, ...m.equipment.map((x) => x.id + 1));
      // (RUN-GEAR: the cart's pieces; a save from before has none)
      m.cart = readCart(m.cart);
      if (!m.cart.length) delete m.cart;
      // (SEVEN-SLOT GEAR: a save from before seven slots is moved over once: `gearMigrate.ts`)
      if (m.gearV !== GEAR_V) migrateGear(m);
      m.equipped = readEquipped(m.equipped, m.equipment);
      // (the named legends held, and the waves each hero has fought: SEVEN-SLOT GEAR batch 2)
      m.legends = readLegends(m.legends);
      if (!m.legends) delete m.legends;
      if (!Array.isArray(m.legendsNew) || !m.legendsNew.length) delete m.legendsNew;
      if (m.wavesFought && typeof m.wavesFought === 'object') m.wavesFought = Object.fromEntries(Object.entries(m.wavesFought).filter(([, n]) => typeof n === 'number' && Number.isFinite(n) && n > 0));
      else delete m.wavesFought;
      if (m.enchants && typeof m.enchants === 'object') m.enchants = Object.fromEntries(Object.entries(m.enchants).filter(([, n]) => typeof n === 'number' && Number.isInteger(n) && n > 0));
      else delete m.enchants;
      m.satchel = readRemedies(m.satchel);
      if (!m.satchel) delete m.satchel;
      m.satchelPick = readRemedies(m.satchelPick);
      if (!m.satchelPick) delete m.satchelPick;
      if (m.autoRemedies !== true) delete m.autoRemedies;
      // (saves from before ranking up was a choice keep the ranks they had; the shards beyond them wait for the player's tap)
      m.ranked = readRanked(m.ranked, m);
      // (saves from before awakening have none)
      m.awakened = readAwakened(m.awakened, m.shards);
      if (!Object.keys(m.awakened).length) delete m.awakened;
      // (saves from before the rift ores have none, and are paid a Rift Cache for each Calamity they cleared, up to five, once: the count is kept from then on)
      m.ores = readOres(m.ores);
      if (!m.ores) delete m.ores;
      m.caches = readCaches(m.caches, m.calamity?.clears ?? 0);
      // (saves from before the talents have none; the rest of the save is read first, as the points depend on levels and shards)
      m.talents = readTalents(m.talents, m);
      // (saves from before the army chests have an empty stash; a chest given but not opened by an earlier format goes into it)
      m.stash = readStash(m.stash, rawArmies, m.seed);
      // (saves from before the Assault have none)
      m.assault = readAssault(m.assault);
      if (!m.assault) delete m.assault;
      // (saves from before the XP tomes have none)
      m.tomes = readTomes(m.tomes);
      if (!m.tomes) delete m.tomes;
      // (a save from before the star unlocks keeps what it had open: the armies, the castle, the tower and the Calamity it had reached)
      m.opened = Array.isArray(m.opened) ? m.opened.filter((x) => typeof x === 'string') : grandfather(m);
      // (saves from before the codex have none)
      m.codex = readCodex(m.codex);
      m.weak = readWeak(m.weak);
      if (!m.weak) delete m.weak;
      m.bonds = readBonds(m.bonds);
      if (!m.bonds) delete m.bonds;
      if (!Array.isArray(m.bondSettled)) delete m.bondSettled;
      if (!Array.isArray(m.bondScenes)) delete m.bondScenes;
      m.mentors = readMentors(m.mentors);
      if (!m.mentors) delete m.mentors;
      // (the Nemesis War: read as saved; a save already past the Undead Legion's first Normal clear opens it now, its Council empty)
      m.war = readWar(m.war);
      if (!m.war) delete m.war;
      openWar(m);
      m.grudges = readGrudges(m.grudges);
      if (!m.grudges) delete m.grudges;
      // (Dynasties: read as saved; a save from before has none until the page opens them, seasons counting from that day)
      m.dynasty = readDynasty(m.dynasty);
      if (!m.dynasty) delete m.dynasty;
      if (!m.recalled || typeof m.recalled !== 'object') delete m.recalled;
      m.codexClaimed = readCodexClaimed(m.codexClaimed) ?? [];
      // (the per-entry stones are gone: a save's old record of them is dropped, and the stones it took stay)
      delete (m as { codexPaid?: unknown }).codexPaid;
      // (saves from before the combos have none seen)
      m.combosSeen = readCombosSeen(m.combosSeen);
      // (saves from before the first-time reveals count every hero they own as seen)
      m.heroesSeen = readHeroesSeen(m.heroesSeen, m.unlocked);
      // (saves from before the auto tickets have none: a full day's worth)
      m.autoTickets = readTickets(m.autoTickets);
      if (!m.autoTickets) delete m.autoTickets;
      // (saves from before the cinematics have none; one that had picked its heroes counts the opening as seen)
      m.scenes = readScenes(m.scenes, !needsStarter(m));
      if (!m.scenes.length) delete m.scenes;
      // (saves from before the boss cards played once have none shown)
      m.bossCards = readCards(m.bossCards);
      if (typeof m.duchessTaps === 'number' && Number.isFinite(m.duchessTaps)) m.duchessTaps = Math.max(0, m.duchessTaps | 0);
      else delete m.duchessTaps;
      m.duchessLucky = !!m.duchessLucky || undefined;
      m.duchessHay = !!m.duchessHay || undefined;
      if (typeof m.duchessTreat === 'number' && Number.isFinite(m.duchessTreat)) m.duchessTreat = m.duchessTreat | 0;
      else delete m.duchessTreat;
      if (!m.bossCards.length) delete m.bossCards;
      // (saves from before the showcases have seen none)
      if (m.ultSeen && typeof m.ultSeen === 'object' && !Array.isArray(m.ultSeen))
        m.ultSeen = Object.fromEntries(Object.entries(m.ultSeen).filter(([, n]) => typeof n === 'number' && Number.isFinite(n) && n > 0).map(([k, n]) => [k, Math.floor(n)]));
      else delete m.ultSeen;
      // (saves from before the Mythics' trial shards have been paid none)
      if (m.trialShards && typeof m.trialShards === 'object' && !Array.isArray(m.trialShards))
        m.trialShards = Object.fromEntries(Object.entries(m.trialShards).filter(([k, n]) => ALL_HEROES.includes(k) && typeof n === 'number' && Number.isFinite(n)).map(([k, n]) => [k, Math.floor(n)]));
      else delete m.trialShards;
      // (saves from before the earned deploy helpers have told none: `featureUnlocks.ts`)
      if (Array.isArray(m.featuresTold)) m.featuresTold = m.featuresTold.filter((x) => typeof x === 'string');
      else delete m.featuresTold;
      // (SPELL-SLOTS: a save from before the slots is not told of the slots it already holds; a new save's first is never told)
      m.slotsTold = Math.max(1, Math.min(4, typeof m.slotsTold === 'number' ? Math.floor(m.slotsTold) : spellSlots(m)));
      // (saves from before the quests have none: nothing begun, and the day's offers are drawn when the page next looks)
      m.quests = readQuests(m.quests);
      if (!m.quests) delete m.quests;
      // (saves from before the Eidolons have none: an empty horn, no Eidolon bound)
      m.eidolons = readEidolons(m.eidolons);
      if (!m.eidolons) delete m.eidolons;
      // (saves from before Hester's Stall and the skill books have none: standing 1, nothing read)
      m.stall = readStall(m.stall);
      if (!m.stall) delete m.stall;
      readBooks(m);
      readSkillUse(m);
      // (a content hero whose milestone a save from before has already reached joins now)
      if (!needsStarter(m)) grantContent(m);
      // (spells are no longer bought: those bought before are kept, and any whose tower level or milestone a save has already reached are learnt now)
      grantSpells(m);
      // (a legend whose source a save from before has already met is found now)
      claimLegends(m);
      return m;
    }
  } catch {
    /* fall through to a fresh one */
  }
  return newMeta(seed);
}
