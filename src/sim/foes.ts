// The foes: werewolves (fast, leap up ledges), minotaurs (tanky, heavy blows), gorgons (shoot from afar), satyrs
// (middling melee), orcs, demons and ogres, and the bosses of the boss stages. Each kind has a sprite per variant, so a
// band looks mixed. `FOE_BANDS` lists the five foes of each band by their ids in `UNITS`; a fight meets the band it is
// started with. A boss band's first foe is its boss (drawn larger, see `BOSS` in `run.ts`), with four escorts.
// `FIELD_BANDS` are the bands of ordinary stages, in turn; `BOSS_BANDS` the bosses, one per boss stage, in turn.

import type { UnitDef } from './units';

const WOLF = { side: 'foe', hp: 250, atk: 24, def: 4, range: 1, moveMs: 380, atkMs: 800, jump: 3, role: 'Fast, leaps ledges' } as const;
const MINOTAUR = { side: 'foe', hp: 440, atk: 27, def: 9, range: 1, moveMs: 900, atkMs: 1400, jump: 2, role: 'Tanky, heavy blows' } as const;
const GORGON = { side: 'foe', hp: 300, atk: 26, def: 5, range: 4, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bone', role: 'Shoots from afar' } as const;
const SATYR = { side: 'foe', hp: 320, atk: 25, def: 6, range: 1, moveMs: 600, atkMs: 1100, jump: 2, role: 'Middling melee' } as const;

const ORC = { side: 'foe', hp: 280, atk: 26, def: 5, range: 1, moveMs: 600, atkMs: 1000, jump: 2, role: 'Cheap and in numbers' } as const;
const IMP = { side: 'foe', hp: 200, atk: 22, def: 2, range: 1, moveMs: 380, atkMs: 700, jump: 3, role: 'Small and quick' } as const;
const DEMON = { side: 'foe', hp: 410, atk: 32, def: 6, range: 1, moveMs: 650, atkMs: 1100, jump: 2, flies: true, role: 'Flies, hits hard' } as const;
const OGRE = { side: 'foe', hp: 480, atk: 30, def: 8, range: 1, moveMs: 1000, atkMs: 1500, jump: 2, role: 'Huge club, slow' } as const;

// The bosses: much more hp, and each one's own look and skill (its kit, in `abilities.ts`). A forest boss has none.
// The bosses are the walls of a run: the first (stage 5, the orc warlord) is six times the hp and three times the attack of
// an orc chief, so a first run's team cannot win it; each later boss is stronger than the last (the set in `FOES`, see
// `docs/notes/balance.md`), so a run stops at each one for a few runs after the one before.
const WARLORD = { side: 'foe', hp: 2280, atk: 78, def: 10, range: 1, moveMs: 800, atkMs: 1200, jump: 2, role: 'Orc chief, ground slam' } as const;
const DEMON_LORD = { side: 'foe', hp: 350, atk: 22, def: 9, range: 1, moveMs: 700, atkMs: 1200, jump: 2, flies: true, role: 'Calls imps to his side' } as const;
const HORNED_OGRE = { side: 'foe', hp: 700, atk: 28, def: 10, range: 1, moveMs: 1000, atkMs: 1500, jump: 2, role: 'Horns, sweeping blows' } as const;
const FOREST = { side: 'foe', hp: 600, atk: 25, def: 8, range: 1, moveMs: 600, atkMs: 1000, jump: 2, role: 'Forest brute' } as const;
const BOAR_KING = { side: 'foe', hp: 380, atk: 22, def: 10, range: 1, moveMs: 700, atkMs: 1200, jump: 2, role: 'Charges through the line' } as const;
const DEVIL_LEADER = { side: 'foe', hp: 420, atk: 24, def: 9, range: 1, moveMs: 700, atkMs: 1200, jump: 2, role: 'Hurls hellfire' } as const;
const SHAMAN_KING = { side: 'foe', hp: 400, atk: 24, def: 7, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bolt', role: 'Bolts from afar, wards its own' } as const;

// The armies' own looks (`armies.ts`): the same sheets as the common foes, each army's kind with a skill of its own
// (the kits are in `abilities.ts`), and the mid-bosses and the Lich King and Labyrinth champion the armies add.
const BONE_VOLLEY = { side: 'foe', hp: 210, atk: 24, def: 3, range: 4, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bone', role: 'Shoots, and rains volleys' } as const;
const PACK = { side: 'foe', hp: 250, atk: 24, def: 4, range: 1, moveMs: 360, atkMs: 800, jump: 3, role: 'Fast flanker, bites weak foes' } as const;
const GROVE = { side: 'foe', hp: 320, atk: 25, def: 6, range: 1, moveMs: 600, atkMs: 1100, jump: 2, role: 'Pipes the pack faster' } as const;
const MAZE_MINO = { side: 'foe', hp: 440, atk: 27, def: 9, range: 1, moveMs: 900, atkMs: 1400, jump: 2, role: 'Charges down a line' } as const;
const MAZE_GORGON = { side: 'foe', hp: 300, atk: 26, def: 5, range: 4, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bone', role: 'Stiffens the strongest foe' } as const;
const CLAN_OGRE = { side: 'foe', hp: 480, atk: 30, def: 8, range: 1, moveMs: 1000, atkMs: 1500, jump: 2, role: 'Shoves heroes back' } as const;
const HELL_IMP = { side: 'foe', hp: 200, atk: 22, def: 2, range: 1, moveMs: 380, atkMs: 700, jump: 3, role: 'Small, quick, sets alight' } as const;
const MID = { side: 'foe', hp: 1500, atk: 46, def: 9, range: 1, moveMs: 750, atkMs: 1200, jump: 2 } as const;
const LICH_KING = { side: 'foe', hp: 2600, atk: 60, def: 8, range: 3, moveMs: 800, atkMs: 1500, jump: 2, shot: 'curse', role: 'Raises the dead, freezes the living' } as const;
const CHAMPION = { side: 'foe', hp: 4200, atk: 90, def: 12, range: 1, moveMs: 800, atkMs: 1300, jump: 2, role: 'Charges, gores, shrugs off blows' } as const;

// The Yokai Night Parade and the Golem Forge (`armies.ts`): fox spirits, crows and a tengu monk, and slow stone, iron and crystal golems.
const YOKAI = { side: 'foe', hp: 220, atk: 24, def: 4, range: 1, moveMs: 480, atkMs: 800, jump: 3 } as const;
const GOLEM = { side: 'foe', hp: 460, atk: 28, def: 9, range: 1, moveMs: 1000, atkMs: 1500, jump: 2 } as const;

export const FOES: Record<string, UnitDef> = {
  wolfBlack: { ...WOLF, id: 'wolfBlack', name: 'Black Werewolf', sheet: 'werewolf_black', scale: 0.81 },
  wolfRed: { ...WOLF, id: 'wolfRed', name: 'Red Werewolf', sheet: 'werewolf_red', scale: 0.81, hp: 250, atk: 25, def: 3 },
  wolfWhite: { ...WOLF, id: 'wolfWhite', name: 'White Werewolf', sheet: 'werewolf_white', scale: 0.81, hp: 210, atk: 22, def: 5, moveMs: 340 },

  minotaur1: { ...MINOTAUR, id: 'minotaur1', name: 'Minotaur', sheet: 'minotaur_1', scale: 0.5 },
  minotaur2: { ...MINOTAUR, id: 'minotaur2', name: 'Minotaur', sheet: 'minotaur_2', scale: 0.54, hp: 330, atk: 24 },
  minotaur3: { ...MINOTAUR, id: 'minotaur3', name: 'Minotaur', sheet: 'minotaur_3', scale: 0.5, hp: 400, def: 10, atk: 20 },

  gorgon1: { ...GORGON, id: 'gorgon1', name: 'Gorgon', sheet: 'gorgon_1', scale: 0.6 },
  gorgon2: { ...GORGON, id: 'gorgon2', name: 'Gorgon', sheet: 'gorgon_2', scale: 0.6, hp: 300, atk: 22 },
  gorgon3: { ...GORGON, id: 'gorgon3', name: 'Gorgon', sheet: 'gorgon_3', scale: 0.6, hp: 250, atk: 26 },

  satyr1: { ...SATYR, id: 'satyr1', name: 'Satyr', sheet: 'satyr_1', scale: 0.62 },
  satyr2: { ...SATYR, id: 'satyr2', name: 'Satyr', sheet: 'satyr_2', scale: 0.52, hp: 320, atk: 26 },
  satyr3: { ...SATYR, id: 'satyr3', name: 'Satyr', sheet: 'satyr_3', scale: 0.61, hp: 270, def: 4 },

  orcGrunt: { ...ORC, id: 'orcGrunt', name: 'Orc Grunt', sheet: 'hk_orc_grunt', scale: 0.63 },
  orcArcher: { ...ORC, id: 'orcArcher', name: 'Orc Archer', sheet: 'hk_orc_archer', scale: 0.69, hp: 200, atk: 24, def: 3, range: 4, moveMs: 700, atkMs: 1400, shot: 'arrow', role: 'Shoots from afar' },
  orcBrute: { ...ORC, id: 'orcBrute', name: 'Orc Brute', sheet: 'hk_orc_brute', scale: 0.57, hp: 420, atk: 30, def: 8, moveMs: 900, atkMs: 1300, role: 'Heavy, slow blows' },

  imp: { ...IMP, id: 'imp', name: 'Imp', sheet: 'hk_imp', scale: 0.65 },
  demon: { ...DEMON, id: 'demon', name: 'Demon', sheet: 'hk_demon', scale: 0.39 },
  ogre: { ...OGRE, id: 'ogre', name: 'Ogre', sheet: 'hk_ogre', scale: 0.42 },

  orcWarlord: { ...WARLORD, id: 'orcWarlord', name: 'Orc Warlord', sheet: 'hk_orc_warlord', scale: 0.55 },
  demonLord: { ...DEMON_LORD, id: 'demonLord', name: 'Demon Lord', sheet: 'hk_demon_lord', scale: 0.46, hp: 3600, atk: 70 },
  hornedOgre: { ...HORNED_OGRE, id: 'hornedOgre', name: 'Horned Ogre', sheet: 'hk_ogre_horned', scale: 0.47, hp: 4800, atk: 85 },
  forestBoss1: { ...FOREST, id: 'forestBoss1', name: 'Thorn Warden', sheet: 'forest_boss_1', scale: 0.45, hp: 3300, atk: 65 },
  forestBoss2: { ...FOREST, id: 'forestBoss2', name: 'Wood Raider', sheet: 'forest_boss_2', scale: 1.05, hp: 3900, atk: 72, def: 6, moveMs: 500, atkMs: 900, jump: 3, role: 'Forest raider, quick' },
  forestBoss3: { ...FOREST, id: 'forestBoss3', name: 'Grove Spearlord', sheet: 'forest_boss_3', scale: 1.28, hp: 6000, atk: 100, def: 5, range: 2, role: 'Forest spearman' },
  // the armies' kinds (same sheets, a skill each)
  boneVolley: { ...BONE_VOLLEY, id: 'boneVolley', name: 'Skeleton Marksman', sheet: 'skeleton_archer', scale: 0.79 },
  packBlack: { ...PACK, id: 'packBlack', name: 'Black Werewolf', sheet: 'werewolf_black', scale: 0.81 },
  packRed: { ...PACK, id: 'packRed', name: 'Red Werewolf', sheet: 'werewolf_red', scale: 0.81, atk: 25, def: 3 },
  packWhite: { ...PACK, id: 'packWhite', name: 'White Werewolf', sheet: 'werewolf_white', scale: 0.81, hp: 210, atk: 22, def: 5, moveMs: 330 },
  groveSatyr1: { ...GROVE, id: 'groveSatyr1', name: 'Grove Satyr', sheet: 'satyr_1', scale: 0.62 },
  groveSatyr2: { ...GROVE, id: 'groveSatyr2', name: 'Grove Satyr', sheet: 'satyr_2', scale: 0.52, atk: 26 },
  groveSatyr3: { ...GROVE, id: 'groveSatyr3', name: 'Grove Satyr', sheet: 'satyr_3', scale: 0.61, hp: 270, def: 4 },
  mazeMino1: { ...MAZE_MINO, id: 'mazeMino1', name: 'Minotaur', sheet: 'minotaur_1', scale: 0.5 },
  mazeMino2: { ...MAZE_MINO, id: 'mazeMino2', name: 'Minotaur', sheet: 'minotaur_2', scale: 0.54, hp: 330, atk: 24 },
  mazeMino3: { ...MAZE_MINO, id: 'mazeMino3', name: 'Minotaur', sheet: 'minotaur_3', scale: 0.5, hp: 400, def: 10, atk: 20 },
  mazeGorgon1: { ...MAZE_GORGON, id: 'mazeGorgon1', name: 'Gorgon', sheet: 'gorgon_1', scale: 0.6 },
  mazeGorgon2: { ...MAZE_GORGON, id: 'mazeGorgon2', name: 'Gorgon', sheet: 'gorgon_2', scale: 0.6, atk: 22 },
  mazeGorgon3: { ...MAZE_GORGON, id: 'mazeGorgon3', name: 'Gorgon', sheet: 'gorgon_3', scale: 0.6, hp: 250, atk: 26 },
  clanOgre: { ...CLAN_OGRE, id: 'clanOgre', name: 'Ogre', sheet: 'hk_ogre', scale: 0.42 },
  clanBrute: { side: 'foe', hp: 420, atk: 30, def: 8, range: 1, moveMs: 900, atkMs: 1300, jump: 2, role: 'Heavy, slow blows', id: 'clanBrute', name: 'Orc Brute', sheet: 'hk_orc_brute', scale: 0.57 },
  hellImp: { ...HELL_IMP, id: 'hellImp', name: 'Imp', sheet: 'hk_imp', scale: 0.65 },
  hellDemon: { ...DEMON, id: 'hellDemon', name: 'Demon', sheet: 'hk_demon', scale: 0.39, role: 'Flies, hurls hellfire' },
  // the mid-bosses (a boss band's first foe, drawn bigger), the Lich King and the Labyrinth's champion
  orcChieftain: { ...MID, id: 'orcChieftain', name: 'Orc Chieftain', sheet: 'hk_orc_brute', scale: 0.62, role: 'Rallies the warband with a banner' },
  boneCaptain: { ...MID, id: 'boneCaptain', name: 'Bone Captain', sheet: 'skeleton_warrior', scale: 0.86, hp: 1400, atk: 44, role: 'Rallies the dead with a banner' },
  alphaWolf: { ...MID, id: 'alphaWolf', name: 'Alpha Werewolf', sheet: 'werewolf_black', scale: 1.05, hp: 1200, atk: 42, def: 6, moveMs: 420, atkMs: 800, jump: 3, role: 'Leader of the pack, rends the weak' },
  gorgonQueen: { ...MID, id: 'gorgonQueen', name: 'Gorgon Queen', sheet: 'gorgon_1', scale: 0.95, hp: 1300, atk: 44, def: 7, range: 4, shot: 'bone', moveMs: 700, atkMs: 1500, role: 'Her gaze turns heroes to stone' },
  lichKing: { ...LICH_KING, id: 'lichKing', name: 'Lich King', sheet: 'lich_king', scale: 0.45 },
  minotaurChampion: { ...CHAMPION, id: 'minotaurChampion', name: 'Minotaur Champion', sheet: 'minotaur_1', scale: 0.78 },
  // the Yokai Night Parade (kitsune and tengu sheets of the heroes; the Oni King is generated)
  yokaiFox: { ...YOKAI, id: 'yokaiFox', name: 'Fox Spirit', sheet: 'kitsune', scale: 0.59, role: 'Slips away, leaves decoys' },
  yokaiWitch: { ...YOKAI, id: 'yokaiWitch', name: 'Fox Witch', sheet: 'kitsune', scale: 0.59, hp: 190, atk: 26, def: 3, range: 3, shot: 'curse', moveMs: 650, atkMs: 1500, role: 'Curses the toughest heroes' },
  yokaiCrow: { ...YOKAI, id: 'yokaiCrow', name: 'Karasu Tengu', sheet: 'karasu_tengu', scale: 0.53, hp: 210, atk: 28, moveMs: 420, atkMs: 900, jump: 9, flies: true, role: 'Flies, dives on shooters' },
  yokaiSeer: { ...YOKAI, id: 'yokaiSeer', name: 'Crow Seer', sheet: 'karasu_tengu', scale: 0.53, hp: 200, atk: 24, def: 3, moveMs: 450, atkMs: 900, jump: 9, flies: true, role: 'Possesses the strongest hero' },
  yokaiMonk: { ...YOKAI, id: 'yokaiMonk', name: 'Yamabushi Monk', sheet: 'yamabushi_tengu', scale: 0.48, hp: 320, atk: 22, def: 9, moveMs: 760, atkMs: 1200, jump: 2, role: 'Wind that shoves heroes off ledges' },
  nineTails: { ...MID, id: 'nineTails', name: 'Nine-Tailed Fox', sheet: 'kitsune', scale: 0.95, hp: 1500, atk: 46, def: 6, range: 3, shot: 'fire', moveMs: 600, atkMs: 1300, role: 'Foxfire, and heroes turn on their own' },
  oniKing: { side: 'foe', id: 'oniKing', name: 'Oni King', sheet: 'oni_king', scale: 0.5, hp: 3200, atk: 80, def: 11, range: 1, moveMs: 850, atkMs: 1300, jump: 2, role: 'Smashes the line, roars heroes down' },
  // the Golem Forge
  stoneGolem: { ...GOLEM, id: 'stoneGolem', name: 'Stone Golem', sheet: 'golem_stone', scale: 0.45, role: 'Crushing blows' },
  ironGolem: { ...GOLEM, id: 'ironGolem', name: 'Iron Golem', sheet: 'golem_iron', scale: 0.55, hp: 540, atk: 24, def: 12, moveMs: 1100, role: 'Plated, draws the heroes' },
  crystalGolem: { ...GOLEM, id: 'crystalGolem', name: 'Crystal Golem', sheet: 'golem_crystal', scale: 0.55, hp: 340, atk: 26, def: 7, moveMs: 900, atkMs: 1300, role: 'Shards that hold heroes still' },
  magmaGolem: { ...GOLEM, id: 'magmaGolem', name: 'Magma Golem', sheet: 'golem_magma', scale: 0.55, hp: 400, atk: 32, def: 6, moveMs: 950, role: 'Molten blows, bursts of magma' },
  sapphireColossus: { ...MID, id: 'sapphireColossus', name: 'Sapphire Colossus', sheet: 'golem_sapphire', scale: 0.85, hp: 1800, atk: 50, def: 12, moveMs: 950, atkMs: 1400, role: 'Crystal armour, shard storms' },
  forgeTitan: { side: 'foe', id: 'forgeTitan', name: 'Forge Titan', sheet: 'golem_forge', scale: 0.85, hp: 4200, atk: 85, def: 14, range: 1, moveMs: 1000, atkMs: 1500, jump: 2, role: 'Hammers the line, furnace blasts' },
  boarKing: { ...BOAR_KING, id: 'boarKing', name: 'Boar King', sheet: 'boar_king', scale: 0.54, hp: 6800, atk: 110 },
  devilLeader: { ...DEVIL_LEADER, id: 'devilLeader', name: 'Devil Leader', sheet: 'devil_leader', scale: 0.49, hp: 7600, atk: 120 },
  shamanKing: { ...SHAMAN_KING, id: 'shamanKing', name: 'Shaman King', sheet: 'shaman_king', scale: 0.5, hp: 8400, atk: 130 },
};

/** The bosses' ids: the first foe of a boss band is one of these. */
export const BOSS_IDS: readonly string[] = ['orcWarlord', 'demonLord', 'hornedOgre', 'forestBoss1', 'forestBoss2', 'forestBoss3', 'boarKing', 'devilLeader', 'shamanKing', 'orcChieftain', 'boneCaptain', 'alphaWolf', 'gorgonQueen', 'lichKing', 'minotaurChampion', 'nineTails', 'oniKing', 'sapphireColossus', 'forgeTitan'];
/** A boss: one of the list above, or one of the calamity's own (`calamityBosses.ts`, kept out of the list: it is the meta's boss codex). */
export const isBoss = (id: string) => BOSS_IDS.includes(id) || id.startsWith('calBoss');

/** The bands a fight can meet: five foes each, by their ids in `UNITS`. The boss bands are below (their first foe is the boss). */
export const FOE_BANDS: Record<string, string[]> = {
  skeletons: ['skeleton', 'skeleton', 'spearman', 'spearman', 'boneArcher'],
  werewolves: ['wolfBlack', 'wolfRed', 'wolfWhite', 'wolfBlack', 'wolfRed'],
  minotaurs: ['minotaur1', 'minotaur2', 'minotaur3', 'minotaur1', 'minotaur2'],
  gorgons: ['gorgon1', 'gorgon2', 'gorgon3', 'gorgon1', 'gorgon2'],
  satyrs: ['satyr1', 'satyr2', 'satyr3', 'satyr1', 'satyr2'],
  mixed: ['wolfRed', 'minotaur1', 'gorgon1', 'satyr1', 'minotaur2'],
  orcs: ['orcGrunt', 'orcGrunt', 'orcArcher', 'orcBrute', 'orcGrunt'],
  demons: ['imp', 'imp', 'demon', 'imp', 'demon'],
  ogres: ['ogre', 'imp', 'ogre', 'imp', 'ogre'],
  orcWarlord: ['orcWarlord', 'orcGrunt', 'orcArcher', 'orcGrunt', 'orcBrute'],
  demonLord: ['demonLord', 'imp', 'imp', 'imp', 'demon'],
  hornedOgre: ['hornedOgre', 'ogre', 'imp', 'ogre', 'imp'],
  forestBoss1: ['forestBoss1', 'satyr1', 'satyr2', 'satyr3', 'satyr1'],
  forestBoss2: ['forestBoss2', 'wolfBlack', 'wolfRed', 'wolfWhite', 'wolfBlack'],
  forestBoss3: ['forestBoss3', 'gorgon1', 'gorgon2', 'gorgon3', 'gorgon1'],
  boarKing: ['boarKing', 'minotaur1', 'minotaur2', 'minotaur3', 'minotaur1'],
  devilLeader: ['devilLeader', 'imp', 'demon', 'imp', 'imp'],
  shamanKing: ['shamanKing', 'skeleton', 'spearman', 'spearman', 'boneArcher'],
};

/** The bands of ordinary stages, in turn. */
export const FIELD_BANDS = ['skeletons', 'werewolves', 'minotaurs', 'gorgons', 'satyrs', 'mixed', 'orcs', 'demons', 'ogres'];
/** The boss bands, one per boss stage, in turn. */
export const BOSS_BANDS = ['orcWarlord', 'forestBoss1', 'demonLord', 'forestBoss2', 'hornedOgre', 'forestBoss3', 'boarKing', 'devilLeader', 'shamanKing'];
