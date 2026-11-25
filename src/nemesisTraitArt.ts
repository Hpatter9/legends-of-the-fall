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
import baneMartial from './art/nemesis-traits/bane-martial.png';
import baneArcane from './art/nemesis-traits/bane-arcane.png';
import baneDevout from './art/nemesis-traits/bane-devout.png';
import baneWild from './art/nemesis-traits/bane-wild.png';

export const NEMESIS_TRAIT_ICON: Readonly<Record<string, string>> = { ironSkull, arrowCatcher, scarred, sureFooted, spellScorned, hornDeaf, survivor, healerHunter, executioner, ambusher, hillKing, loneWolf,
  fireproof, rime, venom, thick, grounded, fearless, elusive,
  'bane:martial': baneMartial, 'bane:arcane': baneArcane, 'bane:devout': baneDevout, 'bane:wild': baneWild,
};

// PIXELLAB-ART: a weakness's symbol beside its words on the card, and the hunted quarry's badge on its seat (tools/pixellab/icons.json)
import weakDread from './art/nemesis-traits/weak-dread.png';
import weakFire from './art/nemesis-traits/weak-fire.png';
import weakFrost from './art/nemesis-traits/weak-frost.png';
import weakStorm from './art/nemesis-traits/weak-storm.png';
import weakVenom from './art/nemesis-traits/weak-venom.png';
import weakHeights from './art/nemesis-traits/weak-heights.png';
import weakGlutton from './art/nemesis-traits/weak-glutton.png';
import weakCraven from './art/nemesis-traits/weak-craven.png';
import weakVain from './art/nemesis-traits/weak-vain.png';
import hunted from './art/nemesis-traits/hunted.png';

const WEAK_ICON: Readonly<Record<string, string>> = { 'fears:fire': weakFire, 'fears:frost': weakFrost, 'fears:storm': weakStorm, 'fears:venom': weakVenom, hatesHeights: weakHeights, glutton: weakGlutton, craven: weakCraven, vain: weakVain };
/** A weakness's symbol: a dread of a hero (`dread:<kind>`) is one skull whoever the hero. */
export const weakIcon = (w: string): string | undefined => (w.startsWith('dread:') ? weakDread : WEAK_ICON[w]);
export const HUNTED_ICON = hunted;
