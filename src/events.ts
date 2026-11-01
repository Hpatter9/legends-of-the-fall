// The run's layer between fights: the event card (a choice among two or three options), the relics strip under the
// traits, and the pack (relic list, a hero's three gear slots and the gear not worn; tap a hero, then an item).
// Like gacha.ts it only reads and changes the Run through the sim's own functions (`chooseOption`, `equip`, ...).

import { chooseOption, leaveEvent, type EventOption } from './sim/events';
import { gearText, SLOTS, type Gear } from './sim/gear';
import { relicName, RELICS } from './sim/relics';
import { setOf } from './sim/relicSets';
import { openRelicCard } from './relicCard';
import { equip, unequip, type Owned, type Run } from './sim/run';
import { equipBestRun, FIELD_BOOST, foundIn, isReal, spareFinds, takeOffFound, wearFound } from './sim/runGear';
import { EQUIP_BASES, EQUIP_SLOTS, SLOT_NAMES, spareEquipment, STASH_MAX, wornIn, type EquipSlot, type Equipment } from './sim/equipment';
import { pieceGear } from './sim/gear';
import type { Meta } from './sim/meta';
import { itemIcon } from './equipView';
import { shopArt } from './bookArt';
import { UNITS } from './sim/units';
import { battleSheet } from './render/awakenLook';
import { gearIcon, iconImg, relicIcon } from './render/items';
import { portrait } from './render/sheets';
import { twistIcon } from './twistView';
import ironDraught from './art/items/blood_vial.png';
import fireTonic from './art/items/ember_ruby.png';
import quicksilver from './art/items/cloud_treads.png';
import coinHoard from './art/items/coin_hoard.png';
import goldBand from './art/items/gold_band.png';

