// The endless tower's screens (`rogue.css`): the map (a scrollable vertical path map, row 1 at the foot and the boss at the top, with the party's
// health, the run's gold and relics above it), and the simple screens of the nodes that are not a battle: the shop, the campfire and the
// treasure chest, then the summary of a run that has ended. Like events.ts it reads and changes the Run only through the sim's own functions
// (`enterNode`, `buy`, `rest`, ...); a battle node hands over to the page (`onFight`), a mystery floor to the event card.

import { chestKind } from './sim/armyStars';
import { gainXp, xpOf, levelOf } from './sim/levels';
import { saveMeta, type Meta } from './sim/meta';
import { hpShare } from './sim/health';
import { ELITE_BY_ID, eliteAt } from './sim/elites';
import {
  buy, chestLine, choices, clearNode, enterNode, finishMystery, floorOf, inBattle, NODE_NAMES, openTreasure, REST_HEAL, rest, takeXp, train, trainXp, type MapNode, type NodeKind, type ShopItem, type TowerSummary,
} from './sim/tower';
import { saveRun, type Run } from './sim/run';
import { UNITS } from './sim/units';
import { gearIcon, iconImg, relicIcon } from './render/items';
import { portrait } from './render/sheets';
import { play } from './render/sound';
import { chestPicture } from './chestStash';
import { eliteInfo, relicButton, relicChoice, relicPopup } from './towerElites';
import { ICONS, icon } from './menuArt';
import swords from './art/rogue/swords.png';
import skull from './art/rogue/skull.png';
import fire from './art/rogue/fire.png';
import coin from './art/rogue/coin.png';
import question from './art/rogue/question.png';
import heart from './art/rogue/heart.png';
import potion from './art/rogue/potion.png';
import elixir from './art/rogue/elixir.png';
import chestIcon from './art/ui/chest-bronze.png';
import crown from './art/ui/ic-crown.png';
import type { Events } from './events';
import { actLook, bossOfAct } from './towerTheme';
import { BRICKS, buildBackdrop, Layout, torchEl } from './towerBack';
import { twistBadge, twistLine } from './twistView';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

/** What the page gives the view: the meta (for XP and the summary), and what a battle node, the pack and the way home do. */
export interface TowerHooks {
  meta(): Meta;
  events: Events;
  /** A battle node has been entered: start its fight. */
  onFight(): void;
  onPack(): void;
  onHome(): void;
}

/** Each kind of node: its icon, and what it is, in a line. */
export const NODE_INFO: Record<NodeKind, { icon: string; text: string }> = {
  fight: { icon: swords, text: 'A band of foes. Win to go on; gold for the win.' },
  elite: { icon: skull, text: 'A named mini-boss with an escort. Pays a choice of three relics.' },
  campfire: { icon: fire, text: 'Rest to heal the party, or train a hero for XP.' },
  shop: { icon: coin, text: 'Spend gold on relics, gear, healing, or a new hero.' },
  treasure: { icon: chestIcon, text: 'A chest: gold, and a relic or gear.' },
  mystery: { icon: question, text: 'Something strange. A choice, with a price or a prize.' },
  boss: { icon: crown, text: 'The act boss. A wall; drops gear and a relic and heals half.' },
};

