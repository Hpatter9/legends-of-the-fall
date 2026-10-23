// The party screen: the hero kinds a run's summons draw from (the party is the deck). Five slots at the top (tap one to
// take its hero out), the traits the party would wake, a grid of the unlocked heroes below (tap to add or take out; a
// long press, or the small i, opens the hero's role and skill), and the locked heroes shaded at the end. A draft is kept
// until Start or Done, which saves it through `setParty`; Back throws it away. The rules are in `src/sim/meta.ts`.

import { ALL_HEROES, UNITS } from './sim/units';
import { partySlots, saveMeta, setParty, type Meta } from './sim/meta';
import { progressOf, xpOf } from './sim/levels';
import { countTraits, traitsOf } from './sim/traits';
import { traitBadge } from './traitBadge';
import { pipsOf, raisedBy } from './traitHelp';
import { portrait } from './render/sheets';
import { lockInfo } from './sim/contentHeroes';
import { drawHeroSheet, starsOf } from './menuHeroes';
import { kindPower, powerText } from './sim/power';
import { ROLE_NAMES, roleOf, suggestParty } from './sim/suggest';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** How long a press holds before it opens the hero's details instead of toggling it. */
const LONG_PRESS_MS = 450;

export class Party {
  /** The draft: the kinds picked so far (saved only by Start or Done). */
  private picked: string[] = [];
  private note = '';
  private held = false;
  /** The trait picked to find its heroes in the grid (a tap on any badge), or none. */
  private focus?: string;
  private stopSheet: (() => void) | null = null;
  private onDone: () => void = () => {};

  constructor(
    private meta: Meta,
    private onBack: () => void,
  ) {
    $('ptBack').addEventListener('click', () => this.close(this.onBack));
    $('ptGo').addEventListener('click', () => this.confirm());
    $('ptSuggest').addEventListener('click', () => this.suggest());
    $('ptSheet').addEventListener('click', (e) => e.target === $('ptSheet') && this.closeSheet());
    // (a tap anywhere but on a badge lets go of the picked trait)
    $('party').addEventListener('click', (e) => {
      if (!this.focus || (e.target as HTMLElement).closest('.tbw')) return;
      this.focus = undefined;
      this.draw();
    });
  }

  /** Open the screen on the saved party. `then` runs once the party is saved: a new run starts, or the hub returns. */
  open(mode: 'start' | 'edit', then: () => void): void {
    this.picked = [...this.meta.party];
    this.note = '';
    this.focus = undefined;
    this.onDone = then;
    $('ptGo').textContent = mode === 'start' ? 'Start run' : 'Done';
    $('party').hidden = false;
    this.draw();
  }

  private get slots(): number {
    return partySlots(this.meta);
  }

  private confirm(): void {
    if (!setParty(this.meta, this.picked)) return;
    saveMeta(this.meta);
    this.close();
    this.onDone();
  }

  private close(then?: () => void): void {
    this.closeSheet();
    $('party').hidden = true;
    then?.();
  }

  /** Fill the draft with the best party the unlocked heroes make (nothing is saved until Start or Done). */
  private suggest(): void {
    this.picked = suggestParty(this.meta.unlocked, this.slots, (k) => kindPower(this.meta, k));
    const traits = countTraits(this.picked).filter((c) => c.active).map((c) => c.trait.name);
    const roles = [...new Set(this.picked.map(roleOf))].map((r) => ROLE_NAMES[r]);
    this.note = '';
    this.draw();
    $('ptHint').textContent = `Suggested: ${traits.length ? `wakes ${traits.join(', ')}; ` : ''}${roles.join(', ')}`;
  }

  /** Add a hero to the party, or take it out. A full party asks for one out first. */
  private toggle(kind: string): void {
    if (this.picked.includes(kind)) {
      this.picked = this.picked.filter((k) => k !== kind);
      this.note = '';
    } else if (this.picked.length < this.slots) {
      this.picked.push(kind);
      this.note = '';
    } else this.note = 'The party is full: take a hero out first.';
    this.draw();
  }

