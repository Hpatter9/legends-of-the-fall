// Hero talents: a small tree for every hero kind, kept per kind in the meta like levels and shards. Four cheap stat nodes
// (tier 1), a choice between two changes to the hero's own skill (tier 2) and a capstone choice between two strong, flavourful
// options (tier 3): eight nodes, of which a hero takes at most seven (one of each pair). A node costs its tier in points (1, 2,
// 3), so a full tree is 9 points; tier 2 opens with two tier-1 nodes taken and tier 3 with a tier-2 node taken. Points come
// from the hero's level (one every `LEVEL_POINT_EVERY` levels) and from shards (`SHARD_POINT_COST` of a kind's shards buy one,
// up to `MAX_SHARD_POINTS`; the shards still count towards its rank, so spending them never lowers it). A respec costs crowns
// and gives every point back.
//
// A tree is data. The nodes' numbers reach the fight as a hero's `EquipStats` (`heroStats` below puts the talents together
// with the equipment): the stat nodes are stats, a skill or passive change is a number under a key of `EquipStats.tal` that
// the skills in `abilities.ts` read (`TAL_KEYS`), and a capstone may also be an ability run by the same hooks as an Epic
// piece of equipment's (`equipFx.ts`). A hero with no talents taken has none of it, so every fight plays out as before.
// Pure rules: no Pixi, no DOM, no randomness of its own.

import type { Ability, Kind, Trig } from './equipBases';
import { addStats, capStats, emptyStats, equipStats, STAT_KEYS, type EquipStats, type StatKey } from './equipment';
import { levelOfKind, milestonePoints } from './levels';
import type { Meta } from './meta';
import { awakenSpent } from './awakenRules';
import { awakenStats } from './awaken';
import { ALL_HEROES } from './units';
import { deepNodes } from './talentsDeep';

/** One point for every this many levels (3, 6, 9, ... 99), and one more at each deep milestone (levels 40 to 100: `levelPoints`). */
export const LEVEL_POINT_EVERY = 3;
/** Shards of a kind that buy one point, and how many points shards can buy. */
export const SHARD_POINT_COST = 3;
export const MAX_SHARD_POINTS = 3;
/** What a node costs, by tier. */
export const TIER_COST: readonly number[] = [0, 1, 2, 3, 5, 7, 8, 9];
/** The lasting level a tier opens at (the deep rows, `talentsDeep.ts`; the first three open from the start). */
export const TIER_LEVEL: readonly number[] = [0, 1, 1, 1, 40, 60, 80, 100];
/** The tiers of a full tree: three to start with and four deep rows. */
export const TALENT_TIERS = 7;
/** Tier-1 nodes that must be taken before tier 2 opens. */
export const TIER2_NEEDS = 2;
/** A respec costs this much, and this much more for each point spent. */
export const RESPEC_BASE = 50;
export const RESPEC_PER_POINT = 25;

/** The skill and passive changes a node can make (`EquipStats.tal`), and what each does. The skills read them in `abilities.ts`. */
export const TAL_KEYS: Readonly<Record<string, string>> = {
  pow: 'Skill damage, healing and what a skill calls up: a share more of the hero\'s attack while it casts',
  ultPow: 'The same, for the ultimate only',
  dur: 'A share longer for what a skill lasts (taunts, guards, stuns, charms, songs, banners, curses, burning ground, traps)',
  reach: 'Tiles more reach or radius for a skill',
  extra: 'One more of what a skill makes (strikes, jumps, traps, treants, a second volley or meteor)',
  castHeal: 'A share of max hp healed when the skill goes off',
  castShield: 'A shield of this share of max hp (3s) when the skill goes off',
  castHaste: 'Milliseconds of haste when the skill goes off',
  refund: 'Charge given back when the skill goes off',
  skillSlow: 'Milliseconds the skill slows what it hits',
  skillStun: 'Milliseconds the skill holds what it hits',
  ultRate: 'A share faster charge for the ultimate',
  block: 'More of a blow from the front turned aside',
  thorns: 'More of a melee blow taken sent back',
  leech: 'More of the damage its blows deal healed',
  huddle: 'Less taken from each ally beside it',
  rage: 'More attack as its health falls',
  frenzyMax: 'More stacks of the kill frenzy',
};

export interface TalentNode {
  /** `<kind>:<tier><letter>`; the letter is the node's place in its row. */
  id: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  name: string;
  /** What it does, in plain words. */
  text: string;
  /** An icon of the equipment set (`src/art/equip/<icon>.png`). */
  icon: string;
  /** Stat shares it adds (`def` is flat). */
  stats?: Partial<Record<StatKey, number>>;
  /** Skill and passive changes (`TAL_KEYS`). */
  tal?: Record<string, number>;
  /** Abilities it switches on (ids of `TALENT_ABILITIES`). */
  abilities?: string[];
}

export interface TalentTree {
  kind: string;
  nodes: TalentNode[];
}

// ---- the abilities the capstones use (run by `equipFx.ts`) ----
export const TALENT_ABILITIES: Record<string, Ability> = {};
const ab = (id: string, name: string, trig: Trig, kind: Kind, o: Partial<Ability> = {}): string => {
  TALENT_ABILITIES[id] = { id, name, trig, kind, ...o };
  return id;
};

// ---- writing a tree ----
const pct = (v: number) => `${Math.round(v * 100)}%`;
const STAT_TEXT: Record<StatKey, (v: number) => string> = {
  hp: (v) => `+${pct(v)} hp`,
  atk: (v) => `+${pct(v)} attack`,
  def: (v) => `+${Math.round(v * 10) / 10} defence`,
  atkSpeed: (v) => `+${pct(v)} attack speed`,
  moveSpeed: (v) => `+${pct(v)} move speed`,
  crit: (v) => `+${pct(v)} crit chance`,
  range: (v) => `+${v} range`,
  dodge: (v) => `+${pct(v)} dodge`,
  charge: (v) => `+${pct(v)} faster pool refill`,
  regen: (v) => `mends ${Math.round(v * 1000) / 10}% hp a second`,
  resist: (v) => `+${pct(v)} resist to burning and bleeding`,
};
export const statText = (stats: Partial<Record<StatKey, number>>): string => STAT_KEYS.filter((k) => stats[k]).map((k) => STAT_TEXT[k](stats[k]!)).join(', ');

type Stats = Partial<Record<StatKey, number>>;
interface Pick {
  name: string;
  icon: string;
  text: string;
  stats?: Stats;
  tal?: Record<string, number>;
  abilities?: string[];
}
const LETTERS = 'abcd';
/** Four stat nodes, then the two choices of tier 2 and of tier 3. */
function tree(kind: string, ones: [string, string, Stats][], twos: [Pick, Pick], threes: [Pick, Pick]): TalentTree {
  const nodes: TalentNode[] = [];
  ones.forEach(([name, icon, stats], i) => nodes.push({ id: `${kind}:1${LETTERS[i]}`, tier: 1, name, text: statText(stats), icon, stats }));
  twos.forEach((p, i) => nodes.push({ id: `${kind}:2${LETTERS[i]}`, tier: 2, ...p }));
  threes.forEach((p, i) => nodes.push({ id: `${kind}:3${LETTERS[i]}`, tier: 3, ...p }));
  return { kind, nodes };
}
const HP = 0.05;
const ATK = 0.05;

