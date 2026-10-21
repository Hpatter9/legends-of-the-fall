// Legends of the Fall: the phone page. The board is drawn with Pixi; the bench, the buttons and the banners are plain
// page elements over it. Before the fight the heroes are dragged (or tapped, then a tile tapped) from the bench onto
// the blue tiles; then the fight plays itself, a fixed tick at a time.

import { Application, Container, Sprite, TextureSource } from 'pixi.js';
import { D, standable, tileAt } from './sim/board';
import { canPlace, fight, heroesPlaced, isDeployTile, place, startBattle, stepBattle, TICK_MS, unitAt, unplace, type Battle } from './sim/battle';
import { HEROES, UNITS } from './sim/units';
import { BoardView, loadBoardArt } from './render/boardView';
import { UnitSprite } from './render/unitView';
import { Fx, loadFx } from './render/fx';
import { framesOf, loadSheets, portrait } from './render/sheets';
import { at, FOOT, HH, TH, TW } from './render/iso';

TextureSource.defaultOptions.scaleMode = 'nearest';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

interface Drag {
  id: string;
  x: number;
  y: number;
  moved: boolean;
  fromBoard: boolean;
}

class Game {
  private app = new Application();
  private world = new Container();
  private boardView = new BoardView();
  private sprites = new Map<number, UnitSprite>();
  private fx = new Fx(this.sprites);
  private ghost = new Sprite();
  private b!: Battle;
  private seed = 1;
  /** Where each hero was placed, so a restart puts them back. */
  private placed = new Map<string, [number, number]>();
  private chosen: string | null = null;
  private drag: Drag | null = null;
  private hover: [number, number] | null = null;
  private speed = 1;
  private acc = 0;
  private scale = 1;

  async start(): Promise<void> {
    await this.app.init({ resizeTo: window, backgroundAlpha: 0, antialias: false, roundPixels: true, autoDensity: true, resolution: Math.min(3, devicePixelRatio || 1) });
    $('stage').appendChild(this.app.canvas);
    await Promise.all([loadSheets(), loadBoardArt(), loadFx()]);
    this.world.sortableChildren = true;
    this.boardView.root.addChild(this.fx.root);
    this.world.addChild(this.boardView.root);
    this.ghost.anchor.set(0.5, 1);
    this.ghost.alpha = 0.85;
    this.ghost.visible = false;
    this.app.stage.addChild(this.world, this.ghost);
    this.seed = Number(new URLSearchParams(location.search).get('seed')) || (Date.now() % 100000) + 1;
    this.buildBench();
    this.wire();
    this.newBattle(true);
    this.app.ticker.add((tk) => this.frame(tk.deltaMS));
    window.addEventListener('resize', () => this.layout());
    $('loading').remove();
    (window as unknown as { __game: Game }).__game = this;
  }

  /* -------------------------------------------------------------- the fight */

  /** A fresh fight: on the same board (a restart, heroes back where they were) or a new one. */
  private newBattle(sameBoard: boolean): void {
    if (!sameBoard) {
      this.seed = (this.seed % 99991) + 1 + Math.floor(Math.random() * 97);
      this.placed.clear();
    }
    this.b = startBattle(this.seed);
    for (const [id, [u, v]] of this.placed) place(this.b, id, u, v);
    this.acc = 0;
    this.chosen = null;
    this.fx.clear();
    this.boardView.build(this.b.board);
    this.syncSprites(true);
    this.layout();
    this.refresh();
  }

  private begin(): void {
    if (!fight(this.b)) return;
    this.chosen = null;
    this.boardView.clearMarks();
    this.refresh();
  }

  private frame(dt: number): void {
    const b = this.b;
    if (b.phase === 'fight') {
      this.acc += Math.min(dt, 250) * this.speed;
      while (this.acc >= TICK_MS && b.phase === 'fight') {
        this.acc -= TICK_MS;
        const events = stepBattle(b);
        this.fx.show(b, events);
        if (events.some((e) => e.kind === 'hit')) this.refreshBench();
        if (b.phase !== 'fight') this.refresh();
      }
      this.fx.step(Math.min(dt, 250) * this.speed);
      $('clock').textContent = clock(b.t);
    } else if (b.phase !== 'deploy') {
      // (the fallen finish falling after the end)
      this.acc += dt;
      this.fx.step(dt);
    }
    const t = b.phase === 'deploy' ? performance.now() : b.phase === 'fight' ? b.t - TICK_MS + this.acc : b.t + this.acc;
    for (const s of this.sprites.values()) s.update(b.board, t, b.phase !== 'deploy');
    this.world.position.set(this.baseX + this.fx.shakeX, this.baseY + this.fx.shakeY);
  }

  /** One sprite per fighter on the board. */
  private syncSprites(all = false): void {
    if (all) {
      for (const s of this.sprites.values()) s.root.destroy({ children: true });
      this.sprites.clear();
    }
    const ids = new Set(this.b.units.map((u) => u.id));
    for (const [id, s] of this.sprites)
      if (!ids.has(id)) {
        s.root.destroy({ children: true });
        this.sprites.delete(id);
      }
    for (const u of this.b.units)
      if (!this.sprites.has(u.id)) {
        const s = new UnitSprite(u);
        this.sprites.set(u.id, s);
        this.boardView.root.addChild(s.root);
      }
  }

