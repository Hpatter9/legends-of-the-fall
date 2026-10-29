// The heroes' kits (and the bosses'), King God Castle style: a skill that fires on its own when its charge fills (blows dealt and blows
// taken charge it, and so does time), and a passive that is always on. A kit is data (`KITS`) plus one `cast` function
// for the skill; the rules that read it are generic. The fight (`battle.ts`) calls `tryCast` when a hero is free,
// `onStrike` when a blow or a skill is about to hurt, `afterBlow` once a blow has landed and `tickStatus` every tick.
//
// Randomness comes from the battle's own side stream (`b.skillRng`), so the fight's main stream is left alone.

import { sightClear, standable, tileAt, type At } from './board';
import { addUnit, atkOf, blowMult, canStrike, defenceOf, defOf, hurt, strikeDef, tileOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from './battle';
import { eliteKits } from './eliteFoes';
import { calBossKits } from './calamityBosses';
import { Rng } from './rng';
import { fxBlow, fxStruck, fxTick, hidden } from './equipFx';
import { heroUltimates } from './ultimates';
import { runRiders } from './tierSkills';
import { traitsOf } from './traits';
import { triggerDuoComboOnUlt } from './duoCombos';
import { addRes, castHero, CHARGE_TO_POOL, heroKitOf, poolOf, poolOnDealt, poolOnTaken, resMax, tickPool, ultOnDamage } from './heroKits';
import { kitStrike, kitTick } from './kits/effects';

/** A skill fires at this much charge. */
export const CHARGE_MAX = 100;
/** A foe frozen by Deep Freeze takes this much more from every blow until it thaws. */
export const BRITTLE_MULT = 1.3;
/** An ultimate gathers charge at this share of its first skill's rate. */
export const ULT_RATE = 0.45;
/** The level a hero fights at to have an ultimate that carries `unlock: ULT_LEVEL` (a kind's lasting level; in the spire and Calamity, the in-run level). */
export const ULT_LEVEL = 30;

/** Damage over time: `dmg` every `every` ms for `ms`. */
export interface Dot {
  kind: 'bleed' | 'burn' | 'curse';
  dmg: number;
  every: number;
  ms: number;
}

/** A snare the Ranger lays: the first foe to stand on the tile is hurt and held. */
export interface Trap {
  u: number;
  v: number;
  side: Unit['side'];
  by: number;
  until: number;
  dmg: number;
  /** How long it holds whoever springs it (a snare's `ROOT_MS` when unset). */
  hold?: number;
  wisp?: boolean;
}

/** Heal over time (the Cleric's blessing): `amount` every `every` ms until `until`. */
export interface Hot {
  amount: number;
  every: number;
  next: number;
  until: number;
  by: number;
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
  /** Caltrops, not fire (the Ranger's Spike Field): it also slows whoever stands in it this long. */
  slow?: number;
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
  /** Its blows ignore this much of the foe's defence. */
  pierce?: number;
  /** The chance a blow also arcs to a second foe near the target, for `ARC_SHARE` of the blow. */
  arc?: number;
  /** Every `every` ms it mends the most hurt ally (itself too) for `share` of its attack. */
  mend?: { every: number; share: number };
  /** Heals this share of its health each second. */
  regen?: number;
  /** It heals itself for this share of the damage its blows deal. */
  leech?: number;
  /** Its blows deal this much more to shooters. */
  prey?: number;
  /** Takes this much less from each ally on the tiles beside it (up to three). */
  huddle?: number;
  /** Each kill quickens its blows by `per` (a share) for `ms`; the kills stack up to `max`. */
  frenzy?: { per: number; ms: number; max: number };
  /** Its blows deal `mult` more to a foe under `under` of its health. */
  finish?: { under: number; mult: number };
  /** Climbs at no extra cost. */
  sure?: boolean;
  /** Takes this much less from shots (a blow from a shooter). */
  scales?: number;
  /** Cannot be knocked back. */
  steady?: boolean;
  /** It heals itself for this share of the damage its front block turns aside. */
  blockHeal?: number;
  /** Every second the allies within 2 tiles (and it) heal this share of their health. */
  aura?: number;
  /** Its attack grows by up to this much as its health falls. */
  rage?: number;
  /** A melee blow it takes sends this share of its damage back at the attacker. */
  thorns?: number;
  /** Its blows deal this much more to foes 4 or more tiles away. */
  far?: number;
  /** A blow also hits the foe right behind its target, for this share. */
  through?: number;
  /** Its blows slow the foe for this many ms. */
  slow?: number;
  /** Every `every` ms the ally with the least skill charge near it gains `charge`. */
  tune?: { every: number; charge: number };
  /** The allies within 2 tiles (and it) take this much less from every blow. */
  halo?: number;
  /** Once a fight, when it would fall it rises with this share of its health. */
  undying?: number;
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
  /** For a hero's ultimate: the level it fights at before this ultimate is its own (it neither charges nor fires below it); unset is always. A foe's never waits. */
  unlock?: number;
  /** For a hero's ultimate: its meter speed (times `ULT_RATE`) and its strength (times the caster's attack while it casts, and what a stun, guard or heal is worth) once the hero fights at `ULT_LEVEL` or more. These are the balance knobs, tuned per hero (`ultimates.ts`) so every hero stays within the band of the roster average at level 15 and up; below that level the ultimate is as written. */
  tuned?: { rate: number; power: number };
  /** Fire it if there is something to fire at; false leaves the charge full for a moment later. */
  cast(b: Battle, me: Unit, out: BattleEvent[]): boolean;
}

export interface Kit {
  skill: Skill;
  /** An ultimate, a second, bigger skill (every hero has one; `ultimates.ts` has all but the first eight's): it charges on its own meter, `ULT_RATE` as fast as the first (its own charge rates are unused). */
  ultimate?: Skill;
  passive: Passive;
}

const DIR: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
export const foesOf = (b: Battle, me: Unit) => b.units.filter((x) => x.alive && x.side !== me.side && !hidden(b, x));
const near3x3 = (a: At, c: At) => Math.abs(a.u - c.u) <= 1 && Math.abs(a.v - c.v) <= 1;

/** A talent modifier a hero has (`talents.ts` lists the keys; 0 for a hero without it, and for every foe). */
export const tal = (u: Unit, key: string): number => u.eq?.tal?.[key] ?? 0;
/** A skill's duration in ms, lengthened by the caster's `dur` talent. */
const durOf = (me: Unit, ms: number): number => Math.round(ms * (1 + tal(me, 'dur')));
/** A skill's reach in tiles, lengthened by the caster's `reach` talent. */
const reachOf = (me: Unit, n: number): number => n + tal(me, 'reach');

/** One roll of the battle's skill stream, 0 to 1. */
export function roll(b: Battle): number {
  const r = new Rng(b.skillRng);
  const x = r.next();
  b.skillRng = r.state;
  return x;
}

/** The raw power of a skill, taken off by the foe's defence once it lands. */
const net = (power: number, to: Unit) => Math.max(1, Math.round(power - defenceOf(to)));

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
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 3));
  if (!near.length) return false;
  const ms = durOf(me, SHIELD_WALL_MS);
  for (const f of near) f.taunt = { to: me.id, until: b.t + ms };
  me.guardUntil = b.t + ms;
  return true;
}
/** What a guard lets through. */
export const GUARD_SHARE = 0.5;

/** Samurai: a dash along a line of tiles, cutting every foe on it and landing on the last free tile. */
const DASH_TILES = 4;
function iaido(b: Battle, me: Unit, out: BattleEvent[], tiles = DASH_TILES, mult = 1.6): boolean {
  const def = defOf(me);
  let best: { way: number; land: At; hit: Unit[]; hp: number } | undefined;
  for (let way = 0; way < 4; way++) {
    const [du, dv] = DIR[way];
    let h = tileOf(b, me).h;
    let land: At | undefined;
    const hit: Unit[] = [];
    for (let i = 1; i <= reachOf(me, tiles); i++) {
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
    const power = atkOf(me) * mult * blowMult(h0, tileOf(b, f).h, best.way, f.facing);
    hurt(b, me, f, net(power, f), true, false, out, 'skill');
  }
  const ms = 260;
  me.step = { u: from.u, v: from.v, h: h0, at: b.t, ms };
  me.u = best.land.u;
  me.v = best.land.v;
  out.push({ kind: 'dash', by: me.id, from, to: best.land });
  return true;
}

/** A blink behind a foe (the first `order` puts first that has a free tile beside it) and a backstab for `mult` of the attack. A foe in `done` is passed over, and the one struck is added to it. */
function blinkStrike(b: Battle, me: Unit, out: BattleEvent[], mult: number, order: (x: Unit, y: Unit) => number, done?: Set<number>): boolean {
  const def = defOf(me);
  const foes = foesOf(b, me).filter((f) => !done?.has(f.id)).sort(order);
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
    const power = atkOf(me) * mult * blowMult(tileOf(b, me).h, hf, me.facing, f.facing);
    hurt(b, me, f, net(power, f), true, false, out, 'skill');
    done?.add(f.id);
    return true;
  }
  return false;
}

/** Kunoichi: slips behind the weakest foe and backstabs it. */
const shadowStep = (b: Battle, me: Unit, out: BattleEvent[]) => blinkStrike(b, me, out, 1.8, (x, y) => x.hp - y.hp || x.id - y.id);
/** Mercenary: slips beside the strongest foe (the hardest hitter) and cuts it for its bounty. */
const bountyHunt = (b: Battle, me: Unit, out: BattleEvent[]) => blinkStrike(b, me, out, 1.9, (x, y) => atkOf(y) - atkOf(x) || x.id - y.id);

/** Archer: arrows rain on a 3x3 of tiles a moment after the call, on whoever is standing there. */
const VOLLEY_MS = 700;
function volley(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const aim = crowd(b, me, (f) => canStrike(b.board, def, me, f));
  if (!aim) return false;
  b.pending.push({ at: b.t + VOLLEY_MS, kind: 'rain', by: me.id, to: aim.id, dmg: atkOf(me) * 1.0, heavy: false, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'volley', u: aim.u, v: aim.v, ms: VOLLEY_MS });
  followUp(b, me, 'rain', aim, atkOf(me) * 1.0, 'volley', VOLLEY_MS, out);
  return true;
}

/** A talent's `extra` on a volley or meteor: a second one falls on the same spot a moment after the first, for 70% of it. */
const FOLLOW_SHARE = 0.7;
const FOLLOW_GAP = 500;
function followUp(b: Battle, me: Unit, kind: 'rain' | 'meteor', aim: Unit, power: number, id: 'volley' | 'meteor', ms: number, out: BattleEvent[]): void {
  if (tal(me, 'extra') < 1) return;
  b.pending.push({ at: b.t + ms + FOLLOW_GAP, kind, by: me.id, to: aim.id, dmg: power * FOLLOW_SHARE, heavy: kind === 'meteor', u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id, u: aim.u, v: aim.v, ms: ms + FOLLOW_GAP });
}

/** Wizard: a meteor falls on a 3x3 and leaves it burning. */
const METEOR_MS = 1100;
const METEOR_REACH = 6;
const BURN_MS = 4000;
const BURN_EVERY = 500;
function meteor(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, METEOR_REACH));
  if (!aim) return false;
  b.pending.push({ at: b.t + METEOR_MS, kind: 'meteor', by: me.id, to: aim.id, dmg: atkOf(me) * 2.2, heavy: true, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: METEOR_MS });
  followUp(b, me, 'meteor', aim, atkOf(me) * 2.2, 'meteor', METEOR_MS, out);
  return true;
}

/** The share of a blow an arc of lightning carries to the second foe. */
const ARC_SHARE = 0.6;
const STUN_MS = 1500;

const sorted = (fs: Unit[]) => fs.sort((x, y) => x.hp - y.hp || x.id - y.id);

/** Heal an ally (never past full), with the event for the renderer; the healing counts for `by` (its healer, or itself). */
export function mendUnit(u: Unit, amount: number, out: BattleEvent[], by: Unit = u): void {
  const n = Math.min(Math.round(amount * (u.healMult ?? 1)), u.maxHp - u.hp);
  if (n <= 0 || !u.alive) return;
  u.hp += n;
  by.healed = (by.healed ?? 0) + n;
  // (healing a friend fills the healer's ultimate as damage dealt does)
  if (by !== u) ultOnDamage(by, n, false);
  out.push({ kind: 'heal', to: u.id, amount: n, by: by.id });
}

