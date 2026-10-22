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
  orcChieftain: 'Breaker of Shields',
  boneCaptain: 'Marshal of the Fallen',
  alphaWolf: 'Leader of the Moonlit Pack',
  gorgonQueen: 'Queen of Stone',
  lichKing: 'The Frozen Crown',
  minotaurChampion: 'Champion of the Labyrinth',
  nineTails: 'Lantern of the Hundred Nights',
  oniKing: 'Lord of the Night Parade',
  sapphireColossus: 'Heart of the Blue Vein',
  forgeTitan: 'Master of the Eternal Forge',
};

/** A boss's title line (a plain one for any boss without its own). */
export const titleOf = (id: string): string => BOSS_TITLES[id] ?? 'Guardian of the Stage';
