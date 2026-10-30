// RPG-SPELLS: the painted spell effects' atlases (docs/notes/spell-art.md), one a session, cut into each part's frames, the way
// `statusArt.ts` cuts the ailments' atlas. The atlases load by URL (`fx/spells/<session>.webp`; build.mjs copies them and lists them
// in the service worker, so they play offline) once, without holding up the game: until one has loaded, or for a part no atlas has,
// `spellFrames` is empty and the caller keeps its placeholder look.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import { SPELL_SESSIONS } from './spellLooks';

const STRIPS = new Map<string, Texture[]>();
let loading: Promise<void> | null = null;

/** A painted part's frames (empty before its atlas has loaded, or when none has it). */
export const spellFrames = (key: string): Texture[] => STRIPS.get(key) ?? [];

/** Load every session's atlas once and cut its parts. A failed atlas is left out (its parts keep their placeholders). */
export function loadSpellArt(): Promise<void> {
  loading ??= Promise.all(
    Object.entries(SPELL_SESSIONS).map(async ([session, m]) => {
      try {
        const base = Texture.from(await loadImage(`fx/spells/${session}.webp`));
        base.source.style.scaleMode = 'linear';
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
