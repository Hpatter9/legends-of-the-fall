// The Eidolon chains (EIDOLON-CHAINS, batch 5 of the quests and Eidolons design, `docs/notes/eidolon-chains.md`): how a chain opens,
// begins, counts its parts, gives its pieces and ends in a binding at the Summoner. The data is in `eidolonChainData.ts`.
//
// - **One chain at a time** (the owner's rule): a chain is offered only while none is going, and only once the chain before it is bound
//   (or its Eidolon is bound some other way, as the dev flag does); then when its own opening holds (an army cleared, the Calamity
//   cleared) and it is written. An older save is offered the first chain as soon as it loads with the Orc Warband cleared.
// - **Begun** by the giver's prologue (`beginChain`), its parts go in order: each counts the settled fights as a quest's goal does
//   (`goalGain`, from `noteChains`, called beside `noteQuests`), and the moment one is done its piece is found and its pay paid, and the
//   next part begins. Losing never takes progress away.
// - **The owner's rule on heroes:** a chain only asks for starter heroes (both packs, `chainBattleData.ts`), so it never waits on luck; a
//   part whose battle's cast cannot be filled at all still says so (`partBlocked`) rather than vanish.
// - **The trial** (EIDOLON-TRIAL, the owner's call for chains 2 to 6): a chain whose trial is written (`eidolonTrials.ts`) has one more
//   step once every piece is in: the fight against the Eidolon itself (`trialDue`). Won (`noteChains` sees its battle won), the chain is
//   ready to bind; lost, it waits, as a quest battle does. It finds no piece and pays nothing: the binding is its reward.
// - **Bound** at the Summoner (`bindChain`) once every piece is in (and its trial won): the Eidolon is bound and becomes the one the War
//   Horn calls.
//
// Pure rules: no Pixi, no DOM, no randomness (nothing is drawn: a chain's offer follows its rules alone).

import type { Meta } from './meta';
import { blankQuests, goalGain, needMet, payReward, type QuestFight } from './quests';
import { bindEidolon, boundOf, chooseEidolon } from './warHorn';
import { castOf, questBattleById } from './questBattles';
import { eidolonById } from './eidolons';
import { CHAINS, chainById, type ChainDef, type ChainOpens, type ChainPart, type ChainState, type PieceDef } from './eidolonChainData';
import { trialOfChainId, type TrialDef } from './eidolonTrials';

const stateOf = (m: Meta) => (m.quests ??= blankQuests());
export const chainState = (m: Meta, id: string): ChainState | undefined => m.quests?.chains?.[id];

/** Whether a chain is over: bound at the Summoner, or its Eidolon bound some other way. */
export const chainDone = (m: Meta, c: ChainDef): boolean => !!chainState(m, c.id)?.bound || boundOf(m).includes(c.eidolon);

/** Whether a chain's opening holds (beside the chain before it). */
export function opensMet(m: Meta, o: ChainOpens): boolean {
  return o.kind === 'calCleared' ? (m.calamity?.clears ?? 0) > 0 : needMet(m, o);
}

/** The chain going: begun and not yet bound (one at a time, so at most one). */
export function activeChain(m: Meta): ChainDef | undefined {
  return CHAINS.find((c) => !!chainState(m, c.id) && !chainDone(m, c));
}

/** The chain waiting to be begun at its giver: none while one is going; else the first not done, if it is written, the one before it is
 *  done and its opening holds. */
export function offeredChain(m: Meta): ChainDef | undefined {
  if (activeChain(m)) return undefined;
  const i = CHAINS.findIndex((c) => !chainDone(m, c));
  const c = CHAINS[i];
  if (!c || !c.parts.length || chainState(m, c.id)) return undefined;
  if (i > 0 && !chainDone(m, CHAINS[i - 1])) return undefined;
  return opensMet(m, c.opens) ? c : undefined;
}

/** Begin the chain on offer (the page does, as its prologue ends): its first part begins. False unless it is the one on offer. */
export function beginChain(m: Meta, id: string): boolean {
  const c = offeredChain(m);
  if (!c || c.id !== id) return false;
  (stateOf(m).chains ??= {})[id] = { part: 0, progress: 0 };
  return true;
}

/** The part going in the chain going, with its index and count (none once every piece is in, or no chain is going). */
export function currentPart(m: Meta): { chain: ChainDef; part: ChainPart; index: number; progress: number } | undefined {
  const c = activeChain(m);
  const st = c && chainState(m, c.id);
  const part = c && st ? c.parts[st.part] : undefined;
  return c && st && part ? { chain: c, part, index: st.part, progress: st.progress } : undefined;
}

/** A chain's trial (EIDOLON-TRIAL): written for it, and the chain one that ends in a trial. */
export const trialOf = (c: ChainDef): TrialDef | undefined => (c.trial ? trialOfChainId(c.id) : undefined);

/** The steps of a chain in the log: its parts, and its trial as the last part when it has one ("Part 4 of 4: The Trial"). */
export const stepsOf = (c: ChainDef): number => c.parts.length + (trialOf(c) ? 1 : 0);

/** The trial waiting in the chain going: every piece in, its trial written and not yet won. */
export function trialDue(m: Meta): { chain: ChainDef; trial: TrialDef } | undefined {
  const c = activeChain(m);
  const st = c && chainState(m, c.id);
  const trial = c && trialOf(c);
  return c && st && trial && st.part >= c.parts.length && !st.trialWon ? { chain: c, trial } : undefined;
}

