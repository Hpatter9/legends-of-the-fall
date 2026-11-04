// The schools' fourteen spells' painted sheets (KING-SPELLS batch 5, docs/notes/king-spells-b5.md): art-source/spell-fx/h-kings, packed by
// tools/spell-fx/import-spell-art.py into the `h-kings` atlas with the `king-` prefix (`src/art/fx/spells/index.json`). Each has a `cast` row,
// played once where the spell is cast, and an `impact` row, played once on every fighter it touches; the three walls also have a `stand`
// loop, drawn on each tile of the king's wall while it stands. Pure data: no Pixi, no DOM, so the tests read it.

import type { SpellId } from '../sim/spells';
import type { WallKind } from '../sim/toolkit/walls';

/** The sheet each spell plays (`<sheet>.cast`, `<sheet>.impact`). */
export const KING_SHEET: Partial<Record<SpellId, string>> = {
  firewall: 'king-wallOfFire',
  icewall: 'king-iceWall',
  shatter: 'king-shatter',
  gale: 'king-gale',
  thunderclap: 'king-thunderclap',
  snare: 'king-thornSnare',
  charm: 'king-charm',
  foresight: 'king-foresight',
  sunbeam: 'king-sunbeam',
  venom: 'king-venomFang',
  mirage: 'king-mirage',
  drain: 'king-drainLife',
  bonewall: 'king-boneWall',
  raisedead: 'king-raiseDead',
};

/** The king's walls' own stand loops, by the wall's kind (a wall the king raised: `by` 0). */
export const KING_WALL: Partial<Record<WallKind, string>> = { fire: 'king-wallOfFire', ice: 'king-iceWall', stone: 'king-boneWall' };
