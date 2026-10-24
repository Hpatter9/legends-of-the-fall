// Legends of the Last Keep: the phone page. The board is drawn with Pixi; the bench, the buttons and the banners are plain
// page elements over it. Before the fight the heroes are dragged (or tapped, then a tile tapped) from the bench onto
// the blue tiles; then the fight plays itself, a fixed tick at a time.

import { Application, Container, Sprite, TextureSource } from 'pixi.js';
import { standable, tileAt } from './sim/board';
import { canPlace, fight, heroesPlaced, isDeployTile, place, stepBattle, TICK_MS, unitAt, unplace, type Battle, type BattleEvent, type Boost, type Unit } from './sim/battle';
import { mvpOf, startStats, STAT_KEYS, tally, type FightStats } from './sim/fightStats';
// (`saveSlot` as `saveRun`: a tower or calamity run is saved in its own slot, any other in the ordinary one)
import { adoptOldTower, armyOfRun, armyRun, benchFull, boostOf, canRetry, chainOf, fallOutcome, MAX_RETRIES, dropSlot, finish, heroOf, hireBlock, isBossRun, keepCharges, loadRun, loadSlot, noteFight, paidOf, recycle, recycleValue, retriesLeft, retryWave, saveSlot as saveRun, setSquad, squadLimit, startStage, summon, summonCost, tierOfRun, waveArmyOf, type Owned, type Run } from './sim/run';
import { climbXpView, heroLevel, localBoost } from './sim/climb';
import { calamityRun } from './sim/modes';
import { CAL_MAPS } from './sim/calamity';
import { pickHero } from './calamityView';
import { noteFightStats, notePayout, recapOf } from './sim/runRecap';
import { showRecap } from './recapView';
import { ARMIES, armyById, armyUnlocked, settleWave, type ArmyPay } from './sim/armies';
import { drawRunStars, showUnlock } from './armiesView';
import { modeOpen } from './sim/modeUnlock';
import { spellIconHtml } from './spellIcons';
import { settleArmyRun, type StarResult } from './sim/armyStars';
import { TIERS, tierOf } from './sim/tiers';
import { formOf, UNITS } from './sim/units';
import { ELITE_BY_ID } from './sim/elites';
import { isBoss } from './sim/foes';
import { awakenedOf } from './sim/awaken';
import { earn, loadMeta, needsStarter, pickStarter, heroRank, recordStars, saveMeta, type Meta } from './sim/meta';
import { chooseStarter } from './starter';
import { ScenePlayer } from './render/sceneView';
import { dueScene, markSeen } from './sim/sceneRules';
import { onAwakened } from './awakenView';
import { SCENES, SCENE_ORDER, type Moment } from './sim/sceneScripts';
import { previewFrames } from './render/sceneClock';
import { xpRate } from './sim/castle';
import { heroStats } from './sim/talents';
import { powerOf, powerText } from './sim/power';
import { benchXp, fightXp, gainXp, levelGain, levelOfKind, progressOf, xpOf, type LevelUp } from './sim/levels';
import { levelBadge } from './levelBadge';
import { ratingOf, STAR_CROWNS, STAR_GOLD, type Rating } from './sim/stars';
import { autoDeploy, autoRound, gearCount, pickSquad } from './sim/autoplay';
import { afterFight, maxSpeed, spendTicket, startAuto, stopAuto, type AutoReplay } from './sim/autoReplay';
import { Gacha } from './gacha';
import { Events } from './events';
import { TowerView } from './towerView';
import { showTwistBanner } from './twistView';
import { abandonTower, finishTower, mapProgress, migrateTower, settleTower } from './sim/tower';
import { hpShare } from './sim/health';
import { Home } from './home';
import { Party } from './party';
import { dailyBonus, dailyCleared, dailyInProgress, modeNote, settleDaily, settleRun, startDaily, towerRun, type DailyPay } from './sim/modes';
import { dailyBossName, dailyCrowns, DAILY_WAVES } from './sim/daily';
import { showDailyStart } from './dailyView';
import { chestPicture } from './chestStash';
import { toastAchievements, toastJoined } from './achievementsView';
import { grantContent } from './sim/contentHeroes';
import { clockSeed, todayKey } from './modes';
import { tips, type Box } from './tips';
import { CHARGE_MAX, kitOf, ULT_LEVEL } from './sim/abilities';
import { startAwake } from './render/awake';
import { canAfford, castSpell, cooldownLeft, MANA_MAX, SPELLS, type SpellId } from './sim/spells';
import { bindSpellbook } from './spellbook';
import { setBackdrop, panBackdrop } from './render/backdrop';
import { BoardView, loadBoardArt } from './render/boardView';
import { WeatherView } from './render/weatherView';
import { weatherOf, type Weather } from './sim/weather';
import { ChainView } from './render/chainView';
import { against, frameOf, transferFormation } from './sim/chain';
import { traitBadge } from './traitBadge';
import { closestTrait, countTraits, kindsOf, nextTierLine, traitsOf, TRAITS } from './sim/traits';
import { placeSynergies, startSynergies, updateCombo } from './synergyView';
import { COMBO_NAME, comboById, comboOf, noteCombos } from './sim/combos';
import { UnitSprite } from './render/unitView';
import { flyUp, recyclePuff, summonBurst } from './render/uiFx';
import { burnHeart, reducedMotion, reviveLine } from './reviveView';
import { Fx, loadFx } from './render/fx';
import { framesOf, loadSheets, portrait, sheetInfo, wholeFigure } from './render/sheets';
import { easeTo, EASE_MOVE_MS, EASE_ZOOM_MS, framing, PAUSE_MS, settle, viewFor, type View } from './render/cameraRules';
import { titleOf } from './render/bossTitles';
import { at, depth, FOOT, HH, rawAt, setFrame, TH, TW } from './render/iso';
import { bindDuck, bindMute, play, playEvents, setAct, setScene, setup, startFight } from './render/sound';
import { sceneOf } from './render/audioRules';
import { colLeft, viewH, viewW } from './viewport';
import { onSettings, openSettings, setSetting, settings } from './settings';
import { PageGoat } from './duchess';
import { Rng } from './sim/rng';
import { endingQuip, foeGrumbles, heroSays, initQuips, newQuipScene } from './quips';
import { LOADING_TIPS, RECAP_LOSS, RECAP_WIN, RESULT_LOSS, RESULT_WIN } from './quipData';
import type { Anchor } from './quipView';
import heartUrl from './art/rogue/heart.png';

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

