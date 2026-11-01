// MENU-GLITCH: the page's ghost-click guard. A tap's click that lands on a panel the same tap opened (on pointerup, before the click
// is aimed) is swallowed, so a tap opens a panel without also pressing what of it was under the finger. The rule is in
// `tapGuardRules.ts`. A label's click on its control, and a click with no tap before it, pass.

import { isGhostClick } from './tapGuardRules';

let down: Node | null = null;
let upAt = -Infinity;

export function installTapGuard(): void {
  addEventListener('pointerdown', (e) => {
    down = e.target instanceof Node ? e.target : null;
    upAt = Infinity;
  }, true);
  addEventListener('pointerup', () => (upAt = performance.now()), true);
  addEventListener('pointercancel', () => (down = null), true);
  addEventListener('click', (e) => {
    const t = e.target instanceof Node ? e.target : null;
    const was = down;
    down = null;
    if (!e.isTrusted || !isGhostClick(was, t, performance.now() - upAt)) return;
    // (a label passes its click on to its control: that is the tap's own)
    if (t instanceof HTMLElement && 'labels' in t && [...((t as HTMLInputElement).labels ?? [])].some((l) => was && l.contains(was))) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
}
