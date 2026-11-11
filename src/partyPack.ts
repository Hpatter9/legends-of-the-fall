// HEROES-FILTER, job 2 (docs/notes/heroes-filter.md): the War Council's pack, a drawer that slides out from the right edge of the party page
// with two tabs, the Satchel (the remedies the run takes) and the Plan (the March orders). The owner: "The satchel and plan should be on a
// different screen in the party formation screen. Maybe a button or a slide out menu." It is a standard ornate menu (`ornateMenu`, kind
// 'side'), pulled by a painted tab on the page's right edge, of the same family as the rune bench's pull bar (`benchSlide.ts`, and its rules
// in `benchSideRules.ts`: a tap flips it, a pull past a third of the way or a flick lands it, anything shorter springs back). The page keeps
// one line of what is packed ("Satchel 2/5 · Plan: Plain march"), which opens the drawer too. What the Satchel and the Plan do is unchanged
// (`sim/remedies.ts`, `marchCard.ts`); the rules of the line and the tab's mark are in `partyPackRules.ts`.

import { medal, paintedSwitch, setBadge, tabPlate } from './paintedButton';
import { menuFoot, menuNote, menuTitle, menuWell, ornateMenu, type OrnateMenu } from './ornateMenu';
import { ELIXIR_MAX, REMEDY_LIST, SATCHEL_MAX, pickSatchel, satchelFor } from './sim/remedies';
import { REMEDY_ICON } from './gearUiArt';
import { saveMeta, type Meta } from './sim/meta';
import { gripLanding, gripProgress, type BenchSide } from './benchSideRules';
import { firstTab, packLine, packMarks, packShown, satchelShown, type PackState, type PackTab } from './partyPackRules';
import { play } from './render/sound';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** The Plan as the party page gives it: its line, and what opens the March orders (told to redraw once they are set). */
export interface PackPlan {
  line: () => string;
  open: (redraw: () => void) => void;
}

/** How long the drawer takes to slide (the CSS's transition). */
const SLIDE_MS = 300;

