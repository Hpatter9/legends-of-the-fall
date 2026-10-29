// The recruiting screen (#gacha): crowns, the pull buttons and rates, a card-flip reveal of each pull, and the list of
// every hero with the locked ones shaded. It only reads and changes the Meta through the sim's own functions.

import { ALL_HEROES, UNITS } from './sim/units';
import { awakenedOf, AWAKEN_SHARDS } from './sim/awaken';
import { LUCKY_ODDS, MAX_RANK, RANK_MULT, RANK_SHARDS, rankOf, saveMeta, stoneCost, stonesOf, takenRank, useStones, type Meta, type Pull } from './sim/meta';
import { closest, haveOf, needOf, ownedCount } from './sim/unlock';
import { isContent, pityAt } from './sim/unlockRules';
import { CLASS_NAMES, CLASS_OF } from './sim/starter';
import { portrait } from './render/sheets';
import { play as playSfx } from './render/sound';
import { revealJoins, shardResult, tarotFace } from './summonTarot';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** The debug hook for the lucky roll: a page (or a screenshot script) sets `window.__forceLucky = true` to make the next summons lucky. The sim's own odds are untouched. */
const forced = (): { lucky?: boolean } => ((window as unknown as { __forceLucky?: boolean }).__forceLucky ? { lucky: true } : {});

