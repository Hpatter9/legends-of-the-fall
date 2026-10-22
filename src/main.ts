// Legends of the Fall: the phone page. The board is drawn with Pixi; the bench, the buttons and the banners are plain
// page elements over it. Before the fight the heroes are dragged (or tapped, then a tile tapped) from the bench onto
// the blue tiles; then the fight plays itself, a fixed tick at a time.

import { Application, Container, Sprite, TextureSource } from 'pixi.js';
import { D, standable, tileAt } from './sim/board';
import { canPlace, fight, heroesPlaced, isDeployTile, place, stepBattle, TICK_MS, unitAt, unplace, type Battle, type Boost, type Unit } from './sim/battle';
import { mvpOf, startStats, STAT_KEYS, tally, type FightStats } from './sim/fightStats';
import { armyOfRun, armyRun, benchFull, boostOf, canRetry, finish, heroOf, hireBlock, isBossRun, keepCharges, loadRun, noteFight, paidOf, recycle, recycleValue, retriesLeft, retryGold, retryWave, saveRun, setSquad, SQUAD, startStage, summon, summonCost, tierOfRun, type Owned, type Run } from './sim/run';
import { noteFightStats, notePayout, recapOf } from './sim/runRecap';
import { showRecap } from './recapView';
import { ARMIES, armyById, armyUnlocked, settleWave, type ArmyPay } from './sim/armies';
import { drawRunStars, showUnlock } from './armiesView';
import { spellIconHtml } from './spellIcons';
import { settleArmyRun, type StarResult } from './sim/armyStars';
import { tierOf } from './sim/tiers';
import { formOf, UNITS } from './sim/units';
import { ELITE_BY_ID } from './sim/elites';
import { isBoss } from './sim/foes';
import { earn, loadMeta, rankOf, rarityOf, recordStars, saveMeta, type Meta } from './sim/meta';
import { xpRate } from './sim/castle';
import { heroStats } from './sim/talents';
import { powerOf, powerText } from './sim/power';
import { fightXp, gainXp, levelGain, levelOfKind, progressOf, xpOf, type LevelUp } from './sim/levels';
import { ratingOf, STAR_CROWNS, STAR_GOLD, type Rating } from './sim/stars';
import { autoDeploy, autoRound, gearCount, pickSquad } from './sim/autoplay';
import { afterFight, maxSpeed, startAuto, stopAuto, type AutoReplay } from './sim/autoReplay';
import { Gacha } from './gacha';
import { Events } from './events';
import { TowerView } from './towerView';
import { showTwistBanner } from './twistView';
import { finishTower, migrateTower, settleTower } from './sim/tower';
import { hpShare } from './sim/health';
import { Home } from './home';
import { Party } from './party';
import { dailyInProgress, modeNote, settleRun, startDaily, towerRun } from './sim/modes';
import { toastAchievements } from './achievementsView';
import { clockSeed, todayKey } from './modes';
import { tips, type Box } from './tips';
import { CHARGE_MAX, kitOf } from './sim/abilities';
import { keepAwake } from './render/awake';
import { canAfford, castSpell, cooldownLeft, MANA_MAX, SPELLS, type SpellId } from './sim/spells';
import { bindSpellbook } from './spellbook';
import { setBackdrop, panBackdrop } from './render/backdrop';
import { BoardView, loadBoardArt } from './render/boardView';
import { countTraits, kindsOf, traitsOf, TRAITS } from './sim/traits';
import { UnitSprite } from './render/unitView';
import { flyUp, recyclePuff, summonBurst } from './render/uiFx';
import { Fx, loadFx } from './render/fx';
import { framesOf, loadSheets, portrait, sheetInfo } from './render/sheets';
import { easeTo, EASE_MOVE_MS, EASE_ZOOM_MS, framing, PAUSE_MS, settle, viewFor, type View } from './render/cameraRules';
import { titleOf } from './render/bossTitles';
import { at, FOOT, HH, TH, TW } from './render/iso';
import { bindDuck, bindMute, play, playEvents, setAct, setScene, setup, startFight } from './render/sound';
import { sceneOf } from './render/audioRules';
import { colLeft, viewH, viewW } from './viewport';
import { onSettings, openSettings, settings } from './settings';

TextureSource.defaultOptions.scaleMode = 'nearest';

/** How much bigger the fighters show upright than when the whole board fits the width. */
const ZOOM = 1.6;
/** A boss's title card: how long it stays (ms), and how much the camera zooms in on the boss. */
const INTRO_MS = 2400;
/** When the ribbon slams down inside the intro (ms): the rumble and the boom. */
const SLAM_MS = 850;
/** How far the follow camera may zoom in, in multiples of the layout's scale (out is to the whole board's width). */
const FOLLOW_IN = 1.7;
const INTRO_ZOOM = 0.25;
/** How long the board stays on show after the last kill before the wave recap comes up (ms). */
const END_WAIT_MS = 2000;
const STAT_LABELS: Record<(typeof STAT_KEYS)[number], string> = { dealt: 'Dealt', taken: 'Taken', healed: 'Healed', kills: 'Kills' };

