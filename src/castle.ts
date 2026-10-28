// The Royal Citadel & Throne Room: an imposing, gilded High-Fantasy Great Hall where the King's
// Royal Company stands honor guard amid glowing arcane sigils, roaring braziers, and the treasures
// of your kingdom upgrades, above the 6 Sacred Citadel Chambers & High Chapel.

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
import { roleOf } from './sim/suggest';
import { play } from './render/sound';
import { effectText, type PlotId } from './render/castleSpots';

// High-res chamber & architectural sprites (bundled as data URLs by esbuild)
import sanctumUrl from './art/hall/sanctum.png';
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
  sanctum: sanctumUrl,
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

const DEFAULT_GUARD = ['knight', 'archer', 'mage', 'cleric', 'samurai'];

// 5 dramatic Honor Guard positions across the Throne Room dais (back-left, back-right, mid-left, mid-right, center champion)
const GUARD_SPOTS = [
  { x: 215, y: 268, height: 112, faceRight: true },
  { x: 585, y: 268, height: 112, faceRight: false },
  { x: 112, y: 332, height: 128, faceRight: true },
  { x: 688, y: 332, height: 128, faceRight: false },
  { x: 400, y: 348, height: 148, faceRight: true },
];

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
  private guardTitle = el('span', '', 'CHAMPIONS OF THE HIGH THRONE');
  private guardNames = el('b', '', 'Royal Honor Guard');

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
  private heroFlourishUntil = [0, 0, 0, 0, 0];
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /** Interactive tap on the Throne Room scene: triggers a hero attack flourish, sound, and golden particle burst! */
  private handleSceneTap(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const cx = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

    // Find nearest hero spot or salute all if tapping the central altar/throne
    let nearestIdx = -1;
    let bestDist = 135;
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
      const unitName = UNITS[kind]?.name ?? 'Champion';
      this.triggerHallBurst(spot.x, spot.y - 30, '#ffd700', `${unitName} Salutes!`);
    } else {
      // Grand Royal Salute from the whole company
      for (let i = 0; i < 5; i++) this.heroFlourishUntil[i] = this.now + 900 + i * 120;
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

    // 1. Always assemble a full 5-Hero Royal Guard (player's strongest unlocked heroes, padded with iconic champions)
    const topUnlocked = strongest(meta, 5);
    const guard: string[] = [...topUnlocked];
    for (const fallback of DEFAULT_GUARD) {
      if (guard.length >= 5) break;
      if (!guard.includes(fallback)) guard.push(fallback);
    }
    this.heroKinds = guard.slice(0, 5);

    const names = this.heroKinds.map((k) => UNITS[k]?.name ?? k).join(' · ');
    this.guardNames.textContent = names;

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
            for (let i = 0; i < 5; i++) this.heroFlourishUntil[i] = this.now + 850;
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
    this.paintGreatHall();
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

    // 1. ARCHITECTURAL BACKDROP: Painted Gothic Royal Sanctum (`sanctum.png` is 1024×1536)
    if (a?.sanctum) {
      // Crop the upper/middle vaulted gothic arches, stained glass rose windows, griffin altar & pillars
      g.drawImage(a.sanctum, 0, 80, 1024, 620, 0, 0, W, H);
    } else {
      const fallbackBg = g.createLinearGradient(0, 0, 0, H);
      fallbackBg.addColorStop(0, '#162820');
      fallbackBg.addColorStop(1, '#0b130f');
      g.fillStyle = fallbackBg;
      g.fillRect(0, 0, W, H);
    }

    // Subtle atmospheric depth vignette so foreground props & heroes pop vividly
    const floorGrad = g.createLinearGradient(0, H * 0.45, 0, H);
    floorGrad.addColorStop(0, 'rgba(10, 18, 15, 0)');
    floorGrad.addColorStop(0.7, 'rgba(12, 20, 16, 0.45)');
    floorGrad.addColorStop(1, 'rgba(8, 13, 10, 0.82)');
    g.fillStyle = floorGrad;
    g.fillRect(0, 0, W, H);

    // 2. ROYAL CRIMSON & GOLD RUNNER RUGS across the Throne Dais
    if (a?.rug) {
      g.save();
      g.globalAlpha = 0.92;
      g.drawImage(a.rug, Math.round(W / 2 - 150), 286, 300, 96);
      g.restore();
    }

    // 3. PULSING ARCANE RITUAL SIGIL & SUNBURST ON THE CENTRAL DAIS
    const pulse = this.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(this.now / 480);
    g.save();
    g.globalCompositeOperation = 'lighter';
    const daisGlow = g.createRadialGradient(400, 275, 10, 400, 275, 185);
    daisGlow.addColorStop(0, `rgba(255, 215, 90, ${0.22 + pulse * 0.1})`);
    daisGlow.addColorStop(0.55, `rgba(74, 222, 128, ${0.1 + pulse * 0.06})`);
    daisGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = daisGlow;
    g.fillRect(180, 120, 440, 280);

    // Orbiting golden rune motes around the central dais ring
    const runeCount = 14;
    const spin = this.reduced ? 0 : this.now / 2200;
    g.fillStyle = 'rgba(255, 230, 140, 0.78)';
    for (let i = 0; i < runeCount; i++) {
      const ang = spin + (i * Math.PI * 2) / runeCount;
      const rx = Math.round(400 + Math.cos(ang) * 128);
      const ry = Math.round(315 + Math.sin(ang) * 34);
      g.fillRect(rx - 2, ry - 2, 4, 4);
    }
    g.restore();

    // 4. KINGDOM UPGRADE PROPS & TREASURES IN THE GREAT HALL
    if (a) {
      // Royal Banners flanking the hall pillars (Barracks)
      const barracksLv = castle?.barracks ?? 1;
      g.drawImage(a.banner, 52, 68, 44, 138);
      g.drawImage(a.banner, W - 96, 68, 44, 138);
      if (barracksLv >= 2) {
        g.drawImage(a.banner, 165, 52, 38, 120);
        g.drawImage(a.banner, W - 203, 52, 38, 120);
      }

      // Arcane Spire & Library props (Left Alcove: Glowing Mana Crystals & Golden Spell Lectern)
      const mageLv = castle?.mageTower ?? 1;
      const libLv = castle?.library ?? 1;
      if (mageLv >= 1) {
        g.drawImage(a.crystals, 30, 210, 68, 98);
      }
      if (libLv >= 1) {
        g.drawImage(a.lectern, 142, 214, 62, 78);
      }

      // Armoury props (Right Alcove: Masterwork Weapon Rack & Sunforge Anvil)
      const armouryLv = castle?.armoury ?? 1;
      if (armouryLv >= 1) {
        g.drawImage(a.rack, W - 220, 202, 96, 94);
      }
      if (armouryLv >= 2) {
        g.drawImage(a.anvil, W - 102, 214, 78, 96);
      }

      // High Treasury props (Overflowing Treasure Chests & Golden Coffer flanking the Throne)
      const treasuryLv = castle?.treasury ?? 1;
      g.drawImage(a.chests, 255, 226, 88, 68);
      g.drawImage(a.chests, W - 343, 226, 88, 68);
      if (treasuryLv >= 2) {
        g.drawImage(a.goldChest, 318, 244, 52, 52);
        g.drawImage(a.goldChest, W - 370, 244, 52, 52);
      }

      // Standing Twin Stone Braziers with live animated VFX flames
      g.drawImage(a.brazier, 92, 198, 52, 130);
      g.drawImage(a.brazier, W - 144, 198, 52, 130);
    }

    // Live Brazier Fire & Warm Torchlight Halos
    this.drawVfx('flameFire', 118, 190, 92, 0);
    this.drawVfx('flameFire', W - 118, 190, 92, 3);
    this.drawVfx('sparkleFire', 118, 165, 64, 1);
    this.drawVfx('sparkleFire', W - 118, 165, 64, 4);

    // 5. THE 5-HERO ROYAL HONOR GUARD
    GUARD_SPOTS.forEach((spot, i) => {
      const kind = this.heroKinds[i] ?? DEFAULT_GUARD[i];
      const unit = UNITS[kind];
      if (!unit) return;
      const s = sheetInfo(unit.sheet);
      if (!s) return;

      const isCenter = i === 4;
      const flourishing = this.now < this.heroFlourishUntil[i];
      const role = roleOf(kind);

      // Class-coloured radial light pool behind each hero
      const auraColor = isCenter
        ? '#ffd700'
        : role === 'support'
          ? '#fde047'
          : unit.shot === 'fire'
            ? '#fb923c'
            : '#38bdf8';

      g.save();
      const halo = g.createRadialGradient(
        spot.x,
        spot.y - spot.height * 0.45,
        6,
        spot.x,
        spot.y - spot.height * 0.45,
        spot.height * 0.95,
      );
      halo.addColorStop(0, `${auraColor}66`);
      halo.addColorStop(1, `${auraColor}00`);
      g.fillStyle = halo;
      g.fillRect(spot.x - spot.height, spot.y - spot.height * 1.4, spot.height * 2, spot.height * 1.8);
      g.restore();

      // Golden floor pedestal ring under each hero's feet
      g.save();
      g.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g.beginPath();
      g.ellipse(spot.x, spot.y, isCenter ? 36 : 28, isCenter ? 12 : 9, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = isCenter ? 'rgba(255, 215, 0, 0.75)' : 'rgba(218, 181, 102, 0.45)';
      g.lineWidth = isCenter ? 2 : 1.5;
      g.stroke();
      g.restore();

      // Background aura VFX on central Sovereign Champion or flourishing heroes
      if (isCenter || flourishing) {
        this.drawVfx('levelupGold', spot.x, spot.y - spot.height * 0.45, isCenter ? 190 : 150, i * 2, 0, 0.75);
      }

      // Choose animation row: attack flourish when tapped or periodic royal salute, otherwise animated idle
      const periodicFlourish = !this.reduced && Math.floor((this.now + i * 1700) / 6500) % 5 === 0 && ((this.now + i * 1700) % 6500) < 750;
      const useAttack = (flourishing || periodicFlourish) && s.rows.includes('attack');
      const rowName = useAttack ? 'attack' : s.rows.includes('idle') ? 'idle' : s.rows[0];
      const rowIdx = Math.max(0, s.rows.indexOf(rowName));
      const frameCount = s.counts[rowName] ?? 1;
      const frameSpeed = useAttack ? 105 : 155;
      const frameIdx = this.reduced ? 0 : Math.floor((this.now + i * 310) / frameSpeed) % frameCount;
      const breatheLift = !this.reduced && frameCount === 1 && Math.sin((this.now + i * 900) / 420) > 0.3 ? 2 : 0;

      const scale = spot.height / s.figure;
      const dw = Math.round(s.w * scale);
      const dh = Math.round(s.h * scale);

      g.save();
      g.translate(spot.x, spot.y - breatheLift);
      if (s.facesRight !== spot.faceRight) g.scale(-1, 1);
      g.shadowColor = isCenter ? '#ffd700' : '#ffe4a0';
      g.shadowBlur = isCenter ? 14 : 8;
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

      // Foreground weapon/spell flourish VFX
      if (useAttack || flourishing) {
        if (unit.shot === 'fire') {
          this.drawVfx('flameFire', spot.x + (spot.faceRight ? 42 : -42), spot.y - spot.height * 0.6, 120, i);
        } else if (role === 'front' || role === 'striker') {
          this.drawVfx('slashLight', spot.x + (spot.faceRight ? 36 : -36), spot.y - spot.height * 0.5, 115, i, spot.faceRight ? -0.4 : 2.4);
        } else {
          this.drawVfx('sparkleLight', spot.x, spot.y - spot.height * 0.65, 110, i);
        }
      } else if (isCenter && !this.reduced) {
        this.drawVfx('starGold', spot.x, spot.y - spot.height - 8, 68, 0, 0, 0.8);
      }
    });

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
