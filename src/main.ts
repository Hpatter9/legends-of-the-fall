// Legends of the Fall: the phone page. The board is drawn with Pixi; the bench, the buttons and the banners are plain
// page elements over it. Before the fight the heroes are dragged (or tapped, then a tile tapped) from the bench onto
// the blue tiles; then the fight plays itself, a fixed tick at a time.

import { Application, Container, Sprite, TextureSource } from 'pixi.js';
import { D, standable, tileAt } from './sim/board';
import { canPlace, fight, heroesPlaced, isDeployTile, place, stepBattle, TICK_MS, unitAt, unplace, type Battle, type Unit } from './sim/battle';
import { mvpOf, startStats, STAT_KEYS, tally, type FightStats } from './sim/fightStats';
import { boostOf, finish, heroOf, isBossStage, loadRun, newRun, saveRun, setSquad, SQUAD, startStage, summon, summonCost, type Run } from './sim/run';
import { formOf, UNITS } from './sim/units';
import { earn, loadMeta, rankOf, recordStars, saveMeta, type Meta } from './sim/meta';
import { fightXp, gainXp, levelGain, levelOfKind, progressOf, xpOf, type LevelUp } from './sim/levels';
import { ratingOf, STAR_CROWNS, STAR_GOLD, type Rating } from './sim/stars';
import { Gacha } from './gacha';
import { Events } from './events';
import { Home } from './home';
import { dailyInProgress, modeNote, settleRun, startDaily, towerRun } from './sim/modes';
import { toastAchievements } from './achievementsView';
import { clockSeed, todayKey } from './modes';
import { tips, type Box } from './tips';
import { CHARGE_MAX, kitOf } from './sim/abilities';
import { keepAwake } from './render/awake';
import { canAfford, castSpell, cooldownLeft, MANA_MAX, SPELLS, SPELL_IDS, type SpellId } from './sim/spells';
import { setBackdrop, panBackdrop } from './render/backdrop';
import { BoardView, loadBoardArt } from './render/boardView';
import { countTraits, kindsOf, traitsOf, TRAITS } from './sim/traits';
import { UnitSprite } from './render/unitView';
import { Fx, loadFx } from './render/fx';
import { framesOf, loadSheets, portrait } from './render/sheets';
import { at, FOOT, HH, TH, TW } from './render/iso';
import { bindMute, play, playEvents, setup, startFight } from './render/sound';
import { onSettings, openSettings, settings } from './settings';

TextureSource.defaultOptions.scaleMode = 'nearest';

