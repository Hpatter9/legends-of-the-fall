// BATTLE-HUD mock-ups (docs/notes/battle-hud.md): three trial layouts of the fight's bottom bar, shown only with `?hud=a`, `?hud=b` or `?hud=c` in
// the address, so the owner can pick one. Without the flag nothing here is built and the game is as it was (the hero bar, `heroBar.ts`).
//
// Each layout gives every hero a card with its name, health and pool (with numbers), its two skills by name (cost, a cooldown sweep, greyed while
// it cannot be paid for or is still locked) and its ultimate's meter as a pearly glow that fills behind the card and peaks when ready (tap to fire,
// as now). A tap on a skill's name opens a small sheet about it, and the fight is held while it is open. A cast lights the card in the skill's
// element and, by layout, draws a trail to the hero on the board or a banner by the caster. The king's spells move out of the bar: a rail on the
// right edge (A), a crown that fans them out (B), or orbs under the top bar (C).
//
// It only reads the battle and calls the sim's own command (`orderUltimate`); every skill's name, cost and gap is read from the kit data.

import { type Battle, type BattleEvent, type Unit } from './sim/battle';
import { heroClassLabel, heroName } from './sim/heroNames';
import { keyOf, kitOf, ultimateOf, ULT_LEVEL, type Skill } from './sim/abilities';
import { costOf, heroKitOf, RES, resMax, resOf, skill2Open, SKILL2_LEVEL, TIER3_DISCOUNT, ultFull, type HeroKit, type Slot } from './sim/heroKits';
import { TIER_SKILLS, TOP_TIER } from './sim/tierSkills';
import { canOrderUltimate, orderUltimate } from './sim/orders';
import { portrait } from './render/sheets';
import { battleSheet } from './render/awakenLook';
import { GLOW, skillElement, type Element } from './render/fxRules';
import atlasUrl from './art/fx/pack/atlas.png';
import atlas from './art/fx/pack/atlas.json';

export type HudVariant = 'a' | 'b' | 'c';

/** The layout the address asks for, or null (the game as it is). */
export function hudVariant(): HudVariant | null {
  const q = new URLSearchParams(location.search).get('hud');
  return q === 'a' || q === 'b' || q === 'c' ? q : null;
}

export interface HudMockOpts {
  equipmentStep?: (kind: string) => number;
  onAuto: (on: boolean) => void;
  /** Where a fighter stands on the page (the middle of its sprite), for the trail and the banner. */
  anchor: (id: number) => { x: number; y: number } | null;
}

/** Which slot a chip shows: skill 1, skill 2 or the ultimate. */
type Which = 1 | 2 | 'ult';

interface Card {
  id: number;
  el: HTMLElement;
  /** The mini tile of layout C (the card is the detail strip's while chosen). */
  mini?: HTMLElement;
  last: string;
}

const SHEET = atlas as unknown as Record<string, [number, number, number]>;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const elOf = (s: Skill): Element => skillElement(keyOf(s));

/** A skill's icon: a frame of its element's strip from the Pixel Effects atlas (the strips its effects play), at `px` pixels. */
function skillIcon(s: Skill, px: number, heals = false): string {
  const el = elOf(s);
  const tries = heals ? [`${el}-gather`, `${el}-orb`] : [`${el}-orb`, `${el}-strike`, `${el}-hit`, 'light-orb'];
  const strip = tries.find((t) => SHEET[t]);
  if (!strip) return '<i class="hmIcon"></i>';
  const at = SHEET[strip];
  const k = px / 32;
  return `<i class="hmIcon" style="width:${px}px;height:${px}px;background:url(${atlasUrl}) no-repeat ${-(at[0] + 2 * 32) * k}px ${-at[1] * k}px / ${1024 * k}px ${1824 * k}px"></i>`;
}

const gapOf = (hk: HeroKit, slot: Slot): number => slot.gap ?? (hk.pool === 'mana' ? RES.GAP_MANA_MS : RES.GAP_STAM_MS);
const poolTag = (hk: HeroKit) => (hk.pool === 'mana' ? 'MP' : 'SP');

