// The Nemesis War, phase 3: revenge, trophies and taunts (`docs/design/legends-expansion.md`, sections 2.6 to 2.9; `docs/notes/nemesis-3.md`).
// Both sides remember. A hero a nemesis slew bears a **Grudge** on it (+10% against it, +10% more each further time, to +30%), and that hero's
// Sworn partner (bond level 3 or more) is its **Avenger** (+15% attack on it, skills 10% quicker while it stands); an Avenger's killing blow
// is **Vengeance**: the slayer cannot cheat death, the pair gains 30 bond points, the pay is doubled and a short scene plays at the camp. A
// nemesis that cheats death, or flees a fight in which no hero fell, is **humiliated**: it sits out one to three of its army's runs, and comes
// back Vengeful against the hero who humiliated it, Stitched if it cheated death, and carrying a **trophy**, that hero's piece in the first
// filled slot of weapon, shield, helm or charm (+5% attack each, two at most). Slaying a nemesis that carries one **brings it home**
// ("Reclaimed") and doubles the pay.
//
// What a fight needs is fixed onto the run's snapshot as it begins (`planRun`, beside `planNemeses`): the Grudges, the Avengers, the
// trophies, Stitched and what the taunts are made from. A humiliation's runs away draw from `new Rng(mixSeed(run.seed, REVENGE_SALT, wave,
// id))`; the fight's stream is never drawn. Pure rules: no Pixi, no DOM.

import { armyById } from './armies';
import type { Battle } from './battle';
import { bondKey, levelOf } from './bonds';
import { bloodOn } from './dynasty';
import type { EquipSlot } from './equipment';
import { fieldedHero } from './fightStats';
import { heroName } from './heroNames';
import type { Meta } from './meta';
import { fullName, GRUDGE_STEPS, planNemeses, RECLAIMED_MAX, remember, TROPHIES_MAX, type NemNote, type NemSnap, type NemTrophy, type Nemesis, type NewsKind, type RunNemesis, type War } from './nemesis';
import type { NemesisTally } from './nemesisLog';
import { mixSeed, Rng } from './rng';
import type { Run } from './run';
import { UNITS } from './units';

/** Phase 3's side stream: the runs a humiliated nemesis sits out. */
export const REVENGE_SALT = 0x4e3e54;
/** A Grudge's step (+10% against its slayer each), and the most steps (+30%). */
export const GRUDGE_SHARE = 0.1;
/** An Avenger is the partner of a slain hero at this bond level or more (Sworn). */
export const AVENGER_BOND = 3;
/** Vengeance's bond points for the pair. */
export const VENGEANCE_BOND = 30;
/** A humiliated nemesis sits out this many of its army's runs (one to three). */
export const AWAY: Readonly<{ min: number; max: number }> = { min: 1, max: 3 };
/** The loyalty its underlings lose when their superior is humiliated by the heroes. */
export const HUMBLED_LOYALTY = -20;
/** The slots a trophy is taken from, in order: weapon, shield, helm, charm. */
export const TROPHY_SLOTS: readonly EquipSlot[] = ['main', 'off', 'head', 'acc'];
/** What a slot's piece is called in a trophy's words. */
const SLOT_WORD: Readonly<Partial<Record<EquipSlot, string>>> = { main: 'weapon', off: 'shield', head: 'helm', acc: 'charm' };
export const trophyWord = (t: Pick<NemTrophy, 'slot'>): string => SLOT_WORD[t.slot as EquipSlot] ?? 'piece';

// ---- the Grudges and the Avengers ----------------------------------------------------------------------------------------------

/** A hero's Grudge steps on a nemesis (0: none). */
export const grudgeOn = (m: Pick<Meta, 'grudges'>, kind: string, id: number): number => m.grudges?.[kind]?.[String(id)] ?? 0;

/** The heroes with a Grudge on a nemesis (those it slew), by kind, with their steps. */
export function grudgesOn(m: Pick<Meta, 'grudges'>, id: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, row] of Object.entries(m.grudges ?? {})) if (row[String(id)]) out[k] = row[String(id)];
  return out;
}

/** A nemesis slew a hero: that hero's Grudge on it rises a step (three at most). */
export function addGrudge(m: Meta, kind: string, id: number): number {
  const row = ((m.grudges ??= {})[kind] ??= {});
  row[String(id)] = Math.min(GRUDGE_STEPS, (row[String(id)] ?? 0) + 1);
  return row[String(id)];
}

