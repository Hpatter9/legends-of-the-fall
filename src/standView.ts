// The Last Stand's page (`docs/notes/last-stand.md`): the big field drawn as one baked picture with the fighters on it, the camera
// (the player's own: it starts on the king, a finger pans it and two pinch it, in whole-number steps of pixels, and it goes back
// to the king only when the crown button is tapped; STAND-003), the pause button and its sheet of the heroes, the top bar (wave, the king's health, gold), the countdown of the break with the arrows of the edges the next
// wave comes in by, the spell cards, and the bottom shop bar. The rules are `sim/stand.ts`; this file only shows them and passes
// the player's taps on. It draws into the page's own Pixi canvas, with the board of the ordinary fights hidden meanwhile.

import { Container, Graphics, Sprite, type Application } from 'pixi.js';
import { tileAt } from './sim/board';
import { TICK_MS, type BattleEvent, type Unit } from './sim/battle';
import { ARMIES, armyUnlocked } from './sim/armies';
import { castSpell, canAfford, cooldownLeft, MANA_MAX, SPELLS, type SpellId } from './sim/spells';
import {
  isBossWave, buyLevel, buyRelic, dropStand, foesAlive, goNow, healCost, healKing, levelBlock, levelCost, loadStand, newStandRun, offerCost, pickEight, postHero, relicLine,
  saveStand, settleStand, setupFromMeta, snapshot, startFirstWave, startStand, stepStand, waveSpec, weakestHero, type Stand, type StandNote, type StandSummary,
} from './sim/stand';
import { canPost, EDGES, FIELD, KING_AT, ringOf, type Edge } from './sim/standField';
import { heroSays, kingSays, newQuipScene, standFoeGrumbles } from './quips';
import { hideQuip, type Anchor } from './quipView';
import { closeCalls, KING_LOW_HP, ultimatesCast } from './render/quipRules';
import { saveMeta, type Meta } from './sim/meta';
import { HeroBar } from './heroBar';
import { UNITS } from './sim/units';
import { levelOfKind } from './sim/levels';
import { RELICS } from './sim/relics';
import { BoardView } from './render/boardView';
import { Fx } from './render/fx';
import { UnitSprite } from './render/unitView';
import { setBackdrop, panBackdrop } from './render/backdrop';
import { at, depth, setFrame, HH, TH, TW } from './render/iso';
import { easeTo, EASE_MOVE_MS, EASE_ZOOM_MS } from './render/cameraRules';
import { bossHit, NUDGE_MS, nudgeOffset, wheelStep } from './render/standCam';
import { standSheet } from './sim/standSheet';
import { endFight, play, playEvents, setAct, startFight } from './render/sound';
import { fightLevel, fightTrack } from './render/epicMusic';
import { colLeft, viewH, viewW } from './viewport';
import { spellIconHtml } from './spellIcons';
import { clockSeed } from './modes';
import { settings } from './settings';

/** What the page lends the Last Stand: the canvas, the save, the way home. */
export interface StandHost {
  app: Application;
  meta(): Meta;
  /** The ordinary board's drawing is hidden (true) or shown again (false) while the Last Stand is up. */
  hideBoard(hidden: boolean): void;
  onHome(): void;
  /** Play a cinematic due at a moment (the run waits while it plays). */
  moment(m: { kind: 'spire'; floor: number }): Promise<void>;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The most the camera may be zoomed, in CSS px per world px: from a little under a third (about eight tiles across a phone at the least) to two. */
const SCALE_MIN = 0.6;
const SCALE_MAX = 2;
/** How long after a wave begins that a foe grumbles (battle ms): the king's line has gone, and the first foes are in. */
const GRUMBLE_AFTER_MS = 5200;
/** How long a wave's banner stays (ms). */
const BANNER_MS = 1800;

/** The compass of the edges on the screen: `north` is where `v` is 0, which the board draws up and to the right. */
const EDGE_DIR: Record<Edge, [number, number]> = { north: [1, -0.5], east: [1, 0.5], south: [-1, 0.5], west: [-1, -0.5] };

export class StandView {
  private host: StandHost;
  private root!: HTMLElement;
  private input!: HTMLElement;
  private world = new Container();
  private holder = new Container();
  private board = new BoardView();
  private sprites = new Map<number, UnitSprite>();
  /** Sprites of fallen foes, kept to be used again by the next foes of the same kind (so a wave of fifty makes no new ones). */
  private pool = new Map<string, UnitSprite[]>();
  private fx = new Fx(this.sprites);
  private marks = new Graphics();
  private field: Sprite | null = null;
  private s: Stand | null = null;
  active = false;
  private ready = false;
  /** The fight speed (kept while the page is open). */
  private speed: 1 | 2 | 3 = settings().speed;
  private acc = 0;
  /** Where a frame's time goes (ms summed over `frames` frames): the sim's ticks, the sprites' update, the rest of the page's own frame. For the performance check (`docs/notes/last-stand.md`). */
  readonly perf = { frames: 0, sim: 0, sprites: 0, total: 0, worst: 0 };
  private frameN = 0;
  /** The camera: where it looks, how far (CSS px per world px) and where it is heading. */
  private cx = 0;
  private cy = 0;
  private tx = 0;
  private ty = 0;
  private scale = 1;
  private tscale = 1;
  private room = { x: 0, y: 0, w: 1, h: 1 };
  /** The boss's nudge still to run (ms; `standCam.ts`). */
  private nudge = 0;
  /** The run is paused (the pause button): nothing steps until it is resumed. */
  private paused = false;
  /** What the player has hold of: the hero selected (roster id), the spell armed, a finger's gesture. */
  private picked: number | null = null;
  private spell: SpellId | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture: { kind: 'pan' | 'hero' | 'pinch'; x: number; y: number; cx: number; cy: number; moved: boolean; hero?: number; d0?: number; s0?: number } | null = null;
  private banner = { left: 0 };
  private parts = {} as Record<string, HTMLElement>;
  /** The eight heroes' bar (`heroBar.ts`): their pools and ultimates, tapped to fire, in two rows; and the Auto switch. */
  private heroBar!: HeroBar;
  private shown = new Map<string, string>();
  private summary: StandSummary | null = null;

  constructor(host: StandHost) {
    this.host = host;
  }

  /** Build the page's pieces (once) and the field's layers on the canvas. */
  init(): void {
    if (this.ready) return;
    this.ready = true;
    this.holder.sortableChildren = true;
    this.holder.addChild(this.marks, this.fx.dimLayer, this.fx.root);
    this.marks.zIndex = 2;
    this.world.addChild(this.holder);
    this.board.renderer = this.host.app.renderer;
    // (no screen shake from the blows: only the boss's small nudge, made here)
    this.fx.still = true;
    this.world.visible = false;
    this.host.app.stage.addChildAt(this.world, 0);
    this.buildPage();
    this.host.app.ticker.add((tk) => {
      if (!this.active) return;
      try {
        this.frame(tk.deltaMS);
      } catch (err) {
        console.error(err);
      }
    });
    window.addEventListener('resize', () => this.active && this.layout());
  }

