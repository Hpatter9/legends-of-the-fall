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

export type Anim = 'idle' | 'walk' | 'attack' | 'hurt' | 'dead';

interface Layout {
  w: number;
  h: number;
  perRow: number;
  rows: string[];
  counts: Record<string, number>;
  figure: number;
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
/** How tall the figure stands in the frame, in the sheet's pixels. */
export const figureOf = (sheet: string) => LAYOUT[sheet].figure;

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
