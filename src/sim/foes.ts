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
const WARLORD = { side: 'foe', hp: 380, atk: 26, def: 10, range: 1, moveMs: 800, atkMs: 1200, jump: 2, role: 'Orc chief, ground slam' } as const;
const DEMON_LORD = { side: 'foe', hp: 350, atk: 22, def: 9, range: 1, moveMs: 700, atkMs: 1200, jump: 2, flies: true, role: 'Calls imps to his side' } as const;
const HORNED_OGRE = { side: 'foe', hp: 700, atk: 28, def: 10, range: 1, moveMs: 1000, atkMs: 1500, jump: 2, role: 'Horns, sweeping blows' } as const;
const FOREST = { side: 'foe', hp: 600, atk: 25, def: 8, range: 1, moveMs: 600, atkMs: 1000, jump: 2, role: 'Forest brute' } as const;
const BOAR_KING = { side: 'foe', hp: 380, atk: 22, def: 10, range: 1, moveMs: 700, atkMs: 1200, jump: 2, role: 'Charges through the line' } as const;
const DEVIL_LEADER = { side: 'foe', hp: 420, atk: 24, def: 9, range: 1, moveMs: 700, atkMs: 1200, jump: 2, role: 'Hurls hellfire' } as const;
const SHAMAN_KING = { side: 'foe', hp: 400, atk: 24, def: 7, range: 3, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bolt', role: 'Bolts from afar, wards its own' } as const;

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

  orcGrunt: { ...ORC, id: 'orcGrunt', name: 'Orc Grunt', sheet: 'hk_orc_grunt', scale: 0.61 },
  orcArcher: { ...ORC, id: 'orcArcher', name: 'Orc Archer', sheet: 'hk_orc_archer', scale: 0.61, hp: 200, atk: 24, def: 3, range: 4, moveMs: 700, atkMs: 1400, shot: 'arrow', role: 'Shoots from afar' },
  orcBrute: { ...ORC, id: 'orcBrute', name: 'Orc Brute', sheet: 'hk_orc_brute', scale: 0.61, hp: 420, atk: 30, def: 8, moveMs: 900, atkMs: 1300, role: 'Heavy, slow blows' },

  imp: { ...IMP, id: 'imp', name: 'Imp', sheet: 'hk_imp', scale: 1 },
  demon: { ...DEMON, id: 'demon', name: 'Demon', sheet: 'hk_demon', scale: 0.39 },
  ogre: { ...OGRE, id: 'ogre', name: 'Ogre', sheet: 'hk_ogre', scale: 0.43 },

  orcWarlord: { ...WARLORD, id: 'orcWarlord', name: 'Orc Warlord', sheet: 'hk_orc_warlord', scale: 0.54 },
  demonLord: { ...DEMON_LORD, id: 'demonLord', name: 'Demon Lord', sheet: 'hk_demon_lord', scale: 0.39 },
  hornedOgre: { ...HORNED_OGRE, id: 'hornedOgre', name: 'Horned Ogre', sheet: 'hk_ogre_horned', scale: 0.42 },
  forestBoss1: { ...FOREST, id: 'forestBoss1', name: 'Forest Boss', sheet: 'forest_boss_1', scale: 1.05 },
  forestBoss2: { ...FOREST, id: 'forestBoss2', name: 'Forest Boss', sheet: 'forest_boss_2', scale: 1.05, hp: 580, atk: 26, def: 6, moveMs: 500, atkMs: 900, jump: 3, role: 'Forest raider, quick' },
  forestBoss3: { ...FOREST, id: 'forestBoss3', name: 'Forest Boss', sheet: 'forest_boss_3', scale: 1.28, hp: 550, atk: 24, def: 5, range: 2, role: 'Forest spearman' },
  boarKing: { ...BOAR_KING, id: 'boarKing', name: 'Boar King', sheet: 'boar_king', scale: 0.54 },
  devilLeader: { ...DEVIL_LEADER, id: 'devilLeader', name: 'Devil Leader', sheet: 'devil_leader', scale: 0.49 },
  shamanKing: { ...SHAMAN_KING, id: 'shamanKing', name: 'Shaman King', sheet: 'shaman_king', scale: 0.5 },
};

/** The bosses' ids: the first foe of a boss band is one of these. */
export const BOSS_IDS: readonly string[] = ['orcWarlord', 'demonLord', 'hornedOgre', 'forestBoss1', 'forestBoss2', 'forestBoss3', 'boarKing', 'devilLeader', 'shamanKing'];
export const isBoss = (id: string) => BOSS_IDS.includes(id);

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
