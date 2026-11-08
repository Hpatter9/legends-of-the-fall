// All modelled Nemesis traits have their own symbol; callers must check whether the trait is learned.
import ironSkull from './art/dynasty/trait-ironSkull.png';
import arrowCatcher from './art/dynasty/trait-arrowCatcher.png';
import scarred from './art/dynasty/trait-scarred.png';
import sureFooted from './art/dynasty/trait-sureFooted.png';
import spellScorned from './art/dynasty/trait-spellScorned.png';
import hornDeaf from './art/dynasty/trait-hornDeaf.png';
import survivor from './art/dynasty/trait-survivor.png';
import healerHunter from './art/dynasty/trait-healerHunter.png';
import executioner from './art/dynasty/trait-executioner.png';
import ambusher from './art/dynasty/trait-ambusher.png';
import hillKing from './art/dynasty/trait-hillKing.png';
import loneWolf from './art/dynasty/trait-loneWolf.png';

import fireproof from './art/nemesis-traits/fireproof.png';
import rime from './art/nemesis-traits/rime.png';
import venom from './art/nemesis-traits/venom.png';
import thick from './art/nemesis-traits/thick.png';
import grounded from './art/nemesis-traits/grounded.png';
import fearless from './art/nemesis-traits/fearless.png';
import elusive from './art/nemesis-traits/elusive.png';
import legendSlayer from './art/nemesis-traits/legendSlayer.png';
import baneMartial from './art/nemesis-traits/bane-martial.png';
import baneArcane from './art/nemesis-traits/bane-arcane.png';
import baneDevout from './art/nemesis-traits/bane-devout.png';
import baneWild from './art/nemesis-traits/bane-wild.png';

export const NEMESIS_TRAIT_ICON: Readonly<Record<string, string>> = { ironSkull, arrowCatcher, scarred, sureFooted, spellScorned, hornDeaf, survivor, healerHunter, executioner, ambusher, hillKing, loneWolf,
  fireproof, rime, venom, thick, grounded, fearless, elusive, legendSlayer,
  'bane:martial': baneMartial, 'bane:arcane': baneArcane, 'bane:devout': baneDevout, 'bane:wild': baneWild,
};
