// Shared quest portraits and tavern props. Original painted givers come from tools/eidolons/import.py;
// fifteen additional painted tellers come from tools/quest-givers/import.py. Their sources and credits
// are retained in art-source/. Images are bundled as data URLs for offline play; world sprites stay unchanged.

import type { GiverId } from './sim/questData';
import gwenFace from './art/quests/gwen-face.png';
import pedlarFace from './art/quests/pedlar-face.png';
import pilgrimFace from './art/quests/pilgrim-face.png';
import messengerFace from './art/quests/messenger-face.png';
import hunterFace from './art/quests/hunter-face.png';
import duchessFace from './art/quests/duchess-face.png';
import shepherdFace from './art/quests/shepherd-face.png';
import gaolerFace from './art/quests/gaoler-face.png';
import smithFace from './art/quests/smith-face.png';
import sextonFace from './art/quests/sexton-face.png';
import pawnbrokerFace from './art/quests/pawnbroker-face.png';
import lanternFace from './art/quests/lantern-face.png';
import heraldFace from './art/quests/herald-face.png';
import clockFace from './art/quests/clock-face.png';
import falconerFace from './art/quests/falconer-face.png';
import archivistFace from './art/quests/archivist-face.png';
import oswyFace from './art/quests/oswy-face.png';
import tealFace from './art/quests/teal-face.png';
import pimFace from './art/quests/pim-face.png';
import widowFace from './art/quests/widow-face.png';
import sorrelFace from './art/quests/sorrel-face.png';
import lostFace from './art/quests/lost-face.png';
import spoilsFace from './art/items/star_chart.png';
import riftFace from './art/items/rift_shard.png';
import gwenSheet from './art/quests/gwen.png';
import boardUrl from './art/quests/board.png';
import noticeFace from './art/quests/notice-face.png';

/** A giver's portrait for their card and the log's rows (square; drawn at 64 px or less). A patron's is the hero's own and the ruler's
 *  the chosen ruler's (put in by `questCard.ts`); theirs here are fallbacks. Spoils and the rift show a thing, not a face: a found map
 *  and a rift shard, from the gear icons. */
export const FACES: Record<GiverId, string> = {
  gwen: gwenFace,
  notice: noticeFace,
  pedlar: pedlarFace,
  pilgrim: pilgrimFace,
  messenger: messengerFace,
  hunter: hunterFace,
  patron: gwenFace,
  ruler: messengerFace,
  spoils: spoilsFace,
  rift: riftFace,
  duchess: duchessFace,
  // Painted hero-tale tellers, imported by tools/quest-givers/import.py.
  shepherd: shepherdFace,
  gaoler: gaolerFace,
  smith: smithFace,
  // The other seven hero-tale tellers.
  sexton: sextonFace,
  pawnbroker: pawnbrokerFace,
  lantern: lanternFace,
  herald: heraldFace,
  clock: clockFace,
  falconer: falconerFace,
  archivist: archivistFace,
  // Lost Techniques without a speaking hero use the approved painted manuscript.
  lost: lostFace,
  // Campaign and proving-ground givers each have their own painted face.
  oswy: oswyFace,
  teal: tealFace,
  pim: pimFace,
  widow: widowFace,
  sorrel: sorrelFace,
};

/** Gwen behind the bar: 64 px cells, facing left; row 0 her stand (1 frame), row 1 talking (5 frames). */
export const GWEN = { url: gwenSheet, cell: 64, stand: 1, talk: 5 } as const;

/** The quest board on the bar room's wall (one picture, 64 px across). */
export const BOARD = boardUrl;

/** The givers whose face is a painting (drawn smooth, not as the pixel placeholders are). */
export const PAINTED = new Set(['gwen', 'pedlar', 'pilgrim', 'messenger', 'hunter', 'notice', 'patron', 'shepherd', 'gaoler', 'smith', 'sexton', 'pawnbroker', 'lantern', 'herald', 'clock', 'falconer', 'archivist', 'oswy', 'teal', 'pim', 'widow', 'sorrel', 'lost']);
