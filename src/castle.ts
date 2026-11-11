// The Keep: an animated royal terrace and a separate building ledger. Presentation only; upgrades use the castle simulation.

import {
  BUILDING_IDS,
  ROOM_BUILDING_IDS,
  chapelLevel,
  clockText,
  maxLevel,
  siteLevel,
  siteName,
  siteTop,
  worksLeft,
  type SiteId,
} from './sim/castle';
import { roomsOf } from './sim/rooms';
import type { Meta } from './sim/meta';
import { strongest } from './menuHeroes';
import { drawCourtFigure } from './render/courtFigure';
import { VFX, type VfxKey } from './render/vfxArt';
import { UNITS } from './sim/units';
import { play } from './render/sound';
import type { PlotId } from './render/castleSpots';
import { goatSheet } from './duchess';
import { goatSays } from './quips';
import { showQuip, hideQuip } from './quipView';
import {
  chewBob,
  drawDuchessCosmetic,
  hopLift,
  rollDailyTreat,
  tapNudgeGoat,
  type Goat,
} from './render/duchessRules';
import { TrophyWallModal } from './trophyWall';

// Bespoke Castle Throne Room background and Seated King sprite sheets
import { settings, setSetting, onSettings } from './settings';
import { RULERS, rulerOf, rulerWords } from './rulerRules';
import { CrownTerracePainter } from './render/crownTerracePaint';
import { RULER_COURTS, TERRACE_WIDTH, TERRACE_HEIGHT, TERRACE_KING as KING_SPOT, TERRACE_GUARDS as GUARD_SPOTS, TERRACE_GOAT, TERRACE_LANDMARKS, courtGuardKinds, changeCourtGuard, landmarkState, terraceArtUrl, terraceCharacterAt } from './crownTerrace';
import { ornateMenu, menuSection, menuChoice, menuNote, menuFoot, type OrnateMenu } from './ornateMenu';

// High-res chamber & architectural sprites (bundled as data URLs by esbuild)

// Building architectural diorama sprites
import greatHallUrl from './art/castle/great_hall.png';
import forgeUrl from './art/castle/forge.png';
import barracksUrl from './art/castle/barracks.png';
import spiralUrl from './art/castle/spiral.png';
import stableUrl from './art/castle/stable.png';
import manorUrl from './art/castle/manor.png';
import chapelUrl from './art/castle/chapel.png';
// (DEPTH-BUILD: the three room buildings' own pictures, halved to the castle pictures' size by tools/castle/import-room-art.py: docs/notes/int-330.md)
import smithyUrl from './art/castle/smithy.png';
import { roomIcon } from './roomIcons';
import watchtowerUrl from './art/castle/watchtower.png';
import watchtowerGrandUrl from './art/castle/watchtower_grand.png';
import hallUrl from './art/castle/hall_of_legends.png';

// Hall props & treasures that appear as you upgrade your kingdom
import drillYardUrl from './art/castle/drill_yard.png';

// Sacred Relic emblems
import crownUrl from './art/items/jewel_crown.png';
import shieldUrl from './art/items/iron_shield.png';
import helmUrl from './art/items/doom_helm.png';
import sapphireUrl from './art/items/frost_sapphire.png';
import bootsUrl from './art/items/cloud_treads.png';
import tomeUrl from './art/items/hourglass.png';
import chaliceUrl from './art/items/holy_chalice.png';
import { medal, plateButton, setBadge, type PbIcon } from './paintedButton';
import { castleArtUrl, isPainted, buildingArt } from './castleArt';
import { CASTLE_SITES, sitePresentation, constructionProgress } from './castleTab';

export interface ChamberDef {
  id: SiteId;
  name: string;
  relicName: string;
  edificeUrl: string;
  icon: string;
  glow: string;
  statName: string;
  perLevelShort: string;
  lore: string;
}

