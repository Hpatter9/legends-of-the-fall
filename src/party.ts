// The party screen: the hero kinds a run's summons draw from (the party is the deck). Five slots at the top (tap one to
// take its hero out), the traits the party would wake, a grid of the unlocked heroes below (tap to add or take out; a
// long press, or the small i, opens the hero's role and skill), and the locked heroes shaded at the end. A draft is kept
// until Start or Done, which saves it through `setParty`; Back throws it away. The rules are in `src/sim/meta.ts`.

import { ALL_HEROES, UNITS } from './sim/units';
import { partySlots, rankOf, rarityOf, saveMeta, setParty, type Meta } from './sim/meta';
import { progressOf, xpOf } from './sim/levels';
import { countTraits, TRAITS, traitsOf } from './sim/traits';
import { portrait } from './render/sheets';
import { drawHeroSheet, stars } from './menuHeroes';
import { kindPower, powerText } from './sim/power';

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
  private stopSheet: (() => void) | null = null;
  private onDone: () => void = () => {};

  constructor(
    private meta: Meta,
    private onBack: () => void,
  ) {
    $('ptBack').addEventListener('click', () => this.close(this.onBack));
    $('ptGo').addEventListener('click', () => this.confirm());
    $('ptSheet').addEventListener('click', (e) => e.target === $('ptSheet') && this.closeSheet());
  }

  /** Open the screen on the saved party. `then` runs once the party is saved: a new run starts, or the hub returns. */
  open(mode: 'start' | 'edit', then: () => void): void {
    this.picked = [...this.meta.party];
    this.note = '';
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
      const b = el('button', `ptSlot r${rarityOf(kind)}`);
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
      // (an active trait says what it gives now, and how many more heroes reach the next tier)
      const text = c.active ? `${c.trait.tiers[c.tier].text}${c.goal > c.count ? ` · ${c.goal} for ${next.text}` : ''}` : `${c.count} of ${c.goal} for ${next.text}`;
      line.append(el('b', '', c.trait.name), text);
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
      const card = el('button', `hcard ptCard r${rarityOf(kind)}${open ? '' : ' locked'}${on ? ' picked' : ''}`);
      card.append(portrait(def.sheet, 56));
      card.append(el('b', '', open ? def.name : '???'));
      if (open) {
        const p = progressOf(xpOf(m, kind));
        card.append(el('span', 'stars', stars(rankOf(m, kind))), el('span', 'lv', `Lv ${p.level}`), el('span', 'pw', `Power ${powerText(kindPower(m, kind))}`), el('span', 'ptTags', traitsOf(kind).map((t) => TRAITS[t].short).join(' · ')));
      } else card.append(el('span', 'lv', 'Not recruited'));
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
