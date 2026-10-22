// Hero synergies, auto-chess style: every hero has two traits (an origin and a class). Placing different heroes of a
// trait on the board unlocks the trait's team bonus at 2 of them (and a bigger one at 4, where a trait has four
// members). Only distinct kinds count, so two Knights are one Knight. The bonuses are fixed when the fight starts
// (`fight` calls `traitEffects`), and a few small hooks in the battle read them.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { UNITS } from './units';

/** What a team's active traits give every hero on it. Each is a plain multiplier or share, absent meaning none. */
export interface TraitEffects {
  /** Multiplies attack. */
  atk?: number;
  /** Multiplies health. */
  hp?: number;
  /** Damage taken is cut by this share. */
  guard?: number;
  /** The share of blows slipped. */
  dodge?: number;
  /** Added to the chance of a crit (x1.5 when the hero has no crit of its own). */
  crit?: number;
  /** Multiplies how fast heroes act and walk. */
  speed?: number;
  /** Multiplies how fast skills charge with time. */
  charge?: number;
  /** Multiplies how fast the king's mana fills. */
  mana?: number;
  /** Shooters gain this much reach per step of height above the target. */
  reach?: number;
}

export interface TraitTier {
  /** Different heroes of the trait needed. */
  need: number;
  effects: TraitEffects;
  /** The tier's line for the page. */
  text: string;
}

export interface Trait {
  id: string;
  name: string;
  kind: 'origin' | 'class';
  /** Two or three letters for a small badge. */
  short: string;
  tiers: TraitTier[];
}

