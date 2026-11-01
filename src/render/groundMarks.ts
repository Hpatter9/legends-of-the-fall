// FIXES-4 (docs/notes/fixes-4.md): the owner's "the tile highlights for a skill should be under the heroes so you can see who is going to be
// hit". A mark on the board (a boss's windup, a land hazard's tell, a burning ground, caltrops, a snare, an aura's reach, a flood) is laid
// on each tile's own ground layer (`BoardView.groundAt`): over the tile's top, under its props and under every fighter, so whoever stands in
// it is drawn over it. A mark over many tiles is a piece on each; `GroundSet` is the one handle an effect fades and drops them by.
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { getFrame, TH, TW } from './iso';
import { turnTile } from '../sim/turn';
import { rimEdges, type Edge, type PatchTile } from './groundRules';

/** Where a tile's ground mark goes: the tile's own ground layer, or (off the board, or a view with no tile layers) a layer of the caller's. */
export type GroundOf = (u: number, v: number) => Container;

/** A tile's diamond, inset by `inset` px from its edge (as the board's own marks are), about (x, y). */
export function tileDiamond(g: Graphics, x: number, y: number, inset = 2): Graphics {
  const ix = inset * 1.5;
  return g.poly([x, y - TH / 2 + inset, x + TW / 2 - ix, y, x, y + TH / 2 - inset, x - TW / 2 + ix, y]);
}

/** One tile of a marked patch: its tint over the whole diamond, a faint line round it, and the bold rim on the edges that bound the patch
 *  (`rimEdges`). Drawn at (x, y), the tile's top's middle in world px. */
export function patchTile(g: Graphics, x: number, y: number, rim: readonly Edge[], o: { colour: number; fill: number; edge?: number; rimColour?: number; width?: number; inset?: number }): Graphics {
  const inset = o.inset ?? 2;
  const ix = inset * 1.5;
  const pts: [number, number][] = [[x, y - TH / 2 + inset], [x + TW / 2 - ix, y], [x, y + TH / 2 - inset], [x - TW / 2 + ix, y]];
  g.poly(pts.flat()).fill({ color: o.colour, alpha: o.fill }).stroke({ color: o.rimColour ?? o.colour, alpha: 0.35 * (o.edge ?? 1), width: 1 });
  if (rim.length) {
    for (const [a, b] of rim) g.moveTo(...pts[a]).lineTo(...pts[b]);
    g.stroke({ color: o.rimColour ?? o.colour, alpha: o.edge ?? 1, width: o.width ?? 2.5, cap: 'round' });
  }
  return g;
}

/** The rims of a patch of the board's tiles (u, v, height), as drawn through the current frame: `rimOf(u, v)` is that tile's rim. */
export function patchRims(tiles: readonly { u: number; v: number; h: number }[]): (u: number, v: number) => Edge[] {
  const f = getFrame();
  const drawn = (u: number, v: number, h: number): PatchTile => {
    const [U, V] = turnTile(f.rot, u, v, f.w, f.d);
    return { U, V, h };
  };
  const patch = tiles.map((t) => drawn(t.u, t.v, t.h));
  return (u, v) => {
    const t = tiles.find((x) => x.u === u && x.v === v);
    return t ? rimEdges(drawn(u, v, t.h), patch) : [];
  };
}

/** Many pieces of one mark, each on its own tile's ground: faded together, dropped together. */
export class GroundSet {
  private pieces: { view: Container; base: number }[] = [];
  private a = 1;
  destroyed = false;

  /** Lay a piece on a ground layer (its own alpha kept as its strength in the set). */
  add<T extends Container>(view: T, layer: Container): T {
    layer.addChild(view);
    this.pieces.push({ view, base: view.alpha });
    view.alpha = view.alpha * this.a;
    return view;
  }

  get alpha(): number {
    return this.a;
  }

  set alpha(v: number) {
    this.a = v;
    for (const p of this.pieces) if (!p.view.destroyed) p.view.alpha = p.base * v;
  }

  /** Every piece still standing (a board rebuilt under it takes its pieces with its tiles). */
  get views(): Container[] {
    return this.pieces.filter((p) => !p.view.destroyed).map((p) => p.view);
  }

  destroy(_o?: unknown): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const p of this.pieces) if (!p.view.destroyed) p.view.destroy({ children: true });
    this.pieces = [];
  }
}

/** A painted ground loop (an aura's ring, a snare, a spell's ground under those it struck) laid on the ground rather than over the
 *  fighters. The board is drawn a diagonal row at a time (`depthIn`: a row's tiles, then whoever stands on them, then the next row nearer),
 *  so the painting is drawn once per row it covers, cut to that row's tile tops and drawn just after them (`BoardView.groundRow`): it lies
 *  on the tops, the fighters on the row are drawn over it, and the nearer rows' columns cover it as they cover the ground. The tiles follow
 *  its centre tile as it moves (an aura goes with its caster). A row's cut is one mask, so a painting over seven rows is seven pieces. */
export class GroundPaint {
  private pieces: { box: Container; sp: Sprite }[] = [];
  private at = '';
  private a = 0;
  destroyed = false;

  /** `tile(u, v)`: a tile's row (its draw depth) and its top's middle, null off the board; `row(depth)`: the layer just over that row's
   *  tiles; `look` sets a copy's anchor, scale and tint. */
  constructor(
    private tile: (u: number, v: number) => { depth: number; x: number; y: number } | null,
    private row: (depth: number) => Container | null,
    private look: (sp: Sprite) => void,
  ) {}

  /** Put the painting at (x, y) in world px with `texture`, covering the tiles up to `reach` across and along from (u, v). */
  place(u: number, v: number, reach: number, x: number, y: number, texture: Texture): void {
    const key = `${u},${v},${reach}`;
    if (key !== this.at) {
      this.drop();
      this.at = key;
      const rows = new Map<number, { x: number; y: number }[]>();
      for (let du = -reach; du <= reach; du++)
        for (let dv = -reach; dv <= reach; dv++) {
          const t = this.tile(u + du, v + dv);
          if (!t) continue;
          const list = rows.get(t.depth) ?? [];
          list.push(t);
          rows.set(t.depth, list);
        }
      for (const [depth, tops] of rows) {
        const layer = this.row(depth);
        if (!layer) continue;
        const box = new Container();
        const mask = new Graphics();
        for (const t of tops) mask.poly([t.x, t.y - TH / 2, t.x + TW / 2, t.y, t.x, t.y + TH / 2, t.x - TW / 2, t.y]);
        mask.fill(0xffffff);
        const sp = new Sprite(texture);
        this.look(sp);
        box.addChild(mask, sp);
        box.mask = mask;
        layer.addChild(box);
        this.pieces.push({ box, sp });
      }
    }
    for (const p of this.pieces) {
      if (p.box.destroyed) continue;
      p.sp.texture = texture;
      p.sp.position.set(x, y);
      p.box.alpha = this.a;
    }
  }

  get alpha(): number {
    return this.a;
  }

  set alpha(v: number) {
    this.a = v;
    for (const p of this.pieces) if (!p.box.destroyed) p.box.alpha = v;
  }

  private drop(): void {
    for (const p of this.pieces) if (!p.box.destroyed) p.box.destroy({ children: true });
    this.pieces = [];
  }

  destroy(_o?: unknown): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.drop();
  }
}

/** How many tiles out from its centre tile a painting `width` world px across reaches (a square of tiles 2R + 1 a side is (2R + 1) * TW
 *  across on the screen). */
export const reachOfWidth = (width: number): number => Math.max(0, Math.ceil((width / TW - 1) / 2));
