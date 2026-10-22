// The look an awakened hero wears (rank 5 and 6). Where the pack has a colour variant of the hero's sheet, that is its
// awakened sheet (only the Werewolf: its red one). Every other hero has no pack variant left (the packs' grades are
// already its three forms), so its top form is recoloured: a hue turned by its own angle, richer in colour at the first
// step, and brighter with a gold edge at the second. Pure: no Pixi, no DOM (the filters are CSS strings and numbers).

import { ALL_HEROES, formOf, UNITS } from '../sim/units';
import { MAX_RANK } from '../sim/meta';

/** The awakened step a full rank stands for (0 below rank 5). */
export const stepOfRank = (rank: number): number => Math.max(0, Math.min(2, rank - MAX_RANK));

/** Heroes whose awakened sheet is a pack's own colour variant, by the sheet. Every other hero is recoloured. */
export const PACK_VARIANTS: Readonly<Record<string, string>> = { werewolf: 'werewolf_red' };

/** The hue a recoloured hero turns by, in degrees: its own for each hero, kept off the plain greens and reds of the originals. */
export const hueOf = (kind: string): number => {
  const i = Math.max(0, ALL_HEROES.indexOf(kind));
  return 40 + ((i * 53) % 280);
};

/** Whether a hero's awakened look is a recolour (no pack variant). */
export const isRecoloured = (kind: string): boolean => !PACK_VARIANTS[kind];

/** The sheet a hero is drawn from at a rank and grade: its form, or the pack's variant once awakened. */
export function lookSheet(kind: string, rank: number, grade: number): string {
  const def = UNITS[kind];
  if (stepOfRank(rank) > 0 && PACK_VARIANTS[kind]) return PACK_VARIANTS[kind];
  return formOf(def, grade);
}

/** The turn of the look at a step: a hue turn, a richer colour and, at the second step, a brighter finish (a hero with a pack variant is only richer). Written as a CSS filter for the sheet, and applied to pixels by `awakenRig.ts`. */
export interface Tone {
  hue: number;
  saturate: number;
  brightness: number;
}
export function toneOf(kind: string, step: number): Tone {
  if (step <= 0) return { hue: 0, saturate: 1, brightness: 1 };
  return { hue: isRecoloured(kind) ? hueOf(kind) : 0, saturate: step === 1 ? 1.25 : 1.4, brightness: step === 1 ? 1 : 1.1 };
}

/** Apply a tone to every pixel of a picture (the CSS hue-rotate matrix, then saturate, then brightness). */
export function tonePixels(data: Uint8ClampedArray, t: Tone): void {
  const a = (t.hue * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const m = [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
  const k = t.saturate;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let nr = m[0] * r + m[1] * g + m[2] * b;
    let ng = m[3] * r + m[4] * g + m[5] * b;
    let nb = m[6] * r + m[7] * g + m[8] * b;
    const l = 0.213 * nr + 0.715 * ng + 0.072 * nb;
    nr = (l + (nr - l) * k) * t.brightness;
    ng = (l + (ng - l) * k) * t.brightness;
    nb = (l + (nb - l) * k) * t.brightness;
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
  }
}

/** The CSS filter of the awakened look at a step ('' for none). */
export function lookFilter(kind: string, step: number): string {
  if (step <= 0) return '';
  const t = toneOf(kind, step);
  return `${t.hue ? `hue-rotate(${t.hue}deg) ` : ''}saturate(${t.saturate})${t.brightness !== 1 ? ` brightness(${t.brightness})` : ''}`;
}

/** The colour of the glow round an awakened hero. */
export const GLOW = [0, 0xb88cff, 0xffd24a] as const;
