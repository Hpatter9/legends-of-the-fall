// Quest battles (batch 2 of the quests and Eidolons design, `docs/notes/quests-summons-design.md`, "Quest battles"): a quest can open
// a one-off battle of its own, with its own land, one to five waves of its own, often a boss of its own (a name and a title on an
// existing boss, who keeps that boss's kit and signature attacks), a short story before it and a beat after, and a **required cast**:
// one to three named heroes who must fight in it (each slot one hero, or one of a few). The rest of the party is the player's own.
//
// - **The owner's rule:** a quest that needs particular heroes does not show until they are owned (`castOf`: every slot filled by an
//   owned hero; `quests.ts` reads it). Stand-ins (`standIns`) are for the Eidolon chains' battles, a later batch.
// - **It runs as a run of its own:** `RunMode` `{ kind: 'quest' }`, an `Army`-shaped definition (`questArmy`, as the daily's
//   `dailyArmy`), so the waves, the boss, the long map, the hearts and the walk across are the armies' own code; its own seed
//   (`questSeed`, a side stream of the save's seed, the battle and the try) and its own save slot (`legends.questRun`), so it never ends
//   an army run that is saved. Losing costs nothing: Try again, with a new seed.
// - **Its strength** is an army's Normal at one of its waves (`like`): the battle's last wave meets foes as strong as that wave's, the
//   waves before a little weaker, as an army's do.
//
// Pure rules: no Pixi, no DOM. The battles themselves are in `questBattleData.ts`.

import { armyById, type Army, type Wave } from './armies';
import type { Area } from './board';
import type { Meta } from './meta';
import { hashSeed, mixSeed } from './rng';
import type { Scene } from './sceneKit';
import { traitsOf, TRAITS } from './traits';
import { heroName } from './heroNames';
import type { With } from './questData';
import { QUEST_BATTLES } from './questBattleData';
import { CHAIN_BATTLES } from './chainBattleData';
import { TALE_BATTLES } from './taleBattleData';

/** The side stream a quest battle's seed is drawn from. */
export const QB_SALT = 0x9b47;
/** A quest battle has one to five waves. */
export const QB_WAVES = { min: 1, max: 5 } as const;

/** A slot of the required cast: one of these heroes must fight (the first one owned is the one asked for). */
export interface CastSlot {
  heroes: readonly string[];
  /** Heroes who may take the part when none of `heroes` is owned: the Eidolon chains' battles only (`chainBattleData.ts`). */
  standIns?: readonly string[];
}

export interface QuestBattle {
  id: string;
  title: string;
  /** One line for its card. */
  blurb: string;
  /** The land every wave is fought on. */
  land: Area;
  /** One to five waves (the armies' `Wave`: foes by id, a boss's wave marked); the last is usually the boss's. */
  waves: readonly Wave[];
  /** How strong it is: the last wave's foes are as strong as this army's Normal at this wave. */
  like: { army: string; wave: number };
  /** The foes' strength on top of `like` (missing is 1): each battle's own, set by `npm run quest-rate`, since a boss's kit (a lich's
   *  freezes, a demon lord's pull) weighs more in three waves with a small party than in an army's fifteen. */
  ease?: number;
  /** EIDOLON-TRIAL: the last boss's health and attack on top of the army's mid-boss's (an Eidolon in its trial is more than a mid-boss). */
  bossLift?: { hp: number; atk: number };
  /** The boss of the last wave's own name and title (it keeps its look, kit and signature attacks). */
  boss?: { name: string; title: string };
  /** The required cast, slot by slot. */
  cast: readonly CastSlot[];
  /** Every hero fielded must fit this (the warlock's audit: only spellcasters). */
  only?: With;
  /** At most this many heroes fielded (a small room). */
  most?: number;
  /** Duchess fights in it (every time: she is part of the story). */
  duchess?: boolean;
  /** The story before (played before the first deploy, the first time) and the beat after a win. `c` is the cast, slot by slot. */
  before: (c: readonly string[]) => Scene;
  after: (c: readonly string[]) => Scene;
}

// (EIDOLON-CHAINS: the chains' own battles are found by id too; no quest in the log opens them, a chain's part does. SECRET-HEROES: the
// hero quests' battles, each opened by its tale's last part as any battle quest is)
const BY_ID = new Map([...QUEST_BATTLES, ...CHAIN_BATTLES, ...TALE_BATTLES].map((q) => [q.id, q]));
export const questBattleById = (id: string): QuestBattle | undefined => BY_ID.get(id);
export { QUEST_BATTLES, CHAIN_BATTLES, TALE_BATTLES };

/* ------------------------------------------------------------------ the army it is */

const armies = new Map<string, Army>();

/**
 * A quest battle as an army (as the daily is one): its waves on its land, its strength measured on an army's Normal (`like`): the last
 * wave's foes as strong as that army's wave, each wave before one wave's growth weaker. Its bosses take that army's mid-boss stats. It pays
 * no crowns by the wave (the quest pays), and it is in no list, so it keeps no army record or stars. Undefined for an unknown id.
 */
