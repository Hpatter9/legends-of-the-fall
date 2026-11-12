// RPG-SPELLS: the painted spell effects' atlases (docs/notes/spell-art.md), one a session, cut into each part's frames, the way
// `statusArt.ts` cuts the ailments' atlas. The atlases load by URL (`fx/spells/<session>.webp`; build.mjs copies them and lists them
// in the service worker, so they play offline) once, without holding up the game: until one has loaded, or for a part no atlas has,
// `spellFrames` is empty and the caller keeps its placeholder look.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import { keepReady } from './texReady';
import { SPELL_SESSIONS } from './spellLooks';

const STRIPS = new Map<string, Texture[]>();
/** Each loaded atlas's picture, by session (ULT-EPIC: the moment's band draws the kit's speed lines from it on a canvas). */
const IMAGES = new Map<string, ImageBitmap | HTMLImageElement>();
let loading: Promise<void> | null = null;

/** A painted part's frames (empty before its atlas has loaded, or when none has it). */
export const spellFrames = (key: string): Texture[] => STRIPS.get(key) ?? [];
/** A session's atlas picture once it has loaded (none before, or when the session has no atlas: nothing is ever asked for). */
export const spellImage = (session: string): ImageBitmap | HTMLImageElement | undefined => IMAGES.get(session);

/** A sheet's picture, fetched and decoded off the page's own thread where the browser can (a bitmap). As a plain image a sheet's
 *  pixels (up to 1536 x 2880) were decoded on the frame it was handed to the graphics card: 165 to 576 ms each at six times CPU
 *  throttle, ten of them one a frame through a deploy, which was a wave's start stopping on a phone. As a bitmap the hand-over is a
 *  copy. A browser without `createImageBitmap`, or a fetch that fails, has the plain image as before. */
async function picture(url: string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return loadImage(url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return await createImageBitmap(await res.blob());
  } catch {
    return loadImage(url);
  }
}

/** Load every session's atlas once and cut its parts. A failed atlas is left out (its parts keep their placeholders). */
export function loadSpellArt(): Promise<void> {
  loading ??= Promise.all(
    Object.entries(SPELL_SESSIONS).map(async ([session, m]) => {
      try {
        const img = await picture(`fx/spells/${session}.webp`);
        IMAGES.set(session, img);
        const base = Texture.from(img);
        base.source.style.scaleMode = 'linear';
        // (WAVE-DELAY: a painted sheet is up to 1536 x 3744 px. Each is handed to the graphics card ahead, in a deploy, one a frame,
        // and held there while a fight is on: `texReady.ts`; and it is a bitmap, decoded already, so that hand-over is a copy)
        keepReady(`spell-sheet-${session}`, base.source);
        for (const [key, [col, row, n]] of Object.entries(m.parts)) {
          const frames: Texture[] = [];
          for (let i = 0; i < n; i++) frames.push(new Texture({ source: base.source, frame: new Rectangle((col + i) * m.cell, row * m.cell, m.cell, m.cell) }));
          STRIPS.set(key, frames);
        }
      } catch (err) {
        console.warn(`spell art ${session} did not load`, err);
      }
    }),
  ).then(() => undefined);
  return loading;
}
