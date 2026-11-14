// ASSAULT-DEV (the owner's ask: "one thing i havent tested is the final assault on the army camp. make it so i can try them all in a
// developer mode with leveled units so it's accurate"; `docs/notes/assault-dev.md`). Settings, Developer, Try an Assault: any hold, its Last
// Hold or its Warband regrouped, stormed by the force a player really has when they get there, on a throwaway copy of the save.
//
// The force is read from the game's own progression data, not guessed:
//
// - THE LEVEL. A hold opens at its army's tenth star; the level a player has then is the hold's mark (`HOLD_MARK`, the level its share was
//   tuned at). The Last Hold falls last of all, so every other hold has fallen first: the heroes have at least the highest mark of the
//   others, which is the level cap. The Warband regrouped is a Mythic fight, the tier meant for levels 85 to 100 and measured as "a
//   level-100 fight" (`docs/notes/assault-2.md`): level 100.
// - THE DAY that level comes on, by the level pace (`npm run level-pace`, `docs/notes/level-100.md`), and THE RANK the party has on that day,
//   by the unlock pace (`node tools/unlockPace.mjs --ranks`: the five best-ranked heroes' mean whole rank, ranks 5 and 6 awakened).
// - THE TALENTS every row the level opens (the first of each pair, as `tools/army-pace` and `npm run balance -- --talents` learn them), and
//   THE SKILLS mastered (SKILLS-10: by level 40 every skill is at Level 5, `tools/skills/mastery.ts`).
// - THE CASTLE a climb has at that level (`castleAt` in `tools/army-pace/pace.ts`, copied here as it is).
// - THE HOST a full one, ten to a platoon, at the rank the castle's Drill Yard sends recruits (the balance tool's full host of recruits).
// - THE COUNCIL a full one, as the Last Hold's balance fields it (`npm run balance -- --assault <army> --last`): a warchief at Might 8,
//   captains at 6, 5, 5 and 4, lieutenants at 4, 3, 3, 3, 2, 2, 2 and 1, recruited by the Council's own rules on a side stream.
// - Not modelled: the gear and runes worn (no tool models a save's lasting gear by level, and every hold was tuned bare). The king's spells
//   are the save's own loadout, with the slots the stars open.
//
// "Strong" and "Weak" read the same model ten levels either side (Strong at the cap a rank higher instead), Strong with a full castle and a
// Veteran host. Pure rules: no Pixi, no DOM, no randomness but the seed's side stream. The save itself is never touched: `trialMeta` makes a
// deep copy and changes only that.

import { ARMIES, armyById, armyIndex } from '../armies';
import { BUILDINGS, maxLevel, newCastle, type BuildingId, type Castle } from '../castle';
import { recruit } from '../council';
import { HERO_KITS } from '../heroKits';
import { keyOf } from '../abilities';
import { MAX_LEVEL, xpFor } from '../levels';
import { MAX_RANK, RANK_SHARDS, type Meta } from '../meta';
import { newWar, type Nemesis } from '../nemesis';
type NemRank = Nemesis['rank'];
import { mixSeed, Rng } from '../rng';
import { USE_AT } from '../skillLevels';
import { slotsAtStars } from '../spellSlots';
import { learn, tierNodes } from '../talents';
import { UNITS } from '../units';
import { newAssault, PLATOON_SIZE, recruitMarks } from './economy';
import { HOLD_MARK } from './garrison';
import { HOLDS } from './holds';

/** Which storming of a hold: its first conquest, the Last Hold (every other hold fallen), or the Warband regrouped at Mythic. */
export type TrialKind = 'hold' | 'last' | 'regroup';
export type TrialStrength = 'expected' | 'strong' | 'weak';
/** Whose heroes storm it: the save's own party (when it has five), the balance tool's design party, or the recruits. */
export type TrialHeroes = 'party' | 'design' | 'recruits';

export interface TrialPick {
  army: string;
  kind: TrialKind;
  strength: TrialStrength;
  heroes: TrialHeroes;
}

