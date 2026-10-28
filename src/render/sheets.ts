// The fighters' sprite sheets (cut by Chronos's tools/compose-sheets.cjs from the Craftpix packs): one row per
// animation, frames `w` x `h`, the figure centred with its feet on the frame's bottom, facing right.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import layout from '../art/units/sheets.json';
import { RESONANCE_URLS } from './resonanceArt';
import { UNITS } from '../sim/units';
import knight from '../art/units/knight_1.png';
import samurai from '../art/units/samurai.png';
import kunoichi from '../art/units/kunoichi.png';
import archer from '../art/units/samurai_archer.png';
import wizard from '../art/units/fire_wizard.png';
import skeleton from '../art/units/skeleton_warrior.png';
import spearman from '../art/units/skeleton_spearman.png';
import boneArcher from '../art/units/skeleton_archer.png';
import wolfGrey from '../art/units/wolf_grey.png';
import wolfBlack from '../art/units/wolf_black.png';
// (Duchess the goat, when she joins a fight: `sim/duchessFight.ts`, `tools/duchess/compose-duchess.py`)
import duchessGoat from '../art/units/duchess_goat.png';
import werewolfBlack from '../art/units/werewolf_black.png';
import werewolfRed from '../art/units/werewolf_red.png';
import werewolfWhite from '../art/units/werewolf_white.png';
import minotaur1 from '../art/units/minotaur_1.png';
import minotaur2 from '../art/units/minotaur_2.png';
import minotaur3 from '../art/units/minotaur_3.png';
import gorgon1 from '../art/units/gorgon_1.png';
import gorgon2 from '../art/units/gorgon_2.png';
import gorgon3 from '../art/units/gorgon_3.png';
import knight2 from '../art/units/knight_2.png';
import knight3 from '../art/units/knight_3.png';
import commander from '../art/units/samurai_commander.png';
import satyr1 from '../art/units/satyr_1.png';
import satyr2 from '../art/units/satyr_2.png';
import satyr3 from '../art/units/satyr_3.png';
import ninjaMonk from '../art/units/ninja_monk.png';
import ninjaPeasant from '../art/units/ninja_peasant.png';
import lightningMage from '../art/units/lightning_mage.png';
import wandererMage from '../art/units/wanderer_mage.png';
import kitsune from '../art/units/kitsune.png';
import karasuTengu from '../art/units/karasu_tengu.png';
import yamabushiTengu from '../art/units/yamabushi_tengu.png';
import orcGrunt from '../art/units/hk_orc_grunt.png';
import orcArcher from '../art/units/hk_orc_archer.png';
import orcBrute from '../art/units/hk_orc_brute.png';
import orcWarlord from '../art/units/hk_orc_warlord.png';
import demon from '../art/units/hk_demon.png';
import demonLord from '../art/units/hk_demon_lord.png';
import imp from '../art/units/hk_imp.png';
import ogre from '../art/units/hk_ogre.png';
import hornedOgre from '../art/units/hk_ogre_horned.png';
import forestBoss1 from '../art/units/forest_boss_1.png';
import forestBoss2 from '../art/units/forest_boss_2.png';
import forestBoss3 from '../art/units/forest_boss_3.png';
import boarKing from '../art/units/boar_king.png';
import clsPaladin1 from '../art/units/cls_paladin_1.png';
import clsPaladin2 from '../art/units/cls_paladin_2.png';
import clsPaladin3 from '../art/units/cls_paladin_3.png';
import clsCleric1 from '../art/units/cls_cleric_1.png';
import clsCleric2 from '../art/units/cls_cleric_2.png';
import clsCleric3 from '../art/units/cls_cleric_3.png';
import clsDruid1 from '../art/units/cls_druid_1.png';
import clsDruid2 from '../art/units/cls_druid_2.png';
import clsDruid3 from '../art/units/cls_druid_3.png';
import clsBarbarian1 from '../art/units/cls_barbarian_1.png';
import clsBarbarian2 from '../art/units/cls_barbarian_2.png';
import clsBarbarian3 from '../art/units/cls_barbarian_3.png';
import clsRanger1 from '../art/units/cls_ranger_1.png';
import clsRanger2 from '../art/units/cls_ranger_2.png';
import clsRanger3 from '../art/units/cls_ranger_3.png';
import clsWarlock1 from '../art/units/cls_warlock_1.png';
import clsWarlock2 from '../art/units/cls_warlock_2.png';
import clsWarlock3 from '../art/units/cls_warlock_3.png';
import clsIllusionist1 from '../art/units/cls_illusionist_1.png';
import clsIllusionist2 from '../art/units/cls_illusionist_2.png';
import clsIllusionist3 from '../art/units/cls_illusionist_3.png';
import clsGunslinger1 from '../art/units/cls_gunslinger_1.png';
import clsGunslinger2 from '../art/units/cls_gunslinger_2.png';
import clsGunslinger3 from '../art/units/cls_gunslinger_3.png';
import standKing from '../art/units/stand_king.png';
import clsTreant from '../art/units/cls_treant.png';
import clsTreant2 from '../art/units/cls_treant_2.png';
import clsTreant3 from '../art/units/cls_treant_3.png';
import devilLeader from '../art/units/devil_leader.png';
import shamanKing from '../art/units/shaman_king.png';
import lichKing from '../art/units/lich_king.png';
import oniKing from '../art/units/oni_king.png';
import golemStone from '../art/units/golem_stone.png';
import golemCrystal from '../art/units/golem_crystal.png';
import golemIron from '../art/units/golem_iron.png';
import golemMagma from '../art/units/golem_magma.png';
import golemSapphire from '../art/units/golem_sapphire.png';
import golemForge from '../art/units/golem_forge.png';
import robotDestroyer from '../art/units/robot_destroyer.png';
import robotInfantry from '../art/units/robot_infantry.png';
import robotSwordsman from '../art/units/robot_swordsman.png';
import hkGhost from '../art/units/hk_ghost.png';
import heroMercenary from '../art/units/hero_mercenary.png';
import heroWolfBard from '../art/units/hero_wolf_bard.png';
import heroBeastmaster from '../art/units/hero_beastmaster.png';
import heroTimeWitch from '../art/units/hero_time_witch.png';
import heroPriestess from '../art/units/hero_priestess.png';
import heroDragoon from '../art/units/hero_dragoon.png';
import heroSage from '../art/units/hero_sage.png';
import heroDemonSwordsman from '../art/units/hero_demon_swordsman.png';
import heroBuccaneer from '../art/units/hero_buccaneer.png';
import heroDreadPirate from '../art/units/hero_dread_pirate.png';
import heroKrakenMate from '../art/units/hero_kraken_mate.png';
import heroLancer from '../art/units/hero_lancer.png';
import heroMummy from '../art/units/hero_mummy.png';
import heroJuggernaut from '../art/units/hero_juggernaut.png';
import heroTyrant from '../art/units/hero_tyrant.png';
import heroShambler from '../art/units/hero_shambler.png';

