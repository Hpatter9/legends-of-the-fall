// The Nemesis War, phase 1: named and remembered (`docs/design/legends-expansion.md`, sections 2.1 to 2.4 and 2.11; `docs/notes/nemesis-1.md`).
// A boss, a named elite or (rarely) an escort that slays, maims or escapes the heroes is named: a name from its army's bank, an epithet, Might
// 1, one trait read from what actually happened in the fight (`nemesisLog.ts`), and the Dread of the hero who hurt it most. A nemesis met
// again is promoted by each deed (+1 Might at most a run), and slaying one pays crowns by its Might. The War opens on the save's first Normal
// clear of the Undead Legion; a nemesis meets the heroes again in its own army's runs, as a captain at a boss wave or a lieutenant in an
// ordinary one, frozen into the run as it starts (`Run.nemesis`, as `Run.bonds` is), so every fight replays.
//
// Randomness: births and fates at settle draw from `new Rng(mixSeed(run.seed, NEMESIS_SALT, wave))`, and where nemeses stand in a run from
// `mixSeed(run.seed, PLACE_SALT)`: side streams, never the fight's. Pure rules: no Pixi, no DOM.
//
// Phase 2 (`docs/notes/nemesis-2.md`): the Council's turns between runs, loyalty, the warchief's seat, the War News, the Fallen, the War
// Trophies and the Warchief's Muster live in `council.ts` and `muster.ts`; this file keeps the members, their meetings and the save.

import type { Battle, Unit } from './battle';
import { ARMIES, armyById, recordOf } from './armies';
import { ELITE_FOES } from './eliteFoes';
import { isBoss } from './foes';
import { heroName } from './heroNames';
import type { Meta } from './meta';
import { NEMESIS_NAMES } from './nemesisNames';
import { blankLog, type FoeLog, type NemesisTally } from './nemesisLog';
import { addTrait, canAdd, CALLINGS, dreadOf, MAX_WEAK, secondWeakPool, TRAITS, type NemRank, type UnitNem } from './nemesisTraits';
import { mixSeed, Rng } from './rng';
import type { Run } from './run';
import { TIERS } from './tiers';
import { UNITS } from './units';
import { callingOf } from './weakness';
import { fieldedHero } from './fightStats';

/** The side streams: births and fates at settle, and where the nemeses stand in a run. */
export const NEMESIS_SALT = 0x4e3e51;
export const PLACE_SALT = 0x4e3e52;

/** The seats: one warchief, four captains, eight lieutenants (the warchief's seat is filled by the Council's turns, `council.ts`). */
export const SEATS: Readonly<Record<NemRank, number>> = { warchief: 1, captain: 4, lieutenant: 8 };
/** Might runs from 1 to 10. */
export const MIGHT_MAX = 10;
/** A nemesis keeps this many memory lines, and the War this many fallen. */
export const MEMORY_MAX = 8;
export const FALLEN_MAX = 30;
/** The chance a deed names a foe: a boss or an elite, and an escort (only a killing blow, and only while a lieutenant's seat is free or its holder is at Might 1). */
export const BIRTH = { slew: { boss: 1, elite: 1, escort: 0.35 }, maimed: { boss: 0.6, elite: 0.6, escort: 0 }, escaped: { boss: 1, elite: 1, escort: 0 } } as const;
/** A lieutenant stands in an ordinary wave from this wave on, this often, at most this many waves a run. */
export const LIEUTENANT = { from: 3, chance: 0.25, most: 2 };
/** Pay for slaying one, crowns per Might (a duel, a trophy brought home and Vengeance, the later phases, double it). */
export const PAY: Readonly<Record<NemRank, number>> = { warchief: 200, captain: 80, lieutenant: 40 };

/** How strong a nemesis is in its wave, on top of the army's own wave strength and tier: a lieutenant or captain from its base foe's stats
 *  (raised to a named fighter's level: the design's starting x2.0 / x1.3 and x3.5 / x1.5, tuned in phase 1 so that a run of one army holding
 *  four nemeses at Might 3 stays within a try of a run with none, `docs/notes/nemesis-1.md`), and per Might; a boss nemesis per Might on its boss's own wall. Normal takes half the Might. */
export const RANK_STATS: Readonly<Record<NemRank, { hp: number; atk: number }>> = { lieutenant: { hp: 1.75, atk: 1.25 }, captain: { hp: 2.5, atk: 1.35 }, warchief: { hp: 2.5, atk: 1.35 } };
export const PER_MIGHT = { named: { hp: 0.06, atk: 0.035 }, boss: { hp: 0.03, atk: 0.02 } };
export const SCAR_HP = 0.03;
/** Normal's share of a nemesis's Might (the owner's answer: the War touches Normal, at half Might). */
export const NORMAL_MIGHT = 0.5;

export type Deed = 'slew' | 'maimed' | 'escaped';

export interface Nemesis {
  id: number;
  /** The fighter it fights as (`UNITS`): its boss, its elite or its escort's kind. */
  base: string;
  /** Its home army (it meets the heroes only in that army's runs). */
  army: string;
  name: string;
  epithet: string;
  rank: NemRank;
  /** Born a boss: it stands as that boss in its own wave. */
  boss?: true;
  /** Loyalty to its superior (0 to 100; the Council's turns move it). */
  loyalty: number;
  might: number;
  scars: number;
  traits: string[];
  weak: string[];
  /** The traits and weaknesses revealed to the player. */
  known: string[];
  /** The trait that gave the epithet (never replaced). */
  mark?: string;
  /** Up to `MEMORY_MAX` short lines it keeps, newest first. */
  memory: string[];
  /** Meetings, meetings lost (it fell), and the war turn of its birth. */
  met: number;
  lost: number;
  born: number;
  /** The seed of the run it last gained Might in (+1 a run at most). */
  grew?: number;
  /** The captain a lieutenant is sworn to (phase 2: the Council's lines; none while no captain has room). */
  sworn?: number;
  /** Its blood-oath brother's id (a Council turn's Blood-oath). */
  oath?: number;
  /** The hero kind it is Vengeful against (its blood-oath brother fell to that hero): +20% damage to that hero, which it goes for first. */
  vengeful?: string;
  /** Its meetings in a row: won (it lived and the heroes lost) counts up, lost counts down. */
  streak?: number;
  // (phase 3, `revenge.ts`: revenge, trophies and taunts)
  /** The trophies it took from the heroes who humiliated it (at most two): each +5% attack, and a taunt's line. */
  trophies?: NemTrophy[];
  /** The hero kind who last humiliated it (the taunts' "humiliated" line). */
  shamed?: string;
  /** The hero kinds it maimed (the taunts' "maimed" line), newest first, four at most. */
  maimed?: string[];
  /** How often it has escaped the heroes (a fight lost round it, or it fled). */
  fled?: number;
  /** Stitched: it cheated death, and once, at 0 hp, it stands again at 20%. */
  stitched?: true;
  /** Its taunt cut-in has played in full once (the first meeting always does). */
  seen?: true;
  /** A warchief made Stitched while he holds the seat: once a seat holding (it is cleared when he is crowned). */
  chiefStitch?: true;
}

