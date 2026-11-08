// The Assault field's levels of detail by the camera's zoom (`fieldView.ts`, the design's 2.4): NEAR from 0.35 up, MID from 0.15 to
// 0.35, FAR below 0.15. A level changes only once the zoom is 5% past a threshold, so a pinch resting at the edge does not flicker
// between two. No Pixi here, so the tests can read it.

export const NEAR_AT = 0.35;
export const MID_AT = 0.15;
/** How far past a threshold the zoom must go (a share of it) before the level changes: a 10% band in all. */
export const BAND = 0.05;

export type Detail = 'near' | 'mid' | 'far';

/** The level of detail for a zoom, given the level now (the band keeps it where it is near a threshold). */
export function detailFor(zoom: number, now: Detail): Detail {
  const up = (t: number) => zoom >= t * (1 + BAND);
  const down = (t: number) => zoom < t * (1 - BAND);
  if (now === 'near') return down(NEAR_AT) ? (down(MID_AT) ? 'far' : 'mid') : 'near';
  if (now === 'mid') return up(NEAR_AT) ? 'near' : down(MID_AT) ? 'far' : 'mid';
  return up(MID_AT) ? (up(NEAR_AT) ? 'near' : 'mid') : 'far';
}
