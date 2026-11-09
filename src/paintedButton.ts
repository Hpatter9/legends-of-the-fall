// PAINTED-BUTTONS (docs/notes/painted-buttons.md): the owner's painted buttons, one shared piece. The owner's ask: "The code drawn and
// created ones just don't look good." The nine sheets in art-source/ui/buttons/ (PR #468) are cut by tools/painted-buttons/cut.py into
// src/art/ui/buttons/, served as ui/buttons/<name>.webp and cached for offline by the service worker (build.mjs).
//
// Two kinds of painting:
// - medallions: a brass ring with a picture (settings, crowns, the tab icons, the camp's places, the fight's controls, the tavern's
//   services, the menu glyphs). `medal` is the picture as an <img>; `medallionButton` a round button made of one.
// - plates: nine-slice brass frames (`paintedButtons.css` draws them with border-image): a text button (primary, secondary or danger, each
//   with its pressed and disabled plate), a choice row, a chip, a tab plate, a camp plaque and the switch.
// Plain DOM, no Pixi and no game rules, so the tests can import the names. The standard ornate menu (`ornateMenu.ts`) picks the plates up
// from `paintedButtons.css` by its own classes; nothing here has to be called for a menu to be painted.

/** The painted pictures, by sheet: each is a file ui/buttons/<name>.webp. */
export const PB_ICONS = {
  topBar: ['settings', 'achievements', 'spring', 'summer', 'autumn', 'winter', 'crowns', 'stones', 'gold', 'sound-on', 'sound-off', 'speed-1', 'speed-2', 'speed-3', 'lives', 'clock'],
  tabs: ['tab-recruit', 'tab-heroes', 'tab-battle', 'tab-castle', 'tab-spells', 'tab-recruit-lit', 'tab-heroes-lit', 'tab-battle-lit', 'tab-castle-lit', 'tab-spells-lit', 'badge-new', 'badge-quest', 'badge-shop', 'lock', 'badge-count', 'ready-ring'],
  camp: ['daily', 'assault', 'council', 'march-orders', 'tavern', 'spells', 'march', 'trophies', 'continue', 'choose-battle', 'quest', 'armies', 'coin', 'sword', 'heart', 'home'],
  fight: ['autocast', 'autocast-lit', 'form-wall', 'form-wedge', 'form-square', 'form-spread', 'horn', 'horn-lit', 'orb-gold', 'orb-bronze', 'orb-lit', 'orb-silver', 'ultimate', 'mana', 'formations', 'stop'],
  actions: ['hire', 'satchel', 'auto-place', 'fight', 'auto-merge', 'auto-pick', 'march-battle', 'next-stage', 'leave', 'reveal-all', 'return', 'retain', 'recycle', 'pull-1', 'pull-10', 'skip'],
  tavern: ['all-heroes', 'gwen', 'upgrades', 'quests', 'hester', 'elders', 'quest-board', 'tav-trophies', 'stall-books', 'stall-gear', 'stall-tomes', 'stall-chests', 'stall-sell', 'stall-repair', 'stall-enchant', 'stall-caravan'],
  glyphs: ['g-back', 'g-close', 'g-right', 'g-plus', 'g-minus', 'g-lock', 'g-star', 'g-star-empty', 'g-tick', 'g-cross', 'g-info', 'g-search', 'g-up', 'g-down', 'g-alert', 'g-help'],
} as const;
export type PbIcon = (typeof PB_ICONS)[keyof typeof PB_ICONS][number];

/** The plates (nine-slice, each with its states). */
export const PB_PLATES = ['plate-primary', 'plate-primary-down', 'plate-primary-off', 'plate-secondary', 'plate-secondary-down', 'plate-secondary-off', 'plate-danger', 'plate-danger-down', 'plate-danger-off', 'plate-choice', 'plate-choice-on', 'plate-choice-locked', 'chip', 'chip-lit', 'chip-warn', 'tabplate', 'tabplate-lit', 'tabplate-down', 'plaque', 'plaque-ready', 'plaque-locked', 'switch-off', 'switch-on', 'switch-off-dim'] as const;

/** Every class this module puts on the page: each is styled in `paintedButtons.css` (test/painted-buttons.test.ts checks it). */
export const PB_CLASSES = ['pbMedal', 'pbIco', 'pbBadge', 'pbPlate', 'pbPrimary', 'pbSecondary', 'pbDanger', 'pbChip', 'pbTab', 'pbPlaque', 'pbSwitch', 'pbChoice', 'pbWord', 'pbGlyph', 'lit', 'on', 'locked', 'warn', 'ready'] as const;

/** The file of a painted picture or plate. */
export const pbUrl = (name: PbIcon | (typeof PB_PLATES)[number]): string => `ui/buttons/${name}.webp`;

/** The season's medallion. */
export const SEASON_MEDAL: Readonly<Record<'spring' | 'summer' | 'autumn' | 'winter', PbIcon>> = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };

/** The fight's speed medallion for ×1, ×2 or ×3 (anything faster shows three). */
export const speedMedal = (speed: number): PbIcon => (speed <= 1 ? 'speed-1' : speed <= 2 ? 'speed-2' : 'speed-3');

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A painted picture as an <img> (decorative: the button it sits in carries the words). */
export function medal(name: PbIcon, cls = 'pbIco'): HTMLImageElement {
  const im = el('img', cls);
  im.src = pbUrl(name);
  im.alt = '';
  im.draggable = false;
  im.decoding = 'async';
  im.setAttribute('aria-hidden', 'true');
  return im;
}

