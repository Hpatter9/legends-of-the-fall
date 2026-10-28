// Hero awakening: past rank 4 a hero kind can be awakened twice (rank 5 and rank 6) by spending extra shards. Each step
// gives a stronger body (`AWAKEN_MULT`, read through `rankMult`), a new look (`render/awakenLook.ts`) and a passive that is
// the hero's own: the first step switches it on and the second makes it stronger. A passive is data, one of the
// signature abilities of the equipment (`equipBases.ts`, run by `equipFx.ts`) under the hero's own name, so it needs no
// new fight code. Each step also asks for rift ores of the hero's class (`awakenMats.ts`, AWAKEN-MATS). Kept per kind in
// `Meta.awakened` (missing is none). Pure rules: no Pixi, no DOM, no randomness.

import type { Meta } from './meta';
import { MAX_RANK, takenRank } from './meta';
import { ABILITIES, type Ability } from './equipBases';
import { emptyStats, type EquipStats } from './equipment';
import { ALL_HEROES } from './units';
import { shardsToSpend } from './talents';
import { AWAKEN_COSTS, AWAKEN_SHARDS, MAX_AWAKEN } from './awakenRules';
import { AWAKEN_ORES, oreOf, oresOf } from './awakenMats';
export * from './awakenRules';

export interface AwakenPassive {
  /** What the passive is called (the pop-up when it fires). */
  name: string;
  /** The equipment ability it runs (a different one for every hero). */
  ability: string;
  /** One line of what it is, for the hero's sheet. */
  text: string;
}