/** The acts whose intro card has been shown this session (by run and act), so it plays once as an act starts. */
const introSeen = new Set<string>();
const reduced = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export class TowerView {
  private root = el('div');
  private run!: Run;
  private picked = -1;
  /** A screen over the map (shop, campfire, treasure, summary). */
  private card: HTMLElement | null = null;
  private lay = new Layout(393);
  private marker: HTMLElement | null = null;
  private moving = false;
  private introTimer = 0;
  private introFrame = 0;

  constructor(private hooks: TowerHooks) {
    this.root.id = 'towerMap';
    this.root.hidden = true;
    document.body.append(this.root);
    // (the map's stairs are laid in pixels, so they are laid again if the page changes width)
    window.addEventListener('resize', () => {
      if (!this.isOpen || !this.run?.tower || this.moving || this.mapWidth() === this.lay.W) return;
      this.draw();
    });
  }

  private mapWidth(): number {
    return Math.min(440, Math.max(320, this.root.clientWidth || document.documentElement.clientWidth || 393));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** Show the map of the run's tower (and the node in play, if the run was left at one that is not a battle). */
  open(run: Run): void {
    this.run = run;
    this.picked = -1;
    this.card = null;
    this.root.hidden = false;
    document.body.classList.add('towerUp');
    this.collectXp();
    this.draw(true);
    const cur = run.tower?.cur;
    if (cur && !cur.fight) this.resumeNode();
    else if (run.tower?.offer) this.offerCard();
  }

  close(): void {
    this.endIntro();
    this.root.hidden = true;
    this.root.replaceChildren();
    document.body.classList.remove('towerUp');
  }

  /* ------------------------------------------------------------------ the map */

  private draw(scrollToNow = false): void {
    const run = this.run;
    const t = run.tower!;
    const keep = this.root.querySelector('.rtScroll')?.scrollTop;
    this.root.replaceChildren(this.header(), this.mapBox(), this.footer());
    const sc = this.root.querySelector<HTMLElement>('.rtScroll')!;
    // (the map keeps its place while it is redrawn; on opening it scrolls to the row now being picked)
    requestAnimationFrame(() => {
      if (!scrollToNow && keep !== undefined) sc.scrollTop = keep;
      else sc.scrollTop = Math.max(0, (t.at < 0 ? this.lay.start().y : this.lay.rowY(t.row)) - sc.clientHeight * 0.62);
    });
    if (!this.card) this.maybeIntro();
  }

  private header(): HTMLElement {
    const run = this.run;
    const t = run.tower!;
    const head = el('header', 'rtHead');
    const top = el('div', 'rtTop');
    top.append(el('h2', '', `Act ${t.act} · Floor ${run.stage}`));
    const gold = el('span', 'rtGold');
    gold.append(icon(ICONS.gold), el('b', '', String(run.gold)));
    top.append(gold);
    const pack = el('button', 'small', 'Pack');
    pack.addEventListener('click', () => this.hooks.onPack());
    const home = el('button', 'small', 'Home');
    home.addEventListener('click', () => {
      saveRun(run);
      this.close();
      this.hooks.onHome();
    });
    top.append(pack, home);
    head.append(top, this.partyBars());
    const relics = el('div', 'rtRelics');
    for (const id of run.relics ?? []) {
      relics.append(relicButton(run, id, () => relicPopup(run, id, this.root)));
    }
    if (!run.relics?.length) relics.append(el('span', 'hint', 'No relics yet. Elites, bosses, chests and shops have them.'));
    head.append(relics);
    return head;
  }

  /** The squad's faces with their health bars. */
  private partyBars(): HTMLElement {
    const run = this.run;
    const bars = el('div', 'rtParty');
    for (const id of run.squad) {
      const h = run.roster.find((x) => x.id === id);
      if (!h) continue;
      const share = hpShare(run, id);
      const cell = el('div', `rtHero${share <= 0.3 ? ' low' : ''}`);
      const face = portrait(UNITS[h.kind].sheet, 40, h.grade);
      face.className = 'rtFace';
      const bar = el('i', 'rtBar');
      const fill = el('span');
      fill.style.width = `${Math.max(4, share * 100)}%`;
      bar.append(fill);
      cell.append(face, bar, el('small', '', `${Math.round(share * 100)}%`));
      cell.title = `${UNITS[h.kind].name}: ${Math.round(share * 100)}% hp`;
      bars.append(cell);
    }
    if (!run.squad.length) bars.append(el('span', 'hint', 'No heroes in the squad: pick them in the next fight.'));
    return bars;
  }

  private mapBox(): HTMLElement {
    const run = this.run;
    const t = run.tower!;
    const lay = (this.lay = new Layout(this.mapWidth()));
    const scroll = el('div', `rtScroll look${actLook(t.act).look}`);
    this.root.style.setProperty('--rtBrick', `url(${BRICKS[actLook(t.act).look]})`);
    const map = el('div', 'rtMap');
    map.style.width = `${lay.W}px`;
    map.style.height = `${lay.H}px`;
    const open = new Set(choices(run).map((n) => n.id));
    const taken = new Set(t.path);
    map.append(buildBackdrop(t.act, lay), this.gate(t.act), this.stairs(open, taken, map));
    for (const n of t.map) map.append(this.nodeButton(n, open, taken));
    this.marker = this.makeMarker();
    this.placeMarker(this.markerSpot(t.at));
    map.append(this.marker);
    scroll.append(map);
    return scroll;
  }

  /** The big gate at the top of the act: the boss that waits there, by name and face. */
  private gate(act: number): HTMLElement {
    const boss = UNITS[bossOfAct(act)];
    const lay = this.lay;
    const g = el('div', 'rtGate');
    g.style.left = `${Math.round((lay.W - 224) / 2)}px`;
    const face = portrait(boss.sheet, 96);
    face.className = 'rtGateFace';
    face.style.width = face.style.height = '96px';
    const arch = el('div', 'rtGateArch');
    arch.append(face);
    const plate = el('div', 'rtGatePlate');
    plate.append(el('small', '', `Act ${act} boss`), el('b', '', boss.name));
    g.append(el('i', 'rtGateTop'), arch, plate);
    g.title = `The gate of ${actLook(act).name}: ${boss.name} waits beyond it.`;
    return g;
  }

  /** The stairs between the floors, as steps of stone: dim where they are not to be taken, softly lit where they can be, torch-lit where walked. */
  private stairs(open: Set<number>, taken: Set<number>, map: HTMLElement): SVGElement {
    const t = this.run.tower!;
    const lay = this.lay;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'rtLines');
    svg.setAttribute('width', String(lay.W));
    svg.setAttribute('height', String(lay.H));
    const rect = (g: Element, x: number, y: number, w: number, h: number, cls: string) => {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', String(x));
      r.setAttribute('y', String(y));
      r.setAttribute('width', String(w));
      r.setAttribute('height', String(h));
      r.setAttribute('class', cls);
      g.append(r);
    };
    const flight = (a: { x: number; y: number }, b: { x: number; y: number }, ra: number, rb: number, state: string, torchN: number) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', `st ${state}`);
      const dy = a.y - b.y;
      const n = Math.floor((dy - ra - rb) / 8);
      for (let i = 0; i < n; i++) {
        const y = Math.round(a.y - ra - 4 - i * 8);
        const x = Math.round(a.x + ((b.x - a.x) * (a.y - y)) / dy);
        if (state === 'now') rect(g, x - 13, y - 7, 26, 13, 'glow');
        rect(g, x - 10, y - 4, 20, 4, 'tread');
        rect(g, x - 10, y, 20, 3, 'riser');
        rect(g, x - 10, y - 4, 1, 7, 'edge');
        rect(g, x + 9, y - 4, 1, 7, 'edge');
      }
      svg.append(g);
      if (state === 'walked') {
        const mx = Math.round((a.x + b.x) / 2) + (torchN % 2 ? 24 : -24);
        map.append(torchEl(mx, Math.round((a.y + b.y) / 2) - 6, torchN));
      }
    };
    let k = 0;
    const s = lay.start();
    const startNow = t.at < 0;
    for (const n of t.map) {
      if (n.row === 0) flight(s, { x: lay.xAt(n.lane, 0), y: lay.rowY(0) }, 0, 23, taken.has(n.id) ? 'walked' : startNow && open.has(n.id) ? 'now' : 'far', k++);
    }
    for (const n of t.map) {
      for (const to of n.next) {
        const m = t.map[to];
        const walked = taken.has(n.id) && taken.has(to);
        const now = n.id === t.at && open.has(to);
        flight({ x: lay.xAt(n.lane, n.row), y: lay.rowY(n.row) }, { x: lay.xAt(m.lane, m.row), y: lay.rowY(m.row) }, 23, m.kind === 'boss' ? 31 : 23, walked ? 'walked' : now ? 'now' : 'far', k++);
      }
    }
    // (the last flight, from the boss's door to the gate)
    const boss = t.map.find((n) => n.kind === 'boss');
    if (boss) flight({ x: lay.xAt(boss.lane, boss.row), y: lay.rowY(boss.row) }, { x: lay.xAt(boss.lane, boss.row), y: 176 }, 31, 0, open.has(boss.id) ? 'now' : 'far', k++);
    return svg;
  }

  private nodeButton(n: MapNode, open: Set<number>, taken: Set<number>): HTMLElement {
    const t = this.run.tower!;
    const state = taken.has(n.id) ? (n.id === t.at ? 'here' : 'done') : open.has(n.id) ? 'open' : t.cur?.id === n.id ? 'here' : 'far';
    const b = el('button', `rtNode ${n.kind} ${state}${this.picked === n.id ? ' picked' : ''}`);
    // (the frame is two clipped layers behind the icon: the metal, and the plate inside it)
    const size = n.kind === 'boss' ? 62 : 46;
    b.style.left = `${this.lay.xAt(n.lane, n.row) - size / 2}px`;
    b.style.top = `${this.lay.rowY(n.row) - size / 2}px`;
    b.append(el('i', 'rtFrame'), el('i', 'rtPlate'), icon(NODE_INFO[n.kind].icon, 'rtIco'));
    const badge = twistBadge(n.twist);
    if (badge) b.append(badge);
    if (state === 'done') b.append(el('i', 'rtTick'));
    b.setAttribute('aria-label', `${NODE_NAMES[n.kind]}, floor ${floorOf(t.act, n.row)}`);
    b.addEventListener('click', () => {
      if (this.moving) return;
      this.picked = open.has(n.id) ? n.id : -1;
      const elite = n.kind === 'elite' ? eliteAt(this.run.seed, t.act, t.map, n.id) : undefined;
      if (elite) this.sayNode(eliteInfo(elite, floorOf(t.act, n.row)));
      else this.say(`Floor ${floorOf(t.act, n.row)} · ${NODE_NAMES[n.kind]}: ${NODE_INFO[n.kind].text}${twistLine(n.twist)}`);
      this.markPicked();
    });
    return b;
  }

  /* ------------------------------------------------------------------ the party's marker */

  private makeMarker(): HTMLElement {
    const run = this.run;
    const lead = run.squad.map((id) => run.roster.find((x) => x.id === id)).find(Boolean);
    const m = el('div', 'rtMarker');
    if (lead) {
      const face = portrait(UNITS[lead.kind].sheet, 36, lead.grade);
      face.style.width = face.style.height = '36px';
      m.append(face);
    } else m.append(el('i', 'rtFlag'));
    return m;
  }

  /** Where the marker stands for a node (or the foot of the tower): just above its plate. */
  private markerSpot(at: number): { x: number; y: number } {
    const lay = this.lay;
    const node = at >= 0 ? this.run.tower!.map[at] : null;
    if (!node) return { x: lay.start().x - 18, y: lay.start().y - 30 };
    return { x: lay.xAt(node.lane, node.row) - 18, y: lay.rowY(node.row) - 54 };
  }

  private placeMarker(p: { x: number; y: number }): void {
    if (!this.marker) return;
    this.marker.style.left = `${Math.round(p.x)}px`;
    this.marker.style.top = `${Math.round(p.y)}px`;
  }

  /** The marker climbs the stairs to a node in half a second (a hop with each step), then `done` runs. Whole pixels only. */
  private climbTo(id: number, done: () => void): void {
    const from = this.markerSpot(this.run.tower!.at);
    const to = this.markerSpot(id);
    if (!this.marker || reduced()) return done();
    this.moving = true;
    const t0 = performance.now();
    const MS = 500;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / MS);
      const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
      const hop = p < 1 ? (Math.floor(p * 6) % 2) * -2 : 0;
      this.placeMarker({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e + hop });
      if (p < 1) requestAnimationFrame(tick);
      else {
        this.moving = false;
        done();
      }
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ the act's intro card */

  private maybeIntro(): void {
    const run = this.run;
    const t = run.tower!;
    const key = `${run.seed}:${t.act}`;
    if (t.at >= 0 || t.path.length || t.cur || introSeen.has(key) || this.root.querySelector('.rtIntro')) return;
    introSeen.add(key);
    const look = actLook(t.act);
    const lay = new Layout(this.mapWidth());
    const vh = this.root.clientHeight || window.innerHeight;
    const over = el('div', `rtIntro look${look.look}`);
    const view = el('div', 'rtIntroView');
    view.style.width = `${lay.W}px`;
    view.style.left = `${Math.floor(((this.root.clientWidth || lay.W) - lay.W) / 2)}px`;
    view.append(buildBackdrop(t.act, lay));
    const text = el('div', 'rtIntroText');
    text.append(el('small', '', `Act ${t.act}`), el('h2', '', look.name), el('p', '', look.blurb), el('em', '', 'Tap to skip'));
    over.append(view, el('div', 'rtIntroShade'), text);
    this.root.append(over);
    const span = Math.min(420, Math.max(0, lay.H - vh));
    const base = -(lay.H - vh);
    const still = reduced();
    const t0 = performance.now();
    const MS = 2000;
    const pan = (now: number) => {
      const p = Math.min(1, (now - t0) / MS);
      view.style.transform = `translate3d(0, ${Math.round(base + span * p * (2 - p))}px, 0)`;
      if (p < 1) this.introFrame = requestAnimationFrame(pan);
    };
    view.style.transform = `translate3d(0, ${base}px, 0)`;
    if (!still) this.introFrame = requestAnimationFrame(pan);
    const skip = () => this.endIntro(true);
    over.addEventListener('click', skip);
    this.introTimer = window.setTimeout(skip, still ? 1400 : MS);
  }

  /** Remove the intro card (fading it out in a single step when it was playing). */
  private endIntro(fade = false): void {
    clearTimeout(this.introTimer);
    cancelAnimationFrame(this.introFrame);
    const over = this.root.querySelector<HTMLElement>('.rtIntro');
    if (!over) return;
    if (fade && !reduced()) {
      over.classList.add('out');
      setTimeout(() => over.remove(), 260);
    } else over.remove();
  }

  private footer(): HTMLElement {
    const foot = el('footer', 'rtFoot');
    const say = el('p', 'rtSay', this.defaultSay());
    const go = el('button', 'primary rtGo', 'Climb');
    go.disabled = this.picked < 0;
    go.addEventListener('click', () => this.go());
    foot.append(say, go);
    return foot;
  }

  private defaultSay(): string {
    const n = choices(this.run).length;
    return n ? 'Pick a glowing node to climb to.' : 'Nothing to pick.';
  }

  /** The line above the Climb button. */
  private say(text: string): void {
    const s = this.root.querySelector('.rtSay');
    if (s) s.textContent = text;
  }

  /** The same line, with an element in it (an elite's portrait and name). */
  private sayNode(node: HTMLElement): void {
    this.root.querySelector('.rtSay')?.replaceChildren(node);
  }

  /** The picked node is lit and the Climb button wakes, without redrawing the map. */
  private markPicked(): void {
    const nodes = this.root.querySelectorAll<HTMLElement>('.rtNode');
    const map = this.run.tower!.map;
    nodes.forEach((b, i) => b.classList.toggle('picked', map[i].id === this.picked));
    const go = this.root.querySelector<HTMLButtonElement>('.rtGo');
    if (go) {
      go.disabled = this.picked < 0;
      const kind = this.picked >= 0 ? map[this.picked].kind : null;
      go.textContent = kind ? (kind === 'fight' || kind === 'elite' || kind === 'boss' ? 'To battle!' : `Go to the ${NODE_NAMES[kind].toLowerCase()}`) : 'Climb';
    }
  }

  private go(): void {
    const run = this.run;
    if (this.picked < 0 || this.moving || !choices(run).some((n) => n.id === this.picked)) return;
    const id = this.picked;
    this.climbTo(id, () => {
      if (!enterNode(run, id)) return this.draw();
      play('summon');
      saveRun(run);
      const cur = run.tower!.cur!;
      this.picked = -1;
      if (cur.fight) {
        this.close();
        this.hooks.onFight();
        return;
      }
      this.resumeNode();
    });
  }

  /** XP a mystery floor taught goes into the meta (the lessons are kept for good). */
  private collectXp(): void {
    const got = takeXp(this.run);
    if (!got) return;
    const m = this.hooks.meta();
    gainXp(m, got);
    saveMeta(m);
  }

  /** The screen of a node that is not a battle and is in play. */
  private resumeNode(): void {
    const run = this.run;
    const cur = run.tower!.cur!;
    if (cur.kind === 'mystery') {
      this.hooks.events.openEvent(run, () => {
        finishMystery(run);
        this.collectXp();
        saveRun(run);
        // (a mimic's chest was opened: the fight begins)
        if (inBattle(run)) {
          this.close();
          this.hooks.onFight();
          return;
        }
        this.draw(true);
      });
    } else if (cur.kind === 'shop') this.shopCard();
    else if (cur.kind === 'campfire') this.campCard();
    else if (cur.kind === 'treasure') this.treasureCard();
  }

  /* ------------------------------------------------------------------ the cards */

  private cardShell(title: string, kind: NodeKind): HTMLElement {
    this.card?.remove();
    const wrap = el('div', 'rtCardWrap');
    const card = el('div', `rtCard ${kind}`);
    card.append(el('h2', '', title));
    wrap.append(card);
    this.root.append(wrap);
    this.card = wrap;
    return card;
  }

  /** The relics an elite paid: choose one (the offer is kept in the run, so leaving and coming back finds it). */
  private offerCard(): void {
    const run = this.run;
    const card = this.cardShell('Choose a relic', 'elite');
    const lastElite = run.tower!.lastElite;
    relicChoice(run, card, lastElite ? ELITE_BY_ID[lastElite]?.name : undefined, () => {
      saveRun(run);
      this.card?.remove();
      this.card = null;
      this.draw(true);
    });
    saveRun(run);
  }

  /** Close the card and the node: the run climbs a floor and the map is drawn again. */
  private leave(): void {
    clearNode(this.run);
    saveRun(this.run);
    this.card?.remove();
    this.card = null;
    this.draw(true);
  }

  private goldLine(): HTMLElement {
    const g = el('div', 'rtGoldLine');
    g.append(icon(ICONS.gold), el('b', '', `${this.run.gold} gold`));
    return g;
  }

  private shopCard(): void {
    const run = this.run;
    const stock = run.tower!.cur!.shop!;
    const card = this.cardShell('The shop', 'shop');
    card.append(el('p', 'rtLead', 'A peddler lays out a blanket of wares under a lantern.'), this.goldLine(), this.partyBars());
    const list = el('div', 'rtShop');
    stock.forEach((it, i) => list.append(this.shopRow(it, i)));
    card.append(list);
    if (this.note) card.append(el('p', 'rtNote', this.note));
    const out = el('button', 'primary', 'Leave the shop');
    out.addEventListener('click', () => {
      this.note = '';
      this.leave();
    });
    card.append(out);
  }

  private note = '';

  private shopRow(it: ShopItem, i: number): HTMLElement {
    const run = this.run;
    const row = el('button', `rtItem ${it.kind}${it.sold ? ' sold' : ''}`);
    const pic =
      it.kind === 'relic' ? iconImg(relicIcon(it.ref!), it.label) : it.kind === 'gear' ? iconImg(gearIcon(it.gear!.slot, it.gear!.tier), it.label) : it.kind === 'heal' ? icon(potion, 'rtShopIco') : it.kind === 'elixir' ? icon(elixir, 'rtShopIco') : portrait(UNITS[it.ref!].sheet, 40);
    pic.classList.add('rtShopPic');
    const words = el('span');
    words.append(el('b', '', it.sold ? `${it.label} · sold` : it.label), el('small', '', it.text));
    row.append(pic, words, el('em', '', it.sold ? '' : String(it.cost)));
    row.disabled = it.sold || run.gold < it.cost;
    row.addEventListener('click', () => {
      const line = buy(run, i);
      if (line === null) return;
      play('summon');
      this.note = line;
      saveRun(run);
      this.shopCard();
    });
    return row;
  }

  private campCard(): void {
    const run = this.run;
    const cur = run.tower!.cur!;
    const card = this.cardShell('The campfire', 'campfire');
    const flame = icon(fire, 'rtFlame');
    card.append(flame, el('p', 'rtLead', 'A fire crackles in a ring of stones. The heroes bind their wounds.'), this.partyBars());
    if (cur.camp) {
      card.append(el('p', 'rtNote', cur.camp));
      const go = el('button', 'primary', 'Break camp');
      go.addEventListener('click', () => this.leave());
      card.append(go);
      return;
    }
    const restBtn = el('button', 'rtChoice');
    restBtn.append(icon(heart, 'rtShopIco'));
    const words = el('span');
    words.append(el('b', '', 'Rest'), el('small', '', `heal every hero ${Math.round(REST_HEAL * 100)}% of its hp, the fallen too`));
    restBtn.append(words);
    restBtn.addEventListener('click', () => {
      rest(run);
      play('summon');
      saveRun(run);
      this.campCard();
    });
    card.append(restBtn, el('p', 'rtLead', `Or train a hero by the fire (+${trainXp(run.stage)} XP, kept for good):`));
    const heroes = el('div', 'rtTrain');
    const seen = new Set<string>();
    for (const h of run.roster) {
      if (seen.has(h.kind)) continue;
      seen.add(h.kind);
      const b = el('button', 'rtTrainHero');
      const face = portrait(UNITS[h.kind].sheet, 40, h.grade);
      b.append(face, el('small', '', UNITS[h.kind].name), el('em', '', `Lv ${levelOf(xpOf(this.hooks.meta(), h.kind))}`));
      b.addEventListener('click', () => {
        const got = train(run, h.id);
        if (!got) return;
        const m = this.hooks.meta();
        gainXp(m, { [got.kind]: got.xp });
        saveMeta(m);
        play('summon');
        saveRun(run);
        this.campCard();
      });
      heroes.append(b);
    }
    card.append(heroes);
  }

  private treasureCard(): void {
    const run = this.run;
    const ch = run.tower!.cur!.chest!;
    const card = this.cardShell('The treasure', 'treasure');
    const pic = chestPicture('bronze', 4);
    pic.root.classList.add('rtChest');
    card.append(pic.root);
    if (!ch.opened) {
      card.append(el('p', 'rtLead', 'A chest sits in the dust of the landing, waiting.'));
      const open = el('button', 'primary', 'Open it');
      open.addEventListener('click', () => {
        const lines = openTreasure(run) ?? [];
        play('star');
        saveRun(run);
        pic.root.classList.add('burst');
        card.querySelector('.rtLead')!.textContent = 'The lid swings open:';
        const list = el('ul', 'rtLoot');
        for (const l of lines) list.append(el('li', '', l));
        open.before(list);
        open.textContent = 'Take it and climb';
        open.onclick = () => this.leave();
      });
      card.append(open);
      return;
    }
    const go = el('button', 'primary', 'Climb on');
    go.addEventListener('click', () => this.leave());
    card.append(go);
  }

  /* ------------------------------------------------------------------ the end of a run */

  /** The summary of a run that has ended: the floors climbed and what they paid. `then` runs when it is closed. */
  showSummary(run: Run, s: TowerSummary, then: () => void): void {
    this.root.hidden = false;
    document.body.classList.add('towerUp');
    this.root.replaceChildren();
    const wrap = el('div', 'rtCardWrap solo');
    const card = el('div', 'rtCard summary');
    card.append(el('h2', '', 'The climb ends'), el('p', 'rtLead', `The heroes fall on floor ${run.stage}, in act ${s.act}.`));
    const stats = el('div', 'rtStats');
    const stat = (label: string, value: string) => {
      const row = el('div');
      row.append(el('span', '', label), el('b', '', value));
      stats.append(row);
    };
    stat('Floors climbed', String(s.floors));
    stat('Acts', String(s.act));
    stat('Relics', String(s.relics));
    stat('Heroes', String(s.heroes));
    stat('Crowns earned', String(s.crowns));
    card.append(stats);
    if (s.newBest) card.append(el('p', 'rtBest', `A new best floor: ${s.floors}!`));
    const rewards = el('div', 'rtRewards');
    for (const [name, n] of [['bronze', s.bronze], ['silver', s.silver], ['gold', s.gold]] as const) {
      if (!n) continue;
      const one = el('div', 'rtReward');
      const pic = chestPicture(chestKind(name === 'bronze' ? 3 : name === 'silver' ? 5 : 10), 2);
      one.append(pic.root, el('b', '', `×${n}`));
      rewards.append(one);
    }
    card.append(rewards);
    const line = chestLine(s);
    card.append(el('p', 'rtLead', line ? `${line} added to your stash.` : 'No chests yet: climb further to earn them.'));
    for (const g of s.gear) card.append(el('p', 'rtGear', `Equipment found: ${g}`));
    const go = el('button', 'primary', 'Back to camp');
    go.addEventListener('click', () => {
      this.close();
      then();
    });
    card.append(go);
    wrap.append(card);
    this.root.append(wrap);
  }
}
