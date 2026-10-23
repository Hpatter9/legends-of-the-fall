// The ground art of each area, as data URLs (the backdrops are files; see backdrop.ts). The highlands are today's
// ground (`src/art/ground`); the others are cut and recoloured from the packs by `tools/areas-prep.py` (the first six) and
// `tools/lands-prep.py` (the other eleven).

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

import plains_top1 from '../art/areas/plains/top1.png';
import plains_top2 from '../art/areas/plains/top2.png';
import plains_high from '../art/areas/plains/high.png';
import plains_side from '../art/areas/plains/side.png';
import plains_boulder1 from '../art/areas/plains/boulder1.png';
import plains_boulder2 from '../art/areas/plains/boulder2.png';
import plains_tall1 from '../art/areas/plains/tall1.png';
import plains_tall2 from '../art/areas/plains/tall2.png';
import autumn_top1 from '../art/areas/autumn/top1.png';
import autumn_top2 from '../art/areas/autumn/top2.png';
import autumn_high from '../art/areas/autumn/high.png';
import autumn_side from '../art/areas/autumn/side.png';
import autumn_boulder1 from '../art/areas/autumn/boulder1.png';
import autumn_boulder2 from '../art/areas/autumn/boulder2.png';
import autumn_tall1 from '../art/areas/autumn/tall1.png';
import autumn_tall2 from '../art/areas/autumn/tall2.png';
import swamp_top1 from '../art/areas/swamp/top1.png';
import swamp_top2 from '../art/areas/swamp/top2.png';
import swamp_high from '../art/areas/swamp/high.png';
import swamp_side from '../art/areas/swamp/side.png';
import swamp_boulder1 from '../art/areas/swamp/boulder1.png';
import swamp_boulder2 from '../art/areas/swamp/boulder2.png';
import swamp_tall1 from '../art/areas/swamp/tall1.png';
import swamp_tall2 from '../art/areas/swamp/tall2.png';
import graveyard_top1 from '../art/areas/graveyard/top1.png';
import graveyard_top2 from '../art/areas/graveyard/top2.png';
import graveyard_high from '../art/areas/graveyard/high.png';
import graveyard_side from '../art/areas/graveyard/side.png';
import graveyard_boulder1 from '../art/areas/graveyard/boulder1.png';
import graveyard_boulder2 from '../art/areas/graveyard/boulder2.png';
import graveyard_boulder3 from '../art/areas/graveyard/boulder3.png';
import graveyard_tall1 from '../art/areas/graveyard/tall1.png';
import graveyard_tall2 from '../art/areas/graveyard/tall2.png';
import ruins_top1 from '../art/areas/ruins/top1.png';
import ruins_top2 from '../art/areas/ruins/top2.png';
import ruins_high from '../art/areas/ruins/high.png';
import ruins_side from '../art/areas/ruins/side.png';
import ruins_boulder1 from '../art/areas/ruins/boulder1.png';
import ruins_boulder2 from '../art/areas/ruins/boulder2.png';
import ruins_tall1 from '../art/areas/ruins/tall1.png';
import ruins_tall2 from '../art/areas/ruins/tall2.png';
import temple_top1 from '../art/areas/temple/top1.png';
import temple_top2 from '../art/areas/temple/top2.png';
import temple_high from '../art/areas/temple/high.png';
import temple_side from '../art/areas/temple/side.png';
import temple_boulder1 from '../art/areas/temple/boulder1.png';
import temple_boulder2 from '../art/areas/temple/boulder2.png';
import temple_tall1 from '../art/areas/temple/tall1.png';
import temple_tall2 from '../art/areas/temple/tall2.png';
import crystal_top1 from '../art/areas/crystal/top1.png';
import crystal_top2 from '../art/areas/crystal/top2.png';
import crystal_high from '../art/areas/crystal/high.png';
import crystal_side from '../art/areas/crystal/side.png';
import crystal_boulder1 from '../art/areas/crystal/boulder1.png';
import crystal_boulder2 from '../art/areas/crystal/boulder2.png';
import crystal_tall1 from '../art/areas/crystal/tall1.png';
import crystal_tall2 from '../art/areas/crystal/tall2.png';
import forge_top1 from '../art/areas/forge/top1.png';
import forge_top2 from '../art/areas/forge/top2.png';
import forge_high from '../art/areas/forge/high.png';
import forge_side from '../art/areas/forge/side.png';
import forge_boulder1 from '../art/areas/forge/boulder1.png';
import forge_boulder2 from '../art/areas/forge/boulder2.png';
import forge_tall1 from '../art/areas/forge/tall1.png';
import forge_tall2 from '../art/areas/forge/tall2.png';
import shrine_top1 from '../art/areas/shrine/top1.png';
import shrine_top2 from '../art/areas/shrine/top2.png';
import shrine_high from '../art/areas/shrine/high.png';
import shrine_side from '../art/areas/shrine/side.png';
import shrine_boulder1 from '../art/areas/shrine/boulder1.png';
import shrine_boulder2 from '../art/areas/shrine/boulder2.png';
import shrine_tall1 from '../art/areas/shrine/tall1.png';
import shrine_tall2 from '../art/areas/shrine/tall2.png';
import warcamp_top1 from '../art/areas/warcamp/top1.png';
import warcamp_top2 from '../art/areas/warcamp/top2.png';
import warcamp_high from '../art/areas/warcamp/high.png';
import warcamp_side from '../art/areas/warcamp/side.png';
import warcamp_boulder1 from '../art/areas/warcamp/boulder1.png';
import warcamp_boulder2 from '../art/areas/warcamp/boulder2.png';
import warcamp_boulder3 from '../art/areas/warcamp/boulder3.png';
import warcamp_tall1 from '../art/areas/warcamp/tall1.png';
import warcamp_tall2 from '../art/areas/warcamp/tall2.png';
import oasis_top1 from '../art/areas/oasis/top1.png';
import oasis_top2 from '../art/areas/oasis/top2.png';
import oasis_high from '../art/areas/oasis/high.png';
import oasis_side from '../art/areas/oasis/side.png';
import oasis_boulder1 from '../art/areas/oasis/boulder1.png';
import oasis_boulder2 from '../art/areas/oasis/boulder2.png';
import oasis_tall1 from '../art/areas/oasis/tall1.png';
import oasis_tall2 from '../art/areas/oasis/tall2.png';

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
  plains: { tops: [plains_top1, plains_top2], high: plains_high, side: plains_side, boulders: [plains_boulder1, plains_boulder2], tall: [plains_tall1, plains_tall2], tallScale: 3, tallCount: 6 },
  autumn: { tops: [autumn_top1, autumn_top2], high: autumn_high, side: autumn_side, boulders: [autumn_boulder1, autumn_boulder2], tall: [autumn_tall1, autumn_tall2], tallScale: 3, tallCount: 6 },
  swamp: { tops: [swamp_top1, swamp_top2], high: swamp_high, side: swamp_side, boulders: [swamp_boulder1, swamp_boulder2], tall: [swamp_tall1, swamp_tall2], tallScale: 1, tallCount: 4 },
  graveyard: { tops: [graveyard_top1, graveyard_top2], high: graveyard_high, side: graveyard_side, boulders: [graveyard_boulder1, graveyard_boulder2, graveyard_boulder3], tall: [graveyard_tall1, graveyard_tall2], tallScale: 1, tallCount: 3 },
  ruins: { tops: [ruins_top1, ruins_top2], high: ruins_high, side: ruins_side, boulders: [ruins_boulder1, ruins_boulder2], tall: [ruins_tall1, ruins_tall2], tallScale: 1, tallCount: 4 },
  temple: { tops: [temple_top1, temple_top2], high: temple_high, side: temple_side, boulders: [temple_boulder1, temple_boulder2], tall: [temple_tall1, temple_tall2], tallScale: 0.5, tallCount: 2 },
  crystal: { tops: [crystal_top1, crystal_top2], high: crystal_high, side: crystal_side, boulders: [crystal_boulder1, crystal_boulder2], tall: [crystal_tall1, crystal_tall2], tallScale: 0.5, tallCount: 2 },
  forge: { tops: [forge_top1, forge_top2], high: forge_high, side: forge_side, boulders: [forge_boulder1, forge_boulder2], tall: [forge_tall1, forge_tall2], tallScale: 3, tallCount: 6 },
  shrine: { tops: [shrine_top1, shrine_top2], high: shrine_high, side: shrine_side, boulders: [shrine_boulder1, shrine_boulder2], tall: [shrine_tall1, shrine_tall2], tallScale: 3, tallCount: 6 },
  warcamp: { tops: [warcamp_top1, warcamp_top2], high: warcamp_high, side: warcamp_side, boulders: [warcamp_boulder1, warcamp_boulder2, warcamp_boulder3], tall: [warcamp_tall1, warcamp_tall2], tallScale: 3, tallCount: 6 },
  oasis: { tops: [oasis_top1, oasis_top2], high: oasis_high, side: oasis_side, boulders: [oasis_boulder1, oasis_boulder2], tall: [oasis_tall1, oasis_tall2], tallScale: 3, tallCount: 6 },
};

/** What can lie on any area's ground. */
export const GROUND_URLS = { water, ice, lava };

/** The highlands' bushes (for looks only). */
export const BUSH_URLS = [bush1, bush2];
