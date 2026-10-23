// Saved calamity runs in chosen states, for the map's screenshots (`tools/calmap/shots.mjs` bundles this with esbuild and loads each into the page's
// storage). Built with the sim's own functions; nothing here is played.
import { startedMeta } from '../../src/sim/meta';
import { calamityRun } from '../../src/sim/modes';
import { hireHero } from '../../src/sim/climb';
import { clearNode, enterNode, floorOf, mapFor, openTreasure, type MapNode } from '../../src/sim/tower';
import { sideSpots } from '../../src/sim/calLand';
import { HEROES } from '../../src/sim/units';
import type { Run } from '../../src/sim/run';

const meta = () => {
  const m = startedMeta(5);
  m.unlocked = [...HEROES, 'paladin', 'cleric'];
  return m;
};

/** A fresh calamity of `seed` with the lead hero `hero` and `extra` more hired. */
export function fresh(seed: number, hero = 'samurai', extra = 4): Run {
  const run = calamityRun(seed, meta(), hero, 0);
  const kinds = ['knight', 'archer', 'wizard', 'cleric', 'kunoichi', 'paladin'];
  for (let i = 0; i < extra; i++) hireHero(run, kinds[i], 0);
  run.gold = 120;
  return run;
}

/** The chain of node ids from the first row to `id`. */
function chain(map: MapNode[], id: number): number[] {
  const from = new Map<number, number | null>(map.filter((n) => n.row === 0).map((n) => [n.id, null]));
  const q = map.filter((n) => n.row === 0);
  while (q.length) {
    const n = q.shift()!;
    if (n.id === id) break;
    for (const to of n.next) if (!from.has(to)) (from.set(to, n.id), q.push(map[to]));
  }
  const out: number[] = [];
  for (let at: number | null = id; at !== null && at !== undefined; at = from.get(at) ?? null) out.unshift(at);
  return out;
}

/** The run at map `act`, the party standing at node `id` (its road cleared, the node itself cleared); `id` -1 for the start. */
export function standing(run: Run, act: number, id: number): Run {
  const t = run.tower!;
  t.act = act;
  t.bosses = act - 1;
  t.map = mapFor(run, act);
  t.sideDone = undefined;
  t.cur = undefined;
  if (id < 0) {
    t.at = -1;
    t.row = 0;
    t.path = [];
  } else {
    t.path = chain(t.map, id);
    t.at = id;
    t.row = t.map[id].row + 1;
  }
  run.stage = floorOf(act, t.row, t);
  return run;
}

/** A map and node with a hidden side spot on it, found from `seed` on. */
export function withSide(seed0: number, act: number, want?: 'treasure' | 'elite'): { seed: number; act: number; from: number; id: number } {
  for (let seed = seed0; seed < seed0 + 2000; seed++) {
    const run = fresh(seed, 'samurai', 0);
    const map = mapFor(run, act);
    const s = sideSpots(seed, act, map).find((x) => !want || x.kind === want);
    if (s) return { seed, act, from: s.from, id: s.id };
  }
  throw new Error('no side spot');
}

/** A node of map `act` that forks (two or more ways on) after the first row, to stand at. */
export function forkNode(run: Run, act: number): number {
  const map = mapFor(run, act);
  return map.find((n) => n.row === 1 && n.next.length >= 2)?.id ?? map.find((n) => n.row === 1)!.id;
}

/** A seed from `seed0` on whose map 1 has a node on the second row that forks, and that node. */
export function withFork(seed0: number): { seed: number; id: number } {
  for (let seed = seed0; seed < seed0 + 2000; seed++) {
    const map = mapFor(fresh(seed, 'samurai', 0), 1);
    const n = map.find((x) => x.row === 1 && x.next.length >= 2);
    if (n) return { seed, id: n.id };
  }
  throw new Error('no fork');
}

/** The node of map `act` on row `row` with the most ways on (to stand at). */
export function firstNodeAt(run: Run, act: number, row: number): number {
  const map = mapFor(run, act);
  return [...map.filter((n) => n.row === row)].sort((a, b) => b.next.length - a.next.length)[0].id;
}

/** A node of map `act` whose road leads to the boss (the campfire before it). */
export function beforeBoss(run: Run, act: number): number {
  const map = mapFor(run, act);
  const boss = map.find((n) => n.kind === 'boss')!;
  return map.find((n) => n.next.includes(boss.id))!.id;
}

/** The party back on the road after taking a hidden hoard (found from `seed0`), the road's spots before it cleared. */
export function afterSide(seed0: number): Run {
  const f = withSide(seed0, 1, 'treasure');
  const r = standing(fresh(f.seed), f.act, f.from);
  enterNode(r, f.id);
  openTreasure(r);
  clearNode(r);
  return r;
}

/** A map of free exploration: both branches of a fork visited, the party standing back at the fork (a backtrack ahead of it). */
export function explored(seed0 = 1): { run: Run; fork: number; a: number; b: number } {
  for (let seed = seed0; seed < seed0 + 400; seed++) {
    const r = fresh(seed, 'samurai', 4);
    const t = r.tower!;
    const n = t.map.find((x) => x.row === 1 && x.next.length >= 2 && t.map.some((p) => p.row === 0 && p.next.includes(x.id)));
    if (!n) continue;
    const parent = t.map.find((p) => p.row === 0 && p.next.includes(n.id))!;
    const [a, b] = n.next;
    for (const id of [parent.id, n.id, a, b]) {
      enterNode(r, id);
      clearNode(r);
    }
    // (back at the fork, on the way to the first branch's far side: the leader walks back over the cleared spots)
    t.here = n.id;
    t.at = n.id;
    return { run: r, fork: n.id, a, b };
  }
  throw new Error('no fork');
}

/** The party standing at the spot before the boss's lair on map `act`, most of the map not cleared. */
export function atDoor(seed: number, act: number): Run {
  const r = fresh(seed, 'samurai', 4);
  const t = r.tower!;
  t.act = act;
  t.bosses = act - 1;
  t.map = mapFor(r, act);
  const boss = t.map.find((n) => n.kind === 'boss')!;
  const door = t.map.find((n) => n.next.includes(boss.id))!;
  const chain: number[] = [];
  for (let at: number | undefined = door.id; at !== undefined; ) {
    chain.unshift(at);
    at = t.map.find((n) => n.next.includes(at!) && n.row === t.map[at!].row - 1)?.id;
  }
  for (const id of chain) {
    enterNode(r, id);
    clearNode(r);
  }
  return r;
}
