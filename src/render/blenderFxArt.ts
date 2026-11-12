// BLENDER-FX (docs/notes/blender-fx.md): the Blender-rendered effect atlases, cut into each clip's frames. The pixel atlases
// (`fx/blender/px-<n>.webp`) are drawn with hard pixels; the glow atlases (`soft-<n>.webp`) are small and drawn smoothed, which is what makes
// them soft. They load by URL behind the game (build.mjs copies them and lists them in the service worker, so they play offline).
//
// What is held is kept small, for a phone's sake (`blenderFxBudget.ts` has the rules, and this file only carries them out). The atlases every
// fight may need (`BFX_CORE`: the king's spells, the ground loops) and the glows load up front and stay. The rest (an ultimate's stages, a
// showcase's beats) are small atlases loaded as a fight needs them: two at a time, never past a budget of decoded pixels, the least
// recently used given up first; and taken off the graphics card when too many have been drawn. A load that hangs is given up and tried
// again later. Until a clip's atlas is held, `bfxFrames` is empty and the caller keeps its older look: nothing ever waits on a load.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import { keepReady } from './texReady';
import { BFX_CLIPS, BFX_CORE, BFX_PX, BFX_SOFT } from './blenderFxData';
import { bfxRect } from './blenderFxRules';
import { BFX_MEM, BfxPages } from './blenderFxBudget';

const FRAMES = new Map<string, Texture[]>();
const GLOWS = new Map<string, Texture[]>();
/** The clips that lie in each pixel atlas. */
const IN = new Map<number, string[]>();
for (const [key, c] of Object.entries(BFX_CLIPS)) IN.set(c.a, [...(IN.get(c.a) ?? []), key]);
const CORE = new Set(BFX_CORE);
/** A held atlas: its texture, and its picture when that is one this file may close (a bitmap). */
const HELD = new Map<number, { base: Texture; bitmap: ImageBitmap | null }>();
const book = new BfxPages(
  (a) => (BFX_PX[a]?.[0] ?? 0) * (BFX_PX[a]?.[1] ?? 0),
  (a) => CORE.has(a),
);
let soft: Promise<(Texture | null)[]> | null = null;
let clock: ReturnType<typeof setInterval> | null = null;
const now = (): number => performance.now();
let pumped = 0;

/** A glow atlas (small, smoothed; they load once and stay). */
async function glowPage(i: number): Promise<Texture | null> {
  try {
    // (decoded off the page's own thread, as the pixel atlases are: as a plain image its two million pixels were decoded on the frame
    // it was handed to the graphics card, a stop of some 450 ms on a slow phone; as a bitmap the hand-over is a copy)
    const base = Texture.from(await picture(`fx/blender/soft-${i}.webp`));
    base.source.style.scaleMode = 'linear';
    // (WAVE-DELAY: the glows are drawn in every fight: handed to the graphics card ahead of it, and held there through it)
    keepReady(`bfx-soft-${i}`, base.source);
    return base;
  } catch (err) {
    console.warn(`blender effects soft-${i} did not load`, err);
    return null;
  }
}

/** An atlas's picture, fetched and decoded off the page's own thread where the browser can (a bitmap, which can be closed again to
 *  give its memory back at once); given up after `TIMEOUT_MS`. */
async function picture(url: string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap !== 'function' || typeof fetch !== 'function') return loadImage(url);
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), BFX_MEM.TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: stop.signal });
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return await createImageBitmap(await res.blob());
  } finally {
    clearTimeout(timer);
  }
}

