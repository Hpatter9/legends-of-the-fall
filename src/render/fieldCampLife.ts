// Quiet camp activity, drawn from existing sheets and effects. Decorative workers flee before contact and never enter the simulation.
import { Container, Sprite } from 'pixi.js';
import type { Battle } from '../sim/battle';
import { rawAt } from './iso';
import { framesOf, figureOf, hasSheet, facesRightOf } from './sheets';
import { motionPlan } from './ambient';
import { settings } from '../settings';
import { campWorkVisible } from './fieldCampRules';
import { VFX } from './vfxArt';
import type { WorldRect } from './fieldCull';

export class FieldCampLife {
  readonly drawn = { workers: 0, smoke: 0 };
  private smoke: Sprite[] = [];
  private workers: Sprite[] = [];

  constructor(private b: Battle, private layer: Container) {}

  update(t: number, view: WorldRect, near: boolean, reduced: boolean): void {
    const plan = motionPlan({ reduced, saver: !!settings().saver, hidden: false });
    const sites = this.b.field?.hold?.bp.campLife ?? [];
    const b = this.b;
    let smoke = 0, workers = 0;
    for (const [index, site] of sites.entries()) {
      const tile = b.board.tiles[site.at.v * b.board.w + site.at.u];
      const [x, y] = rawAt(site.at.u, site.at.v, tile.h);
      if (x < view.x0 - 80 || x > view.x1 + 80 || y < view.y0 - 100 || y > view.y1 + 100) continue;
      if (site.kind === 'smoke') {
        const frames = VFX.smokeDark;
        const burnt = b.field?.hold?.siege.huts.some((hut) => hut.burnt && hut.tiles.includes(site.at.v * b.board.w + site.at.u));
        if (!plan.run || !frames?.length || burnt) continue;
        const count = near && plan.particles === 1 ? 2 : 1;
        for (let n = 0; n < count; n++) {
          const phase = ((t / 1000 + index * 0.73 + n * 2) % 4) / 4;
          const sp = this.smoke[smoke] ??= this.add();
          sp.texture = frames[Math.min(frames.length - 1, Math.floor(phase * frames.length))];
          sp.visible = true;
          sp.position.set(x + phase * 22 + Math.sin(phase * 5 + index) * 4, y - (site.lift ?? 36) - phase * 85);
          sp.scale.set(0.6 + phase);
          sp.alpha = Math.sin(phase * Math.PI) * 0.2;
          sp.zIndex = 100_001;
          smoke++;
        }
        continue;
      }
      // No decorative figure can be mistaken for a target when the battle reaches its worksite.
      if (!campWorkVisible(b, site.at, near)) continue;
      const sheet = 'hk_orc_grunt';
      if (!hasSheet(sheet)) continue;
      const clock = reduced ? 0 : t + index * 1700;
      const cycle = clock % 7000;
      const working = !reduced && cycle < 4000 && site.job !== 'sort';
      const frames = framesOf(sheet, working ? 'attack' : 'idle');
      if (!frames?.length) continue;
      const sp = this.workers[workers] ??= this.add();
      sp.texture = frames[reduced ? 0 : Math.floor(clock / (working ? 160 : 240)) % frames.length];
      sp.visible = true;
      sp.scale.set((!site.flip !== facesRightOf(sheet) ? -1 : 1) * 43 / figureOf(sheet), 43 / figureOf(sheet));
      sp.position.set(x, y + 5);
      sp.alpha = 1;
      sp.tint = 0xc6b69a;
      sp.zIndex = (site.at.u + site.at.v) * 10 + 5;
      workers++;
    }
    this.drawn.workers = workers;
    this.drawn.smoke = smoke;
    for (let i = smoke; i < this.smoke.length; i++) this.smoke[i].visible = false;
    for (let i = workers; i < this.workers.length; i++) this.workers[i].visible = false;
  }

  private add(): Sprite {
    const sp = new Sprite();
    sp.anchor.set(0.5, 1);
    this.layer.addChild(sp);
    return sp;
  }
}