/** How much bigger the fighters show upright than when the whole board fits the width. */
const ZOOM = 1.6;
/** A boss's title card: how long it stays (ms), and how much the camera zooms in on the boss. */
const INTRO_MS = 2000;
const INTRO_ZOOM = 0.25;
const STAT_LABELS: Record<(typeof STAT_KEYS)[number], string> = { dealt: 'Dealt', taken: 'Taken', healed: 'Healed', kills: 'Kills' };

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
  private meta!: Meta;
  private gacha!: Gacha;
  private events = new Events();
  private home!: Home;
  /** Crowns the last settled fight paid. */
  private crownGain = 0;
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
  /** The spell card chosen, waiting for a tile. */
  private spell: SpellId | null = null;
  /** The fight's numbers for each hero, tallied as the ticks come in. */
  private stats: FightStats = [];
  /** A boss's title card: how long it has been on, and the boss it is about. */
  private intro: { t: number; boss: Unit } | null = null;
  /** The stages whose boss has had its card this session (a stage's card plays once). */
  private introduced = new Set<string>();

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
    this.app.stage.addChild(this.world, this.ghost, this.fx.flashLayer);
    const query = new URLSearchParams(location.search);
    const seed = Number(query.get('seed'));
    this.meta = loadMeta((Date.now() % 100000) + 1);
    saveMeta(this.meta);
    this.run = (!seed && loadRun()) || newRun(seed || (Date.now() % 100000) + 1, this.meta.unlocked, this.meta.castle);
    this.syncPool();
    this.gacha = new Gacha(this.meta, () => {
      this.syncPool();
      // (a pull can earn an achievement too)
      toastAchievements(settleRun(this.meta, this.run, { won: false, stage: this.run.stage, stars: 0 }));
      saveMeta(this.meta);
      saveRun(this.run);
      this.refresh();
      this.home.refresh();
    });
    this.home = new Home(this.meta, {
      hasRun: () => {
        const r = loadRun();
        return !!r && !r.over;
      },
      onContinue: () => this.resume(),
      onNew: () => this.newRunNow(),
      onRecruit: () => this.gacha.open(),
      onDaily: () => {
        if (dailyInProgress(loadRun(), todayKey())) return this.resume();
        this.startRun(startDaily(this.meta, todayKey()));
      },
      onTower: () => this.startRun(towerRun(clockSeed(), this.meta)),
    });
    this.buildSpells();
    this.wire();
    this.newBattle();
    // (the game opens on the castle, unless a seed is given in the address)
    if (!seed) this.home.open();
    this.app.ticker.add((tk) => this.frame(tk.deltaMS));
    // (battery saver caps the frame rate at 30)
    onSettings((s) => (this.app.ticker.maxFPS = s.saver ? 30 : 0));
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
      if (at && place(this.b, h.kind, at[0], at[1], id, boostOf(h, rankOf(this.meta, h.kind), levelOfKind(this.meta, h.kind)))) this.placed.set(String(id), at);
      else setSquad(this.run, id, false);
    }
    this.acc = 0;
    this.chosen = null;
    this.spell = null;
    this.setSpeed(settings().speed);
    this.fx.clear();
    this.boardView.build(this.b.board);
    setBackdrop(this.b.board.area);
    this.syncSprites(true);
    this.layout();
    this.refresh();
    this.startIntro();
  }

  /** A boss stage's first time: its title card, the camera gliding to the boss and zooming a little, and a rumble. Once per stage. */
  private startIntro(): void {
    const key = `${this.run.seed}:${this.run.stage}`;
    const boss = this.b.units.find((u) => u.side === 'foe' && (u.size ?? 1) > 1);
    if (!boss || this.introduced.has(key)) return;
    this.introduced.add(key);
    this.intro = { t: 0, boss };
    const card = $('bossCard');
    card.querySelector('b')!.textContent = `THE ${UNITS[boss.def].name.toUpperCase()}`;
    card.querySelector('span')!.textContent = UNITS[boss.def].role;
    card.classList.remove('out');
    card.hidden = false;
    play('boom');
  }

  /** Each frame of the intro: the rumble, the camera on the boss with the zoom swelling and falling back, and the card fading out. */
  private stepIntro(dt: number): void {
    const it = this.intro!;
    it.t += dt;
    if (it.t >= INTRO_MS) return this.endIntro();
    if (it.t < INTRO_MS * 0.7) this.fx.rumble(0.7);
    this.fx.step(dt);
    if (it.t > INTRO_MS - 400) $('bossCard').classList.add('out');
    const { u, v } = it.boss;
    const [x, y] = at(u, v, tileAt(this.b.board, u, v)?.h ?? 0);
    this.tx = x;
    this.ty = y;
    this.zoom = 1 + INTRO_ZOOM * Math.min(1, it.t / 500, (INTRO_MS - it.t) / 500);
  }

  /** The card goes (a tap, or its time is up) and the camera returns to where the phase has it. */
  private endIntro(): void {
    if (!this.intro) return;
    this.intro = null;
    this.zoom = 1;
    const card = $('bossCard');
    card.hidden = true;
    card.classList.remove('out');
    this.focus();
  }

  /** The boss's name and health across the top, during the fight (none once it has fallen). */
  private refreshBossBar(): void {
    const bar = $('bossBar');
    const boss = this.b.units.find((u) => u.side === 'foe' && (u.size ?? 1) > 1);
    const show = this.b.phase === 'fight' && !!boss?.alive;
    bar.hidden = !show;
    if (!boss || !show) return;
    bar.querySelector('b')!.textContent = UNITS[boss.def].name;
    (bar.querySelector('span') as HTMLElement).style.width = `${(boss.hp / boss.maxHp) * 100}%`;
  }

  /** The fight's numbers: a row a hero, with a bar for each number (scaled to the best hero) and the MVP's crown. */
  private showStats(): void {
    const list = $('fightStats');
    list.replaceChildren();
    list.hidden = !this.stats.length;
    if (list.hidden) return;
    const mvp = mvpOf(this.stats);
    const head = document.createElement('div');
    head.className = 'srow head';
    head.append(document.createElement('span'), ...STAT_KEYS.map((k) => Object.assign(document.createElement('span'), { textContent: STAT_LABELS[k] })));
    list.append(head);
    for (const s of this.stats) {
      const row = document.createElement('div');
      row.className = 'srow';
      const name = document.createElement('b');
      name.textContent = UNITS[s.kind].name;
      if (s === mvp) name.append(' ', Object.assign(document.createElement('em'), { textContent: '♛', title: 'MVP' }));
      row.append(name);
      for (const k of STAT_KEYS) {
        const top = Math.max(1, ...this.stats.map((x) => x[k]));
        const cell = document.createElement('span');
        cell.className = 'cell';
        cell.append(
          Object.assign(document.createElement('em'), { textContent: String(Math.round(s[k])) }),
          Object.assign(document.createElement('i'), { innerHTML: `<span style="width: ${((s[k] / top) * 100).toFixed(1)}%"></span>` }),
        );
        row.append(cell);
      }
      list.append(row);
    }
  }

  /** The first free standable tile on the heroes' rows, front row first. */
  private freeTile(): [number, number] | null {
    for (let v = 0; v < D; v++)
      for (let u = 0; u < this.b.board.w; u++) if (isDeployTile(v) && standable(tileAt(this.b.board, u, v)) && !unitAt(this.b, u, v)) return [u, v];
    return null;
  }

  private begin(): void {
    if (!fight(this.b)) return;
    this.endIntro();
    this.stats = startStats(this.b.units);
    startFight(isBossStage(this.run.stage));
    keepAwake(true);
    this.chosen = null;
    this.boardView.clearMarks();
    this.refreshBossBar();
    this.layout();
    this.refresh();
  }

  private frame(dt: number): void {
    const b = this.b;
    tips.update();
    if (b.phase === 'fight') {
      this.acc += Math.min(dt, 250) * this.speed;
      while (this.acc >= TICK_MS && b.phase === 'fight') {
        this.acc -= TICK_MS;
        const events = stepBattle(b);
        tally(this.stats, events);
        this.fx.show(b, events);
        playEvents(events);
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
    if (this.intro) this.stepIntro(dt);
    this.refreshBossBar();
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

  /** The roster ids a merge has just made (they flash on the bench and, if placed, on the board). */
  private evolved = new Set<number>();

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
        if (u.tag !== undefined && this.evolved.has(u.tag)) s.evolve();
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
  /** The camera's zoom on the boss during its card (1 otherwise). */
  private zoom = 1;
  private bbox = { x0: 0, x1: 0, y0: 0, y1: 0 };

  /** Fit the board into the room the bench and the top bar leave: upright it is zoomed in and panned, sideways it fits. */
  private layout(): void {
    this.fx.fitScreen(innerWidth, innerHeight);
    const top = $('top').getBoundingClientRect();
    const panel = $('panel').getBoundingClientRect();
    const sideways = innerWidth > innerHeight;
    const bar = $('bossBar');
    bar.style.top = `${top.bottom + 4}px`;
    bar.style.right = sideways ? `${innerWidth - panel.left + 12}px` : '12px';
    const head = bar.hidden ? top.bottom : bar.getBoundingClientRect().bottom + 4;
    const area = sideways ? { x: 0, y: head, w: panel.left, h: innerHeight - head } : { x: 0, y: head, w: innerWidth, h: panel.top - head };
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
    const k = this.scale * this.zoom;
    this.world.scale.set(k);
    this.baseX = Math.round(this.area.x + this.area.w / 2 - this.cx * k);
    this.baseY = Math.round(this.area.y + this.area.h / 2 - this.cy * k);
    this.world.position.set(this.baseX + this.fx.shakeX, this.baseY + this.fx.shakeY);
    const { x0, x1, y0, y1 } = this.bbox;
    const fx = x1 > x0 ? (this.cx - (x0 + x1) / 2) / (x1 - x0) : 0;
    const fy = y1 > y0 ? (this.cy - (y0 + y1) / 2) / (y1 - y0) : 0;
    panBackdrop(fx, fy);
  }

  /** The tile under a point on the screen (the nearest column's top or side). */
  private tileAtScreen(sx: number, sy: number): [number, number] | null {
    const b = this.b.board;
    const wx = (sx - this.world.x) / this.world.scale.x;
    const wy = (sy - this.world.y) / this.world.scale.y;
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
    const wx = (sx - this.world.x) / this.world.scale.x;
    const wy = (sy - this.world.y) / this.world.scale.y;
    const heroes = this.b.units.filter((x) => x.side === 'hero').sort((a, c) => c.u + c.v - (a.u + a.v));
    for (const h of heroes) {
      const s = this.sprites.get(h.id);
      if (s && Math.abs(wx - s.x) < 16 && wy < s.y + 6 && wy > s.y - s.tall) return String(h.tag);
    }
    return null;
  }

  /** The screen box of the blue tiles the heroes go on (for a tip to point at). */
  private deployBox(): Box | null {
    const b = this.b.board;
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let v = 0; v < D; v++)
      for (let u = 0; u < b.w; u++) {
        const t = tileAt(b, u, v);
        if (!isDeployTile(v) || !t || !standable(t)) continue;
        const [x, y] = at(u, v, t.h);
        x0 = Math.min(x0, x - TW / 2);
        x1 = Math.max(x1, x + TW / 2);
        y0 = Math.min(y0, y - TH / 2);
        y1 = Math.max(y1, y + TH / 2);
      }
    if (x0 > x1) return null;
    return { x: this.world.x + x0 * this.scale, y: this.world.y + y0 * this.scale, w: (x1 - x0) * this.scale, h: (y1 - y0) * this.scale };
  }

  /** The screen box of a fighter on the board (for a tip to point at), or null if it has gone. */
  private spriteBox(id: number): Box | null {
    const s = this.sprites.get(id);
    if (!s || !s.root.visible) return null;
    const h = s.tall * this.scale;
    return { x: this.world.x + s.x * this.scale - 20, y: this.world.y + s.y * this.scale - h, w: 40, h };
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
    setup();
    bindMute($('mute'));
    $('fight').addEventListener('click', () => this.begin());
    $('recruit').addEventListener('click', () => this.gacha.open());
    $('summon').addEventListener('click', () => {
      const before = new Set(this.run.roster.map((h) => h.id));
      const got = summon(this.run);
      if (got) {
        saveRun(this.run);
        play(got.grade > 1 ? 'merge' : 'summon');
      }
      // (a hero of a higher grade that wasn't there before is a merge's: it flashes)
      this.evolved = new Set(this.run.roster.filter((h) => h.grade > 1 && !before.has(h.id)).map((h) => h.id));
      this.refresh();
    });
    $('homeBtn').addEventListener('click', () => this.home.open());
    $('next').addEventListener('click', () => {
      // (a lost run goes back to the castle, with its summary)
      if (this.run.over) return this.goHome();
      saveRun(this.run);
      this.newBattle();
      // (an event waits between two fights: its card opens over the new stage's board)
      if (this.run.event) this.events.openEvent(this.run, () => (saveRun(this.run), this.refresh()));
    });
    $('pack').addEventListener('click', () =>
      this.events.openPack(this.run, this.b.phase === 'deploy', () => {
        // (the gear changes the placed heroes' stats: the stage starts again with the squad where it stood)
        saveRun(this.run);
        this.newBattle();
      }),
    );
    $('bossCard').addEventListener('click', () => this.endIntro());
    $('speed').addEventListener('click', () => this.setSpeed(this.speed === 1 ? 2 : 1));
    $('gear').addEventListener('click', () => openSettings());
  }

  /** The fight's speed (×1 or ×2), shown on the top bar's button. */
  private setSpeed(n: 1 | 2): void {
    this.speed = n;
    $('speed').textContent = `×${n}`;
  }

  /** Begin a new run (with the castle as it stands) and its first fight. */
  private newRunNow(): void {
    this.startRun(newRun(clockSeed(), this.meta.unlocked, this.meta.castle));
  }

  /** Begin a run (any mode's) and its first fight. */
  private startRun(run: Run): void {
    this.run = run;
    this.syncPool();
    this.placed.clear();
    saveMeta(this.meta);
    saveRun(run);
    this.newBattle();
  }

  /** Carry on with the saved run (a run saved between an event's card and the next fight picks its card up again). */
  private resume(): void {
    const r = loadRun();
    if (r && !r.over) this.run = r;
    this.syncPool();
    this.placed.clear();
    this.newBattle();
    if (this.run.event) this.events.openEvent(this.run, () => saveRun(this.run));
  }

  /** The draw pool follows the unlocks, except a daily challenge, which keeps its starting five. */
  private syncPool(): void {
    if (this.run.mode?.kind !== 'daily') this.run.pool = [...this.meta.unlocked];
  }

  /** The result screen's stars: each pops in (CSS) with its reason and what it pays, and a chime; none for a loss. */
  private showStars(rating: Rating | null): void {
    const list = $('stars');
    list.replaceChildren();
    list.hidden = !rating;
    rating?.rules.forEach((rule, i) => {
      const row = document.createElement('div');
      row.className = rule.earned ? 'star on' : 'star';
      row.style.animationDelay = `${i * 0.45}s`;
      const gem = document.createElement('span');
      gem.textContent = rule.earned ? '★' : '☆';
      const text = document.createElement('b');
      text.textContent = rule.text;
      row.append(gem, text);
      if (rule.earned) {
        const pay = document.createElement('em');
        pay.textContent = `+${STAR_CROWNS} crowns · +${STAR_GOLD} gold`;
        row.append(pay);
        setTimeout(() => play('star'), 600 + i * 450);
      }
      list.append(row);
    });
  }

  /** The result screen's XP: a row per hero kind that fought, its bar filling with the XP it earned. A level up fills the bar, then flashes the new level and its stat gains, with a chime, and the bar starts again from the new level. */
  private showXp(gains: Record<string, number>, from: Record<string, number>, ups: LevelUp[]): void {
    const list = $('xp');
    list.replaceChildren();
    list.hidden = !Object.keys(gains).length;
    const share = (p: { into: number; need: number }) => (p.need ? (p.into / p.need) * 100 : 100);
    Object.entries(gains).forEach(([kind, xp], i) => {
      const row = document.createElement('div');
      row.className = 'xprow';
      const name = document.createElement('b');
      name.textContent = UNITS[kind].name;
      const gain = document.createElement('em');
      gain.textContent = `+${xp} XP`;
      const bar = document.createElement('i');
      const fill = document.createElement('span');
      bar.append(fill);
      const note = document.createElement('p');
      row.append(name, gain, bar, note);
      list.append(row);
      const after = progressOf(from[kind] + xp);
      const up = ups.find((u) => u.kind === kind);
      fill.style.width = `${share(progressOf(from[kind]))}%`;
      const at = 400 + i * 700;
      setTimeout(() => (fill.style.width = `${up ? 100 : share(after)}%`), at);
      if (!up) return;
      setTimeout(() => {
        const gained = levelGain(up.from, up.to);
        note.textContent = `${UNITS[kind].name} reached level ${up.to}! +${gained.hp}% HP · +${gained.atk}% Atk`;
        row.classList.add('up');
        fill.style.transition = 'none';
        fill.style.width = `${share(after)}%`;
        play('levelUp');
      }, at + 900);
    });
  }

  /** A run has ended: back to the castle, showing what it earned. */
  private goHome(): void {
    const r = this.run;
    $('result').hidden = true;
    this.home.open(`The run ended at stage ${r.best}: +${this.crownGain} crowns earned`);
  }

  private dragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (d.pan && d.moved) this.hover = null;
    else this.aim(e);
    if (d.pan) {
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
      d.moved = true;
      this.cx = d.pan.cx - (e.clientX - d.x) / this.world.scale.x;
      this.cy = d.pan.cy - (e.clientY - d.y) / this.world.scale.y;
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
    if (!this.canPut(id, tile) || !place(this.b, h.kind, tile[0], tile[1], h.id, boostOf(h, rankOf(this.meta, h.kind), levelOfKind(this.meta, h.kind)))) return;
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
    const key = this.run.roster.map((h) => `${h.id}:${h.grade}:${levelOfKind(this.meta, h.kind)}`).join();
    if (bench.dataset.key === key) return;
    bench.dataset.key = key;
    bench.replaceChildren();
    for (const h of this.run.roster) {
      const def = UNITS[h.kind];
      const id = String(h.id);
      const card = document.createElement('div');
      card.className = `card g${h.grade}${this.evolved.has(h.id) ? ' evolve' : ''}`;
      card.dataset.id = id;
      const stars = document.createElement('em');
      stars.textContent = '★'.repeat(h.grade);
      const name = document.createElement('b');
      name.textContent = def.name;
      const bar = document.createElement('i');
      bar.append(document.createElement('span'));
      const marks = document.createElement('small');
      for (const t of traitsOf(h.kind)) {
        const m = document.createElement('span');
        m.textContent = TRAITS[t].short;
        m.dataset.trait = t;
        marks.append(m);
      }
      const lv = document.createElement('span');
      lv.className = 'lv';
      lv.textContent = `Lv ${levelOfKind(this.meta, h.kind)}`;
      card.append(portrait(formOf(def, h.grade), 96, h.grade), stars, name, lv, marks, bar);
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
    if (b.spells.mana >= 3) tips.offer('mana', $('spells'));
    const full = b.units.find((u) => u.side === 'hero' && u.alive && u.charge >= (kitOf(u)?.skill.need ?? CHARGE_MAX));
    if (full) tips.offer('skill', () => this.spriteBox(full.id));
    $('spellHint').textContent = this.spell ? `${SPELLS[this.spell].text}: tap a tile (tap the card again to cancel)` : '';
    if (dropped) this.markTiles();
  }

  /** The page and the board's lit tiles, after anything changes. */
  private refresh(): void {
    const b = this.b;
    const run = this.run;
    const n = heroesPlaced(b);
    if ((b.phase === 'won' || b.phase === 'lost') && !this.settled) {
      this.settled = true;
      keepAwake(false);
      const won = b.phase === 'won';
      const stage = run.stage;
      const rating = ratingOf(b, isBossStage(stage));
      const before = run.gold;
      finish(run, won, rating.stars);
      this.gain = run.gold - before;
      this.crownGain = earn(this.meta, stage, won, rating.stars);
      if (won) recordStars(this.meta, stage, rating.stars);
      const earned = settleRun(this.meta, run, { won, stage, stars: rating.stars, battle: b });
      this.showStars(won ? rating : null);
      this.showStats();
      const gains = fightXp(b);
      const from = Object.fromEntries(Object.keys(gains).map((k) => [k, xpOf(this.meta, k)]));
      this.showXp(gains, from, gainXp(this.meta, gains));
      saveMeta(this.meta);
      saveRun(run);
      toastAchievements(earned);
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
          ? `${left} of ${heroesPlaced(b)} heroes standing · +${this.gain} gold · +${this.crownGain} crowns · ${clock(b.t)}${run.found?.length ? ` · found: ${run.found.join(', ')}` : ''}`
          : `The run ends at stage ${run.best} · ${run.roster.length} heroes owned · ${run.summons} summons · +${this.crownGain} crowns${modeNote(run)}`;
      $('next').textContent = b.phase === 'won' ? `Next stage (${run.stage})` : 'Home';
    }
    if (b.phase === 'deploy') tips.atDeploy(n, run.stage, () => this.deployBox());
    this.buildBench();
    this.markTiles();
    this.refreshBench();
    this.refreshTraits();
    this.events.drawStrip(run);
  }

  /** The trait strip: the traits of the heroes placed, lit when their bonus is on; a tap says what one does. */
  private traitPick?: string;
  private refreshTraits(): void {
    const strip = $('traits');
    const hint = $('traitHint');
    const counts = countTraits(kindsOf(this.b.units));
    const key = counts.map((c) => `${c.trait.id}${c.count}`).join() + this.traitPick;
    if (strip.dataset.key === key) return;
    strip.dataset.key = key;
    strip.replaceChildren();
    for (const c of counts) {
      const pill = document.createElement('button');
      pill.className = `trait ${c.trait.kind}${c.active ? ' on' : ''}${this.traitPick === c.trait.id ? ' picked' : ''}`;
      pill.textContent = `${c.trait.name} ${c.count}/${c.goal}`;
      pill.addEventListener('click', () => {
        this.traitPick = this.traitPick === c.trait.id ? undefined : c.trait.id;
        this.refreshTraits();
      });
      strip.append(pill);
    }
    const picked = counts.find((c) => c.trait.id === this.traitPick);
    hint.textContent = picked ? `${picked.trait.name}: ${picked.trait.tiers.map((t) => `${t.need} heroes, ${t.text}`).join('; ')}` : counts.length ? 'Different heroes of a trait give a team bonus' : '';
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
