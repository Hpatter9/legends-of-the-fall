// The standard ornate menu (UI-STANDARD, docs/notes/ui-standard.md): the one way a card, sheet or menu is built, by the owner's word
// ("all menus are built that way from now on"). It draws the Keep & Kingdom card of `ornateMenus.css`: a veil over the page, the card with
// the double brass rim, a header with the battle crest, an eyebrow and the title over a filigree rule, a body of sections (a brass heading,
// then gilded choice rows or slate wells), and a footer with "‹ Back" (a full page) or "Close" (a card) and the primary button.
// Plain DOM: no Pixi, no game rules; the caller fills the body and decides what the buttons do. `ornateMenus.css` holds every class named
// here (`OM_CLASSES`; test/ui-standard.test.ts checks it, and that new dialogs are built with this).

import { glyphWord } from './paintedButton';

/** Every class this module puts on the page: each is styled in `ornateMenus.css` (section 24). */
export const OM_CLASSES = ['omVeil', 'omSheet', 'omDrawer', 'om', 'omHead', 'omCrest', 'omEyebrow', 'omTitle', 'omSub', 'omRule', 'omBody', 'omSection', 'omSectionHead', 'omGrid', 'omChoice', 'omIco', 'omLine', 'omPay', 'omLock', 'omWell', 'omNote', 'omFoot', 'omBack', 'omPrimary'] as const;

export interface MenuOptions {
  /** The page id of the veil (one menu of a kind at a time: an open one with the same id is closed first). */
  id: string;
  title: string;
  /** The small capitals over the title ("The War Council", "The Mage Tower"). */
  eyebrow?: string;
  /** A line under the title. */
  sub?: string;
  /** 'card' (default): centred, a pop-up over the page. 'sheet': rises from the foot of the screen, tall. 'drawer': slides up from the
   *  foot of the screen and stops short, so the page above it (Hester and her shelf) stays in sight; the full dress all the same. */
  kind?: 'card' | 'sheet' | 'drawer';
  /** Spoken name of the dialog (the title if left out). */
  label?: string;
  /** Called once the menu has gone, however it went (its own buttons, Escape, or `close`). */
  onClose?: () => void;
}

