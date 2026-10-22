// The picture behind the tower's map (`rogue.css`): stone walls that step in as the tower climbs, windows, torches and banners, with sky and
// clouds showing at the edges. All of it is pack art (`src/art/tower/`, cut by `tools/tower-art.py`), laid out once as plain elements at
// whole-number scales, so scrolling costs nothing. The map's geometry (`Layout`) lives here too: the stairs and the nodes sit on it.

import { ACT_ROWS, LANES } from './sim/tower';
import { actLook, type ActLook } from './towerTheme';
import brick1 from './art/tower/brick.png';
import brick2 from './art/tower/brick2.png';
import brick3 from './art/tower/brick3.png';
import windowArt from './art/tower/window.png';
import slit from './art/tower/slit.png';
import torch from './art/tower/torch.png';
import cloudW from './art/tower/cloud_w.png';
import cloudW2 from './art/tower/cloud_w2.png';
import cloudG from './art/tower/cloud_g.png';
import cloudK from './art/tower/cloud_k.png';
import cloudK2 from './art/tower/cloud_k2.png';
import peaks from './art/tower/peaks.png';
import banner from './art/castle/banner.png';

export const BRICKS = [brick1, brick2, brick3];
export const TORCH = torch;

const ROW_H = 84;
const PAD_TOP = 200;
const PAD_BOTTOM = 70;
const BOSS_ROW_H = 40;
const SECTION_ROWS = 2;
/** The tower is this much narrower (each side, as a share of the width) at the boss than at the foot. */
const TAPER = 0.15;
/** The nodes keep this far from the wall's edge (px). */
const SIDE = 34;

/** Where everything of one act's map sits, in whole pixels: the tower is `W` wide and `H` tall, row 0 at the foot and the boss at the top. */
export class Layout {
  readonly H: number;
  /** `rows` is the floors of the map (the tower's `ACT_ROWS`; a calamity's maps are shorter). */
  constructor(
    readonly W: number,
    readonly rows = ACT_ROWS,
  ) {
    this.H = PAD_TOP + (rows - 1) * ROW_H + BOSS_ROW_H + PAD_BOTTOM;
  }

  /** The y of the centre of a row. */
  rowY(row: number): number {
    return this.H - PAD_BOTTOM - row * ROW_H;
  }

  /** The wall section a row is in (two rows to a section, each a step in from the one below). */
  section(row: number): number {
    return Math.floor(row / SECTION_ROWS);
  }

  /** How far the wall is in from each edge at a section. */
  inset(section: number): number {
    return Math.round((this.W * TAPER * section) / this.section(this.rows - 1));
  }

  xAt(lane: number, row: number): number {
    const half = this.W / 2 - this.inset(this.section(row)) - SIDE;
    return Math.round(this.W / 2 + ((lane - (LANES - 1) / 2) / ((LANES - 1) / 2)) * half);
  }

  /** The party's starting spot, below the first floor. */
  start(): { x: number; y: number } {
    return { x: Math.round(this.W / 2), y: this.rowY(0) + 44 };
  }

  /** The y band (top, bottom) of a wall section. */
  band(s: number): [number, number] {
    const top = s >= this.section(this.rows - 1) ? 0 : Math.round(this.rowY(s * SECTION_ROWS + SECTION_ROWS) + ROW_H / 2);
    const bottom = s === 0 ? this.H : Math.round(this.rowY(s * SECTION_ROWS) + ROW_H / 2);
    return [top, bottom];
  }
}

const div = (cls: string, css: Partial<CSSStyleDeclaration> = {}): HTMLDivElement => {
  const d = document.createElement('div');
  d.className = cls;
  Object.assign(d.style, css);
  return d;
};
const px = (n: number) => `${Math.round(n)}px`;

/** A torch on the wall (frames step, never fade), `x` and `y` its centre, `n` to put the flames out of step. */
export function torchEl(x: number, y: number, n: number, lit = true): HTMLElement {
  const t = div(`tbTorch${lit ? '' : ' out'}`, { left: px(x - 48), top: px(y - 48), animationDelay: `-${(n * 0.37) % 0.9}s` });
  t.style.backgroundImage = `url(${torch})`;
  return t;
}

