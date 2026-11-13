// The recruiting screen (#gacha): the stones, the pull buttons and rates, a tarot card for each pull (`summonTarot.ts`; a hero
// who joins then has its first-time reveal), and the list of every hero with the locked ones shaded. It only reads and changes the Meta through the sim's own functions.

import { ALL_HEROES, UNITS } from './sim/units';
import { heroClassLabel, heroName, heroTitle } from './sim/heroNames';
import { awakenedOf, AWAKEN_SHARDS } from './sim/awaken';
import { LUCKY_ODDS, MAX_RANK, RANK_MULT, RANK_SHARDS, rankOf, saveMeta, stoneCost, stonesOf, takenRank, useStones, type Meta, type Pull } from './sim/meta';
import { closest, haveOf, nearestBegun, needOf, ownedCount } from './sim/unlock';
import { pityAt } from './sim/unlockRules';
import { isSecret } from './sim/secretHeroes';
import { secretFigure } from './secretView';
import { portrait } from './render/sheets';
import { heroCard, pullInfo, queueReveal, revealUnseen, tarotBack, tarotFace } from './summonTarot';
import { cardTimes, drawOrder, HERO_ONWARD_MS, shardTotals } from './render/summonRules';
import { modesHidden } from './sim/hiddenModes';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** BATTLE-POLISH: the collection's portraits (72 before: the list of every hero took the screen), and the row of the nearest to joining:
 *  how many and how big. */
const COLLECTION_PX = 48;
const NEAR_ROW = 5;
const NEAR_PX = 48;

/** The debug hook for the lucky roll: a page (or a screenshot script) sets `window.__forceLucky = true` to make the next summons lucky. The sim's own odds are untouched. */
const forced = (): { lucky?: boolean } => ((window as unknown as { __forceLucky?: boolean }).__forceLucky ? { lucky: true } : {});

export class Gacha {
  private busy = false;
  private revealTimers: number[] = [];
  private revealCards: HTMLElement[] = [];
  /** Counts the batches shown, so a reveal still playing from an older batch does not touch a newer one. */
  private batch = 0;
  /** `onClose` runs when the screen is shut (the run's draw pool follows the unlocks). */
  constructor(
    private meta: Meta,
    private onClose: () => void,
  ) {
    $('pull1').addEventListener('click', () => this.pull(1));
    $('pull10').addEventListener('click', () => this.pull(10));
    $('gachaClose').addEventListener('click', () => this.close());
    $('rates').textContent = ratesText();
    // (turns every card at once; the joins' reveals follow as usual)
    $('revealAll').addEventListener('click', () => this.revealCards.forEach(card => card.click()));
  }

  open(): void {
    this.clearReveal();
    $('gacha').hidden = false;
    $('gacha').classList.remove('hasResults');
    $('resultIntro').hidden = true;
    $('reveal').replaceChildren();
    $('gacha').querySelector('h2')!.textContent = 'Summoning Sanctum';
    $('gachaClose').textContent = 'Return to sanctum';
    // (BATTLE-POLISH: the whole collection starts closed, the director's call; the short row above it shows the heroes nearest to joining,
    // and the full roster is on the Heroes tab)
    ($('collectionPanel') as HTMLDetailsElement).open = false;
    this.refresh();
    // (a hero joined elsewhere and not yet revealed has its reveal before the collection shows it)
    void revealUnseen(this.meta).then(() => this.refresh());
  }

  close(): void {
    this.clearReveal();
    $('gacha').hidden = true;
    // (CLOSE-SCREENS: the pull's cards go with the screen; each opening starts empty, as `open` has it)
    $('reveal').replaceChildren();
    $('gacha').classList.remove('hasResults');
    $('resultIntro').hidden = true;
    this.onClose();
    // (a join whose cards were closed before its reveal came, by a quick tap on Continue, still has it: over the hall)
    void revealUnseen(this.meta);
  }

