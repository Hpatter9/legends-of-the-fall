// Frames that load each in its own time into one list (the castle's goat: eight pictures, each put at its own place as it
// arrives). Such a list is as long as its LAST frame's place the moment that one arrives, though earlier places are still
// empty: its length does not say it is whole. These ask the right question.
//
// Pure: no Pixi, no DOM.

/** Whether the first `n` places of `frames` are all filled. */
export function framesReady<T>(frames: readonly (T | undefined)[], n: number): boolean {
  for (let i = 0; i < n; i++) if (!frames[i]) return false;
  return true;
}

/** The frame at `i`, or undefined while it has not arrived (the caller skips it, and paints it once it has). */
export const frameAt = <T>(frames: readonly (T | undefined)[], i: number): T | undefined => frames[i] ?? undefined;
