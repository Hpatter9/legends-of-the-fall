// The quests' data: who gives them (the givers, and where each one's offers come from), what a quest is (its goal, the riders on
// that goal, its needs and its pay), and the quests themselves, gathered from one file a giver in `questData/` (batch 1 of the quests
// and Eidolons design, `docs/notes/quests-summons-design.md`, and batch 1b's hundred unique quests and thirty repeatable ones).
// Pure data: the rules that offer, count and pay them are in `quests.ts`. A new quest is a new entry in its giver's file; the goal
// kinds are shared.

import type { TomeCounts } from './tomes';
import { GWEN_QUESTS } from './questData/gwen';
import { NOTICE_QUESTS } from './questData/notices';
import { ROAD_QUESTS } from './questData/road';
import { PATRON_QUESTS } from './questData/patrons';
import { ROYAL_QUESTS } from './questData/royal';
import { SPOILS_QUESTS } from './questData/spoils';
import { RIFT_QUESTS } from './questData/rift';
import { DUCHESS_QUESTS } from './questData/duchess';
import { REPEAT_QUESTS } from './questData/repeat';
import { BATTLE_QUESTS } from './questData/battles';
import { TALE_QUESTS } from './questData/tales';

/** Who offers a quest and takes it back. A patron is one of the player's own heroes (the quest's `hero`). */
export type GiverId = 'gwen' | 'notice' | 'pedlar' | 'pilgrim' | 'messenger' | 'hunter' | 'patron' | 'ruler' | 'spoils' | 'rift' | 'duchess' | 'shepherd' | 'gaoler' | 'smith' | 'sexton' | 'pawnbroker' | 'lantern' | 'herald' | 'clock' | 'falconer' | 'archivist';

/**
 * Where a giver's offers come from. Gwen's own; the notices pinned to the board by strangers; the passersby (one a day, whoever
 * passes); the patrons (the heroes in the tavern, now and then); the ruler's Royal charges (one a week); Duchess; and two that come
 * after a fight, not with the day: spoils found on an army's boss, and the rift's voice when a Calamity guardian falls. And the tales
 * (SECRET-HEROES): the hero quests, each told by its own giver, on the board as soon as their story allows (`offerTales`).
 */
export type GiverSlot = 'gwen' | 'passerby' | 'notice' | 'patron' | 'royal' | 'duchess' | 'spoils' | 'rift' | 'tale';

export interface Giver {
  id: GiverId;
  name: string;
  /** A few words on who they are, under the name on their card. */
  title: string;
  slot: GiverSlot;
}

