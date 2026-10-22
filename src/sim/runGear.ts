// Dressing the squad from the run's pack: each slot's best pieces (the pack's and what the squad already wears) go to the
// heroes in order, the strongest hero first. Pure rules: no Pixi, no DOM.

import { SLOTS, type Gear } from './gear';
import { heroOf, type Owned, type Run } from './run';

const worth = (g: Gear) => g.hp + g.atk;

/** Put the best gear in the pack and on the given heroes (the fielded ones) onto those heroes; what is left over goes back to the pack. Heroes not named keep what they wear.
 *  Returns how many slots changed hands. */
export function equipBestRun(run: Run, heroIds: readonly number[]): number {
  if (run.over) return 0;
  const heroes = heroIds
    .map((id) => heroOf(run, id))
    .filter((h): h is Owned => !!h)
    .sort((a, b) => b.grade - a.grade || run.roster.indexOf(a) - run.roster.indexOf(b));
  let changed = 0;
  for (const slot of SLOTS) {
    const pool: Gear[] = (run.items ?? []).filter((g) => g.slot === slot);
    for (const h of heroes) if (h.gear?.[slot]) pool.push(h.gear[slot]!);
    pool.sort((a, b) => worth(b) - worth(a) || a.id - b.id);
    const before = heroes.map((h) => h.gear?.[slot]?.id);
    const taken = new Set(pool.map((g) => g.id));
    run.items = (run.items ?? []).filter((g) => !taken.has(g.id));
    heroes.forEach((h, i) => {
      const g = pool[i];
      if (g) h.gear = { ...h.gear, [slot]: g };
      else if (h.gear) delete h.gear[slot];
    });
    for (const g of pool.slice(heroes.length)) run.items.push(g);
    heroes.forEach((h, i) => {
      if (h.gear?.[slot]?.id !== before[i]) changed++;
    });
  }
  return changed;
}
