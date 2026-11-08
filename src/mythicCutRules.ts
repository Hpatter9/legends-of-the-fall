// A Mythic's own ultimate cut-in (docs/notes/mythics-finish.md). The owner asked that the five legends "feel epic and look very impressive":
// an ordinary hero's ultimate opens with the shared slash (a band of its portrait and the ultimate's name across the screen, `ultMoment.ts`);
// a Mythic's opens with its own. Its whole painting stands in a gilded frame, its sigil (the painted prop of its showcase) turns behind it, the
// word "Mythic", its name and title and the ultimate's name are set beside it, and the whole comes in its own way, in its own colours:
//
//   Vael     the frame drops from above as the black sun swells and eclipses behind it (gold on black);
//   Astrax   it sweeps down out of the upper right on a fall of starlight (white on deep blue);
//   Ilyra    it rises from below while the halo settles over it (ivory and crimson);
//   Orrun    it grows up out of the ground, the world tree climbing behind it (emerald on loam);
//   Nyxara   it opens out of two mirrored halves while the clock of fate turns backwards (violet on night).
//
// The timings are the opening's own (`ULT_MOMENT.OPEN_MS`); nothing about when the fight is held changes. Reduced motion fades it in and out,
// held still. Pure data: no DOM, no Pixi, so the tests read it.

import type { ShowArt } from './render/showArt';
import { isMythic } from './sim/mythicRules';

export interface MythicCut {
  /** How the frame comes in (a CSS animation of its own, `fightHud.css`). */
  entry: 'drop' | 'sweep' | 'rise' | 'grow' | 'mirror';
  /** The sigil that turns behind the frame: the showcase's prop (`ultShow.ts`). */
  sigil: ShowArt;
  /** Which way the sigil turns: the clock of fate turns backwards. */
  spin: 1 | -1;
  /** The frame's gilding, the wash behind it, and the light the words glow with. */
  gild: string;
  wash: string;
  glow: string;
  /** The words beside the frame, in the game's voice. */
  motto: string;
}

export const MYTHIC_CUTS: Readonly<Record<string, MythicCut>> = {
  vael: { entry: 'drop', sigil: 'mythic-black-sun', spin: 1, gild: '#f3c86a', wash: '#0b0705', glow: '#ffd77a', motto: 'The sun does not rise today' },
  astrax: { entry: 'sweep', sigil: 'mythic-star-chart', spin: 1, gild: '#cfe2ff', wash: '#08133a', glow: '#9bc9ff', motto: 'The last star falls upwards' },
  ilyra: { entry: 'rise', sigil: 'mythic-saint-halo', spin: 1, gild: '#fff0d6', wash: '#3a0a10', glow: '#ff9a8a', motto: 'Not one of you is buried today' },
  orrun: { entry: 'grow', sigil: 'mythic-world-tree', spin: 1, gild: '#b8f0a0', wash: '#0b2210', glow: '#94d998', motto: 'The oldest roots hold' },
  nyxara: { entry: 'mirror', sigil: 'mythic-fate-clock', spin: -1, gild: '#d8c8ff', wash: '#140a30', glow: '#bda2ff', motto: 'That ending is not written' },
};

/** A Mythic's cut-in, or null for every other hero (it opens with the shared slash). */
export const mythicCut = (kind: string): MythicCut | null => (isMythic(kind) ? MYTHIC_CUTS[kind] ?? null : null);

/** The painting a Mythic's frame shows: its whole painting, not the portrait's crop; once awakened, its awakened painting (all are copied and
 *  kept for offline play). */
export const mythicPainting = (kind: string, awakened = 0): string => (awakened > 0 ? `heroes/awakened-${kind}.webp` : `heroes/${kind}.webp`);
