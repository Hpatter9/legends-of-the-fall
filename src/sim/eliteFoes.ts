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
  eliteYsolde: from('eliteYsolde', FOES.wolfWhite, 'Ysolde', 'Quickens with every kill, hunts shooters'),
  eliteHollow: from('eliteHollow', SKELETON, 'The Hollow Knight', 'Raises a shield wall, guards', { scale: 0.9 }),
  eliteSethra: from('eliteSethra', FOES.gorgon2, 'Sethra', 'Turns the strongest hero to stone'),
  eliteBrakka: from('eliteBrakka', FOES.minotaur1, 'Brakka', 'Charges, and will not be shoved'),
  eliteCindra: from('eliteCindra', FOES.demon, 'Cindra', 'Hellfire and burning blows'),
  eliteVexor: from('eliteVexor', FOES.demon, 'Vexor', 'Calls imps to his side', { scale: 0.42 }),
  eliteThrum: from('eliteThrum', FOES.ogre, 'Thrum', 'Shoves heroes back'),
  eliteNyssa: from('eliteNyssa', FOES.yokaiWitch, 'Nyssa', 'Poisons the toughest heroes'),
  eliteWarden: from('eliteWarden', FOES.ironGolem, 'The Iron Warden', 'Plated, slams the line'),
  eliteKuro: from('eliteKuro', FOES.yokaiCrow, 'Kuro', 'Dives on shooters, flanks'),
  eliteSilenus: from('eliteSilenus', FOES.satyr3, 'Silenus', 'Pipes the pack faster'),
};

/** The elites' kits, built from the others' skills: the table `KITS` is passed in (this file cannot import it). */
export function eliteKits(kits: Record<string, Kit>): Record<string, Kit> {
  const own = (name: string, text: string, rest: Partial<Passive>): Passive => ({ name, text, ...rest });
  // (FOE-STYLES: each elite its own kit, none the same as a foe's or a boss's, `docs/notes/foe-styles.md`)
  const moved = (p: Passive, text: string, rest: Partial<Passive>): Passive => ({ ...p, text, ...rest });
  return {
    eliteGorrak: { skill: kits.orcWarlord.skill, passive: own('Bonebreaker Rage', 'His attack grows by up to 80% as his health falls', { rage: 0.8 }) },
    eliteYsolde: { ...kits.werewolf, passive: moved(kits.werewolf.passive, 'Each kill quickens her blows by a fifth for 4s (up to three); she makes for the shooters first', { move: 'hunt' }) },
    eliteHollow: { skill: kits.knight.skill, passive: own('Hollow Plate', 'Blows from the front lose a quarter; he keeps by his friends and strikes whoever strikes them', { block: 0.25, move: 'guard' }) },
    eliteSethra: { ...kits.gorgon, passive: moved(kits.gorgon.passive, 'Takes a fifth less from shots, and backs off from a blade', { move: 'kite' }) },
    eliteBrakka: { ...kits.minotaur, passive: moved(kits.minotaur.passive, 'Blows deal 15% more to a foe under half health; he cannot be knocked back, and three steps in a row end in a blow half as hard again', { steady: true, move: 'charge' }) },
    eliteCindra: { skill: kits.devilLeader.skill, passive: own('Hellborn Fury', 'Her blows set the hero alight, and her attack grows by up to 40% as her health falls', { ignite: kits.devilLeader.passive.ignite, rage: 0.4 }) },
    eliteVexor: { skill: kits.demonLord.skill, passive: moved(kits.demonLord.passive, 'Heals 1% of his health each second, and keeps by his imps', { move: 'guard' }) },
    eliteThrum: { skill: kits.hornedOgre.skill, passive: own('Avalanche', 'Blows from the front lose a fifth and he cannot be knocked back; three steps in a row end in a blow half as hard again', { block: 0.2, steady: true, move: 'charge' }) },
    eliteNyssa: { skill: kits.warlock.skill, passive: own('Venom', 'Her blows poison the hero, she drinks a fifth of what they deal, and she backs off from a blade', { ignite: { kind: 'curse', dmg: 3, every: 500, ms: 2500 }, leech: 0.2, move: 'kite' }) },
    eliteWarden: { skill: kits.orcWarlord.skill, passive: kits.ironGolem.passive },
    eliteKuro: { ...kits.karasu, passive: moved(kits.karasu.passive, 'Blows deal 50% more to shooters, and he goes round to a hero\'s side', { move: 'flank' }) },
    eliteSilenus: { skill: kits.satyr.skill, passive: own('Wineskin', 'Heals 2% of his health each second, and keeps by his friends', { regen: 0.02, move: 'guard' }) },
  };
}
