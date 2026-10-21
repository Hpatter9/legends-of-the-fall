// The board drawn: each tile a column, its top a detailed grass (cracked flagstones on the high ground) laid onto the
// diamond, its two sides the dark rock face of the Undead tileset, down to a common foot. Boulders and bushes are the
// Fields tileset's own. The column sprite is drawn as in Chronos's raid board (tacticsView.ts
// `column`).

import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { tileAt, type Board, type Tile } from '../sim/board';
import { loadImage } from './loadImage';
import { at, depth, FOOT, HH, TH, TW } from './iso';
import grass1Url from '../art/ground/grass1.png';
import grass2Url from '../art/ground/grass2.png';
import stoneUrl from '../art/ground/stone.png';
import rockUrl from '../art/ground/rock.png';
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

/** The ground textures' side (they are laid onto the diamond whole). */
const SRC = 64;

interface Art {
  grass: HTMLImageElement[];
  stone: HTMLImageElement;
  rock: HTMLImageElement;
  boulders: Texture[];
  bushes: Texture[];
}
let art: Art | null = null;

export async function loadBoardArt(): Promise<void> {
  const all = (urls: string[]) => Promise.all(urls.map(loadImage));
  const [grass, stone, rock, boulders, bushes] = await Promise.all([all([grass1Url, grass2Url]), loadImage(stoneUrl), loadImage(rockUrl), all([boulder1, boulder2]), all([bush1, bush2])]);
  art = { grass, stone, rock, boulders: boulders.map((i) => Texture.from(i)), bushes: bushes.map((i) => Texture.from(i)) };
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
    const lip = stony ? '#a39e94' : '#7e9a48';
    const face = (pts: [number, number][], fill: string | CanvasPattern) => {
      g.fillStyle = fill;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
      g.closePath();
      g.fill();
    };
    // the sides: the rock face tiled down them, the left lit and the right in shade
    const rock = art?.rock;
    const side = (x0: number, x1: number, y0: number, y1: number, shade: string) => {
      g.save();
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.lineTo(x1, y1 + deep);
      g.lineTo(x0, y0 + deep);
      g.closePath();
      if (rock) {
        g.clip();
        const off = ((u * 23 + v * 11) % 5) * 16;
        for (let y = 0; y < TH + deep; y += rock.height)
          for (let x = -off; x < TW; x += rock.width) g.drawImage(rock, x, y);
        g.fillStyle = shade;
        g.fillRect(0, 0, TW, TH + deep);
      } else {
        g.fillStyle = '#6e6a62';
        g.fill();
      }
      g.restore();
    };
    side(0, TW / 2, TH / 2, TH, 'rgba(60,40,20,0.12)');
    side(TW / 2, TW, TH, TH / 2, 'rgba(8,6,14,0.45)');
    // faint lines at each step
    g.strokeStyle = 'rgba(0,0,0,0.2)';
    g.lineWidth = 1;
    for (let k = HH; k < deep; k += HH) {
      g.beginPath();
      g.moveTo(0, TH / 2 + k);
      g.lineTo(TW / 2, TH + k);
      g.lineTo(TW, TH / 2 + k);
      g.stroke();
    }
    face([[0, TH / 2], [TW / 2, TH], [TW, TH / 2], [TW, TH / 2 + 3], [TW / 2, TH + 3], [0, TH / 2 + 3]], lip);
    // the top: the tile's ground laid onto the diamond
    g.save();
    g.beginPath();
    g.moveTo(TW / 2, 0);
    g.lineTo(TW, TH / 2);
    g.lineTo(TW / 2, TH);
    g.lineTo(0, TH / 2);
    g.closePath();
    g.clip();
    if (art) {
      const a = TW / (2 * SRC);
      const b = TH / (2 * SRC);
      g.imageSmoothingEnabled = true;
      g.setTransform(a, b, -a, b, TW / 2, 0);
      g.drawImage(stony ? art.stone : art.grass[(t.deco + u + v) % art.grass.length], 0, 0, SRC, SRC);
      g.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      g.fillStyle = lip;
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