export const TREES: Readonly<Record<string, TalentTree>> = {
  knight: tree(
    'knight',
    [['Tempered Steel', 'plate', { hp: HP }], ['Drill Sergeant', 'sword', { atk: ATK }], ['Sturdy Greaves', 'boots', { def: 1 }], ['Second Wind', 'elixir', { regen: 0.004 }]],
    [
      { name: 'Bulwark', icon: 'bastion', text: 'Shield Wall lasts half as long again (6s).', tal: { dur: 0.5 } },
      { name: 'Wide Guard', icon: 'aegis', text: 'Shield Wall draws foes from 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Unbreakable', icon: 'amulet', text: 'Once a fight, when he would fall he rises at 30% health.', abilities: [ab('tl_knight_revive', 'Unbreakable', 'death', 'revive', { v: 0.3 })] },
      { name: "Captain's Shout", icon: 'drum', text: 'Every 10s, allies within 3 tiles hit a quarter harder for 4s.', abilities: [ab('tl_knight_shout', "Captain's Shout", 'tick', 'rally', { n: 10, w: 4, show: true })] },
    ],
  ),
  samurai: tree(
    'samurai',
    [['Whetstone', 'katana', { atk: ATK }], ['Calm Mind', 'pendant', { crit: 0.03 }], ['Footwork', 'boots', { moveSpeed: 0.06 }], ['Hardened Robes', 'gi', { hp: 0.04 }]],
    [
      { name: 'Longer Draw', icon: 'longbow', text: 'Iaido dashes one tile further (5).', tal: { reach: 1 } },
      { name: 'Twin Cuts', icon: 'blade', text: 'Iaido cuts a third deeper.', tal: { pow: 0.35 } },
    ],
    [
      { name: 'Death Blossom', icon: 'ruby', text: 'Each kill gives back a quarter of the pool.', abilities: [ab('tl_samurai_blossom', 'Death Blossom', 'kill', 'charge', { v: 50 })] },
      { name: "Master's Focus", icon: 'scroll', text: '+12% attack speed and +8% crit chance.', stats: { atkSpeed: 0.12, crit: 0.08 } },
    ],
  ),
  kunoichi: tree(
    'kunoichi',
    [['Light Foot', 'boots', { moveSpeed: 0.06 }], ['Poisoned Edge', 'dagger', { atk: ATK }], ['Dancer', 'silk', { dodge: 0.03 }], ['Keen Eyes', 'spectacles', { crit: 0.03 }]],
    [
      { name: 'Lingering Shadow', icon: 'shadowcloak', text: 'After Shadow Step she is hasted for 3s.', tal: { castHaste: 3000 } },
      { name: 'Deadly Backstab', icon: 'dagger', text: 'Shadow Step stabs 40% harder.', tal: { pow: 0.4 } },
    ],
    [
      { name: 'Smoke Bomb', icon: 'vial', text: 'Every 9s she cannot be targeted for 2s.', abilities: [ab('tl_kunoichi_smoke', 'Smoke Bomb', 'tick', 'stealth', { n: 9, w: 2, show: true })] },
      { name: 'Venom Blades', icon: 'elixir', text: '30% of her blows make the foe bleed.', abilities: [ab('tl_kunoichi_venom', 'Venom Blades', 'hit', 'bleed', { p: 0.3, v: 0.25 })] },
    ],
  ),
  archer: tree(
    'archer',
    [['Fletcher', 'bow', { atk: ATK }], ['Steady Hands', 'ring', { crit: 0.03 }], ['Light Quiver', 'hide', { atkSpeed: 0.04 }], ['Hunter\'s Cloak', 'cloak', { hp: 0.04 }]],
    [
      { name: 'Extra Arrow', icon: 'longbow', text: 'Volley is followed by a second, smaller one a moment later.', tal: { extra: 1 } },
      { name: 'Barbed Heads', icon: 'crossbow', text: 'Foes struck by Volley are slowed for 2s.', tal: { skillSlow: 2000 } },
    ],
    [
      { name: 'Marksman', icon: 'spectacles', text: 'Every 4th arrow hits twice as hard.', abilities: [ab('tl_archer_marksman', 'Marksman', 'nth', 'smite', { n: 4, v: 1 })] },
      { name: 'Ghillie Cloak', icon: 'shadowcloak', text: 'Hidden for 3s at the start and again every 12s.', abilities: [ab('tl_archer_ghillie', 'Ghillie Cloak', 'start', 'stealth', { w: 3 }), ab('tl_archer_ghillie2', 'Ghillie Cloak', 'tick', 'stealth', { n: 12, w: 3, show: true })] },
    ],
  ),
  wizard: tree(
    'wizard',
    [['Ember Focus', 'wand', { atk: ATK }], ['Warded Robes', 'robe', { hp: 0.04 }], ['Quick Chant', 'scroll', { charge: 0.1 }], ['Cinder Ring', 'ring', { def: 1 }]],
    [
      { name: 'Twin Meteor', icon: 'orb', text: 'A second, smaller meteor follows the first.', tal: { extra: 1 } },
      { name: 'Searing Ground', icon: 'ruby', text: 'The burning ground lasts nearly twice as long (7s).', tal: { dur: 0.75 } },
    ],
    [
      { name: 'Wildfire', icon: 'emberrobe', text: '40% of his blows burst into flame: half again on the foes beside the target.', abilities: [ab('tl_wizard_wildfire', 'Wildfire', 'hit', 'splash', { p: 0.4, v: 0.5 })] },
      { name: 'Mana Siphon', icon: 'sapphire', text: 'Each kill feeds the king 8 mana and gives back 20% of the pool.', abilities: [ab('tl_wizard_siphon', 'Mana Siphon', 'kill', 'mana', { v: 8 }), ab('tl_wizard_siphon2', 'Mana Siphon', 'kill', 'charge', { v: 40 })] },
    ],
  ),
  ninjaMonk: tree(
    'ninjaMonk',
    [['Iron Knuckles', 'fist', { atk: ATK }], ['Lotus Stance', 'gi', { dodge: 0.03 }], ['Swift Hands', 'ring', { atkSpeed: 0.04 }], ['Hard Body', 'plate', { hp: HP }]],
    [
      { name: 'Pressure Points', icon: 'bone', text: 'Thousand Fists holds the foe for 2.4s.', tal: { dur: 0.6 } },
      { name: 'Fourth Fist', icon: 'fist', text: 'Thousand Fists lands a fourth strike.', tal: { extra: 1 } },
    ],
    [
      { name: 'Stunning Palm', icon: 'idol', text: 'Every 3rd blow stuns the foe for 0.8s.', abilities: [ab('tl_ninjaMonk_palm', 'Stunning Palm', 'nth', 'stun', { n: 3, w: 0.8 })] },
      { name: 'Inner Calm', icon: 'bell', text: 'Mends 3% of his health every 2s.', abilities: [ab('tl_ninjaMonk_calm', 'Inner Calm', 'tick', 'heal', { n: 2, v: 0.03 })] },
    ],
  ),
  peasant: tree(
    'peasant',
    [['Hardy Stock', 'jerkin', { hp: HP }], ['Sharpened Spear', 'spear', { atk: ATK }], ['Thick Boots', 'boots', { def: 1 }], ['Packed Lunch', 'vial', { regen: 0.004 }]],
    [
      { name: 'Shields Up', icon: 'aegis', text: 'Hold the Line lasts half as long again (4.5s).', tal: { dur: 0.5 } },
      { name: 'Pitchfork Wall', icon: 'spear', text: 'Hold the Line covers allies 1 tile further.', tal: { reach: 1 } },
    ],
    [
      { name: 'Rabble Rouser', icon: 'drum', text: 'Every 10s, allies within 3 tiles hit a quarter harder for 4s.', abilities: [ab('tl_peasant_rouser', 'Rabble Rouser', 'tick', 'rally', { n: 10, w: 4, show: true })] },
      { name: 'Militia Pride', icon: 'charm', text: 'Takes 6% less from each ally beside him (up to 3), and +5% hp.', tal: { huddle: 0.06 }, stats: { hp: 0.05 } },
    ],
  ),
  lightningMage: tree(
    'lightningMage',
    [['Storm Focus', 'stormstaff', { atk: ATK }], ['Grounded Boots', 'boots', { def: 1 }], ['Conductor', 'ring', { charge: 0.1 }], ['Static Cloak', 'cloak', { hp: 0.04 }]],
    [
      { name: 'Forked Bolt', icon: 'stormstaff', text: 'Chain Lightning jumps through two more foes.', tal: { extra: 2 } },
      { name: 'Overcharge', icon: 'sapphire', text: 'Chain Lightning hits a third harder.', tal: { pow: 0.35 } },
    ],
    [
      { name: 'Storm Conduit', icon: 'orb', text: '30% of his blows leap on to a second foe.', abilities: [ab('tl_lightningMage_conduit', 'Storm Conduit', 'hit', 'chain', { p: 0.3, v: 0.6 })] },
      { name: 'Thunderclap', icon: 'bell', text: 'Foes struck by Chain Lightning are held for 0.7s.', tal: { skillStun: 700 } },
    ],
  ),
  wanderer: tree(
    'wanderer',
    [['Kind Heart', 'amulet', { hp: HP }], ['Travelling Light', 'boots', { moveSpeed: 0.06 }], ['Quiet Prayer', 'scroll', { charge: 0.1 }], ['Road-worn Cloak', 'cloak', { def: 1 }]],
    [
      { name: 'Lasting Light', icon: 'lyre', text: 'Healing Mist guards for 3.5s and hangs longer.', tal: { dur: 0.75 } },
      { name: 'Radiant Wave', icon: 'emerald', text: 'Healing Mist heals half as much again.', tal: { pow: 0.5 } },
    ],
    [
      { name: 'Second Chance', icon: 'feather', text: 'Once a fight, when she would fall she rises at 30% health.', abilities: [ab('tl_wanderer_chance', 'Second Chance', 'death', 'revive', { v: 0.3 })] },
      { name: "Shepherd's Flame", icon: 'vial', text: 'Every 8s the weakest ally is healed 18% of its health.', abilities: [ab('tl_wanderer_flame', "Shepherd's Flame", 'tick', 'healAlly', { n: 8, v: 0.18, show: true })] },
    ],
  ),
  kitsune: tree(
    'kitsune',
    [['Fox Cunning', 'spectacles', { crit: 0.03 }], ['Soft Paws', 'boots', { moveSpeed: 0.06 }], ['Spirit Fur', 'silk', { hp: HP }], ['Bright Tails', 'charm', { atk: ATK }]],
    [
      { name: 'Lingering Charm', icon: 'pendant', text: 'Fox Charm and the Nine-Tailed Dream last half as long again.', tal: { dur: 0.5 } },
      { name: 'Far-sighted', icon: 'spectacles', text: 'Fox Charm reaches 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Nine Tails Unbound', icon: 'orb', text: 'The Nine-Tailed Dream charges 40% faster, and +10% pool refill.', tal: { ultRate: 0.4 }, stats: { charge: 0.1 } },
      { name: 'Foxfire', icon: 'ruby', text: '35% of her blows set the foe alight.', abilities: [ab('tl_kitsune_foxfire', 'Foxfire', 'hit', 'burn', { p: 0.35, v: 0.3 })] },
    ],
  ),
  karasu: tree(
    'karasu',
    [['Black Feathers', 'feather', { atk: ATK }], ['Hollow Bones', 'bone', { moveSpeed: 0.06 }], ['Sharp Talons', 'dagger', { crit: 0.03 }], ['Wing Muscle', 'harness', { hp: 0.04 }]],
    [
      { name: 'Talon Strike', icon: 'scythe', text: 'Dive strikes 40% harder.', tal: { pow: 0.4 } },
      { name: 'Wind Rider', icon: 'feather', text: 'After a dive he is hasted for 3s.', tal: { castHaste: 3000 } },
    ],
    [
      { name: 'Storm Caller', icon: 'stormstaff', text: 'Feather Storm hits 40% harder and charges 40% faster.', tal: { ultPow: 0.4, ultRate: 0.4 } },
      { name: 'Rending Talons', icon: 'axe', text: '35% of his blows make the foe bleed.', abilities: [ab('tl_karasu_rend', 'Rending Talons', 'hit', 'bleed', { p: 0.35, v: 0.25 })] },
    ],
  ),
  yamabushi: tree(
    'yamabushi',
    [['Mountain Stance', 'plate', { hp: 0.03 }], ['Staff Drill', 'spear', { atk: 0.03 }], ['Iron Sandals', 'boots', { def: 1 }], ['Deep Breath', 'elixir', { regen: 0.002 }]],
    [
      { name: 'Gale Force', icon: 'feather', text: 'Wind Gust reaches 1 tile further.', tal: { reach: 1 } },
      { name: 'Hurricane', icon: 'stormstaff', text: 'Wind Gust and Tempest hit a fifth harder.', tal: { pow: 0.2 } },
    ],
    [
      { name: 'Eye of the Storm', icon: 'orb', text: 'Tempest hits a quarter harder, stuns 30% longer and charges 20% faster.', tal: { ultPow: 0.25, dur: 0.3, ultRate: 0.2 } },
      { name: 'Mountain Spirit', icon: 'idol', text: 'Once, when low, he takes half damage for 3s and mends 12% of his health.', abilities: [ab('tl_yamabushi_spirit', 'Mountain Spirit', 'low', 'guard', { w: 3 }), ab('tl_yamabushi_spirit2', 'Mountain Spirit', 'low', 'heal', { v: 0.12 })] },
    ],
  ),
  werewolf: tree(
    'werewolf',
    [['Thick Pelt', 'hide', { hp: HP }], ['Sharp Fangs', 'bone', { atk: ATK }], ['Night Hunter', 'boots', { moveSpeed: 0.06 }], ['Wild Eyes', 'spectacles', { crit: 0.03 }]],
    [
      { name: 'Bloodthirst', icon: 'scythe', text: 'Ravage bites 30% harder, and heals him for that much more.', tal: { pow: 0.3 } },
      { name: 'Savage Pace', icon: 'boots', text: 'His kill frenzy stacks two higher (five).', tal: { frenzyMax: 2 } },
    ],
    [
      { name: "Hunter's Instinct", icon: 'ruby', text: 'Each kill heals him a tenth of his health.', abilities: [ab('tl_werewolf_instinct', "Hunter's Instinct", 'kill', 'heal', { v: 0.1 })] },
      { name: 'Undying Beast', icon: 'amulet', text: 'Once a fight, when he would fall he rises at a fifth of his health.', abilities: [ab('tl_werewolf_undying', 'Undying Beast', 'death', 'revive', { v: 0.2 })] },
    ],
  ),
  minotaur: tree(
    'minotaur',
    [['Bull Neck', 'plate', { hp: HP }], ['Heavy Horns', 'maul', { atk: ATK }], ['Hide Plates', 'scale', { def: 1 }], ['Thundering Hooves', 'boots', { moveSpeed: 0.06 }]],
    [
      { name: 'Longer Charge', icon: 'boots', text: 'Gore Charge runs 2 tiles further.', tal: { reach: 2 } },
      { name: 'Skull Crusher', icon: 'maul', text: 'The foe it hits is stunned for 2.7s.', tal: { dur: 0.8 } },
    ],
    [
      { name: 'Rampage', icon: 'axe', text: 'Each kill gives back 30% of the pool.', abilities: [ab('tl_minotaur_rampage', 'Rampage', 'kill', 'charge', { v: 60 })] },
      { name: 'Thick Hide', icon: 'bastion', text: 'Blows from the front lose a further 15%, and +1 defence.', tal: { block: 0.15 }, stats: { def: 1 } },
    ],
  ),
  satyr: tree(
    'satyr',
    [['Goat Legs', 'boots', { moveSpeed: 0.06 }], ['Wild Dance', 'lyre', { atkSpeed: 0.04 }], ['Shaggy Coat', 'hide', { hp: HP }], ['Horned Brow', 'circlet', { atk: ATK }]],
    [
      { name: 'Endless Tune', icon: 'lyre', text: 'Pipes of Pan last 60% longer.', tal: { dur: 0.6 } },
      { name: 'Wide Melody', icon: 'bell', text: 'The pipes carry 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Healing Notes', icon: 'emerald', text: 'Every 6s the weakest ally is healed 15% of its health.', abilities: [ab('tl_satyr_notes', 'Healing Notes', 'tick', 'healAlly', { n: 6, v: 0.15, show: true })] },
      { name: 'Fleet Hooves', icon: 'feather', text: '+12% move speed and +8% dodge.', stats: { moveSpeed: 0.12, dodge: 0.08 } },
    ],
  ),
  gorgon: tree(
    'gorgon',
    [['Scale Plates', 'scale', { def: 1 }], ['Baleful Eye', 'spectacles', { atk: ATK }], ['Stone Heart', 'idol', { hp: HP }], ['Slow Coil', 'charm', { charge: 0.1 }]],
    [
      { name: 'Longer Stare', icon: 'emerald', text: 'The foes she stiffens stay stone 60% longer.', tal: { dur: 0.6 } },
      { name: 'Wide Gaze', icon: 'spectacles', text: 'Her gaze and Stone Curse reach 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Stone Mastery', icon: 'sapphire', text: 'Stone Curse hits 50% harder and charges 50% faster.', tal: { ultPow: 0.5, ultRate: 0.5 } },
      { name: 'Basilisk Venom', icon: 'vial', text: '35% of her shots curse the foe.', abilities: [ab('tl_gorgon_venom', 'Basilisk Venom', 'hit', 'curse', { p: 0.35, v: 0.2 })] },
    ],
  ),
  samuraiCommander: tree(
    'samuraiCommander',
    [['Lacquered Armour', 'lamellar', { hp: HP }], ['Commander\'s Blade', 'katana', { atk: ATK }], ['War Paint', 'charm', { crit: 0.03 }], ['Marching Drill', 'boots', { moveSpeed: 0.06 }]],
    [
      { name: 'Lasting Banner', icon: 'drum', text: 'War Banner and Rally Cry last 60% longer.', tal: { dur: 0.6 } },
      { name: 'Far Banner', icon: 'bell', text: 'War Banner covers allies 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Inspiring Presence', icon: 'circlet', text: 'Rally Cry charges 60% faster.', tal: { ultRate: 0.6 }, stats: { charge: 0.1 } },
      { name: "Warlord's Stride", icon: 'harness', text: 'Every 8s he is hasted for 3s, and he hits 5% harder.', stats: { atk: 0.05 }, abilities: [ab('tl_samuraiCommander_stride', "Warlord's Stride", 'tick', 'haste', { n: 8, w: 3, show: true })] },
    ],
  ),
  paladin: tree(
    'paladin',
    [['Blessed Plate', 'plate', { hp: HP }], ['Holy Mace', 'mace', { atk: ATK }], ['Oath of Steel', 'aegis', { def: 1 }], ['Prayer', 'scroll', { regen: 0.004 }]],
    [
      { name: 'Righteous Anger', icon: 'bell', text: 'Holy Challenge holds foes on him 70% longer.', tal: { dur: 0.7 } },
      { name: 'Lay on Hands', icon: 'emerald', text: 'Holy Challenge heals 45% more.', tal: { pow: 0.45 } },
    ],
    [
      { name: 'Aegis of Light', icon: 'bastion', text: 'Holy Challenge gives him a shield of 15% of his health.', tal: { castShield: 0.15 } },
      { name: 'Retribution', icon: 'thornplate', text: '30% of blows taken are answered with half the blow.', abilities: [ab('tl_paladin_retribution', 'Retribution', 'struck', 'reflect', { p: 0.3, v: 0.5 })] },
    ],
  ),
  cleric: tree(
    'cleric',
    [['Devout', 'amulet', { hp: HP }], ['Censer', 'bell', { charge: 0.1 }], ['Pilgrim Boots', 'boots', { moveSpeed: 0.06 }], ['Plain Robes', 'vestments', { def: 1 }]],
    [
      { name: 'Prolonged Blessing', icon: 'lyre', text: 'Prayer of Healing heals for 8s.', tal: { dur: 0.6 } },
      { name: 'Empowered Prayer', icon: 'tome', text: 'Prayer of Healing heals half as much again each second.', tal: { pow: 0.5 } },
    ],
    [
      { name: 'Healing Hands', icon: 'emerald', text: 'Every 7s the weakest ally is healed 15% of its health.', abilities: [ab('tl_cleric_hands', 'Healing Hands', 'tick', 'healAlly', { n: 7, v: 0.15, show: true })] },
      { name: 'Divine Grace', icon: 'circlet', text: 'Every 6s the allies beside her heal 8% of their health.', abilities: [ab('tl_cleric_grace', 'Divine Grace', 'tick', 'aura', { n: 6, v: 0.08, show: true })] },
    ],
  ),
  druid: tree(
    'druid',
    [['Bark Skin', 'hide', { hp: HP }], ['Thorn Staff', 'wand', { atk: ATK }], ['Forest Boots', 'boots', { moveSpeed: 0.06 }], ['Green Thumb', 'emerald', { regen: 0.004 }]],
    [
      { name: 'Heartwood', icon: 'idol', text: 'The treant she calls hits 40% harder.', tal: { pow: 0.4 } },
      { name: 'Twin Saplings', icon: 'tome', text: 'She can keep a second treant standing.', tal: { extra: 1 } },
    ],
    [
      { name: 'Briar Cloak', icon: 'thornplate', text: 'Sends back a further quarter of a melee blow.', tal: { thorns: 0.25 } },
      { name: 'Verdant Touch', icon: 'vial', text: 'Every 5s the weakest ally is healed 15% of its health.', abilities: [ab('tl_druid_touch', 'Verdant Touch', 'tick', 'healAlly', { n: 5, v: 0.15, show: true })] },
    ],
  ),
  barbarian: tree(
    'barbarian',
    [['Thick Skull', 'plate', { hp: HP }], ['Notched Axe', 'axe', { atk: ATK }], ['War Cry', 'drum', { charge: 0.1 }], ['Hide Kilt', 'hide', { def: 1 }]],
    [
      { name: 'Cleaving Fury', icon: 'battleaxe', text: 'Whirlwind cuts 40% deeper.', tal: { pow: 0.4 } },
      { name: 'Wide Swing', icon: 'axe', text: 'Whirlwind reaches a tile further, a 5x5 of tiles.', tal: { reach: 1 } },
    ],
    [
      { name: 'Bloodbath', icon: 'ruby', text: 'Each kill heals him 15% of his health.', abilities: [ab('tl_barbarian_bath', 'Bloodbath', 'kill', 'heal', { v: 0.15 })] },
      { name: 'Berserker', icon: 'scythe', text: 'His rage grows: up to 50% more attack as his health falls.', tal: { rage: 0.5 } },
    ],
  ),
  ranger: tree(
    'ranger',
    [['Keen Sight', 'spectacles', { crit: 0.03 }], ['Hunting Bow', 'bow', { atk: ATK }], ['Forest Stride', 'boots', { moveSpeed: 0.06 }], ['Camouflage', 'hide', { hp: 0.04 }]],
    [
      { name: 'Third Snare', icon: 'crossbow', text: 'Snare Trap lays a third trap.', tal: { extra: 1 } },
      { name: 'Iron Jaws', icon: 'mace', text: 'The foe in a trap is held 75% longer (3.5s).', tal: { dur: 0.75 } },
    ],
    [
      { name: "Hunter's Mark", icon: 'ring', text: '40% of her shots slow the foe for 1.5s.', abilities: [ab('tl_ranger_mark', "Hunter's Mark", 'hit', 'slow', { p: 0.4, w: 1.5 })] },
      { name: 'Poisoned Tips', icon: 'elixir', text: '30% of her shots make the foe bleed.', abilities: [ab('tl_ranger_poison', 'Poisoned Tips', 'hit', 'bleed', { p: 0.3, v: 0.2 })] },
    ],
  ),
  warlock: tree(
    'warlock',
    [['Dark Focus', 'tome', { atk: 0.03 }], ['Shadow Weave', 'silk', { hp: 0.03 }], ['Whispers', 'scroll', { charge: 0.06 }], ['Bone Charm', 'bone', { def: 1 }]],
    [
      { name: 'Lingering Curse', icon: 'orb', text: 'Hex burns for 7s.', tal: { dur: 0.4 } },
      { name: 'Soul Feast', icon: 'shard', text: 'Casting Hex heals him 15% of his health.', tal: { castHeal: 0.15 } },
    ],
    [
      { name: 'Blood Pact', icon: 'ruby', text: 'Heals for a further 10% of the damage his blows deal.', tal: { leech: 0.1 } },
      { name: 'Dread Harvest', icon: 'scythe', text: 'The slain burst for his full attack on the foes beside them.', abilities: [ab('tl_warlock_harvest', 'Dread Harvest', 'kill', 'burst', { v: 1 })] },
    ],
  ),
  illusionist: tree(
    'illusionist',
    [['Nimble Fingers', 'ring', { atkSpeed: 0.04 }], ['Silk Sleeves', 'silk', { dodge: 0.03 }], ['Trickster\'s Edge', 'dagger', { atk: ATK }], ['Quick Feet', 'boots', { moveSpeed: 0.06 }]],
    [
      { name: 'Lasting Mirage', icon: 'orb', text: 'The decoys draw the foes 80% longer (5.4s).', tal: { dur: 0.8 } },
      { name: 'Cloak of Mirrors', icon: 'shadowcloak', text: 'Mirror Image gives her a shield of 12% of her health.', tal: { castShield: 0.12 } },
    ],
    [
      { name: 'Trickster', icon: 'charm', text: '+8% dodge, and 20% of blows taken are answered with a strike.', stats: { dodge: 0.08 }, abilities: [ab('tl_illusionist_trick', 'Trickster', 'struck', 'counter', { p: 0.2, v: 0.8 })] },
      { name: 'Vanishing Act', icon: 'vial', text: 'Hidden for 2s at the start and again every 14s.', abilities: [ab('tl_illusionist_vanish', 'Vanishing Act', 'start', 'stealth', { w: 2 }), ab('tl_illusionist_vanish2', 'Vanishing Act', 'tick', 'stealth', { n: 14, w: 2, show: true })] },
    ],
  ),
  gunslinger: tree(
    'gunslinger',
    [['Steady Aim', 'spectacles', { crit: 0.03 }], ['Hot Powder', 'blunderbuss', { atk: ATK }], ['Duster Coat', 'cloak', { hp: 0.04 }], ['Light Trigger', 'ring', { atkSpeed: 0.04 }]],
    [
      { name: 'Longer Barrel', icon: 'longbow', text: 'Dead Eye reaches 2 tiles further down the line.', tal: { reach: 2 } },
      { name: 'Hollow Points', icon: 'shard', text: 'Dead Eye hits 40% harder.', tal: { pow: 0.4 } },
    ],
    [
      { name: 'Trick Shot', icon: 'charm', text: 'Every 3rd shot hits nearly twice as hard.', abilities: [ab('tl_gunslinger_trick', 'Trick Shot', 'nth', 'smite', { n: 3, v: 0.9 })] },
      { name: 'Quick Draw', icon: 'ring', text: 'Dead Eye gives back 40% of its cost, and +8% attack speed.', tal: { refund: 40 }, stats: { atkSpeed: 0.08 } },
    ],
  ),

  // ---- the second wave of heroes ----
  shambler: tree(
    'shambler',
    [['Grave Soil', 'hide', { hp: HP }], ['Rusted Nails', 'bone', { atk: ATK }], ['Thick Skin', 'scale', { def: 1 }], ['Festering Wounds', 'vial', { regen: 0.004 }]],
    [
      { name: 'Lingering Rot', icon: 'elixir', text: 'Rotting Touch festers for 6s.', tal: { dur: 0.5 } },
      { name: 'Wider Stench', icon: 'bell', text: 'Rotting Touch reaches 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Plague Carrier', icon: 'vial', text: '35% of his blows make the foe bleed.', abilities: [ab('tl_shambler_plague', 'Plague Carrier', 'hit', 'bleed', { p: 0.35, v: 0.25 })] },
      { name: 'Rise Again', icon: 'amulet', text: 'Once a fight, when he would fall he rises at 30% health.', abilities: [ab('tl_shambler_rise', 'Rise Again', 'death', 'revive', { v: 0.3 })] },
    ],
  ),
  rifleBot: tree(
    'rifleBot',
    [['Scope Upgrade', 'spectacles', { crit: 0.03 }], ['Overclocked Barrel', 'blunderbuss', { atk: ATK }], ['Plated Casing', 'plate', { hp: 0.04 }], ['Servo Joints', 'ring', { atkSpeed: 0.04 }]],
    [
      { name: 'Extended Magazine', icon: 'crossbow', text: 'Burst Fire shoots a fourth round.', tal: { extra: 1 } },
      { name: 'Armour-piercing Rounds', icon: 'shard', text: 'Burst Fire hits 35% harder.', tal: { pow: 0.35 } },
    ],
    [
      { name: 'Suppressing Fire', icon: 'bell', text: '40% of his shots slow the foe for 1.5s.', abilities: [ab('tl_rifleBot_suppress', 'Suppressing Fire', 'hit', 'slow', { p: 0.4, w: 1.5 })] },
      { name: 'Target Lock', icon: 'ring', text: 'Burst Fire gives back 40% of its cost, and +8% attack speed.', tal: { refund: 40 }, stats: { atkSpeed: 0.08 } },
    ],
  ),
  mercenary: tree(
    'mercenary',
    [['Veteran Grit', 'jerkin', { hp: HP }], ['Notched Sabre', 'sword', { atk: ATK }], ['Coin Purse', 'pendant', { crit: 0.03 }], ['Marching Boots', 'boots', { moveSpeed: 0.06 }]],
    [
      { name: 'Bigger Bounty', icon: 'dagger', text: 'Bounty Hunt cuts 40% deeper.', tal: { pow: 0.4 } },
      { name: 'Quick Contract', icon: 'ring', text: 'After Bounty Hunt he is hasted for 3s.', tal: { castHaste: 3000 } },
    ],
    [
      { name: 'Dirty Fighter', icon: 'axe', text: 'Every 3rd blow hits nearly twice as hard.', abilities: [ab('tl_mercenary_dirty', 'Dirty Fighter', 'nth', 'smite', { n: 3, v: 0.9 })] },
      { name: 'Hired Protection', icon: 'bastion', text: 'Bounty Hunt gives him a shield of 12% of his health, and +8% hp.', tal: { castShield: 0.12 }, stats: { hp: 0.08 } },
    ],
  ),
  mummy: tree(
    'mummy',
    [['Linen Layers', 'silk', { hp: HP }], ['Dusty Fists', 'fist', { atk: ATK }], ['Ancient Amulet', 'amulet', { def: 1 }], ['Embalmed', 'elixir', { regen: 0.004 }]],
    [
      { name: 'Tight Bindings', icon: 'bone', text: 'Binding Wraps slow for 5s.', tal: { dur: 0.65 } },
      { name: 'Long Wraps', icon: 'bell', text: 'Binding Wraps reach 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: "Pharaoh's Curse", icon: 'ruby', text: '35% of his blows curse the foe.', abilities: [ab('tl_mummy_curse', "Pharaoh's Curse", 'hit', 'curse', { p: 0.35, v: 0.2 })] },
      { name: 'Sarcophagus', icon: 'bastion', text: 'Blows from the front lose a further 15%, and +1 defence.', tal: { block: 0.15 }, stats: { def: 1 } },
    ],
  ),
  buccaneer: tree(
    'buccaneer',
    [['Salt Air', 'jerkin', { hp: HP }], ['Sharp Cutlass', 'sword', { atk: ATK }], ['Steady Legs', 'boots', { moveSpeed: 0.06 }], ['Lucky Coin', 'charm', { crit: 0.03 }]],
    [
      { name: 'Long Chain', icon: 'crossbow', text: 'Grappling Hook reaches 2 tiles further.', tal: { reach: 2 } },
      { name: 'Barbed Hook', icon: 'dagger', text: 'Grappling Hook cuts 40% deeper.', tal: { pow: 0.4 } },
    ],
    [
      { name: 'Plunder', icon: 'ruby', text: 'Each kill gives back 30% of the pool.', abilities: [ab('tl_buccaneer_plunder', 'Plunder', 'kill', 'charge', { v: 60 })] },
      { name: 'Rum Ration', icon: 'vial', text: 'Mends 8% of his health every 6s.', abilities: [ab('tl_buccaneer_rum', 'Rum Ration', 'tick', 'heal', { n: 6, v: 0.08 })] },
    ],
  ),
  wolfBard: tree(
    'wolfBard',
    [['Fine Fur', 'hide', { hp: HP }], ['Sharp Notes', 'lyre', { atk: ATK }], ['Quick Fingers', 'ring', { atkSpeed: 0.04 }], ['Travelling Cloak', 'cloak', { def: 1 }]],
    [
      { name: 'Long Verse', icon: 'scroll', text: 'Dirge lasts 60% longer.', tal: { dur: 0.6 } },
      { name: 'Loud Chorus', icon: 'bell', text: 'Dirge reaches 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Encore', icon: 'drum', text: 'Dirge gives back 40% of its cost, and +10% pool refill.', tal: { refund: 40 }, stats: { charge: 0.1 } },
      { name: 'Rousing Ballad', icon: 'emerald', text: 'Every 8s the weakest ally is healed 15% of its health.', abilities: [ab('tl_wolfBard_ballad', 'Rousing Ballad', 'tick', 'healAlly', { n: 8, v: 0.15, show: true })] },
    ],
  ),
  beastmaster: tree(
    'beastmaster',
    [['Leather Gloves', 'jerkin', { hp: HP }], ['Hooked Whip', 'dagger', { atk: ATK }], ['Animal Lore', 'scroll', { charge: 0.1 }], ['Sure Footing', 'boots', { moveSpeed: 0.06 }]],
    [
      { name: 'Third Wolf', icon: 'bone', text: 'He can keep a third wolf at his side.', tal: { extra: 1 } },
      { name: "Alpha's Howl", icon: 'bell', text: 'The wolves he calls hit 40% harder.', tal: { pow: 0.4 } },
    ],
    [
      { name: 'Pack Hunter', icon: 'charm', text: 'Takes 6% less from each ally beside him (the wolves count), and +5% hp.', tal: { huddle: 0.06 }, stats: { hp: 0.05 } },
      { name: 'Wild Bond', icon: 'emerald', text: 'Every 6s the weakest ally is healed 15% of its health.', abilities: [ab('tl_beastmaster_bond', 'Wild Bond', 'tick', 'healAlly', { n: 6, v: 0.15, show: true })] },
    ],
  ),
  kraken: tree(
    'kraken',
    [['Barnacle Plates', 'scale', { def: 1 }], ['Hooked Claws', 'dagger', { atk: ATK }], ['Deep Lungs', 'amulet', { hp: HP }], ['Brine-soaked', 'vial', { regen: 0.004 }]],
    [
      { name: 'Riptide', icon: 'bell', text: 'Undertow reaches 2 tiles further.', tal: { reach: 2 } },
      { name: 'Crushing Depths', icon: 'maul', text: 'Undertow hits 40% harder.', tal: { pow: 0.4 } },
    ],
    [
      { name: "Kraken's Grasp", icon: 'idol', text: 'Foes struck by Undertow are held for 0.7s.', tal: { skillStun: 700 } },
      { name: 'Ink Screen', icon: 'shadowcloak', text: 'Hidden for 2s at the start and again every 14s.', abilities: [ab('tl_kraken_ink', 'Ink Screen', 'start', 'stealth', { w: 2 }), ab('tl_kraken_ink2', 'Ink Screen', 'tick', 'stealth', { n: 14, w: 2, show: true })] },
    ],
  ),
  lancer: tree(
    'lancer',
    [['Barding', 'plate', { hp: HP }], ['Steel Lance', 'spear', { atk: ATK }], ['Spurs', 'boots', { moveSpeed: 0.06 }], ['Pennon', 'charm', { crit: 0.03 }]],
    [
      { name: 'Longer Run-up', icon: 'longbow', text: 'Lance Charge runs 2 tiles further.', tal: { reach: 2 } },
      { name: 'Hard Charge', icon: 'maul', text: 'Lance Charge hits 35% harder.', tal: { pow: 0.35 } },
    ],
    [
      { name: 'Victory Lap', icon: 'ruby', text: 'Each kill gives back 30% of the pool.', abilities: [ab('tl_lancer_lap', 'Victory Lap', 'kill', 'charge', { v: 60 })] },
      { name: 'Shock Impact', icon: 'idol', text: 'Foes struck by Lance Charge are held for 0.8s.', tal: { skillStun: 800 } },
    ],
  ),
  reaper: tree(
    'reaper',
    [['Pale Mist', 'silk', { dodge: 0.03 }], ['Honed Scythe', 'scythe', { atk: ATK }], ['Hollow Form', 'hide', { hp: HP }], ['Grim Patience', 'spectacles', { crit: 0.03 }]],
    [
      { name: 'Wider Sweep', icon: 'blade', text: 'Reap reaches 2 tiles further.', tal: { reach: 2 } },
      { name: 'Soul Harvest', icon: 'ruby', text: 'Reap cuts 40% deeper.', tal: { pow: 0.4 } },
    ],
    [
      { name: 'Collector', icon: 'idol', text: 'Each kill heals him a tenth of his health and gives back 20% of the pool.', abilities: [ab('tl_reaper_collector', 'Collector', 'kill', 'heal', { v: 0.1 }), ab('tl_reaper_collector2', 'Collector', 'kill', 'charge', { v: 40 })] },
      { name: 'Cold Touch', icon: 'shard', text: '35% of his blows slow the foe for 1.5s.', abilities: [ab('tl_reaper_cold', 'Cold Touch', 'hit', 'slow', { p: 0.35, w: 1.5 })] },
    ],
  ),
  timeWitch: tree(
    'timeWitch',
    [['Hourglass Sand', 'orb', { charge: 0.1 }], ['Chrono Focus', 'wand', { atk: ATK }], ['Silk Sleeves', 'silk', { hp: 0.04 }], ['Pocket Watch', 'pendant', { dodge: 0.03 }]],
    [
      { name: 'Stretched Seconds', icon: 'scroll', text: 'Temporal Surge lasts 60% longer.', tal: { dur: 0.6 } },
      { name: 'Wider Field', icon: 'bell', text: 'Temporal Surge reaches 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Time Loop', icon: 'sapphire', text: 'Once a fight, when she would fall she rises at 30% health.', abilities: [ab('tl_timeWitch_loop', 'Time Loop', 'death', 'revive', { v: 0.3 })] },
      { name: 'Borrowed Time', icon: 'ring', text: 'Temporal Surge gives back 40% of its cost, and +8% attack speed.', tal: { refund: 40 }, stats: { atkSpeed: 0.08 } },
    ],
  ),
  arcBlade: tree(
    'arcBlade',
    [['Capacitors', 'ring', { charge: 0.1 }], ['Plasma Edge', 'blade', { atk: ATK }], ['Hardened Chassis', 'plate', { hp: HP }], ['Servo Boots', 'boots', { moveSpeed: 0.06 }]],
    [
      { name: 'Bigger Discharge', icon: 'stormstaff', text: 'Voltage Blink hits 40% harder.', tal: { pow: 0.4 } },
      { name: 'Longer Arc', icon: 'bell', text: 'Voltage Blink jumps 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Overload', icon: 'orb', text: '30% of his blows leap on to a second foe.', abilities: [ab('tl_arcBlade_overload', 'Overload', 'hit', 'chain', { p: 0.3, v: 0.6 })] },
      { name: 'Shock Plating', icon: 'thornplate', text: 'Sends back a further quarter of a melee blow.', tal: { thorns: 0.25 } },
    ],
  ),
  dreadPirate: tree(
    'dreadPirate',
    [['Barnacled Bones', 'bone', { hp: HP }], ['Rusty Cutlass', 'sword', { atk: ATK }], ['Sea Boots', 'boots', { def: 1 }], ['Ghostly Grog', 'vial', { regen: 0.004 }]],
    [
      { name: 'Double Charge', icon: 'ruby', text: 'A second, smaller broadside follows the first.', tal: { extra: 1 } },
      { name: 'Heavy Shot', icon: 'maul', text: 'Broadside hits 40% harder.', tal: { pow: 0.4 } },
    ],
    [
      { name: 'Ghost Crew', icon: 'drum', text: 'Every 10s, allies within 3 tiles hit a quarter harder for 4s.', abilities: [ab('tl_dreadPirate_crew', 'Ghost Crew', 'tick', 'rally', { n: 10, w: 4, show: true })] },
      { name: 'Dead Men Tell No Tales', icon: 'scythe', text: 'Each kill heals him 12% of his health.', abilities: [ab('tl_dreadPirate_tales', 'Dead Men Tell No Tales', 'kill', 'heal', { v: 0.12 })] },
    ],
  ),
  siegeBot: tree(
    'siegeBot',
    [['Heavy Armour', 'plate', { hp: HP }], ['High-yield Shells', 'blunderbuss', { atk: ATK }], ['Targeting Scope', 'spectacles', { crit: 0.03 }], ['Auto-loader', 'ring', { atkSpeed: 0.04 }]],
    [
      { name: 'Twin Shells', icon: 'crossbow', text: 'A second, smaller shell follows the first.', tal: { extra: 1 } },
      { name: 'Longer Barrel', icon: 'longbow', text: 'Shell Barrage reaches 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Cluster Rounds', icon: 'orb', text: '40% of his shots burst: half again on the foes beside the target.', abilities: [ab('tl_siegeBot_cluster', 'Cluster Rounds', 'hit', 'splash', { p: 0.4, v: 0.5 })] },
      { name: 'Fortress Mode', icon: 'bastion', text: 'Blows from the front lose a further 15%, and +1 defence.', tal: { block: 0.15 }, stats: { def: 1 } },
    ],
  ),
  priestess: tree(
    'priestess',
    [['Holy Vestments', 'vestments', { hp: HP }], ['Radiant Focus', 'tome', { atk: ATK }], ['Prayer Beads', 'amulet', { charge: 0.1 }], ['Pilgrim Sandals', 'boots', { moveSpeed: 0.06 }]],
    [
      { name: 'Overflowing Light', icon: 'emerald', text: 'Cure Wounds heals half as much again.', tal: { pow: 0.5 } },
      { name: 'Healing Rain', icon: 'bell', text: 'Cure Wounds reaches the allies 2 tiles further round its target.', tal: { reach: 2 } },
    ],
    [
      { name: 'Divine Intervention', icon: 'feather', text: 'Once a fight, when she would fall she rises at 40% health.', abilities: [ab('tl_priestess_divine', 'Divine Intervention', 'death', 'revive', { v: 0.4 })] },
      { name: 'Sanctified Ground', icon: 'circlet', text: 'Every 6s the allies beside her heal 8% of their health.', abilities: [ab('tl_priestess_ground', 'Sanctified Ground', 'tick', 'aura', { n: 6, v: 0.08, show: true })] },
    ],
  ),
  dragoon: tree(
    'dragoon',
    [['Dragonscale Mail', 'dragonscale', { hp: HP }], ['Wyvern Spear', 'spear', { atk: ATK }], ['Wing Muscles', 'feather', { moveSpeed: 0.06 }], ['Royal Poise', 'circlet', { crit: 0.03 }]],
    [
      { name: 'Longer Breath', icon: 'longbow', text: 'Dragon Breath reaches 2 tiles further.', tal: { reach: 2 } },
      { name: 'Searing Flame', icon: 'emberrobe', text: 'Dragon Breath hits 40% harder.', tal: { pow: 0.4 } },
    ],
    [
      { name: 'Dragon Blood', icon: 'ruby', text: 'Heals for a further 10% of the damage her blows deal.', tal: { leech: 0.1 } },
      { name: 'Wyvern Rider', icon: 'feather', text: 'Every 8s she is hasted for 3s, and hits 6% harder.', stats: { atk: 0.06 }, abilities: [ab('tl_dragoon_rider', 'Wyvern Rider', 'tick', 'haste', { n: 8, w: 3, show: true })] },
    ],
  ),
  juggernaut: tree(
    'juggernaut',
    [['Reinforced Plating', 'plate', { hp: HP }], ['Piston Fists', 'fist', { atk: ATK }], ['Heavy Treads', 'boots', { def: 1 }], ['Coolant Leak', 'vial', { regen: 0.004 }]],
    [
      { name: 'Deeper Fault', icon: 'idol', text: 'Earthquake holds foes 60% longer.', tal: { dur: 0.6 } },
      { name: 'Wider Quake', icon: 'bell', text: 'Earthquake reaches 2 tiles further.', tal: { reach: 2 } },
    ],
    [
      { name: 'Unstoppable', icon: 'bastion', text: 'Blows from the front lose a further 15%, and +1 defence.', tal: { block: 0.15 }, stats: { def: 1 } },
      { name: 'Seismic Counter', icon: 'thornplate', text: 'Sends back a further third of a melee blow.', tal: { thorns: 0.33 } },
    ],
  ),
  sage: tree(
    'sage',
    [['Ancient Tomes', 'tome', { atk: ATK }], ['Wide Hat', 'circlet', { hp: HP }], ["Sage's Sandals", 'boots', { moveSpeed: 0.06 }], ['Quiet Mind', 'scroll', { charge: 0.1 }]],
    [
      { name: 'Fourth Star', icon: 'orb', text: 'Starfall calls a fourth star.', tal: { extra: 1 } },
      { name: 'Brighter Stars', icon: 'sapphire', text: 'Starfall hits 40% harder.', tal: { pow: 0.4 } },
    ],
    [
      { name: 'Cosmic Wisdom', icon: 'ring', text: 'Astral Convergence charges 50% faster, and its shields last 40% longer.', tal: { ultRate: 0.5, dur: 0.4 } },
      { name: 'Eternal Study', icon: 'spectacles', text: '+8% attack and +10% faster pool refill.', stats: { atk: 0.08, charge: 0.1 } },
    ],
  ),
  demonSwordsman: tree(
    'demonSwordsman',
    [['Infernal Plate', 'plate', { hp: HP }], ['Demonblade', 'blade', { atk: ATK }], ['Dark Reflexes', 'shadowcloak', { dodge: 0.03 }], ['Hellfire Veins', 'ruby', { regen: 0.004 }]],
    [
      { name: 'Wider Sweep', icon: 'scythe', text: 'Hellblade Sweep reaches 2 tiles further.', tal: { reach: 2 } },
      { name: 'Hellish Edge', icon: 'claymore', text: 'Hellblade Sweep cuts 40% deeper.', tal: { pow: 0.4 } },
    ],
    [
      { name: 'Demon Ascendant', icon: 'idol', text: 'Demon Form charges 40% faster and lasts 30% longer.', tal: { ultRate: 0.4, dur: 0.3 } },
      { name: 'Soul Eater', icon: 'amulet', text: 'Each kill heals him 12% of his health.', abilities: [ab('tl_demonSwordsman_eater', 'Soul Eater', 'kill', 'heal', { v: 0.12 })] },
    ],
  ),
  tyrant: tree(
    'tyrant',
    [['Iron Crown', 'circlet', { hp: HP }], ['Spiked Staff', 'mace', { atk: ATK }], ['Black Cuirass', 'plate', { def: 1 }], ['Dread Aura', 'bell', { charge: 0.1 }]],
    [
      { name: 'Twin Verdicts', icon: 'scroll', text: 'A second, smaller judgement follows the first.', tal: { extra: 1 } },
      { name: 'Harsher Law', icon: 'maul', text: 'Judgement hits 30% harder.', tal: { pow: 0.3 } },
    ],
    [
      { name: 'Absolute Rule', icon: 'drum', text: 'Reign of Terror charges 50% faster and lasts 40% longer.', tal: { ultRate: 0.5, dur: 0.4 } },
      { name: "Tyrant's Due", icon: 'ruby', text: 'Each kill gives back 40 charge, and +5% attack speed.', stats: { atkSpeed: 0.05 }, abilities: [ab('tl_tyrant_due', "Tyrant's Due", 'kill', 'charge', { v: 40 })] },
    ],
  ),
};

// ---- the deep rows (tiers 4 to 7), added to every tree ----
for (const [kind, t] of Object.entries(TREES)) t.nodes.push(...deepNodes(kind, t.nodes.filter((n) => n.tier === 2), ALL_HEROES.indexOf(kind), ab, statText));

// ---- lookups ----
export const treeOf = (kind: string): TalentTree | undefined => TREES[kind];
export const nodeOf = (kind: string, id: string): TalentNode | undefined => TREES[kind]?.nodes.find((n) => n.id === id);
/** A node's cost in points. */
const ROW_NAMES = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
export const costOf = (n: TalentNode): number => TIER_COST[n.tier];
/** The nodes of a tier, in order. */
export const tierNodes = (kind: string, tier: TalentNode['tier']): TalentNode[] => TREES[kind]?.nodes.filter((n) => n.tier === tier) ?? [];

// ---- a kind's talents in the meta ----
export interface KindTalents {
  /** The node ids taken. */
  picks: string[];
  /** Points bought with shards (`SHARD_POINT_COST` shards each). */
  bought: number;
}

const own = (m: Meta, kind: string): KindTalents | undefined => m.talents?.[kind];
export const picksOf = (m: Meta, kind: string): string[] => own(m, kind)?.picks ?? [];
export const levelPoints = (level: number): number => Math.floor(level / LEVEL_POINT_EVERY) + milestonePoints(level);
export const boughtOf = (m: Meta, kind: string): number => own(m, kind)?.bought ?? 0;
/** Every point a kind has earned: from its level, plus those bought with shards. */
export const pointsEarned = (m: Meta, kind: string): number => levelPoints(levelOfKind(m, kind)) + boughtOf(m, kind);
/** The points the taken nodes cost. */
export const pointsSpent = (m: Meta, kind: string): number => picksOf(m, kind).reduce((n, id) => n + (nodeOf(kind, id) ? costOf(nodeOf(kind, id)!) : 0), 0);
export const pointsFree = (m: Meta, kind: string): number => pointsEarned(m, kind) - pointsSpent(m, kind);
/** Shards of a kind not yet turned into points. */
export const shardsToSpend = (m: Meta, kind: string): number => (m.shards[kind] ?? 0) - boughtOf(m, kind) * SHARD_POINT_COST - awakenSpent(m.awakened?.[kind] ?? 0);
/** Whether shards can buy another point now. */
export const canBuyPoint = (m: Meta, kind: string): boolean => m.unlocked.includes(kind) && !!TREES[kind] && boughtOf(m, kind) < MAX_SHARD_POINTS && shardsToSpend(m, kind) >= SHARD_POINT_COST;
export function buyPoint(m: Meta, kind: string): boolean {
  if (!canBuyPoint(m, kind)) return false;
  const t = ((m.talents ??= {})[kind] ??= { picks: [], bought: 0 });
  t.bought++;
  return true;
}

/** Why a node cannot be learned now (null when it can). */
export function whyNot(m: Meta, kind: string, id: string): string | null {
  const node = nodeOf(kind, id);
  if (!node || !m.unlocked.includes(kind)) return 'Not available';
  const picks = picksOf(m, kind);
  if (picks.includes(id)) return 'Already learned';
  const taken = (tier: number) => picks.filter((p) => nodeOf(kind, p)?.tier === tier);
  if (node.tier > 1 && taken(node.tier).length) return 'You chose the other one of this pair';
  if (levelOfKind(m, kind) < TIER_LEVEL[node.tier]) return `Opens at level ${TIER_LEVEL[node.tier]}`;
  if (node.tier === 2 && taken(1).length < TIER2_NEEDS) return `Learn ${TIER2_NEEDS} of the first row first`;
  if (node.tier >= 3 && !taken(node.tier - 1).length) return `Learn a node of the ${ROW_NAMES[node.tier - 1]} row first`;
  if (pointsFree(m, kind) < costOf(node)) return `Needs ${costOf(node)} point${costOf(node) > 1 ? 's' : ''}`;
  return null;
}
export const canLearn = (m: Meta, kind: string, id: string): boolean => whyNot(m, kind, id) === null;
export function learn(m: Meta, kind: string, id: string): boolean {
  if (!canLearn(m, kind, id)) return false;
  ((m.talents ??= {})[kind] ??= { picks: [], bought: 0 }).picks.push(id);
  return true;
}

/** Crowns a respec of a kind costs (0 when nothing is learned). */
export const respecCost = (m: Meta, kind: string): number => (picksOf(m, kind).length ? RESPEC_BASE + RESPEC_PER_POINT * pointsSpent(m, kind) : 0);
/** Give every point of a kind back, for crowns. False (and nothing changes) when nothing is learned or the crowns are short. */
export function respec(m: Meta, kind: string): boolean {
  const cost = respecCost(m, kind);
  if (!cost || m.crowns < cost) return false;
  m.crowns -= cost;
  own(m, kind)!.picks = [];
  return true;
}

// ---- in a fight ----
/** What a kind's taken talents add in a fight; undefined when it has none (so the fight is exactly as before). */
export function talentStats(m: Meta, kind: string): EquipStats | undefined {
  const picks = picksOf(m, kind).map((id) => nodeOf(kind, id)).filter((n): n is TalentNode => !!n);
  if (!picks.length) return undefined;
  const out = emptyStats();
  const tal: Record<string, number> = {};
  for (const n of picks) {
    for (const k of STAT_KEYS) out[k] += n.stats?.[k] ?? 0;
    for (const [k, v] of Object.entries(n.tal ?? {})) tal[k] = (tal[k] ?? 0) + v;
    for (const id of n.abilities ?? []) out.abilities.push({ id, name: TALENT_ABILITIES[id]?.name ?? id, s: 1 });
  }
  if (Object.keys(tal).length) out.tal = tal;
  return out;
}

/** Everything a hero kind brings to a fight beyond its stats: its worn equipment, its talents and an awakened hero's passive together (undefined when it has none). */
export function heroStats(m: Meta, kind: string): EquipStats | undefined {
  const worn = equipStats(m, kind);
  const talents = talentStats(m, kind);
  const awake = awakenStats(m, kind);
  let total: EquipStats | undefined;
  if (!talents) total = worn;
  else if (!worn) total = capStats(talents);
  else {
    total = addStats(worn, talents);
    if (talents.tal) total.tal = talents.tal;
    total = capStats(total);
  }
  // (an awakened hero's passive; a piece or set that already runs the same ability keeps its own)
  if (!awake) return total;
  if (!total) return awake;
  for (const a of awake.abilities) if (!total.abilities.some((x) => x.id === a.id)) total.abilities.push(a);
  return total;
}

/** Saved talents that are sane: a kind with a tree, nodes of it that exist, each once, a legal order (the rules of `whyNot`) and no more than the points allow. */
export function readTalents(raw: unknown, m: Meta): Record<string, KindTalents> {
  const out: Record<string, KindTalents> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [kind, v] of Object.entries(raw as Record<string, unknown>)) {
    const t = v as Partial<KindTalents> | null;
    if (!ALL_HEROES.includes(kind) || !TREES[kind] || !t || typeof t !== 'object') continue;
    const bought = Math.max(0, Math.min(MAX_SHARD_POINTS, Math.floor(Number(t.bought) || 0), Math.floor(Math.max(0, (m.shards[kind] ?? 0) - awakenSpent(m.awakened?.[kind] ?? 0)) / SHARD_POINT_COST)));
    const entry: KindTalents = { picks: [], bought };
    (out[kind] = entry);
    // (replay the picks through the rules; whatever does not fit is dropped)
    const hold = m.talents;
    m.talents = out;
    for (const id of Array.isArray(t.picks) ? t.picks : []) if (typeof id === 'string') learn(m, kind, id);
    m.talents = hold;
    if (!entry.picks.length && !entry.bought) delete out[kind];
  }
  return out;
}

/** The points a full tree takes: all four first-row nodes, and one each of the two pairs. */
export const FULL_TREE_POINTS = 4 * TIER_COST[1] + TIER_COST[2] + TIER_COST[3];
/** The points the four deep rows take: one node of each. */
export const DEEP_TREE_POINTS = TIER_COST[4] + TIER_COST[5] + TIER_COST[6] + TIER_COST[7];