/** A trophy a humiliated nemesis took: the hero's piece in the first filled slot of weapon, shield, helm or charm, drawn with that piece's own
 *  gear icon. The hero keeps the piece; the trophy is a story and an overlay. */
export interface NemTrophy {
  kind: string;
  slot: string;
  item: number;
  base: string;
  rarity: number;
}

export interface FallenNemesis {
  id: number;
  name: string;
  epithet: string;
  base: string;
  army: string;
  rank: NemRank;
  might: number;
  /** The hero kind that struck the last blow ('' when none did). */
  by: string;
  /** How it fell: slain in a wave, at the Warchief's Muster, or by a rival of the Council (a feud, a trial, a betrayal; `foe` names the
   *  rival). The later phases add a duel and Vengeance. */
  how: 'slain' | 'muster' | 'council' | 'duel';
  /** Phase 3: it fell to an Avenger's blow (Vengeance), and the trophies it carried came home. */
  vengeance?: true;
  reclaimed?: number;
  tier: number;
  /** The Council member who slew it (`how: 'council'`). */
  foe?: string;
  /** The war turn it fell on. */
  turn?: number;
}

/** A line of the War News (`council.ts`): the turn, what happened and its words. */
export type NewsKind = 'cheated' | 'recruit' | 'promotion' | 'feud' | 'betrayal' | 'feast' | 'trial' | 'oath' | 'desertion' | 'claim' | 'crowned' | 'named' | 'slain' | 'muster' | 'fled' | 'humiliated' | 'vengeance' | 'reclaimed' | 'duel';
export interface WarNews {
  turn: number;
  kind: NewsKind;
  text: string;
}

/** A Warchief's Head: a slain warchief's trophy for the castle (one per warchief). */
export interface WarHead {
  name: string;
  base: string;
  army: string;
  might: number;
  turn: number;
}

export interface War {
  v: 1;
  /** Council turns taken (the COUNCIL_SALT counter, `council.ts`). */
  turn: number;
  members: Nemesis[];
  fallen: FallenNemesis[];
  nextId: number;
  /** The War News: the last `NEWS_MAX` lines, newest first. */
  news: WarNews[];
  /** Captains slain since the last Muster (the Muster opens at two, `muster.ts`). */
  musterSince: number;
  /** War Trophies held (spent in the Spoils). */
  trophies: number;
  /** The trophies won on a day (the cap of twelve). */
  trophyDay?: { key: number; got: number };
  /** The unlock shards bought in a week (the cap of two). */
  shardWeek?: { key: number; got: number };
  /** The Council's turns counted on a day: after runs (at most four) and the day's first visit (one). */
  day?: { key: number; turns: number; visit?: true };
  /** The captain who has claimed the empty warchief's seat (he takes it on the next turn unless challenged). */
  claim?: number;
  /** The Warchief's Heads taken. */
  heads?: WarHead[];
  /** Phase 3: humiliated members licking their wounds, by id: their army's runs still to sit out (1 to 3). */
  away?: Record<string, number>;
  /** Pieces brought home from a slain nemesis's trophies (their cards say "Reclaimed"), newest first. */
  reclaimed?: number[];
  /** Vengeance scenes waiting to play at the camp: "avenger>fallen" pairs. */
  vengeance?: string[];
}

/** The War News keeps this many lines, and the War this many Warchief's Heads. */
export const NEWS_MAX = 40;
export const HEADS_MAX = 30;
/** The pieces kept as "Reclaimed" (phase 3). */
export const RECLAIMED_MAX = 60;

export const newWar = (): War => ({ v: 1, turn: 0, members: [], fallen: [], nextId: 1, news: [], musterSince: 0, trophies: 0 });

/** The War opens on the save's first Normal clear of the Undead Legion. */
export const warGate = (m: Pick<Meta, 'armies'>): boolean => recordOf(m as Meta, 'undead').clears > 0;
/** Open the War if its gate is met (a save already past it opens on its next load: `loadMeta`). Returns whether it opened now. */
export function openWar(m: Meta): boolean {
  if (m.war || !warGate(m)) return false;
  m.war = newWar();
  return true;
}

// ---- who may be named --------------------------------------------------------------------------------------------------------

/** What kind of foe a fighter is, for the War: a boss, a named elite, an escort, or none (summons, raised dead, the daily's, things). */
export function foeClass(u: Pick<Unit, 'def' | 'side' | 'owner' | 'raised'>): 'boss' | 'elite' | 'escort' | null {
  if (u.side !== 'foe' || u.owner !== undefined || u.raised !== undefined) return null;
  const def = UNITS[u.def];
  if (!def || def.summon) return null;
  if (isBoss(u.def)) return 'boss';
  if (ELITE_FOES[u.def]) return 'elite';
  return 'escort';
}

/** The home army of a fighter: the army whose waves hold it, else the army whose troops share its look (an elite, a Calamity boss). */
export function homeArmy(def: string): string | undefined {
  const own = ARMIES.find((a) => a.waves.some((w) => w.foes.includes(def)));
  if (own) return own.id;
  const sheet = UNITS[def]?.sheet;
  return sheet ? ARMIES.find((a) => a.waves.some((w) => w.foes.some((f) => UNITS[f]?.sheet === sheet)))?.id : undefined;
}

// ---- the snapshot a run takes ------------------------------------------------------------------------------------------------

/** A nemesis as a run met it, frozen as the run began. */
export interface NemSnap {
  id: number;
  base: string;
  name: string;
  epithet: string;
  rank: NemRank;
  boss?: true;
  might: number;
  scars: number;
  traits: string[];
  weak: string[];
  /** The hero kind it is Vengeful against. */
  vengeful?: string;
  // (phase 3, set by `revenge.ts` as the run begins)
  /** Its home army (its taunts' voice). */
  army?: string;
  trophies?: NemTrophy[];
  /** The Grudges on it, by hero kind: the extra share of damage (0.1 a step). */
  grudge?: Record<string, number>;
  /** Its Avengers, by kind: the Sworn partner -> the hero it slew. */
  avengers?: Record<string, string>;
  /** Dynasties, phase 6 (`heirs.ts`): the kinds whose fielded bearer bears a Blood Grudge on it (a parent was slain by it): +15% against it. */
  blood?: string[];
  stitched?: true;
  /** What its taunts are made from: the heroes it slew and maimed, who humiliated it, how often it escaped, its meetings. */
  slew?: string[];
  maimed?: string[];
  shamed?: string;
  fled?: number;
  met?: number;
  seen?: true;
  /** Phase 4 (`duel.ts`): its challenge was refused this run, so it is Mocking: +5% attack for the rest of the run. */
  mocking?: true;
}

