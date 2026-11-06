// The Nemesis War's commissioned art (docs/notes/art-in.md): rank badges, the Council medallion, the duel crest and the taunt banners. Cut from
// art-source/expansion/ into small files in src/art/expansion/; bundled into game.js as data URLs, so offline needs nothing in FILES.
import lieutenant from './art/expansion/badge-lieutenant.png';
import captain from './art/expansion/badge-captain.png';
import warchief from './art/expansion/badge-warchief.png';
import council from './art/expansion/badge-council.png';
import duelCrest from './art/expansion/duel-crest.webp';
import tauntFoe from './art/expansion/taunt-foe.webp';
import tauntHero from './art/expansion/taunt-hero.webp';

export const RANK_BADGE: Readonly<Record<string, string>> = { lieutenant, captain, warchief };
export const COUNCIL_BADGE = council;
export const DUEL_CREST = duelCrest;
export const TAUNT_FOE = tauntFoe;
export const TAUNT_HERO = tauntHero;
