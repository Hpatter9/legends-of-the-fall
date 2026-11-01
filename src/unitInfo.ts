// The unit's info card on the page (UNIT-INFO, docs/notes/unit-info.md): a press-and-hold on a unit between waves (a deploy, the Last
// Stand's break) opens a sheet over the bottom panel, in the fight's skill-sheet style, with what `unitInfoRules.ts` says about the unit.
// `HoldPress` is the press: a ring fills under the finger (it shows only after a moment, so a tap shows nothing), and a finger that moves
// lets the press go as a drag, as before. The card only reads; it closes on a tap outside it or on its close button.

import { drawCardScores } from './statsPanel';
import { HOLD_MS, RING_DELAY_MS, holdBroken, type MoveInfo, type UnitInfo } from './unitInfoRules';

const reduced = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** A press that turns into a hold: `start` it on pointerdown, feed it `move`, `cancel` it on pointerup; `fire` runs once the finger has
 *  rested `HOLD_MS` without straying. */
export class HoldPress {
  private timer = 0;
  private x = 0;
  private y = 0;
  private ring: HTMLElement;
  /** The last hold fired just now: the pointerup and click after it are not taps. */
  firedAt = -1e9;

  constructor() {
    this.ring = el('div', 'uiRing');
    this.ring.hidden = true;
    this.ring.innerHTML = '<svg viewBox="0 0 60 60" aria-hidden="true"><circle class="bg" cx="30" cy="30" r="25"/><circle class="fill" cx="30" cy="30" r="25"/></svg>';
    document.body.append(this.ring);
    // (a long press on a phone may ask for the page's menu: not while a hold is on)
    window.addEventListener('contextmenu', (e) => {
      if (this.pending || performance.now() - this.firedAt < 800) e.preventDefault();
    });
  }

  get pending(): boolean {
    return this.timer !== 0;
  }

  /** Whether a hold fired within the last moment (the page skips the tap the lifted finger would make). */
  get justFired(): boolean {
    return performance.now() - this.firedAt < 600;
  }

  start(x: number, y: number, fire: () => void): void {
    this.cancel();
    this.x = x;
    this.y = y;
    this.ring.style.transform = `translate(${Math.round(x - 30)}px, ${Math.round(y - 30)}px)`;
    this.ring.style.setProperty('--ui-hold', `${HOLD_MS - RING_DELAY_MS}ms`);
    this.ring.style.setProperty('--ui-delay', `${RING_DELAY_MS}ms`);
    this.ring.classList.toggle('still', reduced());
    // (the ring's fill restarts from empty: the class comes off and back on)
    this.ring.classList.remove('go');
    this.ring.hidden = false;
    void this.ring.offsetWidth;
    this.ring.classList.add('go');
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      this.ring.hidden = true;
      this.firedAt = performance.now();
      fire();
    }, HOLD_MS);
  }

  move(x: number, y: number): void {
    if (this.pending && holdBroken(this.x, this.y, x, y)) this.cancel();
  }

  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = 0;
    this.ring.hidden = true;
    this.ring.classList.remove('go');
  }
}

/** The card over the bottom panel. */
export class UnitInfoCard {
  private sheet: HTMLElement;
  private openedAt = -1e9;

