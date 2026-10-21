// The heroes' kits, King God Castle style: a skill that fires on its own when its charge fills (blows dealt and blows
// taken charge it, and so does time), and a passive that is always on. A kit is data (`KITS`) plus one `cast` function
// for the skill; the rules that read it are generic. The fight (`battle.ts`) calls `tryCast` when a hero is free,
// `onStrike` when a blow or a skill is about to hurt, `afterBlow` once a blow has landed and `tickStatus` every tick.
//
// Randomness comes from the battle's own side stream (`b.skillRng`), so the fight's main stream is left alone.

import { standable, tileAt, type At } from './board';
import { blowMult, canStrike, defOf, hurt, tileOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from './battle';
import { Rng } from './rng';

/** A skill fires at this much charge. */
export const CHARGE_MAX = 100;

/** Damage over time: `dmg` every `every` ms for `ms`. */
export interface Dot {
  kind: 'bleed' | 'burn';
  dmg: number;
  every: number;
  ms: number;
}

/** A patch of burning ground left by a meteor: a 3x3 of tiles that hurts the caster's foes standing in it. */
export interface Zone {
  u: number;
  v: number;
  side: Unit['side'];
  by: number;
  until: number;
  next: number;
  dmg: number;
}

export interface Passive {
  name: string;
  text: string;
  /** A blow may crit for `mult` and make the foe bleed. */
  crit?: { chance: number; mult: number; bleed: Dot };
  /** The share of blows it slips. */
  dodge?: number;
  /** The share of damage a blow from the front loses. */
  block?: number;
  /** Its blows set the foe alight. */
  ignite?: Dot;
}

export interface Skill {
  name: string;
  text: string;
  /** The charge it needs, and the charge a blow dealt, a blow taken and each second of time give. */
  need: number;
  dealt: number;
  taken: number;
  perSec: number;
  /** How long the hero is busy casting, and which row of its sheet plays. */
  castMs: number;
  anim: 'attack' | 'attack2' | 'defend';
  /** Fire it if there is something to fire at; false leaves the charge full for a moment later. */
  cast(b: Battle, me: Unit, out: BattleEvent[]): boolean;
}

export interface Kit {
  skill: Skill;
  passive: Passive;
}

const DIR: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
const foesOf = (b: Battle, me: Unit) => b.units.filter((x) => x.alive && x.side !== me.side);
const near3x3 = (a: At, c: At) => Math.abs(a.u - c.u) <= 1 && Math.abs(a.v - c.v) <= 1;

/** One roll of the battle's skill stream, 0 to 1. */
export function roll(b: Battle): number {
  const r = new Rng(b.skillRng);
  const x = r.next();
  b.skillRng = r.state;
  return x;
}

/** The raw power of a skill, taken off by the foe's defence once it lands. */
const net = (power: number, to: Unit) => Math.max(1, Math.round(power - defOf(to).def));

/** The foe with the most foes in the 3x3 around it (the weakest wins a tie), among those `ok` allows. */
function crowd(b: Battle, me: Unit, ok: (f: Unit) => boolean): Unit | undefined {
  const foes = foesOf(b, me);
  let best: Unit | undefined;
  let bestN = 0;
  for (const f of foes) {
    if (!ok(f)) continue;
    const n = foes.filter((x) => near3x3(x, f)).length;
    if (n > bestN || (n === bestN && best && (f.hp < best.hp || (f.hp === best.hp && f.id < best.id)))) (best = f), (bestN = n);
  }
  return best;
}

/** Knight: draws the foes near him to attack him, and takes half damage for a while. */
const SHIELD_WALL_MS = 4000;
function shieldWall(b: Battle, me: Unit): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= 3);
  if (!near.length) return false;
  for (const f of near) f.taunt = { to: me.id, until: b.t + SHIELD_WALL_MS };
  me.guardUntil = b.t + SHIELD_WALL_MS;
  return true;
}
/** What a guard lets through. */
export const GUARD_SHARE = 0.5;

/** Samurai: a dash along a line of tiles, cutting every foe on it and landing on the last free tile. */
const DASH_TILES = 4;
function iaido(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = defOf(me);
  let best: { way: number; land: At; hit: Unit[]; hp: number } | undefined;
  for (let way = 0; way < 4; way++) {
    const [du, dv] = DIR[way];
    let h = tileOf(b, me).h;
    let land: At | undefined;
    const hit: Unit[] = [];
    for (let i = 1; i <= DASH_TILES; i++) {
      const n = { u: me.u + du * i, v: me.v + dv * i };
      const t = tileAt(b.board, n.u, n.v);
      if (!t || !standable(t) || Math.abs(t.h - h) > def.jump) break;
      const there = unitAt(b, n.u, n.v);
      if (there) {
        if (there.side !== me.side) hit.push(there);
      } else land = n;
      h = t.h;
    }
    if (!hit.length || !land) continue;
    const hp = hit.reduce((s, f) => s + f.hp, 0);
    if (!best || hit.length > best.hit.length || (hit.length === best.hit.length && hp < best.hp)) best = { way, land, hit, hp };
  }
  if (!best) return false;
  const from = { u: me.u, v: me.v };
  const h0 = tileOf(b, me).h;
  me.facing = best.way;
  for (const f of best.hit) {
    const power = def.atk * 1.6 * blowMult(h0, tileOf(b, f).h, best.way, f.facing);
    hurt(b, me, f, net(power, f), true, false, out, 'skill');
  }
  const ms = 260;
  me.step = { u: from.u, v: from.v, h: h0, at: b.t, ms };
  me.u = best.land.u;
  me.v = best.land.v;
  out.push({ kind: 'dash', by: me.id, from, to: best.land });
  return true;
}

