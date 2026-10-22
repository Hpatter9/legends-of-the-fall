// The recruiting screen (#gacha): crowns, the pull buttons and rates, a card-flip reveal of each pull, and the list of
// every hero with the locked ones shaded. It only reads and changes the Meta through the sim's own functions.

import { ALL_HEROES, UNITS } from './sim/units';
import { MAX_RANK, NEW_PITY, pullCost, RANK_MULT, RANK_SHARDS, rankOf, recruit, saveMeta, type Meta, type Pull } from './sim/meta';
import { CLASS_NAMES, CLASS_OF } from './sim/starter';
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
    $('rates').textContent = `Every hero is as likely as any other. After ${NEW_PITY} pulls without a new hero, the next one is a hero you do not have yet. A repeat gives a shard; shards raise a hero's rank (+${Math.round((RANK_MULT - 1) * 100)}% hp and attack a rank, up to ${MAX_RANK}).`;
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
    const left = Math.max(1, NEW_PITY - (m.sinceNew ?? 0));
    $('pity').textContent = ALL_HEROES.every((k) => m.unlocked.includes(k)) ? 'You have every hero' : `A new hero is sure within ${left} pull${left === 1 ? '' : 's'}`;
    const list = $('collection');
    list.replaceChildren();
    for (const kind of ALL_HEROES) {
      const def = UNITS[kind];
      const cell = document.createElement('div');
      cell.className = `hero${m.unlocked.includes(kind) ? '' : ' locked'}`;
      const name = document.createElement('b');
      name.textContent = m.unlocked.includes(kind) ? def.name : '???';
      cell.append(portrait(def.sheet, 72), name);
      if (m.unlocked.includes(kind)) cell.append(this.rankLine(kind));
      list.append(cell);
    }
  }

  /** A hero's rank, and a bar of its shards towards the next rank. */
  private rankLine(kind: string): DocumentFragment {
    const m = this.meta;
    const rank = rankOf(m, kind);
    const got = m.shards[kind] ?? 0;
    const from = rank ? RANK_SHARDS[rank - 1] : 0;
    const to = RANK_SHARDS[rank];
    const frag = document.createDocumentFragment();
    const label = document.createElement('span');
    label.className = 'rank';
    label.textContent = `Rank ${rank}`;
    const bar = document.createElement('span');
    bar.className = 'bar';
    bar.title = to ? `${got}/${to} shards` : `${got} shards, top rank`;
    const fill = document.createElement('i');
    fill.style.width = `${to ? ((got - from) / (to - from)) * 100 : 100}%`;
    bar.append(fill);
    frag.append(label, bar);
    return frag;
  }

  /** A pull started from the summoning hall: the pull is made at once (so it is saved whatever happens), the hall plays it, then the usual reveal opens. */
  summon(count: 1 | 10, play: (got: Pull[]) => Promise<void>): void {
    if (this.busy) return;
    const got = recruit(this.meta, count);
    if (!got) return;
    saveMeta(this.meta);
    this.busy = true;
    void play(got).then(() => {
      $('gacha').hidden = false;
      this.refresh();
      this.reveal(got);
    });
  }

  private pull(count: 1 | 10): void {
    const got = recruit(this.meta, count);
    if (!got) return;
    saveMeta(this.meta);
    this.busy = true;
    this.refresh();
    this.reveal(got);
  }

  /** The pulls as face-down cards that flip over one after another, the repeats first and the new heroes last (a new hero's card glows steadily and is held a beat longer). A tap on a card turns it at once. */
  private reveal(got: Pull[]): void {
    const box = $('reveal');
    box.replaceChildren();
    const cards: HTMLElement[] = [];
    got.forEach((p) => {
      const def = UNITS[p.kind];
      const card = document.createElement('div');
      card.className = 'flip';
      const face = document.createElement('div');
      face.className = 'face';
      const name = document.createElement('b');
      name.textContent = def.name;
      const tag = document.createElement('em');
      tag.textContent = p.isNew ? 'NEW' : `+${p.shards} shard`;
      const role = document.createElement('small');
      role.className = 'rtag';
      role.textContent = CLASS_NAMES[CLASS_OF[p.kind]];
      face.append(portrait(def.sheet, 72), name, role, tag);
      if (p.isNew) card.classList.add('new');
      const back = document.createElement('div');
      back.className = 'back';
      card.append(back, face);
      card.addEventListener('click', () => card.classList.add('up'));
      box.append(card);
      cards.push(card);
    });
    const order = got.map((_, i) => i).sort((x, y) => Number(got[x].isNew) - Number(got[y].isNew) || x - y);
    let at = 350;
    for (const i of order) {
      setTimeout(() => cards[i].click(), at);
      at += got[i].isNew ? 420 : 260;
    }
    setTimeout(() => {
      this.busy = false;
      this.refresh();
    }, at);
  }
}