export const CHAMBERS: ChamberDef[] = [
  {
    id: 'treasury',
    name: 'High Treasury',
    relicName: 'Crown of Minted Vaults',
    edificeUrl: greatHallUrl,
    icon: crownUrl,
    glow: '#ffd700',
    statName: 'Starting Run Gold',
    perLevelShort: '+10 Gold / Lv',
    lore: 'Overflowing royal vaults that fund every march with rich starting coin.',
  },
  {
    id: 'armoury',
    name: 'Royal Armoury',
    relicName: 'Sunforge Aegis',
    edificeUrl: forgeUrl,
    icon: shieldUrl,
    glow: '#ff8533',
    statName: 'Hero Attack Power',
    perLevelShort: '+5% ATK / Lv',
    lore: 'Masterwork steel tempered in dragonfire. Permanently raises all hero attack power.',
  },
  {
    id: 'barracks',
    name: 'Grand Barracks',
    relicName: 'Warhelm of Valor',
    edificeUrl: barracksUrl,
    icon: helmUrl,
    glow: '#ff4d4d',
    statName: 'Hero Max Vitality',
    perLevelShort: '+6% HP / Lv',
    lore: 'Rigorous royal drills and iron rations. Toughens every hero with lasting health.',
  },
  {
    id: 'mageTower',
    name: 'Arcane Spire',
    relicName: 'Heart of the Leyline',
    edificeUrl: spiralUrl,
    icon: sapphireUrl,
    glow: '#38bdf8',
    statName: 'Mana & Spell Power',
    perLevelShort: '+12% Mana / Lv',
    lore: 'Converging astral rings that accelerate royal mana and expand spell budget.',
  },
  {
    id: 'stable',
    name: 'Royal Stables',
    relicName: 'Windstrider Spurs',
    edificeUrl: stableUrl,
    icon: bootsUrl,
    glow: '#4ade80',
    statName: 'Tactical March Speed',
    perLevelShort: '+4% Speed / Lv',
    lore: 'Barded warhorses and wind-blessed tack. Heroes stride across the battlefield faster.',
  },
  {
    id: 'library',
    name: 'Archivist Spire',
    relicName: 'Chronicle of Ages',
    edificeUrl: manorUrl,
    icon: tomeUrl,
    glow: '#c084fc',
    statName: 'Hero Combat XP',
    perLevelShort: '+6% XP / Lv',
    lore: 'Illuminated codices of ancient campaigns. Multiplies the XP heroes earn from every fight.',
  },
  {
    id: 'chapel',
    name: 'The High Chapel',
    relicName: 'Chalice of Dawn',
    edificeUrl: chapelUrl,
    icon: chaliceUrl,
    glow: '#fef08a',
    statName: 'Royal Spellbook Sanctum',
    perLevelShort: 'Unlocks Spells',
    lore: 'The consecrated cathedral of the Keep. Opens the Spells tab to equip and study royal magic.',
  },
  {
    id: 'smithy',
    name: 'Smithy',
    relicName: 'Road Anvil',
    edificeUrl: smithyUrl,
    icon: shieldUrl,
    glow: '#f59e0b',
    statName: 'Mending and wear',
    perLevelShort: 'Opens rooms',
    lore: 'A forge that travels with the army: gear mended at the camp, patched when it breaks.',
  },
  {
    id: 'watchtower',
    name: 'Watchtower',
    relicName: 'Scout\'s Glass',
    edificeUrl: watchtowerUrl,
    icon: bootsUrl,
    glow: '#93c5fd',
    statName: 'March orders',
    perLevelShort: 'Opens rooms',
    lore: 'Lookouts on the walls: they open the march orders before a run, and in time the roads.',
  },
  {
    id: 'hall',
    name: 'Hall of Legends',
    relicName: 'Mentor\'s Laurel',
    edificeUrl: hallUrl,
    icon: crownUrl,
    glow: '#e9d5ff',
    statName: 'Mentor seats',
    perLevelShort: 'One seat / Lv',
    lore: 'Where retired heroes stand and teach the young of their calling.',
  },
  {
    // (the Assault's Drill Yard, phase 3: the owner's painting, art-source/drill-yard/, cut by tools/castle/import-room-art.py)
    id: 'drillYard',
    name: 'Drill Yard',
    relicName: 'Sergeant\'s Baton',
    edificeUrl: drillYardUrl,
    icon: shieldUrl,
    glow: '#fca5a5',
    statName: 'Recruits\' rank',
    perLevelShort: 'Blooded, then Veteran',
    lore: 'A parade ground and its sergeants: the Assault\'s new recruits come to their platoons already drilled.',
  },
];

/** A building card's Rooms strip (DEPTH-BUILD): one row per room, lit once its level stands, else "Level 3" in stone grey. */
export function roomsStrip(id: SiteId, level: number): HTMLElement | null {
  const rooms = roomsOf(id);
  if (!rooms.length) return null;
  const strip = el('div', 'ctRooms');
  for (const r of rooms) {
    const open = level >= r.level;
    const row = el('div', `ctRoom${open ? ' open' : ''}`);
    const words = el('div', 'ctRoomWords');
    words.append(el('b', '', r.name), el('small', '', r.line));
    row.append(roomIcon(r.icon), words, el('em', 'ctRoomLv', open ? 'Open' : `Level ${r.level}`));
    strip.append(row);
  }
  return strip;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = rulerWords(text, settings().ruler);
  return e;
}

export function lookPicture(id: PlotId | SiteId, level: number): string {
  // (the Watchtower stands grander at its top level, 3)
  if (id === 'watchtower' && level >= siteTop('watchtower') && !isPainted('watchtower')) return watchtowerGrandUrl;
  // (CASTLE-REMAKE: the owner's painting of the building once it lands, else the old sprite)
  const match = CHAMBERS.find((c) => c.id === id);
  return match ? buildingArt(match.id, match.edificeUrl) : crownUrl;
}

interface HallParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  kind: 'mote' | 'spark' | 'coin';
}

interface BurstEffect {
  x: number;
  y: number;
  t0: number;
  dur: number;
  color: string;
  label?: string;
}

export class CastleScene {
  readonly root = el('div', 'ctWrap crPage');
  private scroll = el('div', 'ctScroll crScroll');
  private stage = el('div', 'crStage');

  private view: 'hall' | 'buildings' = 'hall';
  private hallPanel = el('section', 'crHallPanel');
  private buildingsPanel = el('section', 'crBuildingsPanel');
  private tabButtons: HTMLButtonElement[] = [];
  private spotEls = new Map<SiteId, { btn: HTMLButtonElement; pic: HTMLImageElement; title: HTMLElement; level: HTMLElement; benefit: HTMLElement; action: HTMLElement; detail: HTMLElement; key: string }>();
  private worksCards: { btn: HTMLButtonElement; pic: HTMLImageElement; title: HTMLElement; line: HTMLElement; time: HTMLElement; progress: HTMLProgressElement }[] = [];
  private yardSub = el('p', 'crSub');
  private rank = el('progress', 'crRank');
  private nextIdleSalute = 6500;
  private codexButton: HTMLButtonElement | null = null;

  // The throne hall (the old scene: the ruler, the guards, Duchess, the trophy rack), in the ornate frame
  private scenicFrame = el('figure', 'ctScenicFrame crHall');
  private scenicViewport = el('div', 'ctThroneScenic');
  private canvas = el('canvas', 'ctHonorCanvas');
  private ctx = this.canvas.getContext('2d')!;
  private guardPlaque = el('figcaption', 'ctGuardPlaque');
  private guardTitle = el('span', '', 'HIGH THRONE OF THE KING');
  private guardNames = el('b', '', 'Royal Honor Guard & Duchess');

