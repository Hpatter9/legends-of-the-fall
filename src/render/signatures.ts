// Every hero's skill and ultimate has a look of its own: a few layers (`Step`s) played in a shape of their own, built from the
// Pixel Effects atlas (`fxSheets.ts`) and two little sprites (an arrow, the Kitsune's hearts). Pure data, free of Pixi and the DOM,
// so the tests can check that no two heroes share one (`test/signatures.test.ts`). `signatureFx.ts` plays them.
//
// A signature has three parts:
//   wind  what plays on the caster while it winds up (the length of the cast);
//   cast  what goes off when the skill lands: the first step is the skill's LEAD, the look it is known by, and no two lead
//         strips are the same (the test holds every lead's strip to one skill);
//   hit   what plays on each foe the skill strikes (an ally, for a heal).
// A tier skill's ring is the lead of its hero's skill at a smaller size (`tierRing`), so it keeps the family look.

/** The shapes a step can be played in (`signatureFx.ts` draws each). */
export type Shape =
  | 'ring' // a flat ring or circle on the ground (`loop` keeps it turning for the whole cast)
  | 'ripple' // `n` rings, one after another, each bigger
  | 'pillar' // a column rising where it is
  | 'pillars' // `n` columns round the caster, `r` px out
  | 'drop' // one strip falls onto each foe, and bursts (`l`) where it lands
  | 'rain' // `n` strips fall in a scatter over the foes
  | 'meteor' // one big strip comes in slanting from the sky onto the nearest foe
  | 'beam' // `n` strips fly out in a line toward the nearest foe, `r` px long
  | 'orbit' // `n` motes circle the caster
  | 'spiral' // `n` motes rise in a helix
  | 'spray' // `n` bits thrown out in every direction
  | 'slashX' // two slashes cross on the nearest foe
  | 'sweep' // `n` slashes whirl round the caster
  | 'cleave' // a tall slash falls on each foe
  | 'spikes' // a row of spikes runs out toward the nearest foe
  | 'fan' // `n` strips fan out from the caster, across an arc of `r` radians
  | 'cone' // `n` strips grow along the line to the nearest foe (a breath)
  | 'dome' // a dome of light over the caster for the whole cast
  | 'inward' // `n` motes drawn in from a ring `r` px out
  | 'draw' // motes streaming from each foe to the caster
  | 'chain' // zig-zags from the caster to each foe in turn
  | 'dash' // a trail of motes along the line to the nearest foe
  | 'barrier' // `n` discs set round the caster
  | 'flare' // one big strip on the body
  | 'barrage' // `n` small pops scattered over a foe, one after another
  | 'pop'; // one strip on the body (a struck foe's hit)

/** Whom a step is drawn on: the caster (default), every foe, or every ally. */
export type On = 'self' | 'foes' | 'allies';

export interface Step {
  s: Shape;
  /** The strip: an atlas name ('fire-orb'), a Vfx name ('pinkHeart') or a sprite ('arrow'). */
  k: string;
  /** Size on screen (1 = 32 px). */
  z?: number;
  /** How many (bits, strips, rings). */
  n?: number;
  /** Tint. */
  t?: number;
  /** Opacity. */
  a?: number;
  /** Ms to wait. */
  d?: number;
  /** A distance in px, or an arc in radians for a `fan`. */
  r?: number;
  /** Ms a frame stays up. */
  f?: number;
  on?: On;
  /** What a falling strip bursts into where it lands. */
  l?: string;
  /** Keep turning for the whole cast (a wind-up's ring). */
  loop?: boolean;
}

export interface Signature {
  wind: Step[];
  cast: Step[];
  hit: Step[];
}

const s = (shape: Shape, k: string, o: Partial<Step> = {}): Step => ({ s: shape, k, ...o });
const sig = (wind: Step[], cast: Step[], hit: Step[]): Signature => ({ wind, cast, hit });

