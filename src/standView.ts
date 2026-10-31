// The Last Stand's page (`docs/notes/last-stand.md`): the big field drawn as one baked picture with the fighters on it, the camera
// (the player's own: it starts on the king, a finger pans it and two pinch it, in whole-number steps of pixels, and it goes back
// to the king only when the crown button is tapped; STAND-003), the pause button and its sheet of the heroes, the top bar (wave, the king's health, gold), the countdown of the break with the arrows of the edges the next
// wave comes in by, the spell cards, and the bottom shop bar. The rules are `sim/stand.ts`; this file only shows them and passes
// the player's taps on. It draws into the page's own Pixi canvas, with the board of the ordinary fights hidden meanwhile.

import { ORES } from './sim/awakenMats';
import { Container, Graphics, Sprite, type Application } from 'pixi.js';
import { tileAt } from './sim/board';
import { TICK_MS, type BattleEvent, type Unit } from './sim/battle';
import { ARMIES, armyUnlocked } from './sim/armies';
import { castSpell, canAfford, cooldownLeft, MANA_MAX, SPELLS, type SpellId } from './sim/spells';
import {
  autoPlace, swapPosts, standing, buyLevel, buyRelic, dropStand, foesAlive, goNow, healCost, healKing, levelBlock, levelCost, loadStand, newStandRun, offerCost, pickEight, postHero, relicLine, holdPurse, purseLine,
  saveStand, settleStand, setupFromMeta, snapshot, startFirstWave, startStand, stepStand, waveSpec, weakestHero, type Stand, type StandNote, type StandSummary,
  canSave, fallBack, finishRetreat, hallNow, holdTheLine,
} from './sim/stand';
import { ACT_NUMERALS, RETREAT_MS, reachRoom, ROOM_NAMES } from './sim/standActs';
import { actScene, ACT_LOOKS } from './sim/cineMoments';
import type { Scene } from './sim/sceneKit';
import { lostLine, roomLine } from './standRetreatLines';
import { standRoomTrack } from './render/standMusic';
import { canPost, EDGES, FIELD, KING_AT, ringOf, type Edge } from './sim/standField';
import { heroSays, kingSays, newQuipScene, standFoeGrumbles } from './quips';
import { hideQuip, type Anchor } from './quipView';
import { closeCalls, KING_LOW_HP, ultimatesCast } from './render/quipRules';
import { heroRank, saveMeta, type Meta } from './sim/meta';
import { settleStudy } from './sim/books';
import { settleWear } from './sim/wear';
import { FightHud } from './fightHud';
import { HoldPress, UnitInfoCard } from './unitInfo';
import { infoOf } from './unitInfoRules';
import { heroArtUrl, UltMoments } from './ultMoment';
import { fullScene } from './ultMomentRules';
import { portrait } from './render/sheets';
// (JRPG-RECAP: the end card's results: each hero's run levels and the stats they added, the MVP, the crowns counted up)
import { playResults, type JrHero, type JrPlayer } from './jrpgRecapView';
import { standGrowth, statsAt } from './sim/jrpgRecap';
import { facePortrait } from './jrpgResults';
import { ICONS } from './menuArt';
import { heroTitle } from './sim/heroNames';
import { awakenedOf } from './sim/awaken';
import { rankMult } from './sim/meta';
import { battleSheet, lookSheet } from './render/awakenLook';
import { UNITS } from './sim/units';
import { levelOfKind } from './sim/levels';
import { RELICS } from './sim/relics';
import { iconImg, relicIcon } from './render/items';
import { BoardView } from './render/boardView';
import { Fx } from './render/fx';
import { UnitSprite } from './render/unitView';
import { setBackdrop, panBackdrop } from './render/backdrop';
import { at, depth, setFrame, HH, TH, TW } from './render/iso';
import { easeTo, EASE_MOVE_MS, EASE_ZOOM_MS } from './render/cameraRules';
import { bossHit, NUDGE_MS, nudgeOffset, wheelStep } from './render/standCam';
import { StandHall, standHallArt, standBackwallUrl } from './render/standHall';
import type { HallKind } from './sim/standHalls';
import { standSheet } from './sim/standSheet';
import { endFight, endWave, play, playEvents, setAct, startFight } from './render/sound';
import { colLeft, viewH, viewW } from './viewport';
import { spellIconHtml } from './spellIcons';
import { clockSeed } from './modes';
import { settings } from './settings';
import { rulerOf, rulerWords } from './rulerRules';
import { noteQuests, standFight } from './sim/quests';
import { noteChains } from './sim/eidolonChains';
import { EidolonCall } from './eidolonCall';
import { addHorn, standHornGain } from './sim/warHorn';
import { BOSS_EVERY } from './sim/stand';

/** What the page lends the Last Stand: the canvas, the save, the way home. */
export interface StandHost {
  app: Application;
  meta(): Meta;
  /** The ordinary board's drawing is hidden (true) or shown again (false) while the Last Stand is up. */
  hideBoard(hidden: boolean): void;
  onHome(): void;
  /** Play a cinematic due at a moment (the run waits while it plays). */
  moment(m: { kind: 'spire'; floor: number }): Promise<void>;
  /** Play a cinematic made on the spot with these heroes (CINE-001: an act card); true if it played, false with cinematics off. */
  film?(scene: Scene, party: readonly string[]): Promise<boolean>;
  /** Quests the run's end completed (QUESTS: the page toasts them). */
  questsDone?(ids: string[]): void;
}

/** How long the title card of a new room stays (ms) unless it is tapped away (STAND-RETREAT). */
const TITLE_MS = 3400;

/** The heroes' colours (their rings, tray cards and portraits' rims), by their place in the party. */
const HERO_COLOURS = [0xffd24a, 0x4ad2ff, 0xff6a4a, 0x8aff6a, 0xd06aff, 0xf2f2f2, 0xff9ad0, 0x6affd2];
const colourCss = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = rulerWords(text, settings().ruler);
  return e;
};