  /* -------------------------------------------------------------- the page */

  private buildPage(): void {
    const root = (this.root = el('div'));
    root.id = 'stand';
    root.hidden = true;
    this.input = el('div', 'stInput');
    const top = el('div', 'stTop');
    const leave = el('button', 'stLeave', 'Leave');
    leave.addEventListener('click', () => this.askLeave());
    const speed = el('button', 'stSpeed', `×${this.speed}`);
    speed.addEventListener('click', () => {
      this.speed = ((this.speed % 3) + 1) as 1 | 2 | 3;
      speed.textContent = `×${this.speed}`;
    });
    const pause = el('button', 'stPause', 'Pause');
    pause.setAttribute('aria-label', 'Pause, and see the heroes');
    pause.addEventListener('click', () => this.setPaused(true));
    const left = el('div', 'stLeft');
    left.append(leave, speed, pause);
    // (the camera is the player's: this takes it back to the king)
    const centre = el('button', 'stCentre');
    centre.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M3 18h18v3H3zM3 8l5 4 4-7 4 7 5-4-2 9H5z" fill="currentColor" stroke="#1a0a06" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    centre.title = 'Centre on the king';
    centre.setAttribute('aria-label', 'Centre on the king');
    centre.addEventListener('click', () => this.centreOnKing());
    const wave = el('div', 'stWave');
    wave.append(el('small', '', 'Wave'), el('span'), el('em'));
    const king = el('div', 'stKing');
    king.append(el('small', '', 'The king'), Object.assign(el('i'), { innerHTML: '<span></span>' }), el('b'));
    const gold = el('div', 'stGold');
    gold.append(el('small', '', 'Gold'), el('span'));
    top.append(left, wave, king, gold);
    // (the break's countdown, and the Go button)
    const count = el('div', 'stCount');
    count.append(el('small', '', 'Next wave in'), el('b'), el('i'));
    const go = el('button', 'stGo primary', 'Go');
    go.addEventListener('click', () => this.go());
    count.append(go);
    const arrows = el('div', 'stArrows');
    for (const e of EDGES) {
      const a = el('div', `stArrow ${e}`);
      a.innerHTML = '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path d="M3 9h10V3l9 9-9 9v-6H3z" fill="currentColor" stroke="#1a0a06" stroke-width="2" stroke-linejoin="round"/></svg>';
      a.hidden = true;
      arrows.append(a);
    }
    const info = el('div', 'stInfo');
    info.hidden = true;
    const banner = el('div', 'stBanner');
    banner.hidden = true;
    const bottom = el('div', 'stBottom');
    const spells = el('div', 'stSpells');
    const mana = el('div', 'stMana');
    mana.innerHTML = '<i><span></span></i><b></b>';
    const cards = el('div', 'stCards');
    spells.append(mana, cards);
    const heroes = el('div', 'stHeroes');
    this.heroBar = new HeroBar(heroes, {
      onAuto: (on) => {
        const m = this.host.meta();
        m.ultAuto = on;
        saveMeta(m);
        if (this.s) this.s.b.autoUlt = on;
      },
    });
    const offer = el('div', 'stOffer');
    const bar = el('div', 'stBar');
    const btn = (id: string, label: string, run: () => void) => {
      const b = el('button', `stBuy ${id}`);
      b.append(el('span', '', label), el('em'));
      b.addEventListener('click', run);
      return b;
    };
    bar.append(
      btn('level', 'Level up', () => this.buy(() => buyLevel(this.s!, this.picked ?? undefined) !== null)),
      btn('heal', 'Heal the king', () => this.buy(() => healKing(this.s!) !== null)),
    );
    const start = el('button', 'stStart primary', 'Begin the stand');
    start.addEventListener('click', () => this.begin());
    bottom.append(spells, heroes, offer, bar, start);
    const end = el('div', 'stEnd');
    end.hidden = true;
    const ask = el('div', 'stAsk');
    ask.hidden = true;
    const pick = el('div', 'stAsk stPick');
    pick.hidden = true;
    const sheet = el('div', 'stAsk stSheet');
    sheet.hidden = true;
    root.append(this.input, top, centre, count, arrows, info, banner, bottom, end, ask, pick, sheet);
    document.body.append(root);
    this.parts = { leave, speed, pause, centre, sheet, wave, king, gold, count, go, arrows, info, banner, bottom, spells, heroes, mana, cards, offer, bar, start, end, ask, pick };
    this.wireInput();
  }

  /** Set a part's text only when it has changed (the page is not rebuilt each frame). */
  private text(key: string, e: Element | null | undefined, value: string): void {
    if (!e || this.shown.get(key) === value) return;
    this.shown.set(key, value);
    e.textContent = value;
  }

  private buy(go: () => boolean): void {
    if (!this.s) return;
    if (go()) {
      play('coin');
      this.refreshBar(true);
      this.save();
    } else play('tap');
  }

  private go(): void {
    if (this.s && goNow(this.s)) play('tap');
  }

  /** The first wave (or the one a saved run was on): the heroes stand where they are. */
  private begin(): void {
    const s = this.s;
    if (!s || !startFirstWave(s)) return;
    this.music(s.run.wave, isBossWave(s.run.wave));
    this.picked = null;
    this.drawMarks();
    this.refreshBar(true);
  }

  /* -------------------------------------------------------------- opening and leaving */

  /** Come up: a saved run is carried on at its break, else a new one for the party is laid out round the keep. */
  async open(): Promise<void> {
    this.init();
    const m = this.host.meta();
    const saved = loadStand();
    if (saved) return this.start(saved);
    this.pick(pickEight(m), m);
  }

