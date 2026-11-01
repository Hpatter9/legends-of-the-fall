// The quests' pictures, by key, so the owner's painted art can take their place without touching the screens: the givers'
// card portraits (`FACES`, to be the painted busts from `art-source/eidolons/givers/<id>.png`), Gwen's sprite behind the bar and
// the quest board in the tavern (`BOARD`, to be pinned papers from `art-source/eidolons/board/*.png`). Until then each is a pack
// placeholder cut by `tools/quests/cut.py` (see CREDITS.md). Bundled as data URLs, so nothing is added to the offline list.

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
import spoilsFace from './art/items/star_chart.png';
import riftFace from './art/items/rift_shard.png';
import gwenSheet from './art/quests/gwen.png';
import boardUrl from './art/quests/board.png';

/** A giver's portrait for their card and the log's rows (square; drawn at 64 px or less). A patron's is the hero's own and the ruler's
 *  the chosen ruler's (put in by `questCard.ts`); theirs here are fallbacks. Spoils and the rift show a thing, not a face: a found map
 *  and a rift shard, from the gear icons. */
export const FACES: Record<GiverId, string> = {
  gwen: gwenFace,
  notice: boardUrl,
  pedlar: pedlarFace,
  pilgrim: pilgrimFace,
  messenger: messengerFace,
  hunter: hunterFace,
  patron: gwenFace,
  ruler: messengerFace,
  spoils: spoilsFace,
  rift: riftFace,
  duchess: duchessFace,
  // (SECRET-HEROES: the hero quests' tellers, LPC layers composed by `tools/hero-quests/cut.py`)
  shepherd: shepherdFace,
  gaoler: gaolerFace,
  smith: smithFace,
  // (HERO-TALES-2: the other seven tellers, by the same tool)
  sexton: sextonFace,
  pawnbroker: pawnbrokerFace,
  lantern: lanternFace,
  herald: heraldFace,
  clock: clockFace,
  falconer: falconerFace,
  archivist: archivistFace,
};

/** Gwen behind the bar: 64 px cells, facing left; row 0 her stand (1 frame), row 1 talking (5 frames). */
export const GWEN = { url: gwenSheet, cell: 64, stand: 1, talk: 5 } as const;

/** The quest board on the bar room's wall (one picture, 64 px across). */
export const BOARD = boardUrl;
