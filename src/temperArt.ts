// NEMESIS-DEPTH, idea 3: the temperaments' icons; bundled for offline play, as the rest of the Council's art is.
// PIXELLAB-ART: the eight painted at last (tools/pixellab/icons.json, temper_*), in place of the borrowed Council and trait symbols.
import type { Temper } from './sim/nemesisTemper';
import brute from './art/nemesis-traits/temper-brute.png';
import schemer from './art/nemesis-traits/temper-schemer.png';
import glory from './art/nemesis-traits/temper-glory.png';
import coward from './art/nemesis-traits/temper-coward.png';
import zealot from './art/nemesis-traits/temper-zealot.png';
import oathbound from './art/nemesis-traits/temper-oathbound.png';
import trickster from './art/nemesis-traits/temper-trickster.png';
import veteran from './art/nemesis-traits/temper-veteran.png';

export const TEMPER_ICON: Readonly<Record<Temper, string>> = { brute, schemer, glory, coward, zealot, oathbound, trickster, veteran };