/** The chain whose every piece is in (and its trial won, if it has one), waiting for its binding at the Summoner. */
export function readyToBind(m: Meta): ChainDef | undefined {
  const c = activeChain(m);
  const st = c && chainState(m, c.id);
  return c && st && st.part >= c.parts.length && (!trialOf(c) || !!st.trialWon) ? c : undefined;
}

/** The pieces of a chain found so far, in order. */
export function piecesOf(m: Meta, c: ChainDef): PieceDef[] {
  const got = m.quests?.pieces ?? [];
  return c.parts.map((p) => p.piece).filter((p) => got.includes(p.id));
}

/** A piece found: the chain, the part's index and the piece (for the page's piece card). */
export interface PieceFound {
  chain: string;
  part: number;
  piece: PieceDef;
}

/** Count a settled fight towards the part going. A part done finds its piece, pays its reward, and the next part begins (its count from
 *  nothing). Returns the pieces found. Pure but for the meta. */
export function noteChains(m: Meta, f: QuestFight): PieceFound[] {
  // (EIDOLON-TRIAL: the trial won, the chain is ready to bind; nothing is found)
  const due = trialDue(m);
  if (due && goalGain({ kind: 'battle', n: 1, battle: due.trial.id }, f)) chainState(m, due.chain.id)!.trialWon = true;
  const cur = currentPart(m);
  if (!cur) return [];
  const st = chainState(m, cur.chain.id)!;
  const add = goalGain(cur.part.goal, f);
  if (!add) return [];
  st.progress = Math.min(cur.part.goal.n, st.progress + add);
  if (st.progress < cur.part.goal.n) return [];
  const s = stateOf(m);
  if (!(s.pieces ??= []).includes(cur.part.piece.id)) s.pieces.push(cur.part.piece.id);
  payReward(m, cur.part.reward, `chain:${cur.part.id}`);
  st.part += 1;
  st.progress = 0;
  return [{ chain: cur.chain.id, part: cur.index, piece: cur.part.piece }];
}

/** Bind the chain whose pieces are all in (the Summoner's ceremony): its Eidolon is bound and chosen to answer the War Horn, the chain is
 *  over (the next may open), and a gold chest is paid. False unless that chain is ready. */
export function bindChain(m: Meta, id: string): boolean {
  const c = readyToBind(m);
  if (!c || c.id !== id) return false;
  bindEidolon(m, c.eidolon);
  chooseEidolon(m, c.eidolon);
  chainState(m, id)!.bound = true;
  payReward(m, { chest: 'gold' }, `chain:${id}:bound`);
  return true;
}

/** Whether the part going asks for this quest battle (it may then be fought from the chain's card, as a quest taken lets one be). */
export function chainWantsBattle(m: Meta, battle: string): boolean {
  if (trialDue(m)?.trial.id === battle) return true;
  const g = currentPart(m)?.part.goal;
  return g?.kind === 'battle' && g.battle === battle;
}

/** The chain whose part (or trial) a battle is, if one is. */
export const chainOfBattle = (battle: string): ChainDef | undefined =>
  CHAINS.find((c) => c.parts.some((p) => p.goal.kind === 'battle' && p.goal.battle === battle) || trialOf(c)?.id === battle);

/** A part that cannot be done with the heroes owned (its battle's cast cannot be filled): the heroes it asks for, in words' order. With every
 *  slot listing both starter packs this should not happen; the page shows the part greyed with them rather than hide it. */
export function partBlocked(m: Meta, part: ChainPart): string[] | null {
  if (part.goal.kind !== 'battle') return null;
  const qb = questBattleById(part.goal.battle);
  if (!qb || castOf(m, qb)) return null;
  return qb.cast.flatMap((s) => [...s.heroes, ...(s.standIns ?? [])]);
}

/** Whether the chains have anything to show yet (the log's Eidolons tab, the Pact Gallery's button): one offered, begun or bound. */
export const chainsShown = (m: Meta): boolean => !!offeredChain(m) || CHAINS.some((c) => !!chainState(m, c.id) || chainDone(m, c));

/** Whether the Summoner has something waiting (the Recruit tab's badge): a chain to begin, or one to bind. */
export const summonerWaiting = (m: Meta): boolean => !!offeredChain(m) || !!readyToBind(m);

/** What the Summoner's plaque in the Sanctum says (SANCTUM-TIDY: one short row over the shards' scroll): a chain to hear, one to bind, or
 *  the part going. Null once nothing waits there, as after a binding while the next chain is unwritten or not yet open: then no plaque. */
export function hallPlaque(m: Meta): { kind: 'offer' | 'going' | 'bind'; title: string; line: string } | null {
  const name = (c: ChainDef): string => eidolonById(c.eidolon)?.name ?? c.title;
  if (offeredChain(m)) return { kind: 'offer', title: 'The Summoner beckons', line: 'tap to listen' };
  const ready = readyToBind(m);
  if (ready) return { kind: 'bind', title: `Bind ${name(ready)}`, line: 'every piece is on the altar' };
  // (EIDOLON-TRIAL: every piece found, the Eidolon's own trial waits)
  const due = trialDue(m);
  if (due) return { kind: 'going', title: `${name(due.chain)} · ${due.chain.parts.length} of ${due.chain.parts.length} pieces`, line: `Part ${stepsOf(due.chain)}: ${due.trial.part.title}` };
  const cur = currentPart(m);
  if (cur) return { kind: 'going', title: `${name(cur.chain)} · ${piecesOf(m, cur.chain).length} of ${cur.chain.parts.length} pieces`, line: `Part ${cur.index + 1}: ${cur.part.title}` };
  return null;
}

export { chainById, CHAINS };