/** Keyed by the skill's name, hero and foe alike. */
export const SIGNATURES: Record<string, Signature> = {
  // ---- the knight: a wall of earth
  'Shield Wall': sig(
    [s('dome', 'earth-aura', { z: 2, a: 0.7 })],
    [s('barrier', 'earth-shield', { n: 4, z: 1.1, r: 26, f: 110 }), s('ring', 'earth-wave', { z: 3 })],
    [s('pop', 'earth-hit', { z: 1.2 })],
  ),
  'Last Bastion': sig(
    [s('inward', 'earth-gather', { n: 10, r: 60, z: 1.2 }), s('dome', 'earth-aura', { z: 3, a: 0.6 })],
    [s('pillars', 'earth-pillar', { n: 6, r: 74, z: 2.4, t: 0xffd27a, a: 0.85 }), s('ripple', 'earth-wave', { n: 3, z: 3, t: 0xffd27a }), s('flare', 'earth-nova', { z: 4, a: 0.6 })],
    [s('pop', 'earth-explosion', { z: 1.3 })],
  ),
  // ---- the samurai: the moon's cut, and heaven's
  Iaido: sig(
    [s('inward', 'moon-sparkle', { n: 8, r: 40 })],
    [s('slashX', 'moon-slash', { z: 2.6, f: 45 }), s('dash', 'wind-puff', { n: 6, r: 90, a: 0.6 })],
    [s('pop', 'moon-hit', { z: 1.4, f: 45 })],
  ),
  'Heaven-Splitting Cut': sig(
    [s('pillar', 'light-pillar', { z: 1.6, a: 0.35, d: 120 }), s('orbit', 'light-sparkle', { n: 8, r: 24 })],
    [s('cleave', 'light-slash', { z: 6, t: 0xdff4ff, a: 0.95 }), s('ripple', 'light-wave', { n: 2, z: 4 }), s('flare', 'light-nova', { z: 3.4, a: 0.5 })],
    [s('pillar', 'light-strike', { z: 2, a: 0.9 })],
  ),
  // ---- the kunoichi: smoke and shadow
  'Shadow Step': sig(
    [s('inward', 'dark-smoke', { n: 5, r: 30, z: 0.9, a: 0.7 })],
    [s('dash', 'dark-smoke', { n: 8, r: 120, z: 1.1, a: 0.85 }), s('pop', 'dark-puff', { z: 1.4 })],
    [s('slashX', 'dark-hit', { z: 1.2, f: 45 })],
  ),
  'Shadow Dance': sig(
    [s('orbit', 'dark-sparkle', { n: 10, r: 22, a: 0.9 })],
    [s('orbit', 'dark-slash', { n: 10, r: 38, z: 1.5, f: 40 }), s('sweep', 'dark-wave', { n: 3, z: 3, r: 10 }), s('ring', 'dark-circle', { z: 3.4, a: 0.7 })],
    [s('slashX', 'dark-explosion', { z: 1.1, f: 45 })],
  ),
  // ---- the archer: arrows
  Volley: sig(
    [s('inward', 'wind-sparkle', { n: 6, r: 30 })],
    [s('beam', 'arrow', { n: 6, r: 150, z: 2, f: 45 }), s('pop', 'wind-hit', { z: 1, d: 260 })],
    [s('pop', 'wind-explosion', { z: 0.9 })],
  ),
  'Arrow Storm': sig(
    [s('dome', 'wind-aura', { z: 2.4, a: 0.7 }), s('spiral', 'wind-sparkle', { n: 10, r: 18 })],
    [s('rain', 'wind-strike', { n: 12, z: 1.6, t: 0xffe27a, l: 'wind-hit' }), s('rain', 'arrow', { n: 16, z: 2.2, l: 'wind-hit' }), s('ring', 'wind-wave', { z: 4 })],
    [s('pop', 'wind-hit', { z: 1.2, t: 0xffe27a })],
  ),
  // ---- the fire wizard: fire from the sky
  Meteor: sig(
    [s('ring', 'fire-circle', { z: 1.6, loop: true }), s('orbit', 'fire-sparkle', { n: 8, r: 20 })],
    [s('meteor', 'fire-orb', { z: 3, l: 'fire-explosion' }), s('ring', 'fire-wave', { z: 4, d: 360 })],
    [s('pop', 'fire-explosion', { z: 1.5 })],
  ),
  Armageddon: sig(
    [s('ring', 'fire-rune', { z: 2.8, loop: true, a: 0.55 }), s('pillar', 'fire-pillar', { z: 1.6, a: 0.3, d: 200 })],
    [s('rain', 'fire-strike', { n: 14, z: 2, l: 'fire-explosion', a: 0.9 }), s('ripple', 'fire-wave', { n: 3, z: 4.5 }), s('spray', 'fire-sparkle', { n: 14 })],
    [s('pillar', 'fire-flame', { z: 1.8, a: 0.9 })],
  ),
  // ---- the ninja monk: fists
  'Thousand Fists': sig(
    [s('orbit', 'light-sparkle', { n: 6, r: 16 })],
    [s('barrage', 'fist', { n: 12, z: 0.7, r: 18, f: 40 }), s('barrage', 'light-hit', { n: 12, z: 0.9, r: 16, f: 40, d: 40 })],
    [s('pop', 'light-hit', { z: 1, f: 40 })],
  ),
  'Hundred Fists': sig(
    [s('dome', 'fire-aura', { z: 2, t: 0xffd27a, a: 0.7 })],
    [s('barrage', 'star-hit', { n: 22, z: 1.2, r: 26, f: 35, t: 0xffd27a }), s('flare', 'light-explosion', { z: 3, a: 0.5 }), s('ripple', 'fire-wave', { n: 2, z: 3.5, t: 0xffd27a })],
    [s('pop', 'star-hit', { z: 1.4, f: 40 })],
  ),
  // ---- the peasant: spears, then a village
  'Hold the Line': sig(
    [s('barrier', 'wind-shield', { n: 3, z: 0.9, r: 22, a: 0.6 })],
    [s('spikes', 'wind-spikes', { n: 4, r: 100, z: 1.3, t: 0xe8d8a0 }), s('ring', 'earth-circle', { z: 2.4 })],
    [s('pop', 'wind-hit', { z: 1.1 })],
  ),
  'Mass Muster': sig(
    [s('inward', 'wind-sparkle', { n: 14, r: 80, t: 0xe8d8a0 })],
    [s('inward', 'earth-gather', { n: 16, r: 90, z: 1.2, d: 100 }), s('ripple', 'earth-wave', { n: 3, z: 3.6, t: 0xe8d8a0 }), s('barrier', 'wind-shield', { n: 6, r: 44, z: 0.9, t: 0xe8d8a0 })],
    [s('pop', 'earth-hit', { z: 1.2 })],
  ),
  // ---- the lightning mage: the bolt
  'Chain Lightning': sig(
    [s('orbit', 'lightning-sparkle', { n: 6, r: 14 })],
    [s('chain', 'lightning-strike', { z: 1, a: 0.95 }), s('flare', 'lightning-hit', { z: 1.6 })],
    [s('pop', 'lightning-explosion', { z: 1 })],
  ),
  Thunderstorm: sig(
    [s('dome', 'lightning-aura', { z: 2.6, a: 0.7 }), s('ring', 'lightning-circle', { z: 3, loop: true, a: 0.5 })],
    [s('rain', 'lightning-orb', { n: 12, z: 1.8, l: 'lightning-strike', a: 0.9 }), s('ripple', 'lightning-wave', { n: 3, z: 4.5 }), s('flare', 'lightning-nova', { z: 3.6, a: 0.45 })],
    [s('pillar', 'lightning-pillar', { z: 1.8, a: 0.8 })],
  ),
  // ---- the wanderer: the sun
  Sanctuary: sig(
    [s('inward', 'light-gather', { n: 8, r: 36, a: 0.9 })],
    [s('ring', 'light-rune', { z: 3.4 }), s('spiral', 'light-sparkle', { n: 14, r: 26, z: 0.8, on: 'allies' })],
    [s('pop', 'light-sparkle', { z: 1.2, on: 'allies' })],
  ),
  'Dawn Light': sig(
    [s('dome', 'light-aura', { z: 2.2, a: 0.7 }), s('spiral', 'light-sparkle', { n: 10, r: 18 })],
    [s('fan', 'light-pillar', { n: 7, z: 1.8, r: 2.7, a: 0.7, t: 0xfff2a0 }), s('flare', 'light-nova', { z: 4, t: 0xfff2a0, a: 0.55 }), s('pillar', 'light-gather', { on: 'allies', z: 2, a: 0.8 })],
    [s('pop', 'light-sparkle', { z: 1.4, on: 'allies' })],
  ),
  // ---- the kitsune: hearts and nine tails
  'Fox Charm': sig(
    [s('orbit', 'dark-sparkle', { n: 8, r: 18, t: 0xff9ad8 })],
    [s('spiral', 'pinkHeart', { n: 10, r: 24, z: 1.1, on: 'foes' }), s('ring', 'dark-circle', { z: 2.2, t: 0xff9ad8, a: 0.6 })],
    [s('pop', 'pinkHeart', { z: 1.2 })],
  ),
  'Nine-Tailed Dream': sig(
    [s('orbit', 'fire-sparkle', { n: 9, r: 24, t: 0xb08aff }), s('ring', 'dark-rune', { z: 2.8, loop: true, t: 0xff9ad8, a: 0.5 })],
    [s('fan', 'fire-flame', { n: 9, z: 2.2, r: 3, t: 0xb08aff, a: 0.85, f: 90 }), s('inward', 'pinkHeart', { n: 14, r: 70, z: 1.2, on: 'foes' }), s('ripple', 'dark-wave', { n: 2, z: 4, t: 0xff9ad8 })],
    [s('pop', 'pinkHeart', { z: 1.6 })],
  ),
  // ---- the karasu tengu: a dark swoop, then feathers
  Dive: sig(
    [s('inward', 'wind-puff', { n: 5, r: 26 })],
    [s('meteor', 'dark-strike', { z: 2.2, l: 'dark-hit', t: 0x9a8ab0 }), s('dash', 'dark-puff', { n: 6, r: 80, a: 0.7 })],
    [s('pop', 'dark-hit', { z: 1.4 })],
  ),
  'Feather Storm': sig(
    [s('spiral', 'dark-puff', { n: 12, r: 26, t: 0x403048, a: 0.9 })],
    [s('spray', 'feather', { n: 22, z: 0.8, r: 150 }), s('spray', 'dark-puff', { n: 14, z: 0.8, t: 0x403048, r: 110 }), s('spray', 'blood-sparkle', { n: 14, z: 0.9 }), s('ripple', 'wind-wave', { n: 3, z: 4 })],
    [s('pop', 'dark-puff', { z: 1.2, t: 0x403048 })],
  ),
  // ---- the yamabushi: gusts
  'Wind Gust': sig(
    [s('inward', 'wind-gather', { n: 8, r: 30 })],
    [s('beam', 'wind-wave', { n: 5, r: 160, z: 1.3, f: 60 }), s('pop', 'wind-puff', { z: 1.2, d: 200 })],
    [s('pop', 'wind-nova', { z: 1.2 })],
  ),
  Tempest: sig(
    [s('ring', 'wind-circle', { z: 3, loop: true, t: 0x8fe0ff, a: 0.5 })],
    [s('spiral', 'wind-vortex', { n: 6, r: 50, z: 2.4, t: 0x8fe0ff, a: 0.7, f: 80 }), s('rain', 'lightning-strike', { n: 6, z: 1.6, t: 0xa8e4ff, l: 'lightning-hit' }), s('ripple', 'wind-wave', { n: 3, z: 5, t: 0x8fe0ff })],
    [s('pop', 'wind-vortex', { z: 1.5, t: 0x8fe0ff, a: 0.8 })],
  ),
  // ---- the paladin: gold light
  'Holy Challenge': sig(
    [s('orbit', 'light-sparkle', { n: 8, r: 20, t: 0xffe27a })],
    [s('ripple', 'light-wave', { n: 3, z: 3.4, t: 0xffe27a }), s('draw', 'light-sparkle', { n: 3, t: 0xffe27a })],
    [s('pop', 'light-cross', { z: 1.2, t: 0xffe27a })],
  ),
  'Divine Aegis': sig(
    [s('dome', 'light-shield', { z: 2.2, t: 0xfff2a0, a: 0.5 })],
    [s('barrier', 'light-shield', { n: 6, z: 1.5, r: 42, t: 0xfff2a0, f: 100 }), s('pillar', 'light-pillar', { z: 3, t: 0xfff2a0, a: 0.6 }), s('ripple', 'light-nova', { n: 2, z: 3.4, t: 0xffe27a })],
    [s('pop', 'light-nova', { z: 1.4, on: 'allies' })],
  ),
  // ---- the cleric: blessings fall
  Benediction: sig(
    [s('inward', 'light-gather', { n: 6, r: 24, a: 0.9 })],
    [s('rain', 'light-sparkle', { n: 12, z: 1.2, on: 'allies', a: 0.9 }), s('ring', 'light-circle', { z: 2.6, d: 120 })],
    [s('pop', 'light-puff', { z: 1.3, on: 'allies' })],
  ),
  'Divine Intervention': sig(
    [s('ring', 'light-rune', { z: 3, loop: true, a: 0.5 })],
    [s('orbit', 'light-gather', { n: 10, r: 50, z: 1.4 }), s('pillar', 'light-status', { on: 'allies', z: 2.6, a: 0.8 }), s('flare', 'light-aura', { z: 3.4, a: 0.55 })],
    [s('pop', 'light-explosion', { z: 1.2, on: 'allies', a: 0.8 })],
  ),
  // ---- the druid: the grove
  'Call Treant': sig(
    [s('inward', 'forest-sparkle', { n: 8, r: 30 })],
    [s('spikes', 'forest-spikes', { n: 4, r: 90, z: 1.6 }), s('ring', 'forest-wave', { z: 3 })],
    [s('pop', 'forest-hit', { z: 1.3 })],
  ),
  'Heart of the Grove': sig(
    [s('ring', 'forest-rune', { z: 3, loop: true, a: 0.5 }), s('dome', 'forest-aura', { z: 2.4, a: 0.6 })],
    [s('pillars', 'forest-pillar', { n: 8, r: 80, z: 2.2, a: 0.8 }), s('spiral', 'leaf', { n: 10, r: 34, z: 0.6, on: 'allies' }), s('spiral', 'forest-sparkle', { n: 16, r: 30, on: 'allies' }), s('ripple', 'forest-wave', { n: 3, z: 4.4 })],
    [s('pop', 'forest-explosion', { z: 1.3 })],
  ),
  // ---- the barbarian: blood
  Whirlwind: sig(
    [s('orbit', 'blood-sparkle', { n: 8, r: 20 })],
    [s('sweep', 'blood-slash', { n: 8, z: 1.8, r: 34, f: 40 }), s('ring', 'blood-wave', { z: 2.6 })],
    [s('pop', 'blood-hit', { z: 1.1 })],
  ),
  Bloodlust: sig(
    [s('dome', 'blood-aura', { z: 2.4, a: 0.8 })],
    [s('spray', 'blood-hit', { n: 18, z: 1.2, r: 100 }), s('flare', 'blood-nova', { z: 3.6, a: 0.6 }), s('ripple', 'blood-wave', { n: 3, z: 4.2 })],
    [s('pop', 'blood-explosion', { z: 1.2 })],
  ),
  // ---- the ranger: snares
  'Snare Trap': sig(
    [s('inward', 'forest-sparkle', { n: 5, r: 24 })],
    [s('ring', 'forest-rune', { on: 'foes', z: 1.8, a: 0.9 }), s('pillar', 'forest-puff', { on: 'foes', z: 1.2 })],
    [s('pop', 'forest-hit', { z: 1 })],
  ),
  "Hunter's Net": sig(
    [s('orbit', 'forest-sparkle', { n: 8, r: 22, t: 0xb0d890 })],
    [s('drop', 'forest-cross', { on: 'foes', z: 3, t: 0xb0d890, l: 'forest-explosion' }), s('ring', 'forest-circle', { on: 'foes', z: 2.4, d: 220 })],
    [s('pop', 'forest-cross', { z: 1.4, t: 0xb0d890 })],
  ),
  // ---- the warlock: hex and soul
  Hex: sig(
    [s('orbit', 'dark-sparkle', { n: 6, r: 18, t: 0xb06aff })],
    [s('ring', 'dark-rune', { on: 'foes', z: 2, t: 0xb06aff }), s('pillar', 'dark-status', { on: 'foes', z: 1.4, t: 0xb06aff })],
    [s('pop', 'dark-status', { z: 1.4, t: 0xb06aff })],
  ),
  'Soul Harvest': sig(
    [s('ring', 'dark-rune', { z: 2.8, loop: true, t: 0x9a4aff, a: 0.5 })],
    [s('draw', 'dark-orb', { n: 6, z: 1.1, t: 0x9a4aff }), s('flare', 'dark-gather', { z: 3.4, a: 0.7, d: 380 }), s('ripple', 'dark-wave', { n: 2, z: 4, t: 0x9a4aff })],
    [s('pop', 'dark-gather', { z: 1.3, t: 0x9a4aff })],
  ),
  // ---- the illusionist: copies
  'Mirror Image': sig(
    [s('orbit', 'moon-sparkle', { n: 8, r: 20, t: 0xd8b0ff })],
    [s('barrier', 'dark-shield', { n: 3, z: 1.2, r: 30, t: 0xd8b0ff, f: 100 }), s('pop', 'moon-hit', { z: 1.8, t: 0xd8b0ff })],
    [s('pop', 'moon-hit', { z: 1.2, t: 0xd8b0ff })],
  ),
  'Hall of Mirrors': sig(
    [s('ring', 'dark-circle', { z: 3, loop: true, t: 0xd8b0ff, a: 0.5 })],
    [s('orbit', 'moon-orb', { n: 8, r: 56, z: 1.4, t: 0xd8b0ff }), s('ripple', 'moon-explosion', { n: 3, z: 2.4, t: 0xd8b0ff, a: 0.5 }), s('flare', 'dark-nova', { z: 3.4, t: 0xd8b0ff, a: 0.5 })],
    [s('pop', 'moon-explosion', { z: 1, t: 0xd8b0ff })],
  ),
  // ---- the gunslinger: the shot
  'Dead Eye': sig(
    [s('inward', 'fire-sparkle', { n: 4, r: 18 })],
    [s('beam', 'fire-hit', { n: 3, r: 170, z: 0.8, f: 40, t: 0xffe27a }), s('drop', 'fire-cross', { on: 'foes', z: 1.4, a: 0.8, l: 'fire-hit', d: 100 })],
    [s('pop', 'fire-hit', { z: 1.6, f: 40 })],
  ),
  'High Noon': sig(
    [s('ring', 'fire-circle', { z: 2.6, loop: true, t: 0xffd24a, a: 0.5 })],
    [s('drop', 'fire-cross', { on: 'foes', z: 2.8, t: 0xffd24a, l: 'fire-explosion', a: 0.9 }), s('flare', 'fire-nova', { z: 4, t: 0xffd24a, a: 0.5 }), s('ripple', 'fire-wave', { n: 2, z: 4.4, t: 0xffd24a })],
    [s('pop', 'fire-explosion', { z: 1.2, t: 0xffd24a })],
  ),
  // ---- the shambler: rot
  'Rotting Touch': sig(
    [s('inward', 'poison-smoke', { n: 4, r: 22, z: 0.8 })],
    [s('spray', 'poison-puff', { n: 8, z: 0.9, r: 60 }), s('pop', 'poison-explosion', { z: 1.4, on: 'foes' })],
    [s('pop', 'poison-puff', { z: 1.2 })],
  ),
  'Plague Tide': sig(
    [s('dome', 'poison-aura', { z: 2.4, a: 0.7 })],
    [s('ripple', 'poison-wave', { n: 4, z: 3.4, a: 0.7 }), s('spray', 'poison-smoke', { n: 12, z: 1.3, r: 90 }), s('pillar', 'poison-flame', { on: 'foes', z: 1.4 })],
    [s('pop', 'poison-smoke', { z: 1.2, a: 0.8 })],
  ),
  // ---- the rifle bot: a hail of rounds, then overclock
  'Burst Fire': sig(
    [s('inward', 'wind-sparkle', { n: 4, r: 18, t: 0xffe27a })],
    [s('barrage', 'wind-hit', { n: 10, z: 0.8, r: 14, f: 35, t: 0xffe27a }), s('beam', 'wind-orb', { n: 4, r: 130, z: 0.5, f: 35, t: 0xffe27a })],
    [s('pop', 'wind-hit', { z: 1, f: 35, t: 0xffe27a })],
  ),
  Overclock: sig(
    [s('orbit', 'lightning-sparkle', { n: 8, r: 22, t: 0x9ad0ff })],
    [s('dome', 'lightning-aura', { z: 2.4, t: 0x9ad0ff, a: 0.8, on: 'allies' }), s('ripple', 'lightning-circle', { n: 3, z: 3, t: 0x9ad0ff }), s('spray', 'lightning-sparkle', { n: 14, t: 0x9ad0ff })],
    [s('pop', 'lightning-hit', { z: 1, t: 0x9ad0ff, f: 40 })],
  ),
  // ---- the mercenary: a mark, then a contract
  'Bounty Hunt': sig(
    [s('inward', 'blood-sparkle', { n: 5, r: 22 })],
    [s('drop', 'blood-cross', { on: 'foes', z: 2.2, l: 'blood-hit', a: 0.9 }), s('spray', 'coin', { n: 6, z: 0.6, r: 90 })],
    [s('pop', 'blood-cross', { z: 1.2, a: 0.9 })],
  ),
  'Contract Killer': sig(
    [s('ring', 'blood-rune', { z: 2.6, loop: true, t: 0xffd24a, a: 0.5 })],
    [s('barrage', 'coin', { n: 14, z: 0.8, r: 34 }), s('barrage', 'star-explosion', { n: 16, z: 1.3, r: 30, f: 45, t: 0xffd24a }), s('drop', 'blood-slash', { on: 'foes', z: 2.4, t: 0xffd24a, l: 'star-hit' }), s('ripple', 'blood-wave', { n: 2, z: 4, t: 0xffd24a })],
    [s('pop', 'star-hit', { z: 1.4, t: 0xffd24a })],
  ),
  // ---- the mummy: bandages, then a curse of sand
  'Binding Wraps': sig(
    [s('inward', 'earth-puff', { n: 5, r: 26, t: 0xe8d8a0 })],
    [s('spiral', 'bandage', { n: 9, r: 22, on: 'foes', z: 0.55 }), s('spiral', 'wind-sparkle', { n: 12, r: 22, on: 'foes', t: 0xe8d8a0, z: 1 }), s('ring', 'earth-rune', { on: 'foes', z: 1.6, t: 0xe8d8a0 })],
    [s('pop', 'earth-puff', { z: 1.2, t: 0xe8d8a0 })],
  ),
  'Curse of the Pharaoh': sig(
    [s('ring', 'earth-rune', { z: 2.8, loop: true, t: 0xe8d070, a: 0.5 })],
    [s('ripple', 'earth-circle', { on: 'foes', n: 3, z: 2.2, t: 0xe8d070, a: 0.85 }), s('pillar', 'earth-smoke', { on: 'foes', z: 2, t: 0xe8d8a0 }), s('flare', 'dark-nova', { z: 3, t: 0xe8d070, a: 0.45 })],
    [s('pop', 'earth-smoke', { z: 1.3, t: 0xe8d8a0 })],
  ),
  // ---- the buccaneer: the hook, and the deep
  'Grappling Hook': sig(
    [s('inward', 'ice-sparkle', { n: 4, r: 20 })],
    [s('beam', 'ice-slash', { n: 6, r: 150, z: 1.1, t: 0xb0c0d0, f: 45 }), s('draw', 'ice-puff', { n: 3, a: 0.8, d: 200 })],
    [s('pop', 'ice-hit', { z: 1.2 })],
  ),
  Keelhaul: sig(
    [s('ring', 'water-orb', { z: 2.4, loop: true, a: 0.5 })],
    [s('rain', 'anchor', { n: 7, z: 1, l: 'water-hit' }), s('rain', 'water-explosion', { n: 12, z: 1.8, l: 'water-hit', a: 0.9 }), s('ripple', 'ice-wave', { n: 3, z: 4.2, t: 0x5ab8d8 }), s('spray', 'water-sparkle', { n: 14 })],
    [s('pop', 'water-explosion', { z: 1.3 })],
  ),
  // ---- the wolf bard: a dirge, then a hymn
  Dirge: sig(
    [s('orbit', 'ice-sparkle', { n: 8, r: 20, t: 0x9ad0ff })],
    [s('orbit', 'ice-sparkle', { n: 12, r: 44, z: 1.1, t: 0x9ad0ff }), s('orbit', 'note', { n: 6, r: 56, z: 0.7, t: 0x9ad0ff }), s('ring', 'ice-circle', { z: 3, a: 0.7 })],
    [s('pop', 'ice-status', { z: 1.2 })],
  ),
  'Battle Hymn': sig(
    [s('dome', 'ice-aura', { z: 2.4, a: 0.7 })],
    [s('ripple', 'ice-wave', { n: 4, z: 3.6, t: 0x9ad0ff }), s('spiral', 'light-sparkle', { n: 16, r: 34, on: 'allies', t: 0x9ad0ff }), s('flare', 'ice-nova', { z: 3.4, a: 0.5 })],
    [s('pop', 'ice-hit', { z: 1.2, on: 'allies' })],
  ),
  // ---- the beastmaster: the wild
  'Call of the Wild': sig(
    [s('inward', 'forest-gather', { n: 6, r: 28, t: 0xffb07a })],
    [s('pillars', 'forest-circle', { n: 3, r: 44, z: 1.8, t: 0xffb07a, a: 0.85 }), s('fan', 'paw', { n: 5, z: 0.7, r: 3.1 }), s('ring', 'earth-wave', { z: 2.6, t: 0xffb07a })],
    [s('pop', 'forest-slash', { z: 1.4, t: 0xffb07a })],
  ),
  'Hunt of the Pack': sig(
    [s('ring', 'forest-rune', { z: 2.8, loop: true, t: 0xffb07a, a: 0.5 })],
    [s('beam', 'paw', { n: 7, r: 190, z: 0.9 }), s('beam', 'forest-slash', { n: 7, r: 190, z: 1.6, t: 0xffb07a, f: 40 }), s('fan', 'forest-aura', { n: 5, z: 1.6, r: 1.6, t: 0xffb07a, a: 0.7 }), s('ripple', 'forest-wave', { n: 2, z: 4, t: 0xffb07a })],
    [s('pop', 'forest-slash', { z: 1.6, t: 0xffb07a, f: 40 })],
  ),
  // ---- the kraken mate: the pull of the sea
  Undertow: sig(
    [s('inward', 'water-sparkle', { n: 8, r: 30 })],
    [s('draw', 'water-orb', { n: 4, z: 1, t: 0x5ab8d8, a: 0.9 }), s('ring', 'ice-circle', { on: 'foes', z: 2, t: 0x5ab8d8 })],
    [s('pop', 'water-hit', { z: 1.3 })],
  ),
  Maelstrom: sig(
    [s('ring', 'ice-circle', { z: 3, loop: true, t: 0x5ab8d8, a: 0.5 })],
    [s('spiral', 'ice-vortex', { n: 6, r: 60, z: 2.6, t: 0x5ab8d8, a: 0.7, f: 80 }), s('draw', 'water-orb', { n: 6, z: 1, d: 100 }), s('ripple', 'ice-nova', { n: 3, z: 5, t: 0x5ab8d8 })],
    [s('pop', 'ice-vortex', { z: 1.4, t: 0x5ab8d8 })],
  ),
  // ---- the lancer: the charge
  'Lance Charge': sig(
    [s('inward', 'earth-puff', { n: 4, r: 20, t: 0xffd0a0 })],
    [s('dash', 'earth-puff', { n: 9, r: 150, z: 1.2, t: 0xffd0a0 }), s('pop', 'earth-hit', { z: 1.4, t: 0xffd0a0, d: 200 })],
    [s('pop', 'earth-explosion', { z: 1.1, t: 0xffd0a0 })],
  ),
  'Charge of the Knights': sig(
    [s('ring', 'earth-circle', { z: 2.6, loop: true, t: 0xffd0a0, a: 0.5 })],
    [s('beam', 'star-slash', { n: 8, r: 210, z: 1.8, t: 0xffd0a0, f: 45 }), s('fan', 'earth-hit', { n: 5, z: 1.4, r: 2, t: 0xffd0a0 }), s('ripple', 'earth-wave', { n: 2, z: 4.4, t: 0xffd0a0 })],
    [s('pop', 'star-explosion', { z: 1.2, t: 0xffd0a0 })],
  ),
  // ---- the reaper: the scythe
  Reap: sig(
    [s('inward', 'dark-sparkle', { n: 5, r: 24, t: 0x6a70ff })],
    [s('sweep', 'scythe', { n: 5, z: 1.1, r: 32 }), s('sweep', 'water-slash', { n: 6, z: 2, r: 30, t: 0x6a70ff, f: 45 }), s('ring', 'dark-wave', { z: 2.8, t: 0x6a70ff })],
    [s('pop', 'water-hit', { z: 1.3, t: 0x6a70ff })],
  ),
  'Harvest of Souls': sig(
    [s('ring', 'dark-rune', { z: 3, loop: true, t: 0x6a70ff, a: 0.5 })],
    [s('draw', 'skull', { n: 9, z: 0.7 }), s('draw', 'ice-orb', { n: 9, z: 1.2, t: 0x8ab0ff, a: 0.9 }), s('pillar', 'dark-pillar', { z: 2.4, t: 0x6a70ff, a: 0.6 }), s('ripple', 'dark-wave', { n: 2, z: 4.4, t: 0x6a70ff })],
    [s('pop', 'ice-orb', { z: 1.2, t: 0x8ab0ff })],
  ),
  // ---- the time witch: pink time
  'Temporal Surge': sig(
    [s('orbit', 'light-sparkle', { n: 8, r: 20, t: 0xff9ad8 })],
    [s('ripple', 'light-circle', { n: 3, z: 3, t: 0xff9ad8, a: 0.8 }), s('spiral', 'light-sparkle', { n: 10, r: 22, on: 'allies', t: 0xff9ad8 })],
    [s('pop', 'light-status', { z: 1.2, t: 0xff9ad8 })],
  ),
  'Time Stop': sig(
    [s('dome', 'light-shield', { z: 2.6, t: 0xff9ad8, a: 0.4 })],
    [s('ring', 'light-cross', { z: 6, t: 0xff9ad8, a: 0.7 }), s('ripple', 'light-rune', { n: 3, z: 4, t: 0xff9ad8, a: 0.6 }), s('orbit', 'light-orb', { n: 12, r: 70, z: 0.8, t: 0xff9ad8 })],
    [s('pop', 'light-cross', { z: 1.4, t: 0xff9ad8 })],
  ),
  // ---- the arc blade: sparks along a blink
  'Voltage Blink': sig(
    [s('inward', 'lightning-sparkle', { n: 5, r: 22 })],
    [s('dash', 'lightning-puff', { n: 7, r: 110, z: 1.2, t: 0xbfe6ff }), s('pop', 'lightning-nova', { z: 2, d: 200 })],
    [s('pop', 'lightning-slash', { z: 1.5, f: 40 })],
  ),
  'Thunder Cascade': sig(
    [s('ring', 'lightning-rune', { z: 2.8, loop: true, t: 0xb06aff, a: 0.5 })],
    [s('pillars', 'lightning-pillar', { n: 7, r: 72, z: 2.2, t: 0xb06aff, a: 0.85 }), s('chain', 'lightning-strike', { z: 1.2, t: 0xd8b0ff }), s('ripple', 'lightning-wave', { n: 3, z: 4.4, t: 0xb06aff })],
    [s('pop', 'lightning-explosion', { z: 1.2, t: 0xb06aff })],
  ),
  // ---- the dread pirate: cannon fire, and a ghost fleet
  Broadside: sig(
    [s('inward', 'fire-smoke', { n: 3, r: 26, z: 0.8 })],
    [s('fan', 'cannonball', { n: 5, z: 0.8, r: 2.2 }), s('fan', 'fire-smoke', { n: 5, z: 1.6, r: 2.2, a: 0.9 }), s('barrage', 'fire-explosion', { n: 6, z: 1, r: 40, on: 'foes', d: 160, t: 0x9ad0b0 })],
    [s('pop', 'fire-explosion', { z: 1.2, t: 0x9ad0b0 })],
  ),
  'Ghost Fleet': sig(
    [s('ring', 'poison-circle', { z: 3, loop: true, t: 0x9ad0b0, a: 0.5 })],
    [s('beam', 'poison-flame', { n: 7, r: 220, z: 2, t: 0x9ad0b0, a: 0.8, f: 80 }), s('rain', 'poison-orb', { n: 8, z: 1.6, t: 0x9ad0b0, l: 'poison-explosion' }), s('ripple', 'poison-wave', { n: 2, z: 5, t: 0x9ad0b0 })],
    [s('pop', 'poison-explosion', { z: 1.2, t: 0x9ad0b0 })],
  ),
  // ---- the siege bot: shells and a strike from orbit
  'Shell Barrage': sig(
    [s('inward', 'wind-sparkle', { n: 4, r: 20, t: 0xb0b8d0 })],
    [s('meteor', 'wind-orb', { z: 2.4, t: 0xb0b8d0, l: 'fire-explosion' }), s('ring', 'wind-wave', { z: 3, t: 0xb0b8d0, d: 300 })],
    [s('pop', 'fire-puff', { z: 1.3 })],
  ),
  'Orbital Strike': sig(
    [s('ring', 'wind-rune', { z: 2.6, loop: true, t: 0xb0b8d0, a: 0.5 })],
    [s('pillar', 'fire-pillar', { on: 'foes', z: 3.4, t: 0xffe0c0, d: 300, a: 0.9 }), s('ripple', 'fire-wave', { n: 3, z: 4.4, t: 0xb0b8d0, d: 320 }), s('drop', 'wind-cross', { on: 'foes', z: 2.4, t: 0xb0b8d0, l: 'fire-explosion' })],
    [s('pop', 'fire-explosion', { z: 1.6 })],
  ),
  // ---- the high priestess: a beam of light, and a resurrection
  'Holy Light': sig(
    [s('inward', 'light-gather', { n: 6, r: 24, t: 0xfff2a0 })],
    [s('beam', 'light-orb', { n: 6, r: 150, z: 1.2, f: 60 }), s('pop', 'light-explosion', { z: 1.6, on: 'allies' })],
    [s('pop', 'light-explosion', { z: 1.2 })],
  ),
  Resurrection: sig(
    [s('ring', 'light-rune', { z: 3, loop: true, t: 0xfff2a0, a: 0.5 })],
    [s('spiral', 'light-status', { n: 10, r: 40, z: 1.6, on: 'allies', a: 0.9, f: 90 }), s('pillar', 'light-flame', { on: 'allies', z: 2.4, t: 0xfff2a0 }), s('ripple', 'light-wave', { n: 3, z: 4.6, t: 0xfff2a0 })],
    [s('pop', 'light-status', { z: 1.5, on: 'allies', t: 0xfff2a0 })],
  ),
  // ---- the queen dragoon: breath
  'Dragon Breath': sig(
    [s('inward', 'fire-sparkle', { n: 5, r: 24, t: 0xd890ff })],
    [s('cone', 'fire-puff', { n: 7, r: 170, z: 1.4, t: 0xd890ff, f: 70 }), s('pop', 'fire-explosion', { z: 1.4, t: 0xd890ff, d: 220 })],
    [s('pop', 'fire-flame', { z: 1.2, t: 0xd890ff })],
  ),
  'Inferno Breath': sig(
    [s('dome', 'fire-aura', { z: 2.4, t: 0xd890ff, a: 0.7 })],
    [s('cone', 'fire-explosion', { n: 9, r: 230, z: 2, t: 0xd890ff, f: 70 }), s('cone', 'fire-flame', { n: 9, r: 230, z: 1.4, f: 90, d: 80 }), s('ripple', 'fire-wave', { n: 2, z: 4.4, t: 0xd890ff })],
    [s('pop', 'fire-vortex', { z: 1.2, t: 0xd890ff })],
  ),
  // ---- the juggernaut: the quake
  Earthquake: sig(
    [s('inward', 'earth-puff', { n: 6, r: 30 })],
    [s('ripple', 'earth-wave', { n: 3, z: 3.2 }), s('spray', 'earth-puff', { n: 8, z: 0.9, r: 60 })],
    [s('pop', 'earth-explosion', { z: 1.2 })],
  ),
  Cataclysm: sig(
    [s('ring', 'earth-circle', { z: 3, loop: true, a: 0.6 }), s('pillar', 'earth-pillar', { z: 1.4, a: 0.3, d: 220 })],
    [s('spikes', 'earth-spikes', { n: 6, r: 200, z: 2.2, a: 0.95 }), s('rain', 'earth-orb', { n: 10, z: 1.6, l: 'earth-explosion' }), s('ripple', 'earth-nova', { n: 3, z: 5 })],
    [s('pillar', 'earth-spikes', { z: 1.6 })],
  ),
  // ---- the great sage: stars
  Starfall: sig(
    [s('orbit', 'star-sparkle', { n: 8, r: 20 })],
    [s('rain', 'star-orb', { n: 8, z: 1.6, l: 'star-explosion', t: 0xffe27a }), s('ring', 'light-circle', { on: 'foes', z: 2, t: 0xffe27a, a: 0.6 })],
    [s('pop', 'star-explosion', { z: 1.2 })],
  ),
  'Astral Convergence': sig(
    [s('ring', 'light-rune', { z: 3, loop: true, t: 0xaab8ff, a: 0.5 })],
    [s('inward', 'star-sparkle', { n: 20, r: 100, z: 1.4, t: 0xffe27a }), s('flare', 'star-explosion', { z: 5, a: 0.7, d: 240 }), s('ripple', 'light-nova', { n: 3, z: 4.4, t: 0xaab8ff, d: 240 })],
    [s('pop', 'star-hit', { z: 1.6 })],
  ),
  // ---- the demon swordsman: red cuts, then the demon
  'Hellblade Sweep': sig(
    [s('inward', 'fire-sparkle', { n: 6, r: 26, t: 0xff4a4a })],
    [s('sweep', 'fire-slash', { n: 6, z: 2.2, r: 36, t: 0xff4a4a, f: 45 }), s('ring', 'blood-circle', { z: 3, a: 0.7 })],
    [s('pop', 'fire-hit', { z: 1.3, t: 0xff4a4a })],
  ),
  'Demon Form': sig(
    [s('dome', 'blood-aura', { z: 2.4, t: 0xff4a4a, a: 0.8 })],
    [s('pillar', 'dark-pillar', { z: 3.4, t: 0xff4a4a, a: 0.8 }), s('spray', 'fire-sparkle', { n: 16, t: 0xff4a4a }), s('flare', 'fire-nova', { z: 4, t: 0xff4a4a, a: 0.55 })],
    [s('pop', 'blood-hit', { z: 1.3 })],
  ),
  // ---- the tyrant: judgement
  Judgement: sig(
    [s('inward', 'dark-sparkle', { n: 5, r: 24, t: 0xff4a4a })],
    [s('drop', 'dark-cross', { on: 'foes', z: 2.6, t: 0xff4a4a, l: 'dark-explosion' }), s('ring', 'dark-rune', { on: 'foes', z: 1.8, t: 0xff4a4a, d: 260 })],
    [s('pop', 'dark-hit', { z: 1.4, t: 0xff4a4a })],
  ),
  'Reign of Terror': sig(
    [s('dome', 'dark-shield', { z: 2.8, t: 0xb06aff, a: 0.45 })],
    [s('pillars', 'dark-vortex', { n: 7, r: 76, z: 2.4, t: 0xb06aff, a: 0.85, f: 80 }), s('flare', 'dark-aura', { z: 4.4, a: 0.6 }), s('ripple', 'dark-nova', { n: 3, z: 5, t: 0xb06aff })],
    [s('pop', 'dark-explosion', { z: 1.3, t: 0xb06aff })],
  ),
  // ---- the werewolf: claws, and the moon
  Ravage: sig(
    [s('inward', 'blood-sparkle', { n: 5, r: 22 })],
    [s('slashX', 'wind-slash', { z: 2.6, t: 0xffd0d0, f: 40 }), s('pop', 'blood-puff', { z: 1.2, d: 120 })],
    [s('pop', 'blood-hit', { z: 1.3, f: 40 })],
  ),
  'Full Moon': sig(
    [s('orbit', 'moon-sparkle', { n: 8, r: 24, t: 0xaab8ff })],
    [s('flare', 'moon-explosion', { z: 4.6, t: 0xaab8ff, a: 0.7 }), s('spray', 'moon-sparkle', { n: 12, t: 0xaab8ff }), s('ripple', 'moon-slash', { n: 3, z: 3, t: 0xaab8ff })],
    [s('pop', 'blood-explosion', { z: 1.2 })],
  ),
  // ---- the minotaur: the charge, and a stampede
  'Gore Charge': sig(
    [s('inward', 'earth-puff', { n: 5, r: 22 })],
    [s('beam', 'earth-hit', { n: 6, r: 140, z: 1.3, f: 50, t: 0xffb080 }), s('pop', 'earth-explosion', { z: 1.4, d: 240, t: 0xffb080 })],
    [s('pop', 'earth-explosion', { z: 1, t: 0xffb080 })],
  ),
  Stampede: sig(
    [s('ring', 'earth-circle', { z: 2.8, loop: true, t: 0xffb080, a: 0.5 })],
    [s('cone', 'earth-smoke', { n: 8, r: 220, z: 2.2, t: 0xffb080, f: 80 }), s('spikes', 'earth-spikes', { n: 5, r: 160, z: 1.6, t: 0xffb080 }), s('ripple', 'earth-wave', { n: 2, z: 4.4, t: 0xffb080 })],
    [s('pop', 'earth-smoke', { z: 1.4, t: 0xffb080 })],
  ),
  // ---- the satyr: pipes and revelry
  'Pipes of Pan': sig(
    [s('orbit', 'forest-sparkle', { n: 6, r: 18, t: 0xffd27a })],
    [s('spiral', 'note', { n: 8, r: 26, z: 0.7, on: 'allies' }), s('spiral', 'forest-sparkle', { n: 12, r: 26, z: 1, on: 'allies', t: 0xffd27a }), s('ring', 'forest-nova', { z: 2.6, t: 0xffd27a })],
    [s('pop', 'forest-sparkle', { z: 1.2, on: 'allies', t: 0xffd27a })],
  ),
  Bacchanal: sig(
    [s('dome', 'forest-aura', { z: 2.2, t: 0xffd27a, a: 0.7 })],
    [s('ripple', 'forest-nova', { n: 3, z: 3.6, t: 0xffd27a }), s('rain', 'forest-orb', { n: 12, z: 1, on: 'allies', t: 0xffd27a, l: 'forest-hit' }), s('flare', 'forest-status', { z: 3.2, t: 0xffd27a, a: 0.7 })],
    [s('pop', 'forest-status', { z: 1.2, on: 'allies', t: 0xffd27a })],
  ),
  // ---- the gorgon: a gaze that turns to stone
  'Petrifying Gaze': sig(
    [s('inward', 'poison-sparkle', { n: 5, r: 24, t: 0x9be07a })],
    [s('beam', 'poison-orb', { n: 5, r: 170, z: 1.2, f: 60 }), s('ring', 'poison-rune', { on: 'foes', z: 1.6, d: 240 })],
    [s('pop', 'poison-hit', { z: 1.3 })],
  ),
  'Stone Curse': sig(
    [s('ring', 'poison-circle', { z: 3, loop: true, a: 0.5 })],
    [s('ring', 'poison-rune', { on: 'foes', z: 2.6, a: 0.9, t: 0xb0c0a0 }), s('rain', 'earth-puff', { n: 12, z: 1.2, t: 0xb0b6a6, on: 'foes', l: 'earth-hit' }), s('ripple', 'poison-wave', { n: 2, z: 4.6, t: 0xb0c0a0 })],
    [s('pop', 'earth-puff', { z: 1.4, t: 0xb0b6a6 })],
  ),
  // ---- the samurai commander: banners
  'War Banner': sig(
    [s('inward', 'light-sparkle', { n: 5, r: 24, t: 0xffd24a })],
    [s('barrier', 'banner', { n: 3, r: 34, z: 0.9, on: 'allies' }), s('dome', 'light-aura', { z: 2.4, t: 0xffd24a, a: 0.85, on: 'allies' }), s('ring', 'light-wave', { z: 2.8, t: 0xffd24a })],
    [s('pop', 'light-aura', { z: 1.3, on: 'allies', t: 0xffd24a })],
  ),
  'Rally Cry': sig(
    [s('ring', 'fire-circle', { z: 3, loop: true, t: 0xffd27a, a: 0.5 })],
    [s('ripple', 'fire-nova', { n: 4, z: 3, t: 0xffd27a }), s('dome', 'fire-aura', { z: 2.6, t: 0xffd27a, a: 0.8, on: 'allies' }), s('spray', 'light-sparkle', { n: 14, t: 0xffd27a })],
    [s('pop', 'fire-aura', { z: 1.3, on: 'allies', t: 0xffd27a })],
  ),
  // ---- the foes: bosses and brutes
  'Ground Slam': sig([s('inward', 'earth-puff', { n: 6, r: 30 })], [s('ripple', 'earth-rune', { n: 3, z: 3.4, a: 0.8 }), s('spray', 'earth-orb', { n: 8, r: 70, z: 0.8 })], [s('pop', 'earth-hit', { z: 1.2 })]),
  'Horned Shove': sig([s('inward', 'earth-puff', { n: 4, r: 20 })], [s('beam', 'earth-slash', { n: 4, r: 110, z: 1.4, t: 0xffd0b0 })], [s('pop', 'earth-slash', { z: 1.4, t: 0xffb080 })]),
  'Summon Imps': sig(
    [s('ring', 'fire-rune', { z: 2.6, loop: true, t: 0xff7a4a, a: 0.6 })],
    [s('ring', 'fire-rune', { z: 3.4, t: 0xff7a4a }), s('pillars', 'fire-flame', { n: 5, r: 54, z: 1.8, t: 0xff7a4a })],
    [s('pop', 'fire-hit', { z: 1.2 })],
  ),
  Hellfire: sig(
    [s('dome', 'fire-aura', { z: 2.2, a: 0.7 })],
    [s('rain', 'fire-gather', { n: 9, z: 1.8, l: 'fire-explosion' }), s('ring', 'fire-circle', { z: 3.6 })],
    [s('pop', 'fire-vortex', { z: 1.2 })],
  ),
  'Spirit Ward': sig(
    [s('orbit', 'light-sparkle', { n: 6, r: 18, t: 0xb0e8ff })],
    [s('barrier', 'light-puff', { n: 5, z: 1.3, r: 32, t: 0xb0e8ff, on: 'allies' }), s('ring', 'light-rune', { z: 3, t: 0xb0e8ff })],
    [s('pop', 'light-shield', { z: 1.2, on: 'allies', t: 0xb0e8ff })],
  ),
  'Tusk Flurry': sig([s('orbit', 'blood-sparkle', { n: 5, r: 14 })], [s('barrage', 'blood-orb', { n: 8, z: 1, r: 20, f: 40, t: 0xffe0c0 })], [s('pop', 'blood-slash', { z: 1.2, f: 40, t: 0xffe0c0 })]),
  'Raise Dead': sig(
    [s('ring', 'dark-rune', { z: 2.8, loop: true, t: 0x6ab8ff, a: 0.6 })],
    [s('pillars', 'ice-spikes', { n: 4, r: 50, z: 1.6, t: 0x6ab8ff }), s('spray', 'dark-smoke', { n: 8, z: 1, t: 0x6ab8ff }), s('ring', 'dark-circle', { z: 3.4, t: 0x6ab8ff })],
    [s('pop', 'dark-hit', { z: 1.2, t: 0x6ab8ff })],
  ),
  'Soul Nova': sig(
    [s('dome', 'ice-aura', { z: 2.6, t: 0x6ab8ff, a: 0.7 })],
    [s('flare', 'ice-explosion', { z: 5, t: 0x6ab8ff, a: 0.7 }), s('ripple', 'ice-nova', { n: 3, z: 4.4 }), s('spray', 'ice-sparkle', { n: 14 })],
    [s('pop', 'ice-explosion', { z: 1.3 })],
  ),
  Possession: sig(
    [s('orbit', 'dark-sparkle', { n: 6, r: 16, t: 0xb06aff })],
    [s('spiral', 'dark-status', { n: 8, r: 22, on: 'foes', t: 0xb06aff }), s('ring', 'dark-circle', { z: 2.4, t: 0xb06aff })],
    [s('pop', 'dark-status', { z: 1.3, t: 0xb06aff })],
  ),
  Foxfire: sig(
    [s('orbit', 'fire-sparkle', { n: 6, r: 18, t: 0x9ad0ff })],
    [s('rain', 'fire-status', { n: 8, z: 2, t: 0x9ad0ff, l: 'fire-explosion' }), s('ring', 'fire-circle', { z: 3, t: 0x9ad0ff })],
    [s('pop', 'fire-explosion', { z: 1.2, t: 0x9ad0ff })],
  ),
  'Kanabo Smash': sig(
    [s('inward', 'earth-puff', { n: 6, r: 32, t: 0xff8a6a })],
    [s('ripple', 'earth-nova', { n: 3, z: 3.6, t: 0xff8a6a }), s('spikes', 'earth-spikes', { n: 3, r: 80, z: 1.8, t: 0xff8a6a }), s('flare', 'earth-explosion', { z: 3, d: 100 })],
    [s('pop', 'earth-explosion', { z: 1.2, t: 0xff8a6a })],
  ),
  'Thunder Drum': sig(
    [s('ring', 'lightning-circle', { z: 3, loop: true, a: 0.6 })],
    [s('ripple', 'lightning-circle', { n: 4, z: 3.4, t: 0xffe27a }), s('pillars', 'lightning-strike', { n: 6, r: 66, z: 1.8, t: 0xffe27a }), s('flare', 'lightning-hit', { z: 4, t: 0xffe27a })],
    [s('pop', 'lightning-hit', { z: 1.4 })],
  ),
  'Crushing Slam': sig([s('inward', 'earth-puff', { n: 4, r: 24 })], [s('ripple', 'earth-aura', { n: 2, z: 3.2, a: 0.8 }), s('spray', 'earth-orb', { n: 6, z: 0.8, r: 60 })], [s('pop', 'earth-explosion', { z: 1.1 })]),
  'Shard Burst': sig([s('orbit', 'ice-sparkle', { n: 6, r: 16, t: 0xd8a0ff })], [s('spray', 'ice-spikes', { n: 8, z: 0.9, t: 0xd8a0ff, r: 80 }), s('ring', 'ice-wave', { z: 3, t: 0xd8a0ff })], [s('pop', 'ice-hit', { z: 1.2, t: 0xd8a0ff })]),
  'Shard Storm': sig(
    [s('dome', 'ice-aura', { z: 2.4, t: 0x80b0ff, a: 0.7 })],
    [s('rain', 'ice-strike', { n: 12, z: 1.6, t: 0x80b0ff, l: 'ice-hit' }), s('ripple', 'ice-nova', { n: 3, z: 4, t: 0x80b0ff })],
    [s('pop', 'ice-explosion', { z: 1.2, t: 0x80b0ff })],
  ),
  'Magma Burst': sig([s('inward', 'fire-puff', { n: 5, r: 24 })], [s('spikes', 'fire-spikes', { n: 4, r: 90, z: 1.5 }), s('ring', 'fire-circle', { z: 3 })], [s('pop', 'fire-explosion', { z: 1.2 })]),
  'Forge Hammer': sig([s('inward', 'fire-sparkle', { n: 6, r: 28, t: 0xffc070 })], [s('ripple', 'fire-wave', { n: 3, z: 3.6, t: 0xffc070 }), s('spray', 'fire-sparkle', { n: 10, t: 0xffc070 }), s('flare', 'earth-explosion', { z: 3, t: 0xffc070 })], [s('pop', 'earth-explosion', { z: 1.2, t: 0xffc070 })]),
  'Furnace Blast': sig(
    [s('dome', 'fire-aura', { z: 2.6, a: 0.8 })],
    [s('cone', 'fire-aura', { n: 8, r: 210, z: 2, f: 70 }), s('ripple', 'fire-rune', { n: 3, z: 4.4 }), s('spray', 'fire-sparkle', { n: 16, r: 110, t: 0xffe0a0 })],
    [s('pop', 'fire-vortex', { z: 1.2 })],
  ),
};

