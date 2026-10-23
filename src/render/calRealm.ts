// The Calamity's six realms of the void: the colours each map's sky, rock, bridges and mist take, and the small pixel drawing the islands and bridges need
// (a hanging underside made from the Undead Tileset's rock face, a stepping slab of light). Nothing here touches the page or the run.

export interface Realm {
  name: string;
  /** The void's sky, top and bottom (css colours), the moon in it, where it hangs (shares of the sky's width and of the land's height) and the nebula that drifts. */
  sky: [string, string];
  planet: 'white' | 'tan' | 'red' | 'blue';
  planetAt: [number, number];
  nebula: number;
  /** The rock under an island: what the rock face's grey is multiplied by, and how dark it grows. */
  rock: [number, number, number];
  /** The earth lip under an island's ground (rgb). */
  soil: [number, number, number];
  /** The bridge of light: its top, its body, its rim and the glow under it. */
  bridge: { top: string; mid: string; rim: string; under: string; glow: string };
}

export const REALMS: readonly Realm[] = [
  { name: 'The Shattered Meadow', soil: [104, 72, 42], sky: ['#0e0722', '#2a1650'], planet: 'tan', planetAt: [0.74, 0.1], nebula: 0, rock: [1.15, 0.95, 0.8], bridge: { top: '#fff6c8', mid: '#ffd36a', rim: '#fffbe6', under: '#6a4a1a', glow: '255, 214, 120' } },
  { name: 'The Crystal Expanse', soil: [58, 70, 108], sky: ['#041626', '#0c3a52'], planet: 'white', planetAt: [0.26, 0.1], nebula: 4, rock: [0.8, 1.0, 1.35], bridge: { top: '#d8ffff', mid: '#6fe6ff', rim: '#f0ffff', under: '#144a66', glow: '110, 230, 255' } },
  { name: 'The Infernal Reach', soil: [78, 36, 26], sky: ['#1a0505', '#44100a'], planet: 'red', planetAt: [0.7, 0.1], nebula: 2, rock: [0.95, 0.55, 0.45], bridge: { top: '#ffe0a0', mid: '#ff8a3a', rim: '#fff0c8', under: '#5a1a0a', glow: '255, 120, 50' } },
  { name: 'The Frozen Star', soil: [150, 180, 205], sky: ['#04102a', '#0f3260'], planet: 'blue', planetAt: [0.3, 0.1], nebula: 3, rock: [0.8, 0.95, 1.25], bridge: { top: '#ffffff', mid: '#b8e8ff', rim: '#ffffff', under: '#2a5a80', glow: '170, 225, 255' } },
  { name: 'The Clockwork Ruin', soil: [96, 86, 74], sky: ['#080c10', '#1c2c30'], planet: 'white', planetAt: [0.78, 0.1], nebula: 5, rock: [0.9, 0.85, 0.75], bridge: { top: '#ffeab0', mid: '#e8a040', rim: '#fff4d0', under: '#4a3010', glow: '255, 190, 90' } },
  { name: 'The Heart of the Rift', soil: [70, 42, 100], sky: ['#05020b', '#2a0a40'], planet: 'red', planetAt: [0.5, 0.09], nebula: 1, rock: [1.0, 0.7, 1.3], bridge: { top: '#ffe0ff', mid: '#ff8af0', rim: '#fff0ff', under: '#4a1060', glow: '255, 120, 240' } },
];

/** A 2:1 diamond `w` across and `h` down centred on (cx, cy), one pixel row at a time (it stays pixel art): `colour(row, rows)` gives each row's colour. */
export function diamondRows(c: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, colour: (row: number, rows: number) => string): void {
  for (let r = 0; r < h; r++) {
    const u = Math.abs(r + 0.5 - h / 2) / (h / 2);
    const hw = Math.max(1, Math.round((w / 2) * (1 - u)));
    c.fillStyle = colour(r, h);
    c.fillRect(Math.round(cx - hw), Math.round(cy - h / 2) + r, hw * 2, 1);
  }
}

const mix = (a: string, b: string, t: number): string => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};