/** Ninja Monk: three quick strikes on the weakest foe in reach, and it is stunned. */
function flurry(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const f = sorted(foesOf(b, me).filter((x) => canStrike(b.board, def, me, x)))[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  const mult = blowMult(tileOf(b, me).h, tileOf(b, f).h, me.facing, f.facing);
  const strikes = 3 + tal(me, 'extra');
  for (let i = 0; i < strikes; i++) hurt(b, me, f, net(atkOf(me) * 0.8 * mult, f), i === strikes - 1, false, out, 'skill');
  if (f.alive) {
    f.busyUntil = Math.max(f.busyUntil, b.t + durOf(me, STUN_MS));
    f.stunUntil = b.t + durOf(me, STUN_MS);
  }
  return true;
}

/** Peasant: the allies within two tiles close ranks and take half damage for a while. */
const HOLD_MS = 3000;
function holdTheLine(b: Battle, me: Unit): boolean {
  if (!foesOf(b, me).some((f) => apart(me, f) <= reachOf(me, 3))) return false;
  for (const a of b.units) if (a.alive && a.side === me.side && apart(me, a) <= reachOf(me, 2)) a.guardUntil = b.t + durOf(me, HOLD_MS);
  return true;
}

/** Lightning Mage: a bolt strikes the most crowded foe and jumps to the nearest foes, weaker each time. */
const CHAIN_JUMPS = 4;
function chainLightning(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = defOf(me);
  const first = crowd(b, me, (f) => apart(me, f) <= def.range + 2 && sightClear(b.board, me, f));
  if (!first) return false;
  const hit = new Set<number>();
  let from: Unit = me;
  let at: Unit | undefined = first;
  for (let i = 0; at && i <= CHAIN_JUMPS + tal(me, 'extra'); i++) {
    out.push({ kind: 'arc', from: from.id, to: at.id });
    hurt(b, me, at, net(atkOf(me) * 1.7 * Math.pow(0.8, i), at), i === 0, false, out, 'skill');
    hit.add(at.id);
    from = at;
    const here: Unit = at;
    at = foesOf(b, me).filter((f) => !hit.has(f.id) && apart(f, here) <= 2).sort((x, y) => apart(x, here) - apart(y, here) || x.id - y.id)[0];
  }
  return true;
}

/** Wanderer: a wave of light heals every ally who is hurt and shields them for a moment. */
const SANCTUARY_MS = 2000;
function sanctuary(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const hurtAllies = b.units.filter((a) => a.alive && a.side === me.side && a.hp < a.maxHp * 0.75);
  if (!hurtAllies.length) return false;
  for (const a of b.units)
    if (a.alive && a.side === me.side) {
      mendUnit(a, atkOf(me) * 3, out, me);
      a.guardUntil = b.t + durOf(me, SANCTUARY_MS);
    }
  return true;
}

/** Kitsune: the strongest foe near her is charmed, and fights its own side for a while. */
const CHARM_MS = 3500;
function charm(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  const f = foes
    .filter((x) => apart(me, x) <= reachOf(me, 5) && !(x.charmUntil !== undefined && x.charmUntil > b.t) && foes.some((o) => o !== x))
    .sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id)[0];
  if (!f) return false;
  f.charmUntil = b.t + durOf(me, CHARM_MS);
  f.taunt = undefined;
  f.busyUntil = Math.min(f.busyUntil, b.t + 300);
  out.push({ kind: 'arc', from: me.id, to: f.id });
  return true;
}

/** Karasu Tengu: drops from the sky beside a shooter (else the weakest foe) and strikes it hard. */
function dive(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = sorted(foesOf(b, me));
  for (const f of [...foes.filter((x) => defOf(x).shot), ...foes.filter((x) => !defOf(x).shot)]) {
    const hf = tileOf(b, f).h;
    const cands = DIR.map(([du, dv]) => ({ u: f.u + du, v: f.v + dv }))
      .filter((c) => {
        const t = tileAt(b.board, c.u, c.v);
        return t && standable(t) && !unitAt(b, c.u, c.v);
      })
      .sort((x, y) => apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u);
    if (!cands.length) continue;
    const to = cands[0];
    const from = { u: me.u, v: me.v };
    me.u = to.u;
    me.v = to.v;
    me.step = undefined;
    me.facing = wayTo(me, f);
    out.push({ kind: 'blink', by: me.id, from, to });
    hurt(b, me, f, net(atkOf(me) * 2.0 * blowMult(tileOf(b, me).h, hf, me.facing, f.facing), f), true, false, out, 'skill');
    return true;
  }
  return false;
}

/** Yamabushi Tengu: a gust hurts the foes within two tiles and shoves each a tile away; a drop of two or more hurts more. */
const GUST_REACH = 2;
const FALL_DMG = 10;
const windGust = (b: Battle, me: Unit, out: BattleEvent[]) => gust(b, me, out, reachOf(me, GUST_REACH), 0.9, 0);
function gust(b: Battle, me: Unit, out: BattleEvent[], reach: number, mult: number, stunMs: number): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reach);
  if (!near.length) return false;
  for (const f of near) {
    const way = wayTo(me, f);
    hurt(b, me, f, net(atkOf(me) * mult, f), false, false, out, 'skill');
    if (!f.alive) continue;
    if (stunMs) {
      f.busyUntil = Math.max(f.busyUntil, b.t + stunMs);
      f.stunUntil = b.t + stunMs;
    }
    if (kitOf(f)?.passive.steady) continue;
    const to = { u: f.u + DIR[way][0], v: f.v + DIR[way][1] };
    const t = tileAt(b.board, to.u, to.v);
    f.busyUntil = Math.max(f.busyUntil, b.t + Math.max(500, stunMs));
    if (!t || !standable(t) || unitAt(b, to.u, to.v)) continue;
    const from = tileOf(b, f);
    f.step = { u: f.u, v: f.v, h: from.h, at: b.t, ms: 250 };
    f.u = to.u;
    f.v = to.v;
    if (from.h - t.h >= 2) hurt(b, me, f, (from.h - t.h) * FALL_DMG, true, false, out, 'dot');
  }
  return true;
}

/** Yamabushi Tengu's ultimate, Tempest: a great gale over four tiles that hurts hard, shoves and stuns every foe in it. */
const tempest = (b: Battle, me: Unit, out: BattleEvent[]) => gust(b, me, out, 4, 1.8, durOf(me, 1500));

/** Werewolf: bites the weakest foe in reach for double, and heals for half of the damage it dealt. */
const LEECH_SHARE = 0.5;
function ravage(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const f = sorted(foesOf(b, me).filter((x) => canStrike(b.board, def, me, x)))[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  const mult = blowMult(tileOf(b, me).h, tileOf(b, f).h, me.facing, f.facing);
  const before = me.dealt ?? 0;
  hurt(b, me, f, net(atkOf(me) * 2 * mult, f), false, false, out, 'skill');
  mendUnit(me, ((me.dealt ?? 0) - before) * LEECH_SHARE, out);
  return true;
}

/** Werewolf's frenzy: a kill quickens its blows, and the kills stack up to the passive's limit for a while. */
export function onKill(b: Battle, by: Unit, out: BattleEvent[]): void {
  const f = kitOf(by)?.passive.frenzy;
  if (!f || !by.alive) return;
  const n = by.frenzy && by.frenzy.until > b.t ? by.frenzy.n : 0;
  by.frenzy = { n: Math.min(f.max + tal(by, 'frenzyMax'), n + 1), until: b.t + f.ms };
  out.push({ kind: 'frenzy', by: by.id, n: by.frenzy.n });
}
/** How much faster a fighter's blows come, from its frenzy (1 when none). */
export const frenzyOf = (b: Battle, u: Unit): number => {
  const f = kitOf(u)?.passive.frenzy;
  return f && u.frenzy && u.frenzy.until > b.t ? 1 + f.per * u.frenzy.n : 1;
};

/** Minotaur: charges up a line of up to four tiles at the weakest foe it meets, hits it for double, knocks it back and stuns it. */
const CHARGE_TILES = 4;
interface ChargeOpts {
  tiles: number;
  mult: number;
  stun: boolean;
  knock: boolean;
  /** Ms of haste the charger gains afterwards. */
  haste: number;
}
function chargeAt(b: Battle, me: Unit, out: BattleEvent[], o: ChargeOpts): boolean {
  const def = defOf(me);
  let best: { way: number; land: At; f: Unit } | undefined;
  for (let way = 0; way < 4; way++) {
    const [du, dv] = DIR[way];
    let h = tileOf(b, me).h;
    let land: At = { u: me.u, v: me.v };
    for (let i = 1; i <= reachOf(me, o.tiles); i++) {
      const n = { u: me.u + du * i, v: me.v + dv * i };
      const t = tileAt(b.board, n.u, n.v);
      if (!t || !standable(t) || Math.abs(t.h - h) > def.jump) break;
      const there = unitAt(b, n.u, n.v);
      if (there) {
        if (there.side !== me.side && (!best || there.hp < best.f.hp || (there.hp === best.f.hp && there.id < best.f.id))) best = { way, land, f: there };
        break;
      }
      land = n;
      h = t.h;
    }
  }
  if (!best) return false;
  const { way, land, f } = best;
  const from = { u: me.u, v: me.v };
  const h0 = tileOf(b, me).h;
  const power = atkOf(me) * o.mult * blowMult(h0, tileOf(b, f).h, way, f.facing);
  me.facing = way;
  if (land.u !== from.u || land.v !== from.v) {
    me.step = { u: from.u, v: from.v, h: h0, at: b.t, ms: 260 };
    me.u = land.u;
    me.v = land.v;
    out.push({ kind: 'dash', by: me.id, from, to: land });
  }
  hurt(b, me, f, net(power, f), true, false, out, 'skill');
  if (o.haste) {
    me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + durOf(me, o.haste));
    out.push({ kind: 'haste', to: me.id, ms: durOf(me, o.haste) });
  }
  if (!f.alive) return true;
  if (o.stun) {
    f.busyUntil = Math.max(f.busyUntil, b.t + durOf(me, STUN_MS));
    f.stunUntil = b.t + durOf(me, STUN_MS);
  }
  if (!o.knock) return true;
  const to = { u: f.u + DIR[way][0], v: f.v + DIR[way][1] };
  const t = tileAt(b.board, to.u, to.v);
  if (kitOf(f)?.passive.steady || !t || !standable(t) || unitAt(b, to.u, to.v)) return true;
  f.step = { u: f.u, v: f.v, h: tileOf(b, f).h, at: b.t, ms: 250 };
  f.u = to.u;
  f.v = to.v;
  return true;
}

const goreCharge = (b: Battle, me: Unit, out: BattleEvent[]) => chargeAt(b, me, out, { tiles: CHARGE_TILES, mult: 2, stun: true, knock: true, haste: 0 });
/** Lancer: the same charge with a couched lance (no shove, no stun), and the rider gallops faster for a while after. */
const lanceCharge = (b: Battle, me: Unit, out: BattleEvent[]) => chargeAt(b, me, out, { tiles: 5, mult: 2.2, stun: false, knock: false, haste: 3000 });

/** Satyr: its pipes hasten the allies within three tiles (itself too) for a while. It needs an ally to play to. */
const SONG_REACH = 3;
const SONG_MS = 4000;
function pipes(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = b.units.filter((a) => a.alive && a.side === me.side && apart(me, a) <= reachOf(me, SONG_REACH));
  if (!near.some((a) => a !== me)) return false;
  const ms = durOf(me, SONG_MS);
  for (const a of near) a.hasteUntil = b.t + ms;
  out.push({ kind: 'song', by: me.id, ms });
  return true;
}
/** Sure-footed fighters (Satyr) climb for nothing. */
export const sureFooted = (u: Unit): boolean => !!kitOf(u)?.passive.sure;

/** Gorgon: its stare stiffens the strongest foe it can see within five tiles: that foe takes a blow and is stunned for 3s. */
const GAZE_REACH = 5;
const PETRIFY_MS = 3000;
function gaze(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesOf(b, me)
    .filter((x) => apart(me, x) <= reachOf(me, GAZE_REACH) && sightClear(b.board, me, x))
    .sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id)[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  hurt(b, me, f, net(atkOf(me), f), false, false, out, 'skill');
  if (f.alive) {
    f.busyUntil = Math.max(f.busyUntil, b.t + durOf(me, PETRIFY_MS));
    f.stunUntil = b.t + durOf(me, PETRIFY_MS);
  }
  out.push({ kind: 'gaze', by: me.id, to: f.id });
  return true;
}

/** Kitsune's ultimate, Nine-Tailed Dream: the three strongest foes in sight fight their own side for a while. */
const DREAM_MS = 4000;
function nineTails(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  const prey = foes
    .filter((x) => apart(me, x) <= 7 && !(x.charmUntil !== undefined && x.charmUntil > b.t))
    .sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id)
    .slice(0, Math.min(3, foes.length - 1));
  if (!prey.length) return false;
  for (const f of prey) {
    f.charmUntil = b.t + durOf(me, DREAM_MS);
    f.taunt = undefined;
    f.busyUntil = Math.min(f.busyUntil, b.t + 300);
    out.push({ kind: 'arc', from: me.id, to: f.id });
  }
  return true;
}

/** Karasu Tengu's ultimate, Feather Storm: a storm of blades on the thickest knot of foes, for more than double. */
const STORM_MS = 800;
function featherStorm(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= 7);
  if (!aim) return false;
  b.pending.push({ at: b.t + STORM_MS, kind: 'rain', by: me.id, to: aim.id, dmg: atkOf(me) * 2.6, heavy: false, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'volley', u: aim.u, v: aim.v, ms: STORM_MS });
  return true;
}

/** Gorgon's ultimate, Stone Curse: every foe she can see within six tiles is hurt and turned to stone for a while. */
const CURSE_REACH = 6;
const STONE_MS = 2500;
function stoneCurse(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const seen = foesOf(b, me).filter((x) => apart(me, x) <= reachOf(me, CURSE_REACH) && sightClear(b.board, me, x));
  if (!seen.length) return false;
  me.facing = wayTo(me, seen.sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id)[0]);
  for (const f of seen) {
    hurt(b, me, f, net(atkOf(me) * 1.2, f), false, false, out, 'skill');
    if (f.alive) {
      f.busyUntil = Math.max(f.busyUntil, b.t + durOf(me, STONE_MS));
      f.stunUntil = b.t + durOf(me, STONE_MS);
    }
    out.push({ kind: 'gaze', by: me.id, to: f.id });
  }
  return true;
}

