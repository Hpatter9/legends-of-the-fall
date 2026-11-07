// The coming heroes' kits (docs/notes/twenty-heroes.md): the heroes whose kits are in but who wait for their battle sheets before they join
// `ALL_HEROES`. Each batch's file writes its heroes' rows (`kits/comingRow.ts`); this builds them, on first use, into the two shapes the
// roster's kits have: `KITS`'s (skill 1, passive, ultimate), read through `kitOf`, and `HERO_KITS`'s (the pool and three slots), read through
// `heroKitOf`. A hero that joins the roster moves out of here: its kit is then handed to `KITS` and `HERO_KITS` (`joinedKits`, read by
// `abilities.ts` once its table is made). This module's rows import `abilities.ts`, which holds the joined kits as getters over `joinedKits`, built on first use, so either
// module may load first.

import type { Kit, Passive } from '../abilities';
import type { HeroKit, Slot } from '../heroKits';
import type { Row, RowSlot } from './comingRow';
import { ALL_HEROES } from '../units';
import { vampireRows } from './vampires';
import { wave2Rows } from './wave2';
import { wave3Rows } from './wave3';
import { wave4Rows } from './wave4';

/** Each coming hero's slot strengths (their `tune`, times the caster's attack while it casts), tuned by the hero sweep with the twenty in its
 *  teams (`COMING=1 tools/kits/tune.mjs`, docs/notes/twenty-heroes.md): skill 1 at level 1, skill 2 at level 10, skill 3 at level 20. */
export const COMING_TUNE: Readonly<Record<string, readonly [number, number, number]>> = {
  vampireLord: [0.138, 0.537, 0.781],
  hemomancer: [0.38, 0.271, 0.312],
  nightstalker: [1.592, 0.539, 0.721],
  bloodGargoyle: [0.348, 0.05, 0.095],
  dhampir: [0.565, 0.075, 0.399],
  warDrummer: [0.519, 1.166, 0.553],
  banneret: [0.194, 1.835, 0.469],
  geomancer: [2.715, 0.574, 0.853],
  bellWarden: [0.458, 0.571, 0.216],
  falconer: [0.05, 0.05, 0.199],
  astralSphinx: [0.05, 0.322, 0.66],
  mirageDancer: [0.05, 0.149, 0.826],
  plagueDoctor: [0.27, 0.455, 0.446],
  bombardier: [0.236, 0.521, 0.229],
  astrologer: [0.826, 1.081, 0.97],
  inquisitor: [0.895, 1.677, 0.425],
  seraph: [0.05, 0.766, 0.884],
  corsairSurgeon: [0.119, 0.47, 0.191],
  harpooner: [0.05, 0.272, 0.747],
  seaReaver: [0.05, 0.359, 0.473],
};

/** Each coming hero's passive strength: its passive's numbers scaled by this (1, as written, for any hero not listed), tuned by the sweep
 *  at level 10 (`tools/kits/tune.ts`, key `p`). */
export const COMING_PASSIVE: Readonly<Record<string, number>> = {
  vampireLord: 0.879,
  hemomancer: 0.931,
  nightstalker: 0.824,
  bloodGargoyle: 0.578,
  dhampir: 0.508,
  warDrummer: 0.966,
  banneret: 0.901,
  geomancer: 0.883,
  bellWarden: 0.968,
  falconer: 0.295,
  astralSphinx: 0.891,
  mirageDancer: 0.721,
  bombardier: 0.907,
  astrologer: 0.991,
  corsairSurgeon: 0.856,
  harpooner: 0.681,
  seaReaver: 0.965,
};
/** Each coming hero's ultimate knobs (`tuned`: its meter's rate and its strength), tuned by the sweep at level 30, over the row's own. */
export const COMING_ULT: Readonly<Record<string, { rate: number; power: number }>> = {
  vampireLord: { rate: 1.267, power: 2.5 },
  hemomancer: { rate: 0.959, power: 1.204 },
  nightstalker: { rate: 1.401, power: 2.5 },
  bloodGargoyle: { rate: 1.364, power: 2.671 },
  dhampir: { rate: 1.065, power: 1.897 },
  warDrummer: { rate: 1.137, power: 2.376 },
  banneret: { rate: 1.061, power: 1.333 },
  geomancer: { rate: 1.241, power: 2.109 },
  bellWarden: { rate: 1.522, power: 1.188 },
  falconer: { rate: 1.062, power: 1.099 },
  astralSphinx: { rate: 1.001, power: 2.5 },
  mirageDancer: { rate: 1.49, power: 1.035 },
  plagueDoctor: { rate: 0.904, power: 2.434 },
  bombardier: { rate: 0.836, power: 0.967 },
  astrologer: { rate: 1.014, power: 1.59 },
  inquisitor: { rate: 1.039, power: 1.263 },
  seraph: { rate: 1.992, power: 2.5 },
  corsairSurgeon: { rate: 0.5, power: 2.345 },
  harpooner: { rate: 1.122, power: 1.944 },
  seaReaver: { rate: 1.226, power: 2.5 },
};

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
  const kit = build().kits[kind];
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

/** The heroes of the twenty that have joined the roster (`ALL_HEROES`): their kits are built from the same rows, and `KITS` and `HERO_KITS` take them. */
const joined = (kind: string): boolean => ALL_HEROES.includes(kind);
const only = <T>(all: Record<string, T>, want: boolean): Record<string, T> =>
  Object.fromEntries(Object.entries(all).filter(([k]) => joined(k) === want));
let waiting: Record<string, Kit> | undefined;
let waitingHero: Record<string, HeroKit> | undefined;
/** The coming heroes' kits as `KITS` holds the roster's (skill 1, passive, ultimate). */
export const comingKits = (): Record<string, Kit> => (waiting ??= only(build().kits, false));
/** The coming heroes' three-slot kits as `HERO_KITS` holds the roster's. */
export const comingHeroKits = (): Record<string, HeroKit> => (waitingHero ??= only(build().heroKits, false));
/** The joined heroes' kits, for `KITS` (built by `abilities.ts` once its table is made) and for `HERO_KITS`. */
export const joinedKits = (): Record<string, Kit> => only(build().kits, true);
export const joinedHeroKits = (): Record<string, HeroKit> => only(build().heroKits, true);
/** All twenty heroes' kits, joined or still coming (for the tuner and the batch tests). */
export const twentyKits = (): Record<string, Kit> => build().kits;
export const twentyHeroKits = (): Record<string, HeroKit> => build().heroKits;
