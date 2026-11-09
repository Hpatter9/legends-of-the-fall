// The holds built so far (phase 4, `docs/notes/assault-4.md`): each army's blueprint, by army. The engine (`assault.ts`), the codex's
// pages (`holdCodex.ts`) and the War News (`warAnswer.ts`) read this one list. Pure data: no Pixi, no DOM; the blueprints themselves load
// none of the Assault's fighters.

import type { Blueprint } from './blueprint';
import { BLOODTUSK } from './maps/orcs';
import { BARROW } from './maps/undead';
import { DEN } from './maps/beasts';
import { ELDER_ROOT } from './maps/wildwood';
import { MAZE_HEART } from './maps/labyrinth';

export const HOLDS: Readonly<Record<string, Blueprint>> = { [BLOODTUSK.army]: BLOODTUSK, [BARROW.army]: BARROW, [DEN.army]: DEN, [ELDER_ROOT.army]: ELDER_ROOT, [MAZE_HEART.army]: MAZE_HEART };
