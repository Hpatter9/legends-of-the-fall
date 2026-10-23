// The look of a trait's badge: a fill and the ink of its two letters, each a step of the Stone and Iron ramps in
// `src/tokens.css` (named without the dashes: 'e5' is `--e5`). Origins are drawn round and classes as shields, and a trait's
// colour is its own among its kind. Pure data, so the tests can check the colours without a page.

import type { Trait } from './sim/traits';

export interface BadgeColour {
  fill: string;
  ink: string;
}

const c = (fill: string, ink: string): BadgeColour => ({ fill, ink });

export const TRAIT_COLOURS: Record<string, BadgeColour> = {
  // origins (round)
  samurai: c('r3', 's15'),
  mystic: c('p2', 's15'),
  yokai: c('p4', 's0'),
  knightly: c('b2', 's0'),
  holy: c('e9', 's0'),
  wild: c('g3', 's0'),
  arcane: c('b4', 's0'),
  frontier: c('e5', 's0'),
  undead: c('g1', 's15'),
  machine: c('s11', 's0'),
  royal: c('e2', 's15'),
  pirate: c('r6', 's0'),
  // classes (shields)
  guardian: c('b1', 's15'),
  blade: c('r5', 's0'),
  marksman: c('g4', 's0'),
  caster: c('p3', 's0'),
  warden: c('g2', 's0'),
  trickster: c('p5', 's0'),
  beast: c('e4', 's0'),
  gunner: c('s9', 's15'),
  assassin: c('r1', 's15'),
  support: c('g6', 's0'),
  vanguard: c('e1', 's15'),
  arcanist: c('b6', 's0'),
  bulwark: c('s13', 's0'),
};

/** The colour of a trait's badge (a plain slate one for a trait nobody has coloured yet). */
export const colourOf = (t: Pick<Trait, 'id'>): BadgeColour => TRAIT_COLOURS[t.id] ?? c('s9', 's15');