  /* -------------------------------------------------------------- the camera */

  private baseX = 0;
  private baseY = 0;

  /** Fit the board into the room the bench and the top bar leave. */
  private layout(): void {
    const top = $('top').getBoundingClientRect();
    const panel = $('panel').getBoundingClientRect();
    const sideways = innerWidth > innerHeight;
    const area = sideways ? { x: 0, y: top.bottom, w: panel.left, h: innerHeight - top.bottom } : { x: 0, y: top.bottom, w: innerWidth, h: panel.top - top.bottom };
    const b = this.b.board;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const h = tileAt(b, u, v)!.h;
        const [x, y] = at(u, v, h);
        x0 = Math.min(x0, x - TW / 2);
        x1 = Math.max(x1, x + TW / 2);
        // (room over the far tiles for the fighters standing on them)
        y0 = Math.min(y0, y - TH / 2 - 52);
        y1 = Math.max(y1, y + TH / 2 + h * HH + FOOT);
      }
    const pad = 10;
    const k = Math.min(3, (area.w - pad * 2) / (x1 - x0), (area.h - pad * 2) / (y1 - y0));
    this.scale = k;
    this.world.scale.set(k);
    this.baseX = Math.round(area.x + area.w / 2 - ((x0 + x1) / 2) * k);
    this.baseY = Math.round(area.y + area.h / 2 - ((y0 + y1) / 2) * k);
    this.ghost.scale.set(k);
  }

  /** The tile under a point on the screen (the nearest column's top or side). */
  private tileAtScreen(sx: number, sy: number): [number, number] | null {
    const b = this.b.board;
    const wx = (sx - this.world.x) / this.scale;
    const wy = (sy - this.world.y) / this.scale;
    // (front to back: a column in front hides the tops behind it)
    for (let d = b.w + b.d - 2; d >= 0; d--)
      for (let u = 0; u < b.w; u++) {
        const v = d - u;
        const t = tileAt(b, u, v);
        if (!t) continue;
        const [x, y] = at(u, v, t.h);
        const dx = Math.abs(wx - x) / (TW / 2);
        if (dx > 1) continue;
        if (dx + Math.abs(wy - y) / (TH / 2) <= 1) return [u, v];
        // (the column's sides, below its top's left and right edges)
        if (wy > y && wy < y + TH / 2 * (1 - dx) + t.h * HH + FOOT) return [u, v];
      }
    return null;
  }

  /** The placed hero under a point on the screen. */
  private heroAtScreen(sx: number, sy: number): string | null {
    const wx = (sx - this.world.x) / this.scale;
    const wy = (sy - this.world.y) / this.scale;
    const heroes = this.b.units.filter((x) => x.side === 'hero').sort((a, c) => c.u + c.v - (a.u + a.v));
    for (const h of heroes) {
      const s = this.sprites.get(h.id);
      if (s && Math.abs(wx - s.x) < 16 && wy < s.y + 6 && wy > s.y - s.tall) return h.def;
    }
    return null;
  }

  /* -------------------------------------------------------------- input */

  private wire(): void {
    const canvas = this.app.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (this.b.phase !== 'deploy') return;
      const id = this.heroAtScreen(e.clientX, e.clientY);
      this.drag = { id: id ?? '', x: e.clientX, y: e.clientY, moved: false, fromBoard: true };
    });
    window.addEventListener('pointermove', (e) => this.dragMove(e));
    window.addEventListener('pointerup', (e) => this.dragEnd(e));
    window.addEventListener('pointercancel', () => this.endDrag());
    $('fight').addEventListener('click', () => this.begin());
    $('newBoard').addEventListener('click', () => this.newBattle(false));
    $('again').addEventListener('click', () => this.newBattle(true));
    $('next').addEventListener('click', () => this.newBattle(false));
    $('speed').addEventListener('click', () => {
      this.speed = this.speed === 1 ? 2 : 1;
      $('speed').textContent = `×${this.speed}`;
    });
  }

  private dragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d || !d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
    d.moved = true;
    this.chosen = d.id;
    // (the hero is held a little over the finger, so it can be seen)
    this.ghost.texture = framesOf(UNITS[d.id].sheet, 'idle')[0];
    this.ghost.scale.set(this.scale * UNITS[d.id].scale);
    this.ghost.position.set(e.clientX, e.clientY - 24);
    this.ghost.visible = true;
    this.hover = this.tileAtScreen(e.clientX, e.clientY - 24);
    this.markTiles();
  }

  private dragEnd(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (this.b.phase !== 'deploy') return this.endDrag();
    if (d.moved && d.id) {
      // dropped: on a tile of the heroes' rows, or back on the bench
      const tile = this.tileAtScreen(e.clientX, e.clientY - 24);
      if (tile && canPlace(this.b, d.id, ...tile)) this.put(d.id, tile);
      else if (overBench(e.clientX, e.clientY)) this.takeBack(d.id);
      this.chosen = null;
    } else if (d.fromBoard && (e.target as HTMLElement) === this.app.canvas) {
      // a tap on the board: pick up a hero, put the chosen one down, or send the chosen one back to the bench
      const tile = this.tileAtScreen(e.clientX, e.clientY);
      if (d.id && d.id === this.chosen) {
        this.takeBack(d.id);
        this.chosen = null;
      } else if (this.chosen && tile && canPlace(this.b, this.chosen, ...tile)) {
        this.put(this.chosen, tile);
        this.chosen = null;
      } else this.chosen = d.id || null;
    } else if (!d.fromBoard) this.chosen = this.chosen === d.id ? null : d.id;
    this.endDrag();
  }

  private endDrag(): void {
    this.drag = null;
    this.hover = null;
    this.ghost.visible = false;
    this.refresh();
  }

  private put(id: string, [u, v]: [number, number]): void {
    if (!place(this.b, id, u, v)) return;
    this.placed.set(id, [u, v]);
    this.syncSprites();
  }

  private takeBack(id: string): void {
    unplace(this.b, id);
    this.placed.delete(id);
    this.syncSprites();
  }

  /* -------------------------------------------------------------- the page */

  private buildBench(): void {
    const bench = $('bench');
    for (const id of HEROES) {
      const def = UNITS[id];
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = id;
      const pic = portrait(def.sheet, 96);
      card.append(pic);
      const name = document.createElement('b');
      name.textContent = def.name;
      const bar = document.createElement('i');
      bar.append(document.createElement('span'));
      card.append(name, bar);
      card.title = def.role;
      card.addEventListener('pointerdown', (e) => {
        if (this.b.phase !== 'deploy') return;
        e.preventDefault();
        this.drag = { id, x: e.clientX, y: e.clientY, moved: false, fromBoard: false };
      });
      bench.append(card);
    }
  }

  /** The page and the board's lit tiles, after anything changes. */
  private refresh(): void {
    const b = this.b;
    const n = heroesPlaced(b);
    document.body.dataset.phase = b.phase;
    $('status').textContent =
      b.phase === 'deploy' ? (this.chosen ? `Place the ${UNITS[this.chosen].name}` : n ? `${n} of 5 heroes placed` : 'Drag your heroes onto the blue tiles') : b.phase === 'fight' ? 'Fight!' : b.phase === 'won' ? 'Victory' : 'Defeat';
    ($('fight') as HTMLButtonElement).disabled = b.phase !== 'deploy' || n === 0;
    $('clock').textContent = b.phase === 'deploy' ? '' : clock(b.t);
    const result = $('result');
    result.hidden = b.phase !== 'won' && b.phase !== 'lost';
    if (!result.hidden) {
      const left = b.units.filter((x) => x.alive && x.side === 'hero').length;
      $('banner').textContent = b.phase === 'won' ? 'Victory!' : 'Defeat';
      $('banner').className = b.phase;
      $('summary').textContent = b.phase === 'won' ? `${left} of ${heroesPlaced(b)} heroes still standing · ${clock(b.t)}` : b.units.some((x) => x.alive && x.side === 'hero') ? 'The skeletons held the field' : 'Every hero has fallen';
    }
    this.markTiles();
    this.refreshBench();
  }

  private refreshBench(): void {
    for (const card of $('bench').children as HTMLCollectionOf<HTMLElement>) {
      const id = card.dataset.id!;
      const u = this.b.units.find((x) => x.def === id);
      card.classList.toggle('placed', !!u);
      card.classList.toggle('chosen', this.chosen === id);
      card.classList.toggle('fallen', !!u && !u.alive);
      const share = u ? u.hp / u.maxHp : 1;
      (card.querySelector('i span') as HTMLElement).style.width = `${Math.round(share * 100)}%`;
    }
  }

  private markTiles(): void {
    const b = this.b;
    this.boardView.clearMarks();
    if (b.phase !== 'deploy') return;
    const who = this.chosen;
    for (let v = 0; v < D; v++)
      for (let u = 0; u < b.board.w; u++) {
        if (!isDeployTile(v) || !standable(tileAt(b.board, u, v))) continue;
        const here = unitAt(b, u, v);
        const ok = who ? canPlace(b, who, u, v) : !here;
        if (this.hover && this.hover[0] === u && this.hover[1] === v) this.boardView.mark(u, v, who && ok ? 'hover' : 'bad');
        else if (here && here.def === who) this.boardView.mark(u, v, 'chosen');
        else if (ok) this.boardView.mark(u, v, 'deploy');
      }
    if (this.hover && !isDeployTile(this.hover[1])) this.boardView.mark(this.hover[0], this.hover[1], 'bad');
  }
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function overBench(x: number, y: number): boolean {
  const r = $('panel').getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

new Game().start().catch((err) => {
  $('loading').textContent = `Could not start: ${err}`;
});

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