export class PartyPack {
  /** The painted pull tab on the page's right edge. */
  readonly tab = el('button', 'ptPackTab');
  /** The page's one line of what is packed (a button: it opens the drawer too). */
  readonly line = el('button', 'pbPlate ptPackLine');
  private menu: OrnateMenu | null = null;
  private which: PackTab = 'satchel';
  private planSeen = false;
  private plan: PackPlan | null = null;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private meta: Meta) {
    this.tab.id = 'ptPackTab';
    this.tab.type = 'button';
    this.tab.append(el('i', 'gripArrow'), el('span', 'gripWord', 'Pack'));
    this.line.id = 'ptPackLine';
    this.line.type = 'button';
    this.line.addEventListener('click', () => this.open());
    this.pull(this.tab, 'heroes');
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', (e) => (this.reduced = e.matches));
  }

  /** The War Council opens afresh: the drawer shut, the Plan not yet looked at. */
  reset(): void {
    this.close(true);
    this.planSeen = false;
    this.plan = null;
    this.refresh();
  }

  /** The Plan for this march (`null`: no orders are open). */
  setPlan(p: PackPlan | null): void {
    this.plan = p;
    this.refresh();
  }

  private state(): PackState {
    const m = this.meta;
    return { owned: m.satchel, pick: satchelFor(m), auto: !!m.autoRemedies, plan: this.plan ? this.plan.line() : null, planSeen: this.planSeen };
  }

  /** Redraw the page's pieces: the tab (and its mark) and the line; both go while there is nothing to pack. */
  refresh(): void {
    const s = this.state();
    const shown = packShown(s);
    this.tab.hidden = !shown;
    this.line.hidden = !shown;
    if (!shown) return;
    const marks = packMarks(s);
    setBadge(this.tab, marks.length ? { kind: 'new' } : null);
    const words = packLine(s);
    const wants = marks.length ? ` ${marks.map((t) => (t === 'satchel' ? 'The satchel has room for more.' : 'The plan is not yet chosen.')).join(' ')}` : '';
    this.tab.setAttribute('aria-label', `Open the pack: ${words}.${wants}`);
    this.tab.setAttribute('aria-expanded', String(!!this.menu));
    if (this.line.dataset.line !== words) {
      this.line.dataset.line = words;
      this.line.replaceChildren(medal('satchel'), el('span', '', words), el('i', 'ptPackGo'));
    }
    this.line.setAttribute('aria-label', `${words}. Open the pack`);
  }

  /** Open the drawer (on `tab`, else the one that wants attention). `pulled` leaves it where the finger has it; else it slides in. */
  open(tab?: PackTab, pulled = false): void {
    if (this.menu) return;
    const s = this.state();
    if (!packShown(s)) return;
    this.which = firstTab(s, tab);
    const menu = ornateMenu({ id: 'ptPack', kind: 'side', eyebrow: 'The War Council', title: 'Satchel', sub: ' ', label: 'The pack: satchel and plan', onClose: () => this.shut() });
    this.menu = menu;
    // (the tab rides the drawer's edge while it is out: a tap or a pull to the right puts it away)
    const grip = el('button', 'ptPackTab ptPackGrip');
    grip.type = 'button';
    grip.setAttribute('aria-label', 'Close the pack');
    grip.append(el('i', 'gripArrow'), el('span', 'gripWord', 'Pack'));
    menu.card.append(grip);
    this.pull(grip, 'runes');
    // (a tap on the page beside the drawer puts it away too)
    menu.root.addEventListener('click', (e) => e.target === menu.root && this.close());
    menuFoot(menu, { back: { word: 'close', onClick: () => this.close() } });
    this.tab.classList.add('out');
    this.draw();
    if (pulled || this.reduced) return this.set(pulled ? 0 : 1);
    this.set(0);
    void menu.card.offsetWidth;
    menu.root.classList.add('springing');
    this.set(1);
    play('runeSlide');
  }

  /** Put the drawer away: it slides out, then goes (`now`: at once, with no slide). */
  close(now = false): void {
    const menu = this.menu;
    if (!menu) return;
    if (now || this.reduced) return menu.close();
    menu.root.classList.add('springing', 'leaving');
    this.set(0);
    setTimeout(() => menu.close(), SLIDE_MS);
  }

  /** The drawer has gone, however it went. */
  private shut(): void {
    this.menu = null;
    this.tab.classList.remove('out');
    this.refresh();
  }

  private set(p: number): void {
    this.menu?.root.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(4));
  }

  /** How far the drawer slides: its own width. */
  private travel(): number {
    return Math.max(1, this.menu?.card.offsetWidth ?? Math.min(350, innerWidth - 44));
  }

  /** A pull tab: it follows the finger and lands by the bench bar's rules. `from` is the bar's side in those rules: 'heroes' is the drawer
   *  shut (the tab on the page's edge), 'runes' the drawer out (the tab on the drawer's). */
  private pull(grip: HTMLButtonElement, from: BenchSide): void {
    let press: { x: number; pid: number; lastX: number; lastT: number; vx: number } | null = null;
    /** When a press last ended, so the click that follows it is not counted twice. */
    let ended = -1e9;
    grip.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      grip.setPointerCapture?.(e.pointerId);
      press = { x: e.clientX, pid: e.pointerId, lastX: e.clientX, lastT: e.timeStamp, vx: 0 };
    });
    grip.addEventListener('pointermove', (e) => {
      const p = press;
      if (!p || p.pid !== e.pointerId) return;
      const dt = Math.max(1, e.timeStamp - p.lastT);
      p.vx = 0.6 * ((e.clientX - p.lastX) / dt) + 0.4 * p.vx;
      p.lastX = e.clientX;
      p.lastT = e.timeStamp;
      const dx = e.clientX - p.x;
      if (Math.abs(dx) < 4 && !this.menu?.root.classList.contains('pulling')) return;
      // (the first move of a pull on the page's tab brings the drawer out under the finger)
      if (!this.menu) this.open(undefined, true);
      this.menu?.root.classList.remove('springing');
      this.menu?.root.classList.add('pulling');
      this.set(gripProgress(from, dx, this.travel()));
    });
    const end = (e: PointerEvent, cancelled: boolean) => {
      const p = press;
      if (!p || p.pid !== e.pointerId) return;
      press = null;
      ended = performance.now();
      const dx = e.clientX - p.x;
      const to = cancelled ? from : gripLanding(from, dx, this.travel(), e.timeStamp - p.lastT > 80 ? 0 : p.vx);
      const pulling = !!this.menu?.root.classList.contains('pulling');
      this.menu?.root.classList.remove('pulling');
      if (to === 'runes') {
        if (!this.menu) return this.open();
        if (!this.reduced) this.menu.root.classList.add('springing');
        this.set(1);
        if (from === 'heroes' && pulling) play('runeSlide');
      } else this.close();
    };
    grip.addEventListener('pointerup', (e) => end(e, false));
    grip.addEventListener('pointercancel', (e) => end(e, true));
    // (a click with no press before it: Enter or Space on the keyboard, or a screen reader's tap, flips it as a finger's tap does)
    grip.addEventListener('click', () => {
      if (performance.now() - ended < 600) return;
      if (from === 'heroes') this.open();
      else this.close();
    });
    // (the arrows send it their way)
    grip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.open();
      else if (e.key === 'ArrowRight') this.close();
      else return;
      e.preventDefault();
    });
  }

  /** Fill the drawer: the two tabs, then the one chosen. */
  private draw(): void {
    const menu = this.menu;
    if (!menu) return;
    if (this.which === 'plan' && this.plan) this.planSeen = true;
    const s = this.state();
    const marks = packMarks(s);
    const top = menu.body.scrollTop;
    menu.body.replaceChildren();
    const tabs = el('div', 'ptPackTabs');
    tabs.setAttribute('role', 'tablist');
    for (const [id, name, icon] of [['satchel', 'Satchel', 'satchel'], ['plan', 'Plan', 'march-orders']] as const) {
      const b = tabPlate(name, icon, this.which === id, () => {
        this.which = id;
        this.draw();
      });
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(this.which === id));
      if (marks.includes(id)) setBadge(b, { kind: 'new' });
      tabs.append(b);
    }
    menu.body.append(tabs);
    if (this.which === 'satchel') this.drawSatchel(menu, s);
    else this.drawPlan(menu);
    menu.body.scrollTop = top;
    this.refresh();
  }

  /** SEVEN-SLOT GEAR batch 6: the satchel the run will take (up to five remedies, one Elixir; the last choice is remembered) and the switch
   *  that lets Auto use them (off by default). */
  private drawSatchel(menu: OrnateMenu, s: PackState): void {
    const m = this.meta;
    const pick = satchelFor(m);
    const taken = REMEDY_LIST.reduce((n, r) => n + (pick[r.id] ?? 0), 0);
    menuTitle(menu, 'Satchel', `${taken} of ${SATCHEL_MAX} packed · one Elixir at most`);
    if (!satchelShown(s)) return void menuNote(menu.body, 'No remedies yet. Hester sells them at her stall in the tavern; the ones you own are packed here for a run.');
    const owned = REMEDY_LIST.filter((r) => (m.satchel?.[r.id] ?? 0) > 0);
    const box = menuWell(menu.body);
    box.classList.add('ptSatchel');
    box.id = 'ptSatchel';
    if (!owned.length) box.append(el('p', 'omNote', 'No remedies left. Hester sells them at her stall in the tavern.'));
    for (const r of owned) {
      const row = el('div', 'ptRemedy');
      const n = pick[r.id] ?? 0;
      // (UNUSED-ART: the painted minus and plus glyphs; the words are for a reader)
      const less = el('button', 'ptStep');
      const more = el('button', 'ptStep');
      less.append(medal('g-minus'));
      more.append(medal('g-plus'));
      less.setAttribute('aria-label', `One ${r.name} fewer`);
      more.setAttribute('aria-label', `One ${r.name} more`);
      less.disabled = n <= 0;
      more.disabled = taken >= SATCHEL_MAX || n >= (m.satchel?.[r.id] ?? 0) || (r.id === 'elixir' && n >= ELIXIR_MAX);
      const set = (k: number) => {
        pickSatchel(m, { ...pick, [r.id]: k });
        saveMeta(m);
        this.draw();
      };
      less.addEventListener('click', () => set(n - 1));
      more.addEventListener('click', () => set(n + 1));
      const pic = el('img', 'ptRemedyPic');
      pic.src = REMEDY_ICON[r.id];
      pic.alt = '';
      const words = el('span');
      words.append(el('b', '', r.name), el('small', '', `${n} of ${m.satchel?.[r.id] ?? 0} · ${r.text}`));
      row.append(pic, words, less, more);
      box.append(row);
    }
    const auto = el('label', 'ptAutoRemedy');
    auto.append(
      el('span', '', 'Auto may use remedies'),
      paintedSwitch('Auto may use remedies', !!m.autoRemedies, (on) => {
        if (on) m.autoRemedies = true;
        else delete m.autoRemedies;
        saveMeta(m);
        this.refresh();
      }),
    );
    menu.body.append(auto);
    menuNote(menu.body, 'With it on, Auto heals any hero under half with the cheapest remedy that brings it to three quarters, and keeps the Phoenix Ash and the Elixir for a boss.');
  }

  /** The Plan: the March orders set for this run, each on its own line, and the button that opens them (the orders' own sheet, as before). */
  private drawPlan(menu: OrnateMenu): void {
    const p = this.plan;
    menuTitle(menu, 'Plan', p ? 'the orders for this march' : 'no orders to give');
    if (!p) return void menuNote(menu.body, 'There are no march orders to give here. They are set when you march on an army, once the keep has opened one: a march, the Vigil, a road, a spare spell or the Master’s Mark.');
    const well = menuWell(menu.body);
    well.classList.add('ptPlan');
    for (const part of p.line().split(' · ')) well.append(el('p', '', part));
    const b = el('button', 'ptOrders');
    b.id = 'ptOrders';
    b.type = 'button';
    b.append(el('small', '', 'March orders'), el('b', '', 'Change the orders'), el('i', 'ptOrdersGo', '›'));
    b.setAttribute('aria-label', `March orders: ${p.line()}. Change them`);
    b.addEventListener('click', () => p.open(() => this.draw()));
    menu.body.append(b);
    menuNote(menu.body, 'The orders hold for the whole run. March starts it with them as they stand.');
  }
}
