// FIXES-4 (docs/notes/fixes-4.md): the rules of a ground mark's rim, pure (no Pixi), so the tests read them; `groundMarks.ts` draws them.
// A mark over many tiles reads as one patch: each tile is tinted, and its diamond's edges with no tile of the patch beyond them (on the
// screen, so a turned board rims the same) carry the bold outline. A neighbour at another height is beyond the patch too, so a patch over a
// step has a rim along the step.

/** A tile of a patch, in world tiles as drawn (`U`, `V`: the board's own tile turned through its frame) and its height. */
export interface PatchTile {
  U: number;
  V: number;
  h: number;
}

/** The diamond's corners in order: top, right, bottom, left (`tileDiamond`). An edge is a pair of them. */
export type Edge = [number, number];

/** The edges of one tile's diamond with no tile of the patch beyond them. The edges on the screen: up-right faces V - 1, down-right U + 1,
 *  down-left V + 1, up-left U - 1 (`rawAt`). */
export function rimEdges(t: PatchTile, patch: readonly PatchTile[]): Edge[] {
  const has = (dU: number, dV: number) => patch.some((p) => p.U === t.U + dU && p.V === t.V + dV && p.h === t.h);
  const out: Edge[] = [];
  if (!has(0, -1)) out.push([0, 1]);
  if (!has(1, 0)) out.push([1, 2]);
  if (!has(0, 1)) out.push([2, 3]);
  if (!has(-1, 0)) out.push([3, 0]);
  return out;
}
