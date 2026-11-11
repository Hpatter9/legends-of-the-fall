// LIVING-FIELDS, step 3 (docs/notes/living-fields.md): the traps and hazards of the ordinary battlefields, by land. Each stands on its tile
// in plain sight before the fight (the board draws its tell, the codex has its line: `terrainInfo.ts`), hits heroes and foes alike, and is
// known to the fight's way-finding (`TRAP_COST` and `RISK_COST` in `canStep`, `trapScore` where a fighter picks its footing), so nobody
// stands in one by choice.
//
// - **Spring once** (the first walker to end a step there; then it is gone): a **spike trap**, a **snare** that roots, a **rune ward** that zaps.
// - **Stay**: **brambles** that scratch on entry, **deep mud** (quicksand on sand) that drags a step, a **poison bog**.
// - **Thin ice** cracks under the first walker and breaks under the next: the tile is shallow water after, and whoever broke it is chilled.
// - A **totem** strengthens whoever holds its tile. A **brazier** is tipped over by a blow on a fighter beside it: its coals lie round it.
// - **Timed strikes** on the board's own clock, told a moment before (`hazards.ts` runs them): steam vents, falling rocks, grasping hands,
//   swinging blades, and lightning in the rain.
//
// Deterministic: where each lies, and each strike's clock, come from one side stream of the fight's seed (`FIELD_SALT`), never the
// fight's own stream; a trap springs on a step, with no roll at all. The whole set is behind one switch (`FIELD_HAZARDS`): with it off no
// board has any, and every fight plays out as it did before. Pure rules: no Pixi, no DOM.

import { stunFor, chillFor, poisonFor, AILMENT_SWITCH } from './ailments';
import { defOf, hurt, noteTerrain, tileOf, unitAt, type Battle, type BattleEvent, type Unit } from './battle';
import { AREAS, boardOk, DEPLOY_ROWS, DIRS, standable, tileAt, type Area, type Board, type Hazard, type HazardKind, type Tile, type Trap } from './board';
import { mixSeed, Rng } from './rng';
import { weatherOf } from './weather';

/** The one switch: off, no board is given a trap or a hazard of this set (the pinned recordings turn it off; so can a balance tool).
 *  It ships OFF: the set changes how fights play, so it waits for the owner's nod on the list (docs/notes/living-fields.md, step 3).
 *  The set's own tests turn it on. */
export const FIELD_HAZARDS = { on: false };
/** The side stream every placement and clock is drawn from. */
export const FIELD_SALT = 0xf1e1d;

/** A piece of the set: a trap laid on tiles, a brazier, or a timed strike. */
export type Piece = Exclude<Trap, 'cracked'> | 'brazier' | 'geyser' | 'rockfall' | 'grasp' | 'blades' | 'lightning';

/** What each land lays, two or three of its own (lightning only in the rain). */
export const LAND_HAZARDS: Record<Area, readonly Piece[]> = {
  highlands: ['rockfall', 'brambles', 'lightning'],
  forest: ['snare', 'brambles', 'lightning'],
  snow: ['thin', 'rockfall'],
  desert: ['mud', 'rockfall'],
  volcano: ['geyser', 'brazier'],
  dungeon: ['spikes', 'blades', 'brazier'],
  plains: ['snare', 'totem', 'lightning'],
  autumn: ['snare', 'brambles'],
  swamp: ['mud', 'bog'],
  graveyard: ['grasp', 'bog', 'brambles'],
  ruins: ['blades', 'ward', 'spikes'],
  temple: ['ward', 'spikes', 'brazier'],
  crystal: ['ward', 'thin', 'rockfall'],
  forge: ['geyser', 'brazier'],
  shrine: ['ward', 'totem'],
  warcamp: ['spikes', 'brazier', 'totem'],
  oasis: ['mud', 'brambles'],
};

/** How many pieces a board of the usual size is given at each level (min, max): sparse at first, more on later waves and harder tiers. */
export const PIECES: readonly [number, number][] = [[0, 0], [1, 2], [2, 3], [3, 4]];
export const MAX_LEVEL = PIECES.length - 1;
/** The most a bigger board (an army's road section) is given, as a multiple of the usual board's pieces. */
export const ROAD_SCALE = 1.5;
/** The level a fight is laid at: one, a second from the fifth wave, a third from the third tier (Elite) up. */
export const hazardLevel = (wave: number, tier: number): number => Math.min(MAX_LEVEL, 1 + (wave >= 5 ? 1 : 0) + (tier >= 2 ? 1 : 0));