/** The spells that hurt foes (their 3x3 shows red). */
const HURTING = new Set<SpellId>(['meteor', 'smite', 'chain', 'poison', 'frost']);

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
  private towerView!: TowerView;
  /** The fight just settled was a tower boss (for the banner). */
  private bossDown = false;
  private home!: Home;
  private party!: Party;
  /** Crowns the last settled fight paid. */
  private crownGain = 0;
  /** Whether the fight's end has been settled into the run. */
  private settled = false;
  /** How long the fight has been over (ms): the recap waits `END_WAIT_MS` after the last kill, so the deaths play out. */
  private endWait = 0;
  /** A wave was lost and the player is choosing between a retry and giving up: nothing is settled yet. */
  private pendingLoss = false;
  /** What an army's last settled fight paid (null for any other run). */
  private pay: ArmyPay | null = null;
  /** Gold the last win paid (for the result screen). */
  private gain = 0;
  /** Where each hero (by roster id) was placed, so the next stage puts them back. */
  private placed = new Map<string, [number, number]>();
  private chosen: string | null = null;
  private drag: Drag | null = null;
  private hover: [number, number] | null = null;
  private speed: 1 | 2 | 3 = 1;
  private acc = 0;
  private scale = 1;
  /** The spell card chosen, waiting for a tile. */
  private spell: SpellId | null = null;
  /** The fight's numbers for each hero, tallied as the ticks come in. */
  private stats: FightStats = [];
  /** A boss's title card: how long it has been on, and the boss it is about. */
  private intro: { t: number; boss: Unit; slammed: boolean } | null = null;
  /** The stages whose boss has had its card this session (a stage's card plays once). */
  private introduced = new Set<string>();
  /** The auto-replay going on, if any (`sim/autoReplay.ts`); it plays the waves and starts the next runs from the frame loop, so a hidden tab (no frames) pauses it. */
  private auto: AutoReplay | null = null;
  /** Real milliseconds until the auto-replay's next step (the pause after the heroes are placed, and after a fight). */
  private autoWait = 0;
  /** What the auto-replay does when the wait is over, after the fight it just settled: the next wave, a new run, or the end. */
  private autoNext: 'wave' | 'run' | 'end' | null = null;

  async start(): Promise<void> {
    await this.app.init({ resizeTo: $('stage'), backgroundAlpha: 0, antialias: false, roundPixels: true, autoDensity: true, resolution: Math.min(3, devicePixelRatio || 1) });
    $('stage').appendChild(this.app.canvas);
    // (the fonts first, so the first damage number is not drawn in a fallback face; a slow load gives up after a moment)
    const fonts = Promise.all(['900 16px "Cinzel Decorative"', '700 16px "Alegreya Sans"', '16px "Press Start 2P"'].map((f) => document.fonts.load(f))).catch(() => {});
    await Promise.all([loadSheets(), loadBoardArt(), loadFx(), Promise.race([fonts, new Promise((ok) => setTimeout(ok, 2500))])]);
    this.world.sortableChildren = true;
    this.boardView.keep.push(this.fx.dimLayer, this.fx.root);
    this.boardView.root.addChild(...this.boardView.keep);
    this.world.addChild(this.boardView.root);
    this.ghost.anchor.set(0.5, 1);
    this.ghost.alpha = 0.85;
    this.ghost.visible = false;
    this.app.stage.addChild(this.world, this.ghost, this.fx.flashLayer);
    const query = new URLSearchParams(location.search);
    const seed = Number(query.get('seed'));
    this.meta = loadMeta((Date.now() % 100000) + 1);
    saveMeta(this.meta);
    // (a fresh page with no saved run shows the first army's board behind the home screen)
    this.run = (!seed && loadRun()) || armyRun(seed || (Date.now() % 100000) + 1, ARMIES[0].id, this.meta.party, this.meta.castle);
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
      runInfo: () => {
        const r = loadRun();
        if (!r || r.over) return null;
        const army = armyOfRun(r);
        const label = army ? `${army.name} · wave ${r.stage}/${army.waves.length}` : r.mode?.kind === 'daily' ? 'daily challenge' : r.mode?.kind === 'tower' ? `tower · act ${r.tower?.act ?? 1}, floor ${r.stage}` : `stage ${r.stage}`;
        return { stage: r.stage, gold: r.gold, army: army?.id, label };
      },
      onContinue: () => this.resume(),
      // (an army starts from wave 1 once its party is picked)
      onArmy: (id, tier, auto) =>
        this.party.open('start', () => {
          this.startRun(armyRun(clockSeed(), id, this.meta.party, this.meta.castle, tier));
          if (auto) this.beginAuto(id, tier, auto);
        }),
      onParty: () =>
        this.party.open('edit', () => {
          // (a run going on draws from the new party from now on)
          this.syncPool();
          if (loadRun()) saveRun(this.run);
          this.home.open();
        }),
      onRecruit: () => this.gacha.open(),
      onSummon: (n, play) => this.gacha.summon(n, play),
      onDaily: () => {
        if (dailyInProgress(loadRun(), todayKey())) return this.resume();
        this.startRun(startDaily(this.meta, todayKey()));
      },
      onTower: () => this.startTower(towerRun(clockSeed(), this.meta)),
      onScene: () => this.syncScene(),
    });
    this.towerView = new TowerView({
      meta: () => this.meta,
      events: this.events,
      onFight: () => {
        saveRun(this.run);
        this.newBattle();
      },
      onPack: () => this.events.openPack(this.run, true, () => saveRun(this.run)),
      onHome: () => this.home.open(),
    });
    this.party = new Party(this.meta, () => this.home.open());
    bindSpellbook(this.meta, () => {
      saveMeta(this.meta);
      this.home.refresh();
    });
    this.wire();
    this.newBattle();
    // (the game opens on the castle, unless a seed is given in the address)
    if (!seed) this.home.open();
    this.app.ticker.add((tk) => this.frame(tk.deltaMS));
    // (battery saver caps the frame rate at 30)
    onSettings((s) => (this.app.ticker.maxFPS = s.saver ? 30 : 0));
    window.addEventListener('resize', () => this.layout());
    // (the home screen covers the board, so the board is not drawn while it is up: the canvas cost nothing but heat and battery behind it)
    const home = $('home');
    const sync = () => {
      this.homeUp = !home.hidden;
      this.syncAct();
      this.syncScene();
      this.app.stage.renderable = !this.homeUp;
      // (a board that is not in a fight stops its ticker under the home screen; coming back starts it again)
      if (!this.homeUp) this.app.ticker.start();
      else if (this.b.phase !== 'fight') this.app.ticker.stop();
    };
    // (the tips on the home screen are still looked after, a few times a second)
    setInterval(() => this.homeUp && tips.update(), 250);
    new MutationObserver(sync).observe(home, { attributes: true, attributeFilter: ['hidden'] });
    sync();
    // (the tower's map comes and goes without the home screen changing: the ambience follows it too)
    new MutationObserver(() => this.syncScene()).observe($('towerMap'), { attributes: true, attributeFilter: ['hidden'] });
    $('loading').remove();
    (window as unknown as { __game: Game }).__game = this;
  }

  /* -------------------------------------------------------------- the fight */

  /** A fresh fight for the run's stage, with the squad back where it stood (or on the first free tiles). */
  private newBattle(): void {
    this.b = startStage(this.run);
    this.settled = false;
    this.endWait = 0;
    this.pendingLoss = false;
    for (const id of [...this.run.squad]) {
      const h = heroOf(this.run, id);
      if (!h) continue;
      // (a spot from the last fight may be a boulder or a foe's now: a floor's twist can change the deploy rows)
      const was = this.placed.get(String(id));
      const at = was && canPlace(this.b, h.kind, was[0], was[1], id) ? was : this.freeTile();
      if (at && place(this.b, h.kind, at[0], at[1], id, this.boostFor(h))) this.placed.set(String(id), at);
      else setSquad(this.run, id, false);
    }
    this.acc = 0;
    this.chosen = null;
    this.spell = null;
    this.buildSpells();
    // (an auto-replay keeps the speed it is at from wave to wave)
    this.setSpeed(this.auto ? this.speed : settings().speed);
    this.fx.clear();
    this.boardView.build(this.b.board);
    setBackdrop(this.b.board.area);
    showTwistBanner(this.run.tower?.cur?.fight?.twist);
    this.syncSprites(true);
    this.layout();
    this.refresh();
    this.startIntro();
  }

  /** A boss stage's first time: the screen dims, the boss's portrait slides in, its name on a ribbon slams down with its title, and the camera glides to it. Once per stage (a restart of the same fight does not replay it). */
  private startIntro(): void {
    const key = `${this.run.seed}:${this.run.stage}`;
    // (a boss, or the named elite of an elite node, gets the card)
    const elite = this.run.tower?.cur?.fight?.elite ? ELITE_BY_ID[this.run.tower.cur.fight.elite] : undefined;
    const boss = this.b.units.find((u) => u.side === 'foe' && (isBoss(u.def) || (elite && u.def === elite.def)));
    if (!boss || this.introduced.has(key)) return;
    this.introduced.add(key);
    this.intro = { t: 0, boss, slammed: false };
    const card = $('bossCard');
    const def = UNITS[boss.def];
    card.classList.toggle('elite', !!elite);
    card.querySelector('b')!.textContent = (elite ? elite.name : def.name).toUpperCase();
    card.querySelector('span')!.textContent = elite ? elite.epithet : titleOf(boss.def);
    // (the portrait is cropped from the sheet and scaled up by a whole number, so its pixels stay square)
    const info = sheetInfo(def.sheet);
    const side = info ? Math.min(info.figure + 6, info.h) : 64;
    // (about 48% of the width; at least once over, at most 90% of the width)
    const want = viewW() * 0.48;
    const n = Math.max(1, Math.min(Math.round(want / side), Math.floor((viewW() * 0.9) / side)));
    const old = card.querySelector('canvas')!;
    const face = portrait(def.sheet, side * n);
    // (the sheets face right; a boss that faces left looks the other way)
    face.style.width = face.style.height = `${side * n}px`;
    if (info && !info.facesRight) face.style.transform = 'scaleX(-1)';
    old.replaceWith(face);
    card.classList.remove('out');
    card.hidden = false;
    if (elite) play('eliteSting');
  }

  /** Each frame of the intro: the slam (a rumble and a boom, the rumble only if shaking is on), the camera on the boss with the zoom swelling and falling back, and the card fading out. */
  private stepIntro(dt: number): void {
    const it = this.intro!;
    it.t += dt;
    if (it.t >= INTRO_MS) return this.endIntro();
    if (!it.slammed && it.t >= SLAM_MS) {
      it.slammed = true;
      this.fx.rumble(0.8);
      play('boom');
    }
    this.fx.step(dt);
    if (it.t > INTRO_MS - 400) $('bossCard').classList.add('out');
    const { u, v } = it.boss;
    const [x, y] = at(u, v, tileAt(this.b.board, u, v)?.h ?? 0);
    this.tx = x;
    this.ty = y;
    this.zoom = 1 + INTRO_ZOOM * Math.min(1, it.t / 500, (INTRO_MS - it.t) / 500);
    this.tzoom = this.zoom;
  }

  /** The card goes (a tap, or its time is up) and the camera returns to where the phase has it. */
  private endIntro(): void {
    if (!this.intro) return;
    this.intro = null;
    this.zoom = this.tzoom = 1;
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
    startFight(isBossRun(this.run));
    keepAwake(true);
    this.chosen = null;
    this.boardView.clearMarks();
    this.refreshBossBar();
    this.layout();
    this.refresh();
  }

  /** The home screen is up over the board (nothing of the board is seen, so a board not in a fight is left alone). */
  private homeUp = false;

  private frame(dt: number): void {
    const b = this.b;
    tips.update();
    if (this.homeUp && b.phase !== 'fight') {
      this.app.ticker.stop();
      return;
    }
    if (this.auto) this.autoTick(dt);
    if (b.phase === 'fight') {
      // (a boss's fall slows the fight for a beat: `timeScale`)
      this.acc += Math.min(dt, 250) * this.speed * this.fx.timeScale();
      while (this.acc >= TICK_MS && b.phase === 'fight') {
        this.acc -= TICK_MS;
        const events = stepBattle(b);
        tally(this.stats, events, b.units);
        this.fx.show(b, events);
        // (a fighter a skill called up mid-fight has no sprite yet: make it, with its entrance)
        if (b.units.length !== this.sprites.size) this.syncSprites();
        playEvents(b, events, this.speed);
        if (events.some((e) => e.kind === 'hit')) this.refreshBench();
        if (b.phase !== 'fight') this.refresh();
      }
      this.fx.step(Math.min(dt, 250) * this.speed);
      $('clock').textContent = clock(b.t);
      this.refreshSpells();
    } else if (b.phase !== 'deploy') {
      // (the fallen finish falling after the end; the recap comes up once the wait is over)
      this.acc += dt;
      this.fx.step(dt);
      if (this.endWait < END_WAIT_MS) {
        this.endWait += dt;
        if (this.endWait >= END_WAIT_MS) this.refresh();
      }
    }
    if (this.intro) this.stepIntro(dt);
    this.refreshBossBar();
    const t = b.phase === 'deploy' ? performance.now() : b.phase === 'fight' ? b.t - TICK_MS + this.acc : b.t + this.acc;
    for (const s of this.sprites.values()) s.update(b.board, t, b.phase !== 'deploy');
    // (the camera eases to where it is sent, unless a finger is holding the board)
    if (b.phase === 'fight' && !this.intro) this.follow();
    if (!this.drag?.pan) {
      const f = b.phase === 'fight' && !this.intro;
      this.cx = f ? easeTo(this.cx, this.tx, dt, EASE_MOVE_MS) : this.cx + (this.tx - this.cx) * Math.min(1, dt / 220);
      this.cy = f ? easeTo(this.cy, this.ty, dt, EASE_MOVE_MS) : this.cy + (this.ty - this.cy) * Math.min(1, dt / 220);
      if (f) this.zoom = easeTo(this.zoom, this.tzoom, dt, EASE_ZOOM_MS);
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
        // (a hero set down on a tile puffs its dust)
        if (u.side === 'hero' && this.b.phase === 'deploy') this.fx.landing(this.b, u.u, u.v);
        else if (this.b.phase === 'fight') this.fx.summoned(this.b, u);
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
  /** Where the zoom is heading, the view the follow camera is holding (its dead zone), and when it may follow again after a manual move. */
  private tzoom = 1;
  private held: View | null = null;
  private pausedUntil = 0;
  private bbox = { x0: 0, x1: 0, y0: 0, y1: 0 };

  /** The fight camera: frame the living fighters, zoomed in as far as fits, holding still for small moves. A manual pan pauses it for a few seconds. */
  private follow(): void {
    if (performance.now() < this.pausedUntil) return;
    const spots = this.b.units.filter((u) => u.alive).flatMap((u) => this.sprites.get(u.id) ?? []);
    const box = framing(spots);
    if (!box) return;
    // (never wider than the board's own width, never closer than a little over the layout's scale, so pixels stay a sensible size)
    const lo = this.minZoom();
    const want = viewFor(box, this.area.w, this.area.h, this.scale, lo, Math.max(lo, Math.min(FOLLOW_IN, 3 / this.scale)));
    this.held = this.held ? settle(this.held, want) : want;
    this.tx = this.held.cx;
    this.ty = this.held.cy;
    this.tzoom = this.held.zoom;
  }

  /** The least zoom of the fight camera: the whole board across the room (the layout's scale upright is zoomed in past that). */
  private minZoom(): number {
    const { x0, x1 } = this.bbox;
    return Math.min(1, (this.area.w - 20) / (x1 - x0) / this.scale);
  }

  /** Fit the board into the room the bench and the top bar leave: it is zoomed in and panned. */
  private layout(): void {
    this.fx.fitScreen(viewW(), viewH());
    const top = $('top').getBoundingClientRect();
    const panel = $('panel').getBoundingClientRect();
    const bar = $('bossBar');
    bar.style.top = `${top.bottom + 4}px`;
    bar.style.right = '12px';
    // (a floor's twist banner sits under the top bar; the bar for a boss goes below it)
    const twist = $('twistBanner');
    twist.style.top = `${top.bottom + 2}px`;
    const below = twist.hidden ? top.bottom : twist.getBoundingClientRect().bottom + 2;
    bar.style.top = `${below + 4}px`;
    const head = bar.hidden ? below : bar.getBoundingClientRect().bottom + 4;
    const area = { x: 0, y: head, w: viewW(), h: panel.top - head };
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
    const k = Math.min(3, fit * ZOOM);
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
    this.held = null;
    this.tzoom = this.zoom = 1;
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
    const hw = this.area.w / 2 / (this.scale * this.zoom);
    const hh = this.area.h / 2 / (this.scale * this.zoom);
    const lim = (c: number, lo: number, hi: number, half: number, slack = 0) =>
      hi - lo <= half * 2 ? Math.min((lo + hi) / 2 + slack, Math.max((lo + hi) / 2 - slack, c)) : Math.min(hi - half + slack, Math.max(lo + half - slack, c));
    // (up and down there is some give past the board's edge, so any row can be dragged clear of the bench and the top bar)
    const give = hh * 0.45;
    this.cx = lim(this.cx, x0, x1, hw);
    this.cy = lim(this.cy, y0, y1, hh, give);
    this.tx = lim(this.tx, x0, x1, hw);
    this.ty = lim(this.ty, y0, y1, hh, give);
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
    // (the labels may use the board's room on the screen, in world px)
    const w = this.world;
    this.fx.view = { x0: (0 - w.x) / k + 4, x1: (viewW() - w.x) / k - 4, y0: (this.area.y - w.y) / k + 4, y1: (this.area.y + this.area.h - w.y) / k };
  }

  /** The tile under a point on the screen (the nearest column's top or side). */
  private tileAtScreen(sx: number, sy: number): [number, number] | null {
    const b = this.b.board;
    const wx = (sx - colLeft() - this.world.x) / this.world.scale.x;
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
    const wx = (sx - colLeft() - this.world.x) / this.world.scale.x;
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
    // (the music dips under menus, sheets, the boss card and the event cards while they show)
    for (const id of ['settings', 'hmSheet', 'hmSub', 'ptSheet', 'autoSum']) bindDuck($(id), 'sheet');
    bindDuck($('bossCard'), 'boss');
    bindDuck($('events'), 'event');
    $('fight').addEventListener('click', () => this.begin());
    $('summon').addEventListener('click', () => {
      const before = new Set(this.run.roster.map((h) => h.id));
      const got = summon(this.run);
      if (got) {
        saveRun(this.run);
        play(got.grade > 1 ? 'merge' : 'summon');
        // (a lucky hire, already a higher star: a sparkle over the merge's chime)
        if (got.grade > 1) play('sparkle');
        this.clearMerged(got);
      }
      // (a hero of a higher grade that wasn't there before is a merge's: it flashes)
      this.evolved = new Set(this.run.roster.filter((h) => h.grade > 1 && !before.has(h.id)).map((h) => h.id));
      this.refresh();
      const card = got ? $('bench').querySelector<HTMLElement>(`[data-id="${got.id}"]`) : null;
      if (card) summonBurst(card, got ? rarityOf(got.kind) : 1);
    });
    $('homeBtn').addEventListener('click', () => this.home.open());
    $('retry').addEventListener('click', () => this.retry());
    $('next').addEventListener('click', () => {
      // (a wave lost with retries left: giving up settles it, and the run's recap follows)
      if (this.pendingLoss) {
        this.pendingLoss = false;
        this.refresh();
        return this.showRunRecap();
      }
      if (this.run.over && !this.run.tower && !this.auto) return this.showRunRecap();
      this.afterResult();
    });
    $('pack').addEventListener('click', () =>
      this.events.openPack(
        this.run,
        this.b.phase === 'deploy',
        () => {
          // (the gear changes the placed heroes' stats: the stage starts again with the squad where it stood)
          saveRun(this.run);
          this.newBattle();
        },
        // (only the heroes on the field are listed)
        this.fielded(),
      ),
    );
    $('bossCard').addEventListener('click', () => this.endIntro());
    $('speed').addEventListener('click', () => this.setSpeed(this.speed >= this.fastest() ? 1 : ((this.speed + 1) as 2 | 3)));
    $('auto').addEventListener('click', () => this.autoArrange(true));
    $('autoStop').addEventListener('click', () => this.endAuto('stopped'));
    $('asumOk').addEventListener('click', () => this.closeAutoSummary());
    // (a hidden tab draws no frames, so the replay and its fight stand still; the banner says so, and the screen lock is asked for again on return)
    document.addEventListener('visibilitychange', () => this.auto && this.refreshAuto());
    $('gear').addEventListener('click', () => openSettings());
  }

  /** The fastest speed this fight may run at: ×3 on an army tier already cleared, or during an auto-replay; ×2 otherwise. */
  private fastest(): 2 | 3 {
    return maxSpeed(this.meta, armyOfRun(this.run)?.id, tierOfRun(this.run), !!this.auto);
  }

  /** The fight's speed (×1, ×2 or, where allowed, ×3), shown on the top bar's button. */
  private setSpeed(n: 1 | 2 | 3): void {
    this.speed = Math.min(n, this.fastest()) as 1 | 2 | 3;
    $('speed').textContent = `×${this.speed}`;
  }

  /* -------------------------------------------------------------- auto-deploy and auto-replay */

  /** The Auto button: choose the squad (the heroes already placed stay, the strongest fill the rest) and set them out by `autoFormation`. The player can still move anyone by hand after. */
  private autoArrange(manual = false): void {
    const b = this.b;
    if (b.phase !== 'deploy') return;
    const keep = manual ? this.run.squad : [];
    this.run.squad = pickSquad(this.run, this.meta, keep).map((h) => h.id);
    this.placed.clear();
    for (const s of autoDeploy(b, this.run, this.meta, (h) => this.boostFor(h))) this.placed.set(String(s.id), [s.u, s.v]);
    this.chosen = null;
    saveRun(this.run);
    this.syncSprites();
    if (manual) play('summon');
    this.refresh();
  }

  /** Starts an auto-replay of the army just begun (the run is on wave 1 already). Only cleared armies and tiers take it. */
  private beginAuto(army: string, tier: number, count: number): void {
    const a = startAuto(this.meta, army, tier, count);
    if (!a) return;
    this.auto = a;
    this.autoNext = null;
    play('autoStart');
    keepAwake(true);
    this.autoPrep();
  }

  /** Between fights, as the greedy player: the event, the summons, the squad and its gear; then a fresh board with the heroes set out. */
  private autoPrep(): void {
    autoRound(this.run, this.meta);
    saveRun(this.run);
    this.newBattle();
    this.endIntro();
    this.autoArrange();
    this.autoWait = 700;
    this.refresh();
  }

  /** Each frame of an auto-replay: wait out the pause, then fight the board that is set out, or move on from the fight that has ended. */
  private autoTick(dt: number): void {
    const a = this.auto!;
    if (document.hidden) return;
    if (this.autoWait > 0) return void (this.autoWait -= dt * this.speed);
    const b = this.b;
    if (b.phase === 'deploy') return void this.begin();
    if ((b.phase !== 'won' && b.phase !== 'lost') || !this.settled) return;
    const next = this.autoNext;
    this.autoNext = null;
    if (next === 'wave') {
      this.autoPrep();
    } else if (next === 'run') {
      this.startRun(armyRun(clockSeed(), a.army, this.meta.party, this.meta.castle, a.tier));
      this.autoPrep();
    } else this.endAuto(a.ended ?? 'done');
  }

  /** The banner over the fight: "Auto 2/5", the wave, and Stop. */
  private refreshAuto(): void {
    const a = this.auto;
    const bar = $('autoBar');
    document.body.classList.toggle('auto', !!a);
    bar.hidden = !a;
    if (!a) return;
    const army = armyOfRun(this.run);
    bar.classList.toggle('paused', document.hidden);
    bar.querySelector('b')!.textContent = `Auto ${a.run}/${a.count}`;
    bar.querySelector('span')!.textContent = document.hidden ? 'Paused' : army ? `${army.name} · wave ${Math.min(this.run.stage, army.waves.length)}/${army.waves.length}` : '';
  }

  /** The replay is over (the count ran out, a run was lost, or Stop was tapped): the banner goes and the summary card shows the totals. */
  private endAuto(why: 'done' | 'loss' | 'stopped'): void {
    const a = this.auto;
    if (!a) return;
    if (why === 'stopped') stopAuto(a);
    play(why === 'done' ? 'autoDone' : 'autoStop');
    this.auto = null;
    this.autoNext = null;
    // (a fight still going keeps its screen lock until it ends)
    if (this.b.phase !== 'fight') keepAwake(false);
    this.refreshAuto();
    const army = armyById(a.army)!;
    const card = $('autoSum');
    card.querySelector('h2')!.textContent = why === 'done' ? 'Auto-replay done' : why === 'loss' ? 'Auto-replay stopped' : 'Auto-replay stopped';
    card.querySelector('.asumWhy')!.textContent =
      why === 'done'
        ? `${a.totals.runs} of ${a.count} runs of the ${army.name} cleared`
        : why === 'loss'
          ? `The ${army.name} held at wave ${a.lostAt}. ${a.totals.runs} of ${a.count} runs cleared first`
          : `You stopped it. ${a.totals.runs} of ${a.count} runs cleared`;
    const rows = card.querySelector('.asumRows')!;
    rows.replaceChildren();
    for (const [label, n] of [['Crowns', a.totals.crowns], ['XP', a.totals.xp], ['Chests', a.totals.chests], ['Gear found', a.totals.gear]] as const) {
      rows.append(Object.assign(document.createElement('span'), { textContent: label }), Object.assign(document.createElement('b'), { textContent: String(n) }));
    }
    $('asumOk').textContent = why === 'stopped' ? 'Back to the board' : 'To the armies';
    card.dataset.why = why;
    card.hidden = false;
    this.refresh();
  }

  private closeAutoSummary(): void {
    const card = $('autoSum');
    card.hidden = true;
    const why = card.dataset.why;
    // (a run that was stopped carries on by hand where it stands; a finished one goes on to the armies, a lost one home)
    if (why === 'done') this.armyWon();
    else if (why === 'loss') this.goHome();
  }

  /** Begin a run (any mode's) and its first fight. */
  /** The army-run stars the last cleared army run earned (for the result screen). */
  private runStars: StarResult | null = null;

  private startRun(run: Run): void {
    this.run = run;
    this.syncPool();
    this.placed.clear();
    saveMeta(this.meta);
    saveRun(run);
    this.newBattle();
  }

  /** A roster hero's boost for the fight: its grade, rank, level, gear and equipment, and the tower's wounds. */
  private boostFor(h: Owned): Boost {
    return { ...boostOf(h, rankOf(this.meta, h.kind), levelOfKind(this.meta, h.kind), heroStats(this.meta, h.kind)), carry: hpShare(this.run, h.id) };
  }

  /** Begin a tower run: its map first, the fights as they are picked. */
  private startTower(run: Run): void {
    this.run = run;
    this.syncPool();
    this.placed.clear();
    saveMeta(this.meta);
    saveRun(run);
    this.towerView.open(run);
  }

  /** Carry on with the saved run (a run saved between an event's card and the next fight picks its card up again). */
  private resume(): void {
    const r = loadRun();
    if (r && !r.over) this.run = r;
    this.syncPool();
    this.placed.clear();
    // (a tower run is on its map, or at a battle it has picked; one saved before the map had none and gets one)
    if (this.run.mode?.kind === 'tower') {
      migrateTower(this.run, ARMIES.filter((a) => armyUnlocked(this.meta, a.id)).map((a) => a.id), this.meta.tower);
      if (this.run.tower!.cur?.fight) this.newBattle();
      else this.towerView.open(this.run);
      return;
    }
    this.newBattle();
    if (this.run.event) this.events.openEvent(this.run, () => saveRun(this.run));
  }

  /** The draw pool is the party, except a daily challenge, which keeps its starting five. */
  private syncPool(): void {
    if (this.run.mode?.kind !== 'daily') this.run.pool = [...this.meta.party];
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
        setTimeout(() => {
          play('star');
          flyUp(`+${STAR_GOLD} gold`, pay, $('gold'));
          flyUp(`+${STAR_CROWNS} crowns`, pay);
        }, 600 + i * 450);
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
      // (the hero's face, with its level on a badge at the corner)
      const face = document.createElement('div');
      face.className = 'xpFace';
      const lv = document.createElement('small');
      lv.className = 'xpLv';
      lv.textContent = `Lv ${progressOf(from[kind]).level}`;
      // (the look it fought in: the highest grade of the kind that stood in the fight, in that grade's form, framed whole)
      const grade = this.b.units.reduce((g, u) => (u.side === 'hero' && u.def === kind && u.owner === undefined ? Math.max(g, u.grade ?? 1) : g), 1);
      face.className = `xpFace g${grade}`;
      face.append(portrait(formOf(UNITS[kind], grade), 64, grade), lv);
      const name = document.createElement('b');
      name.textContent = UNITS[kind].name;
      const gain = document.createElement('em');
      gain.textContent = `+${xp} XP`;
      const bar = document.createElement('i');
      const fill = document.createElement('span');
      bar.append(fill);
      const note = document.createElement('p');
      row.append(face, name, gain, bar, note);
      list.append(row);
      const after = progressOf(from[kind] + xp);
      const up = ups.find((u) => u.kind === kind);
      fill.style.width = `${share(progressOf(from[kind]))}%`;
      const at = 400 + i * 700;
      setTimeout(() => (fill.style.width = `${up ? 100 : share(after)}%`), at);
      if (!up) return;
      setTimeout(() => {
        const gained = levelGain(up.from, up.to);
        // (the level-up: a stamp, the badge ticking over, the gains popping in one after the other, a sweep of light and a
        //  burst of sparks; all of it once, none of it looping)
        const stamp = document.createElement('span');
        stamp.className = 'xpStamp';
        stamp.textContent = 'Level up!';
        lv.textContent = `Lv ${up.to}`;
        const chips = [`+${gained.hp}% HP`, `+${gained.atk}% Atk`].map((t, n) => {
          const c = document.createElement('span');
          c.textContent = t;
          c.style.animationDelay = `${0.25 + n * 0.15}s`;
          return c;
        });
        note.replaceChildren(...chips);
        const sparks = document.createElement('span');
        sparks.className = 'xpSparks';
        for (let s = 0; s < 10; s++) {
          const dot = document.createElement('i');
          const ang = (s / 10) * Math.PI * 2;
          dot.style.setProperty('--dx', `${Math.round(Math.cos(ang) * (26 + (s % 3) * 8))}px`);
          dot.style.setProperty('--dy', `${Math.round(Math.sin(ang) * (20 + (s % 2) * 8)) - 10}px`);
          sparks.append(dot);
        }
        face.append(sparks);
        name.append(stamp);
        row.classList.add('up');
        fill.style.transition = 'none';
        fill.style.width = `${share(after)}%`;
        // (a gold wash spreads across the row from the hero's face; the heroes of this kind on the board, if it's showing, rise in light)
        const wash = document.createElement('span');
        wash.className = 'xpWash';
        row.append(wash);
        for (const u of this.b.units) if (u.side === 'hero' && u.def === kind) this.sprites.get(u.id)?.evolve();
        play('levelUp');
      }, at + 900);
    });
  }

  /** The roster ids of the heroes on the field (the squad when none is placed yet). */
  private fielded(): number[] {
    const ids = this.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined && !u.owner).map((u) => u.tag!);
    return ids.length ? ids : [...this.run.squad];
  }

  /** The result screen's way on, once any recap has been seen. */
  private afterResult(): void {
    // (an army's last boss has fallen: the next army's unlock moment, if it opened one, then the armies)
    if (this.run.cleared) return this.armyWon();
    // (the tower: a lost run shows its summary, a won floor goes back to the map)
    if (this.run.tower) {
      $('result').hidden = true;
      saveRun(this.run);
      if (this.run.over) return this.towerView.showSummary(this.run, this.run.tower.summary ?? settleTower(this.meta, this.run)!, () => this.home.open(`The climb ended on floor ${this.run.stage}: +${this.run.tower!.crowns} crowns earned`));
      return this.towerView.open(this.run);
    }
    // (a lost run goes back to the main screen, with its summary)
    if (this.run.over) return this.goHome();
    saveRun(this.run);
    this.newBattle();
    // (an event waits between two fights: its card opens over the new stage's board)
    if (this.run.event) this.events.openEvent(this.run, () => (saveRun(this.run), this.refresh()));
  }

  /** Retry the wave just lost: the same stage, a hire's worth of gold to spend, one retry used. The failed go still counts in the run's figures. */
  private retry(): void {
    if (!this.pendingLoss || !canRetry(this.run)) return;
    this.noteRecap({}, [], false, false);
    const gold = retryWave(this.run)!;
    this.pendingLoss = false;
    play('coinRecycle');
    saveRun(this.run);
    this.newBattle();
    flyUp(`+${gold} gold`, $('gold'));
  }

  /** Add the fight just ended (stats, time, pay) to the run's recap. */
  private noteRecap(gains: Record<string, number>, ups: LevelUp[], won: boolean, settled = true): void {
    const grades: Record<string, number> = {};
    for (const u of this.b.units) if (u.side === 'hero' && u.owner === undefined) grades[u.def] = Math.max(grades[u.def] ?? 1, u.grade ?? 1);
    noteFightStats(this.run, this.stats, this.b.t, won, grades);
    notePayout(this.run, gains, ups, settled ? this.crownGain : 0, this.run.cleared ? this.runStars?.chests.length ?? 0 : 0);
  }

  /** The full recap of the run that has ended, then the way on (the home screen, or the armies). */
  private showRunRecap(): void {
    const run = this.run;
    const army = armyOfRun(run);
    const won = !!run.cleared;
    const head = won
      ? { title: 'Army defeated!', tone: 'won' as const, line: `${army?.name ?? 'The run'} cleared in ${run.recap?.fights ?? 0} fights` }
      : { title: 'Run over', tone: 'lost' as const, line: army ? `The ${army.name} held at wave ${run.best} of ${army.waves.length}` : `Fell at stage ${run.best} · ${run.roster.length} heroes owned · ${run.summons} hires` };
    showRecap($('recap'), recapOf(run), head, () => this.afterResult());
  }

  /** A run has ended: back to the main screen, showing what it earned. */
  private goHome(): void {
    const r = this.run;
    const army = armyOfRun(r);
    $('result').hidden = true;
    this.home.open(army ? `The ${army.name} stopped you at wave ${r.best}/${army.waves.length}. Heroes keep their levels: go again.` : `The run ended at stage ${r.best}: +${this.crownGain} crowns earned`);
  }

  /** An army's last boss has fallen: if that opens the next army, its banner rises first ("A new army marches"), then the armies screen. */
  private armyWon(): void {
    const army = armyOfRun(this.run)!;
    $('result').hidden = true;
    const next = this.pay?.unlocked ?? undefined;
    this.home.open();
    // (a chest this clear earned went to the stash; the army's card opens first, with its chest ticked)
    const focus = this.runStars?.chests.length ? army.id : undefined;
    if (next) showUnlock(next, army, () => this.home.openArmies(focus));
    else this.home.openArmies(focus);
  }

  private dragMove(e: PointerEvent): void {
    const d = this.drag;
    if (!d) return;
    if (d.pan && d.moved) this.hover = null;
    else this.aim(e);
    if (d.pan) {
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
      d.moved = true;
      // (a manual pan pauses the fight camera's follow for a few seconds)
      this.pausedUntil = performance.now() + PAUSE_MS;
      this.held = null;
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
    // (a card dragged off the bench in the deploy phase shows the recycle area; over it the card is let go to sell it)
    if (!d.fromBoard && this.b.phase === 'deploy') {
      $('recycleGold').textContent = `+${recycleValue(this.run)}`;
      $('recycleZone').hidden = false;
      $('bench').querySelector(`[data-id="${d.id}"]`)?.classList.add('dragging');
    }
    // (the hero is held a little over the finger, so it can be seen)
    this.ghost.texture = framesOf(this.defOf(d.id).sheet, 'idle')[0];
    this.ghost.scale.set(this.scale * this.defOf(d.id).scale);
    this.ghost.position.set(e.clientX - colLeft(), e.clientY - 24);
    this.ghost.visible = true;
    const sell = !d.fromBoard && overRecycle(e.clientX, e.clientY);
    $('recycleZone').classList.toggle('hot', sell);
    this.hover = sell ? null : this.tileAtScreen(e.clientX, e.clientY - 24);
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
      if (!d.fromBoard && overRecycle(e.clientX, e.clientY)) this.recycleDropped(d.id);
      else if (tile && this.canPut(d.id, tile)) this.put(d.id, tile);
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
    $('recycleZone').hidden = true;
    $('recycleZone').classList.remove('hot');
    for (const c of $('bench').querySelectorAll('.dragging')) c.classList.remove('dragging');
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
    if (!this.canPut(id, tile) || !place(this.b, h.kind, tile[0], tile[1], h.id, this.boostFor(h))) return;
    setSquad(this.run, h.id, true);
    this.placed.set(id, tile);
    saveRun(this.run);
    this.syncSprites();
  }

  /** After a summon: heroes merged away leave the board, and the merged hero takes the place of one of them (if it's in
   *  the squad and isn't placed yet). */
  private clearMerged(got: { id: number; kind: string }): void {
    let freed: [number, number] | undefined;
    for (const u of this.b.units.filter((x) => x.side === 'hero' && x.tag !== undefined && !heroOf(this.run, x.tag))) {
      freed ??= [u.u, u.v];
      unplace(this.b, u.def, u.tag);
      this.placed.delete(String(u.tag));
    }
    if (freed && this.run.squad.includes(got.id) && !this.b.units.some((x) => x.tag === got.id)) {
      // (the squad slot it holds is already the merged-away hero's: put it on that one's tile)
      setSquad(this.run, got.id, false);
      this.put(String(got.id), freed);
    }
    this.syncSprites();
  }

  /** A card was let go over the recycle area: a hero of grade 2 or more asks first. */
  private recycleDropped(id: string): void {
    const h = heroOf(this.run, Number(id));
    const card = $('bench').querySelector<HTMLElement>(`[data-id="${id}"]`);
    if (!h || !card || this.run.roster.length <= 1) return;
    if (h.grade < 2) return this.recycleHero(h.id, card);
    const value = recycleValue(this.run);
    $('askText').textContent = `Recycle the ${'★'.repeat(h.grade)} ${UNITS[h.kind].name} for ${value} gold?`;
    $('ask').hidden = false;
    const close = () => {
      $('ask').hidden = true;
      $('askYes').onclick = $('askNo').onclick = null;
    };
    $('askNo').onclick = close;
    $('askYes').onclick = () => {
      close();
      this.recycleHero(h.id, card);
    };
  }

  /** Send a hero on the bench to the recycler for gold: off the board if it stood there, with a coin and a puff. */
  private recycleHero(heroId: number, card: HTMLElement): void {
    if (this.b.phase !== 'deploy') return;
    const h = heroOf(this.run, heroId);
    if (!h) return;
    const kind = h.kind;
    const gold = recycle(this.run, heroId);
    if (gold === null) return;
    unplace(this.b, kind, heroId);
    this.placed.delete(String(heroId));
    this.chosen = null;
    recyclePuff(card);
    flyUp(`+${gold} gold`, card, $('gold'));
    play('coinRecycle');
    saveRun(this.run);
    this.syncSprites();
    this.refresh();
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
    const key = `${summonCost(this.run)};` + this.run.roster.map((h) => `${h.id}:${h.grade}:${levelOfKind(this.meta, h.kind)}:${powerOf(h.kind, this.boostFor(h))}`).join();
    if (bench.dataset.key === key) return;
    bench.dataset.key = key;
    bench.replaceChildren();
    for (const h of this.run.roster) {
      const def = UNITS[h.kind];
      const id = String(h.id);
      const card = document.createElement('div');
      card.className = `card g${h.grade} r${rarityOf(h.kind)}${this.evolved.has(h.id) ? ' evolve' : ''}`;
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
      const sell = document.createElement('button');
      sell.className = 'recycle';
      const value = recycleValue(this.run);
      sell.textContent = `Recycle · +${value}`;
      sell.title = `Recycle for ${value} gold (it cost ${paidOf(h)})`;
      // (a hero of grade 2 or more asks again: a second tap within a few seconds does it)
      let sure: ReturnType<typeof setTimeout> | undefined;
      sell.addEventListener('pointerdown', (e) => e.stopPropagation());
      sell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (h.grade > 1 && !sure) {
          sell.textContent = `Sure? +${value}`;
          sell.classList.add('sure');
          sure = setTimeout(() => {
            sure = undefined;
            sell.textContent = `Recycle · +${value}`;
            sell.classList.remove('sure');
          }, 3000);
          return;
        }
        clearTimeout(sure);
        this.recycleHero(h.id, card);
      });
      const pw = document.createElement('span');
      pw.className = 'pw';
      pw.textContent = `Power ${powerText(powerOf(h.kind, this.boostFor(h)))}`;
      card.append(portrait(formOf(def, h.grade), 96, h.grade), stars, name, lv, pw, marks, bar);
      // (the last hero cannot be recycled)
      if (this.run.roster.length > 1) card.append(sell);
      card.title = `${def.role} · Power ${powerText(powerOf(h.kind, this.boostFor(h)))}`;
      card.addEventListener('pointerdown', (e) => {
        if (this.b.phase !== 'deploy') return;
        e.preventDefault();
        this.drag = { id, x: e.clientX, y: e.clientY, moved: false, fromBoard: false };
      });
      bench.append(card);
    }
  }

  /* -------------------------------------------------------------- the king's spells */

  /** The spell bar: a card for each spell equipped in the spellbook. */
  private buildSpells(): void {
    const cards = $('spellCards');
    cards.replaceChildren();
    for (const id of this.meta.spellbook.equipped) {
      const sp = SPELLS[id];
      const card = document.createElement('button');
      card.className = 'spell';
      card.dataset.id = id;
      card.title = sp.text;
      card.innerHTML = `${spellIconHtml(id)}<b>${sp.name}</b><em>${sp.cost} mana</em><span class="cool"></span>`;
      card.addEventListener('click', () => {
        if (this.b.phase !== 'fight') return;
        // (a spell that goes everywhere needs no tile: it is cast at once)
        if (sp.target === 'all') castSpell(this.b, id, 0, 0);
        else this.spell = this.spell === id ? null : canAfford(this.b, id) ? id : this.spell;
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
  /** The tower act the music is coloured by: the run's, while a tower run is on show (not the home screen). */
  private syncAct(): void {
    setAct(this.homeUp ? null : (this.run.tower?.act ?? null));
  }

  /** The ambience bed: the home tab or the armies while the home screen is up, else the tower's act (its map and fights) or the field. */
  private syncScene(): void {
    setScene(sceneOf(this.home?.spot ?? null, this.run?.tower?.act ?? null));
  }

  private refresh(): void {
    const b = this.b;
    const run = this.run;
    this.syncAct();
    this.syncScene();
    const n = heroesPlaced(b);
    const ended = b.phase === 'won' || b.phase === 'lost';
    const ready = ended && (!!this.auto || this.endWait >= END_WAIT_MS);
    // (a wave lost with retries left waits for the player's choice before it is settled into the run)
    if (ready && b.phase === 'lost' && !this.settled && !this.auto && canRetry(run)) this.pendingLoss = true;
    if (ready && !this.settled && !this.pendingLoss) {
      this.settled = true;
      // (an auto-replay keeps the screen awake from fight to fight)
      if (!this.auto) keepAwake(false);
      const won = b.phase === 'won';
      const stage = run.stage;
      const army = armyOfRun(run);
      const rating = ratingOf(b, isBossRun(run));
      const before = run.gold;
      noteFight(run, b);
      // (the heroes' skills keep their charge for the next wave)
      if (won) keepCharges(run, b);
      this.bossDown = !!run.tower && run.tower.cur?.kind === 'boss' && won;
      if (run.tower) finishTower(run, b, won, rating.stars);
      else finish(run, won, rating.stars);
      this.gain = run.gold - before;
      // (an army pays by wave, and its last boss a clear; any other run pays as it always did)
      this.pay = army ? settleWave(this.meta, army.id, stage, won, rating.stars) : null;
      this.crownGain = this.pay ? this.pay.crowns : earn(this.meta, stage, won, rating.stars);
      if (run.tower) run.tower.crowns += this.crownGain;
      if (run.tower && run.over) settleTower(this.meta, run);
      if (won && !army) recordStars(this.meta, stage, rating.stars);
      const earned = settleRun(this.meta, run, { won, stage, stars: rating.stars, battle: b });
      this.runStars = settleArmyRun(this.meta, run);
      const gains = fightXp(b, xpRate(this.meta.castle) * tierOf(tierOfRun(run)).xp);
      const from = Object.fromEntries(Object.keys(gains).map((k) => [k, xpOf(this.meta, k)]));
      const ups = gainXp(this.meta, gains);
      this.noteRecap(gains, ups, won);
      if (this.auto) {
        // (no result screen to show: the fight's pay goes into the replay's totals)
        this.showStars(null);
        for (const id of ['armyStars', 'xp', 'fightStats']) $(id).hidden = true;
        const over = run.cleared || !won;
        this.autoNext = afterFight(this.auto, {
          won,
          cleared: !!run.cleared,
          wave: stage,
          crowns: this.crownGain,
          xp: Object.values(gains).reduce((n, x) => n + x, 0),
          chests: run.cleared ? (this.runStars?.chests.length ?? 0) + (this.runStars?.firstClear ? 1 : 0) : 0,
          gear: over ? gearCount(run) : 0,
        });
        this.autoWait = 900;
      } else {
        this.showStars(won ? rating : null);
        drawRunStars($('armyStars'), army && run.cleared ? this.runStars : null, army ? tierOf(tierOfRun(run)).name : '');
        this.showStats();
        this.showXp(gains, from, ups);
      }
      saveMeta(this.meta);
      saveRun(run);
      toastAchievements(earned);
    }
    document.body.dataset.phase = b.phase;
    const army = armyOfRun(run);
    const kind = run.tower?.cur?.kind;
    const stage = `${army ? `Wave ${run.stage}/${army.waves.length}` : run.tower ? `Floor ${run.stage}` : `Stage ${run.stage}`}${kind === 'elite' ? ' · Elite' : isBossRun(run) ? ' · Boss' : ''}`;
    $('status').textContent =
      b.phase === 'deploy' ? (this.chosen ? `Place the ${this.defOf(this.chosen).name}` : benchFull(run) ? `${stage} · bench full: recycle a hero to hire` : n ? `${stage} · ${n} of ${SQUAD} placed` : `${stage} · drag heroes onto the blue tiles`) : b.phase === 'fight' ? `${stage} · Fight!` : b.phase === 'won' ? 'Victory' : 'Defeat';
    $('gold').textContent = `${run.gold} gold`;
    const buy = $('summon') as HTMLButtonElement;
    const block = hireBlock(run);
    buy.textContent = block === 'bench' ? 'Bench full' : `Hire · ${summonCost(run)}`;
    buy.disabled = block !== null;
    buy.title = block === 'bench' ? 'The bench holds 10 heroes: recycle one, or send one to the field, to hire another' : '';
    ($('fight') as HTMLButtonElement).disabled = b.phase !== 'deploy' || n === 0;
    $('clock').textContent = b.phase === 'deploy' ? '' : clock(b.t);
    const result = $('result');
    result.hidden = !ready || this.towerView.isOpen || !!this.auto;
    ($('retry') as HTMLButtonElement).hidden = !this.pendingLoss;
    if (!result.hidden && this.pendingLoss) {
      // (the party fell with retries left: replay the wave with a gold boost, or give up and end the run)
      for (const id of ['stars', 'armyStars', 'xp', 'fightStats']) $(id).hidden = true;
      const left = retriesLeft(run);
      $('banner').textContent = 'Defeat';
      $('banner').className = 'lost';
      $('summary').textContent = `Your party fell on ${stage}. Retry it with +${retryGold(run)} gold to spend, or give up and end the run.`;
      $('retry').textContent = `Retry wave · ${left} left`;
      $('next').textContent = 'Give up';
    } else if (!result.hidden) {
      const left = b.units.filter((x) => x.alive && x.side === 'hero' && !UNITS[x.def].summon).length;
      $('banner').textContent = run.cleared ? 'Army defeated!' : this.bossDown ? `Act ${run.tower!.act - 1} cleared!` : b.phase === 'won' ? (run.tower ? 'Floor cleared!' : 'Victory!') : 'Defeat';
      $('banner').className = b.phase;
      const share = this.pay?.replay ? ' (a replay pays a share)' : '';
      const clear = this.pay?.firstClear ? ' · first clear!' : '';
      $('summary').textContent =
        b.phase === 'won'
          ? `${run.tower ? `Floor ${run.stage - 1} done · ` : ''}${left} of ${heroesPlaced(b)} heroes standing · +${this.gain} gold · +${this.crownGain} crowns${share}${clear} · ${clock(b.t)}${run.found?.length ? ` · found: ${run.found.join(', ')}` : ''}`
          : run.tower
            ? `The climb ends on floor ${run.stage}, act ${run.tower.act} · ${run.stage - 1} floors cleared · +${this.crownGain} crowns`
            : army
            ? `The ${army.name} holds at wave ${run.best} of ${army.waves.length}. It starts again from wave 1; your heroes keep their levels.`
            : `The run ends at stage ${run.best} · ${run.roster.length} heroes owned · ${run.summons} summons · +${this.crownGain} crowns${modeNote(run)}`;
      $('next').textContent = run.over && !run.tower ? 'Run recap' : b.phase === 'won' ? (army ? `Next wave (${run.stage})` : run.tower ? 'To the map' : `Next stage (${run.stage})`) : run.tower ? 'See the summary' : 'Home';
    }
    this.refreshAuto();
    if (b.phase === 'deploy' && !this.auto) tips.atDeploy(n, run.stage, () => this.deployBox());
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
        for (let dv = -1; dv <= 1; dv++) if (tileAt(b.board, this.hover[0] + du, this.hover[1] + dv)) this.boardView.mark(this.hover[0] + du, this.hover[1] + dv, HURTING.has(this.spell) ? 'bad' : 'chosen');
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

function overRecycle(x: number, y: number): boolean {
  const z = $('recycleZone');
  if (z.hidden) return false;
  const r = z.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function overBench(x: number, y: number): boolean {
  const r = $('panel').getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

new Game().start().catch((err) => {
  $('loading').textContent = `Could not start: ${err}`;
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
