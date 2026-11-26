// GEAR-POPUP (docs/notes/gear-popup.md): the owner's ask, "When equipping new gear on a hero, show a popup that fades after presenting its
// info. It will show what their stats went up to and what their new power level is." What a hero's gear makes of it before and after a
// change (equip, swap, unequip, Equip best, Equip all heroes, a repair, patch, reforge or glyph on a worn piece, the run's gear between
// waves), and the plate's lines: each number that changed, old → new with ▲ or ▼, and the hero's Power with its change.
//
// Pure, and reading only: a hero is read as its card reads it (`kindPower`, `heroFigures`: its rank, level, equipment, talents, runes and the
// Hall, all through `heroStats`), or, in a run, from the boost the run fights it with. Nothing is written. No DOM, no Pixi.

import type { Boost } from './sim/battle';
import { heroRank, type Meta } from './sim/meta';
import { levelOfKind } from './sim/levels';
import { gradeBoost } from './sim/run';
import { heroStats } from './sim/talents';
import { powerOf, powerText } from './sim/power';
import { statMults } from './sim/statPower';
import { UNITS } from './sim/units';

/** A hero's numbers a gear plate compares: its Power, health, attack and armour, and the shares its gear and talents add. */
export interface GearShot {
  power: number;
  hp: number;
  atk: number;
  def: number;
  crit: number;
  dodge: number;
  atkSpeed: number;
  moveSpeed: number;
  range: number;
  regen: number;
  charge: number;
  resist: number;
}

/** A hero of `kind` fighting with `boost` (its `equip` the gear, talents and the rest), read as the hero sheet reads it. */
export function shotOfBoost(kind: string, boost: Boost): GearShot {
  const def = UNITS[kind];
  const eq = boost.equip;
  const st = statMults(kind, boost);
  return {
    power: powerOf(kind, boost),
    hp: def ? Math.round(def.hp * (boost.hp ?? 1) * (1 + (eq?.hp ?? 0)) * st.hp) : 0,
    atk: def ? Math.round(def.atk * (boost.atk ?? 1) * (1 + (eq?.atk ?? 0)) * st.blow) : 0,
    def: (def?.def ?? 0) + (eq?.def ?? 0),
    crit: eq?.crit ?? 0,
    dodge: eq?.dodge ?? 0,
    atkSpeed: eq?.atkSpeed ?? 0,
    moveSpeed: eq?.moveSpeed ?? 0,
    range: eq?.range ?? 0,
    regen: eq?.regen ?? 0,
    charge: eq?.charge ?? 0,
    resist: eq?.resist ?? 0,
  };
}

/** A hero of the save outside a run: the boost `kindPower` and `heroFigures` read (grade 1, its rank and level, `heroStats`). */
export function heroGearShot(m: Meta, kind: string): GearShot {
  const eq = heroStats(m, kind);
  return shotOfBoost(kind, { ...gradeBoost(1, heroRank(m, kind), levelOfKind(m, kind)), ...(eq ? { equip: eq } : {}) });
}

/** One line of a gear plate: the number's label, its value before and after as shown, the change, and which way it went. */
export interface GearLine {
  key: keyof GearShot;
  label: string;
  from: string;
  to: string;
  delta: string;
  up: boolean;
}

type Fmt = 'n' | 'pct' | 'tiles';
/** The numbers a plate may show, in order, with their words and how each is written. Power is its own line, last. */
const SHOWN: readonly [keyof GearShot, string, Fmt][] = [
  ['hp', 'HP', 'n'],
  ['atk', 'ATK', 'n'],
  ['def', 'DEF', 'n'],
  ['crit', 'Crit', 'pct'],
  ['dodge', 'Dodge', 'pct'],
  ['atkSpeed', 'Attack speed', 'pct'],
  ['moveSpeed', 'Move speed', 'pct'],
  ['range', 'Range', 'tiles'],
  ['regen', 'Regen', 'pct'],
  ['charge', 'Charge', 'pct'],
  ['resist', 'Resist', 'pct'],
];

/** A share as a page shows it: whole per cent, or a tenth below ten (regen's small shares). */
const pctText = (v: number): string => {
  const p = v * 100;
  return `${Math.abs(p) < 10 ? Math.round(p * 10) / 10 : Math.round(p)}%`;
};
const write = (v: number, f: Fmt): string => (f === 'pct' ? pctText(v) : f === 'tiles' ? `+${Math.round(v)}` : powerText(Math.round(v)));

/** What changed between two shots of a hero: each number whose written value moved (old → new, its change, up or down), and the Power line
 *  when the Power moved. A number that moved by less than it is written to (a share under a tenth of a per cent) counts as unchanged. */
export function gearDiff(a: GearShot, b: GearShot): { stats: GearLine[]; power?: GearLine } {
  const stats: GearLine[] = [];
  for (const [key, label, f] of SHOWN) {
    const from = write(a[key], f);
    const to = write(b[key], f);
    if (from === to) continue;
    const d = b[key] - a[key];
    const up = d > 0;
    const delta = f === 'pct' ? pctText(Math.abs(d)) : f === 'tiles' ? String(Math.abs(Math.round(d))) : powerText(Math.abs(Math.round(d)));
    stats.push({ key, label, from: f === 'tiles' ? String(Math.round(a[key])) : from, to: f === 'tiles' ? String(Math.round(b[key])) : to, delta: `${up ? '▲' : '▼'}${delta}`, up });
  }
  const d = Math.round(b.power) - Math.round(a.power);
  const power = d ? { key: 'power' as const, label: 'Power', from: powerText(Math.round(a.power)), to: powerText(Math.round(b.power)), delta: `${d > 0 ? '▲' : '▼'}${powerText(Math.abs(d))}`, up: d > 0 } : undefined;
  return { stats, power };
}

/** A diff's lines in words ("ATK 120 → 135 ▲15", "Power 7,240 → 7,515 ▲275"), the Power last. Empty when nothing changed. */
export function gearWords(diff: ReturnType<typeof gearDiff>): string[] {
  return [...diff.stats, ...(diff.power ? [diff.power] : [])].map((l) => `${l.label} ${l.from} → ${l.to} ${l.delta}`);
}

/** The heroes a change to the save's gear may touch: the hero itself, and, for a piece taken from another, its last wearer. */
export const touched = (kind: string, ...others: (string | undefined)[]): string[] => [...new Set([kind, ...others.filter((k): k is string => !!k)])];