export const TRAITS: Record<string, Trait> = {
  samurai: { id: 'samurai', name: 'Samurai', kind: 'origin', short: 'Sa', tiers: [
    { need: 2, effects: { atk: 1.01 }, text: '+1% attack' },
    { need: 4, effects: { atk: 1.1 }, text: '+10% attack' },
  ] },
  mystic: { id: 'mystic', name: 'Mystic', kind: 'origin', short: 'My', tiers: [
    { need: 2, effects: { mana: 1.3 }, text: "The king's mana fills 30% faster" },
    { need: 4, effects: { mana: 1.6 }, text: "The king's mana fills 60% faster" },
  ] },
  yokai: { id: 'yokai', name: 'Yokai', kind: 'origin', short: 'Yo', tiers: [{ need: 2, effects: { dodge: 0.06 }, text: 'Slip 6% of blows' }] },
  knightly: { id: 'knightly', name: 'Knightly', kind: 'origin', short: 'Kn', tiers: [{ need: 2, effects: { hp: 1.05 }, text: '+5% health' }] },
  guardian: { id: 'guardian', name: 'Guardian', kind: 'class', short: 'Gu', tiers: [{ need: 2, effects: { guard: 0.05 }, text: 'All heroes take 5% less damage' }] },
  blade: { id: 'blade', name: 'Blade', kind: 'class', short: 'Bl', tiers: [{ need: 2, effects: { crit: 0.1 }, text: '+10% crit chance for all' }] },
  marksman: { id: 'marksman', name: 'Marksman', kind: 'class', short: 'Mk', tiers: [{ need: 2, effects: { reach: 0.5 }, text: 'Shooters reach much further from high ground' }] },
  caster: { id: 'caster', name: 'Caster', kind: 'class', short: 'Ca', tiers: [
    { need: 2, effects: { charge: 1.3 }, text: 'Skills charge 30% faster over time' },
    { need: 4, effects: { charge: 1.5 }, text: 'Skills charge 50% faster over time' },
  ] },
  holy: { id: 'holy', name: 'Holy', kind: 'origin', short: 'Ho', tiers: [{ need: 2, effects: { hp: 1.08 }, text: '+8% health' }] },
  wild: { id: 'wild', name: 'Wild', kind: 'origin', short: 'Wi', tiers: [
    { need: 2, effects: { atk: 1.05 }, text: '+5% attack' },
    { need: 4, effects: { atk: 1.12 }, text: '+12% attack' },
  ] },
  arcane: { id: 'arcane', name: 'Arcane', kind: 'origin', short: 'Ar', tiers: [
    { need: 2, effects: { charge: 1.15 }, text: 'Skills charge 15% faster over time' },
    { need: 4, effects: { charge: 1.3 }, text: 'Skills charge 30% faster over time' },
  ] },
  frontier: { id: 'frontier', name: 'Frontier', kind: 'origin', short: 'Fr', tiers: [
    { need: 2, effects: { crit: 0.06 }, text: '+6% crit chance for all' },
    { need: 4, effects: { crit: 0.14 }, text: '+14% crit chance for all' },
  ] },
  warden: { id: 'warden', name: 'Warden', kind: 'class', short: 'Wa', tiers: [
    { need: 2, effects: { guard: 0.04 }, text: 'All heroes take 4% less damage' },
    { need: 4, effects: { guard: 0.1 }, text: 'All heroes take 10% less damage' },
  ] },
  trickster: { id: 'trickster', name: 'Trickster', kind: 'class', short: 'Tr', tiers: [{ need: 2, effects: { speed: 1.05 }, text: 'All heroes act and walk 5% faster' }] },
  beast: { id: 'beast', name: 'Beast', kind: 'class', short: 'Be', tiers: [
    { need: 2, effects: { atk: 1.03 }, text: '+3% attack' },
    { need: 4, effects: { atk: 1.08 }, text: '+8% attack' },
  ] },
  undead: { id: 'undead', name: 'Undead', kind: 'origin', short: 'Un', tiers: [
    { need: 2, effects: { hp: 1.06 }, text: '+6% health' },
    { need: 4, effects: { hp: 1.14 }, text: '+14% health' },
  ] },
  machine: { id: 'machine', name: 'Machine', kind: 'origin', short: 'Ma', tiers: [
    { need: 2, effects: { atk: 1.03 }, text: '+3% attack' },
    { need: 4, effects: { atk: 1.1, guard: 0.03 }, text: '+10% attack, and all heroes take 3% less damage' },
  ] },
  royal: { id: 'royal', name: 'Royal', kind: 'origin', short: 'Ro', tiers: [
    { need: 2, effects: { atk: 1.02, hp: 1.03 }, text: '+2% attack and +3% health' },
    { need: 4, effects: { atk: 1.06, hp: 1.06 }, text: '+6% attack and +6% health' },
  ] },
  pirate: { id: 'pirate', name: 'Pirate', kind: 'origin', short: 'Pi', tiers: [{ need: 2, effects: { crit: 0.05, dodge: 0.03 }, text: '+5% crit chance and slip 3% of blows' }] },
  gunner: { id: 'gunner', name: 'Gunner', kind: 'class', short: 'Gn', tiers: [{ need: 2, effects: { atk: 1.04 }, text: '+4% attack' }] },
  assassin: { id: 'assassin', name: 'Assassin', kind: 'class', short: 'As', tiers: [
    { need: 2, effects: { crit: 0.08 }, text: '+8% crit chance for all' },
    { need: 4, effects: { crit: 0.16, speed: 1.03 }, text: '+16% crit chance, and all heroes act and walk 3% faster' },
  ] },
  support: { id: 'support', name: 'Support', kind: 'class', short: 'Su', tiers: [{ need: 2, effects: { hp: 1.04, charge: 1.1 }, text: '+4% health, and skills charge 10% faster over time' }] },
  vanguard: { id: 'vanguard', name: 'Vanguard', kind: 'class', short: 'Va', tiers: [
    { need: 2, effects: { speed: 1.04 }, text: 'All heroes act and walk 4% faster' },
    { need: 4, effects: { speed: 1.08, atk: 1.03 }, text: 'All heroes act and walk 8% faster, and hit 3% harder' },
  ] },
  arcanist: { id: 'arcanist', name: 'Arcanist', kind: 'class', short: 'Ac', tiers: [{ need: 2, effects: { mana: 1.15, charge: 1.1 }, text: "The king's mana fills 15% faster, and skills charge 10% faster" }] },
  bulwark: { id: 'bulwark', name: 'Bulwark', kind: 'class', short: 'Bw', tiers: [{ need: 2, effects: { guard: 0.04, hp: 1.03 }, text: 'All heroes take 4% less damage, and have 3% more health' }] },
};

