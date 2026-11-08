// Controlled fixtures for the shipping trophy wall; never included in game.js.
import { TrophyWallModal, BOSS_TROPHIES } from '../../src/trophyWall';
import { startedMeta } from '../../src/sim/meta';
const wall = new TrophyWallModal();
wall.root.id = 'trophyPaintFixture';
document.body.append(wall.root);
(window as any).__trophyPaint = {
  open(unlocked: boolean) {
    wall.close();
    const m = startedMeta(7);
    if (unlocked) m.bosses = BOSS_TROPHIES.map(t => t.id);
    wall.open(m);
  },
  close() { wall.close(); },
};