/** `Run.nemesis`: the members met this run and the waves they stand in (wave number -> member ids). */
export interface RunNemesis {
  members: NemSnap[];
  waves: Record<string, number[]>;
}

export const snapOf = (n: Nemesis): NemSnap => ({ id: n.id, base: n.base, name: n.name, epithet: n.epithet, rank: n.rank, ...(n.boss ? { boss: true as const } : {}), might: n.might, scars: n.scars, traits: [...n.traits], weak: [...n.weak], ...(n.vengeful ? { vengeful: n.vengeful } : {}) });

/**
 * Where the War's members of a run's army stand in it, fixed as the run begins: a boss nemesis at its own boss's wave; a captain born an
 * escort or an elite at a mid-boss wave, beside the boss; a lieutenant in an ordinary wave from wave 3, a quarter of the waves, at most two a
 * run. Undefined when none stands (a run of another mode, an army with no members). Its own stream (`PLACE_SALT`).
 */
export function planNemeses(war: War | undefined, run: Run): RunNemesis | undefined {
  if (!war || run.mode?.kind !== 'army') return undefined;
  const army = ARMIES.find((a) => a.id === (run.mode as { army: string }).army);
  if (!army) return undefined;
  const mine = war.members.filter((n) => n.army === army.id);
  if (!mine.length) return undefined;
  const rng = new Rng(mixSeed(run.seed, PLACE_SALT));
  const waves: Record<string, number[]> = {};
  const put = (wave: number, id: number) => (waves[String(wave)] ??= []).push(id);
  const byMight = (a: Nemesis, b: Nemesis) => b.might - a.might || a.id - b.id;
  // (a boss nemesis stands as its boss, at the waves where that boss leads)
  for (const n of mine.filter((x) => x.boss)) {
    army.waves.forEach((w, i) => {
      if (w.boss && w.foes[0] === n.base) put(i + 1, n.id);
    });
  }
  // (a warchief of no boss's look stands beside his army's last boss: the final boss of its own army's runs, phase 2)
  const chief = mine.find((x) => !x.boss && x.rank === 'warchief');
  const last = army.waves.length;
  if (chief && army.waves[last - 1]?.boss === 'final') put(last, chief.id);
  // (a captain of no boss's look stands beside the mid-boss: one to a mid-boss wave, the mightiest first)
  const mids = army.waves.map((w, i) => (w.boss === 'mid' ? i + 1 : 0)).filter((i) => i && !waves[String(i)]?.length);
  const captains = mine.filter((x) => !x.boss && x.rank === 'captain').sort(byMight);
  captains.slice(0, mids.length).forEach((n, i) => put(mids[i], n.id));
  // (the lieutenants: an ordinary wave from wave 3 now and then)
  const lieutenants = mine.filter((x) => !x.boss && x.rank === 'lieutenant').sort(byMight);
  let used = 0;
  for (let w = LIEUTENANT.from; w <= army.waves.length && used < Math.min(LIEUTENANT.most, lieutenants.length); w++) {
    if (army.waves[w - 1].boss) continue;
    if (rng.next() < LIEUTENANT.chance) put(w, lieutenants[used++].id);
  }
  const ids = new Set(Object.values(waves).flat());
  if (!ids.size) return undefined;
  return { members: mine.filter((n) => ids.has(n.id)).map(snapOf), waves };
}

/** One nemesis put into a wave: the band's place it takes, what the fight knows of it, and its hp and attack on top of the wave's own. */
export interface NemPlace {
  at: number;
  nem: UnitNem;
  hp: number;
  atk: number;
  /** A warchief standing as his wave's boss (the Muster): he changes form at half health (`bossPhases.ts`, `CHIEF_PHASE`). */
  chief?: true;
}

/** Each trophy a nemesis carries gives it this much more attack (phase 3), and it carries at most this many. */
export const TROPHY_ATK = 0.05;
/** A nemesis whose duel was refused is Mocking for the rest of the run: this much more attack (phase 4). */
export const MOCKING_ATK = 0.05;
export const TROPHIES_MAX = 2;

/** A nemesis's hp and attack multipliers on top of its place in the wave (its rank, Might and scars, its trophies; Normal at half Might). */
export function nemStats(s: Pick<NemSnap, 'rank' | 'boss' | 'might' | 'scars' | 'trophies' | 'mocking'>, tier: number): { hp: number; atk: number } {
  const m = Math.max(1, Math.min(MIGHT_MAX, s.might)) * (tier > 0 ? 1 : NORMAL_MIGHT);
  const per = s.boss ? PER_MIGHT.boss : PER_MIGHT.named;
  const rank = s.boss ? { hp: 1, atk: 1 } : RANK_STATS[s.rank];
  const kept = Math.min(TROPHIES_MAX, s.trophies?.length ?? 0);
  return { hp: rank.hp * (1 + per.hp * m) * (1 + SCAR_HP * s.scars), atk: rank.atk * (1 + per.atk * m) * (1 + TROPHY_ATK * kept) * (s.mocking ? 1 + MOCKING_ATK : 1) };
}

/**
 * A wave's band with its nemeses in it: a boss nemesis is the band's boss (its first); any other takes an escort's place, from the back of
 * the band, so later waves do not simply grow longer. The band is unchanged and the list empty when none stands in the wave.
 */
