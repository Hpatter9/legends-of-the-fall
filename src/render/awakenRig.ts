// The hero's picture for the scenes that draw sheets straight onto a canvas (the tavern, the camp, the summoning hall, the
// Calamity map): its permanent upgraded equipment at its rank. Combat tier auras
// belong to fights; home scenes show the new equipment clearly. Reads meta only.

import { heroRank, type Meta } from '../sim/meta';
import { sheetInfo } from './sheets';
import { gradeOfRank } from './tavernSpots';
import { lookSheet, stepOfRank } from './awakenLook';

type Rig = NonNullable<ReturnType<typeof sheetInfo>>;

/** A cache key for what a hero looks like now, so a scene can tell when to cut its picture again. */
export function lookKey(meta: Meta, kind: string): string {
  const full = heroRank(meta, kind);
  return `${lookSheet(kind, full, gradeOfRank(full))}@${stepOfRank(full)}`;
}

/** The sheet of a hero at its rank (null until the sheets are loaded). */
export function heroRig(meta: Meta, kind: string): Rig | null {
  const full = heroRank(meta, kind);
  return sheetInfo(lookSheet(kind, full, gradeOfRank(full)));
}

/** The permanent awakened step; used to choose equipment in the party tableau. */
export const awakenedStep = (meta: Meta, kind: string): number => stepOfRank(heroRank(meta, kind));

/** Home scenes have no combat tier, so do not wear a combat aura. */
export const menuAuraStep = (_meta: Meta, _kind: string): number => 0;
