// The board drawn: each tile a column, its top the Fields tileset's grass (stony cobbles on the high ground) laid onto
// the diamond with tufts, flowers and pebbles, its two sides earth shaded in code, down to a common foot. Boulders and
// bushes are the Fields tileset's own. The column sprite is drawn as in Chronos's raid board (tacticsView.ts
// `column`).

import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { tileAt, type Board, type Tile } from '../sim/board';
import { loadImage } from './loadImage';
import { at, depth, FOOT, HH, TH, TW } from './iso';
import grassUrl from '../art/ground/grass.png';
import cobbleUrl from '../art/ground/cobble.png';
import tuft1 from '../art/ground/tuft1.png';
import tuft2 from '../art/ground/tuft2.png';
import tuft3 from '../art/ground/tuft3.png';
import flower1 from '../art/ground/flower1.png';
import flower3 from '../art/ground/flower3.png';
import pebble1 from '../art/ground/pebble1.png';
import pebble2 from '../art/ground/pebble2.png';
import boulder1 from '../art/ground/boulder1.png';
import boulder2 from '../art/ground/boulder2.png';
import bush1 from '../art/ground/bush1.png';
import bush2 from '../art/ground/bush2.png';

/** From this height up, a tile's top is stony. */
const STONY = 3;

type Mark = 'deploy' | 'hover' | 'bad' | 'chosen' | null;
const MARK_COLOUR: Record<Exclude<Mark, null>, [number, number]> = {
  deploy: [0x4a9cff, 0.28],
  hover: [0xffe066, 0.5],
  bad: [0xff4a4a, 0.4],
  chosen: [0x6dff8a, 0.45],
};

interface Art {
  grass: HTMLImageElement;
  cobble: HTMLImageElement;
  bits: HTMLImageElement[];
  stones: HTMLImageElement[];
  boulders: Texture[];
  bushes: Texture[];
}
let art: Art | null = null;

export async function loadBoardArt(): Promise<void> {
  const all = (urls: string[]) => Promise.all(urls.map(loadImage));
  const [grass, cobble, bits, stones, boulders, bushes] = await Promise.all([loadImage(grassUrl), loadImage(cobbleUrl), all([tuft1, tuft2, tuft3, flower1, tuft2, flower3]), all([pebble1, pebble2]), all([boulder1, boulder2]), all([bush1, bush2])]);
  art = { grass, cobble, bits, stones, boulders: boulders.map((i) => Texture.from(i)), bushes: bushes.map((i) => Texture.from(i)) };
}

export class BoardView {
  readonly root = new Container();
  private marks: Graphics[] = [];
  private board: Board | null = null;

  constructor() {
    this.root.sortableChildren = true;
  }

