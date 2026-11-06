// The Nemesis War, phase 3: a trophy's gear icon in the fight, for a nemesis's name plate (`unitView.ts`). The painted gear atlas the hero
// sheet uses (`gearIcons.ts`, `src/art/gear/`), its small cells cut into textures one base at a time. The atlas loads by URL (build.mjs copies
// it and the service worker lists it), so the plate shows the icon once it has loaded; before then, the plate is drawn without it.

import { Texture } from 'pixi.js';
import index from '../art/gear/index.json';

const items = index.items as Record<string, number>;
const made = new Map<string, Texture>();
let atlas: HTMLImageElement | null = null;
let asked = false;

/** Start loading the small atlas (once). */
export function warmGearTextures(): void {
  if (asked || typeof Image === 'undefined') return;
  asked = true;
  const img = new Image();
  img.onload = () => (atlas = img);
  img.src = `gear/gear-${index.cells[1]}.webp`;
}

/** A gear base's icon as a texture (a Mythic piece's own painting when there is one); null until the atlas has loaded, or for a base it lacks. */
export function gearTexture(base: string, rarity: number): Texture | null {
  warmGearTextures();
  const key = rarity >= 5 && `${base}-mythic` in items ? `${base}-mythic` : base;
  const hit = made.get(key);
  if (hit) return hit;
  const n = items[key];
  if (!atlas || n === undefined) return null;
  const cell = atlas.width / index.cols;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.round(cell);
  canvas.getContext('2d')!.drawImage(atlas, (n % index.cols) * cell, Math.floor(n / index.cols) * cell, cell, cell, 0, 0, canvas.width, canvas.height);
  const tex = Texture.from(canvas);
  made.set(key, tex);
  return tex;
}
