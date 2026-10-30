// What the hero kits (COMBAT-002) leave on the field and on fighters, and the rules that read it: parries, smoke, marks, forms, a standard,
// a song, a vow, a stored charge, timed terrain. The fight calls these from its generic places: `kitStrike` when a blow or skill is about to
// hurt (`onStrike`), `kitBlow` after a blow lands, `kitSpare` when a fighter would fall, `kitDeath` when one does, `kitTick` every tick,
// `kitQuick` and `kitDef` where a fighter's speed and reach are read. Each check is a field on the fighter (`Unit.kx`), so a fight without
// any of it costs a few property reads.
//
// Pure rules: no Pixi, no DOM. Randomness only from the battle's skill stream (`roll`).

import { tileAt, type At } from '../board';
import { atkOf, defOf, hurt, type Battle, type BattleEvent, type Unit } from '../battle';
import { foesOf, mendUnit, net, roll } from '../abilities';
import { addRes, heroKitOf, skill2Open } from '../heroKits';
import { UNITS, type UnitDef } from '../units';
import { AILMENT_SWITCH, ailmentsOf, dotOf, setDot } from '../ailments';
import { stormBolt } from './mages';

/** The kits' marks and stances on a fighter (hero or foe): each a time it lasts until, or a small state. */
export interface KitFx {
  /** Samurai: melee blows on him are parried and answered until then. */
  parry?: number;
  /** In the Kunoichi's smoke: misses half its blows until then. */
  smoke?: number;
  /** Kunoichi: her next blow crits. */
  critNext?: boolean;
  /** Pinned by the Archer: takes a quarter more from shots until then. */
  pinned?: number;
  /** Charged by the Lightning Mage until then. */
  charged?: number;
  /** Ninja Monk: blows on the same foe in a row (his Flow). */
  flow?: { to: number; n: number };
  /** Kitsune: wears a foe's shape until then (its kind, and how much her attack was multiplied). */
  guise?: { def: string; until: number; mult: number };
  /** Yamabushi: shots at his friends are blown back until then. */
  reflect?: number;
  /** Werewolf: his form, when he last changed, and until when the Full Moon gives him both. */
  wolf?: 'hunter' | 'brute';
  wolfAt?: number;
  moon?: number;
  /** Turned to stone (the Gorgon's Stone Garden) until then. */
  stone?: number;
  /** Paladin: takes half his friends' wounds until then. */
  vow?: number;
  /** Druid: a treant until then (and the health she had added). */
  tree?: { until: number; added: number };
  /** Barbarian: Blood Fury until then. */
  fury?: number;
  /** Warlock: draining a foe (Soul Siphon). */
  siphon?: { to: number; until: number; next: number };
  /** Lightning Mage: her Call Lightning cloud, until then; the next bolt, and the ultimate's strength when it was called (RPG-SPELLS batch 6). */
  storm?: { until: number; next: number; pow: number };
  /** Shambler: times he has grown from a meal; and a body that has been eaten (or raised) is gone. */
  grown?: number;
  spent?: boolean;
  /** Duo-Combos & Trait Resonance: */
  lifestealUntil?: number;
  bleedHits?: number;
  shadowShroudUntil?: number;
  tempReach?: number;
  splashShots?: number;
  bonusDodgeUntil?: number;
  /** Rifle Bot's fire: its skill meter stops filling until then (held at what it had). */
  suppressed?: number;
  frozen?: number;
  /** Marked by the Mercenary (who, until when) or condemned by the Tyrant. */
  bounty?: { by: number; until: number };
  condemned?: { by: number; until: number };
  /** Wolf Bard: his standing song, and until when it is doubled. */
  tune?: 'dirge' | 'anthem';
  loud?: number;
  /** Lancer: tiles ridden straight (his Momentum), and the way of the last step. */
  momentum?: number;
  lastWay?: number;
  /** Arc Blade: damage stored from blows taken. */
  stored?: number;
  /** Siege Bot: anchored until then. */
  siege?: number;
  /** Watched by the High Priestess's guardian angel until then. */
  angel?: number;
  /** Demon Swordsman: blows left under the Blood Price. */
  blood?: number;
  /** Reaper: each kill until then rises as a wraith (Harvest of Souls). */
  harvest?: number;
  /** Time Witch's Rewind: where a hero stood, and how it was, the last few seconds (a snapshot each half second). */
  hist?: { t: number; hp: number; u: number; v: number }[];
}

