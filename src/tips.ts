// The guided first run: a few tips, each shown once at the moment it matters, as a small speech bubble with a tail
// pointing at the thing it talks about (and that thing lit) and a "Got it" button. A tip never blocks the game: the
// bubble takes taps only on its own card, and tips wait in a queue, one at a time, for the page they belong to.
// What has been seen is kept in localStorage ('legends.tips'). The store and the placing are pure, so the tests run
// them; the page parts only touch the DOM when they are used.

import { colLeft, viewH, viewW } from './viewport';

/** Every tip, by the moment it is for. */
export type TipId = 'home' | 'deploy' | 'fight' | 'mana' | 'skill' | 'summon' | 'crowns';

/** Where a tip's bubble is shown: on the home screen, or in the game (not under the recruit page or a result). */
interface TipDef {
  text: string;
  page: 'home' | 'game';
  /** The battle phase it is for; a tip still waiting when the phase has moved on is dropped. */
  during?: 'deploy' | 'fight';
}

export const TIPS: Readonly<Record<TipId, TipDef>> = {
  home: { text: 'Start a New run to send your heroes out.', page: 'home' },
  deploy: { text: 'Drag your heroes onto the blue tiles. High ground hits harder; blows from behind hit hardest.', page: 'game', during: 'deploy' },
  fight: { text: 'Press Fight! Your heroes fight on their own.', page: 'game', during: 'deploy' },
  mana: { text: 'Tap a spell card, then a tile, to cast.', page: 'game', during: 'fight' },
  skill: { text: 'Skills fire on their own when the gold bar fills.', page: 'game', during: 'fight' },
  summon: { text: 'Spend gold to Summon. Three of the same hero merge into a stronger one.', page: 'game', during: 'deploy' },
  crowns: { text: 'Recruit unlocks new heroes; the Castle gives lasting upgrades.', page: 'home' },
};

const IDS = Object.keys(TIPS) as TipId[];
const KEY = 'legends.tips';

/** A box on the screen, in CSS pixels. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What a tip points at: a page element (lit while the tip is up), or a box that is worked out each frame. */
export type Anchor = HTMLElement | (() => Box | null);

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The tips already seen, from the store (none if the store is empty, unreadable or has junk in it). */
export function loadSeen(store: Pick<Store, 'getItem'>): Set<TipId> {
  try {
    const list: unknown = JSON.parse(store.getItem(KEY) ?? '[]');
    if (!Array.isArray(list)) return new Set();
    return new Set(IDS.filter((id) => list.includes(id)));
  } catch {
    return new Set();
  }
}

/** Remember a tip as seen. A store that refuses writing just forgets it (the tip may show again). */
export function saveSeen(seen: ReadonlySet<TipId>, store: Pick<Store, 'setItem'>): void {
  try {
    store.setItem(KEY, JSON.stringify([...seen]));
  } catch {
    /* (no storage: the tips show again next time) */
  }
}

export type Side = 'above' | 'below' | 'left' | 'right';

/** Where a bubble goes beside its anchor: its top left corner, the side the tail is on, and the tail's place inside it. */
export interface Placed {
  x: number;
  y: number;
  side: Side;
  ax: number;
  ay: number;
}

/**
 * Put a bubble of `size` beside `anchor` inside `view`: above it, else below, else right, else left (the first that fits
 * clear of the anchor). Each choice leaves a gap, so the bubble never covers the anchor; the tail points at the anchor's middle.
 */
export function placeBubble(anchor: Box, size: { w: number; h: number }, view: { w: number; h: number }, gap = 12, margin = 8): Placed {
  const cx = anchor.x + anchor.w / 2;
  const cy = anchor.y + anchor.h / 2;
  const inX = (x: number) => Math.min(view.w - margin - size.w, Math.max(margin, x));
  const inY = (y: number) => Math.min(view.h - margin - size.h, Math.max(margin, y));
  const cands: [Side, number, number][] = [
    ['above', inX(cx - size.w / 2), anchor.y - gap - size.h],
    ['below', inX(cx - size.w / 2), anchor.y + anchor.h + gap],
    ['right', anchor.x + anchor.w + gap, inY(cy - size.h / 2)],
    ['left', anchor.x - gap - size.w, inY(cy - size.h / 2)],
  ];
  const fits = ([, x, y]: [Side, number, number]) => x >= margin && y >= margin && x + size.w <= view.w - margin && y + size.h <= view.h - margin;
  const [side, x, y] = cands.find(fits) ?? cands[0];
  const tail = (v: number, len: number) => Math.min(len - 14, Math.max(14, v));
  return { x, y, side, ax: tail(cx - x, size.w), ay: tail(cy - y, size.h) };
}

/** The tip queue and the bubble on the page: a singleton (`tips`), made lazily so importing this does not touch the page. */
class Tips {
  private seen: Set<TipId> | null = null;
  private queue: { id: TipId; anchor: Anchor }[] = [];
  private shown: { id: TipId; anchor: Anchor; lit: HTMLElement | null } | null = null;
  private card: HTMLElement | null = null;

