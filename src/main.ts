// Legends of the Fall: the phone page. The board is drawn with Pixi; the bench, the buttons and the banners are plain
// page elements over it. Before the fight the heroes are dragged (or tapped, then a tile tapped) from the bench onto
// the blue tiles; then the fight plays itself, a fixed tick at a time.

import { Application, Container, Sprite, TextureSource } from 'pixi.js';
import { D, standable, tileAt } from './sim/board';
import { canPlace, fight, heroesPlaced, isDeployTile, place, stepBattle, TICK_MS, unitAt, unplace, type Battle } from './sim/battle';
import { finish, gradeBoost, heroOf, isBossStage, loadRun, newRun, saveRun, setSquad, SQUAD, startStage, summon, summonCost, type Run } from './sim/run';
import { UNITS } from './sim/units';
import { BoardView, loadBoardArt } from './render/boardView';
import { UnitSprite } from './render/unitView';
import { Fx, loadFx } from './render/fx';
import { framesOf, loadSheets, portrait } from './render/sheets';
import { at, FOOT, HH, TH, TW } from './render/iso';

TextureSource.defaultOptions.scaleMode = 'nearest';

/** How much bigger the fighters show upright than when the whole board fits the width. */
const ZOOM = 1.6;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

interface Drag {
  id: string;
  x: number;
  y: number;
  moved: boolean;
  fromBoard: boolean;
  /** Dragging the board itself (it began on no hero), from this camera centre. */
  pan?: { cx: number; cy: number };
}

