// QUEST-POSSIBLE (docs/notes/quest-possible.md; the director's call): a taken quest (or the Eidolon chain's part going) that bars the
// king's spells or the ultimates would be broken by the Auto switches by themselves, and a new save starts with SPELL Auto on. So while a
// fight that would count for one is on, that Auto switch is held off for the fight, and a line says why; the player's own setting is not
// touched, and comes back with the next fight that counts for none. Pure: read from the save and the fight's place, no Pixi, no DOM.

import type { Cond, Goal, QuestDef } from './questData';
import type { Meta } from './meta';
import { activeDef, isDone, objectiveDone, objectivesOf } from './quests';
import { currentPart, partLocked } from './eidolonChains';

/** Where a fight is, as a goal's riders read it before the fight is fought. */
export interface FightPlace {
  mode?: string;
  army?: string;
  tier: number;
  stage: number;
}

/** What is held off this fight, and by which quest (its title, for the line). */
export interface AutoHold {
  spells?: string;
  ults?: string;
}

/** Whether a goal's place riders let this fight count (the riders a fight's heroes or its end decide are left to the fight). */
const placeFits = (c: Cond, p: FightPlace): boolean =>
  (!c.army || c.army === p.army) && (!c.mode || c.mode === p.mode) && (c.tier === undefined || (p.mode === 'army' && p.tier >= c.tier)) && (c.stage === undefined || p.stage >= c.stage);

/** The goals still to do that this fight could count for: each taken quest's open objectives (in order where it asks), and the chain's part. */
function goalsHere(m: Meta, p: FightPlace): { title: string; goal: Goal }[] {
  const out: { title: string; goal: Goal }[] = [];
  for (const a of m.quests?.active ?? []) {
    const q: QuestDef | undefined = activeDef(a);
    if (!q || isDone(a)) continue;
    const objs = objectivesOf(q);
    for (let i = 0; i < objs.length; i++) {
      if (objectiveDone(a, q, i)) continue;
      out.push({ title: q.title, goal: objs[i] });
      if (q.ordered) break;
    }
  }
  const cur = currentPart(m);
  if (cur && !partLocked(m, cur.part)) out.push({ title: cur.part.title, goal: cur.part.goal });
  return out.filter((x) => placeFits(x.goal as Cond, p));
}

/** What a fight here holds off: SPELL Auto for a goal with no king's spells, ULT Auto for one with no ultimates. */
export function autoHolds(m: Meta, p: FightPlace): AutoHold {
  const out: AutoHold = {};
  for (const { title, goal } of goalsHere(m, p)) {
    const c = goal as Cond;
    if (c.noSpells && !out.spells) out.spells = title;
    if (c.noUlts && !out.ults) out.ults = title;
  }
  return out;
}

/** The line that says why: one a switch held, or one for both when one quest holds both (the page's toasts show one at a time). */
export const holdLines = (h: AutoHold): string[] => h.spells && h.spells === h.ults ? [`SPELL and ULT Auto are held off this fight: “${h.spells}” asks for no king's spells and no ultimates`] : [
  ...(h.spells ? [`SPELL Auto is held off this fight: “${h.spells}” asks for no king's spells`] : []),
  ...(h.ults ? [`ULT Auto is held off this fight: “${h.ults}” asks for no ultimates`] : []),
];