/** Timed terrain a kit made (a flood, a rampart, a statue): the tile, what it was, and when it goes back. */
export interface TerrainFx {
  i: number;
  until: number;
  kind: 'flood' | 'rampart' | 'statue';
  was: { ground?: string; wall?: number | boolean; rock?: boolean };
}

export const kx = (u: Unit): KitFx => (u.kx ??= {});
const on = (t: number | undefined, b: Battle) => t !== undefined && t > b.t;
const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);

/** The share of a blow a hero's kit numbers use (one place to read them). */
export const KIT = {
  SMOKE_MISS: 0.5,
  PARRY_MULT: 1.5,
  PINNED_MULT: 1.25,
  BOUNTY_MULT: 1.25,
  CONDEMN_MULT: 1.2,
  STANDARD_GUARD: 0.1,
  STANDARD_ATK: 0.1,
  STANDARD_REACH: 2,
  SONG_REACH: 3,
  SONG_SHARE: 0.08,
  VOW_REACH: 3,
  VOW_SHARE: 0.5,
  BRUTE_GUARD: 0.25,
  STORE_SHARE: 0.3,
  STORE_CAP: 4,
  BLOOD_MULT: 1.6,
  BLOOD_DRINK: 0.3,
  MOMENTUM_STEP: 0.1,
  MOMENTUM_MAX: 5,
  CRIT_NEXT: 1.6,
  FURY_QUICK: 1.3,
  FURY_LEECH: 0.12,
  HUNTER_QUICK: 1.25,
  SIEGE_QUICK: 1.25,
  SIEGE_RANGE: 2,
  TREE_DEF: 6,
  ANGEL_HEAL: 0.3,
  HUNTER_BLEED: 0.12,
  BRUTE_SPLASH: 0.4,
} as const;

/** Whether a fighter stands within `reach` of a living fighter of kind `def` on `side` whose `test` holds. */
function near(b: Battle, at: Unit, side: Unit['side'], reach: number, test: (x: Unit) => boolean): Unit | undefined {
  for (const x of b.units) if (x.alive && x.side === side && apart(x, at) <= reach && test(x)) return x;
  return undefined;
}

/** Whether a Paladin's vow is passing a wound on just now. */
let redirecting = false;