export const GIVERS: Record<GiverId, Giver> = {
  gwen: { id: 'gwen', name: 'Gwen Tallow', title: 'Keeper of the tavern', slot: 'gwen' },
  notice: { id: 'notice', name: 'A notice', title: 'Pinned to the quest board', slot: 'notice' },
  pedlar: { id: 'pedlar', name: 'A pedlar', title: 'Passing on the road', slot: 'passerby' },
  pilgrim: { id: 'pilgrim', name: 'A pilgrim', title: 'Passing on the road', slot: 'passerby' },
  messenger: { id: 'messenger', name: 'A royal messenger', title: 'Passing on the road', slot: 'passerby' },
  hunter: { id: 'hunter', name: 'A frost-bitten hunter', title: 'Passing on the road', slot: 'passerby' },
  // (a patron's name and face are the hero's own: `QuestDef.hero`)
  patron: { id: 'patron', name: 'A hero', title: 'In the tavern', slot: 'patron' },
  // (the ruler's name and face are the player's chosen ruler's, put in by the page)
  ruler: { id: 'ruler', name: 'The Crown', title: 'A Royal charge', slot: 'royal' },
  spoils: { id: 'spoils', name: 'Spoils of war', title: 'Found on a fallen boss', slot: 'spoils' },
  rift: { id: 'rift', name: 'A voice in the rift', title: 'Heard where a guardian fell', slot: 'rift' },
  duchess: { id: 'duchess', name: 'Duchess', title: 'A goat of consequence', slot: 'duchess' },
  // (SECRET-HEROES: the tellers of the three hero quests, by the tavern's fire)
  shepherd: { id: 'shepherd', name: 'Old Maud', title: 'A shepherd from the high fold', slot: 'tale' },
  gaoler: { id: 'gaoler', name: 'Brannock', title: "Turnkey of the keep's cells", slot: 'tale' },
  smith: { id: 'smith', name: 'Edda Coalbrook', title: 'A forge-hand from under the mountain', slot: 'tale' },
  // (HERO-TALES-2: the tellers of the other seven, one a tale)
  sexton: { id: 'sexton', name: 'Sexton Pell', title: "Keeper of the chapel yard's ledger", slot: 'tale' },
  pawnbroker: { id: 'pawnbroker', name: 'Ottilie Marsh', title: 'Pawnbroker of Lantern Row', slot: 'tale' },
  lantern: { id: 'lantern', name: 'Kiku', title: 'A lantern-seller from the shrine road', slot: 'tale' },
  herald: { id: 'herald', name: 'Master Fenwick', title: "Herald of the keep's hall", slot: 'tale' },
  clock: { id: 'clock', name: 'Hesper Tock', title: 'A clockmaker, usually on time', slot: 'tale' },
  falconer: { id: 'falconer', name: 'Wren Halloway', title: 'Falconer of the high crags', slot: 'tale' },
  archivist: { id: 'archivist', name: 'Ivy Penhallow', title: "Keeper of the keep's bestiary", slot: 'tale' },
};

/** The draws, in order: each slot is drawn from its own side stream (its index here is its salt), so a slot added at the end leaves the others' draws as they were. */
export const SLOTS: readonly GiverSlot[] = ['gwen', 'passerby', 'notice', 'patron', 'royal', 'duchess', 'spoils', 'rift', 'tale'];

/**
 * How many of a slot's offers the board holds at once, how many days each lasts before it is taken down, and how often a new one
 * may be drawn (`every` days; none: each day there is room). `after` slots are not drawn with the day: a fight offers them.
 */
export const SLOT_RULES: Record<GiverSlot, { cap: number; days: number; every?: number; after?: true }> = {
  // (the board holds up to three of Gwen's; one new a day; an offer lasts 3 days: the owner's decision)
  gwen: { cap: 3, days: 3 },
  // (a passerby is gone at midnight if not taken)
  passerby: { cap: 1, days: 1 },
  // (strangers' notices: two at a time, three days each)
  notice: { cap: 2, days: 3 },
  // (the design: at most two patrons at a time, a new one every two days)
  patron: { cap: 2, days: 2, every: 2 },
  // (the design: one Royal charge a week, kept the week)
  royal: { cap: 1, days: 7, every: 7 },
  // (Duchess: one at a time, now and then)
  duchess: { cap: 1, days: 2, every: 3 },
  // (the design: about one boss win in three finds spoils; one waits at most)
  spoils: { cap: 1, days: 5, after: true },
  // (the design: about one guardian in two leaves a voice behind)
  rift: { cap: 1, days: 5, after: true },
  // (SECRET-HEROES: a tale is never drawn with the day: its next part goes up as soon as the part before is handed in, and stays)
  tale: { cap: 10, days: 100_000, after: true },
};

/** When a quest may be offered. */
export type Need =
  | { kind: 'any' }
  /** An army cleared (on Normal). */
  | { kind: 'army'; army: string }
  /** This many armies cleared. */
  | { kind: 'armies'; n: number }
  /** A hero of the player's at this level or higher. */
  | { kind: 'level'; n: number }
  /** Any army cleared on this tier (1 Hard, 2 Elite, 3 Legendary, 4 Mythic) or a harder one. */
  | { kind: 'tier'; tier: number }
  /** A mode open: the Last Stand (`tower`) or the Calamity. */
  | { kind: 'mode'; mode: 'tower' | 'calamity' }
  /** Duchess has been met (tapped, her bleat, or her haystack). */
  | { kind: 'duchess' }
  /** One of the king's spells known. */
  | { kind: 'spell'; id: string }
  /** Every one of these. */
  | { kind: 'all'; of: readonly Need[] };

