// CLOSE-SCREENS: the page's stack of open full-screen screens (the rules are `screenRules.ts`). A screen registers as it opens, with
// the function that closes it for good (its element removed or emptied, its timers, loops and listeners stopped); the closer it gets
// back is what its own Continue or Close calls. Opening a screen closes the flow screens it lands on that are finished; going back to a
// place (`closeFinished`) closes every flow screen still open. Each closes once, however it is reached.

import { closeOnOpen, closeOnPlace, type ScreenEntry, type ScreenKind } from './screenRules';

interface Open extends ScreenEntry {
  close: () => void;
}

const stack: Open[] = [];

/** Take the entry off the stack and run its close (once). */
function shut(e: Open): void {
  const i = stack.indexOf(e);
  if (i < 0) return;
  stack.splice(i, 1);
  e.close();
}

function shutNamed(names: readonly string[]): void {
  for (const n of names) {
    const e = stack.find((s) => s.name === n);
    if (e) shut(e);
  }
}

/** Register a screen as it opens (call it before the screen is put up). The finished flow screens under it are closed first.
 *  Returns its closer: call that from the screen's own way out (it runs `close` once, and only while the screen is still open). */
export function openScreen(name: string, close: () => void, opts: { kind?: ScreenKind; over?: readonly string[] } = {}): () => void {
  const entry: Open = { name, kind: opts.kind ?? 'flow', over: opts.over, close };
  shutNamed(closeOnOpen(stack, entry));
  stack.push(entry);
  return () => shut(entry);
}

/** Back to a place (the home screen, the spire's map): every flow screen still open is closed. */
export function closeFinished(): void {
  shutNamed(closeOnPlace(stack));
}

/** The open screens, bottom first (for the checks: `window.__screens()`). */
export const openScreens = (): string[] => stack.map((e) => e.name);
