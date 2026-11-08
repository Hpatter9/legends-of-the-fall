// Controlled browser fixtures using the real menus, unit renderer and painted-material functions.
// Injected into a local build for screenshots; never included in game.js.
import { Application, Sprite } from 'pixi.js';
import { fresh } from '../calmap/saves';
import { travellerAt, type TravellerId } from '../../src/sim/calJourney';
import { addUnit, startBattle } from '../../src/sim/battle';
import { loadPaintedArt, paintedStrip, paintHeld } from '../../src/render/cinematicArt';

const game = () => (window as any).__game;
let fxApp: Application | undefined;
let fxPanel: HTMLDivElement | undefined;
let fxSprites: Sprite[] = [];
let fxClips: ReturnType<typeof paintedStrip>[] = [];

function closeMenus(): void {
  const g = game();
  g.speed = 0;
  g.auto = false;
  g.towerView.close();
  for (const id of ['home', 'party']) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  for (const id of ['hmSheet', 'ptSheet']) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  if (fxPanel) fxPanel.hidden = true;
}

const lab = {
  camp(who: TravellerId, returning = false): void {
    closeMenus();
    const g = game();
    let seed = 1;
    while (travellerAt(seed, 1, undefined) !== who) seed++;
    const run = fresh(seed, 'knight', 1);
    const t = run.tower!;
    t.act = returning ? 2 : 1;
    t.journey = { provisions: 3, oaths: ['iron', 'ember', 'vigil'],
      ...(returning ? { met: { who, help: true } } : {}) };
    t.cur = { id: 0, kind: 'campfire' };
    g.towerView.open(run);
    g.app.ticker.stop();
  },
  map(): void {
    closeMenus();
    const run = fresh(7, 'knight', 1);
    run.tower!.journey = { provisions: 3, oaths: ['iron', 'ember', 'coin'] };
    game().towerView.open(run);
    game().app.ticker.stop();
  },
  shop(): void {
    closeMenus();
    const run = fresh(7, 'knight', 1);
    run.tower!.journey = { provisions: 3 };
    run.tower!.cur = { id: 0, kind: 'shop', shop: [] };
    game().towerView.open(run);
    game().app.ticker.stop();
  },
  equipment(): void {
    closeMenus();
    const g = game();
    g.meta.equipment = [];
    g.meta.equipped = {};
    g.meta.gearV = 2;
    g.meta.unlocked = [...new Set([...g.meta.unlocked, 'knight'])];
    g.home.open();
    g.home.openSheet('knight');
  },
  treants(time = 1110): any {
    closeMenus();
    const g = game();
    const b = startBattle(7, 'orcs');
    b.units = [];
    b.nextId = 1;
    b.board.tiles = b.board.tiles.map(tile => ({ h: 0, deco: tile.deco }));
    for (let i = 0; i < 3; i++) {
      const unit = addUnit(b, 'treant', 2 + i * 2, 4);
      unit.grade = i + 1;
      unit.hurtAt = 1000;
    }
    b.phase = 'fight';
    b.t = 1200;
    g.b = b;
    g.intro = null;
    g.boardView.build(b.board);
    g.syncSprites(true);
    g.layout();
    g.refresh();
    g.app.ticker.stop();
    const before = JSON.stringify(b);
    const frames = [];
    for (const sp of g.sprites.values()) {
      sp.update(b.board, time, true);
      frames.push({ sheet: sp.sheet, x: sp.body.texture.frame.x, y: sp.body.texture.frame.y, visible: sp.body.visible });
    }
    const sprites = [...g.sprites.values()] as any[];
    g.zoom = 1.7;
    g.tx = g.cx = sprites.reduce((sum, sp) => sum + sp.x, 0) / 3;
    g.ty = g.cy = sprites.reduce((sum, sp) => sum + sp.y - sp.tall * 0.5, 0) / 3;
    g.clampCam();
    g.place();
    g.app.render();
    return { frames, unchanged: before === JSON.stringify(b) };
  },
  async effects(calm: boolean): Promise<any> {
    closeMenus();
    game().app.ticker.stop();
    if (!fxApp) {
      await loadPaintedArt();
      fxApp = new Application();
      await fxApp.init({ width: 384, height: 160, background: '#282c34', preference: 'webgl', resolution: 2 });
      fxApp.ticker.stop();
      fxPanel = document.createElement('div');
      fxPanel.id = 'finishFxPreview';
      fxPanel.style.cssText = 'position:fixed;top:35%;left:50%;transform:translateX(-50%);width:min(384px,100%);z-index:99999;background:#282c34;color:white;text-align:center;padding:8px 0';
      fxPanel.append('Painted flame · smoke · energy');
      fxApp.canvas.style.cssText = 'width:100%;height:auto;display:block';
      fxPanel.append(fxApp.canvas);
      document.body.append(fxPanel);
      fxClips = [paintedStrip('fire', 'flame', 'fire'), paintedStrip('dark', 'smoke', 'smoke'), paintedStrip('lightning', 'orb', 'electric')];
      fxSprites = fxClips.map((clip, i) => {
        const sp = new Sprite(clip[0]);
        sp.anchor.set(0.5);
        sp.position.set(64 + i * 128, 80);
        fxApp!.stage.addChild(sp);
        return sp;
      });
    }
    fxPanel!.hidden = false;
    const before = JSON.stringify(game().b);
    const frames = [];
    for (let i = 0; i < 6; i++) {
      const row = [];
      for (let j = 0; j < fxSprites.length; j++) {
        const sp = fxSprites[j];
        paintHeld(sp, i * 90, 2.7, 0, 1, calm);
        const canvas = sp.texture.source.resource as HTMLCanvasElement;
        const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
        let visible = 0;
        for (let k = 3; k < data.length; k += 4) if (data[k] > 8) visible++;
        row.push({ frame: fxClips[j].indexOf(sp.texture), visible, alpha: sp.alpha, logicalWidth: sp.texture.orig.width });
      }
      frames.push(row);
    }
    fxApp.render();
    return { frames, unchanged: before === JSON.stringify(game().b) };
  },
};
(window as any).__artFinish = lab;
