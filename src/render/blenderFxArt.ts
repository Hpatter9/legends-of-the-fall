// BLENDER-FX (docs/notes/blender-fx.md): the Blender-rendered effect atlases, cut into each clip's frames. The pixel atlases
// (`fx/blender/px-<n>.webp`) are drawn with hard pixels; the glow atlases (`soft-<n>.webp`) are small and drawn smoothed, which is what makes
// them soft. They load by URL behind the game (build.mjs copies them and lists them in the service worker, so they play offline).
//
// An atlas is only held in the graphics memory once something needs it. The atlases every fight may need (`BFX_CORE`: the king's spells,
// the ground loops) and the glows load up front. The ultimates' are large and many (a strike is the biggest thing in the game), so each
// loads when a fight has a hero whose ultimate is in it (`warmBfx`, as the fight begins), or the first time one of its clips is asked for.
// Until a clip's atlas has loaded, `bfxFrames` is empty and the caller keeps its older look: nothing ever waits on one.
//
// FREEZE-FIX (docs/notes/freeze-fix.md): an atlas drawn for the first time had to be handed to the graphics card in the middle of the
// fight, on the frame of the blow, and the browser decoded the whole picture again to do it (a fifth of a second and more on a phone,
// the page stopped for it); and one not drawn for a minute was taken back, so it happened again and again. So now: each is decoded once,
// off the page's thread (`createImageBitmap`); a fight's atlases are handed over as the fight begins, one at a time with a breath
// between (`bfxUploader`); they are kept for as long as a fight wants them; and those neither this fight nor the last wanted are let go
// (`bfxDrop`), so the memory holds a few fights' worth, never every hero fielded since the game was opened.

import { Rectangle, Texture, type TextureSource } from 'pixi.js';
import { loadImage } from './loadImage';
import { BFX_CLIPS, BFX_CORE, BFX_PX, BFX_SOFT } from './blenderFxData';
import { bfxDrop, bfxRect } from './blenderFxRules';

const FRAMES = new Map<string, Texture[]>();
const GLOWS = new Map<string, Texture[]>();
/** Each atlas's load, once asked for: 'px' pages by their number, the glows together. */
const PAGES = new Map<number, Promise<void>>();
/** The pixel atlases held now, and which of them have been handed to the graphics card. */
const BASES = new Map<number, Texture>();
const UPLOADED = new Set<number>();
let soft: Promise<(Texture | null)[]> | null = null;
/** The atlases the fight going on wants, and those the one before it wanted. */
let wantNow: ReadonlySet<number> = new Set();
let wantBefore: ReadonlySet<number> = new Set();
/** The atlases never let go: those every fight may need, and any other that holds a clip that is not an ultimate's (a spell's, a
 *  ground loop's: asked for at any time, by any fight). */
const ALWAYS: readonly number[] = [...new Set([...BFX_CORE, ...Object.entries(BFX_CLIPS).filter(([key]) => !key.startsWith('ult-')).map(([, c]) => c.a)])];
/** Hands a texture to the graphics card ahead of its first drawing (the page gives its renderer's; none: it goes up when first drawn). */
let uploader: ((s: TextureSource) => void) | null = null;
/** A breath between two atlases handed to the graphics card (ms), so no one frame carries more than one. */
const UPLOAD_GAP_MS = 80;
export function bfxUploader(fn: (s: TextureSource) => void): void {
  uploader = fn;
  // (what has already arrived goes up now, one at a time)
  [...BASES.keys()].forEach((a, i) => setTimeout(() => upload(a), i * UPLOAD_GAP_MS));
}

/** The picture decoded once, off the page's thread, where the browser can; else the ordinary image. */
async function picture(url: string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function' && typeof fetch === 'function') {
    try {
      const res = await fetch(url);
      if (res.ok) return await createImageBitmap(await res.blob());
    } catch {
      /* (no bitmap here: the image element below) */
    }
  }
  return loadImage(url);
}

