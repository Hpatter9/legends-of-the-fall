// The fight's hero rows (BATTLE-HUD, docs/notes/battle-hud.md; the owner's pick of the mock-ups: layout B's rows). One row a placed hero, in the
// party's order: its portrait, name, health and pool bars with their numbers, and its two skills as wide chips (the skill's name, its cost, a
// cooldown sweep, a thin line filling towards the cost; greyed while it cannot be paid, "Lv 10" while locked). The ultimate's meter is a
// pearlescent glow filling along the row; full, the row brightens, a sheen crosses it and the portrait says TAP, and a tap on the row fires it
// (`orderUltimate`, the sim's own command). A tap on a chip opens that skill's sheet (and its Skill 1, Skill 2 and Ultimate tabs; a long press on
// a row opens the ultimate's), and the page holds the fight while it is open (`holding`). A cast lights the row in the skill's element and a
// cut-in banner (portrait, name, skill) slides in at the screen's left edge above the rows. A party over five (the Last Stand's eight, a Calamity's ten) takes two columns of
// compact rows. The Auto switch (`autoEl`) is placed by the page, by the king's spells.
//
// It only reads the battle and calls the sim's command; every name, cost and gap comes from the kit data (`fightHudRules.ts`). Nothing blinks:
// glows ease in and out, the pearl's colours drift (its position, not its brightness), and with reduced motion they hold still.

import { type Battle, type BattleEvent, type Unit } from './sim/battle';
import { heroClassLabel, heroName } from './sim/heroNames';
import { keyOf, type Skill } from './sim/abilities';
import { heroKitOf } from './sim/heroKits';
import { canOrderUltimate, orderUltimate } from './sim/orders';
import { portrait } from './render/sheets';
import { heroFace } from './heroFace';
import { battleSheet } from './render/awakenLook';
import { GLOW, skillElement, type Element } from './render/fxRules';
import { barNumbers, chipLine, chipOf, hudLayout, sheetOf, ultOf, whichCast, type ChipView, type Which } from './fightHudRules';
import atlasUrl from './art/fx/pack/atlas.png';
import atlas from './art/fx/pack/atlas.json';

export interface FightHudOpts {
  /** Permanent equipment can stay awakened in modes with local combat stats. */
  equipmentStep?: (kind: string) => number;
  /** The Auto switch was flipped: the page keeps it (`Meta.ultAuto`, which now covers the spells too: AUTO-CAST) and tells the battle. */
  onAuto: (on: boolean) => void;
  /** Whether the ultimates fire on their own now (the ultimate's sheet says so). */
  autoOn?: () => boolean;
  /** A tap was refused (a locked or unfilled ultimate). */
  onRefused?: (u: Unit) => void;
  /** Any tap on a hero's row (before its ultimate is ordered or refused): the Last Stand pans its camera to the hero. */
  onTap?: (u: Unit) => void;
  /** The top of the page's bottom panel: the skill's sheet and the cast banners sit just above it. */
  dockTop?: () => number;
  /** Whether ultimates play their full moment (`ultMoment.ts`, the setting): then the row lights but no banner shows, the moment has it all. */
  ultFull?: () => boolean;
  /** The hero's painted art: the short version's banner for an ultimate shows its face. */
  ultArt?: (u: Unit) => string;
}

interface Row {
  id: number;
  el: HTMLElement;
  last: string;
}

const SHEET = atlas as unknown as Record<string, [number, number, number]>;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const elOf = (s: Skill): Element => skillElement(keyOf(s));
let styled = false;

/** A skill's icon: a frame of its element's strip from the Pixel Effects atlas (the strips its effects play), `px` pixels square. */
function skillIcon(s: Skill, px: number, heals = false): string {
  if (!styled) {
    styled = true;
    const style = document.createElement('style');
    // (one copy of the atlas's data URL, shared by every icon)
    style.textContent = `.fhIcon { background-image: url(${atlasUrl}); }`;
    document.head.append(style);
  }
  const el = elOf(s);
  const tries = heals ? [`${el}-gather`, `${el}-orb`] : [`${el}-orb`, `${el}-strike`, `${el}-hit`, 'light-orb'];
  const strip = tries.find((t) => SHEET[t]);
  if (!strip) return `<i class="fhIcon none" style="width:${px}px;height:${px}px"></i>`;
  const at = SHEET[strip];
  const k = px / 32;
  return `<i class="fhIcon" style="width:${px}px;height:${px}px;background-position:${-(at[0] + 2 * 32) * k}px ${-at[1] * k}px;background-size:${1024 * k}px ${1824 * k}px"></i>`;
}

