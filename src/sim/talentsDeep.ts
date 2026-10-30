// The deep rows of every hero's talent tree: four more rows past the original three, opened by the hero's lasting level (40, 60, 80
// and 100; `TIER_LEVEL` in `talents.ts`) and paid for with the extra points the levels give (one per 3 levels, and one more at each
// deep milestone). Like the old rows each is a choice of one from a pair, and a row opens once a node of the one before it is taken.
//
// The rows are written once for each of seven callings and fitted to the hero: the first row deepens the hero's own skill (the same
// effect its second row changed, a size or two on) or its ultimate, and the names of that skill and ultimate are the hero's own. The
// rest are the calling's signature, built from the effect kinds the rest of the tree already uses (stats, the `TAL_KEYS` and the
// abilities of `equipFx.ts`), so the fight needs nothing new. Pure data: no Pixi, no DOM.

import type { Ability, Kind, Trig } from './equipBases';
import type { StatKey } from './equipment';
import type { TalentNode } from './talents';

export type Calling = 'bulwark' | 'duelist' | 'berserker' | 'marksman' | 'archmage' | 'healer' | 'support';
export const CALLING_NAMES: Readonly<Record<Calling, string>> = {
  bulwark: 'Bulwark',
  duelist: 'Duelist',
  berserker: 'Berserker',
  marksman: 'Marksman',
  archmage: 'Archmage',
  healer: 'Healer',
  support: 'Support',
};

/** Each hero's calling, and the names of its skill and ultimate (the test checks them against the kits). */
export const DEEP_KITS: Readonly<Record<string, { calling: Calling; skill: string; ult: string }>> = {
  knight: { calling: 'bulwark', skill: 'Shield Wall', ult: 'Indomitable' },
  samurai: { calling: 'duelist', skill: 'Iaido', ult: 'Heaven-Splitting Cut' },
  kunoichi: { calling: 'duelist', skill: 'Shadow Step', ult: 'Shadow Dance' },
  archer: { calling: 'marksman', skill: 'Volley', ult: 'Arrow Storm' },
  wizard: { calling: 'archmage', skill: 'Meteor', ult: 'Armageddon' },
  peasant: { calling: 'bulwark', skill: 'Phalanx', ult: 'Call to Arms' },
  ninjaMonk: { calling: 'duelist', skill: 'Thousand Fists', ult: 'Hundred Fists' },
  wanderer: { calling: 'healer', skill: 'Healing Mist', ult: 'Panacea' },
  lightningMage: { calling: 'archmage', skill: 'Chain Lightning', ult: 'Thunderstorm' },
  kitsune: { calling: 'archmage', skill: 'Fox Charm', ult: 'Nine-Tailed Dream' },
  karasu: { calling: 'duelist', skill: 'Dive', ult: 'Feather Storm' },
  yamabushi: { calling: 'support', skill: 'Wind Gust', ult: 'Tempest' },
  werewolf: { calling: 'berserker', skill: 'Ravage', ult: 'Full Moon' },
  minotaur: { calling: 'bulwark', skill: 'Gore Charge', ult: 'Stampede' },
  satyr: { calling: 'support', skill: 'Pipes of Pan', ult: 'Bacchanal' },
  gorgon: { calling: 'archmage', skill: 'Petrifying Gaze', ult: 'Stone Curse' },
  samuraiCommander: { calling: 'support', skill: 'War Banner', ult: 'Rallying Cry' },
  paladin: { calling: 'bulwark', skill: 'Divine Smite', ult: 'Holy Nova' },
  cleric: { calling: 'healer', skill: 'Prayer of Healing', ult: 'Spirit Guardians' },
  druid: { calling: 'healer', skill: 'Conjure Treant', ult: 'Wall of Thorns' },
  barbarian: { calling: 'berserker', skill: 'Whirlwind', ult: 'Bloodlust' },
  ranger: { calling: 'marksman', skill: 'Snare Trap', ult: "Hunter's Net" },
  warlock: { calling: 'archmage', skill: 'Hex', ult: 'Soul Harvest' },
  illusionist: { calling: 'archmage', skill: 'Mirror Image', ult: 'Hall of Mirrors' },
  gunslinger: { calling: 'marksman', skill: 'Dead Eye', ult: 'High Noon' },
  shambler: { calling: 'bulwark', skill: 'Rotting Touch', ult: 'Plague Tide' },
  rifleBot: { calling: 'marksman', skill: 'Burst Fire', ult: 'Overclock' },
  mercenary: { calling: 'duelist', skill: 'Bounty Hunt', ult: 'Contract Killer' },
  mummy: { calling: 'bulwark', skill: 'Binding Wraps', ult: 'Curse of the Pharaoh' },
  buccaneer: { calling: 'duelist', skill: 'Grappling Hook', ult: 'Keelhaul' },
  wolfBard: { calling: 'support', skill: 'Vicious Mockery', ult: 'Battle Hymn' },
  beastmaster: { calling: 'support', skill: 'Call of the Wild', ult: 'Hunt of the Pack' },
  kraken: { calling: 'bulwark', skill: 'Undertow', ult: 'Maelstrom' },
  lancer: { calling: 'duelist', skill: 'Lance Charge', ult: 'Charge of the Knights' },
  reaper: { calling: 'duelist', skill: 'Reap', ult: 'Harvest of Souls' },
  timeWitch: { calling: 'archmage', skill: 'Temporal Surge', ult: 'Time Stop' },
  arcBlade: { calling: 'duelist', skill: 'Voltage Blink', ult: 'Thunder Cascade' },
  dreadPirate: { calling: 'berserker', skill: 'Broadside', ult: 'Ghost Fleet' },
  siegeBot: { calling: 'marksman', skill: 'Shell Barrage', ult: 'Orbital Strike' },
  priestess: { calling: 'healer', skill: 'Cure Wounds', ult: 'Mass Resurrection' },
  dragoon: { calling: 'berserker', skill: 'Dragon Breath', ult: 'Inferno Breath' },
  juggernaut: { calling: 'bulwark', skill: 'Seismic Slam', ult: 'Fissure' },
  sage: { calling: 'archmage', skill: 'Starfall', ult: 'Astral Convergence' },
  demonSwordsman: { calling: 'berserker', skill: 'Hellblade Sweep', ult: 'Demon Form' },
  tyrant: { calling: 'berserker', skill: 'Judgement', ult: 'Reign of Terror' },
};

