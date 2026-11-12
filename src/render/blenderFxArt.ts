// BLENDER-FX (docs/notes/blender-fx.md): the Blender-rendered effect atlases, cut into each clip's frames. The pixel atlases
// (`fx/blender/px-<n>.webp`) are drawn with hard pixels; the glow atlases (`soft-<n>.webp`) are small and drawn smoothed, which is what makes
// them soft. They load by URL behind the game (build.mjs copies them and lists them in the service worker, so they play offline).
//
// An atlas is only held in the graphics memory once something needs it. The atlases every fight may need (`BFX_CORE`: the king's spells,
// the ground loops) and the glows load up front. The ultimates' are large and many (a strike is the biggest thing in the game), so each
// loads when a fight has a hero whose ultimate is in it (`warmBfx`, as the fight begins), or the first time one of its clips is asked for.
// Until a clip's atlas has loaded, `bfxFrames` is empty and the caller keeps its older look.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import { BFX_CLIPS, BFX_CORE, BFX_PX, BFX_SOFT } from './blenderFxData';
import { bfxRect } from './blenderFxRules';

const FRAMES = new Map<string, Texture[]>();
const GLOWS = new Map<string, Texture[]>();
/** Each atlas's load, once asked for: 'px' pages by their number, the glows together. */
const PAGES = new Map<number, Promise<void>>();
let soft: Promise<(Texture | null)[]> | null = null;

async function page(name: string, i: number, mode: 'nearest' | 'linear'): Promise<Texture | null> {
  try {
    const base = Texture.from(await loadImage(`fx/blender/${name}-${i}.webp`));
    base.source.style.scaleMode = mode;
    return base;
  } catch (err) {
    console.warn(`blender effects ${name}-${i} did not load`, err);
    return null;
  }
}

/** Load pixel atlas `a` once and cut the clips that lie in it (and their glows). A failed atlas is left out: its clips keep their older looks. */
function need(a: number): Promise<void> {
  let job = PAGES.get(a);
  if (!job) {
    job = (async () => {
      soft ??= Promise.all(BFX_SOFT.map((_, i) => page('soft', i, 'linear')));
      const [base, glows] = await Promise.all([page('px', a, 'nearest'), soft]);
      if (!base) return;
      for (const [key, c] of Object.entries(BFX_CLIPS)) {
        if (c.a !== a) continue;
        FRAMES.set(key, Array.from({ length: c.n }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(...bfxRect(c, i)) })));
        const g = c.g;
        const glow = g ? glows[g.a] : null;
        if (g && glow) GLOWS.set(key, Array.from({ length: c.n }, (_, i) => new Texture({ source: glow.source, frame: new Rectangle(...bfxRect(g, i)) })));
      }
    })();
    PAGES.set(a, job);
  }
  return job;
}

/** A clip's frames (empty until its atlas has loaded, or when the pipeline has not made it). Asking for a clip whose atlas has not been
 *  asked for yet starts it loading, so it is there the next time. */
export function bfxFrames(key: string): Texture[] {
  const got = FRAMES.get(key);
  if (got) return got;
  const c = BFX_CLIPS[key];
  if (c && c.a < BFX_PX.length) void need(c.a);
  return [];
}
/** A light clip's glow frames (empty for a hard one, or before its atlas has loaded). */
export const bfxGlows = (key: string): Texture[] => GLOWS.get(key) ?? [];

/** Load the atlases these clips lie in, ahead of their being played (a fight's heroes' ultimates, as it begins). */
export function warmBfx(keys: readonly (string | undefined)[]): Promise<void> {
  const pages = new Set<number>();
  for (const key of keys) {
    const c = key ? BFX_CLIPS[key] : undefined;
    if (c) pages.add(c.a);
  }
  return Promise.all([...pages].map(need)).then(() => undefined);
}

/** Load the atlases every fight may need (the spells, the ground loops), once. */
export function loadBlenderFx(): Promise<void> {
  return Promise.all(BFX_CORE.map(need)).then(() => undefined);
}
