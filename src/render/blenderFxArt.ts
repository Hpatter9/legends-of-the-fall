// BLENDER-FX (docs/notes/blender-fx.md): the Blender-rendered effect atlases, cut into each clip's frames. The pixel atlases
// (`fx/blender/px-<n>.webp`) are drawn with hard pixels; the glow atlases (`soft-<n>.webp`) are small and drawn smoothed, which is what makes
// them soft. They load by URL once, behind the game (build.mjs copies them and lists them in the service worker, so they play offline);
// until one has loaded, `bfxFrames` is empty and the caller keeps its older look.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import { BFX_CLIPS, BFX_PX, BFX_SOFT } from './blenderFxData';
import { bfxRect } from './blenderFxRules';

const FRAMES = new Map<string, Texture[]>();
const GLOWS = new Map<string, Texture[]>();
let loading: Promise<void> | null = null;

/** A clip's frames (empty before its atlas has loaded, or when the pipeline has not made it). */
export const bfxFrames = (key: string): Texture[] => FRAMES.get(key) ?? [];
/** A light clip's glow frames (empty for a hard one). */
export const bfxGlows = (key: string): Texture[] => GLOWS.get(key) ?? [];

/** Load every atlas once and cut the clips. A failed atlas is left out: its clips keep their older looks. */
export function loadBlenderFx(): Promise<void> {
  loading ??= (async () => {
    const page = async (name: string, i: number, mode: 'nearest' | 'linear') => {
      try {
        const base = Texture.from(await loadImage(`fx/blender/${name}-${i}.webp`));
        base.source.style.scaleMode = mode;
        return base;
      } catch (err) {
        console.warn(`blender effects ${name}-${i} did not load`, err);
        return null;
      }
    };
    const [px, soft] = await Promise.all([Promise.all(BFX_PX.map((_, i) => page('px', i, 'nearest'))), Promise.all(BFX_SOFT.map((_, i) => page('soft', i, 'linear')))]);
    for (const [key, c] of Object.entries(BFX_CLIPS)) {
      const base = px[c.a];
      if (!base) continue;
      FRAMES.set(key, Array.from({ length: c.n }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(...bfxRect(c, i)) })));
      const g = c.g;
      const glow = g ? soft[g.a] : null;
      if (g && glow) GLOWS.set(key, Array.from({ length: c.n }, (_, i) => new Texture({ source: glow.source, frame: new Rectangle(...bfxRect(g, i)) })));
    }
  })();
  return loading;
}