/** Begin atlas `a`'s load. When it is in, its clips are cut (unless the book gave it up meanwhile: then its picture is thrown away). */
function start(a: number): void {
  soft ??= Promise.all(BFX_SOFT.map((_, i) => glowPage(i)));
  void Promise.all([picture(`fx/blender/px-${a}.webp`), soft]).then(
    ([pic, glows]) => {
      if (!book.done(a, true, now())) {
        if ('close' in pic) pic.close();
        return;
      }
      const base = Texture.from(pic);
      base.source.style.scaleMode = 'nearest';
      HELD.set(a, { base, bitmap: 'close' in pic ? pic : null });
      // (WAVE-DELAY: the atlases every fight may need go to the graphics card ahead of the fight, not on a spell's first cast in it)
      if (CORE.has(a)) keepReady(`bfx-px-${a}`, base.source);
      for (const key of IN.get(a) ?? []) {
        const c = BFX_CLIPS[key];
        FRAMES.set(key, Array.from({ length: c.n }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(...bfxRect(c, i)) })));
        const g = c.g;
        const glow = g ? glows[g.a] : null;
        if (g && glow && !GLOWS.has(key)) GLOWS.set(key, Array.from({ length: c.n }, (_, i) => new Texture({ source: glow.source, frame: new Rectangle(...bfxRect(g, i)) })));
      }
      pump();
    },
    (err) => {
      console.warn(`blender effects px-${a} did not load`, err);
      book.done(a, false, now());
      pump();
    },
  );
}

/** Give atlas `a` up altogether: its clips are forgotten (anything still holding one of their frames draws nothing, not a dead texture),
 *  its texture destroyed and its picture closed. It loads again, from the service worker's copy, if asked for. */
function drop(a: number): void {
  const held = HELD.get(a);
  if (!held) return;
  for (const key of IN.get(a) ?? []) {
    for (const t of FRAMES.get(key) ?? []) {
      t.source = Texture.EMPTY.source;
      t.update();
    }
    FRAMES.delete(key);
  }
  HELD.delete(a);
  held.base.destroy(true);
  held.bitmap?.close();
}

/** Carry out what the book says: start loads, give atlases up, take atlases off the graphics card. The clock runs while anything waits. */
function pump(): void {
  pumped = now();
  const act = book.step(now());
  for (const a of act.drop) drop(a);
  for (const a of act.unload) HELD.get(a)?.base.source.unload();
  for (const a of act.start) start(a);
  if (book.busy() && !clock) clock = setInterval(pump, 1000);
  else if (!book.busy() && clock) {
    clearInterval(clock);
    clock = null;
  }
}

/** A clip's frames (empty until its atlas is held, or when the pipeline has not made it). Asking for a clip whose atlas is not held asks
 *  for the atlas, ahead of the others, so it is there the next time. */
export function bfxFrames(key: string): Texture[] {
  const c = BFX_CLIPS[key];
  if (!c || c.a >= BFX_PX.length) return [];
  const t = now();
  const ready = book.use(c.a, t);
  // (the book is looked over when something is missing, and a few times a second otherwise: this is asked many times a frame)
  if (!ready || t - pumped > 250) pump();
  return ready ? (FRAMES.get(key) ?? []) : [];
}
/** A light clip's glow frames (empty for a hard one, or before its atlas has loaded). */
export const bfxGlows = (key: string): Texture[] => GLOWS.get(key) ?? [];

/** Ask for the atlases these clips lie in, ahead of their being played (a fight's heroes' ultimates, as it begins): they load two at a
 *  time, inside the budget. Nothing waits on them. */
export function warmBfx(keys: readonly (string | undefined)[]): void {
  const t = now();
  for (const key of keys) {
    const c = key ? BFX_CLIPS[key] : undefined;
    if (c) book.ask(c.a, t);
  }
  pump();
}

/** Ask for the atlases every fight may need (the spells, the ground loops), once: they are pinned, and stay. */
export function loadBlenderFx(): void {
  const t = now();
  for (const a of BFX_CORE) book.ask(a, t);
  pump();
}

/** What is held now, for a measure (`window.__bfxMem`): atlases, and megabytes decoded and on the graphics card (the fight-loaded ones;
 *  the core and the glows are fixed, beside them). */
export const bfxMem = (): { held: number; decodedMB: number; uploadedMB: number } => ({ held: book.held(), decodedMB: (book.decodedPx() * 4) / 1048576, uploadedMB: (book.uploadedPx() * 4) / 1048576 });
