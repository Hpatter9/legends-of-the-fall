// The living land of an army's road (WORLD-ROAD): ground that acts on its own during a fight, on a clock the board carries, so
// every fight on a board plays it the same way. A strike (lava flaring, rocks falling, steam bursting, spikes, grasping hands, a
// stampede) is told a moment before (`tell`: the page marks the tiles), then hurts whoever stands there, either side; a spring
// mends whoever stands in it; a river's current carries a walker downstream a tile. The boards plan them (`planHazards`, by a side
// stream of the plan's seed); `tickHazards` runs them each tick. Pure rules: no Pixi, no DOM.

import { mendUnit } from './abilities';
import { defOf, hurt, tileOf, unitAt, type Battle, type BattleEvent, type Unit } from './battle';
import { DEPLOY_ROWS, DIRS, standable, tileAt, type Board, type Hazard, type HazardKind } from './board';
import { mixSeed, Rng } from './rng';
import { AIL, AILMENT_SWITCH, burnFor, chillFor, putOut } from './ailments';

/** What each strike does: the share of a fighter's hp it takes, whether it reaches a flier, and how long it slows (ms). */
export const STRIKES: Record<Exclude<HazardKind, 'spring' | 'current'>, { share: number; fliers: boolean; slowMs?: number }> = {
  flare: { share: 0.1, fliers: true },
  rockfall: { share: 0.12, fliers: true },
  geyser: { share: 0.08, fliers: true },
  spikes: { share: 0.1, fliers: false },
  grasp: { share: 0.06, fliers: false, slowMs: 2000 },
  stampede: { share: 0.1, fliers: false },
};
/** A spring mends this share of hp each time it wells up. */
export const SPRING_HEAL = 0.08;
/** A boss (drawn bigger) feels a strike or a spring as this share of the rest: a share of a boss's hp is a great deal more. */
export const BOSS_FEELS = 1 / 3;
/** How long a walker carried by the current takes over its tile (ms). */
export const CURRENT_MS = 450;

const isBoss = (x: Unit) => (x.size ?? 1) > 1;

/** Each tick: tell the strikes about to come, and set off those whose moment it is. */
export function tickHazards(b: Battle, out: BattleEvent[]): void {
  const list = b.board.hazards;
  if (!list) return;
  list.forEach((h, id) => {
    const phase = (((b.t - h.offset) % h.period) + h.period) % h.period;
    if (h.tell && phase === h.period - h.tell) out.push({ kind: 'hazard', id, what: h.kind, phase: 'tell', tiles: h.tiles, ms: h.tell });
    if (phase !== 0 || b.t < h.offset) return;
    if (h.kind === 'current') return current(b, h, id, out);
    out.push({ kind: 'hazard', id, what: h.kind, phase: 'go', tiles: h.tiles, ms: 0 });
    const on = new Set(h.tiles);
    for (const x of b.units) {
      if (!x.alive || !on.has(x.v * b.board.w + x.u)) continue;
      const feel = isBoss(x) ? BOSS_FEELS : 1;
      if (h.kind === 'spring') {
        mendUnit(x, x.maxHp * SPRING_HEAL * feel, out);
        continue;
      }
      const s = STRIKES[h.kind];
      if (!s.fliers && defOf(x).flies) continue;
      hurt(b, x, x, Math.max(1, Math.round(x.maxHp * s.share * feel)), false, false, out, 'dot');
      if (s.slowMs && x.alive) chillFor(b, x, s.slowMs);
      // (a lava flare sets it burning; a steam geyser puts a fire out: STATUS-FX)
      if (h.kind === 'flare' && x.alive) burnFor(b, x, x, AIL.BURN_MS, 0.04);
      else if (h.kind === 'geyser' && AILMENT_SWITCH.on) putOut(x);
    }
  });
}

/** The current: each walker standing in the river (not mid-step, and not a guard at its post) is carried a tile downstream, if that tile is free and within a step. */
function current(b: Battle, h: Hazard, id: number, out: BattleEvent[]): void {
  const [du, dv] = h.flow ?? [1, 0];
  const on = new Set(h.tiles);
  const moved: number[] = [];
  for (const x of b.units) {
    if (!x.alive || defOf(x).flies || !on.has(x.v * b.board.w + x.u)) continue;
    if (x.step && x.step.at + x.step.ms > b.t) continue;
    if (b.stand && x.post) continue;
    const to = tileAt(b.board, x.u + du, x.v + dv);
    const from = tileOf(b, x);
    if (!standable(to) || unitAt(b, x.u + du, x.v + dv) || Math.abs(to.h - from.h) > 1) continue;
    x.step = { u: x.u, v: x.v, h: from.h, at: b.t, ms: CURRENT_MS };
    x.u += du;
    x.v += dv;
    x.busyUntil = Math.max(x.busyUntil, b.t + CURRENT_MS);
    moved.push(x.v * b.board.w + x.u);
  }
  if (moved.length) out.push({ kind: 'hazard', id, what: 'current', phase: 'go', tiles: moved, ms: CURRENT_MS });
}