export const TRIAL_KINDS: readonly { id: TrialKind; name: string; line: string }[] = [
  { id: 'hold', name: 'Conquest', line: 'the first storming, at its tenth star' },
  { id: 'last', name: 'The Last Hold', line: 'every other hold fallen, the whole Council on its walls' },
  { id: 'regroup', name: 'Regrouped', line: 'a conquered hold again, at Mythic' },
];
export const TRIAL_STRENGTHS: readonly { id: TrialStrength; name: string; line: string }[] = [
  { id: 'expected', name: 'As expected', line: 'the typical force' },
  { id: 'strong', name: 'Strong', line: '10 levels up, a full castle, Veterans' },
  { id: 'weak', name: 'Weak', line: '10 levels down' },
];
export const TRIAL_HEROES: readonly { id: TrialHeroes; name: string }[] = [
  { id: 'party', name: 'Your party' },
  { id: 'design', name: 'Balance party' },
  { id: 'recruits', name: 'The recruits' },
];
/** The balance tools' parties (`tools/assault/balance.ts`: the design party every hold was tuned with; the recruits of `difficulty.md`). */
export const DESIGN_PARTY: readonly string[] = ['knight', 'samurai', 'archer', 'wizard', 'dragoon'];
export const RECRUIT_PARTY: readonly string[] = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];

/** The armies with a hold, in the armies' order: every one can be tried. */
export const trialArmies = (): string[] => ARMIES.filter((a) => !!HOLDS[a.id]).map((a) => a.id);

/** The day a hero level comes on, by the level pace (`docs/notes/level-100.md`: the favourite of a daily player). */
export const DAY_AT_LEVEL: readonly (readonly [number, number])[] = [[1, 0], [10, 1], [20, 1], [30, 4], [40, 28], [50, 58], [60, 87], [70, 112], [80, 133], [90, 159], [100, 181]];
/** The party's mean whole rank on a day, by the unlock pace (`node tools/unlockPace.mjs --seeds 8 --days 200 --ranks`, 2026-11-14). */
export const RANK_AT_DAY: readonly (readonly [number, number])[] = [[0, 0], [1, 0.2], [7, 0.6], [14, 1.4], [30, 2.0], [60, 3.2], [90, 4.0], [120, 4.6], [150, 5.0], [180, 5.0]];
/** The Last Hold's Council by rank and Might (the balance tool's `--last`). */
export const COUNCIL_MIGHTS: readonly (readonly [NemRank, number])[] = [
  ['warchief', 8],
  ...[6, 5, 5, 4].map((x) => ['captain', x] as const),
  ...[4, 3, 3, 3, 2, 2, 2, 1].map((x) => ['lieutenant', x] as const),
];
/** The side stream the trial's Council is recruited on. */
export const TRIAL_SALT = 0xde7a55;
/** The crowns the trial's purse holds, for the muster's siege works and a recruit or two. */
export const TRIAL_CROWNS = 5000;
/** How far Strong and Weak read the model either side of the expected level. */
export const STRENGTH_LEVELS = 10;

/** A straight line between a table's points. */
function along(table: readonly (readonly [number, number])[], x: number): number {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    const [x0, y0] = table[i - 1];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return table[table.length - 1][1];
}

export const dayAtLevel = (level: number): number => Math.round(along(DAY_AT_LEVEL, level));
/** The whole rank (0 to 6) the party has at a hero level: the rank of the day that level comes on, rounded. */
export const rankAtLevel = (level: number): number => Math.max(0, Math.min(MAX_RANK + 2, Math.round(along(RANK_AT_DAY, dayAtLevel(level)))));

/** The level a player has at this storming, as expected. */
export function expectedLevel(army: string, kind: TrialKind): number {
  if (kind === 'hold') return HOLD_MARK[army] ?? MAX_LEVEL;
  // (the Last Hold: every other hold has fallen, so the heroes have at least the others' highest mark; the Warband regrouped: Mythic's level-100 fight)
  if (kind === 'last') return Math.max(HOLD_MARK[army] ?? 0, ...trialArmies().filter((a) => a !== army).map((a) => HOLD_MARK[a] ?? 0));
  return MAX_LEVEL;
}