  /** A press that holds opens the hero's details; the click that follows a held press does nothing. */
  private holdTo(card: HTMLElement, kind: string): void {
    let timer = 0;
    card.addEventListener('pointerdown', () => {
      this.held = false;
      timer = window.setTimeout(() => {
        this.held = true;
        this.openSheet(kind);
      }, LONG_PRESS_MS);
    });
    for (const end of ['pointerup', 'pointerleave', 'pointercancel']) card.addEventListener(end, () => clearTimeout(timer));
    card.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** A badge that picks its trait (tap again to let go); a press on it still counts towards a card's long press. */
  private badge(id: string, plus = false, small = false): HTMLElement {
    const b = traitBadge(id, { plus, small, lit: this.focus === id, dim: !!this.focus && this.focus !== id });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.held) return void (this.held = false);
      this.focus = this.focus === id ? undefined : id;
      this.draw();
    });
    return b;
  }

  private openSheet(kind: string): void {
    this.closeSheet();
    $('ptSheet').hidden = false;
    this.stopSheet = drawHeroSheet($('ptSheetBox'), this.meta, kind, () => this.closeSheet());
  }

  private closeSheet(): void {
    this.stopSheet?.();
    this.stopSheet = null;
    $('ptSheet').hidden = true;
  }

  private draw(): void {
    const m = this.meta;
    const slots = this.slots;
    const full = this.picked.length === slots;

    // the five slots: a hero to take out, or an empty place
    const row = $('ptSlots');
    row.replaceChildren();
    for (let i = 0; i < slots; i++) {
      const kind = this.picked[i];
      if (!kind) {
        row.append(el('div', 'ptSlot empty', '+'));
        continue;
      }
      const b = el('button', 'ptSlot');
      b.append(portrait(UNITS[kind].sheet, 48), el('small', '', UNITS[kind].name));
      b.addEventListener('click', () => (this.held ? (this.held = false) : this.toggle(kind)));
      this.holdTo(b, kind);
      row.append(b);
    }

    // the hint, and the traits the party would wake (the same rule as a fight's team)
    const hint = $('ptHint');
    hint.textContent = this.note || `${this.picked.length} of ${slots} chosen · tap a hero to add it, a slot to take it out`;
    hint.classList.toggle('full', !!this.note);
    const traits = $('ptTraits');
    traits.replaceChildren();
    for (const c of countTraits(this.picked)) {
      const next = c.trait.tiers[Math.min(c.trait.tiers.length - 1, c.tier + 1)];
      const line = el('div', `ptTrait${c.active ? ' on' : ''}`);
      // (an active trait says what it gives now; one still asleep says what it would give)
      const text = c.active ? c.trait.tiers[c.tier].text : next.text;
      line.append(this.badge(c.trait.id), el('b', '', c.trait.name), el('span', 'pips', pipsOf(c.count, c.goal)), el('span', 'fx', text));
      traits.append(line);
    }

    // the unlocked heroes first (in the game's order), the locked ones shaded at the end
    const grid = $('ptGrid');
    grid.replaceChildren();
    const order = [...ALL_HEROES].sort((a, b) => Number(m.unlocked.includes(b)) - Number(m.unlocked.includes(a)));
    for (const kind of order) {
      const def = UNITS[kind];
      const open = m.unlocked.includes(kind);
      const on = this.picked.includes(kind);
      const hit = !!this.focus && traitsOf(kind).includes(this.focus);
      const card = el('button', `hcard ptCard${open ? '' : ' locked'}${on ? ' picked' : ''}${hit ? ' hit' : ''}${this.focus && !hit ? ' faded' : ''}`);
      card.append(portrait(def.sheet, 56));
      const lock = lockInfo(m, kind);
      card.append(el('b', '', open || lock?.named ? def.name : '???'));
      if (open) {
        const p = progressOf(xpOf(m, kind));
        const tags = el('span', 'ptTags');
        const up = this.picked.length < slots ? raisedBy(this.picked, kind) : [];
        for (const t of traitsOf(kind)) tags.append(this.badge(t, up.includes(t)));
        card.append(el('span', 'stars', starsOf(m, kind)), el('span', 'lv', `Lv ${p.level}`), el('span', 'pw', `Power ${powerText(kindPower(m, kind))}`), tags);
      } else {
        card.append(el('span', 'lv', lock!.short));
        if (lock!.need) {
          const bar = el('div', 'xpbar');
          const fill = el('span');
          fill.style.width = `${Math.min(1, lock!.now / lock!.need) * 100}%`;
          bar.append(fill);
          card.append(bar);
        }
      }
      const info = el('span', 'ptInfo', 'i');
      info.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSheet(kind);
      });
      card.append(info);
      if (open) {
        card.addEventListener('click', () => (this.held ? (this.held = false) : this.toggle(kind)));
        this.holdTo(card, kind);
      } else card.addEventListener('click', () => this.openSheet(kind));
      grid.append(card);
    }

    $<HTMLButtonElement>('ptGo').disabled = !full;
  }
}
