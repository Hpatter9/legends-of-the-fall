// The king's spell cards, King God Castle style: the one thing the player does during a fight. Mana fills slowly over
// the fight; a spell costs some and then has to cool down. Each spell also has a power rating, and the three the
// player equips for a run must fit the power budget (`spellBudget` in castle.ts), so three strong spells can't be
// taken together. Most work on a 3x3 of tiles; Rally and Earthquake need no tile. `castSpell` is the only way in; it
// checks the mana, the cooldown and the tile, and leaves its events for the next tick to hand to the renderer.
//
// Pure rules: no Pixi, no DOM, no randomness (a cast does the same every time).

import { tileAt } from './board';
import { apart, defOf, hurt, TICK_MS, type Battle, type BattleEvent, type Unit } from './battle';
import { spellBudget, type Castle } from './castle';

export type SpellId = 'heal' | 'meteor' | 'haste' | 'shield' | 'chain' | 'frost' | 'rally' | 'quake' | 'smite' | 'resurrect' | 'poison';

/** The mana bar's top, and what it gains each second. */
export const MANA_MAX = 10;
/** (half of what it was: a spell is a choice, not a habit). */
export const MANA_PER_SEC = 0.5;
/** The mana a fight starts with. */
export const MANA_START = 2;

/** A hasted hero attacks and walks this much faster, for `HASTE_MS`. */
export const HASTE_MULT = 1.5;
export const HASTE_MS = 5000;
/** How long a meteor takes to fall, and the raw power it lands with (the foe's defence comes off). */
export const METEOR_MS = 900;
export const METEOR_POWER = 110;
/** The share of its health a heal gives back. */
export const HEAL_SHARE = 0.4;
/** A shield soaks this share of a hero's health, for `SHIELD_MS`. */
export const SHIELD_SHARE = 0.4;
export const SHIELD_MS = 6000;
/** Chain Lightning: raw power on the first foe, each jump this much of the one before, and how many jumps and how far. */
export const CHAIN_POWER = 70;
export const CHAIN_FALLOFF = 0.8;
export const CHAIN_JUMPS = 3;
export const CHAIN_REACH = 3;
/** Frost Nova: foes in the area stand frozen for `FREEZE_MS`, then move and strike at half speed until `SLOW_MS` from the cast. */
export const FREEZE_MS = 2000;
export const SLOW_MS = 6000;
export const SLOW_MULT = 0.5;
/** Rally: every hero's attack goes up by this much for `RALLY_MS`. */
export const RALLY_MULT = 1.25;
export const RALLY_MS = 8000;
/** Earthquake: foes standing this low or lower take this raw power. */
export const QUAKE_LOW = 1;
export const QUAKE_POWER = 60;
/** Smite: raw power on the sturdiest foe in the area. */
export const SMITE_POWER = 160;
/** Resurrect: the share of its health a fallen hero rises with. */
export const RESURRECT_SHARE = 0.5;
/** Poison Cloud: how long it lingers, how often it bites and how hard (defence does not count). */
export const POISON_MS = 6000;
export const POISON_EVERY = 1000;
export const POISON_DMG = 14;

export interface Spell {
  id: SpellId;
  name: string;
  text: string;
  cost: number;
  /** Before it can be cast again (ms). */
  cooldownMs: number;
  /** How strong it counts against the loadout's power budget. */
  power: number;
  /** The crowns it costs to unlock (0 for the starting three). */
  price: number;
  /** Where it goes: the 3x3 around a tapped tile, or everywhere at once. */
  target: 'tile' | 'all';
}

const sp = (id: SpellId, name: string, text: string, cost: number, cooldownMs: number, power: number, price: number, target: 'tile' | 'all' = 'tile'): Spell => ({ id, name, text, cost, cooldownMs, power, price, target });