export class Gacha {
  private busy = false;
  private revealTimers: number[] = [];
  private revealCards: HTMLElement[] = [];
  private revealingAll = false;
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
    $('revealAll').addEventListener('click', () => {
      this.revealingAll = true;
      this.revealCards.forEach(card => card.click());
      this.revealingAll = false;
      this.revealCards.find(card => card.classList.contains('new'))?.scrollIntoView({ block: 'center', behavior: 'auto' });
    });
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
  }

  close(): void {
    this.clearReveal();
    $('gacha').hidden = true;
    this.onClose();
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
    if (this.again) {
      if (this.busy || stonesOf(this.meta) < stoneCost(count)) return;
      $('gacha').hidden = true;
      this.again(count);
      return;
    }
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

  /** The ceremonial seals open repeats first and new heroes last; each reward keeps its own saved shard count. */
  private reveal(got: Pull[]): void {
    // (SUMMON-TAROT phase A: the prototype tarot results, only when a mock-up page asks for them)
    const proto = (window as unknown as { __tarotMock?: 'sigil' | 'shadow' }).__tarotMock;
    if (proto) return this.tarotReveal(got, proto);
    this.clearReveal();
    this.busy = true;
    const box = $('reveal');
    $('gacha').classList.add('hasResults');
    $('gacha').querySelector('.gachaBody')!.scrollTop = 0;
    $('gacha').querySelector('h2')!.textContent = got.some(p => p.isNew) ? 'A new ally answers' : 'The cards reveal';
    $('gachaClose').textContent = 'Continue';
    $('resultIntro').hidden = false;
    $('resultSummary').textContent = got.length === 1 ? 'Tap the seal to reveal your reward' : `${got.length} summons · tap a seal to reveal`;
    $('revealAll').hidden = got.length === 1;
    ($('collectionPanel') as HTMLDetailsElement).open = false;
    ($('summonRules') as HTMLDetailsElement).open = false;
    box.replaceChildren();
    box.classList.toggle('single', got.length === 1);
    let revealed = 0;
    let celebrated = false;
    got.forEach((p) => {
      const def = UNITS[p.kind];
      const card = document.createElement('div');
      card.className = `flip${p.isNew ? ' new' : ' tarot'}${p.lucky ? ' lucky' : ''}${def.name.length > 14 ? ' longName' : ''}`;
      card.dataset.kind = p.kind;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Reveal summon');
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
      const face = document.createElement('div');
      face.className = 'face';
      const seal = document.createElement('span');
      seal.className = 'resultSeal';
      seal.textContent = p.lucky ? 'Lucky summon' : p.isNew ? 'New hero' : p.crowns ? 'Crowns' : p.unlock ? 'Hero shards' : 'Rank shards';
      const scene = document.createElement('div');
      scene.className = 'summonPortrait';
      scene.append(portrait(def.sheet, got.length === 1 ? 192 : 112));
      const caption = document.createElement('div');
      caption.className = 'summonCaption';
      const name = document.createElement('b');
      name.textContent = def.name;
      const role = small(CLASS_NAMES[CLASS_OF[p.kind]]);
      caption.append(name, role);
      const reward = document.createElement('div');
      reward.className = 'resultReward';
      const tag = document.createElement('em');
      const shardCount = p.unlock ?? p.shards;
      tag.textContent = p.lucky && p.isNew ? 'Called to your company at once' : p.isNew ? 'Joined your company' : p.crowns ? `+${p.crowns} crowns` : `+${shardCount} shard${shardCount === 1 ? '' : 's'}`;
      reward.append(tag);
      if (p.unlock && p.need && !p.isNew) {
        const label = small(`${p.have} / ${p.need} to recruit`);
        label.className = 'resultProgressLabel';
        const bar = cardBar(p.have! / p.need);
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-label', `${def.name} recruitment`);
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', `${p.need}`);
        bar.setAttribute('aria-valuenow', `${p.have}`);
        reward.append(bar, label);
      }
      if (got.length === 1) {
        const description = small(def.role);
        description.className = 'resultDescription';
        reward.append(description);
      }
      if (p.lucky) {
        // (one burst of gold when the card turns, played once: no loop)
        const burst = document.createElement('div');
        burst.className = 'luckyBurst';
        burst.setAttribute('aria-hidden', 'true');
        face.append(burst);
      }
      if (p.isNew) {
        const celebration = document.createElement('div');
        celebration.className = 'summonCelebration';
        celebration.setAttribute('aria-hidden', 'true');
        face.append(celebration);
      }
      face.append(seal, scene, caption, reward);
      const back = document.createElement('div');
      back.className = 'back';
      const sigil = document.createElement('span');
      sigil.textContent = '◆';
      const invitation = small('Tap to reveal');
      back.append(sigil, invitation);
      card.append(back, face);
      card.addEventListener('click', () => {
        if (card.classList.contains('up')) return;
        card.classList.add('up');
        if (p.isNew || p.lucky) {
          if (!celebrated) playSfx('stingSummon');
          celebrated = true;
          if (got.length > 1 && !this.revealingAll) card.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        }
        card.setAttribute('aria-label', `${def.name}: ${tag.textContent}${p.unlock && p.need && !p.isNew ? `, ${p.have} of ${p.need} to recruit` : ''}`);
        revealed++;
        if (revealed < got.length) {
          $('resultSummary').textContent = `${revealed} / ${got.length} rewards revealed`;
          return;
        }
        this.revealTimers.forEach(timer => window.clearTimeout(timer));
        this.revealTimers = [];
        this.busy = false;
        $('revealAll').hidden = true;
        const fresh = got.filter(pull => pull.isNew).length;
        $('resultSummary').textContent = got.length === 1
          ? p.lucky && p.isNew ? 'Lucky! A whole hero answers the call' : p.lucky ? 'Lucky! A great store of rank shards' : p.isNew ? 'A new ally joins your company' : p.unlock ? 'Another step towards a new ally' : p.crowns ? 'A tribute for your kingdom' : 'Your company grows stronger'
          : `${got.length} rewards revealed${fresh ? ` · ${fresh} new ${fresh === 1 ? 'ally' : 'allies'}` : ''}`;
        this.refresh();
      });
      box.append(card);
      this.revealCards.push(card);
    });
    const order = got.map((_, i) => i).sort((x, y) => Number(got[x].isNew) - Number(got[y].isNew) || x - y);
    let at = 220;
    for (const i of order) {
      this.revealTimers.push(window.setTimeout(() => this.revealCards[i]?.click(), at));
      at += got[i].isNew ? 900 : 160;
    }
    this.refresh();
  }
}

