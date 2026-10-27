// The recruiting screen (#gacha): crowns, the pull buttons and rates, a card-flip reveal of each pull, and the list of
// every hero with the locked ones shaded. It only reads and changes the Meta through the sim's own functions.

import { ALL_HEROES, UNITS } from './sim/units';
import { awakenedOf, AWAKEN_SHARDS } from './sim/awaken';
import { MAX_RANK, pullCost, RANK_MULT, RANK_SHARDS, rankOf, recruit, saveMeta, takenRank, type Meta, type Pull } from './sim/meta';
import { closest, haveOf, needOf, ownedCount } from './sim/unlock';
import { isContent, pityAt } from './sim/unlockRules';
import { CLASS_NAMES, CLASS_OF } from './sim/starter';
import { portrait } from './render/sheets';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class Gacha {
  private busy = false;
  /** `onClose` runs when the screen is shut (the run's draw pool follows the unlocks). */
  constructor(
    private meta: Meta,
    private onClose: () => void,
    /** A pull started from the reveal screen runs the hall's show again, like one from the hall (the screen shuts under it). */
    private again?: (count: 1 | 10) => void,
  ) {
    $('pull1').addEventListener('click', () => this.pull(1));
    $('pull10').addEventListener('click', () => this.pull(10));
    $('gachaClose').addEventListener('click', () => this.close());
    $('rates').textContent = ratesText();
  }

  open(): void {
    $('gacha').hidden = false;
    $('reveal').replaceChildren();
    $('gacha').querySelector('h2')!.textContent = 'Summoning Sanctum';
    $('gachaClose').textContent = 'Close';
    ($('collectionPanel') as HTMLDetailsElement).open = true;
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
      const price = document.createElement('small');
      price.textContent = `${pullCost(n)} crowns`;
      b.replaceChildren(`Summon ×${n}`, price);
      b.disabled = this.busy || m.crowns < pullCost(n);
    }
    $('pity').textContent = pityLine(m);
    const list = $('collection');
    list.replaceChildren();
    for (const kind of ALL_HEROES) {
      const def = UNITS[kind];
      const owned = m.unlocked.includes(kind);
      const begun = !owned && haveOf(m, kind) > 0;
      const cell = document.createElement('div');
      cell.className = `hero${owned ? '' : ' locked'}`;
      const name = document.createElement('b');
      name.textContent = owned || begun ? def.name : '???';
      cell.append(portrait(def.sheet, 72), name);
      if (owned) cell.append(this.rankLine(kind));
      else if (begun) cell.append(unlockBar(m, kind));
      else if (isContent(kind)) cell.append(small('Earned in play'));
      list.append(cell);
    }
  }

  /** A hero's rank, and a bar of its shards towards the next rank. */
  private rankLine(kind: string): DocumentFragment {
    const m = this.meta;
    const rank = rankOf(m, kind);
    const got = m.shards[kind] ?? 0;
    // (past the top rank the bar runs on towards the awakening steps)
    const steps = awakenedOf(m, kind);
    const marks = [...RANK_SHARDS, ...AWAKEN_SHARDS];
    const at = rank + steps;
    const from = at ? marks[at - 1] : 0;
    const to = marks[at];
    const frag = document.createDocumentFragment();
    const label = document.createElement('span');
    label.className = 'rank';
    label.textContent = `Rank ${takenRank(m, kind) + steps}${rank > takenRank(m, kind) ? ' · rank up ready' : ''}`;
    const bar = document.createElement('span');
    bar.className = 'bar';
    bar.title = to ? `${got}/${to} shards` : `${got} shards, fully awakened`;
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
    if (this.again) {
      if (this.busy || this.meta.crowns < pullCost(count)) return;
      $('gacha').hidden = true;
      this.again(count);
      return;
    }
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
    $('gacha').scrollTop = 0;
    $('gacha').querySelector('h2')!.textContent = 'Summon results';
    $('gachaClose').textContent = 'Continue';
    ($('collectionPanel') as HTMLDetailsElement).open = false;
    ($('summonRules') as HTMLDetailsElement).open = false;
    box.replaceChildren();
    box.classList.toggle('single', got.length === 1);
    const cards: HTMLElement[] = [];
    got.forEach((p) => {
      const def = UNITS[p.kind];
      const card = document.createElement('div');
      card.className = 'flip';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Reveal summon');
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
      const face = document.createElement('div');
      face.className = 'face';
      const name = document.createElement('b');
      name.textContent = def.name;
      const tag = document.createElement('em');
      tag.textContent = p.isNew ? 'NEW HERO' : p.unlock ? `${p.have}/${p.need}` : p.crowns ? `+${p.crowns} crowns` : `+${p.shards} shard`;
      const role = document.createElement('small');
      role.className = 'rtag';
      role.textContent = CLASS_NAMES[CLASS_OF[p.kind]];
      // (a hero not yet owned shows its bar filling: the pull's shard, as it stood after it)
      face.append(portrait(def.sheet, 72), name);
      if (p.unlock && p.need && !p.isNew) face.append(cardBar(p.have! / p.need));
      else face.append(role);
      face.append(tag);
      if (p.isNew) card.classList.add('new');
      const back = document.createElement('div');
      back.className = 'back';
      card.append(back, face);
      card.addEventListener('click', () => {
        card.classList.add('up');
        card.setAttribute('aria-label', `${def.name}: ${tag.textContent}`);
      });
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

const small = (text: string): HTMLElement => {
  const e = document.createElement('small');
  e.className = 'rtag';
  e.textContent = text;
  return e;
};

/** A thin bar, `part` full (0 to 1). */
function barOf(part: number): HTMLElement {
  const bar = document.createElement('span');
  bar.className = 'bar';
  const fill = document.createElement('i');
  fill.style.width = `${Math.min(1, part) * 100}%`;
  bar.append(fill);
  return bar;
}

/** The small bar on a pull's card (the stone look of the XP bar). */
function cardBar(part: number): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'xpbar';
  const fill = document.createElement('span');
  fill.style.width = `${Math.min(1, part) * 100}%`;
  bar.append(fill);
  return bar;
}

/** A hero not yet owned: a bar of its unlock shards and "7/15". */
export function unlockBar(m: Meta, kind: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const need = needOf(m);
  const label = document.createElement('span');
  label.className = 'rank';
  label.textContent = `${haveOf(m, kind)}/${need}`;
  frag.append(label, barOf(haveOf(m, kind) / need));
  return frag;
}

/** The line above the cards: the hero nearest to joining, and when the next sure shard comes. */
export function pityLine(m: Meta): string {
  const near = closest(m);
  if (!near) return 'You have every hero you can recruit';
  const left = Math.max(1, pityAt(ownedCount(m)) - (m.unlockDry ?? 0));
  return `Nearest: ${UNITS[near].name} ${haveOf(m, near)}/${needOf(m)} · its shards are sure within ${left} pull${left === 1 ? '' : 's'}`;
}

/** The recruit page's short rule: what a pull is, and why new heroes turn up less as the roster grows. */
export function ratesText(): string {
  return `A pull gives a shard of one hero. A new hero joins when its bar fills; one you have earns rank (+${Math.round((RANK_MULT - 1) * 100)}% hp and attack a rank, up to ${MAX_RANK}, then awakening): tap Rank up on its sheet to take it. The more heroes you have, the more pulls land on them rather than on a new one. Ten heroes are earned in play, never pulled: see the Heroes tab.`;
}
