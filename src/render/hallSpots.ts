// The summoning hall's floor plan and the timing of a pull, as plain data and pure functions (no Pixi, no DOM), so a test can
// check them. All numbers are in the room's own pixels. The hall is as wide as a phone at scale 2 (192 pixels, 384 css) and as
// tall as the page lets it be; the wall is a fixed picture and the floor takes whatever is left.

export const ROOM_W = 192;
/** Where the back wall ends and the floor begins. */
export const WALL_H = 112;
/** The shortest room the layout works in (a 360x780 phone's page is about 310 pixels tall at scale 2). */
export const MIN_H = 280;

export interface HallLayout {
  h: number;
  /** The centre of the summoning circle. */
  circle: { x: number; y: number };
  /** Feet lines. */
  pillars: { x: number; y: number }[];
  braziers: { x: number; y: number }[];
  summoner: { x: number; y: number };
}

/** Where everything stands in a room `h` pixels tall. The circle sits in the upper middle of the floor, clear of the buttons at the bottom. */
export function hallLayout(h: number): HallLayout {
  const room = Math.max(MIN_H, Math.round(h));
  const cy = WALL_H + Math.round((room - WALL_H) * 0.4);
  return {
    h: room,
    circle: { x: ROOM_W / 2, y: cy },
    pillars: [
      { x: 12, y: WALL_H + 26 },
      { x: ROOM_W - 12, y: WALL_H + 26 },
    ],
    braziers: [
      { x: 56, y: WALL_H + 30 },
      { x: ROOM_W - 56, y: WALL_H + 30 },
    ],
    summoner: { x: 28, y: cy + 14 },
  };
}

/** Where the heroes of a pull stand on the circle: one row up to five, two rows above that (the back row first). */
export function fanSpots(count: number, cx: number, cy: number): { x: number; y: number }[] {
  const step = 30;
  const rows = count > 5 ? 2 : 1;
  const out: { x: number; y: number }[] = [];
  const back = rows === 2 ? Math.ceil(count / 2) : count;
  const row = (n: number, y: number) => {
    for (let i = 0; i < n; i++) out.push({ x: Math.round(cx + (i - (n - 1) / 2) * step), y });
  };
  if (rows === 1) row(count, cy + 8);
  else {
    row(back, cy + 1);
    row(count - back, cy + 15);
  }
  return out;
}

export type BeamKind = 'star' | 'crystal' | 'light' | 'fire';

/** The beam's colour by the best rarity pulled: blue for Common and Rare, violet Epic, gold Legendary, crimson Mythic. */
export const beamKind = (best: number): BeamKind => (best >= 5 ? 'fire' : best === 4 ? 'light' : best === 3 ? 'crystal' : 'star');

export interface Timeline {
  /** The circle charges until `charge`, flares until `flare`, then the beam stands until `beamEnd`. */
  charge: number;
  flare: number;
  beam: number;
  /** When each hero starts to appear (ms from the start) and how long the rise takes. */
  heroAt: number[];
  rise: number;
  /** When the hall hands over to the reveal. */
  done: number;
}

/** The timing of a pull of `count` heroes. A Mythic holds the charge a beat longer. Reduced motion is a short flash and the heroes at once. */
export function pullTimeline(count: number, best = 1, reduced = false): Timeline {
  if (reduced) return { charge: 120, flare: 260, beam: 260, heroAt: Array.from({ length: count }, () => 260), rise: 1, done: 900 };
  const charge = best >= 5 ? 1100 : 700;
  const flare = charge + 200;
  const beam = flare + 600;
  const gap = count > 5 ? 110 : 160;
  const heroAt = Array.from({ length: count }, (_, i) => flare + 100 + i * gap);
  const rise = 380;
  const last = heroAt[heroAt.length - 1] ?? flare;
  return { charge, flare, beam, heroAt, rise, done: last + rise + 700 };
}
