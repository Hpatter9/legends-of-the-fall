// The siege works (phase 1b, `docs/notes/assault-1.md`; the design's 5.2): the owner's siege tools.
//
// - LADDERS. A platoon carrying a ladder kit (bought at the muster) is ordered to Scale the stone wall by a tile: it walks to the wall's foot
//   there, and four seconds after it stands at the foot the ladder goes up. The foot and the wall-walk above it are then joined for walkers
//   of both sides (`Tile.ladder`, read by `canStep`). Defenders beside the ladder's top push it down: it has 600 hp, and each foe there takes
//   60 off it a second. Down, the ladder is gone (the kit with it).
// - THE RAM. One a battle (bought at the muster), pushed by a platoon. It follows its platoon at the Shieldguard's walk; with its platoon
//   ordered to Assault a gate or a segment of the palisade, it rolls up to it and strikes it for 600 (at the garrison's toughness) every two
//   seconds. It never fights the garrison. The garrison strikes it like one of ours, and its archers' shots set it burning (twice as hard).
// - FIRE ARROWS. A platoon with shooters (its hero's shot, or its soldiers') ordered to Fire at a hut of the hold walks until the hut is
//   within six tiles, and looses fire arrows at it. Six burn it: for thirty seconds it smokes, and every foe within three tiles of it chokes
//   (3% of its health a second) and panics (its blows land at three quarters); a post asleep by it wakes. Then it has burnt out.
// - SUPPRESSION. A platoon with shooters ordered to Suppress a spot (the wall-top archers, a tower) keeps its shooters on the foes within two
//   tiles of it: while any of its shooters stands within eight of the spot, those foes' blows land at half.
//
// Deterministic: no random numbers, the ladders and the arrows by tick. Pure rules: no Pixi, no DOM.

import { defOf, hurt, strikeDef, stepTo, WAIT_MS, type Battle, type BattleEvent, type Unit } from '../battle';
import { DIRS, standable, type At } from '../board';
import { UNITS, type UnitDef } from '../units';
import { forNear, type FieldState } from './field';
import { LAND, ringOf, WALL_TOP } from './fieldMap';
import { hitFort } from './forts';
import { holdBoosts, addFieldUnit, freeNear } from './garrison';
import { rebuildSectors } from './sectors';
import type { HoldState, HutState, PlatoonState, SiegeState } from './holdTypes';
import type { Blueprint } from './blueprint';
import { SIEGE_PRICES } from './economy';

export { SIEGE_PRICES };

/** A ladder goes up this long after its platoon stands at the wall's foot; it has this much hp, and each defender beside its top pushes
 *  this much off it a second. */
export const SCALE_MS = 4000;
export const LADDER_HP = 600;
export const LADDER_PUSH = 60;
/** The ram: a blow every `RAM_MS` for `RAM_HIT` (at the garrison's toughness, as the gates' hp are); shots strike it this much harder. */
export const RAM_MS = 2000;
export const RAM_HIT = 600;
export const RAM_BURNS = 2;
/** Fire arrows: loosed from this near; this many burn a hut; it burns this long, and smokes this far round it. */
export const FIRE_RANGE = 6;
export const FIRE_NEED = 6;
export const BURN_MS = 30_000;
export const SMOKE = 3;
/** A foe in the smoke loses this share of its health a second, and its blows land at `CHOKE`. */
export const BURN = 0.03;
export const CHOKE = 0.75;
/** Suppression: the foes this near the spot, while a shooter of the platoon stands this near it, strike at `SUPPRESSED`. */
export const SUPPRESS_R = 2;
export const SUPPRESS_RANGE = 8;
export const SUPPRESSED = 0.5;

/** The ram's own numbers: slow (the Shieldguard's walk), hard to hurt, striking only walls (its blows are the siege's, not the battle's). */
export const RAM: UnitDef = {
  id: 'siegeRam', name: 'Battering Ram', side: 'hero', sheet: '', scale: 1, hp: 4000, atk: 0, def: 14, range: 1, moveMs: 800, atkMs: RAM_MS, jump: 2,
  role: 'Pushed by its platoon; batters the gates', summon: true,
};
// (added to `UNITS` once, as this module is first imported: an existing fight never meets it)
if (!UNITS[RAM.id]) UNITS[RAM.id] = RAM;