/** Samurai Commander's ultimate, Rally Cry: the war banner flies over every ally at once, and they are heartened. */
const RALLY_MS = 9000;
const RALLY_HEAL = 0.25;
function rallyCry(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const all = b.units.filter((a) => a.alive && a.side === me.side);
  if (!all.some((a) => a !== me)) return false;
  for (const a of all) {
    if (a.banner === undefined) a.power = (a.power ?? 1) * BANNER_MULT;
    a.banner = { until: b.t + durOf(me, RALLY_MS) };
    mendUnit(a, a.maxHp * RALLY_HEAL, out, me);
  }
  out.push({ kind: 'banner', by: me.id, ms: durOf(me, RALLY_MS) });
  return true;
}

/** Samurai Commander: a war banner raises the attack of the allies within three tiles (itself too) for a while. */
export const BANNER_MULT = 1.25;
const BANNER_MS = 6000;
function banner(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = b.units.filter((a) => a.alive && a.side === me.side && apart(me, a) <= reachOf(me, 3));
  if (!near.some((a) => a !== me)) return false;
  const ms = durOf(me, BANNER_MS);
  for (const a of near) {
    // (a second banner only lengthens the first: the attack is raised once)
    if (a.banner === undefined) a.power = (a.power ?? 1) * BANNER_MULT;
    a.banner = { until: b.t + ms };
  }
  out.push({ kind: 'banner', by: me.id, ms });
  return true;
}

/** Orc Warlord: a slam lands on a 3x3 of tiles a moment after the call, on whichever heroes are standing there. */
const SLAM_MS = 800;
const SLAM_REACH = 3;
function groundSlam(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= SLAM_REACH);
  if (!aim) return false;
  b.pending.push({ at: b.t + SLAM_MS, kind: 'rain', by: me.id, to: aim.id, dmg: atkOf(me) * 1.1, heavy: false, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'volley', u: aim.u, v: aim.v, ms: SLAM_MS });
  return true;
}

/** Demon Lord: when it has no imps left, two come up out of the ground beside it (on the nearest free tiles it can climb to). */
const SUMMONED = 2;
function summonImps(b: Battle, me: Unit): boolean {
  if (b.units.some((x) => x.alive && x.side === me.side && x.def === 'imp')) return false;
  const jump = defOf(me).jump;
  const h = tileOf(b, me).h;
  const spots: At[] = [];
  for (let dv = -2; dv <= 2; dv++)
    for (let du = -2; du <= 2; du++) {
      const at = { u: me.u + du, v: me.v + dv };
      const t = tileAt(b.board, at.u, at.v);
      if (apart(me, at) >= 1 && t && standable(t) && !unitAt(b, at.u, at.v) && Math.abs(t.h - h) <= jump) spots.push(at);
    }
  if (!spots.length) return false;
  spots.sort((x, y) => apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u);
  for (const at of spots.slice(0, SUMMONED)) addUnit(b, 'imp', at.u, at.v, { atk: me.power ?? 1 }).owner = me.id;
  return true;
}

/** Lich King: two skeletons climb out of the ground beside him once fewer than two of them stand (six in all in a fight). */
const RAISED = 2;
const RAISE_LIMIT = 6;
function raiseDead(b: Battle, me: Unit): boolean {
  if ((me.raised ?? 0) >= RAISE_LIMIT || b.units.filter((x) => x.alive && x.side === me.side && x.def === 'skeleton').length >= RAISED) return false;
  const jump = defOf(me).jump;
  const h = tileOf(b, me).h;
  const spots: At[] = [];
  for (let dv = -2; dv <= 2; dv++)
    for (let du = -2; du <= 2; du++) {
      const at = { u: me.u + du, v: me.v + dv };
      const t = tileAt(b.board, at.u, at.v);
      if (apart(me, at) >= 1 && t && standable(t) && !unitAt(b, at.u, at.v) && Math.abs(t.h - h) <= jump) spots.push(at);
    }
  if (!spots.length) return false;
  spots.sort((x, y) => apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u);
  for (const at of spots.slice(0, RAISED)) {
    addUnit(b, 'skeleton', at.u, at.v, { hp: b.foeBoost?.hp, atk: b.foeBoost?.atk }).owner = me.id;
    me.raised = (me.raised ?? 0) + 1;
  }
  return true;
}

/** Lich King's ultimate, Soul Nova: a ring of cold soul fire hurts every foe within four tiles and freezes it where it stands. */
const NOVA_REACH = 4;
const NOVA_MS = 1800;
function soulNova(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= NOVA_REACH);
  if (!near.length) return false;
  for (const f of near) {
    hurt(b, me, f, net(atkOf(me) * 1.3, f), false, false, out, 'skill');
    if (!f.alive) continue;
    f.busyUntil = Math.max(f.busyUntil, b.t + NOVA_MS);
    f.stunUntil = b.t + NOVA_MS;
  }
  return true;
}

/** The Golem Forge's crystal golems: a burst of shards hurts every foe within two tiles and holds it still for a moment. */
const SHARD_REACH = 2;
const SHARD_MS = 1200;
function shardBurst(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  return burstAround(b, me, out, SHARD_REACH, 1.0, SHARD_MS);
}
/** Every foe within `reach` is hurt for `mult` of the attack and held still for `ms`. */
function burstAround(b: Battle, me: Unit, out: BattleEvent[], reach: number, mult: number, ms: number): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reach);
  if (!near.length) return false;
  for (const f of near) {
    hurt(b, me, f, net(atkOf(me) * mult, f), false, false, out, 'skill');
    if (!f.alive) continue;
    f.busyUntil = Math.max(f.busyUntil, b.t + ms);
    f.stunUntil = b.t + ms;
  }
  return true;
}

/** Paladin: foes near him must go for him for a few seconds, and the allies beside him are healed. */
const CHALLENGE_MS = 3000;
function holyChallenge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 3));
  if (!near.length) return false;
  for (const f of near) f.taunt = { to: me.id, until: b.t + durOf(me, CHALLENGE_MS) };
  for (const a of b.units) if (a.alive && a.side === me.side && apart(me, a) <= 2) mendUnit(a, atkOf(me) * 2.5, out, me);
  return true;
}

/** Cleric: every ally is cleansed of burning, bleeding and curses, and heals a little each second for a while. */
const BLESS_MS = 5000;
function benediction(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const team = b.units.filter((a) => a.alive && a.side === me.side);
  if (!team.some((a) => a.dot || a.hp < a.maxHp * 0.85)) return false;
  for (const a of team) {
    a.dot = undefined;
    a.hot = { amount: atkOf(me) * 1.2, every: 1000, next: b.t + 1000, until: b.t + durOf(me, BLESS_MS), by: me.id };
    out.push({ kind: 'heal', to: a.id, amount: 0, by: me.id });
  }
  return true;
}

/** Druid: a treant rises beside her (one at a time) and fights for her side. */
const callTreant = (b: Battle, me: Unit) => callSummon(b, me, 'treant', tal(me, 'extra'));
/** Beastmaster: wolves (two at a time) come at his call. */
const callWolves = (b: Battle, me: Unit) => callSummon(b, me, 'wolf', 1 + tal(me, 'extra'));
/** A fighter of `kind` rises on the free tile beside the caster that is nearest the nearest foe, unless more than `more` of its kind stand already. */
function callSummon(b: Battle, me: Unit, kind: string, more: number): boolean {
  if (b.units.filter((x) => x.alive && x.side === me.side && x.def === kind).length > more) return false;
  const foes = foesOf(b, me);
  if (!foes.length) return false;
  const near = sorted([...foes]).sort((x, y) => apart(me, x) - apart(me, y))[0];
  const h = tileOf(b, me).h;
  const spots: At[] = [];
  for (let dv = -2; dv <= 2; dv++)
    for (let du = -2; du <= 2; du++) {
      const at = { u: me.u + du, v: me.v + dv };
      const t = tileAt(b.board, at.u, at.v);
      if (apart(me, at) >= 1 && t && standable(t) && !unitAt(b, at.u, at.v) && Math.abs(t.h - h) <= 2) spots.push(at);
    }
  if (!spots.length) return false;
  spots.sort((x, y) => apart(x, near) - apart(y, near) || apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u);
  const to = spots[0];
  const t = addUnit(b, kind, to.u, to.v, { atk: me.power ?? 1, hp: me.maxHp / defOf(me).hp, grade: me.grade });
  t.owner = me.id;
  t.facing = wayTo(t, near);
  return true;
}

/** Barbarian: spins, and every foe in the 3x3 around him is cut. */
function whirlwind(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const wide = tal(me, 'reach');
  const near = foesOf(b, me).filter((f) => (wide ? Math.abs(me.u - f.u) <= 1 + wide && Math.abs(me.v - f.v) <= 1 + wide : near3x3(me, f)));
  if (!near.length) return false;
  for (const f of near) hurt(b, me, f, net(atkOf(me) * 1.5, f), true, false, out, 'skill');
  return true;
}

/** Ranger: snares go down on the tiles the nearest foes will step on toward her; whoever springs one is hurt and held. */
const TRAPS = 2;
const TRAP_MS = 14000;
const ROOT_MS = 2000;
function snareTrap(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const traps = (b.traps ??= []);
  const foes = foesOf(b, me).filter((f) => apart(me, f) <= defOf(me).range + 3).sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id);
  let laid = 0;
  for (const f of foes) {
    if (laid >= TRAPS + tal(me, 'extra')) break;
    const spot = DIR.map(([du, dv]) => ({ u: f.u + du, v: f.v + dv }))
      .filter((c) => {
        const t = tileAt(b.board, c.u, c.v);
        return t && standable(t) && !unitAt(b, c.u, c.v) && !traps.some((x) => x.u === c.u && x.v === c.v);
      })
      .sort((x, y) => apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u)[0];
    if (!spot) continue;
    traps.push({ u: spot.u, v: spot.v, side: me.side, by: me.id, until: b.t + TRAP_MS, dmg: atkOf(me) * 1.6 });
    out.push({ kind: 'trap', u: spot.u, v: spot.v, ms: TRAP_MS });
    laid++;
  }
  return laid > 0;
}

/** Warlock: the three toughest foes in reach are cursed: they burn for a few seconds and he drinks part of it. */
const HEX_MS = 5000;
const HEX_EVERY = 500;
const HEX_DRAIN = 0.6;
function hex(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = defOf(me);
  const prey = foesOf(b, me)
    .filter((f) => apart(me, f) <= def.range + 2)
    .sort((x, y) => y.hp - x.hp || x.id - y.id)
    .slice(0, 3);
  if (!prey.length) return false;
  for (const f of prey) {
    f.dot = { kind: 'curse', dmg: Math.max(1, Math.round(atkOf(me) * 0.35)), every: HEX_EVERY, ms: durOf(me, HEX_MS), by: me.id, next: b.t + HEX_EVERY, until: b.t + durOf(me, HEX_MS) };
    out.push({ kind: 'arc', from: me.id, to: f.id });
  }
  return true;
}

/** Illusionist: slips away to the safest tile within 4, leaving a decoy where she stood and another beside it; the foes near turn on the decoys. */
const DECOY_MS = 3000;
const DECOY_HP = 0.45;
function mirrorImage(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  if (!foes.some((f) => apart(me, f) <= 4)) return false;
  const def = defOf(me);
  const h = tileOf(b, me).h;
  const safety = (c: At) => Math.min(...foes.map((f) => apart(c, f)));
  let to: At | undefined;
  for (let dv = -4; dv <= 4; dv++)
    for (let du = -4; du <= 4; du++) {
      const c = { u: me.u + du, v: me.v + dv };
      const t = tileAt(b.board, c.u, c.v);
      if (apart(me, c) < 1 || apart(me, c) > 4 || !t || !standable(t) || unitAt(b, c.u, c.v) || Math.abs(t.h - h) > def.jump) continue;
      if (!to || safety(c) > safety(to) || (safety(c) === safety(to) && (apart(me, c) < apart(me, to) || (apart(me, c) === apart(me, to) && (c.v > to.v || (c.v === to.v && c.u < to.u)))))) to = c;
    }
  if (!to || safety(to) <= safety(me)) return false;
  const from = { u: me.u, v: me.v };
  me.u = to.u;
  me.v = to.v;
  me.step = undefined;
  out.push({ kind: 'blink', by: me.id, from, to });
  // (a decoy where she stood, and one more on the free tile beside it nearest the foes)
  const near = [...foes].sort((x, y) => apart(from, x) - apart(from, y) || x.id - y.id)[0];
  const beside = DIR.map(([du, dv]) => ({ u: from.u + du, v: from.v + dv }))
    .filter((c) => {
      const t = tileAt(b.board, c.u, c.v);
      return t && standable(t) && !unitAt(b, c.u, c.v) && Math.abs(t.h - h) <= def.jump;
    })
    .sort((x, y) => apart(x, near) - apart(y, near) || x.v - y.v || x.u - y.u)[0];
  const decoys: Unit[] = [];
  for (const at of beside ? [from, beside] : [from]) {
    const d = addUnit(b, 'decoy', at.u, at.v);
    d.owner = me.id;
    d.hp = d.maxHp = Math.max(1, Math.round(me.maxHp * DECOY_HP));
    d.facing = wayTo(d, near);
    // (a decoy stands where it appeared for a moment, so the foes find it there)
    d.busyUntil = b.t + durOf(me, 1500);
    decoys.push(d);
  }
  for (const f of foes.filter((x) => apart(from, x) <= 4)) f.taunt = { to: decoys.sort((x, y) => apart(f, x) - apart(f, y) || x.id - y.id)[0].id, until: b.t + durOf(me, DECOY_MS) };
  return true;
}