type Stats = Partial<Record<StatKey, number>>;
interface Pick {
  name: string;
  icon: string;
  text: string;
  stats?: Stats;
  tal?: Record<string, number>;
  abilities?: string[];
}
export type AbMaker = (id: string, name: string, trig: Trig, kind: Kind, o?: Partial<Ability>) => string;
export type StatWords = (stats: Stats) => string;

const pct = (v: number) => `${Math.round(v * 100)}%`;
const secs = (ms: number) => `${Math.round(ms / 100) / 10}s`;

/** What a skill effect (a `TAL_KEYS` key of the hero's second row) becomes one row deeper: the size of the change, and how it reads. */
function deepen(key: string, v: number, skill: string): { tal: Record<string, number>; text: string } {
  switch (key) {
    case 'pow': return { tal: { pow: 0.4 }, text: `${skill} is 40% stronger still.` };
    case 'dur': return { tal: { dur: 0.5 }, text: `${skill} lasts half as long again.` };
    case 'reach': return { tal: { reach: 1 }, text: `${skill} reaches a tile further.` };
    case 'extra': return { tal: { extra: 1 }, text: `${skill} makes one more of what it makes.` };
    case 'castHaste': return { tal: { castHaste: 2000 }, text: `The haste after ${skill} lasts ${secs(2000)} longer.` };
    case 'skillSlow': return { tal: { skillSlow: 1500 }, text: `${skill} slows what it hits ${secs(1500)} longer.` };
    case 'skillStun': return { tal: { skillStun: 500 }, text: `${skill} holds what it hits ${secs(500)} longer.` };
    case 'castHeal': return { tal: { castHeal: 0.1 }, text: `${skill} also heals ${pct(0.1)} of max hp.` };
    case 'castShield': return { tal: { castShield: 0.1 }, text: `${skill} also shields ${pct(0.1)} of max hp.` };
    case 'frenzyMax': return { tal: { frenzyMax: 2 }, text: 'The kill frenzy stacks two higher.' };
    default: return { tal: { [key]: v }, text: `${skill} is stronger.` };
  }
}

