// ASSAULT-SKILLS (`docs/notes/assault-skills.md`): which of a tick's events the Assault's field shows as effects, and how many, at each level
// of detail. The field holds 255 fighters; the ordinary fight's effects are drawn for a board of a dozen. So the field shows the effects of
// what matters most first (an ultimate, a king's spell, a hero's skill, a heal), the nearest the middle of the screen first, up to a cap a
// frame and a cap alive at once; Near shows them whole, Mid a simpler version (one burst, no wind-up), Far none.
//
// Pure rules: no Pixi, no DOM.

import type { BattleEvent } from '../sim/battle';

export type FxLevel = 'full' | 'simple' | 'none';
/** What the field draws at each level of detail. */
export const fxLevel = (detail: 'near' | 'mid' | 'far'): FxLevel => (detail === 'near' ? 'full' : detail === 'mid' ? 'simple' : 'none');

/** The caps: effects begun in one frame, and the particle bits alive at once (the ordinary fight's pool holds 200). */
export const FIELD_FX = {
  /** Effects begun in one frame, at Near and at Mid. */
  PER_FRAME: { full: 10, simple: 4 },
  /** Bits alive at once, at Near and at Mid. */
  LIVE: { full: 120, simple: 40 },
  /** An ultimate's name over its caster: at most this many at once. */
  NAMES: 3,
  /** The camera's glance at an ultimate of ours: no oftener than this (ms of the page's clock). */
  GLANCE_GAP_MS: 5000,
} as const;

/** How much an event matters, for the cap (higher first); 0: not drawn as an effect. */
export function fxWeight(e: BattleEvent, ult: (by: number, name: string) => boolean, ours: (id: number) => boolean): number {
  switch (e.kind) {
    case 'skill':
      return ult(e.by, e.name) ? 100 : ours(e.by) ? 60 : 40;
    case 'spell':
      return 90;
    case 'area':
      return 70;
    case 'revive':
      return 65;
    case 'burst':
      return 55;
    case 'heal':
      return e.amount > 0 ? 35 : 0;
    case 'dash':
    case 'blink':
      return 30;
    case 'aura':
      return 25;
    default:
      return 0;
  }
}

/** The events to draw this frame: weighted, on screen (or by a spot on screen), the heaviest and then the nearest the middle first, up to
 *  the frame's cap. `at` gives an event's place on screen as a distance from the middle (Infinity: off screen). Stable for equal ones. */
export function pickFx<E>(events: readonly E[], weight: (e: E) => number, at: (e: E) => number, cap: number): E[] {
  const ranked: { e: E; w: number; d: number; i: number }[] = [];
  events.forEach((e, i) => {
    const w = weight(e);
    if (w <= 0) return;
    const d = at(e);
    if (!Number.isFinite(d)) return;
    ranked.push({ e, w, d, i });
  });
  ranked.sort((a, b) => b.w - a.w || a.d - b.d || a.i - b.i);
  return ranked.slice(0, Math.max(0, cap)).map((x) => x.e);
}

/** A fighter's pose while it casts (the ordinary fight's, `unitView.ts`): the share of its row's frames to show at `p` (0 to 1 through the
 *  cast), and how far it rises. A sheet with a cast row of its own plays it through; one without gathers itself on the first frames of its
 *  attack, rising a little, and strikes with the rest as the skill goes off. */
export function castPose(p: number, own: boolean): { share: number; lift: number } {
  const q = Math.max(0, Math.min(1, p));
  if (own) return { share: q, lift: 0 };
  return { share: q < 0.7 ? (q / 0.7) * 0.35 : 0.35 + ((q - 0.7) / 0.3) * 0.65, lift: Math.sin(Math.PI * Math.min(1, q / 0.8)) * 3 };
}

/** Whether the camera glances at an ultimate of ours as it goes off: Near or Mid, not following a platoon, the player's hands still for a
 *  while, not too soon after the last glance, and not with reduced motion. */
export function glanceAt(o: { level: FxLevel; following: boolean; idleMs: number; sinceGlance: number; calm: boolean }, idleNeed: number): boolean {
  return o.level !== 'none' && !o.following && !o.calm && o.idleMs >= idleNeed && o.sinceGlance >= FIELD_FX.GLANCE_GAP_MS;
}
