// The Last Stand's camera rules (STAND-003; no Pixi, no DOM, so the tests can run them). The owner: "the screen shakes too much to see
// what's going on" and "don't auto-move the camera back to the king". So the Last Stand has no screen shake of its own fights' blows:
// only a tiny nudge when a boss lands a blow, none at all under reduced motion or with shake off in the settings. The camera is the
// player's: it is panned and pinched, and goes to the king only when asked (the page's button).

import type { BattleEvent, Unit } from '../sim/battle';
import { isBoss } from '../sim/foes';

/** The most the screen moves for a boss's blow (CSS px), and how long the nudge lasts (ms). */
export const NUDGE_PX = 2;
export const NUDGE_MS = 160;

/** Whether a tick's events hold a blow a boss landed (on a hero or the king). */
export function bossHit(events: readonly BattleEvent[], units: readonly Unit[]): boolean {
  for (const e of events) {
    if (e.kind !== 'hit' || e.src === 'dot') continue;
    const by = units.find((u) => u.id === e.by);
    if (by && by.side === 'foe' && isBoss(by.def)) return true;
  }
  return false;
}

/** The nudge's offset (px) with `left` ms of it to go: a single small dip that eases back, never more than `NUDGE_PX`; nothing when the screen is to stay still. */
export function nudgeOffset(left: number, calm: boolean): { x: number; y: number } {
  if (calm || left <= 0) return { x: 0, y: 0 };
  const p = Math.min(1, left / NUDGE_MS);
  return { x: 0, y: Math.round(NUDGE_PX * p * Math.sin(p * Math.PI)) };
}

/** The zoom after a mouse wheel's turn (a step of the whole-pixel scales, in or out), kept in the steps given. */
export function wheelStep(steps: readonly number[], now: number, dy: number): number {
  if (!steps.length) return now;
  let i = 0;
  for (let k = 1; k < steps.length; k++) if (Math.abs(steps[k] - now) < Math.abs(steps[i] - now)) i = k;
  return steps[Math.max(0, Math.min(steps.length - 1, i + (dy < 0 ? 1 : dy > 0 ? -1 : 0)))];
}