// (the loading screen's tip: one of the jokes, while the page gets ready)
const loadTip = document.querySelector('.ldTip');
if (loadTip) loadTip.textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** The middle of the top edge of a page element, for a speech bubble to point at. */
const rectAnchor = (e: Element | null): Anchor | null => {
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top };
};

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
  private weather = new WeatherView();
  /** The long map of an army run: the finished sections behind the fight, and the walk from one wave to the next. */
  private chain!: ChainView;
  /** The units (of the finished fight) that are walking to the next section: their own sprites stay hidden meanwhile. */
  private walking = new Set<number>();
  private sprites = new Map<number, UnitSprite>();
  /** Duchess, watching the fight from just above the panel, at the board's edge. */
  private goat = new PageGoat(() => {
    const panel = document.getElementById('panel');
    if (!panel || panel.hidden) return null;
    return { left: 8, bottom: panel.getBoundingClientRect().top + 4, face: 1 };
  });
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
  /** The heart-burn after a fall with hearts left: `t` real ms since it began, `swapped` once the wave is set out again, `started` once its fight is on (`fightAt`: when). Nothing is settled until it is over; no prompt. */
  private revive: { t: number; swapped: boolean; started: boolean; fightAt: number; line?: { dismiss: () => void } } | null = null;
  /** Set while the revive itself starts the wave again, so that `newBattle` keeps the revive going. */
  private reviveRestart = false;
  /** This fight's loss has had its cinematic asked for (once a fight: `refresh` runs often). */
  private lossScened = false;
  /** What an army's last settled fight paid (null for any other run). */
  private pay: ArmyPay | null = null;
  /** What a daily's last settled fight paid (null for any other run). */
  private dailyPay: DailyPay | null = null;
  /** Gold the last win paid (for the result screen). */
  private gain = 0;
  /** Where each hero (by roster id) was placed, so the next stage puts them back. */
  private placed = new Map<string, [number, number]>();
  private chosen: string | null = null;
  private drag: Drag | null = null;
  private hover: [number, number] | null = null;
  /** The fight speed: kept from wave to wave and fight to fight, and the last choice is remembered in the settings. */
  private speed: 1 | 2 | 3 = settings().speed;
  private acc = 0;
  private scale = 1;
  /** The spell card chosen, waiting for a tile (armed by a tap, or held in a drag). */
  private spell: SpellId | null = null;
  /** A spell card pressed and maybe being dragged onto the grid: let go over the grid to cast, over the panel to cancel. */
  private spellDrag: { id: SpellId; x: number; y: number; moved: boolean } | null = null;
  /** A drag just ended on the card it began on: the click that follows is not a tap. */
  private spellDragged = false;
  private spellGhost = document.createElement('div');
  /** The fight's numbers for each hero, tallied as the ticks come in. */
  private stats: FightStats = [];
  /** A boss's title card: how long it has been on, and the boss it is about. */
  private intro: { t: number; boss: Unit; slammed: boolean } | null = null;
  /** The stages whose boss has had its card this session (a stage's card plays once). */
  private introduced = new Set<string>();
  /** The auto-replay going on, if any (`sim/autoReplay.ts`); it plays the waves and starts the next runs from the frame loop, so a hidden tab (no frames) pauses it. */
  private auto: AutoReplay | null = null;
  /** The cinematics (`render/sceneView.ts`): each plays once at its moment, and the codex's Scenes list plays a seen one again. */
  private scenes = new ScenePlayer();
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
    this.boardView.keep.push(this.fx.dimLayer, this.fx.root, this.weather.lights);
    this.boardView.root.addChild(...this.boardView.keep);
    this.world.addChild(this.boardView.root);
    this.boardView.renderer = this.app.renderer;
    this.chain = new ChainView(this.boardView, this.fx, this.boardView.root);
    this.ghost.anchor.set(0.5, 1);
    this.ghost.alpha = 0.85;
    this.ghost.visible = false;
    this.app.stage.addChild(this.world, this.weather.root, this.ghost, this.fx.flashLayer);
    const query = new URLSearchParams(location.search);
    const seed = Number(query.get('seed'));
    this.meta = loadMeta((Date.now() % 100000) + 1);
    saveMeta(this.meta);
    initQuips(this.meta.seed);
    // (a new save, or one after Start over, picks its first three heroes before anything else; an address with a seed is a test page and takes the first pack)
    if (needsStarter(this.meta)) {
      // (the opening cinematic comes first, before the pick: the player has no heroes yet, so a fixed trio plays it; a test page with a seed has none)
      if (!seed) await this.playDue({ kind: 'starter' }, { party: [...(SCENES.opening.trio ?? [])] });
      if (seed) pickStarter(this.meta, 0);
      else await chooseStarter(this.meta);
      saveMeta(this.meta);
    }
    // (a tower run saved by an older version sat in the ordinary slot: it moves to the tower's own)
    adoptOldTower();
    // (a fresh page with no saved run shows the first army's board behind the home screen)
    this.run = (!seed && loadRun()) || armyRun(seed || (Date.now() % 100000) + 1, ARMIES[0].id, this.meta.party, this.meta.castle);
    this.syncPool();
    this.gacha = new Gacha(
      this.meta,
      () => {
      this.syncPool();
      // (a pull can earn an achievement too)
      toastAchievements(settleRun(this.meta, this.run, { won: false, stage: this.run.stage, stars: 0 }));
      saveMeta(this.meta);
      saveRun(this.run);
      this.refresh();
      this.home.refresh();
    },
    // (a pull from the card reveal runs the hall's show again, like one from the hall)
    (n) => this.home.summon(n),
    );
    this.home = new Home(this.meta, {
      hasRun: () => {
        const r = loadRun();
        return !!r && !r.over;
      },
      runInfo: () => {
        const r = loadRun();
        if (!r || r.over) return null;
        const army = armyOfRun(r);
        const label = army ? `${army.name} · wave ${r.stage}/${army.waves.length}` : r.mode?.kind === 'daily' ? `daily · wave ${r.stage}/${DAILY_WAVES}` : r.mode?.kind === 'tower' ? `tower · act ${r.tower?.act ?? 1}, floor ${r.stage}` : `stage ${r.stage}`;
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
      onSummon: (n, play) => this.gacha.summon(n, (got) => play(got)),
      onDaily: () => {
        if (dailyInProgress(loadRun(), todayKey())) return this.resume();
        // (the start card names the boss and the land; a tap on Fight! starts the run, the first of the date counting)
        showDailyStart(this.meta, todayKey(), () => this.startRun(startDaily(this.meta, todayKey())), () => this.home.open());
      },
      onTower: () => this.openMode('tower'),
      onCalamity: () => this.openMode('calamity'),
      slotInfo: (kind) => {
        const r = loadSlot(kind);
        if (!r) return null;
        return kind === 'calamity' ? `Map ${r.tower?.act ?? 1}/${CAL_MAPS} · continue` : `Floor ${r.stage} · continue`;
      },
      onScene: () => this.syncScene(),
      onWatchScene: (id) => void this.playScene(id),
      onBuilt: (site) => void this.queueScene({ kind: 'castle', site }),
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
      onAbandon: () => this.abandon(),
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
    // (a fault in one frame's drawing or sound is logged and the next frame goes on: Pixi's ticker stops for good when a
    // listener throws, which froze fights mid-way)
    this.app.ticker.add((tk) => {
      try {
        this.frame(tk.deltaMS);
      } catch (err) {
        console.error(err);
      }
    });
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
      this.goat.show(!this.homeUp);
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
    // (a hero's first awakening has its cinematic)
    this.goat.onArrive = () => void this.duchessTurnsUp();
    onAwakened((kind, step) => {
      if (step === 1) void this.queueScene({ kind: 'awaken', hero: kind });
    });
  }

  /* -------------------------------------------------------------- the fight */

  /** A fresh fight for the run's stage, with the squad back where it stood (or on the first free tiles). */
  private newBattle(): void {
    // (a walk to the new section still going is over: the heroes are placed where it was taking them)
    this.chain.finish();
    this.walking.clear();
    this.b = startStage(this.run);
    // (an army's section may lie turned on the long map: everything is drawn and tapped through its frame)
    const section = chainOf(this.run)?.[this.run.stage - 1];
    setFrame(section ? frameOf(section, section) : undefined);
    this.settled = false;
    this.endWait = 0;
    if (!this.reviveRestart) this.revive = null;
    this.lossScened = false;
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
    this.goat.newFight();
    // (the speed picked stays on from wave to wave)
    this.setSpeed(this.speed);
    this.fx.clear();
    this.boardView.build(this.b.board, { boss: !!waveArmyOf(this.run) && isBossRun(this.run) }, section?.rot ?? 0);
    this.syncChain();
    setBackdrop(this.b.board.area);
    this.weather.resize(this.app.screen.width, this.app.screen.height);
    this.weather.set(weatherOf(this.b.board), this.b.board.area, this.boardView.litSpots());
    showTwistBanner(this.run.tower?.cur?.fight?.twist);
    this.syncSprites(true);
    this.layout();
    this.refresh();
    // (a fight's cinematics come before the boss's own card: a Calamity's herald, a first elite, the tower's milestones ...)
    const due = this.setupMoments().filter((m) => this.scenesOn() && dueScene(this.meta, m));
    if (due.length) void Promise.all(due.map((m) => this.queueScene(m))).then(() => this.startIntro());
    else this.startIntro();
  }

  /** The moments that bring a cinematic as this fight is set up, in the order they play. */
  private setupMoments(): Moment[] {
    const run = this.run;
    const out: Moment[] = [];
    const mode = run.mode?.kind;
    if (mode === 'calamity' && run.tower) {
      if (isBossRun(run)) out.push({ kind: 'calBoss', map: run.tower.act });
      if ((run.mode as { ascension?: number }).ascension === 1) out.push({ kind: 'ascension' });
    }
    if (mode === 'tower' && [10, 25, 50].includes(run.stage)) out.push({ kind: 'spire', floor: run.stage });
    if (mode === 'army' && tierOfRun(run) >= TIERS.length - 1) out.push({ kind: 'mythic' });
    if (mode === 'daily' && isBossRun(run)) out.push({ kind: 'dailyBoss' });
    if (run.tower?.cur?.fight?.elite) out.push({ kind: 'elite' });
    return out;
  }

  /** Whether cinematics play now: not in an auto-replay, and not switched off (the Settings switch, once it exists). */
  private scenesOn(): boolean {
    return !this.auto && settings().cinematics;
  }

  /** How many cinematics are queued or playing: the fight is held for them (the renderer waits; the simulation is not touched, so it plays out the same). */
  private sceneHold = 0;
  private sceneChain: Promise<void> = Promise.resolve();

  /** Queue the cinematic due at a moment, if there is one: they play one after another, and the returned promise is done when this one is. */
  private queueScene(moment: Moment, party?: readonly string[]): Promise<void> {
    const players = party ? { ...this.players(), party: [...party] } : undefined;
    if (!this.scenesOn() || !dueScene(this.meta, moment)) return this.sceneChain;
    this.sceneHold++;
    this.sceneChain = this.sceneChain
      .then(() => this.playDue(moment, players))
      .catch(() => undefined)
      .then(() => void this.sceneHold--);
    return this.sceneChain;
  }

  /** A set's Last Oath goes off: its fuller cut-in the first time, a short one after, with the five who cast it. */
  playComboMega(setId: string): Promise<void> {
    const set = comboById(setId);
    if (!set) return this.sceneChain;
    const first = dueScene(this.meta, { kind: 'combo', set: setId });
    return this.queueScene(first ? { kind: 'combo', set: setId } : { kind: 'comboCut', set: setId }, set.heroes);
  }

  /** The first time Duchess turns up in a fight (her visit begins: `PageGoat.onArrive`). */
  duchessTurnsUp(): Promise<void> {
    return this.queueScene({ kind: 'duchess' });
  }

  /** The heroes that play a cinematic: the party, and the hero a Calamity run began with. */
  private players(): { party: string[]; lead?: string } {
    return { party: this.meta.party, lead: this.run?.mode?.kind === 'calamity' ? this.run.roster[0]?.kind : undefined };
  }

  /** The cinematic due at a moment, if the save has not seen it: marked seen as it begins (a closed page does not bring it back), then played. */
  private async playDue(moment: Moment, players = this.players()): Promise<void> {
    const id = dueScene(this.meta, moment);
    if (!id) return;
    // (with the Cinematics setting off it is still marked seen, so the Scenes list can play it; it just does not start by itself)
    markSeen(this.meta, id);
    saveMeta(this.meta);
    if (settings().cinematics) await this.scenes.play(id, players);
  }

  /** Every cinematic's id, and the frames of one worth a screenshot (previews: `tools/cinematics/shots.mjs`). */
  sceneIds(): string[] {
    return [...SCENE_ORDER];
  }

  sceneFrames(id: string): [number, number, number][] {
    return previewFrames(SCENES[id]);
  }

  /** The heroes earned in play since the last result was closed: each has its reveal, once, before the game goes on. */
  private earned: string[] = [];
  private async revealEarned(): Promise<void> {
    for (const kind of this.earned.splice(0)) await this.playDue({ kind: 'earned', hero: kind });
  }

  /** Show a weather on this board whatever the fight rolled (for previews and the screenshots: `__game.previewWeather('rain')`). */
  previewWeather(w: Weather): void {
    this.weather.set(w, this.b.board.area, this.boardView.litSpots());
  }

  /** Play a cinematic by id (the Scenes list, and previews: `__game.playScene('opening')`). */
  playScene(id: string): Promise<unknown> {
    // (a Last Oath is played by its set's five, however it is started)
    const mo = SCENES[id]?.moment;
    const five = mo && (mo.kind === 'combo' || mo.kind === 'comboCut') ? comboById(mo.set)?.heroes : undefined;
    return this.scenes.play(id, five ? { ...this.players(), party: [...five] } : this.players());
  }

  /** The long map behind this wave's section (an army run's; any other run has none). Finished waves are baked, with no animation: this is also how a run resumed from a save comes up. */
  private syncChain(): void {
    const c = chainOf(this.run);
    if (c && this.run.stage <= c.length) this.chain.sync(c, this.run.stage - 1);
    else this.chain.clear();
  }

  /** A wave of an army is won: the next section's columns fall onto the edge of this one, and the heroes still standing walk across into their formation, while the recap is up. */
  private startWalk(wave: number): void {
    const c = chainOf(this.run);
    if (!c || wave >= c.length || this.run.stage !== wave + 1) return;
    const next = c[wave];
    const heroes = this.b.units.filter((u) => u.side === 'hero' && u.alive && !UNITS[u.def].summon && u.tag !== undefined);
    // (the whole squad's formation moves over, so the fallen keep their places for the next fight)
    const spots = this.run.squad.flatMap((id) => {
      const at = this.placed.get(String(id));
      return at ? [{ id: String(id), u: at[0], v: at[1] }] : [];
    });
    const goals = transferFormation(next.board, spots);
    for (const [id, at] of goals) this.placed.set(id, at);
    const walkers = heroes.flatMap((unit) => {
      const goal = goals.get(String(unit.tag));
      return goal ? [{ unit, goal }] : [];
    });
    this.walking = new Set(walkers.map((w) => w.unit.id));
    // (the finished fight's fallen are still drawn, where the old section lies against the new one)
    setFrame(frameOf(c[wave - 1], next));
    // (and the camera stays on the same ground, which has moved in the world against the new section)
    const lie = against(c[wave - 1], next);
    const [dx, dy] = rawAt(lie.u, lie.v, 0);
    this.cx += dx;
    this.cy += dy;
    this.tx += dx;
    this.ty += dy;
    this.held = null;
    this.bbox = { x0: this.bbox.x0 + dx, x1: this.bbox.x1 + dx, y0: this.bbox.y0 + dy, y1: this.bbox.y1 + dy };
    document.body.dataset.move = '1';
    this.chain.begin(c, wave - 1, walkers, () => delete document.body.dataset.move);
    this.survey = false;
  }

  /** Whether the camera is standing back to see the whole map. */
  private survey = false;

  /** Stand the camera back to see the whole road so far (or come back to the wave). */
  overview(on = true): void {
    this.survey = on;
    if (!on) this.focus();
  }

  /** A boss stage's first time: the screen dims, the boss's portrait slides in, its name on a ribbon slams down with its title, and the camera glides to it. Once per stage (a restart of the same fight does not replay it). */
  private startIntro(): void {
    const key = `${this.run.seed}:${this.run.stage}`;
    // (a boss, or the named elite of an elite node, gets the card)
    const elite = this.run.tower?.cur?.fight?.elite ? ELITE_BY_ID[this.run.tower.cur.fight.elite] : undefined;
    const boss = this.b.units.find((u) => u.side === 'foe' && (isBoss(u.def) || (elite && u.def === elite.def)));
    if (!boss || this.introduced.has(key)) return;
    this.introduced.add(key);
    this.goat.react('boss');
    this.intro = { t: 0, boss, slammed: false };
    const card = $('bossCard');
    const def = UNITS[boss.def];
    card.classList.toggle('elite', !!elite);
    const name = (elite ? elite.name : def.name).toUpperCase();
    const nameEl = card.querySelector('b')!;
    nameEl.textContent = name;
    // (the name's size, a multiple of 12, the largest whose longest word fits the ribbon and that takes two lines at most (three at 24px); the
    // face's glyphs are two thirds of the size wide, plus the letter spacing, and the ribbon's ends take 148px)
    const room = Math.min(viewW(), 640) - 12 - 148;
    const fits = (px: number) => {
      const per = (px * 2) / 3 + (px >= 36 ? 4 : 2);
      const cols = Math.floor(room / per);
      const words = name.split(' ');
      if (words.some((w) => w.length > cols)) return false;
      let lines = 1;
      let used = 0;
      for (const w of words) {
        if (used && used + 1 + w.length > cols) (lines++, (used = w.length));
        else used += (used ? 1 : 0) + w.length;
      }
      return lines <= (px <= 24 ? 3 : 2);
    };
    const px = [48, 36, 24].find(fits) ?? 12;
    nameEl.style.fontSize = `${px}px`;
    nameEl.style.letterSpacing = `${px >= 36 ? 4 : 2}px`;
    card.querySelector('span')!.textContent = elite ? elite.epithet : titleOf(boss.def);
    // (the whole figure, weapons and all, at a whole-number scale: up to 80% of the width and 38% of the height, so nothing is cut)
    const info = sheetInfo(def.sheet);
    const old = card.querySelector('canvas')!;
    // (the sheets face right; a boss that faces left looks the other way, mirrored in the drawing so the slide-in keeps it)
    const face = wholeFigure(def.sheet, viewW() * 0.8, viewH() * 0.38, !!info && !info.facesRight);
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
    if (bar.hidden === show) bar.hidden = !show;
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
    for (let v = 0; v < this.b.board.d; v++)
      for (let u = 0; u < this.b.board.w; u++) if (isDeployTile(v, this.b.board.d) && standable(tileAt(this.b.board, u, v)) && !unitAt(this.b, u, v)) return [u, v];
    return null;
  }

  private begin(): void {
    if (!fight(this.b)) return;
    this.evolved = new Set();
    this.endIntro();
    newQuipScene();
    foeGrumbles(this.b.units.filter((u) => u.side === 'foe' && !UNITS[u.def].summon).length, (i) => this.anchorOfFoe(i));
    this.stats = startStats(this.b.units);
    startFight(isBossRun(this.run));
    startSynergies(countTraits(kindsOf(this.b.units)), this.b.combo);
    this.chosen = null;
    this.boardView.clearMarks();
    this.refreshBossBar();
    this.layout();
    this.refresh();
  }

  /** Where to point a speech bubble at a hero of this kind on the board: above the head of one of their sprites (page pixels), or null. */
  private anchorOfKind(kind: string): Anchor | null {
    const u = this.b.units.find((x) => x.side === 'hero' && x.def === kind && x.owner === undefined);
    const s = u && this.sprites.get(u.id);
    if (!s || !s.root.visible || this.homeUp) return null;
    const box = s.root.getBounds();
    const r = this.app.canvas.getBoundingClientRect();
    const k = r.width / this.app.screen.width;
    return { x: r.left + ((box.minX + box.maxX) / 2) * k, y: r.top + box.minY * k };
  }

  /** The result's dry line under the numbers (picked from the run's seed, so a given fight always says the same thing). */
  private showJoke(won: boolean): void {
    const line = Rng.from(this.run.seed, this.run.stage, won ? 1 : 2, 0x7e3).pick(won ? RESULT_WIN : RESULT_LOSS);
    const e = $('joke');
    e.textContent = line;
    e.hidden = false;
  }

  /** Where to point a speech bubble at the `i`th living foe (by its order in the fight), or null. */
  private anchorOfFoe(i: number): Anchor | null {
    const foes = this.b.units.filter((x) => x.side === 'foe' && x.alive && !UNITS[x.def].summon);
    const u = foes[i % Math.max(1, foes.length)];
    const s = u && this.sprites.get(u.id);
    if (!s || !s.root.visible || this.homeUp) return null;
    const box = s.root.getBounds();
    const r = this.app.canvas.getBoundingClientRect();
    const k = r.width / this.app.screen.width;
    return { x: r.left + ((box.minX + box.maxX) / 2) * k, y: r.top + box.minY * k };
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
    if (b.phase === 'fight' && this.sceneHold > 0) {
      // (a cinematic is up: the fight is held where it is)
    } else if (b.phase === 'fight') {
      // (a boss's fall slows the fight for a beat: `timeScale`)
      this.acc += Math.min(dt, 250) * this.speed * this.fx.timeScale();
      while (this.acc >= TICK_MS && b.phase === 'fight' && this.sceneHold === 0) {
        this.acc -= TICK_MS;
        const events = stepBattle(b);
        tally(this.stats, events, b.units);
        this.fx.show(b, events);
        for (const e of events) if (e.kind === 'boom') this.boardView.removeBarrel(e.u, e.v);
        // (a fighter a skill called up mid-fight has no sprite yet: make it, with its entrance)
        if (b.units.length !== this.sprites.size) this.syncSprites();
        playEvents(b, events, this.speed);
        for (const e of events) {
          if (e.kind === 'phase') this.startPhase(e);
          // (a promotion the sim made: a hero's tier by level; the page's own merge calls `promoteHero` too)
          else if (e.kind === 'promote') this.promoteHero(e.to, e.grade);
        }
        // (a combo: the bar follows it; once its move has gone off, the codex knows it; the camera leans in when the effects ask)
        if (b.combo) {
          updateCombo(b.combo);
          const cast = events.find((e) => e.kind === 'comboCast');
          if (cast) {
            noteCombos(this.meta, b);
            // (and the Last Oath's cut-in, the fuller one the first time each set fires: the fight is held while it plays)
            void this.playComboMega(b.combo.id);
          }
        }
        const push = this.fx.takePush();
        if (push) this.push = { ...push, left: push.ms };
        // (Duchess has a view on a big blow)
        if (events.some((e) => e.kind === 'hit' && e.heavy && e.dmg >= 90)) this.goat.react('bigHit');
        if (events.some((e) => e.kind === 'hit' || e.kind === 'heal')) this.refreshBench();
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
    this.stepRevive(dt);
    this.refreshBossBar();
    const t = b.phase === 'deploy' ? performance.now() : b.phase === 'fight' ? b.t - TICK_MS + this.acc : b.t + this.acc;
    for (const [id, s] of this.sprites) {
      if (this.walking.has(id)) s.root.visible = false;
      else s.update(b.board, t, b.phase !== 'deploy');
    }
    if (this.chain.active) {
      this.chain.step(dt);
      const f = this.chain.focus();
      if (f) {
        this.tx = f.x;
        this.ty = f.y;
      }
      this.tzoom = 1;
      this.zoom = easeTo(this.zoom, 1, dt, EASE_ZOOM_MS);
    }
    if (this.survey) this.standBack(dt);
    this.boardView.pump();
    this.weather.step(dt);
    // (the camera eases to where it is sent, unless a finger is holding the board)
    if (this.phaseBoss && (!b.pause || b.phase !== 'fight')) this.endPhase();
    if (b.phase === 'fight' && !this.intro) this.phaseBoss ? this.pushOnPhase() : (this.follow(), this.leanIn(dt));
    if (!this.drag?.pan) {
      const f = b.phase === 'fight' && !this.intro;
      this.cx = f ? easeTo(this.cx, this.tx, dt, EASE_MOVE_MS) : this.cx + (this.tx - this.cx) * Math.min(1, dt / 220);
      this.cy = f ? easeTo(this.cy, this.ty, dt, EASE_MOVE_MS) : this.cy + (this.ty - this.cy) * Math.min(1, dt / 220);
      if (f) this.zoom = easeTo(this.zoom, this.tzoom, dt, EASE_ZOOM_MS);
      this.clampCam();
    }
    this.place();
  }

  /** A short camera push the effects asked for (an ultimate, a combo, a tier 3 promotion): the point, how much closer, and the ms left. */
  private push: { x: number; y: number; zoom: number; ms: number; left: number } | null = null;

  /** While a push lasts the camera leans in on its point (the fight camera's view is back when it ends); a manual pan pauses it as it does the follow. */
  private leanIn(dt: number): void {
    const p = this.push;
    if (!p) return;
    p.left -= dt;
    if (p.left <= 0 || performance.now() < this.pausedUntil) {
      this.push = null;
      return;
    }
    this.tx = p.x;
    this.ty = p.y;
    this.tzoom = Math.min(this.tzoom * p.zoom, Math.max(this.minZoom(), 3 / this.scale));
  }

  /** The boss changing form, while the fight is held: the banner is up and the camera is on it. */
  private phaseBoss: Unit | null = null;
  private phaseZoom = 1;

  /** A boss changes form (a sim event): the fight is held for a beat; the camera pushes in on the boss and a banner gives its line. */
  private startPhase(e: Extract<BattleEvent, { kind: 'phase' }>): void {
    const boss = this.b.units.find((u) => u.id === e.by);
    if (!boss) return;
    // (the boss's cut-in: the fight is held while it plays, brief and skippable)
    void this.queueScene({ kind: 'bossForm', boss: boss.def });
    this.phaseBoss = boss;
    this.phaseZoom = Math.min(this.tzoom * 1.4, 3 / this.scale);
    const banner = $('phaseBanner');
    banner.querySelector('b')!.textContent = UNITS[boss.def].name.toUpperCase();
    banner.querySelector('span')!.textContent = `\u201c${e.line}\u201d`;
    // (a new element each time, so its entrance plays again)
    banner.replaceWith(banner.cloneNode(true));
    $('phaseBanner').hidden = false;
    play('boom');
  }

  /** The camera closes in on the changing boss. */
  private pushOnPhase(): void {
    const boss = this.phaseBoss!;
    const [x, y] = at(boss.u, boss.v, tileAt(this.b.board, boss.u, boss.v)?.h ?? 0);
    this.tx = x;
    this.ty = y;
    this.tzoom = this.phaseZoom;
  }

  /** The fight carries on: the banner goes and the camera lets the boss go. */
  private endPhase(): void {
    this.phaseBoss = null;
    $('phaseBanner').hidden = true;
  }

  /** Promote a fighter to `grade` with the whole show (the page's merge after a hire does this, and the sim's `promote` event; the Calamity's tier by level calls it too). A sprite drawn as a lower grade is made again as the new one first. */
  promoteHero(unitId: number, grade: number): void {
    const u = this.b.units.find((x) => x.id === unitId);
    const old = this.sprites.get(unitId);
    if (!u || !old) return;
    if (old.shownGrade < grade) {
      u.grade = grade;
      old.root.destroy({ children: true });
      const s = new UnitSprite(u);
      this.sprites.set(unitId, s);
      this.boardView.root.addChild(s.root);
      s.update(this.b.board, performance.now(), this.b.phase !== 'deploy');
    }
    this.fx.promote(unitId, grade, this.b.phase !== 'fight');
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
        // (a merge's hero rises in light: the same promotion a sim `promote` event plays)
        if (u.tag !== undefined && this.evolved.has(u.tag)) {
          s.update(this.b.board, performance.now(), this.b.phase !== 'deploy');
          this.fx.promote(u.id, u.grade ?? 1, this.b.phase !== 'fight');
        }
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
    this.weather.resize(this.app.screen.width, this.app.screen.height);
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
    // (the row of active synergies sits under the bars during a fight)
    const head = placeSynergies(bar.hidden ? below : bar.getBoundingClientRect().bottom + 4);
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
        if (isDeployTile(v, b.d)) {
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

  /** What the camera may reach: the fight's board, and any road behind it to look back along. */
  private reachBox(): { x0: number; x1: number; y0: number; y1: number } {
    const b = this.bbox;
    const c = this.chain?.box();
    return c ? { x0: Math.min(b.x0, c.x0), x1: Math.max(b.x1, c.x1), y0: Math.min(b.y0, c.y0), y1: Math.max(b.y1, c.y1) } : b;
  }

  /** The camera stands back over the whole road (a view for looking along it). */
  private standBack(dt: number): void {
    const r = this.reachBox();
    this.tx = (r.x0 + r.x1) / 2;
    this.ty = (r.y0 + r.y1) / 2;
    this.tzoom = Math.min(1, this.area.w / (r.x1 - r.x0 + 40) / this.scale, this.area.h / (r.y1 - r.y0 + 40) / this.scale);
    this.zoom = easeTo(this.zoom, this.tzoom, dt, EASE_ZOOM_MS);
  }

  /** Keep the camera over the board: no scrolling past its edge, and a board that fits stays centred. */
  private clampCam(): void {
    const { x0, x1, y0, y1 } = this.reachBox();
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
    this.boardView.cull(this.fx.view = { x0: (0 - w.x) / k + 4, x1: (viewW() - w.x) / k - 4, y0: (this.area.y - w.y) / k + 4, y1: (this.area.y + this.area.h - w.y) / k });
  }

  /** The tile under a point on the screen (the nearest column's top or side). */
  private tileAtScreen(sx: number, sy: number): [number, number] | null {
    const b = this.b.board;
    const wx = (sx - colLeft() - this.world.x) / this.world.scale.x;
    const wy = (sy - this.world.y) / this.world.scale.y;
    // (the nearest column under the point wins: a column in front hides the tops behind it)
    let best: [number, number] | null = null;
    let nearest = -Infinity;
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const t = tileAt(b, u, v)!;
        const [x, y] = at(u, v, t.h);
        const dx = Math.abs(wx - x) / (TW / 2);
        if (dx > 1) continue;
        // (the top, or the column's sides below its top's left and right edges)
        const hit = dx + Math.abs(wy - y) / (TH / 2) <= 1 || (wy > y && wy < y + (TH / 2) * (1 - dx) + t.h * HH + FOOT);
        if (hit && depth(u, v) > nearest) {
          nearest = depth(u, v);
          best = [u, v];
        }
      }
    return best;
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
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const t = tileAt(b, u, v);
        if (!isDeployTile(v, b.d) || !t || !standable(t)) continue;
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
    this.spellGhost.id = 'spellGhost';
    this.spellGhost.hidden = true;
    document.body.append(this.spellGhost);
    window.addEventListener('pointermove', (e) => this.spellMove(e));
    window.addEventListener('pointerup', (e) => this.spellRelease(e, true));
    window.addEventListener('pointercancel', (e) => this.spellRelease(e, false));
    setup();
    startAwake();
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
      if (card) summonBurst(card);
      if (got) heroSays(got.kind, 'hired', () => rectAnchor(card));
    });
    $('homeBtn').addEventListener('click', () => this.home.open());
    // (a tap anywhere hurries the heart-burn: the wave starts at once, and the line goes)
    document.addEventListener('pointerdown', () => this.skipRevive(), true);
    $('next').addEventListener('click', () => {
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
    $('speed').addEventListener('click', () => {
      this.setSpeed(this.speed >= this.fastest() ? 1 : ((this.speed + 1) as 2 | 3));
      // (the last choice is remembered; ×3 is only for tiers already cleared, so the setting keeps ×2 at most)
      setSetting('speed', Math.min(this.speed, 2) as 1 | 2);
    });
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
    const a = startAuto(this.meta, army, tier, count, todayKey());
    if (!a || !spendTicket(this.meta, todayKey())) return;
    saveMeta(this.meta);
    this.auto = a;
    this.autoNext = null;
    play('autoStart');
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
      // (each run spends a day's auto ticket; a new day mid-replay refills them)
      if (!spendTicket(this.meta, todayKey())) return void this.endAuto('tickets');
      saveMeta(this.meta);
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
  private endAuto(why: 'done' | 'loss' | 'stopped' | 'tickets'): void {
    const a = this.auto;
    if (!a) return;
    if (why === 'stopped') stopAuto(a);
    play(why === 'done' ? 'autoDone' : 'autoStop');
    this.auto = null;
    this.autoNext = null;
    this.refreshAuto();
    const army = armyById(a.army)!;
    const card = $('autoSum');
    card.querySelector('h2')!.textContent = why === 'done' ? 'Auto-replay done' : why === 'loss' ? 'Auto-replay stopped' : 'Auto-replay stopped';
    card.querySelector('.asumWhy')!.textContent =
      why === 'done'
        ? `${a.totals.runs} of ${a.count} runs of the ${army.name} cleared`
        : why === 'loss'
          ? `The ${army.name} held at wave ${a.lostAt}. ${a.totals.runs} of ${a.count} runs cleared first`
          : why === 'tickets'
            ? `No auto runs left today. ${a.totals.runs} of ${a.count} runs cleared`
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
    // (a run that levels its own heroes reads nothing of the meta's levels, gear or talents)
    if (this.run.local) return { ...localBoost(h), carry: hpShare(this.run, h.id) };
    return { ...boostOf(h, heroRank(this.meta, h.kind), levelOfKind(this.meta, h.kind), heroStats(this.meta, h.kind)), ...(awakenedOf(this.meta, h.kind) ? { awaken: awakenedOf(this.meta, h.kind) } : {}), carry: hpShare(this.run, h.id) };
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

  /** The tower or the calamity from the home screen: its saved run carries on where it stood; with none, a new one begins (the calamity asks for its hero first). */
  private openMode(kind: 'tower' | 'calamity'): void {
    // (a shut mode has a disabled button; a run begun before it shut is still let in)
    if (!modeOpen(this.meta, kind) && !loadSlot(kind)) return;
    const saved = loadSlot(kind);
    if (saved) return this.resumeSlot(saved);
    if (kind === 'tower') return this.startTower(towerRun(clockSeed(), this.meta));
    pickHero(this.meta, (hero, ascension) => this.startTower(calamityRun(clockSeed(), this.meta, hero, ascension)), () => this.home.open());
  }

  /** Back into a saved tower or calamity run: its map, or the fight it had picked. */
  private resumeSlot(r: Run): void {
    this.run = r;
    this.syncPool();
    this.placed.clear();
    migrateTower(r, ARMIES.filter((a) => armyUnlocked(this.meta, a.id)).map((a) => a.id), this.meta.tower);
    if (r.tower!.cur?.fight) this.newBattle();
    else this.towerView.open(r);
  }

  /** The player chose to start over, behind the map's confirm: the run ends where it stands, pays what it earned, and its slot is emptied. */
  private abandon(): void {
    const run = this.run;
    if (!abandonTower(run)) return this.home.open();
    const summary = settleTower(this.meta, run)!;
    saveMeta(this.meta);
    saveRun(run);
    dropSlot(run.mode?.kind === 'calamity' ? 'calamity' : 'tower');
    this.towerView.showSummary(run, summary, () => this.home.open());
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
    // (a calamity hires from every hero owned; a tower run's pool is the party)
    if (this.run.mode?.kind === 'calamity') this.run.pool = [...this.meta.unlocked];
    else if (this.run.mode?.kind !== 'daily') this.run.pool = [...this.meta.party];
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
  private showXp(gains: Record<string, number>, from: Record<string, number>, ups: LevelUp[], lasting = true): void {
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
      let lv = levelBadge(progressOf(from[kind]).level, 'xpLv');
      // (the look it fought in: the highest grade of the kind that stood in the fight, in that grade's form, framed whole)
      const grade = this.b.units.reduce((g, u) => (u.side === 'hero' && u.def === kind && u.owner === undefined ? Math.max(g, u.grade ?? 1) : g), 1);
      face.className = `xpFace g${grade}`;
      face.append(portrait(formOf(UNITS[kind], grade), 64, grade), lv);
      const name = document.createElement('b');
      name.textContent = UNITS[kind].name;
      const gain = document.createElement('em');
      gain.textContent = `+${xp.toLocaleString('en-GB')} XP`;
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
        const gained = levelGain(up.from, up.to, lasting);
        // (the level-up: a stamp, the badge ticking over, the gains popping in one after the other, a sweep of light and a
        //  burst of sparks; all of it once, none of it looping)
        const stamp = document.createElement('span');
        stamp.className = 'xpStamp';
        stamp.textContent = 'Level up!';
        const grown = levelBadge(up.to, 'xpLv');
        lv.replaceWith(grown);
        lv = grown;
        // (reaching the ultimates' level says so)
        const chips = [`+${gained.hp}% HP`, `+${gained.atk}% Atk`, ...(up.from < ULT_LEVEL && up.to >= ULT_LEVEL ? ['Ultimate unlocked'] : [])].map((t, n) => {
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
    if (this.run.cleared && this.run.mode?.kind === 'daily') {
      $('result').hidden = true;
      return this.home.open(this.dailyPay?.counted ? 'Daily cleared! The daily chest is on the cart.' : 'Daily cleared in practice.');
    }
    if (this.run.cleared && !this.run.tower) return this.armyWon();
    // (the tower: a lost run shows its summary, a won floor goes back to the map)
    if (this.run.tower) {
      $('result').hidden = true;
      saveRun(this.run);
      if (this.run.over) {
        const show = (): void => this.towerView.showSummary(this.run, this.run.tower?.summary ?? settleTower(this.meta, this.run)!, () => this.home.open(`${this.run.mode?.kind === 'calamity' ? (this.run.cleared ? 'The calamity is ended' : 'The calamity ended') : 'The climb ended'} ${this.run.mode?.kind === 'calamity' ? `in map ${Math.min(this.run.tower!.act, CAL_MAPS)}` : `on floor ${this.run.stage}`}: +${this.run.tower!.summary?.crowns ?? this.run.tower!.crowns} crowns earned`));
        // (a Calamity cleared whole has its ending cinematic first, then the victory card)
        if (this.run.cleared && this.run.mode?.kind === 'calamity') void this.queueScene({ kind: 'calVictory' }).then(show);
        else show();
        return;
      }
      return this.towerView.open(this.run);
    }
    // (a lost run goes back to the main screen, with its summary)
    if (this.run.over) return this.goHome();
    saveRun(this.run);
    this.newBattle();
    // (an event waits between two fights: its card opens over the new stage's board)
    if (this.run.event) this.events.openEvent(this.run, () => (saveRun(this.run), this.refresh()));
  }

  /** When the heart has burnt and the wave starts again, and when the whole moment ends (real ms; shorter with reduced motion). */
  private reviveTimes(): { swap: number; end: number } {
    return reducedMotion() ? { swap: 500, end: 1200 } : { swap: 1100, end: 2000 };
  }

  /** The party fell with a heart left: no card and no question. A heart burns, a line says so, and the wave starts again by itself. */
  private beginRevive(): void {
    this.revive = { t: 0, swapped: false, started: false, fightAt: 0, line: reviveLine('A heart burns. The party rises.', this.reviveTimes().end) };
    play('sparkle');
    this.drawLives(this.run);
  }

  /** A tap during the burn skips ahead to the wave starting again, and a tap after that to its fight (and sends the line away). */
  private skipRevive(): void {
    const r = this.revive;
    if (!r) return;
    if (!r.swapped) r.t = Math.max(r.t, this.reviveTimes().swap);
    else {
      r.fightAt = 0;
      r.line?.dismiss();
    }
  }

  /** The burn's clock: at its midpoint the heart is spent and the wave starts again with the retry's gold, the heroes rising in a pillar of light. */
  private stepRevive(dt: number): void {
    const r = this.revive;
    if (!r) return;
    r.t += dt;
    const at = this.reviveTimes();
    if (!r.swapped && r.t >= at.swap) {
      r.swapped = true;
      if (!canRetry(this.run)) return void (this.revive = null);
      this.noteRecap({}, [], false, false);
      // (the heart burning now stays grey from the next draw of the lives)
      const gold = retryWave(this.run)!;
      play('coinRecycle');
      saveRun(this.run);
      this.reviveRestart = true;
      this.newBattle();
      this.reviveRestart = false;
      for (const u of this.b.units) if (u.side === 'hero') this.sprites.get(u.id)?.evolve();
      flyUp(`+${gold} gold`, $('gold'));
      // (the heroes stand where they stood, glowing; a beat later the fight is on, with no Fight! tap)
      r.fightAt = r.t + (reducedMotion() ? 200 : 500);
    }
    if (r.swapped && !r.started && r.t >= r.fightAt) {
      r.started = true;
      if (this.b.phase === 'deploy') this.begin();
    }
    if (r.t >= at.end && r.started) this.revive = null;
  }

  /** The lives at the top (an army's and the daily's hearts, `MAX_RETRIES` of them): full while left, grey once spent, the next one burning during a revive. Only runs that can retry
   *  show them (not the tower or the calamity, which fail their own way). */
  private drawLives(run: Run): void {
    const box = $('lives');
    box.hidden = !!run.tower;
    if (box.hidden) return;
    const left = retriesLeft(run);
    // (a fall with a heart left: the last full heart burns until the wave starts again and spends it)
    const burning = this.revive && !this.revive.swapped ? left - 1 : -1;
    const key = `${left}:${burning}`;
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    box.replaceChildren();
    box.title = `${left} ${left === 1 ? 'life' : 'lives'} left`;
    box.setAttribute('aria-label', box.title);
    for (let i = 0; i < MAX_RETRIES; i++) {
      const img = document.createElement('img');
      img.src = heartUrl;
      img.alt = '';
      img.className = i < left ? 'full' : 'spent';
      if (i === burning) {
        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.append(img);
        box.append(heart);
        burnHeart(heart, img, this.reviveTimes().swap);
      } else box.append(img);
    }
  }

  /** Add the fight just ended (stats, time, pay) to the run's recap. */
  /** A small line under the XP rows: what the heroes that sat out the fight earned, and any that rose a level. */
  private showBench(): void {
    const n = this.benchNote;
    if (!n) return;
    const list = $('xp');
    const rose = n.ups.map((u) => `${UNITS[u.kind].name} Lv ${u.to}`).join(', ');
    const line = document.createElement('small');
    line.className = 'xpBench';
    line.textContent = `Bench +${n.each.toLocaleString('en-GB')} XP each${rose ? ` · ${rose}` : ''}`;
    list.append(line);
    list.hidden = false;
  }

  /** The bench's share of the last fight, for the XP section's small line. */
  private benchNote: { each: number; ups: LevelUp[] } | null = null;

  private noteRecap(gains: Record<string, number>, ups: LevelUp[], won: boolean, settled = true): void {
    const grades: Record<string, number> = {};
    for (const u of this.b.units) if (u.side === 'hero' && u.owner === undefined) grades[u.def] = Math.max(grades[u.def] ?? 1, u.grade ?? 1);
    noteFightStats(this.run, this.stats, this.b.t, won, grades);
    notePayout(this.run, gains, ups, settled ? this.crownGain : 0, this.run.cleared ? this.runStars?.chests.length ?? 0 : 0);
  }

  /** The daily chest on the result card: its picture, where it went, and the bonus stars it earned (nothing for any other fight, or a daily not yet cleared). */
  private drawDailyResult(run: Run): void {
    const box = $('dayResult');
    const pay = this.dailyPay;
    box.hidden = !(run.mode?.kind === 'daily' && run.cleared);
    box.replaceChildren();
    if (box.hidden) return;
    const stars = dailyBonus(run);
    const note = document.createElement('span');
    note.textContent = !pay?.counted ? 'Practice: no chest this time' : `Daily chest in your stash · ${stars.map((r) => `${r.earned ? '★' : '☆'} ${r.text}`).join(' · ')}`;
    if (pay?.counted) box.append(chestPicture('daily', 2).root);
    box.append(note);
  }

  /** The full recap of the run that has ended, then the way on (the home screen, or the armies). */
  private showRunRecap(): void {
    const run = this.run;
    const army = armyOfRun(run);
    const won = !!run.cleared;
    const daily = run.mode?.kind === 'daily' ? run.mode.date : 0;
    const head = daily
      ? won
        ? { title: 'Daily cleared!', tone: 'won' as const, line: `The ${dailyBossName(daily)} has fallen in ${run.recap?.fights ?? 0} fights` }
        : { title: `Daily over · wave ${run.best}/${DAILY_WAVES}`, tone: 'lost' as const, line: `The ${dailyBossName(daily)} was not reached: ${dailyCleared(run)} waves cleared` }
      : won
      ? { title: 'Army defeated!', tone: 'won' as const, line: `${army?.name ?? 'The run'} cleared in ${run.recap?.fights ?? 0} fights` }
      : { title: 'Run over', tone: 'lost' as const, line: army ? `The ${army.name} held at wave ${run.best} of ${army.waves.length}` : `Fell at stage ${run.best} · ${run.roster.length} heroes owned · ${run.summons} hires` };
    const joke = Rng.from(run.seed, won ? 0x7e1 : 0x7e2).pick(won ? RECAP_WIN : RECAP_LOSS);
    showRecap($('recap'), recapOf(run), { ...head, joke }, () => void this.revealEarned().then(() => this.afterResult()));
  }

  /** A run has ended: back to the main screen, showing what it earned. */
  private goHome(): void {
    const r = this.run;
    const army = armyOfRun(r);
    $('result').hidden = true;
    this.home.open(r.mode?.kind === 'daily' ? `Daily over at wave ${r.best}/${DAILY_WAVES}. Tomorrow's boss waits.` : army ? `The ${army.name} stopped you at wave ${r.best}/${army.waves.length}. Heroes keep their levels: go again.` : `The run ended at stage ${r.best}: +${this.crownGain} crowns earned`);
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
    return this.run.squad.includes(h.id) || this.run.squad.length < squadLimit(this.run);
  }

  private put(id: string, tile: [number, number]): void {
    const h = heroOf(this.run, Number(id))!;
    if (!this.canPut(id, tile) || !place(this.b, h.kind, tile[0], tile[1], h.id, this.boostFor(h))) return;
    setSquad(this.run, h.id, true);
    this.placed.set(id, tile);
    saveRun(this.run);
    this.syncSprites();
    heroSays(h.kind, 'placed', () => this.anchorOfKind(h.kind));
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

  /** A hero's level: its own in a run that levels its heroes, else its kind's lasting level. */
  private levelOf(h: Owned): number {
    return this.run.local ? heroLevel(h) : levelOfKind(this.meta, h.kind);
  }

  /** The bench: a card for every hero owned, rebuilt when the roster changes. */
  private buildBench(): void {
    const bench = $('bench');
    const key = `${summonCost(this.run)};` + this.run.roster.map((h) => `${h.id}:${h.grade}:${this.levelOf(h)}:${powerOf(h.kind, this.boostFor(h))}`).join();
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
      const lv = levelBadge(this.levelOf(h));
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
      // (press and drag onto the grid to cast: the tiles it would hit show as the finger moves; a tap arms it as before)
      card.addEventListener('pointerdown', (e) => {
        if (this.b.phase !== 'fight' || sp.target === 'all' || !canAfford(this.b, id)) return;
        this.spellDrag = { id, x: e.clientX, y: e.clientY, moved: false };
      });
      card.addEventListener('click', () => {
        if (this.spellDragged) return void (this.spellDragged = false);
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

  /** The tile a spell dragged to (x, y) would land on: the finger is over the grid (not the panel), the tile a little above it so it can be seen. */
  private spellTile(x: number, y: number): [number, number] | null {
    if (y >= $('panel').getBoundingClientRect().top) return null;
    return this.tileAtScreen(x, y - 24);
  }

  private spellMove(e: PointerEvent): void {
    const d = this.spellDrag;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
    if (this.b.phase !== 'fight' || !canAfford(this.b, d.id)) return this.endSpellDrag();
    if (!d.moved) {
      d.moved = true;
      this.spell = d.id;
      this.spellGhost.innerHTML = spellIconHtml(d.id);
    }
    this.spellGhost.hidden = false;
    this.spellGhost.style.left = `${e.clientX}px`;
    this.spellGhost.style.top = `${e.clientY - 40}px`;
    this.hover = this.spellTile(e.clientX, e.clientY);
    this.markTiles();
    this.refreshSpells();
  }

  /** The finger lifts: over the grid the spell is cast on the tiles shown; anywhere else (back on the panel) it is cancelled. */
  private spellRelease(e: PointerEvent, ok: boolean): void {
    const d = this.spellDrag;
    if (!d) return;
    if (d.moved) {
      const tile = ok ? this.spellTile(e.clientX, e.clientY) : null;
      if (tile && this.b.phase === 'fight') castSpell(this.b, d.id, ...tile);
      this.spell = null;
      this.hover = null;
      this.spellDragged = true;
      setTimeout(() => (this.spellDragged = false), 0);
      this.markTiles();
      this.refreshSpells();
    }
    this.endSpellDrag();
  }

  private endSpellDrag(): void {
    this.spellDrag = null;
    this.spellGhost.hidden = true;
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
    $('spellHint').textContent = this.spell ? (this.spellDrag?.moved ? `${SPELLS[this.spell].text}: let go over the grid to cast, or back on the cards to cancel` : `${SPELLS[this.spell].text}: tap a tile, or drag a card onto the grid (tap the card again to cancel)`) : '';
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
    // (the first defeat has its cinematic as the loss shows, with a heart to burn or not)
    if (ready && b.phase === 'lost' && !this.lossScened && !this.auto) {
      this.lossScened = true;
      void this.queueScene({ kind: 'firstLoss' });
    }
    // (a wave lost with a heart left is not settled: a heart burns and the wave starts again by itself. With none left, or in a mode with none, the loss is settled and the run ends)
    if (ready && b.phase === 'lost' && !this.settled && fallOutcome(run) === 'heart' && !this.revive) this.beginRevive();
    if (ready && !this.settled && !this.revive) {
      this.settled = true;
      const won = b.phase === 'won';
      const stage = run.stage;
      const army = armyOfRun(run);
      const fixed = waveArmyOf(run);
      const daily = run.mode?.kind === 'daily';
      const rating = ratingOf(b, isBossRun(run));
      const before = run.gold;
      noteFight(run, b);
      // (the heroes' skills keep their charge for the next wave)
      if (won) keepCharges(run, b);
      this.bossDown = !!run.tower && run.tower.cur?.kind === 'boss' && won;
      if (run.tower) finishTower(run, b, won, rating.stars);
      else finish(run, won, rating.stars);
      // (a Calamity hero whose level earned it a tier gets the moment a merge's promotion does: the chime, and the flash when it next stands on the board)
      const rose = run.tower?.promoted ?? [];
      if (rose.length) {
        this.evolved = new Set(rose.map((p) => p.id));
        play('merge');
      }
      this.gain = run.gold - before;
      if (won && fixed && !run.cleared && !run.over && !this.auto) this.startWalk(stage);
      const openBefore = army ? ARMIES.filter((a) => armyUnlocked(this.meta, a.id)).map((a) => a.id) : [];
      // (an army pays by wave, and its last boss a clear; any other run pays as it always did)
      this.pay = army ? settleWave(this.meta, army.id, stage, won, rating.stars) : null;
      // (a daily pays by wave and its boss a chest; a practice run pays nothing)
      this.dailyPay = daily ? settleDaily(this.meta, run, { won, stage }) : null;
      this.crownGain = this.pay ? this.pay.crowns : this.dailyPay ? this.dailyPay.crowns : earn(this.meta, stage, won, rating.stars);
      if (run.tower) run.tower.crowns += this.crownGain;
      if (run.tower && run.over) settleTower(this.meta, run);
      if (won && !army && !daily && run.mode?.kind !== 'calamity') recordStars(this.meta, stage, rating.stars);
      const earned = settleRun(this.meta, run, { won, stage, stars: rating.stars, battle: b });
      this.runStars = settleArmyRun(this.meta, run);
      // (the stars this run won may have opened an army: its banner rises when the run's result is left)
      if (this.pay) this.pay.unlocked = ARMIES.find((a) => !openBefore.includes(a.id) && armyUnlocked(this.meta, a.id));
      // (a milestone this fight reached may bring in a hero)
      const joined = grantContent(this.meta);
      toastJoined(joined);
      // (the fight's cinematics, one after another: an army's last stand, a hero earned has its own reveal; the Calamity's end plays before its victory card)
      if (army && this.pay?.firstClear) void this.queueScene({ kind: 'armyClear', army: army.id });
      this.earned.push(...joined);
      // (a run that levels its own heroes taught them in `finishTower`; the lasting XP is not touched)
      const own = run.local ? climbXpView(run) : null;
      const gains = own ? own.gains : fightXp(b, xpRate(this.meta.castle) * tierOf(tierOfRun(run)).xp);
      const from = own ? own.from : Object.fromEntries(Object.keys(gains).map((k) => [k, xpOf(this.meta, k)]));
      // (the heroes of the run that sat out the fight earn a small share, to power-level the low ones)
      const bench = own ? {} : benchXp(gains, run.roster.map((h) => h.kind));
      const ups = own ? own.ups : gainXp(this.meta, { ...gains, ...bench });
      this.benchNote = Object.keys(bench).length ? { each: Object.values(bench)[0], ups: ups.filter((u) => u.kind in bench) } : null;
      this.noteRecap(gains, ups.filter((u) => !(u.kind in bench)), won);
      if (!this.auto) {
        const fought = b.units.filter((u) => u.side === 'hero' && !UNITS[u.def].summon).map((u) => u.def);
        endingQuip(fought, won, (k) => this.anchorOfKind(k));
        if (!won) this.goat.react('wipe');
      }
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
        this.showXp(gains, from, ups, !own);
        this.showBench();
      }
      saveMeta(this.meta);
      saveRun(run);
      toastAchievements(earned);
    }
    document.body.dataset.phase = b.phase;
    document.body.dataset.roster = run.roster.length ? 'some' : 'none';
    const army = armyOfRun(run);
    const fixed = waveArmyOf(run);
    const kind = run.tower?.cur?.kind;
    const stage = `${fixed ? `Wave ${run.stage}/${fixed.waves.length}` : run.mode?.kind === 'calamity' ? `Map ${run.tower!.act} · ${mapProgress(run.tower!).done} of ${mapProgress(run.tower!).total} cleared` : run.tower ? `Floor ${run.stage}` : `Stage ${run.stage}`}${kind === 'elite' ? ' · Elite' : isBossRun(run) ? ' · Boss' : ''}`;
    // (the five of a combo placed: the deploy line says so, so a player finds the combos by trying)
    const combo = b.phase === 'deploy' ? comboOf(b.units.filter((u) => u.side === 'hero' && !UNITS[u.def].summon).map((u) => u.def)) : undefined;
    const deployCombo = combo ? ` · ${COMBO_NAME}: ${combo.name}` : '';
    $('status').textContent =
      b.phase === 'deploy' ? (this.chosen ? `Place the ${this.defOf(this.chosen).name}` : benchFull(run) ? `${stage} · bench full: recycle a hero to hire` : n ? `${stage} · ${n} of ${squadLimit(run)} placed${deployCombo}` : run.roster.length ? `${stage} · drag heroes onto the blue tiles` : `${stage} · no heroes yet: hire two`) : b.phase === 'fight' ? `${stage} · Fight!` : b.phase === 'won' ? 'Victory' : 'Defeat';
    $('gold').textContent = `${run.gold} gold`;
    this.drawLives(run);
    const buy = $('summon') as HTMLButtonElement;
    // (a calamity hires the heroes it meets, at the recruit camps and shops: no random summons)
    buy.hidden = run.mode?.kind === 'calamity';
    const block = hireBlock(run);
    buy.textContent = block === 'bench' ? 'Bench full' : `Hire · ${summonCost(run)}`;
    buy.disabled = block !== null;
    buy.title = block === 'bench' ? 'The bench holds 10 heroes: recycle one, or send one to the field, to hire another' : '';
    ($('fight') as HTMLButtonElement).disabled = b.phase !== 'deploy' || n === 0;
    $('clock').textContent = b.phase === 'deploy' ? '' : clock(b.t);
    const result = $('result');
    result.hidden = !ready || this.towerView.isOpen || !!this.auto || !!this.revive;
    if (!result.hidden) {
      const left = b.units.filter((x) => x.alive && x.side === 'hero' && !UNITS[x.def].summon).length;
      const cal = run.mode?.kind === 'calamity';
      const daily = run.mode?.kind === 'daily';
      const practice = run.mode?.kind === 'daily' && run.mode.practice;
      $('banner').textContent = daily && run.cleared ? 'Daily cleared!' : daily && run.over ? 'Daily over' : run.cleared ? (cal ? 'Calamity ended!' : 'Army defeated!') : this.bossDown ? `${cal ? 'Map' : 'Act'} ${run.tower!.act - 1} cleared!` : b.phase === 'won' ? (run.tower ? (cal ? 'Spot cleared!' : 'Floor cleared!') : 'Victory!') : 'Defeat';
      $('banner').className = `${b.phase}${daily ? ' daily' : ''}`;
      // (a daily's fall names the wave under its heading: "Daily over · wave 6/10")
      if (daily && run.over && !run.cleared) $('banner').append(Object.assign(document.createElement('small'), { textContent: `wave ${run.best}/${DAILY_WAVES}` }));
      const share = this.pay?.replay ? ' (a replay pays a share)' : practice ? ' (practice)' : '';
      const clear = this.pay?.firstClear ? ' · first clear!' : '';
      $('summary').textContent =
        b.phase === 'won'
          ? `${run.tower && !cal ? `Floor ${run.stage - 1} done · ` : ''}${left} of ${heroesPlaced(b)} heroes standing · +${this.gain} gold · +${this.crownGain} crowns${share}${clear} · ${clock(b.t)}${run.found?.length ? ` · found: ${run.found.join(', ')}` : ''}`
          : daily
            ? `The ${dailyBossName(run.mode?.kind === 'daily' ? run.mode.date : 0)} holds at wave ${run.best} of ${DAILY_WAVES} · ${dailyCleared(run)} waves cleared · ${practice ? 'practice, no reward' : `+${dailyCrowns(dailyCleared(run))} crowns`}`
          : run.tower
            ? `The ${cal ? 'calamity' : 'climb'} ends ${cal ? '' : `on floor ${run.stage}, `}${cal ? 'map' : 'act'} ${run.tower.act} · ${cal ? `${run.tower.spots ?? 0} spots cleared` : `${run.stage - 1} floors cleared`} · +${this.crownGain} crowns`
            : army
            ? `The ${army.name} holds at wave ${run.best} of ${army.waves.length}. It starts again from wave 1; your heroes keep their levels.`
            : `The run ends at stage ${run.best} · ${run.roster.length} heroes owned · ${run.summons} summons · +${this.crownGain} crowns${modeNote(run)}`;
      this.showJoke(b.phase === 'won');
      this.drawDailyResult(run);
      $('next').textContent = run.over && !run.tower ? 'Run recap' : run.cleared && run.tower ? 'See the summary' : b.phase === 'won' ? (fixed ? `Next wave (${run.stage})` : run.tower ? 'To the map' : `Next stage (${run.stage})`) : run.tower ? 'See the summary' : 'Home';
    }
    this.refreshAuto();
    if (b.phase === 'deploy' && !this.auto && !(this.revive && !this.revive.started)) tips.atDeploy(n, run.stage, () => this.deployBox());
    this.buildBench();
    this.markTiles();
    this.refreshBench();
    this.refreshTraits();
    this.events.drawStrip(run);
  }

  /** The trait strip: the traits of the heroes placed, lit when their bonus is on; a tap says what one does. */
  private traitPick?: string;
  /** The tier each trait stood at the last time the strip was drawn, so a tier that just woke can light up once. */
  private traitTiers = new Map<string, number>();
  private refreshTraits(): void {
    const strip = $('traits');
    const hint = $('traitHint');
    const counts = countTraits(kindsOf(this.b.units));
    const key = counts.map((c) => `${c.trait.id}${c.count}`).join() + this.traitPick;
    if (strip.dataset.key === key) return;
    strip.dataset.key = key;
    strip.replaceChildren();
    const woke: string[] = [];
    for (const c of counts) {
      const was = this.traitTiers.get(c.trait.id) ?? -1;
      const lit = c.tier > was && strip.dataset.drawn === '1';
      if (lit) woke.push(`${c.trait.name}: ${c.trait.tiers[c.tier].text}`);
      const pill = document.createElement('button');
      pill.className = `trait ${c.trait.kind}${c.active ? ' on' : ''}${lit ? ' wake' : ''}${this.traitPick === c.trait.id ? ' picked' : ''}`;
      // (the chip says the count and what the next tier gives; a trait at its top tier shows just the count)
      const next = c.trait.tiers[c.tier + 1];
      const head = document.createElement('span');
      head.className = 'thead';
      head.append(traitBadge(c.trait.id, { small: true }), document.createTextNode(`${c.trait.name} ${c.count}/${c.goal}`));
      pill.append(head);
      if (next) {
        const fx = document.createElement('small');
        fx.textContent = next.text;
        pill.append(fx);
      }
      pill.addEventListener('click', () => {
        this.traitPick = this.traitPick === c.trait.id ? undefined : c.trait.id;
        this.refreshTraits();
      });
      strip.append(pill);
    }
    this.traitTiers = new Map(counts.map((c) => [c.trait.id, c.tier]));
    strip.dataset.drawn = '1';
    const picked = counts.find((c) => c.trait.id === this.traitPick);
    const near = closestTrait(counts);
    hint.classList.toggle('wake', woke.length > 0);
    hint.textContent = woke.length
      ? `Synergy active! ${woke.join('; ')}`
      : picked
        ? `${picked.trait.name}: ${picked.trait.tiers.map((t) => `${t.need} heroes, ${t.text}`).join('; ')}`
        : near
          ? `${near.trait.name}: ${nextTierLine(near)}`
          : counts.length
            ? 'Different heroes of a trait give a team bonus'
            : '';
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
    for (let v = 0; v < b.board.d; v++)
      for (let u = 0; u < b.board.w; u++) {
        if (!isDeployTile(v, b.board.d) || !standable(tileAt(b.board, u, v))) continue;
        const here = unitAt(b, u, v);
        const ok = who ? this.canPut(who, [u, v]) : !here;
        if (this.hover && this.hover[0] === u && this.hover[1] === v) this.boardView.mark(u, v, who && ok ? 'hover' : 'bad');
        else if (here && who && String(here.tag) === who) this.boardView.mark(u, v, 'chosen');
        else if (ok) this.boardView.mark(u, v, 'deploy');
      }
    if (this.hover && !isDeployTile(this.hover[1], b.board.d)) this.boardView.mark(this.hover[0], this.hover[1], 'bad');
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
