// The endless tower's screens (`rogue.css`): the map (a scrollable vertical path map, row 1 at the foot and the boss at the top, with the party's
// health, the run's gold and relics above it), and the simple screens of the nodes that are not a battle: the shop, the campfire and the
// treasure chest, then the summary of a run that has ended. Like events.ts it reads and changes the Run only through the sim's own functions
// (`enterNode`, `buy`, `rest`, ...); a battle node hands over to the page (`onFight`), a mystery floor to the event card.

import { SanctuaryView } from './sanctuaryView';
import { worldPicture } from './sanctuaryArt';
import { expeditionOf, shiftDestinations, WORLDS } from './sim/sanctuary';
import { altarBackdrop, altarPicture, type AltarPicture } from './altarArt';
import { tips } from './tips';
import { oreChip } from './oreView';
import { awakenedOf } from './sim/awaken';
import { chestKind } from './sim/armyStars';
import { gainXp, xpOf, levelOf } from './sim/levels';
import { heroRank, saveMeta, type Meta } from './sim/meta';
import { hpShare } from './sim/health';
import { ELITE_BY_ID, eliteAt } from './sim/elites';
import {
  buy, chestLine, choices, clearNode, enterNode, finishMystery, hereOf, setGoing, floorOf, hasRoom, hire, hireClosed, inBattle, leaveOpen, localTrainXp, NODE_NAMES, openTreasure, REST_HEAL, rest, mapProgress, moveTo, rowsIn, takeXp, train, trainXp, type MapNode, type NodeKind, type ShopItem, type TowerSummary,
} from './sim/tower';
import { SIDE_BASE, sideSpots, START_ID } from './sim/calLand';
import { sideEliteAt } from './sim/elites';
import { CalMap, dungeonIcon, dungeonName } from './calMap';
import { saveSlot, squadLimit, type Run } from './sim/run';
import { heroLevel } from './sim/climb';
import { chooseAltar, COMMANDMENTS, OFFERINGS, PATRONS, pendingAltar, reforgeAltar, RIFT_BOSSES, riftRank, type Commandment, type Offering, type Patron } from './sim/rift';
import { altarButtonLine, altarSummary, BLOCKED_LINE, commandmentLine, corruptionLines, evolutionLine, nextLine, offeringLine, patronGrowth, patronLine, sealChoices, STEP_INFO, stepLabel, STEPS } from './sim/altarWords';
import { altarHelpButton, altarHelpSeen, sealTable, showAltarHelp, summaryBlock } from './altarHelp';
import { CAL_MAPS } from './sim/calamity';
import { UNITS } from './sim/units';
import { heroName } from './sim/heroNames';
import { gearIcon, iconImg, relicIcon } from './render/items';
import { lookSheet } from './render/awakenLook';
import { portrait } from './render/sheets';
import { play } from './render/sound';
import { chestPicture } from './chestStash';
import { detourInfo, eliteInfo, relicButton, relicChoice, relicPopup } from './towerElites';
import { mapRecapCard, victoryCard } from './calClear';
import { recapDetail } from './recapView';
import type { RunRecap } from './sim/runRecap';
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
import recruitIcon from './art/rogue/recruit.png';
import type { Events } from './events';
import { actLook, bossOfAct, calamityLook, type ActLook } from './towerTheme';
import { BRICKS, buildBackdrop, Layout, torchEl } from './towerBack';
import { confirmBox } from './calamityView';
import { playTwist, twistBadge, twistLine } from './twistView';

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
  /** The player chose to start over (after the confirm): end the run and show what it earned. */
  onAbandon(): void;
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
  recruit: { icon: recruitIcon, text: 'Heroes for hire. Pay gold, and one joins the party.' },
};

/** What the Calamity's spots are, in a line (the map is cleared in any order: it has spots, not floors). */
const CAL_INFO: Partial<Record<NodeKind, string>> = {
  boss: "The map's boss. Its fall opens the next map. Drops gear and a relic.",
  campfire: "The map's one campfire: rest, or train a hero.",
  recruit: "The map's one recruit spot: one free hero out of three.",
  shop: 'Heroes, relics, gear and healing. Come back with more gold.',
};
const calInfo = (kind: NodeKind): string => CAL_INFO[kind] ?? NODE_INFO[kind].text;

/** The acts whose intro card has been shown this session (by run and act), so it plays once as an act starts. */
const NO_PICK = -2;
const introSeen = new Set<string>();
const reduced = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** The first-time line (until a spot has been picked once on this device) tells the player to tap a lit spot. */
const HINT_KEY = 'lotf-cal-hint';
const hinted = (): boolean => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
};
const seenHint = (): void => {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* no storage: the line shows again */
  }
};
const calHint = (run: Run): string => {
  const t = run.tower!;
  const first = !hinted() && t.act === 1 && t.path.length === 0;
  return first ? 'The portal brought your company here. Choose your first chamber.' : 'Tap a chamber, or use the arrows to move through cleared rooms.';
};

export class TowerView {
  private root = el('div');
  private run!: Run;
  private picked = NO_PICK;
  /** A screen over the map (shop, campfire, treasure, summary). */
  private card: HTMLElement | null = null;
  private lay = new Layout(393);
  private marker: HTMLElement | null = null;
  private moving = false;
  private introTimer = 0;
  private introFrame = 0;
  /** The node tapped last, so tapping the same twisted one again does not repeat its reveal. */
  private lastTapped = -1;
  /** The calamity's land (`calMap.ts`), made when a calamity's map is first drawn, and the width it was laid for. */
  private cal: CalMap | null = null;
  private calW = 0;
  private sanctuary: SanctuaryView | null = null;

  /** The look of the run's current act or map. */
  private look(): ActLook {
    const t = this.run.tower!;
    return this.run.mode?.kind === 'calamity' ? calamityLook(this.run.rift ? RIFT_BOSSES[t.act - 1] : t.act) : actLook(t.act);
  }

  private get calamity(): boolean {
    return this.run.mode?.kind === 'calamity';
  }

