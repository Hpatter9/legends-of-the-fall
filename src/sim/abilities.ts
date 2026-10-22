// The heroes' kits (and the bosses'), King God Castle style: a skill that fires on its own when its charge fills (blows dealt and blows
// taken charge it, and so does time), and a passive that is always on. A kit is data (`KITS`) plus one `cast` function
// for the skill; the rules that read it are generic. The fight (`battle.ts`) calls `tryCast` when a hero is free,
// `onStrike` when a blow or a skill is about to hurt, `afterBlow` once a blow has landed and `tickStatus` every tick.
//
// Randomness comes from the battle's own side stream (`b.skillRng`), so the fight's main stream is left alone.

import { sightClear, standable, tileAt, type At } from './board';
import { addUnit, atkOf, blowMult, canStrike, defOf, hurt, strikeDef, tileOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from './battle';
import { Rng } from './rng';

/** A skill fires at this much charge. */
export const CHARGE_MAX = 100;
/** A Mythic's ultimate gathers charge at this share of its first skill's rate. */
export const ULT_RATE = 0.45;

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
  /** A Mythic's second, bigger skill: it charges on its own meter, `ULT_RATE` as fast as the first (its own charge rates are unused). */
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
    const power = atkOf(me) * 1.6 * blowMult(h0, tileOf(b, f).h, best.way, f.facing);
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
    const power = atkOf(me) * 1.8 * blowMult(tileOf(b, me).h, hf, me.facing, f.facing);
    hurt(b, me, f, net(power, f), true, false, out, 'skill');
    return true;
  }
  return false;
}

/** Archer: arrows rain on a 3x3 of tiles a moment after the call, on whoever is standing there. */
const VOLLEY_MS = 700;
function volley(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const aim = crowd(b, me, (f) => canStrike(b.board, def, me, f));
  if (!aim) return false;
  b.pending.push({ at: b.t + VOLLEY_MS, kind: 'rain', by: me.id, to: aim.id, dmg: atkOf(me) * 1.0, heavy: false, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'volley', u: aim.u, v: aim.v, ms: VOLLEY_MS });
  return true;
}

/** Wizard: a meteor falls on a 3x3 and leaves it burning. */
const METEOR_MS = 1100;
const METEOR_REACH = 6;
const BURN_MS = 4000;
const BURN_EVERY = 500;
function meteor(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= METEOR_REACH);
  if (!aim) return false;
  b.pending.push({ at: b.t + METEOR_MS, kind: 'meteor', by: me.id, to: aim.id, dmg: atkOf(me) * 2.2, heavy: true, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: METEOR_MS });
  return true;
}

/** The share of a blow an arc of lightning carries to the second foe. */
const ARC_SHARE = 0.6;
const STUN_MS = 1500;

const sorted = (fs: Unit[]) => fs.sort((x, y) => x.hp - y.hp || x.id - y.id);

/** Heal an ally (never past full), with the event for the renderer; the healing counts for `by` (its healer, or itself). */
function mendUnit(u: Unit, amount: number, out: BattleEvent[], by: Unit = u): void {
  const n = Math.min(Math.round(amount), u.maxHp - u.hp);
  if (n <= 0 || !u.alive) return;
  u.hp += n;
  by.healed = (by.healed ?? 0) + n;
  out.push({ kind: 'heal', to: u.id, amount: n, by: by.id });
}

