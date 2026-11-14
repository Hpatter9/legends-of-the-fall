// RELEASE-AUDIT (docs/notes/release-audit-code.md): the mana box's Decree words are refreshed every frame of a fight (`decreeHud.ts`), and
// each write, of the same words or not, makes the browser look at the page's styles again. They are written only when they change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshDecree } from '../src/decreeHud';
import { DECREE_FULL } from '../src/sim/decrees';
import type { Battle } from '../src/sim/battle';

/** A stand-in for the mana box: counts the writes of its title and attributes. */
function fakeBox() {
  const attrs = new Map<string, string>();
  let title = '';
  const box = {
    writes: 0,
    classList: { toggle: () => true },
    querySelector: () => ({ style: { width: '' } }),
    get title() {
      return title;
    },
    set title(v: string) {
      box.writes++;
      title = v;
    },
    getAttribute: (k: string) => attrs.get(k) ?? null,
    setAttribute: (k: string, v: string) => {
      box.writes++;
      attrs.set(k, v);
    },
  };
  return box;
}

test('the Decree box writes its words once, not every frame, and again when they change', () => {
  const b = { phase: 'fight', spells: { decree: { id: 'standFast', used: false, fill: 0 } } } as unknown as Battle;
  const box = fakeBox();
  refreshDecree(box as unknown as HTMLElement, b);
  const first = box.writes;
  assert.equal(first, 3, 'the title, the role and the label, once');
  for (let i = 0; i < 30; i++) refreshDecree(box as unknown as HTMLElement, b);
  assert.equal(box.writes, first, 'thirty frames of the same words: nothing written');
  b.spells.decree!.fill = DECREE_FULL;
  refreshDecree(box as unknown as HTMLElement, b);
  assert.equal(box.writes, first + 3, 'ready: the title, the role and the label change');
  assert.equal(box.getAttribute('role'), 'button');
  assert.equal(box.getAttribute('aria-label'), 'Cast Stand Fast');
});