/** Gunslinger: one slug through every foe in a line, whatever is between. */
const LINE_WIDTH = 0.7;
/** The foes standing on the line from `me` through `aim`, no further than `len` tiles. */
function lineFoes(foes: Unit[], me: Unit, aim: Unit, len: number): Unit[] {
  const du = aim.u - me.u;
  const dv = aim.v - me.v;
  const l = Math.hypot(du, dv);
  return foes.filter((f) => {
    const proj = ((f.u - me.u) * du + (f.v - me.v) * dv) / l;
    const perp = Math.abs((f.u - me.u) * dv - (f.v - me.v) * du) / l;
    return proj > 0 && proj <= len && perp <= LINE_WIDTH;
  });
}
function deadEye(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const foes = foesOf(b, me);
  const line = (aim: Unit) => lineFoes(foes, me, aim, def.range + reachOf(me, 3));
  let best: Unit[] = [];
  let bestHp = 0;
  for (const aim of foes.filter((f) => canStrike(b.board, def, me, f))) {
    const hit = line(aim);
    const hp = hit.reduce((n, f) => n + f.hp, 0);
    if (hit.length > best.length || (hit.length === best.length && hp < bestHp)) (best = hit), (bestHp = hp);
  }
  if (!best.length) return false;
  me.facing = wayTo(me, best[0]);
  for (const f of best.sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)) {
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'bullet', ms: 120 + apart(me, f) * 40 });
    hurt(b, me, f, net(atkOf(me) * 2.4 * blowMult(tileOf(b, me).h, tileOf(b, f).h, me.facing, f.facing), f), true, false, out, 'skill');
  }
  return true;
}

// ---- the second wave of heroes (docs/notes/more-heroes.md) ----

/** Move a foe one tile toward `to` (it is dragged, so its own climbing does not matter); false when the tile is not free. */
function drag(b: Battle, f: Unit, to: At): boolean {
  const way = wayTo(f, to);
  const at = { u: f.u + DIR[way][0], v: f.v + DIR[way][1] };
  const t = tileAt(b.board, at.u, at.v);
  if (!t || !standable(t) || unitAt(b, at.u, at.v) || kitOf(f)?.passive.steady) return false;
  f.step = { u: f.u, v: f.v, h: tileOf(b, f).h, at: b.t, ms: 250 };
  f.u = at.u;
  f.v = at.v;
  return true;
}

/** The ms a foe is slowed for, taken on to any slow it has already. */
const slowFor = (b: Battle, f: Unit, ms: number) => (f.slowUntil = Math.max(f.slowUntil ?? 0, b.t + ms));

/** Shambler: every foe within two tiles starts to rot, and the Shambler drinks part of what it costs them. */
const ROT_MS = 4000;
function rottingTouch(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 2));
  if (!near.length) return false;
  const ms = durOf(me, ROT_MS);
  for (const f of near) {
    f.dot = { kind: 'curse', dmg: Math.max(1, Math.round(atkOf(me) * 0.3)), every: HEX_EVERY, ms, by: me.id, next: b.t + HEX_EVERY, until: b.t + ms };
    out.push({ kind: 'arc', from: me.id, to: f.id });
  }
  return true;
}

/** Rifle Bot: three quick shots at the weakest foe in reach. */
function burstFire(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const f = sorted(foesOf(b, me).filter((x) => canStrike(b.board, def, me, x)))[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  const mult = blowMult(tileOf(b, me).h, tileOf(b, f).h, me.facing, f.facing);
  const shots = 3 + tal(me, 'extra');
  for (let i = 0; i < shots && f.alive; i++) {
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'bullet', ms: 120 + apart(me, f) * 40 });
    hurt(b, me, f, net(atkOf(me) * 0.9 * mult, f), i === shots - 1, false, out, 'skill');
  }
  return true;
}

/** Mummy: bandages lash every foe within two tiles and slow it. */
const WRAP_MS = 3000;
function bindingWraps(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 2));
  if (!near.length) return false;
  for (const f of near) {
    hurt(b, me, f, net(atkOf(me) * 0.8, f), false, false, out, 'skill');
    if (f.alive) slowFor(b, f, durOf(me, WRAP_MS));
  }
  return true;
}

/** Buccaneer: a hook yanks the nearest shooter (else the nearest foe) up beside him, and he cuts it down. */
function grapple(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const far = foesOf(b, me)
    .filter((f) => apart(me, f) >= 2 && apart(me, f) <= reachOf(me, 5) && !kitOf(f)?.passive.steady)
    .sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id);
  for (const f of [...far.filter((x) => defOf(x).shot), ...far.filter((x) => !defOf(x).shot)]) {
    const to = DIR.map(([du, dv]) => ({ u: me.u + du, v: me.v + dv }))
      .filter((c) => {
        const t = tileAt(b.board, c.u, c.v);
        return t && standable(t) && !unitAt(b, c.u, c.v);
      })
      .sort((x, y) => apart(x, f) - apart(y, f) || x.v - y.v || x.u - y.u)[0];
    if (!to) return false;
    f.step = { u: f.u, v: f.v, h: tileOf(b, f).h, at: b.t, ms: 250 };
    f.u = to.u;
    f.v = to.v;
    me.facing = wayTo(me, f);
    out.push({ kind: 'arc', from: me.id, to: f.id });
    hurt(b, me, f, net(atkOf(me) * 1.6 * blowMult(tileOf(b, me).h, tileOf(b, f).h, me.facing, f.facing), f), true, false, out, 'skill');
    if (f.alive) {
      f.busyUntil = Math.max(f.busyUntil, b.t + durOf(me, 1000));
      f.stunUntil = b.t + durOf(me, 1000);
    }
    return true;
  }
  return false;
}

/** Wolf Bard: a dirge hurts every foe within four tiles a little and slows it. */
const DIRGE_MS = 4000;
function dirge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 4));
  if (!near.length) return false;
  for (const f of near) {
    hurt(b, me, f, net(atkOf(me) * 1.0, f), false, false, out, 'skill');
    if (f.alive) slowFor(b, f, durOf(me, DIRGE_MS));
  }
  out.push({ kind: 'song', by: me.id, ms: durOf(me, DIRGE_MS) });
  return true;
}

/** Kraken Mate: an undertow hurts every foe within four tiles, slows it and drags it a tile closer. */
const UNDERTOW_MS = 2000;
function undertow(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 4));
  if (!near.length) return false;
  for (const f of near) {
    hurt(b, me, f, net(atkOf(me) * 0.9, f), false, false, out, 'skill');
    if (!f.alive) continue;
    slowFor(b, f, durOf(me, UNDERTOW_MS));
    if (drag(b, f, me)) f.busyUntil = Math.max(f.busyUntil, b.t + 400);
  }
  return true;
}

/** Reaper: a sweep of the scythe cuts every foe within three tiles, and a foe under three tenths of its health is reaped for nearly three times as much. */
const REAP_UNDER = 0.3;
function reap(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 3));
  if (!near.length) return false;
  for (const f of near) {
    const doomed = f.hp < f.maxHp * REAP_UNDER;
    hurt(b, me, f, net(atkOf(me) * (doomed ? 2.8 : 0.9), f), doomed, false, out, 'skill');
  }
  return true;
}

/** Time Witch: time speeds up around her friends (within three tiles) and drags for the foes within four. */
const SURGE_MS = 4000;
function temporalSurge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 4));
  if (!foes.length) return false;
  const ms = durOf(me, SURGE_MS);
  for (const a of b.units)
    if (a.alive && a.side === me.side && apart(me, a) <= reachOf(me, 3)) {
      a.hasteUntil = Math.max(a.hasteUntil ?? 0, b.t + ms);
      out.push({ kind: 'haste', to: a.id, ms });
    }
  for (const f of foes) {
    slowFor(b, f, ms);
    out.push({ kind: 'arc', from: me.id, to: f.id });
  }
  return true;
}

/** Arc Blade: blinks beside the thickest knot of foes and discharges, hurting every foe in the 3x3 round it and holding it still for a moment. */
const DISCHARGE_MS = 1000;
function voltageBlink(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = defOf(me);
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 6));
  if (!aim) return false;
  if (apart(me, aim) > 1) {
    const ha = tileOf(b, aim).h;
    const to = DIR.map(([du, dv]) => ({ u: aim.u + du, v: aim.v + dv }))
      .filter((c) => {
        const t = tileAt(b.board, c.u, c.v);
        return t && standable(t) && !unitAt(b, c.u, c.v) && Math.abs(t.h - ha) <= def.jump;
      })
      .sort((x, y) => apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u)[0];
    if (!to) return false;
    const from = { u: me.u, v: me.v };
    me.u = to.u;
    me.v = to.v;
    me.step = undefined;
    out.push({ kind: 'blink', by: me.id, from, to });
  }
  me.facing = wayTo(me, aim);
  const hit = foesOf(b, me).filter((f) => near3x3(f, aim));
  for (const f of hit) {
    out.push({ kind: 'arc', from: me.id, to: f.id });
    hurt(b, me, f, net(atkOf(me) * 1.4, f), false, false, out, 'skill');
    if (f.alive) {
      f.busyUntil = Math.max(f.busyUntil, b.t + durOf(me, DISCHARGE_MS));
      f.stunUntil = b.t + durOf(me, DISCHARGE_MS);
    }
  }
  return true;
}

/** Dread Pirate: a broadside from a ghost ship falls on a 3x3 of tiles a moment after the call. */
const BROADSIDE_MS = 800;
function broadside(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 6));
  if (!aim) return false;
  b.pending.push({ at: b.t + BROADSIDE_MS, kind: 'rain', by: me.id, to: aim.id, dmg: atkOf(me) * 1.7, heavy: false, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'volley', u: aim.u, v: aim.v, ms: BROADSIDE_MS });
  followUp(b, me, 'rain', aim, atkOf(me) * 1.7, 'volley', BROADSIDE_MS, out);
  return true;
}

/** Siege Bot: a heavy shell bursts on the thickest crowd, far off. */
const SHELL_MS = 900;
function shellBarrage(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 7));
  if (!aim) return false;
  b.pending.push({ at: b.t + SHELL_MS, kind: 'rain', by: me.id, to: aim.id, dmg: atkOf(me) * 2.1, heavy: true, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: SHELL_MS });
  followUp(b, me, 'rain', aim, atkOf(me) * 2.1, 'meteor', SHELL_MS, out);
  return true;
}

/** High Priestess: a great healing light on the worst hurt ally (cleansing it), and half as much on the allies within two tiles of it. */
function holyLight(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const team = b.units.filter((a) => a.alive && a.side === me.side);
  const worst = team.filter((a) => a.hp < a.maxHp * 0.8).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
  if (!worst) return false;
  worst.dot = undefined;
  mendUnit(worst, atkOf(me) * 5, out, me);
  for (const a of team) if (a !== worst && apart(a, worst) <= reachOf(me, 2)) mendUnit(a, atkOf(me) * 2, out, me);
  return true;
}

/** Queen Dragoon: fire down the line of foes that holds the most, hurting each and setting it alight. */
const BREATH_REACH = 4;
function dragonBreath(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  const len = reachOf(me, BREATH_REACH);
  let best: Unit[] = [];
  let bestHp = 0;
  for (const aim of foes.filter((f) => apart(me, f) <= len)) {
    const hit = lineFoes(foes, me, aim, len);
    const hp = hit.reduce((n, f) => n + f.hp, 0);
    if (hit.length > best.length || (hit.length === best.length && hp < bestHp)) (best = hit), (bestHp = hp);
  }
  if (!best.length) return false;
  me.facing = wayTo(me, best[0]);
  const ms = durOf(me, 3000);
  for (const f of best.sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)) {
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'fire', ms: 120 + apart(me, f) * 40 });
    hurt(b, me, f, net(atkOf(me) * 1.4, f), true, false, out, 'skill');
    if (f.alive) f.dot = { kind: 'burn', dmg: Math.max(1, Math.round(atkOf(me) * 0.12)), every: 500, ms, by: me.id, next: b.t + 500, until: b.t + ms };
  }
  return true;
}

/** Juggernaut: the ground heaves, hurting every foe within three tiles and holding it still. */
const QUAKE_MS = 1200;
const quake = (b: Battle, me: Unit, out: BattleEvent[]) => burstAround(b, me, out, reachOf(me, 3), 1.2, durOf(me, QUAKE_MS));

