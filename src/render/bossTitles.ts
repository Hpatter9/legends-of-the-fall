// The title line under each boss's name on its intro banner (keyed by the boss's id in `FOES`).

export const BOSS_TITLES: Record<string, string> = {
  orcWarlord: 'Lord of the Red Tusk',
  demonLord: 'Master of the Imp Hordes',
  hornedOgre: 'The Mountain That Walks',
  forestBoss1: 'Warden of the Bramble',
  forestBoss2: 'Raider of the Deep Wood',
  forestBoss3: 'Spear of the Old Grove',
  boarKing: 'King of the Thundering Herd',
  devilLeader: 'Bringer of Hellfire',
  shamanKing: 'Whisperer of the Dead',
};

/** A boss's title line (a plain one for any boss without its own). */
export const titleOf = (id: string): string => BOSS_TITLES[id] ?? 'Guardian of the Stage';