/** The passive of every hero kind. */
export const PASSIVES: Readonly<Record<string, AwakenPassive>> = {
  knight: { name: 'Oathbound', ability: 'unyielding', text: 'Now and then the blows it takes are halved for a moment' },
  samurai: { name: 'Thousand Cuts', ability: 'iaijutsu', text: 'A crit makes the foe bleed' },
  kunoichi: { name: 'Smoke Step', ability: 'shadowVeil', text: 'Starts each fight unseen' },
  archer: { name: 'Falcon Eye', ability: 'eagleEye', text: 'A crit deals a much heavier blow' },
  wizard: { name: 'Living Flame', ability: 'dragonfire', text: 'Blows now and then set the foe alight' },
  ninjaMonk: { name: 'Rising Fist', ability: 'flurry', text: 'Every third blow hastens it' },
  peasant: { name: 'Stubborn Heart', ability: 'steelResolve', text: 'Every seventh blow taken is turned aside' },
  lightningMage: { name: 'Forked Sky', ability: 'chainLightning', text: 'Every fourth blow leaps on to a second foe' },
  wanderer: { name: 'Road Song', ability: 'soothingSong', text: 'Mends the weakest ally every few seconds' },
  kitsune: { name: 'Foxfire Curse', ability: 'hex', text: 'Blows now and then curse the foe' },
  karasu: { name: 'Hawk Dive', ability: 'pointBlank', text: 'Blows now and then land far harder' },
  yamabushi: { name: 'Mountain Wind', ability: 'shockwave', text: 'Every fourth blow shakes the foes beside the target' },
  werewolf: { name: 'Blood Moon', ability: 'bloodlust', text: 'A kill charges its skill' },
  minotaur: { name: 'Labyrinth Rage', ability: 'skullRattle', text: 'Every fourth blow stuns the foe' },
  satyr: { name: 'Wild Pipes', ability: 'silkRush', text: 'Starts each fight in haste' },
  gorgon: { name: 'Stone Gaze', ability: 'deepFreeze', text: 'A crit freezes the foe where it stands' },
  samuraiCommander: { name: 'Banner of the Dawn', ability: 'bannerPlates', text: 'Rallies the allies near it at the start' },
  paladin: { name: 'Last Bulwark', ability: 'lastBastion', text: 'Below a third hp it takes half damage for a while' },
  cleric: { name: 'Warding Chime', ability: 'wardingChime', text: 'Once, when hurt, cleanses itself and mends' },
  druid: { name: 'Evergreen', ability: 'verdantMending', text: 'Mends itself a little every second' },
  barbarian: { name: 'Berserk Heart', ability: 'smoulderingFury', text: 'Once, when hurt, gains attack for the fight' },
  ranger: { name: 'Briar Snare', ability: 'snaringBurrs', text: 'Blows taken now and then slow the attacker' },
  warlock: { name: 'Blood Pact', ability: 'vampiricBite', text: 'Heals on the damage it deals' },
  illusionist: { name: 'Mirror Step', ability: 'nimbleReflexes', text: 'Blows taken now and then hasten it' },
  gunslinger: { name: 'Dead Eye', ability: 'boltVolley', text: 'Every third shot pierces on to the foe behind' },
  shambler: { name: 'Rotten Plates', ability: 'linkedRings', text: 'Blows taken now and then grow a shield' },
  rifleBot: { name: 'Overclock', ability: 'sparkConduit', text: 'Blows add to its skill charge' },
  mercenary: { name: 'Bounty Money', ability: 'fortunesFavour', text: 'A crit mends it' },
  mummy: { name: 'Sealed Wrappings', ability: 'scaledWard', text: 'Starts each fight with a shield' },
  buccaneer: { name: 'Grappling Hook', ability: 'cripplingShot', text: 'Blows now and then slow the foe' },
  wolfBard: { name: 'Moonlit Verse', ability: 'lunarCharge', text: 'Gives the king mana at the start' },
  beastmaster: { name: 'Pack Hunt', ability: 'sweepingCleave', text: 'Blows also hit the foes beside the target' },
  kraken: { name: 'Riptide', ability: 'skewer', text: 'Blows also hit the foe behind' },
  lancer: { name: 'Couched Lance', ability: 'honestStrike', text: 'Every fifth blow lands far harder' },
  reaper: { name: 'Harvest', ability: 'soulReaper', text: 'A kill mends it' },
  timeWitch: { name: 'Borrowed Hours', ability: 'meditation', text: 'Gathers skill charge every second' },
  arcBlade: { name: 'Arc Fragment', ability: 'arcFragment', text: 'Blows now and then arc to a second foe' },
  dreadPirate: { name: 'Deathless Crew', ability: 'rebirth', text: 'Rises once more when it would fall' },
  siegeBot: { name: 'Shrapnel', ability: 'emberBurst', text: 'The slain burst on the foes beside it' },
  priestess: { name: 'Halo', ability: 'sunlightAura', text: 'Mends the allies beside it every second' },
  dragoon: { name: 'Wyrm Scales', ability: 'dragonsWrath', text: 'Blows taken now and then scorch the attacker' },
  juggernaut: { name: 'Spiked Hide', ability: 'thornplate', text: 'Sends a share of every blow back' },
  sage: { name: 'Starlit Mind', ability: 'clairvoyance', text: 'Every fifth blow gives the king mana' },
  demonSwordsman: { name: 'Executioner', ability: 'headsman', text: 'Deals far more to a foe below 30% hp' },
  tyrant: { name: 'Gaze of Judgement', ability: 'idolsGaze', text: 'Blows taken now and then draw the attacker onto it' },
};

/** The strength of a passive at each step (the equipment's Mythic is 0.7): the first step switches it on, the second makes it stronger. */
export const PASSIVE_STRENGTH: readonly number[] = [0.6, 0.85];

/** The steps a hero kind has awakened (0 to 2). */
export const awakenedOf = (m: Meta, kind: string): number => m.awakened?.[kind] ?? 0;
/** A hero's whole rank for its strength and look: the shard rank, then one for each awakened step (5 and 6). */
export const heroRank = (m: Meta, kind: string): number => takenRank(m, kind) + awakenedOf(m, kind);