/** Forget the Grudges on nemeses no longer in the War (slain, deserted, or lost to a rival). */
export function tidyGrudges(m: Meta): void {
  if (!m.grudges) return;
  const live = new Set((m.war?.members ?? []).map((n) => String(n.id)));
  for (const k of Object.keys(m.grudges)) {
    for (const id of Object.keys(m.grudges[k])) if (!live.has(id)) delete m.grudges[k][id];
    if (!Object.keys(m.grudges[k]).length) delete m.grudges[k];
  }
  if (!Object.keys(m.grudges).length) delete m.grudges;
}

/** A nemesis's Avengers: for each hero it slew, that hero's partners at bond level 3 (Sworn) or more, by kind -> the hero it slew. A
 *  partner who bears a Grudge of its own is still an Avenger of the other. */
export function avengersOf(m: Meta, id: number): Record<string, string> {
  const out: Record<string, string> = {};
  const slain = Object.keys(grudgesOn(m, id)).sort();
  for (const fallen of slain)
    for (const k of Object.keys(UNITS))
      if (k !== fallen && !out[k] && UNITS[k] && levelOf(m, bondKey(k, fallen)) >= AVENGER_BOND) out[k] = fallen;
  return out;
}

// ---- the run's start ---------------------------------------------------------------------------------------------------------

/** What a snapshot carries for phase 3: the Grudges and Avengers on it, its trophies, Stitched, and its taunts' makings. */
export function decorate(m: Meta, s: NemSnap, n: Nemesis): NemSnap {
  const g = grudgesOn(m, n.id);
  const grudge = Object.fromEntries(Object.entries(g).map(([k, steps]) => [k, Math.round(steps * GRUDGE_SHARE * 100) / 100]));
  const avengers = avengersOf(m, n.id);
  // (Dynasties, phase 6: the heirs fielded with a Blood Grudge on it)
  const blood = bloodOn(m, n.id);
  return {
    ...s,
    army: n.army,
    ...(n.trophies?.length ? { trophies: n.trophies.map((t) => ({ ...t })) } : {}),
    ...(Object.keys(grudge).length ? { grudge } : {}),
    ...(Object.keys(avengers).length ? { avengers } : {}),
    ...(blood.length ? { blood } : {}),
    ...(n.stitched ? { stitched: true as const } : {}),
    ...(Object.keys(g).length ? { slew: Object.keys(g).sort() } : {}),
    ...(n.maimed?.length ? { maimed: [...n.maimed] } : {}),
    ...(n.shamed ? { shamed: n.shamed } : {}),
    ...(n.fled ? { fled: n.fled } : {}),
    met: n.met,
    ...(n.seen ? { seen: true as const } : {}),
  };
}

/**
 * Where the War's members stand in a run, as it begins (`planNemeses`), with phase 3's makings on each: a humiliated member of the run's army
 * who is away licking its wounds sits this run out (one of its runs counted off; the last brings it back). Undefined when none stands.
 */
export function planRun(m: Meta, run: Run): RunNemesis | undefined {
  const war = m.war;
  if (!war || run.mode?.kind !== 'army') return undefined;
  const army = run.mode.army;
  const away = new Set<number>();
  for (const n of war.members) {
    const left = war.away?.[String(n.id)];
    if (!left || n.army !== army) continue;
    away.add(n.id);
    if (left <= 1) {
      delete war.away![String(n.id)];
      news(war, 'humiliated', `${fullName(n)} has licked its wounds, and returns`);
    } else war.away![String(n.id)] = left - 1;
  }
  if (war.away && !Object.keys(war.away).length) delete war.away;
  const plan = planNemeses(away.size ? { ...war, members: war.members.filter((n) => !away.has(n.id)) } : war, run);
  if (!plan) return undefined;
  return { ...plan, members: plan.members.map((s) => decorate(m, s, war.members.find((n) => n.id === s.id)!)) };
}

/** A member's cut-in has played in full (its first meeting always does). */
export function markSeen(war: War | undefined, id: number): void {
  const n = war?.members.find((x) => x.id === id);
  if (n) n.seen = true;
}

// ---- trophies ------------------------------------------------------------------------------------------------------------------

/** The trophy a nemesis would take from a hero: the hero's piece in the first filled slot of weapon, shield, helm or charm. */
export function trophyFrom(m: Meta, kind: string): NemTrophy | undefined {
  const worn = m.equipped?.[kind];
  for (const slot of TROPHY_SLOTS) {
    const id = worn?.[slot];
    const it = id === undefined ? undefined : m.equipment?.find((x) => x.id === id);
    if (it) return { kind, slot, item: it.id, base: it.base, rarity: it.rarity };
  }
  return undefined;
}

