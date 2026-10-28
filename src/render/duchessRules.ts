// Duchess the goat's behaviour: pure rules (no Pixi, no DOM, no clock of its own) so the camp, the tavern and the fight can
// each give her a patch of ground and let her get on with it. She grazes (chewing), now and then ambles to a new spot, now and
// then goes and nibbles at a hero, and when tapped she hops once with her "Mehh.". Her sheet (`art/duchess/goat.png`, the
// same one Chronos uses) is 48-pixel frames: three steps walking left, then three walking right; frame 1 (or 4) is standing.
// Everything is a one-shot or a slow amble: nothing blinks or flashes.

export type GoatMode = 'graze' | 'walk' | 'nibble' | 'hop' | 'nest';

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
  then: 'graze' | 'nibble' | 'nest';
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
  if (g.mode === 'nibble' || g.mode === 'nest') {
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

/** A tap that gently nudges Duchess off if she is nesting on a haystack, or causes her to hop normally.
 *  Returns whether she hopped and whether she was nudged from a nest. */
export function tapNudgeGoat(g: Goat, now: number): { hopped: boolean; nudgedFromNest: boolean } {
  if (g.mode === 'hop') return { hopped: false, nudgedFromNest: false };
  const wasNesting = g.mode === 'nest';
  g.mode = 'hop';
  g.at = now;
  if (wasNesting) {
    g.then = 'graze';
    g.to = g.x + (g.face === 1 ? 14 : -14);
  }
  return { hopped: true, nudgedFromNest: wasNesting };
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
  if (reduced || (g.mode !== 'graze' && g.mode !== 'nibble' && g.mode !== 'nest')) return 0;
  return Math.floor(now / 420) % 2;
}

/* ---- in-battle lucky bleat: once-per-battle tactical effect ---- */

export type LuckyBleatEffect =
  | { kind: 'startle'; durationMs: number; text: string }
  | { kind: 'cabbage'; healPercent: number };

export interface DuchessBattleState {
  luckyBleatUsed: boolean;
}

export function newDuchessBattleState(): DuchessBattleState {
  return { luckyBleatUsed: false };
}

/**
 * Tapping Duchess in battle plays her hop and bleat, and once per battle she has a playful tactical effect:
 * she either briefly startles a nearby foe ("Startled by livestock") for 0.4s, or kicks a cabbage onto
 * an adjacent tile that heals the first unit walking over it for 10% max HP.
 */
export function triggerLuckyBleat(state: DuchessBattleState, rand: () => number = Math.random): LuckyBleatEffect | null {
  if (state.luckyBleatUsed) return null;
  state.luckyBleatUsed = true;
  if (rand() < 0.5) {
    return {
      kind: 'startle',
      durationMs: 400,
      text: 'Startled by livestock',
    };
  }
  return {
    kind: 'cabbage',
    healPercent: 0.1,
  };
}

export function resetDuchessBattle(state: DuchessBattleState): void {
  state.luckyBleatUsed = false;
}

/* ---- camp / castle haystack trinket: daily treat ---- */

export type DuchessTreat =
  | { kind: 'stones'; amount: number; message: string }
  | { kind: 'crowns'; amount: number; message: string }
  | { kind: 'lore'; snippet: string; message: string };

export const DUCHESS_LORE_SNIPPETS: readonly string[] = [
  "Under the hay lies Duchess's secret journal: 'Day 412: They still believe the king runs the castle. Ate a court parchment.'",
  "A damp scrap of paper: 'Official Decree: Duchess is exempt from military conscription and all cabbage taxes.'",
  "A chewed recipe card: 'Old Tavern Stew: Step 1 - Do not let the goat near the cauldron.'",
  "A crumpled letter: 'Day 104: Duchess sat on my spellbook again. Fireball delayed.'",
  "A dusty tablet: 'Prophecy speaks of a horned monarch of fluff who rules without words.'",
];

export function rollDailyTreat(rand: () => number = Math.random): DuchessTreat {
  const r = rand();
  if (r < 0.35) {
    const amount = rand() < 0.5 ? 1 : 2;
    return {
      kind: 'stones',
      amount,
      message: `Duchess nudged off! Found ${amount} summoning stone${amount > 1 ? 's' : ''} in the hay!`,
    };
  }
  if (r < 0.7) {
    const amount = Math.floor(15 + rand() * 20);
    return {
      kind: 'crowns',
      amount,
      message: `Duchess nudged off! Found ${amount} gold crowns in the hay!`,
    };
  }
  const snippet = DUCHESS_LORE_SNIPPETS[Math.floor(rand() * DUCHESS_LORE_SNIPPETS.length)];
  return {
    kind: 'lore',
    snippet,
    message: `Duchess nudged off! Lore snippet: "${snippet}"`,
  };
}

/* ---- unlockable hats & costumes ---- */

export type DuchessCosmeticId = 'none' | 'crown' | 'wizard' | 'quiver';

export interface DuchessCosmeticDef {
  id: DuchessCosmeticId;
  name: string;
  desc: string;
  hint: string;
  unlocked(meta?: { duchessTaps?: number; duchessLucky?: boolean; duchessHay?: boolean }): boolean;
}

export const DUCHESS_COSMETICS: readonly DuchessCosmeticDef[] = [
  { id: 'none', name: 'None', desc: 'Duchess in her natural regal splendour.', hint: 'Default', unlocked: () => true },
  { id: 'crown', name: 'Tiny Tin Crown', desc: 'A slightly crooked tin coronet perched with sovereign grace.', hint: 'Tap Duchess 5 times', unlocked: (m) => (m?.duchessTaps ?? 0) >= 5 },
  { id: 'wizard', name: 'Wizard Hat', desc: 'A pointy star-speckled hat smelling faintly of cabbages and mana.', hint: 'Trigger Lucky Bleat in battle', unlocked: (m) => !!m?.duchessLucky },
  { id: 'quiver', name: 'Archery Quiver', desc: 'A miniature leather quiver slung diagonally across her back.', hint: 'Find her daily haystack treat', unlocked: (m) => !!m?.duchessHay },
];

/** Draw Duchess's equipped cosmetic accessory onto a 2D canvas, aligned to her frame, facing, and bob. */
export function drawDuchessCosmetic(
  ctx: CanvasRenderingContext2D,
  cosmetic: DuchessCosmeticId,
  frameLeft: number,
  frameTop: number,
  scale = 1,
  face: 1 | -1 = 1,
  bob = 0,
): void {
  if (!cosmetic || cosmetic === 'none') return;
  ctx.save();
  const s = scale;
  const fl = Math.round(frameLeft);
  const ft = Math.round(frameTop);

  if (cosmetic === 'crown') {
    // Tiny Tin Crown: perched right between the goat's horns!
    const hx = face === 1 ? 30 : 11;
    const hy = 8 + bob;
    const x = fl + Math.round(hx * s);
    const y = ft + Math.round(hy * s);

    // Gold tips
    ctx.fillStyle = '#f5e27a';
    ctx.fillRect(x + 1 * s, y, 1 * s, 1 * s);
    ctx.fillRect(x + 3 * s, y, 1 * s, 1 * s);
    ctx.fillRect(x + 5 * s, y, 1 * s, 1 * s);

    // Tin / Silver body
    ctx.fillStyle = '#cfd6df';
    ctx.fillRect(x, y + 1 * s, 7 * s, 2 * s);
    ctx.fillStyle = '#8f9ba8';
    ctx.fillRect(x, y + 3 * s, 7 * s, 1 * s);

    // Tiny ruby gem in center
    ctx.fillStyle = '#d93b3b';
    ctx.fillRect(x + 3 * s, y + 2 * s, 1 * s, 1 * s);
  } else if (cosmetic === 'wizard') {
    // Wizard Hat: conical blue hat tilted back with a gold star
    const hx = face === 1 ? 27 : 9;
    const hy = 3 + bob;
    const x = fl + Math.round(hx * s);
    const y = ft + Math.round(hy * s);

    // Brim
    ctx.fillStyle = '#1e294b';
    ctx.fillRect(x, y + 7 * s, 11 * s, 2 * s);

    // Cone
    ctx.fillStyle = '#374c86';
    ctx.fillRect(x + 2 * s, y + 4 * s, 7 * s, 3 * s);
    ctx.fillRect(x + (face === 1 ? 2 * s : 3 * s), y + 2 * s, 5 * s, 2 * s);
    ctx.fillRect(x + (face === 1 ? 1 * s : 4 * s), y + 1 * s, 3 * s, 1 * s);
    ctx.fillRect(x + (face === 1 ? 0 : 5 * s), y, 2 * s, 1 * s);

    // Gold band & star
    ctx.fillStyle = '#ffd13b';
    ctx.fillRect(x + 2 * s, y + 6 * s, 7 * s, 1 * s);
    ctx.fillRect(x + (face === 1 ? 5 * s : 3 * s), y + 4 * s, 2 * s, 2 * s);
  } else if (cosmetic === 'quiver') {
    // Archery Quiver: slung across goat's back
    const qx = face === 1 ? 16 : 25;
    const qy = 20 + bob;
    const x = fl + Math.round(qx * s);
    const y = ft + Math.round(qy * s);

    // Arrow fletchings pointing up
    ctx.fillStyle = '#55a832';
    ctx.fillRect(x + 1 * s, y - 3 * s, 2 * s, 2 * s);
    ctx.fillRect(x + 3 * s, y - 2 * s, 2 * s, 2 * s);
    ctx.fillStyle = '#d2a66e';
    ctx.fillRect(x + 2 * s, y - 1 * s, 1 * s, 2 * s);
    ctx.fillRect(x + 4 * s, y, 1 * s, 1 * s);

    // Leather quiver body
    ctx.fillStyle = '#7a421b';
    ctx.fillRect(x, y + 1 * s, 6 * s, 8 * s);
    ctx.fillStyle = '#9e5926';
    ctx.fillRect(x + 1 * s, y + 2 * s, 4 * s, 6 * s);

    // Strap across back
    ctx.fillStyle = '#4f270b';
    ctx.fillRect(x - 2 * s, y + 3 * s, 2 * s, 2 * s);
    ctx.fillRect(x + 6 * s, y + 5 * s, 2 * s, 2 * s);
  }

  ctx.restore();
}

/** Draw a small pixel-art haystack under Duchess's nesting position. */
export function drawHaystack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  footY: number,
  scale = 1,
): void {
  ctx.save();
  const s = scale;
  const w = 34 * s;
  const h = 12 * s;
  const x = Math.round(cx - w / 2);
  const y = Math.round(footY - h);

  // Shadow under haystack
  ctx.fillStyle = 'rgba(8, 3, 1, 0.35)';
  ctx.fillRect(x - 2 * s, Math.round(footY - 2 * s), w + 4 * s, 3 * s);

  // Dark base straw
  ctx.fillStyle = '#94661a';
  ctx.fillRect(x + 2 * s, y + 2 * s, w - 4 * s, h - 2 * s);

  // Golden straw body
  ctx.fillStyle = '#dca02e';
  ctx.fillRect(x + 4 * s, y + 3 * s, w - 8 * s, h - 4 * s);
  ctx.fillRect(x + 8 * s, y + 1 * s, w - 16 * s, h - 2 * s);

  // Bright straw highlights
  ctx.fillStyle = '#f6d465';
  ctx.fillRect(x + 10 * s, y + 2 * s, 10 * s, 2 * s);
  ctx.fillRect(x + 6 * s, y + 5 * s, 8 * s, 2 * s);
  ctx.fillRect(x + 18 * s, y + 6 * s, 6 * s, 2 * s);

  // Stray wisps
  ctx.fillStyle = '#fbe599';
  ctx.fillRect(x + 1 * s, y + h - 3 * s, 3 * s, 1 * s);
  ctx.fillRect(x + w - 4 * s, y + h - 4 * s, 3 * s, 1 * s);
  ctx.fillRect(x + 7 * s, y, 2 * s, 2 * s);

  ctx.restore();
}

