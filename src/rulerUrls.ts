import type { RulerId } from './rulerRules';
import sun from './art/rulers/sun_viper.png';
import frost from './art/rulers/frost_witch.png';
import ash from './art/rulers/ash_empress.png';
import rose from './art/rulers/rose_duchess.png';
import moon from './art/rulers/moon_oracle.png';
import stag from './art/rulers/iron_stag.png';
import corsair from './art/rulers/storm_corsair.png';
import necromancer from './art/rulers/gilded_necromancer.png';
import theKing from './art/rulers/the_king.png';

export const RULER_URLS: Record<RulerId, string> = { the_king: theKing, sun_viper: sun, frost_witch: frost, ash_empress: ash, rose_duchess: rose, moon_oracle: moon, iron_stag: stag, storm_corsair: corsair, gilded_necromancer: necromancer };