/** Whether a piece has been brought home from a nemesis (its card says "Reclaimed"). */
export const reclaimed = (m: Pick<Meta, 'war'>, item: number): boolean => !!m.war?.reclaimed?.includes(item);

/** A trophy in words ("Kwame's shield"). */
export const trophyWords = (t: NemTrophy): string => `${heroName(t.kind)}’s ${trophyWord(t)}`;

// ---- settling a fight --------------------------------------------------------------------------------------------------------

function news(war: War, kind: NewsKind, text: string): void {
  war.news.unshift({ turn: war.turn, kind, text });
  war.news.length = Math.min(war.news.length, 40);
}

const loyal = (n: Nemesis, d: number): void => void (n.loyalty = Math.max(0, Math.min(100, n.loyalty + d)));

/** A member's underlings: a warchief's captains, a captain's sworn lieutenants. */
const underlings = (war: War, n: Nemesis): Nemesis[] => (n.rank === 'warchief' ? war.members.filter((x) => x.rank === 'captain') : n.rank === 'captain' ? war.members.filter((x) => x.rank === 'lieutenant' && x.sworn === n.id) : []);

/** A nemesis is humiliated by a hero (it cheated death, or fled a fight in which no hero fell): it sits out one to three of its army's runs,
 *  comes back Vengeful against that hero with a trophy of theirs (two at most), a scar more (a cheat's scar is already given) and, if it
 *  cheated death, Stitched; its underlings' loyalty falls. Returns the page's line. */
export function humiliate(m: Meta, war: War, n: Nemesis, hero: string | undefined, run: Run, wave: number, cheated: boolean): string {
  const rng = new Rng(mixSeed(run.seed, REVENGE_SALT, wave, n.id));
  (war.away ??= {})[String(n.id)] = rng.int(AWAY.min, AWAY.max);
  if (!cheated) n.scars = Math.min(3, n.scars + 1);
  // (a warchief is Stitched once a seat holding, so his cheats do not stack: `crown` clears it)
  if (cheated && !(n.rank === 'warchief' && n.chiefStitch)) {
    n.stitched = true;
    if (n.rank === 'warchief') n.chiefStitch = true;
  }
  for (const x of underlings(war, n)) loyal(x, HUMBLED_LOYALTY);
  let took = '';
  if (hero && UNITS[hero]) {
    n.shamed = hero;
    n.vengeful = hero;
    const t = trophyFrom(m, hero);
    const kept = n.trophies ?? [];
    if (t && kept.length < TROPHIES_MAX && !kept.some((x) => x.item === t.item)) {
      n.trophies = [...kept, t];
      took = `, and took ${trophyWords(t)}`;
    }
  }
  const by = hero && UNITS[hero] ? ` by ${heroName(hero)}` : '';
  remember(n, `Humiliated${by}${took} · ${armyById(n.army)?.name ?? n.army}`);
  // (a cheat's humiliation is told on its own line of the News: "dragged from the field ... humiliated by Kwame")
  const last = war.news[0];
  if (cheated && last?.kind === 'cheated' && last.text.startsWith(fullName(n))) last.text = `${last.text}; humiliated${by}${took}, it slinks off to lick its wounds`.slice(0, 200);
  else news(war, 'humiliated', `${fullName(n)} is humiliated${by}${took}; it slinks off to lick its wounds`);
  return `${fullName(n)} is humiliated${by}${took}: it will be back`;
}

/** What phase 3 made of a fight, for `noteWar`: the page's lines, and the slain whose pay is doubled (Vengeance, a trophy brought home). */
export interface RevengeNote {
  lines: string[];
  doubled: Set<number>;
}

/**
 * Settle a fight's revenge (`noteWar`, after phase 1's settle and cheating death): the Grudges of the heroes slain by a nemesis now in the
 * War; a Stitched member who stood again has spent it; the humiliated (`cheated`: who cheated death, and whose blow it was; a nemesis that
 * fled a fight in which no hero fell); the slain who carried trophies bring them home; an Avenger's killing blow is Vengeance. `avengers` are
 * each member's Avengers as the fight began.
 */