/** The numbers (shares are of the fighter's own health; a boss, drawn bigger, feels a third: `BOSS_FEELS` in hazards.ts). */
export const TRAPS = {
  /** A spike trap's bite. */
  SPIKES: 0.1,
  /** A snare: a nick, and rooted this long (it can still strike what is in reach). */
  SNARE: 0.03,
  SNARE_MS: 2500,
  /** A rune ward: its zap, and stunned this long. */
  WARD: 0.1,
  WARD_MS: 700,
  /** Brambles scratch on every entry. */
  BRAMBLES: 0.03,
  /** A poison bog: on entry, and each second stood in it; and its poison (a share of the fighter's own attack, as the mire's water). */
  BOG: 0.03,
  BOG_STAND: 0.02,
  BOG_POISON: 0.03,
  /** Thin ice breaking: the cold water's bite, and chilled this long. */
  ICE: 0.06,
  ICE_MS: 2500,
  /** A totem: the attack of whoever stands on it is multiplied by this. */
  TOTEM: 1.15,
  /** A brazier tipped: what it takes from each fighter within a tile. */
  BRAZIER: 0.06,
  /** How large a piece is, in tiles (min, max). */
  SIZE: { spikes: [1, 2], snare: [1, 1], ward: [1, 2], brambles: [2, 3], mud: [2, 4], bog: [2, 3], thin: [1, 3], totem: [1, 1] } as Record<Exclude<Trap, 'cracked'>, [number, number]>,
  /** A timed strike's clock (ms): how often, and how long before it is told. */
  CLOCK: { geyser: [9000, 1500], rockfall: [10000, 1500], grasp: [8000, 1200], blades: [6000, 1200], lightning: [11000, 1500] } as Record<Extract<Piece, HazardKind>, [number, number]>,
} as const;
const BOSS_FEELS = 1 / 3;
const feel = (x: Unit) => ((x.size ?? 1) > 1 ? BOSS_FEELS : 1);
const bite = (b: Battle, x: Unit, share: number, out: BattleEvent[]) => hurt(b, x, x, Math.max(1, Math.round(x.maxHp * share * feel(x))), false, false, out, 'dot');

const TIMED: readonly Piece[] = ['geyser', 'rockfall', 'grasp', 'blades', 'lightning'];
const isTimed = (p: Piece): p is Extract<Piece, HazardKind> => TIMED.includes(p);

/** Whether a board is one of the ordinary battlefields this set is laid on: not the Assault's field or the Last Stand's keep (too big),
 *  not a Calamity zone (its own things, `Board.props`), not a rift's court. */
export const fieldOk = (b: Board): boolean => b.w * b.d <= 400 && !b.props?.length && !b.riftWorld;

/** Lay a board's traps and hazards for a level (0 lays none), by the side stream of `seed`. The board is changed in place (the fight's own
 *  copy); `Board.hazards` is made anew, so a board shared with the long map is never touched. */