  private refresh(): void {
    const m = this.meta;
    $('crowns').textContent = `${stonesOf(m)} stone${stonesOf(m) === 1 ? '' : 's'}`;
    for (const [id, n] of [['pull1', 1], ['pull10', 10]] as const) {
      const b = $(id) as HTMLButtonElement;
      const price = document.createElement('small');
      price.textContent = `${stonesOf(m)} held`;
      b.replaceChildren(`Use ${stoneCost(n)} stone${n === 1 ? '' : 's'}`, price);
      b.disabled = this.busy || stonesOf(m) < stoneCost(n);
    }
    $('pity').textContent = pityLine(m);
    this.nearRow();
    const list = $('collection');
    list.replaceChildren();
    for (const kind of ALL_HEROES) {
      const def = UNITS[kind];
      const owned = m.unlocked.includes(kind);
      const begun = !owned && haveOf(m, kind) > 0;
      const cell = document.createElement('div');
      cell.className = `hero${owned ? '' : ' locked'}`;
      const name = document.createElement('b');
      name.textContent = owned || begun ? heroName(kind) : '???';
      // (SECRET-HEROES: a hero earned in play is a dark figure until it joins)
      const secret = isSecret(m, kind);
      cell.append(secret ? secretFigure(COLLECTION_PX) : portrait(def.sheet, COLLECTION_PX), name);
      if (owned) cell.append(this.rankLine(kind));
      else if (begun) cell.append(unlockBar(m, kind));
      else if (secret) cell.append(small('A secret'));
      list.append(cell);
    }
  }