/** Each hero's origin and class. Every trait has two to four heroes. */
export const HERO_TRAITS: Record<string, readonly [string, string]> = {
  samurai: ['samurai', 'blade'],
  kunoichi: ['samurai', 'trickster'],
  archer: ['samurai', 'marksman'],
  ninjaMonk: ['samurai', 'blade'],
  peasant: ['knightly', 'guardian'],
  knight: ['knightly', 'guardian'],
  wizard: ['mystic', 'caster'],
  lightningMage: ['mystic', 'marksman'],
  wanderer: ['mystic', 'caster'],
  kitsune: ['yokai', 'trickster'],
  karasu: ['yokai', 'trickster'],
  yamabushi: ['yokai', 'guardian'],
  paladin: ['holy', 'guardian'],
  werewolf: ['wild', 'beast'],
  minotaur: ['knightly', 'beast'],
  satyr: ['arcane', 'beast'],
  gorgon: ['yokai', 'beast'],
  samuraiCommander: ['knightly', 'blade'],
  cleric: ['holy', 'warden'],
  druid: ['wild', 'warden'],
  barbarian: ['wild', 'blade'],
  ranger: ['frontier', 'marksman'],
  gunslinger: ['frontier', 'marksman'],
  warlock: ['arcane', 'caster'],
  illusionist: ['arcane', 'trickster'],
  shambler: ['undead', 'warden'],
  rifleBot: ['machine', 'gunner'],
  mercenary: ['frontier', 'assassin'],
  mummy: ['undead', 'warden'],
  buccaneer: ['pirate', 'assassin'],
  wolfBard: ['wild', 'support'],
  beastmaster: ['frontier', 'support'],
  kraken: ['pirate', 'bulwark'],
  lancer: ['royal', 'vanguard'],
  reaper: ['undead', 'assassin'],
  timeWitch: ['arcane', 'arcanist'],
  arcBlade: ['machine', 'assassin'],
  dreadPirate: ['undead', 'vanguard'],
  siegeBot: ['machine', 'gunner'],
  priestess: ['holy', 'support'],
  dragoon: ['royal', 'vanguard'],
  juggernaut: ['machine', 'bulwark'],
  sage: ['mystic', 'arcanist'],
  demonSwordsman: ['royal', 'vanguard'],
  tyrant: ['royal', 'caster'],
};

export const traitsOf = (kind: string): readonly string[] => HERO_TRAITS[kind] ?? [];

/** The heroes (by kind) that carry a trait. */
export const membersOf = (trait: string): string[] => Object.keys(HERO_TRAITS).filter((k) => HERO_TRAITS[k].includes(trait));

export interface TraitCount {
  trait: Trait;
  /** Different hero kinds placed with the trait. */
  count: number;
  /** The tier reached (-1 for none). */
  tier: number;
  /** The count the next tier needs, or the last tier's when all are reached. */
  goal: number;
  active: boolean;
}

/** The traits of the placed hero kinds (duplicates count once), those with any hero placed, the active ones first. */
export function countTraits(kinds: Iterable<string>): TraitCount[] {
  const seen = new Set(kinds);
  const out: TraitCount[] = [];
  for (const trait of Object.values(TRAITS)) {
    const count = [...seen].filter((k) => traitsOf(k).includes(trait.id)).length;
    if (!count) continue;
    let tier = -1;
    trait.tiers.forEach((t, i) => {
      if (count >= t.need) tier = i;
    });
    const goal = trait.tiers[Math.min(trait.tiers.length - 1, tier + 1)].need;
    out.push({ trait, count, tier, goal, active: tier >= 0 });
  }
  return out.sort((a, b) => Number(b.active) - Number(a.active) || b.count / b.goal - a.count / a.goal);
}

/** The team bonus of the placed hero kinds: every active trait's reached tier, combined. */
export function traitEffects(kinds: Iterable<string>): TraitEffects {
  const fx: TraitEffects = {};
  const mult = (k: 'atk' | 'hp' | 'speed' | 'charge' | 'mana', v: number) => (fx[k] = (fx[k] ?? 1) * v);
  const add = (k: 'guard' | 'dodge' | 'crit' | 'reach', v: number) => (fx[k] = (fx[k] ?? 0) + v);
  for (const c of countTraits(kinds)) {
    if (!c.active) continue;
    const e = c.trait.tiers[c.tier].effects;
    for (const k of ['atk', 'hp', 'speed', 'charge', 'mana'] as const) if (e[k]) mult(k, e[k]!);
    for (const k of ['guard', 'dodge', 'crit', 'reach'] as const) if (e[k]) add(k, e[k]!);
  }
  return fx;
}

/** The kinds of the heroes now placed in a fight, for the functions above. */
export const kindsOf = (units: readonly { side: string; def: string }[]): string[] => units.filter((u) => u.side === 'hero' && UNITS[u.def]).map((u) => u.def);
