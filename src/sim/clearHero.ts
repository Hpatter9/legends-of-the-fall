// A new player reaches five heroes sooner (FIRST-HOUR 3, the owner's call; `docs/notes/first-hour.md`): the first clear of the first army
// gives a fourth hero outright, and the first clear of the second army a fifth. A new save has the three of its starter pack and one of
// each hero on the field, so until then its line is three wide. Each gift is a whole hero the save does not own, given once a save and
// only while the save owns fewer than four (or five) heroes: a save that already has its five gets nothing, and none later.
// The hero is picked as a lucky summon picks one (any hero still to collect by shards, never one earned by a milestone), from a side
// stream of its own, so no pull and no chest rolls differently. Pure rules: no Pixi, no DOM.

import { ARMIES, armyIndex, type Army } from './armies';
import { PARTY_SIZE, type Meta } from './meta';
import { Rng } from './rng';
import { toCollect } from './unlock';

/** The side stream of the gift's pick: the save's seed, this salt and the army's place. */
export const CLEAR_HERO_SALT = 0xc1ea4;

/** Which armies' first clear gives a hero, by the army's place in `ARMIES`: the save must own fewer than `below` heroes. */
export const CLEAR_HEROES: Readonly<Record<number, { below: number }>> = { 0: { below: 4 }, 1: { below: 5 } };

/** Whether an army's first clear is one that can give a hero (the army card says so). */
export const givesClearHero = (a: Army): boolean => CLEAR_HEROES[armyIndex(a.id)] !== undefined;

/** Whether the army's card should promise the hero: the gift not yet settled, the army not yet cleared, and the save still short. */
export function clearHeroWaits(m: Meta, a: Army): boolean {
  const rule = CLEAR_HEROES[armyIndex(a.id)];
  if (!rule || m.clearHeroes?.includes(a.id)) return false;
  return (m.armies[a.id]?.clears ?? 0) === 0 && !(m.armies[a.id]?.first ?? 0) && m.unlocked.length < rule.below && toCollect(m).length > 0;
}

/**
 * Settle an army's first clear (call it once, as the clear is settled, with `first` true when no tier of the army had been cleared
 * before): the gift is marked settled for good, and the hero given when the save is still short. Returns the hero that joined, or
 * undefined. The hero joins the party too while the party has room.
 */
export function grantClearHero(m: Meta, a: Army, first: boolean): string | undefined {
  const at = armyIndex(a.id);
  const rule = CLEAR_HEROES[at];
  if (!rule || !first || m.clearHeroes?.includes(a.id)) return undefined;
  m.clearHeroes = [...(m.clearHeroes ?? []), a.id];
  if (m.unlocked.length >= rule.below) return undefined;
  const left = toCollect(m);
  if (!left.length) return undefined;
  const kind = Rng.from(m.seed, CLEAR_HERO_SALT, at).pick(left);
  m.unlocked.push(kind);
  // (its unlock shards, if any were held, are spent on joining, as a lucky summon's are)
  delete m.unlock?.[kind];
  if (!m.party.includes(kind) && m.party.length < PARTY_SIZE) m.party.push(kind);
  return kind;
}

/** The armies whose first clear gives a hero, for the note and the tools. */
export const clearHeroArmies = (): Army[] => ARMIES.filter(givesClearHero);
