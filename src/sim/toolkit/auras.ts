// Auras (RPG-SPELLS batch 1, docs/notes/rpg-spells-design.md section 3.7): a lasting area round the caster (it moves with it) or on
// a tile, that acts every `every` ms on the allies and the foes inside it: for allies a guard (a share less damage taken), more
// attack, healing, a ward against the next ailment, mana or stamina; for foes damage, a slow and an ailment. One table,
// `b.auras`, ticked every tick (`tickAuras`). The same aura from the same caster refreshes its time; a guard from two auras counts
// once, the stronger; an aura round a caster ends when the caster falls. No randomness.

import type { At } from '../board';
import { atkOf, defenceOf, hurt, type Battle, type BattleEvent, type Unit } from '../battle';
import { mendUnit } from '../abilities';
import { addRes, poolOf } from '../heroKits';
import { bleedFor, burnFor, chillFor, curseFor, poisonFor, shockFor, ward } from '../ailments';

export type AuraAil = 'burn' | 'poison' | 'curse' | 'bleed' | 'shock';

export interface AuraOpts {
  /** The aura's name (one of a caster's at a time), its reach in tiles (Manhattan), how long it lasts and how often it acts. */
  what: string;
  reach: number;
  ms: number;
  every: number;
  /** Round the caster ('self', the default) or on a tile. */
  at?: 'self' | At;
  ally?: { guard?: number; atk?: number; heal?: number; ward?: boolean; mana?: number; stamina?: number };
  foe?: { dmg?: number; slow?: number; ail?: AuraAil };
}

export interface Aura extends AuraOpts {
  by: number;
  side: Unit['side'];
  until: number;
  next: number;
}

const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);

/** Raise an aura (or refresh the caster's aura of the same name). */
export function raiseAura(b: Battle, me: Unit, o: AuraOpts, out: BattleEvent[]): Aura {
  const auras = (b.auras ??= []);
  const old = auras.find((a) => a.by === me.id && a.what === o.what);
  if (old) {
    old.until = Math.max(old.until, b.t + o.ms);
    if (o.at && o.at !== 'self') old.at = { ...o.at };
    out.push({ kind: 'aura', by: me.id, at: old.at === 'self' || !old.at ? null : old.at, reach: old.reach, what: old.what, ms: old.until - b.t });
    return old;
  }
  const a: Aura = { ...o, at: o.at && o.at !== 'self' ? { ...o.at } : 'self', by: me.id, side: me.side, until: b.t + o.ms, next: b.t + o.every };
  auras.push(a);
  out.push({ kind: 'aura', by: me.id, at: a.at === 'self' ? null : (a.at as At), reach: a.reach, what: a.what, ms: o.ms });
  return a;
}

/** Where an aura is centred now (its caster's tile, or its own), or undefined once its caster has fallen. */
export function auraCentre(b: Battle, a: Aura): At | undefined {
  if (a.at && a.at !== 'self') return a.at;
  const by = b.units.find((x) => x.id === a.by);
  return by && by.alive ? by : undefined;
}

/** The guard from the auras over a fighter now (the strongest one, not added up). */
export const auraGuard = (b: Battle, u: Unit): number => (u.auraGuard && u.auraGuard.until > b.t ? u.auraGuard.share : 0);

/** Every tick: auras run out, and those due act on the fighters inside them. */
export function tickAuras(b: Battle, out: BattleEvent[]): void {
  const auras = b.auras;
  if (!auras?.length) return;
  // (an attack lift runs out with the aura that gave it)
  for (const u of b.units)
    if (u.auraAtk && u.auraAtk.until <= b.t) {
      u.power = (u.power ?? 1) / u.auraAtk.mult;
      delete u.auraAtk;
    }
  b.auras = auras.filter((a) => a.until > b.t && auraCentre(b, a));
  for (const a of b.auras) {
    if (a.next > b.t) continue;
    a.next = b.t + a.every;
    const c = auraCentre(b, a)!;
    const by = b.units.find((x) => x.id === a.by)!;
    const hold = b.t + a.every + 100;
    for (const x of b.units) {
      if (!x.alive || x.under || apart(c, x) > a.reach) continue;
      if (x.side === a.side && a.ally) {
        const o = a.ally;
        if (o.guard && auraGuard(b, x) <= o.guard) x.auraGuard = { share: o.guard, until: hold };
        if (o.atk) {
          if (!x.auraAtk) {
            x.power = (x.power ?? 1) * (1 + o.atk);
            x.auraAtk = { mult: 1 + o.atk, until: hold };
          } else x.auraAtk.until = Math.max(x.auraAtk.until, hold);
        }
        if (o.heal) mendUnit(x, x.maxHp * o.heal, out, by);
        if (o.ward) ward(b, x, a.every + 100);
        const pool = poolOf(x);
        if (pool === 'mana' && o.mana) addRes(x, o.mana);
        if (pool === 'stamina' && o.stamina) addRes(x, o.stamina);
      } else if (x.side !== a.side && a.foe) {
        const o = a.foe;
        if (o.dmg) hurt(b, by, x, Math.max(1, Math.round(atkOf(by) * o.dmg - defenceOf(x) * 0.5)), false, false, out, 'skill');
        if (!x.alive) continue;
        if (o.slow) chillFor(b, x, o.slow, false, false, by);
        if (o.ail === 'burn') burnFor(b, by, x);
        else if (o.ail === 'poison') poisonFor(b, by, x);
        else if (o.ail === 'curse') curseFor(b, by, x);
        else if (o.ail === 'bleed') bleedFor(b, by, x, 0.06);
        else if (o.ail === 'shock') shockFor(b, by, x);
      }
    }
  }
}

/** The AI's look (the design's section 3.7): how many allies (a buff) and foes (a harm) an aura of `reach` round `at` would hold now. */
export function auraWorth(b: Battle, me: Unit, at: At, reach: number): { allies: number; foes: number } {
  let allies = 0;
  let foes = 0;
  for (const x of b.units) {
    if (!x.alive || x.under || apart(at, x) > reach) continue;
    if (x.side === me.side) allies++;
    else foes++;
  }
  return { allies, foes };
}
