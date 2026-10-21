// The king's spell cards, King God Castle style: the one thing the player does during a fight. Mana fills over the
// fight; a spell costs some and then has to cool down. Heal and Haste work on the heroes in a 3x3 of tiles, Meteor
// falls on the foes in one a moment after the cast. `castSpell` is the only way in; it checks the mana, the cooldown
// and the tile, and leaves its events for the next tick to hand to the renderer.
//
// Pure rules: no Pixi, no DOM, no randomness (a cast does the same every time).

import { tileAt } from './board';
import { defOf, hurt, TICK_MS, type Battle, type BattleEvent, type Unit } from './battle';

export type SpellId = 'heal' | 'meteor' | 'haste';

/** The mana bar's top, and what it gains each second. */
export const MANA_MAX = 10;
export const MANA_PER_SEC = 1;
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

export interface Spell {
  id: SpellId;
  name: string;
  text: string;
  cost: number;
  /** Before it can be cast again (ms). */
  cooldownMs: number;
}

export const SPELLS: Record<SpellId, Spell> = {
  heal: { id: 'heal', name: 'Heal', text: 'Heroes in a 3x3 regain 40% of their health', cost: 3, cooldownMs: 6000 },
  meteor: { id: 'meteor', name: 'Meteor', text: 'A meteor blasts the foes in a 3x3', cost: 5, cooldownMs: 10000 },
  haste: { id: 'haste', name: 'Haste', text: 'Heroes in a 3x3 attack and move 50% faster for 5s', cost: 3, cooldownMs: 8000 },
};
export const SPELL_IDS: SpellId[] = ['heal', 'meteor', 'haste'];

/** A meteor falling, from when and onto which tile. */
export interface Fall {
  at: number;
  u: number;
  v: number;
}

/** The spell state a battle carries. */
export interface SpellState {
  mana: number;
  /** When each spell may next be cast. */
  ready: Record<SpellId, number>;
  falls: Fall[];
  /** Events recorded between ticks, handed out by the next one. */
  events: BattleEvent[];
}

export const freshSpells = (): SpellState => ({ mana: MANA_START, ready: { heal: 0, meteor: 0, haste: 0 }, falls: [], events: [] });

/** The king stands behind the meteor's blows: not on the board, so it has no side effects on the fighters. */
const KING: Unit = { id: 0, def: 'king', side: 'hero', u: 0, v: 0, hp: 1, maxHp: 1, facing: 0, alive: true, busyUntil: 0, charge: 0 };

const inArea = (x: { u: number; v: number }, u: number, v: number) => Math.abs(x.u - u) <= 1 && Math.abs(x.v - v) <= 1;

/** Whether a hero is hasted now. */
export const isHasted = (b: Battle, x: Unit) => x.hasteUntil !== undefined && x.hasteUntil > b.t;
/** How much faster a fighter acts now (1 when not hasted). */
export const speedOf = (b: Battle, x: Unit) => (isHasted(b, x) ? HASTE_MULT : 1);

/** Mana gain for one tick. */
export function fillMana(b: Battle): void {
  b.spells.mana = Math.min(MANA_MAX, Math.round((b.spells.mana + (TICK_MS * MANA_PER_SEC) / 1000) * 1000) / 1000);
}

/** Milliseconds until a spell may be cast again (0 when ready). */
export const cooldownLeft = (b: Battle, id: SpellId) => Math.max(0, b.spells.ready[id] - b.t);

/** Whether a spell could be cast now (mana and cooldown; the tile is checked by `castSpell`). */
export const canAfford = (b: Battle, id: SpellId) => b.phase === 'fight' && b.spells.mana >= SPELLS[id].cost && cooldownLeft(b, id) === 0;

/** Cast a spell on the 3x3 around tile (u, v). False (and nothing changed) if the fight isn't on, the tile isn't on the board, or the mana or cooldown isn't there. */
export function castSpell(b: Battle, id: SpellId, u: number, v: number): boolean {
  const spell = SPELLS[id];
  if (!spell || !tileAt(b.board, u, v) || !canAfford(b, id)) return false;
  const s = b.spells;
  s.mana -= spell.cost;
  s.ready[id] = b.t + spell.cooldownMs;
  s.events.push({ kind: 'spell', id, u, v });
  if (id === 'meteor') {
    s.falls.push({ at: b.t + METEOR_MS, u, v });
    s.events.push({ kind: 'area', by: 0, id: 'meteor', u, v, ms: METEOR_MS });
    return true;
  }
  for (const x of b.units) {
    if (!x.alive || x.side !== 'hero' || !inArea(x, u, v)) continue;
    if (id === 'heal') {
      const amount = Math.min(x.maxHp - x.hp, Math.round(x.maxHp * HEAL_SHARE));
      x.hp += amount;
      s.events.push({ kind: 'heal', to: x.id, amount });
    } else {
      x.hasteUntil = b.t + HASTE_MS;
      s.events.push({ kind: 'haste', to: x.id, ms: HASTE_MS });
    }
  }
  return true;
}

/** Every tick: meteors that have fallen strike the foes in their 3x3. */
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
}
