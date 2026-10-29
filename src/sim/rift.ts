// The rebuilt Calamity. Optional state leaves already-saved six-map runs intact.
import type { Run } from './run';
import { xpFor } from './levels';

export const RIFT_ROWS = [6, 7, 8];
export const RIFT_BOSSES = [1, 3, 6];
export type Patron = 'ember' | 'bastion' | 'echo';
export type Offering = 'vitality' | 'fury';
export type Commandment = 'together' | 'solitude';
export interface Rift {
  starter: number;
  wins: number;
  patron?: Patron;
  offering?: Offering;
  commandment?: Commandment;
  corruption: number;
}
export const PATRONS: Record<Patron, { name: string; text: string }> = {
  ember: { name: 'Ember', text: 'Every 4 seconds, your starter burns the nearest foe for 45% of their attack. Each evolution adds 15%.' },
  bastion: { name: 'Bastion', text: 'Every 4 seconds, your starter shields themselves and allies within 2 tiles for 8% of their maximum health. Each evolution adds 3%.' },
  echo: { name: 'Echo', text: 'Every 4 seconds, your starter charges their skill and those of allies within 2 tiles by 12. Each evolution adds 4.' },
};
export const OFFERINGS: Record<Offering, { name: string; text: string }> = {
  vitality: { name: 'Vital Offering', text: 'Your starter gains 35% maximum health, but deals 10% less damage.' },
  fury: { name: 'Offering of Fury', text: 'Your starter deals 35% more damage, but has 15% less maximum health.' },
};
export const COMMANDMENTS: Record<Commandment, { name: string; text: string }> = {
  together: { name: 'Stand Together', text: 'Altar pulses are 50% stronger while an ally stands within 2 tiles of your starter.' },
  solitude: { name: 'Walk Alone', text: 'Altar pulses are 75% stronger while no ally stands within 2 tiles of your starter.' },
};
export const riftRank = (r: Rift): number => Number(!!r.patron) + Number(!!r.offering) + Number(!!r.commandment);
export function pendingAltar(run: Run): 'patron' | 'offering' | 'commandment' | undefined {
  const r = run.rift;
  if (!r || run.over || run.mode?.kind !== 'calamity') return;
  if (r.wins >= 1 && !r.patron) return 'patron';
  if ((run.tower?.bosses ?? 0) >= 1 && !r.offering) return 'offering';
  if ((run.tower?.bosses ?? 0) >= 2 && !r.commandment) return 'commandment';
}
/** Validate the complete choice before touching state; UI and restored saves use the same rule. */
export function chooseAltar(run: Run, choice: string, corrupt = false): boolean {
  const slot = pendingAltar(run);
  const r = run.rift;
  if (!slot || !r || !run.roster.some((h) => h.id === r.starter)) return false;
  if (slot === 'patron') {
    if (!Object.hasOwn(PATRONS, choice)) return false;
    r.patron = choice as Patron;
  } else if (slot === 'offering') {
    if (!Object.hasOwn(OFFERINGS, choice)) return false;
    r.offering = choice as Offering;
  } else {
    if (!Object.hasOwn(COMMANDMENTS, choice)) return false;
    r.commandment = choice as Commandment;
  }
  const h = run.roster.find((x) => x.id === r.starter)!;
  h.xp = Math.max(h.xp ?? 0, xpFor([1, 6, 16, 26][riftRank(r)]));
  if (corrupt) r.corruption++;
  return true;
}
/** A starter grows even when another hero lands the kills. Side fights cannot farm this guarantee. */
export function growStarter(run: Run, side = false): void {
  const r = run.rift;
  if (!r || side) return;
  r.wins++;
  const h = run.roster.find((x) => x.id === r.starter);
  if (h) h.xp = Math.max(h.xp ?? 0, xpFor(Math.min(30, 1 + r.wins * 2)));
}
export function corruptionText(n: number, patron?: Patron): string {
  return `Corruption ${n}: enemies gain ${n * 8}% health and ${n * 6}% attack. Bosses pulse every 8 seconds for ${n * 3}% of each hero's maximum health. Combat gold +${n * 10}%.${n && patron === 'bastion' ? ' Each boss pulse also shields the boss.' : n && patron === 'echo' ? ' Each boss pulse also drains hero skill charge.' : ''}`;
}

/** Reforging spends the camp action; corruption and the starter's progression stay. */
export function reforgeAltar(run: Run, patron: string): boolean {
  const r = run.rift;
  const cur = run.tower?.cur;
  if (run.over || !r?.patron || !Object.hasOwn(PATRONS, patron) || r.patron === patron || cur?.kind !== 'campfire' || cur.camp) return false;
  r.patron = patron as Patron;
  cur.camp = `Reforged the altar to ${PATRONS[r.patron].name}.`;
  return true;
}
