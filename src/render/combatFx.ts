// The combat effects built from pooled particles: an element's impact, a fighter's death, a caster's wind-up and a boss's
// entrance. Each layers painted materials (`fxSheets.ts`) and flying bits, thrown through
// `Particles` (so they are pooled, capped, and thinned by the battery saver's density). Nothing here reads or changes the
// battle; `fx.ts` calls these as the sim's events arrive.

import type { Texture } from 'pixi.js';
import type { Burst, Particles } from './particles';
import { PACK } from './fxSheets';
import { VFX } from './vfxArt';
import { bits, GLOW, packKey, ULT_TINT, type DeathKind, type Element, type Family, type PackKey } from './fxRules';

const jit = (n: number) => (Math.random() * 2 - 1) * n;

/** The bone sprite (the Skeleton Archer's own arrow), given by `fx.ts` once loaded. */
let boneTex: Texture | undefined;
export const setBoneArt = (t: Texture) => void (boneTex = t);

/** One run of a strip, played where it is asked (additive, so it glows; the cap lets these through before the small bits). */
export function play(p: Particles, key: PackKey, x: number, y: number, o: Partial<Burst> = {}): void {
  const frames = PACK[key];
  if (!frames?.length) return;
  p.spawn({ frames, x, y, scale: 1, frameMs: 60, add: true, prio: true, ...o });
}

const fam = (el: Element, f: Family) => packKey(el, f);

/** A few bits thrown out of a point (`n` is scaled by the density). */
function chips(p: Particles, frames: Texture[] | undefined, n: number, x: number, y: number, o: Partial<Burst>): void {
  if (!frames?.length) return;
  for (let i = 0; i < bits(n, p.density); i++)
    p.spawn({ frames, x: x + jit(6), y: y + jit(4), scale: 0.5, life: 650, vx: jit(0.08), vy: -0.05 - Math.random() * 0.1, gravity: 0.0005, spin: jit(0.012), ...o });
}

/** Where a blow of this element lands: the strip's burst, and the bits that go with it (embers and smoke for fire, shards
 *  for ice, a lingering cloud for poison, leaves for the forest). `size` is 1 for a usual blow, more for a big one. */
export function impactBurst(p: Particles, el: Element, x: number, y: number, size = 1, splash = false): void {
  const big = size * (splash ? 1.15 : 1);
  switch (el) {
    case 'fire':
      play(p, 'fire-explosion', x, y, { scale: 0.9 * big, frameMs: 55 });
      chips(p, PACK['fire-sparkle'], 4, x, y, { scale: 0.7, life: 600, add: true, gravity: 0, vy: -0.08 });
      p.spawn({ frames: PACK['fire-smoke'], x, y: y - 6, scale: 0.9 * big, life: 700, vy: -0.03, grow: 0.0006, alpha: 0.55 });
      break;
    case 'ice':
      play(p, 'ice-explosion', x, y, { scale: 0.9 * big, frameMs: 55 });
      chips(p, PACK['ice-puff'], 5, x, y, { scale: 0.4, life: 600, add: true });
      break;
    case 'lightning':
      play(p, 'lightning-hit', x, y, { scale: 1.3 * big, frameMs: 45 });
      play(p, 'lightning-strike', x, y - 6, { scale: 0.9 * big, frameMs: 45 });
      chips(p, PACK['lightning-sparkle'], 3, x, y, { scale: 0.6, life: 450, add: true, gravity: 0, vy: -0.04 });
      break;
    case 'light':
      play(p, 'light-explosion', x, y, { scale: 0.9 * big, frameMs: 55 });
      chips(p, PACK['light-sparkle'], 4, x, y, { scale: 0.7, life: 800, add: true, gravity: 0, vy: -0.07, vx: 0 });
      break;
    case 'dark':
      play(p, 'dark-explosion', x, y, { scale: 0.9 * big, frameMs: 55 });
      p.spawn({ frames: PACK['dark-smoke'], x, y: y - 4, scale: 0.8 * big, life: 700, vy: -0.025, grow: 0.0006, alpha: 0.7 });
      break;
    case 'forest':
      play(p, 'forest-explosion', x, y, { scale: 0.9 * big, frameMs: 55 });
      chips(p, PACK['forest-sparkle'], 4, x, y, { scale: 0.7, life: 800, add: true, gravity: 0.0002, vy: -0.03 });
      break;
    case 'poison':
      play(p, 'poison-explosion', x, y, { scale: 0.9 * big, frameMs: 55 });
      // (the cloud that lingers over the struck)
      p.spawn({ frames: PACK['poison-smoke'], x, y: y - 6, scale: 1 * big, life: 1000, vy: -0.015, grow: 0.0004, alpha: 0.7, add: true });
      break;
    case 'earth':
      play(p, 'earth-explosion', x, y, { scale: 0.9 * big, frameMs: 55, add: false });
      chips(p, PACK['earth-puff'], 4, x, y, { scale: 0.45, life: 600 });
      break;
    case 'wind':
      play(p, 'wind-hit', x, y, { scale: 1.2 * big, frameMs: 45 });
      p.spawn({ frames: VFX.puffWhite, x, y: y + 4, scale: 0.6 * big, life: 380, vy: -0.02, grow: 0.0008, alpha: 0.8 });
      break;
    case 'blood':
      play(p, 'blood-hit', x, y, { scale: 1.2 * big, frameMs: 45, add: false });
      chips(p, VFX.puffBlood, 3, x, y, { scale: 0.3, life: 450, add: false });
      break;
  }
}

