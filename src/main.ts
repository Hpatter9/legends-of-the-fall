// Legends of the Fall: the phone page. The board is drawn with Pixi; the bench, the buttons and the banners are plain
// page elements over it. Before the fight the heroes are dragged (or tapped, then a tile tapped) from the bench onto
// the blue tiles; then the fight plays itself, a fixed tick at a time.

import { Application, Container, Sprite, TextureSource } from 'pixi.js';
import { D, standable, tileAt } from './sim/board';
import { canPlace, fight, heroesPlaced, isDeployTile, place, startBattle, stepBattle, TICK_MS, unitAt, unplace, type Battle } from './sim/battle';
import { canAfford, castSpell, cooldownLeft, MANA_MAX, SPELLS, SPELL_IDS, type SpellId } from './sim/spells';
import { FOE_BANDS } from './sim/foes';
import { HEROES, UNITS } from './sim/units';
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
  private seed = 1;
  /** The foe band. A `?band=` names one for the visit; else each New board takes the next. */
  private band = 'skeletons';
  private bandPinned = false;
  /** Where each hero was placed, so a restart puts them back. */
  private placed = new Map<string, [number, number]>();
  private chosen: string | null = null;
  private drag: Drag | null = null;
  private hover: [number, number] | null = null;
  private speed = 1;
  private acc = 0;
  private scale = 1;
  private sky: HTMLElement[] = [];
  /** The spell card chosen, waiting for a tile. */
  private spell: SpellId | null = null;

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
    this.seed = Number(query.get('seed')) || (Date.now() % 100000) + 1;
    const band = query.get('band');
    if (band && band in FOE_BANDS) {
      this.band = band;
      this.bandPinned = true;
    }
    this.sky = [...document.querySelectorAll<HTMLElement>('#sky div')];
    this.buildBench();
    this.buildSpells();
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
      if (!this.bandPinned) {
        const names = Object.keys(FOE_BANDS);
        this.band = names[(names.indexOf(this.band) + 1) % names.length];
      }
    }
    this.b = startBattle(this.seed, this.band);
    for (const [id, [u, v]] of this.placed) place(this.b, id, u, v);
    this.acc = 0;
    this.chosen = null;
    this.spell = null;
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
    this.layout();
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
      this.refreshSpells();
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
      if (s && Math.abs(wx - s.x) < 16 && wy < s.y + 6 && wy > s.y - s.tall) return h.def;
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
      this.aim(e);
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
    if (!d) return;
    if (d.pan && d.moved) this.hover = null;
    else this.aim(e);
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
    // (a tap on the board with a spell chosen casts it there)
    if (this.b.phase === 'fight' && this.spell && !d.moved && (e.target as HTMLElement) === this.app.canvas) {
      const tile = this.tileAtScreen(e.clientX, e.clientY);
      if (tile && castSpell(this.b, this.spell, ...tile)) this.spell = null;
      return this.endDrag();
    }
    if (this.b.phase !== 'deploy' || (d.pan && d.moved)) return this.endDrag();
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

  /* -------------------------------------------------------------- the king's spells */

  private buildSpells(): void {
    const cards = $('spellCards');
    for (const id of SPELL_IDS) {
      const sp = SPELLS[id];
      const card = document.createElement('button');
      card.className = 'spell';
      card.dataset.id = id;
      card.title = sp.text;
      card.innerHTML = `<b>${sp.name}</b><em>${sp.cost} mana</em><span class="cool"></span>`;
      card.addEventListener('click', () => {
        if (this.b.phase !== 'fight') return;
        this.spell = this.spell === id ? null : canAfford(this.b, id) ? id : this.spell;
        this.hover = null;
        this.refreshSpells();
        this.markTiles();
      });
      cards.append(card);
    }
  }

  /** While a spell is chosen, the finger or pointer shows the 3x3 it would hit. */
  private aim(e: PointerEvent): void {
    if (this.b.phase !== 'fight' || !this.spell) return;
    this.hover = this.tileAtScreen(e.clientX, e.clientY);
    this.markTiles();
  }

  private refreshSpells(): void {
    const b = this.b;
    // (a chosen spell that has become unaffordable, or a fight that has ended, is dropped)
    const dropped = this.spell && !canAfford(b, this.spell);
    if (dropped) this.spell = null;
    ($('mana').querySelector('i span') as HTMLElement).style.width = `${(b.spells.mana / MANA_MAX) * 100}%`;
    $('mana').querySelector('b')!.textContent = `${Math.floor(b.spells.mana)}/${MANA_MAX}`;
    for (const card of $('spellCards').children as HTMLCollectionOf<HTMLElement>) {
      const id = card.dataset.id as SpellId;
      card.classList.toggle('dim', !canAfford(b, id));
      card.classList.toggle('armed', this.spell === id);
      (card.querySelector('.cool') as HTMLElement).style.height = `${(cooldownLeft(b, id) / SPELLS[id].cooldownMs) * 100}%`;
    }
    $('spellHint').textContent = this.spell ? `${SPELLS[this.spell].text}: tap a tile (tap the card again to cancel)` : '';
    if (dropped) this.markTiles();
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
      $('summary').textContent = b.phase === 'won' ? `${left} of ${heroesPlaced(b)} heroes still standing · ${clock(b.t)}` : b.units.some((x) => x.alive && x.side === 'hero') ? 'The foes held the field' : 'Every hero has fallen';
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
    if (b.phase === 'fight' && this.spell && this.hover) {
      // the spell's 3x3 around the tile under the finger
      for (let du = -1; du <= 1; du++)
        for (let dv = -1; dv <= 1; dv++) if (tileAt(b.board, this.hover[0] + du, this.hover[1] + dv)) this.boardView.mark(this.hover[0] + du, this.hover[1] + dv, this.spell === 'meteor' ? 'bad' : 'chosen');
    }
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
