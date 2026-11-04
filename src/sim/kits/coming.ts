// The coming heroes' kits (docs/notes/twenty-heroes.md): the heroes whose kits are in but who wait for their battle sheets before they join
// `ALL_HEROES`. Each batch's file writes its heroes' rows (`kits/comingRow.ts`); this builds them, on first use, into the two shapes the
// roster's kits have: `KITS`'s (skill 1, passive, ultimate), read through `kitOf`, and `HERO_KITS`'s (the pool and three slots), read through
// `heroKitOf`. A hero that joins the roster moves out of here.

import type { Kit, Passive } from '../abilities';
import type { HeroKit, Slot } from '../heroKits';
import type { Row, RowSlot } from './comingRow';
import { vampireRows } from './vampires';
import { wave2Rows } from './wave2';
import { wave3Rows } from './wave3';
import { wave4Rows } from './wave4';

/** Each coming hero's slot strengths (their `tune`, times the caster's attack while it casts): the roster's defaults (`STAM_TUNE` 0.5 or
 *  `MANA_TUNE` 0.7, 1 for skill 2 and 0.8 for skill 3) until the hero sweep tunes them when they join, as it tuned the 45 (`tools/kits/tune.ts`). */
export const COMING_TUNE: Readonly<Record<string, readonly [number, number, number]>> = {
  vampireLord: [0.5, 1, 0.8],
  hemomancer: [0.7, 1, 0.8],
  nightstalker: [0.5, 1, 0.8],
  bloodGargoyle: [0.5, 1, 0.8],
  dhampir: [0.5, 1, 0.8],
  warDrummer: [0.5, 1, 0.8],
  banneret: [0.5, 1, 0.8],
  geomancer: [0.7, 1, 0.8],
  bellWarden: [0.5, 1, 0.8],
  falconer: [0.5, 1, 0.8],
  astralSphinx: [0.7, 1, 0.8],
  mirageDancer: [0.5, 1, 0.8],
  plagueDoctor: [0.7, 1, 0.8],
  bombardier: [0.5, 1, 0.8],
  astrologer: [0.7, 1, 0.8],
  inquisitor: [0.7, 1, 0.8],
  seraph: [0.7, 1, 0.8],
  corsairSurgeon: [0.7, 1, 0.8],
  harpooner: [0.5, 1, 0.8],
  seaReaver: [0.5, 1, 0.8],
};

/** Each coming hero's passive strength: its passive's numbers scaled by this (1, as written). The branch's passives were written for the 0.262
 *  roster and outweigh main's, so the hero sweep tunes this knob as well (`tools/kits/tune.ts`, key `p`). */
export const COMING_PASSIVE: Readonly<Record<string, number>> = {};
/** Each coming hero's ultimate knobs once tuned (`tuned`: its meter's rate and its strength), over the row's own. */
export const COMING_ULT: Readonly<Record<string, { rate: number; power: number }>> = {};

/** A passive's numbers scaled by `k`: its shares and chances times `k`, its multipliers' part above 1 times `k`, its damage over time and
 *  the charge it gives times `k`; its switches (`sure`, `steady`) and timings as written. */
export function scalePassive(p: Passive, k: number): Passive {
  if (k === 1) return p;
  const out: Passive = { ...p };
  const share = ['dodge', 'block', 'pierce', 'arc', 'regen', 'leech', 'huddle', 'scales', 'blockHeal', 'aura', 'rage', 'thorns', 'far', 'through', 'halo', 'undying', 'gang'] as const;
  for (const key of share) if (typeof p[key] === 'number') out[key] = p[key]! * k;
  if (p.prey) out.prey = 1 + (p.prey - 1) * k;
  if (p.slow) out.slow = Math.round(p.slow * k);
  if (p.crit) out.crit = { ...p.crit, chance: p.crit.chance * k, mult: 1 + (p.crit.mult - 1) * k };
  if (p.mend) out.mend = { ...p.mend, share: p.mend.share * k };
  if (p.tune) out.tune = { ...p.tune, charge: p.tune.charge * k };
  if (p.ignite) out.ignite = { ...p.ignite, dmg: p.ignite.dmg * k };
  if (p.rider) out.rider = { ...p.rider, share: p.rider.share * k };
  if (p.finish) out.finish = { ...p.finish, mult: 1 + (p.finish.mult - 1) * k };
  return out;
}

const rowsOf = (): Record<string, Row> => ({ ...vampireRows(), ...wave2Rows(), ...wave3Rows(), ...wave4Rows() });
/** Set a coming hero's passive strength in its built kit (the tuner's `p` knob). */
export function setComingPassive(kind: string, k: number): void {
  const kit = comingKits()[kind];
  const row = rowsOf()[kind];
  if (kit && row) kit.passive = scalePassive(row.passive, k);
}

let built: { kits: Record<string, Kit>; heroKits: Record<string, HeroKit> } | undefined;
function build() {
  if (built) return built;
  const kits: Record<string, Kit> = {};
  const heroKits: Record<string, HeroKit> = {};
  const rows = rowsOf();
  for (const [kind, r] of Object.entries(rows)) {
    const t = COMING_TUNE[kind] ?? [r.pool === 'mana' ? 0.7 : 0.5, 1, 0.8];
    const slot = (s: RowSlot, tune: number): Slot => ({ skill: s.skill, cls: s.cls, cost: s.cost, cd: s.cd, tune, ...(s.more ?? {}) });
    const s1 = slot(r.s1, t[0]);
    const s2 = slot(r.s2, t[1]);
    const s3 = slot(r.s3, t[2]);
    kits[kind] = { skill: r.s1.skill, passive: scalePassive(r.passive, COMING_PASSIVE[kind] ?? 1), ultimate: COMING_ULT[kind] ? { ...r.ultimate, tuned: { ...COMING_ULT[kind] } } : r.ultimate };
    heroKits[kind] = { pool: r.pool, s1, s2, s3, slots: [s1, s2, s3], role: r.role };
  }
  return (built = { kits, heroKits });
}

/** The coming heroes' kits as `KITS` holds the roster's (skill 1, passive, ultimate). */
export const comingKits = (): Record<string, Kit> => build().kits;
/** The coming heroes' three-slot kits as `HERO_KITS` holds the roster's. */
export const comingHeroKits = (): Record<string, HeroKit> => build().heroKits;