export function settleRevenge(m: Meta, run: Run, b: Battle, tally: NemesisTally | undefined, note: NemNote, was: ReadonlyMap<number, Nemesis>, cheated: ReadonlyMap<number, string>, avengers: ReadonlyMap<number, Record<string, string>>, wave: number, duelWon?: number): RevengeNote {
  const out: RevengeNote = { lines: [], doubled: new Set() };
  // (phase 4: a nemesis slain in a duel pays double, `duel.ts`)
  if (duelWin(note, duelWon)) out.doubled.add(duelWon!);
  const war = m.war;
  if (!war) return out;
  const member = (id: number | undefined) => (id === undefined ? undefined : war.members.find((n) => n.id === id));
  // (a hero slain by a nemesis now in the War bears a Grudge on it)
  for (const u of b.units) {
    const f = tally?.foes[u.id];
    if (!f?.slew.length) continue;
    const n = member(u.nem?.id ?? note.born.find((x) => x.uid === u.id)?.id);
    if (!n) continue;
    for (const k of f.slew) if (UNITS[k]) addGrudge(m, k, n.id);
  }
  // (a Stitched member who stood again this fight has spent it)
  for (const u of b.units) {
    if (!u.nem?.stitched || !u.nem.stood || u.nem.traits.includes('survivor')) continue;
    const n = member(u.nem.id);
    if (n) delete n.stitched;
  }
  // (the humiliated: who cheated death, and who fled a fight in which no hero fell)
  for (const [id, by] of cheated) {
    const n = member(id);
    if (n) out.lines.push(humiliate(m, war, n, by || undefined, run, wave, true));
  }
  const heroFell = b.units.some((x) => x.side === 'hero' && fieldedHero(x) && x.diedAt !== undefined);
  for (const id of note.fled ?? []) {
    const n = member(id);
    const u = b.units.find((x) => x.nem?.id === id);
    if (!n || !u) continue;
    news(war, 'fled', `${fullName(n)} breaks and runs from the field`);
    if (heroFell) {
      out.lines.push(`${fullName(n)} flees the field`);
      continue;
    }
    const f = tally?.foes[u.id];
    const top = Object.entries(f?.by ?? {}).sort((a, c) => c[1] - a[1] || (a[0] < c[0] ? -1 : 1))[0]?.[0];
    out.lines.push(humiliate(m, war, n, top, run, wave, false));
  }
  // (the slain: trophies brought home, and an Avenger's Vengeance)
  for (const x of note.slain) {
    const n = was.get(x.id);
    if (!n) continue;
    const fallen = war.fallen.find((f) => f.id === x.id && f.how !== 'council');
    const home = n.trophies ?? [];
    if (home.length) {
      war.reclaimed = [...home.map((t) => t.item), ...(war.reclaimed ?? []).filter((i) => !home.some((t) => t.item === i))].slice(0, RECLAIMED_MAX);
      if (fallen) fallen.reclaimed = home.length;
      for (const t of home) {
        news(war, 'reclaimed', `${trophyWords(t)} comes home from ${fullName(n)}`);
        out.lines.push(`Reclaimed: ${trophyWords(t)}, brought home from ${fullName(n)}`);
      }
      out.doubled.add(x.id);
    }
    const avenged = x.by ? avengers.get(x.id)?.[x.by] : undefined;
    if (avenged) {
      if (fallen) fallen.vengeance = true;
      m.bonds = { ...(m.bonds ?? {}), [bondKey(x.by, avenged)]: (m.bonds?.[bondKey(x.by, avenged)] ?? 0) + VENGEANCE_BOND };
      const pair = `${x.by}>${avenged}`;
      if (!war.vengeance?.includes(pair)) war.vengeance = [...(war.vengeance ?? []), pair].slice(-8);
      news(war, 'vengeance', `Vengeance: ${heroName(x.by)} slays ${fullName(n)}, who slew ${heroName(avenged)}`);
      out.lines.push(`Vengeance! ${heroName(x.by)} avenges ${heroName(avenged)}`);
      out.doubled.add(x.id);
    }
    // (doubled once, however many reasons: the crowns now, the War Trophies in `noteWar`)
    if (out.doubled.has(x.id)) {
      m.crowns += x.crowns;
      note.crowns += x.crowns;
      x.crowns *= 2;
    }
  }
  tidyGrudges(m);
  return out;
}

const duelWin = (note: NemNote, id: number | undefined): boolean => id !== undefined && note.slain.some((x) => x.id === id);

/** The Avengers of every member, as a fight begins (for Vengeance at its settle). */
export const avengersNow = (m: Meta): Map<number, Record<string, string>> => new Map((m.war?.members ?? []).map((n) => [n.id, avengersOf(m, n.id)]));

/** The members away licking their wounds, with their runs left (the board's line). */
export const awayRuns = (war: War | undefined, id: number): number => war?.away?.[String(id)] ?? 0;

/** The hero kinds a fight's heroes are (for which taunts and Avengers stand on the board). */
export const fieldKinds = (b: Pick<Battle, 'units'>): string[] => [...new Set(b.units.filter((u) => u.side === 'hero' && fieldedHero(u)).map((u) => u.def))];
