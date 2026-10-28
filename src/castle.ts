// The Royal Citadel & Throne Room: an imposing Great Hall where the King sits enthroned,
// Royal Guards stand at attention, and Duchess wanders nearby, above the 6 Sacred Citadel Chambers & High Chapel.

import {
  BUILDING_IDS,
  CHAPEL_COST,
  chapelBuilt,
  canBuildChapel,
  clockText,
  maxLevel,
  nextCost,
  worksLeft,
  type BuildingId,
} from './sim/castle';
import type { Meta } from './sim/meta';
import { strongest } from './menuHeroes';
import { sheetInfo } from './render/sheets';
import { loadImage } from './render/loadImage';
import { VFX, type VfxKey } from './render/vfxArt';
import { UNITS } from './sim/units';
import { play } from './render/sound';
import { effectText, type PlotId } from './render/castleSpots';
import { goatSheet } from './duchess';
import { goatSays } from './quips';
import { chewBob, FRAME as GOAT_FRAME, goatFrame, hopLift, tapGoat, type Goat } from './render/duchessRules';

// Bespoke Castle Throne Room background and Seated King sprite sheets
import throneRoomUrl from './art/throne/throne_room.png';
import kingThroneUrl from './art/throne/king_throne.png';

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

// Hall props & treasures that appear as you upgrade your kingdom
import chestsUrl from './art/castle/chests.png';
import rackUrl from './art/castle/rack.png';
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

