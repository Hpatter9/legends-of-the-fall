// The heroes' looks: which skin tone (and, for a few, which hair) each human hero's battle sheets are drawn in
// (docs/notes/heritage-looks.md). The re-toned sheets are made offline by `tools/heritage/recolour.py`, which reads this
// table (keep one entry a line), and bundled in the source sheets' place by `src/render/resonanceArt.ts`. 'source' keeps the sheet as it was drawn.
// Data only: no imports, so the tests and the tool can read it.

export type Tone = 'source' | 'deep' | 'brown' | 'tan' | 'olive';
export type Hair = 'black' | 'darkBrown';

/** Each tone's ramp of skin shades, darkest to lightest: a skin pixel takes the shade at its own lightness. */
export const TONES: Record<Exclude<Tone, 'source'>, { ramp: readonly string[]; label: string }> = {
  deep: { ramp: ['#2a150d', '#4a2617', '#6b3c25', '#84522f', '#9a6640'], label: 'deep brown' },
  brown: { ramp: ['#4a2a18', '#6e4026', '#92593a', '#ad7148', '#c2875a'], label: 'brown' },
  tan: { ramp: ['#6a4127', '#8f5d3c', '#ad7752', '#c48d63', '#d6a57a'], label: 'warm tan' },
  olive: { ramp: ['#5e4429', '#86643f', '#a88259', '#bf9a6e', '#d2b083'], label: 'olive' },
};

/** Hair ramps, darkest to lightest, for the few heroes whose hair is redrawn too. */
export const HAIRS: Record<Hair, { hairRamp: readonly string[]; label: string }> = {
  black: { hairRamp: ['#0f0b0a', '#1f1714', '#30241e', '#42322a', '#574238'], label: 'black' },
  darkBrown: { hairRamp: ['#2a1a12', '#43291c', '#5e3b28', '#7a5036', '#966748'], label: 'dark brown' },
};

/** The human heroes whose sheets are re-toned. Every other hero keeps its drawn look. */
export const HERO_LOOKS: Record<string, { tone: Tone; hair?: Hair }> = {
  knight: { tone: 'deep', hair: 'black' },
  wizard: { tone: 'brown' },
  peasant: { tone: 'tan' },
  paladin: { tone: 'olive', hair: 'darkBrown' },
  cleric: { tone: 'deep' },
  ranger: { tone: 'brown' },
  illusionist: { tone: 'brown' },
  buccaneer: { tone: 'brown' },
  timeWitch: { tone: 'deep' },
  dragoon: { tone: 'olive' },
  sage: { tone: 'deep' },
  lightningMage: { tone: 'brown' },
};

/** The heroes who are not people (spirits, beasts, the undead, machines, a gargoyle, a strigoi, a temple-bell yokai): they keep their looks, and are never re-toned. */
export const NOT_HUMAN: readonly string[] = ['kitsune', 'karasu', 'yamabushi', 'werewolf', 'minotaur', 'satyr', 'gorgon', 'shambler', 'rifleBot', 'mummy', 'wolfBard', 'kraken', 'reaper', 'dreadPirate', 'siegeBot', 'bloodGargoyle', 'nightstalker', 'bellWarden'];

/** Dynasties (`dynasty.ts`, docs/notes/dynasty-5.md): the touch of the years on a Veteran's and an Elder's battle sprite, laid on by the
 *  renderer as a steady colour grade of the existing sheets (no new art): `grey` is how far the colours go towards silver (a share of
 *  the saturation taken out), `lift` how much the darks are lifted, so dark hair reads as grey, and `cool` a touch of blue for silver.
 *  The people grey; the beasts, spirits and machines (`NOT_HUMAN`) dull a little less, like a worn shell or an old coat. */
export const AGE_LOOKS: Record<'veteran' | 'elder', { grey: number; lift: number; cool: number }> = {
  veteran: { grey: 0.18, lift: 0.02, cool: 0.01 },
  elder: { grey: 0.36, lift: 0.045, cool: 0.02 },
};
export const AGE_LOOKS_NOT_HUMAN: Record<'veteran' | 'elder', { grey: number; lift: number; cool: number }> = {
  veteran: { grey: 0.14, lift: 0.01, cool: 0 },
  elder: { grey: 0.28, lift: 0.03, cool: 0.01 },
};