/** Great Sage: stars fall on up to three separate crowds a moment after the call. */
const STARFALL_MS = 900;
const STARS = 3;
function starfall(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aimed: Unit[] = [];
  for (let i = 0; i < STARS + tal(me, 'extra'); i++) {
    const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 7) && !aimed.some((a) => near3x3(f, a)));
    if (!aim) break;
    aimed.push(aim);
    b.pending.push({ at: b.t + STARFALL_MS, kind: 'rain', by: me.id, to: aim.id, dmg: atkOf(me) * 1.45, heavy: false, u: aim.u, v: aim.v });
    out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: STARFALL_MS });
  }
  return aimed.length > 0;
}

/** Great Sage's ultimate, Astral Convergence: every ally's skill meter jumps and a shield of starlight forms round it. */
const CONVERGE_CHARGE = 50;
const CONVERGE_SHIELD = 0.12;
function astralConvergence(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const team = b.units.filter((a) => a.alive && a.side === me.side);
  if (!team.some((a) => a !== me) || !foesOf(b, me).length) return false;
  for (const a of team) {
    // (a hero with a pool has it filled by half; anything else has its skill meter lifted)
    const pool = poolOf(a);
    if (pool) addRes(a, resMax(pool) * 0.5);
    else gain(a, CONVERGE_CHARGE);
    a.shield = { hp: Math.round(a.maxHp * CONVERGE_SHIELD), until: b.t + durOf(me, 4000) };
    out.push({ kind: 'heal', to: a.id, amount: 0, by: me.id });
  }
  return true;
}

/** Demon Swordsman: a sweep cuts every foe within two tiles, and he drinks a quarter of what it deals. */
const SWEEP_DRINK = 0.25;
function hellbladeSweep(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 2));
  if (!near.length) return false;
  const before = me.dealt ?? 0;
  for (const f of near) hurt(b, me, f, net(atkOf(me) * 1.3, f), false, false, out, 'skill');
  mendUnit(me, ((me.dealt ?? 0) - before) * SWEEP_DRINK, out);
  return true;
}

/** Demon Swordsman's ultimate, Demon Form: for a while he hits half as hard again, and a fifth of his health comes back. */
export const FORM_MULT = 1.5;
const FORM_MS = 7000;
const FORM_HEAL = 0.2;
function demonForm(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).some((f) => apart(me, f) <= 7)) return false;
  if (me.form === undefined) me.power = (me.power ?? 1) * FORM_MULT;
  // (its tuned strength lengthens the form and deepens the heal, as the other ultimates' stuns and heals scale: ULT-CHARGE)
  me.form = { until: b.t + durOf(me, Math.round(FORM_MS * Math.sqrt(castPower()))) };
  mendUnit(me, me.maxHp * FORM_HEAL * castPower(), out);
  out.push({ kind: 'frenzy', by: me.id, n: 3 });
  return true;
}

/** Tyrant: a judgement falls on the toughest foe in reach, and a 3x3 round it, a moment after the call. */
const JUDGEMENT_MS = 1200;
function judgement(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesOf(b, me)
    .filter((x) => apart(me, x) <= reachOf(me, 6))
    .sort((x, y) => y.hp - x.hp || x.id - y.id)[0];
  if (!f) return false;
  b.pending.push({ at: b.t + JUDGEMENT_MS, kind: 'rain', by: me.id, to: f.id, dmg: atkOf(me) * 2.4, heavy: true, u: f.u, v: f.v });
  out.push({ kind: 'area', by: me.id, id: 'meteor', u: f.u, v: f.v, ms: JUDGEMENT_MS });
  followUp(b, me, 'rain', f, atkOf(me) * 2.4, 'meteor', JUDGEMENT_MS, out);
  return true;
}

/** Tyrant's ultimate, Reign of Terror: every foe within six tiles is hurt and slowed, and every ally is rallied under a war banner. */
const REIGN_MS = 7000;
function reignOfTerror(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 6));
  if (!foes.length) return false;
  for (const f of foes) {
    hurt(b, me, f, net(atkOf(me) * 1.0, f), false, false, out, 'skill');
    if (f.alive) slowFor(b, f, durOf(me, 5000));
  }
  for (const a of b.units)
    if (a.alive && a.side === me.side) {
      if (a.banner === undefined) a.power = (a.power ?? 1) * BANNER_MULT;
      a.banner = { until: b.t + durOf(me, REIGN_MS) };
    }
  out.push({ kind: 'banner', by: me.id, ms: durOf(me, REIGN_MS) });
  return true;
}

