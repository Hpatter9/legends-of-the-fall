// Approved dynasty paintings, bundled into offline-cached game.js.
import type { SeasonName } from './sim/dynasty';
import spring from './art/dynasty/spring.png';
import summer from './art/dynasty/summer.png';
import autumn from './art/dynasty/autumn.png';
import winter from './art/dynasty/winter.png';
import mentor from './art/dynasty/mentor.png';
import regular from './art/dynasty/regular.png';
import shade from './art/dynasty/shade.png';
import fallen from './art/dynasty/fallen.png';
import legend from './art/dynasty/legend.png';
import house from './art/dynasty/house.webp';
import heirloom from './art/dynasty/heirloom.webp';

export const SEASON_ICON: Readonly<Record<SeasonName, string>> = { spring, summer, autumn, winter };
export const FATE_ICON: Readonly<Record<string, string>> = { mentor, regular, shade, fallen };
// Reserved source symbol: the current bearer model has no separate Legend fate.
export const LEGEND_ICON = legend;
export const HOUSE_ICON = house;
// (the keepsake painting; the Houses' heirloom chip wears the signet ring, `HEIRLOOM_CHIP` in expansionArt.ts)
export const HEIRLOOM_ICON = heirloom;
