// The fight's hero bar (COMBAT-002, docs/notes/hero-kits.md section 10): a tile for each placed hero, in the party's order: its portrait inside a
// ring (the ultimate's meter), its health, its pool (blue for mana, gold for stamina), two pips, "1" and "2" (lit when that skill can be paid
// for; pip 2 is greyed out, and never lit, while skill 2 is locked below level 10: FX-CLEAR) and its name. A full ring glows gold and says
// TAP; a tap queues the ultimate (`orderUltimate`, the sim's own command), and the ring turns while it waits. A hero without its ultimate
// yet (below level 30) shows no ring and no level plate at all, only its portrait in a plain frame of the ring's size, so the tile keeps its
// shape with no gap (HEROBAR-LOCK). The last, narrower tile is the Auto switch. The Last Stand's eight heroes take two rows.
//
// It only reads the battle and calls the sim's command; nothing here changes a fight by itself.

import { type Battle, type Unit } from './sim/battle';
import { ultimateOf } from './sim/abilities';
import { costOf, heroKitOf, resOf, skill2Open, SKILL2_LEVEL, ultFull } from './sim/heroKits';
import { canOrderUltimate, orderUltimate } from './sim/orders';
import { formOf, UNITS } from './sim/units';
import { portrait } from './render/sheets';

/** The ring's circumference (a circle of radius 21 in a 48 box). */
const RING = 2 * Math.PI * 21;

interface Tile {
  id: number;
  el: HTMLButtonElement;
  arc: SVGCircleElement;
  hp: HTMLElement;
  res: HTMLElement;
  p1: HTMLElement;
  p2: HTMLElement;
  plate: HTMLElement;
  /** What was last drawn, so a frame only touches what changed. */
  last: string;
}

export interface HeroBarOpts {
  /** The switch was flipped: the page keeps it (`Meta.ultAuto`) and tells the battle. */
  onAuto: (on: boolean) => void;
  /** A tap was refused (a locked or unfilled ultimate): the page may say why. */
  onRefused?: (u: Unit) => void;
  /** Any tap on a hero's tile (before its ultimate is ordered or refused): the Last Stand pans its camera to the hero. */
  onTap?: (u: Unit) => void;
}

export class HeroBar {
  private tiles: Tile[] = [];
  private key = '';
  private auto: HTMLButtonElement;
  private b: Battle | null = null;