/** Ninja Monk: three quick strikes on the weakest foe in reach, and it is stunned. */
function flurry(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const f = sorted(foesOf(b, me).filter((x) => canStrike(b.board, def, me, x)))[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  const mult = blowMult(tileOf(b, me).h, tileOf(b, f).h, me.facing, f.facing);
  for (let i = 0; i < 3; i++) hurt(b, me, f, net(atkOf(me) * 0.8 * mult, f), i === 2, false, out, 'skill');
  if (f.alive) {
    f.busyUntil = Math.max(f.busyUntil, b.t + STUN_MS);
    f.stunUntil = b.t + STUN_MS;
  }
  return true;
}

/** Peasant: the allies within two tiles close ranks and take half damage for a while. */
const HOLD_MS = 3000;
function holdTheLine(b: Battle, me: Unit): boolean {
  if (!foesOf(b, me).some((f) => apart(me, f) <= 3)) return false;
  for (const a of b.units) if (a.alive && a.side === me.side && apart(me, a) <= 2) a.guardUntil = b.t + HOLD_MS;
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
  for (let i = 0; at && i <= CHAIN_JUMPS; i++) {
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
      a.guardUntil = b.t + SANCTUARY_MS;
    }
  return true;
}

/** Kitsune: the strongest foe near her is charmed, and fights its own side for a while. */
const CHARM_MS = 3500;
function charm(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  const f = foes
    .filter((x) => apart(me, x) <= 5 && !(x.charmUntil !== undefined && x.charmUntil > b.t) && foes.some((o) => o !== x))
    .sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id)[0];
  if (!f) return false;
  f.charmUntil = b.t + CHARM_MS;
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
const windGust = (b: Battle, me: Unit, out: BattleEvent[]) => gust(b, me, out, GUST_REACH, 0.9, 0);
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
const tempest = (b: Battle, me: Unit, out: BattleEvent[]) => gust(b, me, out, 4, 1.8, 1500);

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
  by.frenzy = { n: Math.min(f.max, n + 1), until: b.t + f.ms };
  out.push({ kind: 'frenzy', by: by.id, n: by.frenzy.n });
}
/** How much faster a fighter's blows come, from its frenzy (1 when none). */
export const frenzyOf = (b: Battle, u: Unit): number => {
  const f = kitOf(u)?.passive.frenzy;
  return f && u.frenzy && u.frenzy.until > b.t ? 1 + f.per * u.frenzy.n : 1;
};

