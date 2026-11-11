import { mythicFits, MYTHIC_LIMIT_WORDS } from './sim/mythicRules';
// The party screen: a cinematic tableau of the draft, its removable hero selectors, role coverage and trait bonds.
// The searchable hero grid below lets the player add or take out heroes from the summons pool (a
// long press, or the small i, opens the hero's role and skill), and the locked heroes shaded at the end. A draft is kept
// until Start or Done, which saves it through `setParty`; Back throws it away. The rules are in `src/sim/meta.ts`.
// (HEROES-FILTER: the Satchel and the Plan, the March orders, are off this page: they are in the pack, a drawer pulled out from the right
// edge, `partyPack.ts`; the page keeps one line of what is packed over the start button.)

import { glyphWord } from './paintedButton';
import { PartyPack } from './partyPack';
import { rosterRows, viewRows, type RosterView } from './heroFilterRules';
import { rosterTools, type RosterTools } from './heroFilterView';
import { retired } from './sim/legacy';
import { fieldedOf, fieldsElder } from './sim/dynasty';
import { mourning, mourningLeft } from './sim/oath';
import { bannerChoices, fieldName } from './sim/heirs';
import { openBanner } from './housesView';
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
import { isSecret } from './sim/secretHeroes';
import { secretFigure } from './secretView';
import { drawHeroSheet, starsOf } from './menuHeroes';
import { upMark } from './rankUpList';
import { markReady } from './sim/upgradesReady';
import { kindPower, partyPower, powerText } from './sim/power';
import { partyTableau } from './partyScene';
import { awakenedStep } from './render/awakenRig';
import { ROLE_NAMES, roleOf, suggestParty } from './sim/suggest';

