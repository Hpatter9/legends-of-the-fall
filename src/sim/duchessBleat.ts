// Duchess's Lucky Bleat in a fight: what a tap on her does to the battle (the page picks the effect, as with a spell; these
// apply it, so the renderer changes the fight only through the sim). Pure rules.

import { standable, tileAt } from './board';
import type { Battle, Unit } from './battle';

/** Startle the foe nearest the heroes' back row: it can do nothing for `ms`. Returns the startled foe, if there is one. */
export function bleatStartle(b: Battle, ms: number): Unit | undefined {
  const foes = b.units.filter((u) => u.alive && u.side === 'foe');
  if (!foes.length) return undefined;
  const d = b.board.d;
  let target = foes[0];
  let bestD = Infinity;
  for (const f of foes) {
    const dist = Math.hypot(f.u, f.v - (d - 1));
    if (dist < bestD) {
      bestD = dist;
      target = f;
    }
  }
  target.busyUntil = Math.max(target.busyUntil, b.t + ms);
  target.stunUntil = Math.max(target.stunUntil ?? 0, b.t + ms);
  return target;
}

/** Kick a cabbage onto a free corner tile on the heroes' side; the first fighter to walk onto it is healed. Returns the tile. */
export function bleatCabbage(b: Battle, healPercent: number): [number, number] {
  const d = b.board.d;
  const candidates: [number, number][] = [[0, d - 1], [1, d - 1], [0, d - 2], [1, d - 2], [2, d - 1]];
  const tile = candidates.find(([u, v]) => standable(tileAt(b.board, u, v))) ?? [0, d - 1];
  (b.cabbages ??= []).push({ u: tile[0], v: tile[1], healPercent });
  return tile;
}
