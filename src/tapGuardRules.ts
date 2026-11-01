// MENU-GLITCH: the rule behind the page's ghost-click guard (`tapGuard.ts`), kept free of the DOM so a test can read it.
//
// On a phone, the click a tap makes is aimed afresh after the finger's pointerup has run. A scene that acts on pointerup (the camp's
// heroes, the tavern's board) opens a panel there, and the click then lands on whatever of the new panel is under the finger: a
// quest row, a tab, a Close. A click is that ghost when it lands on something unrelated to what the finger went down on (neither it,
// inside it nor round it), soon after the finger lifted, while what it went down on is still on the page.

/** The little a node needs for the rule (a DOM Node has all of it). */
export interface TapNode {
  contains(other: TapNode | null): boolean;
  readonly isConnected: boolean;
}

/** How long after the finger lifts a stray click still counts as that tap's (a real click comes within a frame or two). */
export const GHOST_MS = 600;

/** Whether a click is a ghost to swallow: `down` is what the finger went down on, `msSinceUp` the time since it lifted. A click with no
 *  tap before it (a key, a script, a screen reader) is never one. */
export function isGhostClick(down: TapNode | null, target: TapNode | null, msSinceUp: number): boolean {
  if (!down || !target || msSinceUp > GHOST_MS) return false;
  // (what the finger went down on was taken away, a list drawn again under it: the click on the new one is the tap's own)
  if (!down.isConnected) return false;
  return !(down === target || down.contains(target) || target.contains(down));
}
