// A hero's sheet shrunk by a whole number so its figure is about a given height in scene pixels (2x2 box averages, hard alpha: it stays pixel
// art), for the scenes that draw heroes small in a fixed pixel scale: the war camp (`camp.ts`) and the Calamity's map (`calMap.ts`).

import { sheetInfo } from './sheets';

export const canvasOf = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/** How tall a hero's figure is drawn, near enough, in scene pixels (the sheet is shrunk by the whole number that comes closest). */
export const HERO_PX = 52;
export interface Small {
  c: HTMLCanvasElement;
  fw: number;
  fh: number;
  counts: Record<string, number>;
  rows: string[];
  facesRight: boolean;
  figure: number;
}
export const ROWS = ['idle', 'walk', 'attack'];

/** The idle, walk and attack rows of a sheet shrunk by a whole number so the figure is about `px` tall. */
export function shrinkRig(rig: NonNullable<ReturnType<typeof sheetInfo>>, px = HERO_PX): Small {
  const n = Math.max(1, Math.round(rig.figure / px));
  // (a tiny figure is drawn twice as big instead, a whole number again)
  const up = n === 1 && rig.figure < px * 0.7 ? 2 : 1;
  const fw = Math.floor(rig.w / n);
  const fh = Math.floor(rig.h / n);
  const rows = ROWS.map((r) => (rig.rows.includes(r) ? r : 'idle'));
  const counts = rows.map((r) => rig.counts[r] ?? 1);
  const src = canvasOf(rig.img.width, rig.img.height);
  const sg = src.getContext('2d', { willReadFrequently: true })!;
  sg.drawImage(rig.img, 0, 0);
  const out = canvasOf(fw * up * Math.max(...counts), fh * up * ROWS.length);
  const og = out.getContext('2d')!;
  rows.forEach((r, ri) => {
    const row = rig.rows.indexOf(r);
    for (let i = 0; i < counts[ri]; i++) {
      const data = sg.getImageData((i % rig.perRow) * rig.w, (row + Math.floor(i / rig.perRow)) * rig.h, rig.w, rig.h).data;
      const dst = og.createImageData(fw, fh);
      for (let oy = 0; oy < fh; oy++)
        for (let ox = 0; ox < fw; ox++) {
          let a = 0;
          let rr = 0;
          let gg = 0;
          let bb = 0;
          for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
              const k = ((oy * n + y) * rig.w + ox * n + x) * 4;
              const al = data[k + 3];
              a += al;
              rr += data[k] * al;
              gg += data[k + 1] * al;
              bb += data[k + 2] * al;
            }
          const o = (oy * fw + ox) * 4;
          if (a >= 255 * n * n * 0.5) {
            dst.data[o] = rr / a;
            dst.data[o + 1] = gg / a;
            dst.data[o + 2] = bb / a;
            dst.data[o + 3] = 255;
          }
        }
      if (up === 1) og.putImageData(dst, i * fw, ri * fh);
      else {
        const tmp = canvasOf(fw, fh);
        tmp.getContext('2d')!.putImageData(dst, 0, 0);
        og.imageSmoothingEnabled = false;
        og.drawImage(tmp, 0, 0, fw, fh, i * fw * up, ri * fh * up, fw * up, fh * up);
      }
    }
  });
  return { c: out, fw: fw * up, fh: fh * up, counts: Object.fromEntries(ROWS.map((r, i) => [r, counts[i]])), rows: ROWS, facesRight: rig.facesRight, figure: Math.round((rig.figure * up) / n) };
}