/** Dread Pirate's Deathless: the first time it would fall in a fight, it rises with the share of its health its passive names. */
export function undying(to: Unit, out: BattleEvent[]): boolean {
  const share = kitOf(to)?.passive.undying;
  if (!share || to.undyingUsed) return false;
  to.undyingUsed = true;
  to.hp = Math.max(1, Math.round(to.maxHp * share));
  out.push({ kind: 'heal', to: to.id, amount: to.hp });
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
  ninjaMonk: {
    skill: { name: 'Thousand Fists', text: 'Three quick strikes on one foe, who is stunned for 1.5s', need: CHARGE_MAX, dealt: 8, taken: 3, perSec: 2, castMs: 700, anim: 'attack2', cast: flurry },
    passive: { name: 'Iron Fists', text: 'Blows ignore 3 of the foe\'s defence', pierce: 3 },
  },
  peasant: {
    skill: { name: 'Hold the Line', text: 'Allies within 2 tiles take half damage for 3s', need: CHARGE_MAX, dealt: 5, taken: 6, perSec: 2, castMs: 500, anim: 'attack', cast: holdTheLine },
    passive: { name: 'Strength in Numbers', text: 'Takes 7% less from each ally beside him (up to 3)', huddle: 0.07 },
  },
  lightningMage: {
    skill: { name: 'Chain Lightning', text: 'A bolt jumps through up to five foes, weaker each time', need: CHARGE_MAX, dealt: 8, taken: 4, perSec: 2, castMs: 700, anim: 'attack', cast: chainLightning },
    passive: { name: 'Static', text: '25% of blows arc to a second foe nearby', arc: 0.25 },
  },
  wanderer: {
    skill: { name: 'Sanctuary', text: 'Heals every ally and shields them for 2s (when some are hurt)', need: CHARGE_MAX, dealt: 5, taken: 5, perSec: 3, castMs: 700, anim: 'attack', cast: sanctuary },
    passive: { name: 'Mending Light', text: 'Every 2.5s heals the most hurt ally', mend: { every: 2500, share: 1.2 } },
  },
  kitsune: {
    skill: { name: 'Fox Charm', text: 'The strongest foe nearby fights its own side for 3.5s', need: CHARGE_MAX, dealt: 7, taken: 4, perSec: 2, castMs: 600, anim: 'attack', cast: charm },
    ultimate: { name: 'Nine-Tailed Dream', text: 'The three strongest foes in sight fight their own side for 4s', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 800, anim: 'attack', cast: nineTails },
    passive: { name: 'Spirit Drain', text: 'Heals for a quarter of the damage her blows deal', leech: 0.25 },
  },
  karasu: {
    skill: { name: 'Dive', text: 'Drops beside a shooter (else the weakest foe) and strikes it for double', need: CHARGE_MAX, dealt: 7, taken: 3, perSec: 2, castMs: 450, anim: 'attack', cast: dive },
    ultimate: { name: 'Feather Storm', text: 'A storm of blades falls on the thickest knot of foes for more than double', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 700, anim: 'attack', cast: featherStorm },
    passive: { name: 'Hunter\'s Eye', text: 'Blows deal 50% more to shooters', prey: 1.5 },
  },
  yamabushi: {
    skill: { name: 'Wind Gust', text: 'Foes within 2 tiles are hurt and shoved back a tile, and fall damage if it drops them 2 or more', need: CHARGE_MAX, dealt: 6, taken: 6, perSec: 2, castMs: 600, anim: 'attack', cast: windGust },
    ultimate: { name: 'Tempest', text: 'A great gale: every foe within 4 tiles is hurt hard, shoved back and stunned for 1.5s', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 800, anim: 'attack', cast: tempest },
    passive: { name: 'Mountain Breath', text: 'Heals 2% of his health each second', regen: 0.02 },
  },
  paladin: {
    skill: { name: 'Holy Challenge', text: 'Foes within 3 tiles must attack him for 3s, and allies beside him are healed', need: CHARGE_MAX, dealt: 4, taken: 7, perSec: 2, castMs: 600, anim: 'attack', cast: holyChallenge },
    passive: { name: 'Blessed Bulwark', text: 'Blows from the front lose a fifth, and he heals for 60% of what he blocks', block: 0.2, blockHeal: 0.6 },
  },
  cleric: {
    skill: { name: 'Benediction', text: 'Cleanses every ally and heals them each second for 5s (when some are hurt)', need: CHARGE_MAX, dealt: 5, taken: 5, perSec: 3, castMs: 700, anim: 'attack2', cast: benediction },
    passive: { name: 'Grace', text: 'Allies within 2 tiles heal 1.5% of their health each second', aura: 0.015 },
  },
  druid: {
    skill: { name: 'Call Treant', text: 'A treant rises beside her and fights for her (one at a time)', need: CHARGE_MAX, dealt: 6, taken: 5, perSec: 2, castMs: 800, anim: 'attack2', cast: callTreant },
    passive: { name: 'Thorn Skin', text: 'A third of the damage of a melee blow she takes is sent back', thorns: 0.33 },
  },
  barbarian: {
    skill: { name: 'Whirlwind', text: 'Cuts every foe in the 3x3 around him', need: CHARGE_MAX, dealt: 7, taken: 6, perSec: 2, castMs: 500, anim: 'attack', cast: whirlwind },
    passive: { name: 'Bloodrage', text: 'Attack grows by up to 90% as his health falls', rage: 0.9 },
  },
  ranger: {
    skill: { name: 'Snare Trap', text: 'Lays two traps on the tiles foes will step on; the first to spring one is hurt and held for 2s', need: CHARGE_MAX, dealt: 6, taken: 4, perSec: 2, castMs: 500, anim: 'attack', cast: snareTrap },
    passive: { name: 'Long Shot', text: 'Arrows deal 35% more to foes 4 or more tiles away', far: 0.35 },
  },
  warlock: {
    skill: { name: 'Hex', text: 'Curses the three toughest foes in reach: they burn for 5s and he drinks 60% of it', need: CHARGE_MAX, dealt: 7, taken: 4, perSec: 2, castMs: 700, anim: 'attack2', cast: hex },
    passive: { name: 'Dark Pact', text: 'Heals for a fifth of the damage his blows deal', leech: 0.2 },
  },
  illusionist: {
    skill: { name: 'Mirror Image', text: 'Slips away, leaving two decoys that draw the foes nearby for 3s', need: CHARGE_MAX, dealt: 7, taken: 4, perSec: 2, castMs: 400, anim: 'attack2', cast: mirrorImage },
    passive: { name: 'Sleight of Hand', text: 'Slips 25% of blows', dodge: 0.25 },
  },
  gunslinger: {
    skill: { name: 'Dead Eye', text: 'One slug through every foe in a line, for more than double', need: CHARGE_MAX, dealt: 14, taken: 4, perSec: 1.5, castMs: 500, anim: 'attack', cast: deadEye },
    passive: { name: 'Piercing Rounds', text: 'Shots ignore 4 defence and also hit the foe behind the target for half', pierce: 4, through: 0.5 },
  },

  // ---- the second wave ----
  shambler: {
    skill: { name: 'Rotting Touch', text: 'Every foe within 2 tiles rots for 4s, and he drinks part of it', need: CHARGE_MAX, dealt: 5, taken: 6, perSec: 2, castMs: 600, anim: 'attack', cast: rottingTouch },
    passive: { name: 'Undying Flesh', text: 'Heals 2% of his health each second', regen: 0.02 },
  },
  rifleBot: {
    skill: { name: 'Burst Fire', text: 'Three rapid shots at the weakest foe in reach', need: CHARGE_MAX, dealt: 7, taken: 4, perSec: 2, castMs: 500, anim: 'attack2', cast: burstFire },
    passive: { name: 'Targeting Array', text: 'Shots deal 30% more to foes 4 or more tiles away', far: 0.3 },
  },
  mercenary: {
    skill: { name: 'Bounty Hunt', text: 'Slips beside the strongest foe and cuts it for nearly double', need: CHARGE_MAX, dealt: 6, taken: 4, perSec: 2, castMs: 450, anim: 'attack2', cast: bountyHunt },
    passive: { name: 'Hired Blade', text: '20% of blows crit for x1.7 and make the foe bleed', crit: { chance: 0.2, mult: 1.7, bleed: { kind: 'bleed', dmg: 4, every: 500, ms: 3000 } } },
  },
  mummy: {
    skill: { name: 'Binding Wraps', text: 'Bandages lash every foe within 2 tiles and slow it for 3s', need: CHARGE_MAX, dealt: 5, taken: 6, perSec: 2, castMs: 600, anim: 'attack2', cast: bindingWraps },
    passive: { name: 'Dry Husk', text: 'Blows from the front lose a fifth', block: 0.2 },
  },
  buccaneer: {
    skill: { name: 'Grappling Hook', text: 'Yanks the nearest shooter (else foe) in beside him, cuts it and holds it for 1s', need: CHARGE_MAX, dealt: 6, taken: 4, perSec: 2, castMs: 500, anim: 'attack2', cast: grapple },
    passive: { name: 'Sea Legs', text: 'Slips 12% of blows and climbs ledges at no extra cost', dodge: 0.12, sure: true },
  },
  wolfBard: {
    skill: { name: 'Dirge', text: 'Every foe within 4 tiles is hurt a little and slowed for 4s', need: CHARGE_MAX, dealt: 5, taken: 5, perSec: 3, castMs: 700, anim: 'attack2', cast: dirge },
    passive: { name: 'Catchy Tune', text: 'Every 3.5s the ally with the least skill charge near him gains 16', tune: { every: 3500, charge: 16 } },
  },
  beastmaster: {
    skill: { name: 'Call of the Wild', text: 'A wolf answers his call and fights for him (two at most stand at once)', need: CHARGE_MAX, dealt: 6, taken: 5, perSec: 2, castMs: 700, anim: 'attack2', cast: callWolves },
    passive: { name: 'Whip Crack', text: 'His blows slow the foe for 1.5s', slow: 1500 },
  },
  kraken: {
    skill: { name: 'Undertow', text: 'Every foe within 4 tiles is hurt, slowed for 2s and dragged a tile closer', need: CHARGE_MAX, dealt: 5, taken: 6, perSec: 2, castMs: 600, anim: 'attack2', cast: undertow },
    passive: { name: 'Barnacled Hide', text: 'Blows from the front lose a fifth', block: 0.2 },
  },
  lancer: {
    skill: { name: 'Lance Charge', text: 'Charges up to 5 tiles at a foe for more than double, then rides faster for 3s', need: CHARGE_MAX, dealt: 6, taken: 4, perSec: 2, castMs: 500, anim: 'attack', cast: lanceCharge },
    passive: { name: 'Couched Lance', text: 'Blows deal 40% more to shooters', prey: 1.4 },
  },
  reaper: {
    skill: { name: 'Reap', text: 'Cuts every foe within 3 tiles; a foe under 30% health takes nearly triple', need: CHARGE_MAX, dealt: 6, taken: 3, perSec: 2, castMs: 500, anim: 'attack2', cast: reap },
    passive: { name: 'Wraith Form', text: 'Slips 20% of blows', dodge: 0.2 },
  },
  timeWitch: {
    skill: { name: 'Temporal Surge', text: 'Allies within 3 tiles are hasted, and foes within 4 slowed, for 4s', need: CHARGE_MAX, dealt: 5, taken: 5, perSec: 3, castMs: 700, anim: 'attack2', cast: temporalSurge },
    passive: { name: 'Stutter', text: 'Slips 20% of blows', dodge: 0.2 },
  },
  arcBlade: {
    skill: { name: 'Voltage Blink', text: 'Blinks beside the thickest knot of foes and discharges: the 3x3 is hurt and held for 1s', need: CHARGE_MAX, dealt: 8, taken: 4, perSec: 2, castMs: 450, anim: 'attack2', cast: voltageBlink },
    passive: { name: 'Static Discharge', text: '25% of blows arc to a second foe nearby', arc: 0.25 },
  },
  dreadPirate: {
    skill: { name: 'Broadside', text: 'A ghost ship\'s broadside falls on a 3x3 of tiles', need: CHARGE_MAX, dealt: 5, taken: 5, perSec: 2, castMs: 700, anim: 'attack2', cast: broadside },
    passive: { name: 'Deathless', text: 'Once a fight, when he would fall he rises at 35% health', undying: 0.35 },
  },
  siegeBot: {
    skill: { name: 'Shell Barrage', text: 'A heavy shell bursts on the thickest crowd within 7 tiles', need: CHARGE_MAX, dealt: 9, taken: 4, perSec: 2, castMs: 800, anim: 'attack2', cast: shellBarrage },
    passive: { name: 'Reinforced Chassis', text: 'Blows from the front lose a fifth, and it cannot be knocked back', block: 0.2, steady: true },
  },
  priestess: {
    skill: { name: 'Holy Light', text: 'A great light heals the worst hurt ally and cleanses it; allies near it are healed too', need: CHARGE_MAX, dealt: 5, taken: 5, perSec: 3, castMs: 700, anim: 'attack2', cast: holyLight },
    passive: { name: 'Halo', text: 'Allies within 2 tiles (and she) take 8% less from every blow', halo: 0.08 },
  },
  dragoon: {
    skill: { name: 'Dragon Breath', text: 'Fire down the line that holds the most foes, hurting each and setting it alight', need: CHARGE_MAX, dealt: 7, taken: 4, perSec: 2, castMs: 600, anim: 'attack2', cast: dragonBreath },
    passive: { name: 'Dragon Scales', text: 'Takes a quarter less from shots', scales: 0.25 },
  },
  juggernaut: {
    skill: { name: 'Earthquake', text: 'Every foe within 3 tiles is hurt and held still for 1.2s', need: CHARGE_MAX, dealt: 4, taken: 7, perSec: 2, castMs: 700, anim: 'attack2', cast: quake },
    passive: { name: 'Living Rampart', text: 'Blows from the front lose a third, and he cannot be knocked back', block: 0.33, steady: true },
  },
  sage: {
    skill: { name: 'Starfall', text: 'Stars fall on up to three separate crowds a moment after the call', need: CHARGE_MAX, dealt: 7, taken: 4, perSec: 2, castMs: 800, anim: 'attack2', cast: starfall },
    ultimate: { name: 'Astral Convergence', text: 'Every ally\'s pool fills by half and a starlit shield forms round it for 4s', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 800, anim: 'attack2', cast: astralConvergence },
    passive: { name: 'Arcane Insight', text: 'His blows ignore 4 defence', pierce: 4 },
  },
  demonSwordsman: {
    skill: { name: 'Hellblade Sweep', text: 'Cuts every foe within 2 tiles, and he drinks a third of what it deals', need: CHARGE_MAX, dealt: 7, taken: 5, perSec: 2, castMs: 550, anim: 'attack2', cast: hellbladeSweep },
    ultimate: { name: 'Demon Form', text: 'For 7s he hits half as hard again, and a fifth of his health comes back', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 800, anim: 'attack2', cast: demonForm },
    passive: { name: 'Soul Pact', text: 'Heals for 8% of the damage his blows deal, and hits up to 25% harder as his health falls', leech: 0.08, rage: 0.25 },
  },
  tyrant: {
    skill: { name: 'Judgement', text: 'A judgement falls on the toughest foe in reach, and the 3x3 round it', need: CHARGE_MAX, dealt: 6, taken: 5, perSec: 2, castMs: 800, anim: 'attack2', cast: judgement },
    ultimate: { name: 'Reign of Terror', text: 'Every foe within 6 tiles is hurt and slowed for 5s; every ally is rallied: attack up a quarter for 7s', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 900, anim: 'attack2', cast: reignOfTerror },
    passive: { name: 'Iron Throne', text: 'Blows from the front lose a quarter, and he cannot be knocked back', block: 0.25, steady: true },
  },
  // the bosses' skills (their escorts and forest bosses have none); a boss charges as the heroes do, a little faster
  orcWarlord: {
    skill: { name: 'Ground Slam', text: 'Slams a 3x3 of tiles, hurting the heroes on it', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 700, anim: 'attack', cast: groundSlam },
    passive: { name: 'Brutal', text: '15% of blows crit for x1.6 and make the hero bleed', crit: { chance: 0.15, mult: 1.6, bleed: { kind: 'bleed', dmg: 4, every: 500, ms: 3000 } } },
  },
  hornedOgre: {
    skill: { name: 'Horned Shove', text: 'Heroes within 2 tiles are hurt and shoved back a tile, and fall damage if it drops them 2 or more', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 600, anim: 'attack', cast: windGust },
    passive: { name: 'Thick Hide', text: 'Blows from the front lose a quarter', block: 0.25 },
  },
  demonLord: {
    skill: { name: 'Summon Imps', text: 'Calls two imps up beside it once it has none left', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 800, anim: 'attack', cast: summonImps },
    passive: { name: 'Dark Regrowth', text: 'Heals 1% of its health each second', regen: 0.01 },
  },
  devilLeader: {
    skill: { name: 'Hellfire', text: 'A meteor blasts a 3x3 of heroes and leaves it burning', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 800, anim: 'attack', cast: meteor },
    passive: { name: 'Hellborn', text: 'Its blows set the hero alight', ignite: { kind: 'burn', dmg: 3, every: 500, ms: 2000 } },
  },
  shamanKing: {
    skill: { name: 'Spirit Ward', text: 'Its foes near it take half damage for 3s', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 500, anim: 'attack', cast: holdTheLine },
    passive: { name: 'Spirit Mend', text: 'Every 2.5s heals the most hurt ally of its own', mend: { every: 2500, share: 1.2 } },
  },
  werewolf: {
    skill: { name: 'Ravage', text: 'Bites the weakest foe in reach for double, healing him half of what it deals', need: CHARGE_MAX, dealt: 6, taken: 4, perSec: 2, castMs: 450, anim: 'attack', cast: ravage },
    passive: { name: 'Frenzy', text: 'Each kill quickens its blows by a fifth for 4s (up to three)', frenzy: { per: 0.2, ms: 4000, max: 3 } },
  },
  minotaur: {
    skill: { name: 'Gore Charge', text: 'Charges up to 4 tiles in a line at a foe, hits it for double, knocks it back and stuns it for 1.5s', need: CHARGE_MAX, dealt: 6, taken: 5, perSec: 2, castMs: 550, anim: 'attack', cast: goreCharge },
    passive: { name: 'Trample', text: 'Blows deal a quarter more to a foe under half health', finish: { under: 0.5, mult: 1.25 } },
  },
  satyr: {
    skill: { name: 'Pipes of Pan', text: 'Hastens the allies within 3 tiles, and him, for 4s', need: CHARGE_MAX, dealt: 5, taken: 5, perSec: 3, castMs: 500, anim: 'attack', cast: pipes },
    passive: { name: 'Sure Hooves', text: 'Climbs ledges at no extra cost', sure: true },
  },
  gorgon: {
    skill: { name: 'Petrifying Gaze', text: 'Stiffens the strongest foe it sees within 5 tiles: it takes a blow and is stunned for 3s', need: CHARGE_MAX, dealt: 6, taken: 4, perSec: 2, castMs: 600, anim: 'attack', cast: gaze },
    ultimate: { name: 'Stone Curse', text: 'Every foe in sight within 6 tiles is hurt and turned to stone for 2.5s', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 800, anim: 'attack', cast: stoneCurse },
    passive: { name: 'Scaled Hide', text: 'Takes a fifth less from shots', scales: 0.2 },
  },
  samuraiCommander: {
    skill: { name: 'War Banner', text: 'Raises the attack of the allies within 3 tiles by a quarter for 6s', need: CHARGE_MAX, dealt: 5, taken: 5, perSec: 2, castMs: 600, anim: 'attack2', cast: banner },
    ultimate: { name: 'Rally Cry', text: 'The war banner flies over every ally: attack up a quarter for 9s and a quarter of their health back', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 700, anim: 'attack2', cast: rallyCry },
    passive: { name: 'Stand Firm', text: 'Cannot be knocked back', steady: true },
  },
  boarKing: {
    skill: { name: 'Tusk Flurry', text: 'Three quick strikes on one hero, who is stunned for 1.5s', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 700, anim: 'attack2', cast: flurry },
    passive: { name: 'Tough Hide', text: 'Blows from the front lose a fifth', block: 0.2 },
  },
};

// The armies' kinds (`foes.ts`) borrow the heroes' skills: an army has a look of its own, and the Lich King his own two.
KITS.lichKing = {
  skill: { name: 'Raise Dead', text: 'Two skeletons climb out of the ground beside him (up to six in a fight)', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 800, anim: 'attack2', cast: raiseDead },
  ultimate: { name: 'Soul Nova', text: 'A ring of cold soul fire hurts every hero within 4 tiles and freezes them for 1.8s', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 900, anim: 'attack2', cast: soulNova },
  passive: { name: 'Soul Drain', text: 'Heals for a sixth of the damage his blows deal', leech: 0.16 },
};
KITS.boneVolley = { skill: KITS.archer.skill, passive: { name: 'Dead Aim', text: 'Arrows ignore 2 defence', pierce: 2 } };
for (const id of ['packBlack', 'packRed', 'packWhite']) KITS[id] = KITS.werewolf;
for (const id of ['groveSatyr1', 'groveSatyr2', 'groveSatyr3']) KITS[id] = KITS.satyr;
for (const id of ['mazeMino1', 'mazeMino2', 'mazeMino3']) KITS[id] = KITS.minotaur;
for (const id of ['mazeGorgon1', 'mazeGorgon2', 'mazeGorgon3']) KITS[id] = { skill: KITS.gorgon.skill, passive: KITS.gorgon.passive };
for (const id of ['clanOgre', 'clanBrute']) KITS[id] = KITS.hornedOgre;
KITS.hellImp = { skill: KITS.boarKing.skill, passive: KITS.devilLeader.passive };
KITS.hellDemon = { skill: KITS.devilLeader.skill, passive: KITS.devilLeader.passive };
KITS.orcChieftain = { skill: KITS.samuraiCommander.skill, passive: { name: 'Thick Hide', text: 'Blows from the front lose a fifth', block: 0.2 } };
KITS.boneCaptain = { skill: KITS.samuraiCommander.skill, passive: { name: 'Bone Plate', text: 'Blows from the front lose a quarter', block: 0.25 } };
KITS.alphaWolf = KITS.werewolf;
KITS.gorgonQueen = { skill: KITS.gorgon.skill, ultimate: KITS.gorgon.ultimate, passive: KITS.gorgon.passive };
KITS.minotaurChampion = { skill: KITS.minotaur.skill, passive: { name: 'Unyielding', text: 'Blows from the front lose a fifth, and he cannot be knocked back', block: 0.2, steady: true } };

