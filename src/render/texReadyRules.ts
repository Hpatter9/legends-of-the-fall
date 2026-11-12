// WAVE-DELAY (docs/notes/wave-delay.md): the large sheets a fight draws from (the king's spells' and the ground loops' atlases, their
// glows, the painted spell sheets a save has used) are handed to the graphics card before the fight needs them, one a frame, and are
// not taken back while a fight is on. Before, each went up on the frame it was first drawn, in the middle of the fight, the page
// stopped while the browser decoded the whole picture to do it; and Pixi takes back whatever has not been drawn for a minute, so it
// happened again and again. Pure: the tests read it; `texReady.ts` carries it out.

/** The one sheet to hand over this frame: the first kept sheet that is not on the graphics card (null: all are). One a frame, so no
 *  frame carries more than one. */
export function nextToWarm<T>(kept: readonly T[], onCard: (x: T) => boolean): T | null {
  for (const x of kept) if (!onCard(x)) return x;
  return null;
}

/** Whether the kept sheets may be taken back by the graphics memory's own tidying now: never while a fight is on (one may be needed
 *  again at any moment of it), freely otherwise (the next deploy hands back what the next fight needs). */
export const mayRelease = (fighting: boolean): boolean => !fighting;
