// NEMESIS-DEPTH, idea 3: the temperaments' icons. Stand-ins from the Council's and the traits' own symbols until the eight painted icons
// land (their prompt: docs/notes/nemesis-depth-art-prompts.md); bundled for offline play, as the rest of the Council's art is.
import type { Temper } from './sim/nemesisTemper';
import feud from './art/council/feud.png';
import betrayal from './art/council/betrayal.png';
import duel from './art/council/duel.png';
import fled from './art/council/fled.png';
import oath from './art/council/oath.png';
import fearless from './art/nemesis-traits/fearless.png';
import elusive from './art/nemesis-traits/elusive.png';
import scarred from './art/dynasty/trait-scarred.png';

export const TEMPER_ICON: Readonly<Record<Temper, string>> = {
  brute: feud,
  schemer: betrayal,
  glory: duel,
  coward: fled,
  zealot: fearless,
  oathbound: oath,
  trickster: elusive,
  veteran: scarred,
};
