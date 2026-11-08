// Browser-only presentation fixture, injected after the real game loads. Never ships.
import { addUnit, startBattle } from '../../src/sim/battle';

const kinds = ['orcGrunt', 'orcArcher', 'orcBrute', 'orcWarlord', 'demon', 'demonLord', 'imp', 'ogre', 'hornedOgre'];
const game = () => (window as any).__game;
const lab = {
  setup(): void {
    const g = game();
    g.app.ticker.stop();
    const b = startBattle(7, 'orcs');
    b.units = [];
    b.nextId = 1;
    // Flat ground gives an unobstructed comparison of the nine existing enemy sizes.
    b.board.tiles = b.board.tiles.map(tile => ({ h: 0, deco: tile.deco }));
    kinds.forEach((kind, i) => addUnit(b, kind, 1 + (i % 3) * 2, 2 + Math.floor(i / 3) * 2));
    b.phase = 'fight';
    b.t = 1200;
    g.b = b;
    g.intro = null;
    g.fx.clear();
    g.boardView.build(b.board);
    g.syncSprites(true);
    g.layout();
    g.refresh();
    document.getElementById('tipSkip')?.click();
    g.app.ticker.stop();
    lab.pose(1200);
    const sprites = [...g.sprites.values()] as any[];
    g.zoom = 1.3;
    g.tx = g.cx = sprites.reduce((sum, sp) => sum + sp.x, 0) / sprites.length;
    g.ty = g.cy = sprites.reduce((sum, sp) => sum + sp.y - sp.tall * 0.4, 0) / sprites.length;
    g.clampCam();
    g.place();
    g.app.render();
  },
  pose(time: number, hurt = false): any {
    const g = game();
    for (const unit of g.b.units) {
      if (hurt) unit.hurtAt = 1000;
      else delete unit.hurtAt;
    }
    const before = JSON.stringify(g.b);
    const frames = [];
    for (const sp of g.sprites.values()) {
      sp.update(g.b.board, time, true);
      const texture = sp.body.texture;
      frames.push({ kind: sp.unit.def, id: sp.unit.id, sheet: sp.sheet,
        x: texture.frame.x, y: texture.frame.y, width: texture.frame.width, height: texture.frame.height,
        source: texture.source.uid, visible: sp.body.visible, alpha: sp.body.alpha });
    }
    g.app.render();
    return { frames, simulationUnchanged: JSON.stringify(g.b) === before };
  },
};
(window as any).__enemyMotion = lab;
