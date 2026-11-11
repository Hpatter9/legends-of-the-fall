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

const graded = new Map<string, HTMLCanvasElement>();
/** How much of a texture's own hue is kept when it is graded to a land's colour (the rest takes the colour; its light and shade are kept whole). */
const KEEP_HUE = 0.22;

/** One ground texture of a sheet (a slot of its 4 x 4, 256 px) graded to a colour: every pixel keeps its light and shade against the
 *  texture's own mean and takes the land's hue and brightness, so a hold's trodden siege ground becomes a meadow's green or a dune's sand
 *  without losing its painting. `rgb` is 0xRRGGBB. Made once and kept. */
export function gradedGround(hold: Hold, slot: number, rgb: number): HTMLCanvasElement | null {
  const art = ready.get(hold);
  if (!art) return null;
  const key = `${hold}:${slot}:${rgb}`;
  const have = graded.get(key);
  if (have) return have;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(art.ground, (slot % 4) * 256, Math.floor(slot / 4) * 256, 256, 256, 0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256);
  const d = img.data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
  const mean = sum / (d.length / 4) || 1;
  const [tr, tg, tb] = [(rgb >> 16) & 255, (rgb >> 8) & 255, rgb & 255];
  const gain = (tr * 0.299 + tg * 0.587 + tb * 0.114) / mean;
  for (let i = 0; i < d.length; i += 4) {
    // (its light against the texture's mean, held within bounds so nothing burns out or goes black)
    const k = Math.max(0.4, Math.min(1.7, (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / mean));
    d[i] = Math.min(255, d[i] * gain * KEEP_HUE + tr * k * (1 - KEEP_HUE));
    d[i + 1] = Math.min(255, d[i + 1] * gain * KEEP_HUE + tg * k * (1 - KEEP_HUE));
    d[i + 2] = Math.min(255, d[i + 2] * gain * KEEP_HUE + tb * k * (1 - KEEP_HUE));
  }
  g.putImageData(img, 0, 0);
  graded.set(key, c);
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
