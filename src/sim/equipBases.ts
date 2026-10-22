// The equipment catalogue: 60 item types, twenty for each slot. Each has its own stat profile (main stats at Common, item
// level 1) and one signature ability that switches on at Epic and grows at Legendary and Mythic (lower rarities have stats
// only). A Mythic piece also has its own name. The numbers are modest: `equipment.ts` scales them by rarity and level, and
// `equipFx.ts` runs the abilities through the sim's own hooks. Pure data: no Pixi, no DOM.

export type EquipSlot = 'weapon' | 'armour' | 'trinket';
export type Calling = 'melee' | 'shooter' | 'caster';
/** The main stats an item can give. Shares are 0.06 for +6%; `def` and `range` are flat. */
export type MainKey = 'hp' | 'atk' | 'def' | 'atkSpeed' | 'moveSpeed' | 'crit' | 'range' | 'dodge' | 'charge' | 'regen' | 'resist';
export type Main = Partial<Record<MainKey, number>>;

/** When an ability fires. `hit`/`crit`/`kill`/`struck` can carry a chance `p`; `nth` (and `struck` with `n`) counts blows;
 *  `tick` fires every `n` seconds; `start`, `low` (below 35% hp) and `death` fire once a fight. */
export type Trig = 'hit' | 'nth' | 'crit' | 'kill' | 'struck' | 'start' | 'tick' | 'low' | 'death';
export type Kind =
  | 'leech' | 'burn' | 'bleed' | 'curse' | 'slow' | 'stun' | 'chain' | 'splash' | 'pierce' | 'smite' | 'execute' | 'burst'
  | 'charge' | 'mana' | 'heal' | 'healAlly' | 'shield' | 'haste' | 'stealth' | 'guard' | 'reflect' | 'counter' | 'taunt'
  | 'revive' | 'regen' | 'aura' | 'banner' | 'rally' | 'berserk' | 'cleanse';

export interface Ability {
  id: string;
  name: string;
  trig: Trig;
  kind: Kind;
  /** The main number: a share (of damage, attack or hp), or points of charge or mana, by kind. */
  v?: number;
  /** Seconds, where the kind has a duration. */
  w?: number;
  /** Every n-th blow (`nth`, `struck`), or every n seconds (`tick`). */
  n?: number;
  /** Chance per blow, 0 to 1 (`hit`, `crit`, `kill`, `struck`). */
  p?: number;
  /** Shows its name as a pop-up each time it fires (a talent's second skill does; the gear's abilities fire without one on ticks and starts). */
  show?: boolean;
}

export interface EquipBase {
  id: string;
  name: string;
  /** What a Mythic piece is called. */
  mythic: string;
  slot: EquipSlot;
  /** The icon file (`src/art/equip/<icon>.png`). */
  icon: string;
  /** The calling it suits (a bonus on a hero of that calling); none suits all alike. */
  calling?: Calling;
  main: Main;
  ability: Ability;
}

const W = 'weapon' as const;
const A = 'armour' as const;
const T = 'trinket' as const;
const ab = (id: string, name: string, trig: Trig, kind: Kind, o: Partial<Ability> = {}): Ability => ({ id, name, trig, kind, ...o });