  /** The choice of the eight: the owned heroes in a grid (tap to pick or drop), Auto fill for the strongest left, and on to the keep. */
  private pick(chosen: string[], m: Meta): void {
    this.active = true;
    this.root.hidden = false;
    this.host.hideBoard(true);
    const box = this.parts.pick;
    box.replaceChildren();
    const card = el('div', 'stCard stPickCard');
    card.append(el('h2', '', 'Last Stand'), el('p', 'stDim', 'Eight heroes hold the keep: pick them, or let the game fill the party. Once the first wave begins nobody needs moving.'));
    const grid = el('div', 'stGrid');
    const count = el('p', 'stBig');
    const go = el('button', 'primary', 'To the keep');
    const draw = () => {
      grid.replaceChildren();
      for (const kind of [...m.unlocked].sort((x, y) => levelOfKind(m, y) - levelOfKind(m, x))) {
        if (UNITS[kind]?.summon) continue;
        const b = el('button', chosen.includes(kind) ? 'on' : '');
        b.append(el('span', '', UNITS[kind].name), el('em', '', `Lv ${levelOfKind(m, kind)}`));
        b.addEventListener('click', () => {
          const i = chosen.indexOf(kind);
          if (i >= 0) chosen.splice(i, 1);
          else if (chosen.length < 8) chosen.push(kind);
          draw();
        });
        grid.append(b);
      }
      count.textContent = `${chosen.length} of ${Math.min(8, m.unlocked.length)}`;
      (go as HTMLButtonElement).disabled = !chosen.length;
    };
    const auto = el('button', '', 'Auto fill');
    auto.addEventListener('click', () => {
      chosen.splice(0, chosen.length, ...pickEight(m, chosen));
      draw();
    });
    const home = el('button', '', 'Back');
    home.addEventListener('click', () => {
      box.hidden = true;
      this.leave();
    });
    go.addEventListener('click', () => {
      box.hidden = true;
      this.start(newStandRun(clockSeed(), chosen, ARMIES.filter((a) => armyUnlocked(m, a.id)).map((a) => a.id), m.stand ?? 0));
    });
    const row = el('div', 'stRow');
    row.append(home, auto, go);
    card.append(count, grid, row);
    box.append(card);
    box.hidden = false;
    draw();
  }

  /** Lay a run out and show it. */
  private start(run: ReturnType<typeof newStandRun>): void {
    const m = this.host.meta();
    setFrame();
    this.s = startStand(run, setupFromMeta(m));
    this.summary = null;
    this.acc = 0;
    this.picked = null;
    this.spell = null;
    this.banner.left = 0;
    this.nudge = 0;
    this.paused = false;
    this.parts.sheet.hidden = true;
    this.shown.clear();
    this.track = '';
    this.active = true;
    this.host.hideBoard(true);
    this.world.visible = true;
    this.root.hidden = false;
    this.parts.end.hidden = true;
    this.parts.ask.hidden = true;
    this.clearSprites();
    this.fx.clear();
    this.buildField();
    this.buildSpells();
    this.syncSprites();
    this.layout();
    this.snapCamera();
    setAct(null);
    this.save();
    this.refreshBar(true);
  }

  /** Go back to the home screen (the run, if still going, stays saved at its last break). */
  private leave(): void {
    hideQuip();
    this.active = false;
    this.track = '';
    endFight();
    this.root.hidden = true;
    this.world.visible = false;
    this.parts.ask.hidden = true;
    this.host.hideBoard(false);
    this.clearSprites();
    this.fx.clear();
    this.s = null;
    this.host.onHome();
  }

  private askLeave(): void {
    const s = this.s;
    if (!s) return;
    if (s.phase === 'over') return this.leave();
    const ask = this.parts.ask;
    ask.replaceChildren();
    const card = el('div', 'stCard');
    const going = s.phase === 'wave';
    card.append(
      el('p', '', going ? 'Leave the stand? The run is kept as it was when the last wave was cleared, and carries on from there.' : 'Leave the stand? The run is kept, and carries on from here.'),
      el('p', 'stDim', 'Or give up now: the king falls, and the run is paid for the waves it has cleared.'),
    );
    const row = el('div', 'stRow');
    const stay = el('button', '', 'Stay');
    stay.addEventListener('click', () => (ask.hidden = true));
    const out = el('button', '', 'Leave');
    out.addEventListener('click', () => {
      this.save();
      this.leave();
    });
    const quit = el('button', 'primary', 'Give up');
    quit.addEventListener('click', () => {
      ask.hidden = true;
      s.king.hp = 0;
      s.king.alive = false;
      s.b.phase = 'lost';
      s.phase = 'over';
      s.run.over = true;
      s.run.king = 0;
      s.notes.push({ kind: 'over', best: s.run.best });
    });
    row.append(stay, out, quit);
    card.append(row);
    ask.append(card);
    ask.hidden = false;
  }

  /** The run's record, kept where a break or a deploy begins. */
  private save(): void {
    const s = this.s;
    if (!s || s.phase === 'over' || s.phase === 'wave') return;
    saveStand(snapshot(s));
  }

  /* -------------------------------------------------------------- the field and the fighters */

  private buildField(): void {
    this.field?.destroy({ texture: true });
    const s = this.s!;
    this.field = this.board.bakeField(s.b.board);
    this.holder.addChild(this.field);
    setBackdrop(s.b.board.area);
    this.drawMarks();
  }

  private clearSprites(): void {
    for (const sp of this.sprites.values()) sp.root.destroy({ children: true });
    this.sprites.clear();
    for (const list of this.pool.values()) for (const sp of list) sp.root.destroy({ children: true });
    this.pool.clear();
  }

  /** One sprite for each fighter on the field: new ones made (or taken from the pool of fallen foes), those gone let go. */
  private syncSprites(): void {
    const s = this.s!;
    const live = new Set<number>();
    for (const u of s.b.units) live.add(u.id);
    for (const [id, sp] of this.sprites)
      if (!live.has(id)) {
        this.sprites.delete(id);
        sp.root.visible = false;
        sp.root.parent?.removeChild(sp.root);
        if (sp.unit.side === 'foe' && !sp.unit.grade) {
          const key = this.keyOf(sp.unit);
          const list = this.pool.get(key) ?? [];
          if (list.length < 24) list.push(sp);
          else sp.root.destroy({ children: true });
          this.pool.set(key, list);
        } else sp.root.destroy({ children: true });
      }
    for (const u of s.b.units) {
      if (this.sprites.has(u.id)) continue;
      const key = this.keyOf(u);
      const pooled = u.side === 'foe' && !u.grade ? this.pool.get(key)?.pop() : undefined;
      const sp = pooled ?? new UnitSprite(u);
      if (pooled) pooled.rebind(u);
      this.sprites.set(u.id, sp);
      this.holder.addChild(sp.root);
      sp.root.visible = true;
    }
  }

  private keyOf(u: Unit): string {
    return `${u.def}:${u.size ?? 1}`;
  }

