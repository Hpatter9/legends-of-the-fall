// The Nemesis War's commissioned art (docs/notes/art-in.md): rank badges, the Council medallion, the duel crest and the taunt banners; and
// (docs/notes/art-wire-5.md) the scarred portrait frames. Cut from
// art-source/expansion/ into small files in src/art/expansion/; bundled into game.js as data URLs, so offline needs nothing in FILES.
import lieutenant from './art/expansion/badge-lieutenant.png';
import captain from './art/expansion/badge-captain.png';
import warchief from './art/expansion/badge-warchief.png';
import council from './art/expansion/badge-council.png';
import duelCrest from './art/expansion/duel-crest.webp';
import tauntFoe from './art/expansion/taunt-foe.webp';
import tauntHero from './art/expansion/taunt-hero.webp';
import scar1 from './art/expansion/scar-1.png';
import scar2 from './art/expansion/scar-2.png';
import scar3 from './art/expansion/scar-3.png';

export const RANK_BADGE: Readonly<Record<string, string>> = { lieutenant, captain, warchief };
export const COUNCIL_BADGE = council;
export const DUEL_CREST = duelCrest;
export const TAUNT_FOE = tauntFoe;
export const TAUNT_HERO = tauntHero;
/** A nemesis's face frame by its scars, one to three (more show the third). */
export const SCAR_FRAME: readonly string[] = [scar1, scar2, scar3];