/** Minotaur: charges up a line of up to four tiles at the weakest foe it meets, hits it for double, knocks it back and stuns it. */
const CHARGE_TILES = 4;
function goreCharge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = defOf(me);
  let best: { way: number; land: At; f: Unit } | undefined;
  for (let way = 0; way < 4; way++) {
    const [du, dv] = DIR[way];
    let h = tileOf(b, me).h;
    let land: At = { u: me.u, v: me.v };
    for (let i = 1; i <= CHARGE_TILES; i++) {
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
  const power = atkOf(me) * 2 * blowMult(h0, tileOf(b, f).h, way, f.facing);
  me.facing = way;
  if (land.u !== from.u || land.v !== from.v) {
    me.step = { u: from.u, v: from.v, h: h0, at: b.t, ms: 260 };
    me.u = land.u;
    me.v = land.v;
    out.push({ kind: 'dash', by: me.id, from, to: land });
  }
  hurt(b, me, f, net(power, f), true, false, out, 'skill');
  if (!f.alive) return true;
  f.busyUntil = Math.max(f.busyUntil, b.t + STUN_MS);
  f.stunUntil = b.t + STUN_MS;
  const to = { u: f.u + DIR[way][0], v: f.v + DIR[way][1] };
  const t = tileAt(b.board, to.u, to.v);
  if (kitOf(f)?.passive.steady || !t || !standable(t) || unitAt(b, to.u, to.v)) return true;
  f.step = { u: f.u, v: f.v, h: tileOf(b, f).h, at: b.t, ms: 250 };
  f.u = to.u;
  f.v = to.v;
  return true;
}

/** Satyr: its pipes hasten the allies within three tiles (itself too) for a while. It needs an ally to play to. */
const SONG_REACH = 3;
const SONG_MS = 4000;
function pipes(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = b.units.filter((a) => a.alive && a.side === me.side && apart(me, a) <= SONG_REACH);
  if (!near.some((a) => a !== me)) return false;
  for (const a of near) a.hasteUntil = b.t + SONG_MS;
  out.push({ kind: 'song', by: me.id, ms: SONG_MS });
  return true;
}
/** Sure-footed fighters (Satyr) climb for nothing. */
export const sureFooted = (u: Unit): boolean => !!kitOf(u)?.passive.sure;

/** Gorgon: its stare stiffens the strongest foe it can see within five tiles: that foe takes a blow and is stunned for 3s. */
const GAZE_REACH = 5;
const PETRIFY_MS = 3000;
function gaze(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesOf(b, me)
    .filter((x) => apart(me, x) <= GAZE_REACH && sightClear(b.board, me, x))
    .sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id)[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  hurt(b, me, f, net(atkOf(me), f), false, false, out, 'skill');
  if (f.alive) {
    f.busyUntil = Math.max(f.busyUntil, b.t + PETRIFY_MS);
    f.stunUntil = b.t + PETRIFY_MS;
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
    f.charmUntil = b.t + DREAM_MS;
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
  const seen = foesOf(b, me).filter((x) => apart(me, x) <= CURSE_REACH && sightClear(b.board, me, x));
  if (!seen.length) return false;
  me.facing = wayTo(me, seen.sort((x, y) => atkOf(y) - atkOf(x) || x.id - y.id)[0]);
  for (const f of seen) {
    hurt(b, me, f, net(atkOf(me) * 1.2, f), false, false, out, 'skill');
    if (f.alive) {
      f.busyUntil = Math.max(f.busyUntil, b.t + STONE_MS);
      f.stunUntil = b.t + STONE_MS;
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
    a.banner = { until: b.t + RALLY_MS };
    mendUnit(a, a.maxHp * RALLY_HEAL, out, me);
  }
  out.push({ kind: 'banner', by: me.id, ms: RALLY_MS });
  return true;
}

/** Samurai Commander: a war banner raises the attack of the allies within three tiles (itself too) for a while. */
export const BANNER_MULT = 1.25;
const BANNER_MS = 6000;
function banner(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = b.units.filter((a) => a.alive && a.side === me.side && apart(me, a) <= 3);
  if (!near.some((a) => a !== me)) return false;
  for (const a of near) {
    // (a second banner only lengthens the first: the attack is raised once)
    if (a.banner === undefined) a.power = (a.power ?? 1) * BANNER_MULT;
    a.banner = { until: b.t + BANNER_MS };
  }
  out.push({ kind: 'banner', by: me.id, ms: BANNER_MS });
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
  for (const at of spots.slice(0, SUMMONED)) addUnit(b, 'imp', at.u, at.v, { atk: me.power ?? 1 });
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
    addUnit(b, 'skeleton', at.u, at.v, { hp: b.foeBoost?.hp, atk: b.foeBoost?.atk });
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

/** Paladin: foes near him must go for him for a few seconds, and the allies beside him are healed. */
const CHALLENGE_MS = 3000;
function holyChallenge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= 3);
  if (!near.length) return false;
  for (const f of near) f.taunt = { to: me.id, until: b.t + CHALLENGE_MS };
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
    a.hot = { amount: atkOf(me) * 1.2, every: 1000, next: b.t + 1000, until: b.t + BLESS_MS, by: me.id };
    out.push({ kind: 'heal', to: a.id, amount: 0, by: me.id });
  }
  return true;
}

/** Druid: a treant rises beside her (one at a time) and fights for her side. */
function callTreant(b: Battle, me: Unit): boolean {
  if (b.units.some((x) => x.alive && x.side === me.side && x.def === 'treant')) return false;
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
  const t = addUnit(b, 'treant', to.u, to.v, { atk: me.power ?? 1, hp: me.maxHp / defOf(me).hp });
  t.facing = wayTo(t, near);
  return true;
}

/** Barbarian: spins, and every foe in the 3x3 around him is cut. */
function whirlwind(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => near3x3(me, f));
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
    if (laid >= TRAPS) break;
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
    f.dot = { kind: 'curse', dmg: Math.max(1, Math.round(atkOf(me) * 0.35)), every: HEX_EVERY, ms: HEX_MS, by: me.id, next: b.t + HEX_EVERY, until: b.t + HEX_MS };
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
    d.hp = d.maxHp = Math.max(1, Math.round(me.maxHp * DECOY_HP));
    d.facing = wayTo(d, near);
    // (a decoy stands where it appeared for a moment, so the foes find it there)
    d.busyUntil = b.t + 1500;
    decoys.push(d);
  }
  for (const f of foes.filter((x) => apart(from, x) <= 4)) f.taunt = { to: decoys.sort((x, y) => apart(f, x) - apart(f, y) || x.id - y.id)[0].id, until: b.t + DECOY_MS };
  return true;
}

