// Duchess the goat, the town's goat and a running joke from Chronos Settlement, as a small canvas of her own that sits on the page:
// beside the fight's panel (she watches from off the board's edge and bleats at a big hit, a boss, or a wipe) and in the
// tavern hall's corner. The camp draws her inside its own scene (camp.ts), with the same behaviour (`render/duchessRules.ts`).
// She never takes a tap except on her own few pixels, and a tap makes her hop once with her "Mehh.". It only draws.

import { loadImage } from './render/loadImage';
import { chewBob, FRAME, goatFrame, hopLift, newGoat, stepGoat, tapGoat, type Goat } from './render/duchessRules';
import { goatSays, type GoatKind } from './quips';
import goatUrl from './art/duchess/goat.png';

const CSS = `
.duchess { position: fixed; z-index: 3; width: 48px; height: 48px; touch-action: manipulation; image-rendering: pixelated; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.duchess[hidden] { display: none; }
.duchess canvas { display: block; width: 48px; height: 48px; image-rendering: pixelated; }
`;

let sheet: HTMLImageElement | null = null;
let loading: Promise<HTMLImageElement> | null = null;
export function goatSheet(): Promise<HTMLImageElement> {
  return (loading ??= loadImage(goatUrl).then((im) => (sheet = im)));
}

export interface GoatSpot {
  /** Where her feet stand on the page: left edge (CSS px) of her box, and the bottom edge. */
  left: number;
  bottom: number;
  /** Which way she faces when she is still. */
  face: 1 | -1;
}

/** A goat on the page. `place` is read each frame (the panel may move) and she stays in her spot, chewing. She hops only when tapped, and speaks when tapped
 *  or when `react` is called. */
export class PageGoat {
  readonly root = document.createElement('div');
  private canvas = document.createElement('canvas');
  private g: Goat;
  private raf = 0;
  private t0 = performance.now();
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private rand = () => Math.random();

  constructor(private place: () => GoatSpot | null) {
    if (!document.getElementById('duchessStyle')) {
      const st = document.createElement('style');
      st.id = 'duchessStyle';
      st.textContent = CSS;
      document.head.append(st);
    }
    this.root.className = 'duchess';
    this.root.hidden = true;
    this.root.setAttribute('role', 'img');
    this.root.setAttribute('aria-label', 'Duchess the goat');
    this.canvas.width = FRAME;
    this.canvas.height = FRAME;
    this.root.append(this.canvas);
    this.g = newGoat(FRAME / 2);
    this.g.face = 1;
    document.body.append(this.root);
    this.root.addEventListener('click', (e) => {
      e.stopPropagation();
      this.tap();
    });
  }

  /** Show her (and run her), or put her away (her loop stops while she is hidden). */
  show(on: boolean): void {
    this.root.hidden = !on;
    if (!on) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    void goatSheet().then(() => {
      if (!this.raf && !this.root.hidden) this.raf = requestAnimationFrame((t) => this.frame(t));
    });
  }

  /** A tap: she hops once and says "Mehh.". */
  tap(): void {
    if (!tapGoat(this.g, performance.now() - this.t0)) return;
    const r = this.root.getBoundingClientRect();
    goatSays('tap', { x: r.left + r.width / 2, y: r.top + 12 });
  }

  /** Something happened (a big hit, a boss, a wipe): she looks up, and now and then says so. */
  react(kind: GoatKind): void {
    if (this.root.hidden) return;
    const r = this.root.getBoundingClientRect();
    goatSays(kind, { x: r.left + r.width / 2, y: r.top + 12 });
  }

  private frame(t: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const spot = this.place();
    this.root.style.visibility = spot ? 'visible' : 'hidden';
    if (!spot) return;
    this.root.style.left = `${spot.left}px`;
    this.root.style.top = `${spot.bottom - 48}px`;
    const now = t - this.t0;
    // (she stays by her spot: she turns now and then, chews, and hops when asked; a hop ends by itself)
    stepGoat(this.g, 16, now, { min: FRAME / 2, max: FRAME / 2, friends: [] }, this.rand, this.reduced);
    if (this.g.mode === 'graze') this.g.face = spot.face;
    const lift = Math.round(hopLift(this.g, now));
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, FRAME, FRAME);
    ctx.imageSmoothingEnabled = false;
    if (sheet) ctx.drawImage(sheet, goatFrame(this.g) * FRAME, 0, FRAME, FRAME, 0, -lift + chewBob(this.g, now, this.reduced), FRAME, FRAME);
  }
}
