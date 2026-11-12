// Wounds (SEVEN-SLOT GEAR batch 6, docs/notes/gear-runes-design.md section 8; the owner's ask: a hero who fell comes back after a won wave
// at about half health, not full). After a won wave of an army, the daily or a quest battle, each hero that fell stands again at
// `REVIVE_SHARE` of its hp for the next wave (the Ring of Returning brings its wearer back whole); those still standing are whole, as
// before (the owner's answer to question 2). (TEN-LIVES: a hero a life raised in the fight stands at its end, so it is not wounded; only those down at the wave's end are.) Kept as
// `Run.wounds` (roster id to share of hp; a hero not listed is whole) and read as a fight's start share (`hpShare` in `health.ts`), as the
// spire's are. The spire and the Calamity keep their own wounds (`run.tower.hp`, the fallen at 25%, campfires). Remedies heal them
// (`remedies.ts`). Pure rules: no Pixi, no DOM, no randomness.

import type { Battle } from './battle';
import { duelHeal } from './duel';
import { powerOf } from './setPowers';
import { UNITS } from './units';
import type { Run } from './run';

/** The share of its hp a hero that fell in a won wave stands again with. */
export const REVIVE_SHARE = 0.5;

/** A fight settled (from `noteFight`): a won wave leaves the fallen at half (the Ring of Returning's wearer whole) and the standing whole; a
 *  lost one leaves everyone whole. The heroes risen at half are kept for the wave card's line (`Run.risen`). A tower run keeps its own. */
export function settleWounds(run: Run, b: Battle): void {
  if (run.tower || !run.runes) return;
  // (the Nemesis War, phase 4: a duel won heals every hero a fifth, `duel.ts`; a duel lost or timed out is settled by `settleDuelRun`)
  if (b.duel) {
    delete run.risen;
    if (b.phase === 'won') {
      const healed = duelHeal(run.wounds);
      if (healed) run.wounds = healed;
      else delete run.wounds;
    }
    return;
  }
  delete run.wounds;
  delete run.risen;
  if (b.phase !== 'won') return;
  for (const u of b.units) {
    if (u.side !== 'hero' || u.tag === undefined || u.alive || UNITS[u.def]?.summon || u.owner !== undefined) continue;
    if (powerOf(u, 'ringReturning')) continue;
    (run.wounds ??= {})[String(u.tag)] = REVIVE_SHARE;
    (run.risen ??= []).push(u.tag);
  }
}

/** The heading of the wave card's row for the heroes risen at half (FIRST-HOUR 3: they were listed under "Found", which read oddly). */
export const RISEN_HEAD = 'Back on their feet';

/** The names of the heroes risen at half after the last wave, in the order they fell. */
export const risenNames = (run: Run, nameOf: (kind: string) => string): string[] =>
  (run.risen ?? []).map((id) => run.roster.find((h) => h.id === id)).filter((h): h is NonNullable<typeof h> => !!h).map((h) => nameOf(h.kind));

/** The row's one line: "Kwame, at half health", "Kwame and Selam, at half health", "Kwame, Selam and Ravi, at half health"; null when
 *  no hero rose. */
export function risenLine(run: Run, nameOf: (kind: string) => string): string | null {
  const names = risenNames(run, nameOf);
  if (!names.length) return null;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${list}, at half health`;
}

/** Whether a line of `Run.found` is the old wording of a hero risen at half ("Kwame stands again at half"): a run saved before FIRST-HOUR 3
 *  may still hold one, and the wave card leaves it out of its finds. */
export const isOldRisenLine = (line: string): boolean => /stands again at half\.?$/.test(line);
