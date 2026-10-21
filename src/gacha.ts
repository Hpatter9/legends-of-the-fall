// The recruiting screen (#gacha): crowns, the pull buttons and rates, a card-flip reveal of each pull, and the list of
// every hero with the locked ones shaded. It only reads and changes the Meta through the sim's own functions.

import { ALL_HEROES, UNITS } from './sim/units';
import { PITY, pullCost, RATES, recruit, rarityOf, saveMeta, type Meta, type Pull } from './sim/meta';
import { portrait } from './render/sheets';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class Gacha {
  private busy = false;
  /** `onClose` runs when the screen is shut (the run's draw pool follows the unlocks). */
  constructor(
    private meta: Meta,
    private onClose: () => void,
  ) {
    $('pull1').addEventListener('click', () => this.pull(1));
    $('pull10').addEventListener('click', () => this.pull(10));
    $('gachaClose').addEventListener('click', () => this.close());
    $('rates').textContent = `Common ${RATES[1]}% · Rare ${RATES[2]}% · Epic ${RATES[3]}% · an epic is sure by pull ${PITY}. A repeat pays crowns back.`;
  }

  open(): void {
    $('gacha').hidden = false;
    $('reveal').replaceChildren();
    this.refresh();
  }

  close(): void {
    $('gacha').hidden = true;
    this.onClose();
  }

  private refresh(): void {
    const m = this.meta;
    $('crowns').textContent = `${m.crowns} crowns`;
    for (const [id, n] of [['pull1', 1], ['pull10', 10]] as const) {
      const b = $(id) as HTMLButtonElement;
      b.textContent = `Pull ${n} · ${pullCost(n)}`;
      b.disabled = this.busy || m.crowns < pullCost(n);
    }
    $('pity').textContent = `Epic in at most ${PITY - m.dry} pulls`;
    const list = $('collection');
    list.replaceChildren();
    for (const kind of ALL_HEROES) {
      const def = UNITS[kind];
      const cell = document.createElement('div');
      cell.className = `hero r${rarityOf(kind)}${m.unlocked.includes(kind) ? '' : ' locked'}`;
      const name = document.createElement('b');
      name.textContent = m.unlocked.includes(kind) ? def.name : '???';
      cell.append(portrait(def.sheet, 72), name);
      list.append(cell);
    }
  }

  private pull(count: 1 | 10): void {
    const got = recruit(this.meta, count);
    if (!got) return;
    saveMeta(this.meta);
    this.busy = true;
    this.refresh();
    this.reveal(got);
  }

  /** The pulls as face-down cards that flip over one after another. */
  private reveal(got: Pull[]): void {
    const box = $('reveal');
    box.replaceChildren();
    got.forEach((p, i) => {
      const def = UNITS[p.kind];
      const card = document.createElement('div');
      card.className = `flip r${p.rarity}`;
      const face = document.createElement('div');
      face.className = 'face';
      const name = document.createElement('b');
      name.textContent = def.name;
      const tag = document.createElement('em');
      tag.textContent = p.isNew ? 'NEW' : `+${p.refund} crowns`;
      face.append(portrait(def.sheet, 72), name, tag);
      if (p.isNew) card.classList.add('new');
      const back = document.createElement('div');
      back.className = 'back';
      card.append(back, face);
      card.addEventListener('click', () => card.classList.add('up'));
      box.append(card);
      setTimeout(() => card.classList.add('up'), 350 + i * 260);
    });
    setTimeout(() => {
      this.busy = false;
      this.refresh();
    }, 350 + got.length * 260);
  }
}
