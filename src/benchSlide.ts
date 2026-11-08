// RUNE-BENCH: the pull bar on the bench's edge (docs/notes/rune-bench.md). Resting on the right, the bench shows the heroes; pulled (or
// tapped) to the left it slides across with the bench under it and lands on the left, and the bench shows the runes; pulled back, the
// heroes. The bar follows the finger, stretches a little past either end, and on letting go springs to where it lands (`gripLanding`),
// overshooting a touch as if it had weight; reduced motion moves it at once. The page sets `body[data-bench]` from `side`.

import { gripLanding, gripProgress, type BenchSide } from './benchSideRules';
import { play } from './render/sound';

export class BenchSlide {
  side: BenchSide = 'heroes';
  private press: { x: number; t: number; pid: number; lastX: number; lastT: number; vx: number; moved: boolean } | null = null;

  constructor(
    /** The bench's window (`#benchView`): the track inside it slides by `--p`, the bar rides it. */
    private readonly view: HTMLElement,
    private readonly grip: HTMLButtonElement,
    /** Told when the bar lands on a new side. */
    private readonly onSide: (s: BenchSide) => void,
  ) {
    grip.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      e.stopPropagation();
      grip.setPointerCapture?.(e.pointerId);
      this.press = { x: e.clientX, t: e.timeStamp, pid: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, vx: 0, moved: false };
      view.classList.add('pulling');
    });
    grip.addEventListener('pointermove', (e) => {
      const p = this.press;
      if (!p || p.pid !== e.pointerId) return;
      const dt = Math.max(1, e.timeStamp - p.lastT);
      // (the speed, smoothed over the last few moves, for a flick)
      p.vx = 0.6 * ((e.clientX - p.lastX) / dt) + 0.4 * p.vx;
      p.lastX = e.clientX;
      p.lastT = e.timeStamp;
      if (Math.abs(e.clientX - p.x) >= 4) p.moved = true;
      this.set(gripProgress(this.side, e.clientX - p.x, this.travel()));
    });
    const end = (e: PointerEvent, cancelled: boolean) => {
      const p = this.press;
      if (!p || p.pid !== e.pointerId) return;
      this.press = null;
      view.classList.remove('pulling');
      const to = cancelled ? this.side : gripLanding(this.side, e.clientX - p.x, this.travel(), e.timeStamp - p.lastT > 80 ? 0 : p.vx);
      this.land(to);
    };
    grip.addEventListener('pointerup', (e) => end(e, false));
    grip.addEventListener('pointercancel', (e) => end(e, true));
    // (the keyboard: Enter or Space flips it, as a tap does; the arrows send it their way)
    grip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.land('runes');
      else if (e.key === 'ArrowRight') this.land('heroes');
      else if (e.key === 'Enter' || e.key === ' ') this.land(this.side === 'heroes' ? 'runes' : 'heroes');
      else return;
      e.preventDefault();
    });
    this.set(0);
  }

  /** The slide's length: the bench's width less the bar's own. */
  private travel(): number {
    return Math.max(1, this.view.clientWidth - this.grip.offsetWidth);
  }

  private set(p: number): void {
    this.view.style.setProperty('--p', p.toFixed(4));
  }

  /** Spring the bar to a side (at once with `quiet`, no sound: a phase change putting the heroes back). */
  land(to: BenchSide, quiet = false): void {
    const changed = to !== this.side;
    this.side = to;
    this.view.classList.toggle('springing', !quiet);
    this.set(to === 'runes' ? 1 : 0);
    this.grip.setAttribute('aria-pressed', String(to === 'runes'));
    if (!quiet) setTimeout(() => this.view.classList.remove('springing'), 420);
    if (changed) {
      if (!quiet) play('tap');
      this.onSide(to);
    }
  }
}