  constructor(private dockTop?: () => number | undefined) {
    this.sheet = el('div', 'fhSheet uiSheet');
    this.sheet.hidden = true;
    this.sheet.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      // (the click the lifted finger makes as the card opens is not a tap outside it)
      if (performance.now() - this.openedAt < 350) return;
      if (t === this.sheet || t.closest('.fsClose')) this.close();
    });
    // (a press on the card or its shade never reaches the board under it)
    this.sheet.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(this.sheet);
  }

  get isOpen(): boolean {
    return !this.sheet.hidden;
  }

  /** Open the card for `v`, with `pic` (the unit's portrait canvas) at its head; `guest` marks the run's guest hero (GUEST-HERO). */
  open(v: UnitInfo, pic: HTMLElement, guest = false): void {
    const card = el('div', `fsCard uiCard ${v.kind}`);
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', `${v.name}: info`);
    const head = el('div', 'fsHead');
    pic.classList.add('uiPic');
    const words = el('div');
    const name = el('b', '', v.name);
    words.append(name);
    if (v.title) words.append(el('em', 'uiTitle', v.title));
    words.append(el('small', '', v.sub));
    const close = el('button', 'fsClose', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    head.append(pic, words, close);
    card.append(head);
    // (the badges: level, grade, awakening; then the health bar)
    const tags = el('div', 'uiTags');
    // (GUEST-HERO: the cart's guest, a sixth hero for this run only)
    if (guest) tags.append(el('span', 'guestTag', 'Guest · this run only'));
    if (v.level !== undefined) tags.append(el('span', '', `Lv ${v.level}`));
    if (v.grade !== undefined) tags.append(el('span', 'star', '★'.repeat(v.grade)));
    if (v.awaken) tags.append(el('span', 'awake', `Awakened ${v.awaken}`));
    if (tags.childElementCount) card.append(tags);
    const hp = el('div', 'uiHp');
    const bar = el('i');
    const fill = el('span');
    fill.style.width = `${Math.round(v.hpShare * 100)}%`;
    bar.append(fill);
    hp.append(el('b', '', 'Health'), bar, el('span', '', v.hp));
    card.append(hp);
    if (v.scores) card.append(drawCardScores(v.scores));
    const stats = el('dl', 'uiStats');
    for (const [k, t] of v.stats) stats.append(el('dt', '', k), el('dd', '', t));
    card.append(stats);
    if (v.lore) card.append(el('p', 'uiLore', v.lore));
    if (v.traits.length) {
      card.append(el('h4', 'uiH', 'Traits'));
      const ul = el('ul', 'uiList');
      for (const t of v.traits) {
        const li = el('li');
        li.append(el('b', '', t.name), document.createTextNode(` · ${t.text}`));
        ul.append(li);
      }
      card.append(ul);
    }
    if (v.gear.length) {
      card.append(el('h4', 'uiH', 'Equipment'));
      const ul = el('ul', 'uiList');
      for (const g of v.gear) ul.append(el('li', '', g));
      card.append(ul);
    }
    if (v.moves.length) {
      card.append(el('h4', 'uiH', 'Skills'));
      for (const m of v.moves) card.append(moveBox(m));
    }
    if (v.phase.length) {
      card.append(el('h4', 'uiH', 'Second form'));
      const ul = el('ul', 'uiList');
      for (const l of v.phase) ul.append(el('li', '', l));
      card.append(ul);
    }
    if (v.tips.length) {
      card.append(el('h4', 'uiH', 'Weaknesses and tips'));
      const ul = el('ul', 'uiList');
      for (const l of v.tips) ul.append(el('li', '', l));
      card.append(ul);
    }
    if (v.note) card.append(el('p', 'uiNote', v.note));
    const dock = this.dockTop?.();
    this.sheet.style.setProperty('--fs-dock', `${dock !== undefined ? Math.max(8, Math.round(innerHeight - dock)) : 8}px`);
    this.sheet.replaceChildren(card);
    this.sheet.hidden = false;
    this.openedAt = performance.now();
  }

  close(): void {
    this.sheet.hidden = true;
    this.sheet.replaceChildren();
  }
}

/** One move's box: its label and name, what it does, its numbers, and its tier lines. */
function moveBox(m: MoveInfo): HTMLElement {
  const box = el('div', `uiMove${m.locked ? ' locked' : ''}`);
  const top = el('div', 'uiMoveTop');
  top.append(el('span', 'uiLabel', m.label), el('b', '', m.name));
  if (m.locked) top.append(el('span', 'uiLock', '🔒 Locked'));
  box.append(top, el('p', '', m.text));
  const rows = m.rows.filter(([k]) => k !== 'Locked');
  const lock = m.rows.find(([k]) => k === 'Locked');
  if (lock) box.append(el('p', 'uiLockLine', lock[1]));
  if (rows.length) {
    const dl = el('dl');
    for (const [k, t] of rows) dl.append(el('dt', '', k), el('dd', '', t));
    box.append(dl);
  }
  if (m.tiers.length) {
    const ul = el('ul', 'fsTiers');
    for (const t of m.tiers) {
      const li = el('li', `${t.on ? 'on' : ''}${t.now ? ' now' : ''}`);
      li.append(el('b', '', t.now ? `${t.title} · now` : t.title), el('span', '', t.text));
      ul.append(li);
    }
    box.append(ul);
  }
  return box;
}