export interface Gacha {
  tarotReveal(got: Pull[], variant: 'sigil' | 'shadow'): void;
}

/** SUMMON-TAROT phase A prototype: every shard a tarot card (laid out five to a row), every join a card that its first-time reveal
 *  scene opens, played one after another once the spread is laid. */
Gacha.prototype.tarotReveal = function (this: Gacha, got: Pull[], variant: 'sigil' | 'shadow'): void {
  const self = this as unknown as { meta: Meta; busy: boolean; refresh(): void; clearReveal(): void };
  self.clearReveal();
  const box = $('reveal');
  $('gacha').classList.add('hasResults');
  $('gacha').querySelector('.gachaBody')!.scrollTop = 0;
  const fresh = got.filter(p => p.isNew).length;
  $('gacha').querySelector('h2')!.textContent = fresh ? 'A new ally answers' : 'The cards are drawn';
  $('gachaClose').textContent = 'Continue';
  $('resultIntro').hidden = false;
  $('resultSummary').textContent = got.length === 1 ? (got[0].isNew ? 'A new ally joins your company' : 'Another step towards a new ally') : `${got.length} cards drawn${fresh ? ` · ${fresh} new ${fresh === 1 ? 'ally' : 'allies'}` : ''}`;
  $('revealAll').hidden = true;
  ($('collectionPanel') as HTMLDetailsElement).open = false;
  ($('summonRules') as HTMLDetailsElement).open = false;
  box.replaceChildren();
  box.className = got.length === 1 ? 'tarotSingle' : 'tarotSpread';
  const px = got.length === 1 ? 230 : 70;
  for (const p of got) {
    if (!p.isNew) { box.append(shardResult(self.meta, p, px, variant)); continue; }
    // (a join: its card stays a sigil until its reveal has played, then it shows the hero)
    const res = document.createElement('div');
    res.className = 'tarotResult joined';
    res.dataset.kind = p.kind;
    res.append(tarotFace(p.kind, px, variant));
    const name = document.createElement('b');
    name.className = 'tarotName';
    name.textContent = UNITS[p.kind].name;
    const tag = document.createElement('em');
    tag.className = 'tarotGain';
    tag.textContent = p.lucky ? 'Lucky! Joined' : 'Joined';
    res.append(name, tag);
    box.append(res);
  }
  self.refresh();
  if (!fresh) return;
  window.setTimeout(() => void revealJoins(got).then(() => {
    for (const res of box.querySelectorAll<HTMLElement>('.tarotResult.joined')) {
      const kind = res.dataset.kind!;
      const fig = document.createElement('div');
      fig.className = 'tarotFig';
      fig.style.setProperty('--cls', (res.firstElementChild as HTMLElement).style.getPropertyValue('--cls'));
      fig.append(portrait(UNITS[kind].sheet, 128));
      res.firstElementChild!.replaceWith(fig);
    }
  }), 700);
};

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
  return `Nearest: ${UNITS[near].name} ${haveOf(m, near)}/${needOf(m)} · its shards are sure within ${left} stone${left === 1 ? '' : 's'}`;
}

/** The recruit page's short rule: what a stone is, the lucky chance, and why new heroes turn up less as the roster grows. */
export function ratesText(): string {
  return `Each summoning stone you use gives one shard of one hero. A new hero joins when its bar fills; one you have earns rank (+${Math.round((RANK_MULT - 1) * 100)}% hp and attack a rank, up to ${MAX_RANK}, then awakening): tap Rank up on its sheet to take it. One stone in ${LUCKY_ODDS} is a lucky summon: a whole hero you do not have joins at once. The more heroes you have, the more stones land on them rather than on a new one. Stones come in chests: buy them in the chest shop with crowns, or win them from armies, the daily, the Last Stand and the Calamity. Ten heroes are earned in play, never summoned: see the Heroes tab.`;
}

/** The plain line under the summon buttons. */
export const luckyLine = (): string => `1 in ${LUCKY_ODDS} stones is a lucky summon: a whole new hero at once`;