export function nemesisBand(rn: RunNemesis | undefined, wave: number, band: readonly string[], tier: number): { band: readonly string[]; place: NemPlace[] } {
  const ids = rn?.waves[String(wave)];
  if (!rn || !ids?.length) return { band, place: [] };
  const out = [...band];
  const place: NemPlace[] = [];
  let back = out.length - 1;
  for (const id of ids) {
    const s = rn.members.find((x) => x.id === id);
    if (!s) continue;
    let at: number;
    // (a boss nemesis is its own boss; a warchief stands as the boss of a wave whose leader is his kind, the Muster's last)
    const lead = (s.boss || s.rank === 'warchief') && out[0] === s.base;
    if (lead) at = 0;
    else {
      // (never the boss's own place)
      while (back > 0 && place.some((p) => p.at === back)) back--;
      if (back <= 0 && out.length > 1) continue;
      at = back > 0 ? back : out.length;
      out[at] = s.base;
    }
    const avengers = s.avengers ? Object.keys(s.avengers) : [];
    place.push({ at, nem: { id: s.id, name: fullName(s), rank: s.rank, ...(s.scars ? { scars: s.scars } : {}), traits: [...s.traits], weak: [...s.weak], ...(s.vengeful ? { veng: s.vengeful } : {}), ...(s.grudge && Object.keys(s.grudge).length ? { grudge: { ...s.grudge } } : {}), ...(avengers.length ? { avengers } : {}), ...(s.blood?.length ? { blood: [...s.blood] } : {}), ...(s.stitched ? { stitched: true as const } : {}), ...(s.trophies?.length ? { trophies: s.trophies.slice(0, TROPHIES_MAX).map((t) => ({ base: t.base, rarity: t.rarity })) } : {}) }, ...nemStats(lead ? { ...s, boss: true } : s, tier), ...(lead && s.rank === 'warchief' && !s.boss ? { chief: true as const } : {}) });
  }
  return { band: out, place };
}

// ---- reading a fight ---------------------------------------------------------------------------------------------------------

/** What a fight meant for the War, for the page's lines. */
export interface NemNote {
  /** `uid`: the fighter's unit id in the fight (phase 3 reads who slew whom). */
  born: { id: number; name: string; epithet: string; base: string; rank: NemRank; deed: Deed; uid?: number }[];
  /** Phase 3: the nemeses who fled the board (escaped, not slain). */
  fled?: number[];
  grew: { id: number; name: string; epithet: string; might: number }[];
  slain: { id: number; name: string; epithet: string; crowns: number; by: string; rank: NemRank; might: number; base: string; army: string }[];
  /** The nemeses who stood in the fight and lived while the heroes lost (their underlings' loyalty rises, `council.ts`). */
  held: number[];
  /** What the War did besides (`council.ts`: trophies, a Council turn's news, the Muster opening), for the page's lines. */
  council?: string[];
  /** War Trophies won by the fight. */
  trophies?: number;
  /** A secret learned of a nemesis met ("Morrow the Unburnt: Fireproof"). */
  learned: string[];
  /** The War opened with this fight. */
  opened?: true;
  crowns: number;
}

/** The trait a fight earned a foe, read from its log, in the design's order (what it suffered, then what it did). */
export function traitsEarned(f: FoeLog, u: Unit, b: Battle, tally: NemesisTally, won: boolean): string[] {
  const out: string[] = [];
  const max = Math.max(1, u.maxHp);
  const alive = u.alive;
  const timedOut = !won && b.units.some((x) => x.alive && x.side === 'hero' && fieldedHero(x));
  // (what it suffered)
  if ((f.ailHits.burn ?? 0) >= 3 || (f.ailDmg.burn ?? 0) >= max * 0.15) out.push('fireproof');
  if ((f.laid.freeze ?? 0) + (f.laid.chill ?? 0) >= 2) out.push('rime');
  if ((f.ailDmg.poison ?? 0) >= max * 0.15) out.push('venom');
  if ((f.ailDmg.bleed ?? 0) >= max * 0.15) out.push('thick');
  if ((f.laid.shock ?? 0) >= 2 || f.arcs > 0) out.push('grounded');
  if ((f.laid.stun ?? 0) >= 2) out.push('ironSkull');
  if ((f.laid.fear ?? 0) >= 1) out.push('fearless');
  if (f.taken > 0 && f.shots >= f.taken / 2) out.push('arrowCatcher');
  if (f.taken > 0 && f.melee >= f.taken / 2) out.push('scarred');
  if (f.moved > 0) out.push('sureFooted');
  if (f.spells >= 2) out.push('spellScorned');
  if (f.eidolon > 0 && alive) out.push('hornDeaf');
  if (alive && u.hp < max * 0.2) out.push('survivor');
  // (what it did)
  for (const k of f.slew) {
    const c = callingOf(k);
    if (c && !out.includes(`bane:${c}`)) out.push(`bane:${c}`);
  }
  const topHealer = Object.entries(tally.healed).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
  if (f.slew.some((k) => callingOf(k) === 'devout' || k === topHealer)) out.push('healerHunter');
  if (f.slew.length >= 2) out.push('executioner');
  if (f.first !== undefined && f.first < 5000) out.push('ambusher');
  if (alive && timedOut) out.push('elusive');
  const dealt = Object.values(f.dealt).reduce((n, x) => n + x, 0);
  if (dealt > 0 && f.high >= dealt * 0.4) out.push('hillKing');
  const end = u.diedAt ?? b.t;
  const escorts = b.units.filter((x) => x !== u && x.side === 'foe' && x.owner === undefined && !UNITS[x.def]?.summon && x.raised === undefined);
  if (escorts.length && escorts.every((x) => !x.alive && (x.diedAt ?? 0) <= end - 10_000)) out.push('loneWolf');
  return out;
}

/** The deeds a foe did in a fight (the strongest first). */
export function deedsOf(f: FoeLog, u: Unit, b: Battle, won: boolean): Deed[] {
  const out: Deed[] = [];
  if (f.slew.length) out.push('slew');
  const heroes = new Map(b.units.filter((x) => x.side === 'hero').map((x) => [x.id, x]));
  const maimed = (u.alive && Object.entries(f.dealt).some(([id, d]) => d >= (heroes.get(Number(id))?.maxHp ?? Infinity) * 0.5)) || f.low.some((id) => heroes.get(id)?.alive);
  if (maimed) out.push('maimed');
  if (u.alive && !won) out.push('escaped');
  return out;
}

/** The hero kind that dealt a foe the most (its Dread); else the fight's top dealer among the heroes. */
function dreadFor(f: FoeLog | undefined, b: Battle): string | undefined {
  const top = Object.entries(f?.by ?? {}).sort((a, c) => c[1] - a[1] || (a[0] < c[0] ? -1 : 1))[0]?.[0];
  if (top) return top;
  return b.units.filter((x) => fieldedHero(x)).sort((a, c) => (c.dealt ?? 0) - (a.dealt ?? 0) || a.id - c.id)[0]?.def;
}