/** Gunslinger: one slug through every foe in a line, whatever is between. */
const LINE_WIDTH = 0.7;
function deadEye(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const foes = foesOf(b, me);
  const line = (aim: Unit) => {
    const du = aim.u - me.u;
    const dv = aim.v - me.v;
    const len = Math.hypot(du, dv);
    return foes.filter((f) => {
      const proj = ((f.u - me.u) * du + (f.v - me.v) * dv) / len;
      const perp = Math.abs((f.u - me.u) * dv - (f.v - me.v) * du) / len;
      return proj > 0 && proj <= def.range + 3 && perp <= LINE_WIDTH;
    });
  };
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

export const kitOf = (u: Unit): Kit | undefined => KITS[u.def];

/** A free hero whose charge is full lets its skill go, if there is something to use it on. */
export function tryCast(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const k = kitOf(me);
  if (!k) return false;
  // (a full ultimate goes first; if it has nothing to hit, the ordinary skill may still go)
  if (k.ultimate && (me.charge2 ?? 0) >= k.ultimate.need && k.ultimate.cast(b, me, out)) {
    me.charge2! -= k.ultimate.need;
    return began(b, me, k.ultimate, out);
  }
  if (me.charge < k.skill.need || !k.skill.cast(b, me, out)) return false;
  me.charge -= k.skill.need;
  return began(b, me, k.skill, out);
}

function began(b: Battle, me: Unit, s: Skill, out: BattleEvent[]): boolean {
  me.cast = { at: b.t, ms: s.castMs, anim: s.anim };
  me.swing = undefined;
  me.busyUntil = b.t + s.castMs;
  out.push({ kind: 'skill', by: me.id, name: s.name, ms: s.castMs });
  return true;
}

/** Whether a hero's ultimate is full. */
export const ultimateReady = (u: Unit): boolean => !!kitOf(u)?.ultimate && (u.charge2 ?? 0) >= kitOf(u)!.ultimate!.need;

const gain = (u: Unit, n: number) => {
  const k = u.alive ? kitOf(u) : undefined;
  if (!k) return;
  u.charge = Math.min(CHARGE_MAX, u.charge + n);
  if (k.ultimate) u.charge2 = Math.min(CHARGE_MAX, (u.charge2 ?? 0) + n * ULT_RATE);
};

/** What a blow or skill does to its target after guards, blocks and dodges (null when slipped), charging both sides. */
export function onStrike(b: Battle, by: Unit, to: Unit, dmg: number, src: 'blow' | 'skill' | 'dot', splash: boolean, out: BattleEvent[]): number | null {
  const blow = src === 'blow';
  const kit = kitOf(to);
  const team = to.side === 'hero' ? b.traits : undefined;
  const dodge = (kit?.passive.dodge ?? 0) + (team?.dodge ?? 0);
  if (blow && dodge && roll(b) < dodge) {
    out.push({ kind: 'dodge', to: to.id });
    gain(to, (kit?.skill.taken ?? 0) * 0.5);
    return null;
  }
  if (blow && kit?.passive.block && (wayTo(by, to) + 2) % 4 === to.facing) {
    const turned = dmg * kit.passive.block;
    dmg -= turned;
    if (kit.passive.blockHeal) mendUnit(to, turned * kit.passive.blockHeal, out);
  }
  if (blow && kit?.passive.scales && defOf(by).shot) dmg *= 1 - kit.passive.scales;
  if (kit?.passive.huddle && src !== 'dot') {
    const n = b.units.filter((a) => a.alive && a !== to && a.side === to.side && apart(a, to) === 1).length;
    dmg *= 1 - kit.passive.huddle * Math.min(3, n);
  }
  if (to.guardUntil !== undefined && to.guardUntil > b.t) dmg *= GUARD_SHARE;
  if (team?.guard) dmg *= 1 - team.guard;
  if (src !== 'dot') {
    if (blow && !splash) gain(by, kitOf(by)?.skill.dealt ?? 0);
    gain(to, kit?.skill.taken ?? 0);
  }
  const left = Math.max(1, Math.round(dmg));
  // (thorns: a melee blow hurts the one who swung it)
  if (blow && !splash && kit?.passive.thorns && apart(by, to) === 1 && by.alive) hurt(b, to, by, Math.max(1, Math.round(left * kit.passive.thorns)), false, false, out, 'skill');
  return left;
}

/** A blow's own odds at swing time: a crit, with its extra damage. */
export function rollCrit(b: Battle, me: Unit): number {
  const c = kitOf(me)?.passive.crit;
  const chance = (c?.chance ?? 0) + (me.side === 'hero' ? b.traits?.crit ?? 0 : 0);
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
  const r = kitOf(u)?.passive.rage;
  return r ? 1 + r * (1 - u.hp / u.maxHp) : 1;
};
export const pierceOf = (by: Unit): number => kitOf(by)?.passive.pierce ?? 0;

export function afterBlow(b: Battle, by: Unit, to: Unit, crit: boolean, dmg = 0, out: BattleEvent[] = []): void {
  const p = kitOf(by)?.passive;
  if (p?.leech && by.alive) mendUnit(by, dmg * p.leech, out);
  if (p?.through && dmg > 0) {
    const way = wayTo(by, to);
    const behind = foesOf(b, by).find((f) => f.u === to.u + DIR[way][0] && f.v === to.v + DIR[way][1]);
    if (behind) hurt(b, by, behind, net(dmg * p.through + defOf(behind).def, behind), false, true, out, 'skill');
  }
  if (p?.arc && dmg > 0 && roll(b) < p.arc) {
    const second = foesOf(b, by).filter((f) => f !== to && apart(f, to) <= 2).sort((x, y) => apart(x, to) - apart(y, to) || x.id - y.id)[0];
    if (second) {
      out.push({ kind: 'arc', from: to.id, to: second.id });
      hurt(b, by, second, net(dmg * ARC_SHARE + defOf(second).def, second), false, true, out, 'skill');
    }
  }
  if (!to.alive) return;
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
    if (k) gain(u, ((k.skill.perSec * 100) / 1000) * (u.side === 'hero' ? b.traits?.charge ?? 1 : 1));
    if (u.banner && b.t >= u.banner.until) {
      u.power = (u.power ?? 1) / BANNER_MULT;
      u.banner = undefined;
    }
    const p = k?.passive;
    if (p?.aura && b.t % 1000 === 0) for (const a of b.units) if (a.alive && a.side === u.side && apart(a, u) <= 2) mendUnit(a, a.maxHp * p.aura, out, u);
    if (u.hot) {
      if (b.t >= u.hot.until) u.hot = undefined;
      else if (b.t >= u.hot.next) {
        u.hot.next += u.hot.every;
        mendUnit(u, u.hot.amount, out, b.units.find((x) => x.id === u.hot!.by) ?? u);
      }
    }
    if (p?.regen && b.t % 1000 === 0) mendUnit(u, u.maxHp * p.regen, out);
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
      for (const f of b.units) if (f.alive && f.side !== z.side && near3x3(f, z)) hurt(b, by, f, z.dmg, false, false, out, 'dot');
    }
  }
  b.zones = b.zones.filter((z) => z.until > b.t);
  // snares: the first foe standing on one springs it
  if (b.traps?.length) {
    for (const tr of b.traps) {
      const f = b.units.find((x) => x.alive && x.side !== tr.side && x.u === tr.u && x.v === tr.v);
      if (!f) continue;
      tr.until = 0;
      hurt(b, b.units.find((x) => x.id === tr.by)!, f, net(tr.dmg, f), true, false, out, 'skill');
      if (f.alive) {
        f.busyUntil = Math.max(f.busyUntil, b.t + ROOT_MS);
        f.stunUntil = b.t + ROOT_MS;
      }
    }
    b.traps = b.traps.filter((tr) => tr.until > b.t);
  }
}