export interface AwakenPlan {
  /** The step the next awakening would take (1 or 2), or null when the kind is at the top or not ready for any. */
  step: number | null;
  /** What it costs in shards (0 when none). */
  cost: number;
  /** The shards in all the kind must have for it. */
  need: number;
  /** The shards the kind has in all, and has left to spend. */
  have: number;
  free: number;
  /** The class trait whose ores the step asks for (empty for a kind without a class), how many, and how many are held. */
  ore: string;
  oreCost: number;
  oreHave: number;
  /** The shards are ready (the rank, the total and the spare), whatever the ores. */
  shardsReady: boolean;
  can: boolean;
}

/** Where a kind stands on the path: its next step, the cost, and whether it can be paid now. */
export function awakenPlan(m: Meta, kind: string): AwakenPlan {
  const done = awakenedOf(m, kind);
  const have = m.shards[kind] ?? 0;
  const free = shardsToSpend(m, kind);
  const ore = oreOf(kind)?.trait ?? '';
  const oreHave = ore ? oresOf(m, ore) : 0;
  if (done >= MAX_AWAKEN) return { step: null, cost: 0, need: 0, have, free, ore, oreCost: 0, oreHave, shardsReady: false, can: false };
  const need = AWAKEN_SHARDS[done];
  const cost = AWAKEN_COSTS[done];
  const oreCost = AWAKEN_ORES[done];
  const shardsReady = m.unlocked.includes(kind) && takenRank(m, kind) >= MAX_RANK && have >= need && free >= cost;
  return { step: done + 1, cost, need, have, free, ore, oreCost, oreHave, shardsReady, can: shardsReady && !!ore && oreHave >= oreCost };
}

export const canAwaken = (m: Meta, kind: string): boolean => awakenPlan(m, kind).can;

/** Awaken a hero kind one step, using up the shards and its class's ores. Returns the new step (1 or 2), or 0 (and nothing changes) when it cannot. */
export function awaken(m: Meta, kind: string): number {
  const plan = awakenPlan(m, kind);
  if (!plan.can) return 0;
  m.ores![plan.ore] -= plan.oreCost;
  if (!m.ores![plan.ore]) delete m.ores![plan.ore];
  return ((m.awakened ??= {})[kind] = awakenedOf(m, kind) + 1);
}

/** What an awakened hero brings to a fight beyond its stats: its passive at the strength of its step (undefined when it has none). */
export function awakenStats(m: Meta, kind: string): EquipStats | undefined {
  const step = awakenedOf(m, kind);
  const p = PASSIVES[kind];
  if (!step || !p) return undefined;
  const out = emptyStats();
  out.abilities.push({ id: p.ability, name: p.name, s: PASSIVE_STRENGTH[step - 1] });
  return out;
}

/** The passive in plain words at a step (1 or 2), through the equipment's own ability text. */
export function passiveLine(kind: string, step: number, describe: (a: Ability, s: number) => string): string {
  const p = PASSIVES[kind];
  return p ? `${p.name}: ${describe(ABILITIES[p.ability], PASSIVE_STRENGTH[Math.max(0, Math.min(MAX_AWAKEN, step) - 1)])}` : '';
}

/** Saved awakening that is sane: a hero kind, 1 or 2 steps, no more than its shards paid for. Anything else is dropped. */
export function readAwakened(raw: unknown, shards: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object')
    for (const [k, n] of Object.entries(raw as Record<string, unknown>)) {
      if (!ALL_HEROES.includes(k) || typeof n !== 'number') continue;
      let steps = Math.min(MAX_AWAKEN, Math.max(0, Math.floor(n)));
      while (steps > 0 && (shards[k] ?? 0) < AWAKEN_SHARDS[steps - 1]) steps--;
      if (steps) out[k] = steps;
    }
  return out;
}

/** The ids every hero's passive runs, to check they differ. */
export const PASSIVE_IDS: readonly string[] = ALL_HEROES.map((k) => PASSIVES[k]?.ability ?? '');
