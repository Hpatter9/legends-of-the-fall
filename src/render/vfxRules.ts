// The rules behind the fight's little effects, kept free of Pixi and the DOM so the tests can check them: which slash a
// name draws, and how many puffs the battery saver lets through.

/** The sheets a blow's slash can be (`vfxArt.ts`). */
export type SlashSheet = 'slashLight' | 'slashEarth' | 'slashWind' | 'darkSlash';

/** Which slash a fighter's blow draws, from its name: a club or hammer the heavy arc, a spear or staff the wind one,
 *  claws and daggers the dark one, and the swords the bright one. */
export function slashOf(name: string): SlashSheet {
  if (/ogre|brute|minotaur|warlord|demon lord|boar|werewolf|gorgon/i.test(name)) return 'slashEarth';
  if (/spear|peasant|monk|yamabushi|staff/i.test(name)) return 'slashWind';
  if (/kunoichi|karasu|kitsune|imp|demon|assassin/i.test(name)) return 'darkSlash';
  return 'slashLight';
}

/** How many puffs to ask for (a share of the usual) and the most that can be on screen at once: battery saver halves both. */
export function particleBudget(saver: boolean): { density: number; cap: number } {
  return saver ? { density: 0.5, cap: 110 } : { density: 1, cap: 200 };
}