export interface OrnateMenu {
  /** The veil: the page layer the menu sits in. */
  root: HTMLElement;
  /** The card itself. */
  card: HTMLElement;
  /** The body, for the caller's sections. */
  body: HTMLElement;
  /** The footer (filled by `menuFoot`). */
  foot: HTMLElement;
  /** Take the menu away (runs `onClose` once). */
  close(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** Build a menu and put it on the page. Fill `body` with `menuSection`, `menuChoice`, `menuWell` and `menuNote`; end with `menuFoot`. */
export function ornateMenu(o: MenuOptions): OrnateMenu {
  document.getElementById(o.id)?.dispatchEvent(new Event('omclose'));
  document.getElementById(o.id)?.remove();
  const root = el('div', `omVeil${o.kind === 'sheet' ? ' omSheet' : o.kind === 'drawer' ? ' omDrawer' : ''}`);
  root.id = o.id;
  const card = el('div', 'om');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', o.label ?? o.title);
  const head = el('header', 'omHead');
  head.append(el('span', 'omCrest'));
  if (o.eyebrow) head.append(el('small', 'omEyebrow', o.eyebrow));
  head.append(el('h2', 'omTitle', o.title));
  if (o.sub) head.append(el('p', 'omSub', o.sub));
  head.append(el('i', 'omRule'));
  const body = el('div', 'omBody');
  const foot = el('footer', 'omFoot');
  card.append(head, body, foot);
  root.append(card);
  let gone = false;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  const close = () => {
    if (gone) return;
    gone = true;
    document.removeEventListener('keydown', onKey);
    root.remove();
    o.onClose?.();
  };
  root.addEventListener('omclose', close);
  document.addEventListener('keydown', onKey);
  document.body.append(root);
  return { root, card, body, foot, close };
}

/** Change the header's title and line (a second step of the same menu, as the scouts' report). */
export function menuTitle(menu: OrnateMenu, title: string, sub?: string): void {
  menu.card.querySelector('.omTitle')!.textContent = title;
  const s = menu.card.querySelector('.omSub');
  if (s) s.textContent = sub ?? '';
}

/** A section of the body: a brass heading with its line, then a grid for the section's choices (`cols` across: 4 is for short rows, as
 *  the Auto card's counts, and holds at every phone width). Returns the grid. */
export function menuSection(parent: HTMLElement, title?: string, line?: string, cols: 2 | 3 | 4 = 3): HTMLElement {
  const sec = el('section', 'omSection');
  if (title) {
    const h = el('h3', 'omSectionHead', title);
    if (line) h.append(el('small', '', line));
    sec.append(h);
  }
  const grid = el('div', 'omGrid');
  grid.dataset.cols = String(cols);
  sec.append(grid);
  parent.append(sec);
  return grid;
}

export interface ChoiceOptions {
  title: string;
  icon?: string;
  /** Lines under the title: plain, or 'pay' (a reward, green) or 'lock' (what opens it). */
  lines?: (string | [string, 'pay' | 'lock'])[];
  on?: boolean;
  disabled?: boolean;
  onPick?: () => void;
}

/** A gilded choice row (one of a section's options); `.on` is the chosen one. */
export function menuChoice(parent: HTMLElement, c: ChoiceOptions): HTMLButtonElement {
  const b = el('button', `omChoice${c.on ? ' on' : ''}`);
  b.type = 'button';
  b.disabled = !!c.disabled;
  if (c.icon) b.append(el('span', 'omIco', c.icon));
  b.append(el('b', '', c.title));
  for (const l of c.lines ?? []) {
    const [text, kind] = typeof l === 'string' ? [l, ''] : l;
    b.append(el('small', `omLine${kind === 'pay' ? ' omPay' : kind === 'lock' ? ' omLock' : ''}`, text));
  }
  if (c.onPick) b.addEventListener('click', c.onPick);
  parent.append(b);
  return b;
}

/** One of a set: a choice row per item, the current one gilded; a tap moves the gilt and tells `pick`. */
export function menuPick<T>(parent: HTMLElement, items: readonly T[], current: T | undefined, row: (item: T) => Omit<ChoiceOptions, 'on' | 'onPick'>, pick: (item: T) => void): HTMLButtonElement[] {
  const rows: HTMLButtonElement[] = [];
  for (const item of items) {
    const b = menuChoice(parent, {
      ...row(item),
      on: item === current,
      onPick: () => {
        for (const x of rows) x.classList.toggle('on', x === b);
        pick(item);
      },
    });
    rows.push(b);
  }
  return rows;
}

/** A slate well: a sunk panel for a report, a list or a note. */
export function menuWell(parent: HTMLElement): HTMLElement {
  const w = el('div', 'omWell');
  parent.append(w);
  return w;
}

/** A small line of the body's own (a hint, what a choice will do). */
export function menuNote(parent: HTMLElement, text = ''): HTMLElement {
  const p = el('p', 'omNote', text);
  parent.append(p);
  return p;
}

export interface FootOptions {
  /** The way out: 'back' says "‹ Back" (a full page), 'close' says "Close" (a card), or a word of its own ("Keep the loadout"). */
  back?: { word: 'back' | 'close' | string; onClick?: () => void };
  primary?: { label: string; onClick: () => void; disabled?: boolean };
}

/** The footer: the way out on the left, the primary button on the right. The way out closes the menu unless `onClick` says otherwise. */
export function menuFoot(menu: OrnateMenu, f: FootOptions): { back?: HTMLButtonElement; primary?: HTMLButtonElement } {
  menu.foot.replaceChildren();
  const out: { back?: HTMLButtonElement; primary?: HTMLButtonElement } = {};
  if (f.back) {
    const word = f.back.word === 'back' ? '‹ Back' : f.back.word === 'close' ? 'Close' : f.back.word;
    const b = el('button', 'omBack', word);
    b.type = 'button';
    // (PAINTED-BUTTONS: "‹ Back" and "Close" wear the painted back chevron and close glyph before their word, on the slate plate)
    glyphWord(b);
    b.addEventListener('click', f.back.onClick ?? menu.close);
    menu.foot.append(b);
    out.back = b;
  }
  if (f.primary) {
    const p = el('button', 'primary omPrimary', f.primary.label);
    p.type = 'button';
    p.disabled = !!f.primary.disabled;
    p.addEventListener('click', f.primary.onClick);
    menu.foot.append(p);
    out.primary = p;
  }
  return out;
}
