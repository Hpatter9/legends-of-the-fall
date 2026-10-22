// The awakened hero's picture for the scenes that draw sheets straight onto a canvas (the tavern, the castle road, the camp,
// the summoning hall). A hero with a pack variant gets that sheet; every other hero gets its top form with the awakened
// tone applied to the pixels once (hue turn, saturation, brightness: the same maths as the CSS filter, so it works on
// every phone, not only where a canvas filter does) and kept. Reads the meta only.

import { UNITS } from '../sim/units';
import { heroRank, type Meta } from '../sim/meta';
import { sheetInfo } from './sheets';
import { gradeOfRank } from './tavernSpots';
import { lookSheet, stepOfRank, toneOf, tonePixels } from './awakenLook';

type Rig = NonNullable<ReturnType<typeof sheetInfo>>;
const cache = new Map<string, HTMLCanvasElement>();

/** A cache key for what a hero looks like now, so a scene can tell when to cut its picture again. */
export function lookKey(meta: Meta, kind: string): string {
  const full = heroRank(meta, kind);
  return `${lookSheet(kind, full, gradeOfRank(full))}@${stepOfRank(full)}`;
}

/** The sheet of a hero at its rank, with the awakened tone laid on (null until the sheets are loaded). */
export function heroRig(meta: Meta, kind: string): Rig | null {
  const full = heroRank(meta, kind);
  const sheet = lookSheet(kind, full, gradeOfRank(full));
  const rig = sheetInfo(sheet);
  const step = stepOfRank(full);
  if (!rig || !step || !UNITS[kind]) return rig;
  const t = toneOf(kind, step);
  if (t.hue === 0 && t.saturate === 1 && t.brightness === 1) return rig;
  const key = `${sheet}@${step}@${kind}`;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = rig.img.width;
    c.height = rig.img.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(rig.img, 0, 0);
    const px = g.getImageData(0, 0, c.width, c.height);
    tonePixels(px.data, t);
    g.putImageData(px, 0, 0);
    cache.set(key, c);
  }
  return { ...rig, img: c as unknown as HTMLImageElement };
}