// The Yokai Night Parade (`foes.ts`): fox spirits trick and curse, crows dive and possess, the tengu monk blows heroes about.
KITS.yokaiFox = { skill: KITS.illusionist.skill, passive: { name: 'Fox Guile', text: 'Slips 20% of blows', dodge: 0.2 } };
KITS.yokaiWitch = { skill: KITS.warlock.skill, passive: { name: 'Black Curse', text: 'Heals for a sixth of the damage its blows deal', leech: 0.16 } };
KITS.yokaiCrow = { skill: KITS.karasu.skill, passive: KITS.karasu.passive };
KITS.yokaiSeer = { skill: { ...KITS.kitsune.skill, name: 'Possession', text: 'The strongest hero nearby is possessed and fights its own side for 3.5s' }, passive: { name: 'Evil Eye', text: 'Blows deal 30% more to shooters', prey: 1.3 } };
KITS.yokaiMonk = { skill: KITS.yamabushi.skill, passive: KITS.yamabushi.passive };
KITS.nineTails = {
  skill: { name: 'Foxfire', text: 'A fireball blasts a 3x3 of heroes and leaves it burning', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 800, anim: 'attack', cast: meteor },
  ultimate: KITS.kitsune.ultimate,
  passive: { name: 'Spirit Drain', text: 'Heals for a fifth of the damage its blows deal', leech: 0.2 },
};
KITS.oniKing = {
  skill: { name: 'Kanabo Smash', text: 'Smashes a 3x3 of tiles, hurting the heroes on it', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 700, anim: 'attack2', cast: groundSlam },
  ultimate: { name: 'Thunder Drum', text: 'A roar that hurts every hero within 4 tiles, shoves them back and stuns them for 1.5s', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 800, anim: 'attack2', cast: tempest },
  passive: { name: 'Demon Fury', text: 'Attack grows by up to 60% as its health falls, and it cannot be knocked back', rage: 0.6, steady: true },
};
// The Golem Forge: slow tanks; crushing blows, armour plate and crystal shards.
KITS.stoneGolem = { skill: { ...KITS.orcWarlord.skill, name: 'Crushing Slam' }, passive: { name: 'Stone Hide', text: 'Blows from the front lose a quarter', block: 0.25 } };
KITS.ironGolem = { skill: KITS.knight.skill, passive: { name: 'Iron Plate', text: 'Blows from the front lose a third, and it cannot be knocked back', block: 0.33, steady: true } };
KITS.crystalGolem = {
  skill: { name: 'Shard Burst', text: 'Crystal shards hurt every hero within 2 tiles and hold them still for 1.2s', need: CHARGE_MAX, dealt: 6, taken: 5, perSec: 2, castMs: 600, anim: 'attack', cast: shardBurst },
  passive: { name: 'Crystal Skin', text: 'A third of the damage of a melee blow it takes is sent back', thorns: 0.33 },
};
KITS.magmaGolem = { skill: { ...KITS.wizard.skill, name: 'Magma Burst', text: 'A gout of magma blasts a 3x3 and leaves it burning' }, passive: { name: 'Molten Skin', text: 'Its blows set the hero alight', ignite: { kind: 'burn', dmg: 3, every: 500, ms: 2000 } } };
KITS.sapphireColossus = {
  skill: { name: 'Shard Storm', text: 'Crystal shards hurt every hero within 2 tiles and hold them still for 1.2s', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 700, anim: 'attack', cast: shardBurst },
  passive: { name: 'Crystal Armour', text: 'Blows from the front lose a quarter, and a third of a melee blow is sent back', block: 0.25, thorns: 0.33 },
};
KITS.forgeTitan = {
  skill: { name: 'Forge Hammer', text: 'Slams a 3x3 of tiles, hurting the heroes on it', need: CHARGE_MAX, dealt: 4, taken: 4, perSec: 3, castMs: 700, anim: 'attack', cast: groundSlam },
  ultimate: { name: 'Furnace Blast', text: 'A meteor of molten iron blasts a 3x3 of heroes and leaves it burning', need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: 900, anim: 'attack', cast: meteor },
  passive: { name: 'Adamant Plate', text: 'Blows from the front lose a third, it cannot be knocked back and it mends 1% of its health a second', block: 0.33, steady: true, regen: 0.01 },
};

// Every other hero's ultimate (`ultimates.ts`), unlocked at `ULT_LEVEL`; the first eight's are retuned there.
const OWN_ULTIMATES = new Map<string, Skill>(Object.entries(KITS).filter(([, k]) => k.ultimate).map(([kind, k]) => [kind, k.ultimate!]));
const GATED = new Map<Skill, Skill>();
for (const [kind, ult] of Object.entries(heroUltimates((kind) => KITS[kind].ultimate))) {
  if (OWN_ULTIMATES.get(kind) && ult.unlock) GATED.set(ult, OWN_ULTIMATES.get(kind)!);
  KITS[kind].ultimate = ult;
}

// The named elites of the tower (`elites.ts`) borrow the foes' skills and heroes' skills too.
Object.assign(KITS, eliteKits(KITS), calBossKits(KITS));
// (a foe that shares one of the first eight's kits, such as the elites Sethra and Kuro, keeps the ultimate as it was: only the hero's copy waits for its level)
for (const [name, k] of Object.entries(KITS)) if (k.ultimate && GATED.has(k.ultimate) && OWN_ULTIMATES.get(name) !== GATED.get(k.ultimate)) KITS[name] = { ...k, ultimate: GATED.get(k.ultimate) };

export const kitOf = (u: Unit): Kit | undefined => u.kit ?? KITS[u.def];

/** A free hero whose charge is full lets its skill go, if there is something to use it on. */
export function tryCast(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  // (a placed hero casts from its own kit: its pool, two skills and the ultimate by tap or Auto, `heroKits.ts`)
  const hk = heroKitOf(me);
  if (hk) return castHero(b, me, hk, out);
  const k = kitOf(me);
  if (!k) return false;
  // (a full ultimate goes first; if it has nothing to hit, the ordinary skill may still go)
  const ult = ultimateOf(me);
  if (ult && (me.charge2 ?? 0) >= ult.need && powered(b, me, ult, (1 + tal(me, 'ultPow')) * (ultTune(me, ult)?.power ?? 1) - 1, out)) {
    me.charge2! -= ult.need;
    return began(b, me, ult, out, 'ult');
  }
  if (me.charge < k.skill.need || !powered(b, me, k.skill, 0, out)) return false;
  me.charge -= k.skill.need;
  return began(b, me, k.skill, out);
}

/** Cast a skill with the caster's `pow` talent (and `more`, an ultimate's) lifting its attack while it runs: the blows, the volleys and meteors, the healing and what is called up all take it. */
export function powered(b: Battle, me: Unit, s: Skill, more: number, out: BattleEvent[]): boolean {
  const k = 1 + tal(me, 'pow') + more;
  if (k === 1) return s.cast(b, me, out);
  me.power = (me.power ?? 1) * k;
  castK = k;
  const ok = s.cast(b, me, out);
  castK = 1;
  me.power = (me.power ?? 1) / k;
  return ok;
}
/** How strong the skill being cast is, as a multiple (1 unless a talent or an ultimate's `power` lifts it): an ultimate's engines scale what is not an attack (how long a stun or guard lasts, how much is shielded) by it. */
let castK = 1;
export const castPower = (): number => castK;

/** A skill has gone off: the caster is busy casting it, and a talent's cast effects fire (for a hero with a kit, the heal, shield and haste only on
 *  skill 2 and the ultimate, so cheap, frequent skills do not double their worth; its charge back is paid as a share of the cost, in `heroKits.ts`). */
export function began(b: Battle, me: Unit, s: Skill, out: BattleEvent[], slot: 'skill' | 'skill2' | 'ult' = 'skill'): boolean {
  const t = me.eq?.tal;
  const kitted = !!heroKitOf(me);
  if (t && (!kitted || slot !== 'skill')) {
    if (t.castHeal) mendUnit(me, me.maxHp * t.castHeal, out);
    if (t.castShield) me.shield = { hp: Math.round(me.maxHp * t.castShield), until: b.t + 3000 };
    if (t.castHaste) {
      me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + t.castHaste);
      out.push({ kind: 'haste', to: me.id, ms: t.castHaste });
    }
    if (t.refund && !kitted) gain(me, t.refund);
  }
  me.cast = { at: b.t, ms: s.castMs, anim: s.anim };
  me.swing = undefined;
  me.busyUntil = b.t + s.castMs;
  out.push({ kind: 'skill', by: me.id, name: s.name, ms: s.castMs });
  if (slot === 'ult') triggerDuoComboOnUlt(b, me, out);
  // (a hero merged up adds its tier skill's riders to the ordinary skill; the ultimate is the same at every grade)
  if (me.grade && s === kitOf(me)?.skill)
    runRiders(b, me, out, (ms, share) => b.pending.push({ at: b.t + ms, kind: 'echo', by: me.id, to: me.id, dmg: share, heavy: false }));
  return true;
}

/** A tier skill's echo: the hero's skill goes off again at `share` of its strength (nothing happens if it has nothing to hit, or the hero has fallen). It is not a cast: no charge, no busy time, and no riders of its own. */
export function echoSkill(b: Battle, me: Unit, share: number, out: BattleEvent[]): void {
  const s = kitOf(me)?.skill;
  if (!s || !me.alive) return;
  const at = out.length;
  out.push({ kind: 'skill', by: me.id, name: s.name, ms: s.castMs });
  if (!powered(b, me, s, share - 1, out)) out.splice(at, 1);
}

/** A fighter's ultimate, once it is its own: a hero's waits for the level its `unlock` names, and a foe never takes one that has an `unlock` (it is a hero's alone, so a boss that borrows a hero's skill does not borrow the ultimate). */
export const ultimateOf = (u: Unit): Skill | undefined => {
  const s = kitOf(u)?.ultimate;
  if (!s) return undefined;
  if (!s.unlock) return s;
  return u.side === 'hero' && (u.level ?? 1) >= s.unlock ? s : undefined;
};

/** The balance knobs of a hero's ultimate, once it fights at `ULT_LEVEL` or more (none for a foe, or a hero below it). */
export const ultTune = (u: Unit, s: Skill): Skill['tuned'] => (u.side === 'hero' && (u.level ?? 1) >= ULT_LEVEL ? s.tuned : undefined);

/** Whether a hero's ultimate is full. */
export const ultimateReady = (u: Unit): boolean => !!ultimateOf(u) && (u.charge2 ?? 0) >= ultimateOf(u)!.need;

/** Charge a fighter's skill meter by `n`, and its ultimate's (at `ULT_RATE` of it) unless `skillOnly`. */
export const gain = (u: Unit, n: number, skillOnly = false) => {
  const k = u.alive ? kitOf(u) : undefined;
  if (!k) return;
  // (a hero with a kit has a pool, not a charge meter: charge given to it is a share of its pool, `CHARGE_TO_POOL`; its ultimate fills from the fight, not from gifts)
  const pool = poolOf(u);
  if (pool) return addRes(u, (n * CHARGE_TO_POOL * resMax(pool)) / CHARGE_MAX);
  u.charge = Math.min(CHARGE_MAX, u.charge + n);
  if (!skillOnly && ultimateOf(u)) u.charge2 = Math.min(CHARGE_MAX, (u.charge2 ?? 0) + n * ULT_RATE * (ultTune(u, ultimateOf(u)!)?.rate ?? 1) * (1 + tal(u, 'ultRate')));
};

/** Yokai trait milestone (three Yokai): upon dodging, leave a spirit wisp trap on the tile, hurting and holding the foe that steps on it; one wisp a Yokai at a time. */
export function spawnSpiritWisp(b: Battle, to: Unit, out: BattleEvent[]): void {
  const traps = (b.traps ??= []);
  if (!traps.some((tr) => (tr.u === to.u && tr.v === to.v) || (tr.wisp && tr.by === to.id && tr.until > b.t))) {
    traps.push({
      u: to.u,
      v: to.v,
      side: to.side,
      by: to.id,
      until: b.t + 10000,
      dmg: Math.max(10, Math.round(atkOf(to) * 1.2)),
      hold: 800,
      wisp: true,
    });
    out.push({ kind: 'wisp', by: to.id, u: to.u, v: to.v, ms: 10000 });
  }
}