const dist = (a: At, z: At) => Math.abs(a.u - z.u) + Math.abs(a.v - z.v);
const atOf = (i: number, w: number): At => ({ u: i % w, v: Math.floor(i / w) });

/** The siege state as an assault opens: the huts from the blueprint, the ladder kits on their platoons, and the ram beside its platoon. */
export function startSiege(b: Battle, f: FieldState, h: HoldState): SiegeState {
  const w = b.board.w;
  const huts: HutState[] = [];
  const n: Record<string, number> = {};
  for (const s of h.bp.stamps) {
    if (s.kind !== 'solid' || !s.burns) continue;
    const tiles: number[] = [];
    for (let v = s.rect.v0; v <= s.rect.v1; v++) for (let u = s.rect.u0; u <= s.rect.u1; u++) tiles.push(v * w + u);
    const k = (n[s.name] = (n[s.name] ?? 0) + 1);
    huts.push({ id: `${s.name.toLowerCase().replace(/[^a-z]+/g, '-')}-${k}`, name: s.name, tiles, fire: 0 });
  }
  const siege: SiegeState = { ladders: [], huts, arrows: [], zones: [] };
  const kit = h.input.siege;
  for (const pl of h.platoons) if (kit?.ladders?.includes(pl.hero)) pl.ladder = true;
  const k = h.platoons.findIndex((p) => p.hero === kit?.ram);
  if (k >= 0) {
    const pl = h.platoons[k];
    const lead = f.byId[pl.heroId];
    const castle = h.input.castle ?? {};
    const ram = addFieldUnit(b, f, RAM.id, freeNear(b, f, { u: lead.u, v: lead.v }, false), { hp: 1 / (castle.hp ?? 1), atk: 1 / (castle.atk ?? 1) }, pl.group, 99);
    siege.ram = { id: ram.id, platoon: k, next: 0 };
  }
  return siege;
}

// ---- the ladders ------------------------------------------------------------------------------------------------------------------

/** Where a ladder against the stone wall by `at` stands: the wall-walk tile nearest `at` with a tile of the outer bailey at its foot (the
 *  foot on the outer side, at the bailey's height). Null with no wall within three tiles. */
export function scaleAim(b: Battle, f: FieldState, at: At): { foot: number; top: number } | null {
  const w = b.board.w;
  let best: { foot: number; top: number } | null = null;
  let bd = Infinity;
  for (let dv = -3; dv <= 3; dv++)
    for (let du = -3; du <= 3; du++) {
      const u = at.u + du;
      const v = at.v + dv;
      if (u < 1 || v < 1 || u >= w - 1 || v >= b.board.d - 1) continue;
      const top = v * w + u;
      const t = b.board.tiles[top];
      if (f.zone[top] !== 83 || t.h !== WALL_TOP || !standable(t) || t.perch) continue;
      for (const [eu, ev] of DIRS) {
        const foot = (v + ev) * w + u + eu;
        const ft = b.board.tiles[foot];
        if (!standable(ft) || ft.h > LAND + 1 || ft.ladder || ringOf(u + eu, v + ev) <= ringOf(u, v)) continue;
        const d = Math.abs(du) + Math.abs(dv);
        if (d < bd) {
          bd = d;
          best = { foot, top };
        }
      }
    }
  return best;
}

/** A ladder up: the two tiles joined, the sectors rebuilt for them, the page told. */
function raise(b: Battle, h: HoldState, k: number, aim: { foot: number; top: number }): void {
  const id = h.siege.ladders.length + 1;
  b.board.tiles[aim.foot].ladder = id;
  b.board.tiles[aim.top].ladder = id;
  h.siege.ladders.push({ id, foot: aim.foot, top: aim.top, hp: LADDER_HP, platoon: k, up: true });
  rebuildSectors(b.field!.sectors, b.board, [aim.foot, aim.top]);
  b.field!.stats.rebuilds++;
  h.events.push({ kind: 'ladder', platoon: k, tiles: [aim.foot, aim.top], up: true });
}