/** What the kits do to a blow or skill about to hurt: it may be turned aside (null) or changed. Called before guards and blocks. */
export function kitStrike(b: Battle, by: Unit, to: Unit, dmg: number, src: 'blow' | 'skill' | 'dot', splash: boolean, out: BattleEvent[]): number | null {
  if (!b.kits) return dmg;
  const blow = src === 'blow';
  const bx = by.kx;
  const tx = to.kx;
  if (blow && bx && on(bx.smoke, b) && roll(b) < KIT.SMOKE_MISS) {
    out.push({ kind: 'dodge', to: to.id });
    return null;
  }
  if (blow && !splash && tx && on(tx.parry, b) && by.side !== to.side && apart(by, to) === 1 && by.alive) {
    out.push({ kind: 'dodge', to: to.id });
    hurt(b, to, by, net(atkOf(to) * KIT.PARRY_MULT, by), true, false, out, 'skill');
    return null;
  }
  if (blow && !splash && UNITS[by.def].shot && by.side !== to.side && apart(by, to) > 1) {
    const wind = near(b, to, to.side, 2, (x) => on(x.kx?.reflect, b));
    if (wind && by.alive) {
      out.push({ kind: 'dodge', to: to.id });
      out.push({ kind: 'arc', from: to.id, to: by.id });
      hurt(b, wind, by, Math.max(1, Math.round(dmg / 2)), false, false, out, 'skill');
      return null;
    }
  }
  if (src === 'dot') return dmg;
  if (bx) {
    if (blow && bx.critNext) {
      bx.critNext = false;
      dmg *= KIT.CRIT_NEXT;
    }
    if (blow && bx.blood && bx.blood > 0) dmg *= KIT.BLOOD_MULT;
    if (blow && bx.momentum) {
      dmg *= 1 + KIT.MOMENTUM_STEP * bx.momentum;
      bx.momentum = 0;
    }
  }
  if (tx) {
    if (blow && on(tx.pinned, b) && UNITS[by.def].shot) dmg *= KIT.PINNED_MULT;
    if (tx.bounty && on(tx.bounty.until, b) && by.side !== to.side) dmg *= KIT.BOUNTY_MULT;
    if (tx.condemned && on(tx.condemned.until, b) && by.side !== to.side) dmg *= KIT.CONDEMN_MULT;
    if (tx.wolf === 'brute' || on(tx.moon, b)) dmg *= 1 - KIT.BRUTE_GUARD;
  }
  // (a standard on the field: the heroes within two of it take less and hit harder)
  if (b.kits.standards) {
    if (to.side === 'hero' && near(b, to, 'hero', KIT.STANDARD_REACH, (x) => x.def === 'standard')) dmg *= 1 - KIT.STANDARD_GUARD;
    if (by.side === 'hero' && near(b, by, 'hero', KIT.STANDARD_REACH, (x) => x.def === 'standard')) dmg *= 1 + KIT.STANDARD_ATK;
  }
  // (the Wolf Bard's standing song: Anthem lifts his friends' blows, Dirge weakens his foes')
  if (b.kits.songs) {
    const share = (bard: Unit) => KIT.SONG_SHARE * (on(bard.kx?.loud, b) ? 2 : 1);
    const anthem = by.side === 'hero' ? near(b, by, 'hero', KIT.SONG_REACH, (x) => x.kx?.tune === 'anthem') : undefined;
    if (anthem) dmg *= 1 + share(anthem);
    const dirge = by.side !== 'hero' ? near(b, by, 'hero', KIT.SONG_REACH, (x) => x.kx?.tune === 'dirge') : undefined;
    if (dirge) dmg *= 1 - share(dirge);
  }
  // (the Paladin's vow: half of what a friend near him would take is his instead)
  // (a wound already taken over for a friend is not passed on again: two vowed Paladins do not hand one blow back and forth)
  if (b.kits.vows && to.side === 'hero' && !redirecting) {
    const pal = near(b, to, 'hero', KIT.VOW_REACH, (x) => x !== to && on(x.kx?.vow, b));
    if (pal) {
      const half = dmg * KIT.VOW_SHARE;
      redirecting = true;
      try {
        hurt(b, by, pal, Math.max(1, Math.round(half)), false, true, out, 'skill');
      } finally {
        redirecting = false;
      }
      dmg -= half;
    }
  }
  // (the Arc Blade stores a share of what hits him, from skill 2's level)
  if (to.def === 'arcBlade' && heroKitOf(to) && skill2Open(to)) {
    const t = kx(to);
    t.stored = Math.min(atkOf(to) * KIT.STORE_CAP, (t.stored ?? 0) + dmg * KIT.STORE_SHARE);
  }
  return dmg;
}

/** After a blow has landed: the kits' riders on it (a hunter's bleed, a brute's splash, the Monk's flow, the Blood Price's drink). */
export function kitBlow(b: Battle, by: Unit, to: Unit, crit: boolean, dmg: number, out: BattleEvent[]): void {
  const bx = by.def === 'ninjaMonk' && b.kits ? kx(by) : by.kx;
  if (!bx || !b.kits) return;
  if (bx.blood && bx.blood > 0) {
    bx.blood--;
    if (by.alive) mendUnit(by, dmg * KIT.BLOOD_DRINK, out);
  }
  if (on(bx.fury, b) && by.alive) mendUnit(by, dmg * KIT.FURY_LEECH, out);
  if (bx.flow !== undefined || by.def === 'ninjaMonk') {
    const f = bx.flow;
    bx.flow = f && f.to === to.id ? { to: to.id, n: Math.min(5, f.n + 1) } : { to: to.id, n: 1 };
  }
  const moon = on(bx.moon, b);
  if ((bx.wolf === 'hunter' || moon) && to.alive) setDot(b, to, { kind: 'bleed', dmg: Math.max(1, Math.round(atkOf(by) * KIT.HUNTER_BLEED)), every: 500, ms: 3000, by: by.id, next: b.t + 500, until: b.t + 3000 });
  if (bx.wolf === 'brute' || moon) for (const f of foesOf(b, by)) if (f !== to && apart(f, to) === 1) hurt(b, by, f, Math.max(1, Math.round(dmg * KIT.BRUTE_SPLASH)), false, true, out, 'skill');
  // (a crit gives the Buccaneer back some stamina, from skill 2's level)
  if (crit && by.def === 'buccaneer' && skill2Open(by)) addRes(by, 10);
}

