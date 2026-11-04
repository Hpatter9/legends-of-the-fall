// The retune of the one-off quests (QUESTS-3, Q4): new goals and riders on the quests that already exist, their stories, givers, needs and
// ids kept. A quest taken before the retune keeps the goal it was taken with (`QuestDef.was`, `defFor`). Gathered from `questRetune/`.

import type { Retune } from './questData';
import { GWEN_RETUNE } from './questRetune/gwen';
import { ROAD_RETUNE } from './questRetune/road';
import { CROWN_RETUNE } from './questRetune/crown';

export const RETUNE: Readonly<Record<string, Retune>> = { ...GWEN_RETUNE, ...ROAD_RETUNE, ...CROWN_RETUNE };