/** The backdrop of an act: sky, clouds, stepped walls, windows, torches and banners, in the pack's own colours. */
export function buildBackdrop(act: number, lay: Layout, look: ActLook = actLook(act)): HTMLElement {
  const root = div(`tbBack look${look.look}`, { width: px(lay.W), height: px(lay.H) });
  if (look.tint) root.style.filter = `hue-rotate(${look.tint}deg)`;
  const sky = div('tbSky');
  root.append(sky);
  const img = (src: string, x: number, y: number, cls = 'tbCloud', scale = 1) => {
    const i = document.createElement('img');
    i.src = src;
    i.className = cls;
    i.alt = '';
    i.draggable = false;
    i.style.left = px(x);
    i.style.top = px(y);
    if (scale !== 1) i.style.zoom = String(scale);
    root.append(i);
    return i;
  };
  const top = lay.section(lay.rows - 1);
  // clouds drifting nowhere: fixed in the sky at the edges, more of them the higher the tower
  if (look.look > 0) {
    const set = look.look === 1 ? [cloudW, cloudW2] : [cloudK, cloudG, cloudK2];
    for (let i = 0; i < 9; i++) {
      const y = 20 + i * ((lay.H * 0.72) / 9) + (i % 2) * 18;
      const left = i % 2 === 0;
      img(set[i % set.length], left ? -150 + ((i * 37) % 60) : lay.W - 70 - ((i * 29) % 60), y);
    }
  }
  if (look.look === 2) {
    const p = img(peaks, Math.round((lay.W - 576) / 2), lay.H - 228 - 40, 'tbPeaks');
    p.style.opacity = '0.9';
  }
  // the walls, a section to each pair of floors, each in from the one below
  const brick = BRICKS[look.look];
  for (let s = 0; s <= top; s++) {
    const [y0, y1] = lay.band(s);
    const inset = lay.inset(s);
    const wall = div('tbWall', { left: px(inset), width: px(lay.W - inset * 2), top: px(y0), height: px(y1 - y0 + 4) });
    wall.style.backgroundImage = `url(${brick})`;
    wall.style.backgroundPosition = `${px(-inset % 32)} ${px(-y0 % 32)}`;
    root.append(wall);
    root.append(div('tbLedge', { left: px(inset - 4), width: px(lay.W - inset * 2 + 8), top: px(y0 - 2) }));
  }
  // the crenellations on top of the keep
  const topInset = lay.inset(top);
  for (let x = topInset - 4; x < lay.W - topInset; x += 24) root.append(div('tbMerlon', { left: px(x), top: px(0) }));
  // windows, torches and banners on the walls between the floors
  let n = 0;
  for (let r = 0; r < lay.rows - 1; r++) {
    const y = (lay.rowY(r) + lay.rowY(r + 1)) / 2;
    const inset = lay.inset(lay.section(r));
    const left = r % 2 === 0;
    const edge = (side: boolean, off: number) => (side ? inset + off : lay.W - inset - off);
    if (r % 3 === 1) {
      const w = img(windowArt, edge(left, 22) - (left ? 0 : 64), y - 48, 'tbWindow', 1);
      w.style.width = '64px';
      w.style.height = '96px';
    } else if (r % 3 === 2 && look.look !== 1) {
      const w = img(slit, edge(!left, 18) - (left ? 0 : 0) - 32, y - 32, 'tbWindow', 1);
      w.style.width = '64px';
      w.style.height = '64px';
    }
    if (r % 2 === 0) root.append(torchEl(edge(!left, 20), y, n++));
    if (look.look === 1 && r % 3 === 0 && r > 0) {
      const b = img(banner, edge(left, 12) - (left ? 0 : 50), y - 70, 'tbBanner');
      b.style.width = '50px';
      b.style.height = '158px';
    }
  }
  root.append(div('tbShade'));
  return root;
}

export { ROW_H, PAD_TOP, PAD_BOTTOM };
