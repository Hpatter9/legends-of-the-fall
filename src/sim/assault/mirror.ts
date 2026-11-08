// The battle's mirror (phase 2, `docs/notes/assault-2.md`): with the assault's simulation in a Web Worker, the page keeps a copy of the battle to
// draw and to read, and the worker sends what changed after each batch of ticks. The copy is the battle itself as first cloned (its board,
// its field, its hold), then updated in place: the units merged by id (so every reference the page holds stays good), the hold's changing
// parts merged item by item, the tiles a breach or a ladder touched replaced, the groups and the new fighters' field records added.
//
// The worker is the truth: the page never steps its copy. Pure rules: no DOM, no Pixi (both sides import it).

import type { Battle, BattleEvent, Unit } from '../battle';
import type { Tile } from '../board';
import type { FieldGroup, FieldInfo } from './field';
import type { HoldEvent, HoldState } from './holdTypes';

/** One tick's events: the battle's and the hold's. */
export interface TickOut {
  ev: BattleEvent[];
  hold: HoldEvent[];
}

/** What the worker sends after a batch: the ticks' events, and the state to merge into the page's copy. */
export interface MirrorMsg {
  t: number;
  rng: number;
  phase: Battle['phase'];
  units: Unit[];
  spells: Battle['spells'];
  pause?: number;
  /** The hold's changing parts (its plain data, without the blueprint, the input, the stakes or the order log). */
  hold: Partial<HoldState>;
  groups: FieldGroup[];
  /** The field records of fighters new since the last batch. */
  info: Record<number, FieldInfo>;
  /** The tiles a breach, an opening or a ladder changed in this batch. */
  tiles: [number, Tile][];
  ticks: TickOut[];
  /** Each tick's milliseconds in the worker. */
  ms: number[];
}

/** The hold's parts that never change after the start (left out of every batch). */
const STATIC: readonly (keyof HoldState)[] = ['bp', 'input', 'stakes', 'fortAt', 'kinds', 'log', 'queue'];

/** Pack a batch: the battle as it stands, the ticks since the last batch, and the fighters the page has not had the records of. */
export function packMirror(b: Battle, ticks: TickOut[], ms: number[], sentInfo: Set<number>): MirrorMsg {
  const f = b.field!;
  const h = f.hold!;
  const hold: Partial<HoldState> = {};
  for (const k of Object.keys(h) as (keyof HoldState)[]) if (!STATIC.includes(k)) (hold as Record<string, unknown>)[k] = h[k];
  const info: Record<number, FieldInfo> = {};
  for (const x of b.units)
    if (!sentInfo.has(x.id) && f.info[x.id]) {
      info[x.id] = f.info[x.id];
      sentInfo.add(x.id);
    }
  const changed = new Set<number>();
  for (const t of ticks)
    for (const e of t.hold) if (e.kind === 'breach' || e.kind === 'open' || e.kind === 'ladder') for (const i of e.tiles) changed.add(i);
  return {
    t: b.t,
    rng: b.rng,
    phase: b.phase,
    units: b.units,
    spells: b.spells,
    ...(b.pause ? { pause: b.pause } : {}),
    hold,
    groups: f.groups,
    info,
    tiles: [...changed].map((i) => [i, b.board.tiles[i]]),
    ticks,
    ms,
  };
}

/** Merge a source into a target in place: plain objects key by key, arrays of objects item by item (so the page's references hold). */
function merge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(source)) {
    const old = target[k];
    if (Array.isArray(v) && Array.isArray(old) && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
      v.forEach((x, i) => {
        if (old[i] && typeof old[i] === 'object') merge(old[i] as Record<string, unknown>, x as Record<string, unknown>);
        else old[i] = x;
      });
      old.length = v.length;
    } else target[k] = v;
  }
}

/** Bring the page's copy up to a batch. */
export function applyMirror(b: Battle, msg: MirrorMsg): void {
  const f = b.field!;
  const h = f.hold!;
  b.t = msg.t;
  b.rng = msg.rng;
  b.phase = msg.phase;
  b.spells = msg.spells;
  b.pause = msg.pause ?? 0;
  // (the fighters by id: the same objects, their numbers replaced; the new ones added)
  const byId = new Map(b.units.map((x) => [x.id, x]));
  const units: Unit[] = [];
  for (const x of msg.units) {
    const old = byId.get(x.id);
    if (old) {
      for (const k of Object.keys(old)) if (!(k in x)) delete (old as unknown as Record<string, unknown>)[k];
      Object.assign(old, x);
      units.push(old);
    } else units.push(x);
  }
  b.units = units;
  for (const [id, info] of Object.entries(msg.info)) f.info[Number(id)] = info;
  for (const x of units) f.byId[x.id] = x;
  f.occ.fill(-1);
  for (const x of units) if (x.alive && !x.under) f.occ[x.v * f.w + x.u] = x.id;
  f.groups = msg.groups;
  for (const [i, t] of msg.tiles) b.board.tiles[i] = t;
  merge(h as unknown as Record<string, unknown>, msg.hold as Record<string, unknown>);
  h.events = msg.ticks.length ? msg.ticks[msg.ticks.length - 1].hold : [];
  // (the page's own calls on its copy queued orders there: the worker's are the ones that count)
  h.queue.length = 0;
}
