// LAND-IDENTITY: the painted hold sheets' standing pieces (`src/art/assault/<hold>/sprites.webp`: trees, reeds, rocks, crystals, braziers,
// tents ... the same names in every hold, each painted in its hold's theme), for the set pieces round and on a land's battlefield
// (`landRimRules.ts`). The Assault's own files, loaded by URL the first time a land that uses them is shown and kept; `build.mjs`
// already copies them and the service worker already keeps them, so they are there offline.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import type { Hold } from './floorRules';
import * as ORC from './assaultOrcAtlas';
import * as UNDEAD from './assaultUndeadAtlas';
import * as BEASTS from './assaultBeastsAtlas';
import * as WILDWOOD from './assaultWildwoodAtlas';
import * as LABYRINTH from './assaultLabyrinthAtlas';
import * as OGRES from './assaultOgresAtlas';
import * as INFERNAL from './assaultInfernalAtlas';
import * as YOKAI from './assaultYokaiAtlas';
import * as GOLEMS from './assaultGolemsAtlas';

type Cell = { r: [number, number, number, number]; foot: [number, number]; fp: [number, number] };
const ATLAS: Record<Hold, Record<string, Cell>> = { orc: ORC.SPRITES, undead: UNDEAD.SPRITES, beasts: BEASTS.SPRITES, wildwood: WILDWOOD.SPRITES, labyrinth: LABYRINTH.SPRITES, ogres: OGRES.SPRITES, infernal: INFERNAL.SPRITES, yokai: YOKAI.SPRITES, golems: GOLEMS.SPRITES };

const sheets = new Map<Hold, Texture>();
const loading = new Map<Hold, Promise<boolean>>();
const made = new Map<string, Texture>();

/** Whether a hold's pieces are loaded. */
export const holdSpritesReady = (hold: Hold): boolean => sheets.has(hold);

/** Load a hold's pieces (once). False if the file cannot be had: the land goes without its set pieces. */
export function loadHoldSprites(hold: Hold): Promise<boolean> {
  if (sheets.has(hold)) return Promise.resolve(true);
  let p = loading.get(hold);
  if (!p) {
    p = loadImage(`assault/${hold}/sprites.webp`)
      .then((img) => {
        sheets.set(hold, Texture.from(img));
        return true;
      })
      .catch(() => false);
    loading.set(hold, p);
  }
  return p;
}

/** A piece's texture and where its foot lies on it (as an anchor), or null if the hold has no such piece or is not loaded. */
export function holdPiece(hold: Hold, name: string): { tex: Texture; ax: number; ay: number } | null {
  const sheet = sheets.get(hold);
  const cell = ATLAS[hold][name];
  if (!sheet || !cell) return null;
  const key = `${hold}:${name}`;
  let tex = made.get(key);
  if (!tex) made.set(key, (tex = new Texture({ source: sheet.source, frame: new Rectangle(...cell.r) })));
  return { tex, ax: cell.foot[0] / cell.r[2], ay: cell.foot[1] / cell.r[3] };
}