export type Anim = 'idle' | 'walk' | 'attack' | 'hurt' | 'dead';

interface Layout {
  w: number;
  h: number;
  perRow: number;
  rows: string[];
  counts: Record<string, number>;
  figure: number;
  /** Drawn facing right unless the sheet says otherwise (the forest and boss sheets face left). */
  facesRight?: boolean;
  rear?: string;
}

const URLS: Record<string, string> = {
  ...RESONANCE_URLS,
  knight_1: knight,
  knight_2: knight2,
  knight_3: knight3,
  samurai_commander: commander,
  samurai,
  kunoichi,
  samurai_archer: archer,
  fire_wizard: wizard,
  skeleton_warrior: skeleton,
  skeleton_spearman: spearman,
  skeleton_archer: boneArcher,
  wolf_grey: wolfGrey,
  wolf_black: wolfBlack,
  duchess_goat: duchessGoat,
  werewolf_black: werewolfBlack,
  werewolf_red: werewolfRed,
  werewolf_white: werewolfWhite,
  minotaur_1: minotaur1,
  minotaur_2: minotaur2,
  minotaur_3: minotaur3,
  gorgon_1: gorgon1,
  gorgon_2: gorgon2,
  gorgon_3: gorgon3,
  satyr_1: satyr1,
  satyr_2: satyr2,
  satyr_3: satyr3,
  ninja_monk: ninjaMonk,
  ninja_peasant: ninjaPeasant,
  lightning_mage: lightningMage,
  wanderer_mage: wandererMage,
  kitsune: kitsune,
  karasu_tengu: karasuTengu,
  yamabushi_tengu: yamabushiTengu,
  hk_orc_grunt: orcGrunt,
  hk_orc_archer: orcArcher,
  hk_orc_brute: orcBrute,
  hk_orc_warlord: orcWarlord,
  hk_demon: demon,
  hk_demon_lord: demonLord,
  hk_imp: imp,
  hk_ogre: ogre,
  hk_ogre_horned: hornedOgre,
  forest_boss_1: forestBoss1,
  forest_boss_2: forestBoss2,
  forest_boss_3: forestBoss3,
  boar_king: boarKing,
  devil_leader: devilLeader,
  shaman_king: shamanKing,
  lich_king: lichKing,
  oni_king: oniKing,
  golem_stone: golemStone,
  golem_crystal: golemCrystal,
  golem_iron: golemIron,
  golem_magma: golemMagma,
  golem_sapphire: golemSapphire,
  golem_forge: golemForge,
  cls_paladin_1: clsPaladin1,
  cls_paladin_2: clsPaladin2,
  cls_paladin_3: clsPaladin3,
  cls_cleric_1: clsCleric1,
  cls_cleric_2: clsCleric2,
  cls_cleric_3: clsCleric3,
  cls_druid_1: clsDruid1,
  cls_druid_2: clsDruid2,
  cls_druid_3: clsDruid3,
  cls_barbarian_1: clsBarbarian1,
  cls_barbarian_2: clsBarbarian2,
  cls_barbarian_3: clsBarbarian3,
  cls_ranger_1: clsRanger1,
  cls_ranger_2: clsRanger2,
  cls_ranger_3: clsRanger3,
  cls_warlock_1: clsWarlock1,
  cls_warlock_2: clsWarlock2,
  cls_warlock_3: clsWarlock3,
  cls_illusionist_1: clsIllusionist1,
  cls_illusionist_2: clsIllusionist2,
  cls_illusionist_3: clsIllusionist3,
  cls_gunslinger_1: clsGunslinger1,
  cls_gunslinger_2: clsGunslinger2,
  cls_gunslinger_3: clsGunslinger3,
  stand_king: standKing,
  cls_treant: clsTreant,
  cls_treant_2: clsTreant2,
  cls_treant_3: clsTreant3,
  robot_destroyer: robotDestroyer,
  robot_infantry: robotInfantry,
  robot_swordsman: robotSwordsman,
  hk_ghost: hkGhost,
  hero_mercenary: heroMercenary,
  hero_wolf_bard: heroWolfBard,
  hero_beastmaster: heroBeastmaster,
  hero_time_witch: heroTimeWitch,
  hero_priestess: heroPriestess,
  hero_dragoon: heroDragoon,
  hero_sage: heroSage,
  hero_demon_swordsman: heroDemonSwordsman,
  hero_buccaneer: heroBuccaneer,
  hero_dread_pirate: heroDreadPirate,
  hero_kraken_mate: heroKrakenMate,
  hero_lancer: heroLancer,
  hero_mummy: heroMummy,
  hero_juggernaut: heroJuggernaut,
  hero_tyrant: heroTyrant,
  hero_shambler: heroShambler,
};

