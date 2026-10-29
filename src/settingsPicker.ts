// A pick-one sheet for Settings (the owner's ask: the rulers open as a menu on a tap, not laid out in the page). Settings
// shows one compact row with the current choice; its button opens this sheet over the page, listing every option. Picking
// one, the ✕, a tap on the dimmed backdrop or Escape closes it. The overlay is hidden with the `hidden` attribute, and the
// CSS keeps `[hidden]` as display: none (the trophy wall's bug was its own `display: flex` beating `hidden`).

export interface PickerOption {
  /** What is saved when it is picked. */
  id: string;
  /** The option's button, filled by the caller (portrait, name, title...). */
  fill: (b: HTMLButtonElement) => void;
  /** Whether this is the current choice (pressed, and focused on opening). */
  on: boolean;
  /** Shown but not pickable (a costume still locked). */
  locked?: boolean;
  /** The button's own class, for the option's look (`rulerChoice`, `costumeChoice`). */
  className: string;
}

export interface PickerSpec {
  title: string;
  hint?: string;
  /** The class of the list (`rulerChoices`: the two-column grid of portraits). */
  listClass: string;
  options: readonly PickerOption[];
  onPick: (id: string) => void;
}

let overlay: HTMLDivElement | null = null;
let returnFocus: HTMLElement | null = null;

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault();
    closePicker();
  }
}

/** Closes the sheet if it is open (also called when Settings closes, so it never outlives the page). */
export function closePicker(): void {
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  overlay.replaceChildren();
  document.removeEventListener('keydown', onKey);
  const back = returnFocus;
  returnFocus = null;
  if (back?.isConnected) back.focus();
}

/** Whether the sheet is up (for checks). */
export const pickerOpen = (): boolean => !!overlay && !overlay.hidden;

/** Opens the sheet over `host` (the settings page), listing `spec`'s options. */
export function openPicker(host: HTMLElement, spec: PickerSpec, opener?: HTMLElement): void {
  closePicker();
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'spOverlay';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    // (a tap on the dimmed backdrop, not the card, closes it)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePicker();
    });
  }
  if (overlay.parentElement !== host) host.append(overlay);
  returnFocus = opener ?? null;

  const card = document.createElement('div');
  card.className = 'spCard';
  const header = document.createElement('header');
  const h = document.createElement('h3');
  h.id = 'spTitle';
  h.textContent = spec.title;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'spClose';
  close.textContent = '✕';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', closePicker);
  header.append(h, close);
  card.append(header);
  if (spec.hint) {
    const p = document.createElement('p');
    p.className = 'spHint';
    p.textContent = spec.hint;
    card.append(p);
  }
  const list = document.createElement('div');
  list.className = `spList ${spec.listClass}`;
  let current: HTMLButtonElement | null = null;
  for (const o of spec.options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = o.className;
    b.classList.toggle('on', o.on);
    b.classList.toggle('locked', !!o.locked);
    b.setAttribute('aria-pressed', String(o.on));
    if (o.locked) b.setAttribute('aria-disabled', 'true');
    o.fill(b);
    b.addEventListener('click', () => {
      if (o.locked) return;
      closePicker();
      spec.onPick(o.id);
    });
    if (o.on) current = b;
    list.append(b);
  }
  card.append(list);
  overlay.setAttribute('aria-labelledby', 'spTitle');
  overlay.replaceChildren(card);
  overlay.hidden = false;
  document.addEventListener('keydown', onKey);
  (current ?? close).focus({ preventScroll: true });
  current?.scrollIntoView({ block: 'nearest' });
}
