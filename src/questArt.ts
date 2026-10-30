// The quests' pictures, by key, so the owner's painted art can take their place without touching the screens: the givers'
// card portraits (`FACES`, to be the painted busts from `art-source/eidolons/givers/<id>.png`), Gwen's sprite behind the bar and
// the quest board in the tavern (`BOARD`, to be pinned papers from `art-source/eidolons/board/*.png`). Until then each is a pack
// placeholder cut by `tools/quests/cut.py` (see CREDITS.md). Bundled as data URLs, so nothing is added to the offline list.

import type { GiverId } from './sim/questData';
import gwenFace from './art/quests/gwen-face.png';
import pedlarFace from './art/quests/pedlar-face.png';
import pilgrimFace from './art/quests/pilgrim-face.png';
import gwenSheet from './art/quests/gwen.png';
import boardUrl from './art/quests/board.png';

/** A giver's portrait for their card and the log's rows (square; drawn at 64 px or less). */
export const FACES: Record<GiverId, string> = { gwen: gwenFace, pedlar: pedlarFace, pilgrim: pilgrimFace };

/** Gwen behind the bar: 64 px cells, facing left; row 0 her stand (1 frame), row 1 talking (5 frames). */
export const GWEN = { url: gwenSheet, cell: 64, stand: 1, talk: 5 } as const;

/** The quest board on the bar room's wall (one picture, 64 px across). */
export const BOARD = boardUrl;
