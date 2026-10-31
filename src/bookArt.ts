// The skill books' covers on the page (docs/notes/shop-books-gear.md): each kind's painted cover (a Common or an Uncommon the kind's
// plain cover, a Rare its rich one) inside the gear's grade frame for its rarity, so books and gear speak one colour language. The
// paintings load by URL (`shop/...`, tools/shop/import-shop-art.py; build.mjs keeps them for offline play).

import { RARITY_GRADE, type BookDef } from './sim/bookData';
import { paintGradeFrame } from './gearIcons';
import { warmIcon } from './menuArt';

/** The cover painting of a book. */
export function bookCoverUrl(b: BookDef): string {
  const rich = b.rarity === 'rare' || b.rarity === 'legendary' || b.kind === 'universal';
  return `shop/book-${b.kind}-${rich ? 'rare' : 'common'}.webp`;
}

/** A shop painting's url (`name` without the extension), warmed so it shows at once. */
export function shopArt(name: string): string {
  const url = `shop/${name}.webp`;
  warmIcon(url);
  return url;
}

/** A book's icon: its cover in its grade's frame, `px` across (an `.eqIcon`, as the gear's). */
export function bookIcon(b: BookDef, px = 64): HTMLElement {
  const box = document.createElement('span');
  box.className = 'eqIcon bookIcon';
  box.style.width = box.style.height = `${px}px`;
  const art = document.createElement('i');
  art.style.backgroundImage = `url(${bookCoverUrl(b)})`;
  art.style.backgroundSize = 'contain';
  art.style.backgroundPosition = 'center';
  paintGradeFrame(box, RARITY_GRADE[b.rarity], px, art);
  return box;
}
