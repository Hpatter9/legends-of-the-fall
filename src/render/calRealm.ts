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
  /** The bridge of light: its top, its body, its rim and the glow under it. */
  bridge: { top: string; mid: string; rim: string; under: string; glow: string };
}

export const REALMS: readonly Realm[] = [
  { name: 'The Shattered Meadow', sky: ['#0e0722', '#2a1650'], planet: 'tan', planetAt: [0.74, 0.1], nebula: 0, rock: [1.15, 0.95, 0.8], bridge: { top: '#fff6c8', mid: '#ffd36a', rim: '#fffbe6', under: '#6a4a1a', glow: '255, 214, 120' } },
  { name: 'The Crystal Expanse', sky: ['#041626', '#0c3a52'], planet: 'white', planetAt: [0.26, 0.1], nebula: 4, rock: [0.8, 1.0, 1.35], bridge: { top: '#d8ffff', mid: '#6fe6ff', rim: '#f0ffff', under: '#144a66', glow: '110, 230, 255' } },
  { name: 'The Infernal Reach', sky: ['#1a0505', '#44100a'], planet: 'red', planetAt: [0.7, 0.1], nebula: 2, rock: [0.95, 0.55, 0.45], bridge: { top: '#ffe0a0', mid: '#ff8a3a', rim: '#fff0c8', under: '#5a1a0a', glow: '255, 120, 50' } },
  { name: 'The Frozen Star', sky: ['#04102a', '#0f3260'], planet: 'blue', planetAt: [0.3, 0.1], nebula: 3, rock: [0.8, 0.95, 1.25], bridge: { top: '#ffffff', mid: '#b8e8ff', rim: '#ffffff', under: '#2a5a80', glow: '170, 225, 255' } },
  { name: 'The Clockwork Ruin', sky: ['#080c10', '#1c2c30'], planet: 'white', planetAt: [0.78, 0.1], nebula: 5, rock: [0.9, 0.85, 0.75], bridge: { top: '#ffeab0', mid: '#e8a040', rim: '#fff4d0', under: '#4a3010', glow: '255, 190, 90' } },
  { name: 'The Heart of the Rift', sky: ['#05020b', '#2a0a40'], planet: 'red', planetAt: [0.5, 0.09], nebula: 1, rock: [1.0, 0.7, 1.3], bridge: { top: '#ffe0ff', mid: '#ff8af0', rim: '#fff0ff', under: '#4a1060', glow: '255, 120, 240' } },
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

/**
 * The rock hanging under an island of `cells` (diamond centres, each a tile `tw` across and `th` down with `thick` pixels of side): for every column the island covers, rock from
 * the lowest edge of its tiles down to a depth that is greatest in the middle and jags to a point at the sides, with now and then a longer stalactite. The rock face's grey (`tex`,
 * an 80 x 20 picture) is multiplied by the realm's colour, darker with depth and lighter on the left (the light comes from the upper left).
 */
export function drawUnderside(c: CanvasRenderingContext2D, tex: ImageData, cells: { x: number; y: number }[], tw: number, th: number, thick: number, tint: [number, number, number], seed: number): void {
  let xmin = Infinity;
  let xmax = -Infinity;
  for (const k of cells) {
    xmin = Math.min(xmin, k.x - tw / 2);
    xmax = Math.max(xmax, k.x + tw / 2);
  }
  xmin = Math.floor(xmin);
  xmax = Math.ceil(xmax);
  const width = xmax - xmin;
  const edge: number[] = [];
  let ymin = Infinity;
  let ymax = -Infinity;
  for (let x = xmin; x < xmax; x++) {
    let yb = -Infinity;
    for (const k of cells) {
      const d = Math.abs(x + 0.5 - k.x);
      if (d <= tw / 2) yb = Math.max(yb, k.y + (th / 2) * (1 - (2 * d) / tw) + thick);
    }
    edge.push(yb);
    if (yb > -Infinity) {
      ymin = Math.min(ymin, yb);
      ymax = Math.max(ymax, yb);
    }
  }
  const dmax = Math.max(34, Math.min(96, width * 0.55));
  const h = Math.ceil(ymax - ymin + dmax + 14);
  const img = new ImageData(width, h);
  const rnd = (n: number) => {
    let v = (n * 374761393 + seed * 668265263) | 0;
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < width; i++) {
    const yb = edge[i];
    if (yb === -Infinity) continue;
    const t = Math.abs(i + 0.5 - width / 2) / (width / 2);
    const bell = Math.pow(Math.max(0, 1 - Math.pow(t, 1.6)), 0.85);
    // (coarse jags, and a stalactite now and then)
    const jag = (rnd(Math.floor(i / 3)) - 0.5) * 8 + (rnd(Math.floor(i / 7) + 977) > 0.8 ? 10 + rnd(i + 31) * 8 : 0);
    const depth = Math.max(3, dmax * bell + jag * (0.4 + 0.6 * bell));
    const y0 = Math.floor(yb - ymin);
    for (let y = 0; y < depth; y++) {
      const ty = ((y % 20) + 20) % 20;
      const tx = (i + Math.floor(rnd(Math.floor(y / 20) + 5) * 80)) % 80;
      const o = (ty * 80 + tx) * 4;
      const lum = (tex.data[o] * 0.3 + tex.data[o + 1] * 0.59 + tex.data[o + 2] * 0.11) / 255;
      const fall = 1 - 0.62 * (y / depth);
      const lit = i < width / 2 ? 1.12 : 0.88;
      const base = (0.35 + 0.95 * lum) * fall * lit * (y < 2 ? 0.6 : 1);
      const crack = rnd(i * 131 + y) > 0.965 ? 0.7 : 1;
      const p = ((y0 + y) * width + i) * 4;
      img.data[p] = Math.min(255, 150 * tint[0] * base * crack);
      img.data[p + 1] = Math.min(255, 150 * tint[1] * base * crack);
      img.data[p + 2] = Math.min(255, 150 * tint[2] * base * crack);
      img.data[p + 3] = 255;
    }
  }
  const tmp = document.createElement('canvas');
  tmp.width = width;
  tmp.height = h;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  c.drawImage(tmp, xmin, Math.round(ymin));
}
