// The Last Stand's pause sheet (STAND-003, the owner's ask: "a pause menu to look at the units' stats"): what the page lists while the
// run is paused, read from the run and its battle. Each hero's level, health, pool (mana or stamina), attack and defence, kills, its
// two skills and its ultimate; and the king's health. Pure: it only reads, so pausing changes nothing.

import { atkOf, defenceOf, type Unit } from './battle';
import { kitOf, ULT_LEVEL, ultimateOf } from './abilities';
import { costOf, HERO_KITS, resMax, resOf, skill2Open, SKILL2_LEVEL, topOf } from './heroKits';
import { UNITS } from './units';
import type { Stand, StandHero } from './stand';

export interface SheetSkill {
  name: string;
  /** What it costs from the pool. */
  cost: number;
  /** The level it opens at (skill 2 at `SKILL2_LEVEL`), and whether it is open. */
  opens: number;
  open: boolean;
  /** Whether the pool holds enough to cast it now. */
  paid: boolean;
}

export interface SheetHero {
  id: number;
  kind: string;
  name: string;
  /** The level it fights at (its lasting level), and the levels it has gained in this run. */
  level: number;
  runLv: number;
  fallen: boolean;
  hp: number;
  maxHp: number;
  /** Its pool: mana or stamina, now and at most (null for a hero with no kit). */
  pool: { kind: 'mana' | 'stamina'; now: number; max: number } | null;
  atk: number;
  def: number;
  kills: number;
  skills: SheetSkill[];
  /** Its ultimate: the name, the level it opens at, whether it is open, the meter (0 to 1) and whether it is ready to fire. */
  ult: { name: string; opens: number; open: boolean; meter: number; ready: boolean } | null;
}

export interface StandSheet {
  wave: number;
  king: { hp: number; maxHp: number };
  gold: number;
  heroes: SheetHero[];
}

const unitOf = (s: Stand, h: StandHero): Unit | undefined => s.b.units.find((u) => u.side === 'hero' && u.tag === h.id);

/** One hero's row. */
function rowOf(s: Stand, h: StandHero): SheetHero {
  const u = unitOf(s, h);
  const def = UNITS[h.kind];
  const hk = HERO_KITS()[h.kind];
  const level = u?.level ?? 1;
  const fallen = !!h.fallen || (!!u && !u.alive);
  const res = u && hk ? resOf(u, hk.pool) : 0;
  const skill = (n: 1 | 2): SheetSkill | null => {
    if (!hk) return null;
    const slot = n === 1 ? hk.s1 : hk.s2;
    const cost = Math.round(u ? costOf(u, slot) : slot.cost);
    const open = n === 1 || (u ? skill2Open(u) : level >= SKILL2_LEVEL);
    return { name: slot.skill.name, cost, opens: n === 1 ? 1 : SKILL2_LEVEL, open, paid: open && !fallen && res + 1e-9 >= cost };
  };
  const ultSkill = u ? kitOf(u)?.ultimate : undefined;
  const ultOpen = !!u && !!ultimateOf(u);
  const need = ultSkill?.need ?? 100;
  const meter = ultOpen ? Math.min(1, (u!.charge2 ?? 0) / need) : 0;
  return {
    id: h.id,
    kind: h.kind,
    name: def?.name ?? h.kind,
    level,
    runLv: h.lv,
    fallen,
    hp: u && !fallen ? Math.max(0, Math.ceil(u.hp)) : 0,
    maxHp: u?.maxHp ?? def?.hp ?? 0,
    pool: hk ? { kind: hk.pool, now: fallen ? 0 : Math.floor(res), max: Math.floor(u ? topOf(u, hk.pool) : resMax(hk.pool)) } : null, // (the hero's own top: its pool follows its scores, STATS batch 6)
    atk: Math.round(u ? atkOf(u) : def?.atk ?? 0),
    def: u ? defenceOf(u) : def?.def ?? 0,
    kills: h.kills ?? 0,
    skills: [skill(1), skill(2)].filter((x): x is SheetSkill => !!x),
    ult: ultSkill ? { name: ultSkill.name, opens: ultSkill.unlock ?? ULT_LEVEL, open: ultOpen, meter, ready: ultOpen && !fallen && meter >= 1 } : null,
  };
}

/** The sheet of the run as it stands: every hero of the party in its order (the fallen too, marked), and the king. */
export function standSheet(s: Stand): StandSheet {
  return {
    wave: s.run.wave,
    king: { hp: Math.max(0, Math.ceil(s.king.hp)), maxHp: s.king.maxHp },
    gold: s.run.gold,
    heroes: s.run.heroes.map((h) => rowOf(s, h)),
  };
}