export const SPELLS: Record<SpellId, Spell> = {
  heal: sp('heal', 'Heal', 'Heroes in a 3x3 regain 40% of their health', 3, 6000, 2, 0),
  meteor: sp('meteor', 'Meteor', 'A meteor blasts the foes in a 3x3', 5, 10000, 4, 0),
  haste: sp('haste', 'Haste', 'Heroes in a 3x3 attack and move 50% faster for 5s', 3, 8000, 2, 0),
  shield: sp('shield', 'Shield', 'Heroes in a 3x3 gain a shield worth 40% of their health for 6s', 3, 8000, 2, 60),
  smite: sp('smite', 'Smite', 'A bolt of light strikes the sturdiest foe in a 3x3 for great damage', 3, 8000, 3, 80),
  chain: sp('chain', 'Chain Lightning', 'Lightning hits a foe in a 3x3, then leaps to three more, weaker each time', 4, 9000, 3, 100),
  poison: sp('poison', 'Poison Cloud', 'A cloud on a 3x3 poisons foes inside it for 6s', 4, 12000, 3, 120),
  frost: sp('frost', 'Frost Nova', 'Foes in a 3x3 freeze for 2s, then move and strike at half speed', 4, 12000, 3, 120),
  rally: sp('rally', 'Rally', 'Every hero attacks 25% harder for 8s', 4, 14000, 3, 150, 'all'),
  quake: sp('quake', 'Earthquake', 'The ground shakes: every foe on low ground takes damage', 5, 14000, 4, 180, 'all'),
  resurrect: sp('resurrect', 'Resurrect', 'A fallen hero in a 3x3 rises with half its health', 5, 20000, 5, 250),
};
export const SPELL_IDS: SpellId[] = ['heal', 'meteor', 'haste', 'shield', 'smite', 'chain', 'poison', 'frost', 'rally', 'quake', 'resurrect'];
/** The three every save starts with (and has equipped). */
export const STARTER_SPELLS: readonly SpellId[] = ['heal', 'meteor', 'haste'];
/** How many spells a run takes. */
export const LOADOUT_SIZE = 3;

/** A meteor falling, from when and onto which tile. */
export interface Fall {
  at: number;
  u: number;
  v: number;
}

/** A poison cloud over the 3x3 around a tile. */
export interface Cloud {
  u: number;
  v: number;
  until: number;
  next: number;
}

/** The spell state a battle carries. */
export interface SpellState {
  mana: number;
  /** When each spell may next be cast. */
  ready: Record<SpellId, number>;
  falls: Fall[];
  /** Poison clouds lingering, and when each next bites. */
  clouds: Cloud[];
  /** How fast the mana fills (1 is usual; the castle's Mage Tower raises it). */
  rate: number;
  /** Events recorded between ticks, handed out by the next one. */
  events: BattleEvent[];
}

export const freshSpells = (rate = 1): SpellState => ({ mana: MANA_START, ready: Object.fromEntries(SPELL_IDS.map((id) => [id, 0])) as Record<SpellId, number>, falls: [], clouds: [], rate, events: [] });

/** The king stands behind the meteor's blows: not on the board, so it has no side effects on the fighters. */
const KING: Unit = { id: 0, def: 'king', side: 'hero', u: 0, v: 0, hp: 1, maxHp: 1, facing: 0, alive: true, busyUntil: 0, charge: 0 };

const inArea = (x: { u: number; v: number }, u: number, v: number) => Math.abs(x.u - u) <= 1 && Math.abs(x.v - v) <= 1;

/** Whether a hero is hasted now. */
export const isHasted = (b: Battle, x: Unit) => x.hasteUntil !== undefined && x.hasteUntil > b.t;
/** Whether a fighter is slowed (Frost Nova) now. */
export const isSlowed = (b: Battle, x: Unit) => x.slowUntil !== undefined && x.slowUntil > b.t;
/** How much faster a fighter acts now (1 when neither hasted nor slowed): it moves and swings at this speed. */
export const speedOf = (b: Battle, x: Unit) => (isHasted(b, x) ? HASTE_MULT : 1) * (isSlowed(b, x) ? SLOW_MULT : 1) * (x.side === 'hero' ? b.traits?.speed ?? 1 : b.foeSpeed ?? 1);

/** Mana gain for one tick. */
export function fillMana(b: Battle): void {
  b.spells.mana = Math.min(MANA_MAX, Math.round((b.spells.mana + (TICK_MS * MANA_PER_SEC * b.spells.rate) / 1000) * 1000) / 1000);
}

/** Milliseconds until a spell may be cast again (0 when ready). */
export const cooldownLeft = (b: Battle, id: SpellId) => Math.max(0, b.spells.ready[id] - b.t);

/** Whether a spell could be cast now (mana and cooldown; the tile is checked by `castSpell`). */
export const canAfford = (b: Battle, id: SpellId) => b.phase === 'fight' && b.spells.mana >= SPELLS[id].cost && cooldownLeft(b, id) === 0;

/** The foes in the 3x3 around a tile, in id order. */
const foesIn = (b: Battle, u: number, v: number) => b.units.filter((x) => x.alive && x.side === 'foe' && inArea(x, u, v));
/** The fallen hero a Resurrect on this tile would lift: the nearest in the 3x3 whose tile is free. */
const fallenIn = (b: Battle, u: number, v: number) =>
  b.units
    .filter((x) => !x.alive && x.side === 'hero' && !defOf(x).summon && inArea(x, u, v) && !b.units.some((o) => o.alive && o.u === x.u && o.v === x.v))
    .sort((x, y) => apart(x, { u, v }) - apart(y, { u, v }) || x.id - y.id)[0];