const LAYOUT = layout as Record<string, Layout>;
const frames = new Map<string, Texture[]>();
const images = new Map<string, HTMLImageElement>();

/** Load the units' sheets and their rear views and transformation forms. Legacy hero imports
 * remain available as source art without allocating obsolete GPU textures. */
export async function loadSheets(): Promise<void> {
  const required = new Set(Object.values(UNITS).flatMap(def => [def.sheet, ...(def.forms ?? [])]));
  for (const id of [...required]) if (LAYOUT[id]?.rear) required.add(LAYOUT[id].rear!);
  await Promise.all(
    Object.entries(URLS).filter(([id]) => required.has(id)).map(async ([id, url]) => {
      const img = await loadImage(url);
      images.set(id, img);
      const base = Texture.from(img);
      const l = LAYOUT[id];
      l.rows.forEach((row, r) => {
        const list: Texture[] = [];
        for (let i = 0; i < l.counts[row]; i++) list.push(new Texture({ source: base.source,
          frame: new Rectangle((i % l.perRow) * l.w, (r + Math.floor(i / l.perRow)) * l.h, l.w, l.h) }));
        frames.set(`${id}:${row}`, list);
      });
    }),
  );
}

/** An animation's frames (idle when the sheet has no such row). */
export const framesOf = (sheet: string, anim: Anim): Texture[] => frames.get(`${sheet}:${anim}`) ?? frames.get(`${sheet}:idle`)!;
/** Whether a sheet's figures face right as drawn (so a mirror is needed to face left). */
export const facesRightOf = (sheet: string) => LAYOUT[sheet].facesRight !== false;
/** How tall the figure stands in the frame, in the sheet's pixels. */
export const figureOf = (sheet: string) => LAYOUT[sheet].figure;
/** Whether a sheet is known (and so can be drawn): a kit's borrowed look is checked before it is used. */
export const hasSheet = (sheet: string): boolean => !!LAYOUT[sheet] && images.has(sheet);

