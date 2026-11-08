// The Assault as the save sees it (phase 1, `docs/notes/assault-1.md`): the assault's input built from the save (each hero's boost as an army
// run's, at its third grade; each platoon's soldiers; the army's Council members at the hold and the warchief), and its settling (1.3 and 6):
//
// - the fallen are gone for good (each was struck from the save as it fell: `noteFallen`); the survivors earn their marks;
// - the heroes take a boss wave's XP at the army's Legendary tier, twice over on a win, half on a loss;
// - the War settles as after an army run (`noteWar`): the Council's members slain or fled, nemeses born by the same rules; a member slain on the
//   winning attempt cannot cheat death, and each slain pays twice the War Trophies;
// - a hold's first fall pays the Spoils of the Hold and the Conquest chest, and its tribute from then on.
//
// Pure rules: no Pixi, no DOM.

import type { Battle } from '../battle';
import type { Meta } from '../meta';
import { heroRank } from '../meta';
import { armyById, armyIndex, armyXpShare, bossOf, waveBoost, waveFoes } from '../armies';
import { armyRun, boostOf, type Owned } from '../run';
import { heroStats } from '../talents';
import { gainXp, levelOfKind, KILL_HP_SHARE, BOSS_KILL, XP_TAKE_PART, XP_WIN, type LevelUp } from '../levels';
import { snapOf, type NemNote } from '../nemesis';
import { warchiefOf } from '../muster';
import { decorate } from '../revenge';
import { noteWar } from '../council';
import { heroBoost } from '../castle';
import { mixSeed } from '../rng';
import { UNITS } from '../units';
import { isBoss } from '../foes';
import { FIRST_CLEAR_CHEST } from '../armyStars';
import type { AssaultInput, ApproachId, HoldState, PlatoonRole } from './holdTypes';
import { DEFAULT_ROLES } from './assault';
import { assaultOf, marksEarned, spoilsOf, TROPHY_MULT, troopsOf } from './economy';
import { MARKS_MAX } from './economy';
import { rankOf, type PlatoonFormation } from './troops';
import { siegeRefund } from './siege';

/** The grade the heroes fight at in the Assault: the late waves' merged third grade of an army run. */
export const ASSAULT_GRADE = 3;
/** An assault counts as fought (its survivors' mark for living through it, the heroes' XP) once it has lasted this long, or was won: a
 *  retreat sounded at the start is not a battle survived. */
export const FOUGHT_MS = 120_000;
/** The salt of a Conquest chest's seed. */
const CONQUEST_SALT = 0xc0a9e5;

/** The plan the muster screen sets: each platoon's approach and formation, by its hero's kind. */
export interface AssaultPlan {
  approaches: Record<string, ApproachId>;
  roles?: Record<string, PlatoonRole>;
  formations?: Record<string, PlatoonFormation>;
  /** The siege works bought for this assault (phase 1b). */
  siege?: { ladders?: string[]; ram?: string };
}

/** The party that storms the hold: the saved party, at most five. */
export const assaultParty = (m: Meta): string[] => m.party.filter((k) => !!UNITS[k]).slice(0, 5);

/** A hero's boost in the Assault: as an army run's (grade, rank, lasting level, its equipment and talents), at the third grade. */
export function assaultBoost(m: Meta, kind: string): ReturnType<typeof boostOf> {
  const h: Owned = { id: 1, kind, grade: ASSAULT_GRADE };
  return boostOf(h, heroRank(m, kind), levelOfKind(m, kind), heroStats(m, kind));
}

/** The opening plan's default: the first two platoons and the last over the Old Bridge, the third by the West Ford, the fourth by the East. */
export function defaultPlan(party: readonly string[]): AssaultPlan {
  const ways: ApproachId[] = ['bridge', 'bridge', 'west', 'east', 'bridge'];
  return { approaches: Object.fromEntries(party.map((k, i) => [k, ways[i % ways.length]])), roles: Object.fromEntries(party.map((k, i) => [k, DEFAULT_ROLES[i % DEFAULT_ROLES.length]])) };
}

/** The assault's input from the save: the party with its boosts, each platoon's soldiers, the plan, and the Council at the hold. */
export function assaultInput(m: Meta, army: string, seed: number, plan: AssaultPlan = defaultPlan(assaultParty(m)), sheets: Record<string, string> = {}): AssaultInput {
  const party = assaultParty(m);
  const war = m.war;
  const council = (war?.members ?? []).filter((n) => n.army === army && n.rank !== 'warchief' && !war?.away?.[String(n.id)]).map((n) => decorate(m, snapOf(n), n));
  const chief = warchiefOf(war);
  return {
    seed,
    army,
    heroes: party.map((kind) => ({ kind, boost: assaultBoost(m, kind), level: levelOfKind(m, kind), ...(sheets[kind] ? { sheet: sheets[kind] } : {}) })),
    troops: Object.fromEntries(party.map((k) => [k, troopsOf(m, k)])),
    approaches: plan.approaches,
    ...(plan.roles ? { roles: plan.roles } : {}),
    ...(plan.formations ? { formations: plan.formations } : {}),
    ...(plan.siege ? { siege: plan.siege } : {}),
    castle: heroBoost(m.castle),
    council,
    ...(chief ? { warchief: decorate(m, snapOf(chief), chief) } : {}),
  };
}

/** The XP each hero earns from an assault (1.5): a boss wave's at the army's Legendary tier, split among five, twice over on a win and half on
 *  a loss or withdrawal. */
