// The new quest battles of QUESTS-3 (Q6 to Q8), gathered from their files: each opened by one of the new quests. Pure data.

import type { QuestBattle } from '../questBattles';
import { CAMPAIGNS1_BATTLES } from './campaigns1';
import { ROYALNEW_BATTLES } from './royalnew';

export const NEW_BATTLES: readonly QuestBattle[] = [...CAMPAIGNS1_BATTLES, ...ROYALNEW_BATTLES];
