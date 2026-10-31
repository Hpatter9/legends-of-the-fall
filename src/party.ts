// The party screen: a cinematic tableau of the draft, its removable hero selectors, role coverage and trait bonds.
// The searchable hero grid below lets the player add or take out heroes from the summons pool (a
// long press, or the small i, opens the hero's role and skill), and the locked heroes shaded at the end. A draft is kept
// until Start or Done, which saves it through `setParty`; Back throws it away. The rules are in `src/sim/meta.ts`.

import { ALL_HEROES, UNITS } from './sim/units';
import { heroRank, partySlots, saveMeta, setParty, type Meta } from './sim/meta';
import { heroClassLabel, heroName } from './sim/heroNames';
import { progressOf, xpOf } from './sim/levels';
import { levelBadge } from './levelBadge';
import { countTraits, traitsOf } from './sim/traits';
import { traitBadge } from './traitBadge';
import { pipsOf, raisedBy } from './traitHelp';
import { lookSheet } from './render/awakenLook';
import { portrait } from './render/sheets';
import { lockInfo } from './sim/contentHeroes';
import { drawHeroSheet, starsOf } from './menuHeroes';
import { upMark } from './rankUpList';
import { markReady } from './sim/upgradesReady';
import { kindPower, powerText } from './sim/power';
import { partyTableau } from './partyScene';
import { awakenedStep } from './render/awakenRig';
import { ROLE_NAMES, roleOf, suggestParty, type PartyRole } from './sim/suggest';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** How long a press holds before it opens the hero's details instead of toggling it. */
const LONG_PRESS_MS = 450;

/** A small padlock for a quest's locked slot (drawn, so it is crisp at any size and needs no file). */
const PADLOCK = '<svg viewBox="0 0 12 14" width="12" height="14" aria-hidden="true"><path d="M3 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="1.5" y="6" width="9" height="7" rx="1.2" fill="currentColor"/></svg>';

export class Party {
  /** The draft: the kinds picked so far (saved only by Start or Done). */
  private picked: string[] = [];
  private note = '';
  private filter: PartyRole | 'all' = 'all';
  private search = '';
  private sceneKey = '';
  private held = false;
  /** The trait picked to find its heroes in the grid (a tap on any badge), or none. */
  private focus?: string;
  private stopSheet: (() => void) | null = null;
  private onDone: () => void = () => {};
  /** A quest battle's party (batch 2 of the quests): its required cast, locked in their slots, its title and rule, and where the
   *  picks go (they are the battle's own: the saved party is not changed). Null for the ordinary party screen. */
  private quest: { cast: readonly string[]; title: string; rule: string; fits: (kind: string) => boolean; then: (picked: string[]) => void } | null = null;

  constructor(
    private meta: Meta,
    private onBack: () => void,
  ) {
    $('ptBack').addEventListener('click', () => this.close(this.onBack));
    $('ptGo').addEventListener('click', () => this.confirm());
    $('ptSuggest').addEventListener('click', () => this.suggest());
    $('ptSearch').addEventListener('input', () => {
      this.search = $<HTMLInputElement>('ptSearch').value;
      this.draw();
    });
    $('ptSheet').addEventListener('click', (e) => e.target === $('ptSheet') && this.closeSheet());
    // (a tap anywhere but on a badge lets go of the picked trait)
    $('party').addEventListener('click', (e) => {
      if (!this.focus || (e.target as HTMLElement).closest('.tbw')) return;
      this.focus = undefined;
      this.draw();
    });
  }

  /** Open the screen on the saved party. `then` runs once the party is saved: a new run starts, or the hub returns. */
  open(mode: 'start' | 'edit', then: () => void): void {
    this.quest = null;
    document.getElementById('party')?.classList.remove('questParty');
    this.picked = [...this.meta.party];
    this.note = '';
    this.focus = undefined;
    this.onDone = then;
    this.filter = 'all';
    this.search = '';
    $<HTMLInputElement>('ptSearch').value = '';
    $('ptGo').textContent = mode === 'start' ? '⚔  March to battle' : 'Save company';
    $('party').hidden = false;
    this.draw();
    $('ptBody').scrollTop = 0;
  }