class Game {
  private app = new Application();
  private world = new Container();
  private boardView = new BoardView();
  private sprites = new Map<number, UnitSprite>();
  private fx = new Fx(this.sprites);
  private ghost = new Sprite();
  private b!: Battle;
  private run!: Run;
  /** Whether the fight's end has been settled into the run. */
  private settled = false;
  /** Gold the last win paid (for the result screen). */
  private gain = 0;
  /** Where each hero (by roster id) was placed, so the next stage puts them back. */
  private placed = new Map<string, [number, number]>();
  private chosen: string | null = null;
  private drag: Drag | null = null;
  private hover: [number, number] | null = null;
  private speed = 1;
  private acc = 0;
  private scale = 1;
  private sky: HTMLElement[] = [];

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
    const query = new URLSearchParams(location.search);
    const seed = Number(query.get('seed'));
    this.run = (!seed && loadRun()) || newRun(seed || (Date.now() % 100000) + 1);
    this.sky = [...document.querySelectorAll<HTMLElement>('#sky div')];
    this.wire();
    this.newBattle();
    this.app.ticker.add((tk) => this.frame(tk.deltaMS));
    window.addEventListener('resize', () => this.layout());
    $('loading').remove();
    (window as unknown as { __game: Game }).__game = this;
  }

  /* -------------------------------------------------------------- the fight */

  /** A fresh fight for the run's stage, with the squad back where it stood (or on the first free tiles). */
  private newBattle(): void {
    this.b = startStage(this.run);
    this.settled = false;
    for (const id of [...this.run.squad]) {
      const h = heroOf(this.run, id);
      if (!h) continue;
      const at = this.placed.get(String(id)) ?? this.freeTile();
      if (at && place(this.b, h.kind, at[0], at[1], id, gradeBoost(h.grade))) this.placed.set(String(id), at);
      else setSquad(this.run, id, false);
    }
    this.acc = 0;
    this.chosen = null;
    this.fx.clear();
    this.boardView.build(this.b.board);
    this.syncSprites(true);
    this.layout();
    this.refresh();
  }

  /** The first free standable tile on the heroes' rows, front row first. */
  private freeTile(): [number, number] | null {
    for (let v = 0; v < D; v++)
      for (let u = 0; u < this.b.board.w; u++) if (isDeployTile(v) && standable(tileAt(this.b.board, u, v)) && !unitAt(this.b, u, v)) return [u, v];
    return null;
  }

  private begin(): void {
    if (!fight(this.b)) return;
    this.chosen = null;
    this.boardView.clearMarks();
    this.focus();
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
    // (the camera eases to where it is sent, unless a finger is holding the board)
    if (!this.drag?.pan) {
      this.cx += (this.tx - this.cx) * Math.min(1, dt / 220);
      this.cy += (this.ty - this.cy) * Math.min(1, dt / 220);
      this.clampCam();
    }
    this.place();
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
  /** The world point at the middle of the board's room, and where it is heading. */
  private cx = 0;
  private cy = 0;
  private tx = 0;
  private ty = 0;
  private area = { x: 0, y: 0, w: 1, h: 1 };
  private bbox = { x0: 0, x1: 0, y0: 0, y1: 0 };

  /** Fit the board into the room the bench and the top bar leave: upright it is zoomed in and panned, sideways it fits. */
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
    const fit = Math.min(3, (area.w - pad * 2) / (x1 - x0), (area.h - pad * 2) / (y1 - y0));
    const k = sideways ? fit : Math.min(3, fit * ZOOM);
    this.scale = k;
    this.world.scale.set(k);
    this.ghost.scale.set(k);
    this.area = area;
    this.bbox = { x0, x1, y0, y1 };
    this.focus(true);
  }

  /** Send the camera to the heroes' rows (deploying) or the middle of the board (fighting). */
  private focus(snap = false): void {
    const { x0, x1, y0, y1 } = this.bbox;
    const b = this.b.board;
    if (this.b.phase === 'deploy') {
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (let v = 0; v < b.d; v++)
        if (isDeployTile(v)) {
          const [x, y] = at(Math.floor(b.w / 2), v, tileAt(b, Math.floor(b.w / 2), v)?.h ?? 0);
          sx += x;
          sy += y;
          n++;
        }
      this.tx = sx / n;
      this.ty = sy / n;
    } else {
      this.tx = (x0 + x1) / 2;
      this.ty = (y0 + y1) / 2;
    }
    if (snap) {
      this.cx = this.tx;
      this.cy = this.ty;
    }
    this.clampCam();
    this.place();
  }

  /** Keep the camera over the board: no scrolling past its edge, and a board that fits stays centred. */
  private clampCam(): void {
    const { x0, x1, y0, y1 } = this.bbox;
    const hw = this.area.w / 2 / this.scale;
    const hh = this.area.h / 2 / this.scale;
    const lim = (c: number, lo: number, hi: number, half: number) => (hi - lo <= half * 2 ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, c)));
    this.cx = lim(this.cx, x0, x1, hw);
    this.cy = lim(this.cy, y0, y1, hh);
    this.tx = lim(this.tx, x0, x1, hw);
    this.ty = lim(this.ty, y0, y1, hh);
  }

  /** Put the world where the camera says, and slide the backdrop's layers a little the other way. */
  private place(): void {
    const k = this.scale;
    this.baseX = Math.round(this.area.x + this.area.w / 2 - this.cx * k);
    this.baseY = Math.round(this.area.y + this.area.h / 2 - this.cy * k);
    this.world.position.set(this.baseX + this.fx.shakeX, this.baseY + this.fx.shakeY);
    const { x0, x1, y0, y1 } = this.bbox;
    const fx = x1 > x0 ? (this.cx - (x0 + x1) / 2) / (x1 - x0) : 0;
    const fy = y1 > y0 ? (this.cy - (y0 + y1) / 2) / (y1 - y0) : 0;
    this.sky.forEach((el, i) => (el.style.transform = `translate(${(-fx * (i + 1) * 14).toFixed(1)}px, ${(-fy * i * 10).toFixed(1)}px)`));
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
      if (s && Math.abs(wx - s.x) < 16 && wy < s.y + 6 && wy > s.y - s.tall) return String(h.tag);
    }
    return null;
  }

  /* -------------------------------------------------------------- input */

  private wire(): void {
    const canvas = this.app.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (this.drag) return;
      // (a drag that begins on a placed hero moves the hero; anywhere else it pans the board)
      const id = this.b.phase === 'deploy' ? this.heroAtScreen(e.clientX, e.clientY) : null;
      this.drag = { id: id ?? '', x: e.clientX, y: e.clientY, moved: false, fromBoard: true, pan: id ? undefined : { cx: this.cx, cy: this.cy } };
    });
    window.addEventListener('pointermove', (e) => this.dragMove(e));
    window.addEventListener('pointerup', (e) => this.dragEnd(e));
    window.addEventListener('pointercancel', () => this.endDrag());
    $('fight').addEventListener('click', () => this.begin());
    $('summon').addEventListener('click', () => {
      if (summon(this.run)) saveRun(this.run);
      this.refresh();
    });
    $('next').addEventListener('click', () => {
      if (this.run.over) {
        this.run = newRun((Date.now() % 100000) + 1);
        this.placed.clear();
      }
      saveRun(this.run);
      this.newBattle();
    });
    $('speed').addEventListener('click', () => {
      this.speed = this.speed === 1 ? 2 : 1;
      $('speed').textContent = `×${this.speed}`;
    });
  }

  private dragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (d.pan) {
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
      d.moved = true;
      this.cx = d.pan.cx - (e.clientX - d.x) / this.scale;
      this.cy = d.pan.cy - (e.clientY - d.y) / this.scale;
      this.tx = this.cx;
      this.ty = this.cy;
      this.clampCam();
      this.place();
      return;
    }
    if (!d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
    d.moved = true;
    this.chosen = d.id;
    // (the hero is held a little over the finger, so it can be seen)
    this.ghost.texture = framesOf(this.defOf(d.id).sheet, 'idle')[0];
    this.ghost.scale.set(this.scale * this.defOf(d.id).scale);
    this.ghost.position.set(e.clientX, e.clientY - 24);
    this.ghost.visible = true;
    this.hover = this.tileAtScreen(e.clientX, e.clientY - 24);
    this.markTiles();
  }

  private dragEnd(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (this.b.phase !== 'deploy' || (d.pan && d.moved)) return this.endDrag();
    if (d.moved && d.id) {
      // dropped: on a tile of the heroes' rows, or back on the bench
      const tile = this.tileAtScreen(e.clientX, e.clientY - 24);
      if (tile && this.canPut(d.id, tile)) this.put(d.id, tile);
      else if (overBench(e.clientX, e.clientY)) this.takeBack(d.id);
      this.chosen = null;
    } else if (d.fromBoard && (e.target as HTMLElement) === this.app.canvas) {
      // a tap on the board: pick up a hero, put the chosen one down, or send the chosen one back to the bench
      const tile = this.tileAtScreen(e.clientX, e.clientY);
      if (d.id && d.id === this.chosen) {
        this.takeBack(d.id);
        this.chosen = null;
      } else if (this.chosen && tile && this.canPut(this.chosen, tile)) {
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

  private defOf(id: string) {
    return UNITS[heroOf(this.run, Number(id))!.kind];
  }

  /** Whether a hero may go on a tile: free ground on the heroes' rows, and room in the squad if it isn't in it. */
  private canPut(id: string, [u, v]: [number, number]): boolean {
    const h = heroOf(this.run, Number(id));
    if (!h || !canPlace(this.b, h.kind, u, v, h.id)) return false;
    return this.run.squad.includes(h.id) || this.run.squad.length < SQUAD;
  }

  private put(id: string, tile: [number, number]): void {
    const h = heroOf(this.run, Number(id))!;
    if (!this.canPut(id, tile) || !place(this.b, h.kind, tile[0], tile[1], h.id, gradeBoost(h.grade))) return;
    setSquad(this.run, h.id, true);
    this.placed.set(id, tile);
    saveRun(this.run);
    this.syncSprites();
  }

  private takeBack(id: string): void {
    const h = heroOf(this.run, Number(id))!;
    unplace(this.b, h.kind, h.id);
    setSquad(this.run, h.id, false);
    this.placed.delete(id);
    saveRun(this.run);
    this.syncSprites();
  }

  /* -------------------------------------------------------------- the page */

  /** The bench: a card for every hero owned, rebuilt when the roster changes. */
  private buildBench(): void {
    const bench = $('bench');
    const key = this.run.roster.map((h) => `${h.id}:${h.grade}`).join();
    if (bench.dataset.key === key) return;
    bench.dataset.key = key;
    bench.replaceChildren();
    for (const h of this.run.roster) {
      const def = UNITS[h.kind];
      const id = String(h.id);
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = id;
      const stars = document.createElement('em');
      stars.textContent = '★'.repeat(h.grade);
      const name = document.createElement('b');
      name.textContent = def.name;
      const bar = document.createElement('i');
      bar.append(document.createElement('span'));
      card.append(portrait(def.sheet, 96), stars, name, bar);
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
    const run = this.run;
    const n = heroesPlaced(b);
    if ((b.phase === 'won' || b.phase === 'lost') && !this.settled) {
      this.settled = true;
      const before = run.gold;
      finish(run, b.phase === 'won');
      this.gain = run.gold - before;
      saveRun(run);
    }
    document.body.dataset.phase = b.phase;
    const stage = `Stage ${run.stage}${isBossStage(run.stage) ? ' · Boss' : ''}`;
    $('status').textContent =
      b.phase === 'deploy' ? (this.chosen ? `Place the ${this.defOf(this.chosen).name}` : n ? `${stage} · ${n} of ${SQUAD} placed` : `${stage} · drag heroes onto the blue tiles`) : b.phase === 'fight' ? `${stage} · Fight!` : b.phase === 'won' ? 'Victory' : 'Defeat';
    $('gold').textContent = `${run.gold} gold`;
    const buy = $('summon') as HTMLButtonElement;
    buy.textContent = `Summon · ${summonCost(run)}`;
    buy.disabled = run.gold < summonCost(run);
    ($('fight') as HTMLButtonElement).disabled = b.phase !== 'deploy' || n === 0;
    $('clock').textContent = b.phase === 'deploy' ? '' : clock(b.t);
    const result = $('result');
    result.hidden = b.phase !== 'won' && b.phase !== 'lost';
    if (!result.hidden) {
      const left = b.units.filter((x) => x.alive && x.side === 'hero').length;
      $('banner').textContent = b.phase === 'won' ? 'Victory!' : 'Defeat';
      $('banner').className = b.phase;
      $('summary').textContent =
        b.phase === 'won'
          ? `${left} of ${heroesPlaced(b)} heroes standing · +${this.gain} gold · ${clock(b.t)}`
          : `The run ends at stage ${run.best} · ${run.roster.length} heroes owned · ${run.summons} summons`;
      $('next').textContent = b.phase === 'won' ? `Next stage (${run.stage})` : 'New run';
    }
    this.buildBench();
    this.markTiles();
    this.refreshBench();
  }

  private refreshBench(): void {
    for (const card of $('bench').children as HTMLCollectionOf<HTMLElement>) {
      const id = card.dataset.id!;
      const u = this.b.units.find((x) => x.side === 'hero' && String(x.tag) === id);
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
        const ok = who ? this.canPut(who, [u, v]) : !here;
        if (this.hover && this.hover[0] === u && this.hover[1] === v) this.boardView.mark(u, v, who && ok ? 'hover' : 'bad');
        else if (here && who && String(here.tag) === who) this.boardView.mark(u, v, 'chosen');
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
