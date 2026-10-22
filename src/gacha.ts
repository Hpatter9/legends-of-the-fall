// The recruiting screen (#gacha): crowns, the pull buttons and rates, a card-flip reveal of each pull, and the list of
// every hero with the locked ones shaded. It only reads and changes the Meta through the sim's own functions.

import { ALL_HEROES, UNITS } from './sim/units';
import { MAX_RANK, MYTHIC_PITY, PITY, pullCost, RANK_MULT, RANK_SHARDS, rankOf, RARITY_NAMES, RATES, recruit, rarityOf, saveMeta, type Meta, type Pull } from './sim/meta';
import { portrait } from './render/sheets';
import { rarityFlash } from './render/uiFx';
import { settings } from './settings';

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
    $('rates').textContent = `${([1, 2, 3, 4, 5] as const).map((r) => `${RARITY_NAMES[r]} ${RATES[r]}%`).join(' · ')} · a Legendary or better is sure by pull ${PITY}, a Mythic by pull ${MYTHIC_PITY}. A repeat gives a shard; shards raise a hero's rank (+${Math.round((RANK_MULT - 1) * 100)}% hp and attack a rank, up to ${MAX_RANK}).`;
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
    $('pity').textContent = `Legendary in at most ${PITY - m.dry} pulls · Mythic in at most ${MYTHIC_PITY - m.dryMythic}`;
    const list = $('collection');
    list.replaceChildren();
    for (const kind of ALL_HEROES) {
      const def = UNITS[kind];
      const cell = document.createElement('div');
      cell.className = `hero r${rarityOf(kind)}${m.unlocked.includes(kind) ? '' : ' locked'}`;
      const name = document.createElement('b');
      name.textContent = m.unlocked.includes(kind) ? def.name : '???';
      const tag = document.createElement('em');
      tag.className = 'rtag';
      tag.textContent = RARITY_NAMES[rarityOf(kind)];
      cell.append(portrait(def.sheet, 72), name, tag);
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

  /** The pulls as face-down cards that flip over one after another, the best last; an Epic or better glows and trembles in its colour first as a tease, a Legendary waits a beat and flashes, a Mythic trembles longer, then flips slowly under crimson beams and a flash over the screen. */
  private reveal(got: Pull[]): void {
    const box = $('reveal');
    box.replaceChildren();
    const cards: HTMLElement[] = [];
    got.forEach((p) => {
      const def = UNITS[p.kind];
      const card = document.createElement('div');
      card.className = `flip r${p.rarity}`;
      const face = document.createElement('div');
      face.className = 'face';
      const name = document.createElement('b');
      name.textContent = def.name;
      const tag = document.createElement('em');
      tag.textContent = p.isNew ? 'NEW' : `+${p.shards} shard`;
      const tier = document.createElement('small');
      tier.className = 'rtag';
      tier.textContent = RARITY_NAMES[p.rarity];
      face.append(portrait(def.sheet, 72), name, tier, tag);
      if (p.isNew) card.classList.add('new');
      const back = document.createElement('div');
      back.className = 'back';
      card.append(back, face);
      if (p.rarity >= 4) {
        const beams = document.createElement('div');
        beams.className = 'beams';
        card.prepend(beams);
      }
      // (the tease: a pre-flip glow in the rarity colour, and for a Legendary or better a shake, until the card turns)
      if (p.rarity >= 3) card.classList.add('tease');
      if (p.rarity >= 4 && settings().shake) card.classList.add('shake');
      const flip = () => {
        card.classList.remove('shake', 'tease');
        card.classList.add('up');
        rarityFlash(p.rarity);
      };
      card.addEventListener('click', flip);
      box.append(card);
      cards.push(card);
    });
    // (they turn in order of rarity, the best last; a tap on a card turns it at once)
    const order = got.map((_, i) => i).sort((x, y) => got[x].rarity - got[y].rarity || x - y);
    let at = 350;
    for (const i of order) {
      const p = got[i];
      const mythic = p.rarity === 5;
      at += mythic ? 900 : 0;
      setTimeout(() => cards[i].click(), at);
      at += p.rarity === 4 ? 600 : mythic ? 1500 : 260;
    }
    setTimeout(() => {
      this.busy = false;
      this.refresh();
    }, at);
  }
}