/** A sheet's picture and layout, for the menus that draw frames straight onto a canvas (null until the sheets are loaded). */
export function sheetInfo(sheet: string): { img: HTMLImageElement; w: number; h: number; perRow: number; rows: string[]; counts: Record<string, number>; figure: number; facesRight: boolean } | null {
  const img = images.get(sheet);
  const l = LAYOUT[sheet];
  return img && l ? { img, w: l.w, h: l.h, perRow: l.perRow, rows: l.rows, counts: l.counts, figure: l.figure, facesRight: l.facesRight !== false } : null;
}

/** The figure's height as a share of its sheet's cell (the rest is the room over its head), for laying effects round a `sprite`. */
export const figureShare = (sheet: string): number => (LAYOUT[sheet] ? LAYOUT[sheet].figure / LAYOUT[sheet].h : 0.8);

/** A small portrait of a fighter for the bench: its first idle frame, cropped to the figure, on a canvas. */
export function portrait(sheet: string, size: number, grade = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const img = images.get(sheet);
  const l = LAYOUT[sheet];
  if (!img) return c;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const idle = l.rows.indexOf('idle');
  // (the top of the figure down to its feet, a square around the middle)
  let side = Math.min(l.figure + 6, l.h);
  let mid = l.w / 2;
  // (a long, low figure, a Werewolf say, is wider than it is tall, and would be cut at the sides: the square grows to take
  //  it in and centres on it. A wide weapon's sweep is not the figure: past a third wider than tall it is left cropped)
  const box = idleBounds(sheet);
  if (box && box.w + 2 > side && box.w + 2 <= Math.min(l.h, side * 1.3)) {
    side = box.w + 2;
    mid = box.x + box.w / 2;
  }
  const sx = Math.min(Math.max(0, mid - side / 2), l.w - side);
  // (a higher grade is richer in colour, and tinted gold at the top)
  if (grade > 1 && 'filter' in g) g.filter = grade > 2 ? 'saturate(1.5) contrast(1.08) sepia(0.25)' : 'saturate(1.3) contrast(1.04)';
  g.drawImage(img, sx, idle * l.h + l.h - side, side, side, 0, 0, size, size);
  g.filter = 'none';
  if (grade > 1) {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = grade > 2 ? 'rgba(255, 200, 70, 0.16)' : 'rgba(210, 225, 255, 0.1)';
    g.fillRect(0, 0, size, size);
  }
  return c;
}

