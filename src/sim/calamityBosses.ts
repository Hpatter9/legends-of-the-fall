// The calamity's six bosses, one at the end of each map. Each is a boss of an existing look (`foes.ts`) under its own id, name and
// title, with a kit that stacks up through the maps: map 1 enrages as it falls, map 2 adds a shield wall, map 3 calls imps and mends,
// map 4 shoves the heroes back (and cannot be shoved), map 5 poisons and drinks what it deals, and map 6 has all of it, and
// charges. The kits are built from the others' skills (the table `KITS` is passed in, as `eliteFoes.ts` does). Pure data.

import { FOES } from './foes';
import type { Kit, Passive } from './abilities';
import type { UnitDef } from './units';

/** The boss fighters' ids, in map order. */
export const CAL_BOSSES: readonly string[] = ['calBoss1', 'calBoss2', 'calBoss3', 'calBoss4', 'calBoss5', 'calBoss6'];

const boss = (id: string, base: UnitDef, name: string, role: string, tweak: Partial<UnitDef> = {}): UnitDef => ({ ...base, ...tweak, id, name, role });

export const CAL_BOSS_FOES: Record<string, UnitDef> = {
  calBoss1: boss('calBoss1', FOES.orcWarlord, 'Gorvak the Ashen', 'Enrages as he falls', { hp: 2060, atk: 61 }),
  calBoss2: boss('calBoss2', FOES.forestBoss1, 'The Thorn Warden', 'Enrages, and raises a shield wall', { hp: 3100, atk: 73 }),
  calBoss3: boss('calBoss3', FOES.demonLord, 'Malphas', 'Enrages, shielded, calls imps, mends', { hp: 3030, atk: 70 }),
  calBoss4: boss('calBoss4', FOES.hornedOgre, 'Hrungar the Mountain', 'Shoves the line, cannot be shoved', { hp: 4150, atk: 66 }),
  calBoss5: boss('calBoss5', FOES.devilLeader, 'Vorgrath the Hellbringer', 'Poisons, and drinks what it deals', { hp: 3490, atk: 59 }),
  calBoss6: boss('calBoss6', FOES.boarKing, 'Karnok the Calamity', 'All of it, and a charge besides', { scale: 0.62, hp: 2100, atk: 38 }),
};

/** The intro card's title line under each boss's name. */
export const CAL_BOSS_TITLES: Record<string, string> = {
  calBoss1: 'First Herald of the Calamity',
  calBoss2: 'The Bramble That Remembers',
  calBoss3: 'He Who Calls the Hordes',
  calBoss4: 'The Wall That Walks',
  calBoss5: 'Bringer of the Last Flame',
  calBoss6: 'The End of All Roads',
};

/** The escorts of each map's boss (the fights' own units): each map's a little tougher than the last's. */
const ESCORTS: readonly (readonly string[])[] = [
  ['orcGrunt', 'orcArcher', 'orcGrunt', 'orcBrute'],
  ['satyr1', 'satyr2', 'satyr3', 'satyr1'],
  ['imp', 'imp', 'imp', 'demon'],
  ['imp', 'demon', 'imp', 'demon'],
  ['skeleton', 'spearman', 'boneArcher', 'spearman'],
  ['orcBrute', 'orcGrunt', 'orcBrute', 'orcArcher'],
];

/** The band of the boss of map `map` (1-based): the boss, then its escort. */
export function calBossBand(map: number): string[] {
  const i = Math.min(Math.max(1, map), CAL_BOSSES.length) - 1;
  return [CAL_BOSSES[i], ...ESCORTS[i]];
}

export function calBossKits(kits: Record<string, Kit>): Record<string, Kit> {
  const rage: Passive = { name: 'Calamity Rage', text: 'His attack grows by up to 60% as his health falls', rage: 0.6 };
  const wall = { block: 0.25 };
  const own = (name: string, text: string, rest: Partial<Passive>): Passive => ({ ...rage, name, text, ...rest });
  const poison = { ignite: { kind: 'curse' as const, dmg: 4, every: 500, ms: 2500 }, leech: 0.15 };
  return {
    calBoss1: { skill: kits.orcWarlord.skill, passive: own('Calamity Rage', 'His attack grows by up to 60% as his health falls', {}) },
    calBoss2: { skill: kits.orcWarlord.skill, passive: own('Thorn Wall', 'Enrages as he falls; blows from the front lose a quarter', wall) },
    calBoss3: { skill: kits.demonLord.skill, passive: own('Dark Court', 'Enrages, shielded, and heals 1% of its health a second', { ...wall, regen: 0.01 }) },
    calBoss4: { skill: kits.demonLord.skill, ultimate: kits.hornedOgre.skill, passive: own('Mountain Heart', 'Enrages, shielded, and cannot be knocked back', { ...wall, steady: true, regen: 0.01 }) },
    calBoss5: { skill: kits.demonLord.skill, ultimate: kits.hornedOgre.skill, passive: own('Blight', 'Enrages, shielded, poisons, and drinks what it deals', { ...wall, steady: true, ...poison }) },
    calBoss6: { skill: kits.demonLord.skill, ultimate: kits.minotaur.skill, passive: own('Calamity Unbound', 'Enrages, shielded, poisons, steady, quickens with every kill', { ...wall, steady: true, ...poison, leech: 0.2, regen: 0.01, frenzy: { per: 0.2, ms: 4000, max: 3 } }) },
  };
}
