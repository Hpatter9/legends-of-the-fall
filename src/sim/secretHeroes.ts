// Secret heroes (SECRET-HEROES, the owner's ask: "Let's keep the heroes that are gained from specific unlock scenarios a secret"). The ten
// heroes earned in play (`contentHeroes.ts`: seven by a milestone, three at the end of a hero quest, `questData/tales.ts`) are hidden until
// they join: every list shows a dark figure, "???" and at most a vague hint, never the hero's name, title, class, art or kit. Once a hero
// joins it is an ordinary hero, and its first reveal plays as before.
//
// This file is the one place that says what is secret to a save, and the words a screen shows in place of a secret hero; the screens
// ask it, so none of them can leak a name by forgetting. Pure rules: no Pixi, no DOM.

import type { Meta } from './meta';
import { CONTENT_KINDS, isContent } from './unlockRules';
import { UNITS } from './units';

/** The heroes who join at the end of a hero quest (the tavern's tales), not on a milestone. */
export const TALE_HEROES: readonly string[] = ['werewolf', 'dreadPirate', 'juggernaut'];

/** What a screen shows in a secret hero's name's place. */
export const SECRET_NAME = '???';

/** Whether a hero kind is ever secret (one earned in play). */
export const isSecretKind = (kind: string): boolean => isContent(kind);

/** Whether a hero is secret to this save: earned in play, and not joined yet. */
export const isSecret = (m: Pick<Meta, 'unlocked'>, kind: string): boolean => isContent(kind) && !m.unlocked.includes(kind);

/** The heroes secret to this save, in the roster's order of the earned ones. */
export const secretsOf = (m: Pick<Meta, 'unlocked'>): string[] => CONTENT_KINDS.filter((k) => isSecret(m, k));

/** The vague hint a secret hero's row may give: a deed of note for a milestone, a tale for a hero quest. Never which deed, or which tale. */
export const secretHint = (kind: string): string => (TALE_HEROES.includes(kind) ? 'A hero waits for a tale to be told in the tavern' : 'A hero waits for a deed of note');

/** A hero's name as a screen may show it to this save: its own (given by `name`), or "???" while it is secret. */
export const shownName = (m: Pick<Meta, 'unlocked'>, kind: string, name: string): string => (isSecret(m, kind) ? SECRET_NAME : name);

/** The codex's line for a five-hero combo not seen yet: a hint at one of its five, the first who is no secret to this save. */
export function comboHint(m: Pick<Meta, 'unlocked'>, heroes: readonly string[]): string {
  const known = heroes.find((k) => !isSecret(m, k));
  return known ? `Five heroes who belong together, one of them the ${UNITS[known].name}. Fight with all five to see what they do.` : 'Five heroes who belong together. Fight with all five to see what they do.';
}