/** The castle levels a climb has at a hero level (`tools/army-pace/pace.ts`'s `castleAt`): none to 30, 6 at 38, 13 at 40, 18 at 46, 22 at
 *  52, then a level more every two hero levels, spread over the buildings in this order, the lowest first. */
const SPREAD: BuildingId[] = (['barracks', 'armoury', 'library', 'treasury', 'stable', 'mage'] as BuildingId[]).filter((id) => id in BUILDINGS);
export function castleAtLevel(L: number): Castle {
  const ids = Object.keys(BUILDINGS) as BuildingId[];
  const most = ids.reduce((n, id) => n + maxLevel(id), 0);
  const pts: [number, number][] = [[30, 0], [38, 6], [40, 13], [46, 18], [52, 22]];
  let n = 0;
  if (L > 30) {
    n = Math.min(most, Math.round(22 + (L - 52) / 2));
    for (let i = 1; i < pts.length; i++)
      if (L <= pts[i][0]) {
        n = Math.round(pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (L - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0]));
        break;
      }
  }
  const c = newCastle();
  for (let k = 0; k < n; k++) {
    const open = [...SPREAD, ...ids.filter((id) => !SPREAD.includes(id))].filter((id) => c[id] < maxLevel(id));
    if (!open.length) break;
    c[open.sort((a, b) => c[a] - c[b])[0]]++;
  }
  return c;
}

/** A full castle (Strong, and the hold balance's own). */
export function fullCastle(): Castle {
  const c = newCastle();
  for (const id of Object.keys(BUILDINGS) as BuildingId[]) c[id] = maxLevel(id);
  return c;
}

/** The force a trial fields, in numbers (the picker's line and the tests read it). */
export interface TrialForce {
  level: number;
  /** The whole rank: 0 to 4 taken, 5 and 6 awakened. */
  rank: number;
  day: number;
  castle: Castle;
  castleLevels: number;
  /** The marks each soldier of the host joins with. */
  marks: number;
  /** The army tier the garrison stands at (Legendary, or Mythic regrouped). */
  tier: number;
}

export function trialForce(army: string, kind: TrialKind, strength: TrialStrength): TrialForce {
  const base = expectedLevel(army, kind);
  const level = strength === 'strong' ? Math.min(MAX_LEVEL, base + STRENGTH_LEVELS) : strength === 'weak' ? Math.max(1, base - STRENGTH_LEVELS) : base;
  let rank = rankAtLevel(level);
  // (Strong at the cap, where ten levels more is none: a rank higher instead)
  if (strength === 'strong' && level - base < STRENGTH_LEVELS) rank = Math.min(MAX_RANK + 2, rank + 1);
  const castle = strength === 'strong' ? fullCastle() : castleAtLevel(level);
  const castleLevels = (Object.keys(BUILDINGS) as BuildingId[]).reduce((n, id) => n + (castle[id] ?? 0), 0);
  const marks = strength === 'strong' ? Math.max(3, recruitMarks(castle)) : recruitMarks(castle);
  return { level, rank, day: dayAtLevel(level), castle, castleLevels, marks, tier: kind === 'regroup' ? 4 : 3 };
}

/** The heroes a trial fields: the save's party when it has five, else the design party; or one of the balance parties. */
export function trialHeroes(save: Pick<Meta, 'party'>, heroes: TrialHeroes): string[] {
  const own = save.party.filter((k) => !!UNITS[k]).slice(0, 5);
  if (heroes === 'party' && own.length === 5) return own;
  return [...(heroes === 'recruits' ? RECRUIT_PARTY : DESIGN_PARTY)];
}

/** A deep copy of a save (structured clone where the platform has it; the save is plain data either way). */
const copyOf = <T>(x: T): T => (typeof structuredClone === 'function' ? structuredClone(x) : (JSON.parse(JSON.stringify(x)) as T));