const heroWords = (k: string): string => `${heroName(k)} the ${UNITS[k]?.name ?? k}`;
const memoryLine = (deed: Deed, f: FoeLog, b: Battle, army: string, tier: number, wave: number): string => {
  const where = `${armyById(army)?.name ?? army} · ${TIERS[tier]?.name ?? 'Normal'} · wave ${wave}`;
  if (deed === 'slew') return `Slew ${f.slew.map(heroWords).join(' and ')} · ${where}`;
  if (deed === 'maimed') {
    const top = Object.entries(f.dealt).sort((a, c) => c[1] - a[1])[0]?.[0];
    const k = b.units.find((x) => x.id === Number(top))?.def;
    return `Maimed ${k ? heroWords(k) : 'a hero'} · ${where}`;
  }
  return `Escaped the heroes · ${where}`;
};
export const remember = (n: Nemesis, line: string): void => {
  n.memory.unshift(line);
  n.memory.length = Math.min(n.memory.length, MEMORY_MAX);
};

/** The name a newborn takes: one its army's bank has not given to a member or a fallen nemesis yet. */
export function nameFor(war: War, army: string, rng: Rng): string {
  const bank = NEMESIS_NAMES[army] ?? NEMESIS_NAMES.orcs;
  const used = new Set([...war.members.map((n) => n.name), ...war.fallen.map((n) => n.name)]);
  const free = bank.filter((x) => !used.has(x));
  if (free.length) return rng.pick(free);
  // (a bank spent: an old name comes round again, numbered)
  const base = rng.pick(bank);
  let i = 2;
  while (used.has(`${base} ${roman(i)}`)) i++;
  return `${base} ${roman(i)}`;
}
const roman = (n: number): string => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? String(n);

/** The seat a newborn of this class takes: a boss is a captain (a lieutenant when the captains are full), any other a lieutenant. A
 *  lieutenant's seat may be taken from a holder at Might 1 (`displace`). Null: no seat. */
function seatFor(war: War, cls: 'boss' | 'elite' | 'escort'): { rank: NemRank; displace?: Nemesis } | null {
  const count = (r: NemRank) => war.members.filter((n) => n.rank === r).length;
  if (cls === 'boss' && count('captain') < SEATS.captain) return { rank: 'captain' };
  if (count('lieutenant') < SEATS.lieutenant) return { rank: 'lieutenant' };
  const weak = war.members.filter((n) => n.rank === 'lieutenant' && n.might <= 1).sort((a, b) => a.met - b.met || a.id - b.id)[0];
  return weak ? { rank: 'lieutenant', displace: weak } : null;
}

/** Reveal one secret of a nemesis (the first not yet known). Returns its words, if one was. */
export function reveal(n: Nemesis): string | undefined {
  const s = [...n.traits, ...n.weak].find((x) => !n.known.includes(x));
  if (!s) return undefined;
  n.known.push(s);
  return s;
}
/** A secret's short name ("Fireproof", "Dread of Kwame"). */
export const secretName = (s: string): string => (TRAITS[s] ? TRAITS[s].name : s.startsWith('dread:') ? `Dread of ${heroName(s.slice(6))}` : s.startsWith('fears:') ? `Fears ${s.slice(6)}` : s === 'hatesHeights' ? 'Hates heights' : s);
/** The name and epithet together ("Morrow the Unburnt", "Gash, Kwame's Bane"). */
export const fullName = (n: Pick<Nemesis, 'name' | 'epithet'>): string => (!n.epithet ? n.name : n.epithet.startsWith('the ') || n.epithet.startsWith('of ') ? `${n.name} ${n.epithet}` : `${n.name}, ${n.epithet}`);

/** Add Might for a deed (+1 a run at most); a second weakness comes with Might 5. */
function grow(n: Nemesis, run: Run, rng: Rng, f: FoeLog | undefined): boolean {
  if (n.grew === run.seed || n.might >= MIGHT_MAX) return false;
  n.might++;
  n.grew = run.seed;
  if (n.might >= 5 && n.weak.length < MAX_WEAK) {
    const pool = secondWeakPool(n.traits);
    // (weighted by its history: the element that hurt it most this fight weighs more)
    const weight = (w: string) => 1 + (w.startsWith('fears:') ? (f?.ailDmg[{ fire: 'burn', frost: 'chill', storm: 'shock', venom: 'poison' }[w.slice(6)] as 'burn'] ?? 0) / 50 : 0);
    const total = pool.reduce((s, w) => s + weight(w), 0);
    let r = rng.next() * total;
    const pick = pool.find((w) => (r -= weight(w)) < 0) ?? pool[pool.length - 1];
    n.weak.push(pick);
  }
  return true;
}

/**
 * Settle a fight for the War (called where `noteBonds` is): the nemeses met are slain (and pay) or promoted by their deeds; the foes who
 * slew, maimed or escaped are named. Only an army run's waves and the Calamity's fights count (never the daily, the Last Stand or a quest),
 * and only once the War is open; the War opens on the Undead Legion's first Normal clear. Returns what happened, for the page.
 */
export function noteNemesis(m: Meta, run: Run, b: Battle, tally: NemesisTally | undefined, won: boolean, wave: number): NemNote {
  const note: NemNote = { born: [], grew: [], slain: [], learned: [], held: [], crowns: 0 };
  const war = m.war;
  const kind = run.mode?.kind;
  if (war && (kind === 'army' || kind === 'calamity' || kind === 'muster') && b.phase !== 'deploy') settle(war, m, run, b, tally ?? { foes: {}, healed: {}, had: {} }, won, wave, note);
  if (openWar(m)) note.opened = true;
  return note;
}