  constructor(private hooks: TowerHooks) {
    this.root.id = 'towerMap';
    this.root.hidden = true;
    document.body.append(this.root);
    // (the map's stairs are laid in pixels, so they are laid again if the page changes width)
    window.addEventListener('resize', () => {
      if (!this.isOpen || !this.run?.tower || this.moving) return;
      if (this.calamity) {
        if (this.mapWidth() !== this.calW && !this.card) this.draw();
        return;
      }
      if (this.mapWidth() === this.lay.W) return;
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
    this.moving = false;
    this.picked = NO_PICK;
    this.lastTapped = -1;
    this.card = null;
    this.root.hidden = false;
    document.body.classList.add('towerUp');
    tips.update();
    this.collectXp();
    this.draw(true);
    const cur = run.tower?.cur;
    // (a calamity closed mid-walk: the spot it was going to is lit as chosen, the leader there)
    if (this.calamity && !expeditionOf(run) && !cur && run.tower?.going !== undefined) this.pickSpot(run.tower.going);
    if (cur && !cur.fight) this.resumeNode();
    else if (pendingAltar(run)) this.altarCard();
    else if (run.tower?.offer) this.offerCard();
    else if (this.calamity && run.tower?.mapDone && !run.over) this.recapCard();
  }

  /** The map gives way to another screen (the home screen, a fight, the Last Stand): saved as its own Home button saves it, and shut.
   *  Left open it stayed over everything after it (z-index 5, over the home screen and the board), so the old map covered the new one. */
  dismiss(): void {
    if (this.root.hidden) return;
    if (this.run) saveSlot(this.run);
    this.close();
  }

  close(): void {
    this.sanctuary?.release();
    this.cal?.release();
    this.endIntro();
    this.root.hidden = true;
    this.root.replaceChildren();
    document.body.classList.remove('towerUp');
  }

  /* ------------------------------------------------------------------ the map */

  /** The calamity's camera eases back onto the leader when the map is drawn after a spot is cleared (`draw(true)`). */
  private recentre = false;

  private draw(scrollToNow = false): void {
    this.recentre = scrollToNow;
    const run = this.run;
    const t = run.tower!;
    const keep = this.root.querySelector('.rtScroll')?.scrollTop;
    this.root.classList.toggle('rsMode', !!expeditionOf(run));
    this.root.classList.toggle('dmMode', this.calamity);
    this.sanctuary?.release();
    if (expeditionOf(run)) {
      this.cal?.release();
      const sanctuary = (this.sanctuary ??= new SanctuaryView({
        enter: (id) => { if (!this.moving && !this.card && !pendingAltar(this.run)) this.goTo(id); },
        altar: () => this.altarCard(), company: () => this.companyCard(), pack: () => this.hooks.onPack(),
        home: () => { saveSlot(this.run); this.close(); this.hooks.onHome(); },
        shift: () => { if (pendingAltar(this.run) || this.card) return; if (shiftDestinations(this.run)) {saveSlot(this.run);this.draw();} },
      }));
      this.root.replaceChildren(sanctuary.mount(run));
      return;
    }
    this.root.replaceChildren(this.header(), this.mapBox(), this.footer());
    const sc = this.root.querySelector<HTMLElement>('.rtScroll')!;
    // (the map keeps its place while it is redrawn; on opening it scrolls to the row now being picked)
    // (a calamity's land keeps its own camera)
    if (!this.calamity) {
      requestAnimationFrame(() => {
        if (!scrollToNow && keep !== undefined) sc.scrollTop = keep;
        else sc.scrollTop = Math.max(0, (t.at < 0 ? this.lay.start().y : this.lay.rowY(t.row)) - sc.clientHeight * 0.62);
      });
      if (!this.card) this.maybeIntro();
    }
  }

  private header(): HTMLElement {
    if (this.calamity) return this.dungeonHeader();
    const run = this.run;
    const t = run.tower!;
    const head = el('header', 'rtHead');
    const top = el('div', 'rtTop');
    if (this.calamity) {
      // (a map to clear before the next, not a floor: its title, and under it how many of its spots are cleared)
      const { done, total } = mapProgress(t);
      const title = el('div', 'rtTitle');
      title.append(el('h2', '', `Map ${t.act}/${t.maps ?? CAL_MAPS}`), el('small', '', `${done} of ${total} spots cleared`));
      top.append(title);
    } else top.append(el('h2', '', `Act ${t.act} · Floor ${run.stage}`));
    const gold = el('span', 'rtGold');
    gold.append(icon(ICONS.gold), el('b', '', String(run.gold)));
    top.append(gold);
    const pack = el('button', 'small', 'Pack');
    pack.addEventListener('click', () => this.hooks.onPack());
    const home = el('button', 'small', 'Home');
    home.addEventListener('click', () => {
      saveSlot(run);
      this.close();
      this.hooks.onHome();
    });
    top.append(pack, home);
    head.append(top, this.partyBars());
    if (run.rift) {
      const h = run.roster.find((x) => x.id === run.rift!.starter);
      const altar = el('button', 'rtChoice riftStatus');
      const words = el('span');
      words.append(el('b', '', `${h ? heroName(h.kind) : 'Starter'} · Lv ${h ? heroLevel(h) : 1} · Evolution ${riftRank(run.rift)}/3`), el('small', '', pendingAltar(run) ? 'An altar evolution awaits — choose your blessing' : `${run.rift.patron ? PATRONS[run.rift.patron].name : 'Altar awakens after your first victory'} · Corruption ${run.rift.corruption}`));
      altar.append(words);
      altar.addEventListener('click', () => this.altarCard());
      head.append(altar);
    }
    head.append(this.abandonRow());
    const relics = el('div', 'rtRelics');
    for (const id of run.relics ?? []) {
      relics.append(relicButton(run, id, () => relicPopup(run, id, this.root)));
    }
    if (!run.relics?.length) relics.append(el('span', 'hint', 'No relics yet. Elites, bosses, chests and shops have them.'));
    head.append(relics);
    return head;
  }

  /** The approved map keeps its compact status bar; full company details stay one tap away. */
  private dungeonHeader(): HTMLElement {
    const run = this.run, t = run.tower!;
    const head = el('header', 'rtHead dmHead');
    const top = el('div', 'dmTop');
    const words = el('div');
    words.append(el('p', 'dmEyebrow', `The Calamity · Region ${t.act} / ${t.maps ?? CAL_MAPS}`), el('h2', '', dungeonName(t.act)));
    const home = el('button', 'dmClose', '×');
    home.setAttribute('aria-label', 'Return home');
    home.addEventListener('click', () => { saveSlot(run); this.close(); this.hooks.onHome(); });
    top.append(words, home);
    const status = el('div', 'dmStatus');
    const starter = run.roster.find((h) => h.id === run.rift?.starter) ?? run.roster[0];
    if (starter) {
      const face = portrait(UNITS[starter.kind].sheet, 36, starter.grade);
      face.className = 'dmAvatar';
      const name = el('span', 'dmStarter');
      name.append(el('b', '', heroName(starter.kind)), el('small', '', `Starter · Lv ${heroLevel(starter)}`));
      status.append(face, name, el('span', 'dmChip', `${Math.round(hpShare(run, starter.id) * 100)}% HP`));
    }
    status.append(el('span', 'dmChip', `${run.roster.length} hero${run.roster.length === 1 ? '' : 'es'}`));
    const gold = el('span', 'rtGold');
    gold.append(icon(ICONS.gold), el('b', '', String(run.gold)));
    status.append(gold);
    head.append(top, status);
    return head;
  }

  private companyCard(): void {
    const card = this.cardShell('Your company', 'recruit');
    card.append(this.partyBars());
    const relics = el('div', 'rtRelics');
    for (const id of this.run.relics ?? []) relics.append(relicButton(this.run, id, () => relicPopup(this.run, id, this.root)));
    if (!this.run.relics?.length) relics.append(el('p', 'rtLead', 'Relics are found in worlds, shops and guardian battles.'));
    card.append(relics, this.abandonRow());
    const back = el('button', '', 'Back');
    back.addEventListener('click', () => { this.card?.remove(); this.card = null; });
    card.append(back);
  }

  /** Start over: a small link under the party, behind a confirm. */
  private abandonRow(): HTMLElement {
    const run = this.run;
    const row = el('div', 'rtAbandon');
    const calamity = this.calamity;
    const btn = el('button', 'rtLink', calamity ? 'Abandon this calamity' : 'Abandon this climb');
    btn.addEventListener('click', () =>
      confirmBox(this.root, calamity ? 'Abandon this calamity?' : 'Abandon this climb?', `The run ends here and cannot be taken up again. The crowns${calamity ? ' and map bonuses' : ' and chests'} it earned are kept; its heroes, gold and finds are lost.`, 'Abandon', () => {
        this.close();
        this.hooks.onAbandon();
      }),
    );
    row.append(el('span', 'hint', `${run.roster.length} hero${run.roster.length === 1 ? '' : 'es'} · saved`), btn);
    return row;
  }

  /** The squad's faces with their health bars (and levels, in a run that levels its own heroes). */
  private partyBars(): HTMLElement {
    const run = this.run;
    const compact = run.squad.length > 5;
    const bars = el('div', `rtParty${compact ? ' ten' : ''}`);
    for (const id of run.squad) {
      const h = run.roster.find((x) => x.id === id);
      if (!h) continue;
      const share = hpShare(run, id);
      const cell = el('div', `rtHero${share <= 0.3 ? ' low' : ''}`);
      const face = portrait(lookSheet(h.kind, heroRank(this.hooks.meta(), h.kind), h.grade), 40, h.grade);
      face.className = 'rtFace';
      const bar = el('i', 'rtBar');
      const fill = el('span');
      fill.style.width = `${Math.max(4, share * 100)}%`;
      bar.append(fill);
      if (run.local && !compact) cell.append(face, el('small', 'rtLv', `Lv ${heroLevel(h)}`), bar, el('small', '', `${Math.round(share * 100)}%`));
      else cell.append(face, bar, el('small', '', run.local ? `L${heroLevel(h)}` : `${Math.round(share * 100)}%`));
      cell.title = `${heroName(h.kind)}${run.local ? `, level ${heroLevel(h)}` : ''}: ${Math.round(share * 100)}% hp`;
      bars.append(cell);
    }
    if (!run.squad.length) bars.append(el('span', 'hint', 'No heroes in the squad: pick them in the next fight.'));
    return bars;
  }

  private mapBox(): HTMLElement {
    const run = this.run;
    const t = run.tower!;
    if (this.calamity) {
      const cal = (this.cal ??= new CalMap({ meta: () => this.hooks.meta(), onSpot: (id) => this.pickSpot(id), onStep: (id) => { if (this.moving || pendingAltar(this.run)) return; this.pickSpot(id); if (this.picked === id) this.go(); } }));
      this.calW = this.mapWidth();
      return cal.mount(run, this.calW, this.picked, this.recentre);
    }
    const lay = (this.lay = new Layout(this.mapWidth(), rowsIn(t, t.act)));
    const scroll = el('div', `rtScroll look${this.look().look}`);
    this.root.style.setProperty('--rtBrick', `url(${BRICKS[this.look().look]})`);
    const map = el('div', 'rtMap');
    map.style.width = `${lay.W}px`;
    map.style.height = `${lay.H}px`;
    const open = new Set(choices(run).map((n) => n.id));
    const taken = new Set(t.path);
    map.append(buildBackdrop(t.act, lay, this.look()), this.gate(t.act), this.stairs(open, taken, map));
    for (const n of t.map) map.append(this.nodeButton(n, open, taken));
    this.marker = this.makeMarker();
    this.placeMarker(this.markerSpot(t.at));
    map.append(this.marker);
    scroll.append(map);
    return scroll;
  }

  /** The big gate at the top of the act: the boss that waits there, by name and face. */
  private gate(act: number): HTMLElement {
    const boss = UNITS[bossOfAct(this.run.rift ? RIFT_BOSSES[act - 1] : act, this.calamity)];
    const lay = this.lay;
    const g = el('div', 'rtGate');
    g.style.left = `${Math.round((lay.W - 224) / 2)}px`;
    const face = portrait(boss.sheet, 96);
    face.className = 'rtGateFace';
    face.style.width = face.style.height = '96px';
    const arch = el('div', 'rtGateArch');
    arch.append(face);
    const plate = el('div', 'rtGatePlate');
    plate.append(el('small', '', this.calamity ? `Map ${act} boss` : `Act ${act} boss`), el('b', '', boss.name));
    g.append(el('i', 'rtGateTop'), arch, plate);
    g.title = `The gate of ${this.look().name}: ${boss.name} waits beyond it.`;
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
    b.setAttribute('aria-label', `${NODE_NAMES[n.kind]}, floor ${floorOf(t.act, n.row, t)}`);
    b.addEventListener('click', () => {
      if (this.moving) return;
      // (a twist is revealed once as its node is first tapped)
      if (n.twist && n.id !== this.lastTapped) playTwist(n.twist);
      this.lastTapped = n.id;
      this.picked = open.has(n.id) ? n.id : -1;
      const elite = n.kind === 'elite' ? eliteAt(this.run.seed, t.act, t.map, n.id) : undefined;
      if (elite) this.sayNode(eliteInfo(elite, `Floor ${floorOf(t.act, n.row, t)}`));
      else this.say(`Floor ${floorOf(t.act, n.row, t)} · ${NODE_NAMES[n.kind]}: ${NODE_INFO[n.kind].text}${twistLine(n.twist)}`);
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
      const face = portrait(lookSheet(lead.kind, heroRank(this.hooks.meta(), lead.kind), lead.grade), 36, lead.grade);
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
    if (!this.marker) return done();
    play('steps');
    if (reduced()) return done();
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
    const look = this.look();
    const lay = new Layout(this.mapWidth(), rowsIn(t, t.act));
    const vh = this.root.clientHeight || window.innerHeight;
    const over = el('div', `rtIntro look${look.look}`);
    const view = el('div', 'rtIntroView');
    view.style.width = `${lay.W}px`;
    view.style.left = `${Math.floor(((this.root.clientWidth || lay.W) - lay.W) / 2)}px`;
    view.append(buildBackdrop(t.act, lay, look));
    const text = el('div', 'rtIntroText');
    text.append(el('small', '', this.calamity ? `Map ${t.act} of ${t.maps ?? CAL_MAPS}` : `Act ${t.act}`), el('h2', '', look.name), el('p', '', look.blurb), el('em', '', 'Tap to skip'));
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
    if (this.calamity) return this.dungeonFooter();
    const foot = el('footer', 'rtFoot');
    const say = el('p', 'rtSay', this.defaultSay());
    const go = el('button', 'primary rtGo', this.calamity ? 'Travel' : 'Climb');
    go.disabled = this.picked < 0;
    go.addEventListener('click', () => this.go());
    foot.append(say, go);
    return foot;
  }

  private dungeonFooter(): HTMLElement {
    const foot = el('footer', 'rtFoot dmFoot');
    const info = el('div', 'dmSelection');
    const badge = el('span', 'dmEncounterIcon');
    const here = hereOf(this.run.tower!);
    const kind = here === START_ID ? 'start' : this.kindOf(here);
    badge.append(dungeonIcon(kind));
    const words = el('div', 'dmEncounterWords');
    words.append(el('h3', 'dmSelectedName', kind === 'start' ? 'Arrival portal' : `${NODE_NAMES[kind]} chamber`), el('p', 'rtSay', this.defaultSay()));
    info.append(badge, words);
    const nav = el('div', 'dmNav');
    const actions = el('div', 'dmActions');
    const go = el('button', 'primary rtGo', 'Enter chamber');
    go.disabled = this.picked === NO_PICK;
    go.addEventListener('click', () => this.go());
    actions.append(go, el('p', 'dmHint', 'Tap a chamber or use the arrows. Cleared rooms stay open.'));
    nav.append(this.cal!.controls(), actions);
    const bar = el('div', 'dmMenu');
    if (this.run.rift) {
      const r = this.run.rift;
      const altar = el('button', '', altarButtonLine(r, pendingAltar(this.run)));
      altar.addEventListener('click', () => this.altarCard());
      bar.append(altar);
    }
    const pack = el('button', '', 'Pack');
    pack.addEventListener('click', () => this.hooks.onPack());
    const company = el('button', '', `Company · ${this.run.roster.length}`);
    company.addEventListener('click', () => this.companyCard());
    bar.append(pack, company);
    foot.append(info, nav, bar);
    return foot;
  }

  private defaultSay(): string {
    if (this.calamity) return calHint(this.run);
    const n = choices(this.run).length;
    return n ? 'Pick a glowing node to climb to.' : 'Nothing to pick.';
  }

  /** The line above the Climb button. */
  private say(text: string): void {
    const s = this.root.querySelector('.rtSay');
    if (s) s.textContent = text;
    this.root.querySelector('.rtFoot')?.classList.remove('info');
  }

  /** The same line, with an element in it (an elite's portrait and name). */
  private sayNode(node: HTMLElement): void {
    this.root.querySelector('.rtSay')?.replaceChildren(node);
    // (a portrait and three lines want the whole width: the button goes under them)
    this.root.querySelector('.rtFoot')?.classList.add('info');
  }

  /** The picked node is lit and the Climb button wakes, without redrawing the map. */
  private markPicked(): void {
    if (this.calamity) return this.markSpot();
    const nodes = this.root.querySelectorAll<HTMLElement>('.rtNode');
    const map = this.run.tower!.map;
    nodes.forEach((b, i) => b.classList.toggle('picked', map[i].id === this.picked));
    const go = this.root.querySelector<HTMLButtonElement>('.rtGo');
    if (go) {
      go.disabled = this.picked < 0;
      const kind = this.picked >= 0 ? map[this.picked].kind : null;
      go.textContent = kind ? (kind === 'fight' || kind === 'elite' || kind === 'boss' ? 'To battle!' : kind === 'recruit' ? 'Meet the recruits' : `Go to the ${NODE_NAMES[kind].toLowerCase()}`) : 'Climb';
    }
  }

  /** The kind of a spot of the calamity's land: a map node's, or a hidden side spot's. */
  private kindOf(id: number): NodeKind {
    const run = this.run;
    if (id === START_ID) return 'fight';
    return id >= SIDE_BASE ? (sideSpots(run.seed, run.tower!.act, run.tower!.map).find((s) => s.id === id)?.kind ?? 'treasure') : run.tower!.map[id].kind;
  }

  /** A lit spot of the calamity's land was tapped: it is chosen, and the line under the map says what it is. */
  private pickSpot(id: number): void {
    const run = this.run;
    const t = run.tower!;
    if (this.moving || this.cal?.walking || !(this.cal?.openIds().has(id) || this.cal?.walkIds().has(id))) return;
    this.picked = id;
    seenHint();
    const node = id < SIDE_BASE ? t.map[id] : undefined;
    // (a twist is revealed once as its spot is first tapped)
    if (node?.twist && id !== this.lastTapped) playTwist(node.twist);
    this.lastTapped = id;
    if (!this.cal!.openIds().has(id)) {
      // (a spot already cleared, or the portal: nothing to do there, only to walk back to)
      this.say(id === START_ID ? 'The portal that brought your heroes into the Calamity. Walk back to its threshold.' : `${id >= SIDE_BASE ? 'The detour' : NODE_NAMES[t.map[id].kind]} is cleared. Walk back to it.`);
      this.markPicked();
      return;
    }
    if (id >= SIDE_BASE) {
      const side = this.kindOf(id);
      if (side === 'elite') this.sayNode(detourInfo(sideEliteAt(run.seed, t.act, t.map, id - SIDE_BASE), `Map ${t.act}`));
      else this.say('Detour hoard: a hidden stash, no fight. Pays gold only.');
    } else {
      const elite = node!.kind === 'elite' ? eliteAt(run.seed, t.act, t.map, id) : undefined;
      if (elite) this.sayNode(eliteInfo(elite, `Map ${t.act}`));
      else this.say(`${NODE_NAMES[node!.kind]}${t.path.includes(id) ? ' (cleared: open again)' : ''}: ${calInfo(node!.kind)}${twistLine(node!.twist)}`);
    }
    this.markPicked();
  }

  private markSpot(): void {
    this.cal?.setPicked(this.picked);
    const go = this.root.querySelector<HTMLButtonElement>('.rtGo');
    if (!go) return;
    go.disabled = this.picked === NO_PICK;
    if (this.picked === NO_PICK) return void (go.textContent = 'Enter chamber');
    const badge = this.root.querySelector('.dmEncounterIcon');
    const portal = this.picked === START_ID;
    badge?.replaceChildren(dungeonIcon(portal ? 'start' : this.kindOf(this.picked)));
    const title = this.root.querySelector('.dmSelectedName');
    if (title) title.textContent = portal ? 'Arrival portal' : `${this.picked >= SIDE_BASE ? 'Detour · ' : ''}${NODE_NAMES[this.kindOf(this.picked)]} chamber`;
    const kind = this.kindOf(this.picked);
    const side = this.picked >= SIDE_BASE;
    if (!this.cal!.openIds().has(this.picked)) return void (go.textContent = 'Walk there');
    if (this.run.tower!.path.includes(this.picked)) return void (go.textContent = `Visit the ${NODE_NAMES[kind].toLowerCase()} again`);
    go.textContent = kind === 'fight' || kind === 'elite' || kind === 'boss' ? (side ? 'Detour fight!' : 'To battle!') : kind === 'recruit' ? 'Meet the recruits' : side ? 'Open the hoard' : `Go to the ${NODE_NAMES[kind].toLowerCase()}`;
  }

  private go(): void {
    const run = this.run;
    const calamity = this.calamity;
    if (this.moving || this.picked < 0 && (!calamity || this.picked !== START_ID)) return;
    if (calamity && this.cal && !this.cal.openIds().has(this.picked) && this.cal.walkIds().has(this.picked)) return this.walkBack(this.picked);
    if (calamity ? !this.cal?.openIds().has(this.picked) : !choices(run).some((n) => n.id === this.picked)) return;
    const id = this.picked;
    // (the boss can be fought at any time its lair is in sight: with spots left, it asks first)
    if (calamity && id < SIDE_BASE && run.tower!.map[id].kind === 'boss') {
      const { done, total } = mapProgress(run.tower!);
      if (done < total) {
        confirmBox(this.root, 'Face the boss now?', `${total - done} spot${total - done === 1 ? '' : 's'} unexplored. Whatever is left behind is XP, gold and loot you will not have.`, 'Face the boss', () => this.goTo(id));
        return;
      }
    }
    this.goTo(id);
  }

  /** The party walks to a spot it has cleared (or the portal) and stands there: free and safe. */
  private walkBack(id: number): void {
    const run = this.run;
    this.moving = true;
    play('steps');
    this.cal!.walkTo(id, () => {
      this.moving = false;
      moveTo(run, id);
      saveSlot(run);
      this.picked = NO_PICK;
      this.draw(true);
    });
  }

  private goTo(id: number): void {
    const run = this.run;
    const calamity = this.calamity;
    const way = (arrive: () => void) => {
      if (expeditionOf(run)) return arrive();
      if (!calamity) return this.climbTo(id, arrive);
      // (the squad's leader walks the road to the spot, the camera with it; a tap skips it. The walk is saved as begun: closed mid-walk, the game reopens with the leader at the spot and its fight not yet started)
      const t = run.tower!;
      if (t.going !== undefined && t.going !== id) {
        t.going = undefined;
        this.cal!.restand();
      }
      setGoing(run, id);
      saveSlot(run);
      this.moving = true;
      play('steps');
      this.cal!.walkTo(id, () => {
        this.moving = false;
        arrive();
      });
    };
    way(() => {
      if (!enterNode(run, id)) return this.draw();
      play('summon');
      saveSlot(run);
      const cur = run.tower!.cur!;
      this.picked = NO_PICK;
      const show = () => {
        this.moving = false;
        if (cur.fight) { this.close(); this.hooks.onFight(); return; }
        this.resumeNode();
      };
      if (expeditionOf(run) && this.sanctuary) { this.moving = true; this.sanctuary.depart(show); }
      else show();
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
        saveSlot(run);
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
    else if (cur.kind === 'recruit') this.recruitCard();
  }

  /* ------------------------------------------------------------------ the cards */

  private cardShell(title: string, kind: NodeKind): HTMLElement {
    this.card?.remove();
    const wrap = el('div', 'rtCardWrap');
    const card = el('div', `rtCard ${kind}`);
    card.append(el('h2', '', title));
    const world = this.run.tower?.cur?.world;
    if (expeditionOf(this.run) && world) {
      wrap.classList.add('rsLocation');
      const background = el('div', 'rsLocationScenery');background.append(worldPicture(world));wrap.prepend(background);
      card.prepend(el('p', 'rsEyebrow', WORLDS[world].name));
      card.append(el('p', 'rtLead', WORLDS[world].description));
    }
    wrap.append(card);
    this.root.append(wrap);
    this.card = wrap;
    return card;
  }

  /** The three choices persist in the run; a pending evolution cannot be skipped by reloading.
   *  ALTAR-CLEAR: each choice is told in numbers from the rules (`sim/altarWords.ts`), consecrate and corrupt side by side,
   *  what comes next and why the rift waits; with no choice due it is the "Your altar" summary; ⓘ explains the altar, and
   *  does so by itself the first time. */
  private altarCard(reforge = false): void {
    const run = this.run;
    const r = run.rift;
    if (!r) return;
    const slot = reforge ? 'patron' : pendingAltar(run);
    const card = this.cardShell(reforge ? 'Reforge your altar' : slot ? `Awaken your ${slot}` : 'Your altar', 'campfire');
    card.classList.add('riftAltar');
    if (slot && !reforge) card.classList.add('altarDue');
    card.parentElement!.classList.add('dmAltarVeil');
    const scenery = el('div', 'altarScenery');
    scenery.setAttribute('aria-hidden', 'true');
    const background = el('img');
    background.src = altarBackdrop;
    background.alt = '';
    scenery.append(background);
    card.prepend(scenery);
    const heading = card.querySelector('h2')!;
    const eyebrow = el('p', 'altarEyebrow', slot && !reforge ? stepLabel(slot) : 'The Calamity · Altar of Ascension');
    heading.before(eyebrow);
    card.append(altarHelpButton(() => card));
    const steps = el('div', 'altarSteps');
    for (const id of STEPS) {
      const step = el('span', id === slot && !reforge ? 'active' : r[id] ? 'complete' : '', `${r[id] ? '◆' : '◇'} ${STEP_INFO[id].n} ${STEP_INFO[id].name}`);
      steps.append(step);
    }
    const scene = el('div', 'altarScene');
    scene.append(altarPicture(r.patron ? `${r.patron}-altar` : 'pedestal'));
    heading.after(steps, scene);
    const close = () => {
      this.card?.remove();
      this.card = null;
      this.draw();
      if (reforge) this.campCard();
      else if (run.tower?.offer) this.offerCard();
      else if (run.tower?.mapDone) this.recapCard();
    };
    // (the rank the starter will have once this step is chosen; a reforge keeps the rank it has)
    const rank = reforge ? riftRank(r) : riftRank(r) + 1;
    if (slot) {
      if (reforge) card.append(el('p', 'rtLead', 'Swap your patron for another. This uses the campfire instead of resting or training. Your evolutions and corruption stay as they are.'));
      else card.append(el('p', 'rtLead altarWhat', `This step decides ${STEP_INFO[slot].what}. Whichever you pick, ${evolutionLine(rank).replace(/^Your starter/, 'your starter')}`));
      const options = slot === 'patron' ? PATRONS : slot === 'offering' ? OFFERINGS : COMMANDMENTS;
      const selected = el('p', 'rtNote', 'Choose one blessing below.');
      const seals = el('div');
      const actions = el('div', 'riftActions');
      const safe = el('button', 'primary', reforge ? 'Reforge' : 'Consecrate');
      const risky = el('button', 'danger', 'Corrupt');
      safe.disabled = risky.disabled = true;
      let choice = '';
      const buttons: HTMLButtonElement[] = [];
      const words = (id: string): string[] =>
        slot === 'patron' ? [patronLine(id as Patron, rank), patronGrowth(id as Patron, rank)]
        : slot === 'offering' ? [offeringLine(id as Offering)]
        : [commandmentLine(id as Commandment, r.patron, rank)];
      for (const [id, option] of Object.entries(options)) {
        if (reforge && id === r.patron) continue;
        const b = el('button', 'rtChoice');
        b.setAttribute('aria-pressed', 'false');
        const text = el('span');
        text.append(el('b', '', option.name));
        for (const line of words(id)) text.append(el('small', '', line));
        const motif: AltarPicture = slot === 'patron' ? `${id as keyof typeof PATRONS}-crest` : id === 'vitality' || id === 'together' ? 'bastion-crest' : id === 'fury' ? 'ember-crest' : 'echo-crest';
        b.append(altarPicture(motif, 'altarChoiceArt'), text);
        b.addEventListener('click', () => {
          choice = id;
          const patron = slot === 'patron' ? id as keyof typeof PATRONS : r.patron;
          scene.replaceChildren(altarPicture(patron ? `${patron}-altar` : 'pedestal'));
          if (!reduced()) scene.animate([{ filter: 'brightness(1.4)' }, { filter: 'brightness(1)' }], { duration: 450 });
          for (const other of buttons) other.setAttribute('aria-pressed', String(other === b));
          safe.disabled = risky.disabled = false;
          if (!reforge) seals.replaceChildren(sealTable(sealChoices(r, slot, id)));
          selected.textContent = `${option.name} selected. ${reforge ? 'Uses this campfire instead of resting or training.' : 'Consecrate it safely, or corrupt it for more power at a price:'}`;
        });
        buttons.push(b);
        card.append(b);
      }
      const commit = (corrupt: boolean) => {
        if (!(reforge ? reforgeAltar(run, choice) : chooseAltar(run, choice, corrupt))) return;
        play('summon');
        saveSlot(run);
        for (const button of card.querySelectorAll<HTMLButtonElement>('button')) button.disabled = true;
        card.classList.add(corrupt ? 'altarCorrupting' : 'altarConsecrating');
        const effect = altarPicture(corrupt ? 'corruption-seal' : 'consecration-seal', 'altarRitual');
        scene.append(effect);
        if (reduced()) close();
        else window.setTimeout(() => { if (this.run === run && card.isConnected) close(); }, 650);
      };
      safe.addEventListener('click', () => commit(false));
      risky.addEventListener('click', () => commit(true));
      actions.append(safe);
      if (!reforge) actions.append(risky);
      card.append(selected);
      if (!reforge) {
        seals.append(sealTable(sealChoices(r, slot)));
        card.append(seals);
        if (r.corruption) card.append(el('p', 'rtLead altarSoFar', `Corruption so far: ${r.corruption}. ${corruptionLines(r.corruption, r.patron).join(' ')}`));
        card.append(el('p', 'rtLead altarNext', `${nextLine(slot)} ${BLOCKED_LINE}`));
      }
      card.append(actions);
    } else {
      card.append(summaryBlock(altarSummary(run)!));
      if (!r.patron) card.append(el('p', 'rtLead', `Win a battle to wake the altar: ${stepLabel('patron')} comes ${STEP_INFO.patron.when}.`));
      else if (r.commandment) card.append(el('p', 'rtLead', 'All three steps are chosen. At a campfire you can still reforge your patron.'));
    }
    if (!slot || reforge) {
      const back = el('button', '', 'Back');
      back.addEventListener('click', close);
      card.append(back);
    }
    card.querySelector<HTMLButtonElement>('button:not(.altarInfo)')?.focus();
    if (!altarHelpSeen()) showAltarHelp(card);
  }

  /** The recap of the map just cleared: what it paid and what it held. Shown once, over the new map. */
  private recapCard(): void {
    const run = this.run;
    const t = run.tower!;
    const done = t.mapDone;
    if (!done) return;
    const card = this.cardShell(`${expeditionOf(this.run) ? 'Region' : 'Map'} ${done.map} cleared`, 'boss');
    mapRecapCard(card, done, () => {
      t.mapDone = undefined;
      saveSlot(run);
      this.card?.remove();
      this.card = null;
      if (pendingAltar(run)) this.altarCard();
    }, !!expeditionOf(run));
    // (WAVE-RECAP-2: the map's share of the company's work, its XP and its fights; its finds are the recap's own groups)
    putDetail(card, done.detail, { strip: 'Fight by fight', prefix: '#', equipmentStep: (kind) => awakenedOf(this.hooks.meta(), kind) });
  }

  /** The relics an elite paid: choose one (the offer is kept in the run, so leaving and coming back finds it). */
  private offerCard(): void {
    const run = this.run;
    const card = this.cardShell('Choose a relic', 'elite');
    const lastElite = run.tower!.lastElite;
    relicChoice(run, card, lastElite ? ELITE_BY_ID[lastElite]?.name : undefined, () => {
      saveSlot(run);
      this.card?.remove();
      this.card = null;
      this.draw(true);
    });
    saveSlot(run);
  }

  /** Close the card and the node: the run climbs a floor and the map is drawn again. */
  private leave(): void {
    clearNode(this.run);
    saveSlot(this.run);
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
    // (what a shop sells, by kind: heroes, relics, gear and healing)
    const list = el('div', 'rtShop');
    const groups: [string, ShopItem['kind'][]][] = [['Heroes for hire', ['hero']], ['Relics', ['relic']], ['Gear', ['gear']], ['Healing', ['heal', 'elixir']]];
    for (const [name, kinds] of groups) {
      const rows = stock.map((it, i) => ({ it, i })).filter((x) => kinds.includes(x.it.kind));
      if (!rows.length) continue;
      list.append(el('h3', 'rtShopHead', name));
      for (const { it, i } of rows) list.append(this.shopRow(it, i));
    }
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

  /** The recruit spot: three heroes, one free choice. Choosing one closes the offer; leaving without one keeps the spot open to come back to. */
  private recruitCard(): void {
    const run = this.run;
    const hires = run.tower!.cur!.hires ?? [];
    const taken = hires.some((h) => h.hired);
    const card = this.cardShell('Heroes for hire', 'recruit');
    card.append(el('p', 'rtLead', taken ? 'A new companion joins your expedition.' : expeditionOf(run) ? 'Three travellers wait beyond the portal. Choose one to join your company free.' : 'Three sellswords wait by the road. Choose one: they join the party free.'), this.partyBars());
    card.append(el('p', 'rtNote', `${run.roster.length} of ${squadLimit(run)} places filled`));
    const list = el('div', 'rtShop');
    hires.forEach((h, i) => {
      const def = UNITS[h.kind];
      const row = el('button', `rtItem hero${h.hired ? ' sold' : ''}`);
      const pic = portrait(def.sheet, 40);
      pic.classList.add('rtShopPic');
      const words = el('span');
      // (a hero is taken once a run: one the party has since got elsewhere is closed here)
      const had = !h.hired && hireClosed(run, h.kind);
      words.append(el('b', '', h.hired ? `${def.name} · joined` : had ? `${def.name} · in the party` : def.name), el('small', '', def.role));
      row.append(pic, words, el('em', 'free', h.hired || had ? '' : 'Free'));
      row.disabled = taken || had || !hasRoom(run);
      row.addEventListener('click', () => {
        const line = hire(run, i);
        if (line === null) return;
        play('summon');
        this.note = line;
        saveSlot(run);
        this.recruitCard();
      });
      list.append(row);
    });
    card.append(list);
    if (!hasRoom(run) && !taken) card.append(el('p', 'rtNote', 'The squad is full: no room for another hero.'));
    if (this.note) card.append(el('p', 'rtNote', this.note));
    const out = el('button', 'primary', taken ? 'Move on' : 'Not now: keep the offer');
    out.addEventListener('click', () => {
      this.note = '';
      if (taken) return this.leave();
      // (nobody chosen: the spot stays open, and the party comes back to it when it likes)
      leaveOpen(run);
      saveSlot(run);
      this.card?.remove();
      this.card = null;
      this.draw(true);
    });
    card.append(out);
  }

  private shopRow(it: ShopItem, i: number): HTMLElement {
    const run = this.run;
    const row = el('button', `rtItem ${it.kind}${it.sold ? ' sold' : ''}`);
    const pic =
      it.kind === 'relic' ? iconImg(relicIcon(it.ref!), it.label) : it.kind === 'gear' ? iconImg(gearIcon(it.gear!.slot, it.gear!.tier), it.label) : it.kind === 'heal' ? icon(potion, 'rtShopIco') : it.kind === 'elixir' ? icon(elixir, 'rtShopIco') : portrait(UNITS[it.ref!].sheet, 40);
    pic.classList.add('rtShopPic');
    const words = el('span');
    words.append(el('b', '', it.sold ? `${it.label} · sold` : it.label), el('small', '', it.text));
    row.append(pic, words, el('em', '', it.sold ? '' : String(it.cost)));
    row.disabled = it.sold || run.gold < it.cost || (it.kind === 'hero' && (!hasRoom(run) || hireClosed(run, it.ref!)));
    row.addEventListener('click', () => {
      const line = buy(run, i);
      if (line === null) return;
      play('summon');
      this.note = line;
      saveSlot(run);
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
      saveSlot(run);
      this.campCard();
    });
    if (run.rift?.patron) {
      const reforge = el('button', 'rtChoice', 'Reforge altar · change patron instead of resting');
      reforge.addEventListener('click', () => this.altarCard(true));
      card.append(reforge);
    }
    card.append(restBtn, el('p', 'rtLead', run.local ? `Or train a hero by the fire (+${localTrainXp(run.stage)} XP, for this run):` : `Or train a hero by the fire (+${trainXp(run.stage)} XP, kept for good):`));
    const heroes = el('div', 'rtTrain');
    const seen = new Set<string>();
    for (const h of run.roster) {
      // (the lasting levels are a kind's; a run's own are each hero's)
      if (!run.local && seen.has(h.kind)) continue;
      seen.add(h.kind);
      const b = el('button', 'rtTrainHero');
      const face = portrait(lookSheet(h.kind, heroRank(this.hooks.meta(), h.kind), h.grade), 40, h.grade);
      b.append(face, el('small', '', heroName(h.kind)), el('em', '', `Lv ${run.local ? heroLevel(h) : levelOf(xpOf(this.hooks.meta(), h.kind))}`));
      b.addEventListener('click', () => {
        const got = train(run, h.id);
        if (!got) return;
        if (got.xp) {
          const m = this.hooks.meta();
          gainXp(m, { [got.kind]: got.xp });
          saveMeta(m);
        }
        play('summon');
        saveSlot(run);
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
        saveSlot(run);
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
    tips.update();
    this.root.replaceChildren();
    const wrap = el('div', 'rtCardWrap solo');
    const cal = s.maps !== undefined;
    // (a Calamity cleared whole has a victory screen of its own: the finishing reward, shown in full)
    if (cal && s.cleared && s.clear) {
      const card = el('div', 'rtCard victory');
      victoryCard(card, s, () => {
        this.close();
        then();
      }, !!expeditionOf(run));
      // (WAVE-RECAP-2: the whole calamity's detail under the finishing reward)
      putDetail(card, run.recap, { strip: 'Fight by fight', prefix: '#', equipmentStep: (kind) => awakenedOf(this.hooks.meta(), kind) });
      wrap.append(card);
      this.root.append(wrap);
      return;
    }
    const card = el('div', 'rtCard summary');
    // (a Rift Sanctuary expedition is told in regions and crossings; a calamity saved before it in maps and spots)
    const unit = expeditionOf(run) ? 'region' : 'map';
    const spots = expeditionOf(run) ? 'crossings' : 'spots';
    card.append(
      el('h2', '', cal ? (s.cleared ? 'The calamity is ended!' : 'The calamity goes on') : s.abandoned ? 'The climb is over' : 'The climb ends'),
      el('p', 'rtLead', cal ? (s.cleared ? `All ${run.tower?.maps ?? CAL_MAPS} ${unit}s are cleared: the calamity falls.` : s.abandoned ? `The party turns back in ${unit} ${Math.min(s.act, run.tower?.maps ?? CAL_MAPS)}, ${s.floors} ${spots} cleared.` : `The party falls in ${unit} ${Math.min(s.act, run.tower?.maps ?? CAL_MAPS)}, ${s.floors} ${spots} cleared.`) : s.abandoned ? `The heroes turn back on floor ${run.stage}, in act ${s.act}.` : `The heroes fall on floor ${run.stage}, in act ${s.act}.`),
    );
    const stats = el('div', 'rtStats');
    const stat = (label: string, value: string) => {
      const row = el('div');
      row.append(el('span', '', label), el('b', '', value));
      stats.append(row);
    };
    stat(cal ? (expeditionOf(run) ? 'Crossings made' : 'Spots cleared') : 'Floors climbed', String(s.floors));
    if (cal && s.ascension) stat('Ascension', String(s.ascension));
    stat(cal ? (expeditionOf(run) ? 'Regions cleared' : 'Maps cleared') : 'Acts', cal ? `${s.maps} of ${run.tower?.maps ?? CAL_MAPS}` : String(s.act));
    stat('Relics', String(s.relics));
    stat('Heroes', String(s.heroes));
    stat('Crowns earned', String(s.crowns));
    card.append(stats);
    // (a calamity's rift ores are paid on a loss too: AWAKEN-MATS)
    if (s.ores?.length) {
      const ores = el('div', 'oreList');
      ores.append(...s.ores.map((d) => oreChip(d)));
      card.append(el('p', 'rtLead', 'Rift ores, for awakening:'), ores);
    }
    if (s.newBest) card.append(el('p', 'rtBest', cal ? `A new best: ${s.maps} ${unit}${s.maps === 1 ? '' : 's'} cleared!` : `A new best floor: ${s.floors}!`));
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
    card.append(el('p', 'rtLead', line ? `${line} added to your stash.` : cal ? `Clear every ${unit} for a chest.` : 'No chests yet: climb further to earn them.'));
    // (RECAP-REVEAL: no list of the gear found: it leaves with the run, and each fight's card named it)
    const go = el('button', 'primary', 'Back to camp');
    go.addEventListener('click', () => {
      this.close();
      then();
    });
    card.append(go);
    // (WAVE-RECAP-2: the per-hero detail the short card after each fight left for here)
    putDetail(card, run.recap, { strip: cal ? 'Fight by fight' : 'Floor by floor', prefix: cal ? '#' : 'F', equipmentStep: (kind) => awakenedOf(this.hooks.meta(), kind) });
    wrap.append(card);
    this.root.append(wrap);
  }
}

/** Lay a recap's detail (`recapDetail`: the fights one by one, the company's work with its MVP, the XP and levels) into a
 *  summary card, above its closing button. Nothing when there is no recap (a save from before) or nothing in it. */
function putDetail(card: HTMLElement, recap: RunRecap | undefined, opts: Parameters<typeof recapDetail>[1]): void {
  if (!recap) return;
  const parts = recapDetail(recap, opts);
  if (!parts.length) return;
  const box = el('div', 'rcDetail');
  box.append(...parts);
  const button = [...card.children].reverse().find((c) => c.matches('button.primary'));
  card.insertBefore(box, button ?? null);
}
