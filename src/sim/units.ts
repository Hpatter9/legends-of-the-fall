// The fighters: the heroes and the skeleton band they meet. Times are in milliseconds; `range` is in tiles
// (Manhattan). A unit with `shot` fires from afar (its range grows on high ground); the rest strike in melee, and can
// only reach a foe no more than their `jump` above or below them.

import { ELITE_FOES } from './eliteFoes';
import { CAL_BOSS_FOES } from './calamityBosses';
import { FOES } from './foes';

export type Side = 'hero' | 'foe';
export type Shot = 'arrow' | 'bone' | 'fire' | 'bolt' | 'holy' | 'leaf' | 'curse' | 'bullet';

export interface UnitDef {
  id: string;
  name: string;
  side: Side;
  /** The sprite sheet (`src/art/units/<sheet>.png`). */
  sheet: string;
  /** How big the sheet's frames are drawn on the board. */
  scale: number;
  hp: number;
  atk: number;
  def: number;
  range: number;
  /** Time for one step on level ground (a climb takes longer, by the step's cost). */
  moveMs: number;
  /** Time between blows. */
  atkMs: number;
  /** How many steps up or down it can climb in one tile. */
  jump: number;
  shot?: Shot;
  /** Its blow also lands, at `SPLASH_SHARE`, on the target's foes next to it. */
  splash?: boolean;
  /** Flies: climbs any height and pays no extra time for it. */
  flies?: boolean;
  /** Extra shot reach per step of height above the target (default 0.7). */
  heightReach?: number;
  /** One line for the bench card. */
  role: string;
  /** A hero's sheet at each grade (1 to 3), where the packs have an evolved look; unset grades use `sheet`. */
  forms?: readonly string[];
  /** A fighter a skill calls up (a treant, a decoy): it fights for its side but isn't one of the placed heroes. */
  summon?: boolean;
  /** It stands where it is put and never walks (a planted standard). */
  still?: boolean;
}

/** The sheet a hero is drawn from at a grade (1 to 3). */
export const formOf = (def: UnitDef, grade = 1): string => def.forms?.[grade - 1] ?? def.sheet;

/** The share of a splash blow that lands on each tile beside the target. */
export const SPLASH_SHARE = 0.5;