/** Dynasties, phase 6 (`heirs.ts`, docs/notes/dynasty-6.md): an heir's look, a steady tint of its kind's existing sheet (no new art), so
 *  the heir and its parent are told apart on the board and in the Houses. Each is a gentle weight on the three colour channels and a
 *  little more or less colour (`sat`, a share): the House's cloth and steel take a new cast, as a child's colours are its own. The
 *  battle sprite, the camp's roaming heroes and the Houses' portraits all wear it. */
export const HEIR_LOOKS: Record<string, { label: string; r: number; g: number; b: number; sat: number }> = {
  ember: { label: 'ember', r: 1.16, g: 0.95, b: 0.8, sat: 0.12 },
  moss: { label: 'moss', r: 0.86, g: 1.12, b: 0.84, sat: 0.04 },
  dusk: { label: 'dusk', r: 1.06, g: 0.84, b: 1.18, sat: 0.04 },
  tide: { label: 'tide', r: 0.82, g: 1.0, b: 1.2, sat: 0.08 },
  gilt: { label: 'gilt', r: 1.14, g: 1.07, b: 0.76, sat: 0.14 },
  ash: { label: 'ash', r: 0.97, g: 0.97, b: 1.03, sat: -0.32 },
};
export const HEIR_LOOK_IDS: readonly string[] = Object.keys(HEIR_LOOKS);

/** A 4x5 colour matrix (rows r, g, b, a; the fifth column an offset in 0 to 1), as Pixi's ColorMatrixFilter and SVG's feColorMatrix
 *  take it. */
export type LookMatrix = number[];
const IDENT: LookMatrix = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
/** Saturation by `amount` (-1 grey to +1 twice), as Pixi's `saturate` builds it. */
const satMatrix = (amount: number): LookMatrix => {
  const x = (amount * 2) / 3 + 1;
  const y = (x - 1) * -0.5;
  return [x, y, y, 0, 0, y, x, y, 0, 0, y, y, x, 0, 0, 0, 0, 0, 1, 0];
};
/** `b` after `a`: the colour `a` makes, then `b` applied to it. */
export function chainLooks(a: LookMatrix, b: LookMatrix): LookMatrix {
  const out = new Array<number>(20).fill(0);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) out[r * 5 + c] += b[r * 5 + k] * a[k * 5 + c];
    out[r * 5 + 4] = b[r * 5 + 4] + [0, 1, 2, 3].reduce((n, k) => n + b[r * 5 + k] * a[k * 5 + 4], 0);
  }
  return out;
}
/** A bearer's whole look as one steady matrix: the touch of the years for a Veteran or an Elder (`AGE_LOOKS`), then its heir's tint
 *  (`HEIR_LOOKS`). Null for a plain look (a Youth or a Prime with no tint). */
export function lookMatrix(kind: string, stage: string | undefined, look: string | undefined): LookMatrix | null {
  let m: LookMatrix | null = null;
  if (stage === 'veteran' || stage === 'elder') {
    const a = (NOT_HUMAN.includes(kind) ? AGE_LOOKS_NOT_HUMAN : AGE_LOOKS)[stage];
    m = satMatrix(-a.grey);
    const keep = 1 - a.lift;
    for (const r of [0, 1, 2]) for (const c of [0, 1, 2]) m[r * 5 + c] *= keep;
    m[4] += a.lift;
    m[9] += a.lift;
    m[14] += a.lift + a.cool;
  }
  const t = look ? HEIR_LOOKS[look] : undefined;
  if (t) {
    const tint = satMatrix(t.sat);
    [t.r, t.g, t.b].forEach((w, r) => {
      for (let c = 0; c < 5; c++) tint[r * 5 + c] *= w;
    });
    m = chainLooks(m ?? IDENT, tint);
  }
  return m;
}
/** A matrix laid on one pixel (0 to 255 channels; the alpha is kept). */
export function lookPixel(m: LookMatrix, r: number, g: number, b: number): [number, number, number] {
  const ch = (row: number) => Math.max(0, Math.min(255, Math.round(m[row * 5] * r + m[row * 5 + 1] * g + m[row * 5 + 2] * b + m[row * 5 + 4] * 255)));
  return [ch(0), ch(1), ch(2)];
}
