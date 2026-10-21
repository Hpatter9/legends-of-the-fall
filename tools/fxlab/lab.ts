// A lab for the combat effects: loaded into the built page after the game has started, it swaps in a battle of chosen
// heroes against a chosen band, so a screenshot run can show an effect on demand. Build with `node tools/fxlab/shots.mjs`.
// It reaches into the game's private fields (the page has no API for this) and is not part of the shipped game.

import { addUnit, fight, isDeployTile, startBattle, stepBattle, TICK_MS, unitAt, type Battle, type Boost } from '../../src/sim/battle';
import { castSpell, type SpellId } from '../../src/sim/spells';
import { CHARGE_MAX } from '../../src/sim/abilities';
import { standable, tileAt } from '../../src/sim/board';

/* eslint-disable @typescript-eslint/no-explicit-any */
const game = () => (window as any).__game;
/** Where the latest event the lab cares about happened (world px), so the camera can look at it. */
let focus: { x: number; y: number } | null = null;

interface Setup {
  heroes: string[];
  band: string;
  seed?: number;
  boss?: Boost;
  /** Every hero's attack multiplier (to see deaths sooner), and whether skills and ultimates start charged. */
  power?: number;
  charged?: boolean;
  foesCharged?: boolean;
  grade?: number;
}

const lab = {
  /** Replace the battle with `heroes` on the heroes' rows against `band`; the fight is not started. */
  setup(s: Setup): void {
    const g = game();
    const b: Battle = startBattle(s.seed ?? 7, s.band, { boss: s.boss });
    s.heroes.forEach((id) => {
      let at: [number, number] = [3, 6];
      search: for (let v = 6; v < 9; v++) for (const u of [3, 2, 4, 1, 5, 0, 6]) if (isDeployTile(v) && standable(tileAt(b.board, u, v)) && !unitAt(b, u, v)) { at = [u, v]; break search; }
      const u = addUnit(b, id, at[0], at[1], { atk: s.power, grade: s.grade });
      if (s.charged) {
        u.charge = CHARGE_MAX;
        u.charge2 = CHARGE_MAX;
      }
    });
    if (s.foesCharged)
      for (const u of b.units)
        if (u.side === 'foe') {
          u.charge = CHARGE_MAX;
          u.charge2 = CHARGE_MAX;
        }
    focus = null;
    g.b = b;
    g.intro = null;
    g.fx.clear();
    g.boardView.build(b.board);
    g.syncSprites(true);
    g.layout();
    g.refresh();
    $hide();
  },
  go(): void {
    const g = game();
    fight(g.b);
    g.refresh();
  },
  cast(id: SpellId, u: number, v: number): boolean {
    const g = game();
    g.b.spells.mana = 10;
    return castSpell(g.b, id, u, v);
  },
  /** Zoom the camera to `z` over the middle of the fighters still standing (so an effect fills the phone's screen). */
  look(z: number, followEvents = false): void {
    const g = game();
    if (followEvents && focus) {
      g.zoom = z;
      g.tx = g.cx = focus.x;
      g.ty = g.cy = focus.y;
      g.clampCam();
      g.place();
      return;
    }
    const alive = [...g.sprites.values()].filter((sp: any) => sp.unit.alive);
    if (!alive.length) return;
    const x = alive.reduce((a: number, sp: any) => a + sp.x, 0) / alive.length;
    const y = alive.reduce((a: number, sp: any) => a + sp.y - sp.tall * 0.4, 0) / alive.length;
    g.zoom = z;
    g.tx = g.cx = x;
    g.ty = g.cy = y;
    g.clampCam();
    g.place();
  },
  /** Run the fight forward by `ms` of its own time, a tick at a time, the effects in quarter-ticks (the page's own clock is held at speed 0).
   *  Returns the events seen, as `[time, kind, extra]`. */
  advance(ms: number): [number, string, string][] {
    const g = game();
    const seen: [number, string, string][] = [];
    for (let t = 0; t < ms && g.b.phase === 'fight'; t += TICK_MS) {
      const events = stepBattle(g.b);
      g.fx.show(g.b, events);
      for (const e of events) {
        seen.push([g.b.t, e.kind, (e as any).name ?? (e as any).shot ?? (e as any).id ?? '']);
        const a = g.sprites.get((e as any).by ?? (e as any).from);
        const c = g.sprites.get((e as any).to);
        if (a && c && ['shot', 'swing', 'arc'].includes(e.kind)) focus = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 - 20 };
        else if (a && e.kind === 'skill') focus = { x: a.x, y: a.y - 20 };
      }
      for (let i = 0; i < 4; i++) g.fx.step(TICK_MS / 4);
    }
    return seen;
  },
  speed(x: number): void {
    game().speed = x;
  },
  time(): number {
    return game().b.t;
  },
  /** The first foe's tile (for aiming a spell). */
  foeTile(): [number, number] {
    const f = game().b.units.find((x: any) => x.side === 'foe' && x.alive);
    return f ? [f.u, f.v] : [3, 6];
  },
  /** Average frame time (ms) over `ms` of the running fight. */
  async frames(ms: number): Promise<{ avg: number; worst: number; n: number }> {
    const times: number[] = [];
    let last = performance.now();
    const end = last + ms;
    await new Promise<void>((done) => {
      const tick = (now: number) => {
        times.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick);
        else done();
      };
      requestAnimationFrame(tick);
    });
    return { avg: times.reduce((a, b) => a + b, 0) / times.length, worst: Math.max(...times), n: times.length };
  },
  TICK_MS,
};

/** Hide the tips and tutorial overlays so a screenshot shows the board. */
function $hide(): void {
  document.getElementById('tipSkip')?.click();
}

(window as any).__lab = lab;