export function questArmy(id: string): Army | undefined {
  let a = armies.get(id);
  if (a) return a;
  const qb = questBattleById(id);
  const like = qb && armyById(qb.like.army);
  if (!qb || !like) return undefined;
  const top = like.start * (1 + like.growth * (qb.like.wave - 1)) * (qb.ease ?? 1);
  const start = top / (1 + like.growth * (qb.waves.length - 1));
  a = {
    id: `quest:${qb.id}`,
    name: qb.title,
    blurb: qb.blurb,
    level: like.level,
    area: qb.land,
    lands: [qb.land],
    waves: qb.waves,
    start,
    growth: like.growth,
    // (a quest's boss is no army's last: it takes the army's mid-boss stats, whichever wave it stands on)
    mid: like.mid,
    last: qb.bossLift ? { ...like.mid, hp: like.mid.hp * qb.bossLift.hp, atk: like.mid.atk * qb.bossLift.atk } : like.mid,
    pay: 0,
    clear: 0,
  };
  armies.set(id, a);
  return a;
}

/** Forget the armies made so far (the tuning tool changes `ease` and asks again). */
export const forgetQuestArmies = (): void => armies.clear();

/** The boss a quest battle ends with (the first foe of its last boss wave), if it has one. */
export function questBossOf(qb: QuestBattle): string | undefined {
  const w = [...qb.waves].reverse().find((x) => x.boss);
  return w?.foes[0];
}

/* ------------------------------------------------------------------ the required cast */

/**
 * The cast a save can field, slot by slot: each slot's first owned hero (a stand-in when none of its heroes is owned and the slot has
 * stand-ins), no hero in two slots. Null when a slot cannot be filled: the quest is not offered (the owner's rule).
 */
export function castOf(m: Pick<Meta, 'unlocked'>, qb: QuestBattle): string[] | null {
  const out: string[] = [];
  for (const slot of qb.cast) {
    const pick = slot.heroes.find((k) => m.unlocked.includes(k) && !out.includes(k)) ?? slot.standIns?.find((k) => m.unlocked.includes(k) && !out.includes(k));
    if (!pick) return null;
    out.push(pick);
  }
  return out;
}

/** Whether a save owns heroes for every slot of a battle's cast. */
export const castOwned = (m: Pick<Meta, 'unlocked'>, qb: QuestBattle): boolean => castOf(m, qb) !== null;

/** Names in a list: "Kenji", "Kenji and Hideo", "Kenji, Hideo and Ravi". */
export const andList = (names: readonly string[]): string => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/** The cast and the battle's rule in words, for the party screen: "Kenji and Hideo must fight · only Caster, Arcanist or Mystic heroes". */
export function castWords(qb: QuestBattle, cast: readonly string[]): string {
  const who = `${andList(cast.map(heroName))} must fight`;
  const rule = qb.only?.traits ? ` · only ${qb.only.traits.map((t) => TRAITS[t]?.name ?? t).join(', ').replace(/, ([^,]*)$/, ' or $1')} heroes` : '';
  const most = qb.most !== undefined ? ` · ${qb.most} heroes at most` : '';
  return who + rule + most;
}

/** Why the fight cannot begin yet, in words for the deploy line ("Place Kenji to begin"), or null. */
export function notReadyWords(why: NotReady | null, cast: readonly string[]): string | null {
  if (!why) return null;
  if (why.kind === 'none') return `Place ${andList(cast.map(heroName))} to begin`;
  if (why.kind === 'missing') return `Place ${andList(why.heroes.map(heroName))} to begin`;
  if (why.kind === 'only') return `Only spellcasters fight here: take ${andList(why.heroes.map(heroName))} off`;
  return `${why.most} heroes at most in here: take one off`;
}

/** Whether a hero kind may fight in a battle (its rule, if it has one). */
export const mayFight = (qb: QuestBattle, kind: string): boolean => !qb.only || fits(qb.only, kind);

/** Whether a hero kind fits a rider. */
const fits = (w: With, kind: string): boolean => !!w.heroes?.includes(kind) || !!w.traits?.some((t) => traitsOf(kind).includes(t));

/** Why the fight cannot begin yet, from the hero kinds on the board: a required hero missing (by kind), a hero who does not fit the
 *  battle's rule, or too many fielded. Null when it may begin. */
export type NotReady = { kind: 'missing'; heroes: string[] } | { kind: 'only'; heroes: string[] } | { kind: 'most'; most: number } | { kind: 'none' };
export function notReady(qb: QuestBattle, cast: readonly string[], placed: readonly string[]): NotReady | null {
  if (!placed.length) return { kind: 'none' };
  const missing = cast.filter((k) => !placed.includes(k));
  if (missing.length) return { kind: 'missing', heroes: missing };
  if (qb.only) {
    const off = [...new Set(placed.filter((k) => !fits(qb.only!, k)))];
    if (off.length) return { kind: 'only', heroes: off };
  }
  if (qb.most !== undefined && placed.length > qb.most) return { kind: 'most', most: qb.most };
  return null;
}

/* ------------------------------------------------------------------ seeds */

/** The seed of a battle's try `n` (from 1): a side stream of the save's seed, the battle and the try, so each try is a new board and
 *  the same save's same try is the same fight. */
export const questSeed = (saveSeed: number, id: string, tries: number): number => mixSeed(saveSeed, QB_SALT, hashSeed(id), tries);