function settle(war: War, m: Meta, run: Run, b: Battle, tally: NemesisTally, won: boolean, wave: number, note: NemNote): void {
  const rng = new Rng(mixSeed(run.seed, NEMESIS_SALT, wave));
  const tier = run.mode?.kind === 'army' || run.mode?.kind === 'muster' ? run.mode.tier ?? 0 : 0;
  const army = run.mode?.kind === 'army' || run.mode?.kind === 'muster' ? run.mode.army : undefined;
  // (phase 4: one slain in single combat fell in a duel)
  const how: FallenNemesis['how'] = run.mode?.kind === 'muster' ? 'muster' : b.duel ? 'duel' : 'slain';
  const foes = b.units.filter((u) => foeClass(u)).sort((a, c) => a.id - c.id);
  // (the nemeses who stood in the fight)
  for (const u of foes.filter((x) => x.nem)) {
    const n = war.members.find((x) => x.id === u.nem!.id);
    if (!n) continue;
    n.met++;
    const f = tally.foes[u.id];
    const learned = reveal(n);
    if (learned) note.learned.push(`${fullName(n)}: ${secretName(learned)}`);
    if (!u.alive && !u.fled) {
      // (slain: it falls for good, and pays by its Might)
      n.lost++;
      const killer = f?.fell ?? '';
      const crowns = PAY[n.rank] * n.might;
      m.crowns += crowns;
      note.crowns += crowns;
      note.slain.push({ id: n.id, name: n.name, epithet: n.epithet, crowns, by: killer, rank: n.rank, might: n.might, base: n.base, army: n.army });
      war.members = war.members.filter((x) => x !== n);
      war.fallen.unshift({ id: n.id, name: n.name, epithet: n.epithet, base: n.base, army: n.army, rank: n.rank, might: n.might, by: killer, how, tier, turn: war.turn });
      war.fallen.length = Math.min(war.fallen.length, FALLEN_MAX);
      continue;
    }
    // (it lived: a meeting won when the heroes lost, else lost; phase 2's streak, for the fat and lazy and for Desertion)
    if (!won) {
      n.streak = Math.max(0, n.streak ?? 0) + 1;
      note.held.push(n.id);
    } else n.streak = Math.min(0, n.streak ?? 0) - 1;
    // (it lived: each deed promotes it, +1 Might a run at most, a new trait from this fight, a memory line; one that fled the board escaped,
    // and is named from that alone, phase 3)
    if (u.fled) (note.fled ??= []).push(n.id);
    const deeds: Deed[] = u.fled ? ['escaped'] : f ? deedsOf(f, u, b, won) : !won ? ['escaped'] : [];
    if (!deeds.length) continue;
    for (const d of deeds) remember(n, memoryLine(d, f ?? blankLog(u.def), b, n.army, tier, wave));
    if (deeds.includes('escaped')) n.fled = Math.min(999, (n.fled ?? 0) + 1);
    const hurt = deeds.includes('maimed') && f ? maimedKind(f, b) : undefined;
    if (hurt) n.maimed = [hurt, ...(n.maimed ?? []).filter((k) => k !== hurt)].slice(0, 4);
    if (grow(n, run, rng, f)) note.grew.push({ id: n.id, name: n.name, epithet: n.epithet, might: n.might });
    const open = f ? traitsEarned(f, u, b, tally, won).filter((t) => canAdd(n.traits, t)) : [];
    // (one that fled the board learns Elusive from it, phase 3: the design's "escaped by timeout or by fleeing")
    const fresh = u.fled && canAdd(n.traits, 'elusive') ? 'elusive' : open.length ? rng.pick(open) : undefined;
    if (fresh) addTrait(n.traits, fresh, n.mark);
  }
  // (the foes who did a deed are named)
  for (const u of foes.filter((x) => !x.nem)) {
    const f = tally.foes[u.id];
    if (!f) continue;
    const cls = foeClass(u)!;
    // (an escort is only named in an army's own waves)
    if (cls === 'escort' && !army) continue;
    const deeds = deedsOf(f, u, b, won);
    if (!deeds.length) continue;
    const home = cls === 'escort' ? army : homeArmy(u.def) ?? army;
    if (!home) continue;
    // (a boss already a nemesis of the War does not have a twin)
    if (cls === 'boss' && war.members.some((n) => n.boss && n.base === u.def)) continue;
    const deed = deeds.find((d) => rng.next() < BIRTH[d][cls]);
    if (!deed) continue;
    const seat = seatFor(war, cls);
    if (!seat) continue;
    if (seat.displace) war.members = war.members.filter((x) => x !== seat.displace);
    const n = birth(war, u, f, b, tally, won, deed, cls, home, seat.rank, rng, run, tier, wave);
    war.members.push(n);
    note.born.push({ id: n.id, name: n.name, epithet: n.epithet, base: n.base, rank: n.rank, deed, uid: u.id });
  }
}

function birth(war: War, u: Unit, f: FoeLog, b: Battle, tally: NemesisTally, won: boolean, deed: Deed, cls: 'boss' | 'elite' | 'escort', home: string, rank: NemRank, rng: Rng, run: Run, tier: number, wave: number): Nemesis {
  const earned = traitsEarned(f, u, b, tally, won);
  // (one trait read from the log: drawn among those it earned; a foe that earned none is a Bane of the calling it hurt most, or Elusive)
  let trait = earned.length ? rng.pick(earned) : undefined;
  if (!trait) {
    const top = Object.entries(f.dealt).sort((a, c) => c[1] - a[1])[0]?.[0];
    const c = top ? callingOf(b.units.find((x) => x.id === Number(top))?.def ?? '') : undefined;
    trait = c && CALLINGS.includes(c) ? `bane:${c}` : 'elusive';
  }
  const dread = dreadFor(f, b);
  const epithet = TRAITS[trait]?.epithet || (deed === 'slew' ? `${heroName(f.slew[0])}'s Bane` : deed === 'maimed' ? 'the Cruel' : 'the Uncaught');
  const n: Nemesis = {
    id: war.nextId++,
    base: u.def,
    army: home,
    name: nameFor(war, home, rng),
    epithet,
    rank,
    ...(cls === 'boss' ? { boss: true as const } : {}),
    loyalty: 60,
    might: 1,
    scars: 0,
    traits: [trait],
    weak: dread ? [`dread:${dread}`] : [],
    known: [trait, ...(dread ? [`dread:${dread}`] : [])],
    mark: trait,
    memory: [],
    met: 1,
    lost: 0,
    born: war.turn,
    grew: run.seed,
  };
  remember(n, memoryLine(deed, f, b, home, tier, wave));
  if (deed === 'maimed') {
    const k = maimedKind(f, b);
    if (k) n.maimed = [k];
  }
  if (deed === 'escaped') n.fled = 1;
  return n;
}

/** The hero kind a foe maimed: the one it dealt the most. */
function maimedKind(f: FoeLog, b: Battle): string | undefined {
  const top = Object.entries(f.dealt).sort((a, c) => c[1] - a[1])[0]?.[0];
  return b.units.find((x) => x.id === Number(top))?.def;
}

// ---- the save ----------------------------------------------------------------------------------------------------------------