/** One stone of a bridge: a small floating rune tile, a diamond about 22 across, dim and tinted to the realm (a dark body, a muted lit top and one faint rune pixel pair), so the islands stay the brightest things. */
export function drawStone(c: CanvasRenderingContext2D, cx: number, cy: number, b: Realm['bridge'], shade: number): void {
  const w = 22;
  const h = 12;
  diamondRows(c, cx, cy + 3, w, h, (r, n) => (r > n * 0.4 ? b.under : 'rgba(0,0,0,0)'));
  diamondRows(c, cx, cy, w, h, () => b.under);
  const top = mix(b.under, b.mid, 0.5);
  const lit = mix(b.under, b.mid, 0.7);
  diamondRows(c, cx, cy, w - 4, h - 3, (r, n) => (r < n * 0.5 ? lit : top));
  // (a rune: two lit pixels, the realm's own light)
  c.fillStyle = b.top;
  c.globalAlpha = 0.7;
  c.fillRect(Math.round(cx) - 1, Math.round(cy) - 1 + (shade > 0.5 ? 0 : 1), 2, 1);
  c.globalAlpha = 1;
}

const rndOf = (seed: number) => (n: number): number => {
  let v = (n * 374761393 + seed * 668265263) | 0;
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
};
const rgb = (c: [number, number, number], k = 1, a = 1): string => `rgba(${Math.min(255, Math.round(c[0] * k))},${Math.min(255, Math.round(c[1] * k))},${Math.min(255, Math.round(c[2] * k))},${a})`;

export interface IslandSpec {
  cx: number;
  cy: number;
  /** The width and height of the island's top (an iso circle: ry is about 0.56 rx), and how far the rock hangs under it. */
  rx: number;
  ry: number;
  depth: number;
  seed: number;
  realm: number;
}

/** The irregular, rounded outline of an island's top: an ellipse whose radius wobbles with a few seeded waves (so each island has its own silhouette). */
export function outlineOf(sp: IslandSpec): { x: number; y: number }[] {
  const r = rndOf(sp.seed);
  const ph = [r(1) * 6.283, r(2) * 6.283, r(3) * 6.283, r(4) * 6.283];
  const amp = [0.1 + r(5) * 0.05, 0.06 + r(6) * 0.04, 0.04 + r(7) * 0.03, 0.025];
  const out: { x: number; y: number }[] = [];
  const n = 64;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const m = 1 + amp[0] * Math.sin(2 * t + ph[0]) + amp[1] * Math.sin(3 * t + ph[1]) + amp[2] * Math.sin(5 * t + ph[2]) + amp[3] * Math.sin(7 * t + ph[3]);
    out.push({ x: sp.cx + Math.cos(t) * sp.rx * m, y: sp.cy + Math.sin(t) * sp.ry * m });
  }
  return out;
}

/**
 * A floating island: the ground of its top (painted by `paintTop` into a canvas the size of the island, then cut to the outline), a lip of earth along its front, and under it a craggy
 * root of the Undead Tileset's rock face (`tex`, 80 x 20) tapering to a point with a prong or two, hung with what the realm grows there: roots and leaves, crystals, icicles, glowing cracks,
 * chains. No straight sides: the underside narrows from the outline's own lower edge.
 */