export class FightHud {
  private rows: Row[] = [];
  private key = '';
  private b: Battle | null = null;
  /** The Auto switch: the page puts it beside the king's spells. */
  readonly autoEl: HTMLButtonElement;
  private sheet: HTMLElement;
  private fxLayer: HTMLElement;
  private open: { id: number; which: Which } | null = null;
  /** True while a skill's sheet is open: the page holds the fight. */
  holding = false;
  private compact = false;
  private reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** A long press on a row (it opens the ultimate's sheet, and the tap that ends it fires nothing). */
  private press: { timer: number; fired: boolean } | null = null;

  constructor(
    readonly root: HTMLElement,
    private opts: FightHudOpts,
  ) {
    root.classList.add('fightHud');
    this.autoEl = document.createElement('button');
    this.autoEl.type = 'button';
    this.autoEl.className = 'fhAuto';
    // (AUTO-CAST: one switch for both, the heroes' ultimates and the king's spells; its small line says so)
    this.autoEl.innerHTML = '<span>AUTO</span><i class="sw"><b></b></i><small>ULT+SPELL</small>';
    this.autoEl.title = 'Auto: ultimates + spells. Every ultimate fires when it is ready, and your spells are cast where they are worth it';
    this.autoEl.setAttribute('aria-label', 'Auto: ultimates + spells');
    this.autoEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = !this.autoEl.classList.contains('on');
      this.setAuto(on);
      this.opts.onAuto(on);
    });
    this.sheet = document.createElement('div');
    this.sheet.className = 'fhSheet';
    this.sheet.hidden = true;
    this.sheet.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const tab = t.closest<HTMLElement>('[data-tab]');
      if (tab && this.open) {
        const w = tab.dataset.tab!;
        return this.openInfo(this.open.id, w === 'ult' ? 'ult' : (Number(w) as 1 | 2 | 3));
      }
      if (t === this.sheet || t.closest('.fsClose')) this.closeInfo();
    });
    this.fxLayer = document.createElement('div');
    this.fxLayer.className = 'fhFx';
    document.body.append(this.sheet, this.fxLayer);
  }

  /** Show the switch as on or off. */
  setAuto(on: boolean): void {
    this.autoEl.classList.toggle('on', on);
    this.autoEl.setAttribute('aria-pressed', String(on));
  }

  /** The heroes the rows show: the placed heroes with a kit, in the order they were placed (the party's order). */
  private heroes(b: Battle): Unit[] {
    return b.units.filter((u) => heroKitOf(u));
  }

  /** Rebuild the rows when the heroes change (a new fight, a hero placed, a level gained that opens a skill); true when they were rebuilt. */
  build(b: Battle): boolean {
    this.b = b;
    const units = this.heroes(b);
    const key = units.map((u) => `${u.id}:${u.def}:${u.grade ?? 1}:${u.level ?? 1}`).join() + `@${b.seed}`;
    if (key === this.key) return false;
    this.key = key;
    this.closeInfo();
    this.root.replaceChildren();
    this.rows = [];
    const lay = hudLayout(units.length);
    this.compact = lay.pairs;
    this.root.classList.toggle('pairs', lay.pairs);
    this.root.style.setProperty('--fh-rows', String(lay.rows));
    // (two columns fill down, so the party's order reads down the first column and then the second)
    for (const u of units) this.root.append(this.row(u));
    this.refresh(b);
    return true;
  }

  private row(u: Unit): HTMLElement {
    const hk = heroKitOf(u)!;
    const el = document.createElement('div');
    el.className = `fhRow${(u.grade ?? 1) > 3 ? ' g4' : ''}`;
    el.dataset.unit = String(u.id);
    el.setAttribute('role', 'button');
    const chip = (n: 1 | 2 | 3, s: Skill, heals = false) =>
      `<span class="fhChip" data-skill="${n}" role="button" tabindex="0" style="--el:${hex(GLOW[elOf(s)])}">${this.compact ? '' : skillIcon(s, 14, heals)}<span class="fhSk"><b></b><em></em></span><i class="fhCd"></i><i class="fhPay"></i></span>`;
    el.innerHTML =
      '<i class="fhPearl"></i><i class="fhSheen"></i>' +
      '<span class="fhPic"><span class="fhPlate" hidden>TAP</span></span>' +
      '<span class="fhName"></span>' +
      `<span class="fhBar hp"><i></i><b></b></span><span class="fhBar res ${hk.pool}"><i></i><b></b></span>` +
      `<span class="fhChips">${chip(1, hk.s1.skill, hk.s1.heals)}${chip(2, hk.s2.skill, hk.s2.heals)}${hk.s3 ? chip(3, hk.s3.skill, hk.s3.heals) : ''}</span>` +
      '<span class="fhCast"></span>';
    const step = this.opts.equipmentStep?.(u.def) ?? u.awaken ?? 0;
    // (HUD-FACES: the hero's painted face, cut to its face box; the pixel portrait until the painting loads, and for any without one)
    const pic = heroFace(u.def, step, 72, portrait(battleSheet(u.def, step, u.grade ?? 1), 40, u.grade ?? 1));
    pic.classList.add('fhPortrait');
    el.querySelector('.fhPic')!.prepend(pic);
    el.querySelector('.fhName')!.textContent = heroName(u.def);
    for (const c of el.querySelectorAll<HTMLElement>('.fhChip')) {
      c.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.press?.fired) return void (this.press = null);
        this.openInfo(u.id, Number(c.dataset.skill) as 1 | 2 | 3);
      });
    }
    // (a long press anywhere on the row opens the ultimate's sheet; a tap fires the ultimate, as the hero bar's portrait did)
    el.addEventListener('pointerdown', () => {
      this.endPress();
      this.press = { fired: false, timer: window.setTimeout(() => {
        if (!this.press) return;
        this.press.fired = true;
        this.openInfo(u.id, 'ult');
      }, 500) };
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) el.addEventListener(ev, () => this.press && clearTimeout(this.press.timer));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.press?.fired) return void (this.press = null);
      this.tapUlt(u.id);
    });
    this.rows.push({ id: u.id, el, last: '' });
    return el;
  }

  private endPress(): void {
    if (this.press) clearTimeout(this.press.timer);
    this.press = null;
  }

  private tapUlt(id: number): void {
    const b = this.b;
    const u = b?.units.find((x) => x.id === id);
    if (!b || !u) return;
    this.opts.onTap?.(u);
    if (orderUltimate(b, id)) this.refresh(b);
    else if (!ultOf(b, u).locked && !canOrderUltimate(b, id) && u.ultOrder === undefined) {
      // (a hero without its ultimate yet does nothing: it has no meter to point at)
      this.opts.onRefused?.(u);
      this.lapse(id);
    }
  }

  /** An order lapsed (or a tap was refused): the row shakes once. */
  lapse(id: number): void {
    const r = this.rows.find((x) => x.id === id);
    if (!r) return;
    r.el.classList.remove('nudge');
    void r.el.offsetWidth;
    r.el.classList.add('nudge');
  }

  /** Bring every row up to date (each frame: a row is only written when what it shows has changed). */
  refresh(b: Battle): void {
    this.b = b;
    for (const r of this.rows) {
      const u = b.units.find((x) => x.id === r.id);
      if (!u) continue;
      const ult = ultOf(b, u);
      const bars = barNumbers(u);
      const chips = ([1, 2, 3] as const).map((n) => chipOf(b, u, n)).filter((c): c is ChipView => !!c);
      const lines = chips.map((c) => chipLine(c, this.compact));
      const state = `${Math.round(ult.meter * 60)}|${bars.hp}|${bars.pool}|${lines.join(',')}|${chips.map((c) => `${c.chip}${+c.short}${Math.round(c.cd * 24)}${Math.round(c.pay * 24)}`).join()}|${+ult.ready}${+ult.queued}${+ult.locked}${+u.alive}`;
      if (state === r.last) continue;
      r.last = state;
      const el = r.el;
      el.style.setProperty('--ult', ult.meter.toFixed(3));
      el.classList.toggle('ready', ult.ready && !ult.queued);
      el.classList.toggle('queued', ult.queued);
      el.classList.toggle('locked', ult.locked);
      el.classList.toggle('fallen', !u.alive);
      const plate = el.querySelector('.fhPlate') as HTMLElement;
      plate.textContent = ult.queued ? '…' : 'TAP';
      plate.hidden = !(ult.ready || ult.queued);
      const [hp, pool] = el.querySelectorAll<HTMLElement>('.fhBar');
      (hp.firstElementChild as HTMLElement).style.width = `${bars.hpShare * 100}%`;
      hp.querySelector('b')!.textContent = bars.hp;
      (pool.firstElementChild as HTMLElement).style.width = `${bars.poolShare * 100}%`;
      pool.querySelector('b')!.textContent = bars.pool;
      el.querySelectorAll<HTMLElement>('.fhChip').forEach((ce, i) => {
        const c = chips[i];
        ce.style.setProperty('--cd', c.cd.toFixed(3));
        ce.style.setProperty('--pay', c.pay.toFixed(3));
        ce.classList.toggle('shut', !c.open);
        ce.classList.toggle('short', c.short);
        ce.classList.toggle('cool', c.open && c.cd > 0);
        ce.classList.toggle('revive', c.revive);
        ce.querySelector('b')!.textContent = c.chip;
        ce.querySelector('em')!.textContent = lines[i];
        ce.title = `${c.name}: ${c.open ? `${c.cost} ${c.tag}` : lines[i]} (tap for more)`;
      });
      el.title = ult.locked ? heroClassLabel(u.def) : `${heroClassLabel(u.def)}: tap the row when it says TAP to fire its ultimate (hold for its sheet)`;
      el.setAttribute('aria-label', `${heroClassLabel(u.def)}${ult.locked ? '' : ult.ready ? ', ultimate ready: tap to fire' : `, ultimate ${Math.round(ult.meter * 100)}%`}`);
    }
    // (an open sheet follows the hero's numbers while the fight is held: a tab's change shows at once)
  }

  /* ---------------------------------------------------------- the skill's sheet */

  /** Open a move's sheet; the fight is held (the page reads `holding`) until it is closed. */
  openInfo(id: number, which: Which): void {
    const b = this.b;
    const u = b?.units.find((x) => x.id === id);
    if (!b || !u) return;
    const v = sheetOf(b, u, which, this.opts.autoOn?.() ?? false);
    if (!v) return;
    const hk = heroKitOf(u)!;
    const heals = which === 'ult' ? false : hk.slots[which - 1]?.heals;
    const el = elOf(v.skill);
    const tab = (w: Which, label: string) => `<button type="button" data-tab="${w}" class="${w === which ? 'on' : ''}"${w === which ? ' aria-current="true"' : ''}>${label}</button>`;
    const card = document.createElement('div');
    card.className = 'fsCard';
    card.style.setProperty('--el', hex(GLOW[el]));
    card.innerHTML =
      `<div class="fsHead">${skillIcon(v.skill, 32, heals)}<div><b></b><small></small></div><button type="button" class="fsClose" aria-label="Close">×</button></div>` +
      `<div class="fsTabs">${tab(1, 'Skill 1')}${tab(2, 'Skill 2')}${hk.s3 ? tab(3, 'Skill 3') : ''}${tab('ult', 'Ultimate')}</div>` +
      '<p></p><dl></dl><ul class="fsTiers"></ul><div class="fsHeld">Fight paused · tap outside to resume</div>';
    card.querySelector('.fsHead b')!.textContent = v.name;
    card.querySelector('.fsHead small')!.textContent = `${heroName(u.def)} · ${v.label} · ${el}`;
    card.querySelector('p')!.textContent = v.text;
    const dl = card.querySelector('dl')!;
    for (const [k, t] of v.rows) {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = t;
      dl.append(dt, dd);
    }
    const ul = card.querySelector('ul')!;
    for (const t of v.tiers) {
      const li = document.createElement('li');
      li.className = `${t.on ? 'on' : ''}${t.now ? ' now' : ''}`;
      const b2 = document.createElement('b');
      b2.textContent = t.now ? `${t.title} · now` : t.title;
      const sp = document.createElement('span');
      sp.textContent = t.text;
      li.append(b2, sp);
      ul.append(li);
    }
    const dock = this.opts.dockTop?.();
    this.sheet.style.setProperty('--fs-dock', `${dock !== undefined ? Math.max(8, Math.round(innerHeight - dock)) : 8}px`);
    this.sheet.replaceChildren(card);
    this.sheet.hidden = false;
    this.open = { id, which };
    this.holding = true;
  }

  closeInfo(): void {
    this.sheet.hidden = true;
    this.open = null;
    this.holding = false;
  }

  /** The sheet is open (for the screenshots and the page). */
  get sheetOpen(): boolean {
    return !this.sheet.hidden;
  }

  /** Take the HUD's floating parts off the page (the fight screen is left). */
  hideFloating(): void {
    this.closeInfo();
    this.fxLayer.replaceChildren();
  }

  /* ---------------------------------------------------------- the cast moment */

  /** The battle's events for this tick: a hero's skill or ultimate lights its row and shows the cut-in banner. */
  onEvents(b: Battle, events: BattleEvent[]): void {
    for (const e of events) {
      if (e.kind !== 'skill') continue;
      const u = b.units.find((x) => x.id === e.by);
      if (!u || !heroKitOf(u)) continue;
      const which = whichCast(u, e.name);
      if (which) this.cast(u, which, e.name);
    }
  }

  /** Play a cast as if the battle had sent it (for the screenshots: its effects stay up until `clearFx`). */
  demoCast(id: number, which: Which): void {
    const u = this.b?.units.find((x) => x.id === id);
    const hk = u && heroKitOf(u);
    if (!u || !hk) return;
    this.keep = true;
    const s = which === 'ult' ? undefined : hk.slots[which - 1]?.skill;
    this.cast(u, which, s ? keyOf(s) : '');
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

  private cast(u: Unit, which: Which, key: string): void {
    const hk = heroKitOf(u)!;
    const ult = ultOf(this.b!, u).skill;
    const s = which === 'ult' ? ult : which === 2 && hk.s2.revive && keyOf(hk.s2.revive.skill) === key ? hk.s2.revive.skill : hk.slots[which - 1]?.skill;
    const r = this.rows.find((x) => x.id === u.id);
    if (!s || !r) return;
    const colour = hex(GLOW[elOf(s)]);
    // (the row: lit in the element's colour with the skill's name over it, the chip that went off bright; all of it eases out, nothing blinks)
    const el = r.el;
    el.style.setProperty('--cast', colour);
    el.classList.remove('casting');
    void el.offsetWidth;
    el.classList.add('casting');
    this.later(1100, () => el.classList.remove('casting'));
    (el.querySelector('.fhCast') as HTMLElement).textContent = s.name;
    const chip = which === 'ult' ? null : el.querySelector<HTMLElement>(`.fhChip[data-skill="${which}"]`);
    if (chip) {
      chip.classList.remove('fired');
      void chip.offsetWidth;
      chip.classList.add('fired');
      this.later(1100, () => chip.classList.remove('fired'));
    }
    if (which === 'ult' && this.opts.ultFull?.()) return;
    this.banner(u, s, colour, which === 'ult');
  }

  /** A slim cut-in banner at the screen's left edge, just above the hero rows (the owner: the banners by the caster hid too much of the
   *  fight): the portrait, the hero's name and the skill's name on a ribbon of the element's colour. Banners stack upwards, three at most. */
  private banner(u: Unit, s: Skill, colour: string, ult: boolean): void {
    let stack = this.fxLayer.querySelector<HTMLElement>('.fhCutStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'fhCutStack';
      this.fxLayer.append(stack);
    }
    const dock = this.opts.dockTop?.();
    stack.style.bottom = `${dock !== undefined ? Math.max(8, Math.round(innerHeight - dock) + 6) : 8}px`;
    // (one banner a hero at a time: a new cast takes the old one's place; the oldest goes when a fourth comes)
    stack.querySelector(`[data-unit="${u.id}"]`)?.remove();
    while (stack.children.length >= 3) stack.firstElementChild!.remove();
    const el = document.createElement('div');
    el.className = `fhCutIn${ult ? ' ult' : ''}`;
    el.dataset.unit = String(u.id);
    el.style.setProperty('--cast', colour);
    // (an ultimate's banner (the short version) shows the hero's painted face; a skill's, its pixel portrait)
    const art = ult ? this.opts.ultArt?.(u) : undefined;
    if (art) {
      const img = document.createElement('img');
      img.className = 'face';
      img.alt = '';
      img.src = art;
      el.append(img);
    } else el.append(portrait(battleSheet(u.def, this.opts.equipmentStep?.(u.def) ?? u.awaken ?? 0, u.grade ?? 1), 22, u.grade ?? 1));
    const small = document.createElement('small');
    small.textContent = heroName(u.def);
    const name = document.createElement('b');
    name.textContent = s.name;
    el.append(small, name);
    stack.append(el);
    this.later(this.reduced ? 1200 : 1400, () => el.remove());
  }
}
