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
}

/** The sheet a hero is drawn from at a grade (1 to 3). */
export const formOf = (def: UnitDef, grade = 1): string => def.forms?.[grade - 1] ?? def.sheet;

/** The share of a splash blow that lands on each tile beside the target. */
export const SPLASH_SHARE = 0.5;

export const UNITS: Record<string, UnitDef> = {
  ...FOES,
  ...ELITE_FOES,
  ...CAL_BOSS_FOES,
  knight: { id: 'knight', name: 'Knight', side: 'hero', sheet: 'knight_1', scale: 0.78, hp: 300, atk: 11, def: 10, range: 1, moveMs: 760, atkMs: 1100, jump: 2, role: 'Holds the line', forms: ['knight_1', 'knight_2', 'knight_3'] },
  samurai: { id: 'samurai', name: 'Samurai', side: 'hero', sheet: 'samurai', scale: 0.72, hp: 210, atk: 28, def: 6, range: 1, moveMs: 600, atkMs: 1000, jump: 2, role: 'Heavy blade', forms: ['samurai', 'samurai', 'samurai_commander'] },
  kunoichi: { id: 'kunoichi', name: 'Kunoichi', side: 'hero', sheet: 'kunoichi', scale: 0.66, hp: 184, atk: 19, def: 5, range: 1, moveMs: 420, atkMs: 550, jump: 4, role: 'Quick, climbs well' },
  archer: { id: 'archer', name: 'Archer', side: 'hero', sheet: 'samurai_archer', scale: 0.7, hp: 180, atk: 29, def: 3, range: 4, moveMs: 650, atkMs: 1300, jump: 2, shot: 'arrow', heightReach: 1.4, role: 'Long shots, twice as far from high' },
  wizard: { id: 'wizard', name: 'Fire Wizard', side: 'hero', sheet: 'fire_wizard', scale: 0.76, hp: 149, atk: 33, def: 2, range: 3, moveMs: 700, atkMs: 1700, jump: 2, shot: 'fire', splash: true, role: 'Fire that spreads' },

  ninjaMonk: { id: 'ninjaMonk', name: 'Ninja Monk', side: 'hero', sheet: 'ninja_monk', scale: 0.59, hp: 250, atk: 16, def: 6, range: 1, moveMs: 480, atkMs: 650, jump: 4, role: 'Bare-handed combos' },
  peasant: { id: 'peasant', name: 'Peasant', side: 'hero', sheet: 'ninja_peasant', scale: 0.62, hp: 321, atk: 17, def: 6, range: 2, moveMs: 650, atkMs: 1100, jump: 2, role: 'Spear militia, tougher in a crowd' },
  lightningMage: { id: 'lightningMage', name: 'Lightning Mage', side: 'hero', sheet: 'lightning_mage', scale: 0.67, hp: 166, atk: 37, def: 2, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bolt', role: 'Lightning that jumps between foes' },
  wanderer: { id: 'wanderer', name: 'Wanderer', side: 'hero', sheet: 'wanderer_mage', scale: 0.64, hp: 141, atk: 15, def: 3, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'fire', role: 'Heals the weakest ally' },
  kitsune: { id: 'kitsune', name: 'Kitsune', side: 'hero', sheet: 'kitsune', scale: 0.54, hp: 182, atk: 20, def: 5, range: 1, moveMs: 480, atkMs: 800, jump: 3, role: 'Charms a foe to fight for her' },
  karasu: { id: 'karasu', name: 'Karasu Tengu', side: 'hero', sheet: 'karasu_tengu', scale: 0.48, hp: 194, atk: 30, def: 4, range: 1, moveMs: 420, atkMs: 900, jump: 9, flies: true, role: 'Flies; dives on shooters' },
  yamabushi: { id: 'yamabushi', name: 'Yamabushi Tengu', side: 'hero', sheet: 'yamabushi_tengu', scale: 0.64, hp: 275, atk: 17, def: 9, range: 1, moveMs: 760, atkMs: 1200, jump: 2, role: 'Wind that shoves foes off ledges' },
  werewolf: { id: 'werewolf', name: 'Werewolf', side: 'hero', sheet: 'werewolf_white', scale: 1.05, hp: 210, atk: 24, def: 5, range: 1, moveMs: 340, atkMs: 800, jump: 3, role: 'Quicker with each kill; bites back the blood', forms: ['werewolf_white', 'werewolf_white', 'werewolf_black'] },
  minotaur: { id: 'minotaur', name: 'Minotaur', side: 'hero', sheet: 'minotaur_3', scale: 0.65, hp: 300, atk: 22, def: 9, range: 1, moveMs: 800, atkMs: 1300, jump: 2, role: 'Charges a foe, knocks it back and stuns it', forms: ['minotaur_3', 'minotaur_3', 'minotaur_2'] },
  satyr: { id: 'satyr', name: 'Satyr', side: 'hero', sheet: 'satyr_2', scale: 0.76, hp: 254, atk: 24, def: 5, range: 1, moveMs: 560, atkMs: 1000, jump: 3, role: 'Pipes that hasten the allies near him', forms: ['satyr_2', 'satyr_2', 'satyr_3'] },
  gorgon: { id: 'gorgon', name: 'Gorgon', side: 'hero', sheet: 'gorgon_3', scale: 0.65, hp: 205, atk: 27, def: 4, range: 4, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bolt', role: 'Petrifying gaze that stuns from afar', forms: ['gorgon_3', 'gorgon_3', 'gorgon_2'] },
  samuraiCommander: { id: 'samuraiCommander', name: 'Samurai Commander', side: 'hero', sheet: 'samurai_commander', scale: 0.67, hp: 240, atk: 24, def: 8, range: 1, moveMs: 640, atkMs: 1050, jump: 2, role: 'War banner lifts the blows of those near' },

  paladin: { id: 'paladin', name: 'Paladin', side: 'hero', sheet: 'cls_paladin_1', scale: 0.74, hp: 273, atk: 13, def: 8, range: 1, moveMs: 760, atkMs: 1100, jump: 2, role: 'Draws foes in; heals when he blocks', forms: ['cls_paladin_1', 'cls_paladin_2', 'cls_paladin_3'] },
  cleric: { id: 'cleric', name: 'Cleric', side: 'hero', sheet: 'cls_cleric_1', scale: 0.76, hp: 220, atk: 13, def: 4, range: 2, moveMs: 700, atkMs: 1200, jump: 2, role: 'Heals over time and cleanses', forms: ['cls_cleric_1', 'cls_cleric_2', 'cls_cleric_3'] },
  druid: { id: 'druid', name: 'Druid', side: 'hero', sheet: 'cls_druid_1', scale: 0.78, hp: 214, atk: 19, def: 3, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'leaf', role: 'Calls a treant; thorns hurt attackers', forms: ['cls_druid_1', 'cls_druid_2', 'cls_druid_3'] },
  barbarian: { id: 'barbarian', name: 'Barbarian', side: 'hero', sheet: 'cls_barbarian_1', scale: 0.94, hp: 240, atk: 21, def: 3, range: 1, moveMs: 600, atkMs: 1000, jump: 2, role: 'Hits harder the more hurt he is', forms: ['cls_barbarian_1', 'cls_barbarian_2', 'cls_barbarian_3'] },
  ranger: { id: 'ranger', name: 'Ranger', side: 'hero', sheet: 'cls_ranger_1', scale: 0.76, hp: 165, atk: 27, def: 3, range: 5, moveMs: 650, atkMs: 1400, jump: 2, shot: 'arrow', role: 'Lays snare traps; deadly from afar', forms: ['cls_ranger_1', 'cls_ranger_2', 'cls_ranger_3'] },
  warlock: { id: 'warlock', name: 'Warlock', side: 'hero', sheet: 'cls_warlock_1', scale: 0.77, hp: 172, atk: 27, def: 2, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'curse', role: 'Curses that burn and feed him', forms: ['cls_warlock_1', 'cls_warlock_2', 'cls_warlock_3'] },
  illusionist: { id: 'illusionist', name: 'Illusionist', side: 'hero', sheet: 'cls_illusionist_1', scale: 0.77, hp: 172, atk: 18, def: 4, range: 1, moveMs: 480, atkMs: 750, jump: 3, role: 'Leaves decoys and slips away', forms: ['cls_illusionist_1', 'cls_illusionist_2', 'cls_illusionist_3'] },
  gunslinger: { id: 'gunslinger', name: 'Gunslinger', side: 'hero', sheet: 'cls_gunslinger_1', scale: 0.76, hp: 135, atk: 40, def: 2, range: 6, moveMs: 700, atkMs: 2400, jump: 2, shot: 'bullet', heightReach: 0.7, role: 'Slow, piercing shots from very far', forms: ['cls_gunslinger_1', 'cls_gunslinger_2', 'cls_gunslinger_3'] },

  // the second wave of heroes (docs/notes/more-heroes.md)
  shambler: { id: 'shambler', name: 'Shambler', side: 'hero', sheet: 'hero_shambler', scale: 0.76, hp: 310, atk: 16, def: 4, range: 1, moveMs: 900, atkMs: 1100, jump: 2, role: 'Slow and rotting; its touch festers and it mends itself' },
  rifleBot: { id: 'rifleBot', name: 'Rifle Bot', side: 'hero', sheet: 'robot_infantry', scale: 0.69, hp: 154, atk: 27, def: 3, range: 4, moveMs: 700, atkMs: 1300, jump: 2, shot: 'bullet', role: 'Rapid bursts; deadly from afar' },
  mercenary: { id: 'mercenary', name: 'Mercenary', side: 'hero', sheet: 'hero_mercenary', scale: 0.76, hp: 206, atk: 23, def: 5, range: 1, moveMs: 520, atkMs: 800, jump: 3, role: 'Hunts the strongest foe for a bounty' },
  mummy: { id: 'mummy', name: 'Mummy', side: 'hero', sheet: 'hero_mummy', scale: 0.81, hp: 299, atk: 19, def: 7, range: 1, moveMs: 800, atkMs: 1200, jump: 2, role: 'Wraps foes in bandages that slow them', },
  buccaneer: { id: 'buccaneer', name: 'Buccaneer', side: 'hero', sheet: 'hero_buccaneer', scale: 0.78, hp: 207, atk: 24, def: 5, range: 1, moveMs: 560, atkMs: 850, jump: 3, role: 'Hooks a shooter in and cuts it down' },

  wolfBard: { id: 'wolfBard', name: 'Wolf Bard', side: 'hero', sheet: 'hero_wolf_bard', scale: 0.75, hp: 247, atk: 22, def: 3, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'holy', role: 'A dirge that slows foes; his tune charges his friends' },
  beastmaster: { id: 'beastmaster', name: 'Beastmaster', side: 'hero', sheet: 'hero_beastmaster', scale: 0.77, hp: 182, atk: 16, def: 4, range: 1, moveMs: 620, atkMs: 900, jump: 2, role: 'Calls dire wolves; his whip slows foes' },
  kraken: { id: 'kraken', name: 'Kraken Mate', side: 'hero', sheet: 'hero_kraken_mate', scale: 0.66, hp: 297, atk: 19, def: 6, range: 1, moveMs: 700, atkMs: 1100, jump: 2, role: 'An undertow that drags foes in close' },
  lancer: { id: 'lancer', name: 'Lancer', side: 'hero', sheet: 'hero_lancer', scale: 0.51, hp: 209, atk: 24, def: 5, range: 1, moveMs: 380, atkMs: 900, jump: 3, role: 'Charges down a line, then rides faster' },
  reaper: { id: 'reaper', name: 'Reaper', side: 'hero', sheet: 'hk_ghost', scale: 0.61, hp: 168, atk: 26, def: 3, range: 1, moveMs: 420, atkMs: 800, jump: 9, flies: true, role: 'Flies; reaps the nearly dead' },

  timeWitch: { id: 'timeWitch', name: 'Time Witch', side: 'hero', sheet: 'hero_time_witch', scale: 0.76, hp: 188, atk: 28, def: 2, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bolt', role: 'Slows the foes and hastens her friends' },
  arcBlade: { id: 'arcBlade', name: 'Arc Blade', side: 'hero', sheet: 'robot_swordsman', scale: 0.75, hp: 205, atk: 24, def: 4, range: 1, moveMs: 400, atkMs: 750, jump: 3, role: 'Blinks into a crowd and discharges' },
  dreadPirate: { id: 'dreadPirate', name: 'Dread Pirate', side: 'hero', sheet: 'hero_dread_pirate', scale: 0.76, hp: 263, atk: 21, def: 7, range: 1, moveMs: 780, atkMs: 1200, jump: 2, role: 'Broadsides a crowd; rises once from death' },
  siegeBot: { id: 'siegeBot', name: 'Siege Bot', side: 'hero', sheet: 'robot_destroyer', scale: 0.78, hp: 200, atk: 33, def: 6, range: 5, moveMs: 900, atkMs: 2200, jump: 2, shot: 'bullet', heightReach: 0.7, role: 'Slow shells that burst on a crowd' },

  priestess: { id: 'priestess', name: 'High Priestess', side: 'hero', sheet: 'hero_priestess', scale: 0.78, hp: 209, atk: 17, def: 5, range: 3, moveMs: 700, atkMs: 1400, jump: 2, shot: 'holy', role: 'Mends the worst hurt; a halo shields those near' },
  dragoon: { id: 'dragoon', name: 'Queen Dragoon', side: 'hero', sheet: 'hero_dragoon', scale: 0.68, hp: 220, atk: 24, def: 6, range: 1, moveMs: 420, atkMs: 900, jump: 9, flies: true, role: 'Flies; breathes fire down a line' },
  juggernaut: { id: 'juggernaut', name: 'Juggernaut', side: 'hero', sheet: 'hero_juggernaut', scale: 0.51, hp: 350, atk: 19, def: 9, range: 1, moveMs: 950, atkMs: 1500, jump: 1, role: 'A walking wall; its quake stuns all near' },

  sage: { id: 'sage', name: 'Great Sage', side: 'hero', sheet: 'hero_sage', scale: 0.77, hp: 204, atk: 29, def: 3, range: 4, moveMs: 700, atkMs: 1600, jump: 2, shot: 'fire', role: 'Calls stars on three crowds; fills his friends\' skill meters' },
  demonSwordsman: { id: 'demonSwordsman', name: 'Demon Swordsman', side: 'hero', sheet: 'hero_demon_swordsman', scale: 0.74, hp: 220, atk: 22, def: 7, range: 1, moveMs: 560, atkMs: 950, jump: 3, role: 'Drinks what he cuts; the demon takes him' },
  tyrant: { id: 'tyrant', name: 'Tyrant', side: 'hero', sheet: 'hero_tyrant', scale: 0.67, hp: 262, atk: 20, def: 6, range: 2, moveMs: 800, atkMs: 1250, jump: 2, role: 'Passes judgement; his reign breaks and rallies', },

  // called up by Beastmaster
  wolf: { id: 'wolf', name: 'Dire Wolf', side: 'hero', sheet: 'werewolf_red', scale: 0.6, hp: 120, atk: 14, def: 2, range: 1, moveMs: 360, atkMs: 700, jump: 3, summon: true, role: 'A wolf called by the Beastmaster' },

  // called up by skills (not heroes to place)
  treant: { id: 'treant', name: 'Treant', side: 'hero', sheet: 'cls_treant', scale: 0.5, hp: 330, atk: 16, def: 8, range: 1, moveMs: 900, atkMs: 1300, jump: 1, summon: true, role: 'A tree called by the Druid (it grows with her grade)', forms: ['cls_treant', 'cls_treant_2', 'cls_treant_3'] },
  decoy: { id: 'decoy', name: 'Decoy', side: 'hero', sheet: 'cls_illusionist_1', scale: 0.71, hp: 80, atk: 5, def: 0, range: 1, moveMs: 700, atkMs: 1200, jump: 2, summon: true, role: 'A mirage that draws blows' },

  skeleton: { id: 'skeleton', name: 'Skeleton', side: 'foe', sheet: 'skeleton_warrior', scale: 0.79, hp: 320, atk: 26, def: 7, range: 1, moveMs: 650, atkMs: 1100, jump: 2, role: 'Sword and shield' },
  spearman: { id: 'spearman', name: 'Skeleton Spearman', side: 'foe', sheet: 'skeleton_spearman', scale: 0.67, hp: 270, atk: 28, def: 5, range: 2, moveMs: 650, atkMs: 1250, jump: 2, role: 'Reaches two tiles' },
  boneArcher: { id: 'boneArcher', name: 'Skeleton Archer', side: 'foe', sheet: 'skeleton_archer', scale: 0.79, hp: 200, atk: 23, def: 3, range: 4, moveMs: 700, atkMs: 1400, jump: 2, shot: 'bone', role: 'Bone arrows' },
};

/** The heroes on the bench, in order. */
export const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'] as const;
/** Every hero there is (the old starting five first; a new save unlocks a starter pack of three, and more come from recruiting). */
export const ALL_HEROES: readonly string[] = [...HEROES, 'peasant', 'ninjaMonk', 'wanderer', 'lightningMage', 'kitsune', 'karasu', 'yamabushi', 'werewolf', 'minotaur', 'satyr', 'gorgon', 'samuraiCommander', 'paladin', 'cleric', 'druid', 'barbarian', 'ranger', 'warlock', 'illusionist', 'gunslinger', 'shambler', 'rifleBot', 'mercenary', 'mummy', 'buccaneer', 'wolfBard', 'beastmaster', 'kraken', 'lancer', 'reaper', 'timeWitch', 'arcBlade', 'dreadPirate', 'siegeBot', 'priestess', 'dragoon', 'juggernaut', 'sage', 'demonSwordsman', 'tyrant'];
