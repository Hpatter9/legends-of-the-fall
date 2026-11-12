// WAVE-DELAY (docs/notes/wave-delay.md): the sheets kept ready for a fight (`texReadyRules.ts` has the rules). The loaders name their
// sheets here (`keepReady`); the page calls `readyStep` each frame with its renderer.
import type { TextureSource } from 'pixi.js';
import { mayRelease, mayWarm, nextToWarm } from './texReadyRules';

const KEPT = new Map<string, TextureSource>();
let released: boolean | null = null;

/** Name a sheet to be kept ready (once is enough; a sheet named again under the same id takes the place of the old one). */
export function keepReady(id: string, source: TextureSource): void {
  KEPT.set(id, source);
  released = null;
}

/** The renderer's part this needs: its id, and its way of handing a texture to the graphics card. */
interface Card {
  uid: number;
  texture: { initSource(s: TextureSource): void };
}

/** Each frame: at most one kept sheet not on the graphics card is handed to it, and the sheets are held there while a fight is on. A
 *  fault here is never the fight's: it is logged once and the sheet goes up when it is first drawn, as it always did. */
let faulted = false;
export function readyStep(renderer: unknown, fighting: boolean): void {
  const card = renderer as Card;
  const free = mayRelease(fighting);
  if (free !== released) {
    released = free;
    for (const s of KEPT.values()) if (!s.destroyed) s.autoGarbageCollect = free;
  }
  if (!mayWarm(fighting)) return;
  try {
    const live = [...KEPT.values()].filter((s) => !s.destroyed);
    const next = nextToWarm(live, (s) => !!(s as unknown as { _gpuData: Record<number, unknown> })._gpuData?.[card.uid]);
    if (next) card.texture.initSource(next);
  } catch (err) {
    if (!faulted) console.warn('a sheet could not be handed to the graphics card ahead of its fight', err);
    faulted = true;
  }
}
