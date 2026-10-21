// The foes beyond the skeletons: werewolves (fast, leap up ledges), minotaurs (tanky, heavy blows), gorgons (shoot from
// afar) and satyrs (middling melee). Each kind has a sprite per variant, so a band looks mixed. `FOE_BANDS` lists the
// five foes of each band by their ids in `UNITS`; a fight meets the band it is started with.

import type { UnitDef } from './units';

const WOLF = { side: 'foe', hp: 230, atk: 24, def: 4, range: 1, moveMs: 380, atkMs: 800, jump: 3, role: 'Fast, leaps ledges' } as const;
const MINOTAUR = { side: 'foe', hp: 360, atk: 22, def: 9, range: 1, moveMs: 900, atkMs: 1400, jump: 2, role: 'Tanky, heavy blows' } as const;
const GORGON = { side: 'foe', hp: 280, atk: 24, def: 5, range: 4, moveMs: 700, atkMs: 1500, jump: 2, shot: 'bone', role: 'Shoots from afar' } as const;
const SATYR = { side: 'foe', hp: 300, atk: 25, def: 6, range: 1, moveMs: 600, atkMs: 1100, jump: 2, role: 'Middling melee' } as const;

export const FOES: Record<string, UnitDef> = {
  wolfBlack: { ...WOLF, id: 'wolfBlack', name: 'Black Werewolf', sheet: 'werewolf_black', scale: 0.81 },
  wolfRed: { ...WOLF, id: 'wolfRed', name: 'Red Werewolf', sheet: 'werewolf_red', scale: 0.81, hp: 250, atk: 26, def: 3 },
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
};

/** The bands a fight can meet: five foes each, by their ids in `UNITS`. */
export const FOE_BANDS: Record<string, string[]> = {
  skeletons: ['skeleton', 'skeleton', 'spearman', 'spearman', 'boneArcher'],
  werewolves: ['wolfBlack', 'wolfRed', 'wolfWhite', 'wolfBlack', 'wolfRed'],
  minotaurs: ['minotaur1', 'minotaur2', 'minotaur3', 'minotaur1', 'minotaur2'],
  gorgons: ['gorgon1', 'gorgon2', 'gorgon3', 'gorgon1', 'gorgon2'],
  satyrs: ['satyr1', 'satyr2', 'satyr3', 'satyr1', 'satyr2'],
  mixed: ['wolfRed', 'minotaur1', 'gorgon1', 'satyr1', 'minotaur2'],
};
