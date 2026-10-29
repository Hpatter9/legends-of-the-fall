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
  cleric: { tone: 'deep' },
  ranger: { tone: 'brown' },
  illusionist: { tone: 'brown' },
  buccaneer: { tone: 'brown' },
  timeWitch: { tone: 'deep' },
  dragoon: { tone: 'olive' },
  sage: { tone: 'deep' },
  lightningMage: { tone: 'brown' },
};

/** The heroes who are not people (spirits, beasts, the undead, machines): they keep their looks, and are never re-toned. */
export const NOT_HUMAN: readonly string[] = ['kitsune', 'karasu', 'yamabushi', 'werewolf', 'minotaur', 'satyr', 'gorgon', 'shambler', 'rifleBot', 'mummy', 'wolfBard', 'kraken', 'reaper', 'dreadPirate', 'siegeBot'];