/** The four deep rows (tiers 4 to 7) of a hero's tree, two nodes each. `second` is the hero's tier-2 nodes (their effect keys fit the skill). */
export function deepNodes(kind: string, second: readonly TalentNode[], index: number, ab: AbMaker, words: StatWords): TalentNode[] {
  const kit = DEEP_KITS[kind];
  if (!kit) return [];
  const { calling, skill, ult } = kit;
  const id = (s: string) => `tl_${kind}_${s}`;
  // (row 4: the skill's own effect a size on, then the ultimate)
  const own = second[index % second.length]?.tal ?? { pow: 0.4 };
  const [key, val] = Object.entries(own)[0];
  const d = deepen(key, val, skill);
  const keen = calling === 'bulwark' || calling === 'healer' || calling === 'support';
  const ultPick: Pick = {
    name: `${ult} Focus`,
    icon: 'orb',
    text: keen ? `${ult} charges 50% faster and is 25% stronger.` : `${ult} is 45% stronger and charges 25% faster.`,
    tal: keen ? { ultRate: 0.5, ultPow: 0.25 } : { ultPow: 0.45, ultRate: 0.25 },
  };
  const row4: [Pick, Pick] = [{ name: `${skill} Mastery`, icon: 'scroll', text: d.text, tal: d.tal }, ultPick];

  let row5: [Pick, Pick];
  let row6: [Pick, Pick];
  let row7: [Pick, Pick];
  switch (calling) {
    case 'bulwark':
      row5 = [
        { name: 'Iron Resolve', icon: 'plate', text: 'Blows from the front lose a further 15%, and +12% hp and +2 defence.', stats: { hp: 0.12, def: 2 }, tal: { block: 0.15 } },
        { name: 'Spiked Bulwark', icon: 'thornplate', text: 'Sends back a further 40% of a melee blow taken, and +6% attack.', stats: { atk: 0.06 }, tal: { thorns: 0.4 } },
      ];
      row6 = [
        { name: 'Last Stand', icon: 'bastion', text: 'Once a fight, below a third of health, a shield of 40% of max hp forms for 5s.', abilities: [ab(id('last'), 'Last Stand', 'low', 'shield', { v: 0.4, w: 5 })] },
        { name: 'Retaliation', icon: 'maul', text: "Every 3rd blow taken from the front is answered with a counter-strike of 80% of the hero's attack.", abilities: [ab(id('retort'), 'Retaliation', 'struck', 'counter', { n: 3, v: 0.8 })] },
      ];
      row7 = [
        { name: 'Immortal Bastion', icon: 'aegis', text: 'Blows from the front lose a further 15%, takes 5% less from each ally beside it, and +20% hp and +3 defence.', stats: { hp: 0.2, def: 3 }, tal: { block: 0.15, huddle: 0.05 } },
        { name: 'Wrath of the Wall', icon: 'idol', text: '25% of the blows taken from the front stun the attacker for 0.8s, and a further third of a melee blow is sent back.', tal: { thorns: 0.33 }, abilities: [ab(id('wrath'), 'Wrath of the Wall', 'struck', 'stun', { p: 0.25, w: 0.8 })] },
      ];
      break;
    case 'duelist':
      row5 = [
        { name: "Killer's Rhythm", icon: 'katana', text: '', stats: { atkSpeed: 0.12, crit: 0.08 } },
        { name: 'Open Wounds', icon: 'dagger', text: '40% of the blows make the foe bleed, and +6% attack.', stats: { atk: 0.06 }, abilities: [ab(id('wounds'), 'Open Wounds', 'hit', 'bleed', { p: 0.4, v: 0.3 })] },
      ];
      row6 = [
        { name: 'Momentum', icon: 'boots', text: 'Each kill hastens the hero for 3s.', abilities: [ab(id('momentum'), 'Momentum', 'kill', 'haste', { w: 3 })] },
        { name: 'Executioner', icon: 'scythe', text: '30% of the blows finish a foe under 30% health with a stroke of 120% of the blow.', abilities: [ab(id('exec'), 'Executioner', 'hit', 'execute', { p: 0.3, v: 1.2 })] },
      ];
      row7 = [
        { name: 'Master of Blades', icon: 'claymore', text: '', stats: { atk: 0.15, crit: 0.1, atkSpeed: 0.1 } },
        { name: 'Phantom Edge', icon: 'shadowcloak', text: 'Each crit is followed by a second stroke of 80% of the blow, and +8% attack.', stats: { atk: 0.08 }, abilities: [ab(id('phantom'), 'Phantom Edge', 'crit', 'smite', { v: 0.8 })] },
      ];
      break;
    case 'berserker':
      row5 = [
        { name: 'Blood Fury', icon: 'axe', text: 'Attack grows by up to 50% more as the health falls, and +6% attack.', stats: { atk: 0.06 }, tal: { rage: 0.5 } },
        { name: 'Crimson Thirst', icon: 'ruby', text: 'Heals for a further 15% of the damage the blows deal, and +8% hp.', stats: { hp: 0.08 }, tal: { leech: 0.15 } },
      ];
      row6 = [
        { name: 'Undying Rage', icon: 'battleaxe', text: 'Once a fight, below a third of health, the hero hits 40% harder for the rest of it.', abilities: [ab(id('rage'), 'Undying Rage', 'low', 'berserk', { v: 0.4 })] },
        { name: 'Feast', icon: 'bone', text: 'Each kill heals the hero 10% of its health.', abilities: [ab(id('feast'), 'Feast', 'kill', 'heal', { v: 0.1 })] },
      ];
      row7 = [
        { name: 'Unbound', icon: 'maul', text: 'Attack grows by up to 50% more as the health falls, and +15% attack and +10% hp.', stats: { atk: 0.15, hp: 0.1 }, tal: { rage: 0.5 } },
        { name: 'Soul Furnace', icon: 'emberrobe', text: 'Each kill heals the hero 10% of its health and gives back 25% of the pool.', abilities: [ab(id('furnace'), 'Soul Furnace', 'kill', 'heal', { v: 0.1 }), ab(id('furnace2'), 'Soul Furnace', 'kill', 'charge', { v: 50 })] },
      ];
      break;
    case 'marksman':
      row5 = [
        { name: 'Eagle Sight', icon: 'spectacles', text: '', stats: { range: 1, crit: 0.06 } },
        { name: 'Quick Hands', icon: 'ring', text: '', stats: { atkSpeed: 0.14, atk: 0.05 } },
      ];
      row6 = [
        { name: 'Pinning Shot', icon: 'crossbow', text: '30% of the shots slow the foe for 1.5s.', abilities: [ab(id('pin'), 'Pinning Shot', 'hit', 'slow', { p: 0.3, w: 1.5 })] },
        { name: 'Ricochet', icon: 'orb', text: '30% of the shots leap on to a second foe for 60% of the blow.', abilities: [ab(id('ricochet'), 'Ricochet', 'hit', 'chain', { p: 0.3, v: 0.6 })] },
      ];
      row7 = [
        { name: 'Perfect Aim', icon: 'longbow', text: '', stats: { crit: 0.12, atk: 0.12 } },
        { name: 'Rain of Ruin', icon: 'blunderbuss', text: 'The skill makes one more of what it makes and is 30% stronger, and +10% pool refill.', stats: { charge: 0.1 }, tal: { extra: 1, pow: 0.3 } },
      ];
      break;
    case 'archmage':
      row5 = [
        { name: 'Arcane Surge', icon: 'wand', text: 'The skill is 25% stronger, and +20% pool refill.', stats: { charge: 0.2 }, tal: { pow: 0.25 } },
        { name: 'Spell Echo', icon: 'sapphire', text: '35% of the blows burst: half again on the foes beside the target.', abilities: [ab(id('echo'), 'Spell Echo', 'hit', 'splash', { p: 0.35, v: 0.5 })] },
      ];
      row6 = [
        { name: 'Mana Well', icon: 'vial', text: 'Each kill feeds the king 6 mana and gives back 12% of the pool.', abilities: [ab(id('well'), 'Mana Well', 'kill', 'mana', { v: 6 }), ab(id('well2'), 'Mana Well', 'kill', 'charge', { v: 25 })] },
        { name: 'Withering Word', icon: 'amulet', text: '30% of the blows lay a curse that eats at the foe.', abilities: [ab(id('wither'), 'Withering Word', 'hit', 'curse', { p: 0.3, v: 0.3 })] },
      ];
      row7 = [
        { name: "Archmage's Will", icon: 'idol', text: `${ult} is 50% stronger and charges 50% faster.`, tal: { ultPow: 0.5, ultRate: 0.5 } },
        { name: 'Spellstorm', icon: 'stormstaff', text: 'The skill makes one more of what it makes and is 35% stronger, and +15% pool refill.', stats: { charge: 0.15 }, tal: { extra: 1, pow: 0.35 } },
      ];
      break;
    case 'healer':
      row5 = [
        { name: 'Healing Font', icon: 'emerald', text: 'The skill also heals 10% of max hp, and +8% hp.', stats: { hp: 0.08 }, tal: { castHeal: 0.1 } },
        { name: 'Gentle Aura', icon: 'bell', text: 'Every 5s the allies beside the hero heal 5% of their health.', abilities: [ab(id('aura'), 'Gentle Aura', 'tick', 'aura', { n: 5, v: 0.05, show: true })] },
      ];
      row6 = [
        { name: 'Guardian Light', icon: 'amulet', text: 'Every 10s a shield of 15% of max hp forms for 4s.', abilities: [ab(id('guardian'), 'Guardian Light', 'tick', 'shield', { n: 10, v: 0.15, w: 4, show: true })] },
        { name: 'Renewal', icon: 'feather', text: 'Every 5s the weakest ally is healed 14% of its health.', abilities: [ab(id('renewal'), 'Renewal', 'tick', 'healAlly', { n: 5, v: 0.14, show: true })] },
      ];
      row7 = [
        { name: 'Everlasting Light', icon: 'lyre', text: 'The skill is 40% stronger and lasts 40% longer, and +10% hp.', stats: { hp: 0.1 }, tal: { pow: 0.4, dur: 0.4 } },
        { name: 'Miracle', icon: 'circlet', text: 'Once a fight, below a third of health, the hero is healed 50% of max hp; and every 4s the allies beside it heal 6%.', abilities: [ab(id('miracle'), 'Miracle', 'low', 'heal', { v: 0.5 }), ab(id('miracle2'), 'Miracle', 'tick', 'aura', { n: 4, v: 0.06 })] },
      ];
      break;
    case 'support':
    default:
      row5 = [
        { name: 'Marching Tune', icon: 'drum', text: '', stats: { moveSpeed: 0.1, charge: 0.15 } },
        { name: 'Rousing Aura', icon: 'charm', text: 'Every 12s, allies within 3 tiles hit a quarter harder for 4s.', abilities: [ab(id('rouse'), 'Rousing Aura', 'tick', 'rally', { n: 12, w: 4, show: true })] },
      ];
      row6 = [
        { name: 'Second Wind', icon: 'elixir', text: 'Every 8s the skill meter gains 30 charge.', abilities: [ab(id('wind'), 'Second Wind', 'tick', 'charge', { n: 8, v: 30 })] },
        { name: 'Quickening', icon: 'boots', text: 'Every 9s the hero is hasted for 3s.', abilities: [ab(id('quicken'), 'Quickening', 'tick', 'haste', { n: 9, w: 3, show: true })] },
      ];
      row7 = [
        { name: 'Anthem', icon: 'lyre', text: `${ult} charges 50% faster and the skill lasts 50% longer, and +15% pool refill.`, stats: { charge: 0.15 }, tal: { ultRate: 0.5, dur: 0.5 } },
        { name: 'Grand Banner', icon: 'pendant', text: 'Every 10s, allies within 3 tiles hit a quarter harder for 5s, and +8% attack.', stats: { atk: 0.08 }, abilities: [ab(id('banner'), 'Grand Banner', 'tick', 'rally', { n: 10, w: 5, show: true })] },
      ];
  }
  const rows: [Pick, Pick][] = [row4, row5, row6, row7];
  const out: TalentNode[] = [];
  rows.forEach((pair, r) =>
    pair.forEach((p, i) => out.push({ id: `${kind}:${r + 4}${'abcd'[i]}`, tier: (r + 4) as TalentNode['tier'], name: p.name, icon: p.icon, text: p.text || words(p.stats ?? {}), ...(p.stats ? { stats: p.stats } : {}), ...(p.tal ? { tal: p.tal } : {}), ...(p.abilities ? { abilities: p.abilities } : {}) })),
  );
  return out;
}