/** Which hazards each army's arena has, and how often each comes (ms). */
const ARENA_HAZARDS: Record<string, { kind: HazardKind; n: number; period: number; tell: number }[]> = {
  orcs: [{ kind: 'rockfall', n: 2, period: 9000, tell: 1500 }],
  undead: [{ kind: 'grasp', n: 1, period: 7000, tell: 1200 }],
  necropolis: [{ kind: 'grasp', n: 1, period: 7000, tell: 1200 }],
  infernal: [{ kind: 'flare', n: 2, period: 8000, tell: 1500 }],
  wildwood: [{ kind: 'spring', n: 1, period: 6000, tell: 800 }],
  golems: [{ kind: 'flare', n: 2, period: 8000, tell: 1500 }, { kind: 'geyser', n: 1, period: 10000, tell: 1500 }],
  yokai: [{ kind: 'spring', n: 1, period: 6000, tell: 800 }, { kind: 'geyser', n: 2, period: 9000, tell: 1500 }],
  beasts: [{ kind: 'stampede', n: 2, period: 10000, tell: 2000 }],
  ogres: [{ kind: 'rockfall', n: 3, period: 9000, tell: 1500 }],
  mountain: [{ kind: 'rockfall', n: 3, period: 9000, tell: 1500 }],
  labyrinth: [{ kind: 'spikes', n: 3, period: 7000, tell: 1200 }],
  temple: [{ kind: 'spikes', n: 3, period: 7000, tell: 1200 }],
};
export const arenaHazardsOf = (theme: string) => ARENA_HAZARDS[theme] ?? [];

/** The hazards a section of the road has: a river's current where the road fords it, lava that flares where the road crosses lava, and a boss's arena its army's own (`ARENA_HAZARDS`).
 *  `flow` is the way the river runs across the board; `centre` the arena's middle. Every choice by its own side stream (`seed`). */
export function planHazards(theme: string, b: Board, boss: boolean, seed: number, flow: [number, number], centre?: [number, number]): Hazard[] {
  const rng = new Rng(mixSeed(seed, 0x4a2d));
  const out: Hazard[] = [];
  const { w, d } = b;
  const at = (i: number): [number, number] => [i % w, Math.floor(i / w)];
  const mid = (i: number) => Math.floor(i / w) >= DEPLOY_ROWS && Math.floor(i / w) < d - DEPLOY_ROWS;
  const walk = b.tiles.flatMap((t, i) => (standable(t) && !t.bridge ? [i] : []));
  // the river's current, where the road fords it in shallows
  const ford = walk.filter((i) => b.tiles[i].ground === 'water' && mid(i));
  if (ford.length) out.push({ kind: 'current', tiles: ford, period: 2500, offset: 2500, tell: 0, flow });
  // lava that flares: the road's own lava, and the road beside lava
  const nearLava = (i: number) => {
    const [u, v] = at(i);
    return b.tiles[i].ground === 'lava' || DIRS.some(([du, dv]) => {
      const n = tileAt(b, u + du, v + dv);
      return n?.scene === 'lava' || n?.ground === 'lava';
    });
  };
  const vents = walk.filter((i) => mid(i) && nearLava(i));
  if (!boss && vents.length) out.push({ kind: 'flare', tiles: vents.filter((_, k) => k % 2 === 0), period: 9000, offset: 6000, tell: 1500 });
  if (!boss) return out;

  const plus = (c: number) => {
    const [u, v] = at(c);
    return [c, ...DIRS.map(([du, dv]) => (v + dv) * w + u + du).filter((j) => walk.includes(j) && Math.abs(at(j)[0] - u) <= 1)];
  };
  const [cx, cy] = centre ?? [(w - 1) / 2, d / 3];
  for (const spec of arenaHazardsOf(theme)) {
    const groups: number[][] = [];
    if (spec.kind === 'spring') {
      // (the spring wells up at the arena's heart)
      const c = Math.round(cy) * w + Math.round(cx);
      groups.push(walk.filter((i) => Math.max(Math.abs(at(i)[0] - at(c)[0]), Math.abs(at(i)[1] - at(c)[1])) <= 1));
    } else if (spec.kind === 'grasp') {
      // (the hands come up beside the graves)
      groups.push(walk.filter((i) => DIRS.some(([du, dv]) => tileAt(b, at(i)[0] + du, at(i)[1] + dv)?.scene === 'grave')));
    } else if (spec.kind === 'stampede') {
      // (a herd runs across a row of the arena, one row and then another)
      const rows = [Math.round(cy) - 1, Math.round(cy) + 2];
      for (const r of rows.slice(0, spec.n)) groups.push(walk.filter((i) => at(i)[1] === r));
    } else if (spec.kind === 'flare' && vents.length) {
      // (the arena's lava flares in two halves, turn about)
      const sorted = [...vents].sort((p, q) => at(p)[1] - at(q)[1] || at(p)[0] - at(q)[0]);
      const half = Math.ceil(sorted.length / spec.n);
      for (let k = 0; k < spec.n; k++) groups.push(sorted.slice(k * half, (k + 1) * half));
    } else {
      // (patches of a few tiles in the middle ground, apart from each other)
      const pool = walk.filter((i) => mid(i));
      for (let k = 0; k < spec.n && pool.length; k++) {
        let c = pool[rng.int(0, pool.length - 1)];
        for (let tries = 0; tries < 12 && groups.some((g) => g.some((j) => Math.abs(at(j)[0] - at(c)[0]) + Math.abs(at(j)[1] - at(c)[1]) < 4)); tries++) c = pool[rng.int(0, pool.length - 1)];
        groups.push(plus(c));
      }
    }
    // (the groups of one kind take turns: each its own moment in the period)
    groups
      .filter((g) => g.length)
      .forEach((tiles, k, all) => out.push({ kind: spec.kind, tiles, period: spec.period, offset: spec.tell + 2000 + Math.round((spec.period / all.length) * k / 100) * 100, tell: spec.tell }));
  }
  return out;
}
