// STATUS-FX: how each of the eleven ailments shows on a fighter (docs/notes/status-fx.md). Each ailment is a few named
// parts (`<ailment>.<part>`), placed round the body like the awakened auras' parts (`auraStyles.ts`): a ring or pool on
// the ground, a layer behind the body, one in front, a halo over the head, motes round it, a burst (the shatter), and
// the chip's icon over the head. A part's frames come only from the atlas (`statusArt.ts`: src/art/fx/status/atlas.png
// and atlas.json): the pack's strips today (tools/status-fx/status-sheets.py), painted sheets later
// (tools/status-fx/import-status-art.py, docs/notes/status-fx-art-brief.md), with no code change.
// Pure data: no Pixi, no DOM.

/** The eleven ailments the owner asked for. */
export type AilmentKey = 'burn' | 'poison' | 'freeze' | 'bleed' | 'chill' | 'shock' | 'stun' | 'weak' | 'curse' | 'silence' | 'fear';

export const AILMENTS: readonly AilmentKey[] = ['burn', 'poison', 'freeze', 'bleed', 'chill', 'shock', 'stun', 'weak', 'curse', 'silence', 'fear'];

/** Where a part sits: flat under the feet, behind the body, in front of it, over the head, dotted round it, a one-off
 *  burst (the shatter), or the chip's icon. */
export type StatusPlace = 'ground' | 'back' | 'front' | 'halo' | 'motes' | 'burst' | 'icon';

export interface StatusPart {
  place: StatusPlace;
  /** Size relative to the fighter's height (the icon: px across inside its chip). */
  size: number;
  /** Where its centre sits up the body: 0 at the feet, 1 at the head. */
  at: number;
  alpha: number;
  frameMs: number;
  /** Motes: how many, each on its own beat round the body. */
  n?: number;
  /** A colour the part is tinted (only where the placeholder strip is the wrong colour). */
  tint?: number;
  /** Left out on battery saver. */
  saver?: boolean;
}

export interface StatusStyle {
  name: string;
  /** The fighter's own tint while it holds (absent: none). */
  tint?: number;
  /** The chip's rim. */
  rim: number;
  /** The colour of the damage numbers it deals (only the ailments that deal damage). */
  number?: number;
  parts: Partial<Record<StatusPlace, StatusPart>>;
}

const icon = (frameMs = 120, tint?: number): StatusPart => ({ place: 'icon', size: 11, at: 0, alpha: 1, frameMs, tint });

