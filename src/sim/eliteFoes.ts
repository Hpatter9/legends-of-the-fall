// The named elites' own fighters: each is a foe of an existing look (the same sheet and stats as a common foe) under its own id,
// so its kit (`eliteKits`, read by `abilities.ts`) and its place in `elites.ts` can be its own. Elites are not bosses: they are
// not in `BOSS_IDS`, and the meta's list of bosses beaten never sees them. Pure data: no Pixi, no DOM.

import { FOES } from './foes';
import type { Kit, Passive } from './abilities';
import type { UnitDef } from './units';

/** An elite's fighter: a common foe's stats and sheet, a name and a line for its role. */
const from = (id: string, base: UnitDef, name: string, role: string, tweak: Partial<UnitDef> = {}): UnitDef => ({ ...base, ...tweak, id, name, role });

const SKELETON: UnitDef = { id: 'skeleton', name: 'Skeleton', side: 'foe', sheet: 'skeleton_warrior', scale: 0.79, hp: 320, atk: 26, def: 7, range: 1, moveMs: 650, atkMs: 1100, jump: 2, role: 'Sword and shield' };

export const ELITE_FOES: Record<string, UnitDef> = {
  eliteGorrak: from('eliteGorrak', FOES.orcBrute, 'Gorrak', 'Enrages as he falls'),
  eliteYsolde: from('eliteYsolde', FOES.wolfWhite, 'Ysolde', 'Quickens with every kill'),
  eliteHollow: from('eliteHollow', SKELETON, 'The Hollow Knight', 'Raises a shield wall', { scale: 0.9 }),
  eliteSethra: from('eliteSethra', FOES.gorgon2, 'Sethra', 'Turns the strongest hero to stone'),
  eliteBrakka: from('eliteBrakka', FOES.minotaur1, 'Brakka', 'Charges down a line'),
  eliteCindra: from('eliteCindra', FOES.demon, 'Cindra', 'Hellfire and burning blows'),
  eliteVexor: from('eliteVexor', FOES.demon, 'Vexor', 'Calls imps to his side', { scale: 0.42 }),
  eliteThrum: from('eliteThrum', FOES.ogre, 'Thrum', 'Shoves heroes back'),
  eliteNyssa: from('eliteNyssa', FOES.yokaiWitch, 'Nyssa', 'Poisons the toughest heroes'),
  eliteWarden: from('eliteWarden', FOES.ironGolem, 'The Iron Warden', 'Plated, slams the line'),
  eliteKuro: from('eliteKuro', FOES.yokaiCrow, 'Kuro', 'Dives on shooters'),
  eliteSilenus: from('eliteSilenus', FOES.satyr3, 'Silenus', 'Pipes the pack faster'),
};

/** The elites' kits, built from the others' skills: the table `KITS` is passed in (this file cannot import it). */
export function eliteKits(kits: Record<string, Kit>): Record<string, Kit> {
  const own = (name: string, text: string, rest: Partial<Passive>): Passive => ({ name, text, ...rest });
  return {
    eliteGorrak: { skill: kits.orcWarlord.skill, passive: own('Bonebreaker Rage', 'His attack grows by up to 80% as his health falls', { rage: 0.8 }) },
    eliteYsolde: kits.werewolf,
    eliteHollow: { skill: kits.knight.skill, passive: own('Hollow Plate', 'Blows from the front lose a quarter', { block: 0.25 }) },
    eliteSethra: kits.gorgon,
    eliteBrakka: kits.minotaur,
    eliteCindra: { skill: kits.devilLeader.skill, passive: kits.devilLeader.passive },
    eliteVexor: kits.demonLord,
    eliteThrum: kits.hornedOgre,
    eliteNyssa: { skill: kits.warlock.skill, passive: own('Venom', 'Her blows poison the hero, and she drinks a fifth of what they deal', { ignite: { kind: 'curse', dmg: 3, every: 500, ms: 2500 }, leech: 0.2 }) },
    eliteWarden: { skill: kits.orcWarlord.skill, passive: kits.ironGolem.passive },
    eliteKuro: kits.karasu,
    eliteSilenus: kits.satyr,
  };
}