  /** Open the screen for a quest battle: the required cast already in their slots, locked (a gold frame and a padlock), the other
   *  slots filled from the saved party (no repeats, and only heroes who may fight in it). `then` gets the picks; nothing is saved. */
  openQuest(cast: readonly string[], title: string, rule: string, fits: (kind: string) => boolean, then: (picked: string[]) => void): void {
    this.open('start', () => {});
    this.quest = { cast, title, rule, fits, then };
    $('party').classList.add('questParty');
    this.picked = [...cast, ...this.meta.party.filter((k) => !cast.includes(k) && fits(k))].slice(0, this.slots);
    $('ptGo').textContent = '⚔  To the quest';
    this.draw();
  }

  private get slots(): number {
    return partySlots(this.meta);
  }

  private confirm(): void {
    if (this.quest) {
      const q = this.quest;
      if (this.picked.length !== this.slots || !q.cast.every((k) => this.picked.includes(k))) return;
      this.close();
      return q.then([...this.picked]);
    }
    if (!setParty(this.meta, this.picked)) return;
    saveMeta(this.meta);
    this.close();
    this.onDone();
  }

  private close(then?: () => void): void {
    this.closeSheet();
    $('party').hidden = true;
    then?.();
  }

  /** Fill the draft with the best party the unlocked heroes make (nothing is saved until Start or Done). */
  private suggest(): void {
    // (a quest's cast stays in; the rest are suggested from those who may fight in it)
    const q = this.quest;
    this.picked = q
      ? [...q.cast, ...suggestParty(this.meta.unlocked.filter((k) => !q.cast.includes(k) && q.fits(k)), this.slots - q.cast.length, (k) => kindPower(this.meta, k))]
      : suggestParty(this.meta.unlocked, this.slots, (k) => kindPower(this.meta, k));
    const traits = countTraits(this.picked).filter((c) => c.active).map((c) => c.trait.name);
    const roles = [...new Set(this.picked.map(roleOf))].map((r) => ROLE_NAMES[r]);
    this.note = '';
    this.draw();
    $('ptHint').textContent = `Suggested: ${traits.length ? `wakes ${traits.join(', ')}; ` : ''}${roles.join(', ')}`;
  }

  /** Add a hero to the party, or take it out. A full party asks for one out first. */
  private toggle(kind: string): void {
    // (a quest's required hero stays: a nudge and a word say why)
    if (this.quest?.cast.includes(kind)) {
      this.note = `${heroName(kind)} must fight in this one.`;
      this.draw();
      const slot = $('ptSlots').querySelector<HTMLElement>(`[data-kind="${kind}"]`);
      slot?.classList.remove('nudge');
      void slot?.offsetWidth;
      slot?.classList.add('nudge');
      return;
    }
    if (this.quest && !this.picked.includes(kind) && !this.quest.fits(kind)) {
      this.note = `${heroName(kind)} may not fight in this one: ${this.quest.rule}.`;
      return this.draw();
    }
    if (this.picked.includes(kind)) {
      this.picked = this.picked.filter((k) => k !== kind);
      this.note = '';
    } else if (this.picked.length < this.slots) {
      this.picked.push(kind);
      this.note = '';
    } else this.note = 'The party is full: take a hero out first.';
    this.draw();
  }