/** Whether a fighter about to fall is held up: Blood Fury leaves it at 1 health; a guardian angel at 1, then heals it. */
export function kitSpare(b: Battle, to: Unit, out: BattleEvent[]): boolean {
  const x = to.kx;
  if (!x) return false;
  if (on(x.fury, b)) {
    to.hp = 1;
    return true;
  }
  if (on(x.angel, b)) {
    x.angel = undefined;
    to.hp = 1;
    mendUnit(to, to.maxHp * KIT.ANGEL_HEAL, out);
    return true;
  }
  return false;
}

/** A fighter fell: a bounty or a condemnation is paid, the Shambler's rot spreads to its neighbours, the Reaper's harvest raises it. */
export function kitDeath(b: Battle, to: Unit, by: Unit, out: BattleEvent[]): void {
  if (!b.kits) return;
  const x = to.kx;
  if (x?.bounty && on(x.bounty.until, b)) {
    const merc = b.units.find((u) => u.id === x.bounty!.by && u.alive);
    if (merc) {
      mendUnit(merc, merc.maxHp * 0.2, out);
      addRes(merc, 1000);
    }
  }
  if (x?.condemned && on(x.condemned.until, b)) for (const a of b.units) if (a.alive && a.side === 'hero') addRes(a, 10);
  // (rot spreads when its host dies: the Shambler's curse jumps to the foes beside it, from skill 2's level)
  // (and, with the ailments on, its poison: the rot became poison, STATUS-FX)
  const d = ailmentsOf(to).find((a) => a.kind === 'curse' || (AILMENT_SWITCH.on && a.kind === 'poison' && a.by !== to.id));
  if (d && d.dmg) {
    const sham = b.units.find((u) => u.id === d.by && u.alive && u.def === 'shambler' && skill2Open(u));
    if (sham)
      for (const n of b.units)
        if (n.alive && n.side === to.side && apart(n, to) === 1 && !dotOf(n)) {
          setDot(b, n, { kind: d.kind as 'curse' | 'poison', dmg: d.dmg, every: d.every!, ms: d.ms!, by: d.by, next: b.t + d.every!, until: b.t + d.ms! });
          out.push({ kind: 'arc', from: to.id, to: n.id });
        }
  }
  // (a stone foe that dies stays as a statue on its tile a while)
  if (x?.stone !== undefined && x.stone >= b.t) layTerrain(b, to, 'statue', 6000, out);
  if (by.side === 'hero' && to.side !== 'hero' && on(by.kx?.harvest, b)) b.kits.raise = [...(b.kits.raise ?? []), { by: by.id, foe: to.id }];
}

/** How much quicker a fighter's blows (and steps) are from its kit's stance. */
export function kitQuick(b: Battle, u: Unit, steps = false): number {
  const x = u.kx;
  if (!x) return 1;
  let k = 1;
  if (!steps && on(x.fury, b)) k *= KIT.FURY_QUICK;
  if (x.wolf === 'hunter' || on(x.moon, b)) k *= KIT.HUNTER_QUICK;
  if (!steps && on(x.siege, b)) k *= KIT.SIEGE_QUICK;
  return k;
}

/** The kind's stats as a kit changes them: the Kitsune's guise borrows a foe's reach and shot, the Siege Bot's anchor lengthens its reach and splashes. */
export function kitDef(b: Battle, u: Unit, def: UnitDef): UnitDef {
  const x = u.kx;
  if (!x) return def;
  if (x.guise && on(x.guise.until, b)) {
    const g = UNITS[x.guise.def];
    if (g) return { ...def, range: g.range, shot: g.shot, heightReach: g.heightReach, splash: g.splash, jump: Math.max(def.jump, g.jump) };
  }
  if (on(x.siege, b)) return { ...def, range: def.range + KIT.SIEGE_RANGE, splash: true };
  return def;
}

