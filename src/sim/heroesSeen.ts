// The heroes the player has seen revealed (SUMMON-TAROT): a hero's full figure is shown with a first-time reveal the first time it
// joins, whatever brought it (a summoning stone's shards, a lucky stone, a milestone earned in play). `Meta.heroesSeen` lists the
// ones already revealed; a hero owned and not in it still has its reveal due, so a reveal missed (the page shut mid-scene) plays
// the next time the game can show it. A save from before counts every hero it owns as seen, and a new save its starters.
// Pure rules: no Pixi, no DOM.

import { ALL_HEROES } from './units';

/** The part of the Meta these rules read and change. */
interface Seen {
  unlocked: string[];
  heroesSeen?: string[];
}

/** The saved list, made sane: hero kinds only, no repeats. A save from before has none: every hero it owns is seen. */
export function readHeroesSeen(raw: unknown, unlocked: readonly string[]): string[] {
  if (!Array.isArray(raw)) return [...unlocked];
  return [...new Set(raw.filter((k): k is string => typeof k === 'string' && ALL_HEROES.includes(k)))];
}

/** The heroes owned whose first reveal is still due, in the order they joined. */
export const unseenHeroes = (m: Seen): string[] => (m.heroesSeen ? m.unlocked.filter((k) => !m.heroesSeen!.includes(k)) : []);

/** Whether a hero has had its first reveal (a hero not owned has not; with no list, as in a save from before, every owned one has). */
export const heroSeen = (m: Seen, kind: string): boolean => m.unlocked.includes(kind) && !unseenHeroes(m).includes(kind);

/** Mark a hero's first reveal as played. */
export function markHeroSeen(m: Seen, kind: string): void {
  const seen = (m.heroesSeen ??= m.unlocked.filter((k) => k !== kind));
  if (!seen.includes(kind)) seen.push(kind);
}
