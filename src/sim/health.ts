// The party's wounds in the endless tower: each hero's hp is carried from fight to fight as a share of its full hp
// (`run.tower.hp`, by roster id; a hero not listed is whole). A hero that falls in a fight comes back to its feet at
// `FALLEN` of its hp. Pure rules: no Pixi, no DOM; it imports only the Run's type.

import type { Run } from './run';

/** The share of its hp a hero that fell in a fight is carried off with. */
export const FALLEN = 0.25;
/** The least a hurt hero can be left with (a cost of hp never kills). */
const LEAST = 0.05;

/** A hero's share of its hp (1 outside the tower). */
export const hpShare = (run: Run, id: number): number => run.tower?.hp[String(id)] ?? 1;

/** Heal every hero of the roster by `frac` of its full hp, a fallen one included. */
export function healParty(run: Run, frac: number): void {
  const t = run.tower;
  if (!t) return;
  for (const h of run.roster) {
    const now = hpShare(run, h.id);
    if (now < 1) t.hp[String(h.id)] = Math.min(1, now + frac);
  }
}

/** Cost every hero of the roster `frac` of its full hp (none is left below `LEAST`). */
export function hurtParty(run: Run, frac: number): void {
  const t = run.tower;
  if (!t) return;
  for (const h of run.roster) t.hp[String(h.id)] = Math.max(LEAST, Math.min(hpShare(run, h.id), hpShare(run, h.id) - frac));
}

/** The squad's average share of its hp (the roster's when the squad is empty). */
export function squadHealth(run: Run): number {
  const ids = run.squad.length ? run.squad : run.roster.map((h) => h.id);
  return ids.length ? ids.reduce((n, id) => n + hpShare(run, id), 0) / ids.length : 1;
}
