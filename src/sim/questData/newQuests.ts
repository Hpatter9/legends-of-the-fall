// The new quests of QUESTS-3 (Q6 to Q8, `docs/notes/quests-design.md` section 6), gathered from their files. Pure data.

import type { QuestDef } from '../questData';
import { PROVING_QUESTS } from './proving';
import { WANTED_QUESTS } from './wanted';
import { CAMPAIGNS1_QUESTS } from './campaigns1';
import { ROYALNEW_QUESTS } from './royalnew';

export const NEW_QUESTS: readonly QuestDef[] = [...PROVING_QUESTS, ...WANTED_QUESTS, ...CAMPAIGNS1_QUESTS, ...ROYALNEW_QUESTS];
