// The big moments' effects, built from the Pixel Effects atlas (`PACK`) through `Particles`: a combo's five gathering and its move landing,
// a tier skill's ring, and a hero's promotion (a column of light, a ring and rising sparks). Pooled, capped and thinned by the battery
// saver like every other effect; nothing here loops, strobes or changes the battle. `fx.ts` calls these as the sim's events arrive.

import type { Particles } from './particles';
import { PACK } from './fxSheets';
import { play } from './combatFx';
import { bits, GLOW, packKey, type Element } from './fxRules';
import type { ComboTone } from '../sim/combos';

const jit = (n: number) => (Math.random() * 2 - 1) * n;

/** The three elements a combo's look is made of, from its tone: the main one (its colour), the second and the third. */
export const TONE_ELEMENTS: Readonly<Record<ComboTone, readonly [Element, Element, Element]>> = {
  holy: ['light', 'light', 'wind'],
  arcane: ['lightning', 'fire', 'light'],
  shadow: ['dark', 'wind', 'blood'],
  sea: ['ice', 'wind', 'lightning'],
  wild: ['forest', 'earth', 'wind'],
  spirit: ['poison', 'dark', 'ice'],
  earth: ['earth', 'fire', 'wind'],
  dark: ['dark', 'blood', 'poison'],
};
/** The colour of a combo's glow (its banner and its bar). */
export const toneColour = (tone: ComboTone): number => GLOW[TONE_ELEMENTS[tone][0]];

/** A fighter's place on the screen, for the effects to aim at (world pixels, the feet; `tall` is how tall it is drawn). */
export interface Spot {
  x: number;
  y: number;
  tall: number;
}

/** The five gather: a rune circle under each and a thread of motes running round the ring between them, for `ms`. */
export function comboGather(p: Particles, tone: ComboTone, spots: readonly Spot[], ms: number): void {
  const [a, b, c] = TONE_ELEMENTS[tone];
  const cx = spots.reduce((n, s) => n + s.x, 0) / spots.length;
  const cy = spots.reduce((n, s) => n + s.y, 0) / spots.length;
  const ring = [...spots].sort((s, t) => Math.atan2(s.y - cy, s.x - cx) - Math.atan2(t.y - cy, t.x - cx));
  for (const s of ring) {
    play(p, packKey(a, 'circle'), s.x, s.y - 2, { scale: 2, loop: true, life: ms + 250, frameMs: 90, alpha: 0.65 });
    play(p, packKey(b, 'gather'), s.x, s.y - s.tall * 0.5, { scale: 1.6, loop: true, life: ms, frameMs: 90, alpha: 0.7 });
  }
  // (the threads: motes between neighbours, the later ones starting later, so a pulse runs round the ring)
  const motes = PACK[packKey(c, 'sparkle')];
  if (!motes?.length) return;
  ring.forEach((s, i) => {
    const t = ring[(i + 1) % ring.length];
    for (let k = 0; k < bits(6, p.density); k++) {
      const f = k / 6;
      p.spawn({ frames: motes, x: s.x + (t.x - s.x) * f, y: s.y - s.tall * 0.4 + (t.y - s.y) * f, scale: 0.7, life: 700, delay: (ms * (i * 6 + k)) / (ring.length * 6), vy: -0.04, alpha: 0.9, add: true });
    }
  });
  // (and a column of the main element's light rising from each, as they finish)
  for (const s of ring) play(p, packKey(a, 'pillar'), s.x, s.y - s.tall * 0.6, { scale: 2.4, frameMs: 90, delay: Math.max(0, ms - 560), alpha: 0.7 });
}

