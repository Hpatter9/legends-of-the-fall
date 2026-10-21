// The ground art of each area, as data URLs (the backdrops are files; see backdrop.ts). The highlands are today's
// ground (`src/art/ground`); the others are cut and recoloured from the packs by `tools/areas-prep.py`.

import type { Area } from '../sim/board';
import grass1 from '../art/ground/grass1.png';
import grass2 from '../art/ground/grass2.png';
import stone from '../art/ground/stone.png';
import rock from '../art/ground/rock.png';
import boulder1 from '../art/ground/boulder1.png';
import boulder2 from '../art/ground/boulder2.png';
import bush1 from '../art/ground/bush1.png';
import bush2 from '../art/ground/bush2.png';
import hTall1 from '../art/areas/highlands_tall1.png';
import hTall2 from '../art/areas/highlands_tall2.png';
import water from '../art/areas/common/water.png';
import ice from '../art/areas/common/ice.png';
import lava from '../art/areas/common/lava.png';
import forest_top1 from '../art/areas/forest/top1.png';
import forest_top2 from '../art/areas/forest/top2.png';
import forest_high from '../art/areas/forest/high.png';
import forest_side from '../art/areas/forest/side.png';
import forest_boulder1 from '../art/areas/forest/boulder1.png';
import forest_boulder2 from '../art/areas/forest/boulder2.png';
import forest_tall1 from '../art/areas/forest/tall1.png';
import forest_tall2 from '../art/areas/forest/tall2.png';
import snow_top1 from '../art/areas/snow/top1.png';
import snow_top2 from '../art/areas/snow/top2.png';
import snow_high from '../art/areas/snow/high.png';
import snow_side from '../art/areas/snow/side.png';
import snow_boulder1 from '../art/areas/snow/boulder1.png';
import snow_boulder2 from '../art/areas/snow/boulder2.png';
import snow_tall1 from '../art/areas/snow/tall1.png';
import snow_tall2 from '../art/areas/snow/tall2.png';
import desert_top1 from '../art/areas/desert/top1.png';
import desert_top2 from '../art/areas/desert/top2.png';
import desert_high from '../art/areas/desert/high.png';
import desert_side from '../art/areas/desert/side.png';
import desert_boulder1 from '../art/areas/desert/boulder1.png';
import desert_boulder2 from '../art/areas/desert/boulder2.png';
import desert_tall1 from '../art/areas/desert/tall1.png';
import desert_tall2 from '../art/areas/desert/tall2.png';
import volcano_top1 from '../art/areas/volcano/top1.png';
import volcano_top2 from '../art/areas/volcano/top2.png';
import volcano_high from '../art/areas/volcano/high.png';
import volcano_side from '../art/areas/volcano/side.png';
import volcano_boulder1 from '../art/areas/volcano/boulder1.png';
import volcano_boulder2 from '../art/areas/volcano/boulder2.png';
import volcano_tall1 from '../art/areas/volcano/tall1.png';
import volcano_tall2 from '../art/areas/volcano/tall2.png';
import dungeon_top1 from '../art/areas/dungeon/top1.png';
import dungeon_top2 from '../art/areas/dungeon/top2.png';
import dungeon_high from '../art/areas/dungeon/high.png';
import dungeon_side from '../art/areas/dungeon/side.png';
import dungeon_boulder1 from '../art/areas/dungeon/boulder1.png';
import dungeon_boulder2 from '../art/areas/dungeon/boulder2.png';
import dungeon_tall1 from '../art/areas/dungeon/tall1.png';
import dungeon_tall2 from '../art/areas/dungeon/tall2.png';

export interface AreaUrls {
  /** Two grass-like tops, the stony top for the high ground, and the column side strip. */
  tops: string[];
  high: string;
  side: string;
  boulders: string[];
  /** Tall growth (tufts, or for the dungeon mushrooms). */
  tall: string[];
  /** The scale the tall sprites are drawn at, and how many stand on a tile. */
  tallScale: number;
  tallCount: number;
}

export const AREA_URLS: Record<Area, AreaUrls> = {
  highlands: { tops: [grass1, grass2], high: stone, side: rock, boulders: [boulder1, boulder2], tall: [hTall1, hTall2], tallScale: 3, tallCount: 6 },
  forest: { tops: [forest_top1, forest_top2], high: forest_high, side: forest_side, boulders: [forest_boulder1, forest_boulder2], tall: [forest_tall1, forest_tall2], tallScale: 3, tallCount: 6 },
  snow: { tops: [snow_top1, snow_top2], high: snow_high, side: snow_side, boulders: [snow_boulder1, snow_boulder2], tall: [snow_tall1, snow_tall2], tallScale: 3, tallCount: 6 },
  desert: { tops: [desert_top1, desert_top2], high: desert_high, side: desert_side, boulders: [desert_boulder1, desert_boulder2], tall: [desert_tall1, desert_tall2], tallScale: 3, tallCount: 6 },
  volcano: { tops: [volcano_top1, volcano_top2], high: volcano_high, side: volcano_side, boulders: [volcano_boulder1, volcano_boulder2], tall: [volcano_tall1, volcano_tall2], tallScale: 3, tallCount: 6 },
  dungeon: { tops: [dungeon_top1, dungeon_top2], high: dungeon_high, side: dungeon_side, boulders: [dungeon_boulder1, dungeon_boulder2], tall: [dungeon_tall1, dungeon_tall2], tallScale: 0.5, tallCount: 2 },
};

/** What can lie on any area's ground. */
export const GROUND_URLS = { water, ice, lava };

/** The highlands' bushes (for looks only). */
export const BUSH_URLS = [bush1, bush2];
