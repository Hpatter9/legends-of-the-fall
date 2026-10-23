// Duchess the goat's behaviour: pure rules (no Pixi, no DOM, no clock of its own) so the camp, the tavern and the fight can
// each give her a patch of ground and let her get on with it. She grazes (chewing), now and then ambles to a new spot, now and
// then goes and nibbles at a hero, and when tapped she hops once with her "Mehh.". Her sheet (`art/duchess/goat.png`, the
// same one Chronos uses) is 48-pixel frames: three steps walking left, then three walking right; frame 1 (or 4) is standing.
// Everything is a one-shot or a slow amble: nothing blinks or flashes.

export type GoatMode = 'graze' | 'walk' | 'nibble' | 'hop';

export interface Goat {
  /** Her centre along the ground, in scene pixels. */
  x: number;
  face: 1 | -1;
  mode: GoatMode;
  /** When (ms) she next changes what she is doing, or, in a hop, when it began. */
  at: number;
  /** Where she is walking to. */
  to: number;
  /** What she is doing once she gets there (a walk to a hero ends in a nibble). */
  then: 'graze' | 'nibble';
  /** The walk's step count, for her legs. */
  steps: number;
}

export interface Ground {
  /** The ends of her patch. */
  min: number;
  max: number;
  /** Where the heroes stand along it: she may go and nibble at one. */
  friends: readonly number[];
}

/** Pixels she walks in a second: an amble. */
export const GOAT_SPEED = 16;
/** How long a hop lasts (ms), and how high it goes (scene pixels). */
export const HOP_MS = 450;
export const HOP_PX = 9;
/** A nibble lasts this long (ms). */
export const NIBBLE_MS = 2200;
/** The sheet's frame size. */
export const FRAME = 48;

export function newGoat(x: number, now = 0): Goat {
  return { x, face: 1, mode: 'graze', at: now + 1500, to: x, then: 'graze', steps: 0 };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Move her on by `dt` ms to time `now`. `rand` gives numbers in [0, 1). A hop ends by itself and she goes back to grazing. */
export function stepGoat(g: Goat, dt: number, now: number, ground: Ground, rand: () => number, still = false): void {
  g.x = clamp(g.x, ground.min, ground.max);
  if (g.mode === 'hop') {
    if (now - g.at >= HOP_MS) {
      g.mode = 'graze';
      g.at = now + 1200 + rand() * 2200;
    }
    return;
  }
  if (still) return;
  if (g.mode === 'walk') {
    const move = GOAT_SPEED * (dt / 1000);
    const dx = g.to - g.x;
    g.steps += move;
    if (Math.abs(dx) <= move) {
      g.x = g.to;
      g.mode = g.then;
      g.at = now + (g.then === 'nibble' ? NIBBLE_MS : 2500 + rand() * 4500);
    } else g.x += Math.sign(dx) * move;
    return;
  }
  if (now < g.at) return;
  if (g.mode === 'nibble') {
    g.mode = 'graze';
    g.at = now + 3000 + rand() * 4000;
    return;
  }
  // (grazing is over: turn about, amble to a new spot, or go and nibble at a hero)
  const roll = rand();
  if (roll < 0.2) {
    g.face = g.face === 1 ? -1 : 1;
    g.at = now + 1500 + rand() * 2500;
  } else if (roll < 0.45 && ground.friends.length) {
    const hero = ground.friends[Math.floor(rand() * ground.friends.length)];
    // (she stands at the hero's feet, on whichever side she is on, and faces them)
    const side = g.x < hero ? -1 : 1;
    g.to = clamp(hero + side * 14, ground.min, ground.max);
    g.then = 'nibble';
    g.mode = 'walk';
    g.face = g.to > g.x ? 1 : -1;
    if (Math.abs(g.to - g.x) < 1) g.mode = 'nibble';
  } else {
    g.to = ground.min + rand() * (ground.max - ground.min);
    g.then = 'graze';
    g.mode = 'walk';
    g.face = g.to > g.x ? 1 : -1;
  }
  if (g.mode === 'nibble') {
    g.face = nearest(g.x, ground.friends) > g.x ? 1 : -1;
    g.at = now + NIBBLE_MS;
  }
}

/** The x of the closest of `xs` to `x` (x itself when there are none). */
export function nearest(x: number, xs: readonly number[]): number {
  let best = x;
  let d = Infinity;
  for (const v of xs) if (Math.abs(v - x) < d) (d = Math.abs(v - x)), (best = v);
  return best;
}

/** A tap: she hops once. A tap while she is still hopping is ignored, so a hammering finger gets one "Mehh." per hop. Returns false (and does nothing) if she is already mid-hop. */
export function tapGoat(g: Goat, now: number): boolean {
  if (g.mode === 'hop') return false;
  g.mode = 'hop';
  g.at = now;
  return true;
}

/** How far up (scene pixels) she is in her hop at `now`: a single arc, zero otherwise. */
export function hopLift(g: Goat, now: number): number {
  if (g.mode !== 'hop') return 0;
  const t = (now - g.at) / HOP_MS;
  if (t >= 1) return 0;
  if (t <= 0) return 0;
  return Math.sin(t * Math.PI) * HOP_PX;
}

/** Her sheet frame (0 to 5) at `now`. */
export function goatFrame(g: Goat): number {
  const walking = g.mode === 'walk';
  const step = walking ? [0, 1, 2, 1][Math.floor(g.steps / 4) % 4] : 1;
  return (g.face === 1 ? 3 : 0) + step;
}

/** A one-pixel chew bob while she grazes or nibbles (on a slow beat); none under reduced motion. */
export function chewBob(g: Goat, now: number, reduced: boolean): number {
  if (reduced || (g.mode !== 'graze' && g.mode !== 'nibble')) return 0;
  return Math.floor(now / 420) % 2;
}