const str = (x: unknown, max = 80): string | undefined => (typeof x === 'string' && x.length <= max ? x : undefined);
const int = (x: unknown, lo: number, hi: number, d: number): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(lo, Math.min(hi, Math.round(x))) : d);
const RANKS: readonly NemRank[] = ['warchief', 'captain', 'lieutenant'];
const secret = (s: unknown): s is string => typeof s === 'string' && (!!TRAITS[s] || s.startsWith('dread:') || s.startsWith('fears:') || s === 'hatesHeights' || s === 'glutton' || s === 'craven' || s === 'vain');
/** A saved trophy, if it is one (a known hero kind, a slot, a piece's id and its look). */
export function readTrophy(x: unknown): NemTrophy | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const t = x as Partial<NemTrophy>;
  const kind = str(t.kind);
  const slot = str(t.slot, 12);
  const base = str(t.base, 40);
  if (!kind || !UNITS[kind] || !slot || !base || typeof t.item !== 'number' || !Number.isFinite(t.item)) return undefined;
  return { kind, slot, item: Math.round(t.item), base, rarity: int(t.rarity, 1, 5, 1) };
}
const kinds = (x: unknown, max: number): string[] => (Array.isArray(x) ? [...new Set(x.filter((k): k is string => typeof k === 'string' && !!UNITS[k]))].slice(0, max) : []);
const NEWS_KINDS: readonly NewsKind[] = ['cheated', 'recruit', 'promotion', 'feud', 'betrayal', 'feast', 'trial', 'oath', 'desertion', 'claim', 'crowned', 'named', 'slain', 'muster', 'fled', 'humiliated', 'vengeance', 'reclaimed', 'duel'];
const dayRec = <T extends object>(x: unknown, extra: (r: Record<string, unknown>) => T): ({ key: number } & T) | undefined => {
  if (!x || typeof x !== 'object') return undefined;
  const r = x as Record<string, unknown>;
  const key = int(r.key, 0, 1e9, 0);
  return key ? { key, ...extra(r) } : undefined;
};

/** Read a saved War: unknown fields and fighters are dropped, numbers clamped, lists cut to their caps (`Meta.war`). Undefined: none. */
export function readWar(raw: unknown): War | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<War>;
  const war = newWar();
  war.turn = int(r.turn, 0, 1e9, 0);
  for (const x of Array.isArray(r.members) ? r.members : []) {
    if (!x || typeof x !== 'object') continue;
    const n = x as Partial<Nemesis>;
    const base = str(n.base);
    const army = str(n.army);
    const name = str(n.name);
    if (!base || !UNITS[base] || !army || !armyById(army) || !name || !RANKS.includes(n.rank as NemRank)) continue;
    const id = int(n.id, 1, 1e9, 0);
    if (!id || war.members.some((m) => m.id === id)) continue;
    const traits = (Array.isArray(n.traits) ? n.traits : []).filter((t): t is string => typeof t === 'string' && !!TRAITS[t]);
    // (the caps hold however the save was edited: 3 traits, at most 2 immunities, 2 weaknesses)
    const kept: string[] = [];
    for (const t of traits) if (kept.length < 3 && canAdd(kept, t)) kept.push(t);
    const weak = (Array.isArray(n.weak) ? n.weak : []).filter((w) => secret(w) && !TRAITS[w]).slice(0, MAX_WEAK);
    const rank = n.rank as NemRank;
    if (war.members.filter((m) => m.rank === rank).length >= SEATS[rank]) continue;
    war.members.push({
      id,
      base,
      army,
      name,
      epithet: str(n.epithet) ?? '',
      rank,
      ...(n.boss === true ? { boss: true as const } : {}),
      loyalty: int(n.loyalty, 0, 100, 60),
      might: int(n.might, 1, MIGHT_MAX, 1),
      scars: int(n.scars, 0, 3, 0),
      traits: kept,
      weak,
      known: (Array.isArray(n.known) ? n.known : []).filter((s): s is string => secret(s) && (kept.includes(s) || weak.includes(s))),
      ...(str(n.mark) && kept.includes(n.mark!) ? { mark: n.mark } : {}),
      memory: (Array.isArray(n.memory) ? n.memory : []).filter((l): l is string => !!str(l, 160)).slice(0, MEMORY_MAX),
      met: int(n.met, 0, 1e6, 0),
      lost: int(n.lost, 0, 1e6, 0),
      born: int(n.born, 0, 1e9, 0),
      ...(typeof n.grew === 'number' && Number.isFinite(n.grew) ? { grew: n.grew } : {}),
      ...(typeof n.sworn === 'number' && Number.isFinite(n.sworn) ? { sworn: n.sworn } : {}),
      ...(typeof n.oath === 'number' && Number.isFinite(n.oath) ? { oath: n.oath } : {}),
      ...(str(n.vengeful) && UNITS[n.vengeful!] ? { vengeful: n.vengeful } : {}),
      ...(typeof n.streak === 'number' && Number.isFinite(n.streak) && n.streak ? { streak: int(n.streak, -99, 99, 0) } : {}),
      ...(() => {
        const t = (Array.isArray(n.trophies) ? n.trophies : []).map(readTrophy).filter((x): x is NemTrophy => !!x).slice(0, TROPHIES_MAX);
        return t.length ? { trophies: t } : {};
      })(),
      ...(str(n.shamed) && UNITS[n.shamed!] ? { shamed: n.shamed } : {}),
      ...(kinds(n.maimed, 4).length ? { maimed: kinds(n.maimed, 4) } : {}),
      ...(typeof n.fled === 'number' && n.fled > 0 ? { fled: int(n.fled, 0, 999, 0) } : {}),
      ...(n.stitched === true ? { stitched: true as const } : {}),
      ...(n.seen === true ? { seen: true as const } : {}),
      ...(n.chiefStitch === true ? { chiefStitch: true as const } : {}),
    });
  }
  // (a sworn captain or an oath brother who is no longer a member is forgotten; an oath is kept only both ways)
  const ids = new Set(war.members.map((n) => n.id));
  for (const n of war.members) {
    if (n.sworn !== undefined && (n.rank !== 'lieutenant' || war.members.find((x) => x.id === n.sworn)?.rank !== 'captain')) delete n.sworn;
    if (n.oath !== undefined && (!ids.has(n.oath) || n.oath === n.id || war.members.find((x) => x.id === n.oath)?.oath !== n.id)) delete n.oath;
  }
  for (const x of Array.isArray(r.fallen) ? r.fallen : []) {
    if (!x || typeof x !== 'object' || war.fallen.length >= FALLEN_MAX) continue;
    const n = x as Partial<FallenNemesis>;
    const name = str(n.name);
    const base = str(n.base);
    if (!name || !base || !UNITS[base]) continue;
    const how = n.how === 'muster' || n.how === 'council' || n.how === 'duel' ? n.how : 'slain';
    war.fallen.push({ id: int(n.id, 0, 1e9, 0), name, epithet: str(n.epithet) ?? '', base, army: str(n.army) ?? '', rank: RANKS.includes(n.rank as NemRank) ? (n.rank as NemRank) : 'lieutenant', might: int(n.might, 1, MIGHT_MAX, 1), by: str(n.by) ?? '', how, tier: int(n.tier, 0, TIERS.length - 1, 0), ...(str(n.foe) ? { foe: n.foe } : {}), ...(typeof n.turn === 'number' ? { turn: int(n.turn, 0, 1e9, 0) } : {}), ...(n.vengeance === true ? { vengeance: true as const } : {}), ...(typeof n.reclaimed === 'number' && n.reclaimed > 0 ? { reclaimed: int(n.reclaimed, 1, TROPHIES_MAX, 1) } : {}) });
  }
  for (const x of Array.isArray(r.news) ? r.news : []) {
    if (!x || typeof x !== 'object' || war.news.length >= NEWS_MAX) continue;
    const l = x as Partial<WarNews>;
    const text = str(l.text, 200);
    if (text && NEWS_KINDS.includes(l.kind as NewsKind)) war.news.push({ turn: int(l.turn, 0, 1e9, 0), kind: l.kind as NewsKind, text });
  }
  for (const x of Array.isArray(r.heads) ? r.heads : []) {
    if (!x || typeof x !== 'object' || (war.heads?.length ?? 0) >= HEADS_MAX) continue;
    const h = x as Partial<WarHead>;
    const name = str(h.name);
    if (name && str(h.base) && UNITS[h.base!]) (war.heads ??= []).push({ name, base: h.base!, army: str(h.army) ?? '', might: int(h.might, 1, MIGHT_MAX, 1), turn: int(h.turn, 0, 1e9, 0) });
  }
  war.musterSince = int(r.musterSince, 0, 99, 0);
  war.trophies = int(r.trophies, 0, 9999, 0);
  const td = dayRec(r.trophyDay, (d) => ({ got: int(d.got, 0, 99, 0) }));
  if (td) war.trophyDay = td;
  const sw = dayRec(r.shardWeek, (d) => ({ got: int(d.got, 0, 99, 0) }));
  if (sw) war.shardWeek = sw;
  const dy = dayRec(r.day, (d) => ({ turns: int(d.turns, 0, 99, 0), ...(d.visit === true ? { visit: true as const } : {}) }));
  if (dy) war.day = dy;
  if (typeof r.claim === 'number' && war.members.some((n) => n.id === r.claim && n.rank === 'captain')) war.claim = r.claim;
  // (phase 3: the members away licking their wounds, the pieces brought home, the Vengeance scenes waiting)
  if (r.away && typeof r.away === 'object')
    for (const [k, v] of Object.entries(r.away)) if (war.members.some((n) => String(n.id) === k)) (war.away ??= {})[k] = int(v, 1, 3, 1);
  const rec = (Array.isArray(r.reclaimed) ? r.reclaimed : []).filter((x): x is number => typeof x === 'number' && Number.isFinite(x)).slice(0, RECLAIMED_MAX);
  if (rec.length) war.reclaimed = rec;
  const vg = (Array.isArray(r.vengeance) ? r.vengeance : []).filter((x): x is string => typeof x === 'string' && /^\w+>\w+$/.test(x) && x.split('>').every((k) => !!UNITS[k])).slice(0, 8);
  if (vg.length) war.vengeance = vg;
  const top = Math.max(0, ...war.members.map((n) => n.id), ...war.fallen.map((n) => n.id));
  war.nextId = Math.max(top + 1, int(r.nextId, 1, 1e9, 1));
  return war;
}

