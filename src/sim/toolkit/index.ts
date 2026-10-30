// The movement and battlefield toolkit (RPG-SPELLS batch 1, docs/notes/rpg-spells-design.md section 3, docs/notes/spells-b01.md):
// charge, teleport and teleport slash, pull, shove and launch, burrow, walls, auras and swap, with the AI's choices and the boss
// rules. Skills call these; the fight calls `tickToolkit` every tick (it does nothing until a wall or an aura is up). No hero uses the
// toolkit yet (batch 2 on gives the heroes their moves), so every fight plays as before (`test/spells-identity.test.ts`).

import type { Battle, BattleEvent } from '../battle';
import { tickAuras } from './auras';
import { tickWalls } from './walls';

export * from './move';
export * from './blink';
export * from './charge';
export * from './burrow';
export * from './walls';
export * from './auras';
export * from './score';

/** Every tick: walls and auras (nothing to do until one is up). */
export function tickToolkit(b: Battle, out: BattleEvent[]): void {
  if (b.walls?.length) tickWalls(b, out);
  if (b.auras) tickAuras(b, out);
}