  // What the castle gives, on painted chips
  private powerBanner = el('div', 'crBoons');

  private raf = 0;
  private running = false;
  private now = 0;
  private last = 0;
  private lastPaint = 0;
  private meta: Meta | null = null;
  private heroKinds: string[] = [];
  private particles: HallParticle[] = [];
  private bursts: BurstEffect[] = [];
  private heroFlourishUntil = [0, 0, 0, 0];
  private kingDecreeUntil = 0;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private terrace = new CrownTerracePainter(() => { if (this.meta) this.paintGreatHall(); });
  private courtMenu: OrnateMenu | null = null;
  private courtControls = el('div', 'crCourtControls');
  private rulerButton: HTMLButtonElement | null = null;
  private courtButton: HTMLButtonElement | null = null;
  private trophyModal = new TrophyWallModal();
  /** A newly started build triggers the hall celebration once. */
  private worksSeen = '';
  private worksSeenInit = false;

  // Duchess the goat wandering the Throne Room floor
  private goat: Goat | null = null;
  private goatArt: HTMLImageElement | null = null;
  private goatWas = '';

  constructor(
    private onPick: (id: PlotId | SiteId) => void,
    /** Kept for the home screen's wiring; building rows open a card before any crowns are spent. */
    _onDirectUpgrade?: (id: SiteId) => boolean,
    private onCodex?: () => void,
    private onReward?: () => void,
  ) {
    this.buildLayout();
    this.canvas.width = TERRACE_WIDTH;
    this.canvas.height = TERRACE_HEIGHT;
    this.ctx.imageSmoothingEnabled = false;

    // Load Duchess once, independently of animation frames (also ready when the hall is paused).
    void goatSheet().then((im) => {
      this.goatArt = im;
      this.stepGoat(0);
      if (this.meta) this.paintGreatHall();
    });

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => {
      this.reduced = e.matches;
      this.paintGreatHall();
    });
    onSettings(() => { if (this.meta) this.update(this.meta); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; }
      else if (this.running) this.start();
    });
  }

  private buildLayout(): void {
    const head = el('header', 'crHead');
    const words = el('div', 'crHeading');
    words.append(el('h2', '', 'The Keep'), this.yardSub, this.rank);
    this.rank.setAttribute('aria-label', 'Castle rank');
    const utilities = el('div', 'crUtilities');
    const codex = plateButton({ label: 'Codex', icon: 'stall-books', cls: 'crCodex', onClick: () => this.onCodex?.() });
    this.codexButton = codex;
    const trophies = plateButton({ label: 'Trophies', icon: 'tav-trophies', cls: 'crTrophies', onClick: () => this.meta && this.trophyModal.open(this.meta) });
    utilities.append(codex, trophies);
    head.append(medal('tab-castle', 'crCrest'), words, utilities);
    const tabs = el('div', 'crTabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Castle views');
    for (const [view, label] of [['hall', 'Throne Hall'], ['buildings', 'Buildings']] as const) {
      const tab = el('button', 'crTab', label);
      tab.id = `castleTab-${view}`;
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `castlePanel-${view}`);
      tab.addEventListener('click', () => this.setView(view));
      tab.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const next = e.key === 'Home' ? 'hall' : e.key === 'End' ? 'buildings' : this.view === 'hall' ? 'buildings' : 'hall';
        this.setView(next);
        this.tabButtons[next === 'hall' ? 0 : 1].focus();
      });
      tabs.append(tab);
      this.tabButtons.push(tab);
    }
    const nav = el('div', 'crNavigation');
    nav.append(head, tabs);
    for (const [view, panel] of [['hall', this.hallPanel], ['buildings', this.buildingsPanel]] as const) {
      panel.id = `castlePanel-${view}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `castleTab-${view}`);
    }
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'The Crown Terrace. Live ruler, court companions, Duchess and the kingdom you are building.');
    this.scenicViewport.append(this.canvas);
    this.guardPlaque.append(this.guardTitle, this.guardNames);
    this.rulerButton = plateButton({label:'Ruler', icon:'tab-castle', cls:'crChangeRuler', onClick:() => this.openRulerPicker()});
    this.courtButton = plateButton({label:'Heroes', icon:'tab-heroes', cls:'crChooseCourt', onClick:() => this.openCourtPicker()});
    this.courtControls.append(this.rulerButton, this.courtButton);
    this.scenicFrame.append(this.scenicViewport, this.guardPlaque, this.courtControls);
    this.scenicViewport.addEventListener('pointerdown', (e) => this.handleSceneTap(e));
    const hint = el('p', 'crHallHint', 'Your kingdom grows with every completed building' );
    const bonusHead = el('div', 'crSectionHead');
    bonusHead.append(el('h3', '', 'Castle bonuses'), el('small', '', 'every run'));
    this.powerBanner.setAttribute('aria-label', 'Castle bonuses, every run');
    this.hallPanel.append(this.scenicFrame, hint, this.makeWorksCard(), this.powerBanner);
    this.buildingsPanel.append(this.makeWorksCard());
    const ledger = el('div', 'crLedger');
    for (const id of CASTLE_SITES) {
      const btn = el('button', 'crBuilding');
      btn.type = 'button';
      btn.dataset.site = id;
      const pic = el('img', 'crBuildingPic');
      pic.alt = ''; pic.draggable = false; pic.decoding = 'async';
      const words = el('span', 'crBuildingWords');
      const nameLine = el('span', 'crBuildingName');
      const title = el('b');
      const level = el('small', 'crBuildingLevel');
      nameLine.append(title, level);
      const benefit = el('span', 'crBuildingBenefit');
      words.append(nameLine, benefit);
      const status = el('span', 'crBuildingStatus');
      const action = el('b');
      const detail = el('small');
      status.append(action, detail);
      btn.append(pic, words, status, medal('g-right', 'crChevron'));
      btn.addEventListener('click', () => this.onPick(id));
      ledger.append(btn);
      this.spotEls.set(id, {btn, pic, title, level, benefit, action, detail, key:''});
    }
    this.buildingsPanel.append(ledger);
    this.stage.append(nav, this.hallPanel, this.buildingsPanel);
    this.scroll.append(this.stage);
    this.root.append(this.scroll, this.trophyModal.root);
    this.setView('hall');
  }

  private makeWorksCard(): HTMLButtonElement {
    const btn = el('button', 'crWorks'); btn.type = 'button';
    const pic = el('img'); pic.alt = ''; pic.decoding = 'async';
    const words = el('span', 'crWorksWords');
    const title = el('b'); const line = el('small'); const time = el('span', 'crWorksTime');
    const progress = el('progress'); progress.max = 1; progress.setAttribute('aria-label', 'Construction progress');
    words.append(title, line, progress); btn.append(pic, words, time);
    btn.addEventListener('click', () => this.meta?.works ? this.onPick(this.meta.works.id) : this.setView('buildings'));
    this.worksCards.push({btn, pic, title, line, time, progress});
    return btn;
  }

  setCodexWaiting(waiting: boolean): void {
    if (this.codexButton) setBadge(this.codexButton, waiting ? {kind:'new'} : null);
  }

  private setView(view: 'hall' | 'buildings'): void {
    if (view !== this.view) {
      hideQuip();
      // (the ledger's page turned, or turned back to the hall)
      play('ledger');
    }
    this.view = view;
    this.hallPanel.hidden = view !== 'hall';
    this.buildingsPanel.hidden = view !== 'buildings';
    this.tabButtons.forEach((tab, i) => {
      const selected = (i === 0) === (view === 'hall');
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    this.scroll.scrollTop = 0;
    if (view === 'hall' && this.running) this.paintGreatHall();
  }

  /** Interactive tap on the Throne Room scene: tap King for royal decree, Duchess to bleat & hop, or guards to salute! */
  private handleSceneTap(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const cx = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

    // 1. Check if Duchess is tapped
    if (this.goat) {
      const gx = this.goat.x;
      const gy = TERRACE_GOAT.y;
      if (Math.hypot(cx - gx, cy - (gy - 28)) < 44) {
        const nudge = tapNudgeGoat(this.goat, this.now);
        if (nudge.hopped) {
          play('sparkle');
          try {
            const raw = localStorage.getItem('legends.meta');
            if (raw) {
              const m = JSON.parse(raw);
              m.duchessTaps = (m.duchessTaps ?? 0) + 1;
              localStorage.setItem('legends.meta', JSON.stringify(m));
            }
          } catch {
            /* ignore */
          }
          const clientX = rect.left + (gx / this.canvas.width) * rect.width;
          const clientY = rect.top + ((gy - 38) / this.canvas.height) * rect.height;
          if (nudge.nudgedFromNest) {
            this.claimHaystackTreat(clientX, clientY, gx, gy);
          } else {
            goatSays('tap', { x: clientX, y: clientY });
            this.triggerHallBurst(gx, gy - 20, '#ffffff', 'Duchess hops!');
          }
          return;
        }
      }
    }

    // Distant landmarks open the same standard building card as the ledger.
    const plot = TERRACE_LANDMARKS.find(p => {
      const state = this.meta && landmarkState(this.meta,p.id);
      return state && (state.level > 0 || state.working) && Math.abs(cx-p.x)<p.w*.45 && cy<=p.y+8 && cy>=p.y-p.w;
    });
    if (plot) { this.onPick(plot.id); return; }

    // 2. Check if King on the High Throne is tapped
    const royalArt = this.terrace.rulers.get(settings().ruler);
    const actor = terraceCharacterAt(cx,cy,GUARD_SPOTS.map((spot,i) => {
      const image = this.terrace.heroes.get(this.heroKinds[i]);
      return image ? spot.height*image.naturalWidth/image.naturalHeight : 0;
    }),royalArt ? KING_SPOT.h*royalArt.naturalWidth/royalArt.naturalHeight : 0);
    if (actor === 'ruler') {
      play('levelUp');
      this.kingDecreeUntil = this.now + 1600;
      for (let i = 0; i < 4; i++) this.heroFlourishUntil[i] = this.now + 1200 + i * 110;
      this.triggerHallBurst(KING_SPOT.x, KING_SPOT.y - 70, '#ffd700', `The ${rulerOf(settings().ruler).female ? 'Queen' : 'King'} Decrees!`);
      return;
    }

    // 3. Check Trophy Rack mounted on the wall
    if (cx >= 735 && cy >= 360 && cy <= 470) {
      if (this.meta) {
        this.triggerHallBurst(655, 240, '#f59e0b', 'Boss Trophies!');
        this.trophyModal.open(this.meta);
        return;
      }
    }

    // 4. Check nearest Royal Guard
    const nearestIdx = typeof actor === 'number' ? actor : -1;

    play('sparkle');
    if (nearestIdx >= 0) {
      this.heroFlourishUntil[nearestIdx] = this.now + 950;
      const spot = GUARD_SPOTS[nearestIdx];
      const kind = this.heroKinds[nearestIdx];
      const unitName = UNITS[kind]?.name ?? 'Royal Guard';
      this.triggerHallBurst(spot.x, spot.y - 30, '#ffd700', `${unitName} Salutes!`);
    } else {
      // Tap on throne room hall / carpet: King & all guards salute
      this.kingDecreeUntil = this.now + 1400;
      for (let i = 0; i < 4; i++) this.heroFlourishUntil[i] = this.now + 900 + i * 120;
      this.triggerHallBurst(400, 225, '#ffe066', `For the ${rulerOf(settings().ruler).female ? 'Queen' : 'King'}!`);
    }
  }

  /** Trigger a celebratory golden burst in the Great Hall canvas (used on tap and when upgrading a chamber). */
  public triggerHallBurst(x: number, y: number, color = '#ffd700', label?: string): void {
    this.bursts.push({ x, y, t0: this.now, dur: 1100, color, label });
    if (this.reduced) return;
    for (let i = 0; i < 36; i++) {
      const ang = -Math.PI * 0.95 + Math.random() * Math.PI * 0.9;
      const spd = 45 + Math.random() * 140;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 20,
        size: Math.random() < 0.4 ? 4 : 3,
        color: Math.random() < 0.5 ? color : '#fff8d6',
        alpha: 1,
        life: 0,
        maxLife: 650 + Math.random() * 650,
        kind: i % 3 === 0 ? 'coin' : 'spark',
      });
    }
  }

  /** Update the courtyard with the current meta (levels, crowns, works, unlocked heroes). */
  update(meta: Meta): void {
    this.meta = meta;

    this.heroKinds = courtGuardKinds(meta.unlocked, settings().courtHeroes, strongest(meta, 4));
    void this.terrace.characters(this.heroKinds,settings().ruler).catch(() => undefined);
    const names = this.heroKinds.map(k => UNITS[k]?.name ?? k).join(' · ');
    this.guardNames.textContent = names ? `${names} · Duchess` : 'Duchess is keeping watch';
    if (this.courtButton) this.courtButton.setAttribute('aria-label', `Choose court heroes. ${names || 'No heroes recruited yet'}`);
    this.root.dataset.ruler = settings().ruler;
    this.canvas.setAttribute('aria-label', `${RULER_COURTS[settings().ruler].name}. ${rulerOf(settings().ruler).name}, ${names || 'no companions'} and Duchess. Buildings reflect completed castle levels.`);

    // 2. The castle's rank, under the page's title
    const totalLevels = [...BUILDING_IDS, ...ROOM_BUILDING_IDS].reduce((sum, id) => sum + siteLevel(meta.castle, id), 0) + chapelLevel(meta);
    const maxTotalLevels = [...BUILDING_IDS, ...ROOM_BUILDING_IDS, 'chapel' as const].reduce((sum, id) => sum + maxLevel(id), 0);
    const sub = `Castle rank ${totalLevels} of ${maxTotalLevels}`;
    if (this.yardSub.textContent !== sub) this.yardSub.textContent = sub;

    this.rank.max = maxTotalLevels;
    this.rank.value = totalLevels;
    this.renderPowerBanner(meta);

    const now = Date.now();
    for (const id of CASTLE_SITES) {
      const row = this.spotEls.get(id)!;
      const state = sitePresentation(meta, id, now);
      const name = siteName(id);
      const key = JSON.stringify({...state, detail: state.working ? '' : state.detail});
      if (row.key !== key) {
        row.key = key;
        row.btn.className = `crBuilding${state.ready ? ' ready' : ''}${state.working ? ' working' : ''}${state.full ? ' full' : ''}${!state.level ? ' unbuilt' : ''}`;
        row.btn.setAttribute('aria-label', `${name}, ${state.levelText}, ${state.benefit}. ${state.action}, ${state.detail}. View details`);
        const url = lookPicture(id, Math.max(1, state.level));
        if (row.pic.getAttribute('src') !== url) row.pic.src = url;
        row.title.textContent = name;
        row.level.textContent = state.levelText;
        row.benefit.textContent = state.benefit;
        row.action.textContent = state.action;
        row.detail.className = state.working ? 'worksLeft' : '';
      }
      row.detail.textContent = state.detail;
    }
    for (const card of this.worksCards) {
      const work = meta.works;
      const url = work ? lookPicture(work.id, work.level) : castleArtUrl('site');
      if (card.pic.getAttribute('src') !== url) card.pic.src = url;
      card.btn.classList.toggle('working', !!work);
      card.title.textContent = work ? siteName(work.id) : 'Builders ready';
      card.line.textContent = work ? `Upgrading · level ${work.level - 1} → ${work.level}` : 'Choose your next castle improvement';
      card.time.className = `crWorksTime${work ? ' worksLeft' : ''}`;
      card.time.textContent = work ? clockText(worksLeft(meta, now)) : 'View buildings ›';
      card.progress.hidden = !work;
      card.progress.value = constructionProgress(meta, now);
    }

    // Celebrate a newly started build once, without rebuilding the ledger on each countdown tick.
    const works = meta.works ? `${meta.works.id}:${meta.works.level}` : '';
    if (this.worksSeenInit && works && works !== this.worksSeen) this.cheer(meta.works!.id);
    this.worksSeen = works;
    this.worksSeenInit = true;

    this.paintGreatHall();
  }

  /** A build has started: highlight its row and let the throne hall's guards salute. */
  private cheer(id: SiteId): void {
    const s = this.spotEls.get(id);
    if (s && !this.reduced) {
      s.btn.classList.remove('raise');
      void s.btn.offsetWidth;
      s.btn.classList.add('raise');
    }
    const c = CHAMBERS.find((x) => x.id === id);
    play('levelUp');
    this.triggerHallBurst(400, 230, c?.glow ?? '#ffd700', `${c?.name ?? 'The castle'} rising!`);
    this.kingDecreeUntil = this.now + 1500;
    for (let i = 0; i < 4; i++) this.heroFlourishUntil[i] = this.now + 850;
  }

  private renderPowerBanner(meta: Meta): void {
    const c = meta.castle;
    const pills: { icon: PbIcon; label: string; val: string; active: boolean }[] = [
      { icon: 'gold', label: 'Gold', val: `+${c.treasury * 10}`, active: c.treasury > 0 },
      { icon: 'sword', label: 'Attack', val: `+${c.armoury * 5}%`, active: c.armoury > 0 },
      { icon: 'heart', label: 'Health', val: `+${c.barracks * 6}%`, active: c.barracks > 0 },
      { icon: 'mana', label: 'Mana', val: `+${c.mageTower * 12}%`, active: c.mageTower > 0 },
      { icon: 'speed-2', label: 'Speed', val: `+${c.stable * 4}%`, active: c.stable > 0 },
      { icon: 'g-star', label: 'XP', val: `+${c.library * 6}%`, active: c.library > 0 },
    ];

    // (MENU-GLITCH: drawn again only when a figure changes)
    const key = pills.map((p) => p.val).join('|');
    if (this.powerBanner.dataset.key === key) return;
    this.powerBanner.dataset.key = key;
    this.powerBanner.replaceChildren();
    for (const p of pills) {
      const badge = el('div', `crBoon${p.active ? ' on' : ''}`);
      badge.setAttribute('role', 'img');
      badge.setAttribute('aria-label', `${p.label} ${p.val}`);
      badge.append(medal(p.icon), el('b', '', p.val), el('small', '', p.label));
      this.powerBanner.append(badge);
    }
  }

  start(): void {
    this.running = true;
    if (this.raf || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private loop(t: number): void {
    if (!this.running) return;
    this.raf = requestAnimationFrame((n) => this.loop(n));
    // A resumed callback may carry a timestamp just before start() read performance.now().
    const dt = Math.max(0, Math.min(100, t - this.last));
    this.last = t;
    this.now += dt;
    if (settings().saver && t - this.lastPaint < 1000 / 30) return;
    const frameDt = Math.max(0,Math.min(100,t-this.lastPaint));
    this.lastPaint = t;
    if (this.view !== 'hall' || this.courtMenu || document.hidden) return;
    if (!this.reduced && !settings().saver && this.now >= this.nextIdleSalute) {
      const guard = Math.floor(this.now / 6500) % 4;
      this.heroFlourishUntil[guard] = this.now + 850;
      this.nextIdleSalute = this.now + 6500;
    }
    this.stepParticles(frameDt);
    this.stepGoat(this.reduced ? 0 : frameDt);
    this.paintGreatHall();
  }

  private stepGoat(dt: number): void {
    if (!this.goatArt) return;
    // Duchess actively walks and explores the throne room floor (x = 180..620, y = 370)
    if (!this.goat) {
      this.goat = {
        x: 280,
        face: 1,
        mode: 'walk',
        at: this.now + 2000,
        to: 450,
        then: 'graze',
        steps: 0,
      };
    }

    const g = this.goat;
    if (this.reduced && g.mode !== 'hop') return;
    const groundMin = TERRACE_GOAT.minX;
    const groundMax = TERRACE_GOAT.maxX;
    const friends = GUARD_SPOTS.map((s) => s.x);

    // Duchess occasionally nests on the throne room haystack
    if (g.mode !== 'nest' && g.mode !== 'hop' && Math.random() < 0.003) {
      g.mode = 'nest';
      g.x = TERRACE_GOAT.nestX;
      g.at = this.now + 12000;
    }

    // If hopping, let hop finish
    if (g.mode === 'hop') {
      if (this.now - g.at >= 450) {
        g.mode = 'walk';
        g.to = g.face === 1 ? groundMax - 40 : groundMin + 40;
        g.then = 'graze';
      }
      return;
    }

    if (g.mode === 'walk') {
      // Lively walking speed across the wide 800px hall (38 px/sec)
      const move = 38 * (dt / 1000);
      const dx = g.to - g.x;
      g.steps += move * 0.8;
      if (Math.abs(dx) <= move) {
        g.x = g.to;
        g.mode = g.then;
        g.at = this.now + (g.then === 'nibble' ? 1800 : 1200 + Math.random() * 2000);
      } else {
        g.x += Math.sign(dx) * move;
      }
    } else if (this.now >= g.at) {
      // Grazing / nibble finished: pick a new destination and start walking!
      const roll = Math.random();
      if (roll < 0.35 && friends.length) {
        // Walk over to inspect/nibble near a guard's boots
        const targetHero = friends[Math.floor(Math.random() * friends.length)];
        const side = g.x < targetHero ? -1 : 1;
        g.to = Math.max(groundMin, Math.min(groundMax, targetHero + side * 22));
        g.then = 'nibble';
        g.mode = 'walk';
        g.face = g.to > g.x ? 1 : -1;
      } else {
        // Walk across to another spot on the floor
        const targetX = groundMin + Math.random() * (groundMax - groundMin);
        g.to = targetX;
        g.then = 'graze';
        g.mode = 'walk';
        g.face = g.to > g.x ? 1 : -1;
      }
    }

    if (g.mode === 'nibble' && this.goatWas !== 'nibble') {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = rect.left + (g.x / this.canvas.width) * rect.width;
      const clientY = rect.top + ((TERRACE_GOAT.y - 38) / this.canvas.height) * rect.height;
      goatSays('nibble', { x: clientX, y: clientY });
    }
    this.goatWas = g.mode;
  }

  private stepParticles(dt: number): void {
    if (!this.reduced) {
      // A few warm embers rise from the painted braziers.
      if (this.particles.length < 18 && Math.random() < dt / 140) {
        const bx = 740;
        const x = bx + (Math.random() - 0.5) * 18;
        const y = 662 + (Math.random() - 0.5) * 10;
        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 14,
          vy: -(16 + Math.random() * 28),
          size: 3,
          color: Math.random() < 0.5 ? '#ffae42' : '#fff099',
          alpha: 0.9,
          life: 0,
          maxLife: 1200 + Math.random() * 1400,
          kind: 'mote',
        });
      }
    }

    const k = dt / 1000;
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * k;
      p.y += p.vy * k;
      if (p.kind !== 'mote') {
        p.vy += 180 * k; // gravity on celebration sparks/coins
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
    this.bursts = this.bursts.filter((b) => this.now - b.t0 < b.dur);
  }

  /** Draw a Pixel Effects strip frame (from `VFX`) onto the 2D canvas. */
  private drawVfx(key: VfxKey, x: number, y: number, size: number, frameOffset = 0, angle = 0, alpha = 0.9): void {
    const frames = VFX[key];
    if (!frames?.length) return;
    // (kept in range when the hall's clock is still below zero on its first frames: a negative index once threw every frame, FIGHT-FIXES)
    const frameTime = this.reduced ? 0 : this.now;
    const idx = ((Math.floor(frameTime / 110 + frameOffset) % frames.length) + frames.length) % frames.length;
    const tex = frames[idx];
    if (!tex) return;
    const r = tex.frame;
    const g = this.ctx;
    g.save();
    g.translate(x, y);
    if (angle) g.rotate(angle);
    g.globalAlpha = alpha;
    g.globalCompositeOperation = 'screen';
    g.drawImage(
      tex.source.resource as CanvasImageSource,
      r.x,
      r.y,
      r.width,
      r.height,
      -size / 2,
      -size / 2,
      size,
      size,
    );
    g.restore();
  }

  /** The approved terrace: separate architecture, kingdom, ruler, animated companions and Duchess. */
  private paintGreatHall(): void {
    if (!this.meta || this.view !== 'hall') return;
    const ruler = settings().ruler;
    const title = RULER_COURTS[ruler].name;
    if (this.guardTitle.textContent !== title) this.guardTitle.textContent = title;
    if (this.rulerButton) {
      this.rulerButton.title = `Change ruler · ${rulerOf(ruler).name}`;
      this.rulerButton.setAttribute('aria-label',`Change ruler. Currently ${rulerOf(ruler).name}`);
    }
    const g = this.ctx;
    g.clearRect(0,0,TERRACE_WIDTH,TERRACE_HEIGHT);
    this.terrace.background(g,ruler,this.meta,this.now,this.reduced,settings().saver);
    const shadow = (x: number,y: number,w: number) => {
      g.fillStyle = 'rgba(15,12,20,.35)'; g.beginPath(); g.ellipse(x,y,w,w*.18,0,0,Math.PI*2); g.fill();
    };
    shadow(KING_SPOT.x,KING_SPOT.y,80);
    const decree = this.now < this.kingDecreeUntil;
    const royalArt = this.terrace.rulers.get(ruler);
    if (royalArt) {
      const w = KING_SPOT.h*royalArt.naturalWidth/royalArt.naturalHeight;
      g.save(); g.translate(KING_SPOT.x,KING_SPOT.y); g.scale(-1,1);
      g.drawImage(royalArt,-w/2,-KING_SPOT.h,w,KING_SPOT.h);
      g.restore();
      if (decree && !this.reduced) this.drawVfx('starGold',KING_SPOT.x,KING_SPOT.y-KING_SPOT.h+20,35,0,0,.65);
    }
    GUARD_SPOTS.forEach((spot,i) => {
      const unit = UNITS[this.heroKinds[i]];
      if (!unit) return;
      const image = this.terrace.heroes.get(this.heroKinds[i]);
      if (!image) return;
      const salute = this.now < this.heroFlourishUntil[i];
      shadow(spot.x,spot.y,spot.height*.2);
      drawCourtFigure(g,image,spot.x,spot.y,spot.height,spot.faceRight,this.now+i*1730,this.reduced,salute?1-(this.heroFlourishUntil[i]-this.now)/950:0);
      if (salute && !this.reduced) this.drawVfx('sparkleLight',spot.x,spot.y-spot.height*.6,60,i,0,.5);
    });
    const hay = this.terrace.buildings.get('nest');
    if (hay) g.drawImage(hay,TERRACE_GOAT.nestX-38,TERRACE_GOAT.y-35,76,44);
    if (this.goat && this.terrace.duchess.length === 8) {
      const goat = this.goat, x = Math.round(goat.x), y = TERRACE_GOAT.y;
      const size = 128;
      const lift = this.reduced ? 0 : hopLift(goat,this.now)*1.8;
      const bob = chewBob(goat,this.now,this.reduced);
      shadow(x,y,25);
      g.save(); g.translate(x,y-lift+bob);
      if (goat.face === -1) g.scale(-1,1);
      const frame = goat.mode === 'nest' ? 7 : this.reduced ? 4 : goat.mode === 'hop' ? 6 : goat.mode === 'walk' ? Math.floor(goat.steps/8)%4 : goat.mode === 'graze' || goat.mode === 'nibble' ? 5 : 4;
      g.drawImage(this.terrace.duchess[frame],-size*.375,-size*.79,size*.75,size);
      drawDuchessCosmetic(g,settings().duchessHat,-44,-88,1.8);
      g.restore();
    }
    this.terrace.atmosphere(g,ruler,this.now,this.reduced,settings().saver);
    if (!this.reduced) {
      for (const b of this.bursts) {
        const p = (this.now-b.t0)/b.dur;
        g.save(); g.globalAlpha = 1-p; g.font = 'bold 23px Cinzel Decorative, Georgia, serif';
        g.textAlign = 'center'; g.fillStyle = '#ffe4a2'; g.shadowColor = '#000'; g.shadowBlur = 5;
        if (b.label) g.fillText(b.label,Math.max(180,Math.min(620,b.x)),b.y-70-p*35,600);
        g.restore();
      }
      for (const p of this.particles) {
        g.save(); g.globalAlpha = Math.max(0,1-p.life/p.maxLife)*p.alpha;
        g.fillStyle = p.color; g.fillRect(p.x,p.y,p.size,p.size); g.restore();
      }
    }
  }

  private makeCourtMenu(title: string, sub: string): OrnateMenu {
    this.courtMenu?.close();
    const trigger = document.activeElement as HTMLElement | null;
    const menu = ornateMenu({id:'castleCourt',title,eyebrow:'The Crown Terrace',sub,kind:'sheet',onClose:() => {
      this.courtMenu = null;
      if (trigger?.isConnected) trigger.focus({preventScroll:true});
      this.paintGreatHall();
    }});
    this.courtMenu = menu;
    menuFoot(menu,{back:{word:'close'}});
    menu.root.addEventListener('keydown',e => {
      if (e.key !== 'Tab') return;
      const buttons = [...menu.card.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if (!buttons.length) return;
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (e.shiftKey && at <= 0 || !e.shiftKey && (at < 0 || at === buttons.length-1)) {
        e.preventDefault(); buttons[e.shiftKey?buttons.length-1:0].focus();
      }
    });
    requestAnimationFrame(() => { if (menu.root.isConnected) menu.card.querySelector<HTMLButtonElement>('.omBack')?.focus(); });
    return menu;
  }

  private openRulerPicker(): void {
    const menu = this.makeCourtMenu('Choose your ruler','Each ruler brings an entirely different court and kingdom.');
    const grid = menuSection(menu.body,'Eight royal domains',undefined,2);
    for (const ruler of RULERS) {
      const theme = RULER_COURTS[ruler.id];
      const button = menuChoice(grid,{title:ruler.name,lines:[theme.name],on:settings().ruler===ruler.id,onPick:() => {
        setSetting('ruler',ruler.id); setSetting('rulerPicked',true); menu.close();
      }});
      const image = el('img','crCourtPreview'); image.src = terraceArtUrl(ruler.id); image.alt = ''; image.loading = 'lazy';
      button.prepend(image); button.dataset.ruler = ruler.id;
    }
  }

  private openCourtPicker(slot?: number): void {
    if (!this.meta) return;
    const menu = this.makeCourtMenu(slot === undefined?'Choose your court':`Choose companion ${slot+1}`,'Court companions are cosmetic. Your battle party stays as you set it.');
    if (slot === undefined) {
      const grid = menuSection(menu.body,'Your companions',undefined,2);
      for (let i=0;i<4;i++) {
        const kind = this.heroKinds[i];
        const button = menuChoice(grid,{title:kind ? UNITS[kind]?.name ?? kind : 'Empty place',lines:[`Companion ${i+1} · Change`],onPick:() => this.openCourtPicker(i)});
        button.dataset.slot = String(i);
        if (kind) { const image = el('img','crCourtPortrait'); image.src = `heroes/${kind}-portrait.webp`; image.alt = ''; button.prepend(image); }
      }
      menuChoice(menu.body,{title:'Use strongest heroes automatically',on:!settings().courtHeroes,onPick:() => {setSetting('courtHeroes',undefined);menu.close();}});
      menuNote(menu.body,'Tap a companion in the scene for a salute. Recruit heroes to fill empty places.');
    } else {
      const grid = menuSection(menu.body,'Recruited heroes',undefined,2);
      for (const kind of this.meta.unlocked.filter(k => !!UNITS[k])) {
        const button = menuChoice(grid,{title:UNITS[kind].name,on:this.heroKinds[slot]===kind,lines:[this.heroKinds.includes(kind)?'In your court':'Available'],onPick:() => {
          setSetting('courtHeroes',changeCourtGuard(this.heroKinds,Math.min(slot,this.heroKinds.length),kind)); menu.close(); this.openCourtPicker();
        }});
        button.dataset.hero = kind;
        const image = el('img','crCourtPortrait'); image.src = `heroes/${kind}-portrait.webp`; image.alt = ''; image.loading = 'lazy'; button.prepend(image);
      }
      if (!this.meta.unlocked.length) menuNote(menu.body,'Recruit your first hero to welcome them to court.');
    }
  }

  private claimHaystackTreat(clientX: number, clientY: number, gx: number, gy: number): void {
    const today = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
    let claimed = false;
    let meta = this.meta;
    try {
      const raw = localStorage.getItem('legends.meta');
      if (raw) {
        const saved = JSON.parse(raw) as Meta;
        if (saved.duchessTreat === today) claimed = true;
        meta ??= saved;
      }
    } catch {
      /* ignore */
    }

    if (claimed) {
      showQuip({ x: clientX, y: clientY }, 'Duchess hops off her hay! (Already found today’s treat)', { who: 'Duchess', goat: true, hold: 2200 });
      this.triggerHallBurst(gx, gy - 20, '#ffffff', 'Duchess hops!');
      return;
    }

    const treat = rollDailyTreat();
    if (meta) {
      meta.duchessHay = true;
      meta.duchessTreat = today;
      if (treat.kind === 'stones') {
        meta.stones = (meta.stones ?? 0) + treat.amount;
      } else if (treat.kind === 'crowns') {
        meta.crowns = (meta.crowns ?? 0) + treat.amount;
      }
      try {
        localStorage.setItem('legends.meta', JSON.stringify(meta));
      } catch {
        /* ignore */
      }
    }
    this.onReward?.();
    this.triggerHallBurst(gx, gy - 20, '#ffd13b', treat.kind === 'stones' ? '+Stones!' : treat.kind === 'crowns' ? '+Gold!' : 'Duchess Lore!');
    showQuip({ x: clientX, y: clientY }, treat.message, { who: 'Duchess', goat: true, hold: 3200 });
  }
}
