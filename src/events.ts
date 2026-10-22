// The run's layer between fights: the event card (a choice among two or three options), the relics strip under the
// traits, and the pack (relic list, a hero's three gear slots and the gear not worn; tap a hero, then an item).
// Like gacha.ts it only reads and changes the Run through the sim's own functions (`chooseOption`, `equip`, ...).

import { chooseOption, leaveEvent, type EventOption } from './sim/events';
import { gearText, SLOTS, type Gear } from './sim/gear';
import { RELICS } from './sim/relics';
import { equip, unequip, type Run } from './sim/run';
import { equipBestRun } from './sim/runGear';
import { formOf, UNITS } from './sim/units';
import { gearIcon, iconImg, relicIcon } from './render/items';
import { portrait } from './render/sheets';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export class Events {
  private root = el('div');
  private run!: Run;
  private after: () => void = () => {};
  /** The note after a choice (what it gave). */
  private note = '';
  private hero = 0;
  private pick?: string;
  /** Whether gear may be changed now (before a fight), and what runs after it is. */
  private canEquip = true;
  /** The heroes the pack lists (those on the field); all of the roster when unset. */
  private only?: readonly number[];
  private onChange: () => void = () => {};

  constructor() {
    this.root.id = 'events';
    this.root.hidden = true;
    document.body.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /* ------------------------------------------------------------ the event card */

  /** Show the run's pending event; `done` runs when it is closed. */
  openEvent(run: Run, done: () => void): void {
    this.run = run;
    this.after = done;
    this.note = '';
    this.root.hidden = false;
    this.drawEvent();
  }

  private drawEvent(): void {
    const run = this.run;
    const ev = run.event;
    this.root.replaceChildren();
    const card = el('div', 'evcard');
    this.root.append(card);
    if (!ev) {
      card.append(el('h2', '', 'On you go'), el('p', 'note', this.note || 'You move on.'));
      const go = el('button', 'primary', 'Continue');
      go.addEventListener('click', () => this.close());
      card.append(go);
      return;
    }
    card.append(el('h2', '', ev.title), el('p', '', ev.text), el('div', 'gold', `${run.gold} gold`));
    if (this.note) card.append(el('p', 'note', this.note));
    ev.options.forEach((o, i) => card.append(this.optionButton(o, i)));
  }

  private optionButton(o: EventOption, i: number): HTMLButtonElement {
    const b = el('button', `opt ${o.effect.t}`);
    const fx = o.effect;
    const icon = fx.t === 'relic' ? relicIcon(fx.id) : fx.t === 'gear' ? gearIcon(fx.gear.slot, fx.gear.tier) : fx.t === 'curse' ? gearIcon(fx.gear.slot, fx.gear.tier) : '';
    if (icon) b.append(iconImg(icon, o.label));
    const words = el('span');
    words.append(el('b', '', o.done ? `${o.label} · sold` : o.label), el('small', '', o.text));
    b.append(words);
    if (o.cost) b.append(el('em', '', `${o.cost}`));
    b.disabled = !!o.done || this.run.gold < o.cost;
    b.addEventListener('click', () => {
      const line = fx.t === 'leave' ? (leaveEvent(this.run), 'You move on.') : chooseOption(this.run, i);
      if (line === null) return;
      this.note = line;
      this.drawEvent();
    });
    return b;
  }

  private close(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
    this.after();
  }

  /* ------------------------------------------------------------ the relics strip */

  /** The relics held as small icons into `#relics`; tap one for what it does. */
  drawStrip(run: Run): void {
    const box = $('relics');
    const ids = run.relics ?? [];
    const key = ids.join() + this.pick;
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    box.replaceChildren();
    box.hidden = !ids.length;
    for (const id of ids) {
      const b = el('button', this.pick === id ? 'relic picked' : 'relic');
      b.append(iconImg(relicIcon(id), RELICS[id].name));
      b.addEventListener('click', () => {
        this.pick = this.pick === id ? undefined : id;
        this.drawStrip(run);
      });
      box.append(b);
    }
    if (this.pick && ids.includes(this.pick)) box.append(el('span', 'hint', `${RELICS[this.pick].name}: ${RELICS[this.pick].text}`));
  }

  /* ------------------------------------------------------------ the pack */

  /** The pack: relics, a hero's gear and the loose items. `canEquip` is false in a fight; `change` runs after gear moves. */
  openPack(run: Run, canEquip: boolean, change: () => void, only?: readonly number[]): void {
    this.run = run;
    this.canEquip = canEquip;
    this.onChange = change;
    this.only = only;
    if (!this.listed().some((h) => h.id === this.hero)) this.hero = this.listed()[0]?.id ?? 0;
    this.root.hidden = false;
    this.after = () => {};
    this.drawPack();
  }

  /** The heroes the pack lists: those on the field when told which, else everyone owned. */
  private listed() {
    return this.run.roster.filter((h) => !this.only || this.only.includes(h.id));
  }

  private drawPack(): void {
    const run = this.run;
    this.root.replaceChildren();
    const card = el('div', 'evcard pack');
    this.root.append(card);
    const head = el('header');
    const close = el('button', '', 'Close');
    close.addEventListener('click', () => {
      this.root.hidden = true;
      this.root.replaceChildren();
    });
    head.append(el('h2', '', 'Relics and gear'), close);
    card.append(head);
    // relics
    const relics = el('div', 'list');
    for (const id of run.relics ?? []) {
      const row = el('div', 'row');
      const words = el('span');
      words.append(el('b', '', RELICS[id].name), el('small', '', RELICS[id].text));
      row.append(iconImg(relicIcon(id), RELICS[id].name), words);
      relics.append(row);
    }
    if (!relics.children.length) relics.append(el('p', 'note', 'No relics yet: events, chests and merchants have them.'));
    card.append(relics);
    // the heroes, then the chosen one's slots
    const heroes = el('div', 'heroes');
    for (const h of this.listed()) {
      const b = el('button', h.id === this.hero ? 'pick on' : 'pick');
      b.append(portrait(formOf(UNITS[h.kind], h.grade), 48, h.grade));
      b.addEventListener('click', () => {
        this.hero = h.id;
        this.drawPack();
      });
      heroes.append(b);
    }
    card.append(heroes);
    const hero = this.listed().find((h) => h.id === this.hero);
    // (one tap dresses the whole squad from the pack: the best pieces on the strongest heroes)
    const best = el('button', 'primary equipBest', 'Equip best');
    best.disabled = !this.canEquip || !this.listed().length;
    best.title = this.canEquip ? 'Give the heroes on the field the best gear in the pack' : 'Gear changes before a fight';
    best.addEventListener('click', () => {
      if (equipBestRun(run, this.listed().map((h) => h.id))) this.changed();
    });
    card.append(best);
    if (hero) {
      card.append(el('p', 'note', `${UNITS[hero.kind].name}${hero.bump ? ` (trained: ${hero.bump.atk ? `+${Math.round(hero.bump.atk * 100)}% attack ` : ''}${hero.bump.hp ? `+${Math.round(hero.bump.hp * 100)}% hp` : ''})` : ''}`));
      const slots = el('div', 'slots');
      for (const s of SLOTS) {
        const g = hero.gear?.[s];
        const b = el('button', g ? 'slot full' : 'slot');
        b.append(g ? iconImg(gearIcon(s, g.tier), g.name) : el('i', '', s === 'weapon' ? 'W' : s === 'armour' ? 'A' : 'C'), el('small', '', g ? `${g.name} ${gearText(g)}` : `no ${s}`));
        b.disabled = !g || !this.canEquip;
        b.addEventListener('click', () => {
          if (unequip(run, hero.id, s)) this.changed();
        });
        slots.append(b);
      }
      card.append(slots);
    }
    // the loose items
    card.append(el('p', 'note', this.canEquip ? 'In the pack (tap one to give it to the hero above; tap a worn piece to take it off):' : 'In the pack (gear changes before a fight):'));
    const items = el('div', 'list');
    for (const g of run.items ?? []) items.append(this.itemRow(g));
    if (!items.children.length) items.append(el('p', 'note', 'Nothing in the pack. Bosses always drop gear.'));
    card.append(items);
  }

  private itemRow(g: Gear): HTMLButtonElement {
    const b = el('button', 'row item');
    const words = el('span');
    words.append(el('b', '', g.name), el('small', '', `${g.slot}: ${gearText(g)}`));
    b.append(iconImg(gearIcon(g.slot, g.tier), g.name), words);
    b.disabled = !this.canEquip || !this.hero;
    b.addEventListener('click', () => {
      if (equip(this.run, this.hero, g.id)) this.changed();
    });
    return b;
  }

  private changed(): void {
    this.onChange();
    this.drawPack();
  }
}
