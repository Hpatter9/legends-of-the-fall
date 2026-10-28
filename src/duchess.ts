// Duchess the goat, the town's goat and a running joke from Chronos Settlement, as a small canvas of her own that sits on the page:
// beside the fight's panel (she watches from off the board's edge and bleats at a big hit, a boss, or a wipe) and in the
// tavern hall's corner. The camp draws her inside its own scene (camp.ts), with the same behaviour (`render/duchessRules.ts`).
// She never takes a tap except on her own few pixels, and a tap makes her hop once with her "Mehh.". It only draws.

import { loadImage } from './render/loadImage';
import { chewBob, FRAME, goatFrame, GOAT_SPEED, hopLift, newGoat, rollVisit, stepGoat, tapGoat, visitAt, VISIT_WALK_MS, type Goat, type Visit } from './render/duchessRules';
import { goatSays, type GoatKind } from './quips';
import goatUrl from './art/duchess/goat.png';
import goatHalfUrl from './art/duchess/goat-half.png';

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
/** Her sheet cut to half size (24-pixel frames), for the tavern, where the room is drawn at twice size and the full sheet made
 *  her as tall as a hero. */
let halfLoading: Promise<HTMLImageElement> | null = null;
export const goatHalfSheet = (): Promise<HTMLImageElement> => (halfLoading ??= loadImage(goatHalfUrl));

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
  /** The visit this fight has in store (null: she stays away), and when the fight was set up. `visits` off: she is always there (the tavern's, the camp's). */
  private plan: Visit | null = null;
  private planned = false;
  private planAt = 0;
  /** Told once a fight, as her visit begins and she starts to walk in (the cinematic of her first turning up). */
  onArrive?: () => void;
  private arrived = false;

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

  /** A fight is set up: she visits one in four or five, wanders in a few seconds on, stays a while and wanders off (`render/duchessRules.ts`). */
  newFight(): void {
    this.planned = true;
    this.arrived = false;
    this.plan = rollVisit(this.rand);
    this.planAt = performance.now();
    this.t0 = performance.now();
    this.g = newGoat(FRAME / 2);
    this.g.face = 1;
  }

  /** Whether she is on the page just now (not away, not still to arrive). */
  private present(): boolean {
    return !this.planned || visitAt(this.plan, performance.now() - this.planAt).phase !== 'away';
  }

  /** Show her (and run her), or put her away (her loop stops while she is hidden). */
  show(on: boolean): void {
    // (coming up from the home screen starts a visit's clock afresh, so it is not spent behind it)
    if (on && this.root.hidden && this.planned) this.planAt = performance.now();
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
    if (this.root.hidden || !this.present()) return;
    const r = this.root.getBoundingClientRect();
    goatSays(kind, { x: r.left + r.width / 2, y: r.top + 12 });
  }

  /** Victory fanfare plays: she hops onto a rock / takes a celebratory hop with a quip. */
  victory(): void {
    if (this.root.hidden || !this.present()) return;
    tapGoat(this.g, performance.now() - this.t0);
    const r = this.root.getBoundingClientRect();
    goatSays('won', { x: r.left + r.width / 2, y: r.top + 12 });
  }

  private frame(t: number): void {
    this.raf = requestAnimationFrame((n) => this.frame(n));
    const spot = this.place();
    const visit = this.planned ? visitAt(this.plan, performance.now() - this.planAt) : { phase: 'here' as const, k: 1 };
    this.root.style.visibility = spot && visit.phase !== 'away' ? 'visible' : 'hidden';
    if (!spot || visit.phase === 'away') return;
    if (this.planned && !this.arrived) {
      this.arrived = true;
      this.onArrive?.();
    }
    // (walking in or out she slides along the page's edge, a whole pixel at a time, her legs going)
    const walking = visit.phase === 'in' || visit.phase === 'out';
    const slide = walking ? Math.round(-(spot.left + 48) * (1 - visit.k)) : 0;
    this.root.style.left = `${spot.left + slide}px`;
    this.root.style.top = `${spot.bottom - 48}px`;
    const now = t - this.t0;
    // (she stays by her spot: she turns now and then, chews, and hops when asked; a hop ends by itself)
    if (walking) {
      this.g.mode = 'walk';
      this.g.face = visit.phase === 'in' ? 1 : -1;
      this.g.steps += GOAT_SPEED * 0.016 * ((spot.left + 48) / ((VISIT_WALK_MS / 1000) * GOAT_SPEED));
    } else {
      if (this.g.mode === 'walk') {
        this.g.mode = 'graze';
        this.g.at = now + 1500;
      }
      stepGoat(this.g, 16, now, { min: FRAME / 2, max: FRAME / 2, friends: [] }, this.rand, this.reduced);
      if (this.g.mode === 'graze') this.g.face = spot.face;
    }
    const lift = Math.round(hopLift(this.g, now));
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, FRAME, FRAME);
    ctx.imageSmoothingEnabled = false;
    if (sheet) ctx.drawImage(sheet, goatFrame(this.g) * FRAME, 0, FRAME, FRAME, 0, -lift + chewBob(this.g, now, this.reduced), FRAME, FRAME);
  }
}