export const EQUIP_LIST: readonly EquipBase[] = [
  // ---- weapons ----
  { id: 'ironSword', name: 'Iron Sword', mythic: 'Kingsbane', slot: W, icon: 'sword', main: { atk: 0.07 }, ability: ab('honestStrike', 'Honest Strike', 'nth', 'smite', { n: 5, v: 0.8 }) },
  { id: 'runedBlade', name: 'Runed Blade', mythic: "Runeking's Edge", slot: W, icon: 'blade', calling: 'melee', main: { atk: 0.08, crit: 0.02 }, ability: ab('runeSurge', 'Rune Surge', 'crit', 'mana', { v: 0.5 }) },
  { id: 'claymore', name: 'Claymore', mythic: "Titan's Cleaver", slot: W, icon: 'claymore', calling: 'melee', main: { atk: 0.12, hp: 0.02 }, ability: ab('sweepingCleave', 'Sweeping Cleave', 'hit', 'splash', { v: 0.35 }) },
  { id: 'frostbrand', name: 'Frostbrand', mythic: 'Winterbane', slot: W, icon: 'frostbrand', calling: 'melee', main: { atk: 0.07, atkSpeed: 0.03, crit: 0.02 }, ability: ab('deepFreeze', 'Deep Freeze', 'crit', 'stun', { w: 1.2 }) },
  { id: 'katana', name: 'Moonlit Katana', mythic: 'Tsukuyomi', slot: W, icon: 'katana', calling: 'melee', main: { atk: 0.06, crit: 0.05, atkSpeed: 0.03 }, ability: ab('iaijutsu', 'Iaijutsu', 'crit', 'bleed', { v: 0.2 }) },
  { id: 'dragonboneAxe', name: 'Dragonbone Axe', mythic: 'Wyrmfall', slot: W, icon: 'axe', calling: 'melee', main: { atk: 0.11, hp: 0.03 }, ability: ab('dragonfire', 'Dragonfire', 'hit', 'burn', { p: 0.3, v: 0.15 }) },
  { id: 'headsmanAxe', name: "Headsman's Axe", mythic: "Doom's Verdict", slot: W, icon: 'battleaxe', calling: 'melee', main: { atk: 0.13, crit: 0.02 }, ability: ab('headsman', 'Headsman', 'hit', 'execute', { v: 1.0 }) },
  { id: 'spikedMace', name: 'Spiked Mace', mythic: 'Skullcrusher', slot: W, icon: 'mace', calling: 'melee', main: { atk: 0.08, def: 0.5 }, ability: ab('skullRattle', 'Skull Rattle', 'nth', 'stun', { n: 4, w: 0.9 }) },
  { id: 'stonebreakerMaul', name: 'Stonebreaker Maul', mythic: 'Worldbreaker', slot: W, icon: 'maul', calling: 'melee', main: { atk: 0.1, hp: 0.05 }, ability: ab('shockwave', 'Shockwave', 'nth', 'splash', { n: 4, v: 0.9 }) },
  { id: 'ashenSpear', name: 'Ashen Spear', mythic: 'Phoenix Lance', slot: W, icon: 'spear', calling: 'melee', main: { atk: 0.07, range: 1 }, ability: ab('skewer', 'Skewer', 'hit', 'pierce', { v: 0.5 }) },
  { id: 'vampireFang', name: 'Vampire Fang', mythic: 'Nightblood Fang', slot: W, icon: 'dagger', calling: 'melee', main: { atk: 0.05, atkSpeed: 0.05, crit: 0.02 }, ability: ab('vampiricBite', 'Vampiric Bite', 'hit', 'leech', { v: 0.15 }) },
  { id: 'reapersScythe', name: "Reaper's Scythe", mythic: 'Harvest of Souls', slot: W, icon: 'scythe', calling: 'melee', main: { atk: 0.09, crit: 0.03 }, ability: ab('soulReaper', 'Soul Reaper', 'kill', 'heal', { v: 0.12 }) },
  { id: 'ironKnuckles', name: 'Iron Knuckles', mythic: 'Fists of the Fallen', slot: W, icon: 'fist', calling: 'melee', main: { atk: 0.05, atkSpeed: 0.06, def: 0.3 }, ability: ab('flurry', 'Flurry', 'nth', 'haste', { n: 3, w: 2 }) },
  { id: 'huntersBow', name: "Hunter's Bow", mythic: 'Windpiercer', slot: W, icon: 'bow', calling: 'shooter', main: { atk: 0.06, range: 1, atkSpeed: 0.03 }, ability: ab('cripplingShot', 'Crippling Shot', 'hit', 'slow', { p: 0.25, w: 2 }) },
  { id: 'sunfireLongbow', name: 'Sunfire Longbow', mythic: 'Sunhawk Bow', slot: W, icon: 'longbow', calling: 'shooter', main: { atk: 0.08, range: 1.5 }, ability: ab('eagleEye', 'Eagle Eye', 'crit', 'smite', { v: 1.0 }) },
  { id: 'ironwoodCrossbow', name: 'Ironwood Crossbow', mythic: 'Siegebreaker', slot: W, icon: 'crossbow', calling: 'shooter', main: { atk: 0.09, range: 1, crit: 0.02 }, ability: ab('boltVolley', 'Bolt Volley', 'nth', 'pierce', { n: 3, v: 1.0 }) },
  { id: 'blunderbuss', name: 'Blunderbuss', mythic: "Dragon's Roar", slot: W, icon: 'blunderbuss', calling: 'shooter', main: { atk: 0.11, range: 1 }, ability: ab('pointBlank', 'Point Blank', 'hit', 'smite', { p: 0.2, v: 1.2 }) },
  { id: 'stormStaff', name: 'Stormcaller Staff', mythic: "Thunderlord's Reach", slot: W, icon: 'stormstaff', calling: 'caster', main: { atk: 0.08, charge: 0.1 }, ability: ab('chainLightning', 'Chain Lightning', 'nth', 'chain', { n: 4, v: 0.8 }) },
  { id: 'emberWand', name: 'Ember Wand', mythic: 'Sunspark Rod', slot: W, icon: 'wand', calling: 'caster', main: { atk: 0.06, atkSpeed: 0.05, charge: 0.05 }, ability: ab('sparkConduit', 'Spark Conduit', 'hit', 'charge', { v: 4 }) },
  { id: 'grimoire', name: 'Grimoire', mythic: 'Tome of Endings', slot: W, icon: 'tome', calling: 'caster', main: { atk: 0.07, charge: 0.12, resist: 0.04 }, ability: ab('hex', 'Hex', 'hit', 'curse', { p: 0.25, v: 0.15 }) },

  // ---- armour ----
  { id: 'leatherJerkin', name: 'Leather Jerkin', mythic: "Windrunner's Jerkin", slot: A, icon: 'jerkin', main: { hp: 0.06, moveSpeed: 0.03 }, ability: ab('nimbleReflexes', 'Nimble Reflexes', 'struck', 'haste', { p: 0.15, w: 2 }) },
  { id: 'hideVest', name: 'Hide Vest', mythic: 'Behemoth Hide', slot: A, icon: 'hide', main: { hp: 0.07, dodge: 0.02 }, ability: ab('secondWind', 'Second Wind', 'low', 'shield', { v: 0.3, w: 6 }) },
  { id: 'rangerCloak', name: "Ranger's Cloak", mythic: 'Cloak of the Wild Hunt', slot: A, icon: 'cloak', calling: 'shooter', main: { hp: 0.04, moveSpeed: 0.04, dodge: 0.03 }, ability: ab('snaringBurrs', 'Snaring Burrs', 'struck', 'slow', { p: 0.2, w: 2 }) },
  { id: 'shadowcloak', name: 'Shadowcloak', mythic: 'Nightveil', slot: A, icon: 'shadowcloak', main: { hp: 0.03, dodge: 0.05, moveSpeed: 0.03 }, ability: ab('shadowVeil', 'Shadow Veil', 'start', 'stealth', { w: 3 }) },
  { id: 'chainMail', name: 'Chain Mail', mythic: 'Mail of a Thousand Rings', slot: A, icon: 'mail', main: { hp: 0.08, def: 0.6 }, ability: ab('linkedRings', 'Linked Rings', 'struck', 'shield', { p: 0.2, v: 0.06, w: 3 }) },
  { id: 'scaleHauberk', name: 'Scale Hauberk', mythic: 'Leviathan Hauberk', slot: A, icon: 'scale', main: { hp: 0.09, def: 0.8 }, ability: ab('scaledWard', 'Scaled Ward', 'start', 'shield', { v: 0.15, w: 20 }) },
  { id: 'plateCuirass', name: 'Plate Cuirass', mythic: 'Dawnforged Cuirass', slot: A, icon: 'plate', calling: 'melee', main: { hp: 0.11, def: 1 }, ability: ab('unyielding', 'Unyielding', 'struck', 'guard', { n: 5, w: 2 }) },
  { id: 'thornplate', name: 'Thornplate Cuirass', mythic: "Thornking's Bulwark", slot: A, icon: 'thornplate', calling: 'melee', main: { hp: 0.08, def: 1.2 }, ability: ab('thornplate', 'Thornplate', 'struck', 'reflect', { v: 0.3 }) },
  { id: 'bastionPlate', name: 'Bastion Plate', mythic: 'Citadel Eternal', slot: A, icon: 'bastion', calling: 'melee', main: { hp: 0.14, def: 0.7 }, ability: ab('lastBastion', 'Last Bastion', 'low', 'guard', { w: 4 }) },
  { id: 'mageRobe', name: 'Mage Robe', mythic: "Archmage's Raiment", slot: A, icon: 'robe', calling: 'caster', main: { hp: 0.05, atk: 0.05, charge: 0.06 }, ability: ab('arcaneSiphon', 'Arcane Siphon', 'kill', 'mana', { v: 0.5 }) },
  { id: 'sageVestments', name: 'Sage Vestments', mythic: 'Vestments of the Oracle', slot: A, icon: 'vestments', calling: 'caster', main: { hp: 0.05, charge: 0.1, resist: 0.05 }, ability: ab('meditation', 'Meditation', 'tick', 'charge', { n: 1, v: 3 }) },
  { id: 'silkenRobe', name: 'Silken Robe', mythic: 'Starsilk Robe', slot: A, icon: 'silk', calling: 'caster', main: { hp: 0.04, atkSpeed: 0.04, dodge: 0.03 }, ability: ab('silkRush', 'Silk Rush', 'start', 'haste', { w: 4 }) },
  { id: 'dragonscaleMail', name: 'Dragonscale Mail', mythic: 'Ancient Wyrmscale', slot: A, icon: 'dragonscale', main: { hp: 0.1, def: 0.7, resist: 0.06 }, ability: ab('dragonsWrath', "Dragon's Wrath", 'struck', 'burn', { p: 0.25, v: 0.2 }) },
  { id: 'monkGi', name: "Monk's Gi", mythic: 'Gi of a Thousand Fists', slot: A, icon: 'gi', calling: 'melee', main: { hp: 0.06, dodge: 0.04, atkSpeed: 0.03 }, ability: ab('ironPalm', 'Iron Palm', 'struck', 'counter', { p: 0.2, v: 0.8 }) },
  { id: 'lamellar', name: 'Lamellar Armour', mythic: "Shogun's Lamellar", slot: A, icon: 'lamellar', main: { hp: 0.08, def: 0.6, atk: 0.03 }, ability: ab('bannerPlates', 'Banner Plates', 'start', 'rally', { w: 8 }) },
  { id: 'mithrilMail', name: 'Mithril Mail', mythic: "Dwarflord's Mithril", slot: A, icon: 'mithril', main: { hp: 0.07, def: 0.9, moveSpeed: 0.02 }, ability: ab('mithrilRipple', 'Mithril Ripple', 'struck', 'stun', { p: 0.12, w: 1 }) },
  { id: 'sunforgedAegis', name: 'Sunforged Aegis', mythic: 'Aegis of the Sun', slot: A, icon: 'aegis', main: { hp: 0.1, regen: 0.003, def: 0.5 }, ability: ab('sunlightAura', 'Sunlight Aura', 'tick', 'aura', { n: 1, v: 0.012 }) },
  { id: 'boneArmour', name: 'Bone Armour', mythic: 'Ossuary Plate', slot: A, icon: 'bone', main: { hp: 0.08, atk: 0.04, def: 0.5 }, ability: ab('boneWall', 'Bonewall', 'kill', 'shield', { v: 0.1, w: 6 }) },
  { id: 'gladiatorHarness', name: 'Gladiator Harness', mythic: "Champion's Harness", slot: A, icon: 'harness', main: { hp: 0.06, atk: 0.05, crit: 0.02 }, ability: ab('crowdsRoar', "Crowd's Roar", 'kill', 'haste', { w: 2.5 }) },
  { id: 'emberRobe', name: 'Ember Robe', mythic: 'Robe of Cinders', slot: A, icon: 'emberrobe', main: { hp: 0.05, atk: 0.06, resist: 0.05 }, ability: ab('smoulderingFury', 'Smouldering Fury', 'low', 'berserk', { v: 0.3 }) },

  // ---- trinkets ----
  { id: 'luckyCharm', name: 'Lucky Charm', mythic: "Fortune's Wheel", slot: T, icon: 'charm', main: { crit: 0.04, hp: 0.03 }, ability: ab('fortunesFavour', "Fortune's Favour", 'crit', 'heal', { v: 0.08 }) },
  { id: 'ironRing', name: 'Iron Ring', mythic: 'Ring of Ages', slot: T, icon: 'ring', main: { def: 0.6, hp: 0.03 }, ability: ab('steelResolve', 'Steel Resolve', 'struck', 'guard', { n: 7, w: 1.5 }) },
  { id: 'bootsOfHaste', name: 'Boots of Haste', mythic: 'Windstep Boots', slot: T, icon: 'boots', main: { moveSpeed: 0.06, atkSpeed: 0.03 }, ability: ab('sprint', 'Sprint', 'start', 'haste', { w: 6 }) },
  { id: 'phoenixFeather', name: 'Phoenix Feather', mythic: 'Heart of the Phoenix', slot: T, icon: 'feather', main: { hp: 0.06, atk: 0.04 }, ability: ab('rebirth', 'Rebirth', 'death', 'revive', { v: 0.4 }) },
  { id: 'warDrum', name: "Warlord's Drum", mythic: 'Drums of Conquest', slot: T, icon: 'drum', main: { atk: 0.05, atkSpeed: 0.03 }, ability: ab('warCry', 'War Cry', 'tick', 'banner', { n: 2 }) },
  { id: 'healerLyre', name: "Healer's Lyre", mythic: 'Lyre of the Mending Dawn', slot: T, icon: 'lyre', calling: 'caster', main: { hp: 0.05, regen: 0.004 }, ability: ab('soothingSong', 'Soothing Song', 'tick', 'healAlly', { n: 3, v: 0.08 }) },
  { id: 'silverBell', name: 'Silver Bell', mythic: 'Bell of Sanctuary', slot: T, icon: 'bell', main: { resist: 0.08, hp: 0.03 }, ability: ab('wardingChime', 'Warding Chime', 'low', 'cleanse', { v: 0.15 }) },
  { id: 'emberAmulet', name: 'Ember Amulet', mythic: 'Sunfire Amulet', slot: T, icon: 'amulet', main: { atk: 0.06, resist: 0.04 }, ability: ab('emberBurst', 'Ember Burst', 'kill', 'burst', { v: 0.8 }) },
  { id: 'moonPendant', name: 'Moonstone Pendant', mythic: 'Lunar Heart', slot: T, icon: 'pendant', main: { charge: 0.1, hp: 0.03 }, ability: ab('lunarCharge', 'Lunar Charge', 'start', 'mana', { v: 3 }) },
  { id: 'sapphireRing', name: 'Sapphire Ring', mythic: 'Tidecaller Ring', slot: T, icon: 'sapphire', main: { charge: 0.08, crit: 0.02 }, ability: ab('sapphireFocus', 'Sapphire Focus', 'nth', 'charge', { n: 6, v: 40 }) },
  { id: 'rubyRing', name: 'Ruby Ring', mythic: 'Bloodmoon Ring', slot: T, icon: 'ruby', main: { atk: 0.05, crit: 0.03 }, ability: ab('bloodlust', 'Bloodlust', 'kill', 'charge', { v: 50 }) },
  { id: 'emeraldBand', name: 'Emerald Band', mythic: 'Evergreen Band', slot: T, icon: 'emerald', main: { regen: 0.005, def: 0.3 }, ability: ab('verdantMending', 'Verdant Mending', 'tick', 'regen', { n: 1, v: 0.01 }) },
  { id: 'scryingOrb', name: 'Scrying Orb', mythic: 'All-Seeing Orb', slot: T, icon: 'orb', calling: 'caster', main: { charge: 0.06, atk: 0.04, crit: 0.02 }, ability: ab('clairvoyance', 'Clairvoyance', 'nth', 'mana', { n: 5, v: 0.8 }) },
  { id: 'scholarScroll', name: "Scholar's Scroll", mythic: 'Scroll of Forbidden Lore', slot: T, icon: 'scroll', calling: 'caster', main: { charge: 0.12 }, ability: ab('scholarsInsight', "Scholar's Insight", 'tick', 'mana', { n: 1, v: 0.3 }) },
  { id: 'vialOfVigor', name: 'Vial of Vigor', mythic: 'Elixir of the Eternal', slot: T, icon: 'vial', main: { hp: 0.1 }, ability: ab('emergencyDraught', 'Emergency Draught', 'low', 'heal', { v: 0.4 }) },
  { id: 'swiftElixir', name: 'Swiftness Elixir', mythic: 'Draught of Gales', slot: T, icon: 'elixir', main: { moveSpeed: 0.05, atkSpeed: 0.04 }, ability: ab('adrenaline', 'Adrenaline', 'low', 'haste', { w: 6 }) },
  { id: 'relicShard', name: 'Relic Shard', mythic: 'Heart of a Fallen Star', slot: T, icon: 'shard', main: { atk: 0.04, crit: 0.03, dodge: 0.02 }, ability: ab('arcFragment', 'Arc Fragment', 'hit', 'chain', { p: 0.1, v: 0.6 }) },
  { id: 'stoneIdol', name: 'Stone Idol', mythic: 'Idol of the Colossus', slot: T, icon: 'idol', calling: 'melee', main: { def: 0.8, hp: 0.04, resist: 0.03 }, ability: ab('idolsGaze', "Idol's Gaze", 'struck', 'taunt', { p: 0.2, w: 3 }) },
  { id: 'seerSpectacles', name: "Seer's Spectacles", mythic: 'Lenses of Truth', slot: T, icon: 'spectacles', calling: 'shooter', main: { crit: 0.05, atk: 0.03 }, ability: ab('pinpoint', 'Pinpoint', 'hit', 'bleed', { p: 0.2, v: 0.15 }) },
  { id: 'circlet', name: 'Silver Circlet', mythic: 'Crown of Kings', slot: T, icon: 'circlet', main: { hp: 0.05, atk: 0.03, charge: 0.05 }, ability: ab('spoilsOfWar', 'Spoils of War', 'kill', 'healAlly', { v: 0.1 }) },
];

export const EQUIP_BASES: Readonly<Record<string, EquipBase>> = Object.fromEntries(EQUIP_LIST.map((b) => [b.id, b]));
export const EQUIP_BASE_IDS: readonly string[] = EQUIP_LIST.map((b) => b.id);
/** Every ability, by id. */
export const ABILITIES: Readonly<Record<string, Ability>> = Object.fromEntries(EQUIP_LIST.map((b) => [b.ability.id, b.ability]));