/** The move lands: a nova and two rings from the middle of the five, a column and a strike on every foe (at most `MAX_FOES` of them: the rest are left to the hits' own sparks). */
const MAX_FOES = 10;
export function comboStrike(p: Particles, tone: ComboTone, centre: { x: number; y: number }, foes: readonly Spot[]): void {
  const [a, b, c] = TONE_ELEMENTS[tone];
  play(p, packKey(a, 'nova'), centre.x, centre.y - 20, { scale: 6, frameMs: 80, alpha: 0.7 });
  play(p, packKey(b, 'wave'), centre.x, centre.y, { scale: 8, frameMs: 90, add: false, alpha: 0.7 });
  play(p, packKey(c, 'wave'), centre.x, centre.y, { scale: 5, frameMs: 80, delay: 120, alpha: 0.6 });
  foes.slice(0, MAX_FOES).forEach((f, i) => {
    play(p, packKey(a, 'strike'), f.x, f.y - f.tall * 0.4, { scale: 1.8, frameMs: 50, delay: i * 45 });
    play(p, packKey(b, 'explosion'), f.x, f.y - f.tall * 0.4, { scale: 1.5, frameMs: 55, delay: 60 + i * 45 });
    if (p.rate(0.6)) play(p, packKey(c, 'pillar'), f.x, f.y - f.tall * 0.5, { scale: 1.8, frameMs: 70, delay: 100 + i * 45, alpha: 0.7 });
  });
  const sparks = PACK[packKey(a, 'sparkle')];
  if (sparks?.length) for (let i = 0; i < bits(14, p.density); i++) p.spawn({ frames: sparks, x: centre.x + jit(70), y: centre.y - 10 + jit(30), scale: 0.8, life: 900, vx: jit(0.09), vy: -0.05 - Math.random() * 0.08, add: true });
}

/** A tier skill's ring: a wave of the caster's element out from its feet, `reach` tiles wide (a tile is 64 px wide). */
export function ringOut(p: Particles, el: Element, x: number, y: number, reach: number): void {
  const k = Math.max(1.5, Math.min(7, (reach * 64) / 32));
  play(p, packKey(el, 'wave'), x, y, { scale: k, frameMs: 70, alpha: 0.7 });
  play(p, packKey(el, 'nova'), x, y - 12, { scale: Math.max(1.4, k * 0.5), frameMs: 60, alpha: 0.6 });
}

/** A hero is promoted: tier 2 rises in a ring of light; tier 3 in a tall column, a nova, a wave and a shower of sparks. */
export function promoteBurst(p: Particles, grade: number, x: number, y: number, tall: number): void {
  play(p, 'light-circle', x, y - 2, { scale: grade > 2 ? 3 : 2, frameMs: 80, alpha: 0.8 });
  play(p, 'light-nova', x, y - tall * 0.5, { scale: grade > 2 ? 4 : 2.4, frameMs: 70, alpha: 0.75 });
  const sparks = PACK['light-sparkle'];
  const n = grade > 2 ? 16 : 8;
  if (sparks?.length) for (let i = 0; i < bits(n, p.density); i++) p.spawn({ frames: sparks, x: x + jit(16), y: y - tall * 0.3 + jit(8), scale: 0.8, life: 1000, delay: i * 30, vx: jit(0.03), vy: -0.06 - Math.random() * 0.06, add: true, tint: grade > 2 ? 0xffe27a : 0xdce8ff });
  if (grade < 3) return;
  // (tier 3: the column of light, twice as tall as the hero is drawn, and a wave and a warm aura behind it)
  play(p, 'light-pillar', x, y - tall * 1.1, { scale: 5, frameMs: 90, alpha: 0.85, tint: 0xffe9a0 });
  play(p, 'light-pillar', x, y - tall * 1.1, { scale: 3.4, frameMs: 90, delay: 160, alpha: 0.7 });
  play(p, 'light-wave', x, y, { scale: 6.5, frameMs: 80, alpha: 0.7, delay: 120 });
  play(p, 'fire-aura', x, y - tall * 0.4, { scale: 2.6, frameMs: 90, alpha: 0.5, tint: 0xffd24a, delay: 200 });
}