/**
 * The throwaway meta a trial is fought on: a deep copy of the save with the force of `trialForce`, a full Council, the hold's state as the
 * storming wants (the others conquered for the Last Hold; this one conquered for the Warband regrouped), every army open and the stars' spell
 * slots. The save is read, never changed.
 */
export function trialMeta(save: Meta, pick: TrialPick): Meta {
  const m = copyOf(save);
  const f = trialForce(pick.army, pick.kind, pick.strength);
  const party = trialHeroes(save, pick.heroes);
  m.party = [...party];
  for (const k of party) if (!m.unlocked.includes(k)) m.unlocked.push(k);
  // (every army open: the armies' gate is not the trial's business)
  m.opened = [...new Set([...(m.opened ?? []), ...ARMIES.map((a) => a.id)])];
  m.castle = { ...m.castle, ...f.castle };
  m.crowns = TRIAL_CROWNS;
  for (const k of party) {
    m.xp[k] = xpFor(f.level);
    const taken = Math.min(MAX_RANK, f.rank);
    m.shards[k] = taken ? RANK_SHARDS[taken - 1] : 0;
    (m.ranked ??= {})[k] = taken;
    (m.awakened ??= {})[k] = Math.max(0, f.rank - MAX_RANK);
    if (!m.awakened[k]) delete m.awakened[k];
    // (gear is not modelled: the trial's heroes go bare, as every hold was tuned)
    if (m.equipped) delete m.equipped[k];
    // (every talent row the level opens, the first of each pair)
    if (m.talents) delete m.talents[k];
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(m, k, n.id);
    // (SKILLS-10: by level 40 every skill is mastered)
    const kit = HERO_KITS()[k];
    if (kit) {
      const use = ((m.skillUse ??= {})[k] = {} as Record<string, number>);
      for (const s of kit.slots) use[keyOf(s.skill)] = f.level >= 40 ? USE_AT[USE_AT.length - 1] : 0;
    }
  }
  // (the spell slots this many stars open: ten on every army to this one)
  m.spellbook = { ...m.spellbook, slots: Math.max(m.spellbook.slots ?? 1, slotsAtStars(10 * (armyIndex(pick.army) + 1))) };
  // the War: a full Council, recruited before any hold falls (so its members come of every army, as a long War's do)
  const war = newWar();
  m.war = war;
  m.assault = newAssault();
  // (the war table's first-visit report has been read: a trial goes straight to the muster)
  m.assault.told = true;
  const rng = new Rng(mixSeed(save.seed, TRIAL_SALT, armyIndex(pick.army) + 1));
  for (const [rank, might] of COUNCIL_MIGHTS) {
    const n = recruit(war, m, rng);
    if (!n) break;
    n.rank = rank;
    n.might = might;
  }
  // the host: ten to a platoon
  for (const k of party) m.assault.troops[k] = Array(PLATOON_SIZE).fill(f.marks);
  // the holds fallen before this storming
  const day = 1;
  if (pick.kind === 'last') for (const a of trialArmies()) if (a !== pick.army) m.assault.conquered[a] = { day, tier: 3, wins: 1 };
  if (pick.kind === 'regroup') m.assault.conquered[pick.army] = { day, tier: 3, wins: 1 };
  return m;
}

/** The picker's line for a storming: "Lv 55 · rank 4 · castle 24 · Recruits". */
export function forceLine(army: string, kind: TrialKind, strength: TrialStrength): string {
  const f = trialForce(army, kind, strength);
  const rank = f.rank > MAX_RANK ? `rank 4, awakened ${f.rank - MAX_RANK === 1 ? 'I' : 'II'}` : `rank ${f.rank}`;
  const host = f.marks >= 3 ? 'Veterans' : f.marks >= 1 ? 'Blooded' : 'Recruits';
  return `Lv ${f.level} · ${rank} · castle ${f.castleLevels} · ${host}${f.tier === 4 ? ' · Mythic' : ''}`;
}

/** The hold's name and army for a picker row. */
export const trialTitle = (army: string): string => `${HOLDS[army]?.name ?? army} · ${armyById(army)?.name ?? army}`;
