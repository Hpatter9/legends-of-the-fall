// Who tells the player that something has been unlocked (UNLOCK-ONCE, the owner: "it said 'unlocked' twice. Remove the old ones in
// favour of the new ones we made"; docs/notes/unlock-once.md). Every kind of unlock is told by exactly one announcer. Where a film
// reveals the thing (`Scene.reveal`), that announcer is the film's end card (`sceneReveal.ts`, drawn by `revealCard.ts`), and the card
// comes up even when the film does not play (cinematics off, or the film already seen), so the older banners, toasts and lines that
// told the same thing are gone. The rest keep the one announcer they had. The page asks `tellsByCard` before telling anything, and
// the test (`test/unlock-tell.test.ts`) holds the table to the films. Pure: no Pixi, no DOM.

import type { Meta } from './meta';
import type { Reveal } from './sceneKit';
import { ascUnlocked } from './ascension';

/** The kinds of thing a player can unlock. */
export type UnlockKind =
  | 'army' // the next army, opened by an army's clear and the stars
  | 'calamity' // the Calamity, opened by the stars
  | 'ascension' // the next Ascension level, opened by clearing the Calamity at the highest level open
  | 'building' // a castle building raised for the first time
  | 'spellbook' // the Chapel consecrated: the Spells tab
  | 'awaken' // a hero's first awakening
  | 'fullAwaken' // a hero's second (last) awakening
  | 'eidolon' // an Eidolon bound at the end of its chain
  | 'horn' // the War Horn, handed over at the first binding
  | 'hero' // a hero joining (by shards, or earned by a milestone)
  | 'spell' // a spell learnt (a milestone, the Mage Tower)
  | 'helper' // a deploy helper earned (Auto merge, Auto place)
  | 'skill' // a hero's second skill, at its level
  | 'ultimate'; // a hero's ultimate, at its level

/** The one way each is told:
 *  - `card`: the film's end card ("Unlocked", "Built", "Awakened", "Received"), shown after the film or alone when it does not play;
 *  - `binding`: the binding ceremony's own seal, "Bound" (`eidolonBinding.ts`);
 *  - `heroReveal`: the hero's first-time reveal ("Joins your company": `earnedArrival.ts`, `summonTarot.ts`);
 *  - `burst`: the burst on the hero's picture ("Fully awakened", `awakenView.ts`);
 *  - `toast`: a toast line (`achievementsView.ts`);
 *  - `recap`: a line on the fight's results ("New skill", "Ultimate unlocked", `jrpgRecap.ts`). */
export type Announcer = 'card' | 'binding' | 'heroReveal' | 'burst' | 'toast' | 'recap';

export const UNLOCK_TELLS: Readonly<Record<UnlockKind, Announcer>> = {
  army: 'card',
  calamity: 'card',
  ascension: 'card',
  building: 'card',
  spellbook: 'card',
  awaken: 'card',
  horn: 'card',
  fullAwaken: 'burst',
  eidolon: 'binding',
  hero: 'heroReveal',
  spell: 'toast',
  helper: 'toast',
  skill: 'recap',
  ultimate: 'recap',
};

export const UNLOCK_KINDS = Object.keys(UNLOCK_TELLS) as UnlockKind[];

/** The kind of unlock a film's reveal tells. */
export function unlockOfReveal(r: Reveal): UnlockKind {
  switch (r.kind) {
    case 'mode':
      return 'calamity';
    case 'nextArmy':
      return 'army';
    case 'ascension':
      return 'ascension';
    case 'building':
      return r.site === 'chapel' ? 'spellbook' : 'building';
    case 'awaken':
      return 'awaken';
    case 'eidolon':
      return 'eidolon';
    case 'horn':
      return 'horn';
  }
}

/** Whether the end card tells this unlock (and nothing else does). */
export const tellsByCard = (k: UnlockKind): boolean => UNLOCK_TELLS[k] === 'card';

/** Whether a Calamity cleared at `level` has just opened the next Ascension level (it was the highest open, and not the last). */
export const ascOpenedBy = (level: number, m: Pick<Meta, 'calamity'>): boolean => ascUnlocked(m) === level + 1;
