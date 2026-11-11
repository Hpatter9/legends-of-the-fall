// LIVING-FIELDS, step 2: the painted hold sheets as the lands' floors (`floorRules.ts` says which sheet and which of its textures each
// land takes). A sheet's ground, edges and faces are loaded by URL the first time a board of its land is shown (they are the Assault's
// own files, `assault/<hold>/*.webp`: `build.mjs` copies them and the service worker keeps them, so they are there offline), and kept.

import { loadImage } from './loadImage';
import type { Hold } from './floorRules';

export interface FloorArt {
  /** Sixteen ground textures, 4 x 4, each 256 px (4 x 4 tiles). */
  ground: HTMLImageElement;
  /** The faces (six across, two down, each 64 x 120: a lip of 20, a body of 80, a foot of 20), shaded for the lit side and the side in shade. */
  faces: { left: HTMLCanvasElement; right: HTMLCanvasElement };
  /** The ragged shape of an edge and of a corner, turned four ways: a mask a neighbour's ground is cut to where it bleeds over a tile. */
  ragged: HTMLCanvasElement[];
  raggedCorner: HTMLCanvasElement[];
  /** The waterline's foam along an edge and in a corner, turned four ways. */
  foam: HTMLCanvasElement[];
  foamCorner: HTMLCanvasElement[];
  /** The decals, 4 x 4, each 128 px (2 x 2 tiles): what lies about a land, and the marks a fight leaves (`boardLifeRules.ts`). */
  decals: HTMLImageElement;
}

/** How much deeper than the sheet's own fringe a ragged edge reaches into a tile (the sheet's is a thin strip, made for a far camera). */
const REACH = 1.9;

const ready = new Map<Hold, FloorArt>();
const loading = new Map<Hold, Promise<FloorArt | null>>();

/** A cell of the edges sheet turned `q` quarter turns clockwise, stretched `reach` times deeper from its own edge. */
function turned(img: HTMLImageElement, cell: number, q: number, reach = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.translate(32, 32);
  g.rotate((q * Math.PI) / 2);
  g.drawImage(img, (cell % 4) * 64, Math.floor(cell / 4) * 64, 64, 64, -32, -32, 64 * (cell % 2 ? reach : 1), 64 * reach);
  return c;
}

/** The land's sheet, if it has been loaded. */
export const floorArt = (hold: Hold): FloorArt | null => ready.get(hold) ?? null;

/** Load a hold's sheet (once). Null if a file cannot be had: the board keeps its old tops. */
export function loadFloorArt(hold: Hold): Promise<FloorArt | null> {
  const got = ready.get(hold);
  if (got) return Promise.resolve(got);
  let p = loading.get(hold);
  if (!p) {
    p = Promise.all(['ground', 'edges', 'faces', 'decals'].map((f) => loadImage(`assault/${hold}/${f}.webp`)))
      .then(([ground, edges, faces, decals]) => {
        const shaded = (k: number) => {
          const c = document.createElement('canvas');
          c.width = faces.width;
          c.height = faces.height;
          const g = c.getContext('2d')!;
          g.drawImage(faces, 0, 0);
          g.globalCompositeOperation = 'source-atop';
          g.fillStyle = `rgba(0,0,0,${k})`;
          g.fillRect(0, 0, c.width, c.height);
          return c;
        };
        const four = (cell: number, reach = 1) => [0, 1, 2, 3].map((q) => turned(edges, cell, q, reach));
        // (the edges sheet: 0 mud, 1 its corner ... 14 water, 15 its corner; the mud's shape is the mask)
        const art: FloorArt = { ground, faces: { left: shaded(0.04), right: shaded(0.3) }, ragged: four(0, REACH), raggedCorner: four(1, REACH), foam: four(14), foamCorner: four(15), decals };
        ready.set(hold, art);
        return art;
      })
      .catch(() => null);
    loading.set(hold, p);
  }
  return p;
}