/** A raw blow from the king: the foe's defence comes off. */
const strike = (b: Battle, x: Unit, power: number, heavy: boolean, out: BattleEvent[]) => hurt(b, KING, x, Math.max(1, Math.round(power) - defOf(x).def), heavy, false, out, 'skill');

/** Cast a spell on the 3x3 around tile (u, v) (the tile is ignored by spells that go everywhere). False (and nothing changed) if the fight isn't on, the tile isn't on the board, the mana or cooldown isn't there, or Resurrect has nobody to lift. */
export function castSpell(b: Battle, id: SpellId, u: number, v: number): boolean {
  const spell = SPELLS[id];
  if (!spell || (spell.target === 'tile' && !tileAt(b.board, u, v)) || !canAfford(b, id)) return false;
  const fallen = id === 'resurrect' ? fallenIn(b, u, v) : undefined;
  if (id === 'resurrect' && !fallen) return false;
  const s = b.spells;
  s.mana -= spell.cost;
  s.ready[id] = b.t + spell.cooldownMs;
  s.events.push({ kind: 'spell', id, u, v });
  const ev = s.events;
  const fx = (to: Unit) => ev.push({ kind: 'spellfx', id, to: to.id });
  switch (id) {
    case 'meteor':
      s.falls.push({ at: b.t + METEOR_MS, u, v });
      ev.push({ kind: 'area', by: 0, id: 'meteor', u, v, ms: METEOR_MS });
      break;
    case 'heal':
    case 'haste':
    case 'shield':
      for (const x of b.units) {
        if (!x.alive || x.side !== 'hero' || !inArea(x, u, v)) continue;
        if (id === 'heal') {
          const amount = Math.min(x.maxHp - x.hp, Math.round(x.maxHp * HEAL_SHARE));
          x.hp += amount;
          ev.push({ kind: 'heal', to: x.id, amount });
        } else if (id === 'haste') {
          x.hasteUntil = b.t + HASTE_MS;
          ev.push({ kind: 'haste', to: x.id, ms: HASTE_MS });
        } else x.shield = { hp: Math.round(x.maxHp * SHIELD_SHARE), until: b.t + SHIELD_MS };
        fx(x);
      }
      break;
    case 'rally':
      for (const x of b.units) {
        if (!x.alive || x.side !== 'hero') continue;
        // (a second rally only lengthens the first: the attack is raised once)
        if (x.rallyUntil === undefined) x.power = (x.power ?? 1) * RALLY_MULT;
        x.rallyUntil = b.t + RALLY_MS;
        fx(x);
      }
      break;
    case 'smite': {
      const target = foesIn(b, u, v).sort((x, y) => y.hp - x.hp || x.id - y.id)[0];
      if (target) {
        fx(target);
        strike(b, target, SMITE_POWER, true, ev);
      }
      break;
    }
    case 'chain': {
      let at = foesIn(b, u, v).sort((x, y) => apart(x, { u, v }) - apart(y, { u, v }) || x.id - y.id)[0];
      const hit = new Set<number>();
      let power = CHAIN_POWER;
      for (let n = 0; at && n <= CHAIN_JUMPS; n++) {
        hit.add(at.id);
        fx(at);
        strike(b, at, power, false, ev);
        power *= CHAIN_FALLOFF;
        const from: Unit = at;
        if (n === CHAIN_JUMPS) break;
        at = b.units.filter((x) => x.alive && x.side === 'foe' && !hit.has(x.id) && apart(x, from) <= CHAIN_REACH).sort((x, y) => apart(x, from) - apart(y, from) || x.id - y.id)[0];
        if (at) ev.push({ kind: 'arc', from: from.id, to: at.id });
      }
      break;
    }
    case 'frost':
      for (const x of foesIn(b, u, v)) {
        x.busyUntil = Math.max(x.busyUntil, b.t + FREEZE_MS);
        x.stunUntil = b.t + FREEZE_MS;
        x.step = undefined;
        x.slowUntil = b.t + SLOW_MS;
        fx(x);
      }
      break;
    case 'quake':
      for (const x of b.units.filter((y) => y.alive && y.side === 'foe' && tileAt(b.board, y.u, y.v)!.h <= QUAKE_LOW)) {
        fx(x);
        strike(b, x, QUAKE_POWER, false, ev);
      }
      break;
    case 'poison':
      s.clouds.push({ u, v, until: b.t + POISON_MS, next: b.t + POISON_EVERY });
      break;
    case 'resurrect': {
      const x = fallen!;
      x.alive = true;
      x.hp = Math.max(1, Math.round(x.maxHp * RESURRECT_SHARE));
      x.diedAt = undefined;
      x.busyUntil = b.t + 500;
      x.charge = 0;
      x.charge2 = undefined;
      x.dot = undefined;
      ev.push({ kind: 'heal', to: x.id, amount: x.hp });
      fx(x);
      break;
    }
  }
  return true;
}

