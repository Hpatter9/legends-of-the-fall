// FX-CLEAR (docs/notes/fx-clear.md): effects laid over a fighter are drawn see-through, so the hero or foe under them still reads.
// Every effect in `Fx` (skills, ultimates, spells, combos, hits, heals, smoke) sits in one layer above all the fighters; a big
// painted cast or burst on a fighter's tile used to hide its body and face. An effect whose box overlaps a living fighter's body is
// drawn at `OVER_FIGHTER_ALPHA` of its own strength (the shatter's burst too), and an ailment's parts drawn in front of the body (its
// front layer, halo and motes) at `OVER_FIGHTER_STATUS_ALPHA`; the ground rings and back layers, behind the body, are left as they
// were. Both are only a lower alpha, fixed when the effect starts: nothing blinks or vanishes, and reduced motion is unchanged.
// Pure rules: no Pixi, no DOM.

/** How strong an effect over a fighter's body is drawn, of its own alpha (skill, ultimate, spell, combo and hit effects). */
export const OVER_FIGHTER_ALPHA = 0.6;
/** How strong an ailment's parts in front of the body are drawn, of their own alpha (`statusStyles.ts`: front, halo, motes). */
export const OVER_FIGHTER_STATUS_ALPHA = 0.7;

/** A fighter as drawn: its feet in world px and how tall it is. */
export interface Body {
  x: number;
  y: number;
  tall: number;
}

/** Whether an effect centred on (x, y), `half` px from its centre to its edge, overlaps a fighter's body (a box a little narrower
 *  than the fighter is tall, from its feet to its head). */
export function overFighter(x: number, y: number, half: number, bodies: Iterable<Body>): boolean {
  for (const b of bodies) {
    const w = b.tall * 0.3;
    if (x + half > b.x - w && x - half < b.x + w && y + half > b.y - b.tall && y - half < b.y) return true;
  }
  return false;
}

/** The alpha an effect is drawn at: its own, thinned when it lies over a fighter. */
export const coverAlpha = (alpha: number, over: boolean): number => (over ? alpha * OVER_FIGHTER_ALPHA : alpha);
