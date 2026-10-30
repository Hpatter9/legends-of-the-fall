// The quests' pictures, by key, so the owner's art can take their place without touching the screens: the givers' card
// portraits (`FACES`: the painted busts from `art-source/eidolons/givers/<id>.png`, cropped to the head and shoulders by
// `tools/quests/import-art.py`), the papers pinned on the tavern's quest board (`PAPERS`, from `art-source/eidolons/board/*.png`),
// Gwen's sprite behind the bar (`GWEN`) and the board itself (`BOARD`). Gwen's figure and the board are still pack placeholders
// cut by `tools/quests/cut.py` (see CREDITS.md). All bundled as data URLs, so nothing is added to the offline list.

import type { GiverId } from './sim/questData';
import gwenFace from './art/quests/gwen-face.webp';
import pedlarFace from './art/quests/pedlar-face.webp';
import pilgrimFace from './art/quests/pilgrim-face.webp';
import messengerFace from './art/quests/messenger-face.webp';
import hunterFace from './art/quests/hunter-face.webp';
import noticeUrl from './art/quests/notice.webp';
import noticeSealedUrl from './art/quests/notice-sealed.webp';
import gwenSheet from './art/quests/gwen.png';
import boardUrl from './art/quests/board.png';

/** A giver's portrait for their card and the log's rows (square, 192 px; drawn at 64 px or less). The messenger and the hunter are
 *  painted ahead of the quests that bring them. */
export const FACES: Record<GiverId | 'messenger' | 'hunter', string> = {
  gwen: gwenFace,
  pedlar: pedlarFace,
  pilgrim: pilgrimFace,
  messenger: messengerFace,
  hunter: hunterFace,
};

/** The papers pinned on the board, one per offer: `plain` for an ordinary quest, `sealed` (a gold seal and ribbon) for a step of
 *  an Eidolon's chain (later batches). 96 px across, about 2:3. */
export const PAPERS = { plain: noticeUrl, sealed: noticeSealedUrl } as const;

/** Gwen behind the bar: 64 px cells, facing left; row 0 her stand (1 frame), row 1 talking (5 frames). */
export const GWEN = { url: gwenSheet, cell: 64, stand: 1, talk: 5 } as const;

/** The quest board on the bar room's wall (one picture, 64 px across). */
export const BOARD = boardUrl;

/** Where a paper is pinned on the board's picture (its centre and width, in the board's own pixels): over the three papers
 *  painted on it, so an offer's notice covers one of them. */
export const BOARD_PINS: readonly { x: number; y: number; w: number }[] = [
  { x: 34, y: 16, w: 13 },
  { x: 17, y: 24, w: 14 },
  { x: 49, y: 24, w: 13 },
];
