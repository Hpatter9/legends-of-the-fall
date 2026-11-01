// The hero sheet's Skill book panel (SHOP-BOOKS-GEAR, docs/notes/shop-books-gear.md): the three skill slots and what sits in them (a
// tap opens the picker of every skill the hero knows), the book it is studying with the fights left, and "Read a book" (the unread
// books in the bag this hero could read). The rules are `src/sim/books.ts`; this only changes the meta through them.

import { bookIcon, shopArt } from './bookArt';
import { play } from './render/sound';
import { bookById } from './sim/bookData';
import { HERO_KITS, SLOT_LEVELS } from './sim/heroKits';
import { heroName } from './sim/heroNames';
import { levelOfKind } from './sim/levels';
import { saveMeta, type Meta } from './sim/meta';
import { OWN1, OWN2, OWN3, knownPicks, loadoutOf, pickName, readableNow, setSlot, slotFor, startStudy, stopStudy, studentCap, students, studyLeft, studyLength, type SkillPick } from './sim/books';
import { keyOf } from './sim/abilities';
import { levelLine, useOf } from './sim/skillLevels';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Where a pick comes from, in words: "own skill 1", or the book's title. */
const pickFrom = (pick: SkillPick): string => (pick === OWN1 ? 'Own skill 1' : pick === OWN2 ? 'Own skill 2' : pick === OWN3 ? 'Own skill 3' : `Learned · ${bookById(pick)?.title ?? ''}`);