/** A fighter falls: skeletons come apart into bones, demons burn away, the big brutes thud in a ring of dust, a gorgon
 *  crumbles to stone, a hero rises in motes of light, the rest bleed. */
export function deathBurst(p: Particles, kind: DeathKind, x: number, y: number, size = 1): void {
  switch (kind) {
    case 'bones':
      if (boneTex) for (let i = 0; i < bits(7, p.density); i++) p.spawn({ frames: [boneTex], x: x + jit(10), y: y + jit(4), scale: 0.5, life: 1000, vx: jit(0.06), vy: -0.14 - Math.random() * 0.05, gravity: 0.0005, spin: jit(0.014), tint: 0xf4ecd8 });
      play(p, 'earth-puff', x, y, { scale: 1.1, add: false, alpha: 0.8 });
      play(p, 'dark-puff', x, y - 6, { scale: 0.9 });
      break;
    case 'burn':
      play(p, 'fire-explosion', x, y, { scale: 1.2, frameMs: 70 });
      for (let i = 0; i < bits(3, p.density); i++) {
        p.spawn({ frames: PACK['fire-flame'], x: x + jit(10), y: y + jit(4), scale: 0.9, life: 700, delay: i * 60, vy: -0.05, grow: -0.0006, loop: true, frameMs: 90, add: true });
        p.spawn({ frames: PACK['dark-smoke'], x: x + jit(12), y: y - 6 + jit(6), scale: 1.1, life: 900, delay: i * 90, vy: -0.035, grow: 0.0006, alpha: 0.85 });
      }
      chips(p, PACK['fire-sparkle'], 6, x, y, { scale: 0.7, life: 900, add: true, gravity: 0, vy: -0.06 });
      break;
    case 'thud':
      // (a ring of dust pushed out along the ground, and a heave of rubble)
      play(p, 'earth-wave', x, y + 6, { scale: 1.5 * size, frameMs: 70, add: false });
      for (let i = 0; i < bits(6, p.density); i++) {
        const a = (i / 6) * Math.PI * 2;
        p.spawn({ frames: VFX.puffWhite, x: x + Math.cos(a) * 6, y: y + 4 + Math.sin(a) * 3, scale: 0.8, life: 520, vx: Math.cos(a) * 0.05, vy: Math.sin(a) * 0.02 - 0.01, grow: 0.0008, alpha: 0.8 });
      }
      chips(p, PACK['earth-puff'], 4, x, y, { scale: 0.5, life: 700, add: false });
      break;
    case 'stone':
      chips(p, PACK['earth-puff'], 6, x, y, { scale: 0.45, life: 800, add: false, tint: 0xb0b6a6 });
      play(p, 'poison-puff', x, y, { scale: 1 });
      play(p, 'earth-puff', x, y + 2, { scale: 1.2, add: false, alpha: 0.8 });
      break;
    case 'blood':
      play(p, 'blood-hit', x, y, { scale: 1.4, add: false });
      p.spawn({ frames: VFX.puffBlood, x, y, scale: 1.2, life: 380, vy: -0.02, grow: 0.0008, alpha: 0.9 });
      chips(p, VFX.puffBlood, 4, x, y, { scale: 0.3, life: 500, add: false });
      break;
    case 'light':
      play(p, 'light-puff', x, y, { scale: 1.1 });
      chips(p, PACK['light-sparkle'], 6, x, y, { scale: 0.7, life: 1000, add: true, gravity: 0, vy: -0.05 });
      break;
  }
}