  /** BATTLE-POLISH: the short row over the collection: the heroes you have begun collecting, the nearest to joining first (up to five), each
   *  with its shard bar. Hidden while none is begun. */
  private nearRow(): void {
    const m = this.meta;
    const row = $('nearRow');
    const kinds = nearestBegun(m, NEAR_ROW);
    row.hidden = !kinds.length;
    const cells = kinds.map((kind) => {
      const cell = document.createElement('div');
      cell.className = 'hero';
      cell.title = `${heroClassLabel(kind)}: ${haveOf(m, kind)} of ${needOf(m)} shards to join`;
      const name = document.createElement('b');
      name.textContent = heroName(kind);
      cell.append(portrait(UNITS[kind].sheet, NEAR_PX), name, unlockBar(m, kind));
      return cell;
    });
    const head = document.createElement('h3');
    head.textContent = 'Nearest to joining';
    const list = document.createElement('div');
    list.className = 'nearList';
    list.append(...cells);
    row.replaceChildren(head, list);
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

  /** A pull started from the summoning hall: the pull is made at once (so it is saved whatever happens), then the cards open. `play` is the hall's part (it stops its drawing); a hero's unlock scene is the cards' own first-time reveal. */
  summon(count: 1 | 10, play: (got: Pull[]) => Promise<void>): void {
    if (this.busy) return;
    const got = useStones(this.meta, count, forced());
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
    if (this.busy) return;
    const got = useStones(this.meta, count, forced());
    if (!got) return;
    saveMeta(this.meta);
    this.busy = true;
    this.refresh();
    this.reveal(got);
  }

  /** Stop old reveal timers before leaving or showing another batch. Pulls are already saved. */
  private clearReveal(): void {
    this.revealTimers.forEach(timer => window.clearTimeout(timer));
    this.revealTimers = [];
    this.revealCards = [];
    this.busy = false;
  }

  /** SUMMON-SHOW: the draw's results, shards first (`drawOrder`). Every shard is a tarot card, turned one after another by itself
   *  (or all at once by "Reveal all"); once every card is turned the totals a hero are listed, and only then do the new heroes come,
   *  each with its full reveal in the order drawn, the last one held until a tap. Each joins the spread as its reveal closes. A
   *  draw of shards only ends on the spread; a draw of new heroes only goes to the reveals almost at once. Pulls are already saved. */
  private reveal(got: Pull[]): void {
    this.clearReveal();
    this.busy = true;
    const batch = ++this.batch;
    const order = drawOrder(got);
    const shards = order.cards.map((i) => got[i]);
    const fresh = order.heroes.length;
    const box = $('reveal');
    $('gacha').classList.add('hasResults');
    $('gacha').querySelector('.gachaBody')!.scrollTop = 0;
    $('gacha').querySelector('h2')!.textContent = shards.length ? 'The cards are drawn' : 'A new ally answers';
    $('gachaClose').textContent = 'Continue';
    $('resultIntro').hidden = false;
    const waiting = fresh ? ` · ${fresh} sealed summons wait` : '';
    $('resultSummary').textContent = !shards.length
      ? fresh === 1 ? 'A new ally answers the call…' : `${fresh} new allies answer the call…`
      : got.length === 1 ? 'The card turns…' : `${shards.length} shard card${shards.length === 1 ? '' : 's'}${waiting}`;
    $('revealAll').hidden = shards.length <= 1;
    ($('collectionPanel') as HTMLDetailsElement).open = false;
    ($('summonRules') as HTMLDetailsElement).open = false;
    box.replaceChildren();
    box.className = got.length === 1 ? 'tarotSingle' : 'tarotSpread';
    // (UX-FIXES: a repeat turned to crowns is a small bare card, told in the totals below)
    const px = got.length === 1 ? 230 : 70;
    const totals = got.length > 1 && shards.length ? shardTotalsList(this.meta, got) : null;
    let turned = 0;
    const allTurned = (): void => {
      this.revealTimers.forEach(timer => window.clearTimeout(timer));
      this.revealTimers = [];
      $('revealAll').hidden = true;
      if (totals) totals.hidden = false;
      $('resultSummary').textContent = fresh
        ? fresh === 1 ? 'A new ally answers the call…' : `${fresh} new allies answer the call…`
        : got.length === 1 ? 'The card is turned' : `${shards.length} shard cards drawn`;
      if (!fresh) {
        this.busy = false;
        this.done(got);
        return;
      }
      // (a moment to read the spread and its totals, then each new hero in turn)
      this.revealTimers.push(window.setTimeout(() => void this.playJoins(got, batch), order.heroesAfter));
    };
    for (const p of shards) {
      const res = document.createElement('div');
      res.className = `tarotResult${p.lucky ? ' lucky' : ''}${got.length > 1 && p.crowns ? ' dupe' : ''}`;
      res.dataset.kind = p.kind;
      const turn = document.createElement('div');
      turn.className = 'tarotTurn';
      turn.tabIndex = 0;
      turn.setAttribute('role', 'button');
      turn.setAttribute('aria-label', 'Turn the card');
      const back = document.createElement('div');
      back.className = 'tarotSide back';
      back.append(tarotBack());
      const front = document.createElement('div');
      front.className = 'tarotSide front';
      front.append(tarotFace(p.kind, px));
      turn.append(back, front);
      res.append(turn, pullInfo(this.meta, p));
      const up = (): void => {
        if (res.classList.contains('up') || batch !== this.batch) return;
        res.classList.add('up');
        const n = p.unlock ?? p.shards;
        turn.setAttribute('aria-label', `${heroTitle(p.kind)}: ${p.crowns ? `${p.crowns} crowns` : `${n} shard${n === 1 ? '' : 's'}`}${p.unlock && p.need ? `, ${p.have} of ${p.need} to join` : ''}`);
        turned++;
        if (turned < shards.length) {
          $('resultSummary').textContent = `${turned} / ${shards.length} cards turned${waiting}`;
          return;
        }
        allTurned();
      };
      turn.addEventListener('click', up);
      turn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); up(); }
      });
      box.append(res);
      this.revealCards.push(turn);
    }
    if (totals) box.append(totals);
    // (the cards turn by themselves, left to right)
    const times = cardTimes(this.revealCards.length);
    this.revealCards.forEach((card, i) => this.revealTimers.push(window.setTimeout(() => card.click(), got.length === 1 ? times[0] : times[i])));
    if (!shards.length) allTurned();
    this.refresh();
  }

  /** Every new hero of the batch plays its full reveal in turn (all but the last go on by themselves); each then takes its place in
   *  the spread, after the shards, and the screen is free again. */
  private async playJoins(got: Pull[], batch: number): Promise<void> {
    const order = drawOrder(got);
    const box = $('reveal');
    const single = got.length === 1;
    let row: HTMLElement | null = null;
    for (const i of order.heroes) {
      const p = got[i];
      await queueReveal(this.meta, p.kind, { lucky: p.lucky, force: true, onward: i === order.held ? undefined : HERO_ONWARD_MS });
      if (batch !== this.batch) return;
      if (!row) {
        row = document.createElement('div');
        row.className = 'tarotHeroes';
        if (!single) {
          const head = document.createElement('h3');
          head.textContent = order.heroes.length === 1 ? 'A new ally joins' : 'New allies join';
          row.append(head);
        }
        box.append(row);
      }
      row.append(joinedCard(this.meta, p, single ? 230 : 110));
      // (the new allies sit below the shards and their totals: brought into view as each joins)
      row.scrollIntoView?.({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    if (batch !== this.batch) return;
    this.busy = false;
    this.done(got);
  }

  /** The summary line once a draw has been shown in full. */
  private done(got: Pull[]): void {
    const fresh = got.filter(p => p.isNew).length;
    const p = got[0];
    $('resultSummary').textContent = got.length === 1
      ? p.lucky && p.isNew ? 'Lucky! A whole hero answers the call' : p.lucky ? 'Lucky! A great store of rank shards' : p.isNew ? 'A new ally joins your company' : p.unlock ? 'Another step towards a new ally' : p.crowns ? 'A tribute for your kingdom' : 'Your company grows stronger'
      : `${got.length} cards drawn${fresh ? ` · ${fresh} new ${fresh === 1 ? 'ally' : 'allies'}` : ''}`;
    this.refresh();
  }
}

/** A new hero's card in the spread once its reveal has played: its figure in the gold frame, its name and "Joined your company". */
function joinedCard(m: Meta, p: Pull, px: number): HTMLElement {
  const res = document.createElement('div');
  res.className = `tarotResult joined up${p.lucky ? ' lucky' : ''}`;
  res.dataset.kind = p.kind;
  const turn = document.createElement('div');
  turn.className = 'tarotTurn';
  turn.setAttribute('aria-label', `${heroTitle(p.kind)}: joined your company`);
  turn.append(heroCard(p.kind, px));
  res.append(turn, pullInfo(m, p));
  return res;
}

/** SUMMON-SHOW: the shard totals of a draw, a line a hero ("Ravi ×3: +3 shards, 9/15 to join"), shown once every card is turned. */
function shardTotalsList(m: Meta, got: Pull[]): HTMLElement {
  const box = document.createElement('div');
  box.className = 'tarotTotals';
  box.hidden = true;
  const head = document.createElement('h3');
  head.textContent = 'Shards gained';
  const list = document.createElement('ul');
  for (const t of shardTotals(got)) {
    const li = document.createElement('li');
    const name = document.createElement('b');
    name.textContent = `${heroName(t.kind)}${t.cards > 1 ? ` ×${t.cards}` : ''}`;
    const what = document.createElement('span');
    const parts: string[] = [];
    if (t.unlock) parts.push(`+${t.unlock} shard${t.unlock === 1 ? '' : 's'}${t.joins ? '' : t.need ? ` · ${t.have}/${t.need} to join` : ''}`);
    if (t.rank) {
      const rank = rankOf(m, t.kind);
      const to = RANK_SHARDS[rank];
      parts.push(`+${t.rank} rank shard${t.rank === 1 ? '' : 's'} · ${to ? `rank ${rank + 1}: ${m.shards[t.kind] ?? 0}/${to}` : 'top rank'}`);
    }
    if (t.crowns) parts.push(`+${t.crowns} crowns`);
    what.textContent = parts.join(' · ');
    li.append(portrait(UNITS[t.kind].sheet, 28), name, what);
    if (t.joins) {
      const joins = document.createElement('em');
      joins.textContent = 'joins!';
      li.append(joins);
    }
    if (t.lucky) li.classList.add('lucky');
    list.append(li);
  }
  box.append(head, list);
  return box;
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
  return `Nearest: ${heroClassLabel(near)} ${haveOf(m, near)}/${needOf(m)} · its shards are sure within ${left} stone${left === 1 ? '' : 's'}`;
}

/** The recruit page's short rule: what a stone is, the lucky chance, and why new heroes turn up less as the roster grows. */
export function ratesText(): string {
  return `Each summoning stone you use gives one shard of one hero. A new hero joins when its bar fills; one you have earns rank (+${Math.round((RANK_MULT - 1) * 100)}% hp and attack a rank, up to ${MAX_RANK}, then awakening): tap Rank up on its sheet to take it. One stone in ${LUCKY_ODDS} is a lucky summon: a whole hero you do not have joins at once. The more heroes you have, the more stones land on them rather than on a new one. Stones come in chests: buy them in the chest shop with crowns, or win them from ${modesHidden() ? 'armies and the daily' : 'armies, the daily, the Last Stand and the Calamity'}. Ten heroes are earned in play, never summoned: see the Heroes tab.`;
}

/** The plain line under the summon buttons. */
export const luckyLine = (): string => `1 in ${LUCKY_ODDS} stones is a lucky summon: a whole new hero at once`;
