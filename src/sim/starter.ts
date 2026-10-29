// The starter pick: a brand-new save (and one after Start over) offers two packs of three heroes and unlocks the pack
// taken. The packs are fixed, the same for every save (the owner's ask: "two starter packs that are always the same and
// are simple characters"): plain classic heroes a new player reads at a glance. Each is a front-liner, a striker and a
// back-liner, so either pack can hold a line, hit hard and cover itself. Pure rules: no Pixi, no DOM.

import { ALL_HEROES } from './units';
export type StarterClass = 'front' | 'striker' | 'shooter' | 'caster' | 'support';

/** What each hero is for, as the starter pick tells it. Every hero is in exactly one class. */
export const CLASS_OF: Readonly<Record<string, StarterClass>> = {
  knight: 'front', paladin: 'front', juggernaut: 'front', minotaur: 'front', shambler: 'front', mummy: 'front', kraken: 'front', dreadPirate: 'front', yamabushi: 'front', peasant: 'front',
  samurai: 'striker', kunoichi: 'striker', ninjaMonk: 'striker', kitsune: 'striker', karasu: 'striker', werewolf: 'striker', barbarian: 'striker', mercenary: 'striker', buccaneer: 'striker', lancer: 'striker',
  reaper: 'striker', arcBlade: 'striker', dragoon: 'striker', demonSwordsman: 'striker', illusionist: 'striker', beastmaster: 'striker', tyrant: 'striker', samuraiCommander: 'striker',
  archer: 'shooter', ranger: 'shooter', gunslinger: 'shooter', rifleBot: 'shooter', siegeBot: 'shooter', gorgon: 'shooter',
  wizard: 'caster', lightningMage: 'caster', warlock: 'caster', druid: 'caster', timeWitch: 'caster', sage: 'caster',
  cleric: 'support', priestess: 'support', wolfBard: 'support', wanderer: 'support', satyr: 'support',
};

export const CLASS_NAMES: Readonly<Record<StarterClass, string>> = { front: 'Front-liner', striker: 'Striker', shooter: 'Shooter', caster: 'Caster', support: 'Support' };

/** A starter pack: its name, a line and chips for the pick screen, and its three heroes (front-liner, striker, back-liner). */
export interface StarterPack {
  id: string;
  name: string;
  line: string;
  /** Three short words for the pack's chips on the pick screen, one for each hero's weapon. */
  chips: readonly [string, string, string];
  heroes: readonly [string, string, string];
}

/** The two packs every new save is offered, in the order the pick screen shows them. */
export const FIXED_PACKS: readonly StarterPack[] = [
  { id: 'swordShield', name: 'Sword and Shield', line: 'Steel up front, a bow behind: hold the line and shoot past it.', chips: ['Shield', 'Sword', 'Bow'], heroes: ['knight', 'samurai', 'archer'] },
  { id: 'bladeSpell', name: 'Blade and Spell', line: 'Pikes to hold them, a quick blade to cut them, fire to finish them.', chips: ['Pike', 'Blade', 'Spell'], heroes: ['peasant', 'kunoichi', 'wizard'] },
];

export const STARTER_PACKS = FIXED_PACKS.length;
export const PACK_SIZE = 3;

/** A starter pick: the packs on offer and the one taken (null while the save waits for it). */
export interface Starter {
  packs: string[][];
  pick: number | null;
}

/** The packs a new save is offered (fresh copies of the fixed packs' heroes). */
export const starterPacks = (): string[][] => FIXED_PACKS.map((p) => [...p.heroes]);

/** The fixed pack whose heroes are exactly these (a save's pack, in any order), if any: what names a pack on the page. */
export const packNamed = (heroes: readonly string[]): StarterPack | undefined =>
  FIXED_PACKS.find((p) => p.heroes.length === heroes.length && p.heroes.every((k) => heroes.includes(k)));

/** A saved starter pick made safe on load. Undefined for a save from before the pick (it keeps the old five).
 *  - A save still waiting for its pick (pick null or not a number) is offered the fixed packs, whatever it was offered before
 *    (the old seeded draw offered three).
 *  - A save that has picked keeps its record as saved, three old packs and all, when the record is sane; when it is damaged its pick
 *    still counts as made (it is moved onto the fixed packs, the pick kept in range), so a load never asks again for a pick and never
 *    swaps the heroes it has for a pack. */
export function readStarter(raw: unknown): Starter | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<Starter>;
  const made = typeof r.pick === 'number' && Number.isInteger(r.pick) && r.pick >= 0;
  if (!made) return { packs: starterPacks(), pick: null };
  const sane = (p: unknown): p is string[] => Array.isArray(p) && p.length === PACK_SIZE && new Set(p).size === PACK_SIZE && p.every((k) => typeof k === 'string' && ALL_HEROES.includes(k));
  const pick = r.pick as number;
  if (Array.isArray(r.packs) && r.packs.length > pick && r.packs.every(sane)) return { packs: r.packs.map((p) => [...p]), pick };
  return { packs: starterPacks(), pick: Math.min(pick, STARTER_PACKS - 1) };
}