export const UNITS: Record<string, UnitDef> = {
  ...FOES,
  ...ELITE_FOES,
  ...CAL_BOSS_FOES,
  knight: { id: 'knight', name: 'Knight', side: 'hero', sheet: 'hero_soldier', scale: 0.521, hp: 300, atk: 11, def: 10, range: 1, moveMs: 760, atkMs: 1100, jump: 2, role: 'A wall of a man: draws the foes and bashes them back' },
  samurai: { id: 'samurai', name: 'Samurai', side: 'hero', sheet: 'samurai', scale: 0.72, hp: 210, atk: 28, def: 6, range: 1, moveMs: 600, atkMs: 1000, jump: 2, role: 'A duellist: dashes through a line, parries and answers', forms: ['samurai', 'samurai', 'samurai_commander'] },
  kunoichi: { id: 'kunoichi', name: 'Kunoichi', side: 'hero', sheet: 'kunoichi', scale: 0.66, hp: 184, atk: 19, def: 5, range: 1, moveMs: 420, atkMs: 550, jump: 4, role: 'Blinks behind the weak, vanishes in smoke' },
  archer: { id: 'archer', name: 'Archer', side: 'hero', sheet: 'hero_samurai_archer', scale: 0.58, hp: 180, atk: 29, def: 3, range: 4, moveMs: 650, atkMs: 1300, jump: 2, shot: 'arrow', heightReach: 1.4, role: 'A sniper: volleys from the heights, pins the far ones' },
  wizard: { id: 'wizard', name: 'Fire Wizard', side: 'hero', sheet: 'fire_wizard', scale: 0.76, hp: 149, atk: 33, def: 2, range: 3, moveMs: 700, atkMs: 1700, jump: 2, shot: 'fire', splash: true, role: 'A pyromancer: fire that runs from foe to foe' },

  ninjaMonk: { id: 'ninjaMonk', name: 'Ninja Monk', side: 'hero', sheet: 'ninja_monk', scale: 0.59, hp: 250, atk: 16, def: 6, range: 1, moveMs: 480, atkMs: 650, jump: 4, role: 'A combo striker: builds his flow on one foe, then spends it' },
  peasant: { id: 'peasant', name: 'Peasant', side: 'hero', sheet: 'ninja_peasant', scale: 0.62, hp: 321, atk: 17, def: 6, range: 2, moveMs: 650, atkMs: 1100, jump: 2, role: 'Formation militia: closes ranks and braces pikes' },
  lightningMage: { id: 'lightningMage', name: 'Lightning Mage', side: 'hero', sheet: 'lightning_mage', scale: 0.67, hp: 166, atk: 37, def: 2, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bolt', role: 'A storm marker: lightning that marks, then sets the marks off' },
  wanderer: { id: 'wanderer', name: 'Wanderer', side: 'hero', sheet: 'wanderer_mage', scale: 0.64, hp: 141, atk: 15, def: 3, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'fire', role: 'An alchemist: draughts for friends, firebrew for foes' },
  kitsune: { id: 'kitsune', name: 'Kitsune', side: 'hero', sheet: 'kitsune', scale: 0.54, hp: 182, atk: 20, def: 5, range: 1, moveMs: 480, atkMs: 800, jump: 3, role: 'A shapeshifter: charms a foe, or wears its shape' },
  karasu: { id: 'karasu', name: 'Karasu Tengu', side: 'hero', sheet: 'karasu_tengu', scale: 0.48, hp: 194, atk: 30, def: 4, range: 1, moveMs: 420, atkMs: 900, jump: 9, flies: true, role: 'A thief: dives on the back line and robs it' },
  yamabushi: { id: 'yamabushi', name: 'Yamabushi Tengu', side: 'hero', sheet: 'yamabushi_tengu', scale: 0.64, hp: 275, atk: 17, def: 9, range: 1, moveMs: 760, atkMs: 1200, jump: 2, role: 'A reflector: wind that shoves foes and turns arrows' },
  werewolf: { id: 'werewolf', name: 'Werewolf', side: 'hero', sheet: 'werewolf_white', scale: 1.05, hp: 210, atk: 24, def: 5, range: 1, moveMs: 340, atkMs: 800, jump: 3, role: 'A shapeshifter: a hunting wolf and a great brute', forms: ['werewolf_white', 'werewolf_white', 'werewolf_black'] },
  minotaur: { id: 'minotaur', name: 'Minotaur', side: 'hero', sheet: 'minotaur_3', scale: 0.65, hp: 300, atk: 22, def: 9, range: 1, moveMs: 800, atkMs: 1300, jump: 2, role: 'A bulldozer: slams foes into walls and each other', forms: ['minotaur_3', 'minotaur_3', 'minotaur_2'] },
  satyr: { id: 'satyr', name: 'Satyr', side: 'hero', sheet: 'satyr_2', scale: 0.76, hp: 254, atk: 24, def: 5, range: 1, moveMs: 560, atkMs: 1000, jump: 3, role: 'A lure: pipes that hasten friends and gather foes', forms: ['satyr_2', 'satyr_2', 'satyr_3'] },
  gorgon: { id: 'gorgon', name: 'Gorgon', side: 'hero', sheet: 'gorgon_3', scale: 0.65, hp: 205, atk: 27, def: 4, range: 4, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bolt', role: 'A petrifier: stone foes that stay as statues', forms: ['gorgon_3', 'gorgon_3', 'gorgon_2'] },
  samuraiCommander: { id: 'samuraiCommander', name: 'Samurai Commander', side: 'hero', sheet: 'samurai_commander', scale: 0.67, hp: 240, atk: 24, def: 8, range: 1, moveMs: 640, atkMs: 1050, jump: 2, role: 'A banner-bearer: plants a standard that must be knocked down' },

  paladin: { id: 'paladin', name: 'Paladin', side: 'hero', sheet: 'cls_paladin_1', scale: 0.74, hp: 273, atk: 13, def: 8, range: 1, moveMs: 760, atkMs: 1100, jump: 2, role: 'A martyr: takes his friends\' wounds on himself', forms: ['cls_paladin_1', 'cls_paladin_2', 'cls_paladin_3'] },
  cleric: { id: 'cleric', name: 'Cleric', side: 'hero', sheet: 'cls_cleric_1', scale: 0.76, hp: 220, atk: 13, def: 4, range: 2, moveMs: 700, atkMs: 1200, jump: 2, role: 'A battle priest: her smites heal', forms: ['cls_cleric_1', 'cls_cleric_2', 'cls_cleric_3'] },
  druid: { id: 'druid', name: 'Druid', side: 'hero', sheet: 'cls_druid_1', scale: 0.78, hp: 214, atk: 19, def: 3, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'leaf', role: 'A shapeshifter: calls a treant, or becomes one', forms: ['cls_druid_1', 'cls_druid_2', 'cls_druid_3'] },
  barbarian: { id: 'barbarian', name: 'Barbarian', side: 'hero', sheet: 'cls_barbarian_1', scale: 0.94, hp: 240, atk: 21, def: 3, range: 1, moveMs: 600, atkMs: 1000, jump: 2, role: 'A berserker: stronger the more he bleeds', forms: ['cls_barbarian_1', 'cls_barbarian_2', 'cls_barbarian_3'] },
  ranger: { id: 'ranger', name: 'Ranger', side: 'hero', sheet: 'cls_ranger_1', scale: 0.76, hp: 165, atk: 27, def: 3, range: 5, moveMs: 650, atkMs: 1400, jump: 2, shot: 'arrow', role: 'A trapper: snares and fields of caltrops', forms: ['cls_ranger_1', 'cls_ranger_2', 'cls_ranger_3'] },
  warlock: { id: 'warlock', name: 'Warlock', side: 'hero', sheet: 'cls_warlock_1', scale: 0.77, hp: 172, atk: 27, def: 2, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'curse', role: 'A leech: drinks his foes and feeds his friends', forms: ['cls_warlock_1', 'cls_warlock_2', 'cls_warlock_3'] },
  illusionist: { id: 'illusionist', name: 'Illusionist', side: 'hero', sheet: 'cls_illusionist_1', scale: 0.77, hp: 172, atk: 18, def: 4, range: 1, moveMs: 480, atkMs: 750, jump: 3, role: 'A trickster: decoys, and friends swapped out of danger', forms: ['cls_illusionist_1', 'cls_illusionist_2', 'cls_illusionist_3'] },
  gunslinger: { id: 'gunslinger', name: 'Gunslinger', side: 'hero', sheet: 'cls_gunslinger_1', scale: 0.76, hp: 135, atk: 40, def: 2, range: 6, moveMs: 700, atkMs: 2400, jump: 2, shot: 'bullet', heightReach: 0.7, role: 'A quick-draw: slugs through a line, or three fast shots', forms: ['cls_gunslinger_1', 'cls_gunslinger_2', 'cls_gunslinger_3'] },

  // the second wave of heroes (docs/notes/more-heroes.md)
  shambler: { id: 'shambler', name: 'Shambler', side: 'hero', sheet: 'hero_shambler', scale: 0.76, hp: 310, atk: 16, def: 4, range: 1, moveMs: 900, atkMs: 1100, jump: 2, role: 'A corpse-eater: rots his foes and eats the fallen' },
  rifleBot: { id: 'rifleBot', name: 'Rifle Bot', side: 'hero', sheet: 'robot_infantry', scale: 0.69, hp: 154, atk: 27, def: 3, range: 4, moveMs: 700, atkMs: 1300, jump: 2, shot: 'bullet', role: 'A suppressor: bursts, and a lane of fire' },
  mercenary: { id: 'mercenary', name: 'Mercenary', side: 'hero', sheet: 'hero_mercenary', scale: 0.76, hp: 206, atk: 23, def: 5, range: 1, moveMs: 520, atkMs: 800, jump: 3, role: 'A bounty hunter: marks the strongest and is paid for it' },
  mummy: { id: 'mummy', name: 'Mummy', side: 'hero', sheet: 'hero_mummy', scale: 0.81, hp: 299, atk: 19, def: 7, range: 1, moveMs: 800, atkMs: 1200, jump: 2, role: 'A puppeteer: binds a foe and walks it into its friends', },
  buccaneer: { id: 'buccaneer', name: 'Buccaneer', side: 'hero', sheet: 'hero_buccaneer', scale: 0.78, hp: 207, atk: 24, def: 5, range: 1, moveMs: 560, atkMs: 850, jump: 3, role: 'A gambler: hooks, and the dice' },

  wolfBard: { id: 'wolfBard', name: 'Wolf Bard', side: 'hero', sheet: 'hero_wolf_bard', scale: 0.75, hp: 247, atk: 22, def: 3, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'holy', role: 'A songweaver: a standing song he switches' },
  beastmaster: { id: 'beastmaster', name: 'Beastmaster', side: 'hero', sheet: 'hero_beastmaster', scale: 0.77, hp: 182, atk: 16, def: 4, range: 1, moveMs: 620, atkMs: 900, jump: 2, role: 'A summoner: calls the pack and sets it on a foe' },
  kraken: { id: 'kraken', name: 'Kraken Mate', side: 'hero', sheet: 'hero_kraken_mate', scale: 0.66, hp: 297, atk: 19, def: 6, range: 1, moveMs: 700, atkMs: 1100, jump: 2, role: 'A tide-caller: drags foes in and floods the ground' },
  lancer: { id: 'lancer', name: 'Lancer', side: 'hero', sheet: 'hero_lancer', scale: 0.51, hp: 209, atk: 24, def: 5, range: 1, moveMs: 380, atkMs: 900, jump: 3, role: 'Momentum cavalry: hits harder the further he rides' },
  reaper: { id: 'reaper', name: 'Reaper', side: 'hero', sheet: 'hk_ghost', scale: 0.61, hp: 168, atk: 26, def: 3, range: 1, moveMs: 420, atkMs: 800, jump: 9, flies: true, role: 'A soul harvester: the foes he reaps rise for him' },

  timeWitch: { id: 'timeWitch', name: 'Time Witch', side: 'hero', sheet: 'hero_time_witch', scale: 0.76, hp: 188, atk: 28, def: 2, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bolt', role: 'A time-bender: hastes, slows, and turns a friend\'s clock back' },
  arcBlade: { id: 'arcBlade', name: 'Arc Blade', side: 'hero', sheet: 'robot_swordsman', scale: 0.75, hp: 205, atk: 24, def: 4, range: 1, moveMs: 400, atkMs: 750, jump: 3, role: 'A capacitor: stores the blows he takes and lets them go' },
  dreadPirate: { id: 'dreadPirate', name: 'Dread Pirate', side: 'hero', sheet: 'hero_dread_pirate', scale: 0.76, hp: 263, atk: 21, def: 7, range: 1, moveMs: 780, atkMs: 1200, jump: 2, role: 'A bomber: kegs that set off the field\'s powder barrels' },
  siegeBot: { id: 'siegeBot', name: 'Siege Bot', side: 'hero', sheet: 'robot_destroyer', scale: 0.78, hp: 200, atk: 33, def: 6, range: 5, moveMs: 900, atkMs: 2200, jump: 2, shot: 'bullet', heightReach: 0.7, role: 'A stance turret: anchors into siege mode' },

  priestess: { id: 'priestess', name: 'High Priestess', side: 'hero', sheet: 'hero_priestess', scale: 0.78, hp: 209, atk: 17, def: 5, range: 3, moveMs: 700, atkMs: 1400, jump: 2, shot: 'holy', role: 'A resurrector: mends the worst hurt and watches the dying' },
  dragoon: { id: 'dragoon', name: 'Queen Dragoon', side: 'hero', sheet: 'hero_dragoon', scale: 0.68, hp: 220, atk: 24, def: 6, range: 1, moveMs: 420, atkMs: 900, jump: 9, flies: true, role: 'A dragoon: breathes fire and jumps' },
  juggernaut: { id: 'juggernaut', name: 'Juggernaut', side: 'hero', sheet: 'hero_juggernaut', scale: 0.51, hp: 350, atk: 19, def: 9, range: 1, moveMs: 950, atkMs: 1500, jump: 1, role: 'A terrain shaper: quakes, and walls out of the ground' },

  sage: { id: 'sage', name: 'Great Sage', side: 'hero', sheet: 'hero_sage', scale: 0.77, hp: 204, atk: 29, def: 3, range: 4, moveMs: 700, atkMs: 1600, jump: 2, shot: 'fire', role: 'A mana battery: stars, and his friends\' pools filled' },
  demonSwordsman: { id: 'demonSwordsman', name: 'Demon Swordsman', side: 'hero', sheet: 'hero_demon_swordsman', scale: 0.74, hp: 220, atk: 22, def: 7, range: 1, moveMs: 560, atkMs: 950, jump: 3, role: 'A blood pact: pays health for power' },
  tyrant: { id: 'tyrant', name: 'Tyrant', side: 'hero', sheet: 'hero_tyrant', scale: 0.67, hp: 262, atk: 20, def: 6, range: 2, moveMs: 800, atkMs: 1250, jump: 2, role: 'A condemner: names a foe for the whole party', },

  // called up by Beastmaster
  wolf: { id: 'wolf', name: 'Wolf', side: 'hero', sheet: 'wolf_grey', scale: 0.55, hp: 120, atk: 14, def: 2, range: 1, moveMs: 360, atkMs: 700, jump: 3, summon: true, role: 'A wolf called by the Beastmaster', forms: ['wolf_grey', 'wolf_grey', 'wolf_black'] },
  direWolf: { id: 'direWolf', name: 'Dire Wolf', side: 'hero', sheet: 'wolf_black', scale: 0.85, hp: 190, atk: 18, def: 3, range: 1, moveMs: 380, atkMs: 760, jump: 3, summon: true, role: 'A great black wolf, called by a tier 3 Beastmaster' },

  // called up by skills (not heroes to place)
  treant: { id: 'treant', name: 'Treant', side: 'hero', sheet: 'cls_treant', scale: 0.5, hp: 330, atk: 16, def: 8, range: 1, moveMs: 900, atkMs: 1300, jump: 1, summon: true, role: 'A tree called by the Druid (it grows with her grade)', forms: ['cls_treant', 'cls_treant_2', 'cls_treant_3'] },
  // called up by the hero kits (COMBAT-002): a fallen foe risen for the Reaper (drawn in the foe's own sheet, ghostly), and the Samurai Commander's standard
  wraith: { id: 'wraith', name: 'Wraith', side: 'hero', sheet: 'hk_ghost', scale: 0.61, hp: 100, atk: 10, def: 2, range: 1, moveMs: 480, atkMs: 900, jump: 9, flies: true, summon: true, role: 'A fallen foe, risen to fight for the Reaper a while' },
  standard: { id: 'standard', name: 'Standard', side: 'hero', sheet: 'samurai_commander', scale: 0.67, hp: 60, atk: 0, def: 6, range: 1, moveMs: 1000, atkMs: 1500, jump: 1, summon: true, still: true, role: 'The Samurai Commander\'s standard: friends near it fight harder' },
  decoy: { id: 'decoy', name: 'Decoy', side: 'hero', sheet: 'cls_illusionist_1', scale: 0.71, hp: 80, atk: 5, def: 0, range: 1, moveMs: 700, atkMs: 1200, jump: 2, summon: true, role: 'A mirage that draws blows' },

  skeleton: { id: 'skeleton', name: 'Skeleton', side: 'foe', sheet: 'skeleton_warrior', scale: 0.79, hp: 320, atk: 26, def: 7, range: 1, moveMs: 650, atkMs: 1100, jump: 2, role: 'Sword and shield' },
  spearman: { id: 'spearman', name: 'Skeleton Spearman', side: 'foe', sheet: 'skeleton_spearman', scale: 0.67, hp: 270, atk: 28, def: 5, range: 2, moveMs: 650, atkMs: 1250, jump: 2, role: 'Reaches two tiles' },
  // the Last Stand's king (`stand.ts`): he stands on his keep, never moves and never strikes; his hp is the run's
  standKing: { id: 'standKing', name: 'The King', side: 'hero', sheet: 'stand_king', scale: 0.8, hp: 1000, atk: 1, def: 4, range: 1, moveMs: 1000, atkMs: 1500, jump: 1, summon: true, role: 'The king, on his keep' },
  boneArcher: { id: 'boneArcher', name: 'Skeleton Archer', side: 'foe', sheet: 'skeleton_archer', scale: 0.79, hp: 200, atk: 23, def: 3, range: 4, moveMs: 700, atkMs: 1400, jump: 2, shot: 'bone', role: 'Bone arrows' },
};

/** The heroes on the bench, in order. */
export const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'] as const;
/** Every hero there is (the old starting five first; a new save unlocks a starter pack of three, and more come from recruiting). */
export const ALL_HEROES: readonly string[] = [...HEROES, 'peasant', 'ninjaMonk', 'wanderer', 'lightningMage', 'kitsune', 'karasu', 'yamabushi', 'werewolf', 'minotaur', 'satyr', 'gorgon', 'samuraiCommander', 'paladin', 'cleric', 'druid', 'barbarian', 'ranger', 'warlock', 'illusionist', 'gunslinger', 'shambler', 'rifleBot', 'mercenary', 'mummy', 'buccaneer', 'wolfBard', 'beastmaster', 'kraken', 'lancer', 'reaper', 'timeWitch', 'arcBlade', 'dreadPirate', 'siegeBot', 'priestess', 'dragoon', 'juggernaut', 'sage', 'demonSwordsman', 'tyrant'];