/** Swap a painted <img>'s picture (only when it changes, so it never blinks). */
export function setMedal(im: HTMLImageElement, name: PbIcon): void {
  const url = pbUrl(name);
  if (im.getAttribute('src') !== url) im.src = url;
}

export interface MedallionOptions {
  icon: PbIcon;
  /** The spoken name (the button shows no words). */
  label: string;
  /** The lit picture, shown while `.lit` is on (the tabs' lit icons, the lit war horn and auto-cast). */
  litIcon?: PbIcon;
  lit?: boolean;
  cls?: string;
  onClick?: () => void;
}

/** A round painted button: the medallion, a lit picture if it has one, and a badge slot (`setBadge`). At least 44 px, by the CSS. */
export function medallionButton(o: MedallionOptions): HTMLButtonElement {
  const b = el('button', `pbMedal${o.cls ? ` ${o.cls}` : ''}`);
  b.type = 'button';
  b.setAttribute('aria-label', o.label);
  b.append(medal(o.icon));
  if (o.litIcon) b.append(medal(o.litIcon, 'pbIco lit'));
  if (o.lit) b.classList.add('lit');
  if (o.onClick) b.addEventListener('click', o.onClick);
  return b;
}

/** Light a medallion (its lit picture, if it has one, shows in place of the plain one) and say so to a reader. */
export function setLit(b: HTMLElement, lit: boolean): void {
  b.classList.toggle('lit', lit);
  if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(lit));
}

/** The badge on a medallion or tab: a red pip ('new'), a count seal with a number, the quest seal or Hester's coin; null takes it off. */
export function setBadge(b: HTMLElement, badge: { kind: 'new' | 'count' | 'quest' | 'shop'; n?: number } | null): void {
  let i = b.querySelector<HTMLElement>(':scope > .pbBadge');
  if (!badge) {
    i?.remove();
    return;
  }
  if (!i) {
    i = el('i', 'pbBadge');
    i.setAttribute('aria-hidden', 'true');
    b.append(i);
  }
  i.dataset.kind = badge.kind;
  i.textContent = badge.kind === 'count' && badge.n ? String(Math.min(badge.n, 99)) : '';
}

export type PlateKind = 'primary' | 'secondary' | 'danger';
const PLATE_CLASS: Readonly<Record<PlateKind, string>> = { primary: 'pbPrimary', secondary: 'pbSecondary', danger: 'pbDanger' };

export interface PlateOptions {
  label: string;
  kind?: PlateKind;
  /** A medallion before the word. */
  icon?: PbIcon;
  disabled?: boolean;
  cls?: string;
  onClick?: () => void;
}

/** A painted text button: the word on a brass plate (primary amber, secondary slate-green, danger oxblood), pressed and disabled plates
 *  from the sheet's other columns. */
export function plateButton(o: PlateOptions): HTMLButtonElement {
  const kind = o.kind ?? 'secondary';
  const b = el('button', `pbPlate ${PLATE_CLASS[kind]}${kind === 'primary' ? ' primary' : kind === 'danger' ? ' danger' : ''}${o.cls ? ` ${o.cls}` : ''}`);
  b.type = 'button';
  if (o.icon) b.append(medal(o.icon));
  b.append(el('span', 'pbWord', o.label));
  b.disabled = !!o.disabled;
  if (o.onClick) b.addEventListener('click', o.onClick);
  return b;
}

/** A chip: a count (crowns, stones, gold) on the brass well, its medallion at the left end. `warn` reddens it, `lit` brightens it. */
export function chip(icon: PbIcon, text: string, label: string, state?: 'lit' | 'warn'): HTMLElement {
  const c = el('div', `pbChip${state ? ` ${state}` : ''}`);
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', label);
  c.append(medal(icon), el('b', '', text));
  return c;
}

/** A tab plate (a bottom tab, or a tab of a page): the brass lip over the field, lit when chosen. */
export function tabPlate(label: string, icon: PbIcon | undefined, on: boolean, onClick: () => void): HTMLButtonElement {
  const b = el('button', `pbTab${on ? ' on' : ''}`);
  b.type = 'button';
  if (icon) b.append(medal(icon));
  b.append(el('span', 'pbWord', label));
  b.addEventListener('click', onClick);
  return b;
}

/** A camp plaque: a place's name in the arched brass-and-wood frame (ready lights it, locked dulls it). */
export function plaque(title: string, line: string, state?: 'ready' | 'locked'): HTMLElement {
  const p = el('span', `pbPlaque${state ? ` ${state}` : ''}`);
  p.append(el('b', '', title));
  if (line) p.append(el('small', '', line));
  return p;
}

/** The painted switch: off (knob left, slate) and on (knob right, green), dulled when disabled. A role="switch" button. */
export function paintedSwitch(label: string, on: boolean, change: (on: boolean) => void, disabled = false): HTMLButtonElement {
  const b = el('button', `pbSwitch${on ? ' on' : ''}`);
  b.type = 'button';
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-checked', String(on));
  b.setAttribute('aria-label', label);
  b.disabled = disabled;
  b.addEventListener('click', () => {
    const now = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(now));
    b.classList.toggle('on', now);
    change(now);
  });
  return b;
}

/** A choice row: the dim plate, the gilt green one when chosen, the dark one when locked. */
export function choiceRow(title: string, line: string, state: 'on' | 'locked' | undefined, onPick: () => void): HTMLButtonElement {
  const b = el('button', `pbChoice${state ? ` ${state}` : ''}`);
  b.type = 'button';
  b.append(el('b', '', title));
  if (line) b.append(el('small', '', line));
  b.disabled = state === 'locked';
  b.addEventListener('click', onPick);
  return b;
}
