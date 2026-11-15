// NEMESIS-DEPTH, idea 6: spare or slay (`docs/notes/nemesis-depth.md`). An old foe beaten in single combat, or brought down while its
// loyalty to the Council is low, may kneel instead of dying. Its pay is held back while the player chooses:
//
// - SLAY: it falls for good, and pays what it would have.
// - SPARE: it leaves the Council and becomes the player's Informant for five of its army's runs. It tells every secret of its old superior and
//   its sworn brothers at once; its old captain's lieutenants lose 20 loyalty; the wave card names the nemeses in the next wave of its army's
//   runs; and the scouts' report on its army's hold is the player's for nothing. When the five runs are done, it goes: half the time with
//   thanks (a War Trophy), else back to the Council as a lieutenant, a Betrayer, Vengeful against the hero who spared it, a Might stronger.
//   Each of its brothers the heroes slay while it informs makes the betrayal likelier.
//
// One kneels at a time; while one waits, the others fall as ever. Never the warchief, a hunt's quarry, Vengeance's mark, nor at the Muster
// or a hold's conquest. The choice's draws come from their own stream (`SPARE_SALT`). Pure rules: no Pixi, no DOM.

import { armyById } from './armies';
import { assaultOf } from './assault/economy';
import { HOLDS } from './assault/holds';
import { news } from './council';
import { heroName } from './heroNames';
import type { Meta } from './meta';
import { FALLEN_MAX, FATE_MEETINGS, fullName, MIGHT_MAX, remember, SEATS, type FallenNemesis, type Nemesis, type War } from './nemesis';
import { mixSeed, Rng } from './rng';
import { UNITS } from './units';

/** A nemesis kneeling before the hero who beat it: the member as it was, the hero, and the pay held back while the player chooses. */
export interface Kneel {
  n: Nemesis;
  by: string;
  crowns: number;
  trophies: number;
  tier: number;
  how: FallenNemesis['how'];
}

/** The player's Informant: the spared nemesis, the hero who spared it, its army's runs left, and its brothers the heroes slew since. */
export interface Informant {
  n: Nemesis;
  by: string;
  runs: number;
  /** The brothers it sold (their ids), and how many of them the heroes have slain since. */
  brothers: number[];
  betrayed: number;
}

/** The numbers: it kneels below this loyalty (or beaten in a duel); informs this many runs; leaves faithful this often, less for each brother
 *  slain; and its old captain's lieutenants lose this much loyalty. */
export const SPARE = { loyalty: 40, runs: 5, faithful: 0.5, perBrother: 0.15, sworn: -20, thanks: 1 } as const;
export const SPARE_SALT = 0x4e3e5e;

/** Whether a member brought down may kneel: an old foe (met past fate's meetings), never the warchief; beaten in single combat, or its
 *  loyalty low. Nothing kneels while another waits, or the player has an Informant. */
export function mayKneel(war: War, n: Nemesis, duelWon: boolean): boolean {
  if (war.kneel || war.informant || war.end || n.rank === 'warchief' || n.met < FATE_MEETINGS) return false;
  return duelWon || n.loyalty < SPARE.loyalty;
}

/** Its sworn brothers: a captain's lieutenants, a lieutenant's captain and fellow lieutenants, and its blood-oath brother. */
export function brothersOf(war: War, n: Nemesis): Nemesis[] {
  const cap = n.rank === 'captain' ? n : war.members.find((x) => x.id === n.sworn);
  return war.members.filter((x) => x.id !== n.id && (x === cap || (cap && x.sworn === cap.id) || x.oath === n.id || x.id === n.oath));
}

/** Slay the one kneeling: it falls for good and pays what was held back. Returns its line. */
export function slayKneeler(m: Meta): string | undefined {
  const war = m.war;
  const k = war?.kneel;
  if (!war || !k) return undefined;
  delete war.kneel;
  m.crowns += k.crowns;
  war.trophies += k.trophies;
  const n = k.n;
  war.fallen.unshift({ id: n.id, name: n.name, epithet: n.epithet, base: n.base, army: n.army, rank: n.rank, might: n.might, by: k.by, how: k.how, tier: k.tier, turn: war.turn });
  war.fallen.length = Math.min(war.fallen.length, FALLEN_MAX);
  const line = `${fullName(n)} begged for mercy, and ${heroName(k.by)} gave none`;
  news(war, 'slain', line);
  return line;
}

/** Spare the one kneeling: it becomes the player's Informant (its secrets told, its old captain's lieutenants shaken, the scouts' report on
 *  its army's hold given). Returns its line. */