const SCENE_ART_URLS = {
  throneRoom: throneRoomUrl,
  kingThrone: kingThroneUrl,
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
  id: BuildingId | 'chapel';
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
    lore: 'Converging astral rings that accelerate the King’s mana and expand spell budget.',
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
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function lookPicture(id: PlotId, _level: number): string {
  const match = CHAMBERS.find((c) => c.id === id);
  return match ? match.edificeUrl : crownUrl;
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
  { x: 172, y: 254, height: 110, faceRight: true, label: 'Dais Guard' },
  { x: 628, y: 254, height: 110, faceRight: false, label: 'Dais Guard' },
  { x: 120, y: 342, height: 128, faceRight: true, label: 'Honor Guard' },
  { x: 680, y: 342, height: 128, faceRight: false, label: 'Honor Guard' },
];

// King's High Throne position (centered at x = 400, anchored firmly on dais platform tread at y = 258)
const KING_SPOT = { x: 400, y: 258, w: 160, h: 210, frameW: 160, frameH: 210 };

export class CastleScene {
  readonly root = el('div', 'ctWrap ctCitadelWrap');
  private scroll = el('div', 'ctScroll ctCitadelScroll');
  private stage = el('div', 'ctCitadelStage');

  // Scenic Upper Royal Citadel Frame
  private scenicFrame = el('figure', 'ctScenicFrame');
  private scenicViewport = el('div', 'ctThroneScenic');
  private canvas = el('canvas', 'ctHonorCanvas');
  private ctx = this.canvas.getContext('2d')!;
  private crestTitle = el('div', 'ctCrestTitle', 'ROYAL CITADEL');
  private crestSub = el('div', 'ctCrestSub', 'Realm Power · Lv. 0');
  private guardPlaque = el('figcaption', 'ctGuardPlaque');
  private guardTitle = el('span', '', 'HIGH THRONE OF THE KING');
  private guardNames = el('b', '', 'Royal Honor Guard & Duchess');

  // Kingdom Power Summary Strip
  private powerBanner = el('div', 'ctPowerBanner');

  // Chamber Grid
  private grid = el('div', 'ctChamberGrid');
  private chamberEls = new Map<BuildingId | 'chapel', HTMLElement>();

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
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Duchess the goat wandering the Throne Room floor
  private goat: Goat | null = null;
  private goatArt: HTMLImageElement | null = null;
  private goatWas = '';

  constructor(
    private onPick: (id: PlotId) => void,
    private onDirectUpgrade?: (id: BuildingId | 'chapel') => boolean,
  ) {
    this.buildLayout();
    this.canvas.width = 800;
    this.canvas.height = 420;
    this.ctx.imageSmoothingEnabled = false;

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
    void ensureSceneArt().then(() => {
      if (this.meta) this.paintGreatHall();
    });
  }

  private buildLayout(): void {
    // 1. Ceremonial Top Crest + Brass Frame Scene
    const crest = el('div', 'ctRoyalCrest');
    crest.append(this.crestTitle, this.crestSub);

    const rays = el('div', 'ctRays');
    const embers = el('div', 'ctEmbers');
    for (let i = 0; i < 8; i++) embers.append(el('i'));

    const pennantL = el('span', 'ctPennant left', '👑');
    const pennantR = el('span', 'ctPennant right', '⚔️');

    const tapHint = el('div', 'ctTapSaluteHint', '✨ Tap heroes to salute');

    this.scenicViewport.append(rays, this.canvas, embers, tapHint);
    this.guardPlaque.append(this.guardTitle, this.guardNames);
    this.scenicFrame.append(crest, pennantL, pennantR, this.scenicViewport, this.guardPlaque);

    // Interactive tap on the Throne Room canvas: heroes salute with golden light pillars!
    this.scenicViewport.addEventListener('pointerdown', (e) => this.handleSceneTap(e));

    // 2. Section Divider with Quick-access Portals (Tavern, Armies, Spellbook)
    const sectionHeader = el('div', 'ctSectionHeader');
    const sectionTitle = el('h3', '', 'SACRED CHAMBERS OF THE KEEP');
    const quickNav = el('div', 'ctQuickPortals');

    const toTavern = el('button', 'ctPortalChip', '🍺 Tavern');
    toTavern.title = 'Visit the Heroes Tavern';
    toTavern.addEventListener('click', () => this.onPick('tavern'));

    const toSpells = el('button', 'ctPortalChip', '📖 Spells');
    toSpells.title = 'Open the Royal Spellbook';
    toSpells.addEventListener('click', () => this.onPick('chapel'));

    const toArmies = el('button', 'ctPortalChip', '⚔️ March');
    toArmies.title = 'March to the Armies';
    toArmies.addEventListener('click', () => this.onPick('armies'));

    quickNav.append(toTavern, toSpells, toArmies);
    sectionHeader.append(sectionTitle, quickNav);

    // 3. Chamber Grid (6 Sacred Chambers + High Chapel)
    for (const c of CHAMBERS) {
      const card = el('div', 'ctChamberCard');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.dataset.id = c.id;
      card.addEventListener('click', () => this.onPick(c.id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.onPick(c.id);
        }
      });
      this.grid.append(card);
      this.chamberEls.set(c.id, card);
    }

    this.stage.append(this.scenicFrame, this.powerBanner, sectionHeader, this.grid);
    this.scroll.append(this.stage);
    this.root.append(this.scroll);
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
        if (tapGoat(this.goat, this.now)) {
          play('sparkle');
          const clientX = rect.left + (gx / this.canvas.width) * rect.width;
          const clientY = rect.top + ((gy - 38) / this.canvas.height) * rect.height;
          goatSays('tap', { x: clientX, y: clientY });
          this.triggerHallBurst(gx, gy - 20, '#ffffff', 'Duchess hops!');
          return;
        }
      }
    }

    // 2. Check if King on the High Throne is tapped
    const kingDist = Math.hypot(cx - KING_SPOT.x, cy - (KING_SPOT.y - 45));
    if (kingDist < 85) {
      play('levelUp');
      this.kingDecreeUntil = this.now + 1600;
      for (let i = 0; i < 4; i++) this.heroFlourishUntil[i] = this.now + 1200 + i * 110;
      this.triggerHallBurst(KING_SPOT.x, KING_SPOT.y - 70, '#ffd700', 'The King Decrees!');
      return;
    }

    // 3. Check nearest Royal Guard
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
      this.kingDecreeUntil = this.now + 1400;
      for (let i = 0; i < 4; i++) this.heroFlourishUntil[i] = this.now + 900 + i * 120;
      this.triggerHallBurst(400, 225, '#ffe066', 'For the King!');
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

  /** Update the Citadel scene with current meta (levels, crowns, works, unlocked heroes). */
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

    // 2. Compute total Citadel Tier & Kingdom Bonuses for the Royal Crest and Power Banner
    const totalLevels = BUILDING_IDS.reduce((sum, id) => sum + (meta.castle[id] ?? 0), 0) + (chapelBuilt(meta) ? 1 : 0);
    const maxTotalLevels = BUILDING_IDS.reduce((sum, id) => sum + maxLevel(id), 0) + 1;
    this.crestSub.textContent = `Citadel Rank ${totalLevels} / ${maxTotalLevels} · ${meta.crowns.toLocaleString()} Crowns`;

    this.renderPowerBanner(meta);

    // 3. Render each ornate chamber card
    for (const c of CHAMBERS) {
      const card = this.chamberEls.get(c.id);
      if (!card) continue;

      if (c.id === 'chapel') {
        this.renderChapelCard(card, c, meta);
      } else {
        this.renderBuildingCard(card, c, meta);
      }
    }

    this.paintGreatHall();
  }

  private renderPowerBanner(meta: Meta): void {
    const c = meta.castle;
    const pills: { icon: string; label: string; val: string; active: boolean }[] = [
      { icon: '🪙', label: 'Gold', val: `+${c.treasury * 10}`, active: c.treasury > 0 },
      { icon: '⚔️', label: 'ATK', val: `+${c.armoury * 5}%`, active: c.armoury > 0 },
      { icon: '❤️', label: 'HP', val: `+${c.barracks * 6}%`, active: c.barracks > 0 },
      { icon: '💧', label: 'Mana', val: `+${c.mageTower * 12}%`, active: c.mageTower > 0 },
      { icon: '🐎', label: 'Speed', val: `+${c.stable * 4}%`, active: c.stable > 0 },
      { icon: '📜', label: 'XP', val: `+${c.library * 6}%`, active: c.library > 0 },
    ];

    this.powerBanner.replaceChildren();
    for (const p of pills) {
      const badge = el('div', `ctPowerPill${p.active ? ' active' : ''}`);
      badge.append(el('span', 'ctPillIco', p.icon), el('b', '', p.val), el('small', '', p.label));
      this.powerBanner.append(badge);
    }
  }

  private renderBuildingCard(card: HTMLElement, c: ChamberDef, meta: Meta): void {
    const id = c.id as BuildingId;
    const level = meta.castle[id] ?? 0;
    const max = maxLevel(id);
    const cost = nextCost(meta.castle, id);
    const going = meta.works?.id === id ? clockText(worksLeft(meta, Date.now())) : null;
    const buildersBusyElsewhere = !!meta.works && meta.works.id !== id;
    const ready = !going && !meta.works && cost !== null && meta.crowns >= cost;
    const isMax = cost === null;

    card.className = `ctChamberCard${ready ? ' ready' : ''}${isMax ? ' maxed' : ''}${going ? ' working' : ''}`;
    card.style.setProperty('--chamber-glow', c.glow);

    // Top Diorama Banner: Architectural Edifice + Floating Glowing Relic Medallion + Level Badge
    const diorama = el('div', 'ctCardDiorama');
    const edificeImg = el('img', 'ctEdificeImg');
    edificeImg.src = c.edificeUrl;
    edificeImg.alt = c.name;
    edificeImg.draggable = false;

    const relicBadge = el('div', 'ctRelicFrame');
    const relicImg = el('img', 'ctRelicImg');
    relicImg.src = c.icon;
    relicImg.alt = c.relicName;
    relicImg.draggable = false;
    relicBadge.append(relicImg);

    const lvPill = el('span', `ctLvPill${isMax ? ' max' : level > 0 ? ' built' : ''}`, isMax ? `MAX · Lv.${level}` : `Lv. ${level} / ${max}`);
    diorama.append(edificeImg, relicBadge, lvPill);

    // Title & Relic Name
    const head = el('div', 'ctCardHead');
    const titleBox = el('div', 'ctTitleBox');
    const title = el('h4', 'ctCardTitle', c.name);
    const relic = el('small', 'ctRelicSub', `◆ ${c.relicName}`);
    titleBox.append(title, relic);
    head.append(titleBox);

    // Stat & Progress Pips
    const body = el('div', 'ctCardBody');
    const stat = el(
      'div',
      'ctStatLine',
      level > 0 ? effectText(id, level) : `Unbuilt · Next: ${c.perLevelShort}`,
    );
    const pips = el('div', 'ctPips');
    for (let i = 1; i <= max; i++) {
      const pip = el('span', i <= level ? 'star on' : 'star off', i <= level ? '◆' : '◇');
      pips.append(pip);
    }
    body.append(stat, pips);

    // Ornate Action Button
    const foot = el('div', 'ctCardFoot');
    if (going) {
      const tag = el('span', 'ctActionTag working');
      tag.append('⚒️ Raising · ', el('span', 'worksLeft', going));
      foot.append(tag);
    } else if (isMax) {
      const tag = el('span', 'ctActionTag maxed', '♛ GRAND MASTERWORK');
      foot.append(tag);
    } else {
      const btn = el('button', `ctUpgradeBtn${ready ? ' canAfford' : ''}`);
      const labelSpan = el('span', 'ctBtnLabel', buildersBusyElsewhere ? `Lv. ${level + 1} (Busy)` : `▲ Upgrade Lv. ${level + 1}`);
      const costSpan = el('b', 'ctBtnCost', `${cost} 👑`);
      btn.append(labelSpan, costSpan);

      // Direct 1-tap upgrade when ready & handler provided; otherwise opens detailed dossier sheet
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (ready && this.onDirectUpgrade) {
          const ok = this.onDirectUpgrade(id);
          if (ok) {
            play('levelUp');
            this.triggerHallBurst(400, 230, c.glow, `${c.name} Upgrading!`);
            this.kingDecreeUntil = this.now + 1500;
            for (let i = 0; i < 4; i++) this.heroFlourishUntil[i] = this.now + 850;
            return;
          }
        }
        this.onPick(id);
      });
      foot.append(btn);
    }

    card.replaceChildren(diorama, head, body, foot);
  }

  private renderChapelCard(card: HTMLElement, c: ChamberDef, meta: Meta): void {
    const built = chapelBuilt(meta);
    const going = meta.works?.id === 'chapel' ? clockText(worksLeft(meta, Date.now())) : null;
    const ready = !going && !meta.works && canBuildChapel(meta);

    card.className = `ctChamberCard chapel${built ? ' built maxed' : ''}${ready ? ' ready' : ''}${going ? ' working' : ''}`;
    card.style.setProperty('--chamber-glow', c.glow);

    const diorama = el('div', 'ctCardDiorama chapelDiorama');
    const edificeImg = el('img', 'ctEdificeImg');
    edificeImg.src = c.edificeUrl;
    edificeImg.alt = c.name;
    edificeImg.draggable = false;

    const relicBadge = el('div', 'ctRelicFrame');
    const relicImg = el('img', 'ctRelicImg');
    relicImg.src = c.icon;
    relicImg.alt = c.relicName;
    relicImg.draggable = false;
    relicBadge.append(relicImg);

    const lvPill = el('span', `ctLvPill${built ? ' max' : ''}`, built ? 'SANCTIFIED' : 'LOCKED SANCTUM');
    diorama.append(edificeImg, relicBadge, lvPill);

    const contentCol = el('div', 'ctChapelCol');
    const head = el('div', 'ctCardHead');
    const titleBox = el('div', 'ctTitleBox');
    const title = el('h4', 'ctCardTitle', c.name);
    const relic = el('small', 'ctRelicSub', `◆ ${c.relicName}`);
    titleBox.append(title, relic);
    head.append(titleBox);

    const body = el('div', 'ctCardBody');
    const stat = el(
      'div',
      'ctStatLine',
      built
        ? 'Active: Unlocks the King’s Spellbook & Divine Battle Cards'
        : 'Consecrate the High Chapel to unlock the Spells tab and customize your battle spellbook.',
    );
    body.append(stat);

    const foot = el('div', 'ctCardFoot');
    if (going) {
      const tag = el('span', 'ctActionTag working');
      tag.append('⚒️ Sanctifying · ', el('span', 'worksLeft', going));
      foot.append(tag);
    } else if (built) {
      const btn = el('button', 'ctUpgradeBtn canAfford');
      btn.append(el('span', 'ctBtnLabel', '📖 Open Royal Spellbook'), el('b', 'ctBtnCost', 'ENTER →'));
      foot.append(btn);
    } else {
      const btn = el('button', `ctUpgradeBtn${ready ? ' canAfford' : ''}`);
      btn.append(el('span', 'ctBtnLabel', '⛪ Consecrate Sanctum'), el('b', 'ctBtnCost', `${CHAPEL_COST} 👑`));
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (ready && this.onDirectUpgrade) {
          const ok = this.onDirectUpgrade('chapel');
          if (ok) {
            play('levelUp');
            this.triggerHallBurst(400, 210, '#fef08a', 'High Chapel Sanctified!');
            return;
          }
        }
        this.onPick('chapel');
      });
      foot.append(btn);
    }

    contentCol.append(head, body, foot);
    card.replaceChildren(diorama, contentCol);
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
    const dt = Math.min(100, t - this.last);
    this.last = t;
    this.now += dt;
    this.stepParticles(dt);
    this.stepGoat(dt);
    this.paintGreatHall();
  }

  private stepGoat(dt: number): void {
    if (!this.goatArt) {
      void goatSheet().then((im) => (this.goatArt = im));
      return;
    }
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
      // Ambient golden and emerald arcane motes rising from the Throne Room floor & braziers
      if (this.particles.length < 48 && Math.random() < dt / 55) {
        const fromBrazier = Math.random() < 0.45;
        const bx = Math.random() < 0.5 ? 118 : 682;
        const x = fromBrazier ? bx + (Math.random() - 0.5) * 18 : 120 + Math.random() * 560;
        const y = fromBrazier ? 210 + (Math.random() - 0.5) * 10 : 280 + Math.random() * 110;
        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 14,
          vy: -(16 + Math.random() * 28),
          size: fromBrazier ? 3 : Math.random() < 0.35 ? 3 : 2,
          color: fromBrazier
            ? Math.random() < 0.5
              ? '#ffae42'
              : '#fff099'
            : Math.random() < 0.65
              ? '#ffd700'
              : '#6ee7b7',
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
    const idx = Math.floor(this.now / 110 + frameOffset) % frames.length;
    const tex = frames[idx];
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
    const g = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    g.clearRect(0, 0, W, H);

    const a = sceneArt;
    const castle = this.meta?.castle;

    // 1. ARCHITECTURAL BACKDROP: Bespoke Castle Throne Room (400x210 pixel art drawn at 2x)
    if (a?.throneRoom) {
      g.drawImage(a.throneRoom, 0, 0, 400, 210, 0, 0, W, H);
    } else {
      const fallbackBg = g.createLinearGradient(0, 0, 0, H);
      fallbackBg.addColorStop(0, '#221b28');
      fallbackBg.addColorStop(1, '#0e0b12');
      g.fillStyle = fallbackBg;
      g.fillRect(0, 0, W, H);
    }

    // 2. SUNBURST & ARCANE DAIS AURA behind the King's Throne
    const pulse = this.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(this.now / 520);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const daisGlow = g.createRadialGradient(400, 160, 10, 400, 160, 210);
    daisGlow.addColorStop(0, `rgba(255, 218, 100, ${0.28 + pulse * 0.12})`);
    daisGlow.addColorStop(0.45, `rgba(234, 179, 8, ${0.12 + pulse * 0.08})`);
    daisGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = daisGlow;
    g.fillRect(180, 20, 440, 280);
    g.restore();

    // 3. KINGDOM UPGRADE PROPS IN THE THRONE ROOM (positioned neatly in alcoves clear of the King & Guards)
    if (a) {
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

    // Live Brazier Fire & Torchlight Halos
    this.drawVfx('flameFire', 102, 188, 84, 0);
    this.drawVfx('flameFire', W - 102, 188, 84, 3);
    this.drawVfx('sparkleFire', 102, 164, 58, 1);
    this.drawVfx('sparkleFire', W - 102, 164, 58, 4);

    // 4. THE KING SITTING ON THE HIGH THRONE (Top-center of Dais)
    if (a?.kingThrone) {
      const isDecree = this.now < this.kingDecreeUntil;
      const frameIdx = isDecree ? 2 : !this.reduced && Math.floor(this.now / 480) % 2 === 1 ? 1 : 0;
      const kx = KING_SPOT.x;
      const ky = KING_SPOT.y;
      const kw = KING_SPOT.w;
      const kh = KING_SPOT.h;

      // Golden halo aura behind High Throne
      g.save();
      const kingAura = g.createRadialGradient(kx, ky - kh * 0.55, 10, kx, ky - kh * 0.55, kh * 0.7);
      kingAura.addColorStop(0, 'rgba(255, 230, 130, 0.45)');
      kingAura.addColorStop(0.5, 'rgba(234, 179, 8, 0.18)');
      kingAura.addColorStop(1, 'rgba(234, 179, 8, 0)');
      g.fillStyle = kingAura;
      g.fillRect(kx - kw, ky - kh * 1.2, kw * 2, kh * 1.5);

      // Throne plinth contact shadow directly on dais step
      g.fillStyle = 'rgba(8, 4, 12, 0.65)';
      g.beginPath();
      g.ellipse(kx, ky, 72, 14, 0, 0, Math.PI * 2);
      g.fill();

      // King's decree celebration aura
      if (isDecree) {
        this.drawVfx('levelupGold', kx, ky - kh * 0.5, 200, 0, 0, 0.85);
      }

      // Draw King seated on High Throne (frame is 160x210)
      g.drawImage(
        a.kingThrone,
        frameIdx * KING_SPOT.frameW,
        0,
        KING_SPOT.frameW,
        KING_SPOT.frameH,
        Math.round(kx - kw / 2),
        Math.round(ky - kh),
        kw,
        kh
      );

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

    // 6. DUCHESS THE GOAT WANDERING THE THRONE ROOM FLOOR
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
      g.drawImage(
        this.goatArt,
        fr * GOAT_FRAME,
        0,
        GOAT_FRAME,
        GOAT_FRAME,
        Math.round(gx - gw / 2),
        Math.round(gy - gh - lift * 2 + bob * 2),
        gw,
        gh,
      );
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
}