export function layFieldHazards(b: Board, seed: number, level: number): void {
  if (!FIELD_HAZARDS.on || level <= 0 || !fieldOk(b)) return;
  const rng = new Rng(mixSeed(seed, FIELD_SALT, AREAS.indexOf(b.area)));
  const { w, d } = b;
  const rain = weatherOf(b) === 'rain';
  const kinds = LAND_HAZARDS[b.area].filter((k) => k !== 'lightning' || rain);
  const taken = new Set<number>((b.hazards ?? []).flatMap((h) => h.tiles));
  const mid = (i: number) => Math.floor(i / w) >= DEPLOY_ROWS && Math.floor(i / w) < d - DEPLOY_ROWS;
  // (plain open ground of the middle rows: nothing on it already, not a bridge, a ramp, a perch or the road's own paving)
  const plain = (i: number) => {
    const t = b.tiles[i];
    return mid(i) && standable(t) && !t.ground && !t.bridge && !t.trap && !t.ramp && !t.perch && !t.ladder && !taken.has(i);
  };
  const open = () => b.tiles.flatMap((_, i) => (plain(i) ? [i] : []));
  // (a bigger board, an army's road, is given more, in step with its open middle ground)
  const scale = Math.max(1, Math.min(ROAD_SCALE, open().length / 40));
  const [lo, hi] = PIECES[Math.min(MAX_LEVEL, Math.floor(level))];
  const n = Math.round(rng.int(lo, hi) * scale);
  const timed: Hazard[] = [];
  // (the land's kinds in turn from a start the stream picks, so a board with two pieces has two different ones)
  const start = rng.int(0, Math.max(0, kinds.length - 1));
  for (let k = 0; k < n && kinds.length; k++) {
    const kind = kinds[(start + k) % kinds.length];
    if (kind === 'thin') {
      // (thin ice lies on the ice the land already has)
      const ice = b.tiles.flatMap((t, i) => (t.ground === 'ice' && !t.trap && mid(i) ? [i] : []));
      if (!ice.length) continue;
      for (const i of patch(b, rng, ice[rng.int(0, ice.length - 1)], rng.int(...TRAPS.SIZE.thin), (j) => b.tiles[j].ground === 'ice' && !b.tiles[j].trap && mid(j))) b.tiles[i].trap = 'thin';
      continue;
    }
    const pool = open();
    if (!pool.length) break;
    const at = pool[rng.int(0, pool.length - 1)];
    if (kind === 'brazier') {
      // (a brazier stands only where everyone can still get round it)
      const t = b.tiles[at];
      t.brazier = true;
      if (!boardOk(b)) delete t.brazier;
    } else if (isTimed(kind)) {
      const [period, tell] = TRAPS.CLOCK[kind];
      const tiles = kind === 'grasp' || kind === 'blades' ? patch(b, rng, at, rng.int(2, 3), plain) : plus(b, at, plain);
      for (const i of tiles) {
        taken.add(i);
        b.tiles[i].risk = true;
      }
      // (each strike its own moment in its period, so two on a board do not go off together)
      timed.push({ kind, tiles, period, offset: tell + 2000 + rng.int(0, 30) * 100, tell });
    } else {
      for (const i of patch(b, rng, at, rng.int(...TRAPS.SIZE[kind]), plain)) b.tiles[i].trap = kind;
    }
  }
  if (timed.length) b.hazards = [...(b.hazards ?? []), ...timed];
}

/** A patch of up to `n` tiles grown from `at` over tiles that pass `ok`, a step at a time by the stream. */
function patch(b: Board, rng: Rng, at: number, n: number, ok: (i: number) => boolean): number[] {
  const out = [at];
  for (let tries = 0; out.length < n && tries < n * 6; tries++) {
    const from = out[rng.int(0, out.length - 1)];
    const [du, dv] = DIRS[rng.int(0, 3)];
    const u = (from % b.w) + du;
    const v = Math.floor(from / b.w) + dv;
    const j = v * b.w + u;
    if (u >= 0 && v >= 0 && u < b.w && v < b.d && !out.includes(j) && ok(j)) out.push(j);
  }
  return out;
}

/** A tile and its neighbours that pass `ok` (a strike's splash). */
function plus(b: Board, at: number, ok: (i: number) => boolean): number[] {
  const u = at % b.w;
  const v = Math.floor(at / b.w);
  return [at, ...DIRS.map(([du, dv]) => (tileAt(b, u + du, v + dv) ? (v + dv) * b.w + u + du : -1)).filter((j) => j >= 0 && ok(j))];
}

/** Whether a fight's board has anything of this set that acts once a second (a bog, a totem): `noteTerrain` reads it. */
export const trapsTick = (b: Board): boolean => b.tiles.some((t) => t.trap === 'bog' || t.trap === 'totem');