/** The Skill book panel for an owned hero kind. `changed` redraws the sheet after a change (the skill cards follow the slots). */
export function drawSkillBook(meta: Meta, kind: string, changed: () => void): HTMLElement {
  const panel = el('div', 'kbPanel');
  const commit = (): void => {
    saveMeta(meta);
    play('tap');
    changed();
  };
  const own = HERO_KITS()[kind];

  const overview = (): void => {
    panel.replaceChildren(el('h4', '', 'Skill book'));
    const l = loadoutOf(meta, kind);
    const slots = el('div', 'kbSlots');
    ([1, 2, 3] as const).slice(0, l.length).forEach((n) => {
      const pick = l[n - 1];
      const b = el('button', 'kbSlot');
      b.type = 'button';
      const book = bookById(pick);
      if (book) b.append(bookIcon(book, 40));
      else b.append(el('span', 'kbOwn', String(n)));
      const words = el('span', 'kbWords');
      words.append(el('small', '', `Skill ${n}${levelOfKind(meta, kind) < SLOT_LEVELS[n - 1] ? ` · opens at level ${SLOT_LEVELS[n - 1]}` : ''}`), el('b', '', pickName(kind, pick)), el('small', '', pickFrom(pick)));
      b.append(words);
      b.setAttribute('aria-label', `Skill ${n}: ${pickName(kind, pick)}. Choose a skill`);
      b.addEventListener('click', () => picker(n));
      slots.append(b);
    });
    panel.append(slots);
    // (the study: the book in hand and the fights left, or the books in the bag this hero could start)
    const s = meta.study?.[kind];
    const book = s && bookById(s.book);
    if (s && book) {
      const left = studyLeft(meta, kind) ?? 0;
      const len = studyLength(book, meta.castle.library);
      const row = el('div', 'kbStudy');
      const ico = el('img', 'kbStudyIco');
      ico.src = shopArt('studying');
      ico.alt = '';
      const words = el('div', 'kbWords');
      words.append(el('b', '', `Studying: ${pickName(kind, book.id)} · ${left} fight${left === 1 ? '' : 's'} left`), el('small', '', `${book.title}. Each wave ${heroName(kind)} fights in is a fight of study.`));
      const bar = el('i', 'kbBar');
      const fill = el('b');
      fill.style.width = `${Math.round(((len - left) / len) * 100)}%`;
      bar.append(fill);
      words.append(bar);
      const stop = el('button', '', 'Put it down');
      stop.type = 'button';
      stop.addEventListener('click', () => {
        stopStudy(meta, kind);
        commit();
      });
      row.append(ico, words, stop);
      panel.append(row);
    }
    const can = readableNow(meta, kind);
    const read = el('button', 'kbRead', s ? 'Read another book' : 'Read a book');
    read.type = 'button';
    read.disabled = !can.length;
    read.addEventListener('click', reader);
    panel.append(read);
    if (!can.length) panel.append(el('small', 'eqDim', 'No unread book this hero can read. Hester’s Stall sells them; Rare books are found in chests.'));
  };

  /** The picker: every skill the hero knows, its own first, and which slot each goes in. */
  const picker = (n: 1 | 2 | 3): void => {
    panel.replaceChildren(el('h4', '', `Skill ${n} · ${heroName(kind)}`));
    const l = loadoutOf(meta, kind);
    const list = el('div', 'kbList');
    for (const pick of knownPicks(meta, kind)) {
      const slot = slotFor(kind, pick);
      if (!slot) continue;
      const row = el('div', `kbRow${l[n - 1] === pick ? ' on' : ''}`);
      const book = bookById(pick);
      if (book) row.append(bookIcon(book, 44));
      const words = el('div', 'kbWords');
      // (the skills overhaul's batch 5: a skill keeps its level by use wherever it sits)
      words.append(el('b', '', slot.skill.name), el('small', '', `${pickFrom(pick)} · ${Math.round(slot.cost)} ${own?.pool ?? ''} · ${Math.round(slot.cd / 1000)} s · ${levelLine(useOf(meta, kind, keyOf(slot.skill)))}`), el('p', '', slot.skill.text));
      const where = l.indexOf(pick);
      if (where >= 0) words.append(el('small', 'kbIn', `In use as skill ${where + 1}`));
      // (a healer's revive belongs to its own skill 2: swapping it out loses the revive, and the picker says so)
      if (pick === OWN2 && own?.s2.revive) words.append(el('small', 'kbWarn', `${heroName(kind)} can raise the fallen only with ${own.s2.skill.name} in skill 2.`));
      row.append(words);
      if (l[n - 1] !== pick) {
        const use = el('button', 'primary', `Use as skill ${n}`);
        use.type = 'button';
        use.addEventListener('click', () => {
          if (setSlot(meta, kind, n, pick)) commit();
        });
        row.append(use);
      }
      list.append(row);
    }
    panel.append(list, el('small', 'eqDim', 'Swap skills at camp as often as you like: nothing learned is ever forgotten. A skill keeps its level wherever it sits. The ultimate stays as it is.'));
    const back = el('button', '', 'Back');
    back.type = 'button';
    back.addEventListener('click', overview);
    panel.append(back);
  };

  /** "Read a book": the unread books this hero could start, and the library's room for students. */
  const reader = (): void => {
    panel.replaceChildren(el('h4', '', `Read a book · ${heroName(kind)}`));
    const cap = studentCap(meta.castle.library);
    const reading = students(meta).filter((k) => k !== kind);
    const full = reading.length >= cap && !meta.study?.[kind];
    panel.append(el('small', 'eqDim', full ? `The library has room for ${cap} student${cap === 1 ? '' : 's'}: ${reading.map(heroName).join(' and ')} ${reading.length === 1 ? 'is' : 'are'} reading. Build the Library up for more.` : `${reading.length + (meta.study?.[kind] ? 1 : 0)} of ${cap} studying. A book put down keeps its progress.`));
    const list = el('div', 'kbList');
    for (const book of readableNow(meta, kind)) {
      const row = el('div', 'kbRow');
      const words = el('div', 'kbWords');
      const len = studyLength(book, meta.castle.library);
      const kept = meta.studyKept?.[kind]?.[book.id] ?? 0;
      words.append(el('b', '', book.title), el('small', '', `Teaches ${pickName(kind, book.id)} · ${len - kept} fights${kept ? ` (${kept} done)` : ''}`), el('p', 'kbHistory', book.history));
      const go = el('button', 'primary', 'Read');
      go.type = 'button';
      go.disabled = full;
      go.addEventListener('click', () => {
        if (startStudy(meta, kind, book.id)) commit();
      });
      row.append(bookIcon(book, 44), words, go);
      list.append(row);
    }
    const back = el('button', '', 'Back');
    back.type = 'button';
    back.addEventListener('click', overview);
    panel.append(list, back);
  };

  overview();
  return panel;
}
