// The Royal Citadel & Throne Room: an imposing Great Hall where the King sits enthroned,
// Royal Guards stand at attention, and Duchess wanders nearby, above the 6 Sacred Citadel Chambers & High Chapel.

import {
  BUILDING_IDS,
  ROOM_BUILDING_IDS,
  chapelBuilt,
  chapelLevel,
  clockText,
  maxLevel,
  siteLevel,
  siteName,
  siteNextCost,
  siteTop,
  worksLeft,
  type SiteId,
} from './sim/castle';
import { roomsOf } from './sim/rooms';
import type { Meta } from './sim/meta';
import { strongest } from './menuHeroes';
import { sheetInfo } from './render/sheets';
import { loadImage } from './render/loadImage';
import { VFX, type VfxKey } from './render/vfxArt';
import { UNITS } from './sim/units';
import { play } from './render/sound';
import type { PlotId } from './render/castleSpots';
import { goatSheet } from './duchess';
import { goatSays } from './quips';
import { showQuip } from './quipView';
import {
  chewBob,
  drawDuchessCosmetic,
  drawHaystack,
  FRAME as GOAT_FRAME,
  goatFrame,
  hopLift,
  rollDailyTreat,
  tapNudgeGoat,
  type Goat,
} from './render/duchessRules';
import { TrophyWallModal } from './trophyWall';

// Bespoke Castle Throne Room background and Seated King sprite sheets
import throneRoomUrl from './art/throne/throne_room.png';
import { drawRuler } from './render/rulerArt';
import { settings } from './settings';
import { rulerOf, rulerWords } from './rulerRules';

// High-res chamber & architectural sprites (bundled as data URLs by esbuild)
import lightPillarUrl from './art/hall/fx_light-pillar.png';
import rugUrl from './art/tavern/rug.png';
import lecternUrl from './art/library/lectern.png';

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
import chestsUrl from './art/castle/chests.png';
import rackUrl from './art/castle/rack.png';
import drillYardUrl from './art/castle/drill_yard.png';
import anvilUrl from './art/castle/anvil_stall.png';
import bannerUrl from './art/castle/banner.png';
import crystalsUrl from './art/castle/crystals.png';
import brazierUrl from './art/castle/brazier.png';
import shrineUrl from './art/castle/shrine.png';
import goldChestUrl from './art/ui/chest-gold.png';

// Sacred Relic emblems
import crownUrl from './art/items/jewel_crown.png';
import shieldUrl from './art/items/iron_shield.png';
import helmUrl from './art/items/doom_helm.png';
import sapphireUrl from './art/items/frost_sapphire.png';
import bootsUrl from './art/items/cloud_treads.png';
import tomeUrl from './art/items/hourglass.png';
import chaliceUrl from './art/items/holy_chalice.png';
import { motionPlan } from './render/ambient';
import { AmbientLayer } from './render/ambientLayer';
import { medal, plaque, plateButton, type PbIcon } from './paintedButton';
import { castleArtUrl, isPainted, KEEP_SPOT, PLOTS, plaqueState, buildingArt } from './castleArt';
import { LifePainter } from './render/ambientPaint';
import { SCENE_LIFE } from './render/ambientScenes';

const SCENE_ART_URLS = {
  throneRoom: throneRoomUrl,
  lightPillar: lightPillarUrl,
  rug: rugUrl,
  lectern: lecternUrl,
  chests: chestsUrl,
  goldChest: goldChestUrl,
  rack: rackUrl,
  anvil: anvilUrl,
  banner: bannerUrl,
  crystals: crystalsUrl,
  brazier: brazierUrl,
  shrine: shrineUrl,
  greatHall: greatHallUrl,
  forge: forgeUrl,
  barracks: barracksUrl,
  spiral: spiralUrl,
  stable: stableUrl,
  manor: manorUrl,
  chapel: chapelUrl,
} as const;