export class HudMock {
  private cards: Card[] = [];
  private key = '';
  private b: Battle | null = null;
  private auto: HTMLButtonElement;
  /** Layout C: the hero whose full card the strip shows. */
  private chosen = -1;
  private info: HTMLElement;
  private fxLayer: HTMLElement;
  /** True while a skill's sheet is open: the page holds the fight. */
  holding = false;
  private frames = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    readonly root: HTMLElement,
    readonly variant: HudVariant,
    private opts: HudMockOpts,
  ) {
    document.body.dataset.hud = variant;
    root.classList.add('hudMock', `hud-${variant}`);
    this.auto = document.createElement('button');
    this.auto.type = 'button';
    this.auto.className = 'hmAuto';
    this.auto.innerHTML = '<span>AUTO</span><i class="sw"><b></b></i>';
    this.auto.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = !this.auto.classList.contains('on');
      this.setAuto(on);
      this.opts.onAuto(on);
    });
    this.info = document.createElement('div');
    this.info.id = 'hudInfo';
    this.info.hidden = true;
    this.info.addEventListener('click', (e) => {
      if (e.target === this.info || (e.target as HTMLElement).closest('.hiClose')) this.closeInfo();
    });
    this.fxLayer = document.createElement('div');
    this.fxLayer.id = 'hudFx';
    document.body.append(this.info, this.fxLayer);
    this.homeSpells();
  }

  setAuto(on: boolean): void {
    this.auto.classList.toggle('on', on);
    this.auto.setAttribute('aria-pressed', String(on));
  }

  /** The king's spells move to their new home: the page's own spell cards and mana bar (with their handlers) are moved, not copied. */
  private homeSpells(): void {
    const spells = document.getElementById('spells');
    if (!spells) return;
    const home = document.createElement('div');
    home.id = 'hudSpells';
    if (this.variant === 'b') {
      // (a crown with the mana round it: a tap fans the spells out above it, a second tap or a cast folds them away)
      const crown = document.createElement('button');
      crown.type = 'button';
      crown.className = 'hsCrown';
      crown.innerHTML = '<i class="hsRing"></i><img src="ui/ic-crown.png" alt=""><b class="hsMana"></b>';
      crown.title = "The king's spells";
      crown.addEventListener('click', (e) => {
        e.stopPropagation();
        home.classList.toggle('open');
      });
      home.append(spells, crown, this.auto);
      spells.addEventListener('click', () => setTimeout(() => home.classList.remove('open'), 0));
    } else if (this.variant === 'a') home.append(this.auto, spells);
    else home.append(spells);
    document.body.append(home);
  }

  /** The fan opened (for the screenshots). */
  demoSpells(): void {
    document.getElementById('hudSpells')?.classList.add('open');
  }

  private heroes(b: Battle): Unit[] {
    return b.units.filter((u) => heroKitOf(u));
  }

  build(b: Battle): void {
    this.b = b;
    const units = this.heroes(b);
    // (the mock-ups are for a party of five; more (the Last Stand's eight) keeps the hero bar as it is)
    const key = units.length > 5 ? 'many' : units.map((u) => `${u.id}:${u.def}:${u.grade ?? 1}`).join() + `@${b.seed}`;
    if (key === this.key) return;
    this.key = key;
    this.root.replaceChildren();
    this.cards = [];
    if (units.length > 5 || !units.length) return;
    if (!units.some((u) => u.id === this.chosen)) this.chosen = units[0].id;
    if (this.variant === 'c') {
      const strip = document.createElement('div');
      strip.className = 'hcStrip';
      const row = document.createElement('div');
      row.className = 'hcRow';
      for (const u of units) {
        const c = this.card(u);
        c.mini = this.mini(u);
        row.append(c.mini);
        strip.append(c.el);
      }
      strip.append(this.auto);
      this.root.append(strip, row);
    } else for (const u of units) this.root.append(this.card(u).el);
    this.refresh(b);
  }

  /** A hero's full card (A: a tall card; B: a row; C: the strip's card, shown while chosen). */
  private card(u: Unit): Card {
    const hk = heroKitOf(u)!;
    const ult = ultimateOf(u);
    const el = document.createElement('div');
    el.className = `hm${(u.grade ?? 1) > 3 ? ' g4' : ''}${ult ? '' : ' locked'}`;
    el.dataset.unit = String(u.id);
    const chip = (n: Which, s: Skill | undefined, heals = false) =>
      s
        ? `<span class="hmChip" data-hud-skill="${n}" role="button" tabindex="0">${skillIcon(s, this.variant === 'a' ? 16 : 20, heals)}<span class="hmSk"><b></b><em></em></span><i class="hmCd"></i><i class="hmPay"></i></span>`
        : '';
    el.innerHTML =
      '<i class="hmPearl"></i><i class="hmSheen"></i>' +
      '<span class="hmPic"><span class="hmPlate" hidden>TAP</span></span>' +
      `<span class="hmName">${heroName(u.def)}</span>` +
      (this.variant === 'c' ? `<span class="hmClass">${heroClassLabel(u.def).split(' · ').pop()} · Lv ${u.level ?? 1}</span>` : '') +
      `<span class="hmBar hp"><i></i><b></b></span><span class="hmBar res ${hk.pool}"><i></i><b></b></span>` +
      `<span class="hmChips">${chip(1, hk.s1.skill, hk.s1.heals)}${chip(2, hk.s2.skill, hk.s2.heals)}${this.variant === 'c' ? chip('ult', ult) : ''}</span>` +
      '<span class="hmCast"></span>';
    const pic = portrait(battleSheet(u.def, this.opts.equipmentStep?.(u.def) ?? u.awaken ?? 0, u.grade ?? 1), 40, u.grade ?? 1);
    pic.className = 'hmPortrait';
    el.querySelector('.hmPic')!.prepend(pic);
    const names = el.querySelectorAll('.hmChip');
    const slots = [hk.s1.skill, hk.s2.skill, ult];
    names.forEach((n, i) => {
      (n.querySelector('.hmSk b') as HTMLElement).textContent = slots[i]?.name ?? '';
      (n as HTMLElement).style.setProperty('--el', hex(GLOW[elOf(slots[i]!)]));
      n.addEventListener('click', (e) => {
        e.stopPropagation();
        const which = (n as HTMLElement).dataset.hudSkill;
        this.openInfo(u.id, which === 'ult' ? 'ult' : (Number(which) as 1 | 2));
      });
    });
    // (a tap anywhere else on the card is the ultimate's tap, as on the hero bar)
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.tapUlt(u.id, el);
    });
    const c: Card = { id: u.id, el, last: '' };
    this.cards.push(c);
    return c;
  }

  /** Layout C's mini tile: portrait, two thin bars and the pearly glow. A tap chooses the hero (a second tap on the chosen one fires its ultimate). */
  private mini(u: Unit): HTMLElement {
    const el = document.createElement('div');
    el.className = `hm hmMini${ultimateOf(u) ? '' : ' locked'}`;
    el.innerHTML = '<i class="hmPearl"></i><i class="hmSheen"></i><span class="hmPic"><span class="hmPlate" hidden>TAP</span></span><span class="hmBar hp"><i></i></span><span class="hmBar res"><i></i></span>';
    el.querySelector('.hmBar.res')!.classList.add(heroKitOf(u)!.pool);
    const pic = portrait(battleSheet(u.def, this.opts.equipmentStep?.(u.def) ?? u.awaken ?? 0, u.grade ?? 1), 40, u.grade ?? 1);
    pic.className = 'hmPortrait';
    el.querySelector('.hmPic')!.prepend(pic);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.chosen === u.id) return this.tapUlt(u.id, el);
      this.chosen = u.id;
      if (this.b) this.refresh(this.b);
    });
    return el;
  }

  private tapUlt(id: number, el: HTMLElement): void {
    const b = this.b;
    if (!b) return;
    const u = b.units.find((x) => x.id === id);
    if (!u) return;
    if (orderUltimate(b, id)) this.refresh(b);
    else if (ultimateOf(u) && !canOrderUltimate(b, id) && u.ultOrder === undefined) {
      el.classList.remove('nudge');
      void el.offsetWidth;
      el.classList.add('nudge');
    }
  }

  /** Bring every card up to date (each frame; a card is only written when what it shows has changed). */
  refresh(b: Battle): void {
    this.b = b;
    for (const c of this.cards) {
      const u = b.units.find((x) => x.id === c.id);
      if (!u) continue;
      const hk = heroKitOf(u);
      if (!hk) continue;
      const ult = ultimateOf(u);
      const meter = ult ? Math.min(1, (u.charge2 ?? 0) / ult.need) : 0;
      const ready = !!ult && ultFull(u) && u.alive;
      const queued = u.ultOrder !== undefined || !!b.orders?.some((o) => o.unit === u.id);
      const res = resOf(u, hk.pool);
      const max = resMax(hk.pool);
      const slots: [Which, Slot | undefined][] = [[1, hk.s1], [2, hk.s2]];
      const chips = slots.map(([n, s]) => {
        if (!s) return '';
        const open = n === 1 || skill2Open(u);
        const cost = costOf(u, s);
        const at = n === 1 ? u.ks?.at1 : u.ks?.at2;
        const gap = gapOf(hk, s);
        const cd = at === undefined ? 0 : Math.max(0, Math.min(1, (at + gap - b.t) / gap));
        return `${+open}${Math.round(cost)}${Math.round(cd * 20)}${Math.round(Math.min(1, res / cost) * 20)}`;
      });
      const chosen = this.variant !== 'c' || this.chosen === u.id;
      const state = `${Math.round(meter * 50)}|${Math.round(u.hp)}|${Math.round(res)}|${chips.join(',')}|${+ready}${+queued}${+u.alive}${+chosen}`;
      if (state === c.last) continue;
      c.last = state;
      for (const el of c.mini ? [c.el, c.mini] : [c.el]) {
        el.style.setProperty('--ult', meter.toFixed(3));
        el.classList.toggle('ready', ready && !queued);
        el.classList.toggle('queued', queued && u.alive);
        el.classList.toggle('fallen', !u.alive);
        const plate = el.querySelector('.hmPlate') as HTMLElement;
        plate.textContent = queued && u.alive ? '…' : 'TAP';
        plate.hidden = !(ready || (queued && u.alive));
        const hp = el.querySelector('.hmBar.hp') as HTMLElement;
        (hp.firstElementChild as HTMLElement).style.width = `${Math.max(0, (u.hp / u.maxHp) * 100)}%`;
        const pool = el.querySelector('.hmBar.res') as HTMLElement;
        (pool.firstElementChild as HTMLElement).style.width = `${(res / max) * 100}%`;
        const hpNum = hp.querySelector('b');
        // (layout A's cards are narrow: the health and the pool as they stand; the others show out of what)
        const wide = this.variant !== 'a';
        if (hpNum) hpNum.textContent = wide ? `${Math.max(0, Math.ceil(u.hp))}/${u.maxHp}` : `${Math.max(0, Math.ceil(u.hp))}`;
        const poolNum = pool.querySelector('b');
        if (poolNum) poolNum.textContent = wide ? `${Math.floor(res)}/${max} ${poolTag(hk)}` : `${Math.floor(res)} ${poolTag(hk)}`;
      }
      if (c.mini) {
        c.mini.classList.toggle('chosen', chosen);
        c.el.hidden = !chosen;
      }
      c.el.querySelectorAll('.hmChip').forEach((chip, i) => {
        const el = chip as HTMLElement;
        if (i === 2) {
          // (layout C's ultimate chip: its meter, not a cost)
          el.style.setProperty('--cd', '0');
          el.style.setProperty('--pay', meter.toFixed(3));
          el.classList.toggle('short', !ready);
          el.querySelector('em')!.textContent = !ult ? `Lv ${ULT_LEVEL}` : ready ? 'Ready: tap card' : `${Math.round(meter * 100)}%`;
          el.classList.toggle('shut', !ult);
          return;
        }
        const n = (i + 1) as 1 | 2;
        const s = n === 1 ? hk.s1 : hk.s2;
        const open = n === 1 || skill2Open(u);
        const cost = costOf(u, s);
        const at = n === 1 ? u.ks?.at1 : u.ks?.at2;
        const gap = gapOf(hk, s);
        const cd = at === undefined ? 0 : Math.max(0, Math.min(1, (at + gap - b.t) / gap));
        el.style.setProperty('--cd', cd.toFixed(3));
        el.style.setProperty('--pay', Math.min(1, res / cost).toFixed(3));
        el.classList.toggle('shut', !open);
        el.classList.toggle('short', open && res + 1e-9 < cost);
        el.classList.toggle('cool', open && cd > 0);
        el.querySelector('em')!.textContent = !open ? `Lv ${SKILL2_LEVEL}` : this.variant === 'a' ? `${Math.round(cost)}` : `${Math.round(cost)} ${poolTag(hk)}${cd > 0 ? ` · ${((cd * gap) / 1000).toFixed(1)}s` : ''}`;
      });
    }
    // (where the panel's top and the top bar's bottom are: the spells' home and the sheet sit by them)
    if (this.frames++ % 15 === 0) {
      const panel = document.getElementById('panel')?.getBoundingClientRect();
      const top = document.getElementById('top')?.getBoundingClientRect();
      if (panel) document.body.style.setProperty('--hud-panel', `${Math.round(innerHeight - panel.top)}px`);
      if (top) document.body.style.setProperty('--hud-top', `${Math.round(top.bottom)}px`);
      // (layout C's orbs show the cost alone, from the card's own words)
      for (const card of document.querySelectorAll<HTMLElement>('#spellCards .spell')) card.dataset.cost ??= String(parseInt(card.querySelector('em')?.textContent ?? '') || '');
    }
    // (the crown's mana ring, layout B)
    const crown = document.querySelector('.hsCrown') as HTMLElement | null;
    if (crown) {
      crown.style.setProperty('--mana', String(b.spells.mana / 10));
      crown.querySelector('.hsMana')!.textContent = String(Math.floor(b.spells.mana));
    }
  }

  /* ---------------------------------------------------------- the skill's sheet */

  /** Open a skill's sheet; the fight is held (the page reads `holding`) until it is closed. */
  openInfo(id: number, which: Which): void {
    const b = this.b;
    const u = b?.units.find((x) => x.id === id);
    const hk = u && heroKitOf(u);
    if (!u || !hk) return;
    const slot = which === 1 ? hk.s1 : which === 2 ? hk.s2 : undefined;
    const s = slot?.skill ?? ultimateOf(u);
    if (!s) return;
    const el = elOf(s);
    const rows: string[] = [];
    if (slot) {
      rows.push(`<dt>Cost</dt><dd>${Math.round(costOf(u, slot))} ${hk.pool === 'mana' ? 'mana' : 'stamina'}${slot.hpCost ? ` and ${Math.round(slot.hpCost * 100)}% of max health` : ''}</dd>`);
      rows.push(`<dt>Cooldown</dt><dd>${(gapOf(hk, slot) / 1000).toFixed(1)}s between casts</dd>`);
      rows.push(`<dt>Strength</dt><dd>${Math.round(slot.tune * 100)}% of attack</dd>`);
      rows.push(`<dt>Cast time</dt><dd>${(s.castMs / 1000).toFixed(1)}s</dd>`);
      if (which === 2 && !skill2Open(u)) rows.push(`<dt>Locked</dt><dd>Opens at level ${SKILL2_LEVEL}</dd>`);
    } else {
      rows.push(`<dt>Meter</dt><dd>Fills as the hero deals and takes blows; tap the card when it glows</dd>`);
      rows.push(`<dt>Cast time</dt><dd>${(s.castMs / 1000).toFixed(1)}s</dd>`);
      if ((u.level ?? 1) < ULT_LEVEL) rows.push(`<dt>Locked</dt><dd>Opens at level ${ULT_LEVEL}</dd>`);
    }
    // (the tier versions: the skill a hero's tier improves is its kit's own skill; the other gets cheaper at tier 3)
    const grade = Math.min(u.grade ?? 1, TOP_TIER);
    let tiers = '';
    if (slot && s === kitOf(u)?.skill && TIER_SKILLS[u.def]) {
      tiers = TIER_SKILLS[u.def]
        .map((t, i) => `<li class="${grade >= i + 2 ? 'on' : ''}${grade === i + 2 ? ' now' : ''}"><b>Tier ${i + 2}: ${t.name}${grade === i + 2 ? ' · now' : ''}</b><span>${t.text}</span></li>`)
        .join('');
    } else if (slot) tiers = `<li class="${grade >= 3 ? 'on now' : ''}"><b>Tier 3 and up</b><span>Costs ${Math.round((1 - TIER3_DISCOUNT) * 100)}% less.</span></li>`;
    else tiers = '<li><b>Every tier</b><span>The ultimate is the same at every tier.</span></li>';
    this.info.innerHTML =
      `<div class="hiCard" style="--el:${hex(GLOW[el])}"><div class="hiHead">${skillIcon(s, 32, slot?.heals)}<div><b>${s.name}</b><small>${heroName(u.def)} · ${which === 'ult' ? 'Ultimate' : `Skill ${which}`} · ${el}</small></div><button type="button" class="hiClose" aria-label="Close">×</button></div>` +
      `<p>${s.text}</p><dl>${rows.join('')}</dl><ul class="hiTiers">${tiers}</ul><div class="hiHeld">Fight paused · tap outside to resume</div></div>`;
    this.info.hidden = false;
    this.holding = true;
  }

  closeInfo(): void {
    this.info.hidden = true;
    this.holding = false;
  }

  /* ---------------------------------------------------------- the cast moment */

  /** The battle's events for this tick: a hero's skill or ultimate lights its card (and, by layout, a trail or a banner). */
  onEvents(b: Battle, events: BattleEvent[]): void {
    for (const e of events) {
      if (e.kind !== 'skill') continue;
      const u = b.units.find((x) => x.id === e.by);
      const hk = u && heroKitOf(u);
      if (!u || !hk) continue;
      const ult = ultimateOf(u);
      const which: Which | null = keyOf(hk.s1.skill) === e.name ? 1 : keyOf(hk.s2.skill) === e.name ? 2 : ult && keyOf(ult) === e.name ? 'ult' : null;
      if (which) this.cast(u, which);
    }
  }

  /** Play a cast as if the battle had sent it (for the screenshots: its effects stay up until `clearFx`, so a slow capture still catches them). */
  demoCast(id: number, which: Which): void {
    const u = this.b?.units.find((x) => x.id === id);
    this.keep = true;
    if (u) this.cast(u, which);
    this.keep = false;
  }

  clearFx(): void {
    this.fxLayer.replaceChildren();
    for (const el of this.root.querySelectorAll('.casting, .fired')) el.classList.remove('casting', 'fired');
  }

  private keep = false;
  private later(ms: number, f: () => void): void {
    if (!this.keep) setTimeout(f, ms);
  }

  private cast(u: Unit, which: Which): void {
    const hk = heroKitOf(u)!;
    const s = which === 1 ? hk.s1.skill : which === 2 ? hk.s2.skill : ultimateOf(u);
    const c = this.cards.find((x) => x.id === u.id);
    if (!s || !c) return;
    const colour = hex(GLOW[elOf(s)]);
    // (the card: lit in the element's colour, the skill's name over it, the chip that went off bright; all of it eases out, nothing blinks)
    const card = c.mini && this.variant === 'c' ? c.mini : c.el;
    for (const el of [card, c.el]) {
      el.style.setProperty('--cast', colour);
      el.classList.remove('casting');
      void el.offsetWidth;
      el.classList.add('casting');
      this.later(1100, () => el.classList.remove('casting'));
    }
    const label = c.el.querySelector('.hmCast') as HTMLElement;
    label.textContent = s.name;
    const chip = c.el.querySelector(`.hmChip[data-hud-skill="${which}"]`) as HTMLElement | null;
    if (chip) {
      chip.classList.remove('fired');
      void chip.offsetWidth;
      chip.classList.add('fired');
      this.later(1100, () => chip.classList.remove('fired'));
    }
    const to = this.opts.anchor(u.id);
    if (!to) return;
    const box = card.getBoundingClientRect();
    if (this.variant === 'a' || this.variant === 'c') this.trail({ x: box.left + box.width / 2, y: box.top + 4 }, to, colour);
    if (this.variant === 'b' || this.variant === 'c') this.banner(u, s, to, colour, which === 'ult');
  }

  /** A trail from the card up to the hero on the board: a curved stroke that draws itself and fades. */
  private trail(from: { x: number; y: number }, to: { x: number; y: number }, colour: string): void {
    if (this.reduced) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hmTrail');
    svg.setAttribute('width', String(innerWidth));
    svg.setAttribute('height', String(innerHeight));
    const mx = (from.x + to.x) / 2 + (to.x > from.x ? -40 : 40);
    const my = Math.min(from.y, to.y) + (from.y - to.y) * 0.25;
    const d = `M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`;
    svg.innerHTML = `<path d="${d}" class="glow" stroke="${colour}"/><path d="${d}" class="core"/><circle cx="${to.x}" cy="${to.y}" r="14" class="ring" stroke="${colour}"/>`;
    this.fxLayer.append(svg);
    this.later(900, () => svg.remove());
  }

  /** A cut-in banner by the caster: its portrait and the skill's name on a ribbon of the element's colour. */
  private banner(u: Unit, s: Skill, at: { x: number; y: number }, colour: string, ult: boolean): void {
    const el = document.createElement('div');
    el.className = `hudCutIn${ult ? ' ult' : ''}`;
    el.style.setProperty('--cast', colour);
    const pic = portrait(battleSheet(u.def, this.opts.equipmentStep?.(u.def) ?? u.awaken ?? 0, u.grade ?? 1), 40, u.grade ?? 1);
    el.append(pic);
    const txt = document.createElement('span');
    txt.innerHTML = `<small>${heroName(u.def)}</small><b>${s.name}</b>`;
    el.append(txt);
    // (above the hero, kept on the screen)
    const w = Math.min(250, innerWidth - 16);
    el.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, at.x - w / 2))}px`;
    el.style.top = `${Math.max(90, at.y - 92)}px`;
    el.style.width = `${w}px`;
    this.fxLayer.append(el);
    this.later(1400, () => el.remove());
  }
}