/** What a blow or skill does to its target after guards, blocks and dodges (null when slipped), charging both sides. */
export function onStrike(b: Battle, by: Unit, to: Unit, dmg: number, src: 'blow' | 'skill' | 'dot', splash: boolean, out: BattleEvent[]): number | null {
  const blow = src === 'blow';
  const kit = kitOf(to);
  const team = to.side === 'hero' ? b.traits : undefined;
  const dodge = (kit?.passive.dodge ?? 0) + (team?.dodge ?? 0) + (to.eq?.dodge ?? 0);
  if (blow && dodge && roll(b) < dodge) {
    out.push({ kind: 'dodge', to: to.id });
    if (b.traits?.yokaiWisp && traitsOf(to.def).includes('yokai')) {
      spawnSpiritWisp(b, to, out);
    }
    if (poolOf(to)) poolOnTaken(b, to, true);
    else gain(to, (kit?.skill.taken ?? 0) * 0.5);
    return null;
  }
  // (what the hero kits leave on fighters: a parry, a guise, smoke, marks, a standard, a song, a vow...; null when the blow is turned aside)
  const kitted = kitStrike(b, by, to, dmg, src, splash, out);
  if (kitted === null) return null;
  dmg = kitted;
  const block = (kit?.passive.block ?? 0) + tal(to, 'block');
  if (blow && block && (wayTo(by, to) + 2) % 4 === to.facing) {
    const turned = dmg * block;
    dmg -= turned;
    if (kit?.passive.blockHeal) mendUnit(to, turned * kit.passive.blockHeal, out);
  }
  if (blow && kit?.passive.scales && defOf(by).shot) dmg *= 1 - kit.passive.scales;
  // (a halo: the ally who wears it shields those within two tiles, itself too)
  let halo = 0;
  for (const a of b.units) if (a.alive && a.side === to.side && apart(a, to) <= 2) halo = Math.max(halo, kitOf(a)?.passive.halo ?? 0);
  if (halo && src !== 'dot') dmg *= 1 - halo;
  const huddle = (kit?.passive.huddle ?? 0) + tal(to, 'huddle');
  if (huddle && src !== 'dot') {
    const n = b.units.filter((a) => a.alive && a !== to && a.side === to.side && apart(a, to) === 1).length;
    dmg *= 1 - huddle * Math.min(3, n);
  }
  if (to.guardUntil !== undefined && to.guardUntil > b.t) dmg *= GUARD_SHARE;
  if (to.brittleUntil !== undefined && to.brittleUntil > b.t) dmg *= BRITTLE_MULT;
  if (team?.guard) dmg *= 1 - team.guard;
  if (src === 'dot' && to.eq?.resist) dmg *= 1 - to.eq.resist;
  if (src !== 'dot') {
    if (blow && !splash) {
      if (poolOf(by)) poolOnDealt(by);
      else gain(by, kitOf(by)?.skill.dealt ?? 0);
    }
    if (poolOf(to)) poolOnTaken(b, to);
    else gain(to, kit?.skill.taken ?? 0);
  }
  const left = Math.max(1, Math.round(dmg));
  // (a talent's rider on a skill: what it hits is slowed or held)
  if (src === 'skill' && by.eq?.tal && by.side !== to.side) {
    if (by.eq.tal.skillSlow) to.slowUntil = Math.max(to.slowUntil ?? 0, b.t + by.eq.tal.skillSlow);
    if (by.eq.tal.skillStun) {
      to.busyUntil = Math.max(to.busyUntil, b.t + by.eq.tal.skillStun);
      to.stunUntil = Math.max(to.stunUntil ?? 0, b.t + by.eq.tal.skillStun);
    }
  }
  fxStruck(b, by, to, left, blow && !splash, out);
  // (thorns: a melee blow hurts the one who swung it)
  const thorns = (kit?.passive.thorns ?? 0) + tal(to, 'thorns');
  if (blow && !splash && thorns && apart(by, to) === 1 && by.alive) hurt(b, to, by, Math.max(1, Math.round(left * thorns)), false, false, out, 'skill');
  return left;
}

/** A blow's own odds at swing time: a crit, with its extra damage. */
export function rollCrit(b: Battle, me: Unit): number {
  const c = kitOf(me)?.passive.crit;
  const chance = (c?.chance ?? 0) + (me.side === 'hero' ? b.traits?.crit ?? 0 : 0) + (me.eq?.crit ?? 0);
  return chance && roll(b) < chance ? c?.mult ?? 1.5 : 1;
}

/** After a blow has landed: a crit makes the foe bleed, and a flame blow sets it alight. */
/** How much more a blow deals to this target (Karasu Tengu's prey), as a multiplier. */
export const preyOf = (by: Unit, to: Unit): number => (kitOf(by)?.passive.prey && defOf(to).shot ? kitOf(by)!.passive.prey! : 1);
/** How much more a blow deals to a foe under the attacker's finishing mark (Minotaur's trample), as a multiplier. */
export const finishOf = (by: Unit, to: Unit): number => {
  const f = kitOf(by)?.passive.finish;
  return f && to.hp < to.maxHp * f.under ? f.mult : 1;
};
/** How much of the target's defence a blow ignores. */
/** How much more a blow deals at a distance (the Ranger's long shot), as a multiplier. */
export const farOf = (by: Unit, to: Unit): number => {
  const far = kitOf(by)?.passive.far;
  return far && apart(by, to) >= 4 ? 1 + far : 1;
};
/** How much more attack a fighter has as its health falls (the Barbarian's rage), as a multiplier. */
export const rageOf = (u: Unit): number => {
  const r = (kitOf(u)?.passive.rage ?? 0) + tal(u, 'rage');
  return r ? 1 + r * (1 - u.hp / u.maxHp) : 1;
};
export const pierceOf = (by: Unit): number => kitOf(by)?.passive.pierce ?? 0;

export function afterBlow(b: Battle, by: Unit, to: Unit, crit: boolean, dmg = 0, out: BattleEvent[] = []): void {
  const p = kitOf(by)?.passive;
  const leech = (p?.leech ?? 0) + tal(by, 'leech');
  if (leech && by.alive) mendUnit(by, dmg * leech, out);
  fxBlow(b, by, to, crit, dmg, out);
  if (p?.through && dmg > 0) {
    const way = wayTo(by, to);
    const behind = foesOf(b, by).find((f) => f.u === to.u + DIR[way][0] && f.v === to.v + DIR[way][1]);
    if (behind) hurt(b, by, behind, net(dmg * p.through + defenceOf(behind), behind), false, true, out, 'skill');
  }
  if (p?.arc && dmg > 0 && roll(b) < p.arc) {
    const second = foesOf(b, by).filter((f) => f !== to && apart(f, to) <= 2).sort((x, y) => apart(x, to) - apart(y, to) || x.id - y.id)[0];
    if (second) {
      out.push({ kind: 'arc', from: to.id, to: second.id });
      hurt(b, by, second, net(dmg * ARC_SHARE + defenceOf(second), second), false, true, out, 'skill');
    }
  }
  if (!to.alive) return;
  if (p?.slow) to.slowUntil = Math.max(to.slowUntil ?? 0, b.t + p.slow);
  // (the relic sets: a hero's blows burn the foe, its first blow chills it, its crits make it bleed)
  const set = by.side === 'hero' ? b.relics?.set : undefined;
  if (set?.chill && !to.chilled) {
    to.chilled = true;
    to.slowUntil = Math.max(to.slowUntil ?? 0, b.t + set.chill);
  }
  const share = set && (crit ? set.bleed : set.burn);
  const setDot: Dot | undefined = share ? { kind: crit ? 'bleed' : 'burn', dmg: Math.max(1, Math.round(atkOf(by) * share)), every: 500, ms: crit ? 3000 : 2000 } : undefined;
  const dot = (crit ? p?.crit?.bleed : p?.ignite) ?? setDot;
  if (dot) to.dot = { ...dot, by: by.id, next: b.t + dot.every, until: b.t + dot.ms };
}

/** Land a volley or a meteor: everything of the caster's foes in the 3x3 is struck. */
export function landArea(b: Battle, kind: 'rain' | 'meteor', by: Unit, u: number, v: number, power: number, out: BattleEvent[]): void {
  for (const f of b.units)
    if (f.alive && f.side !== by.side && near3x3(f, { u, v })) hurt(b, by, f, net(power, f), kind === 'meteor', false, out, 'skill');
  if (kind === 'meteor') {
    const ms = durOf(by, BURN_MS);
    b.zones.push({ u, v, side: by.side, by: by.id, until: b.t + ms, next: b.t + BURN_EVERY, dmg: 6 });
    out.push({ kind: 'zone', u, v, ms });
  }
}

/** Every tick: skill charge by time, damage over time, burning ground. */
export function tickStatus(b: Battle, out: BattleEvent[]): void {
  for (const u of b.units) {
    if (!u.alive) continue;
    const k = kitOf(u);
    if (poolOf(u)) tickPool(b, u, 100);
    else if (k) gain(u, ((k.skill.perSec * 100) / 1000) * (u.side === 'hero' ? (b.traits?.charge ?? 1) * (1 + (u.eq?.charge ?? 0)) : 1));
    if (u.form && b.t >= u.form.until) {
      u.power = (u.power ?? 1) / FORM_MULT;
      u.form = undefined;
    }
    if (u.banner && b.t >= u.banner.until) {
      u.power = (u.power ?? 1) / BANNER_MULT;
      u.banner = undefined;
    }
    fxTick(b, u, out);
    const p = k?.passive;
    if (p?.aura && b.t % 1000 === 0) for (const a of b.units) if (a.alive && a.side === u.side && apart(a, u) <= 2) mendUnit(a, a.maxHp * p.aura, out, u);
    if (u.hot) {
      if (b.t >= u.hot.until) u.hot = undefined;
      else if (b.t >= u.hot.next) {
        u.hot.next += u.hot.every;
        mendUnit(u, u.hot.amount, out, b.units.find((x) => x.id === u.hot!.by) ?? u);
      }
    }
    const regen = (p?.regen ?? 0) + (u.side === 'hero' ? b.relics?.set?.regen ?? 0 : 0);
    if (regen && b.t % 1000 === 0) mendUnit(u, u.maxHp * regen, out);
    if (p?.tune) {
      u.tuneAt ??= b.t + p.tune.every;
      if (b.t >= u.tuneAt) {
        u.tuneAt = b.t + p.tune.every;
        const friend = b.units
          .filter((a) => a.alive && a !== u && a.side === u.side && apart(a, u) <= 4 && kitOf(a))
          .sort((x, y) => x.charge - y.charge || x.id - y.id)[0];
        if (friend) {
          gain(friend, p.tune.charge, true);
          out.push({ kind: 'song', by: u.id, ms: 700 });
        }
      }
    }
    if (p?.mend) {
      u.mendAt ??= b.t + p.mend.every;
      if (b.t >= u.mendAt) {
        u.mendAt = b.t + p.mend.every;
        const weakest = b.units.filter((a) => a.alive && a.side === u.side && a.hp < a.maxHp).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
        if (weakest) mendUnit(weakest, atkOf(u) * p.mend.share, out, u);
      }
    }
    const d = u.dot;
    if (d) {
      if (b.t >= d.until) u.dot = undefined;
      else if (b.t >= d.next) {
        d.next += d.every;
        const by = b.units.find((x) => x.id === d.by)!;
        hurt(b, by, u, d.dmg, false, false, out, 'dot');
        // (a curse feeds the one who laid it)
        if (d.kind === 'curse' && by.alive) mendUnit(by, d.dmg * HEX_DRAIN, out);
      }
    }
  }
  for (const z of b.zones) {
    while (z.next <= b.t && z.next <= z.until) {
      z.next += BURN_EVERY;
      const by = b.units.find((x) => x.id === z.by)!;
      for (const f of b.units)
        if (f.alive && f.side !== z.side && near3x3(f, z)) {
          hurt(b, by, f, z.dmg, false, false, out, 'dot');
          if (z.slow && f.alive) slowFor(b, f, z.slow);
        }
    }
  }
  b.zones = b.zones.filter((z) => z.until > b.t);
  kitTick(b, out);
  // snares: the first foe standing on one springs it
  if (b.traps?.length) {
    for (const tr of b.traps) {
      const f = b.units.find((x) => x.alive && x.side !== tr.side && x.u === tr.u && x.v === tr.v);
      if (!f) continue;
      tr.until = 0;
      const layer = b.units.find((x) => x.id === tr.by)!;
      hurt(b, layer, f, net(tr.dmg, f), true, false, out, 'skill');
      if (f.alive) {
        f.busyUntil = Math.max(f.busyUntil, b.t + durOf(layer, tr.hold ?? ROOT_MS));
        f.stunUntil = b.t + durOf(layer, tr.hold ?? ROOT_MS);
      }
    }
    b.traps = b.traps.filter((tr) => tr.until > b.t);
  }
  // cabbages kicked by Duchess: the first unit walking over it is healed for 10% max HP
  if (b.cabbages?.length) {
    const kept: typeof b.cabbages = [];
    for (const c of b.cabbages) {
      const walker = b.units.find((x) => x.alive && x.u === c.u && x.v === c.v);
      if (walker) {
        const healAmt = Math.max(1, Math.round(walker.maxHp * (c.healPercent ?? 0.1)));
        walker.hp = Math.min(walker.maxHp, walker.hp + healAmt);
        out.push({ kind: 'heal', to: walker.id, amount: healAmt });
      } else {
        kept.push(c);
      }
    }
    b.cabbages = kept.length ? kept : undefined;
  }
}

/** What `ultimates.ts` builds the heroes' ultimates from: the skills' own engines and rules. */
export { apart, near3x3, net, crowd, slowFor, drag, durOf, reachOf, callSummon, blinkStrike, iaido, chargeAt, lineFoes, DIR, HEX_EVERY };