/** The Grudges (phase 3, `Meta.grudges`): hero kind -> nemesis id -> steps (1 to 3, +10% each against it). */
export type Grudges = Record<string, Record<string, number>>;
export const GRUDGE_STEPS = 3;

/** Read the saved Grudges: known hero kinds only, steps clamped to 1..3, twenty nemeses a hero at most. Undefined: none. */
export function readGrudges(raw: unknown): Grudges | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Grudges = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!UNITS[k] || !v || typeof v !== 'object') continue;
    const row: Record<string, number> = {};
    for (const [id, n] of Object.entries(v as Record<string, unknown>).slice(0, 20)) if (/^\d+$/.test(id) && typeof n === 'number' && n >= 1) row[id] = int(n, 1, GRUDGE_STEPS, 1);
    if (Object.keys(row).length) out[k] = row;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Read a run's saved snapshot (`Run.nemesis`): only members of known fighters, and waves naming them. */
export function readRunNemesis(raw: unknown): RunNemesis | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<RunNemesis>;
  const members = (Array.isArray(r.members) ? r.members : []).filter((s): s is NemSnap => !!s && typeof s === 'object' && typeof s.id === 'number' && !!UNITS[s.base] && RANKS.includes(s.rank) && Array.isArray(s.traits) && Array.isArray(s.weak));
  const ids = new Set(members.map((s) => s.id));
  const waves: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(r.waves ?? {})) if (/^\d+$/.test(k) && Array.isArray(v)) waves[k] = v.filter((id) => ids.has(id));
  return members.length ? { members, waves } : undefined;
}

/** The members a hero kind is the Dread of (for the deploy bench's skull pip). */
export const dreadedBy = (rn: RunNemesis | undefined, kind: string): NemSnap[] => (rn?.members ?? []).filter((s) => dreadOf(s.weak) === kind);

// ---- words -------------------------------------------------------------------------------------------------------------------

const RANK_WORD: Readonly<Record<NemRank, string>> = { warchief: 'Warchief', captain: 'Captain', lieutenant: 'Lieutenant' };
/** A rank's word ("Captain"). */
export const rankWord = (r: NemRank): string => RANK_WORD[r];
const DEED_WORD: Readonly<Record<Deed, string>> = { slew: 'slew a hero', maimed: 'maimed a hero', escaped: 'escaped you' };

/** A fight's War in short lines, for the wave card and the toasts. */
export function nemesisLines(n: NemNote | undefined): string[] {
  if (!n) return [];
  const out: string[] = [];
  if (n.opened) out.push('The Nemesis War begins: the foes who hurt you will be remembered');
  for (const x of n.slain) out.push(`Slain: ${fullName(x)}${x.by ? ` by ${heroName(x.by)}` : ''} · ${x.crowns} crowns`);
  for (const x of n.born) out.push(`Remembered: ${fullName(x)}, ${rankWord(x.rank).toLowerCase()}, ${DEED_WORD[x.deed]}`);
  for (const x of n.grew) out.push(`${fullName(x)} grows stronger · Might ${x.might}`);
  for (const l of n.learned) out.push(`Learned of ${l}`);
  if (n.trophies) out.push(`War Trophies +${n.trophies}`);
  for (const l of n.council ?? []) out.push(l);
  return out;
}

/** The pay for slaying a nemesis now ("Slay: 120 crowns"). */
export const payOf = (n: Pick<Nemesis, 'rank' | 'might'>): number => PAY[n.rank] * n.might;