import { partyWear, repairAllCost } from './sim/wear';
import { stallRepairAll } from './sim/stall';
import { play } from './render/sound';
import { todayKey } from './modes';

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
  /** HEROES-FILTER: the Reinforcements' Sort and Filter, the roster's own (`heroFilterView.ts`): one saved choice for both lists. */
  private bar: RosterTools;
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
  /** UI-STANDARD: the March orders (an army's start, once any order is open): their line, and what opens them with the picks so far. */
  private orders: { line: () => string; open: (party: readonly string[], redraw: () => void) => void } | null = null;
  /** HEROES-FILTER: the pack, the drawer that holds the Satchel and the Plan. */
  private pack: PartyPack;

  constructor(
    private meta: Meta,
    private onBack: () => void,
  ) {
    this.bar = rosterTools({ rows: () => this.rows(), count: (v) => this.shown(v).length, changed: () => this.draw(), clearSearch: () => ((this.search = ''), ($<HTMLInputElement>('ptSearch').value = '')) });
    $('ptTools').append(this.bar.tools, this.bar.active);
    $('ptNoResults').append(this.bar.clearButton());
    this.pack = new PartyPack(meta);
    $('party').append(this.pack.tab);
    $('ptGo').before(this.pack.line);
    $('ptBack').addEventListener('click', () => this.close(this.onBack));
    glyphWord($('ptBack'));
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
    this.orders = null;
    this.pack.reset();
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

  /** UI-STANDARD: give the March orders for this start (`null` takes them away). Set after `open`, which clears them. They are the pack's
   *  Plan (HEROES-FILTER): its tab names them and opens them in the standard menu. */
  setOrders(o: { line: () => string; open: (party: readonly string[], redraw: () => void) => void } | null): void {
    this.orders = o;
    this.drawOrders();
  }

  /** The Plan of the pack: the orders set, unless this is a quest battle (which has none). */
  private drawOrders(): void {
    const o = this.orders;
    this.pack.setPlan(o && !this.quest ? { line: o.line, open: (redraw) => o.open([...this.picked], redraw) } : null);
  }

  /** HEROES-FILTER: every hero as the Reinforcements list sees it: the roster's rows, but "in the party" is the draft being picked, and a
   *  search also finds the bearer who takes the field. */
  private rows() {
    return rosterRows(this.meta, (k) => fieldName(this.meta, k)).map((r) => ({ ...r, inParty: this.picked.includes(r.kind) }));
  }

  /** The heroes a choice leaves in the grid: filtered and sorted by the roster's rules, the unlocked ones first and the locked shaded
   *  after them, as before. */
  private shown(v: RosterView): string[] {
    const kinds = viewRows(this.rows(), v, this.search).map((r) => r.kind);
    return [...kinds.filter((k) => this.meta.unlocked.includes(k)), ...kinds.filter((k) => !this.meta.unlocked.includes(k))];
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
    this.pack.close(true);
    $('party').hidden = true;
    then?.();
  }

  /** Fill the draft with the best party the unlocked heroes make (nothing is saved until Start or Done). */
  private suggest(): void {
    // (a quest's cast stays in; the rest are suggested from those who may fight in it)
    const q = this.quest;
    this.picked = q
      ? [...q.cast, ...suggestParty(this.meta.unlocked.filter((k) => !q.cast.includes(k) && q.fits(k)), this.slots - q.cast.length, (k) => kindPower(this.meta, k))]
      : suggestParty(this.meta.unlocked.filter((k) => !retired(this.meta, k)), this.slots, (k) => kindPower(this.meta, k));
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
    // (DEPTH-BUILD: a hero mentoring in the Hall of Legends does not march; recall it from the Hall first)
    if (!this.picked.includes(kind) && retired(this.meta, kind)) {
      this.note = `${heroName(kind)} is in the Hall of Legends: recall them there first.`;
      return this.draw();
    }
    if (!this.picked.includes(kind) && !mythicFits(this.picked, kind)) {
      this.note = MYTHIC_LIMIT_WORDS;
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
    // (CLOSE-SCREENS: the sheet left is emptied; the party's page under it stays, as the place the player is in)
    $('ptSheetBox').replaceChildren();
  }

  /** SHOP-BOOKS-GEAR: an amber strip above the start button while the company wears worn or broken gear, with one tap to mend it all
   *  (at the stall's price, counting for standing). Start is never blocked. */
  private drawWear(): void {
    const go = $('ptGo');
    let strip = document.getElementById('ptWear') as HTMLButtonElement | null;
    if (!strip) {
      strip = el('button', 'ptWear');
      strip.id = 'ptWear';
      go.before(strip);
    }
    const w = partyWear(this.meta, this.picked);
    const { cost } = repairAllCost(this.meta, this.picked);
    strip.hidden = !w.worn && !w.broken;
    if (strip.hidden) return;
    const parts = [w.worn ? `${w.worn} piece${w.worn === 1 ? '' : 's'} worn` : '', w.broken ? `${w.broken} broken` : ''].filter(Boolean).join(', ');
    strip.textContent = `${parts} · Repair all · ${cost}`;
    strip.disabled = this.meta.crowns < cost;
    strip.onclick = () => {
      if (!stallRepairAll(this.meta, todayKey(), this.picked)) return;
      saveMeta(this.meta);
      play('coin');
      this.draw();
    };
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
        empty.append(number, el('i', 'ptSlotPlus', '+'), el('small', '', 'Recruit'));
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
      // (Dynasties, phase 6: the bearer who takes the field, the heir or an elder the banner chose)
      // (phase 7: a House in mourning does not march with the armies: its slot is greyed and says so)
      const mourns = mourning(this.meta, kind, todayKey());
      if (mourns) b.classList.add('ptMourns');
      // (HEROES-FILTER: with the Satchel and the Plan off the page, the company's five are proper cards: the portrait, the name and the level)
      b.append(number, portrait(lookSheet(kind, heroRank(this.meta, kind), 1), 48), el('small', '', mourns ? `${fieldName(this.meta, kind)} · mourning` : fieldName(this.meta, kind)), levelBadge(progressOf(xpOf(this.meta, kind)).level), remove);
      if (locked) b.append(el('span', 'ptQuestRibbon', 'Quest'));
      b.addEventListener('click', () => (this.held ? (this.held = false) : this.toggle(kind)));
      this.holdTo(b, kind);
      row.append(b);
    }

    // the hint, and the traits the party would wake (the same rule as a fight's team)
    const hint = $('ptHint');
    const mourn = this.picked.filter((k) => mourning(m, k, todayKey()));
    hint.textContent = this.note || (mourn.length && !this.quest ? `${mourn.map((k) => fieldName(m, k)).join(' and ')}: the House mourns, and does not march with the armies for ${Math.max(...mourn.map((k) => mourningLeft(m, k, todayKey())))} more days` : '') || (this.quest ? `${this.quest.title} · ${this.quest.rule}` : full ? 'Tap a chosen hero to remove · hold for details' : 'Choose a reinforcement to fill your company');
    hint.classList.toggle('full', !!this.note);
    const counts = countTraits(this.picked);
    const active = counts.filter((c) => c.active);
    $('ptBondCount').textContent = `${active.length} active · ${counts.length - active.length} building`;
    $('ptBonds').hidden = !counts.length;
    $('ptStatus').textContent = full ? 'Ready · summons draw from this company' : `${slots - this.picked.length} more ${slots - this.picked.length === 1 ? 'hero' : 'heroes'} needed`;
    $('ptSceneTitle').textContent = this.quest ? this.quest.title : full ? `${slots === 5 ? 'Five' : slots} heroes. One last stand.` : this.picked.length ? 'A company worth fighting for.' : 'Your legend begins here.';
    // (the company's combined power: the same number each hero's card shows, added up, and moving as heroes are swapped)
    $('ptCount').textContent = `${this.picked.length} / ${slots} ready · Party power ${powerText(partyPower(m, this.picked))}`;
    $('ptAvailable').textContent = `${m.unlocked.length} available`;
    this.drawWear();
    this.drawOrders();
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
    // (HEROES-FILTER: which heroes, and in what order, is the roster's Sort and Filter; a hero not yet named stays unknown through any
    // filter or search, as the rules have it)
    const order = this.shown(this.bar.view());
    for (const kind of order) {
      const secret = isSecret(m, kind);
      const open = m.unlocked.includes(kind);
      const on = this.picked.includes(kind);
      const hit = !!this.focus && traitsOf(kind).includes(this.focus);
      const card = el('button', `hcard ptCard${open ? '' : ' locked'}${on ? ' picked' : ''}${hit ? ' hit' : ''}${this.focus && !hit ? ' faded' : ''}`);
      card.setAttribute('aria-pressed', String(on));
      card.append(secret ? secretFigure(56) : portrait(lookSheet(kind, heroRank(this.meta, kind), 1), 56));
      // (Dynasties, phase 6: a line with an honoured elder has a banner, the bearer who takes the field; a tap chooses, the heir by default)
      let bannerChip: HTMLElement | null = null;
      if (open && bannerChoices(m, kind).length > 1) {
        const f = fieldedOf(m, kind);
        const banner = el('span', `ptBanner${fieldsElder(m, kind) ? ' elder' : ''}`, `⚑ ${f?.name ?? heroName(kind)}`);
        banner.setAttribute('role', 'button');
        banner.setAttribute('aria-label', `${f?.name ?? heroName(kind)} takes the field. Choose who bears the banner`);
        banner.addEventListener('click', (e) => {
          e.stopPropagation();
          openBanner(m, kind, () => this.draw());
        });
        bannerChip = banner;
      }
      // (Dynasties, phase 7: a House in mourning after a bearer slain under the Oath cannot march with the armies for three days)
      if (open && mourning(m, kind, todayKey())) card.append(el('span', 'ptPickedFlag ptMourning', `In mourning · ${mourningLeft(m, kind, todayKey())}d`));
      else if (on) card.append(el('span', 'ptPickedFlag', '◆ Chosen'));
      else if (open && retired(m, kind)) card.append(el('span', 'ptPickedFlag', 'In the Hall'));
      if (open) card.append(el('span', 'ptCardRole', ROLE_NAMES[roleOf(kind)]));
      const lock = lockInfo(m, kind);
      card.append(el('b', '', open ? fieldName(m, kind) : lock?.named ? heroName(kind) : '???'));
      if (bannerChip) card.append(bannerChip);
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
    this.bar.update(order.length, this.search);
    $<HTMLButtonElement>('ptGo').disabled = !full;
  }
}