type SceneArtKey = keyof typeof SCENE_ART_URLS;
let sceneArt: Record<SceneArtKey, HTMLImageElement> | null = null;
async function ensureSceneArt(): Promise<Record<SceneArtKey, HTMLImageElement>> {
  if (sceneArt) return sceneArt;
  const loaded = {} as Record<SceneArtKey, HTMLImageElement>;
  await Promise.all(
    (Object.keys(SCENE_ART_URLS) as SceneArtKey[]).map(async (k) => {
      loaded[k] = await loadImage(SCENE_ART_URLS[k]);
    }),
  );
  return (sceneArt = loaded);
}

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

const DEFAULT_GUARD = ['knight', 'paladin', 'samurai', 'archer'];

// 4 disciplined Royal Guards standing at attention flanking the High Throne & dais:
// 2 Inner Dais Guards (left and right of the throne steps, facing inward at attention)
// 2 Outer Floor Guards (left and right of the red carpet, standing at attention)
const GUARD_SPOTS = [
  { x: 300, y: 280, height: 92, faceRight: true, label: 'Dais Guard' },
  { x: 500, y: 280, height: 92, faceRight: false, label: 'Dais Guard' },
  { x: 225, y: 330, height: 105, faceRight: true, label: 'Honor Guard' },
  { x: 575, y: 330, height: 105, faceRight: false, label: 'Honor Guard' },
];

// The ruler's throne stands on the painted dais; drawing and tap targets share these positions.
const KING_SPOT = { x: 400, y: 247, h: 165 };

export class CastleScene {
  readonly root = el('div', 'ctWrap crPage');
  private scroll = el('div', 'ctScroll crScroll');
  private stage = el('div', 'crStage');

  // (CASTLE-REMAKE: the courtyard: the painting, its life, and a place for each building)
  private yard = el('figure', 'crYard');
  private yardArt = el('img', 'crYardArt');
  private spots = el('div', 'crSpots');
  private spotEls = new Map<SiteId, { btn: HTMLButtonElement; pic: HTMLImageElement; site: HTMLImageElement; plaque: HTMLElement; title: HTMLElement; line: HTMLElement; key: string }>();
  private yardLife: AmbientLayer | null = null;
  private yardSub = el('p', 'crSub');

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
  private meta: Meta | null = null;
  private heroKinds: string[] = [...DEFAULT_GUARD];
  private particles: HallParticle[] = [];
  private bursts: BurstEffect[] = [];
  private heroFlourishUntil = [0, 0, 0, 0];
  private kingDecreeUntil = 0;
  private kingDecreeStarted = 0;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** ALIVE: the throne room's own life: banners and curtain stir, light through the glass, sconces gutter, dust (`ambientPaint.ts`). */
  private life = new LifePainter(SCENE_LIFE.throne, true);
  /** (CASTLE-REMAKE: the painted hall's life, once the owner's painting lands) */
  private hallLife = new LifePainter(SCENE_LIFE.throneHall, true);
  private hallArt: HTMLImageElement | null = null;
  private lifeOf: HTMLImageElement | null = null;
  private trophyModal = new TrophyWallModal();
  /** The works seen at the last update: a new one starting plays the builders' flourish over its plot. */
  private worksSeen = '';
  private worksSeenInit = false;

  // Duchess the goat wandering the Throne Room floor
  private goat: Goat | null = null;
  private goatArt: HTMLImageElement | null = null;
  private goatWas = '';

  constructor(
    private onPick: (id: PlotId | SiteId) => void,
    /** (kept for the home screen's wiring: the courtyard opens a card, whose Build button starts the works) */
    _onDirectUpgrade?: (id: SiteId) => boolean,
  ) {
    this.buildLayout();
    this.canvas.width = 800;
    this.canvas.height = 420;
    this.ctx.imageSmoothingEnabled = false;

    // Load Duchess once, independently of animation frames (also ready when the hall is paused).
    void goatSheet().then((im) => {
      this.goatArt = im;
      this.stepGoat(0);
      if (this.meta) this.paintGreatHall();
    });

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    void ensureSceneArt().then(() => {
      if (this.meta) this.paintGreatHall();
    });
    if (isPainted('throne-hall'))
      void loadImage(castleArtUrl('throne-hall')).then((im) => {
        this.hallArt = im;
        if (this.meta) this.paintGreatHall();
      }).catch(() => undefined);
  }