  /** Mark the heroes' posts (a soft ring on each) and, with a hero picked, the tiles it may be moved to. */
  private drawMarks(): void {
    const s = this.s;
    const g = this.marks;
    g.clear();
    if (!s) return;
    const diamond = (u: number, v: number, colour: number, a: number, line = false) => {
      const [x, y] = at(u, v, tileAt(s.b.board, u, v)?.h ?? 0);
      g.poly([x, y - TH / 2 + 2, x + TW / 2 - 3, y, x, y + TH / 2 - 2, x - TW / 2 + 3, y]);
      if (line) g.stroke({ color: colour, alpha: a, width: 1.5 });
      else g.fill({ color: colour, alpha: a });
    };
    if (this.picked !== null) {
      for (let v = KING_AT.v - 6; v <= KING_AT.v + 6; v++)
        for (let u = KING_AT.u - 6; u <= KING_AT.u + 6; u++) if (canPost(s.b.board, u, v) && !s.b.units.some((x) => x.alive && x.u === u && x.v === v && x.tag !== this.picked)) diamond(u, v, 0x4a9cff, 0.22);
    }
    for (const h of s.run.heroes) {
      if (!h.post) continue;
      diamond(h.post[0], h.post[1], h.id === this.picked ? 0x6dff8a : 0xffe066, h.id === this.picked ? 0.9 : 0.5, true);
    }
  }

  /* -------------------------------------------------------------- input */