  /** Build the board's columns (again, for a new board). */
  build(b: Board): void {
    this.board = b;
    for (const c of this.root.removeChildren()) c.destroy({ children: true });
    this.marks = [];
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const t = tileAt(b, u, v)!;
        const [x, y] = at(u, v, t.h);
        const tile = new Container();
        tile.zIndex = depth(u, v);
        const col = new Sprite(this.column(t, u, v));
        col.position.set(x - TW / 2, y - TH / 2);
        tile.addChild(col);
        const mark = new Graphics();
        mark.position.set(x, y);
        tile.addChild(mark);
        this.marks.push(mark);
        if (t.rock && art) {
          const r = new Sprite(art.boulders[t.deco % art.boulders.length]);
          r.anchor.set(0.5, 0.8);
          r.scale.set(1.6);
          r.position.set(x, y);
          tile.addChild(r);
        } else if (t.bush && art) {
          // (a bush grows at the tile's back corner, behind whoever stands there)
          const s = new Sprite(art.bushes[t.deco % art.bushes.length]);
          s.anchor.set(0.5, 0.9);
          s.position.set(x + ((t.deco >> 3) % 2 ? 12 : -12), y - 5);
          tile.addChild(s);
        }
        this.root.addChild(tile);
      }
  }

  /** Light a tile (or clear it). */
  mark(u: number, v: number, kind: Mark): void {
    const b = this.board;
    if (!b) return;
    const g = this.marks[v * b.w + u];
    g.clear();
    if (!kind) return;
    const [col, alpha] = MARK_COLOUR[kind];
    g.poly([0, -TH / 2 + 2, TW / 2 - 3, 0, 0, TH / 2 - 2, -TW / 2 + 3, 0])
      .fill({ color: col, alpha })
      .stroke({ color: col, alpha: Math.min(1, alpha * 2.2), width: 1.5 });
  }

  clearMarks(): void {
    for (const g of this.marks) g.clear();
  }

  /** One tile's column: its top laid on the diamond, its two sides down to the foot. */
  private column(t: Tile, u: number, v: number): Texture {
    const deep = t.h * HH + FOOT;
    const c = document.createElement('canvas');
    c.width = TW;
    c.height = TH + deep;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    const stony = t.h >= STONY;
    const [l, r, lip] = stony ? ['#8a857c', '#6e6a62', '#a39e94'] : ['#8a6642', '#6c4f33', '#7e9a48'];
    const face = (pts: [number, number][], col: string) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
      g.closePath();
      g.fill();
    };
    face([[0, TH / 2], [TW / 2, TH], [TW / 2, TH + deep], [0, TH / 2 + deep]], l);
    face([[TW / 2, TH], [TW, TH / 2], [TW, TH / 2 + deep], [TW / 2, TH + deep]], r);
    // faint lines at each step, and a speckle of stones in the earth
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    g.lineWidth = 1;
    for (let k = HH; k < deep; k += HH) {
      g.beginPath();
      g.moveTo(0, TH / 2 + k);
      g.lineTo(TW / 2, TH + k);
      g.lineTo(TW, TH / 2 + k);
      g.stroke();
    }
    for (let i = 0; i < deep / 3; i++) {
      const sx = ((u * 31 + v * 17 + i * 13) % (TW - 4)) + 2;
      const k = ((u * 7 + v * 5 + i * 29) % Math.max(1, deep - 4)) + 2;
      const y = (sx < TW / 2 ? TH / 2 + sx / 2 : TH - (sx - TW / 2) / 2) + k;
      g.fillStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.16)';
      g.fillRect(sx, y, 2, 1);
    }
    face([[0, TH / 2], [TW / 2, TH], [TW, TH / 2], [TW, TH / 2 + 3], [TW / 2, TH + 3], [0, TH / 2 + 3]], lip);
    // the top: the tile's ground laid onto the diamond, then its tufts and stones
    g.save();
    g.beginPath();
    g.moveTo(TW / 2, 0);
    g.lineTo(TW, TH / 2);
    g.lineTo(TW / 2, TH);
    g.lineTo(0, TH / 2);
    g.closePath();
    g.clip();
    if (art) {
      const a = TW / 64;
      const b = TH / 64;
      g.setTransform(a, b, -a, b, TW / 2, 0);
      g.drawImage(stony ? art.cobble : art.grass, 0, 0, 32, 32, 0, 0, 32, 32);
      g.setTransform(1, 0, 0, 1, 0, 0);
      const bits = stony ? art.stones : art.bits;
      const n = 2 + (t.deco % 3);
      for (let i = 0; i < n; i++) {
        const im = bits[(t.deco + i * 7) % bits.length];
        const px = 14 + ((t.deco * (i + 3) * 13) % (TW - 28));
        const py = 8 + ((t.deco * (i + 5) * 7) % (TH - 16));
        g.drawImage(im, Math.round(px - im.width / 2), Math.round(py - im.height / 2));
      }
    } else {
      g.fillStyle = stony ? '#a39e94' : '#7e9a48';
      g.fillRect(0, 0, TW, TH);
    }
    // (high ground a shade lighter, so the heights read at a glance)
    g.fillStyle = `rgba(255,248,220,${0.03 + t.h * 0.035})`;
    g.fillRect(0, 0, TW, TH);
    g.restore();
    g.strokeStyle = 'rgba(20,14,8,0.35)';
    g.beginPath();
    g.moveTo(TW / 2, 0.5);
    g.lineTo(TW - 0.5, TH / 2);
    g.lineTo(TW / 2, TH - 0.5);
    g.lineTo(0.5, TH / 2);
    g.closePath();
    g.stroke();
    return Texture.from(c);
  }
}
