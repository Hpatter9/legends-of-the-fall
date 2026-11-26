// WAVE-DELAY (docs/notes/wave-delay.md): the large sheets a fight draws from (the king's spells' and the ground loops' atlases, their
// glows, the painted spell sheets) are handed to the graphics card before the fight needs them, one a frame, and are
// not taken back while a fight is on. Before, each went up on the frame it was first drawn, in the middle of the fight, the page
// stopped while the browser decoded the whole picture to do it; and Pixi takes back whatever has not been drawn for a minute, so it
// happened again and again. Pure: the tests read it; `texReady.ts` carries it out.

/** The one sheet to hand over this frame: the first kept sheet that is not on the graphics card (null: all are). One a frame, so no
 *  frame carries more than one. */
export function nextToWarm<T>(kept: readonly T[], onCard: (x: T) => boolean): T | null {
  for (const x of kept) if (!onCard(x)) return x;
  return null;
}

/** EIDOLON-SMOOTH: the sheets a fight's fighters draw from: each one's own sheet and its view from behind (a fighter that turned its
 *  back for the first time had that sheet handed to the graphics card there and then, in the middle of the fight), each once, and only
 *  those the game has. */
export function fighterSheets(own: readonly string[], rear: (sheet: string) => string, has: (sheet: string) => boolean): string[] {
  const out = new Set<string>();
  for (const s of own) for (const x of [s, rear(s)]) if (has(x)) out.add(x);
  return [...out];
}

/** The kept names of a group after it is named afresh: every name of another group stays, the group's own are only the new ones (a
 *  fight's fighters are the next fight's no longer: their sheets are let go, not kept for good). Names are `group:name`. */
export function regroup(kept: readonly string[], group: string, names: readonly string[]): { keep: string[]; drop: string[] } {
  const mine = new Set(names.map((n) => `${group}:${n}`));
  const drop = kept.filter((k) => k.startsWith(`${group}:`) && !mine.has(k));
  return { keep: [...kept.filter((k) => !k.startsWith(`${group}:`)), ...mine], drop };
}

/** Whether the kept sheets may be taken back by the graphics memory's own tidying now: never while a fight is on (one may be needed
 *  again at any moment of it), freely otherwise (the next deploy hands back what the next fight needs). */
export const mayRelease = (fighting: boolean): boolean => !fighting;

/** Whether a sheet may be handed over on this frame: not in the middle of a fight (there it goes up when it is first drawn, as it
 *  always did; a hand-over is a stop, and a deploy is where a stop is not seen). */
export const mayWarm = (fighting: boolean): boolean => !fighting;