export function drawIsland(c: CanvasRenderingContext2D, tex: ImageData, sp: IslandSpec, paintTop: (g: CanvasRenderingContext2D, w: number, h: number) => void): void {
  const realm = REALMS[sp.realm];
  const r = rndOf(sp.seed + 91);
  const pts = outlineOf(sp);
  const pad = 14;
  const w = Math.ceil(sp.rx * 2.4) + pad * 2;
  const top = Math.ceil(sp.ry * 1.5) + pad;
  const h = top + Math.ceil(sp.depth) + 40;
  const ox = sp.cx - w / 2;
  const oy = sp.cy - top;
  // (the outline as a path, in the island canvas's own coordinates)
  const path = new Path2D();
  pts.forEach((p, i) => (i ? path.lineTo(p.x - ox, p.y - oy) : path.moveTo(p.x - ox, p.y - oy)));
  path.closePath();
  // (where the outline ends at the bottom of each column)
  const m = document.createElement('canvas');
  m.width = w;
  m.height = h;
  const mg = m.getContext('2d', { willReadFrequently: true })!;
  mg.fill(path);
  const mask = mg.getImageData(0, 0, w, h).data;
  const bottom: number[] = [];
  for (let x = 0; x < w; x++) {
    let yb = -1;
    for (let y = h - 1; y >= 0; y--) if (mask[(y * w + x) * 4 + 3] > 128) {
      yb = y + 1;
      break;
    }
    bottom.push(yb);
  }
  const xs = bottom.map((v, x) => (v > 0 ? x : -1)).filter((x) => x >= 0);
  const x0 = xs[0];
  const x1 = xs[xs.length - 1];
  const mid = (x0 + x1) / 2;
  const half = (x1 - x0) / 2 || 1;
  // ---- under the ground: the lip of earth, then the rock root ----
  const u = document.createElement('canvas');
  u.width = w;
  u.height = h;
  const ug = u.getContext('2d')!;
  const img = ug.createImageData(w, h);
  const put = (x: number, y: number, col: [number, number, number], k: number, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4;
    img.data[o] = Math.min(255, col[0] * k);
    img.data[o + 1] = Math.min(255, col[1] * k);
    img.data[o + 2] = Math.min(255, col[2] * k);
    img.data[o + 3] = a;
  };
  // (two prongs besides the main point, at seeded places)
  const prongs = [0.35 + r(1) * 0.2, -(0.35 + r(2) * 0.2)];
  const lip = 5;
  const D = sp.depth;
  const tips: { x: number; y: number }[] = [];
  const depthAt = new Array<number>(w).fill(0);
  for (let x = x0; x <= x1; x++) {
    const t = (x - mid) / half;
    const at = Math.abs(t);
    let d = D * Math.pow(Math.max(0, 1 - Math.pow(at, 1.25)), 1.55);
    for (const pr of prongs) d += D * 0.32 * Math.exp(-Math.pow((t - pr) / 0.13, 2));
    d += (r(Math.floor(x / 3)) - 0.5) * 7 * (1 - at) + (r(Math.floor(x / 8) + 700) > 0.82 ? 5 + r(x) * 6 : 0);
    depthAt[x] = Math.max(2, d);
  }
  for (let x = x0; x <= x1; x++) {
    const yb = bottom[x];
    if (yb < 0) continue;
    const tx = x - x0;
    for (let y = 0; y < lip; y++) put(x, yb + y, realm.soil, y === 0 ? 1.15 : 0.9 - y * 0.06);
    const dep = depthAt[x];
    for (let y = 0; y < dep; y++) {
      const ty = ((y % 20) + 20) % 20;
      const txx = (tx + Math.floor(r(Math.floor(y / 20) + 5) * 80)) % 80;
      const o = (ty * 80 + txx) * 4;
      const lum = (tex.data[o] * 0.3 + tex.data[o + 1] * 0.59 + tex.data[o + 2] * 0.11) / 255;
      const fall = 1 - 0.6 * (y / dep);
      const lit = x < mid ? 1.14 : 0.86;
      const crack = r(x * 131 + y) > 0.968 ? 0.7 : 1;
      const base = (0.35 + 0.95 * lum) * fall * lit * crack;
      put(x, yb + lip + y, [150 * realm.rock[0], 150 * realm.rock[1], 150 * realm.rock[2]], base);
    }
    if (x > x0 + 2 && x < x1 - 2 && depthAt[x] > depthAt[x - 1] && depthAt[x] >= depthAt[x + 1] && depthAt[x] > D * 0.3) tips.push({ x, y: yb + lip + depthAt[x] });
  }
  ug.putImageData(img, 0, 0);
  // ---- what the realm grows under it ----
  ug.lineWidth = 1;
  const pick = (n: number) => bottom.filter((v) => v > 0).length ? x0 + Math.floor(r(n) * (x1 - x0)) : x0;
  if (sp.realm === 0 || sp.realm === 4) {
    // roots (meadow: with leaves) or chains (clockwork) dangling from the lip
    for (let k = 0; k < 4; k++) {
      const x = pick(10 + k);
      const y = bottom[x] + lip + depthAt[x] * 0.3;
      const len = 12 + r(20 + k) * 18;
      ug.strokeStyle = sp.realm === 0 ? 'rgba(70,44,26,0.95)' : 'rgba(40,36,34,0.95)';
      for (let i = 0; i < len; i++) {
        const sway = Math.round(Math.sin(i * 0.5 + k) * 1.4);
        if (sp.realm === 4 && i % 3 === 0) {
          ug.fillStyle = 'rgba(150,130,100,0.95)';
          ug.fillRect(x + sway - 1, y + i, 3, 2);
        } else {
          ug.fillStyle = sp.realm === 0 ? 'rgba(72,46,28,0.95)' : 'rgba(46,42,40,0.95)';
          ug.fillRect(x + sway, y + i, 1, 1);
        }
        if (sp.realm === 0 && i > len - 6 && i % 2 === 0) {
          ug.fillStyle = 'rgba(96,150,60,0.95)';
          ug.fillRect(x + sway + 1, y + i, 2, 1);
        }
      }
    }
  } else {
    // crystals (crystal, rift), icicles (frozen), glowing cracks (infernal): points from the lip and the tips
    const shard = (x: number, y: number, len: number, wid: number, col: string, hi: string) => {
      for (let i = 0; i < len; i++) {
        const ww = Math.max(1, Math.round(wid * (1 - i / len)));
        ug.fillStyle = col;
        ug.fillRect(Math.round(x - ww / 2), Math.round(y + i), ww, 1);
        ug.fillStyle = hi;
        ug.fillRect(Math.round(x - ww / 2), Math.round(y + i), 1, 1);
      }
    };
    const n = sp.realm === 3 ? 7 : sp.realm === 2 ? 0 : 5;
    for (let k = 0; k < n; k++) {
      const x = pick(30 + k);
      const y = bottom[x] + lip - 1;
      if (sp.realm === 3) shard(x, y, 6 + r(50 + k) * 12, 3, 'rgba(190,232,255,0.95)', 'rgba(255,255,255,0.95)');
      else shard(x, y + depthAt[x] * (0.3 + r(60 + k) * 0.4), 6 + r(70 + k) * 10, 4, sp.realm === 1 ? 'rgba(100,225,255,0.95)' : 'rgba(210,120,255,0.95)', 'rgba(240,255,255,0.95)');
    }
    if (sp.realm === 2 || sp.realm === 5) {
      // glowing cracks down the rock
      ug.fillStyle = sp.realm === 2 ? 'rgba(255,140,50,0.95)' : 'rgba(230,110,255,0.95)';
      for (let k = 0; k < 3; k++) {
        let x = pick(80 + k);
        let y = bottom[x] + lip + 3;
        const len = depthAt[x] * (0.5 + r(90 + k) * 0.4);
        for (let i = 0; i < len; i++) {
          x += Math.round((r(i * 7 + k) - 0.5) * 2.2);
          ug.fillRect(x, y + i, 1, 1);
        }
      }
    }
  }
  // ---- the ground on top, cut to the outline, with a lit rim ----
  const t = document.createElement('canvas');
  t.width = w;
  t.height = h;
  const tg = t.getContext('2d')!;
  tg.imageSmoothingEnabled = false;
  paintTop(tg, sp.cx - ox, sp.cy - oy);
  tg.globalCompositeOperation = 'destination-in';
  tg.fill(path);
  tg.globalCompositeOperation = 'source-over';
  tg.lineWidth = 1;
  tg.strokeStyle = 'rgba(255,255,255,0.22)';
  tg.stroke(path);
  c.drawImage(u, Math.round(ox), Math.round(oy));
  c.drawImage(t, Math.round(ox), Math.round(oy));
  void tips;
}

/** A small piece of rock drifting near an island: an irregular polygon, lit on its left, darker below. */
export function drawChunk(c: CanvasRenderingContext2D, x: number, y: number, size: number, tint: [number, number, number], seed: number): void {
  const r = rndOf(seed);
  const n = 6;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + r(i) * 0.4;
    const k = 0.7 + r(i + 9) * 0.5;
    pts.push({ x: x + Math.cos(t) * size * k, y: y + Math.sin(t) * size * 0.6 * k });
  }
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(Math.round(p.x), Math.round(p.y)) : c.moveTo(Math.round(p.x), Math.round(p.y))));
  c.closePath();
  c.fillStyle = rgb(tint, 0.62);
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = rgb(tint, 0.95);
  c.fillRect(x - size * 1.3, y - size, size * 1.3, size * 0.9);
  c.fillStyle = rgb(tint, 0.4);
  c.fillRect(x - size * 1.3, y + size * 0.15, size * 2.6, size);
  c.restore();
}
