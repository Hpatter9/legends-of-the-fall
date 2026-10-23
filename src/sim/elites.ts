// The tower's named elites. An elite node holds one of twelve mini-bosses, four to an act-tier (the third tier serves every act
// from the third on): a fighter of an existing look (`eliteFoes.ts`) with a title, a stat boost, one signature trait (its kit's
// skill and passive: enrage, a summon, a shield wall, a charge, poison...) and a small escort. Which elite waits at a node comes
// from a side stream of the run's seed (`mixSeed(seed, ELITE_SALT, act)` shuffles the tier's elites, the act's elite nodes take
// them in map order), so the same map always holds the same elites and the existing maps and fights do not change.
// Beating an elite pays a choice of three relics (`offerRelics`, `takeRelic`), at least one from a set. Pure rules.

import type { Boost, Stage } from './battle';
import { ALL_RELIC_IDS, RELICS } from './relics';
import { setCount, setOf, SETS } from './relicSets';
import { mixSeed, Rng } from './rng';
import type { Area } from './board';
import type { MapNode } from './tower';
import type { Run } from './run';

/** The side-stream salts: which elite waits where, and which relics an elite offers. */
export const ELITE_SALT = 0xe117e5;
const OFFER_SALT = 0x0ffe42;

export interface Elite {
  id: string;
  /** The fighter's id in `UNITS` (the band's first foe). */
  def: string;
  /** Its full title, as on the map and the intro card. */
  name: string;
  /** A line under the name on the intro card. */
  epithet: string;
  /** The act tier it waits in (1 to 3). */
  tier: 1 | 2 | 3;
  /** Its trait in a line: the kit's skill and passive. */
  trait: string;
  /** The leader's boost on top of the elite band's (hp and attack grow with the floor, as every foe's do). */
  boost: Boost;
  /** Four escorts, by their ids in `UNITS`. */
  escort: readonly string[];
}

const lead = (hp: number, atk: number, size = 1.3): Boost => ({ hp, atk, size });

export const ELITES: readonly Elite[] = [
  { id: 'gorrak', def: 'eliteGorrak', name: 'Gorrak the Bonebreaker', epithet: 'He has never left a bone whole', tier: 1, trait: 'Ground Slam; enrages as his health falls', boost: lead(1.8, 1.15), escort: ['orcGrunt', 'orcGrunt', 'orcArcher'] },
  { id: 'ysolde', def: 'eliteYsolde', name: 'Ysolde Fangmother', epithet: 'The pack follows her howl', tier: 1, trait: 'Ravage; quicker with every kill', boost: lead(1.7, 1.2), escort: ['wolfBlack', 'wolfRed', 'wolfWhite'] },
  { id: 'hollow', def: 'eliteHollow', name: 'The Hollow Knight', epithet: 'An oath outlived its keeper', tier: 1, trait: 'Shield Wall; blows from the front lose a quarter', boost: lead(1.9, 1.1), escort: ['skeleton', 'spearman', 'boneArcher'] },
  { id: 'sethra', def: 'eliteSethra', name: 'Sethra the Stonegazer', epithet: 'Look away, or be a statue', tier: 1, trait: 'Petrifying Gaze; shrugs off arrows', boost: lead(1.8, 1.2), escort: ['gorgon1', 'gorgon3', 'satyr1'] },
  { id: 'brakka', def: 'eliteBrakka', name: 'Brakka the Gorebound', epithet: 'The maze let him out', tier: 2, trait: 'Gore Charge; hits the wounded harder', boost: lead(1.7, 1.2), escort: ['minotaur2', 'minotaur3', 'satyr2'] },
  { id: 'cindra', def: 'eliteCindra', name: 'Cindra the Ashen', epithet: 'Where she walks, the floor burns', tier: 2, trait: 'Hellfire; her blows set heroes alight', boost: lead(1.8, 1.2), escort: ['imp', 'imp', 'imp'] },
  { id: 'vexor', def: 'eliteVexor', name: 'Vexor the Imp-Caller', epithet: 'Never fights alone', tier: 2, trait: 'Summons imps when his own are gone', boost: lead(1.8, 1.15), escort: ['imp', 'demon', 'imp'] },
  { id: 'thrum', def: 'eliteThrum', name: 'Thrum Hillbreaker', epithet: 'Older than the road', tier: 2, trait: 'Horned Shove; blows from the front lose a quarter', boost: lead(1.7, 1.15), escort: ['ogre', 'imp', 'ogre'] },
  { id: 'nyssa', def: 'eliteNyssa', name: 'Nyssa the Plaguebringer', epithet: 'Her touch rots the strong', tier: 3, trait: 'Hex; poisons and drinks what it deals', boost: lead(2.9, 1.55), escort: ['yokaiFox', 'yokaiFox', 'yokaiMonk'] },
  { id: 'warden', def: 'eliteWarden', name: 'The Iron Warden', epithet: 'Nothing passes unasked', tier: 3, trait: 'Ground Slam; plated, cannot be knocked back', boost: lead(2.9, 1.55), escort: ['stoneGolem', 'stoneGolem', 'crystalGolem'] },
  { id: 'kuro', def: 'eliteKuro', name: 'Kuro the Stormcrow', epithet: 'Falls on archers from the cloud', tier: 3, trait: 'Flies; dives on shooters', boost: lead(2.9, 1.55, 1.4), escort: ['yokaiCrow', 'yokaiSeer', 'yokaiFox'] },
  { id: 'silenus', def: 'eliteSilenus', name: 'Silenus the Mad Piper', epithet: 'Every dance ends in a fall', tier: 3, trait: 'Pipes of Pan hasten the pack', boost: lead(2.9, 1.55), escort: ['packBlack', 'packRed', 'groveSatyr1', 'groveSatyr2'] },
];
export const ELITE_BY_ID: Record<string, Elite> = Object.fromEntries(ELITES.map((e) => [e.id, e]));
/** The elite whose fighter is `def` (the band's leader), if any. */
export const eliteOfDef = (def: string): Elite | undefined => ELITES.find((e) => e.def === def);