/** Where a sheet's idle figure really lies in its frame (the box round every pixel of every idle frame), found once. */
const bounds = new Map<string, { x: number; y: number; w: number; h: number }>();
function idleBounds(sheet: string): { x: number; y: number; w: number; h: number } | null {
  const l = LAYOUT[sheet];
  const img = images.get(sheet);
  if (!img || !l) return null;
  const known = bounds.get(sheet);
  if (known) return known;
  const row = Math.max(0, l.rows.indexOf('idle'));
  const count = l.counts.idle ?? 1;
  const c = document.createElement('canvas');
  c.width = l.w * count;
  c.height = l.h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, row * l.h, l.w * count, l.h, 0, 0, l.w * count, l.h);
  const px = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = l.w, y0 = l.h, x1 = -1, y1 = -1;
  for (let y = 0; y < l.h; y++)
    for (let x = 0; x < c.width; x++)
      if (px[(y * c.width + x) * 4 + 3] > 8) {
        const fx = x % l.w;
        x0 = Math.min(x0, fx);
        x1 = Math.max(x1, fx);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  const box = x1 < 0 ? { x: 0, y: 0, w: l.w, h: l.h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  bounds.set(sheet, box);
  return box;
}

/** The whole figure (weapons, wings and all, nothing cut off) of a sheet's first idle frame, at the largest whole-number
 * scale that fits `maxW` x `maxH` CSS pixels (at least once over), mirrored with `mirror`. For the boss card. */
export function wholeFigure(sheet: string, maxW: number, maxH: number, mirror = false): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const l = LAYOUT[sheet];
  const img = images.get(sheet);
  const box = idleBounds(sheet);
  if (!img || !l || !box) return c;
  // (a pixel of room on each side, so the drop shadow's edge is not cut either)
  c.width = box.w + 2;
  c.height = box.h + 2;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  if (mirror) g.setTransform(-1, 0, 0, 1, c.width, 0);
  g.drawImage(img, box.x, Math.max(0, l.rows.indexOf('idle')) * l.h + box.y, box.w, box.h, 1, 1, box.w, box.h);
  const n = Math.max(1, Math.min(Math.floor(maxW / c.width), Math.floor(maxH / c.height)));
  c.style.width = `${c.width * n}px`;
  c.style.height = `${c.height * n}px`;
  return c;
}

/** A live sprite on a plain canvas for the menus: the idle frames of a sheet, shown one at a time by `tick`. With `whole` the sheet is drawn at that whole-number scale (crisp), else so the figure is `figurePx` tall. */
export function sprite(sheet: string, figurePx: number, whole?: number): { canvas: HTMLCanvasElement; tick(n: number): void; faceRight: boolean } {
  const c = document.createElement('canvas');
  const l = LAYOUT[sheet];
  const img = images.get(sheet);
  c.width = l.w;
  c.height = l.h;
  // (scaled so the figure itself is `figurePx` tall)
  const k = whole ?? figurePx / l.figure;
  c.style.width = `${Math.round(l.w * k)}px`;
  c.style.height = `${Math.round(l.h * k)}px`;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const row = l.rows.indexOf('idle');
  const count = l.counts.idle ?? 1;
  const tick = (n: number) => {
    if (!img) return;
    g.clearRect(0, 0, l.w, l.h);
    g.drawImage(img, (n % count) * l.w, row * l.h, l.w, l.h, 0, 0, l.w, l.h);
  };
  tick(0);
  return { canvas: c, tick, faceRight: l.facesRight !== false };
}