/** A caster winds up: a circle under its feet and motes gathering on it for `ms` (an ultimate's is a big rune, a wave
 *  and a pillar as well). */
export function windUp(p: Particles, el: Element, x: number, y: number, ms: number, tall: number, ultimate: boolean): void {
  // (an ultimate's layers are big, so each is thinned and tinted in the element's colour: stacked at full strength the
  // additive strips add up to flat white)
  const tint = ultimate ? ULT_TINT[el] : undefined;
  play(p, fam(el, 'circle'), x, y - 2, { scale: ultimate ? 2.2 : 1.4, loop: true, life: ms + 250, frameMs: 90, alpha: ultimate ? 0.6 : 0.85, tint });
  play(p, fam(el, 'gather'), x, y - tall * 0.5, { scale: ultimate ? 2 : 1.3, loop: true, life: ms, frameMs: 90, alpha: ultimate ? 0.6 : 0.9, tint });
  if (ultimate) {
    play(p, fam(el, 'rune'), x, y - 2, { scale: 2.2, loop: true, life: ms + 400, frameMs: 100, alpha: 0.5, tint });
    play(p, fam(el, 'pillar'), x, y - 20, { scale: 1.5, life: ms + 300, frameMs: Math.max(60, ms / 6), alpha: 0.3, add: false, delay: ms * 0.3, tint });
  }
  const n = bits(Math.round(ms / 160), p.density);
  // Motes converge on the casting point, making the release feel earned.
  const count = bits(ultimate ? 10 : 5, p.density);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const dx = Math.cos(a) * (ultimate ? 30 : 20);
    const dy = Math.sin(a) * 14;
    const life = Math.max(120, Math.min(360, ms));
    p.spawn({ frames: PACK[fam(el, 'sparkle')], x: x + dx, y: y - tall * 0.5 + dy, vx: -dx / life, vy: -dy / life, scale: 0.45, life, delay: Math.max(0, ms - life), alpha: 0.7, add: true, tint: tint ?? GLOW[el] });
  }
  for (let i = 0; i < n; i++)
    p.spawn({ frames: PACK[fam(el, 'sparkle')], x: x + jit(14), y: y - 2 + jit(3), scale: 0.6, life: 600, delay: (i * ms) / n, vy: -0.06, add: true, tint });
}

/** A boss steps onto the board: a dark rune, a shock ring and a pillar, smoke and embers round it. */
export function bossEntrance(p: Particles, x: number, y: number, tall: number): void {
  play(p, 'dark-rune', x, y - 2, { scale: 3.5, loop: true, life: 1100, frameMs: 100 });
  play(p, 'dark-pillar', x, y - tall * 0.4, { scale: 3, life: 700, frameMs: 100, alpha: 0.8 });
  play(p, 'dark-wave', x, y + 2, { scale: 3, frameMs: 110 });
  play(p, 'blood-circle', x, y - 2, { scale: 3, loop: true, life: 900, frameMs: 90, alpha: 0.8 });
  for (let i = 0; i < bits(5, p.density); i++)
    p.spawn({ frames: PACK['dark-smoke'], x: x + jit(20), y: y + jit(5), scale: 1.4, life: 1000, delay: i * 70, vy: -0.03, grow: 0.0006, alpha: 0.8 });
  chips(p, PACK['fire-sparkle'], 8, x, y, { scale: 0.8, life: 1100, add: true, gravity: 0, vy: -0.07 });
}

/** The glow colour of an element, for the bits drawn with Graphics. */
export const glowOf = (el: Element) => GLOW[el];
