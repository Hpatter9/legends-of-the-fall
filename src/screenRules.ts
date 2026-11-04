// CLOSE-SCREENS: the rules of the page's screen stack (pure, tested in `test/close-screens.test.ts`; the DOM side is `screens.ts`).
// The owner: "When a screen goes away, it should be closed. I just got a chest, and the previous battle recap was in the background."
//
// Three kinds of full-screen screen:
// - a flow screen is one step of a flow the player moves through and does not come back to (a fight's result card, the run's recap,
//   a chest opening, a summary). Once the flow moves on it is done: the next screen that opens over it closes it first, and so does
//   going back to a place (the home screen, the spire's map).
// - a moment (a hero's first reveal, an earned hero riding in, an unlock card, a rank-up, a binding) is laid over whatever is up (a
//   film's unlock card can come over a result card the player still has to leave) and closes nothing; nor is it closed by another
//   screen: it is the player's to dismiss, and a flow waits on it. It is in the stack only so the stack shows what is up.
// - a place is somewhere the player comes back to (the home screen, the party, the stall, a hero's sheet). Places are not in the stack:
//   they stay, hidden and not drawn, under what opens over them (MENU-GLITCH, HERO-SHEET-GLITCH).

export type ScreenKind = 'flow' | 'moment';

export interface ScreenEntry {
  name: string;
  kind: ScreenKind;
  /** The flow screens this one is meant to sit over (a card laid on a result card): they stay open under it. */
  over?: readonly string[];
}

/** The screens to close, top first, as `next` opens over `open` (bottom first): an earlier copy of itself (a screen opened again
 *  replaces the old one), and, for a flow screen, every flow screen it is not meant to sit over. Moments stay, and close nothing. */
export function closeOnOpen(open: readonly ScreenEntry[], next: ScreenEntry): string[] {
  const keep = new Set(next.over ?? []);
  const flow = next.kind === 'flow';
  return open
    .filter((e) => e.name === next.name || (flow && e.kind === 'flow' && !keep.has(e.name)))
    .map((e) => e.name)
    .reverse();
}

/** The screens to close, top first, when the game goes back to a place: every flow screen. Moments are left to finish by themselves. */
export function closeOnPlace(open: readonly ScreenEntry[]): string[] {
  return open.filter((e) => e.kind === 'flow').map((e) => e.name).reverse();
}
