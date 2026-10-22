// The fighters' sprite sheets (cut by Chronos's tools/compose-sheets.cjs from the Craftpix packs): one row per
// animation, frames `w` x `h`, the figure centred with its feet on the frame's bottom, facing right.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import layout from '../art/units/sheets.json';
import knight from '../art/units/knight_1.png';
import samurai from '../art/units/samurai.png';
import kunoichi from '../art/units/kunoichi.png';
import archer from '../art/units/samurai_archer.png';
import wizard from '../art/units/fire_wizard.png';
import skeleton from '../art/units/skeleton_warrior.png';
import spearman from '../art/units/skeleton_spearman.png';
import boneArcher from '../art/units/skeleton_archer.png';
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
import clsTreant from '../art/units/cls_treant.png';
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
}

const URLS: Record<string, string> = {
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
  cls_treant: clsTreant,
};

const LAYOUT = layout as Record<string, Layout>;
const frames = new Map<string, Texture[]>();
const images = new Map<string, HTMLImageElement>();

/** Load every sheet and cut its frames. */
export async function loadSheets(): Promise<void> {
  await Promise.all(
    Object.entries(URLS).map(async ([id, url]) => {
      const img = await loadImage(url);
      images.set(id, img);
      const base = Texture.from(img);
      const l = LAYOUT[id];
      l.rows.forEach((row, r) => {
        const list: Texture[] = [];
        for (let i = 0; i < l.counts[row]; i++) list.push(new Texture({ source: base.source, frame: new Rectangle(i * l.w, r * l.h, l.w, l.h) }));
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

/** A sheet's picture and layout, for the menus that draw frames straight onto a canvas (null until the sheets are loaded). */
export function sheetInfo(sheet: string): { img: HTMLImageElement; w: number; h: number; rows: string[]; counts: Record<string, number>; figure: number; facesRight: boolean } | null {
  const img = images.get(sheet);
  const l = LAYOUT[sheet];
  return img && l ? { img, w: l.w, h: l.h, rows: l.rows, counts: l.counts, figure: l.figure, facesRight: l.facesRight !== false } : null;
}

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
  const side = Math.min(l.figure + 6, l.h);
  const sx = Math.max(0, l.w / 2 - side / 2);
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

/** A live sprite on a plain canvas for the menus: the idle frames of a sheet, shown one at a time by `tick`. */
export function sprite(sheet: string, figurePx: number): { canvas: HTMLCanvasElement; tick(n: number): void; faceRight: boolean } {
  const c = document.createElement('canvas');
  const l = LAYOUT[sheet];
  const img = images.get(sheet);
  c.width = l.w;
  c.height = l.h;
  // (scaled so the figure itself is `figurePx` tall)
  const k = figurePx / l.figure;
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
