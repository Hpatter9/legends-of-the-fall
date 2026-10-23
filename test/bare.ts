// A battle's board stripped to level, bare ground: for the tests of a rule that is not about the terrain (a skill's reach, a
// passive's numbers). The board's shapes and terrain (`layouts.ts`, walls, water, barrels, shrines) would otherwise sit in the way.
import type { Battle } from '../src/sim/battle';

export function bareBoard(b: Battle): Battle {
  for (const t of b.board.tiles) {
    t.h = 0;
    delete t.rock;
    delete t.wall;
    delete t.barrel;
    delete t.bridge;
    delete t.ground;
    delete t.bush;
  }
  delete b.barrels;
  delete b.groundFx;
  return b;
}
