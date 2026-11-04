// The coming heroes' kits (docs/notes/twenty-heroes.md): the heroes whose kits are in but who wait for their battle sheets before they join
// `ALL_HEROES`. Each batch's file writes its heroes' rows (`kits/comingRow.ts`); this builds them, on first use, into the two shapes the
// roster's kits have: `KITS`'s (skill 1, passive, ultimate), read through `kitOf`, and `HERO_KITS`'s (the pool and three slots), read through
// `heroKitOf`. A hero that joins the roster moves out of here.

import type { Kit } from '../abilities';
import type { HeroKit, Slot } from '../heroKits';
import type { Row, RowSlot } from './comingRow';
import { vampireRows } from './vampires';
import { wave2Rows } from './wave2';
import { wave3Rows } from './wave3';

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
};

let built: { kits: Record<string, Kit>; heroKits: Record<string, HeroKit> } | undefined;
function build() {
  if (built) return built;
  const kits: Record<string, Kit> = {};
  const heroKits: Record<string, HeroKit> = {};
  const rows: Record<string, Row> = { ...vampireRows(), ...wave2Rows(), ...wave3Rows() };
  for (const [kind, r] of Object.entries(rows)) {
    const t = COMING_TUNE[kind] ?? [r.pool === 'mana' ? 0.7 : 0.5, 1, 0.8];
    const slot = (s: RowSlot, tune: number): Slot => ({ skill: s.skill, cls: s.cls, cost: s.cost, cd: s.cd, tune, ...(s.more ?? {}) });
    const s1 = slot(r.s1, t[0]);
    const s2 = slot(r.s2, t[1]);
    const s3 = slot(r.s3, t[2]);
    kits[kind] = { skill: r.s1.skill, passive: r.passive, ultimate: r.ultimate };
    heroKits[kind] = { pool: r.pool, s1, s2, s3, slots: [s1, s2, s3], role: r.role };
  }
  return (built = { kits, heroKits });
}

/** The coming heroes' kits as `KITS` holds the roster's (skill 1, passive, ultimate). */
export const comingKits = (): Record<string, Kit> => build().kits;
/** The coming heroes' three-slot kits as `HERO_KITS` holds the roster's. */
export const comingHeroKits = (): Record<string, HeroKit> => build().heroKits;