/** The most the camera may be zoomed, in CSS px per world px: from a little under a third (about eight tiles across a phone at the least) to two. */
const SCALE_MIN = 0.5;
const SCALE_MAX = 2;
/** How long after a wave begins that a foe grumbles (battle ms): the king's line has gone, and the first foes are in. */
const GRUMBLE_AFTER_MS = 5200;
/** How long a wave's banner stays (ms). */
const BANNER_MS = 1800;
/** How long the relic won by holding the line stays on show (ms; STAND-HOLD-RELIC). */
const GAIN_MS = 4200;

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
  /** The castle's room the run is fought in, drawn (`render/standHall.ts`), and its dark backdrop over the page's sky. */
  private hall = new StandHall();
  private sky: HTMLElement | null = null;
  /** Which build of the room is current (a run started while the art loads is drawn when it arrives). */
  private hallFor = 0;
  /** The aids to find the heroes (STAND-003): a ring of each hero's colour under it, the foes' own red bars, and arrows at the screen's rim to heroes off it. */
  private rings = new Graphics();
  private foeBars = new Graphics();
  private finds = new Map<number, HTMLElement>();
  /** The deploy tray's cards (a hero's roster id each), and the card picked for a swap. */
  private trayPick: number | null = null;
  private trayKey = '';
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
  /** The eight heroes' rows (`fightHud.ts`, BATTLE-HUD): two columns of compact rows, their pools, skills and ultimates (a tap fires one); its Auto
   *  switch stands by the spell orbs under the top bar. */
  private hud!: FightHud;
  /** UNIT-INFO (docs/notes/unit-info.md): a press-and-hold on a unit in the deploy or a break opens its info card (the break waits while it is open). */
  private press = new HoldPress();
  private info = new UnitInfoCard();
  /** The ultimates' moments (`ultMoment.ts`, ULT-CUTIN). */
  private ultm!: UltMoments;
  private shown = new Map<string, string>();
  private summary: StandSummary | null = null;
  /** EIDOLONS: the War Horn and the Eidolon's call (`eidolonCall.ts`). */
  private eid!: EidolonCall;

  constructor(host: StandHost) {
    this.host = host;
  }

  /** Build the page's pieces (once) and the field's layers on the canvas. */
  init(): void {
    if (this.ready) return;
    this.ready = true;
    this.holder.sortableChildren = true;
    this.holder.addChild(this.marks, this.rings, this.foeBars, this.fx.dimLayer, this.fx.root);
    // (the post marks and the heroes' rings lie on the floor, under everyone; the foes' bars over everyone)
    this.marks.zIndex = -5e5;
    this.rings.zIndex = -4e5;
    this.foeBars.zIndex = 9e5;
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
    centre.title = 'Centre on your ruler';
    centre.setAttribute('aria-label', 'Centre on your ruler');
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
    this.hud = new FightHud(heroes, {
      onAuto: (on) => {
        const m = this.host.meta();
        m.ultAuto = on;
        saveMeta(m);
        if (this.s) this.s.b.autoUlt = on;
      },
      autoOn: () => !!this.host.meta().ultAuto,
      // (a tap on a row also takes the camera to that hero)
      onTap: (u) => this.panTo(u.id),
      dockTop: () => this.parts.bottom.getBoundingClientRect().top,
      ultFull: () => fullScene(settings().ultFull, !!this.host.meta().ultAuto),
      ultArt: (u) => heroArtUrl(u.def, u.awaken ?? 0),
    });
    this.ultm = new UltMoments({
      anchor: (id) => {
        const sp = this.sprites.get(id);
        if (!sp) return null;
        const k = this.world.scale.x;
        return { x: this.world.x + sp.x * k, y: this.world.y + (sp.y - sp.tall / 2) * k };
      },
      // (ULT-EPIC: the light over an area the ultimate works on, and the moment's bursts drawn in this view's effects)
      tile: (u, v) => {
        const b = this.state?.b;
        const t = b ? tileAt(b.board, u, v) : undefined;
        if (!t) return null;
        const [wx, wy] = at(u, v, t.h);
        const k = this.world.scale.x;
        return { x: this.world.x + wx * k, y: this.world.y + wy * k };
      },
      art: (u) => heroArtUrl(u.def, u.awaken ?? 0),
      fx: this.fx,
    });
    // (the king's spells as orbs under the top bar, with the Auto switch at the row's end: BATTLE-HUD)
    const orbs = el('div', 'stOrbs');
    orbs.append(spells, this.hud.autoEl);
    // (EIDOLONS: the War Horn at the row's left end; the Last Stand is one long fight, so it is blown once a run)
    this.eid = new EidolonCall({
      meta: () => this.host.meta(),
      save: () => saveMeta(this.host.meta()),
      fx: this.fx,
      anchor: (id) => {
        const sp = this.sprites.get(id);
        if (!sp) return null;
        const k = this.world.scale.x;
        return { x: this.world.x + sp.x * k, y: this.world.y + (sp.y - sp.tall / 2) * k };
      },
      tile: (u, v) => {
        const b = this.state?.b;
        const t = b ? tileAt(b.board, u, v) : undefined;
        if (!t) return null;
        const [wx, wy] = at(u, v, t.h);
        const k = this.world.scale.x;
        return { x: this.world.x + wx * k, y: this.world.y + wy * k };
      },
      stage: () => this.host.app.canvas,
    });
    orbs.prepend(this.eid.horn.root);
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
      btn('heal', 'Heal your ruler', () => this.buy(() => healKing(this.s!) !== null)),
    );
    const start = el('button', 'stStart primary', 'Begin');
    start.addEventListener('click', () => this.begin());
    // (the deploy tray: the eight at their posts, tap two to swap them, Auto-place, Begin)
    const tray = el('div', 'stTray');
    const roster = el('div', 'stRoster');
    const trayRow = el('div', 'stTrayRow');
    const auto = el('button', 'stAutoPlace', 'Auto-place');
    auto.addEventListener('click', () => {
      if (this.s && autoPlace(this.s)) {
        play('tap');
        this.trayPick = null;
        this.picked = null;
        this.drawMarks();
        this.save();
      }
    });
    trayRow.append(auto, start);
    tray.append(el('h3', '', 'Hold the throne'), el('p', 'stTip', 'Your eight stand at their posts. Tap two heroes to swap them, or drag one onto a glowing tile.'), roster, trayRow);
    bottom.append(heroes, offer, bar, tray);
    const finds = el('div', 'stFinds');
    const vignette = el('div', 'stVignette');
    vignette.hidden = true;
    const end = el('div', 'stEnd');
    end.hidden = true;
    const ask = el('div', 'stAsk');
    ask.hidden = true;
    const pick = el('div', 'stAsk stPick');
    pick.hidden = true;
    const sheet = el('div', 'stAsk stSheet');
    sheet.hidden = true;
    // (the retreat, STAND-RETREAT: the choice at an act's end, a layer that takes a tap to skip the walk, and the new room's title card)
    const choice = el('div', 'stAsk stChoice');
    choice.hidden = true;
    const skip = el('div', 'stSkip');
    skip.append(el('span', '', 'Tap to skip'));
    skip.hidden = true;
    skip.addEventListener('click', () => this.skipRetreat());
    const title = el('div', 'stTitle');
    title.hidden = true;
    title.addEventListener('click', () => this.endTitle());
    // (the relic holding the line pays, announced under the banner: STAND-HOLD-RELIC)
    const gain = el('div', 'stGain');
    gain.hidden = true;
    root.append(this.input, vignette, top, orbs, centre, count, arrows, finds, info, banner, gain, bottom, end, ask, pick, sheet, skip, title, choice);
    document.body.append(root);
    this.parts = { tray, roster, finds, vignette, leave, speed, pause, centre, sheet, wave, king, gold, count, go, arrows, info, banner, bottom, spells, orbs, heroes, mana, cards, offer, bar, start, end, ask, pick, choice, skip, title, gain };
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
    this.ultm.warm(s.b);
    this.eid.arm(s.b);
    this.music(s.run.seed);
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
      // (every run begins in the courtyard and falls back room by room: STAND-RETREAT)
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
    this.endTitle();
    this.parts.choice.hidden = true;
    this.parts.gain.hidden = true;
    this.parts.skip.hidden = true;
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
    // (a run saved at an act's end asks its question again)
    if (this.s.phase === 'choice' && this.s.run.retreat) this.drawChoice(this.s.run.wave - 1, this.s.run.retreat.to);
  }

  /** Go back to the home screen (the run, if still going, stays saved at its last break). */
  private leave(): void {
    hideQuip();
    this.active = false;
    this.track = '';
    endFight();
    this.ultm.clear();
    this.hud.hideFloating();
    this.root.hidden = true;
    this.world.visible = false;
    this.parts.ask.hidden = true;
    this.showSky(false);
    this.hallFor++;
    this.hall.clear();
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
      el('p', 'stDim', 'Or give up now: your ruler falls, and the run is paid for the waves it has cleared.'),
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
    if (!s || !canSave(s)) return;
    saveStand(snapshot(s));
  }

  /* -------------------------------------------------------------- the field and the fighters */

  private buildField(): void {
    this.field?.destroy({ texture: true });
    this.field = null;
    const s = this.s!;
    // (the castle's room: drawn when its pictures are in; they are in the game's own bundle)
    const n = ++this.hallFor;
    this.hall.clear();
    void standHallArt().then((art) => {
      if (n !== this.hallFor || this.s !== s) return;
      this.hall.build(this.holder, s.b.board, s.run.seed, hallNow(s.run), art);
    });
    setBackdrop(s.b.board.area);
    this.showSky(true);
    this.drawMarks();
  }

  /** The dark castle backdrop over the page's own sky (the throne room's back wall, dimmed, over deep stone), while the Last Stand is up. */
  private showSky(on: boolean): void {
    if (!this.sky) {
      const sky = document.getElementById('sky');
      this.sky = el('div', 'stSky');
      this.sky.style.backgroundImage = `linear-gradient(#080b13ed, #080b13e8 40%, #050409 75%), url(${standBackwallUrl})`;
      sky?.after(this.sky);
    }
    this.sky.hidden = !on;
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
      // (the king is the room's: on his throne, `StandHall`)
      if (this.sprites.has(u.id) || u.id === s.king.id) continue;
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

  /** Mark the posts. Before the first wave every tile a hero may be posted on is faintly lit and the heroes' posts glow gold (breathing, held
   *  still under reduced motion), the picked one green; in a fight a hero picked shows where it may go, and the posts keep a thin gold rim. */
  private drawMarks(): void {
    const s = this.s;
    const g = this.marks;
    g.clear();
    if (!s) return;
    const diamond = (u: number, v: number, colour: number, a: number, line = 0, grow = 0) => {
      const [x, y] = at(u, v, tileAt(s.b.board, u, v)?.h ?? 0);
      g.poly([x, y - TH / 2 + 2 - grow, x + TW / 2 - 3 + grow * 2, y, x, y + TH / 2 - 2 + grow, x - TW / 2 + 3 - grow * 2, y]);
      if (line) g.stroke({ color: colour, alpha: a, width: line });
      else g.fill({ color: colour, alpha: a });
    };
    const deploy = s.phase === 'deploy';
    const breathe = deploy && !this.hall.reduced ? 0.5 + 0.5 * Math.sin(performance.now() / 420) : 0.6;
    if (deploy || this.picked !== null) {
      for (let v = KING_AT.v - 6; v <= KING_AT.v + 6; v++)
        for (let u = KING_AT.u - 6; u <= KING_AT.u + 6; u++) if (canPost(s.b.board, u, v)) diamond(u, v, this.picked !== null ? 0x4a9cff : 0x7fc7ff, this.picked !== null ? 0.2 : 0.07);
    }
    for (const h of s.run.heroes) {
      if (!standing(h)) continue;
      const [u, v] = h.post!;
      const mine = h.id === this.picked;
      if (deploy) {
        diamond(u, v, mine ? 0x6dff8a : 0xffc84a, 0.22 + 0.16 * breathe);
        diamond(u, v, mine ? 0xb8ffc8 : 0xfff2b0, 0.95, 2);
        diamond(u, v, mine ? 0x6dff8a : 0xffd76a, 0.2 + 0.25 * breathe, 2, 4);
      } else diamond(u, v, mine ? 0x6dff8a : 0xffe066, mine ? 0.9 : 0.4, 1.5);
    }
  }

  /** The deploy tray's cards: the eight standing heroes in their brass frames (the one picked for a swap lit); built again only when the eight change. */
  private drawTray(): void {
    const s = this.s!;
    const roster = this.parts.roster;
    const heroes = s.run.heroes.filter(standing);
    const key = heroes.map((h) => `${h.id}:${h.kind}`).join();
    if (key !== this.trayKey) {
      this.trayKey = key;
      roster.replaceChildren();
      heroes.forEach((h) => {
        const card = el('button', 'stMan');
        card.dataset.id = String(h.id);
        const pic = portrait(lookSheet(h.kind, heroRank(this.host.meta(), h.kind), 1), 40, 1);
        pic.className = 'stManPic';
        card.append(pic, el('span', '', UNITS[h.kind].name));
        card.style.setProperty('--hc', colourCss(this.colourOf(h.id)));
        this.wireCard(card, h.id);
        roster.append(card);
      });
    }
    for (const c of roster.children as HTMLCollectionOf<HTMLElement>) c.classList.toggle('pick', Number(c.dataset.id) === this.trayPick);
  }

  /** A tray card: tapped, it is picked (a second card tapped trades posts with it); dragged onto the field, it is posted there (or swapped with the hero there). */
  private wireCard(card: HTMLElement, id: number): void {
    let drag: { x: number; y: number; ghost: HTMLElement | null } | null = null;
    card.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, ghost: null };
      // (UNIT-INFO: a finger resting on the card opens the hero's info card)
      const unit = this.s?.b.units.find((u) => u.side === 'hero' && u.tag === id);
      if (unit) this.press.start(e.clientX, e.clientY, () => ((drag = null), this.openInfo(unit)));
      try {
        card.setPointerCapture(e.pointerId);
      } catch {
        /* (a pointer already gone) */
      }
    });
    card.addEventListener('pointermove', (e) => {
      this.press.move(e.clientX, e.clientY);
      if (!drag) return;
      if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10) {
        const pic = card.querySelector('canvas');
        drag.ghost = el('div', 'stGhost');
        if (pic) {
          const c = portrait(lookSheet(this.s!.run.heroes.find((h) => h.id === id)!.kind, heroRank(this.host.meta(), this.s!.run.heroes.find((h) => h.id === id)!.kind), 1), 48, 1);
          drag.ghost.append(c);
        }
        this.root.append(drag.ghost);
        this.picked = id;
      }
      if (drag.ghost) drag.ghost.style.transform = `translate(${e.clientX - 24}px, ${e.clientY - 56}px)`;
    });
    const up = (e: PointerEvent) => {
      this.press.cancel();
      const d = drag;
      drag = null;
      if (!d || !this.s) return;
      if (d.ghost) {
        d.ghost.remove();
        const tile = this.tileAtScreen(e.clientX - colLeft(), e.clientY);
        const other = tile ? this.heroOn(tile[0], tile[1], id) : null;
        if (tile && (other !== null ? swapPosts(this.s, id, other) : postHero(this.s, id, tile[0], tile[1]))) {
          play('tap');
          this.save();
        }
        this.picked = null;
        this.trayPick = null;
      } else if (this.trayPick !== null && this.trayPick !== id) {
        if (swapPosts(this.s, this.trayPick, id)) {
          play('tap');
          this.save();
        }
        this.trayPick = null;
        this.picked = null;
      } else {
        this.trayPick = this.trayPick === id ? null : id;
        this.picked = this.trayPick;
        play('tap');
      }
      this.drawMarks();
      this.drawTray();
    };
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', () => {
      drag?.ghost?.remove();
      drag = null;
    });
  }

  /** A hero's colour (its ring, its tray card and its portrait's rim): by its place in the party. */
  private colourOf(heroId: number): number {
    const i = this.s ? this.s.run.heroes.findIndex((h) => h.id === heroId) : 0;
    return HERO_COLOURS[(i < 0 ? 0 : i) % HERO_COLOURS.length];
  }

  /** The aids to find the heroes, each frame of a fight: a ring of its colour under each hero, the foes' bars, arrows at the rim to heroes off the screen. */
  private aids(dt: number): void {
    const s = this.s!;
    const rings = this.rings;
    const bars = this.foeBars;
    rings.clear();
    bars.clear();
    if (this.flashAt) {
      this.flashAt.left -= dt;
      if (this.flashAt.left <= 0) this.flashAt = null;
    }
    const fight = s.phase !== 'deploy';
    for (const u of s.b.units) {
      if (!u.alive) continue;
      const sp = this.sprites.get(u.id);
      if (!sp || !sp.root.visible) continue;
      if (u.side === 'hero' && u.tag !== undefined && fight) {
        const c = this.colourOf(u.tag);
        rings.ellipse(sp.x, sp.y, 20, 10).fill({ color: c, alpha: 0.16 }).stroke({ color: c, width: 2, alpha: 0.95 });
        // (a hero gone to help where the fighting is, STAND-004: a pointer of its colour from its ring towards the foe it was sent to, and a thin ring under that foe)
        const aid = s.b.stand?.help?.[u.id];
        const to = aid !== undefined ? this.sprites.get(aid) : undefined;
        if (to?.root.visible) {
          const dx = to.x - sp.x;
          const dy = to.y - sp.y;
          const len = Math.hypot(dx, dy);
          if (len > 30) {
            const ux = dx / len;
            const uy = dy / len;
            // (a faint line of its colour along the floor to the foe, and an arrowhead at the ring's rim)
            rings.moveTo(sp.x + ux * 24, sp.y + uy * 12).lineTo(to.x - ux * 16, to.y - uy * 8).stroke({ color: c, width: 2, alpha: 0.4 });
            const tip = { x: sp.x + ux * 40, y: sp.y + uy * 20 };
            const back = { x: sp.x + ux * 24, y: sp.y + uy * 12 };
            rings.poly([tip.x, tip.y, back.x - uy * 9, back.y + ux * 9, back.x + uy * 9, back.y - ux * 9]).fill({ color: c, alpha: 0.95 }).stroke({ color: 0x140808, width: 1, alpha: 0.7 });
          }
          rings.ellipse(to.x, to.y, 16, 8).stroke({ color: c, width: 1.5, alpha: 0.7 });
        }
        if (this.flashAt?.id === u.id) {
          const k = 1 - this.flashAt.left / 900;
          rings.ellipse(sp.x, sp.y, 20 + 22 * k, 10 + 11 * k).stroke({ color: c, width: 2, alpha: 0.9 * (1 - k) });
        }
      } else if (u.side === 'foe') {
        // (the foe's own bar is hidden: the Last Stand draws its foes' bars red, wider and framed, a boss's broader with a gilt frame)
        const own = (sp as unknown as { bar?: { visible: boolean } }).bar;
        if (own) own.visible = false;
        const boss = (u.size ?? 1) > 1.2;
        const w = boss ? 56 : 30;
        const y = sp.y - sp.tall - 10;
        const share = Math.max(0, u.hp / u.maxHp);
        bars.rect(sp.x - w / 2 - 1, y - 1, w + 2, boss ? 7 : 5).fill({ color: 0x140808, alpha: 0.9 }).stroke({ color: boss ? 0xd8b060 : 0x5a2018, width: 1 });
        bars.rect(sp.x - w / 2, y, w * share, boss ? 5 : 3).fill({ color: boss ? 0xc0182a : 0xe0362a });
      }
    }
    if (this.frameN % 4 === 0) this.findArrows(fight);
  }

  /** The arrows at the rim: one for each standing hero off the screen, its portrait in a ring of its colour, pointing its way; a tap takes the camera there. */
  private findArrows(fight: boolean): void {
    const s = this.s!;
    const box = this.parts.finds;
    const room = this.room;
    const k = this.world.scale.x;
    const seen = new Set<number>();
    if (fight)
      for (const u of s.b.units) {
        if (u.side !== 'hero' || u.tag === undefined || !u.alive) continue;
        const sp = this.sprites.get(u.id);
        if (!sp) continue;
        const x = this.world.x + sp.x * k;
        const y = this.world.y + (sp.y - sp.tall / 2) * k;
        const inside = x > 8 && x < room.w - 8 && y > room.y + 8 && y < room.y + room.h - 8;
        if (inside) continue;
        seen.add(u.id);
        let a = this.finds.get(u.id);
        if (!a) {
          a = el('button', 'stFind');
          a.style.setProperty('--hc', colourCss(this.colourOf(u.tag)));
          const pic = portrait(battleSheet(u.def, u.awaken ?? 0, u.grade ?? 1), 32, u.grade ?? 1);
          a.append(el('i'), pic, el('b'));
          const id = u.id;
          a.addEventListener('click', () => this.panTo(id));
          box.append(a);
          this.finds.set(u.id, a);
        }
        const cx = room.w / 2;
        const cy = room.y + room.h / 2;
        const ang = Math.atan2(y - cy, x - cx);
        const ax = Math.max(26, Math.min(room.w - 26, x));
        const ay = Math.max(room.y + 26, Math.min(room.y + room.h - 26, y));
        a.style.transform = `translate(${Math.round(ax - 22)}px, ${Math.round(ay - 22)}px)`;
        (a.querySelector('b') as HTMLElement).style.transform = `rotate(${Math.round((ang * 180) / Math.PI)}deg)`;
        a.hidden = false;
      }
    for (const [id, a] of this.finds) if (!seen.has(id)) a.hidden = true;
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
        this.press.cancel();
        const [a, b] = [...this.pointers.values()];
        this.gesture = { kind: 'pinch', x: 0, y: 0, cx: this.cx, cy: this.cy, moved: true, d0: Math.hypot(a.x - b.x, a.y - b.y), s0: this.tscale };
        return;
      }
      const x = e.clientX - colLeft();
      const hero = this.heroAt(x, e.clientY);
      this.gesture = { kind: hero !== null ? 'hero' : 'pan', x, y: e.clientY, cx: this.cx, cy: this.cy, moved: false, hero: hero ?? undefined };
      // (UNIT-INFO: a finger resting on a unit in the deploy or a break opens its card; the gesture it began is let go)
      const held = this.s && (this.s.phase === 'deploy' || this.s.phase === 'break') && !this.spell ? this.unitAt(x, e.clientY) : undefined;
      if (held) this.press.start(e.clientX, e.clientY, () => ((this.gesture = null), this.openInfo(held)));
    });
    inp.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p || !this.gesture) return;
      p.x = e.clientX - colLeft();
      p.y = e.clientY;
      this.press.move(e.clientX, e.clientY);
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
      this.press.cancel();
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
          const other = at && this.s ? this.heroOn(at[0], at[1], g.hero) : null;
          if (at && this.s && (other !== null ? swapPosts(this.s, g.hero, other) : postHero(this.s, g.hero, at[0], at[1]))) {
            play('tap');
            this.picked = null;
            this.save();
          } else this.picked = g.hero;
        } else if (this.picked !== null && this.picked !== g.hero && this.s && swapPosts(this.s, this.picked, g.hero)) {
          // (a hero picked, then another tapped: they trade posts)
          play('tap');
          this.picked = null;
          this.save();
        } else this.picked = this.picked === g.hero ? null : g.hero;
        this.trayPick = this.picked;
        this.drawMarks();
        this.refreshBar(true);
        return;
      }
      if (g.moved) return;
      const tile = this.tileAtScreen(x, e.clientY);
      if (!tile || !this.s) return;
      if (this.spell) {
        if (castSpell(this.s.b, this.spell, tile[0], tile[1])) this.hall.react('cast'); // (the spell's own cast sound plays from its event: spellSfx.ts)
        this.spell = null;
        this.refreshSpells();
        return;
      }
      if (this.picked !== null) {
        const other = this.heroOn(tile[0], tile[1], this.picked);
        if (other !== null ? swapPosts(this.s, this.picked, other) : postHero(this.s, this.picked, tile[0], tile[1])) {
          play('tap');
          this.save();
        }
        this.picked = null;
        this.trayPick = null;
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

  /** The roster id of the standing hero posted on (or standing on) a tile, other than `not`; null when none. */
  private heroOn(u: number, v: number, not: number): number | null {
    const s = this.s!;
    const h = s.run.heroes.find((x) => x.id !== not && standing(x) && ((x.post![0] === u && x.post![1] === v) || s.b.units.some((y) => y.tag === x.id && y.alive && y.u === u && y.v === v)));
    return h ? h.id : null;
  }

  /** The camera eases to a hero (a portrait or a rim arrow tapped). */
  private panTo(unitId: number): void {
    const sp = this.sprites.get(unitId);
    if (!sp) return;
    this.tx = sp.x;
    this.ty = sp.y - sp.tall / 2;
    this.clampCam();
    this.flashAt = { id: unitId, left: 900 };
  }
  /** A hero just found (its ring pulses a moment). */
  private flashAt: { id: number; left: number } | null = null;

  /** UNIT-INFO: any unit under a point on the screen (its sprite), nearest first: the heroes, the king, the foes. */
  private unitAt(sx: number, sy: number): Unit | undefined {
    const s = this.s;
    if (!s) return undefined;
    const wx = (sx - this.world.x) / this.world.scale.x;
    const wy = (sy - this.world.y) / this.world.scale.y;
    let best: Unit | undefined;
    let near = Infinity;
    for (const u of s.b.units) {
      const sp = u.alive ? this.sprites.get(u.id) : undefined;
      if (!sp) continue;
      const d = Math.hypot(Math.abs(wx - sp.x) / 1.3, wy - (sp.y - sp.tall / 2));
      if (d < Math.max(22, sp.tall * 0.55) && d < near) {
        near = d;
        best = u;
      }
    }
    return best;
  }

  /** UNIT-INFO: the card of unit `u` (a pure read of it). */
  private openInfo(u: Unit): void {
    const m = this.host.meta();
    const pic = u.side === 'hero' && u.tag !== undefined ? portrait(lookSheet(u.def, heroRank(m, u.def), 1), 48, 1) : portrait(u.look ?? UNITS[u.def].sheet, 48, 1);
    this.info.open(infoOf(this.s!.b, u, { meta: m, autoUlt: !!m.ultAuto }), pic);
    play('tap');
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
    // (the room round the dais seen wide: the largest step not over 0.7, else the smallest; the player pinches in from there)
    this.scale = this.tscale = [...steps].reverse().find((k) => k <= 0.701) ?? steps[0];
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
    // (a skill's sheet open on the hero rows holds the fight too: BATTLE-HUD)
    const live = s.phase === 'wave' || s.phase === 'break' || s.phase === 'retreat';
    const fighting = live && !this.hold && !this.paused && !this.hud.holding && !this.info.isOpen && !this.eid.sheetOpen;
    // (EIDOLONS: the call's cinematic moves on in real time, the fight held under it but for the strike's one tick)
    this.eid.see(s.b);
    this.eid.frame(dt, !live);
    // (an ultimate's moment (ULT-CUTIN) moves on in real time; while it holds the fight only its effects move)
    if (live) this.ultm.frame(s.b, dt, !fighting);
    else if (this.ultm.queue.current) this.ultm.clear();
    if (fighting && (this.ultm.queue.holdsBattle || this.eid.holds)) {
      this.acc = 0;
      if (this.ultm.queue.runsEffects) this.fx.step(Math.min(dt, 250));
      this.hud.refresh(s.b);
    } else if (fighting) {
      // (the walk to the door goes at its own pace, whatever the speed: STAND-RETREAT)
      this.acc += Math.min(dt, 250) * (s.phase === 'retreat' ? 1 : this.speed * this.fx.timeScale());
      let guard = 0;
      const ts = performance.now();
      // (the ultimates: tapped on the hero bar, or on their own with its Auto switch on)
      s.b.autoUlt = !!this.host.meta().ultAuto;
      if (this.eid.wantsTick) this.acc = Math.max(this.acc, TICK_MS);
      while (this.acc >= TICK_MS && guard++ < 4 && !this.ultm.queue.holdsBattle && !this.eid.holds) {
        this.acc -= TICK_MS;
        const born = s.b.units.length;
        const events = stepStand(s);
        // (a hero's ultimate fired: its moment begins, and the fight is held from the next tick (the full setting))
        if (fullScene(settings().ultFull, !!this.host.meta().ultAuto) && this.ultm.note(s.b, events, s.b.units.slice(born))) this.acc = 0;
        if (this.eid.noteEvents(s.b, events)) this.acc = 0;
        this.hud.onEvents(s.b, events);
        for (const e of events) {
          if (e.kind === 'ultLapse') this.hud.lapse(e.by);
          else if (e.kind === 'swing' && e.by === s.king.id) this.hall.react('strike');
        }
        this.fx.show(s.b, events);
        if (bossHit(events, s.b.units)) this.nudge = NUDGE_MS;
        if (s.b.units.length !== this.sprites.size + 1) this.syncSprites();
        playEvents(s.b, events, 1);
        // (the Last Stand never wins: the king's fall is its defeat, with the sting as before)
        if (events.some((e) => e.kind === 'end')) endWave('defeat');
        this.takeNotes(events);
        this.sayMoments(events);
        this.grumbleDue();
      }
      if (guard >= 4) this.acc = 0;
      if (this.s !== s) return;
      // (the king walks to the door with the heroes; the room fades as they reach it)
      if (s.phase === 'retreat') {
        const k = 1 - Math.max(0, s.retreatLeft ?? 0) / RETREAT_MS;
        this.hall.walk(k);
        this.parts.skip.classList.toggle('dusk', k > 0.8);
      }
      this.perf.sim += performance.now() - ts;
      if (this.hud.build(s.b)) this.hbKey = '';
      this.hud.refresh(s.b);
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
    if (this.titleLeft > 0) {
      this.titleLeft -= dt;
      if (this.titleLeft <= 0) {
        this.titleLeft = 1;
        this.endTitle();
      }
    }
    if (this.banner.left > 0) {
      this.banner.left -= dt;
      if (this.banner.left <= 0) this.parts.banner.hidden = true;
    }
    if (this.vignetteLeft > 0) {
      this.vignetteLeft -= dt;
      if (this.vignetteLeft <= 0) this.parts.vignette.hidden = true;
    }
    if (s.phase === 'deploy') this.drawMarks();
    this.aids(dt);
    this.nudge = Math.max(0, this.nudge - dt);
    this.hall.step(fighting || s.phase === 'deploy' || s.phase === 'over' ? dt : 0, s.king.alive ? s.king.hp / s.king.maxHp : 0);
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
        this.music(s.run.seed);
        if (n.boss) play('standBoss');
        this.hall.burst(waveSpec(s.run.seed, s.run.armies, n.n, s.run.hall).edges);
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
        this.hall.decree();
        kingSays('waveCleared', () => this.anchorOf(s.king.id));
        this.refreshBar(true);
        this.drawMarks();
      } else if (n.kind === 'levelup') {
        this.fx.levelUp(n.unit, n.level);
        play('levelUp');
        const kind = s.b.units.find((u) => u.id === n.unit)?.def;
        if (kind) heroSays(kind, 'levelUp', () => this.anchorOf(n.unit));
      } else if (n.kind === 'kingHit') {
        this.hall.react('hurt');
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
      } else if (n.kind === 'breakOff') {
        this.showPlate('THE LAST OF THEM', 'BREAK AND RUN', 'retreat');
      } else if (n.kind === 'choice') {
        this.drawChoice(n.n, n.to);
      } else if (n.kind === 'hold') {
        this.showPlate('ONE MORE WAVE', 'HOLD THE LINE', 'boss');
        newQuipScene();
        kingSays('bossWave', () => this.anchorOf(s.king.id));
        play('standBoss');
        this.hall.burst(waveSpec(s.run.seed, s.run.armies, s.run.wave, s.run.hall).edges.concat(['north', 'east', 'south', 'west']));
        this.refreshBar(true);
      } else if (n.kind === 'held') {
        play('coin');
        this.showPlate(`+${n.gold} GOLD${n.relic ? ' AND A RELIC' : ''}`, 'THE LINE HELD', '');
        if (n.relic) this.showGain(n.relic);
        this.refreshBar(true);
      } else if (n.kind === 'retreat') {
        this.beginRetreat(n.from, n.to, n.cave, n.exit.front);
      } else if (n.kind === 'room') {
        this.enterRoom(n.hall, n.act);
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
    if (this.s && id === this.s.king.id) {
      // (the king speaks from his throne)
      const r = this.host.app.canvas.getBoundingClientRect();
      const k = r.width / this.host.app.screen.width;
      const w = this.world;
      return { x: r.left + (w.x + this.hall.kingTop.x * w.scale.x) * k, y: r.top + (w.y + this.hall.kingTop.y * w.scale.y - 8) * k };
    }
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

  /** The battle music: one track for the whole run (`standTrack`: the general battle track), started with its first wave and kept, boss waves
   *  and breaks included, until the king falls or the run is left (`battleMusic.ts`). */
  private hold = false;
  private track = '';
  private music(seed: number): void {
    // (one hook for the rooms of the retreat: `standMusic.ts`; today every room keeps the run's track)
    const want = standRoomTrack(seed, this.s ? hallNow(this.s.run) : 'courtyard');
    if (want === this.track) return;
    this.track = want;
    startFight(want);
  }

  private vignetteLeft = 0;
  private hbKey = '';

  /* -------------------------------------------------------------- the retreat (STAND-RETREAT) */

  /** A plate over the field for a moment (the banner's look): a small line over a big one; `tone` is '' (gold), 'boss' (red) or 'retreat'. */
  private showPlate(small: string, big: string, tone: '' | 'boss' | 'retreat'): void {
    const b = this.parts.banner;
    const plate = el('div', 'stPlate');
    plate.append(el('small', '', small), el('b', '', big));
    b.replaceChildren(el('i', 'stCrest'), plate);
    b.classList.toggle('boss', tone === 'boss');
    b.classList.toggle('retreat', tone === 'retreat');
    b.hidden = false;
    this.banner.left = BANNER_MS;
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
  }

  /** An act's last wave is held: hold one more, harder wave here for a purse, or fall back to the next room. The run waits for the answer. */
  private drawChoice(n: number, to: HallKind): void {
    const s = this.s;
    if (!s) return;
    const box = this.parts.choice;
    box.replaceChildren();
    const here = ROOM_NAMES[hallNow(s.run)];
    const card = el('div', 'stCard stChoiceCard');
    card.append(el('i', 'stCrest'), el('h2', '', `${here.title} is falling`), el('p', 'stDim', `Wave ${n} is held, but the walls are breached. Your ruler awaits your word.`));
    const back = el('button', 'primary stChoiceBack');
    back.append(el('b', '', 'Fall back'), el('small', '', `To ${ROOM_NAMES[to].the}, with everyone still standing.`));
    back.addEventListener('click', () => {
      if (!this.s || !fallBack(this.s)) return;
      play('tap');
      box.hidden = true;
      this.takeNotes([]);
    });
    const hold = el('button', 'stChoiceHold');
    hold.append(el('b', '', 'Hold one more wave'), el('small', '', `A harder wave from every breach. Hold it for ${purseLine(holdPurse(s.run, n))}, then fall back. If your ruler falls, the run ends.`));
    hold.addEventListener('click', () => {
      if (!this.s || !holdTheLine(this.s)) return;
      play('tap');
      box.hidden = true;
      this.music(this.s.run.seed);
      this.takeNotes([]);
    });
    card.append(back, hold);
    box.append(card);
    box.hidden = false;
  }

  /** The relic holding the line paid: its picture, name and what it does, under the banner for a few seconds (a tap on nothing; it fades). */
  private gainTimer = 0;
  private showGain(id: string): void {
    const r = RELICS[id];
    if (!r) return;
    const box = this.parts.gain;
    const words = el('div', 'stGainWords');
    words.append(el('small', '', 'A RELIC FOR HOLDING'), el('b', '', r.name), el('span', '', r.text));
    const pic = relicIcon(id) ? iconImg(relicIcon(id), r.name) : el('i', 'stGainBlank');
    box.replaceChildren(pic, words);
    box.hidden = false;
    box.style.animation = 'none';
    void box.offsetWidth;
    box.style.animation = '';
    window.clearTimeout(this.gainTimer);
    this.gainTimer = window.setTimeout(() => (box.hidden = true), GAIN_MS);
  }

  /** The room is given up: a breach caves in, the door opens, the banner says where to, and the king and the heroes walk out (a tap skips). */
  private beginRetreat(from: HallKind, to: HallKind, cave: Edge | null, door: { u: number; v: number }): void {
    const s = this.s;
    if (!s) return;
    // (the camera eases round to take in the king and the door he makes for)
    const [kx, ky] = at(KING_AT.u, KING_AT.v, tileAt(s.b.board, KING_AT.u, KING_AT.v)!.h);
    const [dx, dy] = at(door.u, door.v, tileAt(s.b.board, door.u, door.v)!.h);
    this.tx = (kx + dx) / 2;
    this.ty = (ky + dy) / 2 - 24;
    this.clampCam();
    this.parts.choice.hidden = true;
    this.picked = null;
    this.spell = null;
    this.hall.giveUp(cave);
    const words = lostLine(from, to);
    this.showPlate(words.head.toUpperCase(), words.line.toUpperCase(), 'retreat');
    this.banner.left = BANNER_MS * 1.6;
    play('kingHit');
    this.drawMarks();
    // (with reduced motion there is no walk: the room fades, and the next is laid out at once)
    if (this.hall.reduced) {
      finishRetreat(s);
      this.takeNotes([]);
      return;
    }
    this.parts.skip.classList.remove('dusk');
    this.parts.skip.hidden = false;
  }

  /** A tap during the walk: on to the next room at once. */
  private skipRetreat(): void {
    const s = this.s;
    if (!s || s.phase !== 'retreat') return;
    play('tap');
    finishRetreat(s);
    this.takeNotes([]);
  }

  /** The next room: laid out (its art, the heroes at their posts), the camera on the king, and its title card with a line from the ruler. */
  private enterRoom(hall: HallKind, act: number): void {
    const s = this.s;
    if (!s) return;
    this.parts.skip.hidden = true;
    this.hall.walk(null);
    this.buildField();
    this.syncSprites();
    this.snapCamera();
    this.music(s.run.seed);
    // (the furthest room reached is kept at once: the throne room is a badge on the Last Stand's record)
    const m = this.host.meta();
    if (reachRoom(m, act)) saveMeta(m);
    this.save();
    this.refreshBar(true);
    const words = roomLine(s.run.seed, hall, s.run.heroes.filter(standing).map((h) => h.kind));
    // (CINE-001: with cinematics on, the act's card is a short film of the room, the ruler's line and the heroes; the run waits for it)
    if (this.host.film) {
      const up = s.run.heroes.filter(standing).map((h) => h.kind);
      const film = actScene(ACT_NUMERALS[act], ROOM_NAMES[hall].title, ACT_LOOKS[hall], words.line, words.duchess, up.length, act === 3);
      this.hold = true;
      void this.host.film(film, up).then((played) => {
        if (played) this.hold = false;
        else this.titleCard(hall, act, words);
      });
      return;
    }
    this.titleCard(hall, act, words);
  }

  /** The room's title card: the act, the room, the ruler's line (and Duchess's), held until tapped or its time is up. */
  private titleCard(hall: HallKind, act: number, words: { line: string; duchess: string | null }): void {
    const t = this.parts.title;
    const card = el('div', 'stTitleCard');
    card.append(el('small', '', `Act ${ACT_NUMERALS[act]}`), el('b', '', ROOM_NAMES[hall].title));
    if (words.line) card.append(el('p', 'stTitleLine', `“${words.line}”`), el('em', '', `— ${rulerOf(settings().ruler).name}`));
    if (words.duchess) card.append(el('p', 'stTitleGoat', `Duchess: ${words.duchess}`));
    if (act === 3) card.append(el('p', 'stThrone', '♛ The last room'));
    card.append(el('small', 'stTitleTap', 'Tap to go on'));
    t.replaceChildren(card);
    t.hidden = false;
    this.hold = true;
    this.titleLeft = TITLE_MS;
  }

  /** The title card goes (tapped, or its time is up), and the break in the new room runs. */
  private endTitle(): void {
    const t = this.parts.title;
    if (!t) return;
    t.hidden = true;
    if (this.titleLeft > 0) {
      this.titleLeft = 0;
      this.hold = false;
    }
  }
  private titleLeft = 0;

  private showBanner(n: number, boss: boolean): void {
    const b = this.parts.banner;
    const plate = el('div', 'stPlate');
    plate.append(el('small', '', boss ? 'A BOSS COMES' : 'THEY BREAK THROUGH'), el('b', '', `WAVE ${n}`));
    b.replaceChildren(el('i', 'stCrest'), plate);
    b.classList.toggle('boss', boss);
    // (a boss wave's flourish: a red light round the screen for a while, breathing)
    const vg = this.parts.vignette;
    vg.hidden = !boss;
    if (boss) this.vignetteLeft = BANNER_MS * 2;
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
          if (castSpell(s.b, id, 0, 0)) this.hall.react('cast'); // (the spell's own cast sound plays from its event: spellSfx.ts)
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
    this.text('rulername', p.king.querySelector('small'), rulerOf(settings().ruler).name);
    const wave = s.phase === 'deploy' ? run.wave : s.phase === 'break' ? run.wave : run.wave;
    // (the bonus wave of holding the line counts as the act's last wave held a while longer)
    this.text('wave', p.wave.querySelector('span'), String(s.holding ? wave - 1 : wave));
    const boss = !s.holding && (s.phase === 'wave' || s.phase === 'deploy' || s.phase === 'break') && wave % 5 === 0;
    this.text('boss', p.wave.querySelector('em'), boss ? 'Boss' : s.phase === 'wave' ? `${s.holding ? 'Hold · ' : ''}${foesAlive(s) + s.queue.length} foes` : '');
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
      this.text('next', p.count.querySelector('i'), `${spec.foes.length} foes from the ${spec.edges.join(', ')}.`);
      (p.count.querySelector('small') as HTMLElement).textContent = 'First up';
      this.arrows(spec.edges);
    } else this.arrows([]);
    (p.go as HTMLButtonElement).hidden = !brk;
    p.start.hidden = s.phase !== 'deploy';
    p.tray.hidden = s.phase !== 'deploy';
    p.bar.hidden = s.phase === 'deploy';
    if (s.phase === 'deploy') this.drawTray();
    p.pause.hidden = s.phase !== 'wave' && s.phase !== 'break';
    p.spells.hidden = !this.host.meta().spellbook.equipped.length || s.phase === 'deploy' || s.phase === 'over' || s.phase === 'choice' || s.phase === 'retreat';
    // (the orbs' row also holds the Auto switch: it shows while the hero rows do)
    p.orbs.hidden = s.phase === 'deploy' || s.phase === 'over' || s.phase === 'choice' || s.phase === 'retreat';
    p.heroes.hidden = s.phase === 'deploy' || s.phase === 'over';
    if (!p.heroes.hidden) {
      this.hud.setAuto(!!this.host.meta().ultAuto);
      const rebuilt = this.hud.build(s.b);
      // (each row's rim in its hero's colour, as its ring on the field)
      const hk = `${s.run.seed}:${p.heroes.children.length}`;
      if (rebuilt || hk !== this.hbKey) {
        this.hbKey = hk;
        for (const t of p.heroes.querySelectorAll<HTMLElement>('.fhRow')) {
          const u = s.b.units.find((x) => x.id === Number(t.dataset.unit));
          if (u?.tag !== undefined) t.style.setProperty('--hc', colourCss(this.colourOf(u.tag)));
        }
      }
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
    offer.hidden = !run.offer.length || over || s.phase === 'deploy';
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
    const king = el('div', 'stSheetKing');
    const kb = el('div');
    kb.append(el('span', '', `The King · wave ${sh.wave} · ${sh.gold} gold`), el('b', '', `${sh.king.hp} / ${sh.king.maxHp}`), this.barEl(sh.king.hp / sh.king.maxHp, 'hp'));
    king.append(el('i', 'stCrown'), kb);
    card.append(el('i', 'stCrest'), el('h2', '', 'Paused'), king);
    const list = el('div', 'stSheetList');
    for (const h of sh.heroes) {
      const row = el('div', `stSheetRow${h.fallen ? ' fallen' : ''}`);
      const head = el('div', 'stSheetHead');
      const pic = portrait(lookSheet(h.kind, heroRank(this.host.meta(), h.kind), 1), 32, 1);
      pic.className = 'stSheetPic';
      head.append(pic, el('span', '', h.name), el('em', '', h.fallen ? 'Fallen' : `Lv ${h.level}${h.runLv ? ` +${h.runLv}` : ''}`));
      row.append(head, this.barEl(h.maxHp ? h.hp / h.maxHp : 0, 'hp'));
      if (h.pool) row.append(this.barEl(h.pool.now / h.pool.max, h.pool.kind));
      const facts = el('div', 'stSheetFacts');
      facts.append(el('span', '', `Atk ${h.atk}`), el('span', '', `Def ${h.def}`), el('span', '', `Kills ${h.kills}`));
      row.append(facts);
      for (const k of h.skills) {
        const line = el('div', `stSheetSkill${!k.open ? ' shut' : k.paid ? ' ready' : ''}`);
        line.append(el('span', '', k.name), el('em', '', k.open ? String(k.cost) : `Lv ${k.opens}`));
        row.append(line);
      }
      // (an ultimate shows only once it has unlocked: no "Lv 30" line before, HEROBAR-LOCK)
      if (h.ult?.open) {
        const line = el('div', `stSheetSkill ult${h.ult.ready ? ' full' : ''}`);
        line.append(el('span', '', `★ ${h.ult.name}`), el('em', '', h.ult.ready ? 'Ready' : `${Math.round(h.ult.meter * 100)}%`));
        row.append(line);
      }
      list.append(row);
    }
    const go = el('button', 'primary stResume', 'Resume');
    go.addEventListener('click', () => this.setPaused(false));
    card.append(list, go);
    box.append(card);
  }

  /** A small bar of a share (health, mana or stamina) for the sheet. */
  private barEl(share: number, kind: string): HTMLElement {
    const b = el('i', `stSheetBar ${kind}`);
    const f = el('span');
    f.style.width = `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%`;
    b.append(f);
    return b;
  }

  /** The king has fallen: the run is paid, and the end screen shows what it came to. */
  private finish(): void {
    const s = this.s!;
    const m = this.host.meta();
    const first = !s.run.summary;
    this.summary = settleStand(m, s.run, s.run.armies);
    // (the waves the run cleared count for the quests taken, once: QUESTS)
    // (EIDOLONS: the run fills the War Horn at the Stand's share, its boss waves and its foes, at most 300; none if it was blown in it)
    if (first && this.summary) addHorn(m, standHornGain(Math.floor(this.summary.cleared / BOSS_EVERY), Math.max(0, this.summary.kills - Math.floor(this.summary.cleared / BOSS_EVERY)), s.b.eidolon?.called !== undefined));
    if (first && this.summary) {
      const sf = standFight(this.summary.cleared, { best: this.summary.best, act: this.summary.act, held: this.summary.holds });
      this.host.questsDone?.(noteQuests(m, sf));
      // (EIDOLON-CHAINS: a chain's part may ask for the Last Stand too; its piece shows in the quest log)
      noteChains(m, sf);
      // (SHOP-BOOKS-GEAR: every wave the guard fought is a fight of study, and a wave's wear on the gear they wear; told nowhere but the sheets)
      const kinds = [...new Set(s.run.heroes.map((h) => h.kind))];
      for (let w = 0; w < s.run.wave; w++) {
        settleStudy(m, kinds);
        settleWear(m, kinds.map((kind) => ({ kind, fell: false })));
      }
    }
    saveMeta(m);
    dropStand();
    const end = this.parts.end;
    end.replaceChildren();
    const card = el('div', 'stCard stEndCard jrStand');
    const sum = this.summary!;
    // (JRPG-RECAP: the results screen's banner and party head the card; the run's facts follow as they were)
    const jrHead = el('div');
    const jrBody = el('div');
    card.append(jrHead);
    // (where it ended, in the retreat's rooms: STAND-RETREAT)
    if (sum.room) card.append(el('p', 'stFell', `Fell in ${ROOM_NAMES[sum.room].the}, wave ${sum.best}${sum.held ? ', holding the line' : ''}`));
    if (sum.act === 3) card.append(el('p', 'stThrone', '♛ Reached the throne room'));
    card.append(el('p', 'stDim', sum.newBest ? 'A new best wave!' : `Best wave: ${m.stand ?? sum.best}`));
    const rows = el('div', 'stFacts');
    const row = (a: string, b: string) => rows.append(Object.assign(el('div'), { innerHTML: `<span>${a}</span><b>${b}</b>` }));
    row('Waves cleared', String(sum.cleared));
    row('Foes felled', String(sum.kills));
    const chests = [sum.bronze && `${sum.bronze} bronze`, sum.silver && `${sum.silver} silver`, sum.gold && `${sum.gold} gold`].filter(Boolean).join(', ');
    if (chests) row('Chests', chests);
    if (sum.gear.length) row('Equipment', sum.gear.join(', '));
    // (a record past a tenth wave pays a couple of rift ores: AWAKEN-MATS)
    if (sum.ores?.length) row('Rift ores', sum.ores.map((d) => `${d.n} ${ORES[d.trait]?.name ?? d.trait}`).join(', '));
    row('Heroes held', String(sum.heroes));
    // (the relics the run gathered, those holding the line paid among them: STAND-HOLD-RELIC)
    if (sum.relics) row('Relics', `${sum.relics}${sum.heldRelics ? ` (${sum.heldRelics} for holding the line)` : ''}`);
    card.append(jrBody, rows);
    this.endResults?.stop();
    this.endResults = playResults({ head: jrHead, body: jrBody }, {
      won: false,
      title: 'THE KING HAS FALLEN',
      sub: `Wave ${sum.best}`,
      facts: [
        { label: 'Waves cleared', value: String(sum.cleared) },
        { label: 'Foes felled', value: String(sum.kills) },
        { label: 'Heroes held', value: String(sum.heroes) },
      ],
      heroes: this.endHeroes(m),
      ...this.endMvp(m),
      counts: [{ label: 'Crowns', n: sum.crowns, icon: ICONS.crowns }],
      items: [],
      lines: [],
    });
    card.addEventListener('click', (e) => void (!(e.target as HTMLElement).closest('button') && this.endResults?.finish()));
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

  /** JRPG-RECAP: the end card's results screen, while it counts up. */
  private endResults: JrPlayer | null = null;

  /** The eight's rows for the end card: each one's run levels (from 0) and the hp and attack they added on its stats as it came in. */
  private endHeroes(m: Meta): JrHero[] {
    const best = this.endBest();
    return (this.s?.run.heroes ?? []).map((h) => {
      const k = rankMult(heroRank(m, h.kind));
      const base = statsAt(h.kind, levelOfKind(m, h.kind), 'lasting', { hp: k, atk: k });
      return { kind: h.kind, growth: standGrowth(h.kind, h.lv, h.xp, base), face: facePortrait(battleSheet(h.kind, awakenedOf(m, h.kind), 1)), fell: !!h.fallen, mvp: h.id === best?.id, note: `${h.kills ?? 0} felled` };
    });
  }
  /** The hero that felled the most (none when nobody felled any). */
  private endBest() {
    const list = [...(this.s?.run.heroes ?? [])].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0) || b.lv - a.lv);
    return list[0] && (list[0].kills ?? 0) > 0 ? list[0] : undefined;
  }
  private endMvp(m: Meta) {
    const h = this.endBest();
    if (!h) return {};
    return { mvp: { face: facePortrait(battleSheet(h.kind, awakenedOf(m, h.kind), 1)), name: heroTitle(h.kind), line: `Felled the most foes · ${h.kills ?? 0} felled · run level ${h.lv}` } };
  }

  /** For tests and screenshots: the pause sheet of the run in play. */
  get sheet(): ReturnType<typeof standSheet> | null {
    return this.s ? standSheet(this.s) : null;
  }

  /** For the screenshots: the run laid out again in one of the castle's rooms (before its first wave). */
  debugHall(kind: HallKind): void {
    const s = this.s;
    if (!s) return;
    this.start({ ...s.run, hall: kind, heroes: s.run.heroes.map((h) => ({ ...h, post: null })) });
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