/* ---- her visits to the fight: she is not in every one; she wanders in now and then, stays a while, and wanders off ---- */

/** The chance that a fight has a visit from her: about one in four or five. */
export const VISIT_CHANCE = 0.22;
/** How long she takes to amble in from the edge, and out again (ms). */
export const VISIT_WALK_MS = 3200;
/** How long she waits before she wanders in (ms), and how long she then stays (ms). */
export const VISIT_ARRIVE_MS: readonly [number, number] = [2000, 14000];
export const VISIT_STAY_MS: readonly [number, number] = [22000, 50000];

export interface Visit {
  /** When she begins to wander in, how long she stays once in, counted from the fight's set-up (ms). */
  arrive: number;
  stay: number;
}

/** Whether this fight has a visit from her, and its times. `rand` is the renderer's own (she is not in the sim, and no fight's course depends on her). */
export function rollVisit(rand: () => number): Visit | null {
  if (rand() >= VISIT_CHANCE) return null;
  const between = ([lo, hi]: readonly [number, number]) => Math.round(lo + rand() * (hi - lo));
  return { arrive: between(VISIT_ARRIVE_MS), stay: between(VISIT_STAY_MS) };
}

/** Where she is in a visit at `t` ms: away, walking in (`k` 0 to 1 of the way), here, or walking out (`k` 1 to 0). */
export function visitAt(v: Visit | null, t: number): { phase: 'away' | 'in' | 'here' | 'out'; k: number } {
  if (!v || t < v.arrive) return { phase: 'away', k: 0 };
  const inEnd = v.arrive + VISIT_WALK_MS;
  if (t < inEnd) return { phase: 'in', k: (t - v.arrive) / VISIT_WALK_MS };
  const outAt = inEnd + v.stay;
  if (t < outAt) return { phase: 'here', k: 1 };
  if (t < outAt + VISIT_WALK_MS) return { phase: 'out', k: 1 - (t - outAt) / VISIT_WALK_MS };
  return { phase: 'away', k: 0 };
}
