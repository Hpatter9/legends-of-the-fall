// A quest battle's run (batch 2 of the quests design): how one begins, what it remembers in the save, and when it is open to fight.
// The battles and their rules are in `questBattles.ts`; this joins them to the run (`run.ts`) and the save's quest state (`quests.ts`).
//
// - **Open** while a quest taken has it as its goal (Fight, from the log or the giver's card), or, once won, as practice (Replay, from
//   the Done tab: it pays nothing). Only while its required cast is owned.
// - **A try** is a new run: its own seed (the save's seed, the battle, the try's number), the gold a run would hold by then
//   (`questStartGold`), and the
//   required cast already on the bench, free, at grade 1 (owned heroes at their lasting level, rank and gear, as in any army run). The
//   party picked for it is its pool for hires; the saved party is not changed.
// - **Its save slot** is its own (`legends.questRun`, `saveSlot`), so a saved army run, daily, spire or Calamity is never touched.
//
// Pure rules: no Pixi, no DOM.

import type { Meta } from './meta';
import { castOf, questBattleById, questSeed, type QuestBattle } from './questBattles';
import { questById } from './questData';
import { blankQuests } from './quests';
import { chainWantsBattle } from './eidolonChains';
import { ARMY_START_GOLD, newRun, recruit, reward, SUMMON_BASE, type Run } from './run';

/**
 * The gold a try begins with: the armies' start (two hires), and what an army run would have been paid by the wave this battle's first
 * wave stands for (its last wave is the `like` army's wave, so its first is that many waves before). A battle as strong as an army's
 * wave 11 meets a party as built up as a run at wave 9 would be, not a party of two.
 */
export function questStartGold(qb: QuestBattle): number {
  const first = Math.max(1, qb.like.wave - qb.waves.length + 1);
  let gold = ARMY_START_GOLD;
  for (let n = 1; n < first; n++) gold += reward(n);
  return gold;
}

/** The quest taken whose goal is this battle (none: it is not open to fight, bar a replay). */
export const questForBattle = (m: Meta, id: string): string | undefined =>
  m.quests?.active.find((a) => {
    const g = questById(a.id)?.goal;
    return g?.kind === 'battle' && g.battle === id;
  })?.id;

/** The battle a quest opens, if its goal is one. */
export function battleOfQuest(questId: string): QuestBattle | undefined {
  const g = questById(questId)?.goal;
  return g?.kind === 'battle' ? questBattleById(g.battle) : undefined;
}

/** Whether a battle has been won before (a try now is practice). */
export const battleWon = (m: Meta, id: string): boolean => !!m.quests?.won?.includes(id);

/** Whether a battle may be fought now: a quest taken asks for it, an Eidolon chain's part going does (EIDOLON-CHAINS), or it was won
 *  before (a replay); and its cast is owned. */
export function canFightBattle(m: Meta, id: string): boolean {
  const qb = questBattleById(id);
  return !!qb && !!castOf(m, qb) && (!!questForBattle(m, id) || chainWantsBattle(m, id) || battleWon(m, id));
}

/** How many tries of a battle have been begun. */
export const triesOf = (m: Meta, id: string): number => m.quests?.tries?.[id] ?? 0;

/** Whether a battle's story is still to be told (it plays before the first deploy, once a save). */
export const storyDue = (m: Meta, id: string): boolean => !m.quests?.told?.includes(id);
/** The story has been told. */
export function markTold(m: Meta, id: string): void {
  const s = (m.quests ??= blankQuests());
  if (!(s.told ??= []).includes(id)) s.told.push(id);
}

/**
 * Begin a try of a battle: counts the try in the save (its seed follows the count, so every try is a new fight and a reload is the
 * same one), and returns the run, with the required cast on the bench and `party` (the cast and the player's other picks) as the pool
 * hires draw from. Null when it cannot be fought now (`canFightBattle`).
 */
export function startQuestBattle(m: Meta, id: string, party: readonly string[]): Run | null {
  const qb = questBattleById(id);
  const cast = qb && castOf(m, qb);
  if (!qb || !cast || !canFightBattle(m, id)) return null;
  const s = (m.quests ??= blankQuests());
  const n = ((s.tries ??= {})[id] = (s.tries[id] ?? 0) + 1);
  const pool = [...new Set([...cast, ...party.filter((k) => m.unlocked.includes(k))])];
  const run = newRun(questSeed(m.seed, id, n), pool, m.castle, 0, questStartGold(qb));
  run.mode = { kind: 'quest', quest: id, cast, ...(battleWon(m, id) ? { practice: true } : {}) };
  run.area = qb.land;
  // (the required cast waits on the bench, free: they must fight, so they are not bought)
  for (const kind of cast) recruit(run, kind, SUMMON_BASE);
  return run;
}

/** A quest battle's last wave has been won: it is remembered as won (a replay after is practice). Returns whether it was the first win. */
export function noteBattleWon(m: Meta, run: Run): boolean {
  if (run.mode?.kind !== 'quest' || !run.cleared) return false;
  const s = (m.quests ??= blankQuests());
  if ((s.won ??= []).includes(run.mode.quest)) return false;
  s.won.push(run.mode.quest);
  return true;
}

/** The quest battle a run is, if it is one. */
export const questBattleOfRun = (run: Run): QuestBattle | undefined => (run.mode?.kind === 'quest' ? questBattleById(run.mode.quest) : undefined);
