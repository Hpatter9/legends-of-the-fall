// The look a deep milestone gives a hero in battle (`badgeOf` in `sim/levels.ts`): rings on the ground and, higher up, a soft halo, in the
// colours of the badge frames (the Stone and Iron tokens, as hex for Pixi). Steady: drawn once, never pulsing. No Pixi import here, so tests may read it.

/** The ring colour of each badge tier (index 0 is none): Iron slate, Steel ice, Bronze, Silver, Gold, Ember, Arcane. */
export const AURA_COLOURS: readonly number[] = [0, 0xb4c2d0, 0x7cc0ff, 0xd4631f, 0xe6edf4, 0xffb878, 0xf0503a, 0xb06aff];
/** How many rings round the feet at each tier, and whether a halo stands behind the body. */
export const auraRings = (tier: number): number => (tier <= 0 ? 0 : tier <= 2 ? 1 : tier <= 4 ? 2 : 3);
export const auraHalo = (tier: number): boolean => tier >= 5;
