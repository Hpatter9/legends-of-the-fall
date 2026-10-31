// The Rift Sanctuary's motion as plain numbers (no page, no Pixi): where each rift stands on the turning ring, how far the
// room slides behind it, where a point of the painting lands on the screen, and the timings of the walk into a rift and of
// the walk back out after a crossing. `sanctuaryView.ts` draws it; `test/calamity-hub.test.ts` checks it.

/** Radians between two neighbouring rifts on the ring: three share the whole ring (one in the middle, one each side, and the
 *  one turning past goes round the back); fewer stand closer, and do not go round. */
export const ringStep = (n: number): number => (n >= 3 ? (2 * Math.PI) / n : 1.1);
/** How far the room slides (a share of the scene's width) as the ring turns from its home. */
export const ROOM_PAN = 0.06;
/** How much each layer moves with the room: the far mist least, the motes in front most. */
export const PARALLAX = { mist: 0.45, room: 1, motes: 1.35 } as const;

/** The painting's size, and the points on it the room is laid out by (in its own pixels). */
export const PAINTING = { w: 941, h: 1672, oy: 0.64 } as const;
export const SPOTS = {
  /** The swirl in the great gate (its centre, and its size). */
  gate: { x: 471, y: 560, w: 300, h: 620 },
  /** The foot of the middle rift, on the stairs below the gate; the side rifts stand a little further back. */
  riftFoot: 985,
  riftBack: 70,
  /** Where the party stands, on the near side of the round floor. */
  party: 1330,
  /** The purple crystals on the left and the green gems on the gate's pillars (the room's flickering lights). */
  lights: [
    { x: 92, y: 985, hue: 'violet' },
    { x: 160, y: 965, hue: 'violet' },
    { x: 226, y: 958, hue: 'violet' },
    { x: 240, y: 600, hue: 'green' },
    { x: 700, y: 600, hue: 'green' },
    { x: 60, y: 1360, hue: 'green' },
    { x: 880, y: 1360, hue: 'green' },
  ],
} as const;

/** Where a point of a picture drawn `object-fit: cover` (at `ox`, `oy` of its overflow) lands in a box `w` x `h`. */
export function coverPoint(w: number, h: number, px: number, py: number, iw: number = PAINTING.w, ih: number = PAINTING.h, ox = 0.5, oy: number = PAINTING.oy): { x: number; y: number; k: number } {
  const k = Math.max(w / iw, h / ih);
  return { x: (w - iw * k) * ox + px * k, y: (h - ih * k) * oy + py * k, k };
}

export interface RiftSpot {
  /** Across the scene (0 to 1) and how far up the painting it stands (the painting's pixels, for `coverPoint`). */
  x: number;
  y: number;
  scale: number;
  /** Nearer rifts draw over further ones. */
  z: number;
}
/** A rift `turn` steps round a ring of `n` from the front (0 is the middle, in front of the great gate; plus is to the right).
 *  The ring is seen from the front: the middle rift is the nearest and biggest, the others stand further back. */
export function riftSpot(turn: number, n = 3): RiftSpot {
  const a = turn * ringStep(n), back = (1 - Math.cos(a)) / 2;
  return { x: 0.5 + 0.34 * Math.sin(a), y: SPOTS.riftFoot - SPOTS.riftBack * back, scale: 1 - 0.5 * back, z: Math.round(100 - 90 * back) };
}

/** The ring's turn that brings rift `to` to the middle the shortest way round from `from` (three or more go round). */
export function nearestTurn(from: number, to: number, n: number): number {
  if (n < 3) return to;
  return to + n * Math.round((from - to) / n);
}

/** The room's slide (a share of the scene's width) when the ring stands at `turn`: turning right slides it left. */
export const roomPan = (turn: number, n: number): number => (n < 2 ? 0 : -Math.sin((turn - (n - 1) / 2) * ringStep(n)) * ROOM_PAN);

/** The rift in the middle when the room opens: the middle one. */
export const homeIndex = (n: number): number => Math.max(0, Math.floor((n - 1) / 2));

/** The rift the party walked into, kept between the room's visits (the page's memory only: a reload just opens the room). */
export interface Entered {
  seed: number;
  /** Its place on the ring (the offer's index), and the world beyond it. */
  index: number;
  world: string;
  /** How many crossings the run had made when the party went in. */
  made: number;
}
/** The room is opened on the party's return from a crossing: the same run, one crossing more than when they went in. */
export const isReturn = (e: Entered | null | undefined, seed: number, made: number): boolean => !!e && e.seed === seed && made > e.made;
/** The rift the party walks back out of: the place on the ring they went in by, while the new crossing has that many rifts. */
export const exitIndex = (e: Entered | null | undefined, n: number): number => (e ? Math.max(0, Math.min(n - 1, e.index)) : homeIndex(n));

