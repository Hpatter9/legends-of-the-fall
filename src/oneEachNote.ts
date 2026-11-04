// ONE-OF-EACH's words on the page (`docs/notes/one-of-each.md`): a short note by the finger when a second hero of a kind would go on the
// field ("Natsu is already on the field"). The sim refuses the placement (`placeBlock`'s 'twin'); this only tells the player why.

let hideAt = 0;

/** Show `text` just above the point (x, y) for a moment (a new note replaces the one showing). */
export function twinNote(text: string, x: number, y: number, ms = 2400): void {
  let el = document.getElementById('twinNote');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: 'twinNote', role: 'status' });
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = text;
  el.hidden = false;
  const w = Math.min(260, window.innerWidth - 24);
  el.style.maxWidth = `${w}px`;
  el.style.left = `${Math.round(Math.max(12 + w / 2, Math.min(window.innerWidth - 12 - w / 2, x)))}px`;
  el.style.top = `${Math.round(Math.max(56, y - 120))}px`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  const at = (hideAt = performance.now() + ms);
  setTimeout(() => {
    if (hideAt === at && el) el.hidden = true;
  }, ms);
}

/** The note's words for an original refused while a mirror's clone stands in for it (the owner's call: it sits out for the clone's floors). */
export const sitOutWords = (name: string): string => `${name} sits out while the mirror's clone stands in`;

/** The note's words for a hero of `name` refused because its twin is on the field: dropped on the twin, the two merge (a match) or swap. */
export const twinWords = (name: string, merges: boolean): string => `${name} is already on the field · drop on them to ${merges ? 'merge' : 'swap'}`;