  private buildLayout(): void {
    // 1. The page's head, as the tavern's: the name, a line, and the boss trophies (the castle's own door; the other places are tabs)
    const head = el('header', 'crHead');
    const words = el('div');
    words.append(el('h2', '', 'The Keep'), this.yardSub);
    const trophies = plateButton({ label: 'Trophies', icon: 'tav-trophies', cls: 'crTrophies', onClick: () => this.meta && this.trophyModal.open(this.meta) });
    trophies.title = 'Defeated Boss Trophy Wall';
    head.append(words, trophies);

    // 2. The courtyard: the painting (a stand-in until the owner's lands), its life over it, then the buildings on their plots
    this.yardArt.src = castleArtUrl('courtyard');
    this.yardArt.alt = 'The castle courtyard at dusk: the keep at the top, the buildings on their plots, the gate below.';
    this.yardArt.draggable = false;
    this.yardArt.decoding = 'async';
    this.yard.classList.toggle('crStandIn', !isPainted('courtyard'));
    this.yardLife = new AmbientLayer(SCENE_LIFE.courtyard, castleArtUrl('courtyard'), { fit: 'fill' }, 'crYardLife');
    const keep = el('button', 'crKeep');
    keep.type = 'button';
    keep.setAttribute('aria-label', 'The keep: go in to the throne hall');
    keep.style.cssText = `left:${KEEP_SPOT.x * 100}%;top:${KEEP_SPOT.y * 100}%;width:${KEEP_SPOT.w * 100}%;height:${KEEP_SPOT.h * 100}%`;
    keep.append(plaque('The Keep', 'throne hall'));
    keep.addEventListener('click', () => {
      play('sparkle');
      this.scenicFrame.scrollIntoView({ behavior: this.reduced ? 'auto' : 'smooth', block: 'center' });
    });
    this.spots.append(keep);
    for (const p of PLOTS) {
      const btn = el('button', 'crSpot');
      btn.type = 'button';
      btn.dataset.site = p.id;
      btn.style.cssText = `left:${p.x * 100}%;top:${p.y * 100}%;width:${p.w * 100}%`;
      const art = el('span', 'crArt');
      const pic = el('img', 'crPic');
      pic.alt = '';
      pic.draggable = false;
      pic.decoding = 'async';
      const site = el('img', 'crSite');
      site.alt = '';
      site.draggable = false;
      site.hidden = true;
      if (isPainted('site')) site.src = castleArtUrl('site');
      art.append(pic, site);
      const pq = plaque('', '');
      const title = pq.querySelector('b')!;
      const line = pq.querySelector('small') ?? pq.appendChild(el('small'));
      btn.append(art, pq);
      btn.addEventListener('click', () => this.onPick(p.id));
      this.spots.append(btn);
      this.spotEls.set(p.id, { btn, pic, site, plaque: pq, title, line, key: '' });
    }
    this.yard.append(this.yardArt, this.yardLife.root, this.spots, el('figcaption', 'crCaption', 'Tap a building to build or upgrade it'));

    // 3. The throne hall: the old scene, now in the ornate frame under a section heading (no emoji pennants or code-drawn crest)
    const hallHead = el('div', 'crSectionHead');
    hallHead.append(el('h3', '', 'The Throne Hall'), el('small', '', 'tap the guards to salute'));
    this.scenicViewport.append(this.canvas);
    this.guardPlaque.append(this.guardTitle, this.guardNames);
    this.scenicFrame.append(this.scenicViewport, this.guardPlaque);
    // Interactive tap on the Throne Room canvas: heroes salute with golden light pillars!
    this.scenicViewport.addEventListener('pointerdown', (e) => this.handleSceneTap(e));

    const boonsHead = el('div', 'crSectionHead');
    boonsHead.append(el('h3', '', 'What the castle gives'), el('small', '', 'every run, from the start'));

    this.stage.append(head, this.yard, boonsHead, this.powerBanner, hallHead, this.scenicFrame);
    this.scroll.append(this.stage);
    this.root.append(this.scroll, this.trophyModal.root);
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
      const gy = 368;
      if (Math.hypot(cx - gx, cy - gy) < 42) {
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

    // 2. Check if King on the High Throne is tapped
    const kingDist = Math.hypot(cx - KING_SPOT.x, cy - (KING_SPOT.y - 45));
    if (kingDist < 85) {
      play('levelUp');
      this.kingDecreeStarted = this.now;
      this.kingDecreeUntil = this.now + 1600;
      for (let i = 0; i < 4; i++) this.heroFlourishUntil[i] = this.now + 1200 + i * 110;
      this.triggerHallBurst(KING_SPOT.x, KING_SPOT.y - 70, '#ffd700', `The ${rulerOf(settings().ruler).female ? 'Queen' : 'King'} Decrees!`);
      return;
    }

    // 3. Check Trophy Rack mounted on the wall
    if (cx >= 590 && cx <= 710 && cy >= 190 && cy <= 300) {
      if (this.meta) {
        this.triggerHallBurst(655, 240, '#f59e0b', 'Boss Trophies!');
        this.trophyModal.open(this.meta);
        return;
      }
    }

    // 4. Check nearest Royal Guard
    let nearestIdx = -1;
    let bestDist = 110;
    GUARD_SPOTS.forEach((spot, idx) => {
      const d = Math.hypot(cx - spot.x, cy - (spot.y - spot.height * 0.45));
      if (d < bestDist) {
        bestDist = d;
        nearestIdx = idx;
      }
    });

    play('sparkle');
    if (nearestIdx >= 0) {
      this.heroFlourishUntil[nearestIdx] = this.now + 950;
      const spot = GUARD_SPOTS[nearestIdx];
      const kind = this.heroKinds[nearestIdx];
      const unitName = UNITS[kind]?.name ?? 'Royal Guard';
      this.triggerHallBurst(spot.x, spot.y - 30, '#ffd700', `${unitName} Salutes!`);
    } else {
      // Tap on throne room hall / carpet: King & all guards salute
      this.kingDecreeStarted = this.now;
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

    // 1. Assemble 4 disciplined Royal Guards flanking the King's throne
    const topUnlocked = strongest(meta, 4);
    const guard: string[] = [...topUnlocked];
    for (const fallback of DEFAULT_GUARD) {
      if (guard.length >= 4) break;
      if (!guard.includes(fallback)) guard.push(fallback);
    }
    this.heroKinds = guard.slice(0, 4);

    const names = this.heroKinds.map((k) => UNITS[k]?.name ?? k).join(' · ');
    this.guardNames.textContent = `${names} · Duchess`;

    // 2. The castle's rank, under the page's title
    const totalLevels = [...BUILDING_IDS, ...ROOM_BUILDING_IDS].reduce((sum, id) => sum + siteLevel(meta.castle, id), 0) + chapelLevel(meta);
    const maxTotalLevels = [...BUILDING_IDS, ...ROOM_BUILDING_IDS, 'chapel' as const].reduce((sum, id) => sum + maxLevel(id), 0);
    const sub = `Castle rank ${totalLevels} of ${maxTotalLevels}`;
    if (this.yardSub.textContent !== sub) this.yardSub.textContent = sub;

    this.renderPowerBanner(meta);

    // 3. Each building on its plot, with its plaque
    // (MENU-GLITCH: a place is drawn again only when what it shows has changed, so a home refresh, or the builders' clock each second,
    //  replaces none of its pictures; the countdown's own text is ticked by the home screen)
    const clock = meta.works ? clockText(worksLeft(meta, Date.now())) : '';
    for (const p of PLOTS) {
      const s = this.spotEls.get(p.id);
      if (!s) continue;
      const lv = siteLevel(meta.castle, p.id, chapelBuilt(meta));
      const cost = siteNextCost(meta.castle, p.id, chapelBuilt(meta));
      const here = meta.works?.id === p.id;
      const st = plaqueState(lv, siteTop(p.id), cost, meta.crowns, here, !!meta.works && !here, clock);
      const key = `${lv}|${cost}|${st.ready}|${here}|${!!meta.works}`;
      if (s.key === key) continue;
      s.key = key;
      const def = CHAMBERS.find((c) => c.id === p.id)!;
      const name = p.id === 'chapel' ? 'Chapel' : siteName(p.id);
      s.btn.className = `crSpot${st.ready ? ' ready' : ''}${st.site ? ' unbuilt' : ''}${st.working ? ' working' : ''}${st.full ? ' full' : ''}`;
      s.btn.style.setProperty('--glow', def.glow);
      s.btn.setAttribute('aria-label', `${name}: ${st.working ? 'being built' : lv === 0 ? 'not built' : `level ${lv} of ${siteTop(p.id)}`}`);
      const url = lookPicture(p.id, Math.max(1, lv));
      if (s.pic.getAttribute('src') !== url) s.pic.src = url;
      // (an empty plot shows the building site once it is painted; until then the building stands greyed as a ghost of itself)
      const sitePainted = isPainted('site');
      s.site.hidden = !(sitePainted && st.site);
      s.pic.hidden = sitePainted && st.site && !st.working;
      s.plaque.className = `pbPlaque${st.ready ? ' ready' : lv === 0 && !st.working ? ' locked' : ''}`;
      s.title.textContent = name;
      if (st.working) s.line.replaceChildren('Building ', el('span', 'worksLeft', clock));
      else s.line.textContent = st.line;
    }

    // (a build that has just started: the builders' flourish over its plot, and the hall cheers)
    const works = meta.works ? `${meta.works.id}:${meta.works.level}` : '';
    if (this.worksSeenInit && works && works !== this.worksSeen) this.cheer(meta.works!.id);
    this.worksSeen = works;
    this.worksSeenInit = true;

    this.paintGreatHall();
  }

  /** A build has started: dust and a flash over its plot, and the throne hall's guards salute. */
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
    this.kingDecreeStarted = this.now;
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
    this.stepParticles(dt);
    this.stepGoat(dt);
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
    const groundMin = 180;
    const groundMax = 620;
    const friends = GUARD_SPOTS.map((s) => s.x);

    // Duchess occasionally nests on the throne room haystack
    if (g.mode !== 'nest' && g.mode !== 'hop' && Math.random() < 0.003) {
      g.mode = 'nest';
      g.x = 210;
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
      const clientY = rect.top + ((368 - 38) / this.canvas.height) * rect.height;
      goatSays('nibble', { x: clientX, y: clientY });
    }
    this.goatWas = g.mode;
  }

  private stepParticles(dt: number): void {
    if (!this.reduced) {
      // A few warm embers rise from the painted braziers.
      if (this.particles.length < 18 && Math.random() < dt / 140) {
        const bx = Math.random() < 0.5 ? 245 : 555;
        const x = bx + (Math.random() - 0.5) * 18;
        const y = 195 + (Math.random() - 0.5) * 10;
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
    const idx = ((Math.floor(this.now / 110 + frameOffset) % frames.length) + frames.length) % frames.length;
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

  /** Paint the full multi-layered Royal Citadel Throne Room scene on the 800×420 canvas. */
  private paintGreatHall(): void {
    const title = `HIGH THRONE · ${rulerOf(settings().ruler).name.toUpperCase()}`;
    if (this.guardTitle.textContent !== title) this.guardTitle.textContent = title;
    const g = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    g.clearRect(0, 0, W, H);

    const a = sceneArt;
    const castle = this.meta?.castle;

    // 1. ARCHITECTURAL BACKDROP: Bespoke Castle Throne Room (400x210 pixel art drawn at 2x)
    const life = motionPlan({ reduced: this.reduced, saver: settings().saver, hidden: false });
    const lt = this.now / 1000;
    // (CASTLE-REMAKE: the owner's painted hall, once it lands, covers the canvas with its own life; until then the old pixel room)
    const hall = this.hallArt;
    if (hall) {
      const k = Math.max(W / hall.naturalWidth, H / hall.naturalHeight);
      const place = { x: (W - hall.naturalWidth * k) / 2, y: (H - hall.naturalHeight * k) / 2, w: hall.naturalWidth * k, h: hall.naturalHeight * k };
      g.imageSmoothingEnabled = true;
      g.drawImage(hall, place.x, place.y, place.w, place.h);
      g.imageSmoothingEnabled = false;
      if (this.lifeOf !== hall) {
        this.lifeOf = hall;
        this.hallLife.layout(hall, hall.naturalWidth, hall.naturalHeight, place);
      }
      this.hallLife.regions(g, lt, life);
    } else if (a?.throneRoom) {
      g.drawImage(a.throneRoom, 0, 0, 400, 210, 0, 0, W, H);
      if (this.lifeOf !== a.throneRoom) {
        this.lifeOf = a.throneRoom;
        this.life.layout(a.throneRoom, 400, 210, { x: 0, y: 0, w: W, h: H });
      }
      this.life.regions(g, lt, life);
    } else {
      const fallbackBg = g.createLinearGradient(0, 0, 0, H);
      fallbackBg.addColorStop(0, '#221b28');
      fallbackBg.addColorStop(1, '#0e0b12');
      g.fillStyle = fallbackBg;
      g.fillRect(0, 0, W, H);
    }

    // The painted windows and braziers provide the hall's light without a gold wash over the architecture.

    // 3. KINGDOM UPGRADE PROPS IN THE THRONE ROOM (positioned neatly in alcoves clear of the King & Guards)
    if (a && !hall) {
      // Arcane Spire & Library props (Left Alcove)
      const mageLv = castle?.mageTower ?? 1;
      const libLv = castle?.library ?? 1;
      if (mageLv >= 1) {
        g.drawImage(a.crystals, 24, 216, 68, 98);
      }
      if (libLv >= 1) {
        g.drawImage(a.lectern, 126, 216, 56, 70);
      }

      // Armoury props (Right Alcove)
      const armouryLv = castle?.armoury ?? 1;
      if (armouryLv >= 1) {
        g.drawImage(a.rack, W - 188, 208, 86, 84);
      }
      if (armouryLv >= 2) {
        g.drawImage(a.anvil, W - 92, 222, 68, 84);
      }

      // High Treasury props (Treasury Chests on Dais sides)
      const treasuryLv = castle?.treasury ?? 1;
      if (treasuryLv >= 1) {
        g.drawImage(a.chests, 212, 198, 72, 56);
        g.drawImage(a.chests, W - 284, 198, 72, 56);
      }
      if (treasuryLv >= 2) {
        g.drawImage(a.goldChest, 236, 224, 46, 46);
        g.drawImage(a.goldChest, W - 282, 224, 46, 46);
      }

      // Standing Twin Stone Braziers flanking the royal steps
      g.drawImage(a.brazier, 78, 198, 48, 120);
      g.drawImage(a.brazier, W - 126, 198, 48, 120);
    }

    // Keep the trophy rack tappable in the right alcove, and fire aligned with the painting.
    if (hall && a && (castle?.armoury ?? 0) >= 1) g.drawImage(a.rack, 624, 216, 72, 70);
    const fireX = hall ? 245 : 102;
    const fireY = hall ? 190 : 188;
    this.drawVfx('flameFire', fireX, fireY, hall ? 42 : 84, 0);
    this.drawVfx('flameFire', W - fireX, fireY, hall ? 42 : 84, 3);

    // 4. THE KING SITTING ON THE HIGH THRONE (Top-center of Dais)
    if (a) {
      const isDecree = this.now < this.kingDecreeUntil;
      const kx = KING_SPOT.x;
      const ky = KING_SPOT.y;
      const kh = KING_SPOT.h;

      g.save();
      // Throne plinth contact shadow directly on dais step
      g.fillStyle = 'rgba(8, 4, 12, 0.65)';
      g.beginPath();
      g.ellipse(kx, ky, 50, 8, 0, 0, Math.PI * 2);
      g.fill();

      // King's decree celebration aura
      if (isDecree) {
        this.drawVfx('levelupGold', kx, ky - kh * 0.5, 200, 0, 0, 0.85);
      }

      drawRuler(g, settings().ruler, isDecree ? 'command' : 'seated', isDecree ? this.now - this.kingDecreeStarted : this.now, this.reduced, kx, ky, kh);

      // Crown glint star
      if (!this.reduced && !isDecree) {
        this.drawVfx('starGold', kx, ky - kh + 32, 44, 0, 0, 0.75);
      }
      g.restore();
    }

    // 5. THE 4 ROYAL GUARDS STANDING AT ATTENTION (Clean, disciplined posture with no aura/fx spam)
    GUARD_SPOTS.forEach((spot, i) => {
      const kind = this.heroKinds[i] ?? DEFAULT_GUARD[i];
      const unit = UNITS[kind];
      if (!unit) return;
      const s = sheetInfo(unit.sheet);
      if (!s) return;

      const flourishing = this.now < this.heroFlourishUntil[i];

      // Subtle, clean floor shadow (no glowing neon halos or pedestal rings)
      g.save();
      g.fillStyle = 'rgba(10, 6, 14, 0.45)';
      g.beginPath();
      g.ellipse(spot.x, spot.y - 1, 24, 7, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();

      // Guards stand strictly at attention! Attack salute only when tapped or King decrees
      const useAttack = flourishing && s.rows.includes('attack');
      const rowName = useAttack ? 'attack' : s.rows.includes('idle') ? 'idle' : s.rows[0];
      const rowIdx = Math.max(0, s.rows.indexOf(rowName));
      const frameCount = s.counts[rowName] ?? 1;
      const frameSpeed = useAttack ? 105 : 180;
      const frameIdx = this.reduced ? 0 : Math.floor((this.now + i * 350) / frameSpeed) % frameCount;
      const breatheLift = !this.reduced && !useAttack && frameCount === 1 && Math.sin((this.now + i * 900) / 480) > 0.4 ? 1 : 0;

      const scale = spot.height / s.figure;
      const dw = Math.round(s.w * scale);
      const dh = Math.round(s.h * scale);

      g.save();
      g.translate(spot.x, spot.y - breatheLift);
      if (s.facesRight !== spot.faceRight) g.scale(-1, 1);
      g.drawImage(
        s.img,
        frameIdx * s.w,
        rowIdx * s.h,
        s.w,
        s.h,
        Math.round(-dw / 2),
        Math.round(-dh + 8),
        dw,
        dh,
      );
      g.restore();

      // Subtle golden salute shine only when tapped
      if (flourishing) {
        this.drawVfx('sparkleLight', spot.x, spot.y - spot.height * 0.6, 90, i);
      }
    });

    if (this.lifeOf) {
      (this.hallArt ? this.hallLife : this.life).lights(g, lt, life);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
    }

    // 6. DUCHESS THE GOAT WANDERING THE THRONE ROOM FLOOR
    drawHaystack(g, 210, 370, 2);
    if (this.goat && this.goatArt) {
      const gx = Math.round(this.goat.x);
      const gy = 370;
      const lift = Math.round(hopLift(this.goat, this.now));
      const bob = chewBob(this.goat, this.now, this.reduced);
      const fr = goatFrame(this.goat);

      g.save();
      // Goat shadow
      g.fillStyle = 'rgba(8, 5, 12, 0.45)';
      g.beginPath();
      g.ellipse(gx, gy, 20, 6, 0, 0, Math.PI * 2);
      g.fill();

      // Draw Duchess at 2x scale (48x48 -> 96x96)
      const gw = GOAT_FRAME * 2;
      const gh = GOAT_FRAME * 2;
      const dy = Math.round(gy - gh - lift * 2 + bob * 2);
      g.drawImage(
        this.goatArt,
        fr * GOAT_FRAME,
        0,
        GOAT_FRAME,
        GOAT_FRAME,
        Math.round(gx - gw / 2),
        dy,
        gw,
        gh,
      );
      drawDuchessCosmetic(g, settings().duchessHat, Math.round(gx - gw / 2), dy, 2, this.goat.face, 0);
      g.restore();
    }

    // 6. CELEBRATION LIGHT PILLARS & FLOATING BANNERS (on tap or upgrade)
    for (const b of this.bursts) {
      const age = this.now - b.t0;
      const p = Math.min(1, age / b.dur);
      const alpha = p < 0.2 ? p / 0.2 : Math.max(0, 1 - (p - 0.2) / 0.8);

      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = alpha * 0.75;
      if (a?.lightPillar) {
        const pw = 130;
        g.drawImage(a.lightPillar, 0, 0, 96, 160, b.x - pw / 2, 0, pw, b.y + 20);
      } else {
        const beamGrad = g.createLinearGradient(b.x - 45, 0, b.x + 45, 0);
        beamGrad.addColorStop(0, 'rgba(255,215,0,0)');
        beamGrad.addColorStop(0.5, b.color);
        beamGrad.addColorStop(1, 'rgba(255,215,0,0)');
        g.fillStyle = beamGrad;
        g.fillRect(b.x - 45, 0, 90, b.y + 10);
      }
      g.restore();

      if (b.label) {
        g.save();
        g.globalAlpha = alpha;
        g.font = 'bold 20px Cinzel Decorative, Georgia, serif';
        g.textAlign = 'center';
        const ly = Math.round(b.y - 95 - p * 36);
        g.fillStyle = '#09140e';
        g.fillText(b.label, b.x + 2, ly + 2);
        g.fillStyle = '#ffe89e';
        g.fillText(b.label, b.x, ly);
        g.restore();
      }
    }

    // 7. AMBIENT & BURST PARTICLES (golden motes, coins, embers)
    for (const pt of this.particles) {
      const ratio = pt.life / pt.maxLife;
      const alpha = ratio < 0.2 ? ratio / 0.2 : Math.max(0, 1 - (ratio - 0.2) / 0.8);
      g.save();
      g.globalAlpha = alpha * pt.alpha;
      g.fillStyle = pt.color;
      g.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
      if (pt.kind === 'coin') {
        g.fillStyle = '#fff9db';
        g.fillRect(Math.round(pt.x) + 1, Math.round(pt.y) + 1, Math.max(1, pt.size - 2), Math.max(1, pt.size - 2));
      }
      g.restore();
    }
  }

  private claimHaystackTreat(clientX: number, clientY: number, gx: number, gy: number): void {
    const today = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
    let claimed = false;
    let meta: Meta | null = null;
    try {
      const raw = localStorage.getItem('legends.meta');
      if (raw) {
        meta = JSON.parse(raw);
        if (meta && meta.duchessTreat === today) claimed = true;
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
    this.triggerHallBurst(gx, gy - 20, '#ffd13b', treat.kind === 'stones' ? '+Stones!' : treat.kind === 'crowns' ? '+Gold!' : 'Duchess Lore!');
    showQuip({ x: clientX, y: clientY }, treat.message, { who: 'Duchess', goat: true, hold: 3200 });
  }
}