/** A step has ended on a trap (a walker's: a flier passes over). */
export function trapStep(b: Battle, me: Unit, out: BattleEvent[]): void {
  const t = tileOf(b, me);
  const kind = t.trap;
  if (!kind || defOf(me).flies) return;
  const at = { u: me.u, v: me.v };
  const fx = (what: BattleEvent & { kind: 'fieldTrap' }) => out.push(what);
  switch (kind) {
    case 'spikes':
      delete t.trap;
      fx({ kind: 'fieldTrap', what: 'spikes', ...at, to: me.id, gone: true });
      bite(b, me, TRAPS.SPIKES, out);
      break;
    case 'snare':
      delete t.trap;
      fx({ kind: 'fieldTrap', what: 'snare', ...at, to: me.id, gone: true });
      me.rootUntil = b.t + Math.round(TRAPS.SNARE_MS * feel(me));
      bite(b, me, TRAPS.SNARE, out);
      break;
    case 'ward':
      delete t.trap;
      fx({ kind: 'fieldTrap', what: 'ward', ...at, to: me.id, gone: true });
      bite(b, me, TRAPS.WARD, out);
      if (me.alive) stunFor(b, me, Math.round(TRAPS.WARD_MS * feel(me)));
      break;
    case 'brambles':
      fx({ kind: 'fieldTrap', what: 'brambles', ...at, to: me.id });
      bite(b, me, TRAPS.BRAMBLES, out);
      break;
    case 'bog':
      fx({ kind: 'fieldTrap', what: 'bog', ...at, to: me.id });
      bite(b, me, TRAPS.BOG, out);
      if (me.alive && AILMENT_SWITCH.on) poisonFor(b, me, me, TRAPS.BOG_POISON);
      break;
    case 'thin':
      t.trap = 'cracked';
      fx({ kind: 'fieldTrap', what: 'cracked', ...at, to: me.id });
      break;
    case 'cracked':
      // (it breaks: shallow water from now on, and whoever broke it is in it)
      delete t.trap;
      t.ground = 'water';
      noteTerrain(b);
      fx({ kind: 'fieldTrap', what: 'thin', ...at, to: me.id, gone: true });
      bite(b, me, TRAPS.ICE, out);
      if (me.alive) chillFor(b, me, Math.round(TRAPS.ICE_MS * feel(me)));
      break;
    case 'mud':
    case 'totem':
      break;
  }
}

/** Once a second: a bog bites whoever stands in it; and who stands on a totem is noted (a fighter may be thrown onto one, or off). */
export function trapSecond(b: Battle, out: BattleEvent[]): void {
  for (const x of b.units) {
    if (!x.alive) continue;
    const t = tileOf(b, x);
    const flies = defOf(x).flies;
    if (t.trap === 'totem' && !flies) x.totem = TRAPS.TOTEM;
    else if (x.totem) delete x.totem;
    if (t.trap === 'bog' && !flies) bite(b, x, TRAPS.BOG_STAND, out);
  }
}

/** A fighter has stepped: it holds a totem's strength while it stands on one, and no longer. */
export function totemStep(b: Battle, me: Unit): void {
  if (tileOf(b, me).trap === 'totem' && !defOf(me).flies) me.totem = TRAPS.TOTEM;
  else if (me.totem) delete me.totem;
}

/** A brazier is tipped over (a blow landed on a fighter beside it): it is gone, its coals lie on the open tiles round it (hot coals, as the
 *  rules already have them), and whoever stands within a tile is seared. */
export function tipBrazier(b: Battle, i: number, out: BattleEvent[]): void {
  const at = b.braziers?.indexOf(i) ?? -1;
  if (at < 0) return;
  b.braziers!.splice(at, 1);
  if (!b.braziers!.length) delete b.braziers;
  const { w } = b.board;
  const u = i % w;
  const v = Math.floor(i / w);
  delete b.board.tiles[i].brazier;
  const coals: number[] = [];
  for (const [du, dv] of [[0, 0], ...DIRS]) {
    const t = tileAt(b.board, u + du, v + dv);
    if (!t || !standable(t) || t.ground || t.bridge || t.trap) continue;
    t.ground = 'coals';
    coals.push((v + dv) * w + u + du);
  }
  noteTerrain(b);
  out.push({ kind: 'fieldTrap', what: 'brazier', u, v, gone: true, tiles: coals });
  for (const x of b.units) if (x.alive && !defOf(x).flies && Math.max(Math.abs(x.u - u), Math.abs(x.v - v)) <= 1) bite(b, x, TRAPS.BRAZIER, out);
}

/** What standing on a trap or under a strike is worth to a fighter choosing its footing, in steps of walking (above zero is bad). */
export function trapScore(flies: boolean, shot: boolean, t: Tile): number {
  if (flies) return 0;
  const k = t.trap;
  let s = t.risk ? 2 : 0;
  if (k === 'bog') s += 3;
  else if (k === 'brambles' || k === 'spikes' || k === 'snare' || k === 'ward') s += 1.5;
  else if (k === 'mud' || k === 'cracked') s += 0.5;
  // (a totem is worth holding: more to a fighter that will stand and shoot from it)
  else if (k === 'totem') s -= shot ? 1.5 : 1;
  return s;
}

/** Whether a fighter stands free to step: a snare holds its feet (it still strikes what is in reach). */
export const rooted = (b: Battle, me: Unit): boolean => (me.rootUntil ?? 0) > b.t;

/** Whether anyone stands on a tile of the board (for the tests and the tools). */
export const onTile = (b: Battle, i: number): Unit | undefined => unitAt(b, i % b.board.w, Math.floor(i / b.board.w));
