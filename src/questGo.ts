// The "Take me there" button shared by the quest log and the Eidolons tab (UI batch 1): a tap goes to where the goal is done
// (`sim/questGoto.ts` says where; the page, `home.ts`, takes it from there).

import type { Destination } from './sim/questGoto';

/** The button for a goal's destination; `hooks.goTo` does the going. */
export function takeMeThere(title: string, dest: Destination, hooks: { goTo?(dest: Destination): void }): HTMLButtonElement {
  const go = document.createElement('button');
  go.className = 'primary qlGoto';
  go.textContent = 'Take me there';
  go.setAttribute('aria-label', `Take me there: ${title}`);
  go.addEventListener('click', () => hooks.goTo?.(dest));
  return go;
}
