// EIDOLON-BLENDER (docs/notes/eidolon-blender.md): a frame sheet laid on the board's ground, under every fighter. Two shapes:
//
// - `GroundSheet`: one large picture over many tiles (an Eidolon's sigil). As `GroundPaint` does (`groundMarks.ts`), it is drawn once for
//   each diagonal row of tiles it covers, cut to that row's tile tops (as shapes: `groundCutRules.ts`) and drawn just after them, so the
//   fighters on the row stand over it and the nearer rows' columns cover it as they cover the ground. Unlike it, tiles of another height
//   take their own copy, moved up or down by their height, so the picture follows a hill or a pit instead of floating over it.
// - `groundDecal`: one small picture on one tile's own ground layer (a patch of scorched ground).
//
// The frames are the heroes' pixels (`STAGE_PX` of the board's), drawn unsmoothed. Only the page's renderer uses this; the rules of what
// plays when are `eidolonStage.ts`.
import { Assets, Container, Mesh, MeshGeometry, Rectangle, Sprite, Texture } from 'pixi.js';
import { HH, TH, TW } from './iso';
import { frameAt, STAGE_PX, stageUrl, type StageSheet } from '../eidolonStage';
import { rowShapes } from './groundCutRules';
import { keepReady } from './texReady';

const loaded = new Map<string, Texture[]>();
const loading = new Map<string, Promise<void>>();

/** Load a sheet and cut its frames (asked for as a fight is armed, so the call never waits on it). */
export function loadGroundSheet(s: StageSheet): Promise<void> {
  const had = loading.get(s.sheet);
  if (had) return had;
  const job = Assets.load<Texture>(stageUrl(s))
    .then((base) => {
      base.source.scaleMode = 'nearest';
      // (EIDOLON-SMOOTH: handed to the graphics card ahead of the fight and held there through it, not on the frame the sigil first shows)
      keepReady(`eidolon-ground-${s.sheet}`, base.source);
      loaded.set(s.sheet, Array.from({ length: s.n }, (_, i) => {
        const { x, y } = frameAt(s, i);
        return new Texture({ source: base.source, frame: new Rectangle(x, y, s.fw, s.fh) });
      }));
    })
    .catch(() => undefined);
  loading.set(s.sheet, job);
  return job;
}

/** A sheet's frames, or null while it has not loaded (the piece is then left out: the call plays on without it). */
export const groundFrames = (s: StageSheet): Texture[] | null => loaded.get(s.sheet) ?? null;

/** A tile under a ground sheet: its row (draw depth), its top's middle in world px, and its height in steps. */
export interface GroundTile {
  depth: number;
  x: number;
  y: number;
  h: number;
}

export class GroundSheet {
  private pieces: Mesh[] = [];
  destroyed = false;

  /** Lay the sheet with its ground point at (x, y) in world px, on ground `h` steps high, over `tiles`; `row(depth)` is the layer just
   *  over that row's tiles. */
  constructor(sheet: StageSheet, private frames: Texture[], tiles: readonly GroundTile[], x: number, y: number, h: number, row: (depth: number) => Container | null) {
    const groups = new Map<string, GroundTile[]>();
    for (const t of tiles) {
      const key = `${t.depth}:${t.h}`;
      const list = groups.get(key) ?? [];
      list.push(t);
      groups.set(key, list);
    }
    for (const tops of groups.values()) {
      const layer = row(tops[0].depth);
      if (!layer) continue;
      // (a tile standing higher is drawn higher up the screen: its copy of the picture goes with it)
      const py = y - (tops[0].h - h) * HH;
      const box = { left: x - (sheet.fw * STAGE_PX) / 2, top: py - sheet.foot * STAGE_PX, w: sheet.fw * STAGE_PX, h: sheet.fh * STAGE_PX };
      // (EIDOLON-SMOOTH: the row's tile tops as shapes carrying the picture's own parts, a little over each top so no seam shows between
      //  two rows' copies: one plain drawing a row, where a mask for every row was a stencil pass each, every frame: `groundCutRules.ts`)
      const cut = rowShapes(tops, TW, TH, box);
      if (!cut.indices.length) continue;
      const mesh = new Mesh({ geometry: new MeshGeometry({ positions: new Float32Array(cut.positions), uvs: new Float32Array(cut.uvs), indices: new Uint32Array(cut.indices) }), texture: frames[0] });
      layer.addChild(mesh);
      this.pieces.push(mesh);
    }
  }

  /** Show frame `i`, `alpha` solid. */
  show(i: number, alpha = 1): void {
    const tex = this.frames[Math.max(0, Math.min(this.frames.length - 1, i))];
    for (const p of this.pieces) {
      if (p.destroyed) continue;
      if (p.texture !== tex) p.texture = tex;
      p.alpha = alpha;
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const p of this.pieces) if (!p.destroyed) p.destroy();
    this.pieces = [];
  }
}

/** One frame-sheet picture on a tile's own ground layer, its ground point at (x, y) in world px. */
export function groundDecal(s: StageSheet, frames: Texture[], layer: Container, x: number, y: number, flip = false): Sprite {
  const sp = new Sprite(frames[0]);
  sp.anchor.set(0.5, s.foot / s.fh);
  sp.scale.set(flip ? -STAGE_PX : STAGE_PX, STAGE_PX);
  sp.position.set(x, y);
  layer.addChild(sp);
  return sp;
}