async function page(name: string, i: number, mode: 'nearest' | 'linear'): Promise<Texture | null> {
  try {
    const base = Texture.from(await picture(`fx/blender/${name}-${i}.webp`));
    base.source.style.scaleMode = mode;
    // (kept on the graphics card while it is held here: taken back only by `drop`, never in the middle of a fight)
    base.source.autoGarbageCollect = false;
    return base;
  } catch (err) {
    console.warn(`blender effects ${name}-${i} did not load`, err);
    return null;
  }
}

/** Hand atlas `a` to the graphics card now, if the page gave a way and it has not gone yet. A fault here is not the fight's: it is
 *  logged, and the atlas goes up when it is first drawn, as before. */
function upload(a: number): void {
  const base = BASES.get(a);
  if (!base || !uploader || UPLOADED.has(a)) return;
  UPLOADED.add(a);
  try {
    uploader(base.source);
  } catch (err) {
    console.warn(`blender effects px-${a} could not be sent ahead`, err);
  }
}

/** Let atlas `a` go: its clips are forgotten (asked for again, it loads again), its texture and its decoded picture freed. */
function drop(a: number): void {
  const base = BASES.get(a);
  if (!base) return;
  BASES.delete(a);
  UPLOADED.delete(a);
  PAGES.delete(a);
  for (const [key, c] of Object.entries(BFX_CLIPS)) {
    if (c.a !== a) continue;
    for (const t of FRAMES.get(key) ?? []) t.destroy(false);
    for (const t of GLOWS.get(key) ?? []) t.destroy(false);
    FRAMES.delete(key);
    GLOWS.delete(key);
  }
  const pic = base.source.resource as { close?: () => void } | null;
  base.destroy(true);
  pic?.close?.();
}

/** Load pixel atlas `a` once and cut the clips that lie in it (and their glows). A failed atlas is left out: its clips keep their older looks. */
function need(a: number): Promise<void> {
  let job = PAGES.get(a);
  if (!job) {
    job = (async () => {
      soft ??= Promise.all(BFX_SOFT.map((_, i) => page('soft', i, 'linear')));
      const [base, glows] = await Promise.all([page('px', a, 'nearest'), soft]);
      if (!base) return;
      BASES.set(a, base);
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
  if (c && c.a < BFX_PX.length) {
    // (asked for outside a fight's own list, a guest's or a summon's: it counts as wanted by this fight, so it is not let go under it)
    if (!wantNow.has(c.a)) wantNow = new Set([...wantNow, c.a]);
    void need(c.a);
  }
  return [];
}
/** A light clip's glow frames (empty for a hard one, or before its atlas has loaded). */
export const bfxGlows = (key: string): Texture[] => GLOWS.get(key) ?? [];

/** Load the atlases these clips lie in, ahead of their being played (a fight's heroes' ultimates, as it begins), and hand each to the
 *  graphics card as it arrives, one at a time. The atlases neither this fight nor the last one wanted are let go. */
export function warmBfx(keys: readonly (string | undefined)[]): Promise<void> {
  const pages = new Set<number>();
  for (const key of keys) {
    const c = key ? BFX_CLIPS[key] : undefined;
    if (c) pages.add(c.a);
  }
  wantBefore = wantNow;
  wantNow = pages;
  for (const a of bfxDrop([...BASES.keys()], wantNow, wantBefore, ALWAYS)) drop(a);
  let line: Promise<void> = Promise.resolve();
  for (const a of pages) {
    const ready = need(a);
    line = line
      .then(() => ready)
      .then(() => {
        if (UPLOADED.has(a) || !BASES.has(a)) return;
        upload(a);
        return new Promise<void>((ok) => setTimeout(ok, UPLOAD_GAP_MS));
      });
  }
  return line;
}

/** Load the atlases every fight may need (the spells, the ground loops), once. */
export function loadBlenderFx(): Promise<void> {
  return Promise.all(BFX_CORE.map(need)).then(() => BFX_CORE.forEach((a, i) => setTimeout(() => upload(a), i * UPLOAD_GAP_MS)));
}