/** Every tick: meteors that have fallen strike the foes in their 3x3, poison clouds bite, and rallies wear off. */
export function settleFalls(b: Battle, out: BattleEvent[]): void {
  const s = b.spells;
  s.falls.sort((x, y) => x.at - y.at);
  while (s.falls.length && s.falls[0].at <= b.t) {
    const f = s.falls.shift()!;
    for (const x of b.units) {
      if (!x.alive || x.side !== 'foe' || !inArea(x, f.u, f.v)) continue;
      hurt(b, KING, x, Math.max(1, METEOR_POWER - defOf(x).def), true, false, out, 'skill');
    }
  }
  for (const c of s.clouds) {
    while (c.next <= b.t && c.next <= c.until) {
      c.next += POISON_EVERY;
      for (const x of foesIn(b, c.u, c.v)) hurt(b, KING, x, POISON_DMG, false, false, out, 'dot');
    }
  }
  s.clouds = s.clouds.filter((c) => c.until > b.t);
  for (const x of b.units)
    if (x.rallyUntil !== undefined && x.rallyUntil <= b.t) {
      x.power = (x.power ?? 1) / RALLY_MULT;
      x.rallyUntil = undefined;
    }
}

/* -------------------------------------------------------------- the loadout */

/** The spells a player owns and the (up to three) equipped for runs. Kept in the Meta. */
export interface Loadout {
  owned: SpellId[];
  equipped: SpellId[];
}

export const newLoadout = (): Loadout => ({ owned: [...STARTER_SPELLS], equipped: [...STARTER_SPELLS] });

/** The total power of some spells. */
export const powerOf = (ids: readonly SpellId[]) => ids.reduce((n, id) => n + SPELLS[id].power, 0);

/** The slice of the Meta the loadout rules read and change. */
export interface SpellMeta {
  crowns: number;
  castle: Castle;
  spellbook: Loadout;
}

/** The power the equipped spells may add up to. */
export const budgetOf = (m: SpellMeta) => spellBudget(m.castle);

/** Why a spell can't be equipped now, or null when it can. */
export function equipBlock(m: SpellMeta, id: SpellId): string | null {
  const l = m.spellbook;
  if (!SPELLS[id]) return 'No such spell';
  if (!l.owned.includes(id)) return 'Not unlocked yet';
  if (l.equipped.includes(id)) return 'Already equipped';
  if (l.equipped.length >= LOADOUT_SIZE) return 'All three slots are full: unequip one first';
  if (powerOf(l.equipped) + SPELLS[id].power > budgetOf(m)) return 'Over the power budget';
  return null;
}

/** Equip a spell. False (and nothing changed) when `equipBlock` says no. */
export function equipSpell(m: SpellMeta, id: SpellId): boolean {
  if (equipBlock(m, id)) return false;
  m.spellbook.equipped.push(id);
  return true;
}

/** Take a spell out of the loadout. False when it wasn't in it. */
export function unequipSpell(m: SpellMeta, id: SpellId): boolean {
  const i = m.spellbook.equipped.indexOf(id);
  if (i < 0) return false;
  m.spellbook.equipped.splice(i, 1);
  return true;
}

/** Pay the crowns to unlock a spell. False (and nothing changed) if already owned, too poor, or not a spell. */
export function unlockSpell(m: SpellMeta, id: SpellId): boolean {
  const spell = SPELLS[id];
  if (!spell || m.spellbook.owned.includes(id) || m.crowns < spell.price) return false;
  m.crowns -= spell.price;
  m.spellbook.owned.push(id);
  return true;
}

/** A loadout read from a saved value: the starting three are always owned (and equipped when nothing was saved), and the equipped ones must be owned, three at most and within the budget (the later ones drop first). */
export function readLoadout(raw: unknown, budget: number): Loadout {
  const l = newLoadout();
  if (!raw || typeof raw !== 'object') return l;
  const list = (x: unknown): SpellId[] => (Array.isArray(x) ? [...new Set(x.filter((id): id is SpellId => typeof id === 'string' && id in SPELLS))] : []);
  const r = raw as Record<string, unknown>;
  l.owned = [...new Set([...STARTER_SPELLS, ...list(r.owned)])];
  const wanted = Array.isArray(r.equipped) ? list(r.equipped).filter((id) => l.owned.includes(id)) : [...STARTER_SPELLS];
  l.equipped = [];
  for (const id of wanted) if (l.equipped.length < LOADOUT_SIZE && powerOf(l.equipped) + SPELLS[id].power <= budget) l.equipped.push(id);
  return l;
}