export const easeInOut = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOut = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);
export const easeIn = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * t);
const part = (ms: number, from: number, len: number): number => (len <= 0 ? (ms >= from ? 1 : 0) : Math.max(0, Math.min(1, (ms - from) / len)));

/* ------------------------------------------------------------------ into a rift */

/** The walk into a rift, in ms: the ring turns it to the middle (only if it is not there), the party walks up and in, the
 *  rift flares into a bright bloom that fills the screen, and the battle fades in under it. */
export const WALK_IN = { pan: 520, walk: 950, flare: 640, fade: 650 } as const;
/** Reduced motion: a short cross-fade through the rift's colour. */
export const WALK_IN_CALM = { pan: 0, walk: 0, flare: 220, fade: 300 } as const;
export interface WalkInPlan {
  pan: number;
  walk: number;
  flare: number;
  fade: number;
  /** When the screen is fully the flash (the battle is started then), and when it has faded off the battle. */
  peak: number;
  total: number;
}
export function walkInPlan(centred: boolean, reduced: boolean): WalkInPlan {
  const p = reduced ? WALK_IN_CALM : WALK_IN;
  const pan = centred ? 0 : p.pan;
  const peak = pan + p.walk + p.flare;
  return { pan, walk: p.walk, flare: p.flare, fade: p.fade, peak, total: peak + p.fade };
}
export interface WalkInFrame {
  /** Each part's progress (0 to 1), eased. */
  pan: number;
  walk: number;
  flare: number;
  /** The camera's zoom into the rift, and how much of the screen the flash covers (0 to 1). */
  zoom: number;
  flash: number;
}
/** The walk-in at `ms` after it starts (up to the peak; the fade belongs to the overlay left over the battle). */
export function walkInFrame(p: WalkInPlan, ms: number): WalkInFrame {
  const pan = easeInOut(part(ms, 0, p.pan));
  const walk = easeInOut(part(ms, p.pan, p.walk));
  const f = part(ms, p.pan + p.walk, p.flare);
  // (the flash rises in the second half of the flare, eased in: a deliberate bloom, never a blink)
  return { pan, walk, flare: easeOut(f), zoom: 1 + 2.4 * easeIn(f), flash: easeInOut(part(f, 0.35, 0.65)) };
}
/** The flash left over the battle, fading off it (1 at the peak, 0 at the end). */
export const fadeAt = (p: WalkInPlan, ms: number): number => 1 - easeInOut(part(ms, p.peak, p.fade));

/* ------------------------------------------------------------------ back out of a rift */

/** The return after a crossing: the party steps out of the rift and walks down to the middle of the room while the camera
 *  slowly closes in on them; they turn back to face the rifts; the camera eases back. The cards rise one by one meanwhile. */
export const WALK_OUT = { walk: 1600, turn: 320, zoom: 0.12, settle: 900, cardsFrom: 420, stagger: 240, rise: 520 } as const;
/** Reduced motion: the room and the cards are there at once, with a short fade. */
export const WALK_OUT_CALM = 260;
export interface CardRise {
  delay: number;
  ms: number;
}
/** When card `i` (left to right) starts to rise, and how long it takes. */
export const cardRise = (i: number, reduced: boolean): CardRise =>
  reduced ? { delay: 0, ms: WALK_OUT_CALM } : { delay: WALK_OUT.cardsFrom + i * WALK_OUT.stagger, ms: WALK_OUT.rise };
/** When the walk-out is over and everything is settled, for `n` cards. */
export function walkOutTotal(n: number, reduced: boolean): number {
  if (reduced) return WALK_OUT_CALM;
  const last = cardRise(Math.max(0, n - 1), false);
  return Math.max(WALK_OUT.walk + WALK_OUT.turn + WALK_OUT.settle, last.delay + last.ms);
}
export interface WalkOutFrame {
  /** How far down from the rift the party has come (0 to 1), and how visible it is (stepping out of the light). */
  walk: number;
  shown: number;
  /** Still walking (the walk frames); turned round to face the rifts. */
  walking: boolean;
  turned: boolean;
  /** The camera's zoom on the party. */
  zoom: number;
}
export function walkOutFrame(ms: number): WalkOutFrame {
  const w = part(ms, 0, WALK_OUT.walk);
  const turnAt = WALK_OUT.walk + WALK_OUT.turn * 0.5;
  const into = easeInOut(part(ms, 0, WALK_OUT.walk));
  const back = easeInOut(part(ms, WALK_OUT.walk + WALK_OUT.turn, WALK_OUT.settle));
  return { walk: easeOut(w), shown: Math.min(1, w / 0.18), walking: w < 1, turned: ms >= turnAt, zoom: 1 + WALK_OUT.zoom * into * (1 - back) };
}