/** An option's picture on the road's cards and the passing cart (MID-EVENTS): what it gives, from the item and twist icons. */
function optionIcon(o: EventOption): string {
  const fx = o.effect;
  if (fx.t === 'relic') return relicIcon(fx.id);
  if (fx.t === 'gear' || fx.t === 'curse') return gearIcon(fx.gear.slot, fx.gear.tier);
  if (fx.t === 'buff') return fx.hp ? ironDraught : fx.atk ? fireTonic : fx.speed ? quicksilver : '';
  if (fx.t === 'reroll') return goldBand;
  if (fx.t !== 'road') return '';
  const a = fx.act;
  if (a.relic) return relicIcon(a.relic);
  if (a.gear) return gearIcon(a.gear.slot, a.gear.tier);
  if (a.buff?.twist) return twistIcon(a.buff.twist);
  if (a.gold) return coinHoard;
  return '';
}

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
  /** Whether gear may be changed now (before a fight), and what runs after it is. */
  private canEquip = true;
  /** The heroes the pack lists (those on the field); all of the roster when unset. */
  private only?: readonly number[];
  private onChange: () => void = () => {};

  /** RUN-GEAR: the save, for a real-gear run's lasting kit and the stash's count (the page sets it). */
  metaOf: () => Meta | undefined = () => undefined;

  constructor(private equipmentStep: (kind: string) => number = () => 0) {
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
    card.append(el('h2', '', ev.title), el('p', '', ev.text), el('div', 'gold', ev.buys !== undefined ? `${run.gold} gold · ${ev.buys ? `${ev.buys} ${ev.buys === 1 ? 'buy' : 'buys'} left` : 'the pedlar is packing up'}` : `${run.gold} gold`));
    if (this.note) card.append(el('p', 'note', this.note));
    ev.options.forEach((o, i) => card.append(this.optionButton(o, i)));
  }

  private optionButton(o: EventOption, i: number): HTMLButtonElement {
    const b = el('button', `opt ${o.effect.t}`);
    const fx = o.effect;
    const hire = fx.t === 'hire' || fx.t === 'guest' ? fx.kind : fx.t === 'road' ? fx.act.hire : undefined;
    const icon = optionIcon(o);
    if (hire && UNITS[hire]) b.append(portrait(battleSheet(hire, this.equipmentStep(hire), 1), 32, 1));
    else if (icon) b.append(iconImg(icon, o.label));
    const words = el('span');
    words.append(el('b', '', o.done ? `${o.label} · ${fx.t === 'reroll' ? 'done' : fx.t === 'guest' ? 'joined' : 'sold'}` : o.label), el('small', '', o.text));
    b.append(words);
    // (GUEST-HERO: the cart's guest wears its badge here too)
    if (fx.t === 'guest') b.append(el('i', 'guestMark', 'Guest'));
    if (o.cost) b.append(el('em', '', `${o.cost}`));
    // (a market's buys run out: its wares close, the rummage and the way on stay)
    const shut = this.run.event?.buys !== undefined && this.run.event.buys <= 0 && fx.t !== 'leave' && fx.t !== 'reroll';
    b.disabled = !!o.done || this.run.gold < o.cost || shut;
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

  /** The relics held as small icons into `#relics` (shown on the wave-prep screen only, by the stylesheet); tap one for its card
   *  (`relicCard.ts`: its story, its rule and price, how it has grown, and its chapter). A run whose relics were just converted shows one
   *  line here, once: it is gone when the fight begins. */
  drawStrip(run: Run): void {
    const box = $('relics');
    const ids = run.relics ?? [];
    if (run.relicNote && document.body.dataset.phase && document.body.dataset.phase !== 'deploy') run.relicNote = undefined;
    const key = ids.join() + (run.relicNote ? '!' : '');
    if (box.dataset.key === key) return;
    box.dataset.key = key;
    box.replaceChildren();
    box.hidden = !ids.length;
    for (const id of ids) {
      const b = el('button', 'relic');
      b.append(iconImg(relicIcon(id), RELICS[id]?.name ?? id));
      b.addEventListener('click', () => {
        b.classList.add('picked');
        openRelicCard(run, id, document.body, () => b.classList.remove('picked'));
      });
      box.append(b);
    }
    if (run.relicNote) box.append(el('span', 'relicNote', run.relicNote));
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
    // (by chapter, in the keep's order; tap a row for the relic's card)
    const order = (id: string) => setOf(id)?.chapter ?? 9;
    for (const id of [...(run.relics ?? [])].sort((x, y) => order(x) - order(y))) {
      const row = el('div', 'row');
      const words = el('span');
      words.append(el('b', '', relicName(id, { marks: run.relicMarks, gold: run.gold })), el('small', '', RELICS[id].text));
      if (RELICS[id].price) words.append(el('small', 'rlPrice', RELICS[id].price!));
      row.append(iconImg(relicIcon(id), RELICS[id].name), words);
      row.addEventListener('click', () => openRelicCard(run, id));
      relics.append(row);
    }
    if (!relics.children.length) relics.append(el('p', 'note', 'No relics yet: events, chests and merchants have them.'));
    card.append(relics);
    // the heroes, then the chosen one's slots
    const heroes = el('div', 'heroes');
    for (const h of this.listed()) {
      const b = el('button', h.id === this.hero ? 'pick on' : 'pick');
      b.append(portrait(battleSheet(h.kind, this.equipmentStep(h.kind), h.grade), 48, h.grade));
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
      if (equipBestRun(run, this.listed().map((h) => h.id), this.metaOf())) this.changed();
    });
    card.append(best);
    // (RUN-GEAR: a real-gear run's pack holds real pieces, worn by the kinds)
    if (isReal(run)) return this.drawFinds(card, hero);
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

  /** A real-gear run's half of the pack (RUN-GEAR): the chosen hero's three slots (a found piece, or its lasting piece in a run that brings
   *  the lasting kit) and the found pieces no one wears, each in its grade frame with the fresh-from-the-field mark. */
  private drawFinds(card: HTMLElement, hero: Owned | undefined): void {
    const run = this.run;
    const meta = this.metaOf();
    const boost = run.local ? FIELD_BOOST.bare : FIELD_BOOST.army;
    if (hero && !hero.guest) {
      card.append(el('p', 'note', `${UNITS[hero.kind].name}${run.local ? '' : ': a find put on takes the place of the lasting piece, and stays on when the run ends'}`));
      const slots = el('div', 'slots');
      for (const s of EQUIP_SLOTS) {
        const found = foundIn(run, hero.kind, s);
        const home = !found && !run.local && meta ? wornIn(meta, hero.kind, s) : undefined;
        const b = el('button', found || home ? 'slot full' : 'slot');
        b.append(this.pieceIcon(found ?? home, s, !!found), el('small', '', found ? `${pieceGear(found).name} ${gearText(pieceGear(found))}` : home ? `${pieceGear(home).name} (lasting)` : `no ${SLOT_NAMES[s].toLowerCase()}`));
        b.disabled = !found || !this.canEquip;
        b.addEventListener('click', () => {
          if (takeOffFound(run, hero.kind, s)) this.changed();
        });
        slots.append(b);
      }
      card.append(slots);
    } else if (hero?.guest) card.append(el('p', 'note', 'A guest fights in its own kit.'));
    const stash = meta ? ` · stash ${spareEquipment(meta).length} / ${STASH_MAX}` : '';
    card.append(el('p', 'note', `${this.canEquip ? 'Found this run (tap one to give it to the hero above; tap a worn find to take it off)' : 'Found this run (gear changes before a fight)'}. Fresh from the field: x${boost} this run; everything found is kept${stash}.`));
    const items = el('div', 'list');
    for (const it of spareFinds(run)) items.append(this.findRow(it, hero, boost));
    if (!items.children.length) items.append(el('p', 'note', 'Nothing in the pack. Bosses always drop gear.'));
    card.append(items);
  }

  /** A real piece's icon in its grade frame, with the fresh-from-the-field badge on a find. */
  private pieceIcon(it: Equipment | undefined, slot: EquipSlot, fresh: boolean): HTMLElement {
    const icon = itemIcon(it, slot, 'small');
    if (it && fresh) {
      const badge = el('img', 'eqBadge field');
      badge.src = shopArt('badge-field');
      badge.alt = 'Fresh from the field';
      icon.append(badge);
    }
    return icon;
  }

  private findRow(it: Equipment, hero: Owned | undefined, boost: number): HTMLButtonElement {
    const b = el('button', 'row item');
    const words = el('span');
    const g = pieceGear(it);
    words.append(el('b', '', g.name), el('small', '', `${SLOT_NAMES[EQUIP_BASES[it.base].slot]}: ${gearText(g)}`), el('small', 'fresh', `Fresh from the field: x${boost} this run`));
    b.append(this.pieceIcon(it, EQUIP_BASES[it.base].slot, true), words);
    b.disabled = !this.canEquip || !hero || !!hero.guest;
    b.addEventListener('click', () => {
      if (hero && wearFound(this.run, hero.kind, it.id)) this.changed();
    });
    return b;
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