function fell(b: Battle, h: HoldState, n: number): void {
  const l = h.siege.ladders[n];
  if (!l.up) return;
  l.up = false;
  l.hp = 0;
  delete b.board.tiles[l.foot].ladder;
  delete b.board.tiles[l.top].ladder;
  rebuildSectors(b.field!.sectors, b.board, [l.foot, l.top]);
  b.field!.stats.rebuilds++;
  h.events.push({ kind: 'ladder', platoon: l.platoon, tiles: [l.foot, l.top], up: false });
}

/** The Scale order's goal: the wall's foot, or (the ladder up) the wall-walk above it. Null if there is no wall there or no kit. */
export function scaleGoal(b: Battle, f: FieldState, pl: PlatoonState, at: At): At | null {
  const w = b.board.w;
  if (pl.aim === undefined) pl.aim = scaleAim(b, f, at);
  if (!pl.aim) return null;
  if (!pl.ladder) return b.board.tiles[pl.aim.foot].ladder ? atOf(pl.aim.top, w) : null;
  return atOf(pl.aim.foot, w);
}

// ---- the ram ----------------------------------------------------------------------------------------------------------------------

/** The ram's mind: batter the structure its platoon assaults when beside it; else roll after its platoon, two tiles behind. */
export function ramMind(b: Battle, f: FieldState, h: HoldState, me: Unit, anchor: Unit | undefined, out: BattleEvent[], walk: (to: At) => boolean): void {
  const r = h.siege.ram!;
  const pl = h.platoons[r.platoon];
  const w = b.board.w;
  const o = pl.order;
  const i = o.kind === 'assault' ? h.forts.findIndex((x) => x.spec.id === o.fort) : -1;
  const fort = i >= 0 ? h.forts[i] : undefined;
  if (fort && !fort.broken && !fort.open && fort.spec.kind !== 'drum') {
    const here = b.board.tiles[me.v * w + me.u].h;
    const beside = fort.spec.tiles.some((t) => dist(atOf(t, w), me) <= 1 && Math.abs(b.board.tiles[t].h - here) <= 2);
    if (beside) {
      if (b.t >= r.next) {
        const k = holdBoosts(h).foes.hp ?? 1;
        r.next = b.t + RAM_MS;
        me.swing = { at: b.t, ms: 600, to: -1 };
        h.events.push({ kind: 'ram', fort: fort.spec.id });
        hitFort(b, h, i, Math.round(RAM_HIT * k), me.id, out);
      }
      me.busyUntil = b.t + 300;
      return;
    }
    const at = besideFort(b, me, fort.spec.tiles);
    if (at && (walk(at) || roll(b, f, me, at, out))) return;
  } else if (anchor && dist(me, anchor) > 2 && (walk({ u: anchor.u, v: anchor.v }) || roll(b, f, me, anchor, out))) return;
  me.busyUntil = b.t + WAIT_MS;
}

/** The free tile beside a structure nearest the ram. */
function besideFort(b: Battle, me: Unit, tiles: readonly number[]): At | null {
  const w = b.board.w;
  let best: At | null = null;
  let bd = Infinity;
  for (const i of tiles)
    for (const [du, dv] of DIRS) {
      const at = { u: (i % w) + du, v: Math.floor(i / w) + dv };
      const t = b.board.tiles[at.v * w + at.u];
      if (!t || !standable(t) || t.ground === 'deep') continue;
      const d = dist(me, at);
      if (d < bd) {
        bd = d;
        best = at;
      }
    }
  return best;
}

