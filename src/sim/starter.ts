// The starter pick: a brand-new save (and one after Start over) offers three packs of three heroes and unlocks the pack
// taken. Each pack is a front-liner, a striker and a back-liner (a shooter, a caster or a support), so any pack can
// hold a line, hit hard and cover itself. The packs are drawn from a side stream of the save's seed, so they replay
// exactly and differ from one another (no hero is in two packs). Pure rules: no Pixi, no DOM.

import { mixSeed, Rng } from './rng';
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

export const STARTER_PACKS = 3;
export const PACK_SIZE = 3;
const SALT = 0x57a47;

/** A starter pick: the packs on offer and the one taken (null while the save waits for it). */
export interface Starter {
  packs: string[][];
  pick: number | null;
}

/** The hero kinds of a class, in the order the roster lists them. */
const ofClass = (c: StarterClass): string[] => ALL_HEROES.filter((k) => CLASS_OF[k] === c);

/** `items` shuffled by `rng` (a copy). */
function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The three packs a seed offers: pack i is a front-liner, a striker and a back-liner, and the nine heroes are all different. The back-liners are one shooter, one caster and one support, dealt out in a random order. */
export function starterPacks(seed: number): string[][] {
  const rng = new Rng(mixSeed(seed, SALT));
  const fronts = shuffled(rng, ofClass('front'));
  const strikers = shuffled(rng, ofClass('striker'));
  const backs = shuffled(rng, (['shooter', 'caster', 'support'] as const).map((c) => rng.pick(ofClass(c))));
  return Array.from({ length: STARTER_PACKS }, (_, i) => [fronts[i], strikers[i], backs[i]]);
}

/** A saved starter pick that is sane: three packs of three different known heroes, and a pick that is null or one of them. A pack that is not sane is drawn again from the seed. Undefined for a save from before the pick. */
export function readStarter(raw: unknown, seed: number): Starter | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Partial<Starter>;
  const sane = (p: unknown): p is string[] => Array.isArray(p) && p.length === PACK_SIZE && new Set(p).size === PACK_SIZE && p.every((k) => typeof k === 'string' && ALL_HEROES.includes(k));
  const packs = Array.isArray(r.packs) && r.packs.length === STARTER_PACKS && r.packs.every(sane) ? r.packs.map((p) => [...p]) : starterPacks(seed);
  const pick = typeof r.pick === 'number' && Number.isInteger(r.pick) && r.pick >= 0 && r.pick < STARTER_PACKS ? r.pick : null;
  return { packs, pick };
}