export const STATUS_STYLES: Record<AilmentKey, StatusStyle> = {
  burn: { name: 'Burning', tint: 0xffc890, rim: 0xff8a2a, number: 0xff9a3c, parts: {
    front: { place: 'front', size: 0.7, at: 0.3, alpha: 0.95, frameMs: 100 },
    motes: { place: 'motes', size: 0.45, at: 0.75, alpha: 0.9, frameMs: 110, n: 2, saver: true },
    icon: icon(),
  } },
  poison: { name: 'Poisoned', tint: 0xcdf2a8, rim: 0x6fd24a, number: 0x8fe05a, parts: {
    back: { place: 'back', size: 1.0, at: 0.35, alpha: 0.8, frameMs: 120 },
    motes: { place: 'motes', size: 0.55, at: 0.65, alpha: 0.95, frameMs: 120, n: 2 },
    icon: icon(),
  } },
  freeze: { name: 'Frozen', tint: 0x9fdcff, rim: 0x7fd4ff, number: 0x9fe6ff, parts: {
    ground: { place: 'ground', size: 1.15, at: 0, alpha: 0.85, frameMs: 130 },
    back: { place: 'back', size: 1.1, at: 0.5, alpha: 0.5, frameMs: 130, saver: true },
    front: { place: 'front', size: 0.95, at: 0.18, alpha: 0.95, frameMs: 130 },
    burst: { place: 'burst', size: 1.1, at: 0.5, alpha: 0.8, frameMs: 70 },
    icon: icon(),
  } },
  bleed: { name: 'Bleeding', tint: 0xffb0b0, rim: 0xe0403a, number: 0xff5a4e, parts: {
    ground: { place: 'ground', size: 0.85, at: 0, alpha: 0.9, frameMs: 130 },
    motes: { place: 'motes', size: 0.6, at: 0.55, alpha: 1, frameMs: 120, n: 2 },
    icon: icon(),
  } },
  chill: { name: 'Chilled', tint: 0xc8ecff, rim: 0x9fd0ff, parts: {
    ground: { place: 'ground', size: 1.05, at: 0, alpha: 0.75, frameMs: 130 },
    motes: { place: 'motes', size: 0.45, at: 0.7, alpha: 0.9, frameMs: 120, n: 2, saver: true },
    icon: icon(),
  } },
  shock: { name: 'Shocked', rim: 0x77cfff, number: 0xfff27a, parts: {
    back: { place: 'back', size: 1.0, at: 0.4, alpha: 0.75, frameMs: 90, saver: true },
    front: { place: 'front', size: 0.65, at: 0.55, alpha: 0.95, frameMs: 80 },
    icon: icon(90),
  } },
  stun: { name: 'Stunned', rim: 0xffe27a, parts: {
    halo: { place: 'halo', size: 0.45, at: 0.93, alpha: 1, frameMs: 110 },
    icon: icon(),
  } },
  weak: { name: 'Weakened', tint: 0xc0b4b4, rim: 0xb07a6a, parts: {
    ground: { place: 'ground', size: 1.0, at: 0, alpha: 0.6, frameMs: 130, saver: true },
    front: { place: 'front', size: 0.75, at: 0.6, alpha: 0.9, frameMs: 120 },
    icon: icon(),
  } },
  curse: { name: 'Cursed', tint: 0xd8b8ff, rim: 0xbb70ff, number: 0xc07aff, parts: {
    ground: { place: 'ground', size: 1.05, at: 0, alpha: 0.85, frameMs: 130 },
    motes: { place: 'motes', size: 0.4, at: 0.6, alpha: 0.7, frameMs: 130, n: 2, saver: true },
    icon: icon(130, 0xc79aff),
  } },
  silence: { name: 'Silenced', rim: 0xcdd5ff, parts: {
    ground: { place: 'ground', size: 0.95, at: 0, alpha: 0.6, frameMs: 130, saver: true },
    halo: { place: 'halo', size: 0.4, at: 0.95, alpha: 1, frameMs: 140 },
    icon: icon(140),
  } },
  fear: { name: 'Feared', tint: 0xd8cce6, rim: 0x8a7aa0, parts: {
    back: { place: 'back', size: 0.95, at: 0.4, alpha: 0.5, frameMs: 130, saver: true },
    halo: { place: 'halo', size: 0.38, at: 0.95, alpha: 1, frameMs: 110 },
    motes: { place: 'motes', size: 0.45, at: 0.85, alpha: 0.95, frameMs: 120, n: 1 },
    icon: icon(110),
  } },
};

/** Every part key the atlas must hold (`<ailment>.<place>`), in the importer's order. */
export const STATUS_KEYS: readonly string[] = AILMENTS.flatMap((a) => Object.keys(STATUS_STYLES[a].parts).map((p) => `${a}.${p}`));
export const statusKey = (a: AilmentKey, place: StatusPlace) => `${a}.${place}`;

/** The colour an "Immune" word takes over a fighter that shrugs an ailment off. */
export const IMMUNE_COLOUR = 0xdde4ea;
/** The colour of a shattered freeze's number. */
export const SHATTER_COLOUR = 0xbff0ff;
/** The most ailments whose body parts are drawn on one fighter at once (the battery saver draws one); the chips show up to four. */
export const maxBodyFx = (saver: boolean) => (saver ? 1 : 2);
export const MAX_CHIPS = 4;