/** A rider on a fight goal: one of these heroes, or any hero of one of these traits. */
export interface With {
  heroes?: readonly string[];
  traits?: readonly string[];
}

/** The modes a fight can be in. */
export type FightMode = 'army' | 'daily' | 'tower' | 'calamity' | 'stand';

/**
 * The conditions a fight must meet to count for a goal (the riders; any mix). The owner's rule reads `with`, `all`, `only` and a
 * goal's `by`: a quest is not offered until the player owns heroes who could meet them.
 */
export interface Cond {
  /** One army's waves (army runs). */
  army?: string;
  /** One mode's fights. */
  mode?: FightMode;
  /** An army run on this tier or a harder one. */
  tier?: number;
  /** Wave (or floor) this or later. */
  stage?: number;
  /** One of these on the field. */
  with?: With;
  /** Every one of these heroes on the field together. */
  all?: readonly string[];
  /** Every hero on the field fits this. */
  only?: With;
  /** At most this many heroes fielded. */
  most?: number;
  /** No hero falls. */
  flawless?: boolean;
  /** Won within this many seconds. */
  quick?: number;
  /** A hero ends the won fight standing on a quarter of its health or less. */
  lowHp?: boolean;
  /** At least this many ultimates fired in the one fight. */
  ultsIn?: number;
  /** The king's spells cast (at least one) and only these. */
  spellsOnly?: readonly string[];
  /** No king's spell cast. */
  noSpells?: boolean;
  /** One of these bosses felled in it. */
  boss?: readonly string[];
}

/** The heroes' tallies a goal can add up across fights (`fightStats.ts`). */
export type StatKey = 'dealt' | 'healed' | 'taken' | 'kills';

/** What a quest asks. Each counts from what the game settles after a fight (`noteQuests`), or at the Last Stand's end. */
export type Goal =
  /** Win `n` waves, with the riders. */
  | ({ kind: 'wavesWon'; n: number } & Cond)
  /** Win `n` boss waves (a mid-boss or a last boss), with the riders. */
  | ({ kind: 'bossDown'; n: number } & Cond)
  /** Fell `n` foes (a family, some kinds, the foes who march in one army's waves, or any), won or lost. */
  | ({ kind: 'kills'; n: number; family?: FoeFamily; foes?: readonly string[]; ofArmy?: string } & Cond)
  /** Clear `n` dailies (the counted play of a date). */
  | { kind: 'clearDaily'; n: number }
  /** Clear an army whole (its last wave won) `n` times, with the riders (`army`, `tier`...). */
  | ({ kind: 'clearArmy'; n: number } & Cond)
  /** Deal, heal or take `n` (or fell `n` foes) across fights, by the heroes who fit `by` (or any hero), won or lost. */
  | ({ kind: 'tally'; n: number; stat: StatKey; by?: With } & Cond)
  /** Fire `n` ultimates across fights, by heroes who fit `by` (or any), won or lost. */
  | ({ kind: 'ults'; n: number; by?: With } & Cond)
  /** Cast the king's spells `n` times (or only these spells), won or lost. */
  | ({ kind: 'spells'; n: number; spells?: readonly string[] } & Cond)
  /** Set off `n` duo combos. */
  | ({ kind: 'duos'; n: number } & Cond)
  /** Set off a five-hero combo (one in particular, or any) `n` times. */
  | ({ kind: 'teamCombo'; n: number; combo?: string } & Cond)
  /** A hero who fits `by` is the MVP of `n` won fights. */
  | ({ kind: 'mvp'; n: number; by: With } & Cond)
  /** Fell `n` Calamity guardians (a map's boss), on this map or a later one. */
  | ({ kind: 'calGuardian'; n: number; map?: number } & Cond)
  /** Clear a calamity whole `n` times. */
  | ({ kind: 'calClear'; n: number } & Cond)
  /** Reach wave `n` of the Last Stand in one run (the best run counts). */
  | { kind: 'standWave'; n: number }
  /** Reach the Last Stand's act `n` (1 the courtyard, 2 the library, 3 the chapel, 4 the throne room) in one run, having held the line on the way if `held`. */
  | { kind: 'standRoom'; n: number; held?: boolean }
  /** Hold the line at an act's end `n` times (the bonus wave, won). */
  | { kind: 'holdLine'; n: number }
  /** Win a quest battle (`questBattles.ts`; batch 2): its last wave won, once. Offered only while its required cast is owned. */
  | { kind: 'battle'; n: number; battle: string };