  private known(): Set<TipId> {
    if (!this.seen) this.seen = loadSeen(localStorage);
    return this.seen;
  }

  /** Ask for a tip at the moment it is for: it waits its turn unless seen or already waiting. Safe to call every frame. */
  offer(id: TipId, anchor: Anchor): void {
    if (this.known().has(id) || this.shown?.id === id || this.queue.some((q) => q.id === id)) return;
    this.queue.push({ id, anchor });
  }

  /** The tips of the deploy screen, offered each time it is drawn: `placed` heroes are on the board, `stage` is the run's,
   *  and `tiles` is the box of the blue tiles (the bubble goes above them, so it does not cover them). */
  atDeploy(placed: number, stage: number, tiles: () => Box | null): void {
    this.offer('deploy', tiles);
    if (placed) this.offer('fight', $('fight'));
    // (after the first win, the gold is there to summon with)
    if (stage > 1) this.offer('summon', $('summon'));
  }

  /** Each frame: keep the bubble by its anchor, and show the next waiting tip whose page is up. */
  update(): void {
    if (this.shown) {
      const box = boxOf(this.shown.anchor);
      // (the thing it points at has gone: the bubble goes, unseen, and the tip is offered again when it is back)
      if (!box) return this.dismiss(false);
      // (a deploy tip still up when the fight starts goes too, unseen)
      const during = TIPS[this.shown.id].during;
      if (during && document.body.dataset.phase !== during) return this.dismiss(false);
      return this.position(box);
    }
    for (let i = 0; i < this.queue.length; i++) {
      const q = this.queue[i];
      const def = TIPS[q.id];
      // (a tip for a phase that has passed is dropped; one whose page is not up waits)
      if (def.during && document.body.dataset.phase !== def.during) {
        this.queue.splice(i--, 1);
        continue;
      }
      if (!pageUp(def.page)) continue;
      this.queue.splice(i, 1);
      const box = boxOf(q.anchor);
      if (box) return this.show(q.id, q.anchor, box);
      i--;
    }
  }

  /** The bubble's "Got it" (the tip counts as seen) or a dismissal by the game (it does not). */
  private dismiss(seen: boolean): void {
    if (!this.shown) return;
    if (seen) {
      this.known().add(this.shown.id);
      saveSeen(this.known(), localStorage);
    }
    this.shown.lit?.classList.remove('tipLit');
    this.shown = null;
    if (this.card) this.card.hidden = true;
  }

  private show(id: TipId, anchor: Anchor, box: Box): void {
    const card = this.cardEl();
    // (the first tip ever shown can be skipped: the whole tutorial goes)
    ($('tipSkip') as HTMLButtonElement).hidden = this.known().size > 0;
    $('tipText').textContent = TIPS[id].text;
    const lit = anchor instanceof HTMLElement ? anchor : null;
    lit?.classList.add('tipLit');
    this.shown = { id, anchor, lit };
    card.hidden = false;
    this.position(box);
  }

  private position(box: Box): void {
    const card = this.cardEl();
    const p = placeBubble(box, { w: card.offsetWidth, h: card.offsetHeight }, { w: viewW(), h: viewH() });
    card.style.left = `${p.x}px`;
    card.style.top = `${p.y}px`;
    card.dataset.side = p.side;
    card.style.setProperty('--ax', `${p.ax}px`);
    card.style.setProperty('--ay', `${p.ay}px`);
  }

  /** The bubble's element, made the first time (its buttons wired then). */
  private cardEl(): HTMLElement {
    if (!this.card) {
      this.card = $('tip');
      $('tipGot').addEventListener('click', () => this.dismiss(true));
      $('tipSkip').addEventListener('click', () => {
        for (const id of IDS) this.known().add(id);
        saveSeen(this.known(), localStorage);
        this.queue = [];
        this.dismiss(false);
      });
    }
    return this.card;
  }

  /** Start the tutorial again: every tip is unseen, and the next time its moment comes it shows. */
  reset(): void {
    this.seen = new Set();
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* (no storage: nothing to clear) */
    }
    this.queue = [];
    this.dismiss(false);
  }
}

const $ = (id: string) => document.getElementById(id) as HTMLElement;

/** Whether the page a tip belongs to is the one showing: the home screen, or the game under no recruit page or result. */
function pageUp(page: 'home' | 'game'): boolean {
  const up = (id: string) => !$(id).hidden;
  if (up('gacha')) return false;
  return page === 'home' ? up('home') : !up('home') && !up('result');
}

/** The box an anchor is at now, or null if it is not on the screen (hidden, or no longer there). */
function boxOf(anchor: Anchor): Box | null {
  if (!(anchor instanceof HTMLElement)) return anchor();
  const r = anchor.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? { x: r.left - colLeft(), y: r.top, w: r.width, h: r.height } : null;
}

export const tips = new Tips();

/** A button for the Castle page that starts the tips again. */
export function resetTipsButton(): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = 'Reset tips';
  b.addEventListener('click', () => {
    tips.reset();
    b.textContent = 'Tips reset';
  });
  return b;
}
