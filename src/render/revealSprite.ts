// A menu showcase of the real battle frames: one attack, then idle, with fixed feet and no cropped weapons.
import { sheetInfo } from './sheets';

// (RECAP-REVEAL: `opts.walk` lets an earned hero's arrival, `earnedArrival.ts`, show it walking in first: the walk frames join the
//  crop, and `walk()` loops them until `start`. The summoning reveal does not ask, and is cropped and played as before)
export function revealSprite(sheet: string, reduced: boolean, opts: { walk?: boolean } = {}): { canvas: HTMLCanvasElement; start(attack: boolean): void; stop(): void; walk(): void; facesRight: boolean } {
  const canvas = document.createElement('canvas');
  canvas.className = 'trFigure';
  canvas.setAttribute('aria-hidden', 'true');
  const info = sheetInfo(sheet);
  const g = canvas.getContext('2d')!;
  let raf = 0;
  let started = false;
  const stop = () => { cancelAnimationFrame(raf); };
  if (!info) return { canvas, start() {}, stop, walk() {}, facesRight: true };
  const { img, w, h, perRow, rows, counts, figure, facesRight } = info;
  const hasAttack = rows.includes('attack') && counts.attack > 0;
  const hasWalk = !!opts.walk && rows.includes('walk') && counts.walk > 0;
  const source = (anim: string, frame: number) => ({
    x: (frame % perRow) * w,
    y: (rows.indexOf(anim) + Math.floor(frame / perRow)) * h,
  });
  // Find one crop across both animations, so the attack's reach fits and the figure never jumps between frames.
  canvas.width = w;
  canvas.height = h;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (const anim of [...(hasAttack ? ['idle', 'attack'] : ['idle']), ...(hasWalk ? ['walk'] : [])]) {
    for (let n = 0; n < counts[anim]; n++) {
      const s = source(anim, n);
      g.clearRect(0, 0, w, h);
      g.drawImage(img, s.x, s.y, w, h, 0, 0, w, h);
      const data = g.getImageData(0, 0, w, h).data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] <= 8) continue;
        x0 = Math.min(x0, x); y0 = Math.min(y0, y);
        x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
  }
  if (x0 > x1 || y0 > y1) { x0 = y0 = 0; x1 = w - 1; y1 = h - 1; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  canvas.width = cw + 4;
  canvas.height = ch + 4;
  const scale = Math.min(140 / figure, 285 / canvas.width, 180 / canvas.height);
  canvas.style.width = `${Math.round(canvas.width * scale)}px`;
  canvas.style.height = `${Math.round(canvas.height * scale)}px`;
  g.imageSmoothingEnabled = false;
  let previous = '';
  const draw = (anim: string, frame: number) => {
    const key = `${anim}:${frame}`;
    if (key === previous) return;
    previous = key;
    const s = source(anim, frame);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, s.x + x0, s.y + y0, cw, ch, 2, 2, cw, ch);
    canvas.dataset.anim = anim;
    canvas.dataset.frame = `${frame}`;
  };
  draw('idle', 0);
  return {
    canvas,
    facesRight,
    walk() {
      if (started || !hasWalk || reduced) return;
      const at = performance.now();
      const tick = (now: number) => {
        draw('walk', Math.floor(Math.max(0, now - at) / 110) % counts.walk);
        raf = requestAnimationFrame(tick);
      };
      tick(at);
    },
    start(attack) {
      if (started) return;
      started = true;
      cancelAnimationFrame(raf);
      const at = performance.now();
      const attackMs = attack && hasAttack && !reduced ? 650 : 0;
      const tick = (now: number) => {
        const elapsed = Math.max(0, now - at);
        if (elapsed < attackMs) draw('attack', Math.min(counts.attack - 1, Math.floor(elapsed / attackMs * counts.attack)));
        else draw('idle', reduced ? 0 : Math.floor((elapsed - attackMs) / 160) % counts.idle);
        if (!reduced) raf = requestAnimationFrame(tick);
      };
      tick(at);
    },
    stop,
  };
}
