// A class trait's painted sigil, from the release sheet of thirteen (`src/art/release/class-sigils.webp`, the summoning's tarot wears them
// too, `summonTarot.ts`): ARMY-WEAKNESS's War Room card, deploy chip and codex line show the classes an army is weak to and resists by them.

import sigilsUrl from './art/release/class-sigils.webp';
import { CLASS_SIGIL_ORDER } from './classSigilOrder';

/** A class's sigil, `px` square, with its name for a screen reader. */
export function classSigil(trait: string, px = 22): HTMLElement {
  const i = Math.max(0, CLASS_SIGIL_ORDER.indexOf(trait));
  const s = document.createElement('i');
  s.className = 'classSigil';
  s.setAttribute('aria-hidden', 'true');
  s.style.cssText = `width:${px}px;height:${px}px;background-image:url(${sigilsUrl});background-size:${CLASS_SIGIL_ORDER.length * 100}% 100%;background-position-x:${(i / (CLASS_SIGIL_ORDER.length - 1)) * 100}%`;
  return s;
}
