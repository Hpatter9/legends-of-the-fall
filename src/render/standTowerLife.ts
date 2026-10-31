// OVERLOOK-STAND: the life of the watchtower on the overlook's left, the Last Stand's place. The tower is painted into the overlook
// itself; this only lights it: its window and doorway breathe with firelight, embers lift off the lamp at its foot, and a few
// crows wheel round its battlements. While the Last Stand is shut the lights are out and the crows keep away.
// Drawn on the camp's canvas in scene pixels (`camp.ts`); the points come from `STAND_TOWER` in `overlookLayout.ts`.
import { STAND_TOWER } from './overlookLayout';

interface Ember {
  x: number;
  y: number;
  vy: number;
  age: number;
  life: number;
  sway: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class TowerLife {
  private embers: Ember[] = [];

  /** Move the embers on (none while shut, or under reduced motion). */
  step(dt: number, w: number, h: number, open: boolean, reduced: boolean): void {
    if (reduced || !open) {
      this.embers = [];
      return;
    }
    const [lx, ly] = STAND_TOWER.lamp;
    if (this.embers.length < 14 && Math.random() < dt / 220) {
      this.embers.push({ x: w * lx + rand(-2, 2), y: h * ly - 3, vy: -rand(8, 20), age: 0, life: rand(1200, 2600), sway: rand(0, 6) });
    }
    for (const e of this.embers) {
      e.age += dt;
      e.y += e.vy * (dt / 1000);
      e.x += Math.sin(e.age / 300 + e.sway) * 3 * (dt / 1000);
    }
    this.embers = this.embers.filter((e) => e.age < e.life);
  }

  /** The glow of the window, the doorway and the lamp, the embers and the crows. `now` is the scene's clock in ms. */
  draw(g: CanvasRenderingContext2D, w: number, h: number, now: number, open: boolean, reduced: boolean): void {
    if (!open) return;
    const t = reduced ? 0 : now;
    // (a slow breath, never off: the light swells and settles, it does not blink)
    const breath = 0.8 + 0.2 * Math.sin(t / 900);
    const lamp = (fx: number, fy: number, r: number, al: number) => {
      const x = w * fx;
      const y = h * fy;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(255, 196, 96, ${al})`);
      rg.addColorStop(0.45, `rgba(255, 140, 50, ${al * 0.45})`);
      rg.addColorStop(1, 'rgba(255, 110, 30, 0)');
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    g.save();
    g.globalCompositeOperation = 'lighter';
    lamp(...STAND_TOWER.window, Math.max(6, w * 0.022), 0.5 * breath);
    lamp(...STAND_TOWER.door, Math.max(7, w * 0.026), 0.42 * (0.85 + 0.15 * Math.sin(t / 1300 + 1)));
    lamp(...STAND_TOWER.lamp, Math.max(9, w * 0.034), 0.5 * (0.85 + 0.15 * Math.sin(t / 700 + 2)));
    for (const e of this.embers) {
      const k = e.age / e.life;
      g.fillStyle = k < 0.35 ? 'rgba(255, 236, 160, 0.95)' : k < 0.7 ? 'rgba(255, 160, 48, 0.85)' : 'rgba(190, 80, 28, 0.6)';
      g.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
    }
    g.restore();
    // (three crows on long slow loops round the battlements; under reduced motion they perch still in the sky by the tower)
    const cx = w * ((STAND_TOWER.left + STAND_TOWER.right) / 2);
    const cy = h * STAND_TOWER.top - 6;
    g.fillStyle = 'rgba(14, 10, 18, 0.85)';
    for (let i = 0; i < 3; i++) {
      const a = t / (2600 + i * 700) + i * 2.1;
      const x = Math.round(cx + Math.cos(a) * (14 + i * 6));
      const y = Math.round(cy - 4 - i * 3 + Math.sin(a * 2) * 4);
      const flap = reduced ? 0 : Math.floor(t / (160 + i * 30)) % 2;
      // (a crow two pixels wide each side, its wings up or level)
      g.fillRect(x, y, 1, 1);
      g.fillRect(x - 2, y - flap, 2, 1);
      g.fillRect(x + 1, y - flap, 2, 1);
    }
  }
}