/** The tier an act draws its elites from: the first two acts have their own, every later one the third. */
export const tierOf = (act: number): 1 | 2 | 3 => (Math.min(Math.max(act, 1), 3) as 1 | 2 | 3);

/** An act's elites in the order its elite nodes take them: the tier's four, shuffled on the elite side stream. */
export function eliteOrder(seed: number, act: number): Elite[] {
  const pool = ELITES.filter((e) => e.tier === tierOf(act));
  const rng = new Rng(mixSeed(seed, ELITE_SALT, act));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/** The elite of the elite node `id` on an act's map (the elite nodes, by row then id, take the shuffled elites in turn). Undefined when the node is not an elite. */
export function eliteAt(seed: number, act: number, map: readonly MapNode[], id: number): Elite | undefined {
  const nodes = map.filter((n) => n.kind === 'elite').sort((a, b) => a.row - b.row || a.id - b.id);
  const rank = nodes.findIndex((n) => n.id === id);
  if (rank < 0) return undefined;
  const order = eliteOrder(seed, act);
  return order[rank % order.length];
}

/** The elite of a calamity map's `index`th hidden side spot: the next after those its elite nodes take (the tier's four, round again when they run out). */
export function sideEliteAt(seed: number, act: number, map: readonly MapNode[], index: number): Elite {
  const order = eliteOrder(seed, act);
  return order[(map.filter((n) => n.kind === 'elite').length + index) % order.length];
}

/** The fight an elite brings: the elite and its escort, `k` the floor's strength (as every foe's), `mult` the elite band's extra. */
export function eliteFight(e: Elite, k: number, mult: number, area: Area): { band: string[]; stage: Stage; elite: string } {
  return { band: [e.def, ...e.escort], stage: { foes: { hp: k * mult, atk: k * mult }, boss: e.boost, area }, elite: e.id };
}

/* ------------------------------------------------------------------ the relic choice */

/** How many relics an elite offers. */
export const OFFER_SIZE = 3;

/** The relics a run does not hold yet. */
export const unowned = (run: Run): string[] => ALL_RELIC_IDS.filter((id) => !run.relics?.includes(id));

/**
 * Three relics to choose from, drawn from the run's seed and the floor: the first from a set (one the run has begun, if there is
 * one), the others from anything unowned. Fewer when fewer are left.
 */
export function drawOffer(run: Run, floor: number): string[] {
  const rng = new Rng(mixSeed(run.seed, OFFER_SALT, floor));
  const left = unowned(run);
  const inSet = left.filter((id) => setOf(id));
  // (a set the run has begun comes first: its pieces are worth the most)
  const begun = inSet.filter((id) => setCount(setOf(id)!, run.relics) > 0);
  const out: string[] = [];
  const firsts = begun.length ? begun : inSet;
  if (firsts.length) out.push(rng.pick(firsts));
  const rest = left.filter((id) => !out.includes(id));
  while (out.length < OFFER_SIZE && rest.length) out.push(rest.splice(rng.int(0, rest.length - 1), 1)[0]);
  return out;
}

/** Take one of the relics on offer: it joins the run and the offer is closed. A line saying what it was, or null when it isn't on offer. */
export function takeRelic(run: Run, id: string): string | null {
  const t = run.tower;
  if (!t?.offer?.includes(id)) return null;
  (run.relics ??= []).push(id);
  t.offer = undefined;
  const set = setOf(id);
  return `the ${RELICS[id].name}${set ? ` (${SETS[set.id].name} ${setCount(set, run.relics)}/${set.relics.length})` : ''}`;
}