/** The look a tier skill's ring takes: its hero skill's lead, played again a little smaller or bigger as its `reach` (px) asks (and a second time, late, at tier 3). */
export function tierRing(skillName: string, reachPx: number, tier3: boolean): Step[] {
  const lead = SIGNATURES[skillName]?.cast[0];
  if (!lead) return [];
  const k = Math.max(0.7, Math.min(1.6, reachPx / 120));
  const one: Step = { ...lead, z: (lead.z ?? 1) * k, a: Math.min(0.75, lead.a ?? 0.75), d: 0, loop: false };
  return tier3 ? [one, { ...one, d: 170, z: (one.z ?? 1) * 0.8 }] : [one];
}

/** Who a skill's lead is, as a strip name plus the tint (for the tests and the contact sheet). */
export const leadOf = (name: string): Step | undefined => SIGNATURES[name]?.cast[0];

/** The strips a step may name that are not in the atlas: the arrow sprite and two Vfx strips (`vfxArt.ts`). */
export const SPECIAL_STRIPS: readonly string[] = ['arrow', 'pinkHeart', 'dustGold'];

/** The props, in the order of `src/art/fx/props.png` (generated with PixelLab, `tools/fxlab/genprops.py`). */
export const PROPS: readonly string[] = ['feather', 'coin', 'note', 'bandage', 'fist', 'skull', 'anchor', 'cannonball', 'leaf', 'paw', 'scythe', 'banner'];