/** Kunoichi: slips behind the weakest foe and backstabs it. */
function shadowStep(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = defOf(me);
  const foes = foesOf(b, me).sort((x, y) => x.hp - y.hp || x.id - y.id);
  for (const f of foes) {
    const hf = tileOf(b, f).h;
    // behind is where a foe's facing points away from; then its sides, then its front
    const behind = { u: f.u - DIR[f.facing][0], v: f.v - DIR[f.facing][1] };
    const cands = DIR.map(([du, dv]) => ({ u: f.u + du, v: f.v + dv }))
      .filter((c) => {
        const t = tileAt(b.board, c.u, c.v);
        return t && standable(t) && !unitAt(b, c.u, c.v) && Math.abs(t.h - hf) <= def.jump;
      })
      .sort((x, y) => {
        const rank = (c: At) => (c.u === behind.u && c.v === behind.v ? 0 : apart(c, behind) === 2 ? 2 : 1);
        return rank(x) - rank(y) || apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u;
      });
    if (!cands.length) continue;
    const to = cands[0];
    const from = { u: me.u, v: me.v };
    me.u = to.u;
    me.v = to.v;
    me.step = undefined;
    me.facing = wayTo(me, f);
    out.push({ kind: 'blink', by: me.id, from, to });
    const power = def.atk * 1.8 * blowMult(tileOf(b, me).h, hf, me.facing, f.facing);
    hurt(b, me, f, net(power, f), true, false, out, 'skill');
    return true;
  }
  return false;
}

/** Archer: arrows rain on a 3x3 of tiles a moment after the call, on whoever is standing there. */
const VOLLEY_MS = 700;
function volley(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = defOf(me);
  const aim = crowd(b, me, (f) => canStrike(b.board, def, me, f));
  if (!aim) return false;
  b.pending.push({ at: b.t + VOLLEY_MS, kind: 'rain', by: me.id, to: aim.id, dmg: def.atk * 1.0, heavy: false, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'volley', u: aim.u, v: aim.v, ms: VOLLEY_MS });
  return true;
}

/** Wizard: a meteor falls on a 3x3 and leaves it burning. */
const METEOR_MS = 1100;
const METEOR_REACH = 6;
const BURN_MS = 4000;
const BURN_EVERY = 500;
function meteor(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = defOf(me);
  const aim = crowd(b, me, (f) => apart(me, f) <= METEOR_REACH);
  if (!aim) return false;
  b.pending.push({ at: b.t + METEOR_MS, kind: 'meteor', by: me.id, to: aim.id, dmg: def.atk * 2.2, heavy: true, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: METEOR_MS });
  return true;
}

export const KITS: Record<string, Kit> = {
  knight: {
    skill: { name: 'Shield Wall', text: 'Foes near him turn on him, and he takes half damage for 4s', need: CHARGE_MAX, dealt: 4, taken: 7, perSec: 2, castMs: 600, anim: 'defend', cast: shieldWall },
    passive: { name: 'Stout Shield', text: 'Blows from the front lose a quarter', block: 0.25 },
  },
  samurai: {
    skill: { name: 'Iaido', text: 'Dashes up to 4 tiles in a line, cutting every foe on it', need: CHARGE_MAX, dealt: 8, taken: 4, perSec: 2, castMs: 500, anim: 'attack2', cast: iaido },
    passive: { name: 'Keen Edge', text: '15% of blows crit for x1.6 and make the foe bleed', crit: { chance: 0.15, mult: 1.6, bleed: { kind: 'bleed', dmg: 4, every: 500, ms: 3000 } } },
  },
  kunoichi: {
    skill: { name: 'Shadow Step', text: 'Slips behind the weakest foe and backstabs it', need: CHARGE_MAX, dealt: 6, taken: 4, perSec: 2, castMs: 450, anim: 'attack2', cast: shadowStep },
    passive: { name: 'Evasion', text: 'Slips 20% of blows', dodge: 0.2 },
  },
  archer: {
    skill: { name: 'Volley', text: 'Arrows rain on a 3x3 of tiles', need: CHARGE_MAX, dealt: 6, taken: 4, perSec: 2, castMs: 600, anim: 'attack2', cast: volley },
    passive: { name: 'Eagle Eye', text: 'Reaches twice as far from height', },
  },
  wizard: {
    skill: { name: 'Meteor', text: 'A meteor blasts a 3x3 and leaves it burning', need: CHARGE_MAX, dealt: 9, taken: 4, perSec: 2, castMs: 800, anim: 'attack', cast: meteor },
    passive: { name: 'Cinders', text: 'Its blows set the foe alight', ignite: { kind: 'burn', dmg: 3, every: 500, ms: 2000 } },
  },
};