  private wireInput(): void {
    const inp = this.input;
    inp.addEventListener('pointerdown', (e) => {
      try {
        inp.setPointerCapture(e.pointerId);
      } catch {
        /* (a pointer that is already gone) */
      }
      this.pointers.set(e.pointerId, { x: e.clientX - colLeft(), y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.gesture = { kind: 'pinch', x: 0, y: 0, cx: this.cx, cy: this.cy, moved: true, d0: Math.hypot(a.x - b.x, a.y - b.y), s0: this.tscale };
        return;
      }
      const x = e.clientX - colLeft();
      const hero = this.heroAt(x, e.clientY);
      this.gesture = { kind: hero !== null ? 'hero' : 'pan', x, y: e.clientY, cx: this.cx, cy: this.cy, moved: false, hero: hero ?? undefined };
    });
    inp.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p || !this.gesture) return;
      p.x = e.clientX - colLeft();
      p.y = e.clientY;
      const g = this.gesture;
      if (g.kind === 'pinch' && this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        const ratio = Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, g.d0!);
        this.tscale = this.snapScale(g.s0! * ratio);
        return;
      }
      if (Math.hypot(p.x - g.x, p.y - g.y) > 8) g.moved = true;
      if (g.kind === 'pan' && g.moved) {
        this.cx = this.tx = g.cx - (p.x - g.x) / this.scale;
        this.cy = this.ty = g.cy - (p.y - g.y) / this.scale;
        this.clampCam();
      }
    });
    const up = (e: PointerEvent) => {
      const g = this.gesture;
      this.pointers.delete(e.pointerId);
      if (!g) return;
      if (g.kind === 'pinch') {
        if (this.pointers.size < 2) this.gesture = null;
        return;
      }
      this.gesture = null;
      const x = e.clientX - colLeft();
      if (g.kind === 'hero' && g.hero !== undefined) {
        // (a hero dragged onto a tile is posted there; a tap on it picks it, and the next tile tapped moves it)
        if (g.moved) {
          const at = this.tileAtScreen(x, e.clientY);
          if (at && this.s && postHero(this.s, g.hero, at[0], at[1])) {
            play('tap');
            this.picked = null;
          } else this.picked = g.hero;
        } else this.picked = this.picked === g.hero ? null : g.hero;
        this.drawMarks();
        this.refreshBar(true);
        return;
      }
      if (g.moved) return;
      const tile = this.tileAtScreen(x, e.clientY);
      if (!tile || !this.s) return;
      if (this.spell) {
        if (castSpell(this.s.b, this.spell, tile[0], tile[1])) play('spell');
        this.spell = null;
        this.refreshSpells();
        return;
      }
      if (this.picked !== null) {
        if (postHero(this.s, this.picked, tile[0], tile[1])) play('tap');
        this.picked = null;
        this.drawMarks();
        this.refreshBar(true);
      }
    };
    // (a mouse wheel zooms a step at a time, on a desktop)
    inp.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.tscale = wheelStep(this.steps(), this.tscale, e.deltaY);
      },
      { passive: false },
    );
    inp.addEventListener('pointerup', up);
    inp.addEventListener('pointercancel', up);
  }

  /** The roster id of the hero under a point on the screen (its sprite), if any. */
  private heroAt(sx: number, sy: number): number | null {
    const s = this.s;
    if (!s) return null;
    const wx = (sx - this.world.x) / this.world.scale.x;
    const wy = (sy - this.world.y) / this.world.scale.y;
    let best: number | null = null;
    let near = Infinity;
    for (const u of s.b.units) {
      if (u.side !== 'hero' || u.tag === undefined || !u.alive) continue;
      const sp = this.sprites.get(u.id);
      if (!sp) continue;
      const dx = Math.abs(wx - sp.x);
      const dy = wy - (sp.y - sp.tall / 2);
      const d = Math.hypot(dx / 1.3, dy);
      if (d < Math.max(22, sp.tall * 0.55) && d < near) {
        near = d;
        best = u.tag;
      }
    }
    return best;
  }

  /** The tile under a point on the screen. */
  private tileAtScreen(sx: number, sy: number): [number, number] | null {
    const s = this.s!;
    const b = s.b.board;
    const wx = (sx - this.world.x) / this.world.scale.x;
    const wy = (sy - this.world.y) / this.world.scale.y;
    let best: [number, number] | null = null;
    let nearest = -Infinity;
    // (the tiles near the point's flat position are looked at: the column in front wins)
    const flat = (wx / (TW / 2) + wy / (TH / 2)) / 2;
    const flatV = (wy / (TH / 2) - wx / (TW / 2)) / 2;
    for (let v = Math.max(0, Math.floor(flatV) - 4); v <= Math.min(b.d - 1, Math.floor(flatV) + 6); v++)
      for (let u = Math.max(0, Math.floor(flat) - 4); u <= Math.min(b.w - 1, Math.floor(flat) + 6); u++) {
        const t = tileAt(b, u, v)!;
        const [x, y] = at(u, v, t.h);
        const dx = Math.abs(wx - x) / (TW / 2);
        if (dx > 1) continue;
        const hit = dx + Math.abs(wy - y) / (TH / 2) <= 1 || (wy > y && wy < y + (TH / 2) * (1 - dx) + t.h * HH + 10);
        if (hit && depth(u, v) > nearest) {
          nearest = depth(u, v);
          best = [u, v];
        }
      }
    return best;
  }

  /* -------------------------------------------------------------- the camera */

  /** The whole-number steps the picture may be shown at: a world pixel is a whole number of device pixels (so 1/3 or 2/3 or 1 on a 3x screen). */
  private steps(): number[] {
    const res = this.host.app.renderer.resolution || 1;
    const out: number[] = [];
    for (let n = 1; n <= 8; n++) {
      const css = n / res;
      if (css >= SCALE_MIN && css <= SCALE_MAX) out.push(css);
    }
    return out.length ? out : [1];
  }

  /** The step nearest a scale. */
  private snapScale(k: number): number {
    return this.steps().reduce((best, x) => (Math.abs(Math.log(x / k)) < Math.abs(Math.log(best / k)) ? x : best));
  }

  /** The room the field has on the screen: between the top bar and the bottom bar. */
  layout(): void {
    const top = this.parts.wave.parentElement!.getBoundingClientRect().bottom;
    const bottom = this.parts.bottom.getBoundingClientRect().top;
    this.room = { x: 0, y: top, w: viewW(), h: Math.max(80, bottom - top) };
    this.fx.fitScreen(viewW(), viewH());
    // (the camera stays where the player put it; a run just laid out is put on the king by `start`)
    if (this.s) {
      this.clampCam();
      this.place();
    }
  }

  /** The crown button: the camera eases back to the king (the zoom is left as it is). */
  private centreOnKing(): void {
    const s = this.s;
    if (!s) return;
    const [kx, ky] = at(KING_AT.u, KING_AT.v, tileAt(s.b.board, KING_AT.u, KING_AT.v)!.h);
    this.tx = kx;
    this.ty = ky - 24;
    this.clampCam();
    play('tap');
  }

  /** Put the camera on the king at a first step, with no easing. */
  private snapCamera(): void {
    const s = this.s!;
    const [kx, ky] = at(KING_AT.u, KING_AT.v, tileAt(s.b.board, KING_AT.u, KING_AT.v)!.h);
    this.cx = this.tx = kx;
    this.cy = this.ty = ky - 24;
    const steps = this.steps();
    this.scale = this.tscale = steps[Math.min(steps.length - 1, Math.floor(steps.length / 2))];
    this.place();
  }

  private clampCam(): void {
    const half = this.scale || 1;
    const hw = this.room.w / 2 / half;
    const hh = this.room.h / 2 / half;
    const w = (FIELD + FIELD) * (TW / 2);
    const lim = (c: number, lo: number, hi: number, h: number) => (hi - lo <= h * 2 ? (lo + hi) / 2 : Math.min(hi - h, Math.max(lo + h, c)));
    // (the field's reach in world px: its corners, and the heights over it)
    const x0 = -(FIELD * TW) / 2;
    const x1 = (FIELD * TW) / 2;
    const y0 = -60;
    const y1 = (FIELD + FIELD) * (TH / 2) + 40;
    void w;
    this.cx = lim(this.cx, x0, x1, hw);
    this.cy = lim(this.cy, y0, y1, hh);
    this.tx = lim(this.tx, x0, x1, hw);
    this.ty = lim(this.ty, y0, y1, hh);
  }

  /** The world put where the camera says (whole device pixels), and the backdrop slid a little the other way. */
  private place(): void {
    const k = this.scale;
    this.world.scale.set(k);
    const n = nudgeOffset(this.nudge, this.fx.calm());
    this.world.position.set(Math.round(this.room.x + this.room.w / 2 - this.cx * k) + n.x, Math.round(this.room.y + this.room.h / 2 - this.cy * k) + n.y);
    panBackdrop((this.cx - 0) / (FIELD * TW), (this.cy - (FIELD * TH) / 2) / (FIELD * TH));
    const w = this.world;
    this.fx.view = { x0: (0 - w.x) / k + 4, x1: (viewW() - w.x) / k - 4, y0: (this.room.y - w.y) / k + 4, y1: (this.room.y + this.room.h - w.y) / k };
  }

  /* -------------------------------------------------------------- the frame */

  private frame(dt: number): void {
    const s = this.s;
    if (!s) return;
    this.frameN++;
    const t0 = performance.now();
    const fighting = (s.phase === 'wave' || s.phase === 'break') && !this.hold && !this.paused;
    if (fighting) {
      this.acc += Math.min(dt, 250) * this.speed * this.fx.timeScale();
      let guard = 0;
      const ts = performance.now();
      // (the ultimates: tapped on the hero bar, or on their own with its Auto switch on)
      s.b.autoUlt = !!this.host.meta().ultAuto;
      while (this.acc >= TICK_MS && guard++ < 4) {
        this.acc -= TICK_MS;
        const events = stepStand(s);
        for (const e of events) if (e.kind === 'ultLapse') this.heroBar.lapse(e.by);
        this.fx.show(s.b, events);
        if (bossHit(events, s.b.units)) this.nudge = NUDGE_MS;
        if (s.b.units.length !== this.sprites.size) this.syncSprites();
        playEvents(s.b, events, 1);
        this.takeNotes(events);
        this.sayMoments(events);
        this.grumbleDue();
      }
      if (guard >= 4) this.acc = 0;
      this.perf.sim += performance.now() - ts;
      this.heroBar.build(s.b);
      this.heroBar.refresh(s.b);
      this.fx.step(Math.min(dt, 250));
    } else if (s.phase === 'over') {
      this.acc += dt;
      this.fx.step(dt);
    }
    const t = s.phase === 'deploy' ? performance.now() : s.b.t - TICK_MS + this.acc;
    const view = this.fx.view;
    const tu = performance.now();
    for (const [, sp] of this.sprites) {
      // (a fighter far off the screen is not drawn, and is looked at only now and then)
      const off = sp.x < view.x0 - 80 || sp.x > view.x1 + 80 || sp.y < view.y0 - 120 || sp.y > view.y1 + 80;
      if (off && this.frameN % 8 !== 0) {
        sp.root.visible = false;
        continue;
      }
      sp.update(s.b.board, t, s.phase !== 'deploy');
      if (off) sp.root.visible = false;
    }
    this.perf.sprites += performance.now() - tu;
    if (this.banner.left > 0) {
      this.banner.left -= dt;
      if (this.banner.left <= 0) this.parts.banner.hidden = true;
    }
    this.nudge = Math.max(0, this.nudge - dt);
    const f = fighting || s.phase === 'over';
    this.cx = f ? easeTo(this.cx, this.tx, dt, EASE_MOVE_MS) : this.cx + (this.tx - this.cx) * Math.min(1, dt / 220);
    this.cy = f ? easeTo(this.cy, this.ty, dt, EASE_MOVE_MS) : this.cy + (this.ty - this.cy) * Math.min(1, dt / 220);
    this.scale = Math.abs(this.scale - this.tscale) < 0.004 ? this.tscale : easeTo(this.scale, this.tscale, dt, EASE_ZOOM_MS * 0.6);
    this.clampCam();
    this.place();
    this.refreshHud();
    const spent = performance.now() - t0;
    this.perf.frames++;
    this.perf.total += spent;
    this.perf.worst = Math.max(this.perf.worst, spent);
  }

  /** What a tick told the page: a wave's banner and its sting, a cleared wave's save, a hero's level, a hit on the king, the end. */
  private takeNotes(events: BattleEvent[]): void {
    void events;
    const s = this.s!;
    for (const n of s.notes.splice(0) as StandNote[]) {
      if (n.kind === 'wave') {
        this.showBanner(n.n, n.boss);
        // (a new wave is a new scene for the talking: the king speaks first, and a foe from an edge a few seconds on)
        newQuipScene();
        kingSays(n.boss ? 'bossWave' : 'waveStart', () => this.anchorOf(s.king.id));
        this.grumbleAt = s.b.t + GRUMBLE_AFTER_MS;
        this.grumbleBoss = n.boss;
        this.music(n.n, n.boss);
        if (n.boss) play('standBoss');
        this.picked = null;
        this.drawMarks();
      } else if (n.kind === 'clear') {
        this.save();
        // (the old tower's talking scenes belong to the Last Stand's deep waves now: they play in the break after the wave, and the run waits)
        if ([10, 25, 50].includes(n.n)) {
          this.hold = true;
          void this.host.moment({ kind: 'spire', floor: n.n }).finally(() => (this.hold = false));
        }
        play('victory');
        kingSays('waveCleared', () => this.anchorOf(s.king.id));
        this.refreshBar(true);
        this.drawMarks();
      } else if (n.kind === 'levelup') {
        this.fx.levelUp(n.unit, n.level);
        play('levelUp');
        const kind = s.b.units.find((u) => u.id === n.unit)?.def;
        if (kind) heroSays(kind, 'levelUp', () => this.anchorOf(n.unit));
      } else if (n.kind === 'kingHit') {
        if (this.frameN - this.lastKingHit > 12) {
          play('kingHit');
          this.lastKingHit = this.frameN;
        }
        this.kingHurt = 1;
        // (a few words from the king, thinly spread: a hit now and then, and once his health is low)
        if (s.king.hp > 0 && s.king.hp < s.king.maxHp * KING_LOW_HP) kingSays('lowHp', () => this.anchorOf(s.king.id));
        else kingSays('hurt', () => this.anchorOf(s.king.id));
      } else if (n.kind === 'fallen') {
        // (a hero is down for good: its tile in the bar greys, its body stays where it fell)
        this.refreshBar(true);
      } else if (n.kind === 'hunt') {
        // (the last foes are being run down: nothing to show yet beyond the heroes leaving their posts)
      } else if (n.kind === 'over') {
        kingSays('fallen', () => this.anchorOf(s.king.id));
        this.finish();
      }
    }
  }
  private lastKingHit = -99;
  private kingHurt = 0;
  /** When (battle ms) a foe at an edge grumbles about the wave that has begun, and whether it is a boss wave; null when none waits. */
  private grumbleAt: number | null = null;
  private grumbleBoss = false;

  /** Where to point a speech bubble at a fighter: above its head, in page pixels, or null if it is not on show. */
  private anchorOf(id: number): Anchor | null {
    const sp = this.sprites.get(id);
    if (!sp || !sp.root.visible) return null;
    const box = sp.root.getBounds();
    const r = this.host.app.canvas.getBoundingClientRect();
    const k = r.width / this.host.app.screen.width;
    return { x: r.left + ((box.minX + box.maxX) / 2) * k, y: r.top + box.minY * k };
  }

  /** The heroes' lines in a wave: one casting an ultimate (now and then), one falling under a quarter of their health (once each). The king speaks for himself. */
  private sayMoments(events: BattleEvent[]): void {
    const s = this.s!;
    const speaker = (kind: string): Unit | undefined => s.b.units.find((u) => u.side === 'hero' && u.def === kind && u.owner === undefined && u.id !== s.king.id);
    for (const k of ultimatesCast(s.b, events)) heroSays(k, 'ultimate', () => (speaker(k) ? this.anchorOf(speaker(k)!.id) : null));
    for (const u of closeCalls(s.b, events, s.king.id)) heroSays(u.def, 'lowHp', () => this.anchorOf(u.id));
  }

  /** A foe grumbles when its time comes: the one farthest from the king that is on show (so one near an edge), once a wave. */
  private grumbleDue(): void {
    const s = this.s!;
    if (this.grumbleAt === null || s.b.t < this.grumbleAt) return;
    this.grumbleAt = null;
    standFoeGrumbles(this.grumbleBoss, () => {
      const view = this.fx.view;
      const foes = s.b.units.filter((u) => u.alive && u.side === 'foe' && !UNITS[u.def].summon && this.sprites.get(u.id)?.root.visible);
      const onShow = foes.filter((u) => {
        const sp = this.sprites.get(u.id)!;
        return sp.x > view.x0 + 24 && sp.x < view.x1 - 24 && sp.y > view.y0 + 48 && sp.y < view.y1 - 8;
      });
      const far = [...onShow].sort((a, b) => ringOf(b) - ringOf(a) || a.id - b.id)[0];
      return far ? this.anchorOf(far.id) : null;
    });
  }

  /** The battle music for a wave: a boss wave has the boss track, else one of the three by how deep the run is (`fightTrack`); the track changes only when the wave's would be another. */
  private hold = false;
  private track = '';
  private music(wave: number, boss: boolean): void {
    const mood = { boss, calamity: false, level: fightLevel(wave) };
    const want = fightTrack(mood);
    if (want === this.track) return;
    this.track = want;
    startFight(boss, { level: mood.level });
  }

  private showBanner(n: number, boss: boolean): void {
    const b = this.parts.banner;
    b.replaceChildren(el('small', '', boss ? 'A boss comes' : 'Wave'), el('b', '', boss ? `Wave ${n}` : String(n)));
    b.classList.toggle('boss', boss);
    b.hidden = false;
    this.banner.left = BANNER_MS;
    // (a new element each time so its entrance plays again)
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
  }

  /* -------------------------------------------------------------- the top, the bar, the end */

  private buildSpells(): void {
    const cards = this.parts.cards;
    cards.replaceChildren();
    for (const id of this.host.meta().spellbook.equipped) {
      const sp = SPELLS[id];
      const card = el('button', 'stSpell');
      card.dataset.id = id;
      card.title = sp.text;
      card.innerHTML = `${spellIconHtml(id)}<span>${sp.name}</span><em>${sp.cost}</em><i class="cool"></i>`;
      card.addEventListener('click', () => {
        const s = this.s;
        if (!s || (s.phase !== 'wave' && s.phase !== 'break')) return;
        if (sp.target === 'all') {
          if (castSpell(s.b, id, 0, 0)) play('spell');
        } else this.spell = this.spell === id ? null : canAfford(s.b, id) ? id : this.spell;
        this.refreshSpells();
      });
      cards.append(card);
    }
  }

  private refreshSpells(): void {
    const s = this.s;
    if (!s) return;
    const b = s.b;
    if (this.spell && !canAfford(b, this.spell)) this.spell = null;
    ((this.parts.mana.querySelector('i span')) as HTMLElement).style.width = `${(b.spells.mana / MANA_MAX) * 100}%`;
    this.text('mana', this.parts.mana.querySelector('b'), `${Math.floor(b.spells.mana)}/${MANA_MAX}`);
    for (const card of this.parts.cards.children as HTMLCollectionOf<HTMLElement>) {
      const id = card.dataset.id as SpellId;
      // (Resurrect has nobody to lift in the Last Stand: the fallen stay down)
      card.classList.toggle('dim', !canAfford(b, id) || id === 'resurrect');
      card.classList.toggle('armed', this.spell === id);
      (card.querySelector('.cool') as HTMLElement).style.height = `${(cooldownLeft(b, id) / SPELLS[id].cooldownMs) * 100}%`;
    }
  }

  /** Everything the top bar and the break's countdown show, from the run as it stands. */
  private refreshHud(): void {
    const s = this.s!;
    const run = s.run;
    const p = this.parts;
    const wave = s.phase === 'deploy' ? run.wave : s.phase === 'break' ? run.wave : run.wave;
    this.text('wave', p.wave.querySelector('span'), String(wave));
    const boss = (s.phase === 'wave' || s.phase === 'deploy' || s.phase === 'break') && wave % 5 === 0;
    this.text('boss', p.wave.querySelector('em'), boss ? 'Boss' : s.phase === 'wave' ? `${foesAlive(s) + s.queue.length} foes` : '');
    const k = s.king;
    (p.king.querySelector('i span') as HTMLElement).style.width = `${Math.max(0, (k.hp / k.maxHp) * 100)}%`;
    this.text('kinghp', p.king.querySelector('b'), `${Math.max(0, Math.ceil(k.hp))} / ${k.maxHp}`);
    p.king.classList.toggle('low', k.hp < k.maxHp * 0.35);
    p.king.classList.toggle('hit', this.kingHurt > 0);
    this.kingHurt = Math.max(0, this.kingHurt - 0.05);
    this.text('gold', p.gold.querySelector('span'), String(run.gold));
    const brk = s.phase === 'break';
    p.count.hidden = !(brk || s.phase === 'deploy');
    p.count.classList.toggle('deploy', s.phase === 'deploy');
    if (brk) {
      this.text('count', p.count.querySelector('b'), (Math.max(0, s.breakLeft) / 1000).toFixed(1));
      const spec = waveSpec(run.seed, run.armies, run.wave, run.hall);
      this.text('next', p.count.querySelector('i'), `${spec.boss ? 'Boss wave · ' : ''}${spec.foes.length} foes from the ${spec.edges.join(', ')}`);
      (p.count.querySelector('small') as HTMLElement).textContent = 'Next wave in';
      this.arrows(spec.edges);
    } else if (s.phase === 'deploy') {
      this.text('count', p.count.querySelector('b'), `Wave ${run.wave}`);
      const spec = waveSpec(run.seed, run.armies, run.wave, run.hall);
      this.text('next', p.count.querySelector('i'), `${spec.foes.length} foes from the ${spec.edges.join(', ')}. Tap a hero, then a tile, to move its post.`);
      (p.count.querySelector('small') as HTMLElement).textContent = 'First up';
      this.arrows(spec.edges);
    } else this.arrows([]);
    (p.go as HTMLButtonElement).hidden = !brk;
    p.start.hidden = s.phase !== 'deploy';
    p.pause.hidden = s.phase !== 'wave' && s.phase !== 'break';
    p.spells.hidden = !this.host.meta().spellbook.equipped.length || s.phase === 'deploy' || s.phase === 'over';
    p.heroes.hidden = s.phase === 'deploy' || s.phase === 'over';
    if (!p.heroes.hidden) {
      this.heroBar.setAuto(!!this.host.meta().ultAuto);
      this.heroBar.build(s.b);
    }
    if (!p.spells.hidden) this.refreshSpells();
    this.refreshBar(false);
  }

  /** The arrows at the screen's rim that point to the edges a wave is coming in by (none when `edges` is empty). */
  private arrows(edges: readonly Edge[]): void {
    const key = edges.join();
    const list = [...this.parts.arrows.children] as HTMLElement[];
    const room = this.room;
    const [kx, ky] = at(KING_AT.u, KING_AT.v, 4);
    const k = this.scale;
    const cx = this.world.x + kx * k;
    const cy = this.world.y + ky * k;
    EDGES.forEach((e, i) => {
      const a = list[i];
      const on = edges.includes(e);
      if (a.hidden === on) a.hidden = !on;
      if (!on) return;
      const [dx, dy] = EDGE_DIR[e];
      // (from the king's place on the screen along the way of the edge, out to the rim of the room)
      const tx = dx > 0 ? (room.w - 36 - cx) / dx : (24 - cx) / dx;
      const ty = dy > 0 ? (room.y + room.h - 36 - cy) / dy : (room.y + 24 - cy) / dy;
      const r = Math.max(0, Math.min(tx, ty));
      const x = Math.max(24, Math.min(room.w - 24, cx + dx * r));
      const y = Math.max(room.y + 24, Math.min(room.y + room.h - 24, cy + dy * r));
      a.style.transform = `translate(${Math.round(x - 18)}px, ${Math.round(y - 18)}px) rotate(${Math.round((Math.atan2(dy, dx) * 180) / Math.PI)}deg)`;
    });
    void key;
  }

  /** The buttons of the bar (their prices and whether they can be paid), the offered relics and the picked hero's card. */
  private refreshBar(force: boolean): void {
    const s = this.s!;
    const run = s.run;
    const bar = this.parts.bar;
    const over = s.phase === 'over';
    const lvlB = bar.querySelector('.level') as HTMLButtonElement;
    const healB = bar.querySelector('.heal') as HTMLButtonElement;
    const sig = [run.gold, s.phase, run.offer.join(), this.picked, s.king.hp, run.heroes.map((h) => h.lv).join(), run.wave].join('|');
    if (!force && this.shown.get('bar') === sig) return;
    this.shown.set('bar', sig);
    const target = this.picked !== null ? run.heroes.find((h) => h.id === this.picked) : weakestHero(s);
    lvlB.disabled = over || levelBlock(s, target?.id) !== null;
    lvlB.querySelector('span')!.textContent = this.picked !== null && target ? `Level up ${UNITS[target.kind].name}` : 'Level up';
    lvlB.querySelector('em')!.textContent = target ? `${levelCost(target.lv)} gold` : '';
    healB.disabled = over || s.king.hp >= s.king.maxHp || run.gold < healCost(run.wave);
    healB.querySelector('em')!.textContent = `${healCost(run.wave)} gold`;
    // the relics on offer
    const offer = this.parts.offer;
    offer.replaceChildren();
    offer.hidden = !run.offer.length || over;
    const price = offerCost(s);
    run.offer.forEach((id, i) => {
      const b = el('button', 'stRelic');
      b.title = relicLine(id);
      b.append(el('span', '', RELICS[id].name), el('small', '', RELICS[id].text), el('em', '', `${price} gold`));
      b.disabled = run.gold < price;
      b.addEventListener('click', () => this.buy(() => buyRelic(s, i) !== null));
      offer.append(b);
    });
    this.refreshInfo();
  }

  /** The card of the hero picked: who it is, its level and health, and what to do next. */
  private refreshInfo(): void {
    const s = this.s!;
    const info = this.parts.info;
    const h = this.picked !== null ? s.run.heroes.find((x) => x.id === this.picked) : null;
    info.hidden = !h;
    if (!h) return;
    const u = s.b.units.find((x) => x.tag === h.id);
    info.textContent = `${UNITS[h.kind].name} · level ${h.lv}${u ? ` · ${Math.max(0, Math.ceil(u.hp))}/${u.maxHp}` : ' · on the bench'}. Tap a tile to move its post.`;
  }

  /** Pause (the sim stops; the sheet of the heroes shows) or resume from where it stood. */
  private setPaused(on: boolean): void {
    const s = this.s;
    if (!s || (on && s.phase !== 'wave' && s.phase !== 'break')) return;
    this.paused = on;
    this.acc = 0;
    if (on) this.drawSheet();
    this.parts.sheet.hidden = !on;
    play('tap');
  }

  /** The pause sheet (`standSheet`): the king, then each hero's level, health, pool, attack and defence, kills, skills and ultimate. */
  private drawSheet(): void {
    const s = this.s!;
    const sh = standSheet(s);
    const box = this.parts.sheet;
    box.replaceChildren();
    const card = el('div', 'stCard stSheetCard');
    card.append(el('h2', '', 'Paused'), el('p', 'stDim', `Wave ${sh.wave} · the king ${sh.king.hp} / ${sh.king.maxHp} · ${sh.gold} gold`));
    const list = el('div', 'stSheetList');
    for (const h of sh.heroes) {
      const row = el('div', `stSheetRow${h.fallen ? ' fallen' : ''}`);
      const head = el('div', 'stSheetHead');
      head.append(el('span', '', h.name), el('em', '', h.fallen ? 'Fallen' : `Lv ${h.level}${h.runLv ? ` +${h.runLv}` : ''}`));
      const facts = el('div', 'stSheetFacts');
      const pool = h.pool ? `${h.pool.kind === 'mana' ? 'Mana' : 'Stamina'} ${h.pool.now}/${h.pool.max}` : '';
      facts.textContent = `Health ${h.hp}/${h.maxHp} · ${pool} · Attack ${h.atk} · Defence ${h.def} · Kills ${h.kills}`;
      const skills = el('div', 'stSheetSkills');
      const words = h.skills.map((k) => `${k.name} (${k.open ? `${k.cost}${k.paid ? ', ready' : ''}` : `Lv ${k.opens}`})`);
      if (h.ult) words.push(`Ultimate: ${h.ult.name} (${!h.ult.open ? `Lv ${h.ult.opens}` : h.ult.ready ? 'ready' : `${Math.round(h.ult.meter * 100)}%`})`);
      skills.textContent = words.join(' · ');
      row.append(head, facts, skills);
      list.append(row);
    }
    const go = el('button', 'primary', 'Resume');
    go.addEventListener('click', () => this.setPaused(false));
    card.append(list, go);
    box.append(card);
  }

  /** The king has fallen: the run is paid, and the end screen shows what it came to. */
  private finish(): void {
    const s = this.s!;
    const m = this.host.meta();
    this.summary = settleStand(m, s.run, s.run.armies);
    saveMeta(m);
    dropStand();
    const end = this.parts.end;
    end.replaceChildren();
    const card = el('div', 'stCard');
    const sum = this.summary!;
    card.append(el('h2', '', 'The king has fallen'), el('p', 'stBig', `Wave ${sum.best}`), el('p', 'stDim', sum.newBest ? 'A new best wave!' : `Best wave: ${m.stand ?? sum.best}`));
    const rows = el('div', 'stFacts');
    const row = (a: string, b: string) => rows.append(Object.assign(el('div'), { innerHTML: `<span>${a}</span><b>${b}</b>` }));
    row('Waves cleared', String(sum.cleared));
    row('Foes felled', String(sum.kills));
    row('Crowns', `+${sum.crowns}`);
    const chests = [sum.bronze && `${sum.bronze} bronze`, sum.silver && `${sum.silver} silver`, sum.gold && `${sum.gold} gold`].filter(Boolean).join(', ');
    if (chests) row('Chests', chests);
    if (sum.gear.length) row('Equipment', sum.gear.join(', '));
    row('Heroes held', String(sum.heroes));
    card.append(rows);
    const btns = el('div', 'stRow');
    const again = el('button', 'primary', 'Stand again');
    again.addEventListener('click', () => void this.open());
    const home = el('button', '', 'Home');
    home.addEventListener('click', () => this.leave());
    btns.append(again, home);
    card.append(btns);
    end.append(card);
    window.setTimeout(() => {
      end.hidden = false;
    }, 900);
    play('defeat');
  }

  /** For tests and screenshots: the pause sheet of the run in play. */
  get sheet(): ReturnType<typeof standSheet> | null {
    return this.s ? standSheet(this.s) : null;
  }

  /** For tests and screenshots: the run in play. */
  get state(): Stand | null {
    return this.s;
  }

  /** For the screenshots and a quick look: carry the run to a wave at once (nothing is paid; the heroes and gold are as given). */
  debugJump(wave: number, hero: number): void {
    const s = this.s;
    if (!s) return;
    s.run.wave = wave;
    for (const h of s.run.heroes) h.lv = hero;
    this.shown.clear();
  }

  /** Skip over the first `n` ticks of the run at once, as a fast-forward (the screenshots use it). */
  debugRun(ms: number): void {
    const s = this.s;
    if (!s) return;
    for (let t = 0; t < ms; t += TICK_MS) {
      const ev = stepStand(s);
      this.fx.show(s.b, ev);
      this.takeNotes(ev);
    }
    this.syncSprites();
  }
}
