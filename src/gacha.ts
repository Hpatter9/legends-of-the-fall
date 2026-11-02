// The recruiting screen (#gacha): the stones, the pull buttons and rates, a tarot card for each pull (`summonTarot.ts`; a hero
// who joins then has its first-time reveal), and the list of every hero with the locked ones shaded. It only reads and changes the Meta through the sim's own functions.

import { ALL_HEROES, UNITS } from './sim/units';
import { heroClassLabel, heroName, heroTitle } from './sim/heroNames';
import { awakenedOf, AWAKEN_SHARDS } from './sim/awaken';
import { LUCKY_ODDS, MAX_RANK, RANK_MULT, RANK_SHARDS, rankOf, saveMeta, stoneCost, stonesOf, takenRank, useStones, type Meta, type Pull } from './sim/meta';
import { closest, haveOf, needOf, ownedCount } from './sim/unlock';
import { pityAt } from './sim/unlockRules';
import { isSecret } from './sim/secretHeroes';
import { secretFigure } from './secretView';
import { portrait } from './render/sheets';
import { heroCard, pullInfo, queueReveal, revealUnseen, tarotBack, tarotFace } from './summonTarot';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

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
    ($('collectionPanel') as HTMLDetailsElement).open = true;
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
      cell.append(secret ? secretFigure(72) : portrait(def.sheet, 72), name);
      if (owned) cell.append(this.rankLine(kind));
      else if (begun) cell.append(unlockBar(m, kind));
      else if (secret) cell.append(small('A secret'));
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

  /** Shards turn to tarot cards; joins begin as dark figures, then play the chamber arrival in queue order.
   *  After acknowledgement, each joined figure is shown in full. Every reward keeps its saved shard count. */
  private reveal(got: Pull[]): void {
    this.clearReveal();
    this.busy = true;
    const batch = ++this.batch;
    const box = $('reveal');
    $('gacha').classList.add('hasResults');
    $('gacha').querySelector('.gachaBody')!.scrollTop = 0;
    const fresh = got.filter(p => p.isNew).length;
    $('gacha').querySelector('h2')!.textContent = fresh ? 'A new ally answers' : 'The cards are drawn';
    $('gachaClose').textContent = 'Continue';
    $('resultIntro').hidden = false;
    $('resultSummary').textContent = got.length === 1 ? 'The card turns…' : `${got.length} cards drawn`;
    $('revealAll').hidden = got.length === 1;
    ($('collectionPanel') as HTMLDetailsElement).open = false;
    ($('summonRules') as HTMLDetailsElement).open = false;
    box.replaceChildren();
    box.className = got.length === 1 ? 'tarotSingle' : 'tarotSpread';
    const px = got.length === 1 ? 230 : 70;
    let turned = 0;
    got.forEach((p) => {
      const res = document.createElement('div');
      res.className = `tarotResult${p.isNew ? ' joined' : ''}${p.lucky ? ' lucky' : ''}`;
      res.dataset.kind = p.kind;
      const turn = document.createElement('div');
      turn.className = 'tarotTurn';
      turn.tabIndex = 0;
      turn.setAttribute('role', 'button');
      turn.setAttribute('aria-label', 'Turn the card');
      const back = document.createElement('div');
      back.className = 'tarotSide back';
      back.append(p.isNew ? heroCard(p.kind, px) : tarotBack());
      if (p.isNew) back.style.filter = 'brightness(0.15)';
      const front = document.createElement('div');
      front.className = 'tarotSide front';
      front.append(p.isNew ? heroCard(p.kind, px) : tarotFace(p.kind, px));
      if (p.isNew) front.style.filter = 'brightness(0.15)';
      turn.append(back, front);
      res.append(turn, pullInfo(this.meta, p));
      const up = (): void => {
        if (res.classList.contains('up')) return;
        res.classList.add('up');
        const n = p.unlock ?? p.shards;
        turn.setAttribute('aria-label', `${heroTitle(p.kind)}: ${p.isNew ? 'joined your company' : p.crowns ? `${p.crowns} crowns` : `${n} shard${n === 1 ? '' : 's'}`}${p.unlock && p.need && !p.isNew ? `, ${p.have} of ${p.need} to join` : ''}`);
        turned++;
        if (turned < got.length) {
          $('resultSummary').textContent = `${turned} / ${got.length} cards turned`;
          return;
        }
        this.revealTimers.forEach(timer => window.clearTimeout(timer));
        this.revealTimers = [];
        $('revealAll').hidden = true;
        $('resultSummary').textContent = fresh ? `A new ally answers the call…` : got.length === 1 ? 'The card is turned' : `${got.length} cards drawn`;
        // (a moment to see the spread, then each join's unlock scene)
        this.revealTimers.push(window.setTimeout(() => void this.playJoins(got, batch), fresh ? 900 : 0));
      };
      turn.addEventListener('click', up);
      turn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); up(); }
      });
      box.append(res);
      this.revealCards.push(turn);
    });
    // (the cards turn by themselves, left to right)
    let at = 260;
    for (const card of this.revealCards) {
      this.revealTimers.push(window.setTimeout(() => card.click(), at));
      at += got.length === 1 ? 0 : 140;
    }
    this.refresh();
  }

  /** Every join of the batch plays its first-time reveal in turn; then its card shows the hero, and the screen is free again. */
  private async playJoins(got: Pull[], batch: number): Promise<void> {
    const px = got.length === 1 ? 230 : 70;
    for (const p of got) {
      if (!p.isNew) continue;
      await queueReveal(this.meta, p.kind, { lucky: p.lucky, force: true });
      if (batch !== this.batch) return;
      const res = $('reveal').querySelector<HTMLElement>(`.tarotResult.joined[data-kind="${p.kind}"]`);
      const front = res?.querySelector<HTMLElement>('.tarotSide.front');
      front?.replaceChildren(heroCard(p.kind, px));
      if (front) front.style.filter = '';
    }
    if (batch !== this.batch) return;
    this.busy = false;
    const fresh = got.filter(p => p.isNew).length;
    const p = got[0];
    $('resultSummary').textContent = got.length === 1
      ? p.lucky && p.isNew ? 'Lucky! A whole hero answers the call' : p.lucky ? 'Lucky! A great store of rank shards' : p.isNew ? 'A new ally joins your company' : p.unlock ? 'Another step towards a new ally' : p.crowns ? 'A tribute for your kingdom' : 'Your company grows stronger'
      : `${got.length} cards drawn${fresh ? ` · ${fresh} new ${fresh === 1 ? 'ally' : 'allies'}` : ''}`;
    this.refresh();
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
  return `Each summoning stone you use gives one shard of one hero. A new hero joins when its bar fills; one you have earns rank (+${Math.round((RANK_MULT - 1) * 100)}% hp and attack a rank, up to ${MAX_RANK}, then awakening): tap Rank up on its sheet to take it. One stone in ${LUCKY_ODDS} is a lucky summon: a whole hero you do not have joins at once. The more heroes you have, the more stones land on them rather than on a new one. Stones come in chests: buy them in the chest shop with crowns, or win them from armies, the daily, the Last Stand and the Calamity. Ten heroes are earned in play, never summoned: see the Heroes tab.`;
}

/** The plain line under the summon buttons. */
export const luckyLine = (): string => `1 in ${LUCKY_ODDS} stones is a lucky summon: a whole new hero at once`;
