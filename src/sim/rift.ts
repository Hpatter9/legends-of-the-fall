// The rebuilt Calamity. Optional state leaves already-saved six-map runs intact.
import type { Expedition } from './sanctuary';
import type { Run } from './run';
import { xpFor } from './levels';
import { COMMAND_MULT, CORRUPT, EVOLUTION, OFFERING_MULT, PATRON_PULSE, PULSE } from './altarRules';

export const RIFT_ROWS = [6, 7, 8];
export const RIFT_BOSSES = [1, 3, 6];
export type Patron = 'ember' | 'bastion' | 'echo';
export type Offering = 'vitality' | 'fury';
export type Commandment = 'together' | 'solitude';
/** The altar's three steps, in the order they come. */
export type AltarStep = 'patron' | 'offering' | 'commandment';
export interface Rift {
  expedition?: Expedition;
  starter: number;
  wins: number;
  patron?: Patron;
  offering?: Offering;
  commandment?: Commandment;
  corruption: number;
  /** Which steps were corrupted (ALTAR-CLEAR: kept so the page can say so; older saves have only the count). */
  corrupted?: AltarStep[];
}
/** A share as a whole percentage, and milliseconds as seconds (for the words, ALTAR-CLEAR). */
const pc = (x: number): number => Math.round(x * 100);
const s = (ms: number): number => ms / 1000;
export const PATRONS: Record<Patron, { name: string; text: string }> = {
  ember: { name: 'Ember', text: `Every ${s(PULSE.everyMs)} seconds, your starter burns the nearest foe for ${pc(PATRON_PULSE.ember.base)}% of their attack. Each evolution adds ${pc(PATRON_PULSE.ember.per)}%.` },
  bastion: { name: 'Bastion', text: `Every ${s(PULSE.everyMs)} seconds, your starter shields themselves and allies within ${PULSE.reach} tiles for ${pc(PATRON_PULSE.bastion.base)}% of their maximum health. Each evolution adds ${pc(PATRON_PULSE.bastion.per)}%.` },
  echo: { name: 'Echo', text: `Every ${s(PULSE.everyMs)} seconds, your starter charges their skill and those of allies within ${PULSE.reach} tiles by ${PATRON_PULSE.echo.base}. Each evolution adds ${PATRON_PULSE.echo.per}.` },
};
export const OFFERINGS: Record<Offering, { name: string; text: string }> = {
  vitality: { name: 'Vital Offering', text: `Your starter gains ${pc(OFFERING_MULT.vitality.hp - 1)}% maximum health, but deals ${pc(1 - OFFERING_MULT.vitality.dmg)}% less damage.` },
  fury: { name: 'Offering of Fury', text: `Your starter deals ${pc(OFFERING_MULT.fury.dmg - 1)}% more damage, but has ${pc(1 - OFFERING_MULT.fury.hp)}% less maximum health.` },
};
export const COMMANDMENTS: Record<Commandment, { name: string; text: string }> = {
  together: { name: 'Stand Together', text: `Altar pulses are ${pc(COMMAND_MULT.together - 1)}% stronger while an ally stands within ${PULSE.reach} tiles of your starter.` },
  solitude: { name: 'Walk Alone', text: `Altar pulses are ${pc(COMMAND_MULT.solitude - 1)}% stronger while no ally stands within ${PULSE.reach} tiles of your starter.` },
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
  h.xp = Math.max(h.xp ?? 0, xpFor(EVOLUTION.levels[riftRank(r)]));
  if (corrupt) {
    r.corruption++;
    r.corrupted = [...(r.corrupted ?? []), slot];
  }
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
  return `Corruption ${n}: enemies gain ${pc(n * CORRUPT.foeHp)}% health and ${pc(n * CORRUPT.foeAtk)}% attack. Bosses pulse every ${s(CORRUPT.boss.everyMs)} seconds for ${pc(n * CORRUPT.boss.hit)}% of each hero's maximum health. Combat gold +${pc(n * CORRUPT.gold)}%.${n && patron === 'bastion' ? ' Each boss pulse also shields the boss.' : n && patron === 'echo' ? ' Each boss pulse also drains hero skill charge.' : ''}`;
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
