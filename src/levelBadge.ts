// The level badge: "Lv 47" in a small frame whose colour grows with the deep milestones (40, 50, ... 100: `badgeOf` in `levels.ts`),
// and the short XP words the sheets use. The frames are steady colours of the Stone and Iron tokens (`levels.css`); nothing pulses.

import { badgeOf, BADGE_NAMES } from './sim/levels';

/** A badge for a level: `Lv 47`, framed for the milestones the level has reached (`b0` plain, `b1` Iron at 40 ... `b7` Arcane at 100). */
export function levelBadge(level: number, cls = ''): HTMLSpanElement {
  const b = document.createElement('span');
  const tier = badgeOf(level);
  b.className = `lvb b${tier}${cls ? ` ${cls}` : ''}`;
  b.textContent = `Lv ${level}`;
  if (tier) b.title = `${BADGE_NAMES[tier]} badge`;
  return b;
}

/** An XP figure short enough for a small sheet: whole up to 9,999, then 12k, 1.2M. */
export function compactXp(n: number): string {
  if (n < 10000) return n.toLocaleString('en-GB');
  if (n < 1e6) return `${Math.round(n / 1000)}k`;
  return `${(Math.round(n / 1e5) / 10).toFixed(1)}M`;
}