export type GoalKind = Goal['kind'];

/** The goals counted as a best reached (the progress is the furthest, not a sum). */
export const BEST_GOALS: readonly GoalKind[] = ['standWave', 'standRoom'];

export type FoeFamily = 'skeletons';

/** A quest's pay, from what the game already pays: crowns, stones, a chest into the stash, rift ores, XP tomes, a hero's shards; and a keepsake. */
export interface Reward {
  crowns?: number;
  stones?: number;
  chest?: 'bronze' | 'silver' | 'gold';
  ores?: readonly { trait: string; n: number }[];
  tomes?: TomeCounts;
  /** Shards of a hero (unlock shards if not owned, rank shards if owned: `giveShards`). */
  shards?: { kind: string; n: number };
  /** A keepsake hung behind the bar (shown in the Done tab and on the hand-in; words only). */
  keepsake?: string;
  /** SECRET-HEROES: a hero who joins (a hero quest's last part), told as `tease` until it has ("the stranger joins your company"); a save
   *  that already has the hero is paid `instead`. */
  hero?: { kind: string; tease: string; instead: Reward };
}

/** A quest's mood, for the writers' spread (not shown). */
export type Mood = 'funny' | 'eerie' | 'sad' | 'heroic' | 'petty' | 'mysterious' | 'warm';

export interface QuestDef {
  id: string;
  title: string;
  giver: GiverId;
  /** A patron's quest: the hero who gives it (it is offered only while they are owned). */
  hero?: string;
  needs: Need;
  /** A quest that must be handed in first (a story's next step). */
  after?: string;
  /** Spoils: the bosses whose fall may turn it up (none: any army boss). */
  from?: readonly string[];
  /** A repeatable quest: offered again this many days after its hand-in (or a drop). */
  repeat?: number;
  /** The goal in plain words, for the log and the chip. */
  text: string;
  /** The giver's words when it is offered (one to three lines), while it is going, and at the hand-in. */
  offer: readonly string[];
  going: string;
  done: readonly string[];
  goal: Goal;
  reward: Reward;
  mood?: Mood;
}

/** Every quest: each giver's uniques, then the repeatables. */
export const QUESTS: readonly QuestDef[] = [
  ...GWEN_QUESTS,
  ...NOTICE_QUESTS,
  ...ROAD_QUESTS,
  ...PATRON_QUESTS,
  ...ROYAL_QUESTS,
  ...SPOILS_QUESTS,
  ...RIFT_QUESTS,
  ...DUCHESS_QUESTS,
  ...REPEAT_QUESTS,
  // (batch 2: the quests that open a quest battle, one a battle, from their fitting givers)
  ...BATTLE_QUESTS,
  // (SECRET-HEROES: the hero quests, each ending with a secret hero joining; ten since HERO-TALES-2)
  ...TALE_QUESTS,
];

const BY_ID = new Map(QUESTS.map((q) => [q.id, q]));
export const questById = (id: string): QuestDef | undefined => BY_ID.get(id);