export function spareKneeler(m: Meta): string | undefined {
  const war = m.war;
  const k = war?.kneel;
  if (!war || !k) return undefined;
  delete war.kneel;
  const n = k.n;
  const told = brothersOf(war, n);
  for (const x of told) x.known = [...new Set([...x.known, ...x.traits, ...x.weak])];
  const cap = n.rank === 'captain' ? undefined : war.members.find((x) => x.id === n.sworn);
  for (const x of war.members) if (cap ? x.sworn === cap.id : x.sworn === n.id) x.loyalty = Math.max(0, x.loyalty + SPARE.sworn);
  war.informant = { n, by: k.by, runs: SPARE.runs, brothers: told.map((x) => x.id), betrayed: 0 };
  // (the scouts' report on its army's hold, for nothing: it knows the posts)
  if (HOLDS[n.army] && !m.assault?.conquered?.[n.army]) {
    const a = assaultOf(m);
    a.scouted = { ...a.scouted, [n.army]: true };
  }
  remember(n, `Spared by ${heroName(k.by)}, and turned Informant`);
  const line = `${fullName(n)} is spared by ${heroName(k.by)}, and turns Informant: ${told.length ? `it tells all it knows of ${told.map((x) => x.name).join(', ')}` : 'it has no brothers left to sell'}`;
  news(war, 'spared', line);
  return line;
}

/** Each brother of the Informant the heroes slay makes its betrayal likelier (`noteWar`). */
export function brotherSlain(war: War, id: number): void {
  const inf = war.informant;
  if (inf?.brothers.includes(id)) inf.betrayed++;
}

/**
 * An army run of the Informant's army has ended: one run fewer. When its runs are done it goes, by its own stream: with thanks (a War Trophy),
 * or back to the Council as a lieutenant, a Betrayer, Vengeful against the hero who spared it, a Might stronger (if a lieutenant's seat is free;
 * else it slips away). Returns the wave card's line, if any.
 */
export function endInformant(m: Meta, army: string, seed: number): string | undefined {
  const war = m.war;
  const inf = war?.informant;
  if (!war || !inf || inf.n.army !== army) return undefined;
  inf.runs--;
  if (inf.runs > 0) return undefined;
  delete war.informant;
  const n = inf.n;
  const faithful = Math.max(0, SPARE.faithful - inf.betrayed * SPARE.perBrother);
  const free = war.members.filter((x) => x.rank === 'lieutenant').length < SEATS.lieutenant;
  if (new Rng(mixSeed(seed, SPARE_SALT, n.id)).next() < faithful || !free) {
    war.trophies += SPARE.thanks;
    const line = `${fullName(n)}, your Informant, has told all it knows, and leaves the War with thanks · +${SPARE.thanks} War Trophy`;
    news(war, 'spared', line);
    return line;
  }
  n.rank = 'lieutenant';
  delete n.sworn;
  delete n.oath;
  delete n.rival;
  n.loyalty = 60;
  n.might = Math.min(MIGHT_MAX, n.might + 1);
  if (UNITS[inf.by]) n.vengeful = inf.by;
  n.betrayer = true;
  remember(n, `Betrayed the heroes who spared it, and returned to the Council`);
  war.members.push(n);
  const line = `${fullName(n)}, your Informant, betrays you and returns to the Council, Vengeful against ${heroName(inf.by)}`;
  news(war, 'spared', line);
  return line;
}

/** The wave card's line from the Informant: the nemeses in the next wave of its army's run ("Your Informant: Hask stands in the next wave"). */
export function informantAhead(m: Pick<Meta, 'war'>, run: { mode?: { kind: string; army?: string }; stage: number; nemesis?: { members: { id: number; name: string }[]; waves: Record<string, number[]> } }): string | undefined {
  const inf = m.war?.informant;
  if (!inf || run.mode?.kind !== 'army' || run.mode.army !== inf.n.army) return undefined;
  const ids = run.nemesis?.waves[String(run.stage)] ?? [];
  const names = ids.map((id) => run.nemesis!.members.find((x) => x.id === id)?.name).filter(Boolean);
  return `Your Informant: ${names.length ? `${names.join(' and ')} ${names.length === 1 ? 'stands' : 'stand'} in the next wave` : 'no nemesis stands in the next wave'}`;
}

/** A saved kneel or Informant, if it is one (its nemesis read as a member is: `readWar`'s own reader). */
export function readKneel(x: unknown, readOne: (n: unknown) => Nemesis | undefined): Kneel | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const k = x as Partial<Kneel>;
  const n = readOne(k.n);
  if (!n || typeof k.by !== 'string') return undefined;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0);
  const how = k.how === 'duel' ? 'duel' : 'slain';
  return { n, by: k.by, crowns: num(k.crowns), trophies: num(k.trophies), tier: num(k.tier), how };
}
export function readInformant(x: unknown, readOne: (n: unknown) => Nemesis | undefined): Informant | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const i = x as Partial<Informant>;
  const n = readOne(i.n);
  if (!n || typeof i.by !== 'string') return undefined;
  const runs = typeof i.runs === 'number' && Number.isFinite(i.runs) ? Math.max(1, Math.min(SPARE.runs, Math.round(i.runs))) : SPARE.runs;
  const brothers = (Array.isArray(i.brothers) ? i.brothers : []).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).slice(0, 12);
  const betrayed = typeof i.betrayed === 'number' && Number.isFinite(i.betrayed) ? Math.max(0, Math.min(12, Math.round(i.betrayed))) : 0;
  return { n, by: i.by, runs, brothers, betrayed };
}

/** The army's name, for the board's words. */
export const informantArmy = (inf: Informant): string => armyById(inf.n.army)?.name ?? inf.n.army;