/** A fighter's defence as a kit adds to it (the Druid's treeform). */
export const kitDefence = (u: Unit): number => (u.kx?.tree ? KIT.TREE_DEF : 0);

/** Whether the kits hold a free fighter where it is (a standard stands; an anchored Siege Bot does not walk): it waits instead. */
export function kitStill(b: Battle, u: Unit): boolean {
  if (UNITS[u.def].still) return true;
  return on(u.kx?.siege, b);
}

/** Change the look a fighter is drawn with (a form, a guise), with the event the page redraws it by. */
export function setLook(u: Unit, sheet: string | undefined, out: BattleEvent[]): void {
  if (u.look === sheet) return;
  if (sheet === undefined) delete u.look;
  else u.look = sheet;
  out.push({ kind: 'look', by: u.id, sheet: sheet ?? null });
}

/** Lay timed terrain on a tile (it goes back by itself), with the event the page draws it by. */
export function layTerrain(b: Battle, at: At, kind: TerrainFx['kind'], ms: number, out: BattleEvent[]): boolean {
  const t = tileAt(b.board, at.u, at.v);
  if (!t) return false;
  const i = at.v * b.board.w + at.u;
  const tf = (b.terrain ??= []);
  const old = tf.find((x) => x.i === i);
  if (old) {
    old.until = Math.max(old.until, b.t + ms);
    return true;
  }
  const was = { ground: t.ground, wall: t.wall, rock: t.rock };
  if (kind === 'flood') {
    if (t.ground === 'deep' || t.ground === 'lava') return false;
    t.ground = 'water';
  } else if (kind === 'rampart') t.wall = true;
  else t.rock = true;
  tf.push({ i, until: b.t + ms, kind, was: was as TerrainFx['was'] });
  out.push({ kind: 'terrain', u: at.u, v: at.v, what: kind, ms });
  return true;
}

/** Every tick: the kits' timed things run out (forms, guises, a treeform, an anchor, terrain, summons that fade), a siphon drains, a Rewind's history is kept, a harvest raises its dead. */
export function kitTick(b: Battle, out: BattleEvent[]): void {
  const k = b.kits;
  if (!k) return;
  for (const u of b.units) {
    if (u.expires !== undefined && u.alive && b.t >= u.expires) {
      u.alive = false;
      u.diedAt = b.t;
      u.step = undefined;
      u.swing = undefined;
      out.push({ kind: 'fade', to: u.id });
      continue;
    }
    const x = u.kx;
    if (!x || !u.alive) continue;
    if (x.suppressed !== undefined) {
      if (x.suppressed > b.t) u.charge = Math.min(u.charge, x.frozen ?? u.charge);
      else x.suppressed = x.frozen = undefined;
    }
    if (x.guise && b.t >= x.guise.until) {
      u.power = (u.power ?? 1) / x.guise.mult;
      x.guise = undefined;
      setLook(u, undefined, out);
    }
    if (x.tree && b.t >= x.tree.until) {
      u.maxHp -= x.tree.added;
      u.hp = Math.max(1, Math.min(u.hp, u.maxHp));
      x.tree = undefined;
      mendUnit(u, u.maxHp * 0.15, out);
      setLook(u, undefined, out);
    }
    if (x.moon !== undefined && b.t >= x.moon) {
      x.moon = undefined;
      setLook(u, x.wolf === 'brute' ? 'werewolf_black' : undefined, out);
    }
    if (x.siphon) {
      const s = x.siphon;
      const f = b.units.find((y) => y.id === s.to);
      if (!f || !f.alive || b.t > s.until) x.siphon = undefined;
      else if (b.t >= s.next) {
        s.next += 500;
        const before = u.dealt ?? 0;
        hurt(b, u, f, net(atkOf(u) * 0.75, f), false, false, out, 'skill');
        out.push({ kind: 'arc', from: f.id, to: u.id });
        const drained = (u.dealt ?? 0) - before;
        const friend = b.units.filter((a) => a.alive && a.side === u.side && a.hp < a.maxHp).sort((p, q) => p.hp / p.maxHp - q.hp / q.maxHp || p.id - q.id)[0];
        if (friend && drained > 0) mendUnit(friend, drained, out, u);
      }
    }
    if (x.storm) {
      if (b.t >= x.storm.until) x.storm = undefined;
      else if (b.t >= x.storm.next) stormBolt(b, u, out);
    }
    // (a Siege Bot with a foe beside it unanchors early)
    if (on(x.siege, b) && b.units.some((f) => f.alive && f.side !== u.side && apart(f, u) === 1)) x.siege = b.t;
  }
  // (the Time Witch's Rewind needs where her friends were: a snapshot every half second while one with Rewind is on the field)
  if (k.rewind && b.t % 500 === 0) {
    for (const u of b.units) {
      if (!u.alive || u.side !== 'hero') continue;
      const h = (kx(u).hist ??= []);
      h.push({ t: b.t, hp: u.hp, u: u.u, v: u.v });
      if (h.length > 10) h.shift();
    }
  }
  if (b.terrain?.length) {
    const left: TerrainFx[] = [];
    for (const tf of b.terrain) {
      if (tf.until > b.t) {
        left.push(tf);
        continue;
      }
      const t = b.board.tiles[tf.i];
      if (tf.kind === 'flood') t.ground = tf.was.ground as typeof t.ground;
      else if (tf.kind === 'rampart') t.wall = tf.was.wall as typeof t.wall;
      else t.rock = tf.was.rock;
      if (t.ground === undefined) delete t.ground;
      if (!t.wall) delete t.wall;
      if (!t.rock) delete t.rock;
      out.push({ kind: 'terrain', u: tf.i % b.board.w, v: Math.floor(tf.i / b.board.w), what: tf.kind, ms: 0 });
    }
    b.terrain = left;
  }
  if (k.raise?.length) {
    const list = k.raise;
    k.raise = undefined;
    for (const r of list) {
      const me = b.units.find((u) => u.id === r.by);
      const foe = b.units.find((u) => u.id === r.foe);
      if (me && foe && me.alive) raiseWraith(b, me, foe, 5000, out);
    }
  }
}