  /** A press that holds opens the hero's details; the click that follows a held press does nothing. */
  private holdTo(card: HTMLElement, kind: string): void {
    let timer = 0;
    card.addEventListener('pointerdown', () => {
      this.held = false;
      timer = window.setTimeout(() => {
        this.held = true;
        this.openSheet(kind);
      }, LONG_PRESS_MS);
    });
    for (const end of ['pointerup', 'pointerleave', 'pointercancel']) card.addEventListener(end, () => clearTimeout(timer));
    card.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** A badge that picks its trait (tap again to let go); a press on it still counts towards a card's long press. */
  private badge(id: string, plus = false, small = false): HTMLElement {
    const b = traitBadge(id, { plus, small, lit: this.focus === id, dim: !!this.focus && this.focus !== id });
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.held) return void (this.held = false);
      this.focus = this.focus === id ? undefined : id;
      this.draw();
    });
    return b;
  }

  private openSheet(kind: string): void {
    this.closeSheet();
    $('ptSheet').hidden = false;
    this.stopSheet = drawHeroSheet($('ptSheetBox'), this.meta, kind, () => this.closeSheet());
  }

  private closeSheet(): void {
    this.stopSheet?.();
    this.stopSheet = null;
    $('ptSheet').hidden = true;
  }

  private draw(): void {
    const m = this.meta;
    const slots = this.slots;
    const full = this.picked.length === slots;

    // the five slots: a hero to take out, or an empty place
    const row = $('ptSlots');
    row.replaceChildren();
    for (let i = 0; i < slots; i++) {
      const kind = this.picked[i];
      if (!kind) {
        const empty = el('div', 'ptSlot empty');
        const number = el('span', 'ptSlotNumber', String(i + 1));
        number.dataset.number = String(i + 1);
        empty.append(number, el('small', '', 'Recruit +'));
        row.append(empty);
        continue;
      }
      const locked = !!this.quest?.cast.includes(kind);
      const b = el('button', locked ? 'ptSlot quest' : 'ptSlot');
      b.dataset.kind = kind;
      b.setAttribute('aria-label', locked ? `${heroClassLabel(kind)} must fight in this quest` : `Remove ${heroClassLabel(kind)} from party`);
      b.title = locked ? `${heroClassLabel(kind)} must fight · hold for details` : `Remove ${heroClassLabel(kind)} · hold for details`;
      const remove = el('span', locked ? 'ptSlotLock' : 'ptSlotRemove', locked ? '' : '×');
      remove.setAttribute('aria-hidden', 'true');
      if (locked) remove.innerHTML = PADLOCK;
      const number = el('span', 'ptSlotNumber', String(i + 1));
      number.dataset.number = String(i + 1);
      b.append(number, el('small', '', heroName(kind)), remove);
      if (locked) b.append(el('span', 'ptQuestRibbon', 'Quest'));
      b.addEventListener('click', () => (this.held ? (this.held = false) : this.toggle(kind)));
      this.holdTo(b, kind);
      row.append(b);
    }

    // the hint, and the traits the party would wake (the same rule as a fight's team)
    const hint = $('ptHint');
    hint.textContent = this.note || (this.quest ? `${this.quest.title} · ${this.quest.rule}` : full ? 'Tap a chosen hero to remove · hold for details' : 'Choose a reinforcement to fill your company');
    hint.classList.toggle('full', !!this.note);
    const counts = countTraits(this.picked);
    const active = counts.filter((c) => c.active);
    $('ptBondCount').textContent = `${active.length} active · ${counts.length - active.length} building`;
    $('ptBonds').hidden = !counts.length;
    $('ptStatus').textContent = full ? 'Ready · summons draw from this company' : `${slots - this.picked.length} more ${slots - this.picked.length === 1 ? 'hero' : 'heroes'} needed`;
    $('ptSceneTitle').textContent = this.quest ? this.quest.title : full ? `${slots === 5 ? 'Five' : slots} heroes. One last stand.` : this.picked.length ? 'A company worth fighting for.' : 'Your legend begins here.';
    $('ptCount').textContent = `${this.picked.length} / ${slots} ready`;
    $('ptAvailable').textContent = `${m.unlocked.length} available`;
    const key = this.picked.join('|');
    if (this.sceneKey !== key || !$('ptTableau').firstChild) {
      $('ptTableau').replaceChildren(partyTableau(this.picked, (k) => awakenedStep(this.meta, k)));
      this.sceneKey = key;
    }
    const roles = $('ptRoles');
    roles.replaceChildren();
    for (const [id, name] of Object.entries(ROLE_NAMES)) {
      const n = this.picked.filter((kind) => roleOf(kind) === id).length;
      const chip = el('span', n ? 'covered' : '', `${n ? '◆' : '◇'} ${name} ${n}`);
      roles.append(chip);
    }
    const filters = $('ptFilters');
    filters.replaceChildren();
    for (const [id, name] of [['all', 'All'], ...Object.entries(ROLE_NAMES)]) {
      const button = el('button', '', name);
      button.setAttribute('aria-pressed', String(this.filter === id));
      button.addEventListener('click', () => {
        this.filter = id as PartyRole | 'all';
        this.draw();
        $('ptFilters').querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
      });
      filters.append(button);
    }
    const traits = $('ptTraits');
    traits.replaceChildren();
    for (const c of counts) {
      const next = c.trait.tiers[Math.min(c.trait.tiers.length - 1, c.tier + 1)];
      const line = el('div', `ptTrait${c.active ? ' on' : ''}`);
      // (an active trait says what it gives now; one still asleep says what it would give)
      const text = c.active ? c.trait.tiers[c.tier].text : next.text;
      line.append(this.badge(c.trait.id), el('b', '', c.trait.name), el('span', 'pips', pipsOf(c.count, c.goal)), el('span', 'fx', text));
      traits.append(line);
    }

    // the unlocked heroes first (in the game's order), the locked ones shaded at the end
    const grid = $('ptGrid');
    grid.replaceChildren();
    const order = [...ALL_HEROES].sort((a, b) => Number(m.unlocked.includes(b)) - Number(m.unlocked.includes(a)));
    for (const kind of order) {
      const def = UNITS[kind];
      if (this.filter !== 'all' && roleOf(kind) !== this.filter) continue;
      // Unknown locked names stay unknown, including through search.
      const known = m.unlocked.includes(kind) || lockInfo(m, kind)?.named;
      if (this.search.trim() && (!known || !`${heroName(kind)} ${def.name}`.toLocaleLowerCase().includes(this.search.trim().toLocaleLowerCase()))) continue;
      const open = m.unlocked.includes(kind);
      const on = this.picked.includes(kind);
      const hit = !!this.focus && traitsOf(kind).includes(this.focus);
      const card = el('button', `hcard ptCard${open ? '' : ' locked'}${on ? ' picked' : ''}${hit ? ' hit' : ''}${this.focus && !hit ? ' faded' : ''}`);
      card.setAttribute('aria-pressed', String(on));
      card.append(portrait(lookSheet(kind, heroRank(this.meta, kind), 1), 56));
      if (on) card.append(el('span', 'ptPickedFlag', '◆ Chosen'));
      if (open) card.append(el('span', 'ptCardRole', ROLE_NAMES[roleOf(kind)]));
      const lock = lockInfo(m, kind);
      card.append(el('b', '', open || lock?.named ? heroName(kind) : '???'));
      if (open) {
        const p = progressOf(xpOf(m, kind));
        const tags = el('span', 'ptTags');
        const up = this.picked.length < slots ? raisedBy(this.picked, kind) : [];
        for (const t of traitsOf(kind)) tags.append(this.badge(t, up.includes(t)));
        card.append(el('span', 'stars', starsOf(m, kind)), levelBadge(p.level), el('span', 'pw', `Power ${powerText(kindPower(m, kind))}`), tags);
      } else {
        card.append(el('span', 'lv', lock!.short));
        if (lock!.need) {
          const bar = el('div', 'xpbar');
          const fill = el('span');
          fill.style.width = `${Math.min(1, lock!.now / lock!.need) * 100}%`;
          bar.append(fill);
          card.append(bar);
        }
      }
      // (TAVERN-RANKUP: a hero with a rank or an awakening ready, or talent points to spend (TALENT-ARROWS), wears the gold chevron by the "i" that opens its sheet)
      if (open && markReady(m, kind)) card.append(upMark('upCorner ptUp'));
      const info = el('span', 'ptInfo', 'i');
      info.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSheet(kind);
      });
      card.append(info);
      if (open) {
        card.addEventListener('click', () => (this.held ? (this.held = false) : this.toggle(kind)));
        this.holdTo(card, kind);
      } else card.addEventListener('click', () => this.openSheet(kind));
      grid.append(card);
    }

    $('ptNoResults').hidden = !!grid.childElementCount;
    $<HTMLButtonElement>('ptGo').disabled = !full;
  }
}