/** The ram rolls a tile towards a mark: the free neighbour nearer it, within its jump (else its walk, the field's own, finds the way round). */
function roll(b: Battle, f: FieldState, me: Unit, mark: At, out: BattleEvent[]): boolean {
  const w = b.board.w;
  const here = b.board.tiles[me.v * w + me.u];
  let best = -1;
  let bd = dist(me, mark);
  for (const [du, dv] of DIRS) {
    const u = me.u + du;
    const v = me.v + dv;
    if (u < 0 || v < 0 || u >= w || v >= b.board.d) continue;
    const j = v * w + u;
    const t = b.board.tiles[j];
    if (f.occ[j] >= 0 || !standable(t) || t.ground === 'deep' || Math.abs(t.h - here.h) > defOf(me).jump) continue;
    const d = dist({ u, v }, mark);
    if (d < bd) {
      bd = d;
      best = j;
    }
  }
  if (best < 0) return false;
  stepTo(b, me, best, out);
  return true;
}

// ---- fire arrows ------------------------------------------------------------------------------------------------------------------

/** Whether a fighter looses arrows or bolts (a hero's shot, a soldier's). */
export const shoots = (b: Battle, x: Unit): boolean => !!strikeDef(b, x).shot;
/** Whether a platoon has a shooter standing. */
export function hasShooters(b: Battle, f: FieldState, pl: PlatoonState): boolean {
  const hero = f.byId[pl.heroId];
  if (hero?.alive && shoots(b, hero)) return true;
  return pl.soldiers.some((s) => f.byId[s.id]?.alive && shoots(b, f.byId[s.id]));
}