  constructor(
    readonly root: HTMLElement,
    private opts: HeroBarOpts,
  ) {
    root.classList.add('heroBar');
    this.auto = document.createElement('button');
    this.auto.className = 'hbAuto';
    this.auto.type = 'button';
    this.auto.innerHTML = '<span>AUTO</span><i class="sw"><b></b></i><small>off</small>';
    this.auto.title = 'Auto: fire every ultimate the moment it is ready';
    this.auto.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = !this.auto.classList.contains('on');
      this.setAuto(on);
      this.opts.onAuto(on);
    });
  }

  /** Show the switch as on or off. */
  setAuto(on: boolean): void {
    this.auto.classList.toggle('on', on);
    this.auto.querySelector('small')!.textContent = on ? 'on' : 'off';
    this.auto.setAttribute('aria-pressed', String(on));
  }

  /** The heroes the bar shows: the placed heroes with a kit, in the order they were placed (the party's order). */
  private heroes(b: Battle): Unit[] {
    return b.units.filter((u) => heroKitOf(u));
  }

  /** Rebuild the tiles when the heroes change (a new fight, a hero placed). */
  build(b: Battle): void {
    this.b = b;
    const units = this.heroes(b);
    const key = units.map((u) => `${u.id}:${u.def}:${u.grade ?? 1}`).join() + `@${b.seed}`;
    if (key === this.key) return;
    this.key = key;
    this.root.replaceChildren();
    this.tiles = [];
    // (up to five in a row; more (the Last Stand's eight, a Calamity's ten) in two rows)
    this.root.style.setProperty('--hb-n', String(units.length > 5 ? Math.min(5, Math.ceil(units.length / 2)) : Math.max(1, units.length)));
    this.root.classList.toggle('two', units.length > 5);
    // (four to a row leaves room for the bars beside the portrait; five to a row stacks them under it)
    this.root.classList.toggle('flat', units.length > 5 && units.length <= 8);
    for (const u of units) this.root.append(this.tile(u));
    this.root.append(this.auto);
    this.refresh(b);
  }

  private tile(u: Unit): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    // (a rank-4 hero's ring is ringed in violet: MERGE-TWO)
    el.className = (u.grade ?? 1) > 3 ? 'hb g4' : 'hb';
    el.dataset.unit = String(u.id);
    const def = UNITS[u.def];
    el.innerHTML =
      '<span class="hbRing"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="trk" cx="24" cy="24" r="21"/><circle class="arc" cx="24" cy="24" r="21"/></svg></span>' +
      '<span class="hbPlate"></span><i class="hbHp"><span></span></i><i class="hbRes"><span></span></i><span class="hbPips"><b>1</b><b>2</b></span><span class="hbName"></span>';
    const ring = el.querySelector('.hbRing') as HTMLElement;
    const pic = portrait(formOf(def, u.grade ?? 1), 40, u.grade ?? 1);
    pic.className = 'hbPic';
    ring.append(pic);
    el.querySelector('.hbName')!.textContent = def.name;
    const pool = heroKitOf(u)?.pool ?? 'stamina';
    el.querySelector('.hbRes')!.classList.add(pool);
    const arc = el.querySelector('.arc') as SVGCircleElement;
    arc.style.strokeDasharray = `${RING}`;
    const pips = el.querySelectorAll('.hbPips b');
    const t: Tile = { id: u.id, el, arc, hp: el.querySelector('.hbHp span') as HTMLElement, res: el.querySelector('.hbRes span') as HTMLElement, p1: pips[0] as HTMLElement, p2: pips[1] as HTMLElement, plate: el.querySelector('.hbPlate') as HTMLElement, last: '' };
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = this.b;
      if (!b) return;
      const unit = b.units.find((x) => x.id === t.id);
      if (!unit) return;
      this.opts.onTap?.(unit);
      if (orderUltimate(b, t.id)) {
        el.classList.add('queued');
        this.refresh(b);
      } else if (ultimateOf(unit) && !canOrderUltimate(b, t.id) && unit.ultOrder === undefined) {
        // (a hero without its ultimate yet does nothing: it has no meter to point at)
        this.opts.onRefused?.(unit);
        el.classList.remove('nudge');
        void el.offsetWidth;
        el.classList.add('nudge');
      }
    });
    this.tiles.push(t);
    return el;
  }

  /** An order lapsed: the tile shakes once. */
  lapse(id: number): void {
    const t = this.tiles.find((x) => x.id === id);
    if (!t) return;
    t.el.classList.remove('nudge');
    void t.el.offsetWidth;
    t.el.classList.add('nudge');
  }

  /** Bring every tile up to date (each frame: only what changed is written). */
  refresh(b: Battle): void {
    this.b = b;
    for (const t of this.tiles) {
      const u = b.units.find((x) => x.id === t.id);
      if (!u) continue;
      const hk = heroKitOf(u);
      const ult = ultimateOf(u);
      const locked = !ult;
      const ready = !locked && ultFull(u) && u.alive;
      const queued = u.ultOrder !== undefined || !!b.orders?.some((o) => o.unit === u.id);
      const meter = locked ? 0 : Math.min(1, (u.charge2 ?? 0) / 100);
      const hp = Math.max(0, u.hp / u.maxHp);
      const res = hk ? resOf(u, hk.pool) : 0;
      const max = hk ? (hk.pool === 'mana' ? 100 : 60) : 1;
      const can1 = !!hk && res + 1e-9 >= costOf(u, hk.s1);
      const open2 = skill2Open(u);
      const can2 = !!hk && open2 && res + 1e-9 >= costOf(u, hk.s2);
      const state = `${Math.round(meter * 100)}|${Math.round(hp * 100)}|${Math.round((res / max) * 100)}|${+can1}${+can2}${+open2}|${+ready}${+queued}${+locked}${+u.alive}`;
      if (state === t.last) continue;
      t.last = state;
      t.arc.style.strokeDashoffset = `${RING * (1 - meter)}`;
      t.hp.style.width = `${Math.round(hp * 100)}%`;
      t.res.style.width = `${Math.round((res / max) * 100)}%`;
      t.p1.classList.toggle('lit', can1 && u.alive);
      t.p2.classList.toggle('lit', can2 && u.alive);
      t.p2.classList.toggle('shut', !open2);
      t.p2.title = open2 ? '' : `Skill 2 opens at level ${SKILL2_LEVEL}`;
      t.el.classList.toggle('ready', ready && !queued);
      t.el.classList.toggle('queued', queued && u.alive);
      t.el.classList.toggle('locked', locked);
      t.el.classList.toggle('fallen', !u.alive);
      // (a locked ultimate has no plate: the tile shows no hint of it until it unlocks)
      t.plate.textContent = ready && !queued ? 'TAP' : '';
      t.plate.hidden = !t.plate.textContent;
      t.el.title = locked ? UNITS[u.def].name : `${UNITS[u.def].name}: tap the portrait when it glows to fire its ultimate`;
      t.el.setAttribute('aria-label', `${UNITS[u.def].name}${locked ? '' : ready ? ', ultimate ready: tap to fire' : `, ultimate ${Math.round(meter * 100)}%`}`);
    }
  }
}
