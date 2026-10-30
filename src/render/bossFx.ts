// BOSS-BIG (docs/notes/boss-big-attacks.md, the rules in `bossBigRules.ts`): a boss's signature attack on the board. As it winds up its
// tiles are marked in red, each mark filling in from the middle over the windup (the fight's own time), with the attack's name over them;
// as it lands the marks go and the blow plays at the ultimate's size (`Fx.ultImpact`: the element's painted burst on a few spots, its
// nova and ring), with the element's wave on every struck tile, a short hit-stop and a hard shake. A boss that falls first takes its
// marks with it. The renderer only: it never changes the battle.

import { Container, Graphics } from 'pixi.js';
import { tileAt } from '../sim/board';
import type { Battle, BattleEvent } from '../sim/battle';
import { at, TH, TW } from './iso';
import { bits, packKey, type Element } from './fxRules';
import { play } from './combatFx';
import type { Particles } from './particles';
import { settings } from '../settings';
import { BOSS_BIG_LOOK, burstTiles, markLook } from '../bossBigRules';

type Sig = Extract<BattleEvent, { kind: 'bossSig' }>;

/** What the board's effects lend the marks and the blow. */
export interface BossFxHost {
  root: Container;
  particles: Particles;
  calm(): boolean;
  /** A line of words over the board (the fight's own labels). */
  label(text: string, x: number, y: number, fill: number, size: number, life: number): void;
  /** The ultimate's blow on these spots (ULT-EPIC). */
  impact(b: Battle, el: Element, spots: { u: number; v: number }[]): void;
  /** The hit-stop and the shake. */
  stop(ms: number): void;
  shake(level: number): void;
}

interface Marks {
  view: Container;
  tiles: Graphics[];
  t: number;
  ms: number;
}

export class BossFx {
  private marks = new Map<number, Marks>();

  constructor(private host: BossFxHost) {}

  show(b: Battle, e: Sig): void {
    if (e.phase === 'warn') return this.warn(b, e);
    this.drop(e.n);
    if (e.phase === 'land') this.land(b, e);
  }

  /** Every frame of the fight's effects (`dt` of the fight's time). */
  step(dt: number): void {
    const calm = this.host.calm();
    for (const m of this.marks.values()) {
      m.t += dt;
      const look = markLook(m.t, m.ms, calm);
      for (const g of m.tiles) {
        const inner = g.children[0] as Graphics;
        inner.scale.set(look.size);
        inner.alpha = look.fill / BOSS_BIG_LOOK.FILL_TO;
        g.alpha = look.edge;
      }
    }
  }

  clear(): void {
    for (const n of [...this.marks.keys()]) this.drop(n);
  }

  private drop(n: number): void {
    const m = this.marks.get(n);
    if (!m) return;
    m.view.destroy({ children: true });
    this.marks.delete(n);
  }

  private warn(b: Battle, e: Sig): void {
    this.drop(e.n);
    const view = new Container();
    this.host.root.addChildAt(view, 0);
    const tiles: Graphics[] = [];
    const w = b.board.w;
    const spots: [number, number][] = [];
    const diamond = (g: Graphics, k: number) => g.poly([0, (-TH / 2 + 2) * k, (TW / 2 - 3) * k, 0, 0, (TH / 2 - 2) * k, (-TW / 2 + 3) * k, 0]);
    for (const i of e.tiles) {
      const u = i % w;
      const v = Math.floor(i / w);
      const [x, y] = at(u, v, tileAt(b.board, u, v)?.h ?? 0);
      spots.push([x, y]);
      // (a dark red ground under a bright edge; the fill grows from the middle as the blow comes)
      const g = new Graphics();
      diamond(g, 1).fill({ color: BOSS_BIG_LOOK.DARK, alpha: 0.35 }).stroke({ color: BOSS_BIG_LOOK.RED, alpha: 1, width: 2.5 });
      const inner = new Graphics();
      diamond(inner, 1).fill({ color: BOSS_BIG_LOOK.RED, alpha: BOSS_BIG_LOOK.FILL_TO });
      g.addChild(inner);
      g.position.set(x, y);
      view.addChild(g);
      tiles.push(g);
    }
    this.marks.set(e.n, { view, tiles, t: 0, ms: e.ms });
    this.step(0);
    if (spots.length) {
      const mx = spots.reduce((a, s) => a + s[0], 0) / spots.length;
      const my = Math.min(...spots.map((s) => s[1]));
      this.host.label(e.name.toUpperCase(), mx, my - 30, 0xffb0a0, 16, Math.min(2200, e.ms + 200));
    }
  }

  private land(b: Battle, e: Sig): void {
    const el = e.el as Element;
    const w = b.board.w;
    const p = this.host.particles;
    // (the element's wave and a puff of earth on every struck tile)
    for (const i of e.tiles) {
      const u = i % w;
      const v = Math.floor(i / w);
      const [x, y] = at(u, v, tileAt(b.board, u, v)?.h ?? 0);
      play(p, packKey(el, 'wave'), x, y, { scale: 1.8, frameMs: 70, add: false, alpha: 0.75 });
      if (bits(1, p.density)) play(p, packKey(el, 'hit'), x, y - 10, { scale: 1.4, frameMs: 60 });
    }
    this.host.impact(b, el, burstTiles(e.tiles, w, settings().saver));
    if (!this.host.calm()) this.host.stop(BOSS_BIG_LOOK.HIT_STOP_MS);
    this.host.shake(BOSS_BIG_LOOK.SHAKE);
  }
}