export const kitOf = (u: Unit): Kit | undefined => KITS[u.def];

/** A free hero whose charge is full lets its skill go, if there is something to use it on. */
export function tryCast(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const k = kitOf(me);
  if (!k || me.charge < k.skill.need) return false;
  if (!k.skill.cast(b, me, out)) return false;
  me.charge -= k.skill.need;
  me.cast = { at: b.t, ms: k.skill.castMs, anim: k.skill.anim };
  me.swing = undefined;
  me.busyUntil = b.t + k.skill.castMs;
  out.push({ kind: 'skill', by: me.id, name: k.skill.name, ms: k.skill.castMs });
  return true;
}

const gain = (u: Unit, n: number) => {
  if (u.alive && kitOf(u)) u.charge = Math.min(CHARGE_MAX, u.charge + n);
};

/** What a blow or skill does to its target after guards, blocks and dodges (null when slipped), charging both sides. */
export function onStrike(b: Battle, by: Unit, to: Unit, dmg: number, src: 'blow' | 'skill' | 'dot', splash: boolean, out: BattleEvent[]): number | null {
  const blow = src === 'blow';
  const kit = kitOf(to);
  if (blow && kit?.passive.dodge && roll(b) < kit.passive.dodge) {
    out.push({ kind: 'dodge', to: to.id });
    gain(to, kitOf(to)!.skill.taken * 0.5);
    return null;
  }
  if (blow && kit?.passive.block && (wayTo(by, to) + 2) % 4 === to.facing) dmg *= 1 - kit.passive.block;
  if (to.guardUntil !== undefined && to.guardUntil > b.t) dmg *= GUARD_SHARE;
  if (src !== 'dot') {
    if (blow && !splash) gain(by, kitOf(by)?.skill.dealt ?? 0);
    gain(to, kit?.skill.taken ?? 0);
  }
  return Math.max(1, Math.round(dmg));
}

/** A blow's own odds at swing time: a crit, with its extra damage. */
export function rollCrit(b: Battle, me: Unit): number {
  const c = kitOf(me)?.passive.crit;
  return c && roll(b) < c.chance ? c.mult : 1;
}

/** After a blow has landed: a crit makes the foe bleed, and a flame blow sets it alight. */
export function afterBlow(b: Battle, by: Unit, to: Unit, crit: boolean): void {
  if (!to.alive) return;
  const p = kitOf(by)?.passive;
  const dot = crit ? p?.crit?.bleed : p?.ignite;
  if (dot) to.dot = { ...dot, by: by.id, next: b.t + dot.every, until: b.t + dot.ms };
}

/** Land a volley or a meteor: everything of the caster's foes in the 3x3 is struck. */
export function landArea(b: Battle, kind: 'rain' | 'meteor', by: Unit, u: number, v: number, power: number, out: BattleEvent[]): void {
  for (const f of b.units)
    if (f.alive && f.side !== by.side && near3x3(f, { u, v })) hurt(b, by, f, net(power, f), kind === 'meteor', false, out, 'skill');
  if (kind === 'meteor') {
    b.zones.push({ u, v, side: by.side, by: by.id, until: b.t + BURN_MS, next: b.t + BURN_EVERY, dmg: 6 });
    out.push({ kind: 'zone', u, v, ms: BURN_MS });
  }
}

/** Every tick: skill charge by time, damage over time, burning ground. */
export function tickStatus(b: Battle, out: BattleEvent[]): void {
  for (const u of b.units) {
    if (!u.alive) continue;
    const k = kitOf(u);
    if (k) gain(u, (k.skill.perSec * 100) / 1000);
    const d = u.dot;
    if (d) {
      if (b.t >= d.until) u.dot = undefined;
      else if (b.t >= d.next) {
        d.next += d.every;
        hurt(b, b.units.find((x) => x.id === d.by)!, u, d.dmg, false, false, out, 'dot');
      }
    }
  }
  for (const z of b.zones) {
    while (z.next <= b.t && z.next <= z.until) {
      z.next += BURN_EVERY;
      const by = b.units.find((x) => x.id === z.by)!;
      for (const f of b.units) if (f.alive && f.side !== z.side && near3x3(f, z)) hurt(b, by, f, z.dmg, false, false, out, 'dot');
    }
  }
  b.zones = b.zones.filter((z) => z.until > b.t);
}
