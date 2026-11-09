// Decorative labour stops before combat reaches it. These read-only rules never create or move a battle unit.
import type { Battle } from '../sim/battle';
import { standable, type At } from '../sim/board';

export function campWorkVisible(b: Battle, at: At, near: boolean): boolean {
  const tile = b.board.tiles[at.v * b.board.w + at.u];
  if (!near || b.field?.hold?.horn || !tile || !standable(tile) || tile.ground === 'deep' || tile.ground === 'water') return false;
  return !b.units.some((u) => u.alive && !u.under &&
    (u.side === 'hero' && Math.abs(u.u - at.u) + Math.abs(u.v - at.v) < 10 || Math.abs(u.u - at.u) + Math.abs(u.v - at.v) < 1));
}
