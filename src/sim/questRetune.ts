// The retune of the one-off quests (QUESTS-3, Q4): new goals and riders on the quests that already exist, their stories, givers, needs and
// ids kept. A quest taken before the retune keeps the goal it was taken with (`QuestDef.was`, `defFor`). Gathered from `questRetune/`.

import type { Retune } from './questData';

export const RETUNE: Readonly<Record<string, Retune>> = {};