export function assaultXp(army: string, won: boolean): number {
  const a = armyById(army)!;
  const n = a.waves.length;
  const st = waveBoost(a, n, 3);
  let kill = 0;
  waveFoes(a, n, 3).forEach((id, i) => {
    const def = UNITS[id];
    const boss = i === 0 && st.boss ? st.boss : undefined;
    const hp = def.hp * (st.foes?.hp ?? 1) * (boss?.hp ?? 1);
    kill += hp * KILL_HP_SHARE * (isBoss(id) ? BOSS_KILL : 1);
  });
  const each = (kill / 5 + XP_TAKE_PART + XP_WIN) * armyXpShare(a, 3);
  return Math.round(each * (won ? 2 : 0.5));
}

/** What an assault came to, for the result page. */
export interface AssaultResult {
  army: string;
  outcome: HoldState['outcome'];
  won: boolean;
  /** The attempt's number ("Assault 3"). */
  attempt: number;
  platoons: { hero: string; survivors: number; fallen: number; fallenRanks: Record<string, number>; promoted: number }[];
  xp: number;
  levelUps: LevelUp[];
  /** Crowns: the Spoils (first conquest) and the War's pay. */
  spoils: number;
  chest: boolean;
  war?: NemNote;
  /** The first conquest of this hold. */
  first: boolean;
  /** The crowns the siege works not used paid back. */
  refund: number;
}

/** Settle an assault into the save (its soldiers' kills as `stepAssault` counted them). */
export function settleAssault(m: Meta, b: Battle, day: number): AssaultResult {
  const h = b.field!.hold!;
  const kills = h.kills;
  const army = h.input.army;
  const won = h.outcome === 'won';
  const a = assaultOf(m);
  a.tries[army] = (a.tries[army] ?? 0) + 1;
  // (the scouts' report is spent: the hold's posts change before the next)
  if (a.scouted?.[army]) {
    delete a.scouted[army];
    if (!Object.keys(a.scouted).length) delete a.scouted;
  }
  const fought = won || b.t >= FOUGHT_MS;
  // the platoons: the fallen struck (already, as they fell: here again in case), the survivors' marks
  const platoons = h.platoons.map((pl) => {
    const list = a.troops[pl.hero] ?? [];
    const fallenRanks: Record<string, number> = {};
    let promoted = 0;
    let survivors = 0;
    let fallen = 0;
    for (const s of pl.soldiers) {
      const x = b.field!.byId[s.id];
      if (!x?.alive) {
        fallen++;
        const r = rankOf(s.marks).name;
        fallenRanks[r] = (fallenRanks[r] ?? 0) + 1;
        if (s.index < list.length) list[s.index] = -1;
        continue;
      }
      survivors++;
      const was = rankOf(s.marks).rank;
      const k = (kills[s.id] ?? 0) + (h.fortKills[s.id] ?? 0);
      const marks = Math.min(MARKS_MAX, s.marks + (fought ? marksEarned(k, won) : Math.floor(k / 3)));
      if (rankOf(marks).rank !== was) promoted++;
      if (s.index < list.length && list[s.index] >= 0) list[s.index] = marks;
    }
    a.troops[pl.hero] = list.filter((x) => x >= 0);
    return { hero: pl.hero, survivors, fallen, fallenRanks, promoted };
  });
  // (the siege works not used paid back: a ladder never put up, the ram still standing)
  const refund = siegeRefund(b, h);
  m.crowns += refund;
  // the heroes' XP
  const xp = fought ? assaultXp(army, won) : 0;
  const levelUps = gainXp(m, Object.fromEntries(h.platoons.map((pl) => [pl.hero, xp])));
  // the War: as an army run's settle, on the Legendary tier
  let war: NemNote | undefined;
  if (m.war) {
    const run = armyRun(h.input.seed, army, h.platoons.map((p) => p.hero), m.castle, 3);
    run.mode = { kind: 'army', army, tier: 3, assault: true };
    const members = [...(h.input.council ?? []), ...(h.input.warchief ? [h.input.warchief] : [])];
    if (members.length) run.nemesis = { members, waves: { '1': members.map((x) => x.id) } };
    war = noteWar(m, run, b, undefined, won, 1, day);
    if (war.trophies && m.war) m.war.trophies += war.trophies * (TROPHY_MULT - 1);
  }
  // a hold's first fall: the Spoils, the Conquest chest, and its tribute from then on
  let spoils = 0;
  let chest = false;
  const first = won && !a.conquered[army];
  if (won) {
    if (first) {
      spoils = spoilsOf(army);
      m.crowns += spoils;
      m.stash.push({ army, at: FIRST_CLEAR_CHEST[3], tier: 3, seed: mixSeed(m.seed, CONQUEST_SALT, armyIndex(army) + 1), conquest: true });
      chest = true;
      a.conquered[army] = { day, tier: 3, wins: 1 };
    } else a.conquered[army].wins++;
  }
  return { army, outcome: h.outcome, won, attempt: a.tries[army], platoons, xp, levelUps, spoils, chest, war, first, refund };
}

/** The name of the army's lord for the muster's line: the warchief's, if one sits, else the army's last boss's. */
export function lordLine(m: Meta, army: string): string {
  const chief = warchiefOf(m.war);
  if (chief) return `${chief.name} ${chief.epithet}`.trim();
  return UNITS[bossOf(armyById(army)!)].name;
}