/** The nearest tile of a hut to a spot, and how far. */
export function hutNear(b: Battle, hut: HutState, at: At): { at: At; d: number } {
  const w = b.board.w;
  let best = atOf(hut.tiles[0], w);
  let bd = Infinity;
  for (const t of hut.tiles) {
    const p = atOf(t, w);
    const d = dist(p, at);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return { at: best, d: bd };
}

/** A shooter of a platoon ordered to Fire looses at its hut, if within range: true when it did. */
export function looseFire(b: Battle, h: HoldState, me: Unit, hutId: string, out: BattleEvent[]): boolean {
  const n = h.siege.huts.findIndex((x) => x.id === hutId);
  const hut = h.siege.huts[n];
  if (!hut || hut.burning !== undefined || hut.burnt || !shoots(b, me)) return false;
  const near = hutNear(b, hut, me);
  if (near.d > FIRE_RANGE) return false;
  const def = defOf(me);
  me.facing = Math.abs(near.at.u - me.u) >= Math.abs(near.at.v - me.v) ? (near.at.u > me.u ? 0 : 2) : near.at.v > me.v ? 1 : 3;
  me.swing = { at: b.t, ms: Math.min(def.atkMs, 600), to: -1 };
  me.busyUntil = b.t + def.atkMs;
  h.siege.arrows.push({ at: b.t + 400, hut: n });
  out.push({ kind: 'swing', by: me.id, to: -1 });
  return true;
}

// ---- each tick, each second -------------------------------------------------------------------------------------------------------

/** The siege's tick: the fire arrows that land, the ladders that go up, the suppressed spots; and on the first tick of a second the smoke,
 *  the burning out and the defenders pushing at the ladders. */
export function siegeTick(b: Battle, f: FieldState, h: HoldState, anchorOf: (pl: PlatoonState) => Unit | undefined, out: BattleEvent[]): void {
  const s = h.siege;
  const w = b.board.w;
  // (the fire arrows landing: six burn a hut)
  if (s.arrows.length) {
    const keep: typeof s.arrows = [];
    for (const a of s.arrows) {
      if (a.at > b.t) {
        keep.push(a);
        continue;
      }
      const hut = s.huts[a.hut];
      if (hut.burning !== undefined || hut.burnt) continue;
      if (++hut.fire >= FIRE_NEED) {
        hut.burning = b.t + BURN_MS;
        h.events.push({ kind: 'burn', hut: hut.id });
      }
    }
    s.arrows = keep;
  }
  // (the ladders: a platoon at the wall's foot four seconds raises its own)
  h.platoons.forEach((pl, k) => {
    if (pl.order.kind !== 'scale' || !pl.ladder || !pl.aim) {
      pl.raising = undefined;
      return;
    }
    const a = anchorOf(pl);
    if (!a || dist(a, atOf(pl.aim.foot, w)) > 1) {
      pl.raising = undefined;
      return;
    }
    pl.raising ??= b.t;
    if (b.t - pl.raising < SCALE_MS) return;
    pl.ladder = false;
    pl.raising = undefined;
    raise(b, h, k, pl.aim);
  });
  // (the spots kept under suppression this tick)
  s.zones = [];
  for (const pl of h.platoons) {
    if (pl.order.kind !== 'suppress') continue;
    const at = pl.order.at;
    const hero = f.byId[pl.heroId];
    const near = (x: Unit | undefined) => !!x?.alive && shoots(b, x) && dist(x, at) <= SUPPRESS_RANGE;
    if (near(hero) || pl.soldiers.some((x) => near(f.byId[x.id]))) s.zones.push(at);
  }
  if (f.stats.ticks % 10 !== 0) return;
  // (the smoke: the foes by a burning hut choke and wake; a hut burns out)
  for (const hut of s.huts) {
    if (hut.burning === undefined) continue;
    if (b.t >= hut.burning) {
      hut.burning = undefined;
      hut.burnt = true;
      continue;
    }
    const c = atOf(hut.tiles[0], w);
    forNear(f, c.u, c.v, SMOKE + 2, (x) => {
      if (x.side !== 'foe' || !x.alive || !inSmoke(b, h, x)) return;
      hurt(b, x, x, Math.max(1, Math.round(x.maxHp * BURN)), false, false, out, 'dot');
    });
  }
  // (the defenders beside a ladder's top push it down)
  s.ladders.forEach((l, n) => {
    if (!l.up) return;
    const top = atOf(l.top, w);
    let pushers = 0;
    forNear(f, top.u, top.v, 1, (x) => {
      if (x.side === 'foe' && x.alive && dist(x, top) <= 1) pushers++;
    });
    if (!pushers) return;
    l.hp = Math.max(0, l.hp - pushers * LADDER_PUSH);
    if (l.hp <= 0) fell(b, h, n);
  });
}

/** Whether a fighter stands in a burning hut's smoke. */
export function inSmoke(b: Battle, h: HoldState, x: At): boolean {
  for (const hut of h.siege.huts) if (hut.burning !== undefined && hutNear(b, hut, x).d <= SMOKE) return true;
  return false;
}

/** Whether a foe stands in a spot kept under suppression. */
export const suppressed = (h: HoldState, x: At): boolean => h.siege.zones.some((z) => dist(z, x) <= SUPPRESS_R);

/** The siege's share of a blow: a foe choking in smoke or under suppression strikes softer; a shot sets the ram burning. */
export function siegeBlow(b: Battle, h: HoldState, me: Unit, to: Unit): number {
  let m = 1;
  if (me.side === 'foe') {
    if (h.siege.zones.length && suppressed(h, me)) m *= SUPPRESSED;
    if (h.siege.huts.some((x) => x.burning !== undefined) && inSmoke(b, h, me)) m *= CHOKE;
  }
  if (to.def === RAM.id && strikeDef(b, me).shot) m *= RAM_BURNS;
  return m;
}

/** What the siege works paid back after an assault (`settleAssault`): the ladder kits never raised, and the ram if it still stands. */
export function siegeRefund(b: Battle, h: HoldState): number {
  let n = 0;
  for (const pl of h.platoons) if (pl.ladder) n += SIEGE_PRICES.ladder;
  const ram = h.siege.ram;
  if (ram && b.field!.byId[ram.id]?.alive) n += SIEGE_PRICES.ram;
  return n;
}

/** The huts of a blueprint (for the page's targets before a fight has one). */
export const hutsOf = (bp: Blueprint): string[] => bp.stamps.filter((s) => s.kind === 'solid' && s.burns).map((s) => (s as { name: string }).name);
