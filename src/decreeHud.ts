// The Decree's place in a fight's HUD (KING-SPELLS batch 2, docs/notes/king-spells-b2.md). There is no room for another orb on a 360 px phone
// (the mana, the orbs, the War Horn and the Auto switch already fill the row), so the mana box carries it: a thin gold bar under the mana fills
// as the Decree's meter does, and once it is full the box glows gold, reads DECREE and casts it on a tap. The main fight screen (`main.ts`) and
// the Last Stand (`standView.ts`) both use it.

import { castDecree, DECREE_FULL, DECREES, decreeReady, type DecreeId } from './sim/decrees';
import type { Battle } from './sim/battle';

/** Give a mana box its Decree bar and tap. `battle()` is the fight now; `cast()` is told when a Decree went off. */
export function bindDecree(box: HTMLElement, battle: () => Battle | null | undefined, cast: () => void = () => {}): void {
  if (!box.querySelector('.decreeBar')) box.insertAdjacentHTML('beforeend', '<s class="decreeBar" aria-hidden="true"><span></span></s>');
  box.addEventListener('click', () => {
    const b = battle();
    if (b && castDecree(b)) cast();
  });
}

/** Each refresh: the bar's fill, and the box's ready state and words. */
export function refreshDecree(box: HTMLElement, b: Battle): void {
  const d = b.spells.decree;
  box.classList.toggle('hasDecree', !!d && !d.used);
  const ready = decreeReady(b);
  box.classList.toggle('decreeReady', ready);
  const bar = box.querySelector<HTMLElement>('.decreeBar span');
  if (bar) bar.style.width = `${d && !d.used ? (d.fill / DECREE_FULL) * 100 : 0}%`;
  const name = d ? DECREES[d.id as DecreeId].name : '';
  box.title = !d ? '' : d.used ? `${name}: cast this fight` : ready ? `${name}: tap to cast your Decree` : `${name}: the Decree fills from spare mana and the spells you cast`;
  box.setAttribute('role', ready ? 'button' : 'group');
  box.setAttribute('aria-label', ready ? `Cast ${name}` : 'Mana');
}