/** Raise a fallen foe as a wraith on the caster's side for `ms`, at half its health and attack (a boss or a named elite gives only a wisp of a quarter);
 *  on its own tile if free, else the nearest free one. False if the body is gone or no tile is free. */
export function raiseWraith(b: Battle, me: Unit, foe: Unit, ms: number, out: BattleEvent[]): boolean {
  if (foe.alive || foe.kx?.spent) return false;
  const big = (foe.size ?? 1) > 1 || !!foe.phase || UNITS[foe.def].hp >= 900;
  const share = big ? 0.25 : 0.5;
  const spot = [foe as At, ...[...Array(9)].map((_, i) => ({ u: foe.u + (i % 3) - 1, v: foe.v + Math.floor(i / 3) - 1 }))].find((c) => {
    const t = tileAt(b.board, c.u, c.v);
    return t && !t.rock && !t.wall && !t.barrel && t.ground !== 'deep' && !b.units.some((y) => y.alive && y.u === c.u && y.v === c.v);
  });
  if (!spot) return false;
  kx(foe).spent = true;
  const w = addWraith(b, me, foe, spot, share);
  w.expires = b.t + ms;
  out.push({ kind: 'look', by: w.id, sheet: w.look ?? null });
  out.push({ kind: 'heal', to: w.id, amount: 0, by: me.id });
  return true;
}

function addWraith(b: Battle, me: Unit, foe: Unit, at: At, share: number): Unit {
  const def = UNITS.wraith;
  const hp = Math.max(1, Math.round(foe.maxHp * share));
  const w: Unit = { id: b.nextId++, def: 'wraith', side: 'hero', u: at.u, v: at.v, hp, maxHp: hp, facing: 3, alive: true, busyUntil: b.t + 400, charge: 0, owner: me.id };
  w.power = Math.max(0.1, (atkOf(foe) * share) / def.atk);
  w.look = UNITS[foe.def].sheet;
  b.units.push(w);
  return w;
}

/** Whether a fighter is a hero the player placed (not a summon, a decoy, a wraith or the Last Stand's king). */
export const realHero = (u: Unit): boolean => u.side === 'hero' && u.owner === undefined && !defOf(u).summon;
